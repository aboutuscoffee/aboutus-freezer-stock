import { expiryStatus, label } from '../lib/dates';

// lots は made_on の昇順（古い順）で渡ってくる。先頭が「先に使う」ロット
export default function ItemCard({ item, lots, onAdjust, onAdd, onEditLot }) {
  const total = lots.reduce((s, l) => s + l.quantity, 0);

  return (
    <section className={`card ${total === 0 ? 'empty' : ''}`}>
      <div className="card-head">
        <h2>{item.name}</h2>
        <div className="card-total">
          <span className="num">{total}</span>
          <span className="unit">個</span>
        </div>
      </div>

      {lots.length === 0 ? (
        <p className="no-stock">在庫なし</p>
      ) : (
        <ul className="lots">
          {lots.map((lot, i) => {
            const ex = expiryStatus(lot.expires_on);
            return (
              <li key={lot.id} className={`lot ${i === 0 ? 'first' : ''}`}>
                <button className="lot-info" onClick={() => onEditLot(lot)}>
                  <span className="made">
                    {i === 0 && lots.length > 1 && <span className="badge">先に使う</span>}
                    {label(lot.made_on)} 仕込み
                  </span>
                  <span className={`expiry ${ex.tone}`}>
                    期限 {label(lot.expires_on)}・{ex.text}
                  </span>
                </button>
                <div className="stepper">
                  <button aria-label="1個取り出す" onClick={() => onAdjust(lot, -1)}>−</button>
                  <span className="qty">{lot.quantity}</span>
                  <button aria-label="1個戻す" onClick={() => onAdjust(lot, 1)}>＋</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button className="add-lot" onClick={onAdd}>＋ 仕込んだ分を追加</button>
    </section>
  );
}
