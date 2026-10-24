import { useCallback, useEffect, useRef, useState } from 'react';
import * as db from './lib/db';
import ItemCard from './components/ItemCard';
import LotSheet from './components/LotSheet';
import ItemsSheet from './components/ItemsSheet';
import QrSheet from './components/QrSheet';

export default function App() {
  const [items, setItems] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null); // {type:'lot', item, lot?} | {type:'items'} | {type:'qr'}
  const [toast, setToast] = useState(null); // {text, undo?}
  const toastTimer = useRef(null);

  const reload = useCallback(async () => {
    try {
      const data = await db.fetchAll();
      setItems(data.items);
      setLots(data.lots);
      setError('');
    } catch (e) {
      setError(e.message || '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // もう1台の端末での変更も拾えるよう、画面に戻ったとき・30秒ごとに再読込
  useEffect(() => {
    reload();
    const onVisible = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => document.visibilityState === 'visible' && reload(), 30000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [reload]);

  function showToast(t) {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  async function adjust(lot, delta, { silent } = {}) {
    setLots((ls) => ls.map((l) => (l.id === lot.id ? { ...l, quantity: Math.max(l.quantity + delta, 0) } : l)));
    try {
      await db.adjustLot(lot.id, delta);
      if (!silent && delta < 0) {
        const item = items.find((i) => i.id === lot.item_id);
        showToast({
          text: `${item?.name ?? ''} を${-delta}個取り出しました`,
          undo: () => adjust(lot, -delta, { silent: true }),
        });
      }
    } catch (e) {
      showToast({ text: '保存に失敗しました。もう一度お試しください' });
      reload();
    }
  }

  async function run(fn, doneText) {
    try {
      await fn();
      setSheet(null);
      if (doneText) showToast({ text: doneText });
      await reload();
    } catch (e) {
      showToast({ text: '保存に失敗しました：' + (e.message || '') });
    }
  }

  const totalAll = lots.reduce((s, l) => s + l.quantity, 0);

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

      {loading ? (
        <p className="state">読み込み中…</p>
      ) : error ? (
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
              ? run(() => db.updateLot(sheet.lot.id, fields), '更新しました')
              : run(() => db.addLot({ item_id: sheet.item.id, ...fields }), `${sheet.item.name} を${fields.quantity}個追加しました`)
          }
          onDelete={sheet.lot ? () => run(() => db.deleteLot(sheet.lot.id), '削除しました') : null}
        />
      )}
      {sheet?.type === 'items' && (
        <ItemsSheet
          items={items}
          onClose={() => setSheet(null)}
          onSave={(item) => run(() => db.saveItem(item))}
          onDelete={(item) => run(() => db.deleteItem(item.id), `${item.name} を削除しました`)}
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
