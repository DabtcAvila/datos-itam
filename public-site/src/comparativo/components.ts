import { COMPARATIVO_SEED } from './seed';

export function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('es-MX');
}

export function formatPct(n: number, decimals: number = 2): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
}

export function buildComparativoHero(): string {
  const buildDateFmt = new Date(COMPARATIVO_SEED.buildDate).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  return `
    <section class="hero">
      <div class="hero-content">
        <p class="hero-text">
          <strong>Lectura cruzada</strong> de los dos datasets del observatorio: remuneraciones de
          servidores públicos de la <strong>CDMX</strong> (${formatNumber(COMPARATIVO_SEED.d1.cdmxServidorN)} personas)
          contra el universo de hogares nacionales de la <strong>ENIGH 2024 Nueva Serie</strong>
          (${formatNumber(COMPARATIVO_SEED.d1.enighHogarNacionalN)} hogares expandidos).
          Siete dashboards para situar al servidor público CDMX en el contexto del hogar mexicano.
        </p>
        <div class="hero-badges">
          <span class="hero-badge">CDMX: 246,831 personas</span>
          <span class="hero-badge">ENIGH: 38.8M hogares nacionales</span>
          <span class="hero-badge">7 lecturas cruzadas</span>
        </div>
        <p class="enigh-seed-note">
          Cifras validadas contra API el <strong>${buildDateFmt}</strong>. Se actualizan en tiempo real vía fetch al cargar esta página.
          <br><strong>Nota clave sobre unidades</strong>: CDMX mide <em>sueldo individual por persona</em>; ENIGH mide <em>ingreso total del hogar</em>
          (salarios + pensiones + transferencias + rentas + actividad económica, ~3.35 personas/hogar). Las comparaciones directas
          no son entre dos mismas cosas — cada dashboard explicita qué se contrasta.
        </p>
      </div>
    </section>
  `;
}

// ==================== D1 ====================

export function buildD1_Ingreso(): string {
  const d = COMPARATIVO_SEED.d1;
  return `
    <section class="enigh-section" id="d1-ingreso">
      <h2 class="section-title">1 · Tres unidades de ingreso, tres preguntas distintas</h2>
      <p class="section-intro">
        Los tres promedios que siguen <strong>no son comparables entre sí</strong> sin contexto.
        El primero es sueldo <em>por persona</em> en el gobierno CDMX; los otros dos son ingreso
        total <em>por hogar</em> (nacional y CDMX). Un hogar ENIGH promedio tiene 3.35 personas
        y combina salarios, transferencias, pensiones, rentas y actividad económica.
      </p>

      <div class="kpis">
        <div class="kpi kpi--blue">
          <div class="kpi-label">Servidor público CDMX</div>
          <div class="kpi-value" id="d1-kpi-cdmx-mean" data-target="${d.cdmxServidorMean}" data-prefix="$">$0</div>
          <div class="kpi-sub">Sueldo bruto mensual / persona · mediana $${formatNumber(d.cdmxServidorMedian)}</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">Hogar nacional (ENIGH)</div>
          <div class="kpi-value" id="d1-kpi-hogar-nac" data-target="${d.enighHogarNacionalMean}" data-prefix="$">$0</div>
          <div class="kpi-sub">Ingreso corriente mensual / hogar · ${formatNumber(d.enighHogarNacionalN)} hogares</div>
        </div>
        <div class="kpi kpi--purple">
          <div class="kpi-label">Hogar CDMX (ENIGH)</div>
          <div class="kpi-value" id="d1-kpi-hogar-cdmx" data-target="${d.enighHogarCdmxMean}" data-prefix="$">$0</div>
          <div class="kpi-sub">Ingreso corriente mensual / hogar · ${formatNumber(d.enighHogarCdmxN)} hogares · 2° lugar nacional</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Comparativo visual de los tres promedios</h3>
        <div class="chart-wrapper">
          <canvas id="d1Chart" role="img" aria-label="Gráfico de barras comparando sueldo servidor CDMX vs ingreso hogar nacional vs ingreso hogar CDMX"></canvas>
        </div>
        <p class="chart-note">
          El hogar nacional promedio tiene <strong>${d.ratioHogarNacional.toFixed(2)}×</strong> el ingreso mensual del servidor CDMX promedio;
          el hogar CDMX lo tiene <strong>${d.ratioHogarCdmx.toFixed(2)}×</strong>. La diferencia no es "desigualdad entre personas" — el hogar suma
          múltiples perceptores y fuentes. Es la unidad de agregación la que cambia.
        </p>
      </div>

      ${buildCaveat({
        unidad: 'Sueldo bruto mensual individual (CDMX) vs ingreso corriente mensual del hogar (ENIGH)',
        fuente: 'cdmx.nombramientos + enigh.concentradohogar (factor-weighted, entidad=09)',
        fuenteUrl: COMPARATIVO_SEED.sourceInegi.url,
        metodologia: 'CDMX: AVG(sueldo_bruto). ENIGH: SUM(ing_cor × factor) / SUM(factor), divido entre 3 para mensual.',
        validado: COMPARATIVO_SEED.buildDate,
      })}
    </section>
  `;
}

