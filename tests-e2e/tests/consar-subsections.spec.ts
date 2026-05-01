// Smoke E2E para 10 sub-secciones CONSAR (/consar/<slug>) — Phases A+B+C+D
// + sub-fase narrativa (cuatro capítulos, sin numeración visible).
// Cubre dos flujos:
//   1) Descubrimiento desde landing: card click → navega + sub-nav active.
//   2) Phase D específico: chart Chart.js multi-line en /consar/precios-gestion.
//
// Tests contra producción por defecto (PLAYWRIGHT_BASE_URL configurable).

import { test, expect } from '@playwright/test';

// Orden por capítulo narrativo:
//   cobertura · movimientos · inversión · precios
const ALL_SUBSECTIONS = [
  { slug: 'pea-cotizantes',        chapter: 'cobertura'    },
  { slug: 'cuentas-administradas', chapter: 'cobertura'    },
  { slug: 'comisiones',            chapter: 'movimientos'  },
  { slug: 'traspasos',             chapter: 'movimientos'  },
  { slug: 'flujos',                chapter: 'movimientos'  },
  { slug: 'activo-neto',           chapter: 'inversion'    },
  { slug: 'rendimientos',          chapter: 'inversion'    },
  { slug: 'sensibilidad',          chapter: 'inversion'    },
  { slug: 'precios-bolsa',         chapter: 'precios'      },
  { slug: 'precios-gestion',       chapter: 'precios'      },
] as const;

test.describe('CONSAR sub-secciones · Phases A+B+C+D', () => {
  test('landing card discovery → 4 capítulos, click navega a sub-sección con sub-nav active', async ({ page }) => {
    await page.goto('/consar', { waitUntil: 'networkidle' });

    // Sub-nav nivel-2 agrupado en 4 capítulos
    const groups = page.locator('nav.consar-subnav .consar-subnav-group');
    await expect(groups).toHaveCount(4);
    const chapterLabels = await page.locator('.consar-subnav-chapter').allTextContents();
    expect(chapterLabels).toEqual([
      'Cobertura del sistema',
      'Movimientos de los afiliados',
      'Inversión y desempeño',
      'Precios diarios',
    ]);

    // 11 pills totales (overview + 10 sub-secciones)
    const pills = page.locator('nav.consar-subnav a.consar-subnav-pill');
    await expect(pills).toHaveCount(11);

    // En landing, pill 'Recursos SAR' (overview) está activo dentro del primer grupo
    const overviewPill = page.locator('nav.consar-subnav a.consar-subnav-pill[href="/consar"]');
    await expect(overviewPill).toHaveClass(/\bactive\b/);

    // Click primera card del capítulo Cobertura (PEA · cotizantes)
    const firstCard = page.locator('a.consar-dataset-card[href="/consar/pea-cotizantes"]');
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page).toHaveURL(/\/consar\/pea-cotizantes\/?$/);

    // Sub-sección rendea: header + sub-nav active pill + main hero
    const activePill = page.locator('nav.consar-subnav a.consar-subnav-pill.active');
    await expect(activePill).toHaveAttribute('href', '/consar/pea-cotizantes');
    await expect(page.locator('main.container section.hero h1')).toBeVisible();
  });

  test('cada una de las 10 sub-secciones responde 200 con shell + sub-nav agrupado', async ({ request }) => {
    for (const item of ALL_SUBSECTIONS) {
      const res = await request.get(`/consar/${item.slug}`);
      expect(res.status(), `GET /consar/${item.slug}`).toBe(200);
      const html = await res.text();
      expect(html, `sub-nav missing in /consar/${item.slug}`).toContain('class="consar-subnav"');
      expect(html, `chapter group missing in /consar/${item.slug}`).toContain('consar-subnav-group');
      expect(html, `header brand missing in /consar/${item.slug}`).toContain('header-brand');
      // Active pill apunta a la sub-sección correcta
      expect(html, `active pill missing for /consar/${item.slug}`).toContain(`href="/consar/${item.slug}" class="consar-subnav-pill active"`);
    }
  });

  test('Phase D · /consar/precios-gestion rendea snapshot KPIs + chart canvas comparativo', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/consar/precios-gestion', { waitUntil: 'networkidle' });

    // Sub-nav active = precios-gestion
    const activePill = page.locator('nav.consar-subnav a.consar-subnav-pill.active');
    await expect(activePill).toHaveAttribute('href', '/consar/precios-gestion');

    // Hero + caveats S13 (mención factual del diferencial empírico inbursa × sb 95-99)
    await expect(page.locator('section.hero h1')).toContainText('Precio gestión');
    await expect(page.locator('aside.consar-hero-caveats')).toBeVisible();

    // Sección A snapshot: 4 KPIs + tabla
    await expect(page.locator('#pg-snap-kpi-n')).toBeVisible();
    await expect(page.locator('#pg-snap-kpi-afores')).toBeVisible();
    await expect(page.locator('#pg-snap-kpi-max')).toBeVisible();
    await expect(page.locator('#pg-snap-kpi-min')).toBeVisible();

    // Sección C comparativo: chart canvas inicializa con dimensiones non-zero
    const chart = page.locator('#pg-cmp-chart');
    await expect(chart).toBeVisible({ timeout: 15_000 });
    // Chart.js carga async desde CDN + fetch async; espera a que las dimensiones se asignen
    await expect.poll(
      async () => {
        return await chart.evaluate((el: HTMLCanvasElement) => el.width);
      },
      { timeout: 20_000, message: 'chart canvas width nunca > 0 (Chart.js no inicializó)' },
    ).toBeGreaterThan(0);

    // Live badge se activa cuando los fetches completan
    await expect(page.locator('#consarLiveBadge')).toHaveClass(/\bactive\b/, { timeout: 20_000 });

    // No JS errors fatales
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
