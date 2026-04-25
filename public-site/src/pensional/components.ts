// Pensional — componentes narrativos.
// Hero + Composición del SAR + About.

import { PENSIONAL_SEED } from './seed';
import {
  computeLiquidityPartition,
  formatBill,
  formatMm,
  formatPct,
} from './computations';

// Derivado pre-computado en SSR — se recalcula en live-data al refresh
const PARTITION = computeLiquidityPartition(PENSIONAL_SEED.consar.componentes);

// ---------------------------------------------------------------------
// Caveat meta (reutilizado al final del dashboard)
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
          Ejercicio cuantitativo descriptivo sobre la composición del SAR mexicano por régimen
          de liquidez, usando el snapshot oficial <strong>CONSAR junio 2025</strong>. Presentación
          descriptiva, sin interpretación del observatorio. El cálculo se expone por transparencia
          de agrupación contable; cualquier análisis sobre el sistema pensional requiere modelos
          actuariales, datos demográficos y consideración integrada fuera del alcance de esta
          sección.
        </p>
        <div class="hero-badges">
          <span class="hero-badge">SAR: ${formatBill(PENSIONAL_SEED.consar.sarTotalMm)} MXN</span>
          <span class="hero-badge">8 componentes contables</span>
          <span class="hero-badge">1 ejercicio descriptivo</span>
        </div>
        <p class="enigh-seed-note">
          Cifras validadas contra API el <strong>${buildDateFmt}</strong>. Se refrescan vía fetch al cargar.
        </p>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------
// Composición del SAR por liquidez del componente
// ---------------------------------------------------------------------

export function buildComposicionSAR(): string {
  const p = PARTITION;
  const vivienda = p.vinculado.componentes[0]; // solo hay uno: vivienda

  return `
    <section class="enigh-section" id="composicion-liquidez">
      <h2 class="section-title">Composición del SAR por liquidez del componente</h2>
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
          <div class="kpi-value" id="composicion-kpi-sar" data-target="${p.sarTotalMm}" data-prefix="$" data-suffix=" mm">$0</div>
          <div class="kpi-sub">Junio 2025 · 8 componentes contables</div>
        </div>
        <div class="kpi kpi--green">
          <div class="kpi-label">Líquido para pensión</div>
          <div class="kpi-value" id="composicion-kpi-liquido-pct" data-target="${p.liquido.pct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatBill(p.liquido.totalMm)} MXN · RCV + voluntario + ISSSTE</div>
        </div>
        <div class="kpi kpi--yellow">
          <div class="kpi-label">Vinculado a vivienda</div>
          <div class="kpi-value" id="composicion-kpi-vivienda-pct" data-target="${p.vinculado.pct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatMm(p.vinculado.totalMm)} · INFONAVIT + FOVISSSTE</div>
        </div>
        <div class="kpi kpi--purple">
          <div class="kpi-label">Operativo (administrativo)</div>
          <div class="kpi-value" id="composicion-kpi-operativo-pct" data-target="${p.operativo.pct}" data-suffix="%" data-decimals="2">0%</div>
          <div class="kpi-sub">${formatMm(p.operativo.totalMm)} · Banxico asignadas + capital AFOREs</div>
        </div>
      </div>

      <div class="chart-card full-width">
        <h3>Composición del SAR junio 2025 por categoría de liquidez</h3>
        <div class="chart-wrapper">
          <canvas id="composicionChart" role="img" aria-label="Gráfico de barra apilada horizontal mostrando la composición del SAR en tres categorías: líquido 74.66%, vivienda 23.66%, operativo 1.68%"></canvas>
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
// About
// ---------------------------------------------------------------------

export function buildPensionalAbout(): string {
  return `
    <section class="about" id="about">
      <h2>Sobre esta sección</h2>
      <p>
        <strong>Método:</strong> desglose descriptivo del snapshot oficial CONSAR (8 componentes
        SAR, junio 2025) en categorías de liquidez según la legislación aplicable a cada subcuenta.
        No se agregaron endpoints backend nuevos; el frontend agrupa los componentes sobre la
        respuesta JSON existente del endpoint público.
      </p>
      <p>
        <strong>Datos base:</strong>
        <a href="/consar"><strong>/consar</strong></a> (serie mensual 1998-2025, 11 AFOREs,
        identidad contable verificada).
      </p>
      <p>
        <strong>Alcance:</strong> este dashboard es un ejercicio descriptivo con datos públicos
        CONSAR. Su interpretación en términos del sistema pensional mexicano requiere análisis
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