// ==================== D4 ====================

export function buildD4_Actividad(): string {
  const d = COMPARATIVO_SEED.d4;
  return `
    <section class="enigh-section" id="d4-actividad">
      <h2 class="section-title">5 · Actividad económica: CDMX urbana cuantificada</h2>
      <p class="section-intro">
        Proporción de hogares con actividad económica <strong>agropecuaria</strong> (subsistencia rural, ganado, productos del campo)
        o <strong>no-agropecuaria</strong> (comercio, servicios, manufactura) en CDMX vs promedio nacional. CDMX es metropolitana:
        la actividad agro es residual (periurbana — Milpa Alta, Tláhuac, Xochimilco) y la no-agro aparece menos frecuentemente
        que el promedio nacional.
      </p>

      <div class="kpis">
        <div class="kpi kpi--yellow">
          <div class="kpi-label">Agro · Nacional</div>
          <div class="kpi-value" id="d4-kpi-agro-nac" data-target="${d.agroNacionalPct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatNumber(d.agroNNacional)} hogares expandidos</div>
        </div>
        <div class="kpi kpi--yellow">
          <div class="kpi-label">Agro · CDMX</div>
          <div class="kpi-value" id="d4-kpi-agro-cdmx" data-target="${d.agroCdmxPct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatNumber(d.agroNCdmx)} hogares · ratio ${d.agroRatio.toFixed(3)} (~40× menos)</div>
        </div>
        <div class="kpi kpi--blue">
          <div class="kpi-label">No agro · Nacional</div>
          <div class="kpi-value" id="d4-kpi-noagro-nac" data-target="${d.noagroNacionalPct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatNumber(d.noagroNNacional)} hogares expandidos</div>
        </div>
        <div class="kpi kpi--blue">
          <div class="kpi-label">No agro · CDMX</div>
          <div class="kpi-value" id="d4-kpi-noagro-cdmx" data-target="${d.noagroCdmxPct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatNumber(d.noagroNCdmx)} hogares · ratio ${d.noagroRatio.toFixed(3)}</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Proporción de hogares con actividad económica · CDMX vs Nacional</h3>
        <div class="chart-wrapper">
          <canvas id="d4Chart" role="img" aria-label="Gráfico comparando porcentaje de hogares con actividad agro y no-agro entre CDMX y nacional"></canvas>
        </div>
        <p class="chart-note">
          <strong>Hipótesis a explorar</strong> (no probada con los datos cargados): CDMX concentra empleo formal asalariado, reduciendo la
          necesidad de auto-empleo no-agropecuario. Estados con menor formalización laboral podrían tener mayor % noagro por acceso limitado
          al empleo asalariado. Los datos de formalización laboral están en ENOE, no cargado aún en este observatorio.
        </p>
      </div>

      ${buildCaveat({
        unidad: 'Porcentaje de hogares con registros en tablas de actividad (agro / noagro)',
        fuente: 'enigh.agro + enigh.noagro — tablas persona-trabajo-tipoact',
        fuenteUrl: COMPARATIVO_SEED.sourceInegi.url,
        metodologia: 'DISTINCT (folioviv, foliohog) sobre las tablas de actividad; divide entre hogares totales por scope (nacional o entidad=09)',
        validado: COMPARATIVO_SEED.buildDate,
      })}
    </section>
  `;
}

// ==================== D6 ====================

