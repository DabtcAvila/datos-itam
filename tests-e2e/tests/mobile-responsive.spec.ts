import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

test.use({ viewport: { width: 375, height: 667 } });

test.fail(
  'Mobile responsive at 375x667 — no horizontal overflow, charts stacked, nav accessible',
  async ({ page }, testInfo) => {
    // =========================================================================
    // KNOWN BUG documented S8.5, pending fix in S8.6 (CSS mobile hardening).
    // =========================================================================
    // Root cause: `.charts-grid` uses `grid-template-columns:
    //   repeat(auto-fit, minmax(420px, 1fr))` without a sub-450px media query.
    // At viewport 375px the `minmax(420px, ...)` clause forces columns
    // ≥420px, so `.chart-card` elements overflow the viewport:
    //
    //   page     clientWidth   scrollWidth   overflow
    //   /            375           516        +141px
    //   /enigh       375           464         +89px
    //
    // This test is marked `test.fail()` to keep CI green while documenting
    // the bug inside the test suite. When S8.6 lands the CSS fix, this test
    // will PASS and Playwright will report "unexpected pass" — a loud signal
    // that the `test.fail()` annotation must be removed (revert to `test()`).
    // =========================================================================

    const screenshotsDir = join(testInfo.project.testDir!, '..', 'screenshots');
    mkdirSync(screenshotsDir, { recursive: true });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: join(screenshotsDir, 'mobile-overflow-cdmx.png'),
      fullPage: true,
    });

    await page.goto('/enigh', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: join(screenshotsDir, 'mobile-overflow-enigh.png'),
      fullPage: true,
    });

    const cdmxTab = page.locator('a.dataset-tab[href="/"]');
    const enighTab = page.locator('a.dataset-tab[href="/enigh"]');
    await expect(cdmxTab).toBeVisible();
    await expect(enighTab).toBeVisible();

    const sexoCanvas = page.locator('#enighSexoChart');
    const edadCanvas = page.locator('#enighEdadChart');
    await sexoCanvas.scrollIntoViewIfNeeded();
    const sexoBox = await sexoCanvas.boundingBox();
    const edadBox = await edadCanvas.boundingBox();
    expect(sexoBox, 'sexo canvas has no bounding box').not.toBeNull();
    expect(edadBox, 'edad canvas has no bounding box').not.toBeNull();

    const sexoBottom = sexoBox!.y + sexoBox!.height;
    expect(
      edadBox!.y,
      `demografía charts not stacked vertically: sexo bottom=${sexoBottom}, edad top=${edadBox!.y}`,
    ).toBeGreaterThanOrEqual(sexoBottom - 2);

    expect(sexoBox!.width).toBeLessThan(375);
    expect(edadBox!.width).toBeLessThan(375);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      scrollWidth,
      `horizontal overflow detected at 375px: scrollWidth=${scrollWidth} > clientWidth=${clientWidth}. See screenshots/mobile-overflow-{cdmx,enigh}.png.`,
    ).toBeLessThanOrEqual(clientWidth + 1);
  },
);
