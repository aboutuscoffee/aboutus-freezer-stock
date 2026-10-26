import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as db from './lib/db';
import * as store from './lib/store';
import ItemCard from './components/ItemCard';
import LotSheet from './components/LotSheet';
import ItemsSheet from './components/ItemsSheet';
import QrSheet from './components/QrSheet';

const byItemOrder = (a, b) => a.sort_order - b.sort_order || String(a.created_at).localeCompare(String(b.created_at));
const byMadeOn = (a, b) => a.made_on.localeCompare(b.made_on) || String(a.created_at).localeCompare(String(b.created_at));

export default function App() {
  const [cached] = useState(store.loadCache);
  const [snapshot, setSnapshot] = useState(cached ?? { items: [], lots: [] }); // 最後にサーバーから読んだ内容
  const [queue, setQueue] = useState(store.loadQueue); // まだサーバーに届いていない操作
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [sheet, setSheet] = useState(null); // {type:'lot', item, lot?} | {type:'items'} | {type:'qr'}
  const [toast, setToast] = useState(null); // {text, undo?}
  const toastTimer = useRef(null);
  const queueRef = useRef(queue);
  const flushing = useRef(false);
  const writeCount = useRef(0);

  const { items, lots } = useMemo(() => {
    const s = queue.reduce(store.applyOp, snapshot);
    return { items: [...s.items].sort(byItemOrder), lots: [...s.lots].sort(byMadeOn) };
  }, [snapshot, queue]);

  function showToast(t) {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  function setQueueBoth(next) {
    queueRef.current = next;
    store.saveQueue(next);
    setQueue(next);
  }

  const reload = useCallback(async () => {
    const before = writeCount.current;
    try {
      const data = await db.fetchAll();
      // 読み込み中に別の操作が送信済みになったら、この結果は古いので捨てる（送信後にもう一度読む）
      if (writeCount.current !== before) return;
      setSnapshot(data);
      store.saveCache(data);
      setError('');
      setOffline(false);
    } catch (e) {
      setOffline(true);
      setError(e.message || '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // 未送信の操作を古い順に1件ずつ送る。通信エラーなら残して次の機会に送り直す
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    let sent = false;
    try {
      while (queueRef.current.length) {
        const op = queueRef.current[0];
        try {
          await store.sendOp(op);
        } catch (e) {
          if (store.isRetryable(e)) {
            setOffline(true);
            break;
          }
          showToast({ text: '保存できない操作がありました：' + (e.message || '') });
        }
        writeCount.current++;
        sent = true;
        setQueueBoth(queueRef.current.filter((o) => o.id !== op.id));
      }
    } finally {
      flushing.current = false;
    }
    if (sent) reload();
  }, [reload]);

  // 開いたとき・画面に戻ったとき・電波が戻ったとき・30秒ごとに、送り直しと再読込
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'visible') return;
      flush();
      reload();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', sync);
    const timer = setInterval(sync, 30000);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('online', sync);
      clearInterval(timer);
    };
  }, [flush, reload]);

  function enqueue(type, payload) {
    setQueueBoth([...queueRef.current, { id: store.newId(), type, payload }]);
    flush();
  }

  function adjust(lot, delta, { silent } = {}) {
    enqueue('adjust', { id: lot.id, delta });
    if (!silent && delta < 0) {
      const item = items.find((i) => i.id === lot.item_id);
      showToast({
        text: `${item?.name ?? ''} を${-delta}個取り出しました`,
        undo: () => adjust(lot, -delta, { silent: true }),
      });
    }
  }

  function act(type, payload, doneText) {
    enqueue(type, payload);
    setSheet(null);
    if (doneText) showToast({ text: doneText });
  }

  const totalAll = lots.reduce((s, l) => s + l.quantity, 0);
  const pending = queue.length;

  return (
    <div className="app">
      <header>
        <div>
          <p className="eyebrow">Freezer Stock</p>
          <h1>冷凍庫在庫</h1>
        </div>
        <div className="header-total">
          <span className="num">{totalAll}</span>
          <span className="unit">個</span>
        </div>
      </header>

      {pending > 0 ? (
        <p className="sync-note pending">未送信 {pending}件・この端末に保存済み。電波が戻ると自動で送信します</p>
      ) : (
        offline && !loading && items.length > 0 && <p className="sync-note">オフライン（前回読み込んだ内容を表示中）</p>
      )}

      {loading ? (
        <p className="state">読み込み中…</p>
      ) : error && items.length === 0 ? (
        <div className="state">
          <p>{error}</p>
          <button className="btn" onClick={reload}>再読み込み</button>
        </div>
      ) : items.length === 0 ? (
        <div className="state">
          <p>まだお菓子が登録されていません。</p>
          <button className="btn primary" onClick={() => setSheet({ type: 'items' })}>お菓子を登録する</button>
        </div>
      ) : (
        <main className="cards">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              lots={lots.filter((l) => l.item_id === item.id && l.quantity > 0)}
              onAdjust={adjust}
              onAdd={() => setSheet({ type: 'lot', item })}
              onEditLot={(lot) => setSheet({ type: 'lot', item, lot })}
            />
          ))}
        </main>
      )}

      <footer>
        <button className="btn ghost" onClick={() => setSheet({ type: 'items' })}>お菓子の登録・編集</button>
        <button className="btn ghost" onClick={() => setSheet({ type: 'qr' })}>QRコード</button>
      </footer>

      {sheet?.type === 'lot' && (
        <LotSheet
          item={sheet.item}
          lot={sheet.lot}
          onClose={() => setSheet(null)}
          onSave={(fields) =>
            sheet.lot
              ? act('updateLot', { id: sheet.lot.id, fields }, '更新しました')
              : act(
                  'addLot',
                  { id: store.newId(), item_id: sheet.item.id, created_at: new Date().toISOString(), ...fields },
                  `${sheet.item.name} を${fields.quantity}個追加しました`
                )
          }
          onDelete={sheet.lot ? () => act('deleteLot', { id: sheet.lot.id }, '削除しました') : null}
        />
      )}
      {sheet?.type === 'items' && (
        <ItemsSheet
          items={items}
          onClose={() => setSheet(null)}
          onSave={(item) =>
            act('saveItem', item.id ? item : { ...item, id: store.newId(), created_at: new Date().toISOString() })
          }
          onDelete={(item) => act('deleteItem', { id: item.id }, `${item.name} を削除しました`)}
        />
      )}
      {sheet?.type === 'qr' && <QrSheet onClose={() => setSheet(null)} />}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              元に戻す
            </button>
          )}
        </div>
      )}
    </div>
  );
}
