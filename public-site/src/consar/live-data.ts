// CONSAR live-data — 8 fetches paralelos al API de producción.
// Patrón heredado de comparativo: SSR con seed, refresh on load, silent fallback.
// Si un fetch falla, los demás siguen renderizando (Promise.allSettled).

export function buildConsarLiveDataScript(): string {
  return `
  <script>
  (function() {
    var API_BASE = 'https://api.datos-itam.org/api/v1/consar';
    var TIMEOUT = 10000;
    var SNAPSHOT_FECHA = '2025-06';

    function fmtMm(v) {
      if (v == null) return '—';
      if (Math.abs(v) >= 1000000) return '$' + (v / 1000000).toFixed(2) + ' bill';
      if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(0) + 'K mm';
      return '$' + v.toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' mm';
    }
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
      if (target == null) return;
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
      var badge = document.getElementById('consarLiveBadge');
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

    // ---------- D1 — /recursos/totales ----------
    function renderD1(d) {
      if (!d || !d.serie || !d.serie.length) return;
      var last = d.serie[d.serie.length - 1];
      var first = d.serie[0];
      updateKPI('d1-kpi-sar-total', last.monto_mxn_mm, '$', ' mm');
      updateKPI('d1-kpi-n-puntos', d.n_puntos, '', ' meses');
      if (first.monto_mxn_mm > 0) {
        var crec = last.monto_mxn_mm / first.monto_mxn_mm;
        updateKPI('d1-kpi-crecimiento', crec, '', '×');
      }
      whenChartReady(function() {
        var c = getChartByCanvasId('d1Chart');
        if (!c) return;
        c.data.labels = d.serie.map(function(p) { return p.fecha; });
        c.data.datasets[0].data = d.serie.map(function(p) { return p.monto_mxn_mm; });
        c.update('none');
      });
    }

    // ---------- D2 — /recursos/composicion ----------
    function renderD2(d) {
      if (!d || !d.componentes) return;
      // El orden del API viene por orden_display (total primero etc.) — filtrar los 8 componentes
      // del identity. Aquí llegan los 8 directamente del endpoint /composicion.
      whenChartReady(function() {
        var c = getChartByCanvasId('d2Chart');
        if (!c) return;
        // Mantenemos el orden de seed (ordenado por magnitud); el API lo entrega
        // en orden por orden_display. Re-ordenamos por monto_mxn_mm desc para mantener coherencia visual.
        var sorted = d.componentes.slice().sort(function(a, b) { return b.monto_mxn_mm - a.monto_mxn_mm; });
        c.data.labels = sorted.map(function(x) { return x.tipo_nombre_corto; });
        c.data.datasets[0].data = sorted.map(function(x) { return x.monto_mxn_mm; });
        c.update('none');
      });
      // Actualizar tabla legend (lee pct_del_sar). NO reordenamos las filas HTML — requeriría
      // más gymnastics. El live-refresh sólo actualiza los números numéricos, no la estructura.
    }

    // ---------- D3 — /recursos/por-afore ----------
    function renderD3(d) {
      if (!d || !d.afores) return;
      var afores = d.afores.slice().sort(function(a, b) {
        return (b.sar_total_mm || 0) - (a.sar_total_mm || 0);
      });
      var top4 = afores.slice(0, 4).reduce(function(acc, x) { return acc + (x.pct_sistema || 0); }, 0);
      updateKPI('d3-kpi-top4', top4, '', '%', 2);
      if (afores[0]) updateKPI('d3-kpi-lider', afores[0].pct_sistema, '', '%', 2);
      var last = afores[afores.length - 1];
      if (last) updateKPI('d3-kpi-ultima', last.pct_sistema, '', '%', 2);
      whenChartReady(function() {
        var c = getChartByCanvasId('d3Chart');
        if (!c) return;
        c.data.labels = afores.map(function(a) { return a.afore_nombre_corto; });
        c.data.datasets[0].data = afores.map(function(a) { return a.sar_total_mm || 0; });
        c.update('none');
      });
    }

    // ---------- D4 — /recursos/imss-vs-issste ----------
    function renderD4(d) {
      if (!d || !d.serie || !d.serie.length) return;
      var last = d.serie[d.serie.length - 1];
      updateKPI('d4-kpi-imss', last.rcv_imss_mm, '$', ' mm');
      updateKPI('d4-kpi-issste', last.rcv_issste_mm, '$', ' mm');
      if (last.ratio_issste_sobre_imss != null) {
        updateKPI('d4-kpi-ratio', last.ratio_issste_sobre_imss * 100, '', '%', 2);
      }
      whenChartReady(function() {
        var c = getChartByCanvasId('d4Chart');
        if (!c) return;
        c.data.labels = d.serie.map(function(p) { return p.fecha; });
        c.data.datasets[0].data = d.serie.map(function(p) { return p.rcv_imss_mm; });
        c.data.datasets[1].data = d.serie.map(function(p) { return p.rcv_issste_mm; });  // null OK → gap
        c.update('none');
      });
    }

    // ---------- D5 — /recursos/serie?codigo=vivienda ----------
    function renderD5(d, composicion) {
      if (!d || !d.serie || !d.serie.length) return;
      var last = d.serie[d.serie.length - 1];
      var first = d.serie[0];
      updateKPI('d5-kpi-vivienda', last.monto_mxn_mm, '$', ' mm');
      if (first.monto_mxn_mm > 0) {
        updateKPI('d5-kpi-crecimiento', last.monto_mxn_mm / first.monto_mxn_mm, '', '×');
      }
      // Ratio vivienda vs ahorro voluntario+solidario (de composicion)
      if (composicion && composicion.componentes) {
        var vol_sol = composicion.componentes.find(function(c) { return c.tipo_codigo === 'ahorro_voluntario_y_solidario'; });
        if (vol_sol && vol_sol.monto_mxn_mm > 0) {
          updateKPI('d5-kpi-ratio-voluntario', last.monto_mxn_mm / vol_sol.monto_mxn_mm, '', '×', 1);
        }
      }
      whenChartReady(function() {
        var c = getChartByCanvasId('d5Chart');
        if (!c) return;
        c.data.labels = d.serie.map(function(p) { return p.fecha; });
        c.data.datasets[0].data = d.serie.map(function(p) { return p.monto_mxn_mm; });
        c.update('none');
      });
    }

    // ---------- D6 — /recursos/serie?codigo=sar_total&afore_codigo=pension_bienestar ----------
    function renderD6(d) {
      if (!d || !d.serie || !d.serie.length) return;
      var last = d.serie[d.serie.length - 1];
      var first = d.serie[0];
      updateKPI('d6-kpi-pb-total', last.monto_mxn_mm, '$', ' mm');
      updateKPI('d6-kpi-pb-nmeses', d.n_puntos, '', ' puntos');
      if (first.monto_mxn_mm > 0) {
        var crecPct = (last.monto_mxn_mm - first.monto_mxn_mm) / first.monto_mxn_mm * 100;
        updateKPI('d6-kpi-pb-crecimiento', crecPct, '', '%', 2);
      }
      whenChartReady(function() {
        var c = getChartByCanvasId('d6Chart');
        if (!c) return;
        c.data.labels = d.serie.map(function(p) { return p.fecha; });
        c.data.datasets[0].data = d.serie.map(function(p) { return p.monto_mxn_mm; });
        c.update('none');
      });
    }

    // ---------- D7 — /afores + /tipos-recurso (no chart, solo refresh tablas si cambian) ----------
    // No hay refresh dinámico de tablas catálogo — son estables. Skip.

    // ---------- Boot: 8 fetches paralelos ----------
    function boot() {
      var requests = [
        fetchJson('/recursos/totales').then(renderD1),
        fetchJson('/recursos/composicion?fecha=' + SNAPSHOT_FECHA),
        fetchJson('/recursos/por-afore?fecha=' + SNAPSHOT_FECHA).then(renderD3),
        fetchJson('/recursos/imss-vs-issste').then(renderD4),
        fetchJson('/recursos/serie?codigo=vivienda'),
        fetchJson('/recursos/serie?codigo=sar_total&afore_codigo=pension_bienestar').then(renderD6),
        fetchJson('/afores'),
        fetchJson('/tipos-recurso'),
      ];

      // D5 necesita composición (para ratio vivienda vs vol_sol), así que lo resolvemos via Promise.all de los 2
      Promise.allSettled([requests[1], requests[4]]).then(function(results) {
        var composicion = results[0].status === 'fulfilled' ? results[0].value : null;
        var serieViv = results[1].status === 'fulfilled' ? results[1].value : null;
        if (composicion) renderD2(composicion);
        if (serieViv) renderD5(serieViv, composicion);
      });

      Promise.allSettled(requests).then(function(results) {
        var anyOk = results.some(function(r) { return r.status === 'fulfilled'; });
        if (anyOk) markLive();
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  })();
  </script>
  `;
}
