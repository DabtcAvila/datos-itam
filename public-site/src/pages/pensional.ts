import { CSS } from '../styles';
import { buildNavTabs } from '../shared/nav';
import {
  buildPensionalHero,
  buildP2_ViviendaCongelada,
  buildPensionalAbout,
} from '../pensional/components';
import { buildPensionalChartsScript } from '../pensional/charts';
import { buildPensionalLiveDataScript } from '../pensional/live-data';
import { PENSIONAL_SEED } from '../pensional/seed';

export function renderPensionalDashboard(): string {
  const buildDate = new Date(PENSIONAL_SEED.buildDate).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>datos-itam | Pensional · Composición descriptiva SAR</title>
  <meta name="description" content="Desglose descriptivo del SAR mexicano junio 2025 en tres categorías de liquidez según la legislación aplicable. Snapshot oficial CONSAR, sin interpretación del observatorio.">
  <meta property="og:title" content="Pensional — Observatorio datos-itam">
  <meta property="og:description" content="CONSAR 2025-06. Composición descriptiva del SAR por régimen de liquidez.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://datos-itam.org/pensional">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚖️</text></svg>">
  <style>${CSS}</style>
</head>
<body>

  <header class="header">
    <div>
      <div class="header-brand">datos<span>-</span>itam</div>
      <div class="header-subtitle">Pensional — CONSAR · composición descriptiva</div>
    </div>
    <div class="header-meta">
      <span class="live-badge" id="pensionalLiveBadge">EN VIVO</span>
      <span class="header-badge">Validado: ${buildDate}</span>
      <span class="header-badge">1 dashboard</span>
    </div>
  </header>

  ${buildNavTabs('pensional')}

  <main class="container">

    ${buildPensionalHero()}

    ${buildP2_ViviendaCongelada()}

    ${buildPensionalAbout()}

  </main>

  ${buildPensionalChartsScript()}
  ${buildPensionalLiveDataScript()}

</body>
</html>`;
}
