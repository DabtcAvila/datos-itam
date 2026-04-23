// CONSAR charts — Chart.js 4.4.7 instances for 6 of the 7 dashboards.
// D7 is catalog tables (no chart). SSR paints with seed data; live-data refreshes.

import { CONSAR_SEED } from './seed';

export function buildConsarChartsScript(): string {
  const totales = CONSAR_SEED.series.totales;
  const vivienda = CONSAR_SEED.series.vivienda;
  const imssIssste = CONSAR_SEED.series.imssVsIssste;
  const pb = CONSAR_SEED.series.pensionBienestar;
  const d2 = CONSAR_SEED.d2;
  const d3 = CONSAR_SEED.d3;

  // Pre-serialize arrays for inline JS
  const totalesLabels = JSON.stringify(totales.map(p => p[0]));
  const totalesData = JSON.stringify(totales.map(p => p[1]));
  const viviendaLabels = JSON.stringify(vivienda.map(p => p[0]));
  const viviendaData = JSON.stringify(vivienda.map(p => p[1]));
  const iiLabels = JSON.stringify(imssIssste.map(p => p[0]));
  // Gaps en ISSSTE pre-2008-12 deben ser null para que Chart.js corte la línea
  const iiImss = JSON.stringify(imssIssste.map(p => p[1]));
  const iiIssste = JSON.stringify(imssIssste.map(p => p[2] === 0 ? null : p[2]));
  const pbLabels = JSON.stringify(pb.map(p => p[0]));
  const pbData = JSON.stringify(pb.map(p => p[1]));

  const d2Labels = JSON.stringify(d2.componentes.map(c => c.nombre));
  const d2Values = JSON.stringify(d2.componentes.map(c => c.montoMm));
  const d2Pcts = JSON.stringify(d2.componentes.map(c => c.pct));

  // Colores del donut — jerárquicos: warm para top-2, teal para siguientes, desaturados para cola.
  // Paleta pensada para orden: [rcv_imss, vivienda, rcv_issste, vol_sol, fondos_prev, banxico, bono_issste, capital_afores]
  const d2Colors = JSON.stringify([
    '#3b82f6', // rcv_imss — azul intenso (top)
    '#22c55e', // vivienda — verde intenso (top)
    '#a855f7', // rcv_issste — púrpura
    '#eab308', // ahorro_voluntario_y_solidario — ámbar
    '#06b6d4', // fondos_prevision_social — cyan
    '#f97316', // banxico — naranja
    '#ec4899', // bono_pension_issste — rosa
    '#6b7280', // capital_afores — gris (operativo, menor)
  ]);

  const d3Labels = JSON.stringify(d3.afores.map(a => a.nombre));
  const d3Values = JSON.stringify(d3.afores.map(a => a.sarTotalMm));

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
      // Escala a bill/mm auto
      if (Math.abs(v) >= 1000000) return '$' + (v / 1000000).toFixed(2) + ' bill';
      if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(0) + 'K mm';
      return '$' + v.toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' mm';
    }

    function tickFormatter(v) {
      return fmtMm(v);
    }

    function initDonutSwatches() {
      // Pinta los .consar-donut-swatch con los colores del donut en el mismo orden
      var colors = ${d2Colors};
      document.querySelectorAll('.consar-donut-swatch').forEach(function(el) {
        var idx = parseInt(el.getAttribute('data-idx'));
        if (!isNaN(idx) && idx < colors.length) {
          el.style.backgroundColor = colors[idx];
        }
      });
    }

    function initCharts() {
      if (typeof Chart === 'undefined') return;
      Chart.defaults.color = '#a1a1aa';
      Chart.defaults.borderColor = '#262626';

      // ===== D1 — Serie total SAR =====
      var d1Canvas = document.getElementById('d1Chart');
      if (d1Canvas) {
        new Chart(d1Canvas, {
          type: 'line',
          data: {
            labels: ${totalesLabels},
            datasets: [{
              label: 'SAR Nacional',
              data: ${totalesData},
              borderColor: 'rgba(59, 130, 246, 1)',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderWidth: 2,
              tension: 0.2,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) { return fmtMm(ctx.raw) + ' MXN'; }
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  maxRotation: 0,
                  autoSkip: true,
                  maxTicksLimit: 10,
                  callback: function(v, i, ticks) {
                    // mostrar solo año
                    var label = this.getLabelForValue(v);
                    return label.slice(0, 4);
                  }
                },
                grid: { display: false }
              },
              y: {
                beginAtZero: true,
                ticks: { callback: tickFormatter },
                grid: { color: '#262626' }
              }
            }
          }
        });
      }

      // ===== D2 — Donut composición (destacado) =====
      var d2Canvas = document.getElementById('d2Chart');
      if (d2Canvas) {
        new Chart(d2Canvas, {
          type: 'doughnut',
          data: {
            labels: ${d2Labels},
            datasets: [{
              data: ${d2Values},
              backgroundColor: ${d2Colors},
              borderColor: '#0a0a0a',
              borderWidth: 2,
              hoverOffset: 8,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    var pct = ${d2Pcts}[ctx.dataIndex];
                    return ctx.label + ': ' + fmtMm(ctx.raw) + ' (' + pct.toFixed(2) + '%)';
                  }
                }
              }
            }
          }
        });
      }

      // ===== D3 — Horizontal bar por AFORE =====
      var d3Canvas = document.getElementById('d3Chart');
      if (d3Canvas) {
        new Chart(d3Canvas, {
          type: 'bar',
          data: {
            labels: ${d3Labels},
            datasets: [{
              label: 'Recursos SAR',
              data: ${d3Values},
              backgroundColor: 'rgba(59, 130, 246, 0.85)',
              borderColor: 'rgba(59, 130, 246, 1)',
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
                  label: function(ctx) { return fmtMm(ctx.raw) + ' MXN'; }
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: { callback: tickFormatter },
                grid: { color: '#262626' }
              },
              y: { grid: { display: false } }
            }
          }
        });
      }

      // ===== D4 — Dual line IMSS vs ISSSTE =====
      var d4Canvas = document.getElementById('d4Chart');
      if (d4Canvas) {
        new Chart(d4Canvas, {
          type: 'line',
          data: {
            labels: ${iiLabels},
            datasets: [
              {
                label: 'RCV-IMSS (privados)',
                data: ${iiImss},
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderWidth: 2,
                tension: 0.2,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 4,
              },
              {
                label: 'RCV-ISSSTE (públicos)',
                data: ${iiIssste},
                borderColor: 'rgba(168, 85, 247, 1)',
                backgroundColor: 'rgba(168, 85, 247, 0.08)',
                borderWidth: 2,
                tension: 0.2,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 4,
                spanGaps: false,
              },
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
              legend: { position: 'top' },
              tooltip: {
                callbacks: {
                  label: function(ctx) { return ctx.dataset.label + ': ' + fmtMm(ctx.raw) + ' MXN'; }
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  maxRotation: 0,
                  autoSkip: true,
                  maxTicksLimit: 10,
                  callback: function(v) {
                    var label = this.getLabelForValue(v);
                    return label.slice(0, 4);
                  }
                },
                grid: { display: false }
              },
              y: {
                beginAtZero: true,
                ticks: { callback: tickFormatter },
                grid: { color: '#262626' }
              }
            }
          }
        });
      }

      // ===== D5 — Serie vivienda =====
      var d5Canvas = document.getElementById('d5Chart');
      if (d5Canvas) {
        new Chart(d5Canvas, {
          type: 'line',
          data: {
            labels: ${viviendaLabels},
            datasets: [{
              label: 'Vivienda (INFONAVIT + FOVISSSTE)',
              data: ${viviendaData},
              borderColor: 'rgba(34, 197, 94, 1)',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              borderWidth: 2,
              tension: 0.2,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) { return fmtMm(ctx.raw) + ' MXN'; }
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  maxRotation: 0,
                  autoSkip: true,
                  maxTicksLimit: 10,
                  callback: function(v) {
                    var label = this.getLabelForValue(v);
                    return label.slice(0, 4);
                  }
                },
                grid: { display: false }
              },
              y: {
                beginAtZero: true,
                ticks: { callback: tickFormatter },
                grid: { color: '#262626' }
              }
            }
          }
        });
      }

      // ===== D6 — Pensión Bienestar 12 puntos =====
      var d6Canvas = document.getElementById('d6Chart');
      if (d6Canvas) {
        new Chart(d6Canvas, {
          type: 'line',
          data: {
            labels: ${pbLabels},
            datasets: [{
              label: 'Pensión Bienestar — Recursos SAR',
              data: ${pbData},
              borderColor: 'rgba(236, 72, 153, 1)',
              backgroundColor: 'rgba(236, 72, 153, 0.15)',
              borderWidth: 2,
              tension: 0.2,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: 'rgba(236, 72, 153, 1)',
              pointHoverRadius: 6,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) { return fmtMm(ctx.raw) + ' MXN'; }
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  maxRotation: 0,
                  callback: function(v) {
                    var label = this.getLabelForValue(v);
                    // formato yyyy-mm
                    return label.slice(0, 7);
                  }
                },
                grid: { display: false }
              },
              y: {
                beginAtZero: true,
                ticks: { callback: tickFormatter },
                grid: { color: '#262626' }
              }
            }
          }
        });
      }
    }

    // Boot
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initDonutSwatches();
        animateKPIs();
        loadChartJS(initCharts);
      });
    } else {
      initDonutSwatches();
      animateKPIs();
      loadChartJS(initCharts);
    }
  })();
  </script>
  `;
}
