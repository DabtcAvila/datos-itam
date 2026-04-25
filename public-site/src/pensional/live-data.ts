// Pensional — fetches CONSAR para hidratar la composición del SAR.
// Llama a /totales (para detectar el snapshot más reciente) y /composicion.
// Hidrata el dashboard recomputando la partición sobre la respuesta live.

export function buildPensionalLiveDataScript(): string {
  return `
  <script>
  (function() {
    var API_BASE = 'https://api.datos-itam.org/api/v1';
    var TIMEOUT = 10000;
    var SNAPSHOT_FECHA = '2025-06';  // se actualiza dinámicamente si /totales trae uno más reciente

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

    function fmtPct(n, d) { d = d == null ? 2 : d; return n.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%'; }

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

    // ---------- Composición SAR hidrate ----------
    function renderComposicion(partition) {
      updateKPI('composicion-kpi-sar', partition.sarTotalMm, '$', ' mm');
      updateKPI('composicion-kpi-liquido-pct', partition.liquido.pct, '', '%', 2);
      updateKPI('composicion-kpi-vivienda-pct', partition.vinculado.pct, '', '%', 2);
      updateKPI('composicion-kpi-operativo-pct', partition.operativo.pct, '', '%', 2);

      whenChartReady(function() {
        var c = getChart('composicionChart');
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

    // ---------- Boot ----------
    function boot() {
      // 1. Obtener último punto de /totales — actualiza SNAPSHOT_FECHA dinámicamente
      fetchJson('/consar/recursos/totales').then(function(d) {
        if (!d || !d.serie || !d.serie.length) return null;
        var last = d.serie[d.serie.length - 1];
        SNAPSHOT_FECHA = last.fecha.slice(0, 7);
        return last;
      }).catch(function() { return null; }).then(function(last) {
        // 2. /composicion del snapshot detectado
        fetchJson('/consar/recursos/composicion?fecha=' + SNAPSHOT_FECHA + '-01')
          .then(function(composicion) {
            if (composicion && composicion.componentes) {
              var partition = computePartition(composicion.componentes);
              renderComposicion(partition);
              markLive();
            } else if (last != null) {
              markLive();
            }
          })
          .catch(function() {
            if (last != null) markLive();
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
