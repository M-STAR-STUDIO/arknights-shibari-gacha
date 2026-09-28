// ID登録(所持データ): Arknights Shared Viewer (Memoria-ll / OperatorManageToolマン @an_mngtool) の共有IDから
// 所持オペレーターを取得する。API の仕様: https://github.com/Memoria-ll/sharing-view/blob/main/README.md
// 取得した所持リストはこのブラウザの localStorage にだけ保存し、このサイトのサーバーには送らない。

const API = 'https://api.memoria-ll.link/v2/public/';
// 移行前の入口。新APIが旧形式IDを取得できなかったとき(502)と、通信できなかったときだけ使う。
const LEGACY_API = 'https://us-central1-arknights-sharing-view.cloudfunctions.net/getCharacterDataHttp?id=';
const KEY = 'shibari-gacha:owned:v1';
const SKIP_KEY = 'shibari-gacha:owned-skip-unraised:v1';
const TIMEOUT_MS = 10000;

/** 共有URL(…/?d=xxxx)または ID そのものから ID を取り出す。無効なら null。 */
export function parseShareId(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  let id = s;
  try {
    if (/^https?:\/\//i.test(s)) id = new URL(s).searchParams.get('d') || '';
  } catch { return null; }
  return /^[A-Za-z0-9_-]{4,64}$/.test(id) ? id : null;
}

/** 旧形式の共有ID(6・10文字)かどうか。新形式は11文字。アプリ更新後に共有し直すと新形式のIDに変わる。 */
export function isLegacyId(id) {
  return String(id || '').length !== 11;
}

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: ctrl.signal });
    return { status: res.status, json: res.ok ? await res.json() : null };
  } catch (e) {
    return { status: 0, timeout: !!(e && e.name === 'AbortError'), json: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 所持データを取得する。potential が 1 以上のものだけを所持扱いにする。
 * unraised は、所持しているが昇進0・レベル1のままのオペレーター(未育成を除外する設定で使う)。
 * @returns {Promise<{id:string, codes:string[], unraised:string[], count:number, fetchedAt:string}>}
 */
export async function fetchOwned(id) {
  let r = await getJson(`${API}${encodeURIComponent(id)}/operators`);
  if (r.status === 0 || r.status === 502) {
    const legacy = await getJson(LEGACY_API + encodeURIComponent(id));
    if (legacy.status !== 0) r = legacy;
  }
  if (r.status === 0) throw new Error(r.timeout ? '応答がありません(時間切れ)' : '通信に失敗しました');
  if (r.status === 404) throw new Error('共有IDが見つかりません');
  if (r.status === 429) throw new Error('アクセスが集中しています。1分ほど待ってからもう一度お試しください');
  if (!r.json) throw new Error(`取得に失敗しました (${r.status})`);
  const chars = Array.isArray(r.json.characters) ? r.json.characters : [];
  const held = chars.filter((c) => Number(c.potential) >= 1 && c.code);
  const codes = [...new Set(held.map((c) => String(c.code)))];
  if (!codes.length) throw new Error('所持オペレーターが見つかりませんでした');
  const unraised = [...new Set(
    held.filter((c) => Number(c.elite) === 0 && Number(c.level) === 1).map((c) => String(c.code)),
  )];
  return { id, codes, unraised, count: codes.length, fetchedAt: new Date().toISOString() };
}

export function loadOwned() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && o.id && Array.isArray(o.codes) && o.codes.length ? o : null;
  } catch { return null; }
}

export function saveOwned(owned) {
  try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch { /* private mode etc. */ }
}

export function clearOwned() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** 未育成(昇進0・レベル1)を除外する設定。ID登録とは別に覚えておく。 */
export function loadSkipUnraised() {
  try { return localStorage.getItem(SKIP_KEY) === '1'; } catch { return false; }
}

export function saveSkipUnraised(on) {
  try { if (on) localStorage.setItem(SKIP_KEY, '1'); else localStorage.removeItem(SKIP_KEY); } catch { /* ignore */ }
}
