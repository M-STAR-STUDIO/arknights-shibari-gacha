// Gacha logic. Pure functions, no DOM.

export const MODES = {
  easy:    { name: 'イージー', label: 'EASY',    weights: { 6: 50, 5: 30, 4: 20, 3: 0,  low: 0 } },
  normal:  { name: 'ノーマル', label: 'NORMAL',  weights: { 6: 25, 5: 40, 4: 20, 3: 10, low: 5 } },
  monster: { name: 'Monster',  label: 'MONSTER', weights: { 6: 10, 5: 50, 4: 20, 3: 10, low: 10 } },
  musou:   { name: '無双',     label: '無双',    weights: { 6: 100, 5: 0, 4: 0, 3: 0, low: 0 } },
};

export const SQUAD_SIZE = 12;

// rarity 1 and 2 are one pool ("low")
export function poolKey(rarity) {
  return rarity <= 2 ? 'low' : rarity;
}

function randInt(n) {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    // rejection sampling to avoid modulo bias
    const limit = Math.floor(0x100000000 / n) * n;
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  }
  return Math.floor(Math.random() * n);
}

function pick(arr) {
  return arr[randInt(arr.length)];
}

// Weighted rarity pick; only pools with candidates remaining are eligible.
function pickPoolKey(weights, available) {
  const entries = Object.entries(weights).filter(([k, w]) => w > 0 && available(k));
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) {
    // every weighted pool is exhausted -> fall back to any non-empty pool
    const any = Object.keys(weights).filter(available);
    return any.length ? pick(any) : null;
  }
  let r = randInt(total);
  for (const [k, w] of entries) {
    if (r < w) return k;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

function buildPools(operators) {
  const pools = { 6: [], 5: [], 4: [], 3: [], low: [] };
  for (const op of operators) pools[poolKey(op.rarity)].push(op);
  return pools;
}

/**
 * Draw a full squad of 12 unique operators.
 * @param {Array} operators
 * @param {string} modeKey
 * @returns {Array} operators
 */
export function drawSquad(operators, modeKey) {
  const mode = MODES[modeKey];
  const pools = buildPools(operators);
  const used = new Set();
  const result = [];
  const available = (k) => pools[k].some((o) => !used.has(o.id));

  for (let i = 0; i < SQUAD_SIZE; i++) {
    const key = pickPoolKey(mode.weights, available);
    if (key == null) break;
    const cand = pools[key].filter((o) => !used.has(o.id));
    const op = pick(cand);
    used.add(op.id);
    result.push(op);
  }
  return result;
}

/**
 * Reroll selected indices; each is redrawn from the same rarity pool as the
 * original, excluding every operator currently on the board (including the
 * ones being rerolled and the ones already rerolled in this pass).
 * @param {Array} operators
 * @param {Array} squad current squad
 * @param {number[]} indices
 * @returns {Array} new squad
 */
export function rerollSquad(operators, squad, indices) {
  const pools = buildPools(operators);
  const next = squad.slice();
  const used = new Set(squad.map((o) => o.id));

  for (const i of indices) {
    const orig = squad[i];
    const key = poolKey(orig.rarity);
    const cand = pools[key].filter((o) => !used.has(o.id));
    if (cand.length === 0) continue; // nothing else available in this pool; keep original
    const op = pick(cand);
    used.add(op.id);
    next[i] = op;
  }
  return next;
}
