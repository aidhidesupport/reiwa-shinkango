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
```

`ADMIN_PASSWORD` は初期投入用です。公開前から強い値にして、漏れないように管理します。

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
- Build Command: `npm run build:postgres`
- Install Command: `npm ci`
- Environment Variables: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

本番反映前に、手元またはCIで以下を実行します。

```bash
npm run prisma:migrate:postgres
npm run seed
```

`seed` は冪等にしてあります。既存データを消さず、足りない初期データを補います。

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

## 参考

- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Prisma](https://supabase.com/docs/guides/database/prisma)
- [Supabase: Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
