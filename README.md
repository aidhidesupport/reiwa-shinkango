# 令和新漢語

横文字・カタカナ語を、文脈に合う日本語へ言い換えるための公開推敲アプリです。

## 実装済みの主な機能

- 横文字項目の検索
- 横文字項目の詳細ページ
- メール/パスワードログイン、メールアドレス確認、本人向けパスワード再設定
- 意味・分野ごとの日本語案表示
- 使用例の比較表示
- 日本語案の投稿
- 観点別評価ラベル
- コメントによる議論
- 自分の投稿・コメント・評価を確認できるマイページ
- コメント・推奨判断・通報結果のサイト内通知
- 編集者による推奨する日本語案の設定
- 意味・日本語案・使用例の修正提案と直接編集
- 修正提案の承認・却下、理由付き差し戻し
- 対象名・項目名・状態値を日本語で読める変更履歴
- 画面と保存処理で共有する役割別権限表
- 対象内容・公開状態・処理結果が分かる通報キュー
- 比較プレビューと旧URL転送を備えた重複項目の統合
- 理由・実行者の履歴と復元キューを備えた投稿の非公開管理
- 編集者ダッシュボード
- 表示名・ハンドル・パスワード変更、退会・アカウント削除申請、管理者による処理
- 投稿ルール、利用規約、プライバシーポリシー
- ヘルスチェック、サイトマップ、robots
- Vercel Web Analytics、外形監視・障害対応方針
- SQLite/PostgreSQL向け運用スクリプト
- 本番環境変数検査、アクセシビリティ監査、PC・390px幅のPlaywright E2Eテスト

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
npm run audit:data
npm audit --omit=dev
npm run test:e2e
```

公開前のローカル検証は `npm run verify:local` で一括実行できます。

## DB

ローカルDBは SQLite です。`npm run db:reset` で `prisma/dev.db` を作り直し、初期データを投入します。

Prisma CLI の `db push` がこの環境で安定しなかったため、SQLite の初期DDLは [prisma/init.sql](./prisma/init.sql) に固定しています。

公開時は PostgreSQL を使う想定です。具体的な担当分けと公開判定は [docs/PUBLICATION_CHECKLIST.md](./docs/PUBLICATION_CHECKLIST.md)、汎用手順は [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)、Supabase で使う場合は [docs/SUPABASE.md](./docs/SUPABASE.md) を参照してください。

初期データの監査結果と編集レビュー対象は [docs/DATA_QUALITY_REVIEW.md](./docs/DATA_QUALITY_REVIEW.md) で管理します。
