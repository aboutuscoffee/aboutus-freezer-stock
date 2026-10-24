# 冷凍庫在庫（aboutus-freezer-stock）

仕込んだお菓子の冷凍在庫を「仕込み日ごと」に管理するアプリ。古い仕込み分が上に並び「先に使う」が付くので、先入先出がひと目でわかる。冷凍庫にQRコードを貼り、スマホで読み込んで使う想定。

- 取り出したら −、戻したら ＋（押した瞬間に保存。取り出し直後は「元に戻す」可）
- 仕込み日・期限・個数をタップすると編集・削除
- 期限は「仕込み日＋お菓子ごとの保存日数」で自動入力（手で変更も可）。3日以内はオレンジ、過ぎたら赤
- 画面下の「QRコード」から冷凍庫に貼るQR画像を保存できる

## セットアップ

1. Supabase SQL Editor で `scripts/schema.sql` を実行（`fs_items` / `fs_lots` テーブル、増減用関数 `fs_adjust_lot`、RLS）
2. `.env` に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`（Beans Profile と同じプロジェクト）
3. `npm install && npm run dev`（port 5186）

## デプロイ

GitHub Pages + Actions（`main` に push で自動デプロイ）。リポジトリの Secrets に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を登録し、Settings → Pages の Source を「GitHub Actions」にする。
