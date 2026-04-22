import { test, expect } from '@playwright/test';

test.describe('CDMX landing page', () => {
  test('loads with title, active tab, numeric KPIs, rendered charts, no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/datos-itam/i);

    const cdmxTab = page.locator('a.dataset-tab[href="/"]');
    const enighTab = page.locator('a.dataset-tab[href="/enigh"]');
    await expect(cdmxTab).toBeVisible();
    await expect(enighTab).toBeVisible();
    await expect(cdmxTab).toHaveAttribute('aria-current', 'page');
    await expect(cdmxTab).toHaveClass(/\bactive\b/);

    const kpiTotal = page.locator('#kpi-total');
    await expect(kpiTotal).toBeVisible();
    await expect.poll(
      async () => await kpiTotal.textContent(),
      { timeout: 10_000, message: 'KPI total never became populated' },
    ).not.toMatch(/^(0|Cargando|NaN)$/);
    const totalText = (await kpiTotal.textContent()) ?? '';
    expect(totalText).not.toContain('NaN');
    expect(totalText.replace(/[^\d]/g, '').length).toBeGreaterThan(0);

    const kpiSalary = page.locator('#kpi-salary');
    await expect(kpiSalary).toBeVisible();
    await expect.poll(
      async () => (await kpiSalary.textContent()) ?? '',
      { timeout: 10_000 },
    ).toMatch(/\$[\d,]+/);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThan(0);

    const firstCanvas = page.locator('canvas').first();
    await expect(firstCanvas).toBeVisible();
    const box = await firstCanvas.boundingBox();
    expect(box, 'first canvas has no bounding box').not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    expect(
      consoleErrors,
      `unexpected console errors: ${consoleErrors.join(' | ')}`,
    ).toEqual([]);
  });
});
