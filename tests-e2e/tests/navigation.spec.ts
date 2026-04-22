import { test, expect } from '@playwright/test';

test.describe('Navigation between CDMX and ENIGH tabs', () => {
  test('tab switch CDMX → ENIGH → CDMX updates URL, active state, and content', async ({ page }) => {
    await page.goto('/');

    const cdmxTab = page.locator('a.dataset-tab[href="/"]');
    const enighTab = page.locator('a.dataset-tab[href="/enigh"]');

    await expect(cdmxTab).toBeVisible();
    await expect(enighTab).toBeVisible();
    await expect(cdmxTab).toHaveAttribute('aria-current', 'page');
    await expect(enighTab).toHaveAttribute('aria-current', 'false');
    await expect(cdmxTab).toHaveClass(/\bactive\b/);

    await enighTab.click();

    await expect(page).toHaveURL(/\/enigh\/?$/);
    const enighTabAfter = page.locator('a.dataset-tab[href="/enigh"]');
    await expect(enighTabAfter).toHaveAttribute('aria-current', 'page');
    await expect(enighTabAfter).toHaveClass(/\bactive\b/);

    await expect(page.locator('#enigh-kpi-hogares-muestra')).toBeVisible();
    await expect(page.locator('#enigh-kpi-hogares-exp')).toBeVisible();
    await expect(page.locator('#enigh-kpi-ing-mes')).toBeVisible();
    await expect(page.locator('#enigh-kpi-gas-mes')).toBeVisible();

    const cdmxTabBack = page.locator('a.dataset-tab[href="/"]');
    await cdmxTabBack.click();

    await expect(page).toHaveURL(/datos-itam\.org\/?$/);
    const cdmxTabAfter = page.locator('a.dataset-tab[href="/"]');
    await expect(cdmxTabAfter).toHaveAttribute('aria-current', 'page');
    await expect(cdmxTabAfter).toHaveClass(/\bactive\b/);

    await expect(page.locator('#kpi-total')).toBeVisible();
    await expect(page.locator('#kpi-salary')).toBeVisible();
  });
});
