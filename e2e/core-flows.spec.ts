import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const e2eMailboxHeaders = { "x-e2e-mailbox-secret": "reiwa-e2e-mailbox-secret" };

async function latestTestEmailUrl(
  page: Page,
  email: string,
  kind: "email-verification" | "password-reset",
) {
  const response = await page.request.get(
    `/api/test-mail?to=${encodeURIComponent(email)}&kind=${kind}`,
    { headers: e2eMailboxHeaders },
  );
  expect(response.status()).toBe(200);
  const body = await response.json() as { email: { resetUrl?: string } | null };
  return body.email?.resetUrl ?? "";
}

async function verifyRegisteredEmail(page: Page, email: string) {
  const verificationUrl = await latestTestEmailUrl(page, email, "email-verification");
  expect(verificationUrl).toContain("/verify-email?token=");
  await page.goto(verificationUrl);
  await page.getByRole("button", { name: "メールアドレスを確認" }).click();
  await expect(page).toHaveURL(/\/account\?emailVerified=1/);
}

test("分野とタグの分類ルールを公開ページで確認できる", async ({ page }) => {
  await page.goto("/rules");
  await page.getByRole("link", { name: "分野・タグの分類ルール" }).click();
  await expect(page).toHaveURL(/\/rules\/classification$/);
  await expect(page.getByRole("heading", { name: "分野・タグの分類ルール" })).toBeVisible();
  await expect(page.locator(".domain-rule-grid > div")).toHaveCount(8);
  await expect(page.locator(".tag-rule-grid > div")).toHaveCount(8);
  await expect(page.getByText("「教育」「日常」も選択肢として残します")).toBeVisible();
  await expect(page.getByRole("heading", { name: "追加・整理の運用" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const domainCards = page.locator(".domain-rule-grid > div");
  const mobileBoxes = await domainCards.evaluateAll((cards) =>
    cards.slice(0, 2).map((card) => {
      const box = card.getBoundingClientRect();
      return { x: box.x, y: box.y };
    }),
  );
  expect(mobileBoxes[0]?.x).toBe(mobileBoxes[1]?.x);
  expect(mobileBoxes[1]?.y).toBeGreaterThan(mobileBoxes[0]?.y ?? 0);
});

test("公開権限表で編集者と管理者の操作境界を確認できる", async ({ page }) => {
  await page.goto("/rules");
  await page.getByRole("link", { name: "役割と権限" }).click();
  await expect(page).toHaveURL(/\/rules\/permissions$/);
  await expect(page.getByRole("heading", { name: "役割と権限" })).toBeVisible();
  await expect(page.locator(".permission-table tbody tr")).toHaveCount(12);
  await expect(page.getByRole("columnheader", { name: "閲覧者" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "信頼ユーザー" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "編集者" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "管理者" })).toBeVisible();

  const moderationRow = page.getByRole("row").filter({ hasText: "通報処理・非公開・復元を行う" });
  await expect(moderationRow.locator("td.allowed")).toHaveCount(2);
  await expect(moderationRow.locator("td.denied")).toHaveCount(3);
  const userManagementRow = page.getByRole("row").filter({ hasText: "ロール変更・利用停止・解除" });
  await expect(userManagementRow.locator("td.allowed")).toHaveCount(1);
  await expect(userManagementRow.locator("td.denied")).toHaveCount(4);

  await page.setViewportSize({ width: 390, height: 844 });
  const documentOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(documentOverflow).toBeLessThanOrEqual(1);
  const tableScroll = await page.locator(".permission-table-wrap").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(tableScroll.scrollWidth).toBeGreaterThan(tableScroll.clientWidth);
});

test("トップページで新着の日本語案を主役として見られる", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {
    name: "新しい概念を、日本語で考えられる言葉へ。",
  })).toBeVisible();
  await expect(page.getByRole("link", { name: "活動理念を読む" })).toHaveAttribute("href", "/vision");
  await expect(page.getByRole("heading", { name: "新着の日本語案" })).toBeVisible();

  const proposalCards = page.locator(".recent-proposal-card");
  await expect(proposalCards).toHaveCount(6);
  const firstCard = proposalCards.first();
  await expect(firstCard.locator("h3")).not.toBeEmpty();
  await expect(firstCard).toContainText("合う場面");
  await expect(firstCard).toContainText(/評価 \d+人/);
  await expect(firstCard).toContainText(/使用例 \d+件/);
  await expect(firstCard).toHaveAttribute("href", /\/terms\/.+#proposal-/);

  const headingSizes = await firstCard.evaluate((card) => ({
    proposal: Number.parseFloat(getComputedStyle(card.querySelector("h3")!).fontSize),
    term: Number.parseFloat(getComputedStyle(card.querySelector(".recent-proposal-source strong")!).fontSize),
  }));
  expect(headingSizes.proposal).toBeGreaterThan(headingSizes.term);

  const desktopBoxes = await proposalCards.evaluateAll((cards) =>
    cards.slice(0, 2).map((card) => {
      const box = card.getBoundingClientRect();
      return { x: box.x, y: box.y };
    }),
  );
  expect(desktopBoxes[0]?.x).not.toBe(desktopBoxes[1]?.x);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBoxes = await proposalCards.evaluateAll((cards) =>
    cards.slice(0, 2).map((card) => {
      const box = card.getBoundingClientRect();
      return { x: box.x, y: box.y };
    }),
  );
  expect(mobileBoxes[0]?.x).toBe(mobileBoxes[1]?.x);
  expect(mobileBoxes[1]?.y).toBeGreaterThan(mobileBoxes[0]?.y ?? 0);
});

test("活動理念から造語の原則と参加方法を確認できる", async ({ page }) => {
  await page.goto("/vision");

  await expect(page.getByRole("heading", {
    name: /新しい概念を、.*日本語で考えられる言葉へ。/,
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "言い換え辞書ではなく、公開造語活動です。",
  })).toBeVisible();
  await expect(page.locator(".vision-principles article")).toHaveCount(6);
  await expect(page.locator(".vision-process li")).toHaveCount(5);
  await expect(page.getByText("外来語を排除しません")).toBeVisible();
  await expect(page.getByRole("link", { name: "最初の一語を提案" })).toHaveAttribute("href", "/terms/new");

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("マイページで自分の投稿・コメント・評価を種類別にたどれる", async ({ page }) => {
  await page.goto("/login");
  const writerLoginForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await writerLoginForm.getByLabel("メールアドレス").fill("writer@example.com");
  await writerLoginForm.getByLabel("パスワード").fill("change-me-writer-password");
  await writerLoginForm.getByRole("button", { name: "ログイン" }).click();
  await page.getByRole("link", { name: "提案者", exact: true }).click();

  await expect(page).toHaveURL(/\/my$/);
  await expect(page.getByRole("heading", { name: "提案者さんの活動" })).toBeVisible();
  await expect(page.getByRole("link", { name: /投稿 490/ })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".activity-item")).toHaveCount(12);
  await expect(page.getByText("1 / 41ページ")).toBeVisible();
  await page.getByRole("link", { name: "次へ" }).click();
  await expect(page).toHaveURL(/type=posts&page=2/);
  await expect(page.locator(".activity-item")).toHaveCount(12);

  await page.getByRole("link", { name: /コメント 1/ }).click();
  await expect(page).toHaveURL(/type=comments/);
  await expect(page.getByText("SNSの数字を見る場面では自然だが、人事の話では意味が狭くなりすぎる。"))
    .toBeVisible();
  await expect(page.locator(".activity-item")).toHaveCount(1);
  await page.getByRole("button", { name: "ログアウト" }).click();

  await page.goto("/login");
  const editorLoginForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await editorLoginForm.getByLabel("メールアドレス").fill("editor@example.com");
  await editorLoginForm.getByLabel("パスワード").fill("change-me-editor-password");
  await editorLoginForm.getByRole("button", { name: "ログイン" }).click();
  await page.getByRole("link", { name: "編集者", exact: true }).click();
  await page.getByRole("link", { name: /評価 245/ }).click();

  await expect(page).toHaveURL(/type=evaluations/);
  await expect(page.locator(".activity-item")).toHaveCount(12);
  await expect(page.locator(".activity-item-head span").first()).toHaveText("評価");
  await expect(page.getByText("1 / 21ページ")).toBeVisible();
  await expect(page.getByRole("link", { name: "アカウント設定" })).toHaveAttribute("href", "/account");

  await page.setViewportSize({ width: 390, height: 844 });
  const summaryBoxes = await page.locator(".my-activity-summary > div").evaluateAll((cards) =>
    cards.slice(0, 2).map((card) => {
      const box = card.getBoundingClientRect();
      return { x: box.x, y: box.y };
    }),
  );
  expect(summaryBoxes[0]?.x).toBe(summaryBoxes[1]?.x);
  expect(summaryBoxes[1]?.y).toBeGreaterThan(summaryBoxes[0]?.y ?? 0);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test("詳細ページで日本語案と使い分けを比較できる", async ({ page }) => {
  await page.goto("/terms/engagement");

  await expect(page.getByRole("heading", { name: "編集部の推奨日本語案" })).toBeVisible();

  const firstSense = page.locator(".sense-section").filter({
    has: page.getByRole("heading", { name: "反応や関与の度合い", exact: true }),
  });
  await expect(firstSense.getByRole("heading", { name: "2案を比較", exact: true })).toBeVisible();

  const reactionCard = firstSense.locator(".proposal-card").filter({
    has: page.getByRole("heading", { name: "反応度", exact: true }),
  });
  await expect(reactionCard.getByRole("heading", { name: "合う場面", exact: true })).toBeVisible();
  await expect(reactionCard).toContainText("SNS投稿、広告、配信施策の分析");
  await expect(reactionCard).toContainText("投稿への反応度を分析する。");
  await expect(reactionCard.locator(".label-chip.active")).toHaveCount(4);
  await expect(reactionCard.locator(".proposal-discussion")).not.toHaveAttribute("open", "");

  const desktopCards = firstSense.locator(".proposal-card");
  await expect(desktopCards).toHaveCount(2);
  const desktopBoxes = await desktopCards.evaluateAll((cards) =>
    cards.map((card) => {
      const box = card.getBoundingClientRect();
      return { x: box.x, y: box.y };
    }),
  );
  expect(desktopBoxes[0]?.x).not.toBe(desktopBoxes[1]?.x);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBoxes = await desktopCards.evaluateAll((cards) =>
    cards.map((card) => {
      const box = card.getBoundingClientRect();
      return { x: box.x, y: box.y };
    }),
  );
  expect(mobileBoxes[0]?.x).toBe(mobileBoxes[1]?.x);
  expect(mobileBoxes[1]?.y).toBeGreaterThan(mobileBoxes[0]?.y ?? 0);
});

test("編集者が評価結果を比較しながら推奨する日本語案を決められる", async ({ page }) => {
  await page.goto("/login");
  const loginForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "ログイン", exact: true }) });
  await loginForm.getByLabel("メールアドレス").fill("admin-e2e@example.test");
  await loginForm.getByLabel("パスワード").fill("local-e2e-admin-password");
  await loginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "管理", exact: true })).toBeVisible();

  await page.goto("/terms/engagement");
  const workbench = page.locator(".recommendation-workbench").first();
  await expect(workbench.getByRole("heading", { name: "推奨する日本語案を比較・決定" })).toBeVisible();
  await expect(workbench).toContainText("有力だが、追加の評価や確認が必要");

  const reactionOption = workbench.locator(".recommendation-option").filter({
    has: page.getByRole("heading", { name: "反応度", exact: true }),
  });
  const involvementOption = workbench.locator(".recommendation-option").filter({
    has: page.getByRole("heading", { name: "関与度", exact: true }),
  });
  await expect(reactionOption).toContainText("SNS投稿、広告、配信施策の分析");
  await expect(reactionOption).toContainText("自然 1");
  await expect(involvementOption).toContainText("利用者の行動を広めに含めたい分析資料");
  await expect(involvementOption).toContainText("堅い 1");

  const decision = involvementOption.locator("details.recommendation-decision");
  await decision.locator("summary").click();
  await decision.getByLabel("推奨レベル").selectOption("limited");
  await decision.getByLabel("推奨する場面").fill("利用者の関わりを広く扱う分析資料");
  await decision.getByLabel("判断根拠").fill("反応だけでなく、継続的な関わりまで含めたい場合に適しているため。");
  await decision.getByRole("button", { name: "この案の推奨内容を保存" }).click();

  const updatedWorkbench = page.locator(".recommendation-workbench").first();
  const updatedOption = updatedWorkbench.locator(".recommendation-option").filter({
    has: page.getByRole("heading", { name: "関与度", exact: true }),
  });
  await expect(updatedOption.locator(".status-badge")).toHaveText("限定推奨");
  const recommendationTile = page.locator(".recommendation-tile.level-limited").filter({ hasText: "関与度" });
  await expect(recommendationTile).toContainText("利用者の関わりを広く扱う分析資料");
  await expect(recommendationTile).toContainText("継続的な関わりまで含めたい場合");

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "比較して決める" }).first()).toBeVisible();
});

