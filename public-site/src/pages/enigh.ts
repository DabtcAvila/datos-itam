import { CSS } from '../styles';
import { buildNavTabs } from '../shared/nav';
import {
  buildEnighHero,
  buildEnighKPIs,
  buildEnighInsights,
  buildEnighValidaciones,
  buildEnighDeciles,
  buildEnighGeografia,
  buildEnighGastosPlaceholder,
  buildEnighActividadPlaceholder,
  buildEnighDemografiaPlaceholder,
  buildEnighAbout,
} from '../enigh/components';
import { buildEnighChartsScript } from '../enigh/charts';
import { buildEnighLiveDataScript } from '../enigh/live-data';
import { ENIGH_SEED } from '../enigh/seed';

export function renderEnighDashboard(): string {
  const buildDate = new Date(ENIGH_SEED.buildDate).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>datos-itam | ENIGH 2024 — Hogares nacionales</title>
  <meta name="description" content="Observatorio de la ENIGH 2024 Nueva Serie (INEGI). 91,414 hogares muestrales, 38.8M expandidos. Ingresos, gastos, actividad económica y desigualdad por decil.">
  <meta property="og:title" content="ENIGH 2024 — Observatorio de hogares nacionales | datos-itam">
  <meta property="og:description" content="91,414 hogares muestrales expandidos a 38.8M nacionales. 13/13 validaciones INEGI passing.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://datos-itam.org/enigh">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>">
  <style>${CSS}</style>
</head>
<body>

  <header class="header">
    <div>
      <div class="header-brand">datos<span>-</span>itam</div>
      <div class="header-subtitle">ENIGH 2024 — Encuesta Nacional de Ingresos y Gastos de los Hogares</div>
    </div>
    <div class="header-meta">
      <span class="live-badge" id="enighLiveBadge">EN VIVO</span>
      <span class="header-badge">Validado: ${buildDate}</span>
      <span class="header-badge">Fuente: INEGI ENIGH 2024 NS</span>
    </div>
  </header>

  ${buildNavTabs('enigh')}

  <main class="container">

    <!-- 1. HERO + KPIs + HALLAZGOS -->
    ${buildEnighHero()}
    ${buildEnighKPIs()}
    ${buildEnighInsights()}

    <!-- 7. VALIDACIONES contra INEGI (se muestra temprano como meta-mensaje del observatorio) -->
    <h2 class="section-title">Reproducibilidad contra publicación oficial INEGI</h2>
    ${buildEnighValidaciones()}

    <!-- 2. DECIL -->
    ${buildEnighDeciles()}

    <!-- 3. GEOGRAFÍA -->
    ${buildEnighGeografia()}

    <!-- 4. GASTOS RUBRO — placeholder hasta commit 4 -->
    ${buildEnighGastosPlaceholder()}

    <!-- 5. ACTIVIDAD ECONÓMICA — placeholder hasta commit 4 -->
    ${buildEnighActividadPlaceholder()}

    <!-- 6. DEMOGRAFÍA — placeholder hasta commit 4 -->
    ${buildEnighDemografiaPlaceholder()}

    <!-- 8. ABOUT -->
    ${buildEnighAbout()}

  </main>

  <footer class="footer">
    <p>datos-itam — Proyecto académico ITAM | Fuente: <a href="${ENIGH_SEED.sourceInegi.url}" target="_blank" rel="noopener">INEGI ENIGH 2024 Nueva Serie</a></p>
  </footer>

  ${buildEnighChartsScript()}
  ${buildEnighLiveDataScript()}
</body>
</html>`;
}
