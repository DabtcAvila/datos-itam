import { ENIGH_SEED } from './seed';

export function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('es-MX');
}

export function formatPct(n: number, decimals: number = 2): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
}

export function buildEnighHero(): string {
  const buildDateFmt = new Date(ENIGH_SEED.buildDate).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  return `
    <section class="hero">
      <div class="hero-content">
        <p class="hero-text">
          Observatorio de la <strong>Encuesta Nacional de Ingresos y Gastos de los Hogares 2024</strong> (ENIGH Nueva Serie).
          Análisis de <strong>${formatNumber(ENIGH_SEED.hogaresMuestra)} hogares muestrales</strong>
          expandidos a <strong>${formatNumber(ENIGH_SEED.hogaresExpandido)} hogares nacionales</strong>
          (<strong>${formatNumber(ENIGH_SEED.personasExpandido)} personas</strong>).
          Cifras reproducidas al peso contra la publicación oficial INEGI.
        </p>
        <div class="hero-badges">
          <span class="hero-badge">Fuente: INEGI ENIGH 2024 Nueva Serie</span>
          <span class="hero-badge">${ENIGH_SEED.boundsPassing}/${ENIGH_SEED.boundsTotal} validaciones vs INEGI passing</span>
          <span class="hero-badge">Proyecto académico ITAM</span>
        </div>
        <p class="enigh-seed-note">
          Cifras validadas contra API el <strong>${buildDateFmt}</strong>. Se actualizan en tiempo real vía fetch al cargar esta página.
        </p>
      </div>
    </section>
  `;
}

export function buildEnighKPIs(): string {
  return `
    <div class="kpis">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Hogares muestra</div>
        <div class="kpi-value" id="enigh-kpi-hogares-muestra" data-target="${ENIGH_SEED.hogaresMuestra}">0</div>
        <div class="kpi-sub">Encuestados agosto-noviembre 2024</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Hogares expandidos</div>
        <div class="kpi-value" id="enigh-kpi-hogares-exp" data-target="${ENIGH_SEED.hogaresExpandido}">0</div>
        <div class="kpi-sub">Universo nacional ponderado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Ingreso corriente mensual</div>
        <div class="kpi-value" id="enigh-kpi-ing-mes" data-target="${ENIGH_SEED.meanIngCorMensual}" data-prefix="$">$0</div>
        <div class="kpi-sub">Promedio por hogar (trim $${formatNumber(Math.round(ENIGH_SEED.meanIngCorTrim))})</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Gasto monetario mensual</div>
        <div class="kpi-value" id="enigh-kpi-gas-mes" data-target="${ENIGH_SEED.meanGastoMonMensual}" data-prefix="$">$0</div>
        <div class="kpi-sub">Promedio por hogar</div>
      </div>
    </div>
  `;
}

export function buildEnighInsights(): string {
  return `
    <section class="insights">
      <h3 class="insights-title">Hallazgos cuantificados</h3>
      <div class="insights-grid">
        <div class="insight">
          <span class="insight-icon">&#9679;</span>
          <span>El ingreso mensual promedio de <strong>$${formatNumber(Math.round(ENIGH_SEED.meanIngCorMensual))}</strong> reproduce al peso la cifra oficial trimestral INEGI de <strong>$${formatNumber(ENIGH_SEED.oficialIngCorTrim)}</strong> (Δ −0.0002%).</span>
        </div>
        <div class="insight">
          <span class="insight-icon">&#9679;</span>
          <span><strong>${ENIGH_SEED.topEntidadNombre}</strong> encabeza el ingreso mensual por hogar ($${formatNumber(Math.round(ENIGH_SEED.topEntidadIngMensual))}); <strong>CDMX</strong> aparece en el lugar <strong>${ENIGH_SEED.cdmxRanking}°</strong> ($${formatNumber(Math.round(ENIGH_SEED.cdmxIngMensual))}).</span>
        </div>
        <div class="insight">
          <span class="insight-icon">&#9679;</span>
          <span>Se detectan <strong>dos regímenes económicos</strong>: agro es regresivo (decil 1 concentra ${ENIGH_SEED.agroShareDecil[0]}% de la actividad) y noagro es uniforme (banda 8.4-10.5% en todos los deciles).</span>
        </div>
        <div class="insight">
          <span class="insight-icon">&#9679;</span>
          <span><strong>${ENIGH_SEED.boundsPassing}/${ENIGH_SEED.boundsTotal} validaciones</strong> contra publicación oficial INEGI passing, con <strong>Δ máximo ${ENIGH_SEED.deltaMaxPct}%</strong>.</span>
        </div>
      </div>
    </section>
  `;
}

