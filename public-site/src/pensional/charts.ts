// Pensional S12 — Chart.js instances for P1 (dual bar) + P2 (stacked horizontal).
// SSR paints with seed; live-data refreshes both via mutation post-fetch.

import { PENSIONAL_SEED } from './seed';
import { computeLiquidityPartition } from './computations';

export function buildPensionalChartsScript(): string {
  const partition = computeLiquidityPartition(PENSIONAL_SEED.consar.componentes);

  // P2 stacked bar — 3 datasets, una "fila" (SAR total)
  const p2LiquidoMm = JSON.stringify([partition.liquido.totalMm]);
  const p2VinculadoMm = JSON.stringify([partition.vinculado.totalMm]);
  const p2OperativoMm = JSON.stringify([partition.operativo.totalMm]);
  const p2LiquidoPct = partition.liquido.pct.toFixed(2);
  const p2VinculadoPct = partition.vinculado.pct.toFixed(2);
  const p2OperativoPct = partition.operativo.pct.toFixed(2);

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

    function fmtMm(v) {
      if (v == null) return '—';
      if (Math.abs(v) >= 1000000) return '$' + (v / 1000000).toFixed(2) + ' bill';
      if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(0) + 'K mm';
      return '$' + v.toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' mm';
    }
    function tickFormatter(v) { return fmtMm(v); }

    function initCharts() {
      if (typeof Chart === 'undefined') return;
      Chart.defaults.color = '#a1a1aa';
      Chart.defaults.borderColor = '#262626';

      // ===== P2 — Stacked horizontal bar (líquido / vinculado / operativo) =====
      var p2Canvas = document.getElementById('p2Chart');
      if (p2Canvas) {
        new Chart(p2Canvas, {
          type: 'bar',
          data: {
            labels: ['SAR junio 2025'],
            datasets: [
              {
                label: 'Líquido para pensión (${p2LiquidoPct}%)',
                data: ${p2LiquidoMm},
                backgroundColor: 'rgba(34, 197, 94, 0.85)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 1,
                borderRadius: 4,
              },
              {
                label: 'Vivienda vinculada (${p2VinculadoPct}%)',
                data: ${p2VinculadoMm},
                backgroundColor: 'rgba(234, 179, 8, 0.85)',
                borderColor: 'rgba(234, 179, 8, 1)',
                borderWidth: 1,
                borderRadius: 4,
              },
              {
                label: 'Operativo no pensional (${p2OperativoPct}%)',
                data: ${p2OperativoMm},
                backgroundColor: 'rgba(107, 114, 128, 0.85)',
                borderColor: 'rgba(107, 114, 128, 1)',
                borderWidth: 1,
                borderRadius: 4,
              },
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 16, padding: 12 } },
              tooltip: {
                callbacks: {
                  label: function(ctx) { return ctx.dataset.label + ': ' + fmtMm(ctx.raw); }
                }
              }
            },
            scales: {
              x: {
                stacked: true,
                beginAtZero: true,
                ticks: { callback: tickFormatter },
                grid: { color: '#262626' }
              },
              y: {
                stacked: true,
                grid: { display: false }
              }
            }
          }
        });
      }

    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        animateKPIs();
        loadChartJS(initCharts);
      });
    } else {
      animateKPIs();
      loadChartJS(initCharts);
    }
  })();
  </script>
  `;
}
