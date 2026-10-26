import * as db from './db';

// 端末内の保存。電波が悪くて送信に失敗したり、送信前にサイトを閉じたりしても
// 入力が消えないよう、操作はまず「未送信キュー」に積んでから Supabase に送る。
const CACHE_KEY = 'fs-cache-v1';
const QUEUE_KEY = 'fs-queue-v1';

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const loadCache = () => read(CACHE_KEY, null);
export const saveCache = (snapshot) => write(CACHE_KEY, snapshot);
export const loadQueue = () => read(QUEUE_KEY, []);
export const saveQueue = (queue) => write(QUEUE_KEY, queue);

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

// サーバーの内容に未送信の操作を重ねた「いまの状態」を作る
export function applyOp(state, op) {
  const { items, lots } = state;
  const p = op.payload;
  switch (op.type) {
    case 'addLot':
      return lots.some((l) => l.id === p.id) ? state : { items, lots: [...lots, p] };
    case 'adjust':
      return {
        items,
        lots: lots.map((l) => (l.id === p.id ? { ...l, quantity: Math.max(l.quantity + p.delta, 0) } : l)),
      };
    case 'updateLot':
      return { items, lots: lots.map((l) => (l.id === p.id ? { ...l, ...p.fields } : l)) };
    case 'deleteLot':
      return { items, lots: lots.filter((l) => l.id !== p.id) };
    case 'saveItem':
      return {
        items: items.some((i) => i.id === p.id) ? items.map((i) => (i.id === p.id ? { ...i, ...p } : i)) : [...items, p],
        lots,
      };
    case 'deleteItem':
      return { items: items.filter((i) => i.id !== p.id), lots: lots.filter((l) => l.item_id !== p.id) };
    default:
      return state;
  }
}

export function sendOp(op) {
  const p = op.payload;
  switch (op.type) {
    case 'addLot':
      return db.addLot(p);
    case 'adjust':
      return db.adjustLot(p.id, p.delta);
    case 'updateLot':
      return db.updateLot(p.id, p.fields);
    case 'deleteLot':
      return db.deleteLot(p.id);
    case 'saveItem':
      return db.saveItem(p);
    case 'deleteItem':
      return db.deleteItem(p.id);
  }
}

// 通信できなかっただけのエラー（電波・オフライン）なら送り直す。
// サーバーが内容を拒否したエラー（code付き）は送り直しても通らないので捨てる。
export function isRetryable(error) {
  return !error?.code;
}