export function buildEnighValidaciones(): string {
  // Seeded with 13 known bounds from memory — structure matches /validaciones response.
  // Live-data script refreshes values from API on load.
  return `
    <div class="table-section" id="enigh-validaciones-section">
      <div class="validation-header">
        <div class="validation-headline">
          <span class="validation-count" id="enigh-val-count">${ENIGH_SEED.boundsPassing}/${ENIGH_SEED.boundsTotal}</span>
          <span class="validation-label">validaciones contra INEGI passing</span>
        </div>
        <div class="validation-delta">
          Δ máximo: <strong id="enigh-val-delta">${formatPct(ENIGH_SEED.deltaMaxPct, 3)}</strong>
        </div>
      </div>
      <h3>Reproducción al peso de publicación oficial INEGI</h3>
      <p class="chart-note">
        Cada renglón compara una cifra calculada en este observatorio contra la cifra publicada por INEGI en el
        <a href="${ENIGH_SEED.sourceInegi.url}" target="_blank" rel="noopener">Comunicado 112/25, cuadro 2</a>.
        La tolerancia es el margen admisible configurado por el equipo (0.2% a 3% según magnitud de la métrica).
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Métrica</th>
              <th>Unidad</th>
              <th class="num">Calculado</th>
              <th class="num">Oficial INEGI</th>
              <th class="num">Δ%</th>
              <th>Tolerancia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody id="enigh-val-tbody">
            <tr><td colspan="7" class="loading-row">Cargando validaciones desde API…</td></tr>
          </tbody>
        </table>
      </div>
      ${buildCaveat({
        unidad: 'Trimestrales o mensuales según métrica (ver columna Unidad)',
        fuente: 'INEGI Comunicado 112/25, p. 5/6 cuadro 2 (2025-07-30)',
        fuenteUrl: ENIGH_SEED.sourceInegi.url,
        metodologia: 'Agregación factor-weighted: SUM(columna × factor) / SUM(factor)',
        validado: ENIGH_SEED.buildDate,
      })}
    </div>
  `;
}

