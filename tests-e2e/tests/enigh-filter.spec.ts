import { test, expect } from '@playwright/test';

const ALIMENTOS_NATIONAL_PCT = 37.72;
const ALIMENTOS_DELTA_THRESHOLD_PP = 5;

function parseNumeric(text: string): number {
  return parseFloat(text.replace(/[^\d.-]/g, ''));
}

test.describe('ENIGH decil filter (Dashboard 4 — Gastos por Rubro)', () => {
  test('changing decil selector to 1 fires new request with ?decil=1 and updates table + chart', async ({ page }) => {
    await page.goto('/enigh', { waitUntil: 'networkidle' });

    const firstRowPct = page.locator('#enigh-gastos-tbody tr').first().locator('td.num').first();
    await expect.poll(
      async () => (await firstRowPct.textContent()) ?? '',
      { timeout: 15_000, message: 'alimentos row never populated' },
    ).toMatch(/\d+\.\d+%/);

    const baselinePct = parseNumeric((await firstRowPct.textContent()) ?? '');
    expect(baselinePct).toBeGreaterThan(ALIMENTOS_NATIONAL_PCT - 2);
    expect(baselinePct).toBeLessThan(ALIMENTOS_NATIONAL_PCT + 2);

    const totalEl = page.locator('#enigh-gastos-total');
    const baselineTotal = (await totalEl.textContent()) ?? '';
    expect(baselineTotal).toMatch(/^\$[\d,]+$/);

    const select = page.locator('#enigh-gastos-decil');
    await expect(select).toBeVisible();
    await select.scrollIntoViewIfNeeded();

    const decil1Response = page.waitForResponse(
      (res) => res.url().includes('/gastos/by-rubro') && res.url().includes('decil=1'),
      { timeout: 15_000 },
    );
    await select.selectOption('1');
    const res = await decil1Response;

    expect(res.status()).toBe(200);
    expect(res.url()).toContain('decil=1');

    const body = await res.json();
    expect(body.decil).toBe(1);
    expect(Array.isArray(body.rubros)).toBe(true);

    await expect.poll(
      async () => parseNumeric((await firstRowPct.textContent()) ?? ''),
      { timeout: 10_000, message: 'alimentos pct did not update after decil=1' },
    ).toBeGreaterThan(baselinePct + ALIMENTOS_DELTA_THRESHOLD_PP);

    await expect.poll(
      async () => (await totalEl.textContent()) ?? '',
      { timeout: 10_000, message: 'gasto total did not change after decil=1' },
    ).not.toBe(baselineTotal);
  });
});
