import { test, expect, request as playwrightRequest } from '@playwright/test';

const API_BASE = 'https://api.datos-itam.org';
const FRONTEND_ORIGIN = 'https://datos-itam.org';

// ---------------------------------------------------------------------
// SSR-only tests (no API requests del browser — corren igual local + prod)
// ---------------------------------------------------------------------

test.describe('Demo (HR/payroll) — estructura SSR', () => {
  test('GET /demo retorna 200 con título y H1 empresariales', async ({ page }) => {
    const response = await page.goto('/demo');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Sistema de Bonos · Curso Bases de Datos ITAM 001/);
    await expect(page.locator('h1')).toHaveText('Sistema de gestión de bonos');
  });

  test('tab "Bonos" activa con aria-current=page', async ({ page }) => {
    await page.goto('/demo');
    const demoTab = page.locator('a.dataset-tab[href="/demo"]');
    await expect(demoTab).toBeVisible();
    await expect(demoTab).toHaveAttribute('aria-current', 'page');
    await expect(demoTab).toHaveClass(/\bactive\b/);
    await expect(demoTab.locator('.dataset-tab-title')).toHaveText('Bonos');
  });

  test('NO hay login form en el DOM (refactor S15.2)', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('#loginPanel')).toHaveCount(0);
    await expect(page.locator('#loginForm')).toHaveCount(0);
    await expect(page.locator('#loginUser')).toHaveCount(0);
    await expect(page.locator('#loginPass')).toHaveCount(0);
  });

  test('4 KPIs estructurales presentes con etiquetas correctas', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('#kpi-empleados')).toBeVisible();
    await expect(page.locator('#kpi-reclamados')).toBeVisible();
    await expect(page.locator('#kpi-distribuido')).toBeVisible();
    await expect(page.locator('#kpi-nomina')).toBeVisible();
    await expect(page.locator('#kpi-empleados .demo-kpi-label')).toHaveText(/Empleados activos/i);
    await expect(page.locator('#kpi-reclamados .demo-kpi-label')).toHaveText(/Bonos reclamados/i);
    await expect(page.locator('#kpi-distribuido .demo-kpi-label')).toHaveText(/Monto distribuido/i);
    await expect(page.locator('#kpi-nomina .demo-kpi-label')).toHaveText(/Nómina diaria/i);
  });

  test('Tabla con 6 columnas y botón Refrescar', async ({ page }) => {
    await page.goto('/demo');
    const headers = page.locator('#demoTable thead th');
    await expect(headers).toHaveCount(6);
    await expect(headers.nth(0)).toHaveText(/^ID$/);
    await expect(headers.nth(1)).toHaveText(/Nombre completo/i);
    await expect(headers.nth(2)).toHaveText(/Rol/i);
    await expect(headers.nth(3)).toHaveText(/Sueldo diario/i);
    await expect(headers.nth(4)).toHaveText(/Bono \$50,000 MXN/i);
    await expect(headers.nth(5)).toHaveText(/Estado/i);
    await expect(page.locator('#demoRefreshBtn')).toBeVisible();
    await expect(page.locator('#demoRefreshBtn')).toContainText(/Refrescar tabla/i);
  });

  test('Sección "Cómo modificar" con 3 acciones link a /api/docs', async ({ page }) => {
    await page.goto('/demo');
    const howto = page.locator('section.demo-howto');
    await expect(howto).toBeVisible();
    await expect(howto.locator('h2')).toHaveText(/Cómo modificar datos/i);
    const actions = howto.locator('a.demo-action');
    await expect(actions).toHaveCount(3);
    // Cada link debe apuntar a api.datos-itam.org/docs
    const hrefs = await actions.evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    for (const href of hrefs) {
      expect(href).toMatch(/^https:\/\/api\.datos-itam\.org\/docs/);
    }
    // Verbos PUT, POST, DELETE presentes
    await expect(actions.locator('.verb-PUT')).toHaveCount(1);
    await expect(actions.locator('.verb-POST')).toHaveCount(1);
    await expect(actions.locator('.verb-DELETE')).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------
// Live tests (cliente JS hace fetch a api.datos-itam.org)
//   Solo corren cuando el target es prod (no local con CORS lockdown).
// ---------------------------------------------------------------------

const isProd = (process.env.PLAYWRIGHT_BASE_URL || 'https://datos-itam.org').includes('datos-itam.org');

test.describe('Demo (HR/payroll) — flujo live contra API prod', () => {
  test.skip(!isProd, 'Tests live requieren que el frontend esté desplegado en prod (CORS lockdown impide local)');

  test('KPIs se hidratan: total=12, formato monetario MXN', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('[data-kpi="total_empleados"]')).toHaveText('12', { timeout: 15_000 });
    // bonos puede ser 0..12 según estado; basta verificar que es un número
    await expect(page.locator('[data-kpi="bonos_reclamados"]')).toHaveText(/^\d+$/, { timeout: 15_000 });
    // monto distribuido formateado con $ (puede ser $0). Intl.NumberFormat es-MX
    // en Chromium emite "$X,XXX" sin sufijo "MXN" — el contexto MXN ya está
    // explícito en la cabecera de tabla y KPI labels.
    await expect(page.locator('[data-kpi="monto_distribuido_mxn"]')).toHaveText(/\$[\d,]+/, { timeout: 15_000 });
    // nomina diaria $37,975
    await expect(page.locator('[data-kpi="nomina_diaria_total_mxn"]')).toHaveText(/\$37,975/, { timeout: 15_000 });
  });

  test('Tabla se hidrata con 12 filas, 3 tipos de pill, y profesor primero', async ({ page }) => {
    await page.goto('/demo');
    const rows = page.locator('#demoTableBody tr');
    await expect(rows).toHaveCount(12, { timeout: 15_000 });

    // 3 colores de pill por tipo (1 profesor + 4 equipo + 7 estudiante)
    await expect(page.locator('#demoTableBody .pill--profesor')).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator('#demoTableBody .pill--equipo')).toHaveCount(4);
    await expect(page.locator('#demoTableBody .pill--estudiante')).toHaveCount(7);

    // Primera fila: profesor (Vasquez Beltrán)
    const firstRow = rows.first();
    await expect(firstRow).toContainText('VASQUEZ BELTRAN');
    await expect(firstRow.locator('.pill--profesor')).toBeVisible();

    // Sueldo formateado con $ y 2 decimales en cada fila (col 4 ahora, post-ID).
    // Chromium es-MX produce "$X,XXX.XX" sin sufijo "MXN" — el contexto MXN
    // está explícito en el TH "Sueldo diario" y en los headers globales.
    const sueldos = await rows.locator('td.num').allTextContents();
    expect(sueldos).toHaveLength(12);
    for (const s of sueldos) {
      expect(s).toMatch(/\$[\d,]+\.\d{2}/);
    }
    // Cada fila debe mostrar su ID en la primera celda (formato #N)
    const ids = await rows.locator('td.id-cell').allTextContents();
    expect(ids).toHaveLength(12);
    for (const id of ids) {
      expect(id).toMatch(/^#\d{1,2}$/);
    }
  });

  test('Botón Refrescar gatilla nuevo fetch (timestamp se actualiza)', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('#demoTableBody tr')).toHaveCount(12, { timeout: 15_000 });
    const firstStamp = await page.locator('#demoLastUpdate').textContent();
    expect(firstStamp).not.toBe('—');

    // Click refresh y esperar a que el timestamp cambie (puede coincidir si pasa <1s; usamos poll)
    await page.waitForTimeout(1100); // asegurar que el segundo cambia
    await page.locator('#demoRefreshBtn').click();
    await expect.poll(async () => await page.locator('#demoLastUpdate').textContent(), { timeout: 10_000 })
      .not.toBe(firstStamp);
  });
});

