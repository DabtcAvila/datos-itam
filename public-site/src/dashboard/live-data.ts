export function buildLiveDataScript(): string {
  return `
  <script>
  (function() {
    var API_URL = 'https://api.datos-itam.org/api/v1/dashboard/stats';
    var TIMEOUT = 8000;

    function fmt(n) { return '$' + Math.round(n).toLocaleString('es-MX'); }
    function fmtN(n) { return n.toLocaleString('es-MX'); }

    function updateText(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    function animateKPI(id, target, prefix, suffix, decimals) {
      var el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('data-target', String(target));
      var duration = 800;
      var start = performance.now();
      prefix = prefix || '';
      suffix = suffix || '';
      decimals = decimals || 0;
      function tick(now) {
        var p = Math.min((now - start) / duration, 1);
        var ease = 1 - Math.pow(1 - p, 3);
        var cur = target * ease;
        if (decimals > 0) {
          el.textContent = prefix + cur.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        } else {
          el.textContent = prefix + Math.round(cur).toLocaleString('es-MX') + suffix;
        }
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function updateSalaryStats(d) {
      // Update .stat-value elements inside salary stats card
      var rows = document.querySelectorAll('.stats-panel .stat-row');
      var mapping = [
        d.avgSalary, d.medianSalary, d.minSalary, d.maxSalary,
        d.p25, d.p50, d.p75, d.p90
      ];
      rows.forEach(function(row, i) {
        if (mapping[i] !== undefined) {
          var val = row.querySelector('.stat-value');
          if (val) val.textContent = fmt(mapping[i]);
        }
      });
    }

    function updateBrutoNeto(d) {
      var bnRows = document.querySelectorAll('.bruto-neto-summary .bn-row');
      if (bnRows.length >= 3) {
        var v0 = bnRows[0].querySelector('.bn-value');
        var v1 = bnRows[1].querySelector('.bn-value');
        var v2 = bnRows[2].querySelector('.bn-value');
        if (v0) v0.textContent = fmt(d.avgSalary);
        if (v1) v1.textContent = fmt(d.avgNetSalary);
        if (v2) v2.textContent = fmt(d.avgDeduction) + ' (' + d.avgDeductionPercent.toFixed(1) + '%)';
      }
    }

    function updateGenderAnalysis(d) {
      var gapEl = document.querySelector('.gap-value');
      if (gapEl) {
        var gapAbs = Math.abs(d.genderGapPercent);
        gapEl.textContent = gapAbs.toFixed(1) + '%';
      }
      var bars = document.querySelectorAll('.gap-bar-value');
      if (bars.length >= 2) {
        bars[0].textContent = fmt(d.avgSalaryMale);
        bars[1].textContent = fmt(d.avgSalaryFemale);
      }
      var barLabels = document.querySelectorAll('.gap-bar-label');
      if (barLabels.length >= 2) {
        barLabels[0].textContent = 'Hombres (' + fmtN(d.hombres) + ')';
        barLabels[1].textContent = 'Mujeres (' + fmtN(d.mujeres) + ')';
      }
      // Update bar widths
      var maxSal = Math.max(d.avgSalaryMale, d.avgSalaryFemale);
      var barEls = document.querySelectorAll('.gap-bar');
      if (barEls.length >= 2 && maxSal > 0) {
        barEls[0].style.width = (d.avgSalaryMale / maxSal * 100) + '%';
        barEls[1].style.width = (d.avgSalaryFemale / maxSal * 100) + '%';
      }
    }

    function updateGenderGapTable(d) {
      var tbody = document.querySelector('.table-section tbody');
      if (!tbody || !d.genderGapBySector) return;
      var rows = '';
      d.genderGapBySector.forEach(function(s) {
        var gapAbs = Math.abs(s.gap);
        var cls = 'badge--neutral';
        if (s.gap > 5) cls = 'badge--positive';
        else if (s.gap < -5) cls = 'badge--negative';
        rows += '<tr><td>' + s.name + '</td><td>' + fmt(s.avgMale) + '</td><td>' + fmt(s.avgFemale) + '</td><td><span class="badge ' + cls + '">' + (s.gap > 0 ? '+' : '') + s.gap.toFixed(1) + '%</span></td></tr>';
      });
      tbody.innerHTML = rows;
    }

    function updateTopPositions(d) {
      var tables = document.querySelectorAll('.table-section');
      // Top positions is the first table-section
      if (tables.length >= 1 && d.topPositions) {
        var tbody = tables[0].querySelector('tbody');
        if (!tbody) return;
        var rows = '';
        d.topPositions.forEach(function(p) {
          rows += '<tr><td>' + p.name + '</td><td>' + fmtN(p.count) + '</td><td>' + fmt(p.avgSalary) + '</td></tr>';
        });
        tbody.innerHTML = rows;
      }
    }

    function updateCharts(d) {
      if (typeof Chart === 'undefined') return;

      // Get all chart instances
      var instances = {};
      Chart.helpers.each(Chart.instances, function(chart) {
        if (chart.canvas && chart.canvas.id) {
          instances[chart.canvas.id] = chart;
        }
      });

      function updateChart(id, labels, datasets) {
        var c = instances[id];
        if (!c) return;
        if (labels) c.data.labels = labels;
        datasets.forEach(function(ds, i) {
          if (c.data.datasets[i]) c.data.datasets[i].data = ds;
        });
        c.update('none');
      }

      if (d.salaryDistribution) {
        updateChart('salaryDistChart',
          d.salaryDistribution.map(function(s) { return s.label; }),
          [d.salaryDistribution.map(function(s) { return s.count; })]);
      }
      if (d.ageDistribution) {
        updateChart('ageDistChart',
          d.ageDistribution.map(function(a) { return a.label; }),
          [d.ageDistribution.map(function(a) { return a.count; })]);
      }
      if (d.contractTypes) {
        updateChart('contractChart',
          d.contractTypes.map(function(c) { return c.label; }),
          [d.contractTypes.map(function(c) { return c.count; })]);
      }
      if (d.personalTypes) {
        updateChart('personalChart',
          d.personalTypes.map(function(p) { return p.label; }),
          [d.personalTypes.map(function(p) { return p.count; })]);
      }
      if (d.salaryByAge) {
        updateChart('salaryByAgeChart',
          d.salaryByAge.map(function(s) { return s.label; }),
          [d.salaryByAge.map(function(s) { return s.avg; })]);
      }
      if (d.seniorityDistribution && d.salaryBySeniority) {
        updateChart('seniorityChart',
          d.seniorityDistribution.map(function(s) { return s.label; }),
          [
            d.seniorityDistribution.map(function(s) { return s.count; }),
            d.salaryBySeniority.map(function(s) { return s.avg; })
          ]);
      }
      if (d.brutoNetoByRange) {
        updateChart('brutoNetoChart',
          d.brutoNetoByRange.map(function(b) { return b.label; }),
          [
            d.brutoNetoByRange.map(function(b) { return b.avgBruto; }),
            d.brutoNetoByRange.map(function(b) { return b.avgNeto; })
          ]);
      }
      if (d.top15Sectors) {
        updateChart('sectorsChart',
          d.top15Sectors.map(function(s) { return s.name.length > 30 ? s.name.substring(0, 28) + '...' : s.name; }),
          [
            d.top15Sectors.map(function(s) { return s.count; }),
            d.top15Sectors.map(function(s) { return s.avgSalary; })
          ]);
      }
      // Gender doughnut
      if (d.hombres !== undefined && d.mujeres !== undefined) {
        var gc = instances['genderChart'];
        if (gc) {
          gc.data.labels = ['Hombres (' + fmtN(d.hombres) + ')', 'Mujeres (' + fmtN(d.mujeres) + ')'];
          gc.data.datasets[0].data = [d.hombres, d.mujeres];
          gc.update('none');
        }
      }
    }

    function updateSectorFilter(d) {
      if (!d.allSectors) return;
      window.__allSectors = d.allSectors;
      var select = document.getElementById('sectorSelect');
      if (!select) return;
      var current = select.value;
      var opts = '<option value="">\\u2014 Selecciona un sector \\u2014</option>';
      d.allSectors.forEach(function(s) {
        var sel = s.name === current ? ' selected' : '';
        opts += '<option value="' + s.name.replace(/"/g, '&quot;') + '"' + sel + '>' + s.name + ' (' + fmtN(s.count) + ')</option>';
      });
      select.innerHTML = opts;
    }

    function applyLiveData(d) {
      // KPIs
      animateKPI('kpi-total', d.totalServidores, '', '', 0);
      animateKPI('kpi-salary', d.avgSalary, '$', '', 0);
      animateKPI('kpi-gap', d.genderGapPercent, '', '%', 2);
      animateKPI('kpi-sectors', d.totalSectors, '', '', 0);

      updateSalaryStats(d);
      updateBrutoNeto(d);
      updateGenderAnalysis(d);
      updateGenderGapTable(d);
      updateTopPositions(d);
      updateSectorFilter(d);

      // Charts update after a short delay (ensure Chart.js loaded)
      setTimeout(function() { updateCharts(d); }, 500);

      // Show live badge
      var badge = document.getElementById('liveBadge');
      if (badge) badge.classList.add('active');
    }

    // Fetch with timeout
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function() {
      if (controller) controller.abort();
    }, TIMEOUT);

    fetch(API_URL, controller ? { signal: controller.signal } : {})
      .then(function(r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(d) {
        if (d && d.totalServidores) applyLiveData(d);
      })
      .catch(function() {
        // Silently use pre-rendered static data
      });
  })();
  <\/script>
  `;
}
