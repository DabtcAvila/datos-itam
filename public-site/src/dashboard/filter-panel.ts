import { stats } from '../data/stats';

const API_BASE = 'https://api.datos-itam.org';

export function buildFilterPanel(): string {
  // Seed sector options from pre-rendered stats; live catalog refresh happens client-side.
  const sectorOpts = stats.allSectors
    .map((s, i) => `<option value="${i + 1}">${s.name} (${s.count.toLocaleString('es-MX')})</option>`)
    .join('');

  return `
    <section class="filter-section" id="filterSection">
      <div class="filter-panel">
        <div class="filter-header">
          <h3>Filtrar servidores publicos</h3>
          <button type="button" class="filter-reset-btn" id="filterResetBtn">Limpiar filtros</button>
        </div>
        <div class="filter-grid">
          <div class="filter-field">
            <label for="fp-sector">Sector</label>
            <select id="fp-sector" data-filter="sector_id">
              <option value="">Todos los sectores</option>
              ${sectorOpts}
            </select>
          </div>
          <div class="filter-field">
            <label for="fp-sexo">Genero</label>
            <select id="fp-sexo" data-filter="sexo">
              <option value="">Todos</option>
              <option value="MASCULINO">Hombres</option>
              <option value="FEMENINO">Mujeres</option>
            </select>
          </div>
          <div class="filter-field">
            <label for="fp-tipoContratacion">Tipo de contratacion</label>
            <select id="fp-tipoContratacion" data-filter="tipo_contratacion_id">
              <option value="">Todos</option>
            </select>
          </div>
          <div class="filter-field">
            <label for="fp-edadMin">Edad minima</label>
            <input type="number" id="fp-edadMin" data-filter="edad_min" min="18" max="100" placeholder="18">
          </div>
          <div class="filter-field">
            <label for="fp-edadMax">Edad maxima</label>
            <input type="number" id="fp-edadMax" data-filter="edad_max" min="18" max="100" placeholder="100">
          </div>
          <div class="filter-field">
            <label for="fp-sueldoMin">Sueldo minimo</label>
            <input type="number" id="fp-sueldoMin" data-filter="sueldo_min" min="0" step="1000" placeholder="0">
          </div>
          <div class="filter-field">
            <label for="fp-sueldoMax">Sueldo maximo</label>
            <input type="number" id="fp-sueldoMax" data-filter="sueldo_max" min="0" step="1000" placeholder="sin limite">
          </div>
          <div class="filter-field">
            <label for="fp-puesto">Puesto contiene</label>
            <input type="text" id="fp-puesto" data-filter="puesto_search" placeholder="ej. JEFE, DIRECTOR...">
          </div>
        </div>
      </div>

      <div class="filtered-stats" id="filteredStats">
        <div class="fs-header">
          <span class="fs-title">Resultados filtrados</span>
          <span class="fs-indicator" id="fsIndicator">Sin filtros activos</span>
        </div>
        <div class="fs-grid">
          <div class="fs-kpi"><div class="fs-label">Servidores</div><div class="fs-value" id="fs-total">—</div></div>
          <div class="fs-kpi"><div class="fs-label">Sueldo promedio</div><div class="fs-value" id="fs-avg">—</div></div>
          <div class="fs-kpi"><div class="fs-label">Mediana</div><div class="fs-value" id="fs-median">—</div></div>
          <div class="fs-kpi"><div class="fs-label">Brecha genero</div><div class="fs-value" id="fs-gap">—</div></div>
        </div>
        <div class="chart-card fs-histogram">
          <h3>Distribucion salarial (filtrada)</h3>
          <div class="chart-wrapper">
            <canvas id="salaryHistogramChart"></canvas>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function buildFilterPanelScript(): string {
  return `
  <script>
  (function() {
    var API_BASE = '${API_BASE}';
    var DEBOUNCE_MS = 350;
    var currentAbort = null;
    var debounceTimer = null;
    var histogramChart = null;

    function fmtCurrency(n) {
      if (n === null || n === undefined) return '—';
      return '$' + Math.round(n).toLocaleString('es-MX');
    }
    function fmtNum(n) {
      if (n === null || n === undefined) return '—';
      return Number(n).toLocaleString('es-MX');
    }

    function loadCatalog(url, selectId, valueField, labelField, countField) {
      fetch(API_BASE + url)
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(items) {
          var sel = document.getElementById(selectId);
          if (!sel) return;
          var current = sel.value;
          var firstOpt = sel.querySelector('option').outerHTML;
          var opts = firstOpt;
          items.forEach(function(it) {
            var label = it[labelField] + (countField && it[countField] ? ' (' + fmtNum(it[countField]) + ')' : '');
            opts += '<option value="' + it[valueField] + '">' + label + '</option>';
          });
          sel.innerHTML = opts;
          if (current) sel.value = current;
        })
        .catch(function() {});
    }

    // Hydrate inputs from current filter state
    function hydrateInputs() {
      var state = window.__filterState.current;
      document.querySelectorAll('[data-filter]').forEach(function(el) {
        var key = el.getAttribute('data-filter');
        el.value = state[key] !== undefined ? state[key] : '';
      });
      updateIndicator();
    }

    function updateIndicator() {
      var indicator = document.getElementById('fsIndicator');
      var n = Object.keys(window.__filterState.current).length;
      if (indicator) indicator.textContent = n === 0 ? 'Sin filtros activos' : (n + ' filtro' + (n > 1 ? 's' : '') + ' activo' + (n > 1 ? 's' : ''));
    }

    function fetchStats() {
      if (currentAbort) currentAbort.abort();
      currentAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var qs = window.__filterState.toQS();
      var url = API_BASE + '/api/v1/servidores/stats' + (qs ? '?' + qs : '');
      fetch(url, currentAbort ? { signal: currentAbort.signal } : {})
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) {
          if (!d) return;
          document.getElementById('fs-total').textContent = fmtNum(d.total);
          document.getElementById('fs-avg').textContent = fmtCurrency(d.sueldo_bruto_avg);
          document.getElementById('fs-median').textContent = fmtCurrency(d.sueldo_bruto_median);
          document.getElementById('fs-gap').textContent = d.brecha_genero_pct !== null && d.brecha_genero_pct !== undefined
            ? (d.brecha_genero_pct > 0 ? '+' : '') + d.brecha_genero_pct.toFixed(1) + '%'
            : '—';
          renderHistogram(d.distribucion_sueldo || []);
        })
        .catch(function() {});
    }

    function renderHistogram(buckets) {
      if (typeof Chart === 'undefined') {
        setTimeout(function() { renderHistogram(buckets); }, 300);
        return;
      }
      var canvas = document.getElementById('salaryHistogramChart');
      if (!canvas) return;
      var labels = buckets.map(function(b) { return b.rango; });
      var data = buckets.map(function(b) { return b.count; });
      if (histogramChart) {
        histogramChart.data.labels = labels;
        histogramChart.data.datasets[0].data = data;
        histogramChart.update('none');
      } else {
        histogramChart = new Chart(canvas, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Servidores',
              data: data,
              backgroundColor: '#3b82f6',
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: '#262626' }, ticks: { callback: function(v) { return v.toLocaleString('es-MX'); } } }
            }
          }
        });
      }
    }

    function onInputChanged(e) {
      var el = e.target;
      var key = el.getAttribute ? el.getAttribute('data-filter') : null;
      if (!key) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        window.__filterState.set(key, el.value.trim());
      }, DEBOUNCE_MS);
    }

    function wireInputs() {
      document.querySelectorAll('[data-filter]').forEach(function(el) {
        var evt = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(evt, onInputChanged);
      });
      var btn = document.getElementById('filterResetBtn');
      if (btn) btn.addEventListener('click', function() {
        window.__filterState.reset();
        hydrateInputs();
      });
    }

    window.addEventListener('filters:changed', function() {
      updateIndicator();
      fetchStats();
    });

    document.addEventListener('DOMContentLoaded', function() {
      wireInputs();
      hydrateInputs();
      loadCatalog('/api/v1/catalogos/sectores', 'fp-sector', 'id', 'nombre', 'count');
      loadCatalog('/api/v1/catalogos/tipos-contratacion', 'fp-tipoContratacion', 'id', 'nombre', 'count');
      // Fetch initial stats (all servidores) to populate KPIs + histogram
      fetchStats();
    });
  })();
  <\/script>
  `;
}
