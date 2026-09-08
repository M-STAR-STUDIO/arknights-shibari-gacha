// Share image (2 rows x 6 columns, 1600x900) drawn on canvas.
import { MODES } from './gacha.js';
import { avatarUrl, classIconUrl, loadImage, CLASS_SHORT } from './assets.js';

export const SITE_URL = 'https://mstar-studio.com/arknights-shibari-gacha/';
export const HASHTAG = '#アークナイツ縛りガチャ';

const W = 1600, H = 900;
const CARD_W = 184, CARD_H = 368, GAP = 22, CUT = 30;
const COLS = 6, ROWS = 2;

const FRAME = {
  6: null, // gradient
  5: '#a8862a',
  4: '#4f8fd6',
  3: '#d9dde2',
};

export function tweetText(modeKey, opts = {}) {
  const label = MODES[modeKey].label;
  const head = opts.game === 'sss' ? `保全駐在 ${label}` : label;
  const n = opts.count || 12;
  return `${HASHTAG}【${head}】\n今回の${n}人\n${SITE_URL}`;
}

function parallelogram(ctx, x, y, w, h, cut) {
  ctx.beginPath();
  ctx.moveTo(x, y + cut);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function goldGradient(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#8a5a0c');
  g.addColorStop(0.2, '#ffcf4d');
  g.addColorStop(0.38, '#fffbe6');
  g.addColorStop(0.5, '#ffcf4d');
  g.addColorStop(0.62, '#fffbe6');
  g.addColorStop(0.8, '#ffcf4d');
  g.addColorStop(1, '#8a5a0c');
  return g;
}

function fitText(ctx, text, maxW, base, min) {
  let size = base;
  do {
    ctx.font = `700 ${size}px ${JP_FONT}`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 1;
  } while (size > min);
  return size;
}

const LATIN_FONT = '"Rajdhani", "Segoe UI", system-ui, sans-serif';
const JP_FONT = 'system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic UI", "Meiryo", sans-serif';

async function drawCard(ctx, op, x, y, art, icon, cw = CARD_W, ch = CARD_H) {
  const isSix = op.rarity === 6;
  const K = cw / CARD_W; // scale factor for text / icon sizes
  const cut = CUT * K;
  // glow for 6
  if (isSix) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,90,0.85)';
    ctx.shadowBlur = 34;
    parallelogram(ctx, x, y, cw, ch, cut);
    ctx.fillStyle = '#f2c14e';
    ctx.fill();
    ctx.restore();
  }
  // frame
  parallelogram(ctx, x, y, cw, ch, cut);
  ctx.fillStyle = isSix ? goldGradient(ctx, x, y, cw, ch) : (FRAME[Math.max(3, op.rarity)]);
  ctx.fill();

  // inner
  const p = Math.max(3, Math.round(5 * K));
  const ix = x + p, iy = y + p, iw = cw - p * 2, ih = ch - p * 2;
  const icut = cut * (iw / cw);
  ctx.save();
  parallelogram(ctx, ix, iy, iw, ih, icut);
  ctx.clip();
  ctx.fillStyle = '#0f1418';
  ctx.fillRect(ix, iy, iw, ih);

  // art: enlarged square at top (sides cropped by the card), below the top cut
  const artY = iy + icut * 0.5;
  const artS = Math.round(iw * 1.24);
  const artH = artS;
  if (art) {
    ctx.drawImage(art, ix - (artS - iw) / 2, artY, artS, artS);
  } else {
    ctx.fillStyle = '#e6ebef';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = fitText(ctx, op.name, iw - 16, Math.round(22 * K), 10);
    ctx.font = `700 ${size}px ${JP_FONT}`;
    ctx.fillText(op.name, ix + iw / 2, artY + iw / 2);
  }
  // short fade from art to name area (kept small so the face is not covered)
  const fadeH = Math.round(26 * K);
  const fade = ctx.createLinearGradient(0, artY + artH - fadeH, 0, artY + artH);
  fade.addColorStop(0, 'rgba(15,20,24,0)');
  fade.addColorStop(1, 'rgba(15,20,24,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(ix, artY + artH - fadeH, iw, fadeH);

  // name
  ctx.fillStyle = '#e6ebef';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nameSize = fitText(ctx, op.name, iw - Math.round(20 * K), Math.round(22 * K), 10);
  ctx.font = `700 ${nameSize}px ${JP_FONT}`;
  const nameY = artY + artH + Math.round(26 * K);
  ctx.fillText(op.name, ix + iw / 2, nameY);

  // class icon size (needed for the rarity bar length)
  const s = Math.round(44 * K);

  // rarity marker (thin bar, color only)
  ctx.fillStyle = isSix ? '#f2c14e' : FRAME[Math.max(3, op.rarity)];
  ctx.globalAlpha = 0.7;
  ctx.fillRect(ix + 16 * K, nameY + 24 * K, iw - 32 * K - s - 8 * K, 2); // stops short of the class icon
  ctx.globalAlpha = 1;

  // subtle diagonal band in the lower area (same shape language as the empty slot)
  ctx.save();
  ctx.beginPath();
  const by = nameY + 40 * K;
  ctx.moveTo(ix, by + 50 * K); ctx.lineTo(ix + iw, by + 0); ctx.lineTo(ix + iw, by + 22 * K); ctx.lineTo(ix, by + 72 * K);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.restore();

  // class icon bottom-right
  const cx = ix + iw - s - 12 * K;
  const cy = iy + ih - icut - s - 14 * K;
  if (icon) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.drawImage(icon, cx, cy, s, s);
    ctx.restore();
  } else {
    ctx.strokeStyle = '#e6ebef';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, s, s);
    ctx.fillStyle = '#e6ebef';
    ctx.font = `700 ${Math.round(22 * K)}px ${JP_FONT}`;
    ctx.fillText(CLASS_SHORT[op.cls], cx + s / 2, cy + s / 2 + 1);
  }
  ctx.restore();
}

