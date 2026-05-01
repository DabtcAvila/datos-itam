// Sub-sección /consar/rendimientos — dataset CONSAR #10
//
// Endpoints:
//   GET /api/v1/consar/rendimientos/snapshot?fecha=YYYY-MM&plazo=Z
//   GET /api/v1/consar/rendimientos/serie?afore_codigo=X&siefore_slug=Y&plazo=Z
//   GET /api/v1/consar/rendimientos/sistema?siefore_slug=Y&plazo=Z
//
// Cobertura: 2019-12 → 2025-06 (67 meses) × 5 plazos × 11 SIEFOREs activas.
// Pattern triple-section: snapshot mensual + serie atómica + serie sistema.

import { buildTable } from '../shared/table';
import { buildHeroCaveats, buildSourceFooter } from '../shared/caveats';
import { buildConsarApiHelpers } from '../shared/api';
import {
  buildAforeSelect,
  buildSieforeSelect,
  buildMonthInput,
  buildGenericSelect,
  buildSelectorsBar,
} from '../shared/selectors';

const PLAZO_OPTIONS = [
  { value: '12_meses', label: '12 meses' },
  { value: '24_meses', label: '24 meses' },
  { value: '36_meses', label: '36 meses' },
  { value: '5_años',   label: '5 años' },
  { value: 'historico',label: 'Histórico (sólo sb 60-64)' },
];

export function buildRendimientos() {
  return {
    title: 'CONSAR · Rendimientos — porcentaje anualizado neto por AFORE × SIEFORE × plazo',
    metaDescription:
      'Rendimientos netos anualizados por AFORE × SIEFORE × plazo. Snapshot mensual + serie atómica + serie del sistema. Cobertura 2019-12 → 2025-06.',
    hero: buildHero(),
    body: buildBody(),
    script: buildScript(),
  };
}

