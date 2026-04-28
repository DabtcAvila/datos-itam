import { CSS } from '../styles';
import { buildNavTabs } from '../shared/nav';

const API_BASE = 'https://api.datos-itam.org';

const DEMO_CSS = `
  /* ===== KPI bar (HR-payroll style) ===== */
  .demo-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .demo-kpi {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }
  .demo-kpi-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .demo-kpi-value {
    font-size: 1.85rem;
    font-weight: 700;
    color: var(--text);
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .demo-kpi-sub {
    font-size: 0.78rem;
    color: var(--text-muted);
  }
  .demo-kpi--accent .demo-kpi-value { color: var(--accent); }
  .demo-kpi--green  .demo-kpi-value { color: var(--green); }

  /* ===== Tabla con tono empresarial ===== */
  .demo-table-section {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.5rem;
  }
  .demo-table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .demo-table-header h2 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
  }
  .demo-table-header .meta {
    font-size: 0.78rem;
    color: var(--text-muted);
  }
  .demo-table-header .meta strong { color: var(--green); font-weight: 600; }
  .demo-btn-refresh {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem 0.95rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .demo-btn-refresh:hover { border-color: var(--accent); color: var(--accent); }
  .demo-btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
  .demo-btn-refresh::before {
    content: '↻';
    font-size: 1rem;
    line-height: 1;
  }
  .demo-btn-refresh.spinning::before {
    animation: demo-spin 0.8s linear infinite;
    display: inline-block;
  }
  @keyframes demo-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

  .demo-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  .demo-table th {
    text-align: left;
    padding: 0.7rem 0.85rem;
    border-bottom: 2px solid var(--border);
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
  .demo-table th.num { text-align: right; }
  .demo-table td {
    padding: 0.85rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  .demo-table td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .demo-table tr:last-child td { border-bottom: none; }
  .demo-table tr:hover td { background: var(--bg-hover); }
  .demo-table .name {
    font-weight: 500;
    color: var(--text);
  }
  .demo-table .id-col, .demo-table .id-cell {
    width: 56px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    font-size: 0.82rem;
  }
  .demo-table .id-cell { letter-spacing: 0.02em; }

  /* ===== Badges semánticos ===== */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.22rem 0.7rem;
    border-radius: 9999px;
    font-size: 0.74rem;
    font-weight: 600;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .pill--profesor   { background: rgba(59, 130, 246, 0.12); color: var(--accent); border-color: rgba(59, 130, 246, 0.35); }
  .pill--equipo     { background: rgba(34, 197, 94, 0.10);  color: var(--green);  border-color: rgba(34, 197, 94, 0.35); }
  .pill--estudiante { background: var(--bg);                color: var(--text-muted); border-color: var(--border); }

  .pill--reclamado  { background: rgba(34, 197, 94, 0.14); color: var(--green); border-color: rgba(34, 197, 94, 0.45); }
  .pill--reclamado::before { content: '✓'; font-weight: 800; }
  .pill--pendiente  { background: var(--bg); color: var(--text-muted); border-color: var(--border); }
  .pill--pendiente::before { content: '○'; font-weight: 700; }

  .demo-status-cell { display: inline-flex; align-items: center; gap: 0.5rem; }

  /* ===== "Cómo modificar" cards ===== */
  .demo-howto {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .demo-howto h2 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 0.4rem 0;
  }
  .demo-howto > p {
    color: var(--text-muted);
    font-size: 0.88rem;
    margin: 0 0 1.25rem 0;
  }
  .demo-howto-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.85rem;
  }
  .demo-action {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1rem 1.1rem;
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
    transition: border-color 0.15s, transform 0.15s;
  }
  .demo-action:hover { border-color: var(--accent); transform: translateY(-1px); }
  .demo-action-method {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }
  .demo-action-method .verb {
    display: inline-block;
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
    font-weight: 700;
    margin-right: 0.5rem;
    font-size: 0.68rem;
  }
  .demo-action-method .verb-PUT    { background: rgba(234, 179, 8, 0.18); color: var(--yellow); }
  .demo-action-method .verb-POST   { background: rgba(34, 197, 94, 0.16); color: var(--green); }
  .demo-action-method .verb-DELETE { background: rgba(239, 68, 68, 0.16); color: var(--red); }
  .demo-action-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text);
  }
  .demo-action-desc {
    font-size: 0.78rem;
    color: var(--text-muted);
  }
  .demo-action-link {
    font-size: 0.78rem;
    color: var(--accent);
    margin-top: 0.25rem;
  }

  .demo-error-banner {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid var(--red);
    color: var(--red);
    border-radius: 8px;
    padding: 0.7rem 0.95rem;
    font-size: 0.85rem;
    margin-top: 0.75rem;
    display: none;
  }
  .demo-error-banner.active { display: block; }

  @media (max-width: 900px) {
    .demo-kpis { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 560px) {
    .demo-kpis { grid-template-columns: 1fr; }
    .demo-table-header { flex-direction: column; align-items: stretch; }
    .demo-table { font-size: 0.8rem; }
    .demo-table th, .demo-table td { padding: 0.5rem 0.55rem; }
  }
`;

