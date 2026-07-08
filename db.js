import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const LIKES_FILE = path.join(DATA_DIR, "liked.json");
const GAME_FILE = path.join(DATA_DIR, "game.json");

function ensure(file) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
}

function read(file) {
  ensure(file);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function write(file, data) {
  ensure(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ---------- Liked ideas ---------- */

export function getLikes() {
  return read(LIKES_FILE);
}

export function addLike(idea) {
  const list = read(LIKES_FILE);
  const entry = {
    id: randomUUID(),
    word: idea.word ?? "",
    name: idea.name ?? "",
    description: idea.description ?? "",
    businessType: idea.businessType ?? "",
    location: idea.location ?? "",
    codeMedium: idea.codeMedium ?? "",
    market: idea.market ?? "",
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  write(LIKES_FILE, list);
  return entry;
}

export function removeLike(id) {
  write(LIKES_FILE, read(LIKES_FILE).filter((x) => x.id !== id));
}

/* ---------- Saved game rounds ---------- */

export function getGameSaves() {
  return read(GAME_FILE);
}

export function addGameSave(round) {
  const list = read(GAME_FILE);
  const entry = {
    id: randomUUID(),
    word: round.word ?? "",
    idea: round.idea ?? "",
    score: round.score ?? null,
    feedback: round.feedback ?? "",
    nextSteps: Array.isArray(round.nextSteps) ? round.nextSteps : [],
    createdAt: new Date().toISOString(),
  };
  list.unshift(entry);
  write(GAME_FILE, list);
  return entry;
}

export function removeGameSave(id) {
  write(GAME_FILE, read(GAME_FILE).filter((x) => x.id !== id));
}
