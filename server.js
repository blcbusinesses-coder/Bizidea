import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  getLikes,
  addLike,
  removeLike,
  getGameSaves,
  addGameSave,
  removeGameSave,
} from "./db.js";
import { pickRandomWord, pickRandomWords } from "./words.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env and serve static files by absolute path so the app works no matter
// which working directory it's launched from (e.g. the preview panel).
dotenv.config({ path: path.join(__dirname, ".env"), override: true });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TYPES = ["Ecommerce", "Service", "Info", "Code"];
const LOCATIONS = ["In person", "Online"];
const MEDIUMS = ["AI agent", "Mobile app", "SaaS", "API or MCP", "Other"];
const MARKETS = ["B2B", "B2D", "B2C", "B2AI"];

function clamp(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function normalizeFilters(raw = {}) {
  const pick = (val, allowed) =>
    allowed.includes(val) ? val : "Any";
  return {
    businessType: pick(raw.businessType, TYPES),
    location: pick(raw.location, LOCATIONS),
    codeMedium: pick(raw.codeMedium, MEDIUMS),
    market: pick(raw.market, MARKETS),
  };
}

function buildIdeaSchema(filters) {
  let typeEnum = filters.businessType !== "Any" ? [filters.businessType] : [...TYPES];
  let mediumEnum;

  if (filters.codeMedium !== "Any") {
    // A specific medium only makes sense for Code businesses.
    typeEnum = ["Code"];
    mediumEnum = [filters.codeMedium];
  } else if (filters.businessType === "Code") {
    mediumEnum = [...MEDIUMS];
  } else if (filters.businessType !== "Any") {
    mediumEnum = ["N/A"];
  } else {
    mediumEnum = [...MEDIUMS, "N/A"];
  }

  const locationEnum = filters.location !== "Any" ? [filters.location] : [...LOCATIONS];
  const marketEnum = filters.market !== "Any" ? [filters.market] : [...MARKETS];

  return {
    type: "object",
    properties: {
      name: { type: "string", description: "A short, catchy name for the business." },
      description: { type: "string", description: "3-4 sentences explaining the business." },
      businessType: { type: "string", enum: typeEnum },
      location: { type: "string", enum: locationEnum },
      codeMedium: {
        type: "string",
        description: "The medium/interface for Code businesses, otherwise 'N/A'.",
        enum: mediumEnum,
      },
      market: { type: "string", enum: marketEnum },
    },
    required: ["name", "description", "businessType", "location", "codeMedium", "market"],
    additionalProperties: false,
  };
}

function buildSchema(filters) {
  const idea = buildIdeaSchema(filters);
  return {
    type: "object",
    properties: {
      groups: {
        type: "array",
        items: {
          type: "object",
          properties: {
            word: { type: "string", description: "The random seed word for this group." },
            ideas: { type: "array", items: idea },
          },
          required: ["word", "ideas"],
          additionalProperties: false,
        },
      },
    },
    required: ["groups"],
    additionalProperties: false,
  };
}

function buildPrompt(seedWords, perWord, filters) {
  const lines = [];
  lines.push(
    `Use these exact seed words, one group per word: ${seedWords
      .map((w) => `"${w}"`)
      .join(", ")}.`
  );
  lines.push(
    `For EACH seed word, brainstorm exactly ${perWord} distinct business idea(s) inspired by that word. That is ${seedWords.length} groups, each with ${perWord} ideas. Use each seed word verbatim as its group's "word".`
  );
  lines.push(
    `For each idea provide: a short catchy name; a 3-4 sentence description; a business type; whether it is in person or online; the code medium/interface; and the target market.`
  );

  const hard = [];
  if (filters.businessType !== "Any")
    hard.push(`- Every business MUST be of type "${filters.businessType}".`);
  if (filters.location !== "Any")
    hard.push(`- Every business MUST be "${filters.location}".`);
  if (filters.codeMedium !== "Any")
    hard.push(
      `- Every business MUST be a Code business whose medium/interface is "${filters.codeMedium}".`
    );
  if (filters.market !== "Any")
    hard.push(`- Every business MUST target the "${filters.market}" market.`);
  if (hard.length) {
    lines.push(`Hard constraints — follow ALL of these strictly:`);
    lines.push(...hard);
  }

  lines.push(`Reference: business type is one of Ecommerce, Service, Info, Code.`);
  lines.push(
    `Code medium (only for Code businesses; use "N/A" for all non-Code businesses) is one of AI agent, Mobile app, SaaS, API or MCP, Other.`
  );
  lines.push(`Market: B2B (business), B2D (developer), B2C (consumer), B2AI (AI).`);
  lines.push(`Make the ideas creative and varied.`);
  return lines.join("\n");
}

app.post("/api/generate", async (req, res) => {
  try {
    const words = clamp(req.body.words, 1, 10, 1);
    const perWord = clamp(req.body.perWord, 1, 10, 1);
    const filters = normalizeFilters(req.body.filters);
    const total = words * perWord;
    const seedWords = pickRandomWords(words);

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: Math.min(32000, 4000 + total * 1000),
      thinking: { type: "adaptive" },
      output_config: {
        format: { type: "json_schema", schema: buildSchema(filters) },
      },
      messages: [
        { role: "user", content: buildPrompt(seedWords, perWord, filters) },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    const parsed = JSON.parse(block.text);

    const ideas = [];
    for (const group of parsed.groups || []) {
      for (const idea of group.ideas || []) {
        ideas.push({ ...idea, word: group.word });
      }
    }
    res.json({ ideas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Generation failed." });
  }
});

/* ---------- Game ---------- */

app.get("/api/game/word", (req, res) => {
  res.json({ word: pickRandomWord() });
});

const rateSchema = {
  type: "object",
  properties: {
    score: {
      type: "integer",
      description: "Overall rating, an integer from 1 (weak) to 10 (excellent).",
    },
    feedback: {
      type: "string",
      description: "2-4 sentences of honest, constructive feedback on the idea.",
    },
    nextSteps: {
      type: "array",
      items: { type: "string" },
      description: "2-4 concrete things the user should think about or explore next.",
    },
  },
  required: ["score", "feedback", "nextSteps"],
  additionalProperties: false,
};

app.post("/api/game/rate", async (req, res) => {
  try {
    const word = String(req.body.word || "").slice(0, 200);
    const idea = String(req.body.idea || "").slice(0, 4000);
    if (!idea.trim()) {
      return res.status(400).json({ error: "Please enter an idea first." });
    }

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: rateSchema },
      },
      messages: [
        {
          role: "user",
          content: `You are a sharp, encouraging startup mentor running a rapid-fire ideation game.

The seed word was: "${word}"
The player's business idea: "${idea}"

Rate the idea from 1 to 10, judging creativity, how well it fits the seed word, and real-world viability. Be honest but constructive — do not inflate scores. Then give 2-4 sentences of feedback, and 2-4 concrete "next things to think about" (e.g. a market to validate, a risk to de-risk, a way to sharpen the concept).`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    res.json(JSON.parse(block.text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Rating failed." });
  }
});

app.get("/api/game/saves", (req, res) => {
  res.json({ saves: getGameSaves() });
});

app.post("/api/game/saves", (req, res) => {
  res.json(addGameSave(req.body || {}));
});

app.delete("/api/game/saves/:id", (req, res) => {
  removeGameSave(req.params.id);
  res.json({ ok: true });
});

app.get("/api/likes", (req, res) => {
  res.json({ likes: getLikes() });
});

app.post("/api/likes", (req, res) => {
  const saved = addLike(req.body || {});
  res.json(saved);
});

app.delete("/api/likes/:id", (req, res) => {
  removeLike(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Biz Idea Generator running at http://localhost:${PORT}`);
});
