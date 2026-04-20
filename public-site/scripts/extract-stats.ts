/**
 * Extract aggregated statistics from WDF_remuneraciones_cdmx.csv
 * and generate src/data/stats.ts for the Cloudflare Worker dashboard.
 *
 * Usage: npm run extract-stats
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const CSV_PATH = resolve(__dirname, '../../data-sources/WDF_remuneraciones_cdmx.csv');
const OUTPUT_PATH = resolve(__dirname, '../src/data/stats.ts');

interface Row {
  nombre: string;
  apellido_1: string;
  apellido_2: string;
  sexo: string;
  edad: number;
  n_puesto: string;
  id_tipo_nomina: number;
  tipo_contratacion: string;
  tipo_personal: string;
  fecha_ingreso: string;
  id_universo: string;
  n_universo: string;
  id_sector: string;
  n_cabeza_sector: string;
  id_nivel_salarial: number;
  sueldo_tabular_bruto: number;
  sueldo_tabular_neto: number;
}

function parseCSV(content: string): Row[] {
  const lines = content.split('\n');
  const header = lines[0].split(',');
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse (no quoted fields in this dataset)
    const values = line.split(',');
    if (values.length < 17) continue;

    rows.push({
      nombre: values[0],
      apellido_1: values[1],
      apellido_2: values[2],
      sexo: values[3],
      edad: parseInt(values[4]) || 0,
      n_puesto: values[5],
      id_tipo_nomina: parseInt(values[6]) || 0,
      tipo_contratacion: values[7],
      tipo_personal: values[8],
      fecha_ingreso: values[9],
      id_universo: values[10],
      n_universo: values[11],
      id_sector: values[12],
      n_cabeza_sector: values[13],
      id_nivel_salarial: parseInt(values[14]) || 0,
      sueldo_tabular_bruto: parseFloat(values[15]) || 0,
      sueldo_tabular_neto: parseFloat(values[16]) || 0,
    });
  }

  return rows;
}

function getMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

console.log('Reading CSV...');
const csv = readFileSync(CSV_PATH, 'utf-8');
const rows = parseCSV(csv);
console.log(`Parsed ${rows.length} records`);

// --- Basic totals ---
const totalServidores = rows.length;
const salaries = rows.map(r => r.sueldo_tabular_bruto).filter(s => s > 0);
const sortedSalaries = [...salaries].sort((a, b) => a - b);
const avgSalary = round2(salaries.reduce((s, v) => s + v, 0) / salaries.length);
const medianSalary = round2(getMedian(salaries));
const minSalary = round2(sortedSalaries[0]);
const maxSalary = round2(sortedSalaries[sortedSalaries.length - 1]);
const p25 = round2(getPercentile(sortedSalaries, 25));
const p50 = round2(getPercentile(sortedSalaries, 50));
const p75 = round2(getPercentile(sortedSalaries, 75));
const p90 = round2(getPercentile(sortedSalaries, 90));

// --- Salary distribution (5 ranges) ---
const salaryRanges = [
  { label: 'Menos de $5K', min: 0, max: 5000 },
  { label: '$5K - $10K', min: 5000, max: 10000 },
  { label: '$10K - $20K', min: 10000, max: 20000 },
  { label: '$20K - $40K', min: 20000, max: 40000 },
  { label: 'Más de $40K', min: 40000, max: Infinity },
];
const salaryDistribution = salaryRanges.map(r => ({
  label: r.label,
  count: salaries.filter(s => s >= r.min && s < r.max).length,
}));

// --- Age distribution ---
const ageGroups = [
  { label: '18-25', min: 18, max: 25 },
  { label: '26-35', min: 26, max: 35 },
  { label: '36-45', min: 36, max: 45 },
  { label: '46-55', min: 46, max: 55 },
  { label: '56+', min: 56, max: 200 },
];
const ageDistribution = ageGroups.map(g => ({
  label: g.label,
  count: rows.filter(r => r.edad >= g.min && r.edad <= g.max).length,
}));

// --- Gender ---
const hombres = rows.filter(r => r.sexo === 'MASCULINO').length;
const mujeres = rows.filter(r => r.sexo === 'FEMENINO').length;

const salariesMale = rows.filter(r => r.sexo === 'MASCULINO' && r.sueldo_tabular_bruto > 0).map(r => r.sueldo_tabular_bruto);
const salariesFemale = rows.filter(r => r.sexo === 'FEMENINO' && r.sueldo_tabular_bruto > 0).map(r => r.sueldo_tabular_bruto);
const avgSalaryMale = round2(salariesMale.reduce((s, v) => s + v, 0) / salariesMale.length);
const avgSalaryFemale = round2(salariesFemale.reduce((s, v) => s + v, 0) / salariesFemale.length);
const genderGapPercent = round2(((avgSalaryMale - avgSalaryFemale) / avgSalaryMale) * 100);

// --- Contract types ---
const contractCounts: Record<string, number> = {};
rows.forEach(r => {
  const t = r.tipo_contratacion || 'SIN DEFINIR';
  contractCounts[t] = (contractCounts[t] || 0) + 1;
});
const contractTypes = Object.entries(contractCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([label, count]) => ({ label, count }));

// --- Salary by age group ---
const salaryByAge = ageGroups.map(g => {
  const groupSalaries = rows
    .filter(r => r.edad >= g.min && r.edad <= g.max && r.sueldo_tabular_bruto > 0)
    .map(r => r.sueldo_tabular_bruto);
  return {
    label: g.label,
    avg: groupSalaries.length > 0 ? round2(groupSalaries.reduce((s, v) => s + v, 0) / groupSalaries.length) : 0,
  };
});

// --- Personnel types ---
const personalCounts: Record<string, number> = {};
rows.forEach(r => {
  const t = r.tipo_personal || 'SIN DEFINIR';
  personalCounts[t] = (personalCounts[t] || 0) + 1;
});
const personalTypes = Object.entries(personalCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([label, count]) => ({ label, count }));

// --- Sectors ---
const sectorMap: Record<string, { count: number; totalBruto: number; countM: number; totalM: number; countF: number; totalF: number }> = {};
rows.forEach(r => {
  const sector = r.n_cabeza_sector || 'SIN DEFINIR';
  if (!sectorMap[sector]) {
    sectorMap[sector] = { count: 0, totalBruto: 0, countM: 0, totalM: 0, countF: 0, totalF: 0 };
  }
  const s = sectorMap[sector];
  s.count++;
  s.totalBruto += r.sueldo_tabular_bruto;
  if (r.sexo === 'MASCULINO' && r.sueldo_tabular_bruto > 0) {
    s.countM++;
    s.totalM += r.sueldo_tabular_bruto;
  }
  if (r.sexo === 'FEMENINO' && r.sueldo_tabular_bruto > 0) {
    s.countF++;
    s.totalF += r.sueldo_tabular_bruto;
  }
});

const sectors = Object.entries(sectorMap)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([name, s]) => ({
    name,
    count: s.count,
    avgSalary: s.count > 0 ? round2(s.totalBruto / s.count) : 0,
    avgMale: s.countM > 0 ? round2(s.totalM / s.countM) : 0,
    avgFemale: s.countF > 0 ? round2(s.totalF / s.countF) : 0,
  }));

const totalSectors = sectors.length;
const top15Sectors = sectors.slice(0, 15);
const allSectors = sectors;

// --- Gender gap by sector (top sectors with both genders) ---
const genderGapBySector = sectors
  .filter(s => s.avgMale > 0 && s.avgFemale > 0)
  .map(s => ({
    name: s.name,
    avgMale: s.avgMale,
    avgFemale: s.avgFemale,
    gap: round2(((s.avgMale - s.avgFemale) / s.avgMale) * 100),
  }))
  .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
  .slice(0, 10);

// --- Seniority (antigüedad from fecha_ingreso) ---
const now = new Date();
function parseDate(s: string): Date | null {
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  const m = parseInt(parts[0]) - 1;
  const d = parseInt(parts[1]);
  const y = parseInt(parts[2]);
  if (isNaN(m) || isNaN(d) || isNaN(y) || y < 1950 || y > now.getFullYear()) return null;
  return new Date(y, m, d);
}

const seniorityYears: number[] = [];
rows.forEach(r => {
  const d = parseDate(r.fecha_ingreso);
  if (d) {
    const years = (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (years >= 0 && years <= 60) seniorityYears.push(round2(years));
  }
});

const seniorityGroups = [
  { label: '0-2 años', min: 0, max: 2 },
  { label: '3-5 años', min: 2, max: 5 },
  { label: '6-10 años', min: 5, max: 10 },
  { label: '11-20 años', min: 10, max: 20 },
  { label: '21-30 años', min: 20, max: 30 },
  { label: '30+ años', min: 30, max: 100 },
];

const seniorityDistribution = seniorityGroups.map(g => ({
  label: g.label,
  count: seniorityYears.filter(y => y >= g.min && y < g.max).length,
}));

const salaryBySeniority = seniorityGroups.map(g => {
  const groupSalaries: number[] = [];
  rows.forEach(r => {
    const d = parseDate(r.fecha_ingreso);
    if (d && r.sueldo_tabular_bruto > 0) {
      const years = (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (years >= g.min && years < g.max) groupSalaries.push(r.sueldo_tabular_bruto);
    }
  });
  return {
    label: g.label,
    avg: groupSalaries.length > 0 ? round2(groupSalaries.reduce((s, v) => s + v, 0) / groupSalaries.length) : 0,
    count: groupSalaries.length,
  };
});

const avgSeniority = seniorityYears.length > 0
  ? round2(seniorityYears.reduce((s, v) => s + v, 0) / seniorityYears.length)
  : 0;

// --- Bruto vs Neto ---
const netSalaries = rows.map(r => r.sueldo_tabular_neto).filter(s => s > 0);
const avgNetSalary = round2(netSalaries.reduce((s, v) => s + v, 0) / netSalaries.length);
const avgDeduction = round2(avgSalary - avgNetSalary);
const avgDeductionPercent = round2((avgDeduction / avgSalary) * 100);

const brutoNetoByRange = salaryRanges.map(r => {
  const inRange = rows.filter(row => row.sueldo_tabular_bruto >= r.min && row.sueldo_tabular_bruto < r.max && row.sueldo_tabular_bruto > 0 && row.sueldo_tabular_neto > 0);
  const avgB = inRange.length > 0 ? round2(inRange.reduce((s, row) => s + row.sueldo_tabular_bruto, 0) / inRange.length) : 0;
  const avgN = inRange.length > 0 ? round2(inRange.reduce((s, row) => s + row.sueldo_tabular_neto, 0) / inRange.length) : 0;
  return { label: r.label, avgBruto: avgB, avgNeto: avgN, count: inRange.length };
});

// --- Top 10 highest paid positions ---
const puestoMap: Record<string, { count: number; totalBruto: number }> = {};
rows.forEach(r => {
  const puesto = r.n_puesto || 'SIN DEFINIR';
  if (!puestoMap[puesto]) puestoMap[puesto] = { count: 0, totalBruto: 0 };
  puestoMap[puesto].count++;
  puestoMap[puesto].totalBruto += r.sueldo_tabular_bruto;
});

const topPositions = Object.entries(puestoMap)
  .map(([name, p]) => ({
    name,
    count: p.count,
    avgSalary: p.count > 0 ? round2(p.totalBruto / p.count) : 0,
  }))
  .sort((a, b) => b.avgSalary - a.avgSalary)
  .slice(0, 10);

// --- Build output ---
const stats = {
  extractDate: new Date().toISOString(),
  source: 'Datos Abiertos CDMX - Remuneraciones de Servidores Públicos',
  totalServidores,
  totalSectors,
  avgSalary,
  medianSalary,
  minSalary,
  maxSalary,
  p25,
  p50,
  p75,
  p90,
  genderGapPercent,
  hombres,
  mujeres,
  avgSalaryMale,
  avgSalaryFemale,
  salaryDistribution,
  ageDistribution,
  contractTypes,
  salaryByAge,
  personalTypes,
  top15Sectors,
  allSectors,
  genderGapBySector,
  topPositions,
  seniorityDistribution,
  salaryBySeniority,
  avgSeniority,
  avgNetSalary,
  avgDeduction,
  avgDeductionPercent,
  brutoNetoByRange,
};

// Verify key totals
console.log(`\n--- Verification ---`);
console.log(`Total servidores: ${totalServidores}`);
console.log(`Total sectores: ${totalSectors}`);
console.log(`Avg salary: $${avgSalary.toLocaleString()}`);
console.log(`Gender gap: ${genderGapPercent}%`);
console.log(`Hombres: ${hombres}, Mujeres: ${mujeres}`);
console.log(`Salary dist: ${salaryDistribution.map(s => `${s.label}=${s.count}`).join(', ')}`);
console.log(`Contract types: ${contractTypes.length}`);
console.log(`Personnel types: ${personalTypes.length}`);
console.log(`Avg seniority: ${avgSeniority} years`);
console.log(`Seniority records: ${seniorityYears.length}`);
console.log(`Avg net salary: $${avgNetSalary}, deduction: ${avgDeductionPercent}%`);

const output = `// AUTO-GENERATED by scripts/extract-stats.ts — DO NOT EDIT
// Generated: ${new Date().toISOString()}

export const stats = ${JSON.stringify(stats, null, 2)} as const;

export type Stats = typeof stats;
`;

writeFileSync(OUTPUT_PATH, output, 'utf-8');
console.log(`\nWritten to ${OUTPUT_PATH} (${(output.length / 1024).toFixed(1)} KB)`);
