// Remote asset URLs and image loading with cache.

const AVATAR_BASE = 'https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@main/avatar/';
const CLASS_BASE = 'https://cdn.jsdelivr.net/gh/Aceship/Arknight-Images@main/classes/';

export const CLASS_JP = {
  vanguard: '先鋒', guard: '前衛', defender: '重装', sniper: '狙撃',
  caster: '術師', medic: '医療', supporter: '補助', specialist: '特殊',
};
export const CLASS_SHORT = {
  vanguard: '先', guard: '前', defender: '重', sniper: '狙',
  caster: '術', medic: '医', supporter: '補', specialist: '特',
};

export function avatarUrl(op) {
  return `${AVATAR_BASE}${op.id}.png`;
}
export function classIconUrl(cls) {
  return `${CLASS_BASE}class_${cls}.png`;
}

const cache = new Map();

/** Load an image with CORS enabled (so it can be drawn to canvas). Resolves to HTMLImageElement or null. */
export function loadImage(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  cache.set(url, p);
  return p;
}

export function preloadSquad(squad) {
  const cls = new Set(squad.map((o) => o.cls));
  return Promise.all([
    ...squad.map((o) => loadImage(avatarUrl(o))),
    ...[...cls].map((c) => loadImage(classIconUrl(c))),
  ]);
}
