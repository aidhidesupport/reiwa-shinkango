# 公開前チェックリスト

最終更新: 2026-07-26

この文書にはシークレットや運営責任者の個人情報を書き込まないでください。日付、担当、結果、バックアップファイル名など、漏れても問題のない証跡だけを記録します。

## 決定済みの方針

- 運営: 当面は個人・非商用。月額上限は0円。
- 投稿データ: `site-only` に固定する。既存投稿へ遡ってCCライセンスを適用しない。
- アプリ: Vercel Hobby。Function Region は東京 `hnd1`（`vercel.json` に設定済み）。
- PostgreSQL: Supabase Free。ProductionとStagingを東京 `ap-northeast-1` の別プロジェクトにする。
- ドメイン: 独自ドメインは取得せず、空いていれば `reiwa-shinkango.vercel.app` を使用する。
- バックアップ: Freeには自動バックアップがないため、日次または重要変更前に `pg_dump` を取得し、端末外の暗号化ストレージへ保管する。
- 稼働監視: UptimeRobot FreeからProductionの `/api/health` を5分間隔で確認し、運営用メールへ通知する。
- エラー調査: Vercel ObservabilityとRuntime Logsを使用する。公開後1週間は毎日、その後は週1回確認する。
- アクセス解析: Vercel Web Analyticsを使用する。カスタムイベントと個人単位の行動追跡は行わない。
- レート制限初期値: 60秒につき、投稿12件、コメント12件、通報8件。同一アカウント単位。公開後1週間はログを毎日確認し、荒らしまたは誤検知に応じて調整する。

この無料構成は、Vercel Hobbyの個人・非商用条件、Supabase Freeの容量・休止条件を守る間だけ使用します。収益化または業務利用を始める前にVercelのプランを再検討します。Supabase Freeには自動バックアップがないため、手動バックアップを運用条件とします。

参考:

