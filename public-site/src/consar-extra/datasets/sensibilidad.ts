// Sub-sección /consar/sensibilidad — dataset CONSAR #03
//
// Endpoints:
//   GET /api/v1/consar/metricas-sensibilidad         (catálogo dinámico)
//   GET /api/v1/consar/medidas/snapshot?fecha=YYYY-MM&metrica=Z
//   GET /api/v1/consar/medidas/serie?afore_codigo=X&siefore_slug=Y&metrica=Z
//
// Cobertura: 2019-12 → 2025-06 (67 meses) × 7 métricas regulatorias.
// Pattern triple-fetch: catálogo + snapshot + serie. Catálogo se carga
// al mount para popular <select> antes del primer fetch.

import { buildTable } from '../shared/table';
import { buildHeroCaveats, buildSourceFooter } from '../shared/caveats';
import { buildConsarApiHelpers } from '../shared/api';
import {
  buildAforeSelect,
  buildSieforeSelect,
  buildMonthInput,
  buildSelectorsBar,
} from '../shared/selectors';

export function buildSensibilidad() {
  return {
    title: 'CONSAR · Sensibilidad — métricas regulatorias del portafolio',
    metaDescription:
      'Métricas de sensibilidad regulatoria CONSAR (CL, DCVaR, tracking error, escenarios VaR, PPP, PID, VaR) por AFORE × SIEFORE × fecha. Cobertura 2019-12 → 2025-06.',
    hero: buildHero(),
    body: buildBody(),
    script: buildScript(),
  };
}

