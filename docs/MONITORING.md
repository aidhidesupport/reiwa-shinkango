# 監視・アクセス解析方針

最終更新: 2026-07-26

公開初期は月額0円を維持し、個人を追跡しない最小構成で運用する。

## 採用する構成

### 稼働監視

- UptimeRobot FreeからProductionの `https://公開URL/api/health` を5分間隔で確認する。
- HTTP 200と本文の `"ok":true` を成功条件にし、運営用メールへ障害・復旧通知を送る。
- `/api/health` はDBへの `SELECT 1`、確認日時、DB応答時間を返す。キャッシュと検索索引を禁止する。
- Stagingは公開前検証中だけ同様の監視を作り、常時監視対象にはしない。

### サーバーエラー

- Vercel ObservabilityとRuntime Logsを一次調査に使う。
- HobbyのRuntime Logsは保持時間が短いため、障害通知を受けたら当日中に、発生時刻、対象URL、HTTP状態、関連するエラーを確認する。
- ログへパスワード、セッショントークン、メール確認・再設定トークン、SMTP認証情報を出力しない。
- 公開後1週間は毎日、その後は週1回、500系応答とFunctionエラーを確認する。
- 同じ原因の500系が週2回以上起きる、または原因をRuntime Logsの保持時間内に調査できない場合は、Sentry等の専用エラー監視導入を再検討する。

### アクセス解析

- Vercel Web Analyticsを使い、ページ閲覧数と参照元を集計する。
- `@vercel/analytics` v2の `Analytics` をRoot Layoutへ実装済み。Vercel DashboardでWeb Analyticsを有効にして再デプロイすると収集を開始する。
- カスタムイベントは使わない。メールアドレス、ハンドル、投稿本文、検索語、認証トークンをイベント値として送らない。
- `/verify-email` と `/reset-password` のURLにはトークンが含まれるため、robotsでクロールを拒否し、メタデータでも索引を禁止する。アクセス解析画面でこれらの動的パスにクエリ値が表示されていないことを公開直後に確認する。

## 確認指標

公開後1週間は毎日、以後は週1回、次を記録する。

- `/api/health` の稼働率と障害時間
- 500系応答とFunctionエラーの件数、原因、対応
- ページ閲覧数、上位の公開ページ、404相当の導線
- SupabaseのDB容量・接続数、VercelとWeb Analyticsの無料枠使用量
- 投稿・コメント・通報のレート制限エラーが正常利用を妨げていないか

個人単位の行動追跡や広告向けプロファイルは作らない。

## 障害時の流れ

1. 外形監視の通知から `/api/health` とトップページを再確認する。
2. Vercelの直近デプロイ状態、Runtime Logs、Supabaseの稼働状態を確認する。
3. DB障害なら書き込みを増やす操作を止め、復旧前にバックアップの有無を確認する。
4. 直前デプロイが原因なら、Vercel上で一つ前の検証済みDeploymentへ戻す。
5. データ破損が疑われる場合はProductionへ直接復元せず、最新バックアップを使い捨てDBへ復元して内容を確認する。
6. 復旧日時、影響範囲、原因、恒久対応を秘密情報を含めず運用記録へ残す。

## 公式資料

- [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime)
- [Vercel Observability](https://vercel.com/docs/observability)
- [Vercel Web Analytics Quickstart](https://vercel.com/docs/analytics/quickstart)
- [Vercel Web Analyticsのプライバシー](https://vercel.com/docs/analytics/privacy-policy)
- [UptimeRobot Free Plan](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan)
