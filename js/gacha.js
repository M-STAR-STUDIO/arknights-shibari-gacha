// Gacha logic. Pure functions, no DOM.

export const MODES = {
  easy:    { name: 'イージー', label: 'EASY',    color: '#6fd38a', weights: { 6: 50, 5: 30, 4: 20, 3: 0,  low: 0 } },
  normal:  { name: 'ノーマル', label: 'NORMAL',  color: '#9fd6e0', weights: { 6: 30, 5: 40, 4: 20, 3: 5, low: 5 } },
  monster: { name: 'Mon3tr',   label: 'MONSTER', color: '#ff6b6b', weights: { 6: 10, 5: 50, 4: 20, 3: 10, low: 10 } },
  musou:   { name: '無双',     label: '無双',    color: '#ffcf4d', weights: { 6: 100, 5: 0, 4: 0, 3: 0, low: 0 } },
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

export const CLASSES = ['vanguard', 'guard', 'defender', 'sniper', 'caster', 'medic', 'supporter', 'specialist'];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Draw a full squad of 12 unique operators.
 * @param {Array} operators
 * @param {string} modeKey
 * @param {{guarantee?: boolean, size?: number}} [opts] guarantee: every one of the 8 classes appears at least once;
 *   size: squad size (default 12; 保全駐在 uses 20)
 * @returns {Array} operators
 */
export function drawSquad(operators, modeKey, opts = {}) {
  const mode = MODES[modeKey];
  const size = opts.size || SQUAD_SIZE;
  const pools = buildPools(operators);
  const used = new Set();
  const result = [];

  const drawOne = (filter) => {
    const available = (k) => pools[k].some((o) => !used.has(o.id) && filter(o));
    const key = pickPoolKey(mode.weights, available);
    if (key == null) return null;
    const cand = pools[key].filter((o) => !used.has(o.id) && filter(o));
    const op = pick(cand);
    used.add(op.id);
    result.push(op);
    return op;
  };

  if (opts.guarantee) {
    // slots 1-8: one per class in the fixed class order (先鋒→特殊); slots 9-12: random
    for (const cls of CLASSES) drawOne((o) => o.cls === cls);
  }
  while (result.length < size) {
    if (!drawOne(() => true)) break;
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
 * @param {{guarantee?: boolean}} [opts] guarantee: keep every class represented (a rerolled operator whose
 *   class would otherwise disappear from the squad is redrawn from the same class)
 * @returns {Array} new squad
 */
export function rerollSquad(operators, squad, indices, opts = {}) {
  const pools = buildPools(operators);
  const next = squad.slice();
  const used = new Set(squad.map((o) => o.id));
  const pending = new Set(indices); // not yet rerolled in this pass

  for (const i of indices) {
    const orig = squad[i];
    const key = poolKey(orig.rarity);
    let cand = pools[key].filter((o) => !used.has(o.id));
    if (opts.guarantee) {
      // is this class still covered by operators that stay (or were already rerolled)?
      const covered = next.some((o, j) => j !== i && !pending.has(j) && o.cls === orig.cls);
      if (!covered) {
        const sameCls = cand.filter((o) => o.cls === orig.cls);
        if (sameCls.length) {
          cand = sameCls;
        } else {
          // no unused operator of this class at the same rarity: keep the class and take the nearest rarity
          const any = operators.filter((o) => o.cls === orig.cls && !used.has(o.id));
          if (any.length) {
            const best = Math.min(...any.map((o) => Math.abs(o.rarity - orig.rarity)));
            cand = any.filter((o) => Math.abs(o.rarity - orig.rarity) === best);
          }
        }
      }
    }
    pending.delete(i);
    if (cand.length === 0) continue; // nothing else available in this pool; keep original
    const op = pick(cand);
    used.add(op.id);
    next[i] = op;
  }
  return next;
}
