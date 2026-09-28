import { MODES, SQUAD_SIZE, CLASSES, drawSquad, rerollSquad } from './gacha.js';
import { avatarUrl, classIconUrl, fullArtUrl, loadImage, preloadSquad } from './assets.js';
import { renderShareImage, canvasToBlob, tweetText, SITE_URL } from './share.js';
import { T, CLASS_NAME, CLASS_ABBR, OPERATORS_URL } from './i18n.js';
import { parseShareId, fetchOwned, loadOwned, saveOwned, clearOwned } from './owned.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
const grid = $('grid');
const hint = $('hint');
const squadCount = $('squadCount');
const modeDesc = $('modeDesc');

const state = {
  operators: [],
  mode: 'easy',
  guarantee: false,   // 職分保証
  game: 'normal',     // 'normal' (12体) | 'sss' (保全駐在 20体)
  count: SQUAD_SIZE,  // 人数指定 (1〜12。保全駐在のときは使わない)
  classes: new Set(), // 職分指定 (空 = 指定なし = 全職分)
  pinned: new Map(),  // キャラ固定: slot index -> operator (引き直しても変わらない)
  pinMode: false,     // キャラ固定の選択中
  owned: null,        // {id, codes, count, fetchedAt} | null  (ID登録: 所持データ)
  squad: [],          // 12 operators
  revealed: [],       // boolean per slot
  selected: new Set(),// reroll selection
  ui: 'idle',         // idle | reveal | result | reroll
};

