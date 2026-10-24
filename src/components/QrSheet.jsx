import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Sheet from './Sheet';

// 冷凍庫に貼るためのQRコード。開いているページのURL（クエリ等を除く）を埋め込む
export default function QrSheet({ onClose }) {
  const url = window.location.origin + window.location.pathname;
  const [src, setSrc] = useState('');

  useEffect(() => {
    QRCode.toDataURL(url, { width: 600, margin: 2, color: { dark: '#24343D', light: '#FFFFFF' } }).then(setSrc);
  }, [url]);

  return (
    <Sheet title="QRコード" onClose={onClose}>
      <div className="qr">
        {src && <img src={src} alt="このアプリのQRコード" />}
        <p className="qr-url">{url}</p>
        {src && (
          <a className="btn primary block" href={src} download="freezer-stock-qr.png">
            画像を保存して印刷
          </a>
        )}
      </div>
    </Sheet>
  );
}
