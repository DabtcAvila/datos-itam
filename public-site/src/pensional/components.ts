// Pensional S12 — componentes narrativos.
// Hero + P2 (Vivienda activo congelado) + P1 (42% cobertura) + About.
// Orden pedagógico: P2 primero (estructural), P1 después (hipótesis fuerte con más caveats).

import { PENSIONAL_SEED } from './seed';
import {
  computeLiquidityPartition,
  computeCoverage,
  formatBill,
  formatMm,
  formatN,
  formatPct,
} from './computations';

// Derivados pre-computados en SSR — se recalculan en live-data al refresh
const PARTITION = computeLiquidityPartition(PENSIONAL_SEED.consar.componentes);
const COVERAGE = computeCoverage({
  sarTotalMm: PENSIONAL_SEED.consar.sarTotalMm,
  nHogaresJubilados: PENSIONAL_SEED.enigh.nHogaresJubilados,
  promedioMensualJubilacion: PENSIONAL_SEED.enigh.promedioMensualJubilacion,
  tasaRealAnual: PENSIONAL_SEED.tasaRealAnual,
});

// ---------------------------------------------------------------------
// Caveat meta (reutilizado en ambas secciones al final)
// ---------------------------------------------------------------------

function buildCaveatMeta(opts: {
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

export function buildPensionalHero(): string {
  const buildDateFmt = new Date(PENSIONAL_SEED.buildDate).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  return `
    <section class="hero">
      <div class="hero-content">
        <p class="hero-text">
          Esta sección cruza <strong>CONSAR</strong> (stock acumulado del SAR) con <strong>ENIGH</strong>
          (flujo actual de jubilaciones a hogares) para cuantificar <strong>dos asimetrías estructurales</strong>
          del sistema pensional mexicano. Los cálculos son ilustrativos — no predicciones actuariales —
          y cada uno viene con los caveats metodológicos que lo delimitan.
        </p>
        <div class="hero-badges">
          <span class="hero-badge">SAR: ${formatBill(PENSIONAL_SEED.consar.sarTotalMm)} MXN</span>
          <span class="hero-badge">${formatN(PENSIONAL_SEED.enigh.nHogaresJubilados)} hogares jubilados</span>
          <span class="hero-badge">2 hipótesis cuantificadas</span>
        </div>
        <p class="enigh-seed-note">
          Cifras validadas contra API el <strong>${buildDateFmt}</strong>. Se refrescan vía fetch al cargar.
          <br>Los cálculos que siguen <strong>no son lectura literal</strong> del sistema pensional
          (que financia cohortes futuras, no actuales). Son heurísticas que iluminan asimetrías entre
          stock acumulado, convertibilidad y flujo efectivo — con supuestos explícitos y caveats visibles.
        </p>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------
// P2 — Vivienda como activo congelado vs pensión líquida
// ---------------------------------------------------------------------

export function buildP2_ViviendaCongelada(): string {
  const p = PARTITION;
  const vivienda = p.vinculado.componentes[0]; // solo hay uno: vivienda

  return `
    <section class="enigh-section" id="p2-liquidez">
      <h2 class="section-title">P2 · Vivienda como activo congelado — ¿cuánto del SAR es ahorro pensional líquido?</h2>
      <p class="section-intro">
        Cuando se reporta que el SAR mexicano administra <strong>${formatBill(p.sarTotalMm)} MXN</strong>,
        la cifra suma ocho componentes con convertibilidad muy distinta a flujo pensional mensual.
        Este dashboard separa los recursos en tres categorías contables — <strong>líquido</strong>
        (cuentas RCV + ahorro voluntario + bono ISSSTE + fondos de previsión),
        <strong>vinculado</strong> (vivienda INFONAVIT + FOVISSSTE) y
        <strong>operativo</strong> (depósitos Banxico de cuentas asignadas + capital propio AFOREs) —
        para medir cuánto del "ahorro para el retiro" es efectivamente convertible a pensión.
      </p>

      <div class="kpis">
        <div class="kpi kpi--blue">
          <div class="kpi-label">SAR Nacional reportado</div>
          <div class="kpi-value" id="p2-kpi-sar" data-target="${p.sarTotalMm}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">Junio 2025 · 8 componentes contables</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">Líquido para pensión</div>
          <div class="kpi-value" id="p2-kpi-liquido-pct" data-target="${p.liquido.pct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatBill(p.liquido.totalMm)} MXN · RCV + voluntario + ISSSTE</div>
        </div>
        <div class="kpi kpi--yellow">
          <div class="kpi-label">Vinculado a vivienda</div>
          <div class="kpi-value" id="p2-kpi-vivienda-pct" data-target="${p.vinculado.pct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatMm(p.vinculado.totalMm)} · INFONAVIT + FOVISSSTE</div>
        </div>
        <div class="kpi kpi--purple">
          <div class="kpi-label">Operativo (no pensional)</div>
          <div class="kpi-value" id="p2-kpi-operativo-pct" data-target="${p.operativo.pct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatMm(p.operativo.totalMm)} · Banxico asignadas + capital AFOREs</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Partición del SAR por convertibilidad a flujo pensional</h3>
        <div class="chart-wrapper">
          <canvas id="p2Chart" role="img" aria-label="Gráfico de barra apilada horizontal mostrando la partición del SAR en tres categorías: líquido 74.66%, vivienda 23.66%, operativo 1.68%"></canvas>
        </div>
        <p class="chart-note">
          La barra representa el SAR total ${formatBill(p.sarTotalMm)} MXN. El bloque verde es convertible a
          pensión mensual (cuentas RCV + ahorro voluntario + bono ISSSTE + fondos de previsión). El bloque
          ámbar es Vivienda — ahorro con destino habitacional, no convertible a flujo mensual. El bloque gris
          son depósitos operativos (cuentas asignadas sin AFORE + capital propio administrador).
        </p>
      </div>

      <!-- Callout central — "25% menos líquido de lo que parece" -->
      <div class="comparativo-headline">
        <div class="comparativo-headline-eyebrow">Headline cuantitativo · identidad contable CONSAR</div>
        <div class="comparativo-headline-body">
          Solo <strong>${formatPct(p.liquido.pct, 2)}</strong> del SAR mexicano
          (<strong>${formatBill(p.liquido.totalMm)} MXN</strong>) es efectivamente convertible a flujo
          pensional mensual. El resto — <strong>${formatPct(p.noLiquidoPct, 2)}</strong>,
          <strong>${formatBill(p.noLiquidoTotalMm)} MXN</strong> — está en vivienda vinculada o en cuentas
          operativas. Cuando el reporte oficial agrega los ocho componentes a un solo total, <em>infla</em>
          la cifra de ahorro previsional estricto en aproximadamente un cuarto.
        </div>
      </div>

      <!-- 4 caveats visibles -->
      <div class="comparativo-caveats-expanded">
        <div class="comparativo-caveats-expanded-title">Cuatro caveats que forman parte del mensaje</div>
        <ol>
          <li>
            <strong>Vivienda es ahorro vinculado, no líquido.</strong> Los recursos
            ${formatMm(vivienda.montoMm)} en INFONAVIT y FOVISSSTE están destinados a crédito hipotecario
            por diseño legal. El trabajador accede a ellos como crédito habitacional o, en algunos casos,
            como retiro anticipado — no como flujo pensional mensual al jubilarse.
          </li>
          <li>
            <strong>El diseño legal mexicano incluye vivienda en el SAR; no implica convertibilidad.</strong>
            La Ley del INFONAVIT y la Ley del ISSSTE integran las subcuentas de vivienda al conteo SAR por
            construcción institucional. Eso no las vuelve equivalentes a ahorro pensional convertible —
            es decisión contable, no económica.
          </li>
          <li>
            <strong>Capital AFORES y depósitos Banxico son operativos, no de jubilación.</strong>
            ${formatMm(PENSIONAL_SEED.consar.componentes.find(c => c.codigo === 'capital_afores')!.montoMm)}
            es patrimonio de las administradoras (garantías, reservas operativas);
            ${formatMm(PENSIONAL_SEED.consar.componentes.find(c => c.codigo === 'banxico')!.montoMm)}
            son cuentas de trabajadores sin AFORE elegida, resguardadas en Banxico. Ninguno es ahorro
            pensional strictu sensu.
          </li>
          <li>
            <strong>OCDE y comparativos internacionales excluyen vivienda.</strong> Los reportes de pensiones
            OCDE (Pensions at a Glance) y la base World Bank Pension Database típicamente miden activos
            pensionales sin incluir subcuentas habitacionales. México reporta el SAR con vivienda incluida,
            lo que <em>infla</em> comparaciones internacionales de ahorro previsional cuando no se ajusta.
          </li>
        </ol>
      </div>

      <!-- Roadmap box -->
      <div class="comparativo-roadmap">
        <div class="comparativo-roadmap-title">Roadmap · lo que faltaría para análisis completo</div>
        <p>
          El observatorio ya expone la <strong>serie histórica mensual</strong> de vivienda en
          <a href="/consar#d5-vivienda"><strong>/consar D5</strong></a> — la partición líquido/vinculado/operativo
          podría <em>graficarse a lo largo del tiempo</em> (1998-2025) para mostrar cómo ha evolucionado la fracción
          líquida del SAR. El siguiente paso es el <strong>comparativo OCDE</strong>:
          recalcular el ratio "ahorro pensional / PIB" de México <em>excluyendo vivienda</em> para contrastar con
          el promedio OCDE (~18% PIB sin vivienda). Con vivienda, México parece tener ~27% PIB; sin vivienda,
          la cifra se aproxima a ~20%.
        </p>
      </div>

      ${buildCaveatMeta({
        unidad: 'Millones de pesos MXN corrientes · SAR junio 2025 · 8 componentes identidad CONSAR',
        fuente: 'endpoint /api/v1/consar/recursos/composicion?fecha=2025-06-01',
        fuenteUrl: PENSIONAL_SEED.sourceConsar.url,
        metodologia: 'Categorización de los 8 componentes por convertibilidad a flujo pensional mensual. Líquido = RCV-IMSS + RCV-ISSSTE + Bono ISSSTE + Ahorro Vol+Sol + Fondos Previsión Social. Vinculado = Vivienda (INFONAVIT + FOVISSSTE). Operativo = Depósitos Banxico (cuentas asignadas) + Capital AFORES.',
        validado: PENSIONAL_SEED.buildDate,
      })}
    </section>
  `;
}

// ---------------------------------------------------------------------
// P1 — Stock pensional vs flujo necesario (42% cobertura)
// ---------------------------------------------------------------------

export function buildP1_Cobertura42(): string {
  const c = COVERAGE;
  const coberturaRedondeada = Math.round(c.coberturaPct);

  return `
    <section class="enigh-section enigh-section--featured" id="p1-cobertura">
      <div class="enigh-section-featured-eyebrow">Dashboard narrativo · hipótesis cuantificada cross-dataset</div>
      <h2 class="section-title">P1 · Stock pensional vs flujo necesario — ¿cubre el rendimiento del SAR las jubilaciones actuales?</h2>
      <p class="section-intro">
        Si todo el SAR acumulado (<strong>${formatBill(c.sarTotalMm)} MXN</strong>) rindiera al
        <strong>${formatPct(c.tasaRealAnual * 100, 0)} real anual</strong> — supuesto conservador estándar en
        evaluaciones actuariales — el rendimiento generado equivaldría a
        <strong>${formatMm(c.rendimientoAnualSarMm)} MXN al año</strong>. Simultáneamente, los
        <strong>${formatN(c.nHogaresJubilados)} hogares jubilados ENIGH</strong> actuales reciben un promedio
        mensual de <strong>$${formatN(Math.round(c.promedioMensualJubilacion))}</strong>, lo que implica un
        flujo anual de <strong>${formatMm(c.pagoAnualImplicitoMm)} MXN</strong>. La pregunta
        cuantificada: <em>¿qué fracción del flujo cubre el rendimiento?</em>
      </p>

      <div class="kpis">
        <div class="kpi kpi--blue">
          <div class="kpi-label">SAR Nacional (stock)</div>
          <div class="kpi-value" id="p1-kpi-sar" data-target="${c.sarTotalMm}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">${formatBill(c.sarTotalMm)} MXN corrientes · junio 2025</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">Hogares jubilados ENIGH</div>
          <div class="kpi-value" id="p1-kpi-hogares" data-target="${c.nHogaresJubilados}" data-suffix="">0</div>
          <div class="kpi-sub">${formatPct(PENSIONAL_SEED.enigh.pctHogaresJubilados, 2)} de hogares nacionales</div>
        </div>
        <div class="kpi kpi--purple">
          <div class="kpi-label">Promedio mensual / hogar</div>
          <div class="kpi-value" id="p1-kpi-promedio" data-target="${c.promedioMensualJubilacion}" data-prefix="$" data-decimals="0">$0</div>
          <div class="kpi-sub">ENIGH 2024 NS · solo hogares que reciben</div>
        </div>
        <div class="kpi kpi--yellow">
          <div class="kpi-label">Pago anual implícito (flujo)</div>
          <div class="kpi-value" id="p1-kpi-flujo" data-target="${c.pagoAnualImplicitoMm}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">n_hogares × promedio_mensual × 12</div>
        </div>
        <div class="kpi kpi--blue">
          <div class="kpi-label">Rendimiento SAR @ ${formatPct(c.tasaRealAnual * 100, 0)} real</div>
          <div class="kpi-value" id="p1-kpi-rendimiento" data-target="${c.rendimientoAnualSarMm}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">SAR_total × tasa_real_anual · supuesto conservador</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Rendimiento teórico del SAR vs pago anual actual de jubilaciones</h3>
        <div class="chart-wrapper">
          <canvas id="p1Chart" role="img" aria-label="Gráfico de barras vertical comparando el rendimiento teórico del SAR al 4% real contra el pago anual implícito a hogares jubilados ENIGH"></canvas>
        </div>
        <p class="chart-note">
          La barra izquierda (azul) representa el rendimiento del SAR al ${formatPct(c.tasaRealAnual * 100, 0)}
          real sobre ${formatBill(c.sarTotalMm)} MXN. La barra derecha (ámbar) es el pago anual implícito:
          ${formatN(c.nHogaresJubilados)} hogares × $${formatN(Math.round(c.promedioMensualJubilacion))} × 12
          meses. El cociente de la primera sobre la segunda es la cobertura estimada.
        </p>
      </div>

      <!-- Callout central destacado — el 42% es la tesis -->
      <div class="comparativo-pensional-insight">
        <div class="comparativo-pensional-insight-eyebrow">Hipótesis cuantificada · cobertura stock-a-flujo</div>
        <div style="display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
          <span id="p1-big-cobertura" style="font-size: 4rem; font-weight: 700; line-height: 1; color: var(--yellow);">${coberturaRedondeada}%</span>
          <span style="font-size: 1rem; color: var(--text-secondary); font-weight: 500;">cobertura estimada</span>
        </div>
        <div class="comparativo-pensional-insight-body">
          El rendimiento del stock pensional mexicano a tasa real conservadora (${formatPct(c.tasaRealAnual * 100, 0)})
          cubriría <strong id="p1-cobertura-inline">${formatPct(c.coberturaPct, 1)}</strong> del flujo de pagos
          que los <strong>${formatN(c.nHogaresJubilados)} hogares jubilados actuales</strong> reciben.
          La asimetría entre stock acumulado y flujo efectivo es estructural — aun si todo el SAR se dedicara
          a rentar pensiones actuales, faltarían <strong>${formatBill(c.pagoAnualImplicitoMm - c.rendimientoAnualSarMm)} MXN anuales</strong>
          para cubrir el gasto pensional implícito.
        </div>
      </div>

      <!-- 4 caveats principales visibles -->
      <div class="comparativo-caveats-expanded">
        <div class="comparativo-caveats-expanded-title">Cuatro caveats principales — delimitan qué dice y qué no dice este cálculo</div>
        <ol>
          <li>
            <strong>Los hogares jubilados actuales no son mayoritariamente dueños del SAR.</strong>
            Bajo la Ley del Seguro Social de 1973 (régimen de reparto) los actuales jubilados IMSS no
            tienen cuenta AFORE individual. El SAR administra cuentas Ley 97 (post-1997) que pagarán
            pensión a cohortes que se jubilen en décadas futuras. Este cálculo heurístico <em>cruza</em>
            stock y flujo de dos universos parcialmente distintos.
          </li>
          <li>
            <strong>El SAR financia futuros jubilados Ley 97, no los actuales Ley 73.</strong>
            El stock acumulado está destinado por diseño legal a las cohortes que cotizaron en cuentas
            individuales post-1997. Los jubilados ENIGH actuales reciben mayoritariamente pensiones
            bajo reglas previas — financiadas con ingresos corrientes del Estado, no con el SAR.
            La cobertura "42%" no mide una deuda actuarial, sino una asimetría entre stock presente
            y flujo presente.
          </li>
          <li>
            <strong>El cálculo usa <em>promedio</em> mensual, no mediana — el 42% es cota inferior conservadora.</strong>
            ENIGH reporta un promedio de $${formatN(Math.round(c.promedioMensualJubilacion))}/mes para hogares jubilados. La mediana real es
            probablemente menor por colas largas (pensiones generosas IMSS Ley 73 y ISSSTE elevan el
            promedio). Usar la mediana reduciría el pago anual implícito y aumentaría la cobertura estimada —
            el 42% representa el escenario <em>más pesimista</em> bajo el supuesto de que el promedio
            captura fielmente la distribución.
          </li>
          <li>
            <strong>Vivienda ${formatPct(PARTITION.vinculado.pct, 2)} del SAR no es activo líquido.</strong>
            Si se excluyera vivienda del cálculo (manteniendo solo la fracción líquida ${formatBill(PARTITION.liquido.totalMm)}),
            el rendimiento teórico caería a ${formatMm(PARTITION.liquido.totalMm * c.tasaRealAnual)} y la
            cobertura efectiva se reduciría proporcionalmente. Ver
            <a href="#p2-liquidez"><strong>dashboard P2</strong></a> para la partición completa.
          </li>
        </ol>
      </div>

      <!-- 2 caveats secundarios colapsables -->
      <details class="comparativo-caveats-expanded" style="border-left-color: var(--text-muted);">
        <summary class="comparativo-caveats-expanded-title" style="cursor: pointer; list-style: revert;">
          Dos caveats adicionales · contexto metodológico completo
        </summary>
        <ol start="5">
          <li>
            <strong>Existen flujos pensionales paralelos no incluidos.</strong> El pago anual a jubilados
            ENIGH proviene de múltiples fuentes no reflejadas en el SAR: ISSSTE régimen de reparto
            (pensiones pre-2007), IMSS Ley 73 (cuasi-fiscal, pagado por el gobierno federal),
            Pensión para el Bienestar (transferencia no contributiva para adultos mayores de 65 años).
            La comparación SAR-contra-flujo ignora estos componentes por diseño — ambos lados del ratio
            son simplificaciones.
          </li>
          <li>
            <strong>La tasa 4% real es supuesto conservador estándar; rendimientos AFORE históricos varían.</strong>
            Las SIEFORE básicas han promediado ~5-6% real anual entre 2000-2020 según reportes CONSAR,
            pero con volatilidad sustantiva (SB Básica 1 más conservadora, SB Básica 4 más agresiva).
            A 2% real la cobertura caería a ~21%; a 6% real subiría a ~63%. El 42% asume punto medio
            conservador — escenarios alternativos se incluyen en el roadmap.
          </li>
        </ol>
      </details>

      <!-- Roadmap box -->
      <div class="comparativo-roadmap">
        <div class="comparativo-roadmap-title">Roadmap · datos pendientes para análisis completo</div>
        <p>
          Este cálculo es una heurística stock-a-flujo, no una proyección actuarial. Para análisis pensional
          serio se requieren: <strong>densidad de cotización IMSS</strong> (fracción del trabajo formal en
          la carrera promedio, típicamente 40-60% según CONSAR), <strong>cuentas administradas vs cuentas
          asignadas</strong> (n trabajadores activos por AFORE) para cálculo <em>per cápita</em> real,
          <strong>ENIGH histórico 2016-2022</strong> para construir serie de cobertura (si la asimetría
          se amplía o se reduce), y <strong>escenarios 2%/3%/5%/6% real</strong> para estres-test del supuesto.
        </p>
        <p style="margin-top: 0.7rem;">
          <strong>✓ Dato ya disponible:</strong> la serie mensual 1998-2025 del SAR está en
          <a href="/consar"><strong>/consar D1</strong></a>. El siguiente paso académico es acoplarla con
          ENIGH histórico y publicar el ratio cobertura como serie — esto permitiría ver si la asimetría
          es estructural o se está reduciendo conforme el SAR madura hacia la transición Ley 97.
        </p>
      </div>

      ${buildCaveatMeta({
        unidad: 'Millones de pesos MXN corrientes · serie cruzada CONSAR stock + ENIGH flujo',
        fuente: 'CONSAR (sar_total junio 2025) × ENIGH 2024 NS (hogares con jubilación>0, mean mensual)',
        fuenteUrl: PENSIONAL_SEED.sourceConsar.url,
        metodologia: 'Rendimiento_anual = SAR_total × tasa_real_anual. Pago_anual = n_hogares × promedio_mensual × 12. Cobertura = Rendimiento / Pago (%).',
        validado: PENSIONAL_SEED.buildDate,
      })}
    </section>
  `;
}

// ---------------------------------------------------------------------
// About
// ---------------------------------------------------------------------

export function buildPensionalAbout(): string {
  return `
    <section class="about" id="about">
      <h2>Sobre esta sección</h2>
      <p>
        <strong>Método:</strong> cruce descriptivo de dos datasets públicos ya incorporados al observatorio
        — CONSAR (stock SAR 8 componentes) y ENIGH 2024 NS (flujo jubilaciones a hogares). No se agregaron
        endpoints backend nuevos; el frontend compone los cálculos derivados sobre respuestas JSON existentes.
      </p>
      <p>
        <strong>Datos base:</strong>
        <a href="/consar"><strong>/consar</strong></a> (serie mensual 1998-2025, 11 AFOREs, identidad contable verificada) y
        <a href="/enigh"><strong>/enigh</strong></a> (91,414 hogares muestra, 38.8M expandidos).
      </p>
      <p>
        <strong>Propósito académico:</strong> los dashboards P1 y P2 no son conclusiones sobre el
        sistema pensional — son <em>preguntas cuantificadas con supuestos explícitos</em>. Cada caveat
        marca dónde termina lo que el dato dice y dónde empieza la interpretación pendiente.
      </p>
      <p>
        <strong>Parte del observatorio multi-dataset:</strong>
        <a href="/">CDMX</a> · <a href="/enigh">ENIGH</a> ·
        <a href="/consar">CONSAR</a> · <a href="/comparativo">Comparativo</a> · Pensional.
      </p>
    </section>
  `;
}
