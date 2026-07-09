const wordsInput = document.getElementById("words");
const perWordInput = document.getElementById("perWord");
const fType = document.getElementById("f-type");
const fLocation = document.getElementById("f-location");
const fMarket = document.getElementById("f-market");
const generateBtn = document.getElementById("generate");
const totalHint = document.getElementById("total-hint");
const statusEl = document.getElementById("status");

const resultsTable = document.getElementById("results");
const resultsBody = resultsTable.querySelector("tbody");

const tabGen = document.getElementById("tab-gen");
const tabAdapt = document.getElementById("tab-adapt");
const tabGame = document.getElementById("tab-game");
const tabLiked = document.getElementById("tab-liked");
const panelGen = document.getElementById("panel-gen");
const panelAdapt = document.getElementById("panel-adapt");
const panelGame = document.getElementById("panel-game");
const panelLiked = document.getElementById("panel-liked");
const likedCount = document.getElementById("liked-count");
const likedTable = document.getElementById("liked-table");
const likedBody = likedTable.querySelector("tbody");
const likedEmpty = document.getElementById("liked-empty");

function cell(text, className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = text;
  return td;
}

function pillCell(text) {
  const td = document.createElement("td");
  const span = document.createElement("span");
  span.className = "pill";
  span.textContent = text;
  td.appendChild(span);
  return td;
}

/* ---------- Medium multi-select ---------- */

const MEDIUMS = [
  "SaaS", "Web app", "Mobile app", "AI agent", "API or MCP", "Marketplace",
  "Subscription box", "Physical product", "Handmade goods", "Print-on-demand",
  "Dropshipping", "Wholesale", "Rental", "Brick-and-mortar store", "Pop-up shop",
  "Vending", "Franchise", "On-site service", "Consulting", "Coaching", "Agency",
  "Freelance service", "Event", "Workshop", "Online course", "Membership",
  "Newsletter", "Content channel", "Community", "Licensing", "Ad-supported",
  "Affiliate", "DIY kit", "Other",
];

// Reusable medium multi-select. `prefix` matches the element id prefix in the
// HTML (e.g. "medium" -> #medium-ms, #medium-toggle, ...). Returns a getter for
// the currently-selected mediums so each tab can have its own instance.
function createMediumSelect(prefix) {
  const ms = document.getElementById(`${prefix}-ms`);
  const toggle = document.getElementById(`${prefix}-toggle`);
  const panel = document.getElementById(`${prefix}-panel`);
  const options = document.getElementById(`${prefix}-options`);
  const summary = document.getElementById(`${prefix}-summary`);
  const clear = document.getElementById(`${prefix}-clear`);

  const selected = () =>
    [...options.querySelectorAll("input:checked")].map((c) => c.value);

  function updateLabel() {
    const sel = selected();
    if (sel.length === 0) {
      toggle.textContent = "Any";
      summary.textContent = "Any medium";
    } else if (sel.length === 1) {
      toggle.textContent = sel[0];
      summary.textContent = "1 selected";
    } else {
      toggle.textContent = `${sel.length} selected`;
      summary.textContent = `${sel.length} selected`;
    }
  }

  for (const m of MEDIUMS) {
    const label = document.createElement("label");
    label.className = "ms-option";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = m;
    cb.addEventListener("change", updateLabel);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + m));
    options.appendChild(label);
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("hidden");
  });
  clear.addEventListener("click", () => {
    options.querySelectorAll("input:checked").forEach((c) => (c.checked = false));
    updateLabel();
  });
  document.addEventListener("click", (e) => {
    if (!ms.contains(e.target)) panel.classList.add("hidden");
  });

  return { selected };
}

const genMedium = createMediumSelect("medium");
const adaptMedium = createMediumSelect("adapt-medium");

function selectedMediums() {
  return genMedium.selected();
}

function updateHint() {
  const w = parseInt(wordsInput.value, 10) || 0;
  const p = parseInt(perWordInput.value, 10) || 0;
  const total = w * p;
  totalHint.textContent = total ? `(${total} ideas)` : "";
}