// ---------- data ----------
async function loadOperators() {
  const res = await fetch(OPERATORS_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error('operators.json load failed');
  const json = await res.json();
  return json.operators;
}

// ---------- state ----------
function setUi(ui) {
  state.ui = ui;
  app.dataset.state = ui;
  if (ui !== 'idle' && ui !== 'result') state.pinMode = false;
  renderPinButton();
  updateHint();
}

const SSS_SIZE = 20;
function squadSize() { return state.game === 'sss' ? SSS_SIZE : state.count; }
function perClass() { return state.game === 'sss' ? 2 : 1; } // 職分保証: 保全駐在は各職分2体

/** Everyone, or only the owned ones when an ID is registered. */
function ownedPool() {
  if (!state.owned) return state.operators;
  const codes = new Set(state.owned.codes);
  return state.operators.filter((o) => codes.has(o.code));
}

/** Operators eligible for drawing: ownedPool() narrowed to the selected classes (職分指定). */
function pool() {
  const ops = ownedPool();
  return state.classes.size ? ops.filter((o) => state.classes.has(o.cls)) : ops;
}

function updateHint() {
  const n = state.revealed.filter(Boolean).length;
  squadCount.textContent = `${state.squad.length ? n : state.pinned.size} / ${state.squad.length || squadSize()}`;
  if (state.pinMode) { hint.textContent = state.ui === 'idle' ? T.hintPinIdle : T.hintPinResult; return; }
  switch (state.ui) {
    case 'idle': hint.textContent = state.owned ? T.hintIdleOwned(ownedPool().length) : T.hintIdle; break;
    case 'reveal': hint.textContent = T.hintReveal; break;
    case 'result': hint.textContent = T.hintResult; break;
    case 'reroll': hint.textContent = T.hintReroll; break;
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

function setGuarantee(on) {
  state.guarantee = !!on;
  for (const b of document.querySelectorAll('.seg__btn')) {
    b.setAttribute('aria-checked', (b.dataset.guarantee === '1') === state.guarantee ? 'true' : 'false');
  }
  $('guaranteeDesc').textContent = guaranteeText();
}

function guaranteeText() {
  if (!state.guarantee) return T.guaranteeOff;
  const k = state.classes.size || CLASSES.length;
  const n = squadSize();
  const per = perClass();
  if (k === 1) return T.guaranteeSingle;
  if (n < k) return T.guaranteeSubset(n);
  if (k === CLASSES.length && state.game === 'sss') return T.guaranteeSss;
  if (k === CLASSES.length && n === SQUAD_SIZE) return T.guaranteeNormal;
  return T.guaranteeCustom(k, per, n - k * per);
}

// ---------- 人数・職分の指定 ----------
function isCustom() {
  return state.classes.size > 0 || (state.game !== 'sss' && state.count !== SQUAD_SIZE);
}

function classNames() {
  return CLASSES.filter((c) => state.classes.has(c)).map((c) => CLASS_NAME[c]).join(T.listSep);
}

function buildCustomPanel() {
  const t = $('customToggle');
  t.textContent = T.customPill;
  t.title = T.customTitle;
  $('customCountLabel').textContent = T.customCount;
  $('customClassLabel').textContent = T.customClasses;
  $('customReset').textContent = T.customReset;
  $('customSssNote').textContent = T.customSssNote;
  $('customNums').innerHTML = Array.from({ length: SQUAD_SIZE }, (_, i) =>
    `<button class="chip chip--num" type="button" role="radio" data-count="${i + 1}">${i + 1}</button>`).join('');
  $('customClasses').innerHTML = CLASSES.map((c) =>
    `<button class="chip" type="button" data-cls="${c}" aria-pressed="false">${CLASS_NAME[c]}</button>`).join('');
}

function renderCustom() {
  const sss = state.game === 'sss';
  for (const b of $('customNums').children) {
    b.setAttribute('aria-checked', !sss && Number(b.dataset.count) === state.count ? 'true' : 'false');
  }
  $('customNums').classList.toggle('is-off', sss);
  $('customSssNote').hidden = !sss;
  for (const b of $('customClasses').children) {
    b.setAttribute('aria-pressed', state.classes.has(b.dataset.cls) ? 'true' : 'false');
  }
  $('customStatus').textContent = T.customStatus(squadSize(), classNames());
  $('customStatus').classList.toggle('is-ok', isCustom());
  $('customReset').hidden = !isCustom();
  $('customToggle').setAttribute('aria-pressed', isCustom() ? 'true' : 'false');
  setGuarantee(state.guarantee); // the guarantee text depends on the size and the classes
  if (state.ui === 'idle') { renderEmptyGrid(); updateHint(); }
}

function setCount(n) {
  state.count = Math.min(SQUAD_SIZE, Math.max(1, n | 0));
  if (state.game === 'sss') { setGame('normal'); return; } // setGame re-renders
  renderCustom();
}

function toggleClass(cls) {
  if (state.classes.has(cls)) state.classes.delete(cls); else state.classes.add(cls);
  if (state.classes.size === CLASSES.length) state.classes.clear(); // all selected = no restriction
  renderCustom();
}

function resetCustom() {
  state.count = SQUAD_SIZE;
  state.classes.clear();
  renderCustom();
}

function setGame(game) {
  state.game = game === 'sss' ? 'sss' : 'normal';
  app.dataset.game = state.game;
  $('gameToggle').setAttribute('aria-pressed', state.game === 'sss' ? 'true' : 'false');
  renderCustom(); // refreshes the guarantee text and the empty grid for the new size
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

function makeEmptySlot(i) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  slot.dataset.index = i;
  slot.innerHTML = `
      <div class="card">
        <div class="face face--empty"><span class="slot-num">${String(i + 1).padStart(2, '0')}</span></div>
      </div>`;
  return slot;
}

function renderEmptyGrid() {
  grid.innerHTML = '';
  const n = squadSize();
  grid.dataset.n = n;
  grid.style.setProperty('--n', n);
  for (let i = 0; i < n; i++) {
    grid.appendChild(makeEmptySlot(i));
  }
  packPins(n);
  for (const [i, op] of state.pinned) showPinned(i, op);
}

// ---------- キャラ固定 ----------
/** Keep every fixed operator inside the first n slots (move to the lowest free slot; drop what does not fit). */
function packPins(n) {
  const out = [...state.pinned].filter(([i]) => i >= n).map(([, op]) => op);
  for (const i of [...state.pinned.keys()]) if (i >= n) state.pinned.delete(i);
  for (const op of out) {
    let free = 0;
    while (free < n && state.pinned.has(free)) free++;
    if (free < n) state.pinned.set(free, op);
  }
}

function markPinned(i, on) {
  const slot = slotEl(i);
  if (!slot) return;
  slot.classList.toggle('is-pinned', on);
}

/** Face-up card in a slot without the flip animation (fixed operators before a draw). */
function showPinned(i, op) {
  const slot = slotEl(i);
  if (!slot) return;
  fillSlot(i, op);
  slot.classList.remove('is-flippable', 'is-selected', 'was-flipped');
  slot.classList.add('is-flipped', 'no-anim');
  markPinned(i, true);
}

function clearSlot(i) {
  const old = slotEl(i);
  if (old) grid.replaceChild(makeEmptySlot(i), old);
}

function renderPinButton() {
  const b = $('btnPin');
  if (!b) return;
  app.dataset.pin = state.pinMode ? '1' : '0';
  b.setAttribute('aria-pressed', state.pinMode ? 'true' : 'false');
  b.textContent = state.pinMode ? T.pinDone : T.pinBtn;
}

function togglePinMode() {
  if (state.ui !== 'idle' && state.ui !== 'result') return;
  state.pinMode = !state.pinMode;
  renderPinButton();
  updateHint();
}

function onPinTap(i) {
  if (state.ui === 'idle') {
    if (state.pinned.has(i)) { state.pinned.delete(i); clearSlot(i); updateHint(); }
    else openPicker(i);
    return;
  }
  // result: fix / release the operator that is already there
  const op = state.squad[i];
  if (!op || !state.revealed[i]) return;
  if (state.pinned.has(i)) state.pinned.delete(i); else state.pinned.set(i, op);
  markPinned(i, state.pinned.has(i));
}

// ----- picker: search by name; 異格 switches the list to alter operators -----
let pickSlot = -1;
let pickAlter = false;

const kana = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '')
  .replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60)); // ひらがな -> カタカナ

