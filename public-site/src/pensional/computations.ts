// Pensional — cálculo derivado puro, testeable unitariamente.
// El endpoint CONSAR entrega los 8 componentes SAR; aquí se agrupan
// en 3 categorías de liquidez según la legislación aplicable.

import { type ComponenteSar, type LiquidezCategoria } from './seed';

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