export function renderDemo(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>datos-itam | Sistema de Bonos · Curso Bases de Datos ITAM 001</title>
  <meta name="description" content="Sistema de gestión de bonos del curso ITAM Bases de Datos sección 001. Aplicación de demostración con CRUD operacional vía API REST autenticada.">
  <meta name="robots" content="noindex,nofollow">
  <meta property="og:title" content="Sistema de Bonos — datos-itam">
  <meta property="og:description" content="Aplicación HR/payroll de demostración. CRUD vía API.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://datos-itam.org/demo">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💼</text></svg>">
  <style>${CSS}${DEMO_CSS}</style>
</head>
<body>

  <header class="header">
    <div>
      <div class="header-brand">datos<span>-</span>itam</div>
      <div class="header-subtitle">Sistema de Bonos — curso Bases de Datos ITAM sección 001</div>
    </div>
    <div class="header-meta">
      <span class="header-badge">12 empleados</span>
      <span class="header-badge">Bono $50,000 MXN</span>
    </div>
  </header>

  ${buildNavTabs('demo')}

  <main class="container">

    <section class="hero">
      <div class="hero-text">
        <h1>Sistema de gestión de bonos</h1>
        <p>Aplicación de demostración con CRUD operacional. Las modificaciones a esta tabla se realizan vía API REST autenticada en
        <a href="https://api.datos-itam.org/docs#/demo" target="_blank" rel="noopener">/api/docs</a>; el dashboard refleja el estado persistido en PostgreSQL.</p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">PostgreSQL Neon · schema demo.curso_bd</span>
        <span class="hero-badge">FastAPI · 8 endpoints REST</span>
      </div>
    </section>

    <!-- ===== KPI bar ===== -->
    <section class="demo-kpis" aria-label="Indicadores agregados">
      <div class="demo-kpi" id="kpi-empleados">
        <div class="demo-kpi-label">Empleados activos</div>
        <div class="demo-kpi-value" data-kpi="total_empleados">—</div>
        <div class="demo-kpi-sub">12 personas en nómina</div>
      </div>
      <div class="demo-kpi demo-kpi--green" id="kpi-reclamados">
        <div class="demo-kpi-label">Bonos reclamados</div>
        <div class="demo-kpi-value" data-kpi="bonos_reclamados">—</div>
        <div class="demo-kpi-sub" data-kpi="bonos_de_total">de 12</div>
      </div>
      <div class="demo-kpi demo-kpi--accent" id="kpi-distribuido">
        <div class="demo-kpi-label">Monto distribuido</div>
        <div class="demo-kpi-value" data-kpi="monto_distribuido_mxn">—</div>
        <div class="demo-kpi-sub" data-kpi="monto_disponible_label">$600,000 MXN posibles</div>
      </div>
      <div class="demo-kpi" id="kpi-nomina">
        <div class="demo-kpi-label">Nómina diaria</div>
        <div class="demo-kpi-value" data-kpi="nomina_diaria_total_mxn">—</div>
        <div class="demo-kpi-sub">suma de 12 sueldos</div>
      </div>
    </section>

    <!-- ===== Tabla ===== -->
    <section class="demo-table-section">
      <div class="demo-table-header">
        <div>
          <h2>Personal del curso BASES DE DATOS — sección 001</h2>
          <div class="meta">Última actualización: <strong id="demoLastUpdate">—</strong></div>
        </div>
        <button type="button" class="demo-btn-refresh" id="demoRefreshBtn">Refrescar tabla</button>
      </div>
      <div class="table-wrap">
        <table class="demo-table" id="demoTable">
          <thead>
            <tr>
              <th class="id-col">ID</th>
              <th>Nombre completo</th>
              <th>Rol</th>
              <th class="num">Sueldo diario</th>
              <th>Bono $50,000 MXN</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody id="demoTableBody">
            <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem">Cargando…</td></tr>
          </tbody>
        </table>
      </div>
      <div id="demoErrorBanner" class="demo-error-banner" role="alert"></div>
    </section>

    <!-- ===== "Cómo modificar" ===== -->
    <section class="demo-howto">
      <h2>¿Cómo modificar datos?</h2>
      <p>Las modificaciones a esta tabla ocurren vía API REST en <a href="https://api.datos-itam.org/docs" target="_blank" rel="noopener"><code>/api/docs</code></a> (Swagger UI con botón <em>Authorize</em> integrado). Cada empleado tiene un <strong>ID en la primera columna</strong> de la tabla — ese es el parámetro que necesita en Swagger. La cuenta compartida del curso emite JWT de 30 min. Después de cada cambio, presione <strong>Refrescar tabla</strong> para ver el estado actualizado.</p>
      <div class="demo-howto-grid">
        <a class="demo-action" href="https://api.datos-itam.org/docs#/demo/toggle_bono_api_v1_demo_estudiantes__id__toggle_bono_put" target="_blank" rel="noopener">
          <div class="demo-action-method"><span class="verb verb-PUT">PUT</span>Reclamar / cancelar bono</div>
          <div class="demo-action-title">Toggle $50,000 sobre un empleado</div>
          <div class="demo-action-desc">Requiere JWT (cuenta compartida del curso). Invierte el booleano <code>reclamar_bono</code> de la fila indicada — el parámetro <code>id</code> es el número de la primera columna de la tabla.</div>
          <div class="demo-action-link">Abrir en Swagger UI →</div>
        </a>
        <a class="demo-action" href="https://api.datos-itam.org/docs#/demo-admin/crear_estudiante_api_v1_admin_demo_estudiantes_post" target="_blank" rel="noopener">
          <div class="demo-action-method"><span class="verb verb-POST">POST</span>Alta de empleado</div>
          <div class="demo-action-title">Crear nuevo registro</div>
          <div class="demo-action-desc">Requiere rol admin. Inserta una fila nueva con nombre, rol, tipo y sueldo diario en <code>demo.curso_bd</code>.</div>
          <div class="demo-action-link">Abrir en Swagger UI →</div>
        </a>
        <a class="demo-action" href="https://api.datos-itam.org/docs#/demo-admin/borrar_estudiante_api_v1_admin_demo_estudiantes__id__delete" target="_blank" rel="noopener">
          <div class="demo-action-method"><span class="verb verb-DELETE">DELETE</span>Baja de empleado</div>
          <div class="demo-action-title">Eliminar registro</div>
          <div class="demo-action-desc">Requiere rol admin. Borra la fila por id; la tabla la deja de mostrar inmediatamente.</div>
          <div class="demo-action-link">Abrir en Swagger UI →</div>
        </a>
      </div>
    </section>

    <footer class="footer">
      <p>Pieza de demostración del curso ITAM Bases de Datos · Schema <code>demo.curso_bd</code> aislado de los datasets oficiales del observatorio (<code>cdmx</code>, <code>enigh</code>, <code>consar</code>).</p>
      <p><a href="/">← Volver al observatorio</a></p>
    </footer>

  </main>

  <script>
${buildDemoScript(API_BASE)}
  </script>

</body>
</html>`;
}


function buildDemoScript(apiBase: string): string {
  return `
  (function() {
    'use strict';
    var API = ${JSON.stringify(apiBase)};

    var fmtMxn0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    var fmtMxn2 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var fmtTime = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    var refreshBtn = document.getElementById('demoRefreshBtn');
    var tbody      = document.getElementById('demoTableBody');
    var lastUpdate = document.getElementById('demoLastUpdate');
    var errorBanner = document.getElementById('demoErrorBanner');

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function(c) {
        return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
      });
    }
    function setText(selector, text) {
      var el = document.querySelector('[data-kpi="' + selector + '"]');
      if (el) el.textContent = text;
    }
    function showError(msg) { errorBanner.textContent = msg; errorBanner.classList.add('active'); }
    function clearError() { errorBanner.textContent = ''; errorBanner.classList.remove('active'); }

    function pillFor(tipo) {
      var label = tipo.charAt(0).toUpperCase() + tipo.slice(1);
      return '<span class="pill pill--' + escapeHtml(tipo) + '">' + escapeHtml(label) + '</span>';
    }

    function bonoBadge(reclamado) {
      return reclamado
        ? '<span class="pill pill--reclamado">$50,000 reclamado</span>'
        : '<span class="pill pill--pendiente">Pendiente</span>';
    }

    function estadoCell(reclamado) {
      var color = reclamado ? 'var(--green)' : 'var(--text-muted)';
      var label = reclamado ? 'Procesado' : 'Sin reclamo';
      return '<span class="demo-status-cell" style="color:' + color + '">'
           + '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + color + '"></span>'
           + escapeHtml(label) + '</span>';
    }

    function renderResumen(r) {
      setText('total_empleados',         String(r.total_empleados));
      setText('bonos_reclamados',        String(r.bonos_reclamados));
      setText('bonos_de_total',          'de ' + r.total_empleados);
      setText('monto_distribuido_mxn',   fmtMxn0.format(r.monto_distribuido_mxn));
      setText('monto_disponible_label',  fmtMxn0.format(r.monto_total_posible_mxn) + ' posibles');
      setText('nomina_diaria_total_mxn', fmtMxn0.format(parseFloat(r.nomina_diaria_total_mxn)));
    }

    function renderTabla(rows) {
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem">Sin datos.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(function(r) {
        var sueldo = fmtMxn2.format(parseFloat(r.sueldo_diario_mxn));
        return '<tr>' +
                  '<td class="id-cell">#' + r.id + '</td>' +
                  '<td class="name">' + escapeHtml(r.nombre_completo) + '</td>' +
                  '<td>' + pillFor(r.tipo) + '</td>' +
                  '<td class="num">' + sueldo + '</td>' +
                  '<td>' + bonoBadge(r.reclamar_bono) + '</td>' +
                  '<td>' + estadoCell(r.reclamar_bono) + '</td>' +
                '</tr>';
      }).join('');
    }

    function loadAll() {
      clearError();
      refreshBtn.disabled = true;
      refreshBtn.classList.add('spinning');
      var p1 = fetch(API + '/api/v1/demo/resumen',     { cache: 'no-store' }).then(function(r) { if (!r.ok) throw new Error('resumen HTTP ' + r.status); return r.json(); });
      var p2 = fetch(API + '/api/v1/demo/estudiantes', { cache: 'no-store' }).then(function(r) { if (!r.ok) throw new Error('estudiantes HTTP ' + r.status); return r.json(); });
      Promise.all([p1, p2])
        .then(function(arr) {
          renderResumen(arr[0]);
          renderTabla(arr[1].estudiantes || []);
          lastUpdate.textContent = fmtTime.format(new Date());
        })
        .catch(function(err) {
          showError('No se pudo cargar la información: ' + err.message);
        })
        .finally(function() {
          refreshBtn.disabled = false;
          refreshBtn.classList.remove('spinning');
        });
    }

    refreshBtn.addEventListener('click', loadAll);

    // ----- Bootstrap -----
    loadAll();
  })();
`;
}
