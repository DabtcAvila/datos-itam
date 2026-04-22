// ENIGH charts — Chart.js 4.4.7 instances for decil, geografía, gastos, actividad, demografía.
// Populated progressively across commits 3 (decil+geografía) and 4 (gastos+actividad+demografía).
// Follows CDMX pattern: loads Chart.js from CDN with fallback, creates instances on DOMContentLoaded.

export function buildEnighChartsScript(): string {
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

    document.addEventListener('DOMContentLoaded', function() {
      // Count-up animation for KPIs — shared pattern with CDMX dashboard
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

      // Chart.js setup — charts themselves defined in commits 3-4.
      loadChartJS(function() {
        if (typeof Chart !== 'undefined') {
          Chart.defaults.color = '#a1a1aa';
          Chart.defaults.borderColor = '#262626';
        }
      });
    });
  })();
  <\/script>
  `;
}