export function buildD6_Bancarizacion(): string {
  const d = COMPARATIVO_SEED.d6;
  return `
    <section class="enigh-section" id="d6-bancarizacion">
      <h2 class="section-title">6 · Bancarización: CDMX 2.5× nacional</h2>
      <p class="section-intro">
        Hogares que usaron tarjeta de débito o crédito en el trimestre de referencia de la ENIGH.
        <strong>Nota importante</strong>: la definición operativa mide <em>uso efectivo en el trimestre</em>,
        no posesión. Un hogar con tarjeta que no la usó en esos 3 meses NO aparece contado. Un hogar que
        usó la tarjeta de un tercero SÍ aparece contado (los casos reales son marginales pero existen).
      </p>

      <div class="kpis">
        <div class="kpi kpi--blue">
          <div class="kpi-label">CDMX</div>
          <div class="kpi-value" id="d6-kpi-cdmx" data-target="${d.cdmxPct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatNumber(d.nHogaresCdmx)} hogares / ${formatNumber(d.nHogaresTotalCdmx)} hogares CDMX</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">Nacional</div>
          <div class="kpi-value" id="d6-kpi-nac" data-target="${d.nacionalPct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatNumber(d.nHogaresNacional)} hogares / ${formatNumber(d.nHogaresTotalNacional)} hogares nac</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Uso de tarjeta · CDMX vs Nacional</h3>
        <div class="chart-wrapper">
          <canvas id="d6Chart" role="img" aria-label="Gráfico de barras comparando uso de tarjeta entre CDMX y nacional"></canvas>
        </div>
        <p class="chart-note">
          CDMX supera al promedio nacional por <strong>${d.deltaPp.toFixed(2)} puntos porcentuales</strong>
          (ratio <strong>${d.ratio.toFixed(2)}×</strong>). La cifra nacional (~${d.nacionalPct.toFixed(2)}%) parece baja en términos absolutos
          porque la definición es trimestral — un hogar que use tarjeta semestralmente tiene 50% probabilidad de aparecer en un trimestre dado.
        </p>
      </div>

      <div class="caveat-note caveat-note--definition">
        <div class="caveat-title">Definición operativa</div>
        <p>Hogar con ≥1 registro en <code>enigh.gastotarjetas</code> en el trimestre de referencia. Captura <strong>uso efectivo</strong>,
        no posesión. Débito + crédito sin distinción (si se quisiera solo crédito, requiere filtro adicional por clave).</p>
      </div>

      ${buildCaveat({
        unidad: 'Porcentaje de hogares con ≥1 uso de tarjeta en el trimestre',
        fuente: 'enigh.gastotarjetas + enigh.hogares (cat_entidad para CDMX)',
        fuenteUrl: COMPARATIVO_SEED.sourceInegi.url,
        metodologia: 'SUM factor-weighted de hogares DISTINCT en gastotarjetas / SUM factor hogares totales, por scope',
        validado: COMPARATIVO_SEED.buildDate,
      })}
    </section>
  `;
}

// ==================== Caveat helper ====================

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
        <li><strong>Edición:</strong> ENIGH 2024 Nueva Serie + snapshot cdmx.nombramientos</li>
        <li><strong>Metodología:</strong> ${c.metodologia}</li>
        <li><strong>Última validación:</strong> ${validadoFmt}</li>
      </ul>
    </div>
  `;
}

// ==================== About ====================

export function buildComparativoAbout(): string {
  return `
    <section class="about-section">
      <h3>Sobre estos comparativos</h3>
      <div class="about-grid">
        <div class="about-card">
          <div class="about-card-title">Datasets cruzados</div>
          <p>Remuneraciones CDMX (snapshot, 246,831 servidores públicos) × ENIGH 2024 Nueva Serie (muestra 91,414 hogares expandidos a 38.8M nacionales). Dos fuentes distintas, dos unidades de agregación — cada dashboard explicita las unidades.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">Lo que estos comparativos SÍ son</div>
          <p>Lecturas descriptivas cruzadas. Sitúan al servidor público CDMX en el contexto del hogar mexicano usando las <strong>7 rutas comparativas</strong> del API público. Validadas al peso contra tabulados oficiales INEGI.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">Lo que NO son</div>
          <p>No son análisis pensional actuarial, no son proyecciones a futuro, no son evaluación de políticas. El dashboard "aportes vs jubilaciones actuales" es fotografía descriptiva — no equivalencia 1:1 ni predicción de lo que un servidor activo recibirá al jubilarse.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">Roadmap</div>
          <p>El observatorio está diseñado para sumar datasets progresivamente. Datos pensionales (CONSAR, IMSS, Pensión del Bienestar), empleo formal (ENOE, DENUE) y otros están en la hoja de ruta académica del proyecto.</p>
        </div>
      </div>
    </section>
  `;
}
