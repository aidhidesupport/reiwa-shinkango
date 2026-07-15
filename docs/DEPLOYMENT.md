# 公開運用手順

## 必須環境変数

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
SESSION_SECRET="openssl rand -base64 48 などで作った長いランダム文字列"
NEXT_PUBLIC_SITE_URL="https://example.com"
ADMIN_EMAIL="owner@example.com"
ADMIN_PASSWORD="初回投入用の強いパスワード"
CONTACT_EMAIL="aidhide.support@gmail.com"
OPERATOR_NAME="令和新漢語運営事務局"
DATA_LICENSE="site-only"
RATE_LIMIT_WINDOW_SECONDS="60"
RATE_LIMIT_POSTS_PER_WINDOW="12"
RATE_LIMIT_COMMENTS_PER_WINDOW="12"
RATE_LIMIT_REPORTS_PER_WINDOW="8"
```

`DATA_LICENSE` は `site-only`、`CC-BY-4.0`、`CC-BY-SA-4.0` のいずれかです。初回公開は保守的な `site-only` を使用します。レート制限は同一アカウントに対する1ウィンドウ当たりの上限です。起動・PostgreSQLビルド前に以下で設定漏れ、弱い認証情報、無効なレート制限値を検査できます。

公開ページでは運営名を `令和新漢語運営事務局` と表示します。運営責任者の氏名と連絡可能な住所は公開設定やリポジトリへ保存せず、本人から問い合わせ先へ請求があった場合に遅滞なく回答できるよう、運営者が安全な場所で管理します。

```bash
npm run check:production-env
```

Supabase で運用する場合は [Supabase 運用手順](./SUPABASE.md) を参照してください。Vercel などの serverless 環境では `DATABASE_URL` に Supavisor transaction mode、`DIRECT_URL` に direct connection または session mode を使います。

## 採用構成

- アプリ: Vercel Pro（Function Region `hnd1`）
- DB: Supabase PostgreSQL（東京 `ap-northeast-1`。ProductionはPro、Stagingは別プロジェクト）
- Supabase Auth と anon key は初期構成では不要
- バックアップ: Supabaseの日次バックアップ + 日次または重要変更前の `pg_dump`
- 監視: `/api/health` を外形監視
- ドメイン: 独自ドメイン、HTTPS必須

契約、環境変数、受入試験の担当分けは [公開前チェックリスト](./PUBLICATION_CHECKLIST.md) を参照してください。

## PostgreSQL 用 Prisma

ローカル開発は SQLite を使います。本番向けには以下で PostgreSQL 用スキーマを生成します。

```bash
npm run prisma:generate:postgres
npm run prisma:migrate:postgres
```

`prisma/schema.postgres.prisma` は `prisma/schema.prisma` から生成されるため、通常は編集しません。

Vercel などのビルドでは以下を使います。

```bash
npm run build:postgres
```

## 初回データ投入

本番DBに初期データを入れる場合:

```bash
npm run seed
```

`ADMIN_EMAIL` と `ADMIN_PASSWORD` が初期管理者に使われます。公開前から強い値にしてください。
PostgreSQLでは既知のデモ用パスワードを持つ編集者・投稿者・読者アカウントは作られず、初期データの作成者としてログイン不能な状態で作成されます。`seed` は空のDBにだけ投入し、利用者または項目がすでに存在するDBではデータを削除せずスキップします。

## バックアップ

SQLite:

```bash
npm run backup:sqlite
```

PostgreSQL:

```bash
npm run backup:postgres
```

`pg_dump` は接続先PostgreSQLと同じメジャーバージョン、またはそれより新しいクライアントを使用してください。スクリプトは失敗時に空のバックアップファイルを残しません。

空の使い捨てDBへの復元テスト:

```bash
RESTORE_DATABASE_URL="postgresql://..." \
CONFIRM_RESTORE="staging-restore" \
npm run restore:postgres -- backups/reiwa-shinkango-YYYYMMDD-HHMMSS.sql
```

復元スクリプトは `DATABASE_URL` または `DIRECT_URL` と同じ接続先を拒否します。それでも、実行前に必ず空の使い捨てDBであることを確認してください。

## 公開前チェック

```bash
npm audit --omit=dev
npm run check:production-env
npm run test
npm run typecheck
npm run build
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npm run build:postgres
curl -f https://example.com/api/health
```

Stagingの環境変数をすべて設定済みなら、migration、seed、build、health checkをまとめて実行できます。

```bash
npm run verify:staging
```

## ステージング受入確認

マイグレーションと初期データ投入後、初期管理者で次の操作を一巡します。

1. ログインし、項目・意味・訳語案・使用例を投稿する。
2. 評価、コメント、通報を行う。
3. 編集者ダッシュボードで修正提案を承認し、推奨訳を設定する。
4. 通報対象を非表示にし、通報を処理済みまたは却下にする。
5. 管理画面でテストユーザーを停止・解除し、一時パスワードを発行する。
6. 変更履歴から編集を差し戻す。
7. `/api/health` が成功することを確認する。
8. `npm run backup:postgres` を実行し、空の検証DBへ復元する。