/* ---------- Local storage (persists on this device) ---------- */

const LIKES_KEY = "biz_likes";
const GAME_KEY = "biz_game_saves";

function loadStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

/* ---------- Likes ---------- */

function refreshLikedCount() {
  const likes = loadStore(LIKES_KEY);
  likedCount.textContent = likes.length;
  return likes;
}

function likeIdea(idea, btn) {
  const likes = loadStore(LIKES_KEY);
  const entry = {
    id: newId(),
    word: idea.word ?? "",
    name: idea.name ?? "",
    description: idea.description ?? "",
    businessType: idea.businessType ?? "",
    location: idea.location ?? "",
    medium: idea.medium ?? idea.codeMedium ?? "",
    market: idea.market ?? "",
    createdAt: new Date().toISOString(),
  };
  likes.unshift(entry);
  saveStore(LIKES_KEY, likes);
  btn.classList.add("liked");
  btn.dataset.likeId = entry.id;
  btn.title = "Remove from liked";
  refreshLikedCount();
}

function unlikeById(id) {
  saveStore(LIKES_KEY, loadStore(LIKES_KEY).filter((x) => x.id !== id));
  refreshLikedCount();
}

function heartCell(idea, { liked = false, likeId = null, onRemove } = {}) {
  const td = document.createElement("td");
  const btn = document.createElement("button");
  btn.className = "heart-btn" + (liked ? " liked" : "");
  btn.innerHTML = "&#9829;";
  btn.title = liked ? "Remove from liked" : "Add to liked";
  if (likeId) btn.dataset.likeId = likeId;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      if (btn.dataset.likeId) {
        const id = btn.dataset.likeId;
        await unlikeById(id);
        delete btn.dataset.likeId;
        btn.classList.remove("liked");
        btn.title = "Add to liked";
        if (onRemove) onRemove();
      } else {
        await likeIdea(idea, btn);
      }
    } finally {
      btn.disabled = false;
    }
  });

  td.appendChild(btn);
  return td;
}

function ideaRow(idea, heart) {
  const tr = document.createElement("tr");
  tr.appendChild(heart);
  tr.appendChild(cell(idea.word, "word"));
  tr.appendChild(cell(idea.name, "name"));
  tr.appendChild(cell(idea.description, "desc"));
  tr.appendChild(pillCell(idea.businessType));
  tr.appendChild(pillCell(idea.location));
  tr.appendChild(pillCell(idea.medium ?? idea.codeMedium ?? ""));
  tr.appendChild(pillCell(idea.market));
  return tr;
}

/* ---------- Generate ---------- */

async function generate() {
  const words = Math.min(Math.max(parseInt(wordsInput.value, 10) || 1, 1), 10);
  const perWord = Math.min(Math.max(parseInt(perWordInput.value, 10) || 1, 1), 10);
  const filters = {
    businessType: fType.value,
    location: fLocation.value,
    mediums: selectedMediums(),
    market: fMarket.value,
  };

  generateBtn.disabled = true;
  statusEl.textContent = "Thinking up ideas…";
  resultsTable.classList.add("hidden");
  resultsBody.innerHTML = "";

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words, perWord, filters }),
    });
    if (!res.ok || !res.body) {
      throw new Error("Server error (" + res.status + ").");
    }

    // The server replies as a Server-Sent Events stream (heartbeats keep the
    // connection alive during long generations). Read it and pull the single
    // "result" payload out.
    const data = await readSseResult(res);
    if (!data) throw new Error("No response from server.");
    if (data.error) throw new Error(data.error);

    for (const idea of data.ideas) {
      const heart = heartCell(idea);
      resultsBody.appendChild(ideaRow(idea, heart));
    }

    resultsTable.classList.remove("hidden");
    statusEl.textContent = `${data.ideas.length} ideas generated.`;
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  } finally {
    generateBtn.disabled = false;
  }
}

