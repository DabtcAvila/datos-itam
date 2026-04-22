import { test, expect, type Response } from '@playwright/test';

const EXPECTED_ENIGH_FETCHES: readonly string[] = [
  '/api/v1/enigh/validaciones',
  '/api/v1/enigh/hogares/summary',
  '/api/v1/enigh/hogares/by-decil',
  '/api/v1/enigh/hogares/by-entidad',
  '/api/v1/enigh/gastos/by-rubro',
  '/api/v1/enigh/actividad/agro',
  '/api/v1/enigh/actividad/noagro',
  '/api/v1/enigh/poblacion/demographics',
];

const HOGARES_MUESTRA_EXACT = 91414;
const HOGARES_EXPANDIDO_APPROX = 38_830_230;
const HOGARES_EXPANDIDO_TOLERANCE_PCT = 0.001;
const INGRESO_MES_APPROX = 25_955;
const GASTO_MES_APPROX = 15_891;
const MONEY_TOLERANCE_PCT = 0.05;

function parseNumeric(text: string): number {
  return parseFloat(text.replace(/[^\d.-]/g, ''));
}

test.describe('ENIGH landing page', () => {
  test('loads hero KPIs, 8 API fetches 200, validaciones 13/13, EN VIVO badge, active tab', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const apiResponses = new Map<string, Response>();
    page.on('response', (res) => {
      const url = res.url();
      for (const endpoint of EXPECTED_ENIGH_FETCHES) {
        if (url.includes(endpoint)) {
          apiResponses.set(endpoint, res);
          break;
        }
      }
    });

    await page.goto('/enigh', { waitUntil: 'networkidle' });

    const enighTab = page.locator('a.dataset-tab[href="/enigh"]');
    await expect(enighTab).toHaveAttribute('aria-current', 'page');
    await expect(enighTab).toHaveClass(/\bactive\b/);

    const muestra = page.locator('#enigh-kpi-hogares-muestra');
    await expect(muestra).toBeVisible();
    const muestraTarget = parseFloat((await muestra.getAttribute('data-target')) ?? '0');
    expect(muestraTarget).toBe(HOGARES_MUESTRA_EXACT);
    await expect.poll(
      async () => parseNumeric((await muestra.textContent()) ?? ''),
      { timeout: 10_000 },
    ).toBe(HOGARES_MUESTRA_EXACT);

    const expand = page.locator('#enigh-kpi-hogares-exp');
    const expandTarget = parseFloat((await expand.getAttribute('data-target')) ?? '0');
    expect(Math.abs(expandTarget - HOGARES_EXPANDIDO_APPROX) / HOGARES_EXPANDIDO_APPROX).toBeLessThan(
      HOGARES_EXPANDIDO_TOLERANCE_PCT,
    );

    const ingreso = page.locator('#enigh-kpi-ing-mes');
    const ingresoTarget = parseFloat((await ingreso.getAttribute('data-target')) ?? '0');
    expect(Math.abs(ingresoTarget - INGRESO_MES_APPROX) / INGRESO_MES_APPROX).toBeLessThan(
      MONEY_TOLERANCE_PCT,
    );

    const gasto = page.locator('#enigh-kpi-gas-mes');
    const gastoTarget = parseFloat((await gasto.getAttribute('data-target')) ?? '0');
    expect(Math.abs(gastoTarget - GASTO_MES_APPROX) / GASTO_MES_APPROX).toBeLessThan(
      MONEY_TOLERANCE_PCT,
    );

    for (const endpoint of EXPECTED_ENIGH_FETCHES) {
      const res = apiResponses.get(endpoint);
      expect(res, `no response captured for ${endpoint}`).toBeDefined();
      expect(res!.status(), `status for ${endpoint}`).toBe(200);
    }

    const valCount = page.locator('#enigh-val-count');
    await expect.poll(
      async () => (await valCount.textContent())?.trim(),
      { timeout: 15_000, message: 'validaciones count never populated' },
    ).toMatch(/^\d+\/\d+$/);
    const valText = ((await valCount.textContent()) ?? '').trim();
    const [passing, total] = valText.split('/').map((n) => parseInt(n, 10));
    expect(total).toBeGreaterThanOrEqual(13);
    expect(passing).toBe(total);

    const valRows = page.locator('#enigh-val-tbody tr');
    await expect.poll(
      async () => await valRows.count(),
      { timeout: 15_000 },
    ).toBeGreaterThanOrEqual(13);

    const liveBadge = page.locator('#enighLiveBadge');
    await expect(liveBadge).toHaveClass(/\bactive\b/, { timeout: 10_000 });

    expect(
      consoleErrors,
      `unexpected console errors: ${consoleErrors.join(' | ')}`,
    ).toEqual([]);
  });
});
