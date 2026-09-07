// Fetch the JP (グローバル版) character table and emit a compact operators.json.
// Also appends any newly added / removed operators to data/changelog.json.
// Usage: node scripts/build-data.mjs
// Runtime: Node 18+ (global fetch). No dependencies.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/jp/gamedata/excel/character_table.json';

const RARITY = {
  TIER_1: 1, TIER_2: 2, TIER_3: 3, TIER_4: 4, TIER_5: 5, TIER_6: 6,
};

// 8 main classes. Anything else (TOKEN, TRAP, ...) is not playable.
const PROFESSION = {
  PIONEER: 'vanguard',
  WARRIOR: 'guard',
  TANK: 'defender',
  SNIPER: 'sniper',
  CASTER: 'caster',
  MEDIC: 'medic',
  SUPPORT: 'supporter',
  SPECIAL: 'specialist',
};

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'data');
const outPath = resolve(dataDir, 'operators.json');
const logPath = resolve(dataDir, 'changelog.json');

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

// Date in JST as YYYY-MM-DD
function todayJst() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
const table = await res.json();

const operators = [];
for (const [id, c] of Object.entries(table)) {
  if (!id.startsWith('char_')) continue;
  if (!(c.profession in PROFESSION)) continue;
  if (c.isNotObtainable) continue; // 予備隊員・クルビア軍などプレイ不可
  const rarity = RARITY[c.rarity];
  if (!rarity) continue;
  operators.push({
    id,
    name: c.name,
    rarity,
    cls: PROFESSION[c.profession],
    sort: c.sortIndex ?? 0,
  });
}

operators.sort((a, b) => a.sort - b.sort);
for (const o of operators) delete o.sort;

const counts = {};
for (const o of operators) counts[o.rarity] = (counts[o.rarity] || 0) + 1;

// ---- changelog: diff against the previously generated list ----
const prev = await readJson(outPath);
const log = (await readJson(logPath)) || { data: [], site: [] };
if (prev && Array.isArray(prev.operators)) {
  const prevIds = new Map(prev.operators.map((o) => [o.id, o]));
  const nextIds = new Map(operators.map((o) => [o.id, o]));
  const added = operators.filter((o) => !prevIds.has(o.id));
  const removed = prev.operators.filter((o) => !nextIds.has(o.id));
  if (added.length || removed.length) {
    log.data.unshift({
      date: todayJst(),
      total: operators.length,
      added: added.map(({ id, name, rarity, cls }) => ({ id, name, rarity, cls })),
      removed: removed.map(({ id, name, rarity, cls }) => ({ id, name, rarity, cls })),
    });
    console.log(`changelog: +${added.length} / -${removed.length}`);
  } else {
    console.log('changelog: no roster change');
  }
}

const out = {
  source: SOURCE_URL,
  counts,
  operators,
};

await mkdir(dataDir, { recursive: true });
await writeFile(outPath, JSON.stringify(out), 'utf8');
await writeFile(logPath, JSON.stringify(log, null, 1), 'utf8');
console.log(`wrote ${operators.length} operators -> ${outPath}`);
console.log('by rarity:', counts);
