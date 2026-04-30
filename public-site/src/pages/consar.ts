import { CSS } from '../styles';
import { buildNavTabs } from '../shared/nav';
import { buildConsarSubnav } from '../consar-extra/shared/nav';
import { CONSAR_EXTRA_CSS } from '../consar-extra/shared/styles';
import {
  buildConsarHero,
  buildD1_Totales,
  buildD2_Composicion,
  buildD3_Concentracion,
  buildD4_ImssVsIssste,
  buildD5_Vivienda,
  buildD6_PensionBienestar,
  buildD7_Catalogos,
  buildConsarAbout,
} from '../consar/components';
import { buildConsarChartsScript } from '../consar/charts';
import { buildConsarLiveDataScript } from '../consar/live-data';
import { CONSAR_SEED } from '../consar/seed';

export function renderConsarDashboard(): string {
  const buildDate = new Date(CONSAR_SEED.buildDate).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>datos-itam | CONSAR AFORE · Recursos del SAR 1998-2025</title>
  <meta name="description" content="Serie mensual pública de recursos registrados en el Sistema de Ahorro para el Retiro mexicano. 326 meses, 11 AFOREs, 15 conceptos. Identidad contable verificada al peso (98.83%).">
  <meta property="og:title" content="CONSAR AFORE — Observatorio datos-itam">
  <meta property="og:description" content="Recursos del SAR mexicano 1998-2025. Siete dashboards con identidad contable verificada.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://datos-itam.org/consar">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏦</text></svg>">
  <style>${CSS}${CONSAR_EXTRA_CSS}</style>
</head>
<body>

  <header class="header">
    <div>
      <div class="header-brand">datos<span>-</span>itam</div>
      <div class="header-subtitle">CONSAR AFORE — Recursos del SAR 1998-2025</div>
    </div>
    <div class="header-meta">
      <span class="live-badge" id="consarLiveBadge">EN VIVO</span>
      <span class="header-badge">Validado: ${buildDate}</span>
      <span class="header-badge">7 dashboards</span>
    </div>
  </header>

  ${buildNavTabs('consar')}
  ${buildConsarSubnav('overview')}

  <main class="container">

    ${buildConsarHero()}

    <!-- Orden: D1 hero → D2 DESTACADO composición → D3 concentración → D4 IMSS vs ISSSTE
         → D5 vivienda → D6 Pensión Bienestar → D7 catálogos -->
    ${buildD1_Totales()}
    ${buildD2_Composicion()}
    ${buildD3_Concentracion()}
    ${buildD4_ImssVsIssste()}
    ${buildD5_Vivienda()}
    ${buildD6_PensionBienestar()}
    ${buildD7_Catalogos()}

    ${buildConsarAbout()}

  </main>

  ${buildConsarChartsScript()}
  ${buildConsarLiveDataScript()}

</body>
</html>`;
}
