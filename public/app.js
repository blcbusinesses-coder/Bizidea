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
const tabGame = document.getElementById("tab-game");
const tabLiked = document.getElementById("tab-liked");
const panelGen = document.getElementById("panel-gen");
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

const mediumMs = document.getElementById("medium-ms");
const mediumToggle = document.getElementById("medium-toggle");
const mediumPanel = document.getElementById("medium-panel");
const mediumOptions = document.getElementById("medium-options");
const mediumSummary = document.getElementById("medium-summary");
const mediumClear = document.getElementById("medium-clear");

for (const m of MEDIUMS) {
  const label = document.createElement("label");
  label.className = "ms-option";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.value = m;
  cb.addEventListener("change", updateMediumLabel);
  label.appendChild(cb);
  label.appendChild(document.createTextNode(" " + m));
  mediumOptions.appendChild(label);
}

function selectedMediums() {
  return [...mediumOptions.querySelectorAll("input:checked")].map((c) => c.value);
}

function updateMediumLabel() {
  const sel = selectedMediums();
  if (sel.length === 0) {
    mediumToggle.textContent = "Any";
    mediumSummary.textContent = "Any medium";
  } else if (sel.length === 1) {
    mediumToggle.textContent = sel[0];
    mediumSummary.textContent = "1 selected";
  } else {
    mediumToggle.textContent = `${sel.length} selected`;
    mediumSummary.textContent = `${sel.length} selected`;
  }
}

mediumToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  mediumPanel.classList.toggle("hidden");
});

mediumClear.addEventListener("click", () => {
  mediumOptions.querySelectorAll("input:checked").forEach((c) => (c.checked = false));
  updateMediumLabel();
});

document.addEventListener("click", (e) => {
  if (!mediumMs.contains(e.target)) mediumPanel.classList.add("hidden");
});

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

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");

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
  tabGame.classList.toggle("active", which === "game");
  tabLiked.classList.toggle("active", which === "liked");
  panelGen.classList.toggle("hidden", which !== "gen");
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
tabGame.addEventListener("click", () => showTab("game"));
tabLiked.addEventListener("click", () => showTab("liked"));

newWordBtn.addEventListener("click", newWord);
submitIdeaBtn.addEventListener("click", submitIdea);
saveRoundBtn.addEventListener("click", saveRound);
synToggle.addEventListener("click", () => toggleWordInfo(synToggle, synPanel));
meanToggle.addEventListener("click", () => toggleWordInfo(meanToggle, meanPanel));

updateHint();
refreshLikedCount();
