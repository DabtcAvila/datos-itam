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

export const ALL_PUBLIC_ENDPOINTS: readonly string[] = [
  ...ENIGH_ENDPOINTS,
  ...COMPARATIVO_ENDPOINTS,
];
