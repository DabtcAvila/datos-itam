export const API_BASE = 'https://api.datos-itam.org';
export const FRONTEND_ORIGIN = 'https://datos-itam.org';

export const ENIGH_ENDPOINTS: readonly string[] = [
  '/api/v1/enigh/metadata',
  '/api/v1/enigh/validaciones',
  '/api/v1/enigh/hogares/summary',
  '/api/v1/enigh/hogares/by-decil',
  '/api/v1/enigh/hogares/by-entidad',
  '/api/v1/enigh/poblacion/demographics',
  '/api/v1/enigh/gastos/by-rubro',
  '/api/v1/enigh/actividad/agro',
  '/api/v1/enigh/actividad/noagro',
  '/api/v1/enigh/actividad/jcf',
] as const;

export const COMPARATIVO_ENDPOINTS: readonly string[] = [
  '/api/v1/comparativo/ingreso/cdmx-vs-nacional',
  '/api/v1/comparativo/decil-servidores-cdmx',
  '/api/v1/comparativo/aportes-vs-jubilaciones-actuales',
  '/api/v1/comparativo/actividad-cdmx-vs-nacional',
  '/api/v1/comparativo/gastos/cdmx-vs-nacional',
  '/api/v1/comparativo/bancarizacion',
  '/api/v1/comparativo/top-vs-bottom',
] as const;

// CONSAR API surface — full URLs with required query params for those that need them.
// Used by cors-headers.spec.ts to probe every endpoint returns 200 + correct CORS.
export const CONSAR_API_ENDPOINTS: readonly string[] = [
  '/api/v1/consar/afores',
  '/api/v1/consar/tipos-recurso',
  '/api/v1/consar/recursos/totales',
  '/api/v1/consar/recursos/por-afore?fecha=2025-06',
  '/api/v1/consar/recursos/por-componente?fecha=2025-06',
  '/api/v1/consar/recursos/imss-vs-issste',
  '/api/v1/consar/recursos/composicion?fecha=2025-06',
  '/api/v1/consar/recursos/serie?codigo=sar_total',
] as const;

// Endpoint paths (without query strings) the frontend /consar page actually fetches.
// Used by consar-landing.spec.ts via url.includes() matching.
// por-componente is NOT fetched by the frontend — its data overlaps with /composicion
// which already exposes pct_del_sar for each of the 8 components.
export const CONSAR_FRONTEND_FETCHES: readonly string[] = [
  '/api/v1/consar/afores',
  '/api/v1/consar/tipos-recurso',
  '/api/v1/consar/recursos/totales',
  '/api/v1/consar/recursos/por-afore',
  '/api/v1/consar/recursos/imss-vs-issste',
  '/api/v1/consar/recursos/composicion',
  '/api/v1/consar/recursos/serie',
] as const;

export const ALL_PUBLIC_ENDPOINTS: readonly string[] = [
  ...ENIGH_ENDPOINTS,
  ...COMPARATIVO_ENDPOINTS,
  ...CONSAR_API_ENDPOINTS,
];