function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-text">
        <h1 style="font-size:1.4rem;margin-bottom:0.4rem">Sensibilidad — métricas regulatorias del portafolio</h1>
        <p>
          Indicadores regulatorios CONSAR sobre la sensibilidad del portafolio: coeficiente de liquidez, valor en
          riesgo (VaR / DCVaR), error de seguimiento, escenarios stress-test, plazo promedio ponderado y provisión
          por exposición a derivados. La serie cubre <strong>67 meses</strong>, de diciembre 2019 a junio 2025, con
          7 métricas reportadas por AFORE × SIEFORE.
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Cobertura 2019-12 → 2025-06 · 67 meses</span>
        <span class="hero-badge">7 métricas regulatorias</span>
        <span class="hero-badge">3 endpoints · catálogo + snapshot + serie</span>
      </div>
    </section>

    ${buildHeroCaveats({
      title: 'Hallazgos factuales del dataset',
      items: [
        {
          text:
            '<strong>PID etiquetado como porcentaje, no monto absoluto</strong> — corrección empírica vs etiquetado documental ds3 que asume "monto". Validación: Coppel, Inbursa y PensionISSSTE reportan PID = 0% en todas las observaciones (no operan derivados); el rango observado [0%, 1.75%] es coherente con el cap regulatorio CONSAR de exposición a derivados. Caso didáctico de validación empírica vs etiquetado a priori.',
        },
        {
          text:
            '<strong>3 métricas no aplican a sub-variants concat</strong> — los productos adicionales (SAC, SIAV, SPS) NO reportan tracking error, escenarios VaR ni PID. La decisión arquitectural CONSAR es que estas tres métricas son específicas de SIEFOREs Básicas; en la tabla se muestran como guion.',
        },
        {
          text:
            '<strong>Métrica <code>escenarios_var</code> con 76% de sparsity</strong> incluso entre las observaciones canónicas — métrica esporádica reportada sólo cuando hay stress-test reciente. La ausencia no representa un problema de cobertura del dataset.',
          emphasis: true,
        },
      ],
    })}
  `;
}

function buildBody(): string {
  // Métrica selector se popula dinámicamente; default coef_liquidez como fallback inicial
  const metricaSnapHtml = `
    <label class="consar-selector">
      <span class="consar-selector-label">Métrica</span>
      <select id="sn-snap-metrica" class="consar-selector-input">
        <option value="coef_liquidez">Coeficiente de liquidez (cargando catálogo…)</option>
      </select>
    </label>
  `;
  const metricaSerieHtml = `
    <label class="consar-selector">
      <span class="consar-selector-label">Métrica</span>
      <select id="sn-serie-metrica" class="consar-selector-input">
        <option value="coef_liquidez">Coeficiente de liquidez (cargando catálogo…)</option>
      </select>
    </label>
  `;

  // Sección A: Snapshot
  const snapMonth = buildMonthInput({
    id: 'sn-snap-fecha',
    label: 'Fecha (mes)',
    defaultValue: '2025-06',
    min: '2019-12',
    max: '2025-06',
  });
  const snapTable = buildTable({
    id: 'sn-snap-table',
    columns: [
      { key: 'afore',   label: 'AFORE',   align: 'left'  },
      { key: 'siefore', label: 'SIEFORE', align: 'left'  },
      { key: 'valor',   label: 'Valor',   align: 'right' },
    ],
    loadingText: 'Cargando snapshot…',
  });

  // Sección B: Serie
  const serieAfore = buildAforeSelect({
    id: 'sn-serie-afore',
    label: 'AFORE',
    defaultValue: 'profuturo',
  });
  const serieSiefore = buildSieforeSelect({
    id: 'sn-serie-siefore',
    label: 'SIEFORE',
    defaultValue: 'sb 60-64',
  });
  const serieTable = buildTable({
    id: 'sn-serie-table',
    columns: [
      { key: 'fecha', label: 'Fecha', align: 'left'  },
      { key: 'valor', label: 'Valor', align: 'right' },
    ],
    loadingText: 'Cargando serie…',
  });

  return `
    <!-- Métrica info card (descripción + unidad) -->
    <section class="consar-source-footer" id="sn-metrica-info" aria-live="polite">
      <div class="consar-source-row"><strong>Métrica seleccionada:</strong> <span id="sn-metrica-info-slug">coef_liquidez</span></div>
      <div class="consar-source-row" id="sn-metrica-info-desc">Cargando descripción…</div>
    </section>

    <!-- =============== Sección A: Snapshot mensual =============== -->
    <h2 class="section-title" style="margin-top:1.5rem">Snapshot mensual — todas las AFOREs × SIEFOREs en una fecha × métrica</h2>

    ${buildSelectorsBar({
      controls: [snapMonth, metricaSnapHtml],
      applyButtonId: 'sn-snap-apply',
      applyButtonLabel: 'Ver snapshot',
    })}

    <section class="kpis" aria-label="Indicadores agregados del snapshot">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Pares reportados</div>
        <div class="kpi-value" id="sn-snap-kpi-n">—</div>
        <div class="kpi-sub" id="sn-snap-kpi-fecha">fecha × métrica</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Mínimo</div>
        <div class="kpi-value" id="sn-snap-kpi-min">—</div>
        <div class="kpi-sub" id="sn-snap-kpi-min-sub">par con menor valor</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Máximo</div>
        <div class="kpi-value" id="sn-snap-kpi-max">—</div>
        <div class="kpi-sub" id="sn-snap-kpi-max-sub">par con mayor valor</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Unidad</div>
        <div class="kpi-value" id="sn-snap-kpi-unit">—</div>
        <div class="kpi-sub">según catálogo</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Tabla por par AFORE × SIEFORE</h3>
      <span class="consar-toolbar-meta" id="sn-snap-meta">—</span>
    </div>
    ${snapTable}
    <div id="sn-snap-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección B: Serie atómica =============== -->
    <h2 class="section-title" style="margin-top:2rem">Serie atómica — AFORE × SIEFORE × métrica en el tiempo</h2>

    ${buildSelectorsBar({
      controls: [serieAfore, serieSiefore, metricaSerieHtml],
      applyButtonId: 'sn-serie-apply',
      applyButtonLabel: 'Ver serie',
    })}

    <section class="kpis" aria-label="Indicadores de la serie">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Valor último mes</div>
        <div class="kpi-value" id="sn-serie-kpi-actual">—</div>
        <div class="kpi-sub" id="sn-serie-kpi-actual-sub">último reportado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Mínimo de la serie</div>
        <div class="kpi-value" id="sn-serie-kpi-min">—</div>
        <div class="kpi-sub" id="sn-serie-kpi-min-sub">mes del mínimo</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Máximo de la serie</div>
        <div class="kpi-value" id="sn-serie-kpi-max">—</div>
        <div class="kpi-sub" id="sn-serie-kpi-max-sub">mes del máximo</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Cobertura</div>
        <div class="kpi-value" id="sn-serie-kpi-n">—</div>
        <div class="kpi-sub">meses reportados</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Serie atómica — combinación seleccionada</h3>
      <span class="consar-toolbar-meta" id="sn-serie-meta">—</span>
    </div>
    ${serieTable}
    <div id="sn-serie-error" class="consar-error-banner" role="alert"></div>

    ${buildSourceFooter({
      unidad: 'Variable según métrica seleccionada (ratio / pct / count / dias). Ver descripción del catálogo arriba.',
      fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
      fuenteUrl: 'https://datos.gob.mx',
      metodologia: 'Snapshot: una fila por par AFORE × SIEFORE en una fecha × métrica. Serie: combinación AFORE × SIEFORE × métrica específica. El catálogo /metricas-sensibilidad se consulta al cargar la página y popula los selectores; PID y tracking error son corregidos vs etiquetado documental — ver caveats.',
      endpoint: '/api/v1/consar/{metricas-sensibilidad,medidas/snapshot,medidas/serie}',
    })}
  `;
}

function buildScript(): string {
  return `
  <script>
  (function() {
    'use strict';
    ${buildConsarApiHelpers()}

    var metricasCatalogo = [];   // poblado por loadCatalogo
    var unidadActual = '';       // unidad de la métrica seleccionada en snapshot

    function fmtVal(v, unidad) {
      if (v == null) return '—';
      if (unidad === 'pct') return fmtPct(v, 2);
      if (unidad === 'dias') return fmtN(v, 0) + ' d';
      if (unidad === 'count') return fmtN(v, 0);
      // ratio o desconocido
      return Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function findMetrica(slug) {
      for (var i = 0; i < metricasCatalogo.length; i++) {
        if (metricasCatalogo[i].slug === slug) return metricasCatalogo[i];
      }
      return null;
    }

    function populateMetricSelects() {
      var snapSel = document.getElementById('sn-snap-metrica');
      var serieSel = document.getElementById('sn-serie-metrica');
      if (!snapSel || !serieSel) return;
      var html = metricasCatalogo.map(function(m) {
        var sel = m.slug === 'coef_liquidez' ? ' selected' : '';
        return '<option value="' + escapeHtml(m.slug) + '"' + sel + '>' + escapeHtml(m.slug) + ' (' + escapeHtml(m.unidad) + ')</option>';
      }).join('');
      snapSel.innerHTML = html;
      serieSel.innerHTML = html;
    }

    function updateMetricaInfo(slug) {
      var m = findMetrica(slug);
      var slugEl = document.getElementById('sn-metrica-info-slug');
      var descEl = document.getElementById('sn-metrica-info-desc');
      if (slugEl) slugEl.textContent = slug + (m ? ' · ' + m.unidad : '');
      if (descEl) descEl.textContent = m ? m.descripcion : 'Métrica no encontrada en el catálogo.';
    }

    function loadCatalogo() {
      return fetchJson('/metricas-sensibilidad')
        .then(function(d) {
          metricasCatalogo = d.metricas || [];
          populateMetricSelects();
          updateMetricaInfo('coef_liquidez');
        })
        .catch(function(err) {
          // Fallback silencioso: el <select> conserva su option estático
          showError('sn-snap-error', 'No se pudo cargar catálogo de métricas: ' + (err && err.message ? err.message : err));
        });
    }

    // ----- Snapshot -----
    var snapMonth   = document.getElementById('sn-snap-fecha');
    var snapMetrica = document.getElementById('sn-snap-metrica');
    var snapApply   = document.getElementById('sn-snap-apply');

    function loadSnap() {
      var fecha   = snapMonth.value;
      var metrica = snapMetrica.value;
      if (!fecha || !metrica) return;
      clearError('sn-snap-error');
      snapApply.disabled = true;
      updateMetricaInfo(metrica);
      fetchJson('/medidas/snapshot?fecha=' + encodeURIComponent(fecha) + '&metrica=' + encodeURIComponent(metrica))
        .then(function(d) {
          var unit = d.metrica && d.metrica.unidad ? d.metrica.unidad : '';
          unidadActual = unit;
          var filas = (d.filas || []).slice().sort(function(a, b) {
            return (b.valor == null ? -Infinity : b.valor) - (a.valor == null ? -Infinity : a.valor);
          });
          var withVal = filas.filter(function(r) { return r.valor != null; });
          var maxR = withVal[0];
          var minR = withVal[withVal.length - 1];

          setKpi('sn-snap-kpi-n', String(d.n_filas));
          setKpi('sn-snap-kpi-fecha', fecha + ' · ' + metrica);
          setKpi('sn-snap-kpi-min', d.valor_min != null ? fmtVal(d.valor_min, unit) : '—');
          setKpi('sn-snap-kpi-min-sub', minR ? minR.afore_nombre_corto + ' · ' + minR.siefore_slug : '—');
          setKpi('sn-snap-kpi-max', d.valor_max != null ? fmtVal(d.valor_max, unit) : '—');
          setKpi('sn-snap-kpi-max-sub', maxR ? maxR.afore_nombre_corto + ' · ' + maxR.siefore_slug : '—');
          setKpi('sn-snap-kpi-unit', unit || '—');

          var tbody = document.querySelector('#sn-snap-table tbody');
          if (filas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="consar-table-loading">Sin datos para la fecha × métrica.</td></tr>';
          } else {
            var slice = filas.slice(0, 50);
            tbody.innerHTML = slice.map(function(a) {
              return '<tr>' +
                '<td><strong>' + escapeHtml(a.afore_nombre_corto) + '</strong></td>' +
                '<td>' + escapeHtml(a.siefore_slug) + '</td>' +
                '<td class="num">' + fmtVal(a.valor, unit) + '</td>' +
              '</tr>';
            }).join('');
            if (filas.length > 50) {
              tbody.innerHTML += '<tr><td colspan="3" class="consar-table-loading">… ' + (filas.length - 50) + ' filas adicionales no mostradas.</td></tr>';
            }
          }
          setText('#sn-snap-meta', fecha + ' · ' + metrica + ' · ' + d.n_filas + ' pares · unidad ' + unit);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('sn-snap-error', 'No se pudo cargar el snapshot: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          snapApply.disabled = false;
        });
    }
    snapApply.addEventListener('click', loadSnap);

    // ----- Serie -----
    var serieAfore   = document.getElementById('sn-serie-afore');
    var serieSiefore = document.getElementById('sn-serie-siefore');
    var serieMetrica = document.getElementById('sn-serie-metrica');
    var serieApply   = document.getElementById('sn-serie-apply');

    function loadSerie() {
      var afore   = serieAfore.value;
      var sie     = serieSiefore.value;
      var metrica = serieMetrica.value;
      if (!afore || !sie || !metrica) return;
      clearError('sn-serie-error');
      serieApply.disabled = true;
      fetchJson('/medidas/serie?afore_codigo=' + encodeURIComponent(afore) + '&siefore_slug=' + encodeURIComponent(sie) + '&metrica=' + encodeURIComponent(metrica))
        .then(function(d) {
          var unit = d.metrica && d.metrica.unidad ? d.metrica.unidad : '';
          var s = d.serie || [];
          var withVal = s.filter(function(r) { return r.valor != null; });
          var last = s[s.length - 1];
          var minR = withVal.slice().sort(function(a, b) { return a.valor - b.valor; })[0];
          var maxR = withVal.slice().sort(function(a, b) { return b.valor - a.valor; })[0];

          setKpi('sn-serie-kpi-actual', last ? fmtVal(last.valor, unit) : '—');
          setKpi('sn-serie-kpi-actual-sub', last ? last.fecha.slice(0, 7) : '—');
          setKpi('sn-serie-kpi-min', minR ? fmtVal(minR.valor, unit) : '—');
          setKpi('sn-serie-kpi-min-sub', minR ? minR.fecha.slice(0, 7) : '—');
          setKpi('sn-serie-kpi-max', maxR ? fmtVal(maxR.valor, unit) : '—');
          setKpi('sn-serie-kpi-max-sub', maxR ? maxR.fecha.slice(0, 7) : '—');
          setKpi('sn-serie-kpi-n', fmtN(d.n_puntos));

          var tbody = document.querySelector('#sn-serie-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                '<td class="num">' + fmtVal(r.valor, unit) + '</td>' +
              '</tr>';
            }).join('');
          }
          setText('#sn-serie-meta', d.afore.nombre_corto + ' × ' + d.siefore.slug + ' · ' + metrica + ' · ' + d.n_puntos + ' meses');
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('sn-serie-error', 'No se pudo cargar la serie: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          serieApply.disabled = false;
        });
    }
    serieApply.addEventListener('click', loadSerie);

    // Bootstrap: catálogo primero, luego snapshot + serie
    function boot() {
      loadCatalogo().then(function() {
        loadSnap();
        loadSerie();
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
