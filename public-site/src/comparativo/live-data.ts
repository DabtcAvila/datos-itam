// Comparativo live-data — 7 fetches paralelos al API de producción.
// Patrón heredado de ENIGH: SSR con seed, refresh on load, silent fallback.

export function buildComparativoLiveDataScript(): string {
  return `
  <script>
  (function() {
    var API_BASE = 'https://api.datos-itam.org/api/v1/comparativo';
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

    function markLive() {
      var badge = document.getElementById('comparativoLiveBadge');
      if (badge) badge.classList.add('active');
    }

    function getChartByCanvasId(id) {
      if (typeof Chart === 'undefined') return null;
      var canvas = document.getElementById(id);
      if (!canvas) return null;
      return Chart.getChart(canvas);
    }

    function whenChartReady(cb, retries) {
      retries = retries == null ? 20 : retries;
      if (typeof Chart !== 'undefined') { cb(); return; }
      if (retries <= 0) return;
      setTimeout(function() { whenChartReady(cb, retries - 1); }, 150);
    }

    // ---------- D1 ----------
    function renderD1(d) {
      if (!d) return;
      var cdmx = d.cdmx_servidor || {};
      var nac = d.enigh_hogar_nacional || {};
      var cdmxH = d.enigh_hogar_cdmx || {};
      updateKPI('d1-kpi-cdmx-mean', cdmx.mean_sueldo_bruto_mensual, '$');
      updateKPI('d1-kpi-hogar-nac', nac.mean_ing_cor_mensual, '$');
      updateKPI('d1-kpi-hogar-cdmx', cdmxH.mean_ing_cor_mensual, '$');
      whenChartReady(function() {
        var c = getChartByCanvasId('d1Chart');
        if (!c) return;
        c.data.datasets[0].data = [
          cdmx.mean_sueldo_bruto_mensual || 0,
          nac.mean_ing_cor_mensual || 0,
          cdmxH.mean_ing_cor_mensual || 0,
        ];
        c.update('none');
      });
    }

    // ---------- D4 ----------
    function renderD4(d) {
      if (!d || !d.agro || !d.noagro) return;
      updateKPI('d4-kpi-agro-nac', d.agro.pct_nacional, '', '%', 2);
      updateKPI('d4-kpi-agro-cdmx', d.agro.pct_cdmx, '', '%', 2);
      updateKPI('d4-kpi-noagro-nac', d.noagro.pct_nacional, '', '%', 2);
      updateKPI('d4-kpi-noagro-cdmx', d.noagro.pct_cdmx, '', '%', 2);
      whenChartReady(function() {
        var c = getChartByCanvasId('d4Chart');
        if (!c) return;
        c.data.datasets[0].data = [d.agro.pct_nacional, d.noagro.pct_nacional];
        c.data.datasets[1].data = [d.agro.pct_cdmx, d.noagro.pct_cdmx];
        c.update('none');
      });
    }

    // ---------- D2 ----------
    function romanoDecil(n) {
      return ['I','II','III','IV','V','VI','VII','VIII','IX','X'][n - 1];
    }

    function renderD2(d) {
      if (!d) return;
      var escenarios = Array.isArray(d.escenarios) ? d.escenarios : [];
      if (escenarios[0] && Array.isArray(escenarios[0].mapeo)) {
        var tbodyA = document.getElementById('d2-escenario-a-tbody');
        if (tbodyA) {
          tbodyA.innerHTML = escenarios[0].mapeo.map(function(m) {
            return '<tr>' +
              '<td><strong>' + m.percentil + '</strong></td>' +
              '<td class="num">$' + fmtN(Math.round(m.ingreso_hogar_supuesto_mensual)) + '</td>' +
              '<td class="num"><strong>D ' + romanoDecil(m.decil_hogar_enigh) + '</strong></td>' +
              '</tr>';
          }).join('');
        }
      }
      if (escenarios[1] && Array.isArray(escenarios[1].mapeo)) {
        var tbodyB = document.getElementById('d2-escenario-b-tbody');
        if (tbodyB) {
          tbodyB.innerHTML = escenarios[1].mapeo.map(function(m) {
            return '<tr>' +
              '<td><strong>' + m.percentil + '</strong></td>' +
              '<td class="num">$' + fmtN(Math.round(m.ingreso_hogar_supuesto_mensual)) + '</td>' +
              '<td class="num"><strong>D ' + romanoDecil(m.decil_hogar_enigh) + '</strong></td>' +
              '</tr>';
          }).join('');
        }
      }
      if (Array.isArray(d.enigh_deciles_mensuales)) {
        var tbodyD = document.getElementById('d2-deciles-tbody');
        if (tbodyD) {
          tbodyD.innerHTML = d.enigh_deciles_mensuales.map(function(dec) {
            var highlight = (dec.decil === 2 || dec.decil === 3) ? ' class="row-highlight-boundary"' : '';
            var upperDisplay = dec.decil === 10 ? '—' : '$' + fmtN(Math.round(dec.upper_mensual));
            return '<tr' + highlight + '>' +
              '<td><strong>D ' + romanoDecil(dec.decil) + '</strong></td>' +
              '<td class="num">$' + fmtN(Math.round(dec.lower_mensual)) + '</td>' +
              '<td class="num">' + upperDisplay + '</td>' +
              '</tr>';
          }).join('');
        }
      }
    }

    // ---------- D3 ----------
    function renderD3(d) {
      if (!d) return;
      var cdmx = d.cdmx_aportes_actuales || {};
      var enigh = d.enigh_jubilaciones_actuales || {};
      updateKPI('d3-kpi-bruto', cdmx.mean_sueldo_bruto, '$');
      updateKPI('d3-kpi-neto', cdmx.mean_sueldo_neto, '$');
      updateKPI('d3-kpi-deduccion', cdmx.mean_deduccion_total, '$');
      updateKPI('d3-kpi-pct-jubilados', enigh.pct_hogares_con_jubilacion, '', '%', 2);
      updateKPI('d3-kpi-jub-mensual', enigh.mean_jubilacion_solo_jubilados_mensual, '$');
    }

    // ---------- D5 ----------
    function renderD5(d) {
      if (!d || !Array.isArray(d.rubros)) return;
      var tbody = document.getElementById('d5-rubros-tbody');
      if (tbody) {
        tbody.innerHTML = d.rubros.map(function(r) {
          return '<tr>' +
            '<td>' + r.nombre + '</td>' +
            '<td class="num">$' + fmtN(Math.round(r.mean_cdmx_mensual)) + '</td>' +
            '<td class="num">$' + fmtN(Math.round(r.mean_nacional_mensual)) + '</td>' +
            '<td class="num delta-ok">+$' + fmtN(Math.round(r.delta_absoluto)) + '</td>' +
            '<td class="num delta-ok">+' + r.delta_pct.toFixed(2) + '%</td>' +
            '</tr>';
        }).join('');
      }
      whenChartReady(function() {
        var c = getChartByCanvasId('d5Chart');
        if (!c) return;
        c.data.labels = d.rubros.map(function(r) { return r.nombre; });
        c.data.datasets[0].data = d.rubros.map(function(r) { return r.mean_cdmx_mensual; });
        c.data.datasets[1].data = d.rubros.map(function(r) { return r.mean_nacional_mensual; });
        c.update('none');
      });
    }

    // ---------- D7 ----------
    function renderD7(d) {
      if (!d || !d.top_bracket || !d.bottom_bracket) return;
      whenChartReady(function() {
        var top = d.top_bracket;
        var bot = d.bottom_bracket;
        var cTop = getChartByCanvasId('d7TopChart');
        if (cTop && top.cdmx_servidor_percentiles && top.enigh_d10) {
          cTop.data.datasets[0].data = [
            top.cdmx_servidor_percentiles.p90,
            top.cdmx_servidor_percentiles.p95,
            top.cdmx_servidor_percentiles.p99,
            top.enigh_d10.mean_mensual,
          ];
          cTop.update('none');
        }
        var cBot = getChartByCanvasId('d7BottomChart');
        if (cBot && bot.cdmx_servidor_percentiles && bot.enigh_d1) {
          cBot.data.datasets[0].data = [
            bot.cdmx_servidor_percentiles.p01,
            bot.cdmx_servidor_percentiles.p05,
            bot.cdmx_servidor_percentiles.p10,
            bot.enigh_d1.mean_mensual,
          ];
          cBot.update('none');
        }
      });
    }

    // ---------- D6 ----------
    function renderD6(d) {
      if (!d) return;
      updateKPI('d6-kpi-cdmx', d.pct_cdmx, '', '%', 2);
      updateKPI('d6-kpi-nac', d.pct_nacional, '', '%', 2);
      whenChartReady(function() {
        var c = getChartByCanvasId('d6Chart');
        if (!c) return;
        c.data.datasets[0].data = [d.pct_cdmx, d.pct_nacional];
        c.update('none');
      });
    }

    // Fire fetches in parallel; each section updates independently.
    Promise.allSettled([
      fetchJson('/ingreso/cdmx-vs-nacional').then(renderD1),
      fetchJson('/decil-servidores-cdmx').then(renderD2),
      fetchJson('/gastos/cdmx-vs-nacional').then(renderD5),
      fetchJson('/top-vs-bottom').then(renderD7),
      fetchJson('/actividad-cdmx-vs-nacional').then(renderD4),
      fetchJson('/bancarizacion').then(renderD6),
      fetchJson('/aportes-vs-jubilaciones-actuales').then(renderD3),
    ]).then(function(results) {
      var anyOk = results.some(function(r) { return r.status === 'fulfilled'; });
      if (anyOk) markLive();
    });
  })();
  <\/script>
  `;
}
