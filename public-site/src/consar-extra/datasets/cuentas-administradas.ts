// Sub-sección /consar/cuentas-administradas — dataset CONSAR #05
//
// Endpoints:
//   GET /api/v1/consar/metricas-cuenta              (catálogo dinámico, 11 entries)
//   GET /api/v1/consar/cuentas/snapshot?fecha=YYYY-MM
//   GET /api/v1/consar/cuentas/serie?afore_codigo=X&metrica=Y
//   GET /api/v1/consar/cuentas/sistema?metrica=Y
//
// Cobertura: 1997-12 → 2025-06 (331 meses) — la más profunda del proyecto.
// 11 métricas con desde_fecha heterogéneo. NO tiene dim siefore.
// Pattern triple-section: snapshot + serie por afore + serie sistema.
// HERO S13 calibrado obligatorio: residuo 5.5M cuentas post-2024-09 sin atribución causal.

import { buildTable } from '../shared/table';
import { buildHeroCaveats, buildSourceFooter } from '../shared/caveats';
import { buildConsarApiHelpers } from '../shared/api';
import {
  buildAforeSelect,
  buildMonthInput,
  buildSelectorsBar,
} from '../shared/selectors';

export function buildCuentasAdministradas() {
  return {
    title: 'CONSAR · Cuentas administradas — conteo de cuentas y trabajadores por AFORE',
    metaDescription:
      'Conteo de cuentas administradas y trabajadores por AFORE × métrica × fecha. 11 métricas con cobertura heterogénea desde 1997-12. Snapshot + serie por AFORE + serie sistema.',
    hero: buildHero(),
    body: buildBody(),
    script: buildScript(),
  };
}

