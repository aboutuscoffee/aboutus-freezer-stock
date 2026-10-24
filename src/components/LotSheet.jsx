import { useState } from 'react';
import Sheet from './Sheet';
import { addDays, today } from '../lib/dates';

// 仕込みロットの追加・編集。期限は「仕込み日＋保存日数」で自動入力し、手で変えることもできる
export default function LotSheet({ item, lot, onClose, onSave, onDelete }) {
  const [madeOn, setMadeOn] = useState(lot?.made_on ?? today());
  const [expiresOn, setExpiresOn] = useState(lot?.expires_on ?? addDays(today(), item.shelf_life_days));
  const [expiryTouched, setExpiryTouched] = useState(!!lot);
  const [quantity, setQuantity] = useState(lot?.quantity ?? '');
  const [saving, setSaving] = useState(false);

  function changeMadeOn(v) {
    setMadeOn(v);
    if (!expiryTouched && v) setExpiresOn(addDays(v, item.shelf_life_days));
  }

  const qty = parseInt(quantity, 10);
  const valid = madeOn && expiresOn && qty > 0;

  async function submit(e) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    await onSave({ made_on: madeOn, expires_on: expiresOn, quantity: qty });
    setSaving(false);
  }

  return (
    <Sheet title={lot ? `${item.name} を編集` : `${item.name} を追加`} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          <span>仕込み日</span>
          <input type="date" value={madeOn} onChange={(e) => changeMadeOn(e.target.value)} required />
        </label>
        <label>
          <span>期限 {!lot && <small>（仕込み日＋{item.shelf_life_days}日）</small>}</span>
          <input
            type="date"
            value={expiresOn}
            onChange={(e) => {
              setExpiresOn(e.target.value);
              setExpiryTouched(true);
            }}
            required
          />
        </label>
        <label>
          <span>個数</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            autoFocus={!lot}
            required
          />
        </label>
        <button className="btn primary block" disabled={!valid || saving}>
          {saving ? '保存中…' : lot ? '更新する' : '追加する'}
        </button>
        {onDelete && (
          <button
            type="button"
            className="btn danger block"
            onClick={() => confirm('この仕込み分を削除しますか？') && onDelete()}
          >
            この仕込み分を削除
          </button>
        )}
      </form>
    </Sheet>
  );
}
