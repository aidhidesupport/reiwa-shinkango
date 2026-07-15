# Supabase 運用手順

このアプリは Supabase Auth ではなく、Next.js 側のメール/パスワード認証と署名付きセッションCookieを使います。Supabase は本番 PostgreSQL として使います。ブラウザから Supabase に直接接続しないため、公開テーブルや anon key は不要です。

## 1. Supabase プロジェクトを作る

Supabase で新規プロジェクトを作成し、Dashboard の SQL Editor を開きます。

## 2. Prisma 用DBユーザーを作る

`CHANGE_THIS_PASSWORD` を強いパスワードに変えて実行します。

```sql
create user "prisma" with password 'CHANGE_THIS_PASSWORD' bypassrls createdb;

grant "prisma" to "postgres";

grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;

alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

## 3. 接続文字列を設定する

Vercel のような serverless 環境では、実行時の `DATABASE_URL` は Supavisor transaction mode を使います。ポートは `6543` で、Prisma の prepared statement 衝突を避けるため `?pgbouncer=true` を付けます。

```bash
DATABASE_URL="postgresql://prisma.[PROJECT-REF]:[PRISMA-PASSWORD]@aws-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

マイグレーションとバックアップには `DIRECT_URL` を使います。IPv6 が使える環境、または Supabase の IPv4 add-on がある場合は direct connection を使えます。IPv4-only 環境では Supavisor session mode を使います。

```bash
DIRECT_URL="postgresql://prisma.[PROJECT-REF]:[PRISMA-PASSWORD]@aws-[REGION].pooler.supabase.com:5432/postgres"
```

長時間動く VM やコンテナだけで運用する場合は、`DATABASE_URL` も session mode にして構いません。

## 4. アプリ環境変数を設定する

```bash
SESSION_SECRET="openssl rand -base64 48 などで作った長いランダム文字列"
NEXT_PUBLIC_SITE_URL="https://your-domain.example"
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

`ADMIN_PASSWORD` は初期投入用です。公開前から強い値にして、漏れないように管理します。
`DATA_LICENSE` は `site-only`、`CC-BY-4.0`、`CC-BY-SA-4.0` のいずれかを明示します。初回公開は `site-only` とします。設定後は `npm run check:production-env` を実行します。
運営責任者の氏名と連絡可能な住所はSupabaseやリポジトリの公開設定へ保存せず、本人から問い合わせ先へ請求があった場合に遅滞なく回答できるよう、安全な場所で管理します。

## 5. マイグレーションと初期データ

Supabase にテーブルを作り、初期語彙と管理者を投入します。

```bash
npm run prisma:migrate:postgres
npm run seed
```

ローカルSQLite開発に戻る場合は、最後に SQLite 用クライアントへ戻します。

```bash
npm run prisma:generate
```

## 6. Vercel に置く場合

- Framework Preset: Next.js
- Build Command: `npm run build:postgres`（環境変数検査を含む）
- Install Command: `npm ci`
- Environment Variables: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CONTACT_EMAIL`, `OPERATOR_NAME`, `DATA_LICENSE`, `RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_POSTS_PER_WINDOW`, `RATE_LIMIT_COMMENTS_PER_WINDOW`, `RATE_LIMIT_REPORTS_PER_WINDOW`
- Function Region: `hnd1`（`vercel.json` で設定済み）

本番反映前に、手元またはCIで以下を実行します。

```bash
npm run prisma:migrate:postgres
npm run seed
```

`seed` は空のDBにだけ初期データを投入します。利用者または項目が存在する場合は、既存データを削除せず処理をスキップします。本番PostgreSQLでは、既知のデモ用パスワードを持つアカウントは作成しません。

## 7. 動作確認

```bash
curl -f https://your-domain.example/api/health
```

その後、`ADMIN_EMAIL` と `ADMIN_PASSWORD` で `/login` に入り、`/dashboard` が開けることを確認します。

## 8. バックアップ

`DATABASE_URL` または `DIRECT_URL` を接続できる値にして実行します。

```bash
npm run backup:postgres
```

生成されたSQLは `backups/` に置かれます。本番ではこの出力先を別ストレージへ退避してください。
`pg_dump` は接続先PostgreSQLと同じメジャーバージョン、またはそれより新しいクライアントを使用してください。

## 参考

- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Prisma](https://supabase.com/docs/guides/database/prisma)
- [Supabase: Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
