import { test, expect, type Response } from '@playwright/test';

// Endpoints que el frontend /pensional consume (sin query strings — url.includes matching)
const PENSIONAL_FRONTEND_FETCHES: readonly string[] = [
  '/api/v1/consar/recursos/totales',
  '/api/v1/consar/recursos/composicion',
  '/api/v1/comparativo/aportes-vs-jubilaciones-actuales',
] as const;

const EXPECTED_SECTION_TITLE_PATTERNS: readonly RegExp[] = [
  /^P2\s*·\s*Composición del SAR por liquidez/,
  /^P1\s*·\s*Ejercicio aritmético/,
];

test.describe('Pensional landing page', () => {
  test('loads 2 narrative dashboards with 3 live fetches, caveats, charts, live badge, no errors', async ({ page }) => {
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

    // 2 section titles in narrative order (P2 first, P1 after)
    const sectionTitles = page.locator('section.enigh-section > h2.section-title');
    await expect(sectionTitles).toHaveCount(2);
    for (let i = 0; i < EXPECTED_SECTION_TITLE_PATTERNS.length; i++) {
      const txt = (await sectionTitles.nth(i).textContent()) ?? '';
      expect(txt.trim(), `section ${i + 1} title mismatch`).toMatch(EXPECTED_SECTION_TITLE_PATTERNS[i]);
    }

    // 3 live fetches responded 200
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

    // P1 KPIs (5): sar, hogares, promedio, flujo, rendimiento
    await expect(page.locator('#p1-kpi-sar')).toBeVisible();
    await expect(page.locator('#p1-kpi-hogares')).toBeVisible();
    await expect(page.locator('#p1-kpi-promedio')).toBeVisible();
    await expect(page.locator('#p1-kpi-flujo')).toBeVisible();
    await expect(page.locator('#p1-kpi-rendimiento')).toBeVisible();

    // P1 callout central — big cobertura number + inline cobertura phrase
    const bigCobertura = page.locator('#p1-big-cobertura');
    await expect(bigCobertura).toBeVisible();
    const bigText = (await bigCobertura.textContent()) ?? '';
    expect(bigText.trim()).toMatch(/^\d{1,3}%$/);

    const inlineCobertura = page.locator('#p1-cobertura-inline');
    await expect(inlineCobertura).toBeVisible();

    // Section anchors navigate P2↔P1 intact
    await expect(page.locator('#p2-liquidez')).toBeVisible();
    await expect(page.locator('#p1-cobertura')).toBeVisible();
    // P1 caveat #4 links to P2
    await expect(page.locator('a[href="#p2-liquidez"]')).toHaveCount(1);

    // 2 charts initialized with non-zero dimensions
    for (const cssId of ['#p2Chart', '#p1Chart']) {
      const canvas = page.locator(cssId);
      await expect(canvas, `canvas ${cssId} not found`).toBeVisible();
      const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }));
      expect(dims.w, `canvas ${cssId} width=0 (chart not initialized)`).toBeGreaterThan(0);
      expect(dims.h, `canvas ${cssId} height=0 (chart not initialized)`).toBeGreaterThan(0);
    }

    // Narrative structure: both sections have caveat blocks + roadmap boxes
    // P2 has 1 headline (comparativo-headline) + 1 caveat block + 1 roadmap
    // P1 has 1 pensional-insight + 1 visible caveat block + 1 collapsible <details> + 1 roadmap
    await expect(page.locator('.comparativo-headline')).toHaveCount(1);        // P2
    await expect(page.locator('.comparativo-pensional-insight')).toHaveCount(1); // P1
    await expect(page.locator('.comparativo-roadmap')).toHaveCount(2);          // P2 + P1

    // Caveats: 4 visible caveat blocks total (P2 has 1 ol, P1 has 1 ol visible + 1 details with ol)
    // The visible ones are div.comparativo-caveats-expanded; the details is details.comparativo-caveats-expanded
    const caveatDivs = page.locator('div.comparativo-caveats-expanded');
    await expect(caveatDivs).toHaveCount(2); // P2 principal + P1 principal
    const caveatDetails = page.locator('details.comparativo-caveats-expanded');
    await expect(caveatDetails).toHaveCount(1); // P1 secondary collapsible

    // P2 has 4 numbered caveats; P1 principal has 4; P1 details has 2 (start=5)
    const p2Caveats = caveatDivs.nth(0).locator('ol > li');
    await expect(p2Caveats).toHaveCount(4);
    const p1Caveats = caveatDivs.nth(1).locator('ol > li');
    await expect(p1Caveats).toHaveCount(4);
    const p1DetailsCaveats = caveatDetails.locator('ol > li');
    await expect(p1DetailsCaveats).toHaveCount(2);

    // Collapsible: details starts closed; <ol start="5"> is hidden via summary toggle
    const detailsOpen = await caveatDetails.evaluate((el: HTMLDetailsElement) => el.open);
    expect(detailsOpen, 'secondary caveats details should start closed').toBe(false);

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