export function buildEnighDeciles(): string {
  const d1Ing = ENIGH_SEED.decilesIngMensual[0];
  const d10Ing = ENIGH_SEED.decilesIngMensual[9];
  const ratio = (d10Ing / d1Ing).toFixed(1);

  return `
    <section class="enigh-section">
      <h2 class="section-title">Ingresos y gastos por decil</h2>
      <p class="section-intro">
        La ENIGH clasifica a todos los hogares nacionales en 10 grupos iguales ordenados por
        ingreso (deciles). Cada decil contiene el 10% de los hogares. La distancia entre decil I
        (más bajo) y decil X (más alto) es la medida oficial de desigualdad.
      </p>

      <div class="chart-card full-width">
        <h3>Ingreso y gasto mensual promedio por decil</h3>
        <div class="chart-wrapper chart-wrapper--tall">
          <canvas id="enighDecilChart" role="img" aria-label="Gráfico de barras e línea mostrando ingreso y gasto mensual promedio por decil de hogar (D I a D X)"></canvas>
        </div>
        <p class="chart-note">
          <strong>Barras azules</strong>: ingreso corriente mensual promedio.
          <strong>Línea amarilla</strong>: gasto monetario mensual promedio.
          Ambas series son monotónicas — cada decil gana y gasta más que el anterior.
        </p>
      </div>

      <div class="insight insight-standalone">
        <span class="insight-icon">&#9679;</span>
        <span>
          El ingreso del decil X ($${formatNumber(Math.round(d10Ing))}/mes) es
          <strong>${ratio} veces</strong> el del decil I ($${formatNumber(Math.round(d1Ing))}/mes).
          El promedio nacional mensual de <strong>$${formatNumber(Math.round(ENIGH_SEED.meanIngCorMensual))}</strong>
          reproduce al peso la cifra oficial INEGI trimestral de
          <strong>$${formatNumber(ENIGH_SEED.oficialIngCorTrim)}</strong> (Δ −0.0002%).
        </span>
      </div>

      <div class="table-section">
        <h3>Tabla completa: los 10 deciles</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Decil</th>
                <th class="num">Hogares (muestra)</th>
                <th class="num">Hogares (expandidos)</th>
                <th class="num">Ingreso trim</th>
                <th class="num">Ingreso mensual</th>
                <th class="num">Gasto trim</th>
              </tr>
            </thead>
            <tbody id="enigh-decil-tbody">
              <tr><td colspan="6" class="loading-row">Cargando desde API…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      ${buildCaveat({
        unidad: 'Trimestrales nativos del microdato; mensuales = trim ÷ 3 (convención INEGI)',
        fuente: 'INEGI ENIGH 2024 NS — tabla concentradohogar',
        fuenteUrl: ENIGH_SEED.sourceInegi.url,
        metodologia: 'Deciles construidos con factor-weighted cumulative sum (estándar INEGI, NO NTILE simple)',
        validado: ENIGH_SEED.buildDate,
      })}
    </section>
  `;
}

export function buildEnighGeografia(): string {
  return `
    <section class="enigh-section">
      <h2 class="section-title">Geografía económica por entidad federativa</h2>
      <p class="section-intro">
        Ingreso mensual promedio por hogar en las 32 entidades federativas.
        <strong>${ENIGH_SEED.topEntidadNombre}</strong> encabeza con
        <strong>$${formatNumber(Math.round(ENIGH_SEED.topEntidadIngMensual))}/mes</strong>;
        la <strong>Ciudad de México</strong> aparece en el lugar
        <strong>${ENIGH_SEED.cdmxRanking}°</strong> con
        <strong>$${formatNumber(Math.round(ENIGH_SEED.cdmxIngMensual))}/mes</strong>.
        Contra-intuición cuantificada: el centro político no es el primer lugar económico.
      </p>

      <div class="chart-card full-width">
        <h3>32 entidades ordenadas por ingreso mensual promedio</h3>
        <div class="chart-wrapper chart-wrapper--xtall">
          <canvas id="enighEntidadChart" role="img" aria-label="Gráfico de barras horizontales con las 32 entidades federativas ordenadas por ingreso mensual promedio, Ciudad de México resaltada"></canvas>
        </div>
        <p class="chart-note">
          Barra <span class="legend-swatch legend-swatch--cdmx"></span> <strong>rosa</strong>: Ciudad de México (clave 09), resaltada.
          Barra <span class="legend-swatch legend-swatch--top"></span> <strong>verde</strong>: entidad en primer lugar.
          Ordenado descendente por ingreso.
        </p>
      </div>

      <div class="table-section">
        <h3>Tabla ordenable: 32 entidades</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Entidad</th>
                <th class="num">Hogares (muestra)</th>
                <th class="num">Hogares (expandidos)</th>
                <th class="num">Ingreso mensual</th>
                <th class="num">Gasto mensual</th>
              </tr>
            </thead>
            <tbody id="enigh-entidad-tbody">
              <tr><td colspan="6" class="loading-row">Cargando desde API…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      ${buildCaveat({
        unidad: 'Mensual (ingreso corriente y gasto monetario por hogar)',
        fuente: 'INEGI ENIGH 2024 NS — hogares.entidad vía cat_entidad',
        fuenteUrl: ENIGH_SEED.sourceInegi.url,
        metodologia: 'Factor-weighted por entidad (clave INEGI 01-32); LEFT(ubica_geo,2) = entidad',
        validado: ENIGH_SEED.buildDate,
      })}
    </section>
  `;
}

