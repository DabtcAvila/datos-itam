import { stats } from '../data/stats';

export function buildChartsScript(): string {
  const salaryLabels = JSON.stringify(stats.salaryDistribution.map(s => s.label));
  const salaryData = JSON.stringify(stats.salaryDistribution.map(s => s.count));

  const ageLabels = JSON.stringify(stats.ageDistribution.map(a => a.label));
  const ageData = JSON.stringify(stats.ageDistribution.map(a => a.count));

  const salaryByAgeLabels = JSON.stringify(stats.salaryByAge.map(s => s.label));
  const salaryByAgeData = JSON.stringify(stats.salaryByAge.map(s => s.avg));

  const contractLabels = JSON.stringify(stats.contractTypes.map(c => c.label));
  const contractData = JSON.stringify(stats.contractTypes.map(c => c.count));

  const personalLabels = JSON.stringify(stats.personalTypes.map(p => p.label));
  const personalData = JSON.stringify(stats.personalTypes.map(p => p.count));

  const sectorNames = JSON.stringify(stats.top15Sectors.map(s => s.name.length > 30 ? s.name.substring(0, 28) + '...' : s.name));
  const sectorCounts = JSON.stringify(stats.top15Sectors.map(s => s.count));
  const sectorAvgSalaries = JSON.stringify(stats.top15Sectors.map(s => s.avgSalary));

  const seniorityLabels = JSON.stringify(stats.seniorityDistribution.map(s => s.label));
  const seniorityData = JSON.stringify(stats.seniorityDistribution.map(s => s.count));
  const salaryBySeniorityData = JSON.stringify(stats.salaryBySeniority.map(s => s.avg));

  const bnLabels = JSON.stringify(stats.brutoNetoByRange.map(b => b.label));
  const bnBruto = JSON.stringify(stats.brutoNetoByRange.map(b => b.avgBruto));
  const bnNeto = JSON.stringify(stats.brutoNetoByRange.map(b => b.avgNeto));

  const allSectorsJSON = JSON.stringify(stats.allSectors);

  return `
  <script>
    var __allSectors = ${allSectorsJSON};

    function loadChartJS(cb) {
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

    document.addEventListener('DOMContentLoaded', function() {
      // Count-up animation for KPIs
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

      // Sector filter
      var sectorSelect = document.getElementById('sectorSelect');
      var sectorPanel = document.getElementById('sectorPanel');
      if (sectorSelect) {
        sectorSelect.addEventListener('change', function() {
          var name = sectorSelect.value;
          if (!name) { sectorPanel.style.display = 'none'; return; }
          var s = __allSectors.find(function(x) { return x.name === name; });
          if (!s) return;
          document.getElementById('sectorName').textContent = s.name;
          document.getElementById('sectorCount').textContent = s.count.toLocaleString('es-MX');
          document.getElementById('sectorAvgSalary').textContent = '$' + Math.round(s.avgSalary).toLocaleString('es-MX');
          document.getElementById('sectorAvgMale').textContent = s.avgMale > 0 ? '$' + Math.round(s.avgMale).toLocaleString('es-MX') : 'N/D';
          document.getElementById('sectorAvgFemale').textContent = s.avgFemale > 0 ? '$' + Math.round(s.avgFemale).toLocaleString('es-MX') : 'N/D';
          sectorPanel.style.display = '';
        });
      }

      loadChartJS(function() {
        var fontColor = '#a1a1aa';
        var gridColor = '#262626';

        Chart.defaults.color = fontColor;
        Chart.defaults.borderColor = gridColor;

        // 1. Salary Distribution (Vertical Bar)
        new Chart(document.getElementById('salaryDistChart'), {
          type: 'bar',
          data: {
            labels: ${salaryLabels},
            datasets: [{
              label: 'Servidores',
              data: ${salaryData},
              backgroundColor: [
                'rgba(59, 130, 246, 0.7)',
                'rgba(34, 197, 94, 0.7)',
                'rgba(234, 179, 8, 0.7)',
                'rgba(168, 85, 247, 0.7)',
                'rgba(239, 68, 68, 0.7)',
              ],
              borderColor: [
                'rgba(59, 130, 246, 1)',
                'rgba(34, 197, 94, 1)',
                'rgba(234, 179, 8, 1)',
                'rgba(168, 85, 247, 1)',
                'rgba(239, 68, 68, 1)',
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
                  label: function(ctx) { return ctx.raw.toLocaleString('es-MX') + ' servidores'; }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: {
                  callback: function(v) { return (v/1000).toFixed(0) + 'K'; }
                }
              },
              x: { grid: { display: false } }
            }
          }
        });

        // 2. Age Distribution (Vertical Bar)
        new Chart(document.getElementById('ageDistChart'), {
          type: 'bar',
          data: {
            labels: ${ageLabels},
            datasets: [{
              label: 'Servidores',
              data: ${ageData},
              backgroundColor: 'rgba(168, 85, 247, 0.7)',
              borderColor: 'rgba(168, 85, 247, 1)',
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
                  label: function(ctx) { return ctx.raw.toLocaleString('es-MX') + ' servidores'; }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: {
                  callback: function(v) { return (v/1000).toFixed(0) + 'K'; }
                }
              },
              x: { grid: { display: false } }
            }
          }
        });

        // 3. Gender Distribution (Doughnut)
        new Chart(document.getElementById('genderChart'), {
          type: 'doughnut',
          data: {
            labels: ['Hombres (${stats.hombres.toLocaleString()})', 'Mujeres (${stats.mujeres.toLocaleString()})'],
            datasets: [{
              data: [${stats.hombres}, ${stats.mujeres}],
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(236, 72, 153, 0.8)',
              ],
              borderColor: '#141414',
              borderWidth: 3,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { usePointStyle: true, pointStyle: 'rectRounded', padding: 16 },
              },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                    var pct = ((ctx.raw / total) * 100).toFixed(1);
                    return ctx.raw.toLocaleString('es-MX') + ' (' + pct + '%)';
                  }
                }
              }
            }
          }
        });

        // 4. Contract Types (Doughnut)
        new Chart(document.getElementById('contractChart'), {
          type: 'doughnut',
          data: {
            labels: ${contractLabels},
            datasets: [{
              data: ${contractData},
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(34, 197, 94, 0.8)',
                'rgba(234, 179, 8, 0.8)',
                'rgba(168, 85, 247, 0.8)',
                'rgba(236, 72, 153, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(20, 184, 166, 0.8)',
              ],
              borderColor: '#141414',
              borderWidth: 3,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { usePointStyle: true, pointStyle: 'rectRounded', padding: 12, font: { size: 11 } },
              },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                    var pct = ((ctx.raw / total) * 100).toFixed(1);
                    return ctx.raw.toLocaleString('es-MX') + ' (' + pct + '%)';
                  }
                }
              }
            }
          }
        });

        // 5. Salary by Age (Vertical Bar)
        new Chart(document.getElementById('salaryByAgeChart'), {
          type: 'bar',
          data: {
            labels: ${salaryByAgeLabels},
            datasets: [{
              label: 'Sueldo Promedio',
              data: ${salaryByAgeData},
              backgroundColor: 'rgba(34, 197, 94, 0.7)',
              borderColor: 'rgba(34, 197, 94, 1)',
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
                  label: function(ctx) { return '$' + ctx.raw.toLocaleString('es-MX'); }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: false,
                grid: { color: gridColor },
                ticks: {
                  callback: function(v) { return '$' + (v/1000).toFixed(0) + 'K'; }
                }
              },
              x: { grid: { display: false } }
            }
          }
        });

        // 6. Personnel Types (Horizontal Bar)
        new Chart(document.getElementById('personalChart'), {
          type: 'bar',
          data: {
            labels: ${personalLabels},
            datasets: [{
              label: 'Servidores',
              data: ${personalData},
              backgroundColor: 'rgba(234, 179, 8, 0.7)',
              borderColor: 'rgba(234, 179, 8, 1)',
              borderWidth: 1,
              borderRadius: 6,
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
                  label: function(ctx) { return ctx.raw.toLocaleString('es-MX') + ' servidores'; }
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: {
                  callback: function(v) { return (v/1000).toFixed(0) + 'K'; }
                }
              },
              y: { grid: { display: false } }
            }
          }
        });

        // 7. Seniority Distribution + Salary by Seniority
        new Chart(document.getElementById('seniorityChart'), {
          type: 'bar',
          data: {
            labels: ${seniorityLabels},
            datasets: [
              {
                label: 'Servidores',
                data: ${seniorityData},
                backgroundColor: 'rgba(20, 184, 166, 0.7)',
                borderColor: 'rgba(20, 184, 166, 1)',
                borderWidth: 1,
                borderRadius: 6,
                yAxisID: 'y',
              },
              {
                label: 'Sueldo Promedio',
                data: ${salaryBySeniorityData},
                type: 'line',
                borderColor: 'rgba(234, 179, 8, 1)',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.3,
                yAxisID: 'y1',
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
                  label: function(ctx) {
                    if (ctx.dataset.label === 'Sueldo Promedio') return '$' + ctx.raw.toLocaleString('es-MX');
                    return ctx.raw.toLocaleString('es-MX') + ' servidores';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { callback: function(v) { return (v/1000).toFixed(0) + 'K'; } }
              },
              x: { grid: { display: false } },
              y1: {
                position: 'right',
                grid: { display: false },
                ticks: { callback: function(v) { return '$' + (v/1000).toFixed(0) + 'K'; } }
              }
            }
          }
        });

        // 8. Bruto vs Neto by salary range
        new Chart(document.getElementById('brutoNetoChart'), {
          type: 'bar',
          data: {
            labels: ${bnLabels},
            datasets: [
              {
                label: 'Bruto',
                data: ${bnBruto},
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 6,
              },
              {
                label: 'Neto',
                data: ${bnNeto},
                backgroundColor: 'rgba(34, 197, 94, 0.7)',
                borderColor: 'rgba(34, 197, 94, 1)',
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
                  label: function(ctx) { return ctx.dataset.label + ': $' + ctx.raw.toLocaleString('es-MX'); }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { callback: function(v) { return '$' + (v/1000).toFixed(0) + 'K'; } }
              },
              x: { grid: { display: false } }
            }
          }
        });

        // 9. Top 15 Sectors (Horizontal Bar - full width)
        new Chart(document.getElementById('sectorsChart'), {
          type: 'bar',
          data: {
            labels: ${sectorNames},
            datasets: [
              {
                label: 'Servidores',
                data: ${sectorCounts},
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 6,
                yAxisID: 'y',
              },
              {
                label: 'Sueldo Promedio',
                data: ${sectorAvgSalaries},
                type: 'line',
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.3,
                yAxisID: 'y1',
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { usePointStyle: true, pointStyle: 'rectRounded', padding: 16 },
              },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    if (ctx.dataset.label === 'Sueldo Promedio') {
                      return '$' + ctx.raw.toLocaleString('es-MX');
                    }
                    return ctx.raw.toLocaleString('es-MX') + ' servidores';
                  }
                }
              }
            },
            scales: {
              y: { grid: { display: false } },
              x: {
                position: 'bottom',
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: {
                  callback: function(v) { return (v/1000).toFixed(0) + 'K'; }
                }
              },
              y1: {
                display: false,
              }
            }
          }
        });
      });
    });
  <\/script>
  `;
}
