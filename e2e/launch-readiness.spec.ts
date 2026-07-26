import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/search?q=エンゲージメント",
  "/terms/engagement",
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
    /横文字を文脈に合う日本語へ/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100",
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "ja_JP");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");

  await page.goto("/terms/engagement");
  await expect(page).toHaveTitle(/エンゲージメントの日本語案・言い換え/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/terms/engagement",
  );

  const [robotsResponse, sitemapResponse, manifestResponse, healthResponse] = await Promise.all([
    page.request.get("/robots.txt"),
    page.request.get("/sitemap.xml"),
    page.request.get("/manifest.webmanifest"),
    page.request.get("/api/health"),
  ]);
  expect(robotsResponse.status()).toBe(200);
  expect(await robotsResponse.text()).toContain("Disallow: /admin");
  expect(await robotsResponse.text()).toContain("Sitemap: http://127.0.0.1:3100/sitemap.xml");
  expect(sitemapResponse.status()).toBe(200);
  expect(await sitemapResponse.text()).toContain("/terms/engagement");
  expect(await sitemapResponse.text()).toContain("/legal/privacy");
  expect(manifestResponse.status()).toBe(200);
  expect((await manifestResponse.json()).lang).toBe("ja");
  expect(healthResponse.status()).toBe(200);
  expect(healthResponse.headers()["cache-control"]).toContain("no-store");
  expect(healthResponse.headers()["x-robots-tag"]).toBe("noindex");
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
