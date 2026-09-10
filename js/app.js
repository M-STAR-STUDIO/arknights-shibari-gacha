import { MODES, SQUAD_SIZE, drawSquad, rerollSquad } from './gacha.js';
import { avatarUrl, classIconUrl, fullArtUrl, loadImage, preloadSquad, CLASS_JP, CLASS_SHORT } from './assets.js';
import { renderShareImage, canvasToBlob, tweetText, SITE_URL } from './share.js';
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
  owned: null,        // {id, codes, count, fetchedAt} | null  (ID登録: 所持データ)
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

const SSS_SIZE = 20;
function squadSize() { return state.game === 'sss' ? SSS_SIZE : SQUAD_SIZE; }
function perClass() { return state.game === 'sss' ? 2 : 1; } // 職分保証: 保全駐在は各職分2体

/** Operators eligible for drawing: everyone, or only the owned ones when an ID is registered. */
function pool() {
  if (!state.owned) return state.operators;
  const codes = new Set(state.owned.codes);
  return state.operators.filter((o) => codes.has(o.code));
}

function updateHint() {
  const n = state.revealed.filter(Boolean).length;
  squadCount.textContent = `${state.squad.length ? n : 0} / ${state.squad.length || squadSize()}`;
  switch (state.ui) {
    case 'idle': hint.textContent = state.owned ? `未所持を除外して引きます(所持 ${pool().length}体)` : '難易度を選んで「引く」'; break;
    case 'reveal': hint.textContent = 'タップしてめくる'; break;
    case 'result': hint.textContent = 'タップで詳細表示。持っていないオペレーターは「選んで再抽選」で引き直せます'; break;
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

function setGuarantee(on) {
  state.guarantee = !!on;
  for (const b of document.querySelectorAll('.seg__btn')) {
    b.setAttribute('aria-checked', (b.dataset.guarantee === '1') === state.guarantee ? 'true' : 'false');
  }
  $('guaranteeDesc').textContent = state.guarantee
    ? (state.game === 'sss'
        ? '上4行に8職分が2体ずつ(先鋒→特殊の順)。残り4枠はランダム'
        : '上2行に8職分が1体ずつ(先鋒→特殊の順)。残り4枠はランダム')
    : '完全ランダム';
}

function setGame(game) {
  state.game = game === 'sss' ? 'sss' : 'normal';
  app.dataset.game = state.game;
  $('gameToggle').setAttribute('aria-pressed', state.game === 'sss' ? 'true' : 'false');
  setGuarantee(state.guarantee); // refresh the guarantee text for the new size
  if (state.ui === 'idle') { renderEmptyGrid(); updateHint(); }
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
  for (let i = 0; i < squadSize(); i++) {
    grid.appendChild(makeEmptySlot(i));
  }
}

function buildCardFaces(i, op) {
  const num = String(i + 1).padStart(2, '0');
  return `
    <div class="face face--back"><div class="back-inner">
      <span class="back-num">${num}</span>
      <div class="cls" title="${CLASS_JP[op.cls]}">
        <img alt="${CLASS_JP[op.cls]}" draggable="false">
        <span class="cls-txt">${CLASS_SHORT[op.cls]}</span>
      </div>
    </div></div>
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
  const ops = pool();
  if (ops.length < squadSize()) { hint.textContent = `所持オペレーターが${ops.length}体しかないため引けません(${squadSize()}体必要)`; return; }
  state.squad = drawSquad(ops, state.mode, { guarantee: state.guarantee, size: squadSize(), perClass: perClass() });
  state.revealed = new Array(state.squad.length).fill(false);
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

  const text = tweetText(state.mode, { game: state.game, count: state.squad.length });
  $('shareText').value = text;
  $('btnTweet').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

  try {
    const logo = await getLogo();
    const canvas = await renderShareImage(state.squad, state.mode, logo, { guarantee: state.guarantee, game: state.game });
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
    await navigator.share({ files: [file], text: tweetText(state.mode, { game: state.game, count: state.squad.length }) });
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

// ---------- tap detail ----------
function canShowDetail(i) {
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
  const op = state.squad[i];
  if (!op) return;
  const modal = $('detailModal');
  const artBox = $('detailArt');
  const token = ++detailToken;
  $('detailName').textContent = op.name;
  $('detailRarity').textContent = '★'.repeat(op.rarity);
  $('detailRarity').dataset.rarity = op.rarity;
  $('detailCls').textContent = CLASS_JP[op.cls];
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
    artBox.innerHTML = '<div class="spinner">画像を読み込めませんでした</div>';
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
  t.textContent = on ? 'ID登録済み' : 'ID登録';
  $('ownedActions').hidden = !on;
  const st = $('ownedStatus');
  if (on) {
    const d = new Date(state.owned.fetchedAt);
    st.className = 'owned__status is-ok';
    st.textContent = `登録済み: 所持 ${pool().length}体(${d.getMonth() + 1}/${d.getDate()} 取得)。未所持は除外されます。`;
  } else if (!st.classList.contains('is-err')) {
    st.className = 'owned__status';
    st.textContent = '登録すると、未所持のオペレーターは自動的に除外されます。';
  }
  if (state.ui === 'idle') updateHint();
}

async function onOwnedLoad() {
  const id = parseShareId($('ownedInput').value);
  const st = $('ownedStatus');
  if (!id) { st.className = 'owned__status is-err'; st.textContent = '共有URLの形が違います(…/?d=xxxxxx の形か、ID だけを貼ってください)'; return; }
  const btn = $('ownedLoad');
  btn.disabled = true; st.className = 'owned__status'; st.textContent = '読み込み中…';
  try {
    const owned = await fetchOwned(id);
    state.owned = owned;
    saveOwned(owned);
    st.classList.remove('is-err');
    renderOwned();
  } catch (e) {
    st.className = 'owned__status is-err';
    st.textContent = e && e.message ? e.message : '読み込みに失敗しました';
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
  if (state.ui === 'reroll') toggleSelect(i);
  else if ((state.ui === 'reveal' || state.ui === 'result') && !state.revealed[i]) reveal(i);
  else if (canShowDetail(i)) openDetail(i);
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
  // in-content sample (below the result buttons)
  const img = new Image(); img.src = adMockBanner(336, 280, true);
  img.style.cssText = 'width:336px;max-width:100%;height:auto;display:block';
  $('adBox').replaceChildren(img);
  $('adResult').classList.add('is-live');
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

// ---------- init ----------
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
    hint.textContent = 'データの読み込みに失敗しました。再読み込みしてください。';
    $('btnDraw').disabled = true;
  });

// expose for OGP generation script (dev only)
window.__gacha = { state, renderShareImage, SITE_URL };
