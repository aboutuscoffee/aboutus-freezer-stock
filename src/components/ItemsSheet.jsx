import { useState } from 'react';
import Sheet from './Sheet';

function ItemRow({ item, onSave, onDelete }) {
  const [name, setName] = useState(item?.name ?? '');
  const [days, setDays] = useState(item?.shelf_life_days ?? 30);
  const isNew = !item;
  const dirty = isNew ? name.trim() : name.trim() !== item.name || Number(days) !== item.shelf_life_days;

  function submit(e) {
    e.preventDefault();
    if (!name.trim() || !(Number(days) > 0)) return;
    onSave({ ...item, name: name.trim(), shelf_life_days: Number(days) });
    if (isNew) setName('');
  }

  return (
    <form className="item-row" onSubmit={submit}>
      <input placeholder={isNew ? '新しいお菓子の名前' : ''} value={name} onChange={(e) => setName(e.target.value)} />
      <label className="days">
        <input type="number" inputMode="numeric" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
        <span>日</span>
      </label>
      {dirty ? (
        <button className="btn primary small">{isNew ? '追加' : '保存'}</button>
      ) : (
        !isNew && (
          <button
            type="button"
            className="btn danger small"
            onClick={() => confirm(`${item.name} を削除しますか？\n在庫の記録もすべて消えます。`) && onDelete(item)}
          >
            削除
          </button>
        )
      )}
    </form>
  );
}

export default function ItemsSheet({ items, onClose, onSave, onDelete }) {
  return (
    <Sheet title="お菓子の登録・編集" onClose={onClose}>
      <p className="hint">「日」は仕込み日から期限までの日数です。追加時の期限に自動で入ります。</p>
      <div className="item-rows">
        {items.map((item) => (
          <ItemRow key={item.id + item.name + item.shelf_life_days} item={item} onSave={onSave} onDelete={onDelete} />
        ))}
        <ItemRow key="new" onSave={(i) => onSave({ ...i, sort_order: items.length })} />
      </div>
    </Sheet>
  );
}