function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-text">
        <h1 style="font-size:1.4rem;margin-bottom:0.4rem">Rendimientos — porcentaje anualizado neto</h1>
        <p>
          Rendimiento histórico neto anualizado por AFORE × SIEFORE × plazo. La serie cubre <strong>67 meses</strong>,
          de diciembre 2019 a junio 2025, con cinco plazos rolling (12 / 24 / 36 meses, 5 años, histórico). El
          dato es publicado por CONSAR ya neto de comisiones aplicadas en cada periodo.
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Cobertura 2019-12 → 2025-06 · 67 meses</span>
        <span class="hero-badge">5 plazos rolling</span>
        <span class="hero-badge">3 endpoints · snapshot + serie atómica + sistema</span>
      </div>
    </section>

    ${buildHeroCaveats({
      title: 'Hallazgos factuales del dataset',
      items: [
        {
          text:
            '<strong>Rango observado a nivel sistema [-11.47%, +27.17%]</strong> — porcentaje anualizado neto. Los valores negativos reflejan caídas reales del valor administrado en periodos específicos; ocurrencias notables coinciden temporalmente con el primer trimestre de 2020 (entorno pandémico) y con el ciclo alcista de tasas de 2022.',
        },
        {
          text:
            '<strong>Plazo "histórico" sólo aplica a SIEFORE Básica 60-64</strong> — las otras 11 SIEFOREs no tienen serie histórica reportada porque cohortes generacionales como 55-59, 65-69 y subsiguientes no existían bajo el régimen pre-2019. El endpoint devuelve 404 con mensaje explicativo si se solicita histórico de otra cohorte.',
        },
        {
          text:
            '<strong>Endpoint <code>/sistema</code></strong> entrega el agregado inter-AFORE para una SIEFORE × plazo (sin filtro por afore). Útil para tendencia agregada del sistema; complementa la serie atómica AFORE × SIEFORE.',
          emphasis: true,
        },
      ],
    })}
  `;
}

function buildBody(): string {
  // Sección A: Snapshot mensual
  const snapMonth = buildMonthInput({
    id: 'rd-snap-fecha',
    label: 'Fecha (mes)',
    defaultValue: '2025-06',
    min: '2019-12',
    max: '2025-06',
  });
  const snapPlazo = buildGenericSelect({
    id: 'rd-snap-plazo',
    label: 'Plazo',
    options: PLAZO_OPTIONS,
    defaultValue: '12_meses',
  });
  const snapTable = buildTable({
    id: 'rd-snap-table',
    columns: [
      { key: 'afore',   label: 'AFORE',           align: 'left'  },
      { key: 'siefore', label: 'SIEFORE',         align: 'left'  },
      { key: 'rend',    label: 'Rendimiento (%)', align: 'right' },
    ],
    loadingText: 'Cargando snapshot…',
  });

  // Sección B: Serie atómica
  const serieAfore = buildAforeSelect({
    id: 'rd-serie-afore',
    label: 'AFORE',
    defaultValue: 'profuturo',
  });
  const serieSiefore = buildSieforeSelect({
    id: 'rd-serie-siefore',
    label: 'SIEFORE',
    defaultValue: 'sb 60-64',
  });
  const seriePlazo = buildGenericSelect({
    id: 'rd-serie-plazo',
    label: 'Plazo',
    options: PLAZO_OPTIONS,
    defaultValue: '12_meses',
  });
  const serieTable = buildTable({
    id: 'rd-serie-table',
    columns: [
      { key: 'fecha', label: 'Fecha',           align: 'left'  },
      { key: 'rend',  label: 'Rendimiento (%)', align: 'right' },
    ],
    loadingText: 'Cargando serie atómica…',
  });

  // Sección C: Sistema
  const sysSiefore = buildSieforeSelect({
    id: 'rd-sys-siefore',
    label: 'SIEFORE',
    defaultValue: 'sb 60-64',
  });
  const sysPlazo = buildGenericSelect({
    id: 'rd-sys-plazo',
    label: 'Plazo',
    options: PLAZO_OPTIONS,
    defaultValue: '12_meses',
  });
  const sysTable = buildTable({
    id: 'rd-sys-table',
    columns: [
      { key: 'fecha', label: 'Fecha',                       align: 'left'  },
      { key: 'rend',  label: 'Rendimiento sistema (%)',     align: 'right' },
    ],
    loadingText: 'Cargando serie sistema…',
  });

  return `
    <!-- =============== Sección A: Snapshot mensual =============== -->
    <h2 class="section-title">Snapshot mensual — todas las AFOREs × SIEFOREs en una fecha × plazo</h2>

    ${buildSelectorsBar({
      controls: [snapMonth, snapPlazo],
      applyButtonId: 'rd-snap-apply',
      applyButtonLabel: 'Ver snapshot',
    })}

    <section class="kpis" aria-label="Indicadores agregados del snapshot">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Pares reportados</div>
        <div class="kpi-value" id="rd-snap-kpi-n">—</div>
        <div class="kpi-sub" id="rd-snap-kpi-fecha">fecha × plazo</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Mínimo del periodo</div>
        <div class="kpi-value" id="rd-snap-kpi-min">—</div>
        <div class="kpi-sub" id="rd-snap-kpi-min-sub">par con menor rendimiento</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Máximo del periodo</div>
        <div class="kpi-value" id="rd-snap-kpi-max">—</div>
        <div class="kpi-sub" id="rd-snap-kpi-max-sub">par con mayor rendimiento</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Promedio simple</div>
        <div class="kpi-value" id="rd-snap-kpi-prom">—</div>
        <div class="kpi-sub">sin ponderar por saldo</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Tabla por par AFORE × SIEFORE</h3>
      <span class="consar-toolbar-meta" id="rd-snap-meta">—</span>
    </div>
    ${snapTable}
    <div id="rd-snap-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección B: Serie atómica =============== -->
    <h2 class="section-title" style="margin-top:2rem">Serie atómica — AFORE × SIEFORE × plazo en el tiempo</h2>

    ${buildSelectorsBar({
      controls: [serieAfore, serieSiefore, seriePlazo],
      applyButtonId: 'rd-serie-apply',
      applyButtonLabel: 'Ver serie',
    })}

    <section class="kpis" aria-label="Indicadores de la serie atómica">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Rendimiento último mes</div>
        <div class="kpi-value" id="rd-serie-kpi-actual">—</div>
        <div class="kpi-sub" id="rd-serie-kpi-actual-sub">último reportado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Mínimo de la serie</div>
        <div class="kpi-value" id="rd-serie-kpi-min">—</div>
        <div class="kpi-sub" id="rd-serie-kpi-min-sub">mes del mínimo</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Máximo de la serie</div>
        <div class="kpi-value" id="rd-serie-kpi-max">—</div>
        <div class="kpi-sub" id="rd-serie-kpi-max-sub">mes del máximo</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Cobertura</div>
        <div class="kpi-value" id="rd-serie-kpi-n">—</div>
        <div class="kpi-sub">meses reportados</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Serie atómica — par seleccionado</h3>
      <span class="consar-toolbar-meta" id="rd-serie-meta">—</span>
    </div>
    ${serieTable}
    <div id="rd-serie-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección C: Sistema =============== -->
    <h2 class="section-title" style="margin-top:2rem">Serie sistema — agregado inter-AFORE por SIEFORE × plazo</h2>

    ${buildSelectorsBar({
      controls: [sysSiefore, sysPlazo],
      applyButtonId: 'rd-sys-apply',
      applyButtonLabel: 'Ver sistema',
    })}

    <div class="consar-toolbar">
      <h3>Rendimiento agregado del sistema</h3>
      <span class="consar-toolbar-meta" id="rd-sys-meta">—</span>
    </div>
    ${sysTable}
    <div id="rd-sys-error" class="consar-error-banner" role="alert"></div>

    ${buildSourceFooter({
      unidad: 'Porcentaje anualizado neto.',
      fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
      fuenteUrl: 'https://datos.gob.mx',
      metodologia: 'Snapshot: una fila por par AFORE × SIEFORE en una fecha × plazo. Serie atómica: par AFORE × SIEFORE específico para un plazo. Sistema: agregado inter-AFORE para una SIEFORE × plazo. Plazo "histórico" sólo aplica a sb 60-64; otras cohortes devuelven 404 explicativo.',
      endpoint: '/api/v1/consar/rendimientos/{snapshot,serie,sistema}',
    })}
  `;
}

function buildScript(): string {
  return `
  <script>
  (function() {
    'use strict';
    ${buildConsarApiHelpers()}

    function tdRend(v) {
      if (v == null) return '<td class="num">—</td>';
      var sign = v >= 0 ? '+' : '−';
      return '<td class="num">' + sign + Number(Math.abs(v)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%</td>';
    }

    // ----- Snapshot -----
    var snapMonth = document.getElementById('rd-snap-fecha');
    var snapPlazo = document.getElementById('rd-snap-plazo');
    var snapApply = document.getElementById('rd-snap-apply');

    function loadSnap() {
      var fecha = snapMonth.value;
      var plazo = snapPlazo.value;
      if (!fecha || !plazo) return;
      clearError('rd-snap-error');
      snapApply.disabled = true;
      fetchJson('/rendimientos/snapshot?fecha=' + encodeURIComponent(fecha) + '&plazo=' + encodeURIComponent(plazo))
        .then(function(d) {
          var filas = (d.filas || []).slice().sort(function(a, b) {
            return (b.rendimiento_pct || -Infinity) - (a.rendimiento_pct || -Infinity);
          });
          var withVal = filas.filter(function(r) { return r.rendimiento_pct != null; });
          var prom = withVal.length ? (withVal.reduce(function(s, r) { return s + r.rendimiento_pct; }, 0) / withVal.length) : null;
          var maxR = withVal[0];
          var minR = withVal[withVal.length - 1];

          setKpi('rd-snap-kpi-n', String(d.n_filas));
          setKpi('rd-snap-kpi-fecha', fecha + ' · plazo ' + plazo);
          setKpi('rd-snap-kpi-min', d.rendimiento_min != null ? fmtPct(d.rendimiento_min, 2) : '—');
          setKpi('rd-snap-kpi-min-sub', minR ? minR.afore_nombre_corto + ' · ' + minR.siefore_slug : '—');
          setKpi('rd-snap-kpi-max', d.rendimiento_max != null ? fmtPct(d.rendimiento_max, 2) : '—');
          setKpi('rd-snap-kpi-max-sub', maxR ? maxR.afore_nombre_corto + ' · ' + maxR.siefore_slug : '—');
          setKpi('rd-snap-kpi-prom', prom != null ? fmtPct(prom, 2) : '—');

          var tbody = document.querySelector('#rd-snap-table tbody');
          if (filas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="consar-table-loading">Sin datos para la fecha × plazo seleccionados.</td></tr>';
          } else {
            // Cap a 50 filas con nota si excede
            var slice = filas.slice(0, 50);
            tbody.innerHTML = slice.map(function(a) {
              return '<tr>' +
                '<td><strong>' + escapeHtml(a.afore_nombre_corto) + '</strong></td>' +
                '<td>' + escapeHtml(a.siefore_slug) + '</td>' +
                tdRend(a.rendimiento_pct) +
              '</tr>';
            }).join('');
            if (filas.length > 50) {
              tbody.innerHTML += '<tr><td colspan="3" class="consar-table-loading">… ' + (filas.length - 50) + ' filas adicionales no mostradas. Filtrar en serie atómica o sistema.</td></tr>';
            }
          }

          setText('#rd-snap-meta', fecha + ' · plazo ' + plazo + ' · ' + d.n_filas + ' pares · ' + d.unit);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('rd-snap-error', 'No se pudo cargar el snapshot: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          snapApply.disabled = false;
        });
    }
    snapApply.addEventListener('click', loadSnap);

    // ----- Serie atómica -----
    var serieAfore   = document.getElementById('rd-serie-afore');
    var serieSiefore = document.getElementById('rd-serie-siefore');
    var seriePlazo   = document.getElementById('rd-serie-plazo');
    var serieApply   = document.getElementById('rd-serie-apply');

    function loadSerie() {
      var afore = serieAfore.value;
      var sie   = serieSiefore.value;
      var plazo = seriePlazo.value;
      if (!afore || !sie || !plazo) return;
      clearError('rd-serie-error');
      serieApply.disabled = true;
      fetchJson('/rendimientos/serie?afore_codigo=' + encodeURIComponent(afore) + '&siefore_slug=' + encodeURIComponent(sie) + '&plazo=' + encodeURIComponent(plazo))
        .then(function(d) {
          var s = d.serie || [];
          var withVal = s.filter(function(r) { return r.rendimiento_pct != null; });
          var last = s[s.length - 1];
          var minR = withVal.slice().sort(function(a, b) { return a.rendimiento_pct - b.rendimiento_pct; })[0];
          var maxR = withVal.slice().sort(function(a, b) { return b.rendimiento_pct - a.rendimiento_pct; })[0];

          setKpi('rd-serie-kpi-actual', last ? fmtPct(last.rendimiento_pct, 2) : '—');
          setKpi('rd-serie-kpi-actual-sub', last ? last.fecha.slice(0, 7) : '—');
          setKpi('rd-serie-kpi-min', minR ? fmtPct(minR.rendimiento_pct, 2) : '—');
          setKpi('rd-serie-kpi-min-sub', minR ? minR.fecha.slice(0, 7) : '—');
          setKpi('rd-serie-kpi-max', maxR ? fmtPct(maxR.rendimiento_pct, 2) : '—');
          setKpi('rd-serie-kpi-max-sub', maxR ? maxR.fecha.slice(0, 7) : '—');
          setKpi('rd-serie-kpi-n', fmtN(d.n_puntos));

          var tbody = document.querySelector('#rd-serie-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                tdRend(r.rendimiento_pct) +
              '</tr>';
            }).join('');
          }

          setText('#rd-serie-meta', d.afore.nombre_corto + ' × ' + d.siefore.slug + ' · plazo ' + d.plazo + ' · ' + d.n_puntos + ' meses');
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('rd-serie-error', 'No se pudo cargar la serie: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          serieApply.disabled = false;
        });
    }
    serieApply.addEventListener('click', loadSerie);

    // ----- Sistema -----
    var sysSiefore = document.getElementById('rd-sys-siefore');
    var sysPlazo   = document.getElementById('rd-sys-plazo');
    var sysApply   = document.getElementById('rd-sys-apply');

    function loadSys() {
      var sie   = sysSiefore.value;
      var plazo = sysPlazo.value;
      if (!sie || !plazo) return;
      clearError('rd-sys-error');
      sysApply.disabled = true;
      fetchJson('/rendimientos/sistema?siefore_slug=' + encodeURIComponent(sie) + '&plazo=' + encodeURIComponent(plazo))
        .then(function(d) {
          var s = d.serie || [];
          var tbody = document.querySelector('#rd-sys-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                tdRend(r.rendimiento_pct) +
              '</tr>';
            }).join('');
          }
          setText('#rd-sys-meta', d.siefore.slug + ' · plazo ' + d.plazo + ' · ' + d.n_puntos + ' meses · ' + d.rango.desde + ' → ' + d.rango.hasta);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('rd-sys-error', 'No se pudo cargar la serie sistema: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          sysApply.disabled = false;
        });
    }
    sysApply.addEventListener('click', loadSys);

    function boot() {
      loadSnap();
      loadSerie();
      loadSys();
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