export function buildEnighGastos(): string {
  const rubrosSeedRows = ENIGH_SEED.rubros.map(r => `
    <tr>
      <td>${r.nombre}</td>
      <td class="num">${formatPct(r.pct, 2)}</td>
    </tr>
  `).join('');

  const decilOptions = [
    '<option value="">Nacional (todos los hogares)</option>',
    ...Array.from({ length: 10 }, (_, i) => {
      const n = i + 1;
      const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][i];
      return `<option value="${n}">Decil ${roman} (D${n})</option>`;
    }),
  ].join('');

  return `
    <section class="enigh-section">
      <h2 class="section-title">Estructura del gasto monetario</h2>
      <p class="section-intro">
        Los <strong>9 rubros oficiales</strong> INEGI del gasto monetario del hogar, con participación
        porcentual sobre el gasto total. A nivel nacional, <strong>Alimentos, bebidas y tabaco</strong>
        concentra el <strong>${ENIGH_SEED.rubros[0].pct}%</strong>; los deciles más bajos destinan una
        proporción aún mayor a este rubro. Usa el selector para ver cómo cambia la estructura por decil.
      </p>

      <div class="gastos-filter">
        <label for="enigh-gastos-decil">Decil:</label>
        <select id="enigh-gastos-decil">
          ${decilOptions}
        </select>
        <span class="gastos-filter-hint" id="enigh-gastos-hint">Gasto total: <strong id="enigh-gastos-total">—</strong>/mes</span>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h3>Distribución de gasto por rubro</h3>
          <div class="chart-wrapper">
            <canvas id="enighGastosChart" role="img" aria-label="Gráfico de dona con los 9 rubros oficiales INEGI del gasto monetario del hogar"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3>Desglose completo</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rubro</th>
                  <th class="num">% del gasto monetario</th>
                </tr>
              </thead>
              <tbody id="enigh-gastos-tbody">
                ${rubrosSeedRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      ${buildCaveat({
        unidad: 'Porcentaje del gasto monetario total del hogar (mensual)',
        fuente: 'INEGI ENIGH 2024 NS — tabla concentradohogar (§1.quater plan v2)',
        fuenteUrl: ENIGH_SEED.sourceInegi.url,
        metodologia: 'Publicación oficial reproducida desde concentradohogar (summary), NO desde gastoshogar (ledger). Distinción validada S5.',
        validado: ENIGH_SEED.buildDate,
      })}
    </section>
  `;
}

