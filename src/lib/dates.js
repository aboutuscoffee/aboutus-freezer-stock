// 日付は 'YYYY-MM-DD' 文字列で扱う（タイムゾーンずれ防止のためローカル日付で計算）
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function format(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function today() {
  return format(new Date());
}

export function addDays(s, n) {
  const dt = parse(s);
  dt.setDate(dt.getDate() + n);
  return format(dt);
}

export function daysBetween(from, to) {
  return Math.round((parse(to) - parse(from)) / 86400000);
}

export function label(s) {
  const dt = parse(s);
  return `${dt.getMonth() + 1}/${dt.getDate()}(${WEEK[dt.getDay()]})`;
}

// 期限までの残り日数と表示用ステータス
export function expiryStatus(expires_on) {
  const left = daysBetween(today(), expires_on);
  if (left < 0) return { left, tone: 'over', text: `${-left}日過ぎ` };
  if (left === 0) return { left, tone: 'soon', text: '今日まで' };
  if (left <= 3) return { left, tone: 'soon', text: `あと${left}日` };
  return { left, tone: 'ok', text: `あと${left}日` };
}
