import { test, expect } from '@playwright/test';

test.describe('Navigation across the six dataset tabs', () => {
  test('tab cycle CDMX → ENIGH → Comparativo → CONSAR → Pensional → Demo → CDMX updates URL, active state, and content', async ({ page }) => {
    await page.goto('/');

    const cdmxTab = page.locator('a.dataset-tab[href="/"]');
    const enighTab = page.locator('a.dataset-tab[href="/enigh"]');
    const compTab = page.locator('a.dataset-tab[href="/comparativo"]');
    const consarTab = page.locator('a.dataset-tab[href="/consar"]');
    const pensionalTab = page.locator('a.dataset-tab[href="/pensional"]');
    const demoTab = page.locator('a.dataset-tab[href="/demo"]');

    await expect(cdmxTab).toBeVisible();
    await expect(enighTab).toBeVisible();
    await expect(compTab).toBeVisible();
    await expect(consarTab).toBeVisible();
    await expect(pensionalTab).toBeVisible();
    await expect(demoTab).toBeVisible();
    await expect(cdmxTab).toHaveAttribute('aria-current', 'page');
    await expect(enighTab).toHaveAttribute('aria-current', 'false');
    await expect(compTab).toHaveAttribute('aria-current', 'false');
    await expect(consarTab).toHaveAttribute('aria-current', 'false');
    await expect(pensionalTab).toHaveAttribute('aria-current', 'false');
    await expect(demoTab).toHaveAttribute('aria-current', 'false');
    await expect(cdmxTab).toHaveClass(/\bactive\b/);

    // CDMX → ENIGH
    await enighTab.click();
    await expect(page).toHaveURL(/\/enigh\/?$/);
    await expect(page.locator('a.dataset-tab[href="/enigh"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('a.dataset-tab[href="/enigh"]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#enigh-kpi-hogares-muestra')).toBeVisible();
    await expect(page.locator('#enigh-kpi-ing-mes')).toBeVisible();

    // ENIGH → Comparativo
    await page.locator('a.dataset-tab[href="/comparativo"]').click();
    await expect(page).toHaveURL(/\/comparativo\/?$/);
    await expect(page.locator('a.dataset-tab[href="/comparativo"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('a.dataset-tab[href="/comparativo"]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#d1-kpi-cdmx-mean')).toBeVisible();
    await expect(page.locator('#d3-kpi-bruto')).toBeVisible();

    // Comparativo → CONSAR
    await page.locator('a.dataset-tab[href="/consar"]').click();
    await expect(page).toHaveURL(/\/consar\/?$/);
    await expect(page.locator('a.dataset-tab[href="/consar"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('a.dataset-tab[href="/consar"]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#d1-kpi-sar-total')).toBeVisible();
    await expect(page.locator('#d3-kpi-top4')).toBeVisible();

    // CONSAR → Pensional
    await page.locator('a.dataset-tab[href="/pensional"]').click();
    await expect(page).toHaveURL(/\/pensional\/?$/);
    await expect(page.locator('a.dataset-tab[href="/pensional"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('a.dataset-tab[href="/pensional"]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#composicion-kpi-sar')).toBeVisible();
    await expect(page.locator('#composicion-kpi-liquido-pct')).toBeVisible();

    // Pensional → Demo (read-only HR/payroll dashboard tras refactor S15.2)
    await page.locator('a.dataset-tab[href="/demo"]').click();
    await expect(page).toHaveURL(/\/demo\/?$/);
    await expect(page.locator('a.dataset-tab[href="/demo"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('a.dataset-tab[href="/demo"]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#kpi-empleados')).toBeVisible();
    await expect(page.locator('#demoRefreshBtn')).toBeVisible();

    // Demo → CDMX
    await page.locator('a.dataset-tab[href="/"]').click();
    await expect(page).toHaveURL(/datos-itam\.org\/?$|:8787\/?$|:8788\/?$|localhost[:\d]*\/?$/);
    await expect(page.locator('a.dataset-tab[href="/"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('a.dataset-tab[href="/"]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#kpi-total')).toBeVisible();
    await expect(page.locator('#kpi-salary')).toBeVisible();
  });
});
