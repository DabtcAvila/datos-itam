// Paleta de colores AFORE consistente entre charts del observatorio.
// Extensión de la paleta del donut D2 (consar/charts.ts d2Colors) a 11 entries
// para cubrir el universo completo de AFOREs activas + Pensión Bienestar.
//
// Criterios:
//   - Top tier: AFOREs grandes en azul/verde/púrpura (consistente con D2).
//   - Mid tier: ámbar / cyan / naranja / rosa (warm spectrum).
//   - Tail tier: lima / rojo-rosado / violeta (matices distinguibles).
//   - pension_bienestar: gris (operativo, no compite con AFOREs commercial).
//
// Si CONSAR licencia una nueva AFORE, agregar al final con un color no usado.

export const AFORE_COLORS: Record<string, string> = {
  profuturo:         '#3b82f6', // azul intenso
  xxi_banorte:       '#22c55e', // verde
  banamex:           '#a855f7', // púrpura
  sura:              '#eab308', // ámbar
  coppel:            '#06b6d4', // cyan
  pensionissste:     '#f97316', // naranja
  azteca:            '#ec4899', // rosa
  principal:         '#84cc16', // lima
  invercap:          '#f43f5e', // rojo-rosa
  inbursa:           '#8b5cf6', // violeta
  pension_bienestar: '#6b7280', // gris
};

export function aforeColor(codigo: string): string {
  return AFORE_COLORS[codigo] ?? '#71717a'; // fallback gris medio
}

// Convertir hex a rgba(...) para fills semitransparentes.
export function aforeColorRgba(codigo: string, alpha: number): string {
  const hex = AFORE_COLORS[codigo] ?? '#71717a';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
