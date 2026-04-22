// ENIGH 2024 NS — cifras clave validadas contra API producción 2026-04-22.
// Se usan para SSR inmediato (render con datos reales desde el primer byte).
// live-data.ts sobrescribe estos valores vía fetch al montar la página.

export const ENIGH_SEED = {
  buildDate: '2026-04-22',
  edition: 'ENIGH 2024 Nueva Serie',
  referenceYear: 2024,

  // Hogares
  hogaresMuestra: 91414,
  hogaresExpandido: 38830230,

  // Ingresos (trimestrales y mensuales)
  meanIngCorTrim: 77863.84,
  meanIngCorMensual: 25954.61,
  oficialIngCorTrim: 77864.0,

  // Gastos (trim y mensuales)
  meanGastoMonTrim: 47674.37,
  meanGastoMonMensual: 15891.46,
  oficialGastoMonMensual: 15891.0,

  // Validaciones
  boundsPassing: 13,
  boundsTotal: 13,
  deltaMaxPct: 0.078,

  // Demografía
  personasMuestra: 308598,
  personasExpandido: 130325969,
  pctHombres: 47.85,
  pctMujeres: 52.15,

  // Deciles — mean ing_cor mensual (de /hogares/by-decil)
  decilesIngMensual: [5598.38, 9432.21, 12281.47, 15081.30, 18102.24, 21532.93, 25816.49, 31763.03, 41236.61, 78697.34] as const,
  decilesGastoMensual: [5651.57, 7777.89, 9443.11, 10938.98, 12489.44, 14342.83, 16280.15, 19163.56, 23496.57, 39328.54] as const, // gasto_mon_trim/3
  decilesShareFactorPct: [10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0] as const,

  // Actividad económica
  agroCoberturaMuestra: 11853,
  agroCoberturaExpandida: 3742158,
  agroCoberturaPct: 9.64,
  agroShareDecil: [31.92, 17.38, 12.67, 9.48, 7.61, 6.73, 4.77, 4.10, 2.86, 2.49] as const,
  agroTopEntidad: 'Chiapas',
  agroRatioD1D10: 12.8,

  noagroCoberturaMuestra: 20134,
  noagroCoberturaExpandida: 8842438,
  noagroCoberturaPct: 22.77,
  noagroShareDecil: [10.08, 10.29, 10.49, 10.04, 10.05, 10.46, 9.94, 10.23, 10.04, 8.38] as const,
  noagroTopEntidad: 'México',
  noagroRatioD1D10: 1.3,

  // Geografía — top 3 y CDMX highlight
  topEntidadNombre: 'Nuevo León',
  topEntidadIngMensual: 39011.29,
  cdmxIngMensual: 36894.95,
  cdmxRanking: 2,
  totalEntidades: 32,

  // Gastos por rubro (nacional)
  rubros: [
    { slug: 'alimentos', nombre: 'Alimentos, bebidas y tabaco', pct: 37.72 },
    { slug: 'transporte', nombre: 'Transporte y comunicaciones', pct: 19.55 },
    { slug: 'educacion_esparcimiento', nombre: 'Educación y esparcimiento', pct: 9.63 },
    { slug: 'vivienda', nombre: 'Vivienda y servicios', pct: 9.12 },
    { slug: 'cuidados_personales', nombre: 'Cuidados personales', pct: 7.78 },
    { slug: 'limpieza_hogar', nombre: 'Enseres / limpieza del hogar', pct: 6.32 },
    { slug: 'vestido_calzado', nombre: 'Vestido y calzado', pct: 3.84 },
    { slug: 'salud', nombre: 'Salud', pct: 3.37 },
    { slug: 'transferencias_gasto', nombre: 'Transferencias y otros gastos', pct: 2.68 },
  ] as const,

  // Fuentes
  sourceInegi: {
    title: 'INEGI — Comunicado de Prensa 112/25 (ENIGH 2024)',
    url: 'https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/enigh/ENIGH2024.pdf',
    consulted: '2026-04-21',
  },
  sourcePresentacion: {
    title: 'INEGI — Presentación de resultados ENIGH 2024 (Julio 2025)',
    url: 'https://www.inegi.org.mx/contenidos/programas/enigh/nc/2024/doc/enigh2024_ns_presentacion_resultados.pdf',
  },
} as const;

export type EnighSeed = typeof ENIGH_SEED;