/**
 * @param {Array} squad 12 operators
 * @param {string} modeKey
 * @param {HTMLImageElement|null} logo
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderShareImage(squad, modeKey, logo, opts = {}) {
  await document.fonts?.load(`700 40px "Rajdhani"`).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#12181e');
  bg.addColorStop(1, '#0b0e11');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 48) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); ctx.stroke(); }
  for (let gy = 0; gy <= H; gy += 48) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke(); }
  // glow top
  const glow = ctx.createRadialGradient(W / 2, -100, 50, W / 2, -100, 900);
  glow.addColorStop(0, 'rgba(79,179,196,0.16)');
  glow.addColorStop(1, 'rgba(79,179,196,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // header
  const mode = MODES[modeKey];
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#66717c';
  ctx.font = `600 16px ${LATIN_FONT}`;
  ctx.fillText('R O S T E R   R A N D O M I Z E R', 60, 44);
  ctx.fillStyle = '#e6ebef';
  ctx.font = `700 34px ${JP_FONT}`;
  ctx.fillText('アークナイツ縛りガチャ', 60, 84);

  // difficulty label (right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#66717c';
  ctx.font = `600 16px ${LATIN_FONT}`;
  ctx.fillText('D I F F I C U L T Y', W - 60, 44);
  ctx.fillStyle = mode.color || '#9fd6e0';
  const labelIsLatin = /^[A-Z0-9 ★]+$/.test(mode.label);
  ctx.font = labelIsLatin ? `700 44px ${LATIN_FONT}` : `700 36px ${JP_FONT}`;
  ctx.fillText(mode.label, W - 60, 86);

  // badges next to the title (image only): 保全駐在 / 職分保証あり
  {
    const badges = [];
    if (opts.game === 'sss') badges.push(`保全駐在 ${squad.length}体`);
    if (opts.guarantee) badges.push('職分保証あり');
    ctx.textAlign = 'left';
    ctx.font = `700 34px ${JP_FONT}`;
    let x = 60 + ctx.measureText('アークナイツ縛りガチャ').width + 22;
    const y = 58;
    for (const label of badges) {
      ctx.font = `700 19px ${JP_FONT}`;
      const tw = ctx.measureText(label).width + 24;
      ctx.fillStyle = 'rgba(159,214,224,0.14)';
      ctx.fillRect(x, y, tw, 30);
      ctx.strokeStyle = 'rgba(159,214,224,0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, 29);
      ctx.fillStyle = '#9fd6e0';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 12, y + 16);
      ctx.textBaseline = 'alphabetic';
      x += tw + 10;
    }
  }

  // divider
  ctx.fillStyle = 'rgba(159,214,224,0.35)';
  ctx.fillRect(60, 100, W - 120, 1);

  // cards: 2x6 for 12; larger squads use up to 10 columns and shrink the cards to fit
  const n = squad.length;
  const cols = n <= 12 ? COLS : Math.min(10, Math.ceil(n / 2));
  const rows = Math.max(ROWS, Math.ceil(n / cols));
  const availW = W - 120, availH = H - 118 - 70;
  let cw = Math.min(CARD_W, Math.floor((availW - (cols - 1) * GAP) / cols));
  let ch = cw * 2;
  if (rows * ch + (rows - 1) * GAP > availH) { ch = Math.floor((availH - (rows - 1) * GAP) / rows); cw = Math.floor(ch / 2); }
  const gridW = cols * cw + (cols - 1) * GAP;
  const gridH = rows * ch + (rows - 1) * GAP;
  const ox = Math.round((W - gridW) / 2);
  const oy = 118 + Math.round((availH - gridH) / 2);

  const arts = await Promise.all(squad.map((o) => loadImage(avatarUrl(o))));
  const icons = {};
  for (const c of new Set(squad.map((o) => o.cls))) icons[c] = await loadImage(classIconUrl(c));

  for (let i = 0; i < squad.length; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    const x = ox + c * (cw + GAP);
    const y = oy + r * (ch + GAP);
    await drawCard(ctx, squad[i], x, y, arts[i], icons[squad[i].cls], cw, ch);
  }

  // footer: url left, logo right
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#66717c';
  ctx.font = `600 18px ${LATIN_FONT}`;
  ctx.fillText(SITE_URL.replace('https://', ''), 60, H - 34);
  if (logo) {
    const lh = 56;
    const lw = lh * (logo.naturalWidth / logo.naturalHeight);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(logo, W - 60 - lw, H - 34 - lh / 2, lw, lh);
    ctx.globalAlpha = 1;
  } else {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9aa7b3';
    ctx.font = `700 20px ${LATIN_FONT}`;
    ctx.fillText('M Star Studio', W - 60, H - 34);
  }

  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
