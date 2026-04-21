const API_BASE = 'https://api.datos-itam.org';

export function buildAnalyticsChartsSection(): string {
  return `
    <h2 class="section-title">Analisis avanzado</h2>
    <div class="charts-grid">
      <div class="chart-card full-width">
        <h3>Ranking de puestos por sueldo promedio (top 20)</h3>
        <p class="chart-note">Con rank, percentil salarial y diferencia vs el puesto siguiente (<code>RANK</code>, <code>PERCENT_RANK</code>, <code>LAG</code>).</p>
        <div class="chart-wrapper chart-wrapper--tall">
          <canvas id="puestosRankingChart"></canvas>
        </div>
      </div>
    </div>
    <div class="charts-grid">
      <div class="chart-card full-width">
        <h3>Brecha salarial por grupo etario</h3>
        <p class="chart-note">Comparacion hombres vs mujeres con <code>AVG FILTER</code> y referencia global via <code>AVG OVER</code>.</p>
        <div class="chart-wrapper">
          <canvas id="brechaEdadChart"></canvas>
        </div>
      </div>
    </div>
  `;
}

export function buildAnalyticsChartsScript(): string {
  return `
  <script>
  (function() {
    var API_BASE = '${API_BASE}';

    function waitChart(cb) {
      if (typeof Chart !== 'undefined') return cb();
      setTimeout(function() { waitChart(cb); }, 300);
    }

    function renderPuestos(data) {
      waitChart(function() {
        var canvas = document.getElementById('puestosRankingChart');
        if (!canvas) return;
        var labels = data.map(function(r) {
          return r.nombre.length > 48 ? r.nombre.substring(0, 46) + '...' : r.nombre;
        });
        var avgs = data.map(function(r) { return r.avg_sueldo; });
        var pcts = data.map(function(r) { return r.percent_rank * 100; });
        new Chart(canvas, {
          data: {
            labels: labels,
            datasets: [
              { type: 'bar', label: 'Sueldo promedio', data: avgs, backgroundColor: '#a855f7', borderRadius: 4, yAxisID: 'y' },
              { type: 'line', label: 'Percentil salarial', data: pcts, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.2, yAxisID: 'y1' }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    var d = data[ctx.dataIndex];
                    if (ctx.datasetIndex === 0) {
                      return 'Promedio: $' + Math.round(d.avg_sueldo).toLocaleString('es-MX') + ' (' + d.count + ' personas)';
                    }
                    var gap = d.gap_vs_next !== null ? ' (+' + Math.round(d.gap_vs_next).toLocaleString('es-MX') + ' vs sig.)' : '';
                    return 'Rank ' + d.rank + ', percentil ' + (d.percent_rank * 100).toFixed(1) + '%' + gap;
                  }
                }
              },
              legend: { position: 'bottom' }
            },
            scales: {
              y: { grid: { color: '#262626' } },
              x: { grid: { color: '#262626' }, ticks: { callback: function(v) { return '$' + v.toLocaleString('es-MX'); } } },
              y1: { display: false, position: 'right', min: 0, max: 100 }
            }
          }
        });
      });
    }

    function renderBrechaEdad(data) {
      waitChart(function() {
        var canvas = document.getElementById('brechaEdadChart');
        if (!canvas) return;
        var labels = data.map(function(r) { return r.bucket_edad; });
        new Chart(canvas, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              { label: 'Hombres (avg)', data: data.map(function(r) { return r.avg_male; }), backgroundColor: '#3b82f6', borderRadius: 4 },
              { label: 'Mujeres (avg)', data: data.map(function(r) { return r.avg_female; }), backgroundColor: '#ec4899', borderRadius: 4 },
              { type: 'line', label: 'Promedio global (AVG OVER)', data: data.map(function(r) { return r.running_avg_global; }), borderColor: '#eab308', backgroundColor: 'rgba(234,179,8,0.1)', borderDash: [6, 4], tension: 0 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  afterBody: function(items) {
                    var d = data[items[0].dataIndex];
                    if (d.gap_pct === null || d.gap_pct === undefined) return '';
                    return 'Brecha: ' + (d.gap_pct > 0 ? '+' : '') + d.gap_pct.toFixed(1) + '%';
                  }
                }
              },
              legend: { position: 'bottom' }
            },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: '#262626' }, ticks: { callback: function(v) { return '$' + v.toLocaleString('es-MX'); } } }
            }
          }
        });
      });
    }

    document.addEventListener('DOMContentLoaded', function() {
      fetch(API_BASE + '/api/v1/analytics/puestos/ranking?limit=20')
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) { if (d) renderPuestos(d); })
        .catch(function() {});

      fetch(API_BASE + '/api/v1/analytics/brecha-edad')
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) { if (d) renderBrechaEdad(d); })
        .catch(function() {});
    });
  })();
  <\/script>
  `;
}
