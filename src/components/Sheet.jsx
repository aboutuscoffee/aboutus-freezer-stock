// 画面下から出るシート（スマホで片手操作しやすいように）
export default function Sheet({ title, onClose, children }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="close" aria-label="閉じる" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