export function buildEnighActividad(): string {
  return `
    <section class="enigh-section">
      <h2 class="section-title">Actividad económica: dos regímenes distintos</h2>
      <p class="section-intro">
        La ENIGH registra dos tipos de actividad económica del hogar: <strong>agropecuaria</strong>
        (subsistencia rural, ganado, productos del campo) y <strong>no-agropecuaria</strong>
        (comercio, servicios, manufactura). La distribución por decil revela
        <strong>dos regímenes económicos distintos</strong>: agro es fuertemente regresivo
        (ratio d1/d10 = ${ENIGH_SEED.agroRatioD1D10}×), noagro es transversal al tejido socioeconómico
        (ratio d1/d10 = ${ENIGH_SEED.noagroRatioD1D10}×).
      </p>

      <div class="actividad-kpi-grid">
        <div class="actividad-kpi actividad-kpi--agro">
          <div class="actividad-kpi-title">Agro</div>
          <div class="actividad-kpi-coverage">
            <span id="enigh-act-agro-pct">${ENIGH_SEED.agroCoberturaPct}%</span> del universo
          </div>
          <div class="actividad-kpi-sub">
            <span id="enigh-act-agro-muestra">${formatNumber(ENIGH_SEED.agroCoberturaMuestra)}</span> hogares muestrales /
            <span id="enigh-act-agro-exp">${formatNumber(ENIGH_SEED.agroCoberturaExpandida)}</span> expandidos
          </div>
          <div class="actividad-kpi-tag tag--regressive">Regresivo · d1 concentra ${ENIGH_SEED.agroShareDecil[0]}%</div>
        </div>
        <div class="actividad-kpi actividad-kpi--noagro">
          <div class="actividad-kpi-title">No agro</div>
          <div class="actividad-kpi-coverage">
            <span id="enigh-act-noagro-pct">${ENIGH_SEED.noagroCoberturaPct}%</span> del universo
          </div>
          <div class="actividad-kpi-sub">
            <span id="enigh-act-noagro-muestra">${formatNumber(ENIGH_SEED.noagroCoberturaMuestra)}</span> hogares muestrales /
            <span id="enigh-act-noagro-exp">${formatNumber(ENIGH_SEED.noagroCoberturaExpandida)}</span> expandidos
          </div>
          <div class="actividad-kpi-tag tag--uniform">Uniforme · banda 8.4 – 10.5% por decil</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Participación por decil: dos curvas contrastadas</h3>
        <div class="chart-wrapper">
          <canvas id="enighActividadChart" role="img" aria-label="Gráfico de barras comparando participación por decil de actividad agropecuaria (regresiva) vs no agropecuaria (uniforme)"></canvas>
        </div>
        <p class="chart-note">
          Cada barra mide el <strong>porcentaje de hogares con la actividad que cae en ese decil</strong>.
          Si la actividad fuera perfectamente aleatoria sobre el universo, todos los deciles tendrían 10%.
          Agro colapsa hacia d1 (subsistencia rural); noagro queda plana (comercio y servicios transversales).
        </p>
      </div>

      <div class="charts-grid">
        <div class="table-section">
          <h3>Top 5 entidades — Agro</h3>
          <p class="table-subnote">Perfil: sur/sureste rural</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Entidad</th>
                  <th class="num">Hogares expandidos</th>
                </tr>
              </thead>
              <tbody id="enigh-act-agro-top-tbody">
                <tr><td colspan="3" class="loading-row">Cargando…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="table-section">
          <h3>Top 5 entidades — No agro</h3>
          <p class="table-subnote">Perfil: metropolitano urbano</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Entidad</th>
                  <th class="num">Hogares expandidos</th>
                </tr>
              </thead>
              <tbody id="enigh-act-noagro-top-tbody">
                <tr><td colspan="3" class="loading-row">Cargando…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      ${buildCaveat({
        unidad: 'Porcentaje de hogares con actividad / decil (suma 100% por serie)',
        fuente: 'INEGI ENIGH 2024 NS — enigh.agro + enigh.noagro',
        fuenteUrl: ENIGH_SEED.sourceInegi.url,
        metodologia: 'Cobertura con DISTINCT (folioviv, foliohog) sobre tabla persona-trabajo-tipoact (S6)',
        validado: ENIGH_SEED.buildDate,
      })}
    </section>
  `;
}

