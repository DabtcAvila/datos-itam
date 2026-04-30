// Selectores reutilizables para sub-secciones /consar/<slug>.
// Cada helper retorna HTML (string) listo para incrustar dentro de
// la barra de selectores. Los IDs se exponen para que el script
// inline pueda cablear listeners.

import { AFORE_OPTIONS, SIEFORE_OPTIONS } from './catalogos';

export interface SelectOption {
  value: string;
  label: string;
}

export function buildAforeSelect(opts: {
  id: string;
  label?: string;
  defaultValue?: string;
  includeAll?: boolean;
  /** Excluir afores específicos por código. p.ej. ['pensionissste'] */
  exclude?: string[];
}): string {
  const label = opts.label ?? 'AFORE';
  const exclude = opts.exclude ?? [];
  const filtered = AFORE_OPTIONS.filter(a => !exclude.includes(a.value));
  const allOpt = opts.includeAll
    ? `<option value="">Todas las AFOREs</option>`
    : '';
  const def = opts.defaultValue ?? '';
  const options = filtered.map(o => {
    const sel = o.value === def ? ' selected' : '';
    return `<option value="${o.value}"${sel}>${o.label}</option>`;
  }).join('');
  return `
    <label class="consar-selector">
      <span class="consar-selector-label">${label}</span>
      <select id="${opts.id}" class="consar-selector-input">
        ${allOpt}${options}
      </select>
    </label>
  `;
}

export function buildSieforeSelect(opts: {
  id: string;
  label?: string;
  defaultValue?: string;
  includeAll?: boolean;
  /** Filtrar por categoría. p.ej. ['basica_edad','basica_pensiones'] */
  categorias?: string[];
}): string {
  const label = opts.label ?? 'SIEFORE';
  const filtered = opts.categorias && opts.categorias.length
    ? SIEFORE_OPTIONS.filter(s => opts.categorias!.includes(s.categoria))
    : SIEFORE_OPTIONS;
  const allOpt = opts.includeAll
    ? `<option value="">Todas las SIEFOREs</option>`
    : '';
  const def = opts.defaultValue ?? '';
  const options = filtered.map(o => {
    const sel = o.value === def ? ' selected' : '';
    return `<option value="${o.value}"${sel}>${o.label}</option>`;
  }).join('');
  return `
    <label class="consar-selector">
      <span class="consar-selector-label">${label}</span>
      <select id="${opts.id}" class="consar-selector-input">
        ${allOpt}${options}
      </select>
    </label>
  `;
}

export function buildMonthInput(opts: {
  id: string;
  label?: string;
  defaultValue?: string;  // 'YYYY-MM'
  min?: string;
  max?: string;
}): string {
  const label = opts.label ?? 'Fecha (mes)';
  const def = opts.defaultValue ? ` value="${opts.defaultValue}"` : '';
  const min = opts.min ? ` min="${opts.min}"` : '';
  const max = opts.max ? ` max="${opts.max}"` : '';
  return `
    <label class="consar-selector">
      <span class="consar-selector-label">${label}</span>
      <input type="month" id="${opts.id}" class="consar-selector-input"${def}${min}${max}>
    </label>
  `;
}

export function buildDateInput(opts: {
  id: string;
  label?: string;
  defaultValue?: string;  // 'YYYY-MM-DD'
  min?: string;
  max?: string;
}): string {
  const label = opts.label ?? 'Fecha (día)';
  const def = opts.defaultValue ? ` value="${opts.defaultValue}"` : '';
  const min = opts.min ? ` min="${opts.min}"` : '';
  const max = opts.max ? ` max="${opts.max}"` : '';
  return `
    <label class="consar-selector">
      <span class="consar-selector-label">${label}</span>
      <input type="date" id="${opts.id}" class="consar-selector-input"${def}${min}${max}>
    </label>
  `;
}

export function buildGenericSelect(opts: {
  id: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string;
}): string {
  const def = opts.defaultValue ?? '';
  const options = opts.options.map(o => {
    const sel = o.value === def ? ' selected' : '';
    return `<option value="${o.value}"${sel}>${o.label}</option>`;
  }).join('');
  return `
    <label class="consar-selector">
      <span class="consar-selector-label">${opts.label}</span>
      <select id="${opts.id}" class="consar-selector-input">${options}</select>
    </label>
  `;
}

export function buildSelectorsBar(opts: {
  controls: string[];          // HTML pieces from build*Select
  applyButtonId?: string;
  applyButtonLabel?: string;
}): string {
  const btn = opts.applyButtonId
    ? `<button type="button" id="${opts.applyButtonId}" class="consar-apply-btn">${opts.applyButtonLabel ?? 'Aplicar'}</button>`
    : '';
  return `
    <section class="consar-selectors-bar" aria-label="Filtros del dataset">
      ${opts.controls.join('')}
      ${btn}
    </section>
  `;
}
