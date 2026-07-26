import { expect, test } from "@playwright/test";

test("検索とログインエラーを画面内で扱える", async ({ page }) => {
  await page.goto("/search?q=エンゲージメント");
  await expect(page.getByRole("heading", { name: "エンゲージメント" })).toBeVisible();

  await page.goto("/login");
  const loginForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await loginForm.getByLabel("メールアドレス").fill("nobody@example.test");
  await loginForm.getByLabel("パスワード").fill("incorrect-password");
  await loginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(loginForm.getByRole("alert")).toHaveText("メールアドレスまたはパスワードが正しくありません。");
  await expect(loginForm.getByLabel("メールアドレス")).toHaveValue("nobody@example.test");
});

test("利用者の修正提案を編集者が承認し、履歴へ残せる", async ({ page }) => {
  await page.goto("/login");
  const registrationForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "新規登録" }) });
  await registrationForm.getByLabel("表示名").fill("E2E利用者");
  await registrationForm.getByLabel("ハンドル").fill("e2e-user");
  await registrationForm.getByLabel("メールアドレス").fill("user-e2e@example.test");
  await registrationForm.getByLabel("パスワード").fill("user-e2e-password");
  await registrationForm.getByRole("checkbox").check();
  await registrationForm.getByRole("button", { name: "登録" }).click();
  await expect(page.getByRole("link", { name: "E2E利用者" })).toBeVisible();

  await page.goto("/terms/new");
  await page.getByLabel("取り上げる言葉（必須）").fill("E2Eワード");
  await page.getByLabel("元の外国語（任意）").fill("e2e word");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("最初の意味");
  await page.getByLabel("この使われ方の説明（必須）").fill("承認前に表示される最初の説明文です。");
  await page.getByLabel("タグ（複数可）").fill("修正前タグ");
  await page.getByRole("button", { name: "項目を作成" }).click();
  await expect(page).toHaveURL(/\/terms\/e2e/);

  const editDetails = page.locator("details").filter({ has: page.getByText("使われ方の修正を提案", { exact: true }) }).first();
  await editDetails.locator("summary").click();
  await editDetails.getByLabel("この使われ方の説明").fill("編集者の承認後に表示される新しい説明文です。");
  await editDetails.getByLabel("タグ（複数可）").fill("修正後タグ");
  await editDetails.getByLabel("修正理由").fill("説明をより具体的にするため");
  await editDetails.getByRole("button", { name: "修正を提案" }).click();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.goto("/login");
  const adminLogin = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await adminLogin.getByLabel("メールアドレス").fill("admin-e2e@example.test");
  await adminLogin.getByLabel("パスワード").fill("local-e2e-admin-password");
  await adminLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "管理", exact: true })).toBeVisible();

  await page.goto("/dashboard#suggestions");
  const suggestion = page.locator(".suggestion-item").filter({ hasText: "E2Eワード / 最初の意味" });
  await expect(suggestion).toContainText("説明をより具体的にするため");
  await suggestion.getByRole("button", { name: "処理する" }).click();
  await expect(suggestion).toHaveCount(0);

  await page.goto("/search?q=E2Eワード");
  await page.getByRole("link", { name: /E2Eワード/ }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: "編集者の承認後に表示される新しい説明文です。" })).toBeVisible();
  await expect(page.getByRole("link", { name: "修正後タグ", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "変更履歴" }).click();
  const approvedRevision = page.locator(".timeline-item").filter({ has: page.getByRole("heading", { name: /修正提案を承認/ }) });
  await expect(approvedRevision).toBeVisible();
  await approvedRevision.getByText("この変更を差し戻す", { exact: true }).click();
  await approvedRevision.getByPlaceholder("差し戻し理由").fill("E2E検証のため元の説明へ戻す");
  await approvedRevision.getByRole("button", { name: "差し戻す" }).click();
  await expect(page.getByRole("heading", { name: /変更を差し戻し/ }).first()).toBeVisible();
  await page.getByRole("link", { name: "E2Eワードへ戻る" }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: "承認前に表示される最初の説明文です。" })).toBeVisible();
  await expect(page.getByRole("link", { name: "修正前タグ", exact: true })).toBeVisible();
});