test("日本語案の新規・追加・編集フォームが同じ項目でつながる", async ({ page }) => {
  await page.goto("/login");
  const registrationForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "新規登録" }) });
  await registrationForm.getByLabel("表示名").fill("フォーム確認利用者");
  await registrationForm.getByLabel("ハンドル").fill("proposal-form-user");
  await registrationForm.getByLabel("メールアドレス").fill("proposal-form@example.test");
  await registrationForm.getByLabel("パスワード").fill("proposal-form-password");
  await registrationForm.getByRole("checkbox").check();
  await registrationForm.getByRole("button", { name: "登録" }).click();
  await expect(page.getByRole("link", { name: "フォーム確認利用者" })).toBeVisible();
  await verifyRegisteredEmail(page, "proposal-form@example.test");

  await page.goto("/terms/new");
  await page.getByLabel("取り上げる言葉（必須）").fill("フォーム統一語");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("フォームを比較する使われ方");
  await page.getByLabel("この使われ方の説明（必須）").fill("日本語案フォームの項目が統一されているか確認する説明です。");
  await page.getByLabel("日本語案（必須）").fill("統一された案");
  await page.getByLabel("よく合う場面（必須）").fill("新規投稿の確認");
  await page.getByLabel("この案を選んだ理由（任意）").fill("フォーム項目を一貫させられるため。");
  await page.getByLabel("避けたい場面（任意）").fill("別の意味で使う場面");
  await page.getByLabel("良い点（任意）").fill("入力方法が分かりやすい");
  await page.getByLabel("弱い点（任意）").fill("補足が必要");
  await page.getByLabel("元の言葉を使った文").fill("フォーム統一語を確認する。");
  await page.getByLabel("日本語案に言い換えた文").fill("統一された案を確認する。");
  await page.getByLabel("例文が使われる場面（任意）").fill("E2Eテスト");
  await page.getByRole("button", { name: "この日本語案を投稿" }).click();

  const initialCard = page.locator(".proposal-card").filter({ hasText: "統一された案" });
  await expect(initialCard).toContainText("新規投稿の確認");
  await expect(initialCard).toContainText("別の意味で使う場面");
  await expect(initialCard).toContainText("入力方法が分かりやすい");
  await expect(initialCard).toContainText("補足が必要");
  await expect(initialCard).toContainText("統一された案を確認する。");

  const addDetails = page.locator("details.section-details").filter({
    has: page.getByText("日本語案を追加", { exact: true }),
  });
  await addDetails.locator("summary").click();
  await addDetails.getByLabel("日本語案（必須）").fill("追加した案");
  await addDetails.getByLabel("よく合う場面（必須）").fill("追加投稿の確認");
  await addDetails.getByLabel("この案を選んだ理由（任意）").fill("新規投稿と同じ項目を使えるため。");
  await addDetails.getByLabel("避けたい場面（任意）").fill("短い会話");
  await addDetails.getByLabel("良い点（任意）").fill("比較しやすい");
  await addDetails.getByLabel("弱い点（任意）").fill("少し長い");
  await addDetails.getByLabel("元の言葉を使った文").fill("追加前のフォーム統一語です。");
  await addDetails.getByLabel("日本語案に言い換えた文").fill("追加した案です。");
  await addDetails.getByLabel("例文が使われる場面（任意）").fill("追加フォーム");
  await addDetails.getByRole("button", { name: "この日本語案を投稿" }).click();

  const addedCard = page.locator(".proposal-card").filter({ hasText: "追加した案" });
  await expect(addedCard).toContainText("追加投稿の確認");
  await expect(addedCard).toContainText("短い会話");
  await expect(addedCard).toContainText("比較しやすい");
  await expect(addedCard).toContainText("少し長い");

  const evaluationDetails = addedCard.locator("details.evaluation-details");
  await evaluationDetails.locator("summary").click();
  await expect(evaluationDetails.getByRole("group", { name: "良いところ" })).toBeVisible();
  await expect(evaluationDetails.getByRole("group", { name: "注意点" })).toBeVisible();
  await expect(evaluationDetails.getByText("文章の中で不自然さなく使える")).toBeVisible();
  await evaluationDetails.getByRole("checkbox", { name: /自然/ }).check();
  await evaluationDetails.getByRole("checkbox", { name: /意味がずれる/ }).check();
  await evaluationDetails.getByRole("button", { name: "選んだ評価を保存" }).click();
  await expect(addedCard.locator(".proposal-evaluation-snapshot")).toContainText("評価 1人");
  await expect(addedCard.locator(".proposal-evaluation-snapshot")).toContainText("自然 1");
  await expect(addedCard.locator(".proposal-evaluation-snapshot")).toContainText("意味がずれる 1");

  await evaluationDetails.locator("summary").click();
  await evaluationDetails.getByRole("checkbox", { name: /自然/ }).uncheck();
  await evaluationDetails.getByRole("checkbox", { name: /意味がずれる/ }).uncheck();
  await evaluationDetails.getByRole("button", { name: "選んだ評価を保存" }).click();
  await expect(addedCard.locator(".proposal-evaluation-snapshot")).toContainText("評価はまだありません");

  const editDetails = addedCard.locator("details.edit-details").filter({
    has: page.getByText("日本語案の修正を提案", { exact: true }),
  });
  await editDetails.locator("summary").click();
  await expect(editDetails.getByLabel("日本語案（必須）")).toHaveValue("追加した案");
  await expect(editDetails.getByLabel("よく合う場面（必須）")).toHaveValue("追加投稿の確認");
  await expect(editDetails.getByLabel("この案を選んだ理由（任意）")).toHaveValue("新規投稿と同じ項目を使えるため。");
  await expect(editDetails.getByLabel("避けたい場面（任意）")).toHaveValue("短い会話");
  await expect(editDetails.getByLabel("良い点（任意）")).toHaveValue("比較しやすい");
  await expect(editDetails.getByLabel("弱い点（任意）")).toHaveValue("少し長い");
});

