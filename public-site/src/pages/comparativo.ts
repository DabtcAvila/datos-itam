import { CSS } from '../styles';
import { buildNavTabs } from '../shared/nav';
import {
  buildComparativoHero,
  buildD1_Ingreso,
  buildD2_DecilServidores,
  buildD3_Pensional,
  buildD4_Actividad,
  buildD5_Gastos,
  buildD6_Bancarizacion,
  buildD7_TopVsBottom,
  buildComparativoAbout,
} from '../comparativo/components';
import { buildComparativoChartsScript } from '../comparativo/charts';
import { buildComparativoLiveDataScript } from '../comparativo/live-data';
import { COMPARATIVO_SEED } from '../comparativo/seed';

export function renderComparativoDashboard(): string {
  const buildDate = new Date(COMPARATIVO_SEED.buildDate).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>datos-itam | Comparativo CDMX↔ENIGH</title>
  <meta name="description" content="Lectura cruzada de los datasets del observatorio: servidores públicos CDMX (246,831 personas) contra hogares nacionales ENIGH 2024 Nueva Serie. Siete dashboards comparativos.">
  <meta property="og:title" content="Comparativo CDMX↔ENIGH — Observatorio datos-itam">
  <meta property="og:description" content="Servidor público CDMX vs hogar mexicano. Siete lecturas cruzadas con caveats metodológicos.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://datos-itam.org/comparativo">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>">
  <style>${CSS}</style>
</head>
<body>

  <header class="header">
    <div>
      <div class="header-brand">datos<span>-</span>itam</div>
      <div class="header-subtitle">Comparativos CDMX ↔ ENIGH — lectura cruzada</div>
    </div>
    <div class="header-meta">
      <span class="live-badge" id="comparativoLiveBadge">EN VIVO</span>
      <span class="header-badge">Validado: ${buildDate}</span>
      <span class="header-badge">7 dashboards cruzados</span>
    </div>
  </header>

  ${buildNavTabs('comparativo')}

  <main class="container">

    ${buildComparativoHero()}

    <!-- Orden narrativo: D1 → D2 → D5 → D7 → D4 → D6 → D3 (cierre pensional) -->
    ${buildD1_Ingreso()}
    ${buildD2_DecilServidores()}
    ${buildD5_Gastos()}
    ${buildD7_TopVsBottom()}
    ${buildD4_Actividad()}
    ${buildD6_Bancarizacion()}
    ${buildD3_Pensional()}

    ${buildComparativoAbout()}

  </main>

  <footer class="footer">
    <p>datos-itam — Proyecto académico ITAM | Fuentes: <a href="${COMPARATIVO_SEED.sourceInegi.url}" target="_blank" rel="noopener">INEGI ENIGH 2024</a> + Cuentas Públicas CDMX</p>
  </footer>

  ${buildComparativoChartsScript()}
  ${buildComparativoLiveDataScript()}
</body>
</html>`;
}
