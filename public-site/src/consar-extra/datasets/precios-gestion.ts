// Sub-sección /consar/precios-gestion — dataset CONSAR #11 (precio gestión daily)
//
// Endpoints:
//   GET /api/v1/consar/precios-gestion/snapshot?fecha=YYYY-MM-DD
//   GET /api/v1/consar/precios-gestion/serie?afore_codigo=X&siefore_slug=Y[&desde&hasta]
//   GET /api/v1/consar/precios-gestion/comparativo?siefore_slug=Y&desde=...&hasta=...
//
// Cobertura: ~1997-01 → 2025-12 daily (~7,059 días hábiles por par activo).
// Pattern triple-section idéntico a /precios-bolsa con ventana temporal:
//   A) Snapshot diario.
//   B) Serie histórica par × ventana.
//   C) Comparativo cross-AFORE × siefore × ventana 30d con chart multi-line + tabla.
//
// HERO S13 calibrado: el diferencial bolsa vs gestión está en hechos observables
// (rangos, ejemplo puntual factual) sin atribución causal — mismo dataset que
// precios-bolsa pero como serie independiente publicada por CONSAR.

import { buildTable } from '../shared/table';
import { buildHeroCaveats, buildSourceFooter } from '../shared/caveats';
import { buildConsarApiHelpers } from '../shared/api';
import { AFORE_COLORS } from '../shared/colors';
import {
  buildAforeSelect,
  buildSieforeSelect,
  buildDateInput,
  buildSelectorsBar,
} from '../shared/selectors';

export function buildPreciosGestion() {
  return {
    title: 'CONSAR · Precio gestión diario — valor de gestión de la siefore por AFORE',
    metaDescription:
      'Precio gestión diario (NAV de gestión) por AFORE × SIEFORE × día hábil, serie independiente publicada por CONSAR. Cobertura desde 1997. Snapshot diario + serie histórica + comparativo cross-AFORE con chart multi-línea. Diferencial respecto al precio bolsa documentado factualmente.',
    hero: buildHero(),
    body: buildBody(),
    script: buildScript(),
  };
}

