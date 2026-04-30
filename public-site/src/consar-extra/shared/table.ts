// Tabla genérica para sub-secciones /consar/<slug>.
// Los datos llegan vía fetch al API; el SSR renderiza header + tbody vacío
// con "Cargando…". El script inline rellena tbody en cliente.

export interface TableColumn {
  key: string;          // identificador (lo usa el script al asignar valores)
  label: string;        // texto del <th>
  align?: 'left' | 'right';   // 'right' para columnas numéricas
  width?: string;       // p.ej. '12%' o '120px'
}

export function buildTable(opts: {
  id: string;                       // id de la <table>
  columns: TableColumn[];
  loadingText?: string;             // texto en celda mientras carga
  caption?: string;                 // <caption> opcional para a11y
}): string {
  const ths = opts.columns.map(c => {
    const cls = c.align === 'right' ? ' class="num"' : '';
    const style = c.width ? ` style="width:${c.width}"` : '';
    return `<th${cls}${style}>${escapeHtml(c.label)}</th>`;
  }).join('');

  const colspan = opts.columns.length;
  const loading = opts.loadingText ?? 'Cargando…';
  const caption = opts.caption
    ? `<caption class="visually-hidden">${escapeHtml(opts.caption)}</caption>`
    : '';

  return `
    <div class="table-wrap">
      <table id="${opts.id}" class="consar-table">
        ${caption}
        <thead><tr>${ths}</tr></thead>
        <tbody>
          <tr><td colspan="${colspan}" class="consar-table-loading">${escapeHtml(loading)}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => {
    const map: Record<string, string> = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    return map[c];
  });
}
