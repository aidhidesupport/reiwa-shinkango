# 公開前チェックリスト

最終更新: 2026-07-15

この文書にはシークレットや運営責任者の個人情報を書き込まないでください。日付、担当、結果、バックアップファイル名など、漏れても問題のない証跡だけを記録します。

## 決定済みの方針

- 投稿データ: 初回公開は `site-only`。CC BY 4.0 / CC BY-SA 4.0への変更は、投稿者への条件提示と規約改定方法を法務確認してから行う。
- アプリ: Vercel Pro。Function Region は東京 `hnd1`（`vercel.json` に設定済み）。
- PostgreSQL: Supabase。Production は東京 `ap-northeast-1` の Pro、Staging は別プロジェクトを使用する。
- ドメイン: 独自ドメインを1つ取得し、apex（例: `example.jp`）を正規URL、`www` をapexへリダイレクトする。
- バックアップ: Supabaseの日次バックアップに加え、日次または変更前に `pg_dump` を取得し、Supabaseとは別の暗号化ストレージへ保管する。
- レート制限初期値: 60秒につき、投稿12件、コメント12件、通報8件。同一アカウント単位。公開後1週間はログを毎日確認し、荒らしまたは誤検知に応じて調整する。

Vercel Hobbyは個人・非商用向けに限定されるため、公開運用ではProを採用します。Supabase Freeには自動バックアップがないため、実投稿を保持するProductionにはProを使用します。StagingをFreeにする場合も、検証終了時に手動バックアップを取ります。

参考:

