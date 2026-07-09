import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pickRandomWord, pickRandomWords } from "./words.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env locally (on Vercel the API key comes from project env vars, and
// there is no .env file — dotenv just no-ops in that case).
dotenv.config({ path: path.join(__dirname, ".env"), override: true });

// Resolve the public dir robustly: __dirname works locally and in the preview
// panel; process.cwd() works when bundled into a Vercel serverless function.
const publicDir =
  [path.join(__dirname, "public"), path.join(process.cwd(), "public")].find(
    (p) => fs.existsSync(p)
  ) || path.join(__dirname, "public");

const app = express();
app.use(express.json());
app.use(express.static(publicDir));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TYPES = ["Ecommerce", "Service", "Info", "Code"];
const LOCATIONS = ["In person", "Online"];
// Broad set of delivery/monetization mediums across every kind of business —
// code and non-code alike. Keep in sync with the dropdown in public/index.html.
const MEDIUMS = [
  "SaaS",
  "Web app",
  "Mobile app",
  "AI agent",
  "API or MCP",
  "Marketplace",
  "Subscription box",
  "Physical product",
  "Handmade goods",
  "Print-on-demand",
  "Dropshipping",
  "Wholesale",
  "Rental",
  "Brick-and-mortar store",
  "Pop-up shop",
  "Vending",
  "Franchise",
  "On-site service",
  "Consulting",
  "Coaching",
  "Agency",
  "Freelance service",
  "Event",
  "Workshop",
  "Online course",
  "Membership",
  "Newsletter",
  "Content channel",
  "Community",
  "Licensing",
  "Ad-supported",
  "Affiliate",
  "DIY kit",
  "Other",
];
const MARKETS = ["B2B", "B2D", "B2C", "B2AI"];