test("検索とログインエラーを画面内で扱える", async ({ page }) => {
  await page.goto("/search?q=エンゲージメント");
  await expect(page.getByRole("heading", { name: "エンゲージメント" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "反応度", exact: true })).toBeVisible();
  await expect(page.locator(".search-proposal-hit").first()).toContainText("合う場面");

  const searchForm = page.locator("form.advanced-search");
  await searchForm.getByLabel("検索語").fill("反応度");
  await searchForm.getByLabel("検索対象").selectOption("proposals");
  await searchForm.getByLabel("分野").selectOption("sns");
  await searchForm.getByLabel("タグ").selectOption({ label: "分析" });
  await searchForm.getByLabel("並び順").selectOption("evaluation");
  await searchForm.getByRole("button", { name: "検索" }).click();
  await expect(page).toHaveURL(/scope=proposals/);
  await expect(page).toHaveURL(/domain=sns/);
  await expect(page).toHaveURL(/sort=evaluation/);
  const proposalResult = page.locator(".search-proposal-hit").filter({
    has: page.getByRole("heading", { name: "反応度", exact: true }),
  });
  await expect(proposalResult).toContainText("SNS投稿、広告、配信施策の分析");
  await expect(proposalResult).toContainText("評価 1人");
  await expect(page.locator(".search-proposal-hit")).toHaveCount(1);

  await searchForm.getByLabel("検索語").fill("");
  await searchForm.getByLabel("検索対象").selectOption("all");
  await searchForm.getByLabel("分野").selectOption("hr");
  await searchForm.getByLabel("タグ").selectOption("");
  await searchForm.getByLabel("並び順").selectOption("newest");
  await searchForm.getByRole("button", { name: "検索" }).click();
  await expect(page).toHaveURL(/domain=hr/);
  await expect(page.getByRole("heading", { name: "働きがい", exact: true })).toBeVisible();

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
  await verifyRegisteredEmail(page, "user-e2e@example.test");

  await page.goto("/terms/new");
  await page.getByLabel("取り上げる言葉（必須）").fill("E2Eワード");
  await page.getByLabel("元の外国語（任意）").fill("e2e word");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("最初の意味");
  await page.getByLabel("この使われ方の説明（必須）").fill("承認前に表示される最初の説明文です。");
  await page.getByLabel("タグ（複数可）").fill("修正前タグ");
  await page.getByLabel("日本語案（必須）").fill("E2E日本語案");
  await page.getByLabel("よく合う場面（必須）").fill("修正提案の検証");
  await page.getByRole("button", { name: "この日本語案を投稿" }).click();
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
  await expect(approvedRevision).toContainText("使われ方: 最初の意味");
  await expect(approvedRevision).toContainText("説明");
  await expect(approvedRevision).toContainText("タグ");
  await expect(approvedRevision).not.toContainText("description");
  await expect(approvedRevision).not.toContainText("domainId");
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

test("通報の非公開・処理・却下とユーザー停止・解除を一巡できる", async ({ page }) => {
  await page.goto("/login");
  const registrationForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "新規登録" }) });
  await registrationForm.getByLabel("表示名").fill("モデレーション対象者");
  await registrationForm.getByLabel("ハンドル").fill("moderation-e2e-user");
  await registrationForm.getByLabel("メールアドレス").fill("moderation-e2e@example.test");
  await registrationForm.getByLabel("パスワード").fill("moderation-user-password");
  await registrationForm.getByRole("checkbox").check();
  await registrationForm.getByRole("button", { name: "登録" }).click();
  await expect(page.getByRole("link", { name: "モデレーション対象者" })).toBeVisible();
  await verifyRegisteredEmail(page, "moderation-e2e@example.test");

  await page.goto("/terms/new");
  await expect(page.getByRole("link", { name: "分類ルールを見る" })).toBeVisible();
  await page.getByLabel("取り上げる言葉（必須）").fill("モデレーションE2E");
  await page.getByLabel("元の外国語（任意）").fill("moderation e2e");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("運用確認用の意味");
  await page.getByLabel("この使われ方の説明（必須）").fill("編集者による通報処理を安全に確認するための説明です。");
  await page.locator('select[name="domainId"]').selectOption({ label: "IT" });
  await page.getByLabel("タグ（複数可）").fill("運用確認、分類テスト");
  await page.getByLabel("日本語案（必須）").fill("運用確認訳");
  await page.getByLabel("よく合う場面（必須）").fill("公開前の運用確認");
  await page.getByLabel("元の言葉を使った文").fill("モデレーションE2Eを確認します。");
  await page.getByLabel("日本語案に言い換えた文").fill("運用確認を行います。");
  await page.getByRole("button", { name: "この日本語案を投稿" }).click();
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
  await expect(resolvedReport).toContainText("日本語案の現在内容");
  await expect(resolvedReport).toContainText("運用確認訳");
  await expect(resolvedReport).toContainText("投稿者: モデレーション対象者");
  await expect(resolvedReport).toContainText("公開中");
  await expect(resolvedReport).toContainText("日本語案を公開画面から隠す。通報は閉じない。");
  await expect(resolvedReport).toContainText("必要な確認・対応を終えて閉じ、通報者へ通知する。");
  await resolvedReport.getByRole("button", { name: "非公開" }).click();
  await expect(page.getByText("投稿を公開画面から非公開にし、理由と実行者を履歴へ記録しました。")).toBeVisible();
  await expect(page.locator(".report-item").filter({ hasText: "非表示と処理済みの確認用" })).toBeVisible();
  await expect(page.locator(".report-item").filter({ hasText: "非表示と処理済みの確認用" })).toContainText("非公開済み");
  await page.locator(".report-item").filter({ hasText: "非表示と処理済みの確認用" }).getByRole("button", { name: "処理済み" }).click();
  await expect(page.locator(".report-item").filter({ hasText: "非表示と処理済みの確認用" })).toHaveCount(0);
  await expect(page.getByText("通報を対応済みとして閉じ、通報者へ処理結果を通知しました。")).toBeVisible();

  const dismissedReport = page.locator(".report-item").filter({ hasText: "却下の確認用" });
  await dismissedReport.getByRole("button", { name: "却下" }).click();
  await expect(page.locator(".report-item").filter({ hasText: "却下の確認用" })).toHaveCount(0);
  await expect(page.getByText("通報を対応なしで閉じ、通報者へ処理結果を通知しました。")).toBeVisible();

  const hiddenProposal = page.locator(".hidden-content-item").filter({ hasText: "運用確認訳" });
  await expect(hiddenProposal).toContainText("通報対応: その他");
  await expect(hiddenProposal).toContainText("管理者");
  await hiddenProposal.getByLabel("復元理由").fill("通報内容を確認し、公開できると判断しました。");
  await hiddenProposal.getByRole("button", { name: "公開状態へ復元" }).click();
  await expect(page.getByText("投稿を復元し、公開状態へ戻しました。")).toBeVisible();
  await expect(page.locator(".hidden-content-item").filter({ hasText: "運用確認訳" })).toHaveCount(0);

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

