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
          Ejercicios cuantitativos cross-dataset <strong>CONSAR × ENIGH</strong>. Presentación
          descriptiva de cálculos con datos públicos, sin interpretación del observatorio.
          Un análisis de sostenibilidad pensional requiere modelos actuariales, datos demográficos
          y proyecciones multi-cohorte fuera del alcance de esta sección. Los cálculos se exponen
          por transparencia de cómputo.
        </p>
        <div class="hero-badges">
          <span class="hero-badge">SAR: ${formatBill(PENSIONAL_SEED.consar.sarTotalMm)} MXN</span>
          <span class="hero-badge">${formatN(PENSIONAL_SEED.enigh.nHogaresJubilados)} hogares jubilados</span>
          <span class="hero-badge">2 ejercicios aritméticos</span>
        </div>
        <p class="enigh-seed-note">
          Cifras validadas contra API el <strong>${buildDateFmt}</strong>. Se refrescan vía fetch al cargar.
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
      <h2 class="section-title">P2 · Composición del SAR por liquidez del componente</h2>
      <p class="section-intro">
        El SAR mexicano (<strong>${formatBill(p.sarTotalMm)} MXN</strong> junio 2025) incluye ocho
        componentes con distintos regímenes de liquidez según la legislación aplicable. Este dashboard
        desglosa la composición en tres categorías — <strong>líquido</strong> (RCV-IMSS + RCV-ISSSTE +
        Ahorro Voluntario+Solidario + Fondos de Previsión Social + Bono Pensión ISSSTE),
        <strong>vinculado</strong> (Vivienda INFONAVIT + FOVISSSTE, uso vinculado a crédito hipotecario
        por ley) y <strong>operativo</strong> (Banxico cuentas asignadas sin AFORE elegida + Capital
        AFORES). La partición es descriptiva del marco legal vigente, no evaluativa.
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
          <div class="kpi-label">Operativo (administrativo)</div>
          <div class="kpi-value" id="p2-kpi-operativo-pct" data-target="${p.operativo.pct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatMm(p.operativo.totalMm)} · Banxico asignadas + capital AFOREs</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Composición del SAR junio 2025 por categoría de liquidez</h3>
        <div class="chart-wrapper">
          <canvas id="p2Chart" role="img" aria-label="Gráfico de barra apilada horizontal mostrando la composición del SAR en tres categorías: líquido 74.66%, vivienda 23.66%, operativo 1.68%"></canvas>
        </div>
        <p class="chart-note">
          La barra representa el SAR total ${formatBill(p.sarTotalMm)} MXN. El bloque verde agrupa los
          componentes de acceso directo como flujo pensional (RCV + ahorro voluntario + bono ISSSTE +
          fondos de previsión). El bloque ámbar es el componente Vivienda (uso vinculado a crédito
          habitacional INFONAVIT/FOVISSSTE por ley). El bloque gris son componentes administrativos
          (cuentas Banxico sin AFORE elegida + capital propio de AFORES).
        </p>
      </div>

      <!-- Bloque descriptivo — composición contable -->
      <div class="comparativo-headline">
        <div class="comparativo-headline-eyebrow">Composición contable · identidad CONSAR</div>
        <div class="comparativo-headline-body">
          El SAR junio 2025 (<strong>${formatBill(p.sarTotalMm)} MXN</strong>) se descompone
          contablemente en <strong>${formatPct(p.liquido.pct, 2)}</strong> líquido
          (<strong>${formatBill(p.liquido.totalMm)} MXN</strong>),
          <strong>${formatPct(p.vinculado.pct, 2)}</strong> vinculado a vivienda
          (<strong>${formatMm(p.vinculado.totalMm)}</strong>) y
          <strong>${formatPct(p.operativo.pct, 2)}</strong> operativo
          (<strong>${formatMm(p.operativo.totalMm)}</strong>). Los tres componentes suman el total SAR
          según la identidad contable CONSAR.
        </div>
      </div>

      <!-- 4 caveats descriptivos -->
      <div class="comparativo-caveats-expanded">
        <div class="comparativo-caveats-expanded-title">Cuatro caveats metodológicos del desglose</div>
        <ol>
          <li>
            <strong>Vivienda sigue régimen de uso vinculado.</strong> Los recursos
            ${formatMm(vivienda.montoMm)} en INFONAVIT y FOVISSSTE tienen uso vinculado a crédito
            habitacional por ley. El trabajador accede a ellos como crédito hipotecario o, en los casos
            contemplados en la normativa, como retiro al momento de jubilarse según las reglas
            aplicables a cada subsistema.
          </li>
          <li>
            <strong>Inclusión de vivienda en el conteo SAR es construcción legal.</strong>
            La Ley del INFONAVIT y la Ley del ISSSTE integran las subcuentas de vivienda al conteo SAR.
            Este dashboard presenta la partición por régimen de uso; la evaluación de equivalencia
            económica entre subcuentas con regímenes distintos es materia fuera del alcance de este
            ejercicio.
          </li>
          <li>
            <strong>Capital AFORES y depósitos Banxico siguen régimen operativo.</strong>
            ${formatMm(PENSIONAL_SEED.consar.componentes.find(c => c.codigo === 'capital_afores')!.montoMm)}
            es patrimonio propio de las administradoras (garantías y reservas operativas);
            ${formatMm(PENSIONAL_SEED.consar.componentes.find(c => c.codigo === 'banxico')!.montoMm)}
            son recursos de trabajadores sin AFORE elegida, en custodia del banco central. Ambos aparecen
            en la identidad contable SAR pero no siguen el mismo régimen de uso que las subcuentas RCV.
          </li>
          <li>
            <strong>Identidad contable verificada empíricamente.</strong> La suma de los ocho componentes
            cierra al 100% del total SAR reportado en el snapshot CONSAR 2025-06 (diferencia residual
            ${formatMm(Math.abs(PENSIONAL_SEED.consar.deltaAbsMm))} por redondeo en publicación).
            La partición en tres categorías se computa sobre este mismo snapshot.
          </li>
        </ol>
      </div>

      <!-- Roadmap box -->
      <div class="comparativo-roadmap">
        <div class="comparativo-roadmap-title">Datos disponibles para extensiones futuras</div>
        <p>
          La serie histórica mensual de Vivienda está disponible en
          <a href="/consar#d5-vivienda"><strong>/consar D5</strong></a> — permitiría graficar la
          composición líquido/vinculado/operativo a lo largo del tiempo (1998-2025). Un comparativo
          internacional con metodología OCDE requiere definiciones armonizadas de «activo pensional»
          fuera del alcance actual.
        </p>
      </div>

      ${buildCaveatMeta({
        unidad: 'Millones de pesos MXN corrientes · SAR junio 2025 · 8 componentes identidad CONSAR',
        fuente: 'endpoint /api/v1/consar/recursos/composicion?fecha=2025-06-01',
        fuenteUrl: PENSIONAL_SEED.sourceConsar.url,
        metodologia: 'Agrupación contable de los 8 componentes según régimen de liquidez en la legislación aplicable. Líquido = RCV-IMSS + RCV-ISSSTE + Bono Pensión ISSSTE + Ahorro Voluntario+Solidario + Fondos Previsión Social. Vinculado = Vivienda (INFONAVIT + FOVISSSTE, uso vinculado a crédito habitacional). Operativo = Depósitos Banxico (cuentas asignadas sin AFORE elegida) + Capital AFORES.',
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
      <div class="enigh-section-featured-eyebrow">Ejercicio aritmético · cruce CONSAR stock × ENIGH flujo</div>
      <h2 class="section-title">P1 · Ejercicio aritmético: rendimiento SAR vs flujo de jubilaciones actuales</h2>
      <p class="section-intro">
        Ejercicio aritmético con datos públicos. El SAR acumulado
        (<strong>${formatBill(c.sarTotalMm)} MXN</strong> junio 2025), bajo un supuesto default de
        rendimiento real <strong>${formatPct(c.tasaRealAnual * 100, 0)} anual</strong>, produciría
        <strong>${formatMm(c.rendimientoAnualSarMm)} MXN al año</strong>. Los
        <strong>${formatN(c.nHogaresJubilados)} hogares jubilados ENIGH 2024</strong> reciben un promedio
        mensual de <strong>$${formatN(Math.round(c.promedioMensualJubilacion))}</strong>, lo que implica un
        pago anual total de <strong>${formatMm(c.pagoAnualImplicitoMm)} MXN</strong>. El cociente
        rendimiento/pago se reporta abajo. Este dashboard presenta el cómputo con datos públicos;
        no constituye análisis de sostenibilidad del sistema pensional, que requiere modelos actuariales,
        datos demográficos, proyecciones multi-cohorte y consideración integrada de las múltiples
        fuentes de ingreso del hogar jubilado.
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
          <div class="kpi-sub">SAR_total × tasa_real_anual · supuesto default del ejercicio</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Rendimiento SAR (supuesto 4% real) vs pago anual implícito ENIGH</h3>
        <div class="chart-wrapper">
          <canvas id="p1Chart" role="img" aria-label="Gráfico de barras vertical comparando el rendimiento SAR bajo supuesto 4% real contra el pago anual implícito a hogares jubilados ENIGH"></canvas>
        </div>
        <p class="chart-note">
          La barra izquierda (azul) representa el rendimiento del SAR al ${formatPct(c.tasaRealAnual * 100, 0)}
          real sobre ${formatBill(c.sarTotalMm)} MXN. La barra derecha (ámbar) es el pago anual implícito:
          ${formatN(c.nHogaresJubilados)} hogares × $${formatN(Math.round(c.promedioMensualJubilacion))} × 12
          meses. El cociente rendimiento/pago se presenta en el recuadro inferior.
        </p>
      </div>

      <!-- Bloque descriptivo — resultado del cálculo -->
      <div class="comparativo-pensional-insight">
        <div class="comparativo-pensional-insight-eyebrow">Resultado del cálculo · cociente rendimiento/pago</div>
        <div class="comparativo-pensional-insight-body">
          Cociente aritmético bajo el supuesto ${formatPct(c.tasaRealAnual * 100, 0)} real:
          rendimiento SAR / pago anual implícito =
          <strong id="p1-big-cobertura">${coberturaRedondeada}%</strong>
          (con un decimal, <span id="p1-cobertura-inline">${formatPct(c.coberturaPct, 1)}</span>).
          El cociente relaciona dos magnitudes diferenciadas por cohorte beneficiaria (stock SAR
          post-1997 Ley 97, flujo jubilados actuales mayoritariamente pre-1997 Ley 73). Los caveats
          metodológicos listados abajo describen las condiciones del cálculo.
        </div>
      </div>

      <!-- 4 caveats metodológicos -->
      <div class="comparativo-caveats-expanded">
        <div class="comparativo-caveats-expanded-title">Cuatro caveats metodológicos del cálculo</div>
        <ol>
          <li>
            <strong>Los hogares jubilados actuales no son mayoritariamente dueños del SAR.</strong>
            Bajo la Ley del Seguro Social de 1973 (régimen de reparto) los actuales jubilados IMSS no
            tienen cuenta AFORE individual. El SAR administra cuentas Ley 97 (post-1997) que pagarán
            pensión a cohortes que se jubilen en décadas futuras. Este cociente se calcula sobre
            stock y flujo de dos universos parcialmente distintos.
          </li>
          <li>
            <strong>Cohortes beneficiarias del SAR distintas de los jubilados actuales.</strong>
            El stock acumulado está destinado por diseño legal a las cohortes que cotizaron en cuentas
            individuales post-1997 (Ley 97). Los jubilados ENIGH actuales reciben mayoritariamente
            pensiones bajo reglas previas (Ley 73), financiadas con ingresos corrientes del Estado
            federal, no con el SAR. Una cuantificación actuarial completa del sistema requeriría
            modelación multi-cohorte fuera del alcance.
          </li>
          <li>
            <strong>Cálculo usa promedio mensual ENIGH, no mediana.</strong>
            ENIGH reporta un promedio de $${formatN(Math.round(c.promedioMensualJubilacion))}/mes para
            hogares jubilados. La mediana (probablemente menor por colas largas asociadas a pensiones
            altas IMSS Ley 73 e ISSSTE) modificaría el pago anual implícito en dirección conocida.
            El dashboard reporta el cociente con promedio por transparencia de cómputo.
          </li>
          <li>
            <strong>Vivienda representa ${formatPct(PARTITION.vinculado.pct, 2)} del SAR bajo régimen distinto.</strong>
            Si se excluyera el componente Vivienda del cálculo (manteniendo solo la fracción
            ${formatBill(PARTITION.liquido.totalMm)}), el rendimiento bajo el mismo supuesto
            ${formatPct(c.tasaRealAnual * 100, 0)} sería ${formatMm(PARTITION.liquido.totalMm * c.tasaRealAnual)}
            y el cociente cambiaría proporcionalmente. Ver
            <a href="#p2-liquidez"><strong>P2</strong></a> para el desglose contable.
          </li>
        </ol>
      </div>

      <!-- 2 caveats secundarios colapsables -->
      <details class="comparativo-caveats-expanded" style="border-left-color: var(--text-muted);">
        <summary class="comparativo-caveats-expanded-title" style="cursor: pointer; list-style: revert;">
          Dos caveats adicionales · contexto metodológico
        </summary>
        <ol start="5">
          <li>
            <strong>Flujos pensionales paralelos no incluidos en el cálculo.</strong>
            El pago anual a jubilados ENIGH proviene de múltiples fuentes no reflejadas en el SAR:
            ISSSTE régimen de reparto (pensiones pre-2007), IMSS Ley 73 (cuasi-fiscal, pagado por el
            gobierno federal), Pensión para el Bienestar (transferencia no contributiva para adultos
            mayores de 65 años). El ejercicio se limita a las dos magnitudes declaradas en el cómputo.
          </li>
          <li>
            <strong>Supuesto de tasa 4% real es un valor default del ejercicio.</strong>
            Las SIEFORE básicas han promediado en un rango histórico distinto al supuesto, con
            volatilidad significativa entre clases de SB (perfil de riesgo distinto por cohorte de
            afiliado). Escenarios alternativos de tasa (2%, 3%, 5%, 6%) modificarían proporcionalmente
            el rendimiento reportado y el cociente resultante. Un análisis multi-escenario queda
            fuera del alcance actual.
          </li>
        </ol>
      </details>

      <!-- Roadmap box -->
      <div class="comparativo-roadmap">
        <div class="comparativo-roadmap-title">Datos adicionales para extensiones futuras del ejercicio</div>
        <p>
          Datos que permitirían ampliar el ejercicio aritmético: densidad de cotización IMSS
          (fracción del trabajo formal en la carrera promedio del trabajador), cuentas administradas
          vs cuentas asignadas por AFORE (para computar magnitudes per cápita), ENIGH histórico
          2016-2022 (para extender el cómputo a años previos) y escenarios alternativos de tasa
          (2%, 3%, 5%, 6% real).
        </p>
        <p style="margin-top: 0.7rem;">
          <strong>Dato disponible:</strong> la serie mensual 1998-2025 del SAR está en
          <a href="/consar"><strong>/consar D1</strong></a>.
        </p>
      </div>

      ${buildCaveatMeta({
        unidad: 'Millones de pesos MXN corrientes · cruce CONSAR stock + ENIGH flujo',
        fuente: 'CONSAR (sar_total junio 2025) × ENIGH 2024 NS (hogares con jubilación>0, mean mensual)',
        fuenteUrl: PENSIONAL_SEED.sourceConsar.url,
        metodologia: 'Rendimiento_anual = SAR_total × tasa_real_anual. Pago_anual_implícito = n_hogares × promedio_mensual × 12. Cociente = Rendimiento_anual / Pago_anual_implícito (%).',
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
        <strong>Alcance:</strong> los dashboards P1 y P2 son ejercicios aritméticos con datos públicos
        CONSAR y ENIGH. Su interpretación en términos del sistema pensional mexicano requiere análisis
        actuarial y demográfico fuera del alcance del observatorio. Cada caveat describe las
        condiciones del cómputo, no una conclusión.
      </p>
      <p>
        <strong>Parte del observatorio multi-dataset:</strong>
        <a href="/">CDMX</a> · <a href="/enigh">ENIGH</a> ·
        <a href="/consar">CONSAR</a> · <a href="/comparativo">Comparativo</a> · Pensional.
      </p>
    </section>
  `;
}
