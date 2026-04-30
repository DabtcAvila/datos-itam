// Orchestrator único para sub-secciones /consar/<slug>.
//
// Phase A: solo dispatch a 'pea-cotizantes'.
// Phases B/C/D agregarán case statements adicionales.
//
// Retorna `null` si el slug no existe — index.ts decide qué hacer
// (404 o fallback).

import { CSS } from '../styles';
import { buildNavTabs } from '../shared/nav';
import { buildConsarSubnav, getConsarItem } from '../consar-extra/shared/nav';
import { CONSAR_EXTRA_CSS } from '../consar-extra/shared/styles';
import { buildPeaCotizantes } from '../consar-extra/datasets/pea-cotizantes';

export function renderConsarDataset(slug: string): string | null {
  const item = getConsarItem(slug);
  if (!item || item.slug === 'overview') return null;

  let payload: { title: string; metaDescription: string; hero: string; body: string; script: string };
  switch (slug) {
    case 'pea-cotizantes':
      payload = buildPeaCotizantes();
      break;
    // case 'comisiones': payload = buildComisiones(); break;     // Phase B
    // case 'flujos':     payload = buildFlujos(); break;          // Phase B
    // case 'traspasos':  payload = buildTraspasos(); break;       // Phase B
    // ... etc
    default:
      // El slug está registrado en CONSAR_SUBNAV pero el módulo no existe
      // todavía (caso esperado durante Phases B-D). Tratamos como "no encontrado".
      return null;
  }

  return renderShell(slug, item.label, payload);
}

function renderShell(
  slug: string,
  itemLabel: string,
  p: { title: string; metaDescription: string; hero: string; body: string; script: string },
): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>datos-itam | ${escapeAttr(p.title)}</title>
  <meta name="description" content="${escapeAttr(p.metaDescription)}">
  <meta property="og:title" content="${escapeAttr(p.title)}">
  <meta property="og:description" content="${escapeAttr(p.metaDescription)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://datos-itam.org/consar/${slug}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏦</text></svg>">
  <style>${CSS}${CONSAR_EXTRA_CSS}</style>
</head>
<body>

  <header class="header">
    <div>
      <div class="header-brand">datos<span>-</span>itam</div>
      <div class="header-subtitle">CONSAR · ${escapeAttr(itemLabel)}</div>
    </div>
    <div class="header-meta">
      <span class="live-badge" id="consarLiveBadge">EN VIVO</span>
      <span class="header-badge"><a href="/consar" style="color:inherit;text-decoration:none">← Volver a CONSAR</a></span>
    </div>
  </header>

  ${buildNavTabs('consar')}
  ${buildConsarSubnav(slug)}

  <main class="container">
    ${p.hero}
    ${p.body}

    <footer class="footer">
      <p>Sub-sección del observatorio CONSAR · datos directos de <a href="https://api.datos-itam.org/docs#/consar" target="_blank" rel="noopener">api.datos-itam.org/docs</a> (público, sin autenticación).</p>
      <p><a href="/consar">← Volver al resumen CONSAR</a></p>
    </footer>
  </main>

  ${p.script}

</body>
</html>`;
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, c => {
    const map: Record<string, string> = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    return map[c];
  });
}