test("項目・使用例・コメントを非公開にし、理由を確認して復元できる", async ({ page, browser }) => {
  const moderationTermPath = `/terms/${encodeURIComponent("モデレーションe2e")}`;
  await page.goto("/login");
  const contributorLogin = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await contributorLogin.getByLabel("メールアドレス").fill("reader@example.com");
  await contributorLogin.getByLabel("パスワード").fill("change-me-reader-password");
  await contributorLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "読者", exact: true })).toBeVisible();
  await page.goto(moderationTermPath);

  const proposalCard = page.locator(".proposal-card").filter({ hasText: "運用確認訳" });
  await proposalCard.locator(".proposal-discussion > summary").click();
  await proposalCard.getByPlaceholder("論点や代案を記入").fill("非公開復元E2Eコメント");
  await proposalCard.getByRole("button", { name: "コメントを投稿" }).click();
  const newComment = proposalCard.locator(".comment").filter({ hasText: "非公開復元E2Eコメント" });
  const commentElementId = await newComment.getAttribute("id");
  expect(commentElementId).toMatch(/^comment-/);
  const commentId = commentElementId!.replace(/^comment-/, "");

  const example = proposalCard.locator(".example-block").filter({ hasText: "運用確認を行います。" });
  const exampleId = await example.locator('input[name="exampleId"]').inputValue();
  const termId = await page.locator('input[name="termId"]').first().inputValue();

  execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      `INSERT INTO Report (id, targetType, targetId, reason, detail, status, createdById, createdAt) VALUES
       ('visibility-example-report', 'example', '${exampleId}', 'other', '使用例の非公開復元確認', 'open',
        (SELECT id FROM User WHERE email = 'reader@example.com'), CURRENT_TIMESTAMP),
       ('visibility-comment-report', 'comment', '${commentId}', 'other', 'コメントの非公開復元確認', 'open',
        (SELECT id FROM User WHERE email = 'reader@example.com'), CURRENT_TIMESTAMP),
       ('visibility-term-report', 'term', '${termId}', 'other', '項目の非公開復元確認', 'open',
        (SELECT id FROM User WHERE email = 'reader@example.com'), CURRENT_TIMESTAMP)`,
    ],
  );

  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.goto("/login");
  const adminLogin = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await adminLogin.getByLabel("メールアドレス").fill("editor@example.com");
  await adminLogin.getByLabel("パスワード").fill("change-me-editor-password");
  await adminLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "編集者", exact: true })).toBeVisible();
  await page.goto("/dashboard");

  for (const detail of [
    "使用例の非公開復元確認",
    "コメントの非公開復元確認",
    "項目の非公開復元確認",
  ]) {
    const report = page.locator(".report-item").filter({ hasText: detail });
    await expect(report).toBeVisible();
    await report.getByRole("button", { name: "非公開" }).click();
    await expect(page.getByText("投稿を公開画面から非公開にし、理由と実行者を履歴へ記録しました。"))
      .toBeVisible();
    const hiddenReport = page.locator(".report-item").filter({ hasText: detail });
    await expect(hiddenReport).toContainText("非公開済み");
    await hiddenReport.getByRole("button", { name: "処理済み" }).click();
  }

  await expect(page.locator(".hidden-content-item")).toHaveCount(3);
  const hiddenTerm = page.locator(".hidden-content-item")
    .filter({ has: page.locator(".hidden-content-head span", { hasText: "項目" }) })
    .filter({ hasText: "モデレーションE2E" });
  await expect(hiddenTerm).toContainText("通報対応: その他");
  await expect(hiddenTerm).toContainText("編集者");

  const baseURL = new URL(page.url()).origin;
  const hiddenContext = await browser.newContext({ baseURL });
  const hiddenPage = await hiddenContext.newPage();
  const hiddenTermResponse = await hiddenPage.goto(moderationTermPath);
  expect(hiddenTermResponse?.status()).toBe(404);
  await hiddenContext.close();

  await page.goto("/dashboard#hidden-content");
  await hiddenTerm.getByLabel("復元理由").fill("項目の内容を確認し、公開できると判断しました。");
  await hiddenTerm.getByRole("button", { name: "公開状態へ復元" }).click();

  const publicContext = await browser.newContext({ baseURL });
  const publicPage = await publicContext.newPage();
  await publicPage.goto(moderationTermPath);
  await expect(publicPage.getByRole("heading", { name: "モデレーションE2E", exact: true })).toBeVisible();
  await expect(publicPage.getByText("運用確認を行います。")).toHaveCount(0);
  await expect(publicPage.getByText("非公開復元E2Eコメント")).toHaveCount(0);
  await publicContext.close();

  await page.goto("/dashboard#hidden-content");

  for (const kind of ["使用例", "コメント"]) {
    const hiddenItem = page.locator(".hidden-content-item")
      .filter({ has: page.locator(".hidden-content-head span", { hasText: kind }) });
    await hiddenItem.getByLabel("復元理由").fill(`${kind}の内容を確認し、公開できると判断しました。`);
    await hiddenItem.getByRole("button", { name: "公開状態へ復元" }).click();
  }
  await expect(page.locator(".hidden-content-item")).toHaveCount(0);

  const restoredContext = await browser.newContext({ baseURL });
  const restoredPage = await restoredContext.newPage();
  await restoredPage.goto(moderationTermPath);
  await expect(restoredPage.getByText("運用確認を行います。")).toBeVisible();
  const restoredProposal = restoredPage.locator(".proposal-card").filter({ hasText: "運用確認訳" });
  await restoredProposal.locator(".proposal-discussion > summary").click();
  await expect(restoredPage.getByText("非公開復元E2Eコメント")).toBeVisible();
  await restoredContext.close();

  await page.goto(`${moderationTermPath}/history`);
  const visibilityRevision = page.locator(".timeline-item")
    .filter({ has: page.getByRole("heading", { name: /非公開:/ }) })
    .first();
  await expect(visibilityRevision).toContainText(/項目|使用例|コメント/);
  await expect(visibilityRevision).toContainText("公開・検討状態");
  await expect(visibilityRevision).toContainText("非公開");
  await expect(visibilityRevision).not.toContainText(/"status"|active|hidden/);

  const visibilityRevisionCount = execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      "SELECT COUNT(*) FROM Revision WHERE reason LIKE '非公開:%' OR reason LIKE '復元:%'",
    ],
    { encoding: "utf8" },
  ).trim();
  expect(Number(visibilityRevisionCount)).toBeGreaterThanOrEqual(8);
});

