// Bloque de cards en el landing /consar — los 10 datasets atómicos
// agrupados en cuatro capítulos narrativos (cobertura → movimientos →
// inversión → precios). Excluye 'overview' (Recursos SAR) que ES el
// landing donde se renderea (sería un link circular).
//
// Cada card: título legible + descripción factual de cobertura/dim.
// La numeración CONSAR (#01..#11) NO se renderiza visiblemente; se
// preserva como metadata interna (`datasetN`) en `nav.ts` para
// trazabilidad técnica.

interface DatasetCard {
  slug: string;          // /consar/<slug>
  label: string;         // título visible (más descriptivo que el pill)
  description: string;   // factual, 1-2 frases sin atribución causal
}

interface CardChapter {
  id: string;            // 'cobertura' | 'movimientos' | 'inversion' | 'precios'
  label: string;         // header de capítulo
  intro: string;         // 1 frase contextual del capítulo
  cards: DatasetCard[];
}

const CARD_CHAPTERS: CardChapter[] = [
  {
    id: 'cobertura',
    label: 'Cobertura del sistema',
    intro: 'Quién está dentro del SAR y cuántas cuentas administra.',
    cards: [
      {
        slug: 'pea-cotizantes',
        label: 'PEA · cotizantes',
        description: 'Trabajadores cotizantes registrados en el SAR vs PEA nacional. Tasa de cobertura formal mensual desde el inicio del sistema.',
      },
      {
        slug: 'cuentas-administradas',
        label: 'Cuentas administradas',
        description: 'Conteo de cuentas y trabajadores por AFORE × métrica × mes. Cobertura 1997-12 → 2025-06 (331 meses), 11 métricas heterogéneas.',
      },
    ],
  },
  {
    id: 'movimientos',
    label: 'Movimientos de los afiliados',
    intro: 'Comisiones, traspasos y flujos de recursos entre AFOREs y conceptos.',
    cards: [
      {
        slug: 'comisiones',
        label: 'Comisiones',
        description: 'Comisión anual sobre saldo cobrada por cada AFORE. Snapshot anual + serie histórica desde 2008 (inicio de la regulación vigente).',
      },
      {
        slug: 'traspasos',
        label: 'Traspasos',
        description: 'Traspasos AFORE-AFORE entrantes y salientes por mes. Permite leer el balance neto de movilidad entre administradoras.',
      },
      {
        slug: 'flujos',
        label: 'Flujos',
        description: 'Flujo neto mensual de recursos por AFORE en mm MXN. Aportaciones, retiros, transferencias y saldos por concepto × mes.',
      },
    ],
  },
  {
    id: 'inversion',
    label: 'Inversión y desempeño',
    intro: 'Saldos administrados, rendimientos publicados y sensibilidad de cartera.',
    cards: [
      {
        slug: 'activo-neto',
        label: 'Activo neto',
        description: 'Saldo administrado por par AFORE × SIEFORE en mm MXN. Cobertura 2019-12 → 2025-06 (67 meses), 11 AFOREs × 28 SIEFOREs.',
      },
      {
        slug: 'rendimientos',
        label: 'Rendimientos',
        description: 'Rendimientos netos publicados por CONSAR por AFORE × SIEFORE × plazo (1, 3, 5, 7 y 10 años). Snapshot mensual + serie.',
      },
      {
        slug: 'sensibilidad',
        label: 'Sensibilidad',
        description: 'Indicadores de sensibilidad de cartera por AFORE × SIEFORE × métrica (catálogo dinámico de 7 entradas). Snapshot + serie.',
      },
    ],
  },
  {
    id: 'precios',
    label: 'Precios diarios',
    intro: 'Valor diario de la siefore — dos series independientes publicadas por CONSAR.',
    cards: [
      {
        slug: 'precios-bolsa',
        label: 'Precio bolsa',
        description: 'Precio bolsa diario (NAV cotizado) por AFORE × SIEFORE. Cobertura desde 1997 con ~7,059 días hábiles por par activo.',
      },
      {
        slug: 'precios-gestion',
        label: 'Precio gestión',
        description: 'Precio gestión diario por AFORE × SIEFORE, serie independiente del precio bolsa publicada por CONSAR. Cobertura desde 1997.',
      },
    ],
  },
];

export function buildConsarDatasetCards(): string {
  const chapters = CARD_CHAPTERS.map(ch => {
    const cards = ch.cards.map(card => `
      <a href="/consar/${escapeAttr(card.slug)}" class="consar-dataset-card" aria-label="${escapeAttr(card.label)}">
        <h4 class="consar-dataset-card-title">${escapeHtml(card.label)}</h4>
        <p class="consar-dataset-card-desc">${escapeHtml(card.description)}</p>
        <span class="consar-dataset-card-cta">Ver sub-sección <span aria-hidden="true">→</span></span>
      </a>
    `).join('');
    return `
      <div class="consar-cards-chapter" data-chapter="${escapeAttr(ch.id)}">
        <div class="consar-cards-chapter-head">
          <h3 class="consar-cards-chapter-title">${escapeHtml(ch.label)}</h3>
          <p class="consar-cards-chapter-intro">${escapeHtml(ch.intro)}</p>
        </div>
        <div class="consar-dataset-cards-grid">
          ${cards}
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="enigh-section" id="datasets-adicionales">
      <h2 class="section-title">8 · El observatorio en cuatro capítulos · 10 sub-secciones</h2>
      <p class="section-intro">
        Los siete dashboards anteriores resumen los recursos del SAR agregados por mes. El observatorio expone
        además <strong>10 datasets atómicos</strong> con granularidades distintas (diaria, mensual, anual,
        snapshot) y dimensiones AFORE × SIEFORE × tiempo, organizados en cuatro capítulos narrativos según el
        aspecto del SAR que cubren. Cada sub-sección tiene su propia interfaz interactiva con KPIs, selectores y
        tablas.
      </p>
      ${chapters}
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
