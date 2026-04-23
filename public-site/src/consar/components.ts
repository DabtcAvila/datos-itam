import { CONSAR_SEED } from './seed';

// ---------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------

export function formatMm(n: number): string {
  // millones MXN → 10,127,978.75 mm MXN or short (bill)
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' mm';
}

export function formatBill(mm: number): string {
  // Converts millones → billones for headline display; 10127978.75 → $10.13 bill
  const bill = mm / 1_000_000; // 1 bill = 10^6 mm MXN
  return '$' + bill.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bill';
}

export function formatN(n: number): string {
  return n.toLocaleString('es-MX');
}

export function formatPct(n: number, decimals: number = 2): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
}

function buildCaveat(opts: {
  unidad: string;
  fuente: string;
  fuenteUrl?: string;
  metodologia: string;
  validado: string;
}): string {
  const fuenteLink = opts.fuenteUrl
    ? `<a href="${opts.fuenteUrl}" target="_blank" rel="noopener">${opts.fuente}</a>`
    : opts.fuente;
  return `
    <div class="caveat">
      <div class="caveat-row"><strong>Unidad:</strong> ${opts.unidad}</div>
      <div class="caveat-row"><strong>Fuente:</strong> ${fuenteLink}</div>
      <div class="caveat-row"><strong>Metodología:</strong> ${opts.metodologia}</div>
      <div class="caveat-row"><strong>Validado:</strong> ${opts.validado} (SSR seed) · refresh vía fetch al montar</div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------

export function buildConsarHero(): string {
  const d = CONSAR_SEED.d1;
  const buildDateFmt = new Date(CONSAR_SEED.buildDate).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  return `
    <section class="hero">
      <div class="hero-content">
        <p class="hero-text">
          El <strong>sistema de ahorro para el retiro mexicano</strong> en serie mensual pública:
          ${formatN(d.nPuntos)} meses entre mayo 1998 y junio 2025, ${d.nAfores} administradoras
          (AFOREs), 15 conceptos de recurso. Este dashboard consume los endpoints
          <code>/api/v1/consar/*</code> del observatorio — datos originales CONSAR publicados vía
          <a href="https://datos.gob.mx" target="_blank" rel="noopener">datos.gob.mx</a>
          (CC-BY-4.0), ingestados al peso.
        </p>
        <div class="hero-badges">
          <span class="hero-badge">SAR actual: ${formatBill(d.sarTotalMm)} MXN</span>
          <span class="hero-badge">27 años · ${d.nPuntos} meses</span>
          <span class="hero-badge">${d.nAfores} AFOREs · 7 dashboards</span>
        </div>
        <p class="enigh-seed-note">
          Cifras validadas contra API el <strong>${buildDateFmt}</strong>. Se refrescan vía fetch al cargar esta página.
          <br><strong>Nota metodológica clave</strong>: todas las cifras están en
          <em>millones de pesos MXN corrientes</em> (no deflactados). Comparaciones históricas requieren deflactar
          con INPC 2018=100 INEGI. El SAR Total es la suma de 8 componentes contables — la identidad cierra
          al peso en 98.83% de las observaciones históricas y en <strong>100% de los meses 2020+</strong>.
        </p>
      </div>
    </section>
  `;
}

// ==================== D1 — Serie total SAR ====================

export function buildD1_Totales(): string {
  const d = CONSAR_SEED.d1;
  return `
    <section class="enigh-section" id="d1-totales">
      <h2 class="section-title">1 · El sistema en perspectiva — 27 años, ${formatN(d.nPuntos)} observaciones mensuales</h2>
      <p class="section-intro">
        Los recursos registrados en el SAR pasaron de <strong>${formatMm(d.primerValorMm)} MXN</strong> en mayo 1998
        (6 AFOREs operando) a <strong>${formatBill(d.sarTotalMm)} MXN</strong> en junio 2025
        (${d.nAfores} AFOREs). Un crecimiento nominal de <strong>${d.crecimientoNominalX.toFixed(0)}×</strong> en 27 años —
        cifra antes de descontar inflación. El objeto: qué tan grande es el sistema, en qué momento creció más.
      </p>

      <div class="kpis">
        <div class="kpi kpi--blue">
          <div class="kpi-label">SAR Nacional hoy</div>
          <div class="kpi-value" id="d1-kpi-sar-total" data-target="${d.sarTotalMm}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">Junio 2025 · ${d.nAfores} AFOREs reportando</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">Cobertura temporal</div>
          <div class="kpi-value" id="d1-kpi-n-puntos" data-target="${d.nPuntos}" data-suffix=" meses">0 meses</div>
          <div class="kpi-sub">Mayo 1998 → Junio 2025</div>
        </div>
        <div class="kpi kpi--purple">
          <div class="kpi-label">Crecimiento nominal</div>
          <div class="kpi-value" id="d1-kpi-crecimiento" data-target="${d.crecimientoNominalX}" data-suffix="×" data-decimals="0">0×</div>
          <div class="kpi-sub">Desde ${formatMm(d.primerValorMm)} (1998-05) · no deflactado</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Recursos registrados en el SAR — serie mensual 1998-2025</h3>
        <div class="chart-wrapper">
          <canvas id="d1Chart" role="img" aria-label="Gráfico de línea del crecimiento del SAR nacional mes a mes desde mayo 1998 hasta junio 2025"></canvas>
        </div>
        <p class="chart-note">
          El crecimiento no es lineal: se acelera post-reforma ISSSTE 2008 (cuando ingresa la masa pública al sistema),
          se desacelera en 2020-2021 (pandemia), retoma ritmo post-2022. Las barras suelen mostrar composición, pero
          aquí el foco es el <strong>tamaño agregado</strong> del sistema — la composición se detalla en D2.
        </p>
      </div>

      ${buildCaveat({
        unidad: 'Millones de pesos MXN corrientes (suma mensual sobre 11 AFOREs)',
        fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
        fuenteUrl: CONSAR_SEED.sourceConsar.url,
        metodologia: 'SUM(monto_mxn_mm) FILTER (tipo_recurso.codigo = sar_total) GROUP BY fecha',
        validado: CONSAR_SEED.buildDate,
      })}
    </section>
  `;
}

// ==================== D2 — DESTACADO: Composición SAR ====================

export function buildD2_Composicion(): string {
  const d = CONSAR_SEED.d2;
  const top = CONSAR_SEED.d2.componentes;

  // Legend rows: una fila por componente con color, nombre, %, monto
  const legendRows = top.map((c, i) => `
    <tr class="consar-donut-legend-row" data-idx="${i}">
      <td><span class="consar-donut-swatch" data-idx="${i}"></span></td>
      <td class="consar-donut-nombre">${c.nombre}</td>
      <td class="num"><strong>${c.pct.toFixed(2)}%</strong></td>
      <td class="num">${formatMm(c.montoMm)}</td>
    </tr>
  `).join('');

  return `
    <section class="enigh-section enigh-section--featured" id="d2-composicion">
      <div class="enigh-section-featured-eyebrow">Dashboard destacado · identidad contable verificada al peso</div>
      <h2 class="section-title">2 · ¿De qué se compone el SAR? Los 8 componentes contables</h2>
      <p class="section-intro">
        El SAR Total no es una sola cuenta — es la suma de <strong>8 componentes</strong> con propósitos y reglas
        distintas. Este dashboard descompone los
        <strong>${formatBill(d.sarTotalReportadoMm)} MXN</strong> que el sistema administra al cierre de junio 2025,
        y muestra que la suma de componentes cierra al peso contra el total reportado por CONSAR
        (Δ = ${d.deltaAbsMm} mm MXN).
      </p>

      <div class="consar-donut-wrapper">
        <div class="consar-donut-chart-col">
          <div class="consar-donut-centered-headline">
            <div class="consar-donut-eyebrow">SAR Nacional · junio 2025</div>
            <div class="consar-donut-headline">${formatBill(d.sarTotalReportadoMm)}</div>
            <div class="consar-donut-sub">MXN corrientes · ${d.componentes.length} componentes</div>
          </div>
          <div class="chart-wrapper chart-wrapper--donut">
            <canvas id="d2Chart" role="img" aria-label="Gráfico de dona mostrando los 8 componentes contables del SAR mexicano, encabezados por RCV-IMSS 61.78% y Vivienda 23.66%"></canvas>
          </div>
        </div>

        <div class="consar-donut-legend-col">
          <h3 class="consar-donut-legend-title">Desglose contable</h3>
          <div class="table-wrap">
            <table class="consar-donut-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Componente</th>
                  <th class="num">% SAR</th>
                  <th class="num">Monto</th>
                </tr>
              </thead>
              <tbody id="d2-legend-tbody">
                ${legendRows}
              </tbody>
              <tfoot>
                <tr>
                  <td></td>
                  <td><strong>Suma 8 componentes</strong></td>
                  <td class="num"><strong>≈ 100%</strong></td>
                  <td class="num"><strong>${formatMm(d.suma8ComponentesMm)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Callout principal — patrón S9 D2 (headline eyebrow + body) -->
      <div class="comparativo-headline">
        <div class="comparativo-headline-eyebrow">Identidad contable cierra al peso</div>
        <div class="comparativo-headline-body">
          La suma de los 8 componentes del SAR reproduce el total reportado con diferencia
          <strong>${d.deltaAbsMm} mm MXN</strong>
          en junio 2025 — menos de <em>cinco centavos</em> sobre diez billones de pesos. No es estimación,
          es identidad contable CONSAR verificada empíricamente en las 2,911 observaciones del CSV oficial.
        </div>
      </div>

      <!-- 3 caveats numerados — patrón S9 D3 (comparativo-caveats-expanded) -->
      <div class="comparativo-caveats-expanded">
        <div class="comparativo-caveats-expanded-title">Tres caveats que forman parte del mensaje</div>
        <ol>
          <li>
            <strong>Identidad al peso en 98.83% de las filas históricas, 100% en 2020+.</strong>
            De las 2,911 observaciones con <code>sar_total</code> reportado en el CSV oficial, 2,877 cierran al peso
            (Δ ≤ 0.05 mm MXN); 99.52% cierran dentro de 0.5%; cota superior 2.36% (un único caso). Esto hace que la
            identidad sea defendible cuantitativamente, no nominalmente.
          </li>
          <li>
            <strong>Residuo 100% concentrado en XXI-Banorte 2010-2012 (24 filas).</strong>
            Las únicas desviaciones mayores a 0.05 mm corresponden a XXI-Banorte entre 2010 y 2012, probable artefacto
            transitorio tras la introducción del rubro <code>fondos_prevision_social</code> en febrero 2009 (exclusivo
            de esta AFORE). El endpoint <code>/composicion</code> expone <code>delta_abs_mm</code> y
            <code>cierre_al_peso: boolean</code> por fecha para que cualquier consumidor pueda auditarlo.
          </li>
          <li>
            <strong>Byte-exact replicado en dos bases de datos.</strong>
            La ingesta reproduce el CSV oficial al bit: MD5 del CSV original
            <code>${CONSAR_SEED.sourceConsar.md5}</code> coincide con la reconstrucción pivot largo→ancho desde PostgreSQL
            local y desde Neon serverless. No es "aproximadamente igual" — es el mismo archivo reconstruido desde
            distintas bases de datos.
          </li>
        </ol>
      </div>

      ${buildCaveat({
        unidad: 'Millones de pesos MXN corrientes; % del SAR Total junio 2025',
        fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0) · endpoint /api/v1/consar/recursos/composicion',
        fuenteUrl: CONSAR_SEED.sourceConsar.url,
        metodologia: 'SUM por tipo_recurso.codigo filtrando los 8 componentes de la identidad; delta contra sar_total reportado.',
        validado: CONSAR_SEED.buildDate,
      })}
    </section>
  `;
}

// ==================== D3 — Concentración por AFORE ====================

export function buildD3_Concentracion(): string {
  const d = CONSAR_SEED.d3;
  const rows = d.afores.map(a => `
    <tr>
      <td><strong>${a.nombre}</strong></td>
      <td class="num">${formatMm(a.sarTotalMm)}</td>
      <td class="num"><strong>${a.pctSistema.toFixed(2)}%</strong></td>
    </tr>
  `).join('');

  return `
    <section class="enigh-section" id="d3-concentracion">
      <h2 class="section-title">3 · Concentración del SAR — el Top 4 controla dos tercios del sistema</h2>
      <p class="section-intro">
        De las ${d.afores.length} AFOREs que operan en el SAR a junio 2025, las cuatro más grandes concentran
        <strong>${d.top4PctSistema.toFixed(1)}%</strong> de los recursos totales. El resto se distribuye en
        7 administradoras con tamaños muy desiguales — desde Coppel (7.9%) hasta Pensión Bienestar (0.30%,
        incorporada apenas en julio 2024).
      </p>

      <div class="kpis">
        <div class="kpi kpi--blue">
          <div class="kpi-label">Top 4 combinadas</div>
          <div class="kpi-value" id="d3-kpi-top4" data-target="${d.top4PctSistema}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">Profuturo + XXI-Banorte + Banamex + SURA</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">Líder individual</div>
          <div class="kpi-value" id="d3-kpi-lider" data-target="${d.afores[0].pctSistema}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">Profuturo · ${formatBill(d.afores[0].sarTotalMm)} MXN</div>
        </div>
        <div class="kpi kpi--purple">
          <div class="kpi-label">Última (Pensión Bienestar)</div>
          <div class="kpi-value" id="d3-kpi-ultima" data-target="${d.afores[d.afores.length - 1].pctSistema}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">Ingresó julio 2024 · serie corta</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Recursos SAR por AFORE — junio 2025</h3>
        <div class="chart-wrapper">
          <canvas id="d3Chart" role="img" aria-label="Gráfico de barras horizontal ordenado de mayor a menor con los recursos SAR de las 11 AFOREs a junio 2025"></canvas>
        </div>
      </div>

      <div class="table-section">
        <h3>Tabla de referencia — ${d.afores.length} AFOREs ordenadas por tamaño</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>AFORE</th>
                <th class="num">Recursos SAR</th>
                <th class="num">% Sistema</th>
              </tr>
            </thead>
            <tbody id="d3-afores-tbody">
              ${rows}
            </tbody>
          </table>
        </div>
      </div>

      ${buildCaveat({
        unidad: 'Millones MXN corrientes · junio 2025 snapshot',
        fuente: 'endpoint /api/v1/consar/recursos/por-afore?fecha=2025-06',
        fuenteUrl: CONSAR_SEED.sourceConsar.url,
        metodologia: 'MAX(sar_total_mm) por afore_id en la fecha. pct_sistema = sar_total / SUM(sar_total).',
        validado: CONSAR_SEED.buildDate,
      })}
    </section>
  `;
}

// ==================== D4 — IMSS vs ISSSTE ====================

export function buildD4_ImssVsIssste(): string {
  const d = CONSAR_SEED.d4;
  return `
    <section class="enigh-section" id="d4-imss-vs-issste">
      <h2 class="section-title">4 · Trabajadores privados (RCV-IMSS) vs públicos (RCV-ISSSTE) — dos pistas, un mismo sistema</h2>
      <p class="section-intro">
        El SAR administra dos regímenes paralelos: cuentas <strong>RCV-IMSS</strong> de trabajadores del sector
        privado (afiliados al IMSS) y cuentas <strong>RCV-ISSSTE</strong> de trabajadores del sector público (reportadas
        consistentemente desde diciembre 2008, con la reforma ISSSTE). Aunque todas las AFOREs manejan ambos tipos,
        la diferencia de escala es enorme: RCV-ISSSTE representa <strong>${(d.ratioIssteSobreImss * 100).toFixed(2)}%</strong>
        del tamaño de RCV-IMSS.
      </p>

      <div class="kpis">
        <div class="kpi kpi--blue">
          <div class="kpi-label">RCV-IMSS (privados) hoy</div>
          <div class="kpi-value" id="d4-kpi-imss" data-target="${d.rcvImssMmActual}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">${formatPct(d.pctImssDelSar, 2)} del SAR total</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">RCV-ISSSTE (públicos) hoy</div>
          <div class="kpi-value" id="d4-kpi-issste" data-target="${d.rcvIssteMmActual}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">${formatPct(d.pctIssteDelSar, 2)} del SAR total · arranca 2008-12</div>
        </div>
        <div class="kpi kpi--yellow">
          <div class="kpi-label">Ratio ISSSTE / IMSS</div>
          <div class="kpi-value" id="d4-kpi-ratio" data-target="${d.ratioIssteSobreImss * 100}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">Los recursos del SAR público son ~12% del privado</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Serie paralela 1998-2025 — RCV-IMSS vs RCV-ISSSTE</h3>
        <div class="chart-wrapper">
          <canvas id="d4Chart" role="img" aria-label="Gráfico de línea dual con la serie histórica de recursos RCV-IMSS y RCV-ISSSTE"></canvas>
        </div>
        <p class="chart-note">
          La línea ISSSTE aparece desde diciembre 2008 (reforma que creó cuentas individuales para trabajadores públicos).
          Antes de esa fecha el SAR era sustancialmente un sistema privado — la reforma ISSSTE expandió el alcance
          del aparato, pero el volumen relativo sigue siendo una fracción del componente privado.
        </p>
      </div>

      ${buildCaveat({
        unidad: 'Millones MXN corrientes; serie mensual',
        fuente: 'endpoint /api/v1/consar/recursos/imss-vs-issste',
        fuenteUrl: CONSAR_SEED.sourceConsar.url,
        metodologia: 'SUM por fecha separando tipo_recurso ∈ {rcv_imss, rcv_issste}. Gaps en ISSSTE pre-2008-12 son null, no cero.',
        validado: CONSAR_SEED.buildDate,
      })}
    </section>
  `;
}

// ==================== D5 — Vivienda (pilar olvidado) ====================

export function buildD5_Vivienda(): string {
  const d = CONSAR_SEED.d5;
  return `
    <section class="enigh-section" id="d5-vivienda">
      <h2 class="section-title">5 · Vivienda — el pilar olvidado del ahorro pensional mexicano</h2>
      <p class="section-intro">
        Cuando se habla del "ahorro para el retiro" en México, la discusión tiende a concentrarse en las cuentas
        RCV y el ahorro voluntario. Pero <strong>${formatPct(d.pctDelSar, 2)}</strong> del SAR —
        <strong>${formatMm(d.viviendaMmActual)} MXN</strong> — son recursos de vivienda (INFONAVIT +
        FOVISSSTE). Son <strong>${d.vivienda_vs_ahorro_voluntario_X.toFixed(1)}×</strong> el ahorro voluntario
        nacional, y crecieron <strong>${d.crecimientoViviendaX.toFixed(0)}×</strong> en términos nominales desde 1998.
      </p>

      <div class="kpis">
        <div class="kpi kpi--blue">
          <div class="kpi-label">Vivienda hoy (INFONAVIT + FOVISSSTE)</div>
          <div class="kpi-value" id="d5-kpi-vivienda" data-target="${d.viviendaMmActual}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">${formatPct(d.pctDelSar, 2)} del SAR total</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">Vivienda vs Ahorro Voluntario</div>
          <div class="kpi-value" id="d5-kpi-ratio-voluntario" data-target="${d.vivienda_vs_ahorro_voluntario_X}" data-suffix="×" data-decimals="1">0×</div>
          <div class="kpi-sub">${formatMm(d.viviendaMmActual)} vs ${formatMm(d.ahorroVolSolMmActual)} (vol+sol)</div>
        </div>
        <div class="kpi kpi--purple">
          <div class="kpi-label">Crecimiento nominal histórico</div>
          <div class="kpi-value" id="d5-kpi-crecimiento" data-target="${d.crecimientoViviendaX}" data-suffix="×" data-decimals="0">0×</div>
          <div class="kpi-sub">Desde ${formatMm(d.primerValorVivienda)} en 1998-05</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Serie histórica de recursos de Vivienda — 1998-2025</h3>
        <div class="chart-wrapper">
          <canvas id="d5Chart" role="img" aria-label="Gráfico de línea del crecimiento de los recursos de Vivienda (INFONAVIT + FOVISSSTE) desde 1998-05 hasta 2025-06"></canvas>
        </div>
        <p class="chart-note">
          Vivienda no es "ahorro retiro" en sentido estricto: es una subcuenta destinada a crédito habitacional
          (INFONAVIT para afiliados IMSS, FOVISSSTE para ISSSTE) que el trabajador puede movilizar o consumir antes
          de la jubilación. Pero forma parte de los <em>recursos registrados en el SAR</em> que reporta CONSAR, y
          su peso sistémico obliga a incluirlo en cualquier análisis pensional serio.
        </p>
      </div>

      <div class="insights">
        <h3 class="insights-title">Magnitudes comparadas</h3>
        <div class="insights-grid">
          <div class="insight">
            <span class="insight-icon">&#9679;</span>
            <span><strong>${d.vivienda_vs_ahorro_voluntario_X.toFixed(1)}× más grande que el ahorro voluntario + solidario.</strong>
            Las aportaciones voluntarias son marginales frente al ahorro forzado de vivienda — la discusión pública sobre
            "educación financiera y ahorro voluntario" se enmarca en una asimetría estructural.</span>
          </div>
          <div class="insight">
            <span class="insight-icon">&#9679;</span>
            <span><strong>~${d.vivienda_vs_capital_X.toFixed(0)}× el capital propio de las AFOREs ($${formatN(d.capitalAforesMm)} mm).</strong>
            El capital operativo de las administradoras es pequeño comparado con los recursos del sistema de vivienda
            que también entran al conteo SAR — recordatorio de que el SAR es un conjunto amplio, no sólo cuentas RCV.</span>
          </div>
          <div class="insight">
            <span class="insight-icon">&#9679;</span>
            <span><strong>Identidad contable: vivienda = INFONAVIT + FOVISSSTE</strong> — verificada al peso en cada mes de la serie.
            Los endpoints exponen ambos subcomponentes por separado vía <code>/recursos/por-componente</code>.</span>
          </div>
        </div>
      </div>

      ${buildCaveat({
        unidad: 'Millones MXN corrientes · serie mensual nacional (11 AFOREs)',
        fuente: 'endpoint /api/v1/consar/recursos/serie?codigo=vivienda',
        fuenteUrl: CONSAR_SEED.sourceConsar.url,
        metodologia: 'SUM(monto) donde tipo_recurso.codigo = vivienda, agrupado por fecha. vivienda es subcuenta agregada INFONAVIT + FOVISSSTE.',
        validado: CONSAR_SEED.buildDate,
      })}
    </section>
  `;
}

// ==================== D6 — Pensión Bienestar (la nueva) ====================

export function buildD6_PensionBienestar(): string {
  const d = CONSAR_SEED.d6;
  return `
    <section class="enigh-section" id="d6-pension-bienestar">
      <h2 class="section-title">6 · Pensión Bienestar — la AFORE más joven, ${d.nMeses} meses de datos</h2>
      <p class="section-intro">
        El <strong>Fondo de Pensiones para el Bienestar</strong> (identificado como "AFORE 9" en la nomenclatura
        administrativa CONSAR, pero conocido públicamente como Pensión Bienestar) ingresó al sistema SAR en
        <strong>julio 2024</strong>. Son 12 meses de datos públicos vía CONSAR, un punto por mes, con cobertura
        diferenciada — este régimen reporta sólo 2 de los 15 conceptos del SAR, no los 15.
      </p>

      <div class="kpis">
        <div class="kpi kpi--blue">
          <div class="kpi-label">Recursos registrados en SAR</div>
          <div class="kpi-value" id="d6-kpi-pb-total" data-target="${d.sarTotalMmActual}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">Junio 2025 · ${formatPct(d.pctDelSistema, 2)} del sistema total</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">Crecimiento en ${d.nMeses} meses</div>
          <div class="kpi-value" id="d6-kpi-pb-crecimiento" data-target="${d.crecimientoNominalPct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">Desde ${formatMm(d.primerValorMm)} en julio 2024</div>
        </div>
        <div class="kpi kpi--purple">
          <div class="kpi-label">Serie disponible</div>
          <div class="kpi-value" id="d6-kpi-pb-nmeses" data-target="${d.nMeses}" data-suffix=" puntos">0 puntos</div>
          <div class="kpi-sub">${d.fechaInicio} → ${d.fechaFin}</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Pensión Bienestar — serie mensual ${d.fechaInicio} a ${d.fechaFin}</h3>
        <div class="chart-wrapper">
          <canvas id="d6Chart" role="img" aria-label="Gráfico de línea de la serie corta de recursos SAR de Pensión Bienestar, 12 meses"></canvas>
        </div>
        <p class="chart-note">
          La serie es <strong>corta por construcción</strong>: la AFORE apenas opera desde mediados de 2024. El salto
          en junio 2025 (de $27,088 mm a $30,838 mm, +13.8% en un mes) sugiere una transferencia agregada — no es
          acumulación orgánica mes a mes. Conforme la serie crezca, el observatorio la actualizará sin necesidad de
          re-ingesta porque el endpoint <code>/recursos/serie?codigo=sar_total&amp;afore_codigo=pension_bienestar</code>
          la devuelve dinámicamente.
        </p>
      </div>

      ${buildCaveat({
        unidad: 'Millones MXN corrientes · 12 puntos mensuales',
        fuente: 'endpoint /api/v1/consar/recursos/serie?codigo=sar_total&afore_codigo=pension_bienestar',
        fuenteUrl: CONSAR_SEED.sourceConsar.url,
        metodologia: 'Filter afore.codigo = pension_bienestar, tipo_recurso.codigo = sar_total. La AFORE sólo reporta sar_total + recursos_trabajadores (2/15 conceptos).',
        validado: CONSAR_SEED.buildDate,
      })}
    </section>
  `;
}

// ==================== D7 — Catálogos (developer-facing) ====================

export function buildD7_Catalogos(): string {
  const d = CONSAR_SEED.d7;
  const d3 = CONSAR_SEED.d3;

  const aforesRows = d3.afores.map(a => `
    <tr>
      <td><strong>${a.nombre}</strong></td>
      <td><code>${a.codigo}</code></td>
    </tr>
  `).join('');

  return `
    <section class="enigh-section" id="d7-catalogos">
      <h2 class="section-title">7 · Catálogos — uso reproducible vía API</h2>
      <p class="section-intro">
        El observatorio expone los dos catálogos canónicos del dataset para que cualquier consumidor externo pueda
        reproducir las cifras mostradas. Los 7 endpoints bajo <code>/api/v1/consar/*</code> están documentados en el
        <a href="https://api.datos-itam.org/docs" target="_blank" rel="noopener">Swagger de la API</a>.
      </p>

      <div class="charts-grid">
        <div class="table-section">
          <h3>AFOREs (${d.nAfores})</h3>
          <p class="table-subnote">Por tipo_pension: ${d.porTipoPension.privada} privadas · ${d.porTipoPension.publica} pública · ${d.porTipoPension.bienestar} bienestar</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código API</th>
                </tr>
              </thead>
              <tbody id="d7-afores-tbody">
                ${aforesRows}
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-section">
          <h3>Tipos de recurso (${d.nTiposRecurso})</h3>
          <p class="table-subnote">
            Por categoría:
            ${d.porCategoria.component} components ·
            ${d.porCategoria.aggregate} aggregates ·
            ${d.porCategoria.total} totals ·
            ${d.porCategoria.operativo} operativo
          </p>
          <div class="table-wrap">
            <table id="d7-tipos-table">
              <thead>
                <tr>
                  <th>Código API</th>
                  <th>Categoría</th>
                </tr>
              </thead>
              <tbody id="d7-tipos-tbody">
                <tr><td><code>sar_total</code></td><td>total</td></tr>
                <tr><td><code>recursos_administrados</code></td><td>total</td></tr>
                <tr><td><code>recursos_trabajadores</code></td><td>total</td></tr>
                <tr><td><code>vivienda</code></td><td>aggregate</td></tr>
                <tr><td><code>infonavit</code></td><td>component</td></tr>
                <tr><td><code>fovissste</code></td><td>component</td></tr>
                <tr><td><code>rcv_imss</code></td><td>component</td></tr>
                <tr><td><code>rcv_issste</code></td><td>component</td></tr>
                <tr><td><code>bono_pension_issste</code></td><td>component</td></tr>
                <tr><td><code>ahorro_voluntario_y_solidario</code></td><td>aggregate</td></tr>
                <tr><td><code>ahorro_voluntario</code></td><td>component</td></tr>
                <tr><td><code>ahorro_solidario</code></td><td>component</td></tr>
                <tr><td><code>fondos_prevision_social</code></td><td>component</td></tr>
                <tr><td><code>banxico</code></td><td>component</td></tr>
                <tr><td><code>capital_afores</code></td><td>operativo</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="consar-endpoints-list">
        <h3>Los 8 endpoints disponibles</h3>
        <ul>
          <li><code>GET /api/v1/consar/afores</code> — catálogo 11 AFOREs</li>
          <li><code>GET /api/v1/consar/tipos-recurso</code> — catálogo 15 tipos</li>
          <li><code>GET /api/v1/consar/recursos/totales</code> — serie SAR nacional (326 pts)</li>
          <li><code>GET /api/v1/consar/recursos/por-afore?fecha=YYYY-MM</code> — snapshot por AFORE</li>
          <li><code>GET /api/v1/consar/recursos/por-componente?fecha=YYYY-MM</code> — snapshot por tipo</li>
          <li><code>GET /api/v1/consar/recursos/imss-vs-issste</code> — dual series (326 pts)</li>
          <li><code>GET /api/v1/consar/recursos/composicion?fecha=YYYY-MM</code> — desglose de 8 componentes con identidad</li>
          <li><code>GET /api/v1/consar/recursos/serie?codigo=X&amp;afore_codigo=Y</code> — serie genérica (S11)</li>
        </ul>
      </div>

      ${buildCaveat({
        unidad: 'Metadatos',
        fuente: 'endpoints /api/v1/consar/afores + /api/v1/consar/tipos-recurso',
        fuenteUrl: 'https://api.datos-itam.org/docs',
        metodologia: 'Read-only (sin require_admin). Rate limit 60/min. Cache CDN public max-age=3600.',
        validado: CONSAR_SEED.buildDate,
      })}
    </section>
  `;
}

export function buildConsarAbout(): string {
  return `
    <section class="about" id="about">
      <h2>Sobre este dataset</h2>
      <p>
        <strong>Dataset:</strong> CONSAR — Monto de Recursos Registrados en las AFORE. Publicado vía
        <a href="https://datos.gob.mx" target="_blank" rel="noopener">datos.gob.mx</a> bajo licencia CC-BY-4.0.
      </p>
      <p>
        <strong>Cobertura:</strong> mayo 1998 a junio 2025 (326 meses) × 11 AFOREs × 15 conceptos de recurso.
        Total de observaciones en base de datos: 35,617 filas (formato largo, sin filas sentinel).
      </p>
      <p>
        <strong>Validación:</strong> la ingesta reproduce el CSV oficial al bit. MD5
        <code>${CONSAR_SEED.sourceConsar.md5}</code> es idéntico en el CSV original, en la DB local Docker
        y en la DB Neon serverless (producción). Las identidades contables verificadas se documentan en el endpoint
        <code>/tipos-recurso</code>.
      </p>
      <p>
        <strong>Parte del observatorio multi-dataset:</strong> además de CONSAR, el observatorio
        expone datos de <a href="/">Servidores Públicos CDMX</a> (246,831 personas) y
        <a href="/enigh">ENIGH 2024 Nueva Serie</a> (91,414 hogares muestra · 38.8M expandidos),
        con <a href="/comparativo">7 dashboards comparativos</a> cruzando los dos primeros.
      </p>
    </section>
  `;
}