test("コメント・推奨判断・通報結果が重複なく通知され、既読にできる", async ({ page }) => {
  execFileSync("sqlite3", ["prisma/e2e.db", "DELETE FROM Notification"]);

  await page.goto("/login");
  const readerLogin = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await readerLogin.getByLabel("メールアドレス").fill("reader@example.com");
  await readerLogin.getByLabel("パスワード").fill("change-me-reader-password");
  await readerLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "読者", exact: true })).toBeVisible();

  await page.goto("/terms/engagement");
  const reactionCard = page.locator(".proposal-card").filter({
    has: page.getByRole("heading", { name: "反応度", exact: true }),
  });
  await reactionCard.locator(".proposal-discussion > summary").click();
  await reactionCard.getByPlaceholder("論点や代案を記入").fill("通知E2E用の新しいコメントです。");
  const commentResponse = page.waitForResponse((response) => response.request().method() === "POST");
  await reactionCard.getByRole("button", { name: "コメントを投稿" }).click();
  await commentResponse;
  await expect(reactionCard.locator(".proposal-discussion > summary")).toContainText("2件");

  const reportDetails = reactionCard.locator(":scope > details.report-details");
  await reportDetails.locator("summary").click();
  await reportDetails.getByLabel("通報理由").selectOption("other");
  await reportDetails.getByPlaceholder("補足").fill("通知E2E通報");
  const reportResponse = page.waitForResponse((response) => response.request().method() === "POST");
  await reportDetails.getByRole("button", { name: "送信" }).click();
  await reportResponse;
  await expect(reportDetails).not.toHaveAttribute("open", "");
  await page.getByRole("button", { name: "ログアウト" }).click();

  await page.goto("/login");
  const adminLogin = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await adminLogin.getByLabel("メールアドレス").fill("admin-e2e@example.test");
  await adminLogin.getByLabel("パスワード").fill("local-e2e-admin-password");
  await adminLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "管理", exact: true })).toBeVisible();

  await page.goto("/terms/engagement");
  const workbench = page.locator(".recommendation-workbench").first();
  const reactionOption = workbench.locator(".recommendation-option").filter({
    has: page.getByRole("heading", { name: "反応度", exact: true }),
  });
  const decision = reactionOption.locator("details.recommendation-decision");
  await decision.locator("summary").click();
  await decision.getByLabel("推奨レベル").selectOption("recommended");
  await decision.getByLabel("推奨する場面").fill("通知機能のE2E確認");
  await decision.getByLabel("判断根拠").fill("提案者へ推奨判断の通知が届くことを確認するため。");
  const recommendationResponse = page.waitForResponse((response) => response.request().method() === "POST");
  await decision.getByRole("button", { name: "この案の推奨内容を保存" }).click();
  await recommendationResponse;
  await expect(reactionOption.locator(".status-badge")).toHaveText("推奨");

  await page.goto("/dashboard");
  const reportItem = page.locator(".report-item").filter({ hasText: "通知E2E通報" });
  await reportItem.getByRole("button", { name: "処理済み" }).click();
  await expect(page.locator(".report-item").filter({ hasText: "通知E2E通報" })).toHaveCount(0);
  await page.getByRole("button", { name: "ログアウト" }).click();

  const notificationState = execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      "SELECT COUNT(*), COUNT(DISTINCT eventKey) FROM Notification",
    ],
    { encoding: "utf8" },
  ).trim();
  expect(notificationState).toBe("3|3");

  await page.goto("/login");
  const writerLogin = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await writerLogin.getByLabel("メールアドレス").fill("writer@example.com");
  await writerLogin.getByLabel("パスワード").fill("change-me-writer-password");
  await writerLogin.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "通知、未読2件" })).toBeVisible();
  await page.getByRole("link", { name: "通知、未読2件" }).click();

  await expect(page.locator(".notification-item.unread")).toHaveCount(2);
  await expect(page.getByText("日本語案に新しいコメントがあります")).toBeVisible();
  await expect(page.getByText("日本語案の推奨判断が確定しました")).toBeVisible();
  await page.locator(".notification-item").first().getByRole("button", { name: "内容を見る" }).click();
  await expect(page).toHaveURL(/\/terms\/engagement#proposal-/);
  await expect(page.getByRole("link", { name: "通知、未読1件" })).toBeVisible();

  await page.goto("/notifications?view=unread");
  await expect(page.locator(".notification-item.unread")).toHaveCount(1);
  await page.getByRole("button", { name: "すべて既読にする" }).click();
  await expect(page).toHaveURL(/\/notifications\?read=all/);
  await expect(page.getByText("すべての通知を既読にしました。")).toBeVisible();
  await expect(page.getByRole("link", { name: "通知", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ログアウト" }).click();

  await page.goto("/login");
  const readerResultLogin = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await readerResultLogin.getByLabel("メールアドレス").fill("reader@example.com");
  await readerResultLogin.getByLabel("パスワード").fill("change-me-reader-password");
  await readerResultLogin.getByRole("button", { name: "ログイン" }).click();
  await page.getByRole("link", { name: "通知、未読1件" }).click();
  await expect(page.getByText("通報の処理結果が届きました")).toBeVisible();
  await page.getByRole("button", { name: "内容を見る" }).click();
  await expect(page).toHaveURL(/\/terms\/engagement#proposal-/);
  await expect(page.getByRole("link", { name: "通知", exact: true })).toBeVisible();
});

test("編集者が重複項目を統合し、内容と旧URLを統合先へ引き継げる", async ({ page }) => {
  await page.goto("/login");
  const loginForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await loginForm.getByLabel("メールアドレス").fill("reader@example.com");
  await loginForm.getByLabel("パスワード").fill("change-me-reader-password");
  await loginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "読者", exact: true })).toBeVisible();

  await page.goto("/terms/new");
  await page.getByLabel("取り上げる言葉（必須）").fill("統合先E2E");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("残す使われ方");
  await page.getByLabel("この使われ方の説明（必須）").fill("統合後も残る項目側の使われ方を確認します。");
  await page.getByLabel("日本語案（必須）").fill("統合先の日本語案");
  await page.getByLabel("よく合う場面（必須）").fill("統合先として残す場面");
  await page.getByLabel("元の言葉を使った文").fill("統合先E2Eを確認する。");
  await page.getByLabel("日本語案に言い換えた文").fill("統合先の日本語案を確認する。");
  await page.getByRole("button", { name: "この日本語案を投稿" }).click();
  await expect(page.getByRole("heading", { name: "統合先E2E", exact: true })).toBeVisible();
  const targetTermId = await page.locator('input[name="termId"]').first().inputValue();

  await page.goto("/terms/new");
  await page.getByLabel("取り上げる言葉（必須）").fill("統合元E2E");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("移す使われ方");
  await page.getByLabel("この使われ方の説明（必須）").fill("統合時に移動する使われ方と関連データを確認します。");
  await page.getByLabel("日本語案（必須）").fill("統合元の日本語案");
  await page.getByLabel("よく合う場面（必須）").fill("統合元から移す場面");
  await page.getByLabel("元の言葉を使った文").fill("統合元E2Eを確認する。");
  await page.getByLabel("日本語案に言い換えた文").fill("統合元の日本語案を確認する。");
  await page.getByRole("button", { name: "この日本語案を投稿" }).click();
  await expect(page.getByRole("heading", { name: "統合元E2E", exact: true })).toBeVisible();
  const sourceUrl = page.url();
  const sourceTermId = await page.locator('input[name="termId"]').first().inputValue();
  const sourceProposal = page.locator(".proposal-card").filter({
    has: page.getByRole("heading", { name: "統合元の日本語案", exact: true }),
  });
  const sourceProposalId = await sourceProposal.locator('input[name="proposalId"]').first().inputValue();

  const evaluationDetails = sourceProposal.locator("details.evaluation-details");
  await evaluationDetails.locator("summary").click();
  await evaluationDetails.getByRole("checkbox", { name: /自然/ }).check();
  await evaluationDetails.getByRole("button", { name: "選んだ評価を保存" }).click();
  await expect(sourceProposal.locator(".proposal-evaluation-snapshot")).toContainText("評価 1人");

  const discussionSummary = sourceProposal.locator(".proposal-discussion > summary");
  await discussionSummary.click();
  await sourceProposal.getByPlaceholder("論点や代案を記入").fill("統合後も残るコメントです。");
  const commentResponse = page.waitForResponse((response) => response.request().method() === "POST");
  await sourceProposal.getByRole("button", { name: "コメントを投稿" }).click();
  await commentResponse;
  await expect(discussionSummary.locator("span")).toHaveText("1件");

  const termReport = page.locator("details.term-report");
  await termReport.locator("summary").click();
  await termReport.getByLabel("通報理由").selectOption("duplicate");
  await termReport.getByPlaceholder("補足").fill("統合時に通報先も移す確認");
  await termReport.getByRole("button", { name: "送信" }).click();
  await expect(termReport).not.toHaveAttribute("open", "");

  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.goto("/login");
  const adminLoginForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await adminLoginForm.getByLabel("メールアドレス").fill("admin-e2e@example.test");
  await adminLoginForm.getByLabel("パスワード").fill("local-e2e-admin-password");
  await adminLoginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "管理", exact: true })).toBeVisible();

  await page.goto(`/dashboard/merge?source=${sourceTermId}&target=${targetTermId}`);
  await expect(page.getByRole("heading", { name: "重複項目を統合" })).toBeVisible();
  await expect(page.locator(".merge-term-card.source")).toContainText("統合元E2E");
  await expect(page.locator(".merge-term-card.source")).toContainText("日本語案");
  await expect(page.locator(".merge-term-card.target")).toContainText("統合後の使われ方");
  await expect(page.locator(".merge-term-card.target")).toContainText("2");

  await page.setViewportSize({ width: 390, height: 844 });
  const mergeCards = await page.locator(".merge-term-card").evaluateAll((cards) =>
    cards.map((card) => {
      const box = card.getBoundingClientRect();
      return { x: box.x, y: box.y };
    }),
  );
  expect(mergeCards[0]?.x).toBe(mergeCards[1]?.x);
  expect(mergeCards[1]?.y).toBeGreaterThan(mergeCards[0]?.y ?? 0);
  await page.setViewportSize({ width: 1280, height: 900 });

  const mergeForm = page.locator("form.merge-confirmation-form");
  await mergeForm.getByLabel("統合理由").fill("同じ概念を表す検証用の重複項目だからです。");
  await mergeForm.getByLabel(/確認のため/).fill("統合元E2E → 統合先E2E に統合");
  await mergeForm.getByRole("button", { name: "統合を実行" }).click();

  await expect(page).toHaveURL(/\/terms\/.+\?merged=1/);
  await expect(page.getByText("重複項目を統合しました。使われ方、日本語案、使用例、関連履歴をこの項目へ移しました。"))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "残す使われ方" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "移す使われ方" })).toBeVisible();
  await expect(page.locator(".proposal-card").filter({
    has: page.getByRole("heading", { name: "統合先の日本語案", exact: true }),
  })).toBeVisible();
  const movedProposal = page.locator(".proposal-card").filter({
    has: page.getByRole("heading", { name: "統合元の日本語案", exact: true }),
  });
  await expect(movedProposal).toBeVisible();
  await expect(movedProposal.locator(".proposal-evaluation-snapshot")).toContainText("評価 1人");
  await movedProposal.locator(".proposal-discussion > summary").click();
  await expect(movedProposal.getByText("統合後も残るコメントです。")).toBeVisible();

  const oldUrlResponse = await page.request.get(sourceUrl, { maxRedirects: 0 });
  expect(oldUrlResponse.status()).toBe(308);
  expect(oldUrlResponse.headers().location).toContain("/terms/");

  const mergedDatabaseState = execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      `SELECT (SELECT COUNT(*) FROM Term WHERE id = '${sourceTermId}'), (SELECT COUNT(*) FROM TermRedirect WHERE sourceSlug = '統合元e2e' AND targetTermId = '${targetTermId}'), (SELECT COUNT(*) FROM Sense WHERE termId = '${targetTermId}'), (SELECT COUNT(*) FROM UsageExample WHERE termId = '${targetTermId}'), (SELECT COUNT(*) FROM Evaluation WHERE proposalId = '${sourceProposalId}'), (SELECT COUNT(*) FROM Report WHERE targetType = 'term' AND targetId = '${targetTermId}')`,
    ],
    { encoding: "utf8" },
  ).trim();
  expect(mergedDatabaseState).toBe("0|1|2|2|1|1");

  await page.goto(`/terms/${encodeURIComponent("統合先e2e")}/history`);
  await expect(page.getByText(/重複項目を統合:/)).toBeVisible();
  await page.goto("/dashboard");
  const movedReport = page.locator(".report-item").filter({ hasText: "統合時に通報先も移す確認" });
  await expect(movedReport).toContainText("統合先E2E");
});

