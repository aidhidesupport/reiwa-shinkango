import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/search?q=エンゲージメント",
  "/terms/engagement",
  "/vision",
  "/features",
  "/features/sanpu",
  "/features/engagement",
  "/rules",
  "/rules/classification",
  "/rules/permissions",
  "/legal/terms",
  "/legal/privacy",
];

test("主要公開ページに自動検出できるアクセシビリティ違反がない", async ({ page }) => {
  for (const route of publicRoutes) {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.flatMap((node) => node.target),
      })),
      `${route} のアクセシビリティ違反`,
    ).toEqual([]);
  }
});

test("390px幅の主要公開ページで文書全体が横にはみ出さない", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of publicRoutes) {
    await page.goto(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${route} の横方向はみ出し`).toBeLessThanOrEqual(1);
  }
});

test("キーボードで本文へ移動でき、フォーカス位置を視認できる", async ({ page }) => {
  await page.goto("/");

  const skipLink = page.getByRole("link", { name: "本文へ移動" });
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.keyboard.press("Tab");
  const focusedOutline = await page.evaluate(() => {
    const element = document.activeElement;
    return element instanceof HTMLElement ? getComputedStyle(element).outlineStyle : "none";
  });
  expect(focusedOutline).not.toBe("none");
});

test("公開メタデータ、クロール制御、ヘルスチェックが本番向けに応答する", async ({ page }) => {
  const homeResponse = await page.goto("/");
  expect(homeResponse?.status()).toBe(200);
  await expect(page).toHaveTitle("令和新漢語");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /新しい概念を、日本語で考えられる言葉へ/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100",
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "ja_JP");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "http://127.0.0.1:3100/og.png",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute(
    "content",
    "q_llTZ-8pvZlKmV4DBC5ZoIDqjVi-vDwQfF-Ukc1BcU",
  );
  await expect(page.getByRole("heading", { name: "「エンゲージメント」は、なぜ一語で訳せないのか。" })).toBeVisible();
  await expect(page.getByRole("link", { name: /言い分けを読む/ })).toHaveAttribute(
    "href",
    "/features/engagement",
  );
  await expect(page.getByRole("link", { name: /過去の記事を見る/ })).toHaveAttribute(
    "href",
    "/features",
  );

  await page.goto("/features");
  await expect(page).toHaveTitle(/記事一覧/);
  await expect(page.getByRole("heading", { level: 1, name: "言葉を調べ、 文章の中で試した記録。" })).toBeVisible();
  await expect(page.locator(".article-archive-card")).toHaveCount(2);
  await expect(page.getByRole("link", {
    name: "「エンゲージメント」は、なぜ一語で訳せないのか。",
    exact: true,
  })).toHaveAttribute(
    "href",
    "/features/engagement",
  );
  await expect(page.getByRole("link", {
    name: "「算譜」を、もう一度使える言葉にできるか。",
    exact: true,
  })).toHaveAttribute(
    "href",
    "/features/sanpu",
  );

  await page.goto("/features/sanpu");
  await expect(page).toHaveTitle(/算譜語群―プログラムを日本語で考える/);
  await expect(page.getByRole("heading", { name: /「算譜」を、もう一度/ })).toBeVisible();
  await expect(page.locator(".word-family-card")).toHaveCount(5);
  await expect(page.getByRole("link", { name: /「算譜」を評価する/ })).toHaveAttribute(
    "href",
    "/terms/program",
  );

  await page.goto("/features/engagement");
  await expect(page).toHaveTitle(/「エンゲージメント」は、なぜ一語で訳せないのか/);
  await expect(page.getByRole("heading", {
    level: 1,
    name: "「エンゲージメント」は、 なぜ一語で訳せないのか。",
  })).toBeVisible();
  await expect(page.locator(".engagement-context-card")).toHaveCount(4);
  await expect(page.getByRole("link", { name: /日本語案を見る/ })).toHaveAttribute(
    "href",
    "/terms/engagement",
  );

  await page.goto("/terms/engagement");
  await expect(page).toHaveTitle(/エンゲージメントの日本語案・言い換え/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/terms/engagement",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "http://127.0.0.1:3100/share/terms/engagement",
  );
  await expect(page.getByRole("button", { name: "この項目を共有" })).toBeVisible();

  const [robotsResponse, sitemapResponse, manifestResponse, healthResponse, shareImageResponse] = await Promise.all([
    page.request.get("/robots.txt"),
    page.request.get("/sitemap.xml"),
    page.request.get("/manifest.webmanifest"),
    page.request.get("/api/health"),
    page.request.get("/share/terms/engagement"),
  ]);
  expect(robotsResponse.status()).toBe(200);
  expect(await robotsResponse.text()).toContain("Disallow: /admin");
  expect(await robotsResponse.text()).toContain("Sitemap: http://127.0.0.1:3100/sitemap.xml");
  expect(sitemapResponse.status()).toBe(200);
  expect(await sitemapResponse.text()).toContain("/terms/engagement");
  expect(await sitemapResponse.text()).toContain("/vision");
  expect(await sitemapResponse.text()).toContain("/features");
  expect(await sitemapResponse.text()).toContain("/features/sanpu");
  expect(await sitemapResponse.text()).toContain("/features/engagement");
  expect(await sitemapResponse.text()).toContain("/legal/privacy");
  expect(manifestResponse.status()).toBe(200);
  expect((await manifestResponse.json()).lang).toBe("ja");
  expect(healthResponse.status()).toBe(200);
  expect(healthResponse.headers()["cache-control"]).toContain("no-store");
  expect(healthResponse.headers()["x-robots-tag"]).toBe("noindex");
  expect(shareImageResponse.status()).toBe(200);
  expect(shareImageResponse.headers()["content-type"]).toContain("image/png");
  expect(shareImageResponse.headers()["x-robots-tag"]).toBe("noindex");
  expect((await shareImageResponse.body()).byteLength).toBeGreaterThan(10_000);
  const healthBody = await healthResponse.json();
  expect(healthBody).toMatchObject({
    ok: true,
    databaseLatencyMs: expect.any(Number),
  });

  expect(homeResponse?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(homeResponse?.headers()["x-frame-options"]).toBe("DENY");
  expect(homeResponse?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(homeResponse?.headers()["permissions-policy"]).toContain("camera=()");
});