test("プロフィール変更と管理者の一時パスワード発行が機能する", async ({ page }) => {
  await page.goto("/login");
  const registrationForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "新規登録" }) });
  await registrationForm.getByLabel("表示名").fill("リセット対象者");
  await registrationForm.getByLabel("ハンドル").fill("reset-e2e-user");
  await registrationForm.getByLabel("メールアドレス").fill("reset-e2e@example.test");
  await registrationForm.getByLabel("パスワード").fill("reset-user-password");
  await registrationForm.getByRole("checkbox").check();
  await registrationForm.getByRole("button", { name: "登録" }).click();
  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.goto("/login");
  const loginForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await loginForm.getByLabel("メールアドレス").fill("admin-e2e@example.test");
  await loginForm.getByLabel("パスワード").fill("local-e2e-admin-password");
  await loginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "管理", exact: true })).toBeVisible();

  await page.goto("/admin?q=reset-e2e");
  const userCard = page.locator(".admin-user").filter({ hasText: "reset-e2e@example.test" });
  await userCard.getByText("一時パスワードを発行", { exact: true }).click();
  await userCard.getByPlaceholder("12文字以上の一時パスワード").fill("temporary-e2e-password");
  await userCard.getByRole("button", { name: "発行" }).click();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.goto("/login");
  const resetLogin = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await resetLogin.getByLabel("メールアドレス").fill("reset-e2e@example.test");
  await resetLogin.getByLabel("パスワード").fill("temporary-e2e-password");
  await resetLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/account\?passwordReset=1/);
  await expect(page.getByText(/一時パスワードでログイン/)).toBeVisible();

  const passwordForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "パスワード変更" }) });
  await passwordForm.getByLabel("現在のパスワード").fill("temporary-e2e-password");
  await passwordForm.getByLabel("新しいパスワード", { exact: true }).fill("permanent-e2e-password");
  await passwordForm.getByLabel("新しいパスワード（確認）").fill("permanent-e2e-password");
  await passwordForm.getByRole("button", { name: "パスワードを変更" }).click();
  await expect(page.getByText("パスワードを変更しました。")).toBeVisible();

  const profileForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "プロフィール" }) });
  await profileForm.getByLabel("表示名").fill("E2E利用者・更新");
  await profileForm.getByRole("button", { name: "プロフィールを保存" }).click();
  await expect(page.getByText("プロフィールを更新しました。")).toBeVisible();
});

test("通報の非表示・処理・却下とユーザー停止・解除を一巡できる", async ({ page }) => {
  await page.goto("/login");
  const registrationForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "新規登録" }) });
  await registrationForm.getByLabel("表示名").fill("モデレーション対象者");
  await registrationForm.getByLabel("ハンドル").fill("moderation-e2e-user");
  await registrationForm.getByLabel("メールアドレス").fill("moderation-e2e@example.test");
  await registrationForm.getByLabel("パスワード").fill("moderation-user-password");
  await registrationForm.getByRole("checkbox").check();
  await registrationForm.getByRole("button", { name: "登録" }).click();
  await expect(page.getByRole("link", { name: "モデレーション対象者" })).toBeVisible();

  await page.goto("/terms/new");
  await page.getByLabel("取り上げる言葉（必須）").fill("モデレーションE2E");
  await page.getByLabel("元の外国語（任意）").fill("moderation e2e");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("運用確認用の意味");
  await page.getByLabel("この使われ方の説明（必須）").fill("編集者による通報処理を安全に確認するための説明です。");
  await page.locator('select[name="domainId"]').selectOption({ label: "IT" });
  await page.getByLabel("タグ（複数可）").fill("運用確認、分類テスト");
  await page.getByLabel("日本語案（任意）").fill("運用確認訳");
  await page.getByLabel("よく合う場面（任意）").fill("公開前の運用確認");
  await page.getByLabel("元の言葉を使った文（任意）").fill("モデレーションE2Eを確認します。");
  await page.getByLabel("日本語案に言い換えた文（任意）").fill("運用確認を行います。");
  await page.getByRole("button", { name: "項目を作成" }).click();
  await expect(page.getByRole("link", { name: "IT", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "運用確認", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "分類テスト", exact: true })).toBeVisible();

  const proposalCard = page.locator(".proposal-card").filter({ hasText: "運用確認訳" });
  const proposalReport = proposalCard.locator(":scope > details.report-details");
  await proposalReport.locator("summary").click();
  await proposalReport.getByLabel("通報理由").selectOption("other");
  await proposalReport.getByPlaceholder("補足").fill("非表示と処理済みの確認用");
  await proposalReport.getByRole("button", { name: "送信" }).click();
  await expect(proposalReport).not.toHaveAttribute("open", "");

  await proposalReport.locator("summary").click();
  await proposalReport.getByLabel("通報理由").selectOption("other");
  await proposalReport.getByPlaceholder("補足").fill("却下の確認用");
  await proposalReport.getByRole("button", { name: "送信" }).click();
  await expect(proposalReport).not.toHaveAttribute("open", "");

  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.goto("/login");
  const adminLogin = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await adminLogin.getByLabel("メールアドレス").fill("admin-e2e@example.test");
  await adminLogin.getByLabel("パスワード").fill("local-e2e-admin-password");
  await adminLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "管理", exact: true })).toBeVisible();

  await page.goto("/dashboard");
  const resolvedReport = page.locator(".report-item").filter({ hasText: "非表示と処理済みの確認用" });
  await resolvedReport.getByRole("button", { name: "非表示" }).click();
  await expect(page.locator(".report-item").filter({ hasText: "非表示と処理済みの確認用" })).toBeVisible();
  await page.locator(".report-item").filter({ hasText: "非表示と処理済みの確認用" }).getByRole("button", { name: "処理済み" }).click();
  await expect(page.locator(".report-item").filter({ hasText: "非表示と処理済みの確認用" })).toHaveCount(0);

  const dismissedReport = page.locator(".report-item").filter({ hasText: "却下の確認用" });
  await dismissedReport.getByRole("button", { name: "却下" }).click();
  await expect(page.locator(".report-item").filter({ hasText: "却下の確認用" })).toHaveCount(0);

  await page.goto("/admin?q=moderation-e2e");
  const userCard = page.locator(".admin-user").filter({ hasText: "moderation-e2e@example.test" });
  await userCard.getByRole("button", { name: "停止", exact: true }).click();
  await expect(userCard).toContainText("停止中:");

  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.goto("/login");
  const suspendedLogin = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await suspendedLogin.getByLabel("メールアドレス").fill("moderation-e2e@example.test");
  await suspendedLogin.getByLabel("パスワード").fill("moderation-user-password");
  await suspendedLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(suspendedLogin.getByRole("alert")).toHaveText("このアカウントは停止されています。");

  await page.goto("/login");
  const unlockAdminLogin = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await unlockAdminLogin.getByLabel("メールアドレス").fill("admin-e2e@example.test");
  await unlockAdminLogin.getByLabel("パスワード").fill("local-e2e-admin-password");
  await unlockAdminLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "管理", exact: true })).toBeVisible();
  await page.goto("/admin?q=moderation-e2e");
  const suspendedUserCard = page.locator(".admin-user").filter({ hasText: "moderation-e2e@example.test" });
  await suspendedUserCard.getByRole("button", { name: "停止解除" }).click();
  await expect(suspendedUserCard).not.toContainText("停止中:");

  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.goto("/login");
  const restoredLogin = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await restoredLogin.getByLabel("メールアドレス").fill("moderation-e2e@example.test");
  await restoredLogin.getByLabel("パスワード").fill("moderation-user-password");
  await restoredLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "モデレーション対象者" })).toBeVisible();
});

