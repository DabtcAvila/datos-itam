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

    // Show an "error" row in a tbody if its fetch failed.
    function setErrorRow(tbodyId, colspan, msg) {
      var tbody = document.getElementById(tbodyId);
      if (!tbody) return;
      // Only replace if still in loading state (avoid clobbering partial success)
      var loading = tbody.querySelector('.loading-row');
      if (!loading) return;
      tbody.innerHTML = '<tr><td colspan="' + colspan + '" class="loading-row error-row">' +
        'No fue posible cargar desde el API (' + (msg || 'error') + '). Los valores visibles son del último build validado.' +
        '</td></tr>';
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

    function renderGastosRubro(data) {
      if (!data || !Array.isArray(data.rubros)) return;
      var tbody = document.getElementById('enigh-gastos-tbody');
      if (tbody) {
        var rows = data.rubros.map(function(r) {
          return '<tr>' +
            '<td>' + r.nombre + '</td>' +
            '<td class="num">' + r.pct_del_monetario.toFixed(2) + '%</td>' +
            '</tr>';
        }).join('');
        tbody.innerHTML = rows;
      }
      var totalEl = document.getElementById('enigh-gastos-total');
      if (totalEl && typeof data.mean_gasto_mon_trim === 'number') {
        totalEl.textContent = '$' + Math.round(data.mean_gasto_mon_trim / 3).toLocaleString('es-MX');
      }
      whenChartReady(function() {
        var c = getChartByCanvasId('enighGastosChart');
        if (!c) return;
        c.data.labels = data.rubros.map(function(r) { return r.nombre; });
        c.data.datasets[0].data = data.rubros.map(function(r) { return r.pct_del_monetario; });
        c.update('none');
      });
    }

    function attachGastosSelector() {
      var sel = document.getElementById('enigh-gastos-decil');
      if (!sel) return;
      sel.addEventListener('change', function() {
        var v = sel.value;
        var path = v ? '/gastos/by-rubro?decil=' + encodeURIComponent(v) : '/gastos/by-rubro';
        fetchJson(path).then(renderGastosRubro).catch(function() {});
      });
    }

    function renderActividadAgro(d) {
      if (!d) return;
      var pctEl = document.getElementById('enigh-act-agro-pct');
      if (pctEl) pctEl.textContent = d.pct_del_universo.toFixed(2) + '%';
      var mEl = document.getElementById('enigh-act-agro-muestra');
      if (mEl) mEl.textContent = fmtN(d.n_hogares_muestra);
      var eEl = document.getElementById('enigh-act-agro-exp');
      if (eEl) eEl.textContent = fmtN(d.n_hogares_expandido);

      var tbody = document.getElementById('enigh-act-agro-top-tbody');
      if (tbody && Array.isArray(d.top_entidades)) {
        tbody.innerHTML = d.top_entidades.map(function(t, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + t.nombre + '</td><td class="num">' + fmtN(t.n_hogares_expandido) + '</td></tr>';
        }).join('');
      }

      whenChartReady(function() {
        var c = getChartByCanvasId('enighActividadChart');
        if (!c || !Array.isArray(d.por_decil)) return;
        c.data.datasets[0].data = d.por_decil.map(function(p) { return p.pct_share_actividad; });
        c.update('none');
      });
    }

    function renderActividadNoagro(d) {
      if (!d) return;
      var pctEl = document.getElementById('enigh-act-noagro-pct');
      if (pctEl) pctEl.textContent = d.pct_del_universo.toFixed(2) + '%';
      var mEl = document.getElementById('enigh-act-noagro-muestra');
      if (mEl) mEl.textContent = fmtN(d.n_hogares_muestra);
      var eEl = document.getElementById('enigh-act-noagro-exp');
      if (eEl) eEl.textContent = fmtN(d.n_hogares_expandido);

      var tbody = document.getElementById('enigh-act-noagro-top-tbody');
      if (tbody && Array.isArray(d.top_entidades)) {
        tbody.innerHTML = d.top_entidades.map(function(t, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + t.nombre + '</td><td class="num">' + fmtN(t.n_hogares_expandido) + '</td></tr>';
        }).join('');
      }

      whenChartReady(function() {
        var c = getChartByCanvasId('enighActividadChart');
        if (!c || !Array.isArray(d.por_decil)) return;
        c.data.datasets[1].data = d.por_decil.map(function(p) { return p.pct_share_actividad; });
        c.update('none');
      });
    }

    function renderDemografia(d) {
      if (!d) return;
      whenChartReady(function() {
        var cSexo = getChartByCanvasId('enighSexoChart');
        if (cSexo && Array.isArray(d.sexo)) {
          // Order: mujeres primero visual (pink), hombres segundo (blue)
          var bySexo = {};
          d.sexo.forEach(function(x) { bySexo[x.sexo] = x.pct; });
          cSexo.data.datasets[0].data = [bySexo['mujeres'] || 0, bySexo['hombres'] || 0];
          cSexo.update('none');
        }
        var cEdad = getChartByCanvasId('enighEdadChart');
        if (cEdad && Array.isArray(d.edad)) {
          cEdad.data.labels = d.edad.map(function(b) { return b.bucket; });
          cEdad.data.datasets[0].data = d.edad.map(function(b) { return b.pct; });
          cEdad.update('none');
        }
      });
    }

    attachGastosSelector();

    // Fire fetches in parallel; each section updates independently.
    // Promise.allSettled so one failure doesn't block others.
    // Each .catch sets a visible error row in its tbody (if present) so the user
    // knows the live data didn't arrive — without clobbering seed values.
    Promise.allSettled([
      fetchJson('/validaciones').then(renderValidaciones)
        .catch(function(e) { setErrorRow('enigh-val-tbody', 7, e.message); }),
      fetchJson('/hogares/summary').then(renderHogaresSummary),
      fetchJson('/hogares/by-decil').then(function(d) {
        renderDecilTable(d);
        renderDecilChart(d);
      }).catch(function(e) { setErrorRow('enigh-decil-tbody', 6, e.message); }),
      fetchJson('/hogares/by-entidad').then(function(d) {
        renderEntidadTable(d);
        renderEntidadChart(d);
      }).catch(function(e) { setErrorRow('enigh-entidad-tbody', 6, e.message); }),
      fetchJson('/gastos/by-rubro').then(renderGastosRubro),
      fetchJson('/actividad/agro').then(renderActividadAgro)
        .catch(function(e) { setErrorRow('enigh-act-agro-top-tbody', 3, e.message); }),
      fetchJson('/actividad/noagro').then(renderActividadNoagro)
        .catch(function(e) { setErrorRow('enigh-act-noagro-top-tbody', 3, e.message); }),
      fetchJson('/poblacion/demographics').then(renderDemografia),
    ]).then(function(results) {
      var anyOk = results.some(function(r) { return r.status === 'fulfilled'; });
      if (anyOk) markLive();
    });
  })();
  <\/script>
  `;
}
