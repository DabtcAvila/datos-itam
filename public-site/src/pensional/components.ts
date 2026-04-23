// Pensional S12 — componentes narrativos.
// Hero + P2 (Vivienda activo congelado) + P1 (42% cobertura) + About.
// Orden pedagógico: P2 primero (estructural), P1 después (hipótesis fuerte con más caveats).

import { PENSIONAL_SEED } from './seed';
import {
  computeLiquidityPartition,
  formatBill,
  formatMm,
  formatN,
  formatPct,
} from './computations';

// Derivados pre-computados en SSR — se recalculan en live-data al refresh
const PARTITION = computeLiquidityPartition(PENSIONAL_SEED.consar.componentes);

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