async function readSseResult(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop();
    for (const evt of events) {
      const dataLine = evt
        .split("\n")
        .find((l) => l.startsWith("data:"));
      if (dataLine) {
        try {
          result = JSON.parse(dataLine.slice(5).trim());
        } catch {
          /* ignore malformed chunk */
        }
      }
    }
  }
  return result;
}

/* ---------- Adapt ---------- */

const adaptCount = document.getElementById("adapt-count");
const adaptType = document.getElementById("adapt-type");
const adaptLocation = document.getElementById("adapt-location");
const adaptMarket = document.getElementById("adapt-market");
const adaptGoBtn = document.getElementById("adapt-go");
const adaptStatus = document.getElementById("adapt-status");
const adaptTable = document.getElementById("adapt-results");
const adaptBody = adaptTable.querySelector("tbody");

// Map an Adapt idea into the shared "liked" shape so it saves and displays in
// the Liked tab alongside generator ideas.
function adaptToLikeShape(a) {
  return {
    word: a.baseBusiness,
    name: a.name,
    description: `${a.newNiche} — ${a.description}`,
    businessType: a.businessType,
    location: a.location,
    medium: a.medium,
    market: a.market,
  };
}

function baseCell(name, desc) {
  const td = document.createElement("td");
  td.className = "base-biz";
  const n = document.createElement("div");
  n.className = "base-name";
  n.textContent = name;
  const d = document.createElement("div");
  d.className = "base-desc";
  d.textContent = desc;
  td.appendChild(n);
  td.appendChild(d);
  return td;
}

function adaptRow(a) {
  const tr = document.createElement("tr");
  tr.appendChild(heartCell(adaptToLikeShape(a)));
  tr.appendChild(baseCell(a.baseBusiness, a.baseDescription));
  tr.appendChild(cell(a.newNiche, "word"));
  tr.appendChild(cell(a.name, "name"));
  tr.appendChild(cell(a.description, "desc"));
  tr.appendChild(pillCell(a.businessType));
  tr.appendChild(pillCell(a.location));
  tr.appendChild(pillCell(a.medium));
  tr.appendChild(pillCell(a.market));
  return tr;
}

async function runAdapt() {
  const count = Math.min(Math.max(parseInt(adaptCount.value, 10) || 1, 1), 10);
  const filters = {
    businessType: adaptType.value,
    location: adaptLocation.value,
    mediums: adaptMedium.selected(),
    market: adaptMarket.value,
  };

  adaptGoBtn.disabled = true;
  adaptStatus.textContent = "Finding real businesses to adapt…";
  adaptTable.classList.add("hidden");
  adaptBody.innerHTML = "";

  try {
    const res = await fetch("/api/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, filters }),
    });
    if (!res.ok || !res.body) throw new Error("Server error (" + res.status + ").");

    const data = await readSseResult(res);
    if (!data) throw new Error("No response from server.");
    if (data.error) throw new Error(data.error);

    for (const a of data.ideas) adaptBody.appendChild(adaptRow(a));

    adaptTable.classList.remove("hidden");
    adaptStatus.textContent = `${data.ideas.length} adaptations generated.`;
  } catch (err) {
    adaptStatus.textContent = `Error: ${err.message}`;
  } finally {
    adaptGoBtn.disabled = false;
  }
}

/* ---------- Liked view ---------- */

async function renderLiked() {
  const likes = await refreshLikedCount();
  likedBody.innerHTML = "";

  if (likes.length === 0) {
    likedEmpty.classList.remove("hidden");
    likedTable.classList.add("hidden");
    return;
  }

  likedEmpty.classList.add("hidden");
  likedTable.classList.remove("hidden");

  for (const idea of likes) {
    const tr = ideaRow(
      idea,
      heartCell(idea, {
        liked: true,
        likeId: idea.id,
        onRemove: () => {
          tr.remove();
          if (!likedBody.children.length) renderLiked();
        },
      })
    );
    likedBody.appendChild(tr);
  }
}

/* ---------- Game ---------- */