function pickerMatches() {
  const q = kana($('pinSearch').value);
  const byId = new Map(state.operators.map((o) => [o.id, o]));
  return state.operators
    .filter((o) => !!o.alt === pickAlter)
    .filter((o) => !q || kana(o.name).includes(q) || (o.alt && kana(byId.get(o.alt)?.name).includes(q)))
    .map((o, k) => [o, k])
    .sort((a, b) => b[0].rarity - a[0].rarity || a[1] - b[1])
    .map(([o]) => o);
}

function renderPicker() {
  $('pinAlter').setAttribute('aria-pressed', pickAlter ? 'true' : 'false');
  const taken = new Set([...state.pinned.values()].map((o) => o.id));
  const list = pickerMatches();
  const box = $('pinList');
  box.scrollTop = 0;
  if (!list.length) { box.innerHTML = `<div class="pinbox__empty">${T.pinEmpty}</div>`; return; }
  box.innerHTML = '';
  for (const op of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.id = op.id;
    b.dataset.rarity = op.rarity;
    b.disabled = taken.has(op.id);
    const img = document.createElement('img');
    img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; img.draggable = false;
    img.src = avatarUrl(op);
    img.addEventListener('error', () => { img.style.visibility = 'hidden'; }, { once: true });
    const txt = document.createElement('span');
    txt.className = 'pick__txt';
    const name = document.createElement('span');
    name.className = 'pick__name';
    name.textContent = op.name;
    const meta = document.createElement('span');
    meta.className = 'pick__meta';
    meta.textContent = `★${op.rarity} ${CLASS_NAME[op.cls]}${b.disabled ? ' / ' + T.pinTaken : ''}`;
    txt.append(name, meta);
    b.append(img, txt);
    box.appendChild(b);
  }
}

function openPicker(i) {
  pickSlot = i;
  pickAlter = false;
  $('pinSearch').value = '';
  renderPicker();
  $('pinModal').hidden = false; // no auto-focus: the list is usable without the keyboard
  document.body.style.overflow = 'hidden';
}

function closePicker() {
  $('pinModal').hidden = true;
  $('pinSearch').blur();
  document.body.style.overflow = '';
  pickSlot = -1;
}

function onPick(id) {
  const op = state.operators.find((o) => o.id === id);
  if (!op || pickSlot < 0 || state.ui !== 'idle') { closePicker(); return; }
  state.pinned.set(pickSlot, op);
  showPinned(pickSlot, op);
  closePicker();
  updateHint();
}

