// Caveats reutilizables para sub-secciones /consar/<slug>.
//
// 3 helpers:
//   buildHeroCaveats — bloque inline cerca del hero, items con bullet
//   buildMappingFlagBadge — pill amarilla para mapping_validated=FALSE
//   buildSourceFooter — caveat-card al pie con metodología/fuente/validación

export interface HeroCaveat {
  text: string;          // texto descriptivo (sin emojis ni juicio)
  emphasis?: boolean;    // si true, render con borde acentuado
}

export function buildHeroCaveats(opts: {
  title?: string;
  items: HeroCaveat[];
}): string {
  const title = opts.title ?? 'Caveats que forman parte del mensaje';
  const lis = opts.items.map(it => {
    const cls = it.emphasis ? ' consar-hero-caveat-item--emph' : '';
    return `<li class="consar-hero-caveat-item${cls}">${it.text}</li>`;
  }).join('');
  return `
    <aside class="consar-hero-caveats" aria-label="Caveats">
      <div class="consar-hero-caveats-title">${escapeHtml(title)}</div>
      <ol class="consar-hero-caveats-list">${lis}</ol>
    </aside>
  `;
}

/**
 * Badge amarillo para indicar que un mapping (afore × siefore × dataset)
 * fue inferido por orden lexicográfico (no docs-confirmed).
 *
 * Uso típico: en columna "mapping" de tablas de #07/#10 cuando el
 * `mapping_meta.mapping_validated === false`. Solo 2 entries en
 * `consar.afore_siefore_alias` tienen este flag (sura av2/av3).
 */
export function buildMappingFlagBadge(validated: boolean | null, validatedVia?: string | null): string {
  if (validated === false || validated == null) {
    const tip = validatedVia
      ? `Mapping inferido por ${escapeHtml(validatedVia)}; no confirmado en publicaciones CONSAR.`
      : 'Mapping inferido; no confirmado en publicaciones CONSAR.';
    return `<span class="consar-mapping-badge consar-mapping-badge--inferred" title="${tip}" aria-label="${tip}">inferido</span>`;
  }
  return `<span class="consar-mapping-badge consar-mapping-badge--confirmed" title="Mapping confirmado vs publicación CONSAR" aria-label="confirmado">confirmado</span>`;
}

/**
 * Caveat-card al pie: misma estructura que `buildCaveat()` de
 * consar/components.ts pero independiente para no acoplar módulos.
 */
export function buildSourceFooter(opts: {
  unidad: string;
  fuente: string;
  fuenteUrl?: string;
  metodologia: string;
  endpoint: string;          // path relativo, p.ej. '/consar/pea-cotizantes/serie'
}): string {
  const fuenteHtml = opts.fuenteUrl
    ? `<a href="${escapeHtml(opts.fuenteUrl)}" target="_blank" rel="noopener">${escapeHtml(opts.fuente)}</a>`
    : escapeHtml(opts.fuente);
  const swaggerUrl = `https://api.datos-itam.org/docs#/consar`;
  return `
    <section class="consar-source-footer" aria-label="Fuente y metodología">
      <div class="consar-source-row"><strong>Unidad:</strong> ${escapeHtml(opts.unidad)}</div>
      <div class="consar-source-row"><strong>Fuente:</strong> ${fuenteHtml}</div>
      <div class="consar-source-row"><strong>Metodología:</strong> ${escapeHtml(opts.metodologia)}</div>
      <div class="consar-source-row"><strong>Endpoint:</strong> <code>${escapeHtml(opts.endpoint)}</code> · <a href="${swaggerUrl}" target="_blank" rel="noopener">documentación Swagger</a></div>
    </section>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => {
    const map: Record<string, string> = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    return map[c];
  });
}