test("改変された項目・意味・訳語案IDの組み合わせを拒否する", async ({ page }) => {
  await page.goto("/login");
  const loginForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await loginForm.getByLabel("メールアドレス").fill("admin-e2e@example.test");
  await loginForm.getByLabel("パスワード").fill("local-e2e-admin-password");
  await loginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "管理", exact: true })).toBeVisible();

  await page.goto("/terms/new");
  await page.getByLabel("取り上げる言葉（必須）").fill("関連検証A");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("検証対象の意味");
  await page.getByLabel("この使われ方の説明（必須）").fill("使用例の関連先が一致することを検証します。");
  await page.getByLabel("日本語案（任意）").fill("関連検証訳");
  await page.getByLabel("よく合う場面（任意）").fill("関連性の検証");
  await page.getByRole("button", { name: "項目を作成" }).click();
  await expect(page.locator(".proposal-card").filter({ hasText: "関連検証訳" })).toBeVisible();
  const firstTermUrl = page.url();

  await page.goto("/terms/new");
  await page.getByLabel("取り上げる言葉（必須）").fill("関連検証B");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("別項目の意味");
  await page.getByLabel("この使われ方の説明（必須）").fill("最初の項目とは関連しない別の説明です。");
  await page.getByRole("button", { name: "項目を作成" }).click();
  await expect(page.getByRole("heading", { name: "関連検証B", exact: true })).toBeVisible();
  const secondTermId = await page.locator('input[name="termId"]').first().inputValue();

  await page.goto(firstTermUrl);
  const proposalCard = page.locator(".proposal-card").filter({ hasText: "関連検証訳" });
  await expect(proposalCard).toBeVisible();
  await proposalCard.locator("summary").filter({ hasText: "使用例を追加" }).click();
  const exampleForm = proposalCard.locator("form.example-form");
  await expect(exampleForm).toBeVisible();
  await exampleForm.locator('input[name="termId"]').evaluate((input, termId) => {
    (input as HTMLInputElement).value = termId;
  }, secondTermId);
  await exampleForm.getByLabel("元文").fill("関連検証Aの使用例です。");
  await exampleForm.getByLabel("言い換え").fill("不整合な関連は保存しません。");
  await exampleForm.getByRole("button", { name: "使用例を追加" }).click();
  await expect(exampleForm.getByRole("alert")).toHaveText(
    "投稿対象の組み合わせが正しくありません。画面を再読み込みしてください。",
  );
});

test("同一アカウントへのログイン総当たりを制限する", async ({ page }) => {
  await page.goto("/login");
  const loginForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await loginForm.getByLabel("メールアドレス").fill("throttled-e2e@example.test");
    await loginForm.getByLabel("パスワード").fill("incorrect-password");
    const responsePromise = page.waitForResponse((response) => response.request().method() === "POST");
    await loginForm.getByRole("button", { name: "ログイン" }).click();
    await responsePromise;
    await expect(loginForm.getByRole("alert")).toHaveText("メールアドレスまたはパスワードが正しくありません。");
  }

  await loginForm.getByLabel("メールアドレス").fill("throttled-e2e@example.test");
  await loginForm.getByLabel("パスワード").fill("incorrect-password");
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST");
  await loginForm.getByRole("button", { name: "ログイン" }).click();
  await responsePromise;
  await expect(loginForm.getByRole("alert")).toHaveText(
    "ログイン試行が多すぎます。15分ほど時間をおいてください。",
  );
});
