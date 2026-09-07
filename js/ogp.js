// OGP image (1200x630) drawn on canvas. Used only by scripts/ogp.html at build time.
import { loadImage } from './assets.js';

const W = 1200, H = 630;
const LATIN_FONT = '"Rajdhani", "Segoe UI", system-ui, sans-serif';
const JP_FONT = 'system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic UI", "Meiryo", sans-serif';

function parallelogram(ctx, x, y, w, h, cut) {
  ctx.beginPath();
  ctx.moveTo(x, y + cut);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function emptySlot(ctx, x, y, w, h, cut, accent) {
  parallelogram(ctx, x, y, w, h, cut);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#1c242c');
  g.addColorStop(1, '#12181e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  parallelogram(ctx, x, y, w, h, cut);
  ctx.clip();
  // diagonal band
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.72); ctx.lineTo(x + w, y + h * 0.5); ctx.lineTo(x + w, y + h * 0.6); ctx.lineTo(x, y + h * 0.82);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  ctx.restore();
  parallelogram(ctx, x, y, w, h, cut);
  ctx.strokeStyle = accent ? 'rgba(159,214,224,0.7)' : '#3a4652';
  ctx.lineWidth = accent ? 2 : 1.5;
  ctx.stroke();
  // plus
  ctx.strokeStyle = accent ? '#e6ebef' : '#8b96a0';
  ctx.lineWidth = 4;
  const cx = x + w / 2, cy = y + h / 2, r = w * 0.17;
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
}

export async function renderOgp() {
  await document.fonts?.load(`700 40px "Rajdhani"`).catch(() => {});
  const logo = await loadImage('../assets/logo-mstar-studio.png');

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#12181e');
  bg.addColorStop(1, '#0b0e11');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 48) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); ctx.stroke(); }
  for (let gy = 0; gy <= H; gy += 48) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke(); }
  const glow = ctx.createRadialGradient(W * 0.3, -50, 50, W * 0.3, -50, 800);
  glow.addColorStop(0, 'rgba(79,179,196,0.18)');
  glow.addColorStop(1, 'rgba(79,179,196,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // accent bar
  ctx.fillStyle = '#4fb3c4';
  ctx.fillRect(72, 96, 4, 150);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#66717c';
  ctx.font = `600 20px ${LATIN_FONT}`;
  ctx.fillText('R O S T E R   R A N D O M I Z E R', 96, 118);
  ctx.fillStyle = '#e6ebef';
  ctx.font = `700 64px ${JP_FONT}`;
  ctx.fillText('アークナイツ', 96, 190);
  ctx.fillStyle = '#9fd6e0';
  ctx.fillText('縛りガチャ', 96, 262);

  ctx.fillStyle = '#9aa7b3';
  ctx.font = `500 26px ${JP_FONT}`;
  ctx.fillText('全オペレーターからランダムに12体。', 96, 322);
  ctx.fillText('引いたそのままの編成で挑む。', 96, 360);

  // slots: 6 empty parallelograms on the right/bottom
  const sw = 120, sh = 168, gap = 18, cut = 16;
  const total = 6 * sw + 5 * gap;
  const sx = (W - total) / 2, sy = 418;
  for (let i = 0; i < 6; i++) emptySlot(ctx, sx + i * (sw + gap), sy, sw, sh, cut, i === 2);

  // difficulty chips top-right
  const chips = ['無双', 'EASY', 'NORMAL', 'MONSTER'];
  const active = 1; // EASY is the default mode
  ctx.textAlign = 'right';
  let cxr = W - 72;
  for (let i = chips.length - 1; i >= 0; i--) {
    const isJp = /[^\x00-\x7F]/.test(chips[i]);
    ctx.font = isJp ? `700 18px ${JP_FONT}` : `700 18px ${LATIN_FONT}`;
    const tw = ctx.measureText(chips[i]).width + 28;
    ctx.fillStyle = i === active ? 'rgba(159,214,224,0.16)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(cxr - tw, 92, tw, 36);
    ctx.strokeStyle = i === active ? '#9fd6e0' : '#2a333d';
    ctx.lineWidth = 1;
    ctx.strokeRect(cxr - tw + 0.5, 92.5, tw - 1, 35);
    ctx.fillStyle = i === active ? '#9fd6e0' : '#9aa7b3';
    ctx.textBaseline = 'middle';
    ctx.fillText(chips[i], cxr - 14, 111);
    cxr -= tw + 8;
  }

  // footer
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#66717c';
  ctx.font = `600 18px ${LATIN_FONT}`;
  ctx.fillText('mstar-studio.com/arknights-shibari-gacha', 72, H - 22);
  if (logo) {
    const lh = 44;
    const lw = lh * (logo.naturalWidth / logo.naturalHeight);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(logo, W - 72 - lw, H - 22 - lh / 2, lw, lh);
    ctx.globalAlpha = 1;
  }
  return canvas;
}
