// Pensional S12 — cálculos derivados puros, testeables unitariamente.
// Los endpoints CONSAR + ENIGH entregan los datos base; aquí se derivan
// las dos hipótesis cuantificadas del dashboard.

import { PENSIONAL_SEED, type ComponenteSar, type LiquidezCategoria } from './seed';

// ---------------------------------------------------------------------
// P2 — Partición de liquidez del SAR
// ---------------------------------------------------------------------
// 8 componentes CONSAR → 3 buckets (líquido / vinculado / operativo).
// El resultado es la partición del stock total en categorías con
// convertibilidad distinta a flujo pensional mensual.

export interface BucketLiquidez {
  totalMm: number;
  pct: number;
  componentes: ComponenteSar[];
}

export interface LiquidityPartition {
  sarTotalMm: number;
  liquido: BucketLiquidez;
  vinculado: BucketLiquidez;  // Vivienda
  operativo: BucketLiquidez;  // Banxico + Capital AFORES
  noLiquidoTotalMm: number;
  noLiquidoPct: number;
}

export function computeLiquidityPartition(
  componentes: ReadonlyArray<ComponenteSar>
): LiquidityPartition {
  const sarTotalMm = componentes.reduce((s, c) => s + c.montoMm, 0);

  function bucketFor(cat: LiquidezCategoria): BucketLiquidez {
    const comps = componentes.filter(c => c.categoria === cat);
    const totalMm = comps.reduce((s, c) => s + c.montoMm, 0);
    return {
      totalMm,
      pct: sarTotalMm > 0 ? (totalMm / sarTotalMm) * 100 : 0,
      componentes: comps.map(c => ({ ...c })),
    };
  }

  const liquido = bucketFor('liquido');
  const vinculado = bucketFor('vinculado');
  const operativo = bucketFor('operativo');
  const noLiquidoTotalMm = vinculado.totalMm + operativo.totalMm;

  return {
    sarTotalMm,
    liquido,
    vinculado,
    operativo,
    noLiquidoTotalMm,
    noLiquidoPct: sarTotalMm > 0 ? (noLiquidoTotalMm / sarTotalMm) * 100 : 0,
  };
}

// ---------------------------------------------------------------------
// P1 — Cobertura stock×rendimiento vs flujo anual pagado
// ---------------------------------------------------------------------
// Pago anual implícito = n_hogares × promedio_mensual × 12
// Rendimiento SAR      = SAR_total × tasa_real_anual
// Cobertura            = Rendimiento / Pago_anual (adim)

export interface CoverageCalculation {
  sarTotalMm: number;
  nHogaresJubilados: number;
  promedioMensualJubilacion: number;
  pagoAnualImplicitoMm: number;      // en millones MXN, para comparar en misma unidad
  tasaRealAnual: number;
  rendimientoAnualSarMm: number;
  coberturaPct: number;
}

export function computeCoverage(opts: {
  sarTotalMm: number;
  nHogaresJubilados: number;
  promedioMensualJubilacion: number;
  tasaRealAnual?: number;
}): CoverageCalculation {
  const tasaRealAnual = opts.tasaRealAnual ?? PENSIONAL_SEED.tasaRealAnual;
  // pago anual en pesos absolutos
  const pagoAnualPesos = opts.nHogaresJubilados * opts.promedioMensualJubilacion * 12;
  // convertimos a millones MXN (dividir entre 1e6)
  const pagoAnualImplicitoMm = pagoAnualPesos / 1_000_000;
  const rendimientoAnualSarMm = opts.sarTotalMm * tasaRealAnual;
  const coberturaPct = pagoAnualImplicitoMm > 0
    ? (rendimientoAnualSarMm / pagoAnualImplicitoMm) * 100
    : 0;

  return {
    sarTotalMm: opts.sarTotalMm,
    nHogaresJubilados: opts.nHogaresJubilados,
    promedioMensualJubilacion: opts.promedioMensualJubilacion,
    pagoAnualImplicitoMm,
    tasaRealAnual,
    rendimientoAnualSarMm,
    coberturaPct,
  };
}

// ---------------------------------------------------------------------
// Format helpers — copiados a live-data.ts para evitar import cross-SSR/client
// ---------------------------------------------------------------------

export function formatMm(n: number): string {
  return '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' mm';
}

export function formatBill(mm: number): string {
  const bill = mm / 1_000_000;
  return '$' + bill.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bill';
}

export function formatN(n: number): string {
  return n.toLocaleString('es-MX');
}

export function formatPct(n: number, decimals: number = 2): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
}

export function formatMoneyMm(n: number): string {
  // Auto-scale: >=1M mm → bill; >=1K mm → K mm; else mm
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + ' bill';
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(0) + 'K mm';
  return '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' mm';
}
