// Catálogos AFORE + SIEFORE inlineados para construir <select> sin hacer
// fetch al cargar cada sub-sección. Validados contra:
//   GET /api/v1/consar/afores                       (11 entries, 2026-04-30)
//   GET /api/v1/consar/precios/snapshot              (siefore_slug + nombre + categoria)
//   GET /api/v1/consar/medidas/snapshot              (idem)
//   GET /api/v1/consar/rendimientos/sistema          (sistema_agregado)
//   project_s16_state.md cat_siefore = 28 entries totales
//
// Si CONSAR adiciona AFOREs o SIEFOREs, regenerar desde estos endpoints.

export interface AforeOption {
  value: string;        // codigo (lo que el API espera en query params)
  label: string;        // nombre_corto
  tipoPension: 'privada' | 'publica' | 'bienestar';
}

export const AFORE_OPTIONS: AforeOption[] = [
  { value: 'profuturo',         label: 'Profuturo',         tipoPension: 'privada'   },
  { value: 'xxi_banorte',       label: 'XXI-Banorte',       tipoPension: 'privada'   },
  { value: 'banamex',           label: 'Banamex',           tipoPension: 'privada'   },
  { value: 'sura',              label: 'SURA',              tipoPension: 'privada'   },
  { value: 'coppel',            label: 'Coppel',            tipoPension: 'privada'   },
  { value: 'pensionissste',     label: 'PensionISSSTE',     tipoPension: 'publica'   },
  { value: 'azteca',            label: 'Azteca',            tipoPension: 'privada'   },
  { value: 'principal',         label: 'Principal',         tipoPension: 'privada'   },
  { value: 'invercap',          label: 'Invercap',          tipoPension: 'privada'   },
  { value: 'inbursa',           label: 'Inbursa',           tipoPension: 'privada'   },
  { value: 'pension_bienestar', label: 'Pensión Bienestar', tipoPension: 'bienestar' },
];

export interface SieforeOption {
  value: string;        // siefore_slug (lo que el API espera)
  label: string;        // siefore_nombre
  categoria: string;    // siefore_categoria
}

// 28 entries totales. Orden propuesto:
//   1) basica_edad (9 cohortes)  — siefores generacionales, las más relevantes
//   2) basica_pensionados (2)    — sb_pensiones + sb 1000
//   3) basica_inicial (1)         — sb0
//   4) basica_legacy (1)          — sb5 (xxi pre-2013)
//   5) cuenta_administrada (1)    — sac
//   6) ahorro_voluntario (3)      — siav, siav1, siav2
//   7) previsional_social (10)    — sps1..sps10
//   8) sistema_agregado (1)       — agregado_adicionales
export const SIEFORE_OPTIONS: SieforeOption[] = [
  // basica_edad (9)
  { value: 'sb 55-59',  label: 'Siefore Básica 55-59',  categoria: 'basica_edad'  },
  { value: 'sb 60-64',  label: 'Siefore Básica 60-64',  categoria: 'basica_edad'  },
  { value: 'sb 65-69',  label: 'Siefore Básica 65-69',  categoria: 'basica_edad'  },
  { value: 'sb 70-74',  label: 'Siefore Básica 70-74',  categoria: 'basica_edad'  },
  { value: 'sb 75-79',  label: 'Siefore Básica 75-79',  categoria: 'basica_edad'  },
  { value: 'sb 80-84',  label: 'Siefore Básica 80-84',  categoria: 'basica_edad'  },
  { value: 'sb 85-89',  label: 'Siefore Básica 85-89',  categoria: 'basica_edad'  },
  { value: 'sb 90-94',  label: 'Siefore Básica 90-94',  categoria: 'basica_edad'  },
  { value: 'sb 95-99',  label: 'Siefore Básica 95-99',  categoria: 'basica_edad'  },
  // basica_pensionados (2)
  { value: 'sb_pensiones', label: 'Siefore Básica de Pensiones', categoria: 'basica_pensionados' },
  { value: 'sb 1000',      label: 'Siefore Básica 1000',          categoria: 'basica_pensionados' },
  // basica_inicial (1)
  { value: 'sb0', label: 'Siefore Básica Inicial', categoria: 'basica_inicial' },
  // basica_legacy (1)
  { value: 'sb5', label: 'Siefore Básica 5 (legacy XXI ≤2012)', categoria: 'basica_legacy' },
  // cuenta_administrada (1)
  { value: 'sac', label: 'Subcuenta de Aportaciones Complementarias', categoria: 'cuenta_administrada' },
  // ahorro_voluntario (3)
  { value: 'siav',  label: 'Subcuenta Individual de Ahorro Voluntario',   categoria: 'ahorro_voluntario' },
  { value: 'siav1', label: 'Subcuenta Individual de Ahorro Voluntario 1', categoria: 'ahorro_voluntario' },
  { value: 'siav2', label: 'Subcuenta Individual de Ahorro Voluntario 2', categoria: 'ahorro_voluntario' },
  // previsional_social (10)
  { value: 'sps1',  label: 'Subcuenta Previsional Social 1',  categoria: 'previsional_social' },
  { value: 'sps2',  label: 'Subcuenta Previsional Social 2',  categoria: 'previsional_social' },
  { value: 'sps3',  label: 'Subcuenta Previsional Social 3',  categoria: 'previsional_social' },
  { value: 'sps4',  label: 'Subcuenta Previsional Social 4',  categoria: 'previsional_social' },
  { value: 'sps5',  label: 'Subcuenta Previsional Social 5',  categoria: 'previsional_social' },
  { value: 'sps6',  label: 'Subcuenta Previsional Social 6',  categoria: 'previsional_social' },
  { value: 'sps7',  label: 'Subcuenta Previsional Social 7',  categoria: 'previsional_social' },
  { value: 'sps8',  label: 'Subcuenta Previsional Social 8',  categoria: 'previsional_social' },
  { value: 'sps9',  label: 'Subcuenta Previsional Social 9',  categoria: 'previsional_social' },
  { value: 'sps10', label: 'Subcuenta Previsional Social 10', categoria: 'previsional_social' },
  // sistema_agregado (1)
  { value: 'agregado_adicionales', label: 'Agregado del Sistema: Productos Adicionales', categoria: 'sistema_agregado' },
];
