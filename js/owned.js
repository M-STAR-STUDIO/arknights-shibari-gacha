// ID登録(所持データ): Arknights Shared Viewer (Memoria-ll / OperatorManageToolマン @an_mngtool) の共有IDから
// 所持オペレーターを取得する。API: https://github.com/Memoria-ll/sharing-backend (MIT)
// 取得した所持リストはこのブラウザの localStorage にだけ保存し、このサイトのサーバーには送らない。

const API = 'https://us-central1-arknights-sharing-view.cloudfunctions.net/getCharacterDataHttp?id=';
const KEY = 'shibari-gacha:owned:v1';
const TIMEOUT_MS = 6000;

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

/**
 * 所持データを取得する。potential が 1 以上のものだけを所持扱いにする。
 * @returns {Promise<{id:string, codes:string[], count:number, fetchedAt:string}>}
 */
export async function fetchOwned(id) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API + encodeURIComponent(id), { cache: 'no-store', signal: ctrl.signal });
  } catch (e) {
    throw new Error(e && e.name === 'AbortError' ? '応答がありません(時間切れ)' : '通信に失敗しました');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(res.status === 404 ? '共有IDが見つかりません' : `取得に失敗しました (${res.status})`);
  const json = await res.json();
  const chars = Array.isArray(json.characters) ? json.characters : [];
  const codes = [...new Set(
    chars.filter((c) => Number(c.potential) >= 1).map((c) => String(c.code || '')).filter(Boolean),
  )];
  if (!codes.length) throw new Error('所持オペレーターが見つかりませんでした');
  return { id, codes, count: codes.length, fetchedAt: new Date().toISOString() };
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