function clamp(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function normalizeFilters(raw = {}) {
  const pick = (val, allowed) => (allowed.includes(val) ? val : "Any");
  // mediums is a multi-select: an array of chosen mediums. Empty = Any.
  const rawMediums = Array.isArray(raw.mediums)
    ? raw.mediums
    : raw.medium
    ? [raw.medium]
    : [];
  const mediums = [...new Set(rawMediums.filter((m) => MEDIUMS.includes(m)))];
  return {
    businessType: pick(raw.businessType, TYPES),
    location: pick(raw.location, LOCATIONS),
    mediums,
    market: pick(raw.market, MARKETS),
  };
}

function filterEnums(filters) {
  return {
    typeEnum: filters.businessType !== "Any" ? [filters.businessType] : [...TYPES],
    locationEnum: filters.location !== "Any" ? [filters.location] : [...LOCATIONS],
    mediumEnum: filters.mediums.length ? [...filters.mediums] : [...MEDIUMS],
    marketEnum: filters.market !== "Any" ? [filters.market] : [...MARKETS],
  };
}

function classificationProps(filters) {
  const { typeEnum, locationEnum, mediumEnum, marketEnum } = filterEnums(filters);
  return {
    businessType: { type: "string", enum: typeEnum },
    location: { type: "string", enum: locationEnum },
    medium: {
      type: "string",
      description:
        "The primary medium / format / business model through which the business delivers or monetizes.",
      enum: mediumEnum,
    },
    market: { type: "string", enum: marketEnum },
  };
}

function buildIdeaSchema(filters) {
  return {
    type: "object",
    properties: {
      name: { type: "string", description: "A short, catchy name for the business." },
      description: { type: "string", description: "3-4 sentences explaining the business." },
      ...classificationProps(filters),
    },
    required: ["name", "description", "businessType", "location", "medium", "market"],
    additionalProperties: false,
  };
}

function buildAdaptSchema(filters) {
  const item = {
    type: "object",
    properties: {
      baseBusiness: {
        type: "string",
        description:
          "The name of a REAL, well-known company that is currently successful.",
      },
      baseDescription: {
        type: "string",
        description:
          "1-2 sentences on what the real company actually does and why it is doing well.",
      },
      newNiche: {
        type: "string",
        description: "The different niche or vertical this adaptation targets.",
      },
      name: {
        type: "string",
        description: "A short, catchy name for the new adapted business.",
      },
      description: {
        type: "string",
        description:
          "3-4 sentences explaining the adapted business in its new niche.",
      },
      ...classificationProps(filters),
    },
    required: [
      "baseBusiness",
      "baseDescription",
      "newNiche",
      "name",
      "description",
      "businessType",
      "location",
      "medium",
      "market",
    ],
    additionalProperties: false,
  };
  return {
    type: "object",
    properties: { ideas: { type: "array", items: item } },
    required: ["ideas"],
    additionalProperties: false,
  };
}

function buildAdaptPrompt(count, filters) {
  const lines = [];
  lines.push(
    `Identify ${count} REAL, currently-successful companies (well-known and genuinely real — e.g. Strava, Duolingo, Notion, Whoop, Airbnb, Canva, Calm) and adapt EACH one into a clearly DIFFERENT niche or vertical, in the "X for Y" pattern (e.g. "Strava for basketball", "Duolingo for personal finance", "Whoop for physical therapy").`
  );
  lines.push(`For each of the ${count}, provide:`);
  lines.push(`- baseBusiness: the real company's name.`);
  lines.push(
    `- baseDescription: 1-2 sentences on what it really does and why it is thriving right now.`
  );
  lines.push(`- newNiche: the new, clearly different niche/vertical you are targeting.`);
  lines.push(`- name: a catchy name for the new adapted business.`);
  lines.push(`- description: 3-4 sentences explaining the adapted business.`);
  lines.push(
    `- the business type, whether it is in person or online, the medium, and the target market for the NEW business.`
  );

  const hard = [];
  if (filters.businessType !== "Any")
    hard.push(`- Every NEW business MUST be of type "${filters.businessType}".`);
  if (filters.location !== "Any")
    hard.push(`- Every NEW business MUST be "${filters.location}".`);
  if (filters.mediums.length === 1)
    hard.push(`- Every NEW business MUST use the "${filters.mediums[0]}" medium.`);
  else if (filters.mediums.length > 1)
    hard.push(
      `- Every NEW business's medium MUST be one of: ${filters.mediums
        .map((m) => `"${m}"`)
        .join(", ")}.`
    );
  if (filters.market !== "Any")
    hard.push(`- Every NEW business MUST target the "${filters.market}" market.`);
  if (hard.length) {
    lines.push(`Hard constraints — follow ALL of these strictly:`);
    lines.push(...hard);
  }

  lines.push(
    `CRITICAL: Only use REAL companies you are confident actually exist and are successful today. Do NOT invent or fabricate companies. Make each target niche clearly different from the original company's market.`
  );
  lines.push(`Reference: business type is one of Ecommerce, Service, Info, Code.`);
  lines.push(
    `Medium is the primary delivery/monetization model. Choose the single best fit from: ${MEDIUMS.join(
      ", "
    )}.`
  );
  lines.push(`Market: B2B (business), B2D (developer), B2C (consumer), B2AI (AI).`);
  return lines.join("\n");
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
    `For each idea provide: a short catchy name; a 3-4 sentence description; a business type; whether it is in person or online; the medium; and the target market.`
  );

  const hard = [];
  if (filters.businessType !== "Any")
    hard.push(`- Every business MUST be of type "${filters.businessType}".`);
  if (filters.location !== "Any")
    hard.push(`- Every business MUST be "${filters.location}".`);
  if (filters.mediums.length === 1)
    hard.push(`- Every business MUST use the "${filters.mediums[0]}" medium.`);
  else if (filters.mediums.length > 1)
    hard.push(
      `- Every business's medium MUST be one of: ${filters.mediums
        .map((m) => `"${m}"`)
        .join(", ")}.`
    );
  if (filters.market !== "Any")
    hard.push(`- Every business MUST target the "${filters.market}" market.`);
  if (hard.length) {
    lines.push(`Hard constraints — follow ALL of these strictly:`);
    lines.push(...hard);
  }

  lines.push(`Reference: business type is one of Ecommerce, Service, Info, Code.`);
  lines.push(
    `Medium is the primary delivery/monetization model. Choose the single best fit from: ${MEDIUMS.join(
      ", "
    )}.`
  );
  lines.push(`Market: B2B (business), B2D (developer), B2C (consumer), B2AI (AI).`);
  lines.push(`Make the ideas creative and varied.`);
  return lines.join("\n");
}

