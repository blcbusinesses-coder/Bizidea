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

/* ---------- Likes ---------- */

async function refreshLikedCount() {
  const res = await fetch("/api/likes");
  const data = await res.json();
  likedCount.textContent = data.likes.length;
  return data.likes;
}

async function likeIdea(idea, btn) {
  const res = await fetch("/api/likes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(idea),
  });
  const saved = await res.json();
  btn.classList.add("liked");
  btn.dataset.likeId = saved.id;
  btn.title = "Remove from liked";
  await refreshLikedCount();
}

async function unlikeById(id) {
  await fetch(`/api/likes/${id}`, { method: "DELETE" });
  await refreshLikedCount();
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

let currentWord = "";
let lastRating = null;

async function newWord() {
  newWordBtn.disabled = true;
  gameWordEl.textContent = "…";
  gameResult.classList.add("hidden");
  gameIdea.value = "";
  lastRating = null;
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

async function saveRound() {
  if (!lastRating) return;
  saveRoundBtn.disabled = true;
  try {
    await fetch("/api/game/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastRating),
    });
    saveRoundBtn.textContent = "Saved ✓";
    saveStatus.textContent = "";
    renderSaved();
  } catch (err) {
    saveStatus.textContent = `Error: ${err.message}`;
    saveRoundBtn.disabled = false;
  }
}

async function renderSaved() {
  const res = await fetch("/api/game/saves");
  const data = await res.json();
  const saves = data.saves || [];
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
    remove.addEventListener("click", async () => {
      await fetch(`/api/game/saves/${s.id}`, { method: "DELETE" });
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

updateHint();
refreshLikedCount();
