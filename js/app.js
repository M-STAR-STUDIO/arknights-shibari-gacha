import { MODES, SQUAD_SIZE, drawSquad, rerollSquad } from './gacha.js';
import { avatarUrl, classIconUrl, loadImage, preloadSquad, CLASS_JP, CLASS_SHORT } from './assets.js';
import { renderShareImage, canvasToBlob, tweetText, SITE_URL } from './share.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
const grid = $('grid');
const hint = $('hint');
const squadCount = $('squadCount');
const modeDesc = $('modeDesc');

const state = {
  operators: [],
  mode: 'easy',
  squad: [],          // 12 operators
  revealed: [],       // boolean per slot
  selected: new Set(),// reroll selection
  ui: 'idle',         // idle | reveal | result | reroll
};

// ---------- data ----------
async function loadOperators() {
  const res = await fetch('data/operators.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('operators.json load failed');
  const json = await res.json();
  return json.operators;
}

// ---------- state ----------
function setUi(ui) {
  state.ui = ui;
  app.dataset.state = ui;
  updateHint();
}

function updateHint() {
  const n = state.revealed.filter(Boolean).length;
  squadCount.textContent = `${state.squad.length ? n : 0} / ${SQUAD_SIZE}`;
  switch (state.ui) {
    case 'idle': hint.textContent = '難易度を選んで「引く」'; break;
    case 'reveal': hint.textContent = 'タップしてめくる'; break;
    case 'result': hint.textContent = ''; break;
    case 'reroll': hint.textContent = '引き直すオペレーターをタップして選択'; break;
  }
}

function describeMode(key) {
  const w = MODES[key].weights;
  const parts = [];
  if (w[6]) parts.push(`★6 ${w[6]}%`);
  if (w[5]) parts.push(`★5 ${w[5]}%`);
  if (w[4]) parts.push(`★4 ${w[4]}%`);
  if (w[3]) parts.push(`★3 ${w[3]}%`);
  if (w.low) parts.push(`★1-2 ${w.low}%`);
  return parts.join('  /  ');
}

function setMode(key) {
  state.mode = key;
  for (const b of document.querySelectorAll('.mode')) {
    b.setAttribute('aria-checked', b.dataset.mode === key ? 'true' : 'false');
  }
  modeDesc.textContent = describeMode(key);
}

// ---------- grid rendering ----------
function slotEl(i) {
  return grid.children[i];
}

function renderEmptyGrid() {
  grid.innerHTML = '';
  for (let i = 0; i < SQUAD_SIZE; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.index = i;
    slot.innerHTML = `
      <div class="card">
        <div class="face face--empty"><span class="slot-num">${String(i + 1).padStart(2, '0')}</span></div>
      </div>`;
    grid.appendChild(slot);
  }
}

function buildCardFaces(i, op) {
  const num = String(i + 1).padStart(2, '0');
  return `
    <div class="face face--back"><div class="back-inner"><span class="back-num">${num}</span></div></div>
    <div class="face face--front">
      <div class="inner">
        <img class="art" alt="" draggable="false">
        <div class="name-fallback"></div>
        <div class="strip"></div>
        <div class="cls" title="${CLASS_JP[op.cls]}">
          <img alt="${CLASS_JP[op.cls]}" draggable="false">
          <span class="cls-txt">${CLASS_SHORT[op.cls]}</span>
        </div>
      </div>
    </div>
    <div class="check">✓</div>`;
}

function fillSlot(i, op) {
  const slot = slotEl(i);
  slot.dataset.rarity = op.rarity;
  slot.dataset.id = op.id;
  const card = slot.querySelector('.card');
  card.innerHTML = buildCardFaces(i, op);

  const front = card.querySelector('.face--front');
  const art = front.querySelector('.art');
  const nameFb = front.querySelector('.name-fallback');
  nameFb.textContent = op.name;
  const clsBox = front.querySelector('.cls');
  const clsImg = clsBox.querySelector('img');

  loadImage(avatarUrl(op)).then((img) => {
    if (slot.dataset.id !== op.id) return;
    if (img) { art.src = img.src; art.classList.remove('is-hidden'); front.classList.remove('no-art'); }
    else { art.classList.add('is-hidden'); front.classList.add('no-art'); }
  });
  loadImage(classIconUrl(op.cls)).then((img) => {
    if (slot.dataset.id !== op.id) return;
    if (img) { clsImg.src = img.src; clsBox.classList.remove('no-icon'); }
    else clsBox.classList.add('no-icon');
  });
}

function renderSquadFaceDown(squad) {
  for (let i = 0; i < SQUAD_SIZE; i++) {
    const slot = slotEl(i);
    slot.classList.remove('is-flipped', 'is-selected');
    slot.classList.add('is-flippable');
    fillSlot(i, squad[i]);
  }
}

function reveal(i) {
  if (state.revealed[i]) return;
  state.revealed[i] = true;
  const slot = slotEl(i);
  slot.classList.add('is-flipped');
  slot.classList.remove('is-flippable');
  updateHint();
  if (state.revealed.every(Boolean)) {
    setTimeout(() => setUi('result'), 450);
  }
}

function revealAll() {
  let delay = 0;
  for (let i = 0; i < SQUAD_SIZE; i++) {
    if (state.revealed[i]) continue;
    setTimeout(() => reveal(i), delay);
    delay += 70;
  }
}

// ---------- actions ----------
function onDraw() {
  if (!state.operators.length) return;
  state.squad = drawSquad(state.operators, state.mode);
  state.revealed = new Array(SQUAD_SIZE).fill(false);
  state.selected.clear();
  preloadSquad(state.squad); // warm cache; not awaited
  renderSquadFaceDown(state.squad);
  setUi('reveal');
  window.scrollTo({ top: grid.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
}

function onAgain() {
  state.squad = [];
  state.revealed = [];
  state.selected.clear();
  renderEmptyGrid();
  setUi('idle');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enterReroll() {
  state.selected.clear();
  for (const s of grid.children) s.classList.remove('is-selected');
  $('btnRerollGo').disabled = true;
  setUi('reroll');
}

function cancelReroll() {
  state.selected.clear();
  for (const s of grid.children) s.classList.remove('is-selected');
  setUi('result');
}

function toggleSelect(i) {
  const slot = slotEl(i);
  if (state.selected.has(i)) { state.selected.delete(i); slot.classList.remove('is-selected'); }
  else { state.selected.add(i); slot.classList.add('is-selected'); }
  $('btnRerollGo').disabled = state.selected.size === 0;
  hint.textContent = state.selected.size ? `${state.selected.size}体を引き直す` : '引き直すオペレーターをタップして選択';
}

async function doReroll() {
  const indices = [...state.selected].sort((a, b) => a - b);
  if (!indices.length) return;
  const next = rerollSquad(state.operators, state.squad, indices);
  const changed = indices.filter((i) => next[i].id !== state.squad[i].id);
  state.squad = next;
  state.selected.clear();
  setUi('result');

  // flip changed cards face down, swap, flip back
  for (const i of changed) {
    const slot = slotEl(i);
    slot.classList.remove('is-selected');
    slot.classList.remove('is-flipped');
  }
  for (const i of indices) slotEl(i).classList.remove('is-selected');
  await preloadSquad(changed.map((i) => next[i]));
  await wait(380);
  for (const i of changed) fillSlot(i, next[i]);
  await wait(60);
  changed.forEach((i, k) => setTimeout(() => slotEl(i).classList.add('is-flipped'), k * 70));
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- share ----------
let logoPromise = null;
function getLogo() {
  if (!logoPromise) logoPromise = loadImage('assets/logo-mstar-studio.png');
  return logoPromise;
}

let currentBlob = null;
let currentUrl = null;

async function openShare() {
  const modal = $('shareModal');
  const preview = $('sharePreview');
  const btnShare = $('btnShare');
  btnShare.classList.add('is-busy');
  preview.innerHTML = '<div class="spinner">RENDERING...</div>';
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  const text = tweetText(state.mode);
  $('shareText').value = text;
  $('btnTweet').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

  try {
    const logo = await getLogo();
    const canvas = await renderShareImage(state.squad, state.mode, logo);
    const blob = await canvasToBlob(canvas);
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentBlob = blob;
    currentUrl = URL.createObjectURL(blob);
    preview.innerHTML = '';
    const img = new Image();
    img.src = currentUrl;
    img.alt = 'シェア画像';
    preview.appendChild(img);
    $('btnSaveImage').href = currentUrl;
    $('btnSaveImage').removeAttribute('aria-disabled');

    const file = new File([blob], 'arknights-shibari-gacha.png', { type: 'image/png' });
    const canNative = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
    $('btnNativeShare').hidden = !canNative;
    $('shareNote').textContent = canNative
      ? '「画像ごと共有」でXアプリ等に直接送れます。使えない場合は画像を保存してから投稿してください。'
      : '画像を保存してから「Xで投稿」で添付してください。';
  } catch (e) {
    console.error(e);
    preview.innerHTML = '<div class="spinner">画像の生成に失敗しました</div>';
    $('btnSaveImage').setAttribute('aria-disabled', 'true');
  } finally {
    btnShare.classList.remove('is-busy');
  }
}

function closeShare() {
  $('shareModal').hidden = true;
  document.body.style.overflow = '';
}

async function nativeShare() {
  if (!currentBlob) return;
  const file = new File([currentBlob], 'arknights-shibari-gacha.png', { type: 'image/png' });
  try {
    await navigator.share({ files: [file], text: tweetText(state.mode) });
  } catch (e) {
    if (e && e.name !== 'AbortError') console.warn(e);
  }
}

async function copyText() {
  const t = $('shareText').value;
  try {
    await navigator.clipboard.writeText(t);
    $('btnCopyText').textContent = 'コピーしました';
    setTimeout(() => { $('btnCopyText').textContent = '文章をコピー'; }, 1500);
  } catch {
    $('shareText').select();
  }
}

// ---------- events ----------
$('modes').addEventListener('click', (e) => {
  const b = e.target.closest('.mode');
  if (!b || state.ui !== 'idle') return;
  setMode(b.dataset.mode);
});

grid.addEventListener('click', (e) => {
  const slot = e.target.closest('.slot');
  if (!slot) return;
  const i = Number(slot.dataset.index);
  if (state.ui === 'reveal') reveal(i);
  else if (state.ui === 'reroll') toggleSelect(i);
});

$('btnDraw').addEventListener('click', onDraw);
$('btnRevealAll').addEventListener('click', revealAll);
$('btnAgain').addEventListener('click', onAgain);
$('btnReroll').addEventListener('click', enterReroll);
$('btnRerollCancel').addEventListener('click', cancelReroll);
$('btnRerollGo').addEventListener('click', doReroll);
$('btnShare').addEventListener('click', openShare);
$('btnNativeShare').addEventListener('click', nativeShare);
$('btnCopyText').addEventListener('click', copyText);
for (const el of document.querySelectorAll('#shareModal [data-close]')) el.addEventListener('click', closeShare);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('shareModal').hidden) closeShare(); });

// ---------- init ----------
setMode('easy');
renderEmptyGrid();
setUi('idle');
loadOperators()
  .then((ops) => { state.operators = ops; })
  .catch((e) => {
    console.error(e);
    hint.textContent = 'データの読み込みに失敗しました。再読み込みしてください。';
    $('btnDraw').disabled = true;
  });

// expose for OGP generation script (dev only)
window.__gacha = { state, renderShareImage, SITE_URL };
