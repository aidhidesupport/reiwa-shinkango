# 令和新漢語

横文字・カタカナ語を、文脈に合う日本語へ言い換えるための公開推敲アプリです。

## 実装済みの主な機能

- 横文字項目の検索
- 横文字項目の詳細ページ
- メール/パスワードログイン
- 意味・分野ごとの訳語案表示
- 使用例の比較表示
- 訳語案の投稿
- 観点別評価ラベル
- コメントによる議論
- 編集者による推奨訳設定
- 意味・訳語案・使用例の修正提案と直接編集
- 修正提案の承認・却下、理由付き差し戻し
- 変更履歴
- 通報キュー
- 編集者ダッシュボード
- 表示名・ハンドル・パスワード変更、管理者による一時パスワード発行
- 投稿ルール、利用規約、プライバシーポリシー
- ヘルスチェック、サイトマップ、robots
- SQLite/PostgreSQL向け運用スクリプト
- 本番環境変数検査とPlaywright E2Eテスト

## セットアップ

```bash
npm install
cp .env.example .env
npm run db:reset
npm run dev
```

開発サーバーは通常 `http://localhost:3000` で起動します。

初期管理者（ローカル開発用）:

```text
admin@example.com
change-me-admin-password
```

公開環境では `ADMIN_EMAIL` と `ADMIN_PASSWORD` を必ず強い値に変更してください。

## 検証

```bash
npm run test
npm run typecheck
npm run build
npm audit --omit=dev
npm run test:e2e
```

## DB

ローカルDBは SQLite です。`npm run db:reset` で `prisma/dev.db` を作り直し、初期データを投入します。

Prisma CLI の `db push` がこの環境で安定しなかったため、SQLite の初期DDLは [prisma/init.sql](./prisma/init.sql) に固定しています。

公開時は PostgreSQL を使う想定です。具体的な担当分けと公開判定は [docs/PUBLICATION_CHECKLIST.md](./docs/PUBLICATION_CHECKLIST.md)、汎用手順は [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)、Supabase で使う場合は [docs/SUPABASE.md](./docs/SUPABASE.md) を参照してください。