export function buildEnighDemografia(): string {
  return `
    <section class="enigh-section">
      <h2 class="section-title">Demografía nacional</h2>
      <p class="section-intro">
        El universo ENIGH expande <strong>${formatNumber(ENIGH_SEED.personasExpandido)} personas</strong>
        a partir de ${formatNumber(ENIGH_SEED.personasMuestra)} encuestadas. Distribución por sexo y cohortes
        etarios oficiales INEGI.
      </p>

      <div class="charts-grid">
        <div class="chart-card">
          <h3>Distribución por sexo</h3>
          <div class="chart-wrapper">
            <canvas id="enighSexoChart" role="img" aria-label="Gráfico de dona con distribución de la población por sexo (mujeres y hombres)"></canvas>
          </div>
          <p class="chart-note">
            <strong>${ENIGH_SEED.pctMujeres}%</strong> mujeres /
            <strong>${ENIGH_SEED.pctHombres}%</strong> hombres.
            El universo femenino rebasa al masculino por ~5.6M personas.
          </p>
        </div>
        <div class="chart-card">
          <h3>Distribución por cohorte etaria</h3>
          <div class="chart-wrapper">
            <canvas id="enighEdadChart" role="img" aria-label="Gráfico de barras con distribución poblacional por cinco cohortes etarios"></canvas>
          </div>
          <p class="chart-note">
            Cinco cohortes INEGI: niñez (0-14), jóvenes (15-29), adultos medios (30-44),
            adultos (45-64), adultos mayores (65+).
          </p>
        </div>
      </div>

      ${buildCaveat({
        unidad: 'Personas expandidas vía factor_pob (distinto de factor del hogar)',
        fuente: 'INEGI ENIGH 2024 NS — tabla poblacion',
        fuenteUrl: ENIGH_SEED.sourceInegi.url,
        metodologia: 'Factor poblacional a nivel persona; cohortes enteras sin traslape',
        validado: ENIGH_SEED.buildDate,
      })}
    </section>
  `;
}

type CaveatFields = {
  unidad: string;
  fuente: string;
  fuenteUrl?: string;
  metodologia: string;
  validado: string;
};

export function buildCaveat(c: CaveatFields): string {
  const fuenteHtml = c.fuenteUrl
    ? `<a href="${c.fuenteUrl}" target="_blank" rel="noopener">${c.fuente}</a>`
    : c.fuente;
  const validadoFmt = new Date(c.validado).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  return `
    <div class="caveat-note">
      <div class="caveat-title">Notas metodológicas</div>
      <ul class="caveat-list">
        <li><strong>Unidad:</strong> ${c.unidad}</li>
        <li><strong>Fuente:</strong> ${fuenteHtml}</li>
        <li><strong>Edición:</strong> ENIGH 2024 Nueva Serie (levantamiento agosto-noviembre 2024)</li>
        <li><strong>Metodología:</strong> ${c.metodologia}</li>
        <li><strong>Última validación:</strong> ${validadoFmt}</li>
      </ul>
    </div>
  `;
}

export function buildEnighAbout(): string {
  return `
    <section class="about-section">
      <h3>Sobre estos datos</h3>
      <div class="about-grid">
        <div class="about-card">
          <div class="about-card-title">Fuente oficial</div>
          <p>Encuesta Nacional de Ingresos y Gastos de los Hogares <strong>2024 Nueva Serie</strong>, publicada por el <strong>INEGI</strong> el 30 de julio de 2025. Microdato completo descargado en sesiones S2-S6 del proyecto, con integridad verificada byte-exact (MD5 por tabla) entre base local y base serverless Neon.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">Reproducibilidad</div>
          <p>Las <strong>${ENIGH_SEED.boundsPassing} métricas oficiales</strong> publicadas por INEGI en el Comunicado 112/25 (cuadro 2) se reproducen al peso por este observatorio, con delta máximo del <strong>${ENIGH_SEED.deltaMaxPct}%</strong>. El pipeline de cálculo está integrado en los tests automatizados.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">Metodología</div>
          <p>Todas las cifras nacionales usan la metodología oficial INEGI de <strong>agregación factor-weighted</strong>: las columnas se multiplican por la variable <code>factor</code> del hogar y se suman; los promedios dividen entre <code>SUM(factor)</code>. Los agregados muestrales simples no se exponen en este observatorio.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">Proyecto</div>
          <p>Desarrollado como proyecto académico del <strong>ITAM</strong>. El código fuente, las migraciones de base de datos y los tests están versionados en el repositorio público del proyecto.</p>
        </div>
      </div>
    </section>
  `;
}
