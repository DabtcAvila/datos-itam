// Sub-nav nivel-2 de /consar. Se renderiza en /consar (overview activo)
// y en cada /consar/<slug>. Pills agrupadas en cuatro capítulos narrativos
// (cobertura → movimientos → inversión → precios) con header de capítulo.
//
// `datasetN` se conserva como metadata interna (trazabilidad técnica) pero
// NO se renderiza visiblemente en el UI — el ordenamiento narrativo
// reemplaza la numeración CONSAR oficial como criterio de organización.

export interface ConsarSubnavItem {
  slug: string;        // identificador interno; 'overview' para el landing
  path: string;        // URL completa
  label: string;       // texto visible en pill
  datasetN: string;    // numeración CONSAR (#01..#11) — INTERNA, no visible
}

export interface ConsarChapter {
  id: string;          // 'cobertura' | 'movimientos' | 'inversion' | 'precios'
  label: string;       // texto del header de capítulo
  items: ConsarSubnavItem[];
}

// Cuatro capítulos narrativos del observatorio CONSAR. El orden y la
// asignación de datasets a capítulos están aprobados por David (criterio
// editorial S13: cobertura → movimientos → inversión → precios diarios).
export const CONSAR_CHAPTERS: ConsarChapter[] = [
  {
    id: 'cobertura',
    label: 'Cobertura del sistema',
    items: [
      { slug: 'overview',              path: '/consar',                       label: 'Recursos SAR',     datasetN: '#09' },
      { slug: 'pea-cotizantes',        path: '/consar/pea-cotizantes',        label: 'PEA · cotizantes', datasetN: '#02' },
      { slug: 'cuentas-administradas', path: '/consar/cuentas-administradas', label: 'Cuentas',          datasetN: '#05' },
    ],
  },
  {
    id: 'movimientos',
    label: 'Movimientos de los afiliados',
    items: [
      { slug: 'comisiones', path: '/consar/comisiones', label: 'Comisiones', datasetN: '#06' },
      { slug: 'traspasos',  path: '/consar/traspasos',  label: 'Traspasos',  datasetN: '#08' },
      { slug: 'flujos',     path: '/consar/flujos',     label: 'Flujos',     datasetN: '#04' },
    ],
  },
  {
    id: 'inversion',
    label: 'Inversión y desempeño',
    items: [
      { slug: 'activo-neto',  path: '/consar/activo-neto',  label: 'Activo neto',  datasetN: '#07' },
      { slug: 'rendimientos', path: '/consar/rendimientos', label: 'Rendimientos', datasetN: '#10' },
      { slug: 'sensibilidad', path: '/consar/sensibilidad', label: 'Sensibilidad', datasetN: '#03' },
    ],
  },
  {
    id: 'precios',
    label: 'Precios diarios',
    items: [
      { slug: 'precios-bolsa',   path: '/consar/precios-bolsa',   label: 'Precio bolsa',   datasetN: '#01' },
      { slug: 'precios-gestion', path: '/consar/precios-gestion', label: 'Precio gestión', datasetN: '#11' },
    ],
  },
];

// Vista plana derivada — usada por consumidores que necesitan iterar todos
// los items sin la estructura de capítulos (lookups, listados completos).
export const CONSAR_SUBNAV: ConsarSubnavItem[] = CONSAR_CHAPTERS.flatMap(ch => ch.items);

export function isConsarSlug(slug: string): boolean {
  return CONSAR_SUBNAV.some(it => it.slug === slug && it.slug !== 'overview');
}

export function getConsarItem(slug: string): ConsarSubnavItem | null {
  return CONSAR_SUBNAV.find(it => it.slug === slug) || null;
}

export function buildConsarSubnav(activeSlug: string): string {
  const groups = CONSAR_CHAPTERS.map(ch => {
    const pills = ch.items.map(it => {
      const cls = it.slug === activeSlug ? 'consar-subnav-pill active' : 'consar-subnav-pill';
      const aria = it.slug === activeSlug ? ' aria-current="page"' : '';
      return `<a href="${it.path}" class="${cls}"${aria}>${escapeHtml(it.label)}</a>`;
    }).join('');
    return `
      <div class="consar-subnav-group">
        <span class="consar-subnav-chapter">${escapeHtml(ch.label)}</span>
        <div class="consar-subnav-pills">${pills}</div>
      </div>
    `;
  }).join('');

  return `<nav class="consar-subnav" aria-label="Capítulos del observatorio CONSAR">${groups}</nav>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => {
    const map: Record<string, string> = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    return map[c];
  });
}
