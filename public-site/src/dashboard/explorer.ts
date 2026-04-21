const API_BASE = 'https://api.datos-itam.org';

export function buildExplorerSection(): string {
  return `
    <h2 class="section-title">Explorador de servidores</h2>
    <p class="chart-note">Busqueda en vivo sobre los 246,821 registros. Los filtros del panel anterior tambien aplican aqui. El boton exporta a CSV la consulta filtrada actual (maximo 50,000 filas).</p>

    <section class="explorer" id="explorer">
      <div class="explorer-toolbar">
        <input type="search" id="explorerSearch" class="explorer-search" placeholder="Buscar por puesto: JEFE, DIRECTOR, COORDINADOR..." data-filter="puesto_search">
        <label class="explorer-perpage">
          <span>Mostrar</span>
          <select id="explorerPerPage">
            <option value="10">10</option>
            <option value="25" selected>25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
        <button type="button" class="explorer-export-btn" id="explorerExportBtn" disabled>
          Exportar CSV
        </button>
      </div>

      <div class="explorer-table-wrap">
        <table class="explorer-table">
          <thead>
            <tr>
              <th data-col="apellido_1" class="sortable">Nombre</th>
              <th data-col="edad" class="sortable">Edad</th>
              <th>Genero</th>
              <th>Sector</th>
              <th>Puesto</th>
              <th data-col="sueldo_bruto" class="sortable num">Sueldo bruto</th>
              <th data-col="sueldo_neto" class="sortable num">Sueldo neto</th>
            </tr>
          </thead>
          <tbody id="explorerTbody">
            <tr><td colspan="7" class="loading-row">Cargando servidores...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="explorer-pagination" id="explorerPagination">
        <span class="explorer-summary" id="explorerSummary">—</span>
        <div class="explorer-pages">
          <button type="button" id="explorerPrev" class="page-btn" disabled>Anterior</button>
          <span id="explorerPageLabel" class="page-label">Pagina 1</span>
          <button type="button" id="explorerNext" class="page-btn" disabled>Siguiente</button>
        </div>
      </div>
    </section>
  `;
}