app.post("/api/generate", async (req, res) => {
  const words = clamp(req.body.words, 1, 10, 1);
  const perWord = clamp(req.body.perWord, 1, 10, 1);
  const filters = normalizeFilters(req.body.filters);
  const total = words * perWord;
  const seedWords = pickRandomWords(words);

  // Idea generation can take a while for larger batches. We respond as a
  // Server-Sent Events stream and emit heartbeat comments every few seconds so
  // proxies / mobile networks don't kill the connection as an idle timeout
  // before the final result is ready (this was breaking generation on the
  // deployed site while the shorter game requests worked fine).
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 5000);
  const send = (payload) =>
    res.write(`event: result\ndata: ${JSON.stringify(payload)}\n\n`);

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(32000, 4000 + total * 1000),
      thinking: { type: "adaptive" },
      output_config: {
        // Keep generation fast enough to finish inside serverless time limits
        // (e.g. Vercel's 60s function cap) for typical batch sizes.
        effort: "low",
        format: { type: "json_schema", schema: buildSchema(filters) },
      },
      messages: [
        { role: "user", content: buildPrompt(seedWords, perWord, filters) },
      ],
    });

    const message = await stream.finalMessage();
    const block = message.content.find((b) => b.type === "text");
    const parsed = JSON.parse(block.text);

    const ideas = [];
    for (const group of parsed.groups || []) {
      for (const idea of group.ideas || []) {
        ideas.push({ ...idea, word: group.word });
      }
    }
    send({ ideas });
  } catch (err) {
    console.error(err);
    send({ error: err.message || "Generation failed." });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

/* ---------- Adapt (real businesses → new niche) ---------- */

app.post("/api/adapt", async (req, res) => {
  const count = clamp(req.body.count, 1, 10, 3);
  const filters = normalizeFilters(req.body.filters);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 5000);
  const send = (payload) =>
    res.write(`event: result\ndata: ${JSON.stringify(payload)}\n\n`);

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(32000, 4000 + count * 1000),
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: buildAdaptSchema(filters) },
      },
      messages: [{ role: "user", content: buildAdaptPrompt(count, filters) }],
    });

    const message = await stream.finalMessage();
    const block = message.content.find((b) => b.type === "text");
    const parsed = JSON.parse(block.text);
    send({ ideas: parsed.ideas || [] });
  } catch (err) {
    console.error(err);
    send({ error: err.message || "Adaptation failed." });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

/* ---------- Game ---------- */

app.get("/api/game/word", (req, res) => {
  res.json({ word: pickRandomWord() });
});

const wordInfoSchema = {
  type: "object",
  properties: {
    synonyms: {
      type: "array",
      items: { type: "string" },
      description: "4-8 synonyms or closely related words.",
    },
    meanings: {
      type: "array",
      items: { type: "string" },
      description:
        "3-6 short meanings and interpretations of the word, each a brief phrase.",
    },
  },
  required: ["synonyms", "meanings"],
  additionalProperties: false,
};

app.post("/api/game/wordinfo", async (req, res) => {
  try {
    const word = String(req.body.word || "").slice(0, 100).trim();
    if (!word) return res.status(400).json({ error: "No word provided." });

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      output_config: {
        format: { type: "json_schema", schema: wordInfoSchema },
      },
      messages: [
        {
          role: "user",
          content: `For the word "${word}", provide two things:
- 4-8 synonyms or closely related words.
- 3-6 short meanings and interpretations: include its literal definition(s) plus a couple of evocative associations or metaphorical angles that could spark business ideas. Keep each one to a short phrase or single sentence.`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "text");
    res.json(JSON.parse(block.text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Could not load word info." });
  }
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
      model: "claude-sonnet-4-6",
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

// Note: liked ideas and saved game rounds are stored client-side in the
// browser's localStorage (see public/app.js) so they persist per-device and
// survive deploys/restarts on hosts with an ephemeral filesystem.

// On Vercel the app is imported as a serverless function (see api/index.js),
// so we only start a listener when running directly (local dev).
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Biz Idea Generator running at http://localhost:${PORT}`);
  });
}

export default app;
