// Comparativo charts — Chart.js 4.4.7 instances.
// Pattern (shared with CDMX + ENIGH): chart instances are created with seed data
// so SSR paints immediately; live-data.ts refreshes them via Chart.getChart().update('none').

import { COMPARATIVO_SEED } from './seed';

export function buildComparativoChartsScript(): string {
  const d1 = COMPARATIVO_SEED.d1;
  const d4 = COMPARATIVO_SEED.d4;
  const d6 = COMPARATIVO_SEED.d6;

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

      // D1 — Tres unidades de ingreso
      var d1Canvas = document.getElementById('d1Chart');
      if (d1Canvas) {
        new Chart(d1Canvas, {
          type: 'bar',
          data: {
            labels: ['Servidor CDMX (persona)', 'Hogar nacional (ENIGH)', 'Hogar CDMX (ENIGH)'],
            datasets: [{
              label: 'Ingreso mensual promedio',
              data: [${d1.cdmxServidorMean}, ${d1.enighHogarNacionalMean}, ${d1.enighHogarCdmxMean}],
              backgroundColor: [
                'rgba(59, 130, 246, 0.85)',
                'rgba(34, 197, 94, 0.85)',
                'rgba(168, 85, 247, 0.85)',
              ],
              borderColor: [
                'rgba(59, 130, 246, 1)',
                'rgba(34, 197, 94, 1)',
                'rgba(168, 85, 247, 1)',
              ],
              borderWidth: 1,
              borderRadius: 6,
            }]
          },
          options: {
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
              y: {
                beginAtZero: true,
                grid: { color: '#262626' },
                ticks: { callback: function(v) { return '$' + (v/1000).toFixed(0) + 'K'; } }
              },
              x: { grid: { display: false } }
            }
          }
        });
      }

      // D4 — Actividad económica CDMX vs Nacional
      var d4Canvas = document.getElementById('d4Chart');
      if (d4Canvas) {
        new Chart(d4Canvas, {
          type: 'bar',
          data: {
            labels: ['Actividad agropecuaria', 'Actividad no-agropecuaria'],
            datasets: [
              {
                label: 'Nacional',
                data: [${d4.agroNacionalPct}, ${d4.noagroNacionalPct}],
                backgroundColor: 'rgba(34, 197, 94, 0.75)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 1,
                borderRadius: 6,
              },
              {
                label: 'CDMX',
                data: [${d4.agroCdmxPct}, ${d4.noagroCdmxPct}],
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 6,
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
                  label: function(ctx) { return ctx.dataset.label + ': ' + ctx.raw.toFixed(2) + '%'; }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#262626' },
                ticks: { callback: function(v) { return v + '%'; } },
                title: { display: true, text: '% de hogares con la actividad', color: '#71717a', font: { size: 11 } }
              },
              x: { grid: { display: false } }
            }
          }
        });
      }

      // D6 — Bancarización CDMX vs Nacional
      var d6Canvas = document.getElementById('d6Chart');
      if (d6Canvas) {
        new Chart(d6Canvas, {
          type: 'bar',
          data: {
            labels: ['CDMX', 'Nacional'],
            datasets: [{
              label: '% hogares con uso de tarjeta',
              data: [${d6.cdmxPct}, ${d6.nacionalPct}],
              backgroundColor: ['rgba(59, 130, 246, 0.85)', 'rgba(34, 197, 94, 0.75)'],
              borderColor: ['rgba(59, 130, 246, 1)', 'rgba(34, 197, 94, 1)'],
              borderWidth: 1,
              borderRadius: 6,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) { return ctx.label + ': ' + ctx.raw.toFixed(2) + '%'; }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#262626' },
                ticks: { callback: function(v) { return v + '%'; } },
                title: { display: true, text: '% de hogares', color: '#71717a', font: { size: 11 } }
              },
              x: { grid: { display: false } }
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