test("改変された項目・意味・日本語案IDの組み合わせを拒否する", async ({ page }) => {
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
  await page.getByLabel("日本語案（必須）").fill("関連検証訳");
  await page.getByLabel("よく合う場面（必須）").fill("関連性の検証");
  await page.getByRole("button", { name: "この日本語案を投稿" }).click();
  await expect(page.locator(".proposal-card").filter({ hasText: "関連検証訳" })).toBeVisible();
  const firstTermUrl = page.url();

  await page.goto("/terms/new");
  await page.getByLabel("取り上げる言葉（必須）").fill("関連検証B");
  await page.getByLabel("使われ方を短く表す名前（必須）").fill("別項目の意味");
  await page.getByLabel("この使われ方の説明（必須）").fill("最初の項目とは関連しない別の説明です。");
  await page.getByLabel("日本語案（必須）").fill("別の関連検証訳");
  await page.getByLabel("よく合う場面（必須）").fill("別項目の関連性検証");
  await page.getByRole("button", { name: "この日本語案を投稿" }).click();
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

test("新規利用者がメールを確認して参加機能を使える", async ({ page }) => {
  const email = "verification-e2e@example.test";

  await page.goto("/login");
  const registrationForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "新規登録" }),
  });
  await registrationForm.getByLabel("表示名").fill("メール確認E2E利用者");
  await registrationForm.getByLabel("ハンドル").fill("verification-e2e");
  await registrationForm.getByLabel("メールアドレス").fill(email);
  await registrationForm.getByLabel("パスワード").fill("verification-e2e-password");
  await registrationForm.getByRole("checkbox").check();
  await registrationForm.getByRole("button", { name: "登録" }).click();

  await expect(page).toHaveURL(/\/account\?verificationSent=1/);
  await expect(page.getByText("メールアドレスの確認が必要です")).toBeVisible();
  await page.goto("/terms/new");
  await expect(page.getByRole("heading", { name: "投稿の前にメールアドレスを確認してください" }))
    .toBeVisible();

  const expiredVerificationUrl = await latestTestEmailUrl(page, email, "email-verification");
  const expiredToken = new URL(expiredVerificationUrl).searchParams.get("token") ?? "";
  const expiredHash = createHash("sha256").update(expiredToken).digest("hex");
  const storedHash = execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      `SELECT tokenHash FROM EmailVerificationToken WHERE tokenHash = '${expiredHash}'`,
    ],
    { encoding: "utf8" },
  ).trim();
  expect(storedHash).toBe(expiredHash);
  expect(storedHash).not.toContain(expiredToken);
  execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      `UPDATE EmailVerificationToken SET expiresAt = '2000-01-01T00:00:00.000Z' WHERE tokenHash = '${expiredHash}'`,
    ],
  );

  await page.goto(expiredVerificationUrl);
  await expect(page.getByRole("heading", { name: "確認リンクを利用できません" })).toBeVisible();
  await page.goto("/account");
  const resendForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "確認メールを再送" }),
  });
  const resendResponse = page.waitForResponse((response) => response.request().method() === "POST");
  await resendForm.getByRole("button", { name: "確認メールを再送" }).click();
  await resendResponse;
  await expect(page).toHaveURL(/\/account\?verificationSent=1/);

  const verificationUrl = await latestTestEmailUrl(page, email, "email-verification");
  expect(verificationUrl).not.toBe(expiredVerificationUrl);
  await page.goto(verificationUrl);
  await page.getByRole("button", { name: "メールアドレスを確認" }).click();
  await expect(page).toHaveURL(/\/account\?emailVerified=1/);
  await expect(page.getByText("メールアドレスを確認しました。投稿や評価に参加できます。"))
    .toBeVisible();
  await expect(page.getByText(`${email} （確認済み）`)).toBeVisible();

  await page.goto("/terms/new");
  await expect(page.getByLabel("取り上げる言葉（必須）")).toBeVisible();
  await page.goto(verificationUrl);
  await expect(page.getByRole("heading", { name: "確認リンクを利用できません" })).toBeVisible();
});