export function buildExplorerScript(): string {
  return `
  <script>
  (function() {
    var API_BASE = '${API_BASE}';
    var DEBOUNCE_MS = 400;
    var DEBOUNCE_SEARCH_MS = 500;

    var state = {
      page: 1,
      per_page: 25,
      order_by: 'id',
      order: 'asc',
      total: 0,
      pages: 0
    };
    var searchDebounce = null;
    var currentAbort = null;

    function fmtMoney(n) {
      if (n === null || n === undefined) return '—';
      return '$' + Math.round(n).toLocaleString('es-MX');
    }
    function escapeHtml(s) {
      if (s === null || s === undefined) return '—';
      return String(s).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function getQS() {
      var filters = window.__filterState ? Object.assign({}, window.__filterState.current) : {};
      filters.page = state.page;
      filters.per_page = state.per_page;
      filters.order_by = state.order_by;
      filters.order = state.order;
      var params = new URLSearchParams();
      Object.keys(filters).forEach(function(k) {
        if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
          params.set(k, filters[k]);
        }
      });
      return params.toString();
    }

    function fetchPage() {
      if (currentAbort) currentAbort.abort();
      currentAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var url = API_BASE + '/api/v1/servidores/?' + getQS();

      var tbody = document.getElementById('explorerTbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Cargando...</td></tr>';

      fetch(url, currentAbort ? { signal: currentAbort.signal } : {})
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) {
          if (!d) return;
          state.total = d.total;
          state.pages = d.pages;
          renderRows(d.data);
          renderPagination();
          updateExportBtn();
        })
        .catch(function() {
          if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Sin conexion con la API</td></tr>';
        });
    }

    function renderRows(rows) {
      var tbody = document.getElementById('explorerTbody');
      if (!tbody) return;
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Sin resultados para estos filtros.</td></tr>';
        return;
      }
      var html = '';
      rows.forEach(function(r) {
        var nombre = [r.nombre, r.apellido_1, r.apellido_2].filter(Boolean).map(escapeHtml).join(' ');
        html += '<tr>'
          + '<td>' + nombre + '</td>'
          + '<td>' + (r.edad === null ? '—' : r.edad) + '</td>'
          + '<td>' + escapeHtml(r.sexo) + '</td>'
          + '<td>' + escapeHtml(r.sector) + '</td>'
          + '<td>' + escapeHtml(r.puesto) + '</td>'
          + '<td class="num">' + fmtMoney(r.sueldo_bruto) + '</td>'
          + '<td class="num">' + fmtMoney(r.sueldo_neto) + '</td>'
          + '</tr>';
      });
      tbody.innerHTML = html;
    }

    function renderPagination() {
      var summary = document.getElementById('explorerSummary');
      var prev = document.getElementById('explorerPrev');
      var next = document.getElementById('explorerNext');
      var lbl = document.getElementById('explorerPageLabel');
      if (!summary || !prev || !next || !lbl) return;
      if (state.total === 0) {
        summary.textContent = '0 resultados';
      } else {
        var from = (state.page - 1) * state.per_page + 1;
        var to = Math.min(state.page * state.per_page, state.total);
        summary.textContent = from.toLocaleString('es-MX') + '–' + to.toLocaleString('es-MX') + ' de ' + state.total.toLocaleString('es-MX');
      }
      lbl.textContent = 'Pagina ' + state.page + ' de ' + (state.pages || 1);
      prev.disabled = state.page <= 1;
      next.disabled = state.page >= state.pages;
    }

    function updateExportBtn() {
      var btn = document.getElementById('explorerExportBtn');
      if (!btn) return;
      if (state.total === 0) {
        btn.disabled = true;
        btn.textContent = 'Exportar CSV (sin resultados)';
        btn.title = '';
      } else if (state.total > 50000) {
        btn.disabled = true;
        btn.textContent = 'Exportar CSV (' + state.total.toLocaleString('es-MX') + ')';
        btn.title = 'El export esta limitado a 50,000 filas. Afina los filtros.';
      } else {
        btn.disabled = false;
        btn.textContent = 'Exportar CSV (' + state.total.toLocaleString('es-MX') + ')';
        btn.title = '';
      }
    }

    function onHeaderClick(e) {
      var th = e.target.closest('th.sortable');
      if (!th) return;
      var col = th.getAttribute('data-col');
      if (!col) return;
      if (state.order_by === col) {
        state.order = state.order === 'asc' ? 'desc' : 'asc';
      } else {
        state.order_by = col;
        state.order = 'asc';
      }
      state.page = 1;
      document.querySelectorAll('.explorer-table th.sortable').forEach(function(h) {
        h.classList.remove('sorted-asc', 'sorted-desc');
      });
      th.classList.add(state.order === 'asc' ? 'sorted-asc' : 'sorted-desc');
      fetchPage();
    }

    function wire() {
      var search = document.getElementById('explorerSearch');
      var perPage = document.getElementById('explorerPerPage');
      var prev = document.getElementById('explorerPrev');
      var next = document.getElementById('explorerNext');
      var expBtn = document.getElementById('explorerExportBtn');
      var table = document.querySelector('.explorer-table');

      if (search) {
        // Hydrate from filter state if present
        var st = window.__filterState;
        if (st && st.current && st.current.puesto_search) search.value = st.current.puesto_search;
        search.addEventListener('input', function() {
          clearTimeout(searchDebounce);
          searchDebounce = setTimeout(function() {
            if (window.__filterState) window.__filterState.set('puesto_search', search.value.trim());
            // filters:changed event will trigger refetch
          }, DEBOUNCE_SEARCH_MS);
        });
      }

      if (perPage) {
        perPage.addEventListener('change', function() {
          state.per_page = parseInt(perPage.value, 10);
          state.page = 1;
          fetchPage();
        });
      }
      if (prev) prev.addEventListener('click', function() {
        if (state.page > 1) { state.page--; fetchPage(); }
      });
      if (next) next.addEventListener('click', function() {
        if (state.page < state.pages) { state.page++; fetchPage(); }
      });
      if (expBtn) expBtn.addEventListener('click', function() {
        if (expBtn.disabled) return;
        // Build URL using only the filter state (no page/per_page/order_*)
        var filters = window.__filterState ? Object.assign({}, window.__filterState.current) : {};
        var p = new URLSearchParams();
        Object.keys(filters).forEach(function(k) {
          if (filters[k]) p.set(k, filters[k]);
        });
        window.location.href = API_BASE + '/api/v1/export/csv' + (p.toString() ? '?' + p.toString() : '');
        expBtn.disabled = true;
        setTimeout(function() { updateExportBtn(); }, 3000);
      });
      if (table) table.addEventListener('click', onHeaderClick);
    }

    // React to filter changes from the panel above
    window.addEventListener('filters:changed', function() {
      // Sync search input if it diverges
      var search = document.getElementById('explorerSearch');
      var cur = window.__filterState && window.__filterState.current
        ? (window.__filterState.current.puesto_search || '')
        : '';
      if (search && search.value !== cur) search.value = cur;
      state.page = 1;
      fetchPage();
    });

    document.addEventListener('DOMContentLoaded', function() {
      wire();
      fetchPage();
    });
  })();
  <\/script>
  `;
}
