import { stats } from '../data/stats';

export function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('es-MX');
}

export function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-content">
        <p class="hero-text">
          Analisis de las remuneraciones de <strong>${formatNumber(stats.totalServidores)}</strong> servidores publicos
          del Gobierno de la Ciudad de Mexico, distribuidos en <strong>${stats.totalSectors} sectores</strong>.
          Datos certificados y de acceso publico.
        </p>
        <div class="hero-badges">
          <span class="hero-badge">Certificado por World Data Foundation</span>
          <span class="hero-badge">Fuente: Datos Abiertos CDMX</span>
          <span class="hero-badge">Proyecto academico ITAM</span>
        </div>
      </div>
    </section>
  `;
}

export function buildInsights(): string {
  // Find the salary range with most people
  const topRange = stats.salaryDistribution.reduce((a, b) => b.count > a.count ? b : a);
  const topRangePct = ((topRange.count / stats.totalServidores) * 100).toFixed(0);

  // Find top sector by avg salary
  const topPaidSector = [...stats.allSectors].sort((a, b) => b.avgSalary - a.avgSalary)[0];

  // Under 20K percentage
  const under20K = stats.salaryDistribution
    .filter(s => s.label !== 'Más de $40K' && s.label !== '$20K - $40K')
    .reduce((sum, s) => sum + s.count, 0);
  const under20KPct = ((under20K / stats.totalServidores) * 100).toFixed(0);

  return `
    <section class="insights">
      <h3 class="insights-title">Hallazgos clave</h3>
      <div class="insights-grid">
        <div class="insight">
          <span class="insight-icon">&#9679;</span>
          <span>El <strong>${under20KPct}%</strong> de los servidores gana menos de $20,000 mensuales brutos.</span>
        </div>
        <div class="insight">
          <span class="insight-icon">&#9679;</span>
          <span>El rango salarial mas comun es <strong>${topRange.label}</strong>, con ${formatNumber(topRange.count)} servidores (${topRangePct}%).</span>
        </div>
        <div class="insight">
          <span class="insight-icon">&#9679;</span>
          <span>La antiguedad promedio es <strong>${stats.avgSeniority} años</strong>, pero el salario apenas varia con la experiencia.</span>
        </div>
        <div class="insight">
          <span class="insight-icon">&#9679;</span>
          <span>En promedio se deduce el <strong>${stats.avgDeductionPercent}%</strong> del sueldo bruto — de ${formatCurrency(stats.avgSalary)} a ${formatCurrency(stats.avgNetSalary)} netos.</span>
        </div>
      </div>
    </section>
  `;
}

export function buildKPIs(): string {
  return `
    <div class="kpis">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Total Servidores</div>
        <div class="kpi-value" id="kpi-total" data-target="${stats.totalServidores}">0</div>
        <div class="kpi-sub">Servidores publicos CDMX</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Sueldo Promedio</div>
        <div class="kpi-value" id="kpi-salary" data-target="${stats.avgSalary}" data-prefix="$">$0</div>
        <div class="kpi-sub">Sueldo tabular bruto mensual</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Brecha Salarial</div>
        <div class="kpi-value" id="kpi-gap" data-target="${stats.genderGapPercent}" data-suffix="%" data-decimals="2">0%</div>
        <div class="kpi-sub">Diferencia hombres vs mujeres</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Sectores</div>
        <div class="kpi-value" id="kpi-sectors" data-target="${stats.totalSectors}">0</div>
        <div class="kpi-sub">Dependencias y alcaldias</div>
      </div>
    </div>
  `;
}

export function buildSectorFilter(): string {
  const options = stats.allSectors
    .map(s => `<option value="${s.name}">${s.name} (${s.count.toLocaleString('es-MX')})</option>`)
    .join('');

  return `
    <div class="sector-filter">
      <label for="sectorSelect">Filtrar por sector:</label>
      <select id="sectorSelect">
        <option value="">— Selecciona un sector —</option>
        ${options}
      </select>
    </div>
    <div id="sectorPanel" class="sector-panel" style="display:none">
      <div class="sector-panel-title" id="sectorName"></div>
      <div class="sector-panel-grid">
        <div class="sector-stat">
          <div class="sector-stat-label">Servidores</div>
          <div class="sector-stat-value" id="sectorCount">—</div>
        </div>
        <div class="sector-stat">
          <div class="sector-stat-label">Sueldo Promedio</div>
          <div class="sector-stat-value" id="sectorAvgSalary">—</div>
        </div>
        <div class="sector-stat">
          <div class="sector-stat-label">Promedio Hombres</div>
          <div class="sector-stat-value" id="sectorAvgMale">—</div>
        </div>
        <div class="sector-stat">
          <div class="sector-stat-label">Promedio Mujeres</div>
          <div class="sector-stat-value" id="sectorAvgFemale">—</div>
        </div>
      </div>
    </div>
  `;
}

export function buildSalaryStats(): string {
  return `
    <div class="chart-card">
      <h3>Estadisticas Salariales</h3>
      <div class="stats-panel">
        <div>
          <div class="stat-row">
            <span class="stat-label">Promedio</span>
            <span class="stat-value">${formatCurrency(stats.avgSalary)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Mediana</span>
            <span class="stat-value">${formatCurrency(stats.medianSalary)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Minimo</span>
            <span class="stat-value">${formatCurrency(stats.minSalary)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Maximo</span>
            <span class="stat-value">${formatCurrency(stats.maxSalary)}</span>
          </div>
        </div>
        <div>
          <div class="stat-row">
            <span class="stat-label">P25</span>
            <span class="stat-value">${formatCurrency(stats.p25)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">P50 (Mediana)</span>
            <span class="stat-value">${formatCurrency(stats.p50)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">P75</span>
            <span class="stat-value">${formatCurrency(stats.p75)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">P90</span>
            <span class="stat-value">${formatCurrency(stats.p90)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildGenderAnalysis(): string {
  const gapAbs = Math.abs(stats.genderGapPercent);

  let severityClass = 'gap-low';
  let severityLabel = 'Baja';
  if (gapAbs > 20) {
    severityClass = 'gap-high';
    severityLabel = 'Alta';
  } else if (gapAbs > 10) {
    severityClass = 'gap-medium';
    severityLabel = 'Media';
  }

  const maxSalary = Math.max(stats.avgSalaryMale, stats.avgSalaryFemale);
  const maleBarPct = maxSalary > 0 ? (stats.avgSalaryMale / maxSalary) * 100 : 0;
  const femaleBarPct = maxSalary > 0 ? (stats.avgSalaryFemale / maxSalary) * 100 : 0;

  return `
    <div class="chart-card">
      <h3>Brecha Salarial por Genero</h3>
      <div class="gender-gap-display">
        <div class="gap-value ${severityClass}">${gapAbs.toFixed(1)}%</div>
        <div class="gap-severity ${severityClass}">Brecha ${severityLabel}</div>
        <div class="gap-description">Diferencia salarial promedio entre hombres y mujeres</div>
      </div>
      <div class="gap-bar-group">
        <div class="gap-bar-row">
          <span class="gap-bar-label">Hombres (${formatNumber(stats.hombres)})</span>
          <div class="gap-bar-track">
            <div class="gap-bar gap-bar--male" style="width: ${maleBarPct}%"></div>
          </div>
          <span class="gap-bar-value">${formatCurrency(stats.avgSalaryMale)}</span>
        </div>
        <div class="gap-bar-row">
          <span class="gap-bar-label">Mujeres (${formatNumber(stats.mujeres)})</span>
          <div class="gap-bar-track">
            <div class="gap-bar gap-bar--female" style="width: ${femaleBarPct}%"></div>
          </div>
          <span class="gap-bar-value">${formatCurrency(stats.avgSalaryFemale)}</span>
        </div>
      </div>
    </div>
  `;
}

export function buildBrutoNeto(): string {
  return `
    <div class="chart-card">
      <h3>Sueldo Bruto vs Neto</h3>
      <div class="bruto-neto-summary">
        <div class="bn-row">
          <span class="bn-label">Promedio Bruto</span>
          <span class="bn-value">${formatCurrency(stats.avgSalary)}</span>
        </div>
        <div class="bn-row">
          <span class="bn-label">Promedio Neto</span>
          <span class="bn-value">${formatCurrency(stats.avgNetSalary)}</span>
        </div>
        <div class="bn-row bn-deduction">
          <span class="bn-label">Deduccion Promedio</span>
          <span class="bn-value">${formatCurrency(stats.avgDeduction)} (${stats.avgDeductionPercent}%)</span>
        </div>
      </div>
      <div class="chart-wrapper" style="height: 220px;">
        <canvas id="brutoNetoChart"></canvas>
      </div>
    </div>
  `;
}

export function buildGenderGapTable(): string {
  const rows = stats.genderGapBySector.map(s => {
    const gapAbs = Math.abs(s.gap);
    let badgeClass = 'badge--neutral';
    if (s.gap > 5) badgeClass = 'badge--positive';
    else if (s.gap < -5) badgeClass = 'badge--negative';

    return `
      <tr>
        <td>${s.name}</td>
        <td>${formatCurrency(s.avgMale)}</td>
        <td>${formatCurrency(s.avgFemale)}</td>
        <td><span class="badge ${badgeClass}">${s.gap > 0 ? '+' : ''}${s.gap.toFixed(1)}%</span></td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-section">
      <h3>Brecha Salarial por Sector (Top 10)</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sector</th>
              <th>Promedio Hombres</th>
              <th>Promedio Mujeres</th>
              <th>Brecha</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function buildAboutSection(): string {
  return `
    <section class="about-section">
      <h3>Sobre estos datos</h3>
      <div class="about-grid">
        <div class="about-card">
          <div class="about-card-title">Fuente</div>
          <p>Dataset de remuneraciones del <strong>Gobierno de la Ciudad de Mexico</strong>, publicado en el portal de <a href="https://datos.cdmx.gob.mx/dataset/remuneraciones-al-personal-de-la-ciudad-de-mexico" target="_blank" rel="noopener">Datos Abiertos CDMX</a>. Contiene informacion de ${formatNumber(stats.totalServidores)} servidores publicos.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">Certificacion</div>
          <p>Datos certificados por la <strong>World Data Foundation</strong>. Integridad verificada con hash SHA-256. Los datos son de acceso publico bajo licencia Open Data del Gobierno de la CDMX.</p>
        </div>
        <div class="about-card">
          <div class="about-card-title">Proyecto</div>
          <p>Desarrollado como <strong>proyecto academico del ITAM</strong>. El analisis es automatizado: las estadisticas se generan directamente del dataset original sin modificacion de los datos fuente.</p>
        </div>
      </div>
    </section>
  `;
}

export function buildTopPositionsTable(): string {
  const rows = stats.topPositions.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${formatNumber(p.count)}</td>
      <td>${formatCurrency(p.avgSalary)}</td>
    </tr>
  `).join('');

  return `
    <div class="table-section">
      <h3>Top 10 Puestos Mejor Pagados</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Cantidad</th>
              <th>Sueldo Promedio</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