test("本人の削除申請を管理者が処理し、個人情報とセッションを無効化できる", async ({ page, context }) => {
  const email = "account-deletion-e2e@example.test";
  const password = "account-deletion-password";
  const handle = "account-deletion-e2e";
  const displayName = "退会処理E2E利用者";

  await page.goto("/login");
  const registrationForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "新規登録" }),
  });
  await registrationForm.getByLabel("表示名").fill(displayName);
  await registrationForm.getByLabel("ハンドル").fill(handle);
  await registrationForm.getByLabel("メールアドレス").fill(email);
  await registrationForm.getByLabel("パスワード").fill(password);
  await registrationForm.getByRole("checkbox").check();
  await registrationForm.getByRole("button", { name: "登録" }).click();
  await expect(page).toHaveURL(/\/account\?verificationSent=1/);
  await verifyRegisteredEmail(page, email);

  const userId = execFileSync(
    "sqlite3",
    ["prisma/e2e.db", `SELECT id FROM User WHERE email = '${email}'`],
    { encoding: "utf8" },
  ).trim();
  expect(userId).not.toBe("");

  await page.goto("/terms/engagement");
  const proposalCard = page.locator(".proposal-card").first();
  const discussionSummary = proposalCard.locator(".proposal-discussion > summary");
  const existingCommentCount = Number.parseInt(
    (await discussionSummary.locator("span").textContent()) ?? "0",
    10,
  );
  await discussionSummary.click();
  await proposalCard.getByPlaceholder("論点や代案を記入").fill("退会後も議論として残すコメントです。");
  const commentResponse = page.waitForResponse((response) => response.request().method() === "POST");
  await proposalCard.getByRole("button", { name: "コメントを投稿" }).click();
  await commentResponse;
  await expect(discussionSummary.locator("span")).toHaveText(`${existingCommentCount + 1}件`);
  await discussionSummary.click();
  await expect(proposalCard.locator(".proposal-discussion")).toHaveAttribute("open", "");
  await expect(proposalCard.getByText("退会後も議論として残すコメントです。")).toBeVisible();

  await page.goto("/account");
  await page.getByText("削除申請フォームを開く").click();
  const deletionForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "削除を申請する" }),
  });
  await deletionForm.getByLabel("現在のパスワード").fill(password);
  await deletionForm.getByLabel("退会理由（任意）").fill("E2Eで削除処理を検証するため");
  await deletionForm.getByLabel("確認のため「アカウントを削除」と入力").fill("アカウントを削除");
  await deletionForm.getByRole("button", { name: "削除を申請する" }).click();
  await expect(page).toHaveURL(/deletionRequested=1/);
  await expect(page.getByText("削除処理を待っています")).toBeVisible();

  await page.getByRole("button", { name: "削除申請を取り消す" }).click();
  await expect(page).toHaveURL(/deletionCancelled=1/);
  await expect(page.getByText("アカウント削除の申請を取り消しました。")).toBeVisible();

  await page.getByText("削除申請フォームを開く").click();
  const secondDeletionForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "削除を申請する" }),
  });
  await secondDeletionForm.getByLabel("現在のパスワード").fill(password);
  await secondDeletionForm.getByLabel("確認のため「アカウントを削除」と入力").fill("アカウントを削除");
  await secondDeletionForm.getByRole("button", { name: "削除を申請する" }).click();
  await expect(page.getByText("削除処理を待っています")).toBeVisible();
  const staleSessionCookie = (await context.cookies()).find((cookie) => cookie.name === "reiwa_session");
  expect(staleSessionCookie).toBeTruthy();
  await page.getByRole("button", { name: "ログアウト" }).click();

  await page.goto("/login");
  const adminLoginForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await adminLoginForm.getByLabel("メールアドレス").fill("admin-e2e@example.test");
  await adminLoginForm.getByLabel("パスワード").fill("local-e2e-admin-password");
  await adminLoginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByRole("link", { name: "管理", exact: true })).toBeVisible();
  await page.goto("/admin");

  const requestCard = page.locator(".deletion-request-card").filter({ hasText: email });
  await expect(requestCard).toBeVisible();
  await requestCard.getByText("削除処理を確認").click();
  await requestCard.getByLabel("「削除処理」と入力").fill("削除処理");
  await requestCard.getByRole("button", { name: "アカウント情報を消去" }).click();
  await expect(page).toHaveURL(/deletionProcessed=1/);
  await expect(page.getByText("アカウント情報を消去し、投稿の作成者表示を匿名化しました。")).toBeVisible();
  await expect(page.locator(".deletion-request-card").filter({ hasText: email })).toHaveCount(0);

  const deletedUserState = execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      `SELECT displayName, email IS NULL, passwordHash IS NULL, deletedAt IS NOT NULL, suspendedAt IS NOT NULL, sessionVersion > 0 FROM User WHERE id = '${userId}'`,
    ],
    { encoding: "utf8" },
  ).trim();
  expect(deletedUserState).toBe("退会済み利用者|1|1|1|1|1");
  const deletionRequestState = execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      `SELECT status, reason IS NULL, processedById IS NOT NULL FROM AccountDeletionRequest WHERE userId = '${userId}'`,
    ],
    { encoding: "utf8" },
  ).trim();
  expect(deletionRequestState).toBe("completed|1|1");
  const authTokenCount = execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      `SELECT (SELECT COUNT(*) FROM EmailVerificationToken WHERE userId = '${userId}') + (SELECT COUNT(*) FROM PasswordResetToken WHERE userId = '${userId}')`,
    ],
    { encoding: "utf8" },
  ).trim();
  expect(authTokenCount).toBe("0");

  await context.addCookies([staleSessionCookie!]);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "ログインが必要です" })).toBeVisible();

  await context.clearCookies();
  await page.goto("/terms/engagement");
  const publicProposalCard = page.locator(".proposal-card").first();
  await publicProposalCard.locator(".proposal-discussion > summary").click();
  await expect(publicProposalCard.getByText("使用例 / 退会済み利用者")).toBeVisible();
  await expect(publicProposalCard.getByText(displayName)).toHaveCount(0);

  await page.goto("/login");
  const deletedLoginForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await deletedLoginForm.getByLabel("メールアドレス").fill(email);
  await deletedLoginForm.getByLabel("パスワード").fill(password);
  await deletedLoginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(deletedLoginForm.getByRole("alert")).toHaveText("メールアドレスまたはパスワードが正しくありません。");
});