- [Vercelのプラン](https://vercel.com/pricing)
- [VercelのFunction Region](https://vercel.com/docs/functions/configuring-functions/region)
- [Vercelの独自ドメインとSSL](https://vercel.com/docs/domains/set-up-custom-domain)
- [Supabaseのリージョン](https://supabase.com/docs/guides/platform/regions)
- [Supabaseのバックアップ](https://supabase.com/docs/guides/platform/backups)

## あなたが行う作業

### 1. 法務・運営者情報

- [ ] `/legal/terms`、`/legal/privacy`、`/rules` の内容を読み、実際の運用と一致することを確認した。
- [ ] 必要に応じて日本法に詳しい専門家へ最終確認を依頼した。
- [ ] パスワードマネージャー等の暗号化された安全な場所に、運営責任者の本名、郵便番号、住所、連絡先、記録日、開示回答テンプレートを保存した。
- [ ] 上記の個人情報をGit、Vercel、Supabase、公開ドキュメントへ保存していない。
- [ ] 問い合わせ用メール `aidhide.support@gmail.com` を受信でき、二要素認証と復旧手段を設定した。

規約本文は実装済みですが、法的妥当性を保証するものではありません。専門家へ渡すときは `src/app/legal/terms/page.tsx`、`src/app/legal/privacy/page.tsx`、`src/app/rules/page.tsx` の3点を同時に確認してもらいます。

### 2. サービス契約とドメイン

- [ ] Supabaseで東京リージョンのStagingプロジェクトを作成した。
- [ ] Supabaseで東京リージョンのProduction Proプロジェクトを作成した。
- [ ] Vercelプロジェクトを作成し、このGitリポジトリを接続した。
- [ ] Vercel Proを選択した。
- [ ] 使用する独自ドメインを取得した: `________________________`
- [ ] Vercelへapexと`www`を登録し、正規URLへのリダイレクトとSSL発行を確認した。
- [ ] VercelのProduction Branchを確認し、Staging用ブランチのPreview環境をStaging DBへ接続した。

### 3. 本番・ステージング環境変数

VercelのPreviewとProductionで値を分け、`DATABASE_URL`、`DIRECT_URL`、`SESSION_SECRET`、`ADMIN_PASSWORD` はSensitiveとして登録します。値をこの文書やGitへ貼り付けないでください。

```text
DATABASE_URL
DIRECT_URL
SESSION_SECRET
NEXT_PUBLIC_SITE_URL
ADMIN_EMAIL
ADMIN_PASSWORD
CONTACT_EMAIL
OPERATOR_NAME
DATA_LICENSE
RATE_LIMIT_WINDOW_SECONDS
RATE_LIMIT_POSTS_PER_WINDOW
RATE_LIMIT_COMMENTS_PER_WINDOW
RATE_LIMIT_REPORTS_PER_WINDOW
```

Productionの公開値は次のとおりです。

```text
CONTACT_EMAIL=aidhide.support@gmail.com
OPERATOR_NAME=令和新漢語運営事務局
DATA_LICENSE=site-only
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_POSTS_PER_WINDOW=12
RATE_LIMIT_COMMENTS_PER_WINDOW=12
RATE_LIMIT_REPORTS_PER_WINDOW=8
```

`SESSION_SECRET` は `openssl rand -base64 48` 等で生成し、`ADMIN_PASSWORD` はパスワードマネージャーで20文字以上の固有値を生成します。StagingとProductionで同じ秘密値を使わないでください。

### 4. Stagingの自動検証

手元のシェルへStagingの環境変数を一時設定してから実行します。

```bash
npm run verify:staging
```

このコマンドは、環境変数検査、migration、seed、PostgreSQL build、HTTPS上の `/api/health` を順番に検証します。

- [ ] `npm run verify:staging` が成功した。実施日: `____________`
- [ ] 初期管理者でログインできた。
- [ ] 初期語彙が表示された。

### 5. Stagingの手動受入確認

- [ ] 一般ユーザーを新規登録した。
- [ ] 項目、意味、訳語案、使用例を投稿した。
- [ ] 評価とコメントを投稿した。
- [ ] 訳語案を通報した。
- [ ] 編集者で修正提案を承認・却下した。
- [ ] 推奨訳を設定した。
- [ ] 通報対象を非表示にし、通報を処理済みにした。
- [ ] 別の通報を却下した。
- [ ] 管理画面でテストユーザーを停止し、ログインできないことを確認した。
- [ ] 停止を解除し、再びログインできることを確認した。
- [ ] 変更履歴から編集を差し戻した。

### 6. バックアップと復元

バックアップを取得します。

```bash
npm run backup:postgres
```

空の使い捨て復元先DBを別に用意し、出力ファイルを復元します。復元先はStaging本体ともProductionとも別にしてください。

```bash
RESTORE_DATABASE_URL="postgresql://..." \
CONFIRM_RESTORE="staging-restore" \
npm run restore:postgres -- backups/reiwa-shinkango-YYYYMMDD-HHMMSS.sql
```

- [ ] 復元が成功した。実施日: `____________`
- [ ] 復元DBの主要件数が元DBと一致した。
- [ ] 復元DBへ接続した一時環境で `/api/health` とログインを確認した。
- [ ] バックアップをSupabaseとは別の暗号化ストレージへ退避した。

### 7. HTTPS・セキュリティ・表示

```bash
curl --fail "https://公開ドメイン/api/health"
curl --head "https://公開ドメイン/"
```

- [ ] `/api/health` が `{"ok":true,...}` を返した。
- [ ] `x-content-type-options: nosniff`、`x-frame-options: DENY`、`referrer-policy`、`permissions-policy` を確認した。
- [ ] Vercel/Supabaseの利用上限・課金アラートを設定した。
- [ ] ホーム、検索、項目詳細、新規投稿、ログイン、アカウント、編集者ダッシュボード、管理画面、規約3画面をPCで目視した。
- [ ] 同じ画面を幅390px相当のモバイルで確認し、横スクロール、文字切れ、重なるボタンがないことを確認した。

## 公開判定

以下がすべて満たされるまで、Productionを一般公開しません。

- [ ] 法務・運営者情報の確認が完了。
- [ ] 独自ドメインとProduction環境変数が確定。
- [ ] Stagingの自動検証、手動受入、バックアップ復元が完了。
- [ ] ProductionのHTTPS、`/api/health`、セキュリティヘッダーを確認。
- [ ] Gitの作業ツリーがクリーンで、公開対象コミットがProductionへ反映済み。
