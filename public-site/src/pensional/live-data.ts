// Pensional S12 — 3 fetches paralelos a CONSAR + Comparativo.
// Promise.allSettled: fallos individuales no rompen la página.
// Hidrata P1 y P2 recomputando derivados en el cliente sobre respuestas live.

export function buildPensionalLiveDataScript(): string {
  return `
  <script>
  (function() {
    var API_BASE = 'https://api.datos-itam.org/api/v1';
    var TIMEOUT = 10000;
    var SNAPSHOT_FECHA = '2025-06';  // se actualiza dinámicamente si /totales trae uno más reciente
    var TASA_REAL = 0.04;

    // Categorías — replica de seed.ts para cálculo client-side
    var CATEGORIAS = {
      rcv_imss: 'liquido',
      rcv_issste: 'liquido',
      ahorro_voluntario_y_solidario: 'liquido',
      fondos_prevision_social: 'liquido',
      bono_pension_issste: 'liquido',
      vivienda: 'vinculado',
      banxico: 'operativo',
      capital_afores: 'operativo',
    };

    function fmtMm(v) {
      if (v == null) return '—';
      if (Math.abs(v) >= 1000000) return '$' + (v / 1000000).toFixed(2) + ' bill';
      if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(0) + 'K mm';
      return '$' + v.toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' mm';
    }
    function fmtBill(mm) { return '$' + (mm / 1000000).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bill'; }
    function fmtPct(n, d) { d = d == null ? 2 : d; return n.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%'; }
    function fmtN(n) { return n.toLocaleString('es-MX'); }

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
      var badge = document.getElementById('pensionalLiveBadge');
      if (badge) badge.classList.add('active');
    }

    function getChart(id) {
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

    // ---------- Partición líquido/vinculado/operativo ----------
    function computePartition(componentes) {
      var buckets = { liquido: 0, vinculado: 0, operativo: 0 };
      var sar = 0;
      componentes.forEach(function(c) {
        var cat = CATEGORIAS[c.tipo_codigo];
        if (cat && buckets[cat] != null) {
          buckets[cat] += c.monto_mxn_mm;
          sar += c.monto_mxn_mm;
        }
      });
      return {
        sarTotalMm: sar,
        liquido: { totalMm: buckets.liquido, pct: sar > 0 ? buckets.liquido / sar * 100 : 0 },
        vinculado: { totalMm: buckets.vinculado, pct: sar > 0 ? buckets.vinculado / sar * 100 : 0 },
        operativo: { totalMm: buckets.operativo, pct: sar > 0 ? buckets.operativo / sar * 100 : 0 },
      };
    }

    // ---------- Cobertura stock × rendimiento vs flujo ----------
    function computeCoverage(sarMm, nHogares, promedioMensual, tasa) {
      var pagoAnualMm = (nHogares * promedioMensual * 12) / 1000000;
      var rendimientoMm = sarMm * tasa;
      var pct = pagoAnualMm > 0 ? rendimientoMm / pagoAnualMm * 100 : 0;
      return {
        sarTotalMm: sarMm,
        nHogaresJubilados: nHogares,
        promedioMensual: promedioMensual,
        pagoAnualMm: pagoAnualMm,
        rendimientoMm: rendimientoMm,
        coberturaPct: pct,
      };
    }

    // ---------- P2 hidrate ----------
    function renderP2(partition) {
      updateKPI('p2-kpi-sar', partition.sarTotalMm, '$', ' mm');
      updateKPI('p2-kpi-liquido-pct', partition.liquido.pct, '', '%', 2);
      updateKPI('p2-kpi-vivienda-pct', partition.vinculado.pct, '', '%', 2);
      updateKPI('p2-kpi-operativo-pct', partition.operativo.pct, '', '%', 2);

      whenChartReady(function() {
        var c = getChart('p2Chart');
        if (!c) return;
        c.data.datasets[0].data = [partition.liquido.totalMm];
        c.data.datasets[0].label = 'Líquido para pensión (' + fmtPct(partition.liquido.pct, 2) + ')';
        c.data.datasets[1].data = [partition.vinculado.totalMm];
        c.data.datasets[1].label = 'Vivienda vinculada (' + fmtPct(partition.vinculado.pct, 2) + ')';
        c.data.datasets[2].data = [partition.operativo.totalMm];
        c.data.datasets[2].label = 'Operativo administrativo (' + fmtPct(partition.operativo.pct, 2) + ')';
        c.update('none');
      });
    }

    // ---------- P1 hidrate ----------
    function renderP1(coverage) {
      updateKPI('p1-kpi-sar', coverage.sarTotalMm, '$', ' mm');
      updateKPI('p1-kpi-hogares', coverage.nHogaresJubilados, '', '');
      updateKPI('p1-kpi-promedio', coverage.promedioMensual, '$', '');
      updateKPI('p1-kpi-flujo', coverage.pagoAnualMm, '$', ' mm');
      updateKPI('p1-kpi-rendimiento', coverage.rendimientoMm, '$', ' mm');

      // Callout central — número grande (no data-target)
      var bigEl = document.getElementById('p1-big-cobertura');
      if (bigEl) bigEl.textContent = Math.round(coverage.coberturaPct) + '%';
      var inlineEl = document.getElementById('p1-cobertura-inline');
      if (inlineEl) inlineEl.textContent = fmtPct(coverage.coberturaPct, 1);

      whenChartReady(function() {
        var c = getChart('p1Chart');
        if (!c) return;
        c.data.datasets[0].data = [coverage.rendimientoMm, coverage.pagoAnualMm];
        c.update('none');
      });
    }

    // ---------- Boot ----------
    function boot() {
      // 1. Obtener último punto de /totales — actualiza SNAPSHOT_FECHA dinámicamente
      fetchJson('/consar/recursos/totales').then(function(d) {
        if (!d || !d.serie || !d.serie.length) return null;
        var last = d.serie[d.serie.length - 1];
        SNAPSHOT_FECHA = last.fecha.slice(0, 7);
        return last;
      }).catch(function() { return null; }).then(function(last) {
        // 2. Paralelo: /composicion (P2) + /comparativo/aportes-vs-jubilaciones-actuales (P1)
        var requests = [
          fetchJson('/consar/recursos/composicion?fecha=' + SNAPSHOT_FECHA + '-01'),
          fetchJson('/comparativo/aportes-vs-jubilaciones-actuales'),
        ];
        Promise.allSettled(requests).then(function(results) {
          var composicion = results[0].status === 'fulfilled' ? results[0].value : null;
          var comparativo = results[1].status === 'fulfilled' ? results[1].value : null;

          if (composicion && composicion.componentes) {
            var partition = computePartition(composicion.componentes);
            renderP2(partition);

            // P1 requiere composición (para sar total) + comparativo (hogares + promedio)
            if (comparativo && comparativo.enigh_jubilaciones_actuales) {
              var enigh = comparativo.enigh_jubilaciones_actuales;
              var coverage = computeCoverage(
                partition.sarTotalMm,
                enigh.n_hogares_con_jubilacion_expandido,
                enigh.mean_jubilacion_solo_jubilados_mensual,
                TASA_REAL
              );
              renderP1(coverage);
            }
          }

          var anyOk = results.some(function(r) { return r.status === 'fulfilled'; }) || (last != null);
          if (anyOk) markLive();
        });
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
