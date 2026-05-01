// Bloque de cards para los 10 datasets atómicos accesibles desde el landing
// /consar. Cada card incluye título legible, badge con dataset CONSAR (#01..#11),
// descripción factual de cobertura/granularidad, y link a la sub-sección.
//
// Las descripciones son factuales (cobertura, dim cardinality, unidad) sin
// interpretación ni juicio. Ver project_phase_d_closure.md para tono.
//
// El landing /consar muestra aggregates del dataset #09 (recursos_mensuales).
// Los otros 10 datasets son atómicos por par AFORE × SIEFORE × tiempo, con
// granularidades distintas (mensual, diaria, anual, snapshot).

interface DatasetCard {
  slug: string;          // /consar/<slug>
  label: string;         // título visible
  datasetN: string;      // '#01'..'#11'
  description: string;   // factual, 1-2 frases
}

const DATASET_CARDS: DatasetCard[] = [
  {
    slug: 'pea-cotizantes',
    label: 'PEA · cotizantes',
    datasetN: '#02',
    description: 'Trabajadores cotizantes registrados en el SAR vs PEA nacional. Tasa de cobertura formal mensual desde el inicio del sistema.',
  },
  {
    slug: 'comisiones',
    label: 'Comisiones',
    datasetN: '#06',
    description: 'Comisión anual sobre saldo cobrada por cada AFORE. Snapshot anual + serie histórica desde 2008 (cuando inició la regulación).',
  },
  {
    slug: 'flujos',
    label: 'Flujos',
    datasetN: '#04',
    description: 'Flujo neto mensual de recursos por AFORE en mm MXN. Aportaciones, retiros, transferencias y saldos por concepto × mes.',
  },
  {
    slug: 'traspasos',
    label: 'Traspasos',
    datasetN: '#08',
    description: 'Traspasos AFORE-AFORE entrantes y salientes por mes. Permite leer el balance neto de movilidad entre administradoras.',
  },
  {
    slug: 'activo-neto',
    label: 'Activo neto',
    datasetN: '#07',
    description: 'Saldo administrado por par AFORE × SIEFORE en mm MXN. Cobertura 2019-12 → 2025-06 (67 meses), 11 AFOREs × 28 SIEFOREs.',
  },
  {
    slug: 'rendimientos',
    label: 'Rendimientos',
    datasetN: '#10',
    description: 'Rendimientos netos publicados por CONSAR por AFORE × SIEFORE × plazo (1, 3, 5, 7 y 10 años). Snapshot mensual + serie.',
  },
  {
    slug: 'sensibilidad',
    label: 'Sensibilidad',
    datasetN: '#03',
    description: 'Indicadores de sensibilidad de cartera por AFORE × SIEFORE × métrica (catálogo dinámico de 7 entradas). Snapshot + serie.',
  },
  {
    slug: 'cuentas-administradas',
    label: 'Cuentas administradas',
    datasetN: '#05',
    description: 'Conteo de cuentas y trabajadores por AFORE × métrica × mes. Cobertura 1997-12 → 2025-06 (331 meses), 11 métricas heterogéneas.',
  },
  {
    slug: 'precios-bolsa',
    label: 'Precio bolsa',
    datasetN: '#01',
    description: 'Precio bolsa diario (NAV cotizado) por AFORE × SIEFORE. Cobertura desde 1997 con ~7,059 días hábiles por par activo.',
  },
  {
    slug: 'precios-gestion',
    label: 'Precio gestión',
    datasetN: '#11',
    description: 'Precio gestión diario por AFORE × SIEFORE, serie independiente del precio bolsa publicada por CONSAR. Cobertura desde 1997.',
  },
];

export function buildConsarDatasetCards(): string {
  const cards = DATASET_CARDS.map(card => `
    <a href="/consar/${escapeAttr(card.slug)}" class="consar-dataset-card" aria-label="${escapeAttr(card.label)} · dataset ${escapeAttr(card.datasetN)}">
      <div class="consar-dataset-card-head">
        <h3 class="consar-dataset-card-title">${escapeHtml(card.label)}</h3>
        <span class="consar-dataset-card-badge">${escapeHtml(card.datasetN)}</span>
      </div>
      <p class="consar-dataset-card-desc">${escapeHtml(card.description)}</p>
      <span class="consar-dataset-card-cta">Ver sub-sección <span aria-hidden="true">→</span></span>
    </a>
  `).join('');

  return `
    <section class="enigh-section" id="datasets-adicionales">
      <h2 class="section-title">8 · 10 datasets atómicos · sub-secciones detalladas</h2>
      <p class="section-intro">
        Los siete dashboards anteriores resumen el dataset <code>#09 recursos_mensuales</code> (saldos del SAR
        agregados por mes). El observatorio expone además <strong>10 datasets atómicos</strong> con granularidades
        distintas (diaria, mensual, anual, snapshot) y dimensiones AFORE × SIEFORE × tiempo. Cada sub-sección tiene
        su propia interfaz interactiva con KPIs, selectores y tablas.
      </p>
      <div class="consar-dataset-cards-grid">
        ${cards}
      </div>
    </section>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => {
    const map: Record<string, string> = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    return map[c];
  });
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
