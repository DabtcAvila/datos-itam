// Pensional — seed validado contra API producción 2026-04-22.
// Composición CONSAR (identidad de 8 componentes SAR junio 2025).
// live-data.ts refresca estos valores vía fetch a /consar.
//
// Nota: Los componentes se categorizan por régimen de liquidez según la legislación aplicable:
//   - líquido: subcuentas RCV-IMSS, RCV-ISSSTE, Bono Pensión ISSSTE, Ahorro Voluntario+Solidario,
//     Fondos de Previsión Social
//   - vinculado: Vivienda (INFONAVIT + FOVISSSTE) — uso vinculado a crédito habitacional por ley
//   - operativo: Banxico (cuentas asignadas sin AFORE elegida) + Capital AFORES (patrimonio admin)

export type LiquidezCategoria = 'liquido' | 'vinculado' | 'operativo';

export interface ComponenteSar {
  codigo: string;
  nombre: string;
  montoMm: number;
  pct: number;
  categoria: LiquidezCategoria;
}

export const PENSIONAL_SEED = {
  buildDate: '2026-04-22',
  fechaSnapshot: '2025-06-01',

  // ---------- CONSAR — totales + composición 8 componentes 2025-06 ----------
  consar: {
    sarTotalMm: 10127978.75,
    suma8ComponentesMm: 10127978.78,
    deltaAbsMm: -0.03,
    cierreAlPeso: true,
    nAfores: 11,
    componentes: [
      { codigo: 'rcv_imss',                       nombre: 'RCV-IMSS',                              montoMm: 6256677.99, pct: 61.776, categoria: 'liquido' },
      { codigo: 'vivienda',                       nombre: 'Vivienda (INFONAVIT + FOVISSSTE)',      montoMm: 2395770.50, pct: 23.655, categoria: 'vinculado' },
      { codigo: 'rcv_issste',                     nombre: 'RCV-ISSSTE',                            montoMm:  746632.71, pct:  7.372, categoria: 'liquido' },
      { codigo: 'ahorro_voluntario_y_solidario',  nombre: 'Ahorro Voluntario + Solidario',         montoMm:  281277.08, pct:  2.777, categoria: 'liquido' },
      { codigo: 'fondos_prevision_social',        nombre: 'Fondos de Previsión Social',            montoMm:  196390.71, pct:  1.939, categoria: 'liquido' },
      { codigo: 'banxico',                        nombre: 'Depósitos en Banxico',                  montoMm:  122987.40, pct:  1.214, categoria: 'operativo' },
      { codigo: 'bono_pension_issste',            nombre: 'Bono Pensión ISSSTE',                   montoMm:   80880.54, pct:  0.799, categoria: 'liquido' },
      { codigo: 'capital_afores',                 nombre: 'Capital AFORES',                        montoMm:   47361.85, pct:  0.468, categoria: 'operativo' },
    ] as ReadonlyArray<ComponenteSar>,
  },

  sourceConsar: {
    title: 'CONSAR vía datos.gob.mx — CC-BY-4.0',
    url: 'https://repodatos.atdt.gob.mx/api_update/consar/monto_recursos_registrados_afore/09_recursos.csv',
    md5: '19083c9a46d9d958b1428056c2f5f0b1',
    consulted: '2026-04-22',
  },
} as const;

export type PensionalSeed = typeof PENSIONAL_SEED;