// ---------------------------------------------------------------------
// API direct test (corre con Origin header del config — no necesita browser)
// ---------------------------------------------------------------------

test.describe('Demo API — endpoints públicos S15.2', () => {
  test('GET /api/v1/demo/estudiantes responde 12 filas con sueldo + tipo + CORS', async () => {
    const ctx = await playwrightRequest.newContext({
      baseURL: API_BASE,
      extraHTTPHeaders: { Origin: FRONTEND_ORIGIN },
    });
    const response = await ctx.get('/api/v1/demo/estudiantes');
    expect(response.status()).toBe(200);
    const acao = response.headers()['access-control-allow-origin'];
    expect(acao).toBe(FRONTEND_ORIGIN);

    const body = await response.json();
    expect(body.count).toBe(12);
    expect(body.estudiantes).toHaveLength(12);
    // Cada fila tiene los nuevos campos
    for (const e of body.estudiantes) {
      expect(e).toHaveProperty('sueldo_diario_mxn');
      expect(e).toHaveProperty('tipo');
      expect(['profesor', 'equipo', 'estudiante']).toContain(e.tipo);
    }
    // Conteos por tipo
    const byTipo = (t: string) => body.estudiantes.filter((e: { tipo: string }) => e.tipo === t).length;
    expect(byTipo('profesor')).toBe(1);
    expect(byTipo('equipo')).toBe(4);
    expect(byTipo('estudiante')).toBe(7);
    // Primera fila (orden API): profesor con sueldo más alto
    expect(body.estudiantes[0].tipo).toBe('profesor');
    expect(parseFloat(body.estudiantes[0].sueldo_diario_mxn)).toBe(4500);

    await ctx.dispose();
  });

  test('GET /api/v1/demo/resumen retorna KPIs con bono_unitario=50000 y nomina=37975', async () => {
    const ctx = await playwrightRequest.newContext({
      baseURL: API_BASE,
      extraHTTPHeaders: { Origin: FRONTEND_ORIGIN },
    });
    const response = await ctx.get('/api/v1/demo/resumen');
    expect(response.status()).toBe(200);
    const acao = response.headers()['access-control-allow-origin'];
    expect(acao).toBe(FRONTEND_ORIGIN);
    const vary = response.headers()['vary'] || '';
    expect(vary.toLowerCase()).toContain('origin');

    const body = await response.json();
    expect(body.total_empleados).toBe(12);
    expect(body.bono_unitario_mxn).toBe(50_000);
    expect(body.monto_total_posible_mxn).toBe(600_000);
    expect(parseFloat(body.nomina_diaria_total_mxn)).toBe(37975);
    // Identidad: distribuido + disponible = total_posible
    expect(body.monto_distribuido_mxn + body.monto_disponible_mxn).toBe(body.monto_total_posible_mxn);

    await ctx.dispose();
  });

  test('PUT /toggle-bono sin auth sigue retornando 401 (auth no se rompió)', async () => {
    const ctx = await playwrightRequest.newContext({
      baseURL: API_BASE,
      extraHTTPHeaders: { Origin: FRONTEND_ORIGIN },
    });
    const response = await ctx.put('/api/v1/demo/estudiantes/2/toggle-bono');
    expect(response.status()).toBe(401);
    await ctx.dispose();
  });
});
