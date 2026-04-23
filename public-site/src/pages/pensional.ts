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
  <title>datos-itam | Pensional · CONSAR × ENIGH 2 hipótesis cuantificadas</title>
  <meta name="description" content="Hipótesis cuantificada sobre el sistema pensional mexicano — P2 partición de liquidez del SAR: 75% líquido vs 25% vinculado/operativo (vivienda + Banxico + Capital AFOREs).">
  <meta property="og:title" content="Pensional — Observatorio datos-itam">
  <meta property="og:description" content="CONSAR × ENIGH. Stock acumulado y su convertibilidad a pensión. Con caveats metodológicos.">
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
      <div class="header-subtitle">Pensional — CONSAR × ENIGH · 2 hipótesis cuantificadas</div>
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

    <!-- Orden pedagógico: P2 primero (estructural, descriptivo) → P1 (hipótesis narrativa fuerte) en commit siguiente -->
    ${buildP2_ViviendaCongelada()}

    ${buildPensionalAbout()}

  </main>

  ${buildPensionalChartsScript()}
  ${buildPensionalLiveDataScript()}

</body>
</html>`;
}