function buildCardFaces(i, op) {
  const num = String(i + 1).padStart(2, '0');
  return `
    <div class="face face--back"><div class="back-inner">
      <span class="back-num">${num}</span>
      <div class="cls" title="${CLASS_NAME[op.cls]}">
        <img alt="${CLASS_NAME[op.cls]}" draggable="false">
        <span class="cls-txt">${CLASS_ABBR[op.cls]}</span>
      </div>
    </div></div>
    <div class="face face--front">
      <div class="inner">
        <img class="art" alt="" draggable="false">
        <div class="name-fallback"></div>
        <div class="strip"></div>
        <div class="cls" title="${CLASS_NAME[op.cls]}">
          <img alt="${CLASS_NAME[op.cls]}" draggable="false">
          <span class="cls-txt">${CLASS_ABBR[op.cls]}</span>
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
  art.classList.add('is-hidden'); // no broken-image icon while the face icon loads
  const clsBoxes = [...card.querySelectorAll('.cls')]; // front and back

  loadImage(avatarUrl(op)).then((img) => {
    if (slot.dataset.id !== op.id) return;
    if (img) { art.src = img.src; art.classList.remove('is-hidden'); front.classList.remove('no-art'); }
    else { art.classList.add('is-hidden'); front.classList.add('no-art'); }
  });
  loadImage(classIconUrl(op.cls)).then((img) => {
    if (slot.dataset.id !== op.id) return;
    for (const box of clsBoxes) {
      if (img) { box.querySelector('img').src = img.src; box.classList.remove('no-icon'); }
      else box.classList.add('no-icon');
    }
  });
}

function renderSquadFaceDown(squad) {
  for (let i = 0; i < squad.length; i++) {
    if (state.pinned.has(i)) continue; // fixed operators stay face up
    const slot = slotEl(i);
    slot.classList.remove('is-flipped', 'is-selected', 'was-flipped');
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
  for (let i = 0; i < state.squad.length; i++) {
    if (state.revealed[i]) continue;
    setTimeout(() => reveal(i), delay);
    delay += 70;
  }
}

// ---------- actions ----------
function onDraw() {
  if (!state.operators.length) return;
  const n = squadSize();
  packPins(n);
  const fixed = state.pinned;
  const fixedIds = new Set([...fixed.values()].map((o) => o.id));
  const free = n - fixed.size;
  const ops = pool().filter((o) => !fixedIds.has(o.id));
  if (ops.length < free) { hint.textContent = T.hintNotEnough(ops.length, free); return; }
  const drawn = free > 0
    ? drawSquad(ops, state.mode, {
      guarantee: state.guarantee, size: free, perClass: perClass(), have: [...fixed.values()].map((o) => o.cls),
    })
    : [];
  let k = 0;
  state.squad = Array.from({ length: n }, (_, i) => fixed.get(i) || drawn[k++]);
  state.revealed = state.squad.map((_, i) => fixed.has(i));
  state.selected.clear();
  preloadSquad(state.squad); // warm cache; not awaited
  renderSquadFaceDown(state.squad);
  setUi(free > 0 ? 'reveal' : 'result');
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
  if (state.pinned.has(i)) return; // fixed operators are never rerolled
  const slot = slotEl(i);
  if (state.selected.has(i)) { state.selected.delete(i); slot.classList.remove('is-selected'); }
  else { state.selected.add(i); slot.classList.add('is-selected'); }
  $('btnRerollGo').disabled = state.selected.size === 0;
  hint.textContent = state.selected.size ? T.hintRerollCount(state.selected.size) : T.hintReroll;
}

async function doReroll() {
  const indices = [...state.selected].sort((a, b) => a - b);
  if (!indices.length) return;
  const next = rerollSquad(pool(), state.squad, indices, { guarantee: state.guarantee, perClass: perClass() });
  const changed = indices.filter((i) => next[i].id !== state.squad[i].id);
  state.squad = next;
  state.selected.clear();
  setUi('result');

  // flip changed cards face down, swap, flip back
  for (const i of changed) {
    const slot = slotEl(i);
    slot.classList.remove('is-selected');
    slot.classList.add('was-flipped');
    slot.classList.remove('is-flipped');
  }
  for (const i of indices) slotEl(i).classList.remove('is-selected');
  await preloadSquad(changed.map((i) => next[i]));
  await wait(500);
  for (const i of changed) fillSlot(i, next[i]);
  await wait(60);
  changed.forEach((i, k) => setTimeout(() => slotEl(i).classList.add('is-flipped'), k * 70));
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- share ----------
let logoPromise = null;
function getLogo() {
  if (!logoPromise) logoPromise = loadImage(new URL('../assets/logo-mstar-studio.png', import.meta.url).href);
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

  const text = tweetText(state.mode, { game: state.game, count: state.squad.length });
  $('shareText').value = text;

  try {
    const logo = await getLogo();
    const canvas = await renderShareImage(state.squad, state.mode, logo, {
      guarantee: state.guarantee, game: state.game, classes: CLASSES.filter((c) => state.classes.has(c)),
      pinned: [...state.pinned.keys()],
    });
    const blob = await canvasToBlob(canvas);
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentBlob = blob;
    currentUrl = URL.createObjectURL(blob);
    preview.innerHTML = '';
    const img = new Image();
    img.src = currentUrl;
    img.alt = T.shareAlt;
    preview.appendChild(img);
    $('btnSaveImage').href = currentUrl;
    $('btnSaveImage').removeAttribute('aria-disabled');

    const file = new File([blob], 'arknights-shibari-gacha.png', { type: 'image/png' });
    const canNative = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
    $('btnNativeShare').hidden = !canNative;
    $('shareNote').textContent = canNative
      ? T.shareNoteNative
      : T.shareNoteSave;
  } catch (e) {
    console.error(e);
    preview.innerHTML = `<div class="spinner">${T.shareFail}</div>`;
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
    // image + hashtag text + site URL (URL passed separately so apps like X pick up both text and link)
    await navigator.share({
      files: [file],
      title: T.siteTitle,
      text: tweetText(state.mode, { game: state.game, count: state.squad.length, noUrl: true }),
      url: SITE_URL,
    });
  } catch (e) {
    if (e && e.name !== 'AbortError') console.warn(e);
  }
}

// ---------- tap detail ----------
function canShowDetail(i) {
  if (state.ui === 'idle') return state.pinned.has(i);
  return state.squad.length > 0 && !!state.revealed[i] && (state.ui === 'result' || state.ui === 'reveal');
}

/** Crop away transparent padding so the character fills the box. Returns a canvas (or the image on failure). */
function cropToContent(img) {
  try {
    const S = 256;
    const probe = document.createElement('canvas');
    probe.width = S; probe.height = S;
    const pc = probe.getContext('2d', { willReadFrequently: true });
    pc.drawImage(img, 0, 0, S, S);
    const d = pc.getImageData(0, 0, S, S).data;
    let minX = S, minY = S, maxX = -1, maxY = -1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (d[(y * S + x) * 4 + 3] > 16) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    if (maxX < 0) return img;
    const pad = 6;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(S - 1, maxX + pad); maxY = Math.min(S - 1, maxY + pad);
    const sx = img.naturalWidth / S, sy = img.naturalHeight / S;
    const cx = Math.floor(minX * sx), cy = Math.floor(minY * sy);
    const cw = Math.ceil((maxX - minX + 1) * sx), ch = Math.ceil((maxY - minY + 1) * sy);
    const out = document.createElement('canvas');
    const scale = Math.min(1, 1400 / Math.max(cw, ch));
    out.width = Math.round(cw * scale); out.height = Math.round(ch * scale);
    out.getContext('2d').drawImage(img, cx, cy, cw, ch, 0, 0, out.width, out.height);
    return out;
  } catch { return img; }
}

let detailToken = 0;
async function openDetail(i) {
  const op = state.squad[i] || state.pinned.get(i);
  if (!op) return;
  const modal = $('detailModal');
  const artBox = $('detailArt');
  const token = ++detailToken;
  $('detailName').textContent = op.name;
  $('detailRarity').textContent = '★'.repeat(op.rarity);
  $('detailRarity').dataset.rarity = op.rarity;
  $('detailCls').textContent = CLASS_NAME[op.cls];
  artBox.innerHTML = '<div class="spinner">LOADING...</div>';
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  let img = await loadImage(fullArtUrl(op));
  if (!img) img = await loadImage(avatarUrl(op)); // fallback: face icon
  if (token !== detailToken || modal.hidden) return;
  artBox.innerHTML = '';
  if (img) {
    const el = cropToContent(img);
    if (el instanceof HTMLImageElement) { el.alt = op.name; el.draggable = false; }
    else el.setAttribute('role', 'img'), el.setAttribute('aria-label', op.name);
    artBox.appendChild(el);
  } else {
    artBox.innerHTML = `<div class="spinner">${T.detailArtFail}</div>`;
  }
}
function closeDetail() {
  detailToken++;
  $('detailModal').hidden = true;
  if ($('shareModal').hidden) document.body.style.overflow = '';
}
for (const el of document.querySelectorAll('#detailModal [data-close-detail]')) el.addEventListener('click', closeDetail);
$('detailModal').addEventListener('click', (e) => { if (e.target.closest('.detail__art')) closeDetail(); });

// ---------- ID登録 (所持データ / Shared Viewer) ----------
function renderOwned() {
  const on = !!state.owned;
  const t = $('ownedToggle');
  t.setAttribute('aria-pressed', on ? 'true' : 'false');
  t.textContent = on ? T.ownedOn : T.ownedOff;
  $('ownedActions').hidden = !on;
  const st = $('ownedStatus');
  if (on) {
    const d = new Date(state.owned.fetchedAt);
    st.className = 'owned__status is-ok';
    st.textContent = T.ownedStatus(ownedPool().length, d.getMonth() + 1, d.getDate());
  } else if (!st.classList.contains('is-err')) {
    st.className = 'owned__status';
    st.textContent = T.ownedStatusOff;
  }
  if (state.ui === 'idle') updateHint();
}

async function onOwnedLoad() {
  const id = parseShareId($('ownedInput').value);
  const st = $('ownedStatus');
  if (!id) { st.className = 'owned__status is-err'; st.textContent = T.ownedBadUrl; return; }
  const btn = $('ownedLoad');
  btn.disabled = true; st.className = 'owned__status'; st.textContent = T.ownedLoading;
  try {
    const owned = await fetchOwned(id);
    state.owned = owned;
    saveOwned(owned);
    st.classList.remove('is-err');
    renderOwned();
  } catch (e) {
    st.className = 'owned__status is-err';
    st.textContent = e && e.message ? e.message : T.ownedFail;
  } finally {
    btn.disabled = false;
  }
}

function onOwnedClear() {
  state.owned = null;
  clearOwned();
  $('ownedInput').value = '';
  $('ownedStatus').className = 'owned__status';
  renderOwned();
}

// On every visit, silently refresh the stored roster; keep the cached copy if the refresh fails.
async function refreshOwned() {
  if (!state.owned) return;
  try {
    const fresh = await fetchOwned(state.owned.id);
    state.owned = fresh;
    saveOwned(fresh);
    renderOwned();
  } catch { /* keep cached roster */ }
}

$('ownedToggle').addEventListener('click', () => {
  const p = $('ownedPanel');
  p.hidden = !p.hidden; // no auto-focus: opening the panel must not pop the keyboard on phones
  const t = $('ownedToggle');
  t.classList.toggle('is-open', !p.hidden);
  t.setAttribute('aria-expanded', p.hidden ? 'false' : 'true');
});
$('ownedInfoBtn').addEventListener('click', () => {
  const b = $('ownedInfoBtn'), d = $('ownedInfo');
  d.hidden = !d.hidden;
  b.setAttribute('aria-expanded', d.hidden ? 'false' : 'true');
});
$('ownedLoad').addEventListener('click', onOwnedLoad);
$('ownedInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') onOwnedLoad(); });
$('ownedClear').addEventListener('click', onOwnedClear);

$('customToggle').addEventListener('click', () => {
  const p = $('customPanel');
  p.hidden = !p.hidden;
  const t = $('customToggle');
  t.classList.toggle('is-open', !p.hidden);
  t.setAttribute('aria-expanded', p.hidden ? 'false' : 'true');
});
$('customNums').addEventListener('click', (e) => {
  const b = e.target.closest('[data-count]');
  if (b && state.ui === 'idle') setCount(Number(b.dataset.count));
});
$('customClasses').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cls]');
  if (b && state.ui === 'idle') toggleClass(b.dataset.cls);
});
$('customReset').addEventListener('click', () => { if (state.ui === 'idle') resetCustom(); });

// ---------- events ----------
$('gameToggle').addEventListener('click', () => {
  if (state.ui !== 'idle') return;
  setGame(state.game === 'sss' ? 'normal' : 'sss');
});

$('guarantee').addEventListener('click', (e) => {
  const b = e.target.closest('.seg__btn');
  if (!b || state.ui !== 'idle') return;
  setGuarantee(b.dataset.guarantee === '1');
});

$('modes').addEventListener('click', (e) => {
  const b = e.target.closest('.mode');
  if (!b || state.ui !== 'idle') return;
  setMode(b.dataset.mode);
});

grid.addEventListener('click', (e) => {
  const slot = e.target.closest('.slot');
  if (!slot) return;
  const i = Number(slot.dataset.index);
  if (state.pinMode) onPinTap(i);
  else if (state.ui === 'reroll') toggleSelect(i);
  else if ((state.ui === 'reveal' || state.ui === 'result') && !state.revealed[i]) reveal(i);
  else if (canShowDetail(i)) openDetail(i);
});

$('btnPin').addEventListener('click', togglePinMode);
$('pinSearch').addEventListener('input', renderPicker);
$('pinAlter').addEventListener('click', () => { pickAlter = !pickAlter; renderPicker(); });
$('pinList').addEventListener('click', (e) => {
  const b = e.target.closest('.pick');
  if (b && !b.disabled) onPick(b.dataset.id);
});
for (const el of document.querySelectorAll('#pinModal [data-close-pin]')) el.addEventListener('click', closePicker);

$('btnDraw').addEventListener('click', onDraw);
$('btnRevealAll').addEventListener('click', revealAll);
$('btnAgain').addEventListener('click', onAgain);
$('btnReroll').addEventListener('click', enterReroll);
$('btnRerollCancel').addEventListener('click', cancelReroll);
$('btnRerollGo').addEventListener('click', doReroll);
$('btnShare').addEventListener('click', openShare);
$('btnNativeShare').addEventListener('click', nativeShare);
for (const el of document.querySelectorAll('#shareModal [data-close]')) el.addEventListener('click', closeShare);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('detailModal').hidden) closeDetail();
  else if (!$('shareModal').hidden) closeShare();
});

// ---------- ad mock preview (?admock=1): sample banners so the placement can be checked before approval ----------
function adMockBanner(w, h, big) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#f4f6f8'; x.fillRect(0, 0, w, h);
  if (big) {
    x.fillStyle = '#dfe4ea'; x.fillRect(0, 0, w, Math.round(h * 0.54));
    x.fillStyle = '#b8c2cc'; x.font = '700 22px system-ui'; x.textAlign = 'center'; x.fillText('広告(サンプル)', w / 2, Math.round(h * 0.3));
    x.fillStyle = '#1a2129'; x.font = '700 18px system-ui'; x.textAlign = 'left'; x.fillText('ここに広告が表示されます', 16, h - 95);
    x.fillStyle = '#66717c'; x.font = '13px system-ui'; x.fillText('サイズは端末幅に合わせて自動で変わります', 16, h - 70);
    x.fillStyle = '#1a73e8'; x.fillRect(16, h - 48, 110, 32); x.fillStyle = '#fff'; x.font = '700 13px system-ui'; x.fillText('詳しく見る', 36, h - 27);
  } else {
    x.fillStyle = '#dfe4ea'; x.fillRect(0, 0, Math.round(h * 1.3), h);
    x.fillStyle = '#1a2129'; x.font = '700 14px system-ui'; x.textAlign = 'left'; x.fillText('広告(サンプル)', Math.round(h * 1.3) + 10, h / 2 - 2);
    x.fillStyle = '#66717c'; x.font = '11px system-ui'; x.fillText('アンカー広告は画面下にずっと表示されます', Math.round(h * 1.3) + 10, h / 2 + 14);
    x.fillStyle = '#1a73e8'; x.fillRect(w - 78, h / 2 - 13, 66, 26); x.fillStyle = '#fff'; x.font = '700 11px system-ui'; x.textAlign = 'center'; x.fillText('詳しく見る', w - 45, h / 2 + 4);
  }
  x.fillStyle = '#9aa7b3'; x.font = '9px system-ui'; x.textAlign = 'right'; x.fillText('Ad', w - 4, 10);
  return c.toDataURL();
}

function setupAdMock() {
  if (!/[?&]admock=1/.test(location.search)) return;
  // anchor sample (bottom, fixed) with a close tab like Google draws
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.setAttribute('data-anchor-status', 'displayed');
  ins.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:62px;background:#fff;z-index:1000;display:flex;align-items:center;justify-content:center;box-shadow:0 -2px 8px rgba(0,0,0,.35)';
  const a = new Image(); a.src = adMockBanner(320, 50, false); a.style.cssText = 'width:320px;height:50px;display:block';
  const tab = document.createElement('button'); tab.type = 'button'; tab.textContent = '×'; tab.setAttribute('aria-label', '閉じる');
  tab.style.cssText = 'position:absolute;right:0;top:-20px;width:34px;height:20px;border:0;background:#fff;border-radius:6px 0 0 0;box-shadow:0 -2px 6px rgba(0,0,0,.3);font:14px system-ui;color:#5f6368';
  tab.addEventListener('click', () => { ins.remove(); document.documentElement.style.setProperty('--anchor-h', '0px'); });
  ins.append(a, tab);
  document.body.appendChild(ins);
}
setupAdMock();

// ---------- AdSense anchor ad: keep the sticky bar above it ----------
// Google inserts <ins class="adsbygoogle" data-anchor-status="displayed"> for anchor ads (自動広告).
function watchAnchorAd() {
  const apply = () => {
    const ins = document.querySelector('ins.adsbygoogle[data-anchor-status="displayed"]');
    let h = 0;
    if (ins) {
      const r = ins.getBoundingClientRect();
      // bottom anchors sit at the bottom edge of the viewport
      if (r.height > 0 && Math.abs(window.innerHeight - r.bottom) < 4) h = Math.round(r.height);
    }
    document.documentElement.style.setProperty('--anchor-h', h + 'px');
  };
  const mo = new MutationObserver(apply);
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-anchor-status', 'style'] });
  window.addEventListener('resize', apply);
  apply();
}
watchAnchorAd();

// ---------- language suggestion (JA page only): offer /en/ or /ko/ to browsers set to those languages ----------
function suggestLanguage() {
  const el = $('langSuggest');
  if (!el || document.documentElement.lang !== 'ja') return;
  try { if (localStorage.getItem('shibari-gacha:lang-dismissed')) return; } catch { /* ignore */ }
  const langs = (navigator.languages || [navigator.language || '']).map((l) => String(l).toLowerCase());
  const first = langs[0] || '';
  if (first.startsWith('ja')) return;
  const pick = langs.find((l) => l.startsWith('en') || l.startsWith('ko'));
  if (!pick) return;
  const target = pick.startsWith('ko') ? { href: 'ko/', text: '한국어 페이지가 있습니다: ', link: '한국어로 보기' } : { href: 'en/', text: 'This site is also available in English: ', link: 'Open the English version' };
  el.innerHTML = `${target.text}<a href="${target.href}">${target.link}</a><button type="button" aria-label="close">×</button>`;
  el.hidden = false;
  el.querySelector('button').addEventListener('click', () => { el.hidden = true; try { localStorage.setItem('shibari-gacha:lang-dismissed', '1'); } catch { /* ignore */ } });
}
suggestLanguage();

// ---------- init ----------
$('pinTitle').textContent = T.pinTitle;
$('pinSearch').placeholder = T.pinSearch;
$('pinAlter').textContent = T.pinAlter;
buildCustomPanel();
setMode('easy');
setGuarantee(false);
setGame('normal');
renderEmptyGrid();
setUi('idle');
loadOperators()
  .then((ops) => {
    state.operators = ops;
    state.owned = loadOwned();
    if (state.owned) $('ownedInput').value = state.owned.id;
    renderOwned();
    refreshOwned(); // background; never blocks drawing
  })
  .catch((e) => {
    console.error(e);
    hint.textContent = T.hintLoadFail;
    $('btnDraw').disabled = true;
  });

// expose for OGP generation script (dev only)
window.__gacha = { state, renderShareImage, SITE_URL };
