// ENIGH charts — Chart.js 4.4.7 instances.
// Pattern: chart instances are created here with seed data (so SSR paints immediately);
// live-data.ts refreshes them via Chart.getChart().update('none') once fetch completes.

import { ENIGH_SEED } from './seed';

export function buildEnighChartsScript(): string {
  const decilLabels = JSON.stringify(['D I', 'D II', 'D III', 'D IV', 'D V', 'D VI', 'D VII', 'D VIII', 'D IX', 'D X']);
  const decilIng = JSON.stringify(ENIGH_SEED.decilesIngMensual);
  const decilGas = JSON.stringify(ENIGH_SEED.decilesGastoMensual);

  return `
  <script>
  (function() {
    function loadChartJS(cb) {
      if (typeof Chart !== 'undefined') { cb(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
      s.onload = cb;
      s.onerror = function() {
        var s2 = document.createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.7/chart.umd.min.js';
        s2.onload = cb;
        document.head.appendChild(s2);
      };
      document.head.appendChild(s);
    }

    // Count-up animation for KPIs — shared pattern with CDMX dashboard
    function animateKPIs() {
      document.querySelectorAll('.kpi-value[data-target]').forEach(function(el) {
        var target = parseFloat(el.getAttribute('data-target'));
        var prefix = el.getAttribute('data-prefix') || '';
        var suffix = el.getAttribute('data-suffix') || '';
        var decimals = parseInt(el.getAttribute('data-decimals')) || 0;
        var duration = 1200;
        var start = performance.now();
        function update(now) {
          var progress = Math.min((now - start) / duration, 1);
          var ease = 1 - Math.pow(1 - progress, 3);
          var current = target * ease;
          if (decimals > 0) {
            el.textContent = prefix + current.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
          } else {
            el.textContent = prefix + Math.round(current).toLocaleString('es-MX') + suffix;
          }
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
      });
    }

    function initCharts() {
      if (typeof Chart === 'undefined') return;
      Chart.defaults.color = '#a1a1aa';
      Chart.defaults.borderColor = '#262626';

      // Dashboard 2 — Ingresos y gastos por decil
      var decilCanvas = document.getElementById('enighDecilChart');
      if (decilCanvas) {
        new Chart(decilCanvas, {
          type: 'bar',
          data: {
            labels: ${decilLabels},
            datasets: [
              {
                label: 'Ingreso mensual',
                data: ${decilIng},
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 6,
                order: 2,
              },
              {
                label: 'Gasto mensual',
                data: ${decilGas},
                type: 'line',
                borderColor: 'rgba(234, 179, 8, 1)',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.3,
                order: 1,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { usePointStyle: true, pointStyle: 'rectRounded', padding: 16 },
              },
              tooltip: {
                callbacks: {
                  label: function(ctx) { return ctx.dataset.label + ': $' + Math.round(ctx.raw).toLocaleString('es-MX'); }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#262626' },
                ticks: { callback: function(v) { return '$' + (v/1000).toFixed(0) + 'K'; } }
              },
              x: {
                grid: { display: false },
                title: { display: true, text: 'Decil (I = más bajo, X = más alto)', color: '#71717a', font: { size: 11 } }
              }
            }
          }
        });
      }

      // Dashboard 3 — Geografía 32 entidades (created empty — populated by live-data fetch)
      var entidadCanvas = document.getElementById('enighEntidadChart');
      if (entidadCanvas) {
        new Chart(entidadCanvas, {
          type: 'bar',
          data: {
            labels: [],
            datasets: [{
              label: 'Ingreso mensual promedio',
              data: [],
              backgroundColor: [],
              borderColor: [],
              borderWidth: 1,
              borderRadius: 4,
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) { return '$' + Math.round(ctx.raw).toLocaleString('es-MX') + '/mes'; }
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                grid: { color: '#262626' },
                ticks: { callback: function(v) { return '$' + (v/1000).toFixed(0) + 'K'; } }
              },
              y: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
              }
            }
          }
        });
      }
    }

    document.addEventListener('DOMContentLoaded', function() {
      animateKPIs();
      loadChartJS(initCharts);
    });
  })();
  <\/script>
  `;
}
