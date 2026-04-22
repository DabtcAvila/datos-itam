// ENIGH live-data — 10 fetches paralelos al API de producción.
// Patrón heredado de CDMX live-data.ts: silent fallback si falla el fetch,
// pero aquí inicia con seed-data ya renderizado para UX inmediata.
// Por ahora sólo refresca validaciones + KPIs (commit 2). Charts en commits 3-4.

export function buildEnighLiveDataScript(): string {
  return `
  <script>
  (function() {
    var API_BASE = 'https://api.datos-itam.org/api/v1/enigh';
    var TIMEOUT = 8000;

    function fmt(n) { return '$' + Math.round(n).toLocaleString('es-MX'); }
    function fmtN(n) { return n.toLocaleString('es-MX'); }
    function fmtPct(n, d) { d = d || 2; return n.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%'; }

    function fetchJson(path) {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function() { if (controller) controller.abort(); }, TIMEOUT);
      return fetch(API_BASE + path, controller ? { signal: controller.signal } : {})
        .then(function(r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        });
    }

    function updateKPI(id, target, prefix, suffix, decimals) {
      var el = document.getElementById(id);
      if (!el) return;
      prefix = prefix || '';
      suffix = suffix || '';
      decimals = decimals || 0;
      if (decimals > 0) {
        el.textContent = prefix + Number(target).toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      } else {
        el.textContent = prefix + Math.round(target).toLocaleString('es-MX') + suffix;
      }
    }

    function renderValidaciones(data) {
      if (!data || !Array.isArray(data.bounds)) return;
      var tbody = document.getElementById('enigh-val-tbody');
      if (!tbody) return;

      var rows = data.bounds.map(function(b) {
        var pass = b.passing ? '<span class="badge badge--pass">OK</span>' : '<span class="badge badge--fail">FAIL</span>';
        var deltaClass = b.passing ? 'delta-ok' : 'delta-fail';
        var deltaSign = b.delta_pct >= 0 ? '+' : '';
        var calcStr = b.calculado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        var ofStr = b.oficial.toLocaleString('es-MX');
        var deltaStr = deltaSign + b.delta_pct.toFixed(4) + '%';
        var tolStr = '±' + b.tolerance_pct + '%';
        return '<tr>' +
          '<td>' + b.metric + '</td>' +
          '<td><span class="unit-chip">' + b.unit + '</span></td>' +
          '<td class="num">' + calcStr + '</td>' +
          '<td class="num">' + ofStr + '</td>' +
          '<td class="num ' + deltaClass + '">' + deltaStr + '</td>' +
          '<td>' + tolStr + '</td>' +
          '<td>' + pass + '</td>' +
          '</tr>';
      }).join('');
      tbody.innerHTML = rows;

      var countEl = document.getElementById('enigh-val-count');
      if (countEl) countEl.textContent = data.passing + '/' + data.count;
      var deltaEl = document.getElementById('enigh-val-delta');
      if (deltaEl) {
        var maxDelta = data.bounds.reduce(function(m, b) {
          var a = Math.abs(b.delta_pct);
          return a > m ? a : m;
        }, 0);
        deltaEl.textContent = fmtPct(maxDelta, 3);
      }
    }

    function renderHogaresSummary(d) {
      if (!d) return;
      updateKPI('enigh-kpi-hogares-muestra', d.n_hogares_muestra);
      updateKPI('enigh-kpi-hogares-exp', d.n_hogares_expandido);
      updateKPI('enigh-kpi-ing-mes', d.mean_ing_cor_mensual, '$');
      updateKPI('enigh-kpi-gas-mes', d.mean_gasto_mon_mensual, '$');
    }

    function markLive() {
      var badge = document.getElementById('enighLiveBadge');
      if (badge) badge.classList.add('active');
    }

    function getChartByCanvasId(id) {
      if (typeof Chart === 'undefined') return null;
      var canvas = document.getElementById(id);
      if (!canvas) return null;
      return Chart.getChart(canvas);
    }

    // Wait until Chart.js has finished loading before updating chart instances.
    function whenChartReady(cb, retries) {
      retries = retries == null ? 20 : retries;
      if (typeof Chart !== 'undefined') { cb(); return; }
      if (retries <= 0) return;
      setTimeout(function() { whenChartReady(cb, retries - 1); }, 150);
    }

    function renderDecilTable(decs) {
      var tbody = document.getElementById('enigh-decil-tbody');
      if (!tbody || !Array.isArray(decs)) return;
      var roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
      var rows = decs.map(function(d, i) {
        return '<tr>' +
          '<td><strong>D ' + roman[i] + '</strong></td>' +
          '<td class="num">' + fmtN(d.n_hogares_muestra) + '</td>' +
          '<td class="num">' + fmtN(d.n_hogares_expandido) + '</td>' +
          '<td class="num">$' + fmtN(Math.round(d.mean_ing_cor_trim)) + '</td>' +
          '<td class="num">$' + fmtN(Math.round(d.mean_ing_cor_mensual)) + '</td>' +
          '<td class="num">$' + fmtN(Math.round(d.mean_gasto_mon_trim)) + '</td>' +
          '</tr>';
      }).join('');
      tbody.innerHTML = rows;
    }

    function renderDecilChart(decs) {
      whenChartReady(function() {
        var c = getChartByCanvasId('enighDecilChart');
        if (!c || !Array.isArray(decs)) return;
        c.data.datasets[0].data = decs.map(function(d) { return d.mean_ing_cor_mensual; });
        c.data.datasets[1].data = decs.map(function(d) { return d.mean_gasto_mon_trim / 3; });
        c.update('none');
      });
    }

    function renderEntidadTable(entidades) {
      var tbody = document.getElementById('enigh-entidad-tbody');
      if (!tbody || !Array.isArray(entidades)) return;
      var rows = entidades.map(function(e, i) {
        var highlight = e.clave === '09' ? ' class="row-highlight-cdmx"' : '';
        return '<tr' + highlight + '>' +
          '<td>' + (i + 1) + '</td>' +
          '<td>' + e.nombre + '</td>' +
          '<td class="num">' + fmtN(e.n_hogares_muestra) + '</td>' +
          '<td class="num">' + fmtN(e.n_hogares_expandido) + '</td>' +
          '<td class="num">$' + fmtN(Math.round(e.mean_ing_cor_mensual)) + '</td>' +
          '<td class="num">$' + fmtN(Math.round(e.mean_gasto_mon_trim / 3)) + '</td>' +
          '</tr>';
      }).join('');
      tbody.innerHTML = rows;
    }

    function renderEntidadChart(entidades) {
      whenChartReady(function() {
        var c = getChartByCanvasId('enighEntidadChart');
        if (!c || !Array.isArray(entidades)) return;
        var labels = entidades.map(function(e) { return e.nombre; });
        var values = entidades.map(function(e) { return e.mean_ing_cor_mensual; });
        var colors = entidades.map(function(e, i) {
          if (e.clave === '09') return 'rgba(236, 72, 153, 0.85)';   // CDMX highlight
          if (i === 0) return 'rgba(34, 197, 94, 0.85)';              // #1 highlight
          return 'rgba(59, 130, 246, 0.55)';
        });
        var borders = entidades.map(function(e, i) {
          if (e.clave === '09') return 'rgba(236, 72, 153, 1)';
          if (i === 0) return 'rgba(34, 197, 94, 1)';
          return 'rgba(59, 130, 246, 0.9)';
        });
        c.data.labels = labels;
        c.data.datasets[0].data = values;
        c.data.datasets[0].backgroundColor = colors;
        c.data.datasets[0].borderColor = borders;
        c.update('none');
      });
    }

    // Fire fetches in parallel; each section updates independently.
    // Promise.allSettled so one failure doesn't block others.
    Promise.allSettled([
      fetchJson('/validaciones').then(renderValidaciones),
      fetchJson('/hogares/summary').then(renderHogaresSummary),
      fetchJson('/hogares/by-decil').then(function(d) {
        renderDecilTable(d);
        renderDecilChart(d);
      }),
      fetchJson('/hogares/by-entidad').then(function(d) {
        renderEntidadTable(d);
        renderEntidadChart(d);
      }),
    ]).then(function(results) {
      var anyOk = results.some(function(r) { return r.status === 'fulfilled'; });
      if (anyOk) markLive();
    });
  })();
  <\/script>
  `;
}