const gameWordEl = document.getElementById("game-word");
const newWordBtn = document.getElementById("new-word");
const gameIdea = document.getElementById("game-idea");
const submitIdeaBtn = document.getElementById("submit-idea");
const gameResult = document.getElementById("game-result");
const scoreBadge = document.getElementById("score-badge");
const gameFeedback = document.getElementById("game-feedback");
const gameNext = document.getElementById("game-next");
const saveRoundBtn = document.getElementById("save-round");
const saveStatus = document.getElementById("save-status");
const savedCount = document.getElementById("saved-count");
const savedEmpty = document.getElementById("saved-empty");
const savedList = document.getElementById("saved-list");

const synToggle = document.getElementById("syn-toggle");
const meanToggle = document.getElementById("mean-toggle");
const synPanel = document.getElementById("syn-panel");
const meanPanel = document.getElementById("mean-panel");

let currentWord = "";
let lastRating = null;
let wordInfo = null;
let wordInfoPromise = null;

function resetWordInfo() {
  wordInfo = null;
  wordInfoPromise = null;
  for (const [toggle, panel] of [
    [synToggle, synPanel],
    [meanToggle, meanPanel],
  ]) {
    toggle.classList.remove("open");
    panel.classList.add("hidden");
    panel.innerHTML = "";
  }
}

function ensureWordInfo() {
  if (wordInfo) return Promise.resolve(wordInfo);
  if (!wordInfoPromise) {
    wordInfoPromise = fetch("/api/game/wordinfo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: currentWord }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        wordInfo = d;
        return d;
      });
  }
  return wordInfoPromise;
}

function renderWordInfo() {
  if (!wordInfo) return;
  synPanel.innerHTML = (wordInfo.synonyms || [])
    .map((s) => `<span class="info-pill">${escapeHtml(s)}</span>`)
    .join("");
  meanPanel.innerHTML =
    "<ul>" +
    (wordInfo.meanings || [])
      .map((m) => `<li>${escapeHtml(m)}</li>`)
      .join("") +
    "</ul>";
}

async function toggleWordInfo(toggle, panel) {
  const opening = panel.classList.contains("hidden");
  if (!opening) {
    panel.classList.add("hidden");
    toggle.classList.remove("open");
    return;
  }
  panel.classList.remove("hidden");
  toggle.classList.add("open");
  if (!wordInfo) {
    panel.innerHTML = '<span class="info-loading">Loading…</span>';
    try {
      await ensureWordInfo();
    } catch {
      panel.innerHTML = '<span class="info-loading">Couldn’t load. Try again.</span>';
      wordInfoPromise = null;
      return;
    }
  }
  renderWordInfo();
}

async function newWord() {
  newWordBtn.disabled = true;
  gameWordEl.textContent = "…";
  gameResult.classList.add("hidden");
  gameIdea.value = "";
  lastRating = null;
  resetWordInfo();
  try {
    const res = await fetch("/api/game/word");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not fetch a word.");
    currentWord = data.word;
    gameWordEl.textContent = data.word;
  } catch (err) {
    gameWordEl.textContent = "(error)";
    saveStatus.textContent = err.message;
  } finally {
    newWordBtn.disabled = false;
  }
}

async function submitIdea() {
  const idea = gameIdea.value.trim();
  if (!idea) {
    saveStatus.textContent = "Type an idea first.";
    return;
  }
  submitIdeaBtn.disabled = true;
  submitIdeaBtn.textContent = "Rating…";
  saveStatus.textContent = "";
  try {
    const res = await fetch("/api/game/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: currentWord, idea }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Rating failed.");

    scoreBadge.textContent = data.score;
    gameFeedback.textContent = data.feedback;
    gameNext.innerHTML = "";
    for (const step of data.nextSteps) {
      const li = document.createElement("li");
      li.textContent = step;
      gameNext.appendChild(li);
    }
    lastRating = { word: currentWord, idea, ...data };
    gameResult.classList.remove("hidden");
    saveRoundBtn.disabled = false;
    saveRoundBtn.textContent = "Save this round";
  } catch (err) {
    saveStatus.textContent = `Error: ${err.message}`;
  } finally {
    submitIdeaBtn.disabled = false;
    submitIdeaBtn.textContent = "Submit for rating";
  }
}