- [Vercelのプラン](https://vercel.com/pricing)
- [VercelのFunction Region](https://vercel.com/docs/functions/configuring-functions/region)
- [Vercelの独自ドメインとSSL](https://vercel.com/docs/domains/set-up-custom-domain)
- [Supabaseのリージョン](https://supabase.com/docs/guides/platform/regions)
- [Supabaseのバックアップ](https://supabase.com/docs/guides/platform/backups)

## あなたが行う作業

### 1. 法務・運営者情報

- [ ] `/legal/terms`、`/legal/privacy`、`/rules` の内容を読み、実際の運用と一致することを確認した。
- [ ] 必要性が生じた段階で、日本法に詳しい専門家へ確認を依頼する（初回公開時は保留）。
- [ ] 運営責任者の氏名・住所を請求された場合、遅滞なく回答できることを確認した（特定の保管アプリは必須としない）。
- [ ] 上記の個人情報をGit、Vercel、Supabase、公開ドキュメントへ保存していない。
- [ ] 問い合わせ用メール `aidhide.support@gmail.com` を受信でき、二要素認証と復旧手段を設定した。

規約本文は実装済みですが、法的妥当性を保証するものではありません。専門家へ渡すときは `src/app/legal/terms/page.tsx`、`src/app/legal/privacy/page.tsx`、`src/app/rules/page.tsx` の3点を同時に確認してもらいます。

### 2. サービス契約とドメイン

- [ ] Supabaseで東京リージョンのStagingプロジェクトを作成した。
- [ ] Supabaseで東京リージョンのProduction Freeプロジェクトを作成した。
- [x] Vercelプロジェクト `takekis-projects/reiwa-shinkango` を確認し、ローカル作業環境を接続した。
- [ ] VercelプロジェクトへこのGitリポジトリを接続した。
- [ ] Vercel Hobbyを選択し、個人・非商用であることを確認した。
- [ ] 無料公開URLを確定した: `________________________________.vercel.app`
- [ ] 無料公開URLでSSL発行を確認した。
- [ ] VercelのProduction Branchを確認し、Staging用ブランチのPreview環境をStaging DBへ接続した。
- [ ] Vercel DashboardでWeb Analyticsを有効にした。
- [ ] UptimeRobotでProductionの `/api/health` を5分間隔で監視し、障害・復旧メールの受信を確認した。

### 3. 本番・ステージング環境変数

VercelのPreviewとProductionで値を分け、`DATABASE_URL`、`DIRECT_URL`、`SESSION_SECRET`、
`ADMIN_PASSWORD`、`SMTP_PASSWORD` はSensitiveとして登録します。値をこの文書やGitへ
貼り付けないでください。

```text
DATABASE_URL
DIRECT_URL
SESSION_SECRET
NEXT_PUBLIC_SITE_URL
ADMIN_EMAIL
ADMIN_PASSWORD
CONTACT_EMAIL
OPERATOR_NAME
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
EMAIL_FROM
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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=aidhide.support@gmail.com
EMAIL_FROM=令和新漢語 <aidhide.support@gmail.com>
```

2026-07-29時点で、上記の公開値と次のProduction用秘密値はVercelへ登録済みです。
`NEXT_PUBLIC_SITE_URL=https://reiwa-shinkango.vercel.app` もProductionへ登録済みです。

```text
DATABASE_URL
DIRECT_URL
SESSION_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD
SMTP_PASSWORD
```

Preview用の秘密値と公開URLは、Staging環境を運用するときにProductionとは別の値を登録します。

`SESSION_SECRET` は `openssl rand -base64 48` 等で生成し、`ADMIN_PASSWORD` はパスワード生成機能等で20文字以上の固有値にします。StagingとProductionで同じ秘密値を使わないでください。
`SMTP_PASSWORD` には2段階認証を有効にした送信アカウントのアプリパスワードを使い、
通常のログインパスワードは使いません。

### 4. Stagingの自動検証

外部環境を使わない検査は実装済みです。2026-07-26時点で、依存関係の高リスク脆弱性0件、単体42件、主要公開8画面のaxe検査、390px幅、SEO、ヘッダー、SQLite E2Eを通過しています。空のローカルPostgreSQLでも9migration、seed、別DBへのバックアップ復元を完了し、4利用者・120項目・245日本語案・9migrationの件数が一致しました。

```bash
npm run verify:local
```

手元のシェルへStagingの環境変数を一時設定してから実行します。

```bash
npm run verify:staging
```

このコマンドは、環境変数検査、migration、seed、PostgreSQL build、HTTPS上の `/api/health` を順番に検証します。

- [ ] `npm run verify:staging` が成功した。実施日: `____________`
- [ ] 初期管理者でログインできた。
- [ ] 初期語彙が表示された。
- [ ] StagingのGitHub Actionsが成功した対象コミットだけを受入対象にした。

### 5. Stagingの手動受入確認

- [ ] 一般ユーザーを新規登録した。
- [ ] 項目、使われ方、日本語案、使用例を投稿した。
- [ ] 評価とコメントを投稿した。
- [ ] 日本語案を通報した。
- [ ] 編集者で修正提案を承認・却下した。
- [ ] 推奨する日本語案を設定した。
- [ ] 通報カードで対象の現在内容、投稿者、公開状態、各操作の説明を確認した。
- [ ] 項目、日本語案、使用例、コメントをそれぞれ非公開にし、一般画面から消えることを確認した。
- [ ] 非公開理由・実行者・日時を復元キューで確認し、理由を入力して4種類を復元した。
- [ ] 非公開対象への投稿・評価・コメント・通報・修正提案が拒否されることを確認した。
- [ ] 通報を処理済みにした。
- [ ] テスト用の重複項目を統合し、関連データの移動と旧URLからの恒久転送を確認した。
- [ ] 別の通報を却下した。
- [ ] 管理画面でテストユーザーを停止し、ログインできないことを確認した。
- [ ] 停止を解除し、再びログインできることを確認した。
- [ ] 新規登録の確認メールが届き、未確認状態では投稿できず、確認後に投稿できた。
- [ ] 期限切れ・使用済みのメール確認リンクを利用できず、確認メールを再送できた。
- [ ] パスワード再設定メールが登録アドレスへ届き、新しいパスワードでログインできた。
- [ ] 未登録アドレスでも申請画面の応答が変わらず、使用済みリンクを再利用できないことを確認した。
- [ ] 一般ユーザーが削除を申請・取り消し・再申請できた。
- [ ] 管理者が削除申請を処理し、旧メールアドレスとパスワードでログインできず、投稿者表示が「退会済み利用者」になった。
- [ ] マイページで自分の投稿、コメント、評価を開き、詳細ページの該当箇所へ移動できた。
- [ ] コメント、推奨判断、通報結果の通知が届き、未読件数・個別既読・すべて既読が反映された。
- [ ] `/rules/permissions` で編集者と管理者の操作境界を確認した。
- [ ] 一般利用者が編集者ダッシュボードと管理画面を開けないことを確認した。
- [ ] 変更履歴の対象・項目名・状態値・分野名が日本語で表示され、内部IDやJSONが出ないことを確認した。
- [ ] 変更履歴から編集を差し戻した。
- [ ] Vercel Web AnalyticsのNetwork送信とDashboardへのページ閲覧反映を確認した。
- [ ] `/verify-email` と `/reset-password` の解析データにトークンのクエリ値が表示されないことを確認した。

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
- [ ] キーボードだけで本文スキップ、主要導線、フォーム、詳細表示を操作でき、フォーカス位置を見失わないことを確認した。
- [ ] Productionのcanonical、Open Graph、manifest、robots、sitemapが公開URLを指していることを確認した。
- [ ] Vercel Runtime Logsへ認証情報やトークンが出ていないことを確認した。

## 公開判定

以下がすべて満たされるまで、Productionを一般公開しません。

- [ ] 法務・運営者情報の確認が完了。
- [ ] 無料公開URLとProduction環境変数が確定。
- [ ] Stagingの自動検証、手動受入、バックアップ復元が完了。
- [ ] ProductionのHTTPS、`/api/health`、セキュリティヘッダーを確認。
- [ ] Productionの外形監視、Runtime Logs、Web Analyticsを確認。
- [ ] Gitの作業ツリーがクリーンで、公開対象コミットがProductionへ反映済み。
