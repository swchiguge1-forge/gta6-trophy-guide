// GTA VI trophy guide: checklist, filters, roadmap and missable warnings.
// All data comes from data/trophies.json, fetched at run time from this app's
// own files. Progress is saved in localStorage and never leaves the browser.

const DATA_URL = 'data/trophies.json';
const STORE_KEY = 'gta6-trophy-guide-v1';

const STAGES = [
  { n: 1, title: 'Story path', note: 'Chapters 1 to 4, the named story missions and the finale. Play these in order; every one of these trophies pops as you finish its mission.' },
  { n: 2, title: 'Strangers & side stories', note: 'The five named stranger strands plus three more strangers out in Leonida. Take each strand as its marker appears - a strand left unfinished can close once the story moves on.' },
  { n: 3, title: 'Activities & challenges', note: 'Races, the shooting range, fishing, the arcade, bowling, meditation, hunting and the long counters: 250 stunts, 50 challenges, combat feats and the odd world events.' },
  { n: 4, title: 'Collectibles & cleanup', note: 'Card sets, WAiNK spots, vehicles, garages, exploring every area of Leonida, the money trophies and 100% completion. Nothing here can be missed, so it is safe to leave it until after the credits.' },
];

const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = { story: 'Story', activities: 'Activities', collectibles: 'Collectibles' };

const state = {
  trophies: [],
  sources: [],
  earned: {},
  spoilers: false,
  view: 'guide',
  detailId: null,
  search: '',
  grade: '',
  chapter: '',
  kind: '',
  missableOnly: false,
  remainingOnly: false,
};

const $ = (id) => document.getElementById(id);
const listEl = $('trophy-list');
const detailEl = $('detail');

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      if (saved.earned && typeof saved.earned === 'object') state.earned = saved.earned;
      if (typeof saved.spoilers === 'boolean') state.spoilers = saved.spoilers;
    }
  } catch { /* a damaged save is ignored; the checklist starts empty */ }
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ earned: state.earned, spoilers: state.spoilers }));
  } catch { /* storage full or unavailable: progress just does not persist */ }
}

function isEarned(t) { return Boolean(state.earned[t.id]); }

function isStorySpoiler(t) {
  return state.spoilers && t.kind === 'story' && !isEarned(t);
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const view = params.get('view');
  if (view === 'roadmap' || view === 'missables' || view === 'guide') state.view = view;
  const detail = Number(params.get('detail'));
  if (Number.isInteger(detail) && detail >= 1 && detail <= 55) state.detailId = detail;
  const grade = params.get('grade');
  if (grade && GRADE_LABEL[grade]) state.grade = grade;
  const chapter = params.get('chapter');
  if (chapter) state.chapter = chapter;
  const kind = params.get('kind');
  if (kind && KIND_LABEL[kind]) state.kind = kind;
  if (params.get('missable') === '1') state.missableOnly = true;
  const spoilers = params.get('spoilers');
  if (spoilers === 'on') state.spoilers = true;
  if (spoilers === 'off') state.spoilers = false;
  const q = params.get('q');
  if (q) state.search = q;
}

function syncControls() {
  $('search').value = state.search;
  $('filter-grade').value = state.grade;
  $('filter-chapter').value = state.chapter;
  $('filter-kind').value = state.kind;
  $('filter-missable').checked = state.missableOnly;
  $('filter-remaining').checked = state.remainingOnly;
  $('spoiler-toggle').checked = state.spoilers;
}

function gradeBadge(t) {
  return `<span class="grade grade-${t.grade}" title="${GRADE_LABEL[t.grade]}">${GRADE_LABEL[t.grade]}</span>`;
}