test("本人がメールの一回限りリンクでパスワードを再設定できる", async ({ page, context }) => {
  const email = "forgot-password-e2e@example.test";
  const oldPassword = "forgot-password-old";
  const newPassword = "forgot-password-new";
  const genericMessage = "登録されているメールアドレスの場合、再設定用のメールを送信しました。";

  await page.goto("/login");
  const registrationForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "新規登録" }),
  });
  await registrationForm.getByLabel("表示名").fill("再設定E2E利用者");
  await registrationForm.getByLabel("ハンドル").fill("forgot-password-e2e");
  await registrationForm.getByLabel("メールアドレス").fill(email);
  await registrationForm.getByLabel("パスワード").fill(oldPassword);
  await registrationForm.getByRole("checkbox").check();
  await registrationForm.getByRole("button", { name: "登録" }).click();
  await expect(page.getByRole("link", { name: "再設定E2E利用者" })).toBeVisible();
  const staleSessionCookie = (await context.cookies()).find((cookie) => cookie.name === "reiwa_session");
  expect(staleSessionCookie).toBeTruthy();
  await page.getByRole("button", { name: "ログアウト" }).click();

  await page.goto("/forgot-password");
  const requestForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "再設定メールを申請" }),
  });
  await requestForm.getByLabel("メールアドレス").fill("missing-forgot-e2e@example.test");
  const missingRequestResponse = page.waitForResponse((response) => response.request().method() === "POST");
  await requestForm.getByRole("button", { name: "再設定メールを送る" }).click();
  await missingRequestResponse;
  await expect(requestForm.getByRole("status")).toHaveText(genericMessage);
  const missingMailboxResponse = await page.request.get(
    "/api/test-mail?to=missing-forgot-e2e%40example.test",
    { headers: e2eMailboxHeaders },
  );
  expect((await missingMailboxResponse.json()).email).toBeNull();

  await requestForm.getByLabel("メールアドレス").fill(email);
  const firstResetRequestResponse = page.waitForResponse((response) => response.request().method() === "POST");
  await requestForm.getByRole("button", { name: "再設定メールを送る" }).click();
  await firstResetRequestResponse;
  await expect(requestForm.getByRole("status")).toHaveText(genericMessage);

  const readResetUrl = () => latestTestEmailUrl(page, email, "password-reset");
  const expiredResetUrl = await readResetUrl();
  expect(expiredResetUrl).toContain("/reset-password?token=");
  const expiredToken = new URL(expiredResetUrl).searchParams.get("token") ?? "";
  const expiredHash = createHash("sha256").update(expiredToken).digest("hex");
  execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      `UPDATE PasswordResetToken SET expiresAt = '2000-01-01T00:00:00.000Z' WHERE tokenHash = '${expiredHash}'`,
    ],
  );
  await page.goto(expiredResetUrl);
  await expect(page.getByRole("heading", { name: "再設定リンクを利用できません" })).toBeVisible();

  await page.goto("/forgot-password");
  const secondRequestForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "再設定メールを申請" }),
  });
  await secondRequestForm.getByLabel("メールアドレス").fill(email);
  const secondResetRequestResponse = page.waitForResponse((response) => response.request().method() === "POST");
  await secondRequestForm.getByRole("button", { name: "再設定メールを送る" }).click();
  await secondResetRequestResponse;
  await expect(secondRequestForm.getByRole("status")).toHaveText(genericMessage);
  const resetUrl = await readResetUrl();
  expect(resetUrl).not.toBe(expiredResetUrl);
  const token = new URL(resetUrl).searchParams.get("token") ?? "";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const storedHash = execFileSync(
    "sqlite3",
    [
      "prisma/e2e.db",
      `SELECT tokenHash FROM PasswordResetToken WHERE tokenHash = '${tokenHash}'`,
    ],
    { encoding: "utf8" },
  ).trim();
  expect(storedHash).toBe(tokenHash);
  expect(storedHash).not.toContain(token);

  await page.goto(resetUrl);
  const resetForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "パスワード変更" }),
  });
  await resetForm.getByLabel("新しいパスワード", { exact: true }).fill(newPassword);
  await resetForm.getByLabel("新しいパスワード（確認）").fill(newPassword);
  await resetForm.getByRole("button", { name: "パスワードを変更" }).click();
  await expect(page).toHaveURL(/\/login\?passwordReset=1/);
  await expect(page.getByText("パスワードを変更しました。新しいパスワードでログインしてください。"))
    .toBeVisible();

  await context.addCookies([staleSessionCookie!]);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "ログインが必要です" })).toBeVisible();
  await page.goto("/login?returnTo=/account");

  const loginForm = page.locator("form").filter({
    has: page.getByRole("heading", { name: "ログイン", exact: true }),
  });
  await loginForm.getByLabel("メールアドレス").fill(email);
  await loginForm.getByLabel("パスワード").fill(oldPassword);
  await loginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(loginForm.getByRole("alert")).toHaveText("メールアドレスまたはパスワードが正しくありません。");
  await loginForm.getByLabel("パスワード").fill(newPassword);
  await loginForm.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL("/account");

  await page.goto(resetUrl);
  await expect(page.getByRole("heading", { name: "再設定リンクを利用できません" })).toBeVisible();
});
