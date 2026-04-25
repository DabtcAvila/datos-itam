import { test, expect, type Response } from '@playwright/test';

// Endpoints que el frontend /pensional consume (sin query strings — url.includes matching)
const PENSIONAL_FRONTEND_FETCHES: readonly string[] = [
  '/api/v1/consar/recursos/totales',
  '/api/v1/consar/recursos/composicion',
] as const;

const EXPECTED_SECTION_TITLE_PATTERNS: readonly RegExp[] = [
  /^P2\s*·\s*Composición del SAR por liquidez/,
];

test.describe('Pensional landing page', () => {
  test('loads 1 descriptive dashboard with 2 live fetches, caveats, chart, live badge, no errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const apiResponses = new Map<string, Response>();
    page.on('response', (res) => {
      const url = res.url();
      for (const endpoint of PENSIONAL_FRONTEND_FETCHES) {
        if (url.includes(endpoint)) {
          apiResponses.set(endpoint, res);
          break;
        }
      }
    });

    const navigation = await page.goto('/pensional', { waitUntil: 'networkidle' });
    expect(navigation, 'no navigation response').not.toBeNull();
    expect(navigation!.status()).toBe(200);

    // Tab Pensional active (5th tab)
    const pensionalTab = page.locator('a.dataset-tab[href="/pensional"]');
    await expect(pensionalTab).toBeVisible();
    await expect(pensionalTab).toHaveAttribute('aria-current', 'page');
    await expect(pensionalTab).toHaveClass(/\bactive\b/);

    // Navigation has 5 tabs total
    await expect(page.locator('a.dataset-tab')).toHaveCount(5);

    // Single section title — P2 only
    const sectionTitles = page.locator('section.enigh-section > h2.section-title');
    await expect(sectionTitles).toHaveCount(1);
    const txt = (await sectionTitles.nth(0).textContent()) ?? '';
    expect(txt.trim(), 'section title mismatch').toMatch(EXPECTED_SECTION_TITLE_PATTERNS[0]);

    // 2 live fetches responded 200
    for (const endpoint of PENSIONAL_FRONTEND_FETCHES) {
      const res = apiResponses.get(endpoint);
      expect(res, `no response captured for ${endpoint}`).toBeDefined();
      expect(res!.status(), `status for ${endpoint}`).toBe(200);
    }

    // P2 KPIs (4): sar, liquido, vivienda, operativo
    await expect(page.locator('#p2-kpi-sar')).toBeVisible();
    await expect(page.locator('#p2-kpi-liquido-pct')).toBeVisible();
    await expect(page.locator('#p2-kpi-vivienda-pct')).toBeVisible();
    await expect(page.locator('#p2-kpi-operativo-pct')).toBeVisible();

    // Section anchor visible
    await expect(page.locator('#p2-liquidez')).toBeVisible();

    // 1 chart initialized with non-zero dimensions
    const canvas = page.locator('#p2Chart');
    await expect(canvas, 'canvas #p2Chart not found').toBeVisible();
    const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }));
    expect(dims.w, 'canvas width=0 (chart not initialized)').toBeGreaterThan(0);
    expect(dims.h, 'canvas height=0 (chart not initialized)').toBeGreaterThan(0);

    // Narrative structure: P2 has 1 headline + 1 caveat block + 1 roadmap
    await expect(page.locator('.comparativo-headline')).toHaveCount(1);
    await expect(page.locator('.comparativo-roadmap')).toHaveCount(1);

    // Caveats: 1 visible caveat block (P2)
    const caveatDivs = page.locator('div.comparativo-caveats-expanded');
    await expect(caveatDivs).toHaveCount(1);
    const p2Caveats = caveatDivs.nth(0).locator('ol > li');
    await expect(p2Caveats).toHaveCount(4);

    // Live badge activates after successful fetches
    const liveBadge = page.locator('#pensionalLiveBadge');
    await expect(liveBadge).toHaveClass(/\bactive\b/, { timeout: 10_000 });

    // No JS errors
    expect(
      consoleErrors,
      `unexpected console errors: ${consoleErrors.join(' | ')}`,
    ).toEqual([]);
  });
});