function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-text">
        <h1 style="font-size:1.4rem;margin-bottom:0.4rem">Cuentas administradas — conteo de cuentas y trabajadores</h1>
        <p>
          Conteo de cuentas administradas y de trabajadores por AFORE × métrica × fecha. Es la cobertura temporal
          más profunda del observatorio: <strong>331 meses</strong>, de diciembre 1997 a junio 2025. El catálogo
          contiene 11 métricas con fecha de inicio heterogénea (desde 1997-12 hasta 2024-09 según la métrica).
          Reportada por las 10 AFOREs commercial individuales y, por separado, como agregados de sistema.
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Cobertura 1997-12 → 2025-06 · 331 meses</span>
        <span class="hero-badge">11 métricas · cobertura heterogénea</span>
        <span class="hero-badge">4 endpoints · catálogo + snapshot + serie + sistema</span>
      </div>
    </section>

    ${buildHeroCaveats({
      title: 'Hallazgos factuales del dataset',
      items: [
        {
          text:
            '<strong>Cobertura de inicio variable por métrica</strong> — total cuentas SAR y trabajadores IMSS/registrados desde 1997-12; trabajadores asignados desde 2001-06; subdivisiones banco_mexico/siefores desde 2012-01; trabajadores independientes/issste desde 2005-08; cuentas inhabilitadas desde 2024-09 y bienestar 010 desde 2024-07 (post-reforma 2024). Filtrar el snapshot mensual a una fecha temprana puede devolver menos métricas de las 11.',
        },
        {
          text:
            '<strong>Junio 2025: diferencia entre conteo agregado <code>cuenta_administrada</code> y sentinel <code>total_cuentas_sar</code> = 5,552,645 cuentas</strong> (≈ 7.2% del total SAR). El residuo emerge desde 2024-09-01 (860,860 cuentas en su primera observación), crece a 5,130,115 en 2024-12 y se estabiliza en torno a 5.5M en 2025. Coincide temporalmente con la reforma 2024 que activó el Fondo de Pensiones para el Bienestar (FPB). La causa específica de la diferencia no es determinable desde este dataset; una posible atribución es la existencia de cuentas en transición jurisdiccional bajo la reforma, pero no es confirmable con la información publicada.',
          emphasis: true,
        },
        {
          text:
            '<strong>Antes de 2024-07 la identidad cierra al 100%</strong> — el sentinel <code>total_cuentas_sar</code> es exactamente igual a la suma de cuentas commercial reportadas. En 2024-07 y 2024-08 la identidad cuadra al sumar también <code>cuentas_bienestar_010</code>; el residuo descrito arriba aparece a partir de 2024-09. Métricas reportadas como counts BIGINT (todos los valores son integer en el CSV).',
        },
      ],
    })}
  `;
}

function buildBody(): string {
  // Selectores para snapshot + serie (métrica viene del catálogo)
  const snapMonth = buildMonthInput({
    id: 'cu-snap-fecha',
    label: 'Fecha (mes)',
    defaultValue: '2025-06',
    min: '1997-12',
    max: '2025-06',
  });
  const snapMetricaHtml = `
    <label class="consar-selector">
      <span class="consar-selector-label">Métrica (filtro)</span>
      <select id="cu-snap-metrica" class="consar-selector-input">
        <option value="total_cuentas_afores">Total cuentas afores (cargando catálogo…)</option>
      </select>
    </label>
  `;
  const snapTable = buildTable({
    id: 'cu-snap-table',
    columns: [
      { key: 'afore', label: 'AFORE',  align: 'left'  },
      { key: 'valor', label: 'Valor',  align: 'right' },
    ],
    loadingText: 'Cargando snapshot…',
  });

  // Sección B: Serie por AFORE
  const serieAfore = buildAforeSelect({
    id: 'cu-serie-afore',
    label: 'AFORE',
    defaultValue: 'profuturo',
    exclude: ['pension_bienestar'],
  });
  const serieMetricaHtml = `
    <label class="consar-selector">
      <span class="consar-selector-label">Métrica</span>
      <select id="cu-serie-metrica" class="consar-selector-input">
        <option value="total_cuentas_afores">Total cuentas afores (cargando catálogo…)</option>
      </select>
    </label>
  `;
  const serieTable = buildTable({
    id: 'cu-serie-table',
    columns: [
      { key: 'fecha', label: 'Fecha', align: 'left'  },
      { key: 'valor', label: 'Valor', align: 'right' },
    ],
    loadingText: 'Cargando serie por AFORE…',
  });

  // Sección C: Sistema (3 sentinels: total_cuentas_sar, cuentas_bienestar_010, prestadora)
  const SISTEMA_OPTIONS = [
    { value: 'total_cuentas_sar',    label: 'Total cuentas SAR (sentinel sistema, 1997-12+)' },
    { value: 'cuentas_bienestar_010',label: 'Cuentas bienestar 010 (sistema-categoría, 2024-07+)' },
  ];
  const sysMetricaHtml = `
    <label class="consar-selector">
      <span class="consar-selector-label">Métrica sistema</span>
      <select id="cu-sys-metrica" class="consar-selector-input">
        ${SISTEMA_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
      </select>
    </label>
  `;
  const sysTable = buildTable({
    id: 'cu-sys-table',
    columns: [
      { key: 'fecha', label: 'Fecha', align: 'left'  },
      { key: 'valor', label: 'Valor', align: 'right' },
    ],
    loadingText: 'Cargando serie sistema…',
  });

  return `
    <!-- Métrica info card -->
    <section class="consar-source-footer" id="cu-metrica-info" aria-live="polite">
      <div class="consar-source-row"><strong>Métrica seleccionada:</strong> <span id="cu-metrica-info-slug">total_cuentas_afores</span></div>
      <div class="consar-source-row" id="cu-metrica-info-desc">Cargando descripción…</div>
    </section>

    <!-- =============== Sección A: Snapshot mensual =============== -->
    <h2 class="section-title" style="margin-top:1.5rem">Snapshot mensual — todas las AFOREs en una fecha × métrica</h2>

    ${buildSelectorsBar({
      controls: [snapMonth, snapMetricaHtml],
      applyButtonId: 'cu-snap-apply',
      applyButtonLabel: 'Ver snapshot',
    })}

    <section class="kpis" aria-label="Indicadores agregados del snapshot">
      <div class="kpi kpi--blue">
        <div class="kpi-label">AFOREs reportando</div>
        <div class="kpi-value" id="cu-snap-kpi-n">—</div>
        <div class="kpi-sub" id="cu-snap-kpi-fecha">filtro aplicado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Total métrica</div>
        <div class="kpi-value" id="cu-snap-kpi-tot">—</div>
        <div class="kpi-sub">suma sobre AFOREs reportando</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">AFORE con mayor conteo</div>
        <div class="kpi-value" id="cu-snap-kpi-max">—</div>
        <div class="kpi-sub" id="cu-snap-kpi-max-sub">—</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">AFORE con menor conteo</div>
        <div class="kpi-value" id="cu-snap-kpi-min">—</div>
        <div class="kpi-sub" id="cu-snap-kpi-min-sub">—</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Tabla por AFORE — métrica × fecha seleccionadas</h3>
      <span class="consar-toolbar-meta" id="cu-snap-meta">—</span>
    </div>
    ${snapTable}
    <div id="cu-snap-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección B: Serie por AFORE =============== -->
    <h2 class="section-title" style="margin-top:2rem">Serie por AFORE — AFORE × métrica en el tiempo</h2>

    ${buildSelectorsBar({
      controls: [serieAfore, serieMetricaHtml],
      applyButtonId: 'cu-serie-apply',
      applyButtonLabel: 'Ver serie',
    })}

    <section class="kpis" aria-label="Indicadores de la serie por AFORE">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Conteo último mes</div>
        <div class="kpi-value" id="cu-serie-kpi-actual">—</div>
        <div class="kpi-sub" id="cu-serie-kpi-actual-sub">último reportado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Conteo inicial reportado</div>
        <div class="kpi-value" id="cu-serie-kpi-inicial">—</div>
        <div class="kpi-sub" id="cu-serie-kpi-inicial-sub">primer punto</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Variación nominal</div>
        <div class="kpi-value" id="cu-serie-kpi-delta">—</div>
        <div class="kpi-sub">final − inicial</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Cobertura</div>
        <div class="kpi-value" id="cu-serie-kpi-n">—</div>
        <div class="kpi-sub">meses reportados</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Serie histórica — AFORE × métrica</h3>
      <span class="consar-toolbar-meta" id="cu-serie-meta">—</span>
    </div>
    ${serieTable}
    <div id="cu-serie-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección C: Serie sistema =============== -->
    <h2 class="section-title" style="margin-top:2rem">Serie sistema — sentinels y categorías especiales</h2>

    ${buildSelectorsBar({
      controls: [sysMetricaHtml],
      applyButtonId: 'cu-sys-apply',
      applyButtonLabel: 'Ver sistema',
    })}

    <div class="consar-toolbar">
      <h3>Serie agregada del sistema</h3>
      <span class="consar-toolbar-meta" id="cu-sys-meta">—</span>
    </div>
    ${sysTable}
    <div id="cu-sys-error" class="consar-error-banner" role="alert"></div>

    ${buildSourceFooter({
      unidad: 'Conteo (BIGINT) — cuentas o trabajadores.',
      fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
      fuenteUrl: 'https://datos.gob.mx',
      metodologia: 'Snapshot: una fila por AFORE en una fecha × métrica. Serie por AFORE: AFORE específica × métrica × tiempo (sólo métricas reportadas a nivel afore). Serie sistema: sentinels sistema-total y categorías especiales (Pensión Bienestar 010). Las métricas tienen fecha de inicio heterogénea según el catálogo /metricas-cuenta.',
      endpoint: '/api/v1/consar/{metricas-cuenta,cuentas/snapshot,cuentas/serie,cuentas/sistema}',
    })}
  `;
}

function buildScript(): string {
  return `
  <script>
  (function() {
    'use strict';
    ${buildConsarApiHelpers()}

    var metricasCatalogo = [];

    function findMetrica(slug) {
      for (var i = 0; i < metricasCatalogo.length; i++) {
        if (metricasCatalogo[i].slug === slug) return metricasCatalogo[i];
      }
      return null;
    }

    function populateMetricSelects() {
      // Snapshot + serie excluyen sentinels-only (cuentas_bienestar_010, total_cuentas_sar — no se reportan por afore individual)
      var SENTINELS_ONLY = { 'cuentas_bienestar_010': 1, 'total_cuentas_sar': 1 };
      var snapHtml = metricasCatalogo
        .filter(function(m) { return !SENTINELS_ONLY[m.slug]; })
        .map(function(m) {
          var sel = m.slug === 'total_cuentas_afores' ? ' selected' : '';
          return '<option value="' + escapeHtml(m.slug) + '"' + sel + '>' + escapeHtml(m.slug) + '</option>';
        }).join('');
      var snapSel  = document.getElementById('cu-snap-metrica');
      var serieSel = document.getElementById('cu-serie-metrica');
      if (snapSel)  snapSel.innerHTML  = snapHtml;
      if (serieSel) serieSel.innerHTML = snapHtml;
    }

    function updateMetricaInfo(slug) {
      var m = findMetrica(slug);
      var slugEl = document.getElementById('cu-metrica-info-slug');
      var descEl = document.getElementById('cu-metrica-info-desc');
      if (slugEl) slugEl.textContent = slug + (m ? ' · desde ' + (m.desde_fecha ? m.desde_fecha.slice(0, 7) : '?') : '');
      if (descEl) descEl.textContent = m ? m.descripcion : 'Métrica no encontrada en el catálogo.';
    }

    function loadCatalogo() {
      return fetchJson('/metricas-cuenta')
        .then(function(d) {
          metricasCatalogo = d.metricas || [];
          populateMetricSelects();
          updateMetricaInfo('total_cuentas_afores');
        })
        .catch(function(err) {
          showError('cu-snap-error', 'No se pudo cargar catálogo: ' + (err && err.message ? err.message : err));
        });
    }

    // ----- Snapshot -----
    var snapMonth   = document.getElementById('cu-snap-fecha');
    var snapMetrica = document.getElementById('cu-snap-metrica');
    var snapApply   = document.getElementById('cu-snap-apply');

    function loadSnap() {
      var fecha   = snapMonth.value;
      var metrica = snapMetrica.value;
      if (!fecha || !metrica) return;
      clearError('cu-snap-error');
      snapApply.disabled = true;
      updateMetricaInfo(metrica);
      fetchJson('/cuentas/snapshot?fecha=' + encodeURIComponent(fecha))
        .then(function(d) {
          var filas = (d.filas || []).filter(function(r) { return r.metrica_slug === metrica; });
          filas.sort(function(a, b) { return (b.valor || 0) - (a.valor || 0); });
          var withVal = filas.filter(function(r) { return r.valor != null; });
          var total = withVal.reduce(function(s, r) { return s + r.valor; }, 0);
          var maxR = withVal[0];
          var minR = withVal[withVal.length - 1];

          setKpi('cu-snap-kpi-n', String(filas.length));
          setKpi('cu-snap-kpi-fecha', fecha + ' · ' + metrica);
          setKpi('cu-snap-kpi-tot', fmtN(total));
          setKpi('cu-snap-kpi-max', maxR ? fmtN(maxR.valor) : '—');
          setKpi('cu-snap-kpi-max-sub', maxR ? maxR.afore_nombre_corto : '—');
          setKpi('cu-snap-kpi-min', minR ? fmtN(minR.valor) : '—');
          setKpi('cu-snap-kpi-min-sub', minR ? minR.afore_nombre_corto : '—');

          var tbody = document.querySelector('#cu-snap-table tbody');
          if (filas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin datos para esta métrica × fecha. Métricas con desde_fecha posterior podrían no estar disponibles.</td></tr>';
          } else {
            tbody.innerHTML = filas.map(function(a) {
              return '<tr>' +
                '<td><strong>' + escapeHtml(a.afore_nombre_corto) + '</strong></td>' +
                '<td class="num">' + fmtN(a.valor) + '</td>' +
              '</tr>';
            }).join('');
          }
          setText('#cu-snap-meta', fecha + ' · ' + metrica + ' · ' + filas.length + ' AFOREs');
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('cu-snap-error', 'No se pudo cargar el snapshot: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          snapApply.disabled = false;
        });
    }
    snapApply.addEventListener('click', loadSnap);

    // ----- Serie por AFORE -----
    var serieAfore   = document.getElementById('cu-serie-afore');
    var serieMetrica = document.getElementById('cu-serie-metrica');
    var serieApply   = document.getElementById('cu-serie-apply');

    function loadSerie() {
      var afore   = serieAfore.value;
      var metrica = serieMetrica.value;
      if (!afore || !metrica) return;
      clearError('cu-serie-error');
      serieApply.disabled = true;
      fetchJson('/cuentas/serie?afore_codigo=' + encodeURIComponent(afore) + '&metrica=' + encodeURIComponent(metrica))
        .then(function(d) {
          var s = d.serie || [];
          var first = s[0];
          var last  = s[s.length - 1];
          setKpi('cu-serie-kpi-actual', last ? fmtN(last.valor) : '—');
          setKpi('cu-serie-kpi-actual-sub', last ? last.fecha.slice(0, 7) : '—');
          setKpi('cu-serie-kpi-inicial', first ? fmtN(first.valor) : '—');
          setKpi('cu-serie-kpi-inicial-sub', first ? first.fecha.slice(0, 7) : '—');
          if (first && last && first.valor != null && last.valor != null) {
            var delta = last.valor - first.valor;
            var sign = delta >= 0 ? '+' : '−';
            setKpi('cu-serie-kpi-delta', sign + fmtN(Math.abs(delta)));
          } else {
            setKpi('cu-serie-kpi-delta', '—');
          }
          setKpi('cu-serie-kpi-n', fmtN(d.n_puntos));

          var tbody = document.querySelector('#cu-serie-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                '<td class="num">' + fmtN(r.valor) + '</td>' +
              '</tr>';
            }).join('');
          }
          setText('#cu-serie-meta', d.afore.nombre_corto + ' · ' + (d.metrica && d.metrica.slug ? d.metrica.slug : metrica) + ' · ' + d.n_puntos + ' meses · ' + d.rango.desde + ' → ' + d.rango.hasta);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('cu-serie-error', 'No se pudo cargar la serie: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          serieApply.disabled = false;
        });
    }
    serieApply.addEventListener('click', loadSerie);

    // ----- Serie sistema -----
    var sysMetrica = document.getElementById('cu-sys-metrica');
    var sysApply   = document.getElementById('cu-sys-apply');

    function loadSys() {
      var metrica = sysMetrica.value;
      if (!metrica) return;
      clearError('cu-sys-error');
      sysApply.disabled = true;
      fetchJson('/cuentas/sistema?metrica=' + encodeURIComponent(metrica))
        .then(function(d) {
          var s = d.serie || [];
          var tbody = document.querySelector('#cu-sys-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                '<td class="num">' + fmtN(r.valor) + '</td>' +
              '</tr>';
            }).join('');
          }
          setText('#cu-sys-meta', metrica + ' · ' + d.n_puntos + ' meses');
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('cu-sys-error', 'No se pudo cargar la serie sistema: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          sysApply.disabled = false;
        });
    }
    sysApply.addEventListener('click', loadSys);

    function boot() {
      loadCatalogo().then(function() {
        loadSnap();
        loadSerie();
        loadSys();
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
