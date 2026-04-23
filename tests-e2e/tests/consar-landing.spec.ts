import { test, expect, type Response } from '@playwright/test';
import { CONSAR_ENDPOINTS } from '../helpers/endpoints';

const EXPECTED_SECTION_TITLE_PATTERNS: readonly RegExp[] = [
  /^1\s*·\s*El sistema en perspectiva/,
  /^2\s*·\s*¿De qué se compone el SAR\?/,
  /^3\s*·\s*Concentración del SAR/,
  /^4\s*·\s*Trabajadores privados/,
  /^5\s*·\s*Vivienda/,
  /^6\s*·\s*Pensión Bienestar/,
  /^7\s*·\s*Catálogos/,
];

test.describe('CONSAR landing page', () => {
  test('loads 7 dashboards, 8 API fetches 200, active tab, charts initialize', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const apiResponses = new Map<string, Response>();
    page.on('response', (res) => {
      const url = res.url();
      for (const endpoint of CONSAR_ENDPOINTS) {
        if (url.includes(endpoint)) {
          apiResponses.set(endpoint, res);
          break;
        }
      }
    });

    const navigation = await page.goto('/consar', { waitUntil: 'networkidle' });
    expect(navigation, 'no navigation response').not.toBeNull();
    expect(navigation!.status()).toBe(200);

    // Tab active
    const consarTab = page.locator('a.dataset-tab[href="/consar"]');
    await expect(consarTab).toHaveAttribute('aria-current', 'page');
    await expect(consarTab).toHaveClass(/\bactive\b/);

    // 7 section titles in order
    const sectionTitles = page.locator('section.enigh-section > h2.section-title');
    await expect(sectionTitles).toHaveCount(7);
    for (let i = 0; i < EXPECTED_SECTION_TITLE_PATTERNS.length; i++) {
      const txt = (await sectionTitles.nth(i).textContent()) ?? '';
      expect(txt.trim(), `section ${i + 1} title mismatch`).toMatch(EXPECTED_SECTION_TITLE_PATTERNS[i]);
    }

    // 8 fetches captured with 200
    for (const endpoint of CONSAR_ENDPOINTS) {
      const res = apiResponses.get(endpoint);
      expect(res, `no response captured for ${endpoint}`).toBeDefined();
      expect(res!.status(), `status for ${endpoint}`).toBe(200);
    }

    // KPIs visible across D1, D3, D4, D5, D6
    await expect(page.locator('#d1-kpi-sar-total')).toBeVisible();
    await expect(page.locator('#d1-kpi-n-puntos')).toBeVisible();
    await expect(page.locator('#d3-kpi-top4')).toBeVisible();
    await expect(page.locator('#d4-kpi-imss')).toBeVisible();
    await expect(page.locator('#d4-kpi-ratio')).toBeVisible();
    await expect(page.locator('#d5-kpi-vivienda')).toBeVisible();
    await expect(page.locator('#d6-kpi-pb-total')).toBeVisible();

    // Charts: 6 canvas elements initialized with non-zero dimensions
    const canvasIds = ['#d1Chart', '#d2Chart', '#d3Chart', '#d4Chart', '#d5Chart', '#d6Chart'];
    for (const cssId of canvasIds) {
      const canvas = page.locator(cssId);
      await expect(canvas, `canvas ${cssId} not found`).toBeVisible();
      const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }));
      expect(dims.w, `canvas ${cssId} width=0 (chart not initialized)`).toBeGreaterThan(0);
      expect(dims.h, `canvas ${cssId} height=0 (chart not initialized)`).toBeGreaterThan(0);
    }

    // D2 donut legend: 8 rows
    const legendRows = page.locator('#d2-legend-tbody tr');
    await expect(legendRows).toHaveCount(8);

    // D2 featured section present with eyebrow and headline
    await expect(page.locator('.enigh-section--featured')).toBeVisible();
    await expect(page.locator('.consar-donut-centered-headline')).toBeVisible();

    // D3 afores table: 11 rows
    const aforesRows = page.locator('#d3-afores-tbody tr');
    await expect(aforesRows).toHaveCount(11);

    // D7 afores table: 11 rows
    const d7AforesRows = page.locator('#d7-afores-tbody tr');
    await expect(d7AforesRows).toHaveCount(11);

    // D7 tipos_recurso table: 15 rows
    const tiposRows = page.locator('#d7-tipos-tbody tr');
    await expect(tiposRows).toHaveCount(15);

    // Live badge activates after successful fetches
    const liveBadge = page.locator('#consarLiveBadge');
    await expect(liveBadge).toHaveClass(/\bactive\b/, { timeout: 10_000 });

    // No JS errors
    expect(
      consoleErrors,
      `unexpected console errors: ${consoleErrors.join(' | ')}`,
    ).toEqual([]);
  });
});
