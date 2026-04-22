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

    // Fire fetches in parallel; each section updates independently.
    // Promise.allSettled so one failure doesn't block others.
    Promise.allSettled([
      fetchJson('/validaciones').then(renderValidaciones),
      fetchJson('/hogares/summary').then(renderHogaresSummary),
    ]).then(function(results) {
      var anyOk = results.some(function(r) { return r.status === 'fulfilled'; });
      if (anyOk) markLive();
    });
  })();
  <\/script>
  `;
}