function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-text">
        <h1 style="font-size:1.4rem;margin-bottom:0.4rem">Precio gestión diario — valor de gestión de la siefore por AFORE</h1>
        <p>
          Precio gestión (Net Asset Value de gestión) reportado diariamente por CONSAR para cada combinación
          AFORE × SIEFORE. Es una <strong>serie independiente</strong> del precio bolsa: ambas se publican por
          CONSAR como dos magnitudes distintas. Coinciden en algunos pares afore × siefore × fecha y divergen en
          otros. Cobertura diaria desde enero 1997 hasta diciembre 2025.
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Cobertura diaria 1997 → 2025</span>
        <span class="hero-badge">Serie independiente del precio bolsa</span>
        <span class="hero-badge">3 endpoints · snapshot + serie + comparativo</span>
      </div>
    </section>

    ${buildHeroCaveats({
      title: 'Hallazgos factuales del dataset',
      items: [
        {
          text:
            '<strong>Rango observado del valor gestión ≈ [0.51, 24.85] en el universo histórico</strong> — el snapshot del 30-jun-2025 muestra valores entre 1.87 y 24.73. El extremo superior (~24.85) es mayor al del valor bolsa (~19.04) en el mismo universo, pero la diferencia no es uniforme ni sistémica entre todos los pares.',
        },
        {
          text:
            '<strong>Diferencial bolsa vs gestión concentrado en pares específicos</strong> — ejemplo factual observado: <code>inbursa × Siefore Básica 95-99</code> el 1-jun-2025 muestra precio bolsa = 10.042 y precio gestión = 14.326 (cociente ≈ 1.427). En contraste, <code>profuturo × Siefore Básica 60-64</code> el 8-ene-1997 muestra ambas series idénticas (1.080191). El diferencial NO es universal entre todo par afore × siefore × fecha.',
          emphasis: true,
        },
        {
          text:
            '<strong>El valor bolsa y el valor gestión son dos series independientes publicadas por CONSAR.</strong> Coinciden en algunos pares afore × siefore × fecha y divergen en otros. La causa específica de la divergencia no es determinable desde este dataset; cualquier hipótesis sobre por qué hay diferencial requiere fuentes adicionales y queda fuera del alcance del observatorio.',
        },
      ],
    })}
  `;
}

function buildBody(): string {
  // Sección A: Snapshot diario
  const snapDate = buildDateInput({
    id: 'pg-snap-fecha',
    label: 'Fecha (día)',
    defaultValue: '2025-06-30',
    min: '1997-01-08',
    max: '2025-12-31',
  });
  const snapTable = buildTable({
    id: 'pg-snap-table',
    columns: [
      { key: 'afore',     label: 'AFORE',          align: 'left'  },
      { key: 'siefore',   label: 'SIEFORE',        align: 'left'  },
      { key: 'categoria', label: 'Categoría',      align: 'left'  },
      { key: 'precio',    label: 'Precio gestión', align: 'right' },
    ],
    loadingText: 'Cargando snapshot del día…',
  });

  // Sección B: Serie histórica — defaults centrados en par donde el diferencial sí emerge
  const serieAfore = buildAforeSelect({
    id: 'pg-serie-afore',
    label: 'AFORE',
    defaultValue: 'inbursa',
    exclude: ['pension_bienestar'],
  });
  const serieSiefore = buildSieforeSelect({
    id: 'pg-serie-siefore',
    label: 'SIEFORE',
    defaultValue: 'sb 95-99',
    categorias: ['basica_edad'],
  });
  const serieDesde = buildDateInput({
    id: 'pg-serie-desde',
    label: 'Desde',
    defaultValue: '2024-06-30',
    min: '1997-01-08',
    max: '2025-12-31',
  });
  const serieHasta = buildDateInput({
    id: 'pg-serie-hasta',
    label: 'Hasta',
    defaultValue: '2025-06-30',
    min: '1997-01-08',
    max: '2025-12-31',
  });
  const serieTable = buildTable({
    id: 'pg-serie-table',
    columns: [
      { key: 'fecha',  label: 'Fecha',          align: 'left'  },
      { key: 'precio', label: 'Precio gestión', align: 'right' },
    ],
    loadingText: 'Cargando serie histórica…',
  });

  // Sección C: Comparativo
  const cmpSiefore = buildSieforeSelect({
    id: 'pg-cmp-siefore',
    label: 'SIEFORE',
    defaultValue: 'sb 95-99',
    categorias: ['basica_edad'],
  });
  const cmpDesde = buildDateInput({
    id: 'pg-cmp-desde',
    label: 'Desde',
    defaultValue: '2025-06-01',
    min: '1997-01-08',
    max: '2025-12-31',
  });
  const cmpHasta = buildDateInput({
    id: 'pg-cmp-hasta',
    label: 'Hasta',
    defaultValue: '2025-06-30',
    min: '1997-01-08',
    max: '2025-12-31',
  });

  return `
    <!-- =============== Sección A: Snapshot diario =============== -->
    <h2 class="section-title" style="margin-top:1.5rem">Snapshot diario — todos los pares AFORE × SIEFORE en una fecha</h2>

    ${buildSelectorsBar({
      controls: [snapDate],
      applyButtonId: 'pg-snap-apply',
      applyButtonLabel: 'Ver snapshot',
    })}

    <section class="kpis" aria-label="Indicadores agregados del snapshot">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Pares reportados</div>
        <div class="kpi-value" id="pg-snap-kpi-n">—</div>
        <div class="kpi-sub" id="pg-snap-kpi-fecha">filtro aplicado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">AFOREs distintas</div>
        <div class="kpi-value" id="pg-snap-kpi-afores">—</div>
        <div class="kpi-sub">presentes en la fecha</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Precio máx. del día</div>
        <div class="kpi-value" id="pg-snap-kpi-max">—</div>
        <div class="kpi-sub" id="pg-snap-kpi-max-sub">par responsable</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Precio mín. del día</div>
        <div class="kpi-value" id="pg-snap-kpi-min">—</div>
        <div class="kpi-sub" id="pg-snap-kpi-min-sub">par responsable</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Pares AFORE × SIEFORE — fecha seleccionada</h3>
      <span class="consar-toolbar-meta" id="pg-snap-meta">—</span>
    </div>
    ${snapTable}
    <div id="pg-snap-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección B: Serie histórica =============== -->
    <h2 class="section-title" style="margin-top:2rem">Serie histórica — par AFORE × SIEFORE en una ventana</h2>

    ${buildSelectorsBar({
      controls: [serieAfore, serieSiefore, serieDesde, serieHasta],
      applyButtonId: 'pg-serie-apply',
      applyButtonLabel: 'Ver serie',
    })}

    <section class="kpis" aria-label="Indicadores de la serie">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Precio último</div>
        <div class="kpi-value" id="pg-serie-kpi-actual">—</div>
        <div class="kpi-sub" id="pg-serie-kpi-actual-sub">último día reportado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Precio inicial</div>
        <div class="kpi-value" id="pg-serie-kpi-inicial">—</div>
        <div class="kpi-sub" id="pg-serie-kpi-inicial-sub">primer día de la ventana</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Variación nominal</div>
        <div class="kpi-value" id="pg-serie-kpi-delta">—</div>
        <div class="kpi-sub" id="pg-serie-kpi-delta-sub">final − inicial</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Días reportados</div>
        <div class="kpi-value" id="pg-serie-kpi-n">—</div>
        <div class="kpi-sub">en la ventana seleccionada</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Serie cronológica desc — par × ventana</h3>
      <span class="consar-toolbar-meta" id="pg-serie-meta">—</span>
    </div>
    ${serieTable}
    <div id="pg-serie-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección C: Comparativo cross-AFORE =============== -->
    <h2 class="section-title" style="margin-top:2rem">Comparativo cross-AFORE — múltiples AFOREs en una SIEFORE × ventana</h2>

    ${buildSelectorsBar({
      controls: [cmpSiefore, cmpDesde, cmpHasta],
      applyButtonId: 'pg-cmp-apply',
      applyButtonLabel: 'Ver comparativo',
    })}

    <section class="kpis" aria-label="Indicadores del comparativo">
      <div class="kpi kpi--blue">
        <div class="kpi-label">AFOREs comparadas</div>
        <div class="kpi-value" id="pg-cmp-kpi-n">—</div>
        <div class="kpi-sub" id="pg-cmp-kpi-n-sub">en la siefore</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Días en la ventana</div>
        <div class="kpi-value" id="pg-cmp-kpi-dias">—</div>
        <div class="kpi-sub" id="pg-cmp-kpi-dias-sub">rango aplicado</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Precio máx. en ventana</div>
        <div class="kpi-value" id="pg-cmp-kpi-max">—</div>
        <div class="kpi-sub" id="pg-cmp-kpi-max-sub">AFORE responsable</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Precio mín. en ventana</div>
        <div class="kpi-value" id="pg-cmp-kpi-min">—</div>
        <div class="kpi-sub" id="pg-cmp-kpi-min-sub">AFORE responsable</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Evolución diaria — N líneas por AFORE</h3>
      <span class="consar-toolbar-meta" id="pg-cmp-meta">—</span>
    </div>
    <div class="consar-chart-card">
      <div class="consar-chart-wrap">
        <canvas id="pg-cmp-chart" aria-label="Chart comparativo precio gestión cross-AFORE" role="img"></canvas>
        <div id="pg-cmp-chart-empty" class="consar-chart-empty" style="display:none">Sin datos suficientes en la ventana seleccionada.</div>
      </div>
    </div>

    <div class="consar-toolbar">
      <h3>Datos crudos — fecha × AFORE</h3>
      <span class="consar-toolbar-meta">precios en MXN/título · null cuando la AFORE no reporta ese día</span>
    </div>
    <div class="consar-table-cross-wrap">
      <table id="pg-cmp-table" class="consar-table consar-table-cross">
        <thead><tr><th>Fecha</th><th>Cargando…</th></tr></thead>
        <tbody>
          <tr><td colspan="2" class="consar-table-loading">Cargando comparativo…</td></tr>
        </tbody>
      </table>
    </div>
    <div id="pg-cmp-error" class="consar-error-banner" role="alert"></div>

    ${buildSourceFooter({
      unidad: 'Precio gestión (MXN/título), 6 decimales en API; tabla muestra 4 decimales.',
      fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
      fuenteUrl: 'https://datos.gob.mx',
      metodologia: 'Snapshot: una fila por par AFORE × SIEFORE en la fecha seleccionada (días no hábiles devuelven respuesta vacía). Serie: par específico × ventana (default últimos 12 meses). Comparativo: una SIEFORE × N AFOREs reportando × ventana 30 días. El precio gestión es una serie independiente del precio bolsa publicada por CONSAR; ambas se reportan en el mismo conjunto de datos pero como magnitudes distintas.',
      endpoint: '/api/v1/consar/precios-gestion/{snapshot,serie,comparativo}',
    })}
  `;
}

function buildScript(): string {
  const aforeColorsJson = JSON.stringify(AFORE_COLORS);

  return `
  <script>
  (function() {
    'use strict';
    ${buildConsarApiHelpers()}

    var AFORE_COLORS = ${aforeColorsJson};
    function aforeColor(code) {
      return AFORE_COLORS[code] || '#71717a';
    }
    function aforeColorRgba(code, alpha) {
      var hex = AFORE_COLORS[code] || '#71717a';
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function fmtPrecio(v, decimals) {
      if (v == null) return '—';
      decimals = decimals == null ? 4 : decimals;
      return '$' + Number(v).toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    var chartJsState = { ready: false, pending: [] };
    function loadChartJS(cb) {
      if (typeof Chart !== 'undefined') { chartJsState.ready = true; cb(); return; }
      if (chartJsState.pending.length > 0) { chartJsState.pending.push(cb); return; }
      chartJsState.pending.push(cb);
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
      s.onload = function() {
        chartJsState.ready = true;
        chartJsState.pending.forEach(function(fn) { try { fn(); } catch(e) {} });
        chartJsState.pending = [];
      };
      s.onerror = function() {
        var s2 = document.createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.7/chart.umd.min.js';
        s2.onload = function() {
          chartJsState.ready = true;
          chartJsState.pending.forEach(function(fn) { try { fn(); } catch(e) {} });
          chartJsState.pending = [];
        };
        document.head.appendChild(s2);
      };
      document.head.appendChild(s);
    }

    var cmpChartInstance = null;

    // ========== Sección A: Snapshot ==========
    var snapDate  = document.getElementById('pg-snap-fecha');
    var snapApply = document.getElementById('pg-snap-apply');

    function loadSnap() {
      var fecha = snapDate.value;
      if (!fecha) return;
      clearError('pg-snap-error');
      snapApply.disabled = true;
      fetchJson('/precios-gestion/snapshot?fecha=' + encodeURIComponent(fecha))
        .then(function(d) {
          var filas = (d.filas || []).slice();
          filas.sort(function(a, b) {
            if (a.precio == null && b.precio == null) return 0;
            if (a.precio == null) return 1;
            if (b.precio == null) return -1;
            return b.precio - a.precio;
          });
          var withVal = filas.filter(function(r) { return r.precio != null; });
          var maxR = withVal[0];
          var minR = withVal[withVal.length - 1];
          var aforesSet = {};
          filas.forEach(function(r) { aforesSet[r.afore_codigo] = 1; });
          var nAfores = Object.keys(aforesSet).length;

          setKpi('pg-snap-kpi-n', String(d.n_filas != null ? d.n_filas : filas.length));
          setKpi('pg-snap-kpi-fecha', fecha);
          setKpi('pg-snap-kpi-afores', String(nAfores));
          setKpi('pg-snap-kpi-max', maxR ? fmtPrecio(maxR.precio) : '—');
          setKpi('pg-snap-kpi-max-sub', maxR ? maxR.afore_nombre_corto + ' · ' + maxR.siefore_slug : '—');
          setKpi('pg-snap-kpi-min', minR ? fmtPrecio(minR.precio) : '—');
          setKpi('pg-snap-kpi-min-sub', minR ? minR.afore_nombre_corto + ' · ' + minR.siefore_slug : '—');

          var tbody = document.querySelector('#pg-snap-table tbody');
          if (filas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="consar-table-loading">Sin datos para esa fecha. Días no hábiles del calendario CONSAR no se reportan.</td></tr>';
          } else {
            tbody.innerHTML = filas.map(function(r) {
              return '<tr>' +
                '<td><strong>' + escapeHtml(r.afore_nombre_corto) + '</strong></td>' +
                '<td>' + escapeHtml(r.siefore_nombre) + '</td>' +
                '<td>' + escapeHtml(r.siefore_categoria) + '</td>' +
                '<td class="num">' + fmtPrecio(r.precio) + '</td>' +
              '</tr>';
            }).join('');
          }
          setText('#pg-snap-meta', fecha + ' · ' + filas.length + ' pares');
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('pg-snap-error', 'No se pudo cargar el snapshot: ' + (err && err.message ? err.message : err));
          var tbody = document.querySelector('#pg-snap-table tbody');
          if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="consar-table-loading">Sin datos para esa fecha. Probable día no hábil del calendario CONSAR.</td></tr>';
        })
        .finally(function() { snapApply.disabled = false; });
    }
    snapApply.addEventListener('click', loadSnap);

    // ========== Sección B: Serie histórica ==========
    var serieAfore   = document.getElementById('pg-serie-afore');
    var serieSiefore = document.getElementById('pg-serie-siefore');
    var serieDesde   = document.getElementById('pg-serie-desde');
    var serieHasta   = document.getElementById('pg-serie-hasta');
    var serieApply   = document.getElementById('pg-serie-apply');

    function loadSerie() {
      var afore   = serieAfore.value;
      var siefore = serieSiefore.value;
      var desde   = serieDesde.value;
      var hasta   = serieHasta.value;
      if (!afore || !siefore) return;
      clearError('pg-serie-error');
      serieApply.disabled = true;
      var qs = '?afore_codigo=' + encodeURIComponent(afore) +
               '&siefore_slug=' + encodeURIComponent(siefore);
      if (desde) qs += '&desde=' + encodeURIComponent(desde);
      if (hasta) qs += '&hasta=' + encodeURIComponent(hasta);
      fetchJson('/precios-gestion/serie' + qs)
        .then(function(d) {
          var s = d.serie || [];
          var first = s[0];
          var last  = s[s.length - 1];
          setKpi('pg-serie-kpi-actual', last ? fmtPrecio(last.precio) : '—');
          setKpi('pg-serie-kpi-actual-sub', last ? last.fecha : 'sin datos');
          setKpi('pg-serie-kpi-inicial', first ? fmtPrecio(first.precio) : '—');
          setKpi('pg-serie-kpi-inicial-sub', first ? first.fecha : 'sin datos');
          if (first && last && first.precio != null && last.precio != null) {
            var delta = last.precio - first.precio;
            var pct = first.precio !== 0 ? (delta / first.precio) * 100 : 0;
            var sign = delta >= 0 ? '+' : '−';
            setKpi('pg-serie-kpi-delta', sign + fmtPrecio(Math.abs(delta)));
            setKpi('pg-serie-kpi-delta-sub', (delta >= 0 ? '+' : '') + pct.toFixed(2) + '% en la ventana');
          } else {
            setKpi('pg-serie-kpi-delta', '—');
            setKpi('pg-serie-kpi-delta-sub', '—');
          }
          setKpi('pg-serie-kpi-n', fmtN(d.n_puntos));

          var tbody = document.querySelector('#pg-serie-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin serie reportada en la ventana.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                '<td class="num">' + fmtPrecio(r.precio) + '</td>' +
              '</tr>';
            }).join('');
          }
          var rangoText = d.rango ? d.rango.desde + ' → ' + d.rango.hasta : (desde + ' → ' + hasta);
          setText('#pg-serie-meta', d.afore.nombre_corto + ' · ' + d.siefore.nombre + ' · ' + d.n_puntos + ' días · ' + rangoText);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('pg-serie-error', 'No se pudo cargar la serie: ' + (err && err.message ? err.message : err));
        })
        .finally(function() { serieApply.disabled = false; });
    }
    serieApply.addEventListener('click', loadSerie);

    // ========== Sección C: Comparativo ==========
    var cmpSiefore = document.getElementById('pg-cmp-siefore');
    var cmpDesde   = document.getElementById('pg-cmp-desde');
    var cmpHasta   = document.getElementById('pg-cmp-hasta');
    var cmpApply   = document.getElementById('pg-cmp-apply');

    function loadCmp() {
      var siefore = cmpSiefore.value;
      var desde   = cmpDesde.value;
      var hasta   = cmpHasta.value;
      if (!siefore || !desde || !hasta) return;
      clearError('pg-cmp-error');
      cmpApply.disabled = true;
      var qs = '?siefore_slug=' + encodeURIComponent(siefore) +
               '&desde=' + encodeURIComponent(desde) +
               '&hasta=' + encodeURIComponent(hasta);
      fetchJson('/precios-gestion/comparativo' + qs)
        .then(function(d) {
          renderCmp(d, siefore, desde, hasta);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('pg-cmp-error', 'No se pudo cargar el comparativo: ' + (err && err.message ? err.message : err));
        })
        .finally(function() { cmpApply.disabled = false; });
    }
    cmpApply.addEventListener('click', loadCmp);

    function renderCmp(d, siefore, desde, hasta) {
      var series = d.series || [];

      setKpi('pg-cmp-kpi-n', String(d.n_afores != null ? d.n_afores : series.length));
      setKpi('pg-cmp-kpi-n-sub', siefore);
      var fechaSet = {};
      var allMaxR = null, allMinR = null;
      series.forEach(function(s) {
        (s.serie || []).forEach(function(p) {
          fechaSet[p.fecha] = 1;
          if (p.precio != null) {
            if (!allMaxR || p.precio > allMaxR.precio) allMaxR = { precio: p.precio, afore: s.afore_nombre_corto, fecha: p.fecha };
            if (!allMinR || p.precio < allMinR.precio) allMinR = { precio: p.precio, afore: s.afore_nombre_corto, fecha: p.fecha };
          }
        });
      });
      var fechasOrdenadas = Object.keys(fechaSet).sort();
      setKpi('pg-cmp-kpi-dias', String(fechasOrdenadas.length));
      setKpi('pg-cmp-kpi-dias-sub', desde + ' → ' + hasta);
      setKpi('pg-cmp-kpi-max', allMaxR ? fmtPrecio(allMaxR.precio) : '—');
      setKpi('pg-cmp-kpi-max-sub', allMaxR ? allMaxR.afore + ' · ' + allMaxR.fecha : '—');
      setKpi('pg-cmp-kpi-min', allMinR ? fmtPrecio(allMinR.precio) : '—');
      setKpi('pg-cmp-kpi-min-sub', allMinR ? allMinR.afore + ' · ' + allMinR.fecha : '—');
      setText('#pg-cmp-meta', siefore + ' · ' + series.length + ' AFOREs · ' + fechasOrdenadas.length + ' días');

      renderCmpTable(series, fechasOrdenadas);
      renderCmpChart(series, fechasOrdenadas);
    }

    function renderCmpTable(series, fechasOrdenadas) {
      var thead = document.querySelector('#pg-cmp-table thead tr');
      var tbody = document.querySelector('#pg-cmp-table tbody');
      if (!thead || !tbody) return;
      if (series.length === 0 || fechasOrdenadas.length === 0) {
        thead.innerHTML = '<th>Fecha</th><th>—</th>';
        tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin datos en la ventana.</td></tr>';
        return;
      }
      var byAforeFecha = {};
      series.forEach(function(s) {
        var m = byAforeFecha[s.afore_codigo] = {};
        (s.serie || []).forEach(function(p) { m[p.fecha] = p.precio; });
      });
      var headHtml = '<th>Fecha</th>' + series.map(function(s) {
        var color = aforeColor(s.afore_codigo);
        return '<th class="num" style="border-bottom:2px solid ' + color + '">' + escapeHtml(s.afore_nombre_corto) + '</th>';
      }).join('');
      thead.innerHTML = headHtml;
      var sortedDesc = fechasOrdenadas.slice().reverse();
      var rowsHtml = sortedDesc.map(function(f) {
        var cells = series.map(function(s) {
          var v = byAforeFecha[s.afore_codigo][f];
          if (v == null) return '<td class="num consar-precio-null">—</td>';
          return '<td class="num">' + fmtPrecio(v) + '</td>';
        }).join('');
        return '<tr><td>' + escapeHtml(f) + '</td>' + cells + '</tr>';
      }).join('');
      tbody.innerHTML = rowsHtml;
    }

    function renderCmpChart(series, fechasOrdenadas) {
      var canvas = document.getElementById('pg-cmp-chart');
      var emptyEl = document.getElementById('pg-cmp-chart-empty');
      if (!canvas) return;
      if (series.length === 0 || fechasOrdenadas.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        canvas.style.display = 'none';
        if (cmpChartInstance) { cmpChartInstance.destroy(); cmpChartInstance = null; }
        return;
      }
      if (emptyEl) emptyEl.style.display = 'none';
      canvas.style.display = 'block';

      var byAforeFecha = {};
      series.forEach(function(s) {
        var m = byAforeFecha[s.afore_codigo] = {};
        (s.serie || []).forEach(function(p) { m[p.fecha] = p.precio; });
      });

      var datasets = series.map(function(s) {
        var color = aforeColor(s.afore_codigo);
        var data = fechasOrdenadas.map(function(f) {
          var v = byAforeFecha[s.afore_codigo][f];
          return v == null ? null : v;
        });
        return {
          label: s.afore_nombre_corto,
          data: data,
          borderColor: color,
          backgroundColor: aforeColorRgba(s.afore_codigo, 0.08),
          borderWidth: 2.5,
          tension: 0.15,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: '#0a0a0a',
          pointHoverBorderWidth: 2,
          spanGaps: true,
          fill: false,
        };
      });

      loadChartJS(function() {
        if (typeof Chart === 'undefined') return;
        Chart.defaults.color = '#a1a1aa';
        Chart.defaults.borderColor = '#262626';
        Chart.defaults.font.family = "system-ui, -apple-system, sans-serif";

        if (cmpChartInstance) { cmpChartInstance.destroy(); cmpChartInstance = null; }

        cmpChartInstance = new Chart(canvas, {
          type: 'line',
          data: { labels: fechasOrdenadas, datasets: datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            animation: { duration: 800, easing: 'easeOutQuart' },
            plugins: {
              legend: {
                position: 'top',
                align: 'start',
                labels: {
                  boxWidth: 14,
                  boxHeight: 2,
                  padding: 14,
                  font: { size: 11, weight: '600' },
                  usePointStyle: false,
                },
              },
              tooltip: {
                backgroundColor: 'rgba(20,20,20,0.95)',
                titleColor: '#fafafa',
                bodyColor: '#a1a1aa',
                borderColor: '#262626',
                borderWidth: 1,
                padding: 10,
                titleFont: { size: 12, weight: '600' },
                bodyFont: { size: 11 },
                callbacks: {
                  label: function(ctx) {
                    if (ctx.raw == null) return ctx.dataset.label + ': sin reporte';
                    return ctx.dataset.label + ': ' + fmtPrecio(ctx.raw);
                  },
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  maxRotation: 0,
                  autoSkip: true,
                  maxTicksLimit: 8,
                  font: { size: 10 },
                },
                grid: { display: false, color: '#262626' },
              },
              y: {
                ticks: {
                  font: { size: 10 },
                  callback: function(v) {
                    return '$' + Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  },
                },
                grid: { color: '#262626', drawTicks: false },
                border: { display: false },
              },
            },
          },
        });
      });
    }

    function boot() {
      loadSnap();
      loadSerie();
      loadCmp();
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