function saveRound() {
  if (!lastRating) return;
  const saves = loadStore(GAME_KEY);
  saves.unshift({
    id: newId(),
    word: lastRating.word ?? "",
    idea: lastRating.idea ?? "",
    score: lastRating.score ?? null,
    feedback: lastRating.feedback ?? "",
    nextSteps: Array.isArray(lastRating.nextSteps) ? lastRating.nextSteps : [],
    createdAt: new Date().toISOString(),
  });
  saveStore(GAME_KEY, saves);
  saveRoundBtn.textContent = "Saved ✓";
  saveRoundBtn.disabled = true;
  saveStatus.textContent = "";
  renderSaved();
}

function renderSaved() {
  const saves = loadStore(GAME_KEY);
  savedCount.textContent = saves.length;
  savedList.innerHTML = "";

  if (saves.length === 0) {
    savedEmpty.classList.remove("hidden");
    return;
  }
  savedEmpty.classList.add("hidden");

  for (const s of saves) {
    const card = document.createElement("div");
    card.className = "saved-card";

    const head = document.createElement("div");
    head.className = "saved-card-head";
    const left = document.createElement("div");
    left.innerHTML = `<span class="saved-word">${escapeHtml(s.word)}</span> <span class="saved-score">${s.score}/10</span>`;
    const remove = document.createElement("button");
    remove.className = "remove-link";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      saveStore(GAME_KEY, loadStore(GAME_KEY).filter((x) => x.id !== s.id));
      renderSaved();
    });
    head.appendChild(left);
    head.appendChild(remove);

    const idea = document.createElement("p");
    idea.className = "saved-idea";
    idea.textContent = `“${s.idea}”`;

    const fb = document.createElement("p");
    fb.className = "saved-feedback";
    fb.textContent = s.feedback;

    card.appendChild(head);
    card.appendChild(idea);
    card.appendChild(fb);

    if (s.nextSteps && s.nextSteps.length) {
      const ul = document.createElement("ul");
      ul.className = "saved-next";
      for (const step of s.nextSteps) {
        const li = document.createElement("li");
        li.textContent = step;
        ul.appendChild(li);
      }
      card.appendChild(ul);
    }

    savedList.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Tabs ---------- */

let gameInitialized = false;

function showTab(which) {
  tabGen.classList.toggle("active", which === "gen");
  tabAdapt.classList.toggle("active", which === "adapt");
  tabGame.classList.toggle("active", which === "game");
  tabLiked.classList.toggle("active", which === "liked");
  panelGen.classList.toggle("hidden", which !== "gen");
  panelAdapt.classList.toggle("hidden", which !== "adapt");
  panelGame.classList.toggle("hidden", which !== "game");
  panelLiked.classList.toggle("hidden", which !== "liked");

  if (which === "liked") renderLiked();
  if (which === "game") {
    renderSaved();
    if (!gameInitialized) {
      gameInitialized = true;
      newWord();
    }
  }
}

/* ---------- Wiring ---------- */

generateBtn.addEventListener("click", generate);
wordsInput.addEventListener("input", updateHint);
perWordInput.addEventListener("input", updateHint);
tabGen.addEventListener("click", () => showTab("gen"));
tabAdapt.addEventListener("click", () => showTab("adapt"));
tabGame.addEventListener("click", () => showTab("game"));
tabLiked.addEventListener("click", () => showTab("liked"));

adaptGoBtn.addEventListener("click", runAdapt);

newWordBtn.addEventListener("click", newWord);
submitIdeaBtn.addEventListener("click", submitIdea);
saveRoundBtn.addEventListener("click", saveRound);
synToggle.addEventListener("click", () => toggleWordInfo(synToggle, synPanel));
meanToggle.addEventListener("click", () => toggleWordInfo(meanToggle, meanPanel));

updateHint();
refreshLikedCount();