function trophyMatches(t) {
  if (state.grade && t.grade !== state.grade) return false;
  if (state.chapter && t.chapter !== state.chapter) return false;
  if (state.kind && t.kind !== state.kind) return false;
  if (state.missableOnly && !t.missable) return false;
  if (state.remainingOnly && isEarned(t)) return false;
  if (state.search) {
    const q = state.search.toLowerCase();
    const hay = `${t.name} ${t.description} ${t.guide} ${t.chapter}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderList() {
  const shown = state.trophies.filter(trophyMatches);
  $('result-line').textContent = shown.length === state.trophies.length
    ? `Showing all ${state.trophies.length} trophies.`
    : `Showing ${shown.length} of ${state.trophies.length} trophies.`;
  listEl.innerHTML = shown.map((t) => {
    const hidden = isStorySpoiler(t);
    const name = hidden ? 'Hidden story trophy — earn it to reveal' : t.name;
    const desc = hidden ? 'This story trophy is hidden while spoilers are on.' : t.description;
    return `<li class="trophy ${isEarned(t) ? 'is-earned' : ''} ${t.missable ? 'is-missable' : ''} ${state.detailId === t.id ? 'is-open' : ''}" data-id="${t.id}">
      <label class="trophy-check" title="Mark as earned">
        <input type="checkbox" data-earn="${t.id}" ${isEarned(t) ? 'checked' : ''}>
        <span class="check-box" aria-hidden="true">${isEarned(t) ? '✓' : ''}</span>
      </label>
      <button type="button" class="trophy-main" data-open="${t.id}">
        <span class="trophy-name">${escapeHtml(name)}</span>
        <span class="trophy-desc">${escapeHtml(desc)}</span>
        <span class="trophy-meta">${gradeBadge(t)}<span class="kind">${KIND_LABEL[t.kind]}</span><span class="chapter">${escapeHtml(t.chapter)}</span>${t.missable ? '<span class="missable-flag">Missable</span>' : ''}</span>
      </button>
    </li>`;
  }).join('') || '<li class="empty">No trophies match these filters. Clear the search or a filter to see the full list.</li>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderDetail() {
  const t = state.trophies.find((x) => x.id === state.detailId);
  if (!t) {
    detailEl.innerHTML = `<div class="detail-empty">
      <h2>Pick a trophy</h2>
      <p>Select any trophy in the list to read its full guide, with the sources the guide is built on and a warning when it can be missed.</p>
      <p><strong>${state.trophies.filter((x) => x.missable).length} trophies are missable.</strong> Open the Missables tab to see them all in one table.</p>
    </div>`;
    return;
  }
  const hidden = isStorySpoiler(t);
  detailEl.innerHTML = `<article class="detail-card">
    <p class="detail-kicker">${GRADE_LABEL[t.grade]} trophy &middot; ${KIND_LABEL[t.kind]} &middot; ${escapeHtml(t.chapter)}</p>
    <h2>${escapeHtml(hidden ? 'Hidden story trophy' : t.name)}</h2>
    <p class="detail-desc">${escapeHtml(hidden ? 'This story trophy is hidden while spoilers are on. Earn it in the game, tick it off here, and its name and guide will show.' : t.description)}</p>
    ${t.missable ? `<p class="detail-warning"><strong>Missable:</strong> ${escapeHtml(t.missableWhy || 'Do this while its moment is available.')}</p>` : ''}
    ${hidden ? '' : `<h3>Guide</h3><p class="detail-guide">${escapeHtml(t.guide)}</p>
    <h3>Sources</h3>
    <ul class="detail-sources">${state.sources.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`}
    <button type="button" class="earn-btn" data-earn-toggle="${t.id}">${isEarned(t) ? '✓ Earned — tick off to undo' : 'Mark as earned'}</button>
  </article>`;
}

function renderProgress() {
  const earned = state.trophies.filter(isEarned).length;
  const total = state.trophies.length || 55;
  const pct = Math.round((earned / total) * 100);
  $('progress-count').textContent = `${earned} / ${total} earned`;
  $('progress-pct').textContent = `${pct}%`;
  $('progress-fill').style.width = `${pct}%`;
  $('progress-note').textContent = earned === 0
    ? 'Tick a trophy off as you earn it. Your progress is saved in this browser only.'
    : earned === total
      ? 'Leonida Legend — every trophy earned. Congratulations!'
      : `${total - earned} to go. The roadmap tab shows the order to take them in.`;
}

function renderRoadmap() {
  $('stages').innerHTML = STAGES.map((s) => {
    const members = state.trophies.filter((t) => t.stage === s.n);
    const earned = members.filter(isEarned).length;
    return `<article class="stage">
      <h3><span class="stage-num">Stage ${s.n}</span> ${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.note)}</p>
      <p class="stage-count">${earned} / ${members.length} earned in this stage</p>
      <div class="stage-bar"><div style="width:${members.length ? Math.round((earned / members.length) * 100) : 0}%"></div></div>
      <p class="stage-names">${members.map((t) => escapeHtml(isStorySpoiler(t) ? 'Hidden story trophy' : t.name)).join(' · ')}</p>
    </article>`;
  }).join('');
}

function renderMissables() {
  const missables = state.trophies.filter((t) => t.missable);
  $('missable-count').textContent = `(${missables.length})`;
  $('missable-body').innerHTML = missables.map((t) => `<tr class="${isEarned(t) ? 'is-earned' : ''}">
    <td><strong>${escapeHtml(t.name)}</strong><br><span class="missable-desc">${escapeHtml(t.description)}</span></td>
    <td>${GRADE_LABEL[t.grade]}</td>
    <td>${escapeHtml(t.missableWhy || '')}</td>
    <td><button type="button" data-open="${t.id}">Guide</button></td>
  </tr>`).join('');
}

function setView(view) {
  state.view = view;
  document.querySelectorAll('.view-tab').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('is-active', s.id === `view-${view}`));
  if (view === 'roadmap') renderRoadmap();
  if (view === 'missables') renderMissables();
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
  setView(state.view);
}

function toggleEarned(id) {
  if (state.earned[id]) delete state.earned[id];
  else state.earned[id] = true;
  saveState();
  renderAll();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: Object.keys(state.earned).map(Number).sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('no list');
      const next = {};
      for (const id of ids) {
        const n = Number(id);
        if (Number.isInteger(n) && n >= 1 && n <= 55) next[n] = true;
      }
      state.earned = next;
      saveState();
      renderAll();
    } catch {
      alert('That file is not a progress export from this guide.');
    }
  };
  reader.readAsText(file);
}

async function init() {
  applyUrlParams();
  loadState();
  // URL params win over the saved spoiler setting for shared links.
  if (new URLSearchParams(location.search).has('spoilers')) saveState();
  syncControls();
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`trophies.json: ${res.status}`);
    const data = await res.json();
    state.trophies = data.trophies || [];
    state.sources = data.sources || [];
  } catch (err) {
    listEl.innerHTML = '<li class="empty">The trophy data could not be loaded. This guide needs its own data/trophies.json file beside it.</li>';
    return;
  }
  renderAll();

  document.querySelectorAll('.view-tab').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('search').addEventListener('input', (e) => { state.search = e.target.value; renderList(); });
  $('filter-grade').addEventListener('change', (e) => { state.grade = e.target.value; renderList(); });
  $('filter-chapter').addEventListener('change', (e) => { state.chapter = e.target.value; renderList(); });
  $('filter-kind').addEventListener('change', (e) => { state.kind = e.target.value; renderList(); });
  $('filter-missable').addEventListener('change', (e) => { state.missableOnly = e.target.checked; renderList(); });
  $('filter-remaining').addEventListener('change', (e) => { state.remainingOnly = e.target.checked; renderList(); });
  $('spoiler-toggle').addEventListener('change', (e) => { state.spoilers = e.target.checked; saveState(); renderAll(); });
  $('export-btn').addEventListener('click', exportProgress);
  $('import-btn').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', (e) => { if (e.target.files[0]) importProgress(e.target.files[0]); e.target.value = ''; });

  listEl.addEventListener('change', (e) => {
    const id = e.target.dataset && e.target.dataset.earn;
    if (id) toggleEarned(Number(id));
  });
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (btn) {
      state.detailId = Number(btn.dataset.open);
      renderList();
      renderDetail();
      detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  detailEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-earn-toggle]');
    if (btn) toggleEarned(Number(btn.dataset.earnToggle));
  });
  $('missable-body').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (btn) {
      state.detailId = Number(btn.dataset.open);
      setView('guide');
      renderAll();
      detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

init();
