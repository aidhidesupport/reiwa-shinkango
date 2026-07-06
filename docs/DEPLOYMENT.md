# 公開運用手順

## 必須環境変数

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
SESSION_SECRET="openssl rand -base64 48 などで作った長いランダム文字列"
NEXT_PUBLIC_SITE_URL="https://example.com"
ADMIN_EMAIL="owner@example.com"
ADMIN_PASSWORD="初回投入用の強いパスワード"
```

Supabase で運用する場合は [Supabase 運用手順](./SUPABASE.md) を参照してください。Vercel などの serverless 環境では `DATABASE_URL` に Supavisor transaction mode、`DIRECT_URL` に direct connection または session mode を使います。

## 推奨構成

- アプリ: Vercel、Render、Fly.io、または Docker 実行環境
- DB: PostgreSQL
- Supabase を使う場合: PostgreSQL のみ使用。Supabase Auth と anon key は初期構成では不要
- バックアップ: 日次 `pg_dump`
- 監視: `/api/health` を外形監視
- ドメイン: HTTPS必須

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

## バックアップ

SQLite:

```bash
npm run backup:sqlite
```

PostgreSQL:

```bash
npm run backup:postgres
```

## 公開前チェック

```bash
npm audit --omit=dev
npm run test
npm run typecheck
npm run build
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npm run build:postgres
curl -f https://example.com/api/health
```
