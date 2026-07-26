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
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="aidhide.support@gmail.com"
SMTP_PASSWORD="メールサービスが発行したアプリパスワード"
EMAIL_FROM="令和新漢語 <aidhide.support@gmail.com>"
DATA_LICENSE="site-only"
RATE_LIMIT_WINDOW_SECONDS="60"
RATE_LIMIT_POSTS_PER_WINDOW="12"
RATE_LIMIT_COMMENTS_PER_WINDOW="12"
RATE_LIMIT_REPORTS_PER_WINDOW="8"
```

`DATA_LICENSE` は `site-only` に固定します。既存投稿へ遡って条件を変えられないため、バージョン付きの投稿者同意を別途設計するまでCCライセンスへ変更しません。レート制限は同一アカウントに対する1ウィンドウ当たりの上限です。起動・PostgreSQLビルド前に以下で設定漏れ、弱い認証情報、無効なレート制限値を検査できます。

公開ページでは運営名を `令和新漢語運営事務局` と表示します。運営責任者の氏名と連絡可能な住所は公開設定やリポジトリへ保存せず、本人から問い合わせ先へ請求があった場合に遅滞なく回答できるよう、運営者が安全な場所で管理します。

パスワード再設定メールはTLS対応SMTPで送信します。Gmailを使う場合はGoogleアカウントの
2段階認証を有効にし、このアプリ専用のアプリパスワードを `SMTP_PASSWORD` に設定します。
通常のGoogleアカウントパスワードは設定しません。VercelのPreviewとProductionでは
別のSMTP認証情報を使い、`SMTP_PASSWORD` をSensitiveとして登録します。

- [Nodemailer SMTP transport](https://nodemailer.com/smtp)
- [Google アプリ パスワード](https://support.google.com/mail/answer/185833)

アカウント削除は、本人がアカウント設定から申請し、管理者が管理画面で処理します。
処理ではメールアドレス、認証情報、公開プロフィールを消去し、既存投稿の作成者表示を
「退会済み利用者」へ置き換えます。処理前の申請は本人が取り消せます。

```bash
npm run check:production-env
```

Supabase で運用する場合は [Supabase 運用手順](./SUPABASE.md) を参照してください。Vercel などの serverless 環境では `DATABASE_URL` に Supavisor transaction mode、`DIRECT_URL` に direct connection または session mode を使います。

## 採用構成

- 運営条件: 個人・非商用、月額上限0円
- アプリ: Vercel Hobby（Function Region `hnd1`）
- DB: Supabase Free PostgreSQL（東京 `ap-northeast-1`。ProductionとStagingは別プロジェクト）
- Supabase Auth と anon key は初期構成では不要
- バックアップ: 日次または重要変更前の `pg_dump` を端末外の暗号化ストレージへ退避
- 監視: UptimeRobotから `/api/health` を5分間隔で外形監視し、Vercel Runtime Logsで原因を調査
- アクセス解析: Cookieを使わないVercel Web Analytics。カスタムイベントは使用しない
- ドメイン: 無料の `*.vercel.app`、HTTPS必須

契約、環境変数、受入試験の担当分けは [公開前チェックリスト](./PUBLICATION_CHECKLIST.md) を参照してください。
監視の確認頻度、記録対象、障害対応は [監視・アクセス解析方針](./MONITORING.md) を参照してください。

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

`pg_dump` は接続先PostgreSQLと同じメジャーバージョン、またはそれより新しいクライアントを使用してください。スクリプトは `public` のアプリ用テーブルだけを、所有者・権限情報を除いて保存し、失敗時に空のバックアップファイルを残しません。出力ファイルの権限は作成者だけが読める状態にします。

空の使い捨てDBへの復元テスト:

```bash
RESTORE_DATABASE_URL="postgresql://..." \
CONFIRM_RESTORE="staging-restore" \
npm run restore:postgres -- backups/reiwa-shinkango-YYYYMMDD-HHMMSS.sql
```

復元スクリプトはURLのパスワードや接続オプションが違っても、`DATABASE_URL` または `DIRECT_URL` と同じ接続先を拒否します。復元先の `public` に表が1件でもある場合も拒否し、復元後は利用者・項目・マイグレーション件数を表示します。それでも、実行前に必ず空の使い捨てDBであることを確認してください。

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

外部環境を使わない一括検証は次のコマンドで実行します。

```bash
npm run verify:local
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
6. 新規登録メールを受信し、確認リンクからメールアドレスを確認する。
7. 未確認状態では投稿できず、確認後に投稿できることを確認する。
8. ログアウトし、登録メールアドレスへ届くリンクからパスワードを再設定する。
9. 使用済みの確認・再設定リンクを再度開き、利用できないことを確認する。
10. 変更履歴から編集を差し戻す。
11. `/api/health` が成功することを確認する。
12. `npm run backup:postgres` を実行し、空の検証DBへ復元する。
