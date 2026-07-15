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
  await registrationForm.getByRole("button", { name: "登録" }).click();
  await expect(page.getByRole("link", { name: "E2E利用者" })).toBeVisible();

  await page.goto("/terms/new");
  await page.getByLabel("横文字").fill("E2Eワード");
  await page.getByLabel("原語").fill("e2e word");
  await page.getByLabel("概要").fill("E2Eで修正提案の一連の動作を確認するための項目です。");
  await page.getByLabel("最初の意味").fill("最初の意味");
  await page.getByLabel("意味の説明").fill("承認前に表示される最初の説明文です。");
  await page.getByRole("button", { name: "項目を作成" }).click();
  await expect(page).toHaveURL(/\/terms\/e2e/);

  const editDetails = page.locator("details").filter({ has: page.getByText("意味の修正を提案", { exact: true }) }).first();
  await editDetails.locator("summary").click();
  await editDetails.getByLabel("説明").fill("編集者の承認後に表示される新しい説明文です。");
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
  await page.getByRole("link", { name: "変更履歴" }).click();
  const approvedRevision = page.locator(".timeline-item").filter({ has: page.getByRole("heading", { name: /修正提案を承認/ }) });
  await expect(approvedRevision).toBeVisible();
  await approvedRevision.getByText("この変更を差し戻す", { exact: true }).click();
  await approvedRevision.getByPlaceholder("差し戻し理由").fill("E2E検証のため元の説明へ戻す");
  await approvedRevision.getByRole("button", { name: "差し戻す" }).click();
  await expect(page.getByRole("heading", { name: /変更を差し戻し/ }).first()).toBeVisible();
  await page.getByRole("link", { name: "E2Eワードへ戻る" }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: "承認前に表示される最初の説明文です。" })).toBeVisible();
});

test("プロフィール変更と管理者の一時パスワード発行が機能する", async ({ page }) => {
  await page.goto("/login");
  const registrationForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "新規登録" }) });
  await registrationForm.getByLabel("表示名").fill("リセット対象者");
  await registrationForm.getByLabel("ハンドル").fill("reset-e2e-user");
  await registrationForm.getByLabel("メールアドレス").fill("reset-e2e@example.test");
  await registrationForm.getByLabel("パスワード").fill("reset-user-password");
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
  await registrationForm.getByRole("button", { name: "登録" }).click();
  await expect(page.getByRole("link", { name: "モデレーション対象者" })).toBeVisible();

  await page.goto("/terms/new");
  await page.getByLabel("横文字").fill("モデレーションE2E");
  await page.getByLabel("原語").fill("moderation e2e");
  await page.getByLabel("概要").fill("通報から非表示、却下、アカウント停止までを確認する項目です。");
  await page.getByLabel("最初の意味").fill("運用確認用の意味");
  await page.getByLabel("意味の説明").fill("編集者による通報処理を安全に確認するための説明です。");
  await page.getByLabel("訳語案", { exact: true }).fill("運用確認訳");
  await page.getByLabel("合う文脈").fill("公開前の運用確認");
  await page.getByLabel("元文").fill("モデレーションE2Eを確認します。");
  await page.getByLabel("言い換え").fill("運用確認を行います。");
  await page.getByRole("button", { name: "項目を作成" }).click();

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
