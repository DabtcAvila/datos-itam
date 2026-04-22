// Comparativo CDMX↔ENIGH — cifras clave extraídas de API producción 2026-04-22.
// Usadas para SSR inmediato (render con datos reales desde el primer byte).
// live-data.ts sobrescribe estos valores vía fetch al montar la página.

export const COMPARATIVO_SEED = {
  buildDate: '2026-04-22',

  // ---------- D1: /ingreso/cdmx-vs-nacional ----------
  d1: {
    cdmxServidorN: 246831,
    cdmxServidorMean: 13225.47,
    cdmxServidorMedian: 10410,
    enighHogarNacionalN: 38830230,
    enighHogarNacionalMean: 25954.61,
    enighHogarCdmxN: 3082330,
    enighHogarCdmxMean: 36894.95,
    ratioHogarNacional: 1.962,
    ratioHogarCdmx: 2.79,
  },

  // ---------- D2: /decil-servidores-cdmx (tesis central) ----------
  d2: {
    percentilesCdmx: { p25: 8115, p50: 10410, p75: 16451, p90: 22102 },
    enighDeciles: [
      { decil: 1, lower: 0,        upper: 7878.68 },
      { decil: 2, lower: 7880.33,  upper: 10873.44 },
      { decil: 3, lower: 10873.52, upper: 13671.59 },
      { decil: 4, lower: 13671.76, upper: 16541.60 },
      { decil: 5, lower: 16541.91, upper: 19738.76 },
      { decil: 6, lower: 19739.21, upper: 23462.70 },
      { decil: 7, lower: 23463.05, upper: 28424.24 },
      { decil: 8, lower: 28424.73, upper: 35575.25 },
      { decil: 9, lower: 35575.67, upper: 48601.58 },
      { decil: 10, lower: 48603.11, upper: 5810659.18 },
    ] as const,
    ingresoAdicionalB: 7868.85,
    escenarioA: [
      { p: 'p25', ingreso: 8115,  decil: 2 },
      { p: 'p50', ingreso: 10410, decil: 2 },
      { p: 'p75', ingreso: 16451, decil: 4 },
      { p: 'p90', ingreso: 22102, decil: 6 },
    ] as const,
    escenarioB: [
      { p: 'p25', ingreso: 15983.85, decil: 4 },
      { p: 'p50', ingreso: 18278.85, decil: 5 },
      { p: 'p75', ingreso: 24319.85, decil: 7 },
      { p: 'p90', ingreso: 29970.85, decil: 8 },
    ] as const,
    caveatsInterp: {
      fronteraP50: 'Mediana CDMX $10,410 cae a $463 del boundary d2/d3 (upper d2 = $10,873). Pequeña variación en distribución CDMX reclasificaría la narrativa.',
      narrativaCorrecta: 'Servidor mediano CDMX está EN FRONTERA d2/d3 nacional, no firmemente dentro de d2.',
      insightPrincipal: 'La posición socioeconómica del hogar depende más de COMPOSICIÓN (número de perceptores) que del salario individual. Agregar un perceptor mediano nacional al servidor mediano CDMX mueve el hogar 3 deciles arriba (d2 → d5).',
      implicacionNarrativa: 'Afirmar "servidor público CDMX = decil 2" es técnicamente correcto bajo supuesto específico (perceptor único) pero engañoso sin contexto. La posición real depende de variables no visibles en cdmx.nombramientos (¿hay cónyuge? ¿cuánto gana? ¿hay otros perceptores?).',
    },
  },

  // ---------- D3: /aportes-vs-jubilaciones-actuales (semilla pensional) ----------
  d3: {
    cdmxN: 246829,
    cdmxMeanBruto: 13225.41,
    cdmxMeanNeto: 11796.04,
    cdmxMeanDeduccion: 1429.37,
    cdmxPctDeduccion: 8.04,
    enighPctHogaresJubilados: 18.46,
    enighMeanSoloJubiladosMensual: 11272.60,
    enighMeanSoloJubiladosTrim: 33817.81,
    enighMeanSobreTodosTrim: 6244.12,
    enighNJubiladosExpandido: 7169614,
  },

  // ---------- D4: /actividad-cdmx-vs-nacional ----------
  d4: {
    agroNacionalPct: 9.64,
    agroCdmxPct: 0.24,
    agroRatio: 0.025,
    agroNNacional: 3742158,
    agroNCdmx: 7374,
    noagroNacionalPct: 22.77,
    noagroCdmxPct: 18.96,
    noagroRatio: 0.833,
    noagroNNacional: 8842438,
    noagroNCdmx: 584492,
    nHogaresTotalNacional: 38830230,
    nHogaresTotalCdmx: 3082330,
  },

  // ---------- D5: /gastos/cdmx-vs-nacional ----------
  d5: {
    meanCdmx: 22127.71,
    meanNacional: 15891.46,
    deltaPctTotal: 39.24,
    rubros: [
      { slug: 'alimentos',              nombre: 'Alimentos, bebidas y tabaco', meanCdmx: 8129.82, meanNac: 5994.01, deltaAbs: 2135.81, deltaPct: 35.63, pctMonCdmx: 36.74, pctMonNac: 37.72 },
      { slug: 'transporte',             nombre: 'Transporte y comunicaciones', meanCdmx: 3481.57, meanNac: 3106.39, deltaAbs: 375.18,  deltaPct: 12.08, pctMonCdmx: 15.73, pctMonNac: 19.55 },
      { slug: 'educacion_esparcimiento', nombre: 'Educación y esparcimiento',   meanCdmx: 2505.09, meanNac: 1530.94, deltaAbs: 974.15,  deltaPct: 63.63, pctMonCdmx: 11.32, pctMonNac: 9.63 },
      { slug: 'vivienda',               nombre: 'Vivienda y servicios',        meanCdmx: 2638.92, meanNac: 1448.69, deltaAbs: 1190.23, deltaPct: 82.16, pctMonCdmx: 11.93, pctMonNac: 9.12 },
      { slug: 'cuidados_personales',    nombre: 'Cuidados personales',         meanCdmx: 1624.85, meanNac: 1236.28, deltaAbs: 388.56,  deltaPct: 31.43, pctMonCdmx: 7.34,  pctMonNac: 7.78 },
      { slug: 'limpieza_hogar',         nombre: 'Enseres / limpieza del hogar', meanCdmx: 1436.57, meanNac: 1004.73, deltaAbs: 431.84,  deltaPct: 42.98, pctMonCdmx: 6.49,  pctMonNac: 6.32 },
      { slug: 'vestido_calzado',        nombre: 'Vestido y calzado',           meanCdmx: 936.59,  meanNac: 609.98,  deltaAbs: 326.61,  deltaPct: 53.54, pctMonCdmx: 4.23,  pctMonNac: 3.84 },
      { slug: 'salud',                  nombre: 'Salud',                       meanCdmx: 808.03,  meanNac: 535.09,  deltaAbs: 272.94,  deltaPct: 51.01, pctMonCdmx: 3.65,  pctMonNac: 3.37 },
      { slug: 'transferencias_gasto',   nombre: 'Transferencias y otros gastos', meanCdmx: 566.26,  meanNac: 425.33,  deltaAbs: 140.93,  deltaPct: 33.13, pctMonCdmx: 2.56,  pctMonNac: 2.68 },
    ] as const,
  },

  // ---------- D6: /bancarizacion ----------
  d6: {
    cdmxPct: 22.40,
    nacionalPct: 8.87,
    deltaPp: 13.53,
    ratio: 2.525,
    nHogaresCdmx: 690314,
    nHogaresNacional: 3443639,
    nHogaresTotalCdmx: 3082330,
    nHogaresTotalNacional: 38830230,
  },

  // ---------- D7: /top-vs-bottom ----------
  d7: {
    top: {
      percentiles: { p90: 22102, p95: 27777, p99: 56066 },
      d10Mean: 78697.34,
      d10Lower: 48603.11,
      d10Upper: 5810659.18,
      brechaP99vsD10mean: 22631.34,
      ratioD10MeanSobreP99: 1.404,
    },
    bottom: {
      percentiles: { p01: 3488, p05: 5342, p10: 6311 },
      d1Mean: 5598.38,
      d1Lower: 0,
      d1Upper: 7878.68,
      brechaP01vsD1mean: -2110.38,
    },
  },

  sourceInegi: {
    title: 'INEGI ENIGH 2024 NS + Cuentas Públicas CDMX',
    url: 'https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/enigh/ENIGH2024.pdf',
    consulted: '2026-04-21',
  },
} as const;

export type ComparativoSeed = typeof COMPARATIVO_SEED;
