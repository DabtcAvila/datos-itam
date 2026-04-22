import { test, expect, type Response } from '@playwright/test';
import { COMPARATIVO_ENDPOINTS } from '../helpers/endpoints';

const EXPECTED_SECTION_TITLE_PATTERNS: readonly RegExp[] = [
  /^1\s*·\s*Tres unidades de ingreso/,
  /^2\s*·\s*Tesis central/,
  /^3\s*·\s*Estructura del gasto/,
  /^4\s*·\s*Extremos de la distribución/,
  /^5\s*·\s*Actividad económica/,
  /^6\s*·\s*Bancarización/,
  /^7\s*·\s*Cierre/,
];

test.describe('Comparativo landing page', () => {
  test('loads 7 dashboards, 7 API fetches 200, active tab, charts initialize', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const apiResponses = new Map<string, Response>();
    page.on('response', (res) => {
      const url = res.url();
      for (const endpoint of COMPARATIVO_ENDPOINTS) {
        if (url.includes(endpoint)) {
          apiResponses.set(endpoint, res);
          break;
        }
      }
    });

    const navigation = await page.goto('/comparativo', { waitUntil: 'networkidle' });
    expect(navigation, 'no navigation response').not.toBeNull();
    expect(navigation!.status()).toBe(200);

    const comparativoTab = page.locator('a.dataset-tab[href="/comparativo"]');
    await expect(comparativoTab).toHaveAttribute('aria-current', 'page');
    await expect(comparativoTab).toHaveClass(/\bactive\b/);

    const sectionTitles = page.locator('section.enigh-section > h2.section-title');
    await expect(sectionTitles).toHaveCount(7);
    for (let i = 0; i < EXPECTED_SECTION_TITLE_PATTERNS.length; i++) {
      const txt = (await sectionTitles.nth(i).textContent()) ?? '';
      expect(txt.trim(), `section ${i + 1} title mismatch`).toMatch(EXPECTED_SECTION_TITLE_PATTERNS[i]);
    }

    for (const endpoint of COMPARATIVO_ENDPOINTS) {
      const res = apiResponses.get(endpoint);
      expect(res, `no response captured for ${endpoint}`).toBeDefined();
      expect(res!.status(), `status for ${endpoint}`).toBe(200);
    }

    await expect(page.locator('#d1-kpi-cdmx-mean')).toBeVisible();
    await expect(page.locator('#d3-kpi-bruto')).toBeVisible();
    await expect(page.locator('#d3-kpi-jub-mensual')).toBeVisible();

    const canvasIds = ['#d1Chart', '#d4Chart', '#d5Chart', '#d6Chart', '#d7TopChart', '#d7BottomChart'];
    for (const cssId of canvasIds) {
      const canvas = page.locator(cssId);
      await expect(canvas, `canvas ${cssId} not found`).toBeVisible();
      const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }));
      expect(dims.w, `canvas ${cssId} width=0 (chart not initialized)`).toBeGreaterThan(0);
      expect(dims.h, `canvas ${cssId} height=0 (chart not initialized)`).toBeGreaterThan(0);
    }

    const liveBadge = page.locator('#comparativoLiveBadge');
    await expect(liveBadge).toHaveClass(/\bactive\b/, { timeout: 10_000 });

    const escenarioARows = page.locator('#d2-escenario-a-tbody tr');
    await expect(escenarioARows).toHaveCount(4);
    const escenarioBRows = page.locator('#d2-escenario-b-tbody tr');
    await expect(escenarioBRows).toHaveCount(4);
    const decilesRows = page.locator('#d2-deciles-tbody tr');
    await expect(decilesRows).toHaveCount(10);

    const rubrosRows = page.locator('#d5-rubros-tbody tr');
    await expect(rubrosRows).toHaveCount(9);

    expect(
      consoleErrors,
      `unexpected console errors: ${consoleErrors.join(' | ')}`,
    ).toEqual([]);
  });
});
