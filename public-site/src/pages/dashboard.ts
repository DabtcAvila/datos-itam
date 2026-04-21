import { CSS } from '../styles';
import { stats } from '../data/stats';
import { buildHero, buildInsights, buildKPIs, buildSectorFilter, buildSalaryStats, buildBrutoNeto, buildGenderAnalysis, buildGenderGapTable, buildTopPositionsTable, buildAboutSection } from '../dashboard/components';
import { buildChartsScript } from '../dashboard/charts';
import { buildLiveDataScript } from '../dashboard/live-data';
import { buildFilterStateScript } from '../dashboard/filter-state';
import { buildFilterPanel, buildFilterPanelScript } from '../dashboard/filter-panel';
import { buildAnalyticsChartsSection, buildAnalyticsChartsScript } from '../dashboard/analytics-charts';
import { buildExplorerSection, buildExplorerScript } from '../dashboard/explorer';

export function renderDashboard(): string {
  const extractDate = new Date(stats.extractDate).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>datos-itam | Remuneraciones Servidores Publicos CDMX</title>
  <meta name="description" content="Dashboard de analisis de remuneraciones de 246,821 servidores publicos del Gobierno de la Ciudad de Mexico. Distribucion salarial, brecha de genero, sectores y mas.">
  <meta property="og:title" content="Remuneraciones Servidores Publicos CDMX | datos-itam">
  <meta property="og:description" content="246,821 servidores publicos: distribucion salarial, brecha de genero, sectores y mas.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://datos-itam.org">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="datos-itam | Remuneraciones CDMX">
  <meta name="twitter:description" content="Dashboard interactivo de remuneraciones de servidores publicos CDMX.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>">
  <style>${CSS}</style>
</head>
<body>

  <header class="header">
    <div>
      <div class="header-brand">datos<span>-</span>itam</div>
      <div class="header-subtitle">Remuneraciones de Servidores Publicos — CDMX</div>
    </div>
    <div class="header-meta">
      <span class="live-badge" id="liveBadge">EN VIVO</span>
      <span class="header-badge">Extraido: ${extractDate}</span>
      <span class="header-badge">Fuente: Datos Abiertos CDMX</span>
    </div>
  </header>

  <main class="container">

    <!-- 1. CONTEXTO: Que son estos datos y por que importan -->
    ${buildHero()}
    ${buildKPIs()}
    ${buildInsights()}

    <!-- 2. QUIENES SON: Demografia de los servidores -->
    <h2 class="section-title">Quienes son los servidores publicos</h2>
    <div class="charts-grid">
      <div class="chart-card">
        <h3>Distribucion por Genero</h3>
        <div class="chart-wrapper">
          <canvas id="genderChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Distribucion por Edad</h3>
        <div class="chart-wrapper">
          <canvas id="ageDistChart"></canvas>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3>Tipo de Contratacion</h3>
        <div class="chart-wrapper">
          <canvas id="contractChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Tipo de Personal</h3>
        <div class="chart-wrapper">
          <canvas id="personalChart"></canvas>
        </div>
      </div>
    </div>

    <!-- 3. CUANTO GANAN: Salarios, distribuciones, bruto vs neto -->
    <h2 class="section-title">Cuanto ganan</h2>
    <div class="charts-grid">
      <div class="chart-card">
        <h3>Distribucion Salarial (Sueldo Bruto Mensual)</h3>
        <div class="chart-wrapper">
          <canvas id="salaryDistChart"></canvas>
        </div>
      </div>
      ${buildSalaryStats()}
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3>Salario Promedio por Grupo de Edad</h3>
        <div class="chart-wrapper">
          <canvas id="salaryByAgeChart"></canvas>
        </div>
      </div>
      ${buildBrutoNeto()}
    </div>

    <div class="charts-grid">
      <div class="chart-card full-width">
        <h3>Antiguedad y Salario</h3>
        <div class="chart-wrapper">
          <canvas id="seniorityChart"></canvas>
        </div>
      </div>
    </div>

    ${buildTopPositionsTable()}

    <!-- 4. DONDE ESTAN LAS DESIGUALDADES: Genero y sectores -->
    <h2 class="section-title">Donde estan las desigualdades</h2>
    <div class="charts-grid">
      ${buildGenderAnalysis()}
      <div class="chart-card">
        <h3>Top 15 Sectores por Numero de Servidores</h3>
        <div class="chart-wrapper">
          <canvas id="sectorsChart"></canvas>
        </div>
      </div>
    </div>

    ${buildGenderGapTable()}

    <!-- 5. ANALISIS AVANZADO: Window functions -->
    ${buildAnalyticsChartsSection()}

    <!-- 6. EXPLORA: Filtros reactivos con estado en URL -->
    <h2 class="section-title">Explora con filtros</h2>
    ${buildFilterPanel()}

    <!-- 6b. Filtro legacy por sector (precomputado, sin fetch) -->
    <h3 class="section-subtitle">Detalle por sector (datos precomputados)</h3>
    ${buildSectorFilter()}

    <!-- 7. EXPLORADOR: Tabla paginada con buscador + export -->
    ${buildExplorerSection()}

    <!-- 8. SOBRE ESTOS DATOS -->
    ${buildAboutSection()}

  </main>

  <footer class="footer">
    <p>datos-itam — Proyecto academico ITAM | Fuente: <a href="https://datos.cdmx.gob.mx/dataset/remuneraciones-al-personal-de-la-ciudad-de-mexico" target="_blank" rel="noopener">Datos Abiertos CDMX</a></p>
  </footer>

  ${buildChartsScript()}
  ${buildLiveDataScript()}
  ${buildFilterStateScript()}
  ${buildFilterPanelScript()}
  ${buildAnalyticsChartsScript()}
  ${buildExplorerScript()}
</body>
</html>`;
}
