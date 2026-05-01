// Sub-sección /consar/activo-neto — dataset CONSAR #07
//
// Endpoints:
//   GET /api/v1/consar/activo-neto/snapshot?fecha=YYYY-MM
//   GET /api/v1/consar/activo-neto/serie?afore_codigo=X&siefore_slug=Y
//   GET /api/v1/consar/activo-neto/agregado?afore_codigo=X&categoria=Z
//
// Cobertura: 2019-12 → 2025-06 (67 meses) × 11 AFOREs × 28 SIEFOREs (sparse).
// Pattern triple-section: snapshot mensual + serie atómica + serie agregada.

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

export function buildActivoNeto() {
  return {
    title: 'CONSAR · Activo neto — saldos administrados por AFORE × SIEFORE',
    metaDescription:
      'Activo neto administrado por AFORE × SIEFORE en millones de pesos MXN. Snapshot mensual + serie atómica + serie agregada por categoría. Cobertura 2019-12 → 2025-06.',
    hero: buildHero(),
    body: buildBody(),
    script: buildScript(),
  };
}

function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-text">
        <h1 style="font-size:1.4rem;margin-bottom:0.4rem">Activo neto — saldos administrados por AFORE × SIEFORE</h1>
        <p>
          Saldos administrados (activo neto) por cada combinación AFORE × SIEFORE, en millones de pesos MXN
          corrientes. La serie cubre <strong>67 meses</strong>, de diciembre 2019 a junio 2025. El sistema reporta
          11 AFOREs (incluida Pensión Bienestar bajo SIEFORE FPB9) sobre 28 SIEFOREs registradas, con cobertura
          sparse: no toda combinación existe en cada fecha.
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Cobertura 2019-12 → 2025-06 · 67 meses</span>
        <span class="hero-badge">11 AFOREs · 28 SIEFOREs</span>
        <span class="hero-badge">3 endpoints · snapshot + serie atómica + agregada</span>
      </div>
    </section>

    ${buildHeroCaveats({
      title: 'Hallazgos factuales del dataset',
      items: [
        {
          text:
            '<strong>Junio 2025: activo neto agregado del sistema = 7,510,145 mm MXN</strong> (≈ 7.5 billones MXN). Distribución entre 127 pares afore × siefore reportados en esa fecha; 10 pares con valor null se renderean como guion en la tabla.',
        },
        {
          text:
            '<strong>Modelo canónico atomizado</strong> — 17 sub-variants concat del CSV oficial (e.g. "xxi banorte 1", "sura av2") se descomponen en pares atómicos AFORE × SIEFORE vía la tabla auxiliar <code>consar.afore_siefore_alias</code>. 15 de 17 mappings están confirmados en publicaciones CONSAR; 2 son inferenciales por orden lexicográfico (sura av2 / sura av3).',
        },
        {
          text:
            '<strong>Categoría <code>act_neto_total_adicionales</code> con 0 filas</strong> — el endpoint <code>/agregado</code> devuelve 404 para esa categoría. Decisión arquitectural informada por la estructura del CSV oficial: los 1,139 registros de productos adicionales se descomponen a la tabla atómica y no se publican como totales por AFORE.',
          emphasis: true,
        },
      ],
    })}
  `;
}

function buildBody(): string {
  // Sección A: Snapshot — month + siefore (filtro a 1 siefore × 11 afores)
  const snapMonth = buildMonthInput({
    id: 'an-snap-fecha',
    label: 'Fecha (mes)',
    defaultValue: '2025-06',
    min: '2019-12',
    max: '2025-06',
  });
  const snapSiefore = buildSieforeSelect({
    id: 'an-snap-siefore',
    label: 'SIEFORE (filtro)',
    defaultValue: 'sb 60-64',
  });
  const snapTable = buildTable({
    id: 'an-snap-table',
    columns: [
      { key: 'afore',  label: 'AFORE',                    align: 'left'  },
      { key: 'tipo',   label: 'Tipo pensión',             align: 'left'  },
      { key: 'monto',  label: 'Activo neto (mm MXN)',     align: 'right' },
    ],
    loadingText: 'Cargando snapshot…',
  });

  // Sección B: Serie atómica — afore + siefore
  const serieAfore = buildAforeSelect({
    id: 'an-serie-afore',
    label: 'AFORE',
    defaultValue: 'profuturo',
  });
  const serieSiefore = buildSieforeSelect({
    id: 'an-serie-siefore',
    label: 'SIEFORE',
    defaultValue: 'sb 60-64',
  });
  const serieTable = buildTable({
    id: 'an-serie-table',
    columns: [
      { key: 'fecha', label: 'Fecha',                  align: 'left'  },
      { key: 'monto', label: 'Activo neto (mm MXN)',   align: 'right' },
    ],
    loadingText: 'Cargando serie atómica…',
  });

  // Sección C: Serie agregada — afore + categoria
  const aggAfore = buildAforeSelect({
    id: 'an-agg-afore',
    label: 'AFORE',
    defaultValue: 'profuturo',
  });
  const aggCategoria = buildGenericSelect({
    id: 'an-agg-categoria',
    label: 'Categoría agregada',
    options: [
      { value: 'act_neto_total_basicas',     label: 'Total básicas (basica_edad + pensionados)' },
      { value: 'act_neto_total_siefores',    label: 'Total SIEFOREs (incluye adicionales)' },
      { value: 'act_neto_total_adicionales', label: 'Total adicionales (0 filas — ver caveat)' },
    ],
    defaultValue: 'act_neto_total_basicas',
  });
  const aggTable = buildTable({
    id: 'an-agg-table',
    columns: [
      { key: 'fecha', label: 'Fecha',                       align: 'left'  },
      { key: 'monto', label: 'Activo neto agregado (mm MXN)', align: 'right' },
    ],
    loadingText: 'Cargando serie agregada…',
  });

  return `
    <!-- =============== Sección A: Snapshot mensual =============== -->
    <h2 class="section-title">Snapshot mensual — todas las AFOREs en una SIEFORE × fecha</h2>

    ${buildSelectorsBar({
      controls: [snapMonth, snapSiefore],
      applyButtonId: 'an-snap-apply',
      applyButtonLabel: 'Ver snapshot',
    })}

    <section class="kpis" aria-label="Indicadores agregados del snapshot">
      <div class="kpi kpi--blue">
        <div class="kpi-label">AFOREs en la SIEFORE</div>
        <div class="kpi-value" id="an-snap-kpi-n">—</div>
        <div class="kpi-sub" id="an-snap-kpi-fecha">filtro aplicado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Total SIEFORE filtrada</div>
        <div class="kpi-value" id="an-snap-kpi-tot">—</div>
        <div class="kpi-sub">suma sobre AFOREs reportando</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Mayor saldo</div>
        <div class="kpi-value" id="an-snap-kpi-max">—</div>
        <div class="kpi-sub" id="an-snap-kpi-max-sub">AFORE con mayor saldo</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Menor saldo reportado</div>
        <div class="kpi-value" id="an-snap-kpi-min">—</div>
        <div class="kpi-sub" id="an-snap-kpi-min-sub">excluye nulls</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Tabla por AFORE — SIEFORE × fecha seleccionadas</h3>
      <span class="consar-toolbar-meta" id="an-snap-meta">—</span>
    </div>
    ${snapTable}
    <div id="an-snap-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección B: Serie atómica =============== -->
    <h2 class="section-title" style="margin-top:2rem">Serie atómica — AFORE × SIEFORE en el tiempo</h2>

    ${buildSelectorsBar({
      controls: [serieAfore, serieSiefore],
      applyButtonId: 'an-serie-apply',
      applyButtonLabel: 'Ver serie',
    })}

    <section class="kpis" aria-label="Indicadores de la serie atómica">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Saldo último mes</div>
        <div class="kpi-value" id="an-serie-kpi-actual">—</div>
        <div class="kpi-sub" id="an-serie-kpi-actual-sub">último reportado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Saldo inicial reportado</div>
        <div class="kpi-value" id="an-serie-kpi-inicial">—</div>
        <div class="kpi-sub" id="an-serie-kpi-inicial-sub">primer punto</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Variación nominal</div>
        <div class="kpi-value" id="an-serie-kpi-delta">—</div>
        <div class="kpi-sub">final − inicial (no deflactado)</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Cobertura</div>
        <div class="kpi-value" id="an-serie-kpi-n">—</div>
        <div class="kpi-sub">meses reportados</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Serie atómica — par seleccionado</h3>
      <span class="consar-toolbar-meta" id="an-serie-meta">—</span>
    </div>
    ${serieTable}
    <div id="an-serie-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección C: Serie agregada =============== -->
    <h2 class="section-title" style="margin-top:2rem">Serie agregada — AFORE × categoría</h2>

    ${buildSelectorsBar({
      controls: [aggAfore, aggCategoria],
      applyButtonId: 'an-agg-apply',
      applyButtonLabel: 'Ver agregado',
    })}

    <div class="consar-toolbar">
      <h3>Serie agregada por categoría</h3>
      <span class="consar-toolbar-meta" id="an-agg-meta">—</span>
    </div>
    ${aggTable}
    <div id="an-agg-error" class="consar-error-banner" role="alert"></div>

    ${buildSourceFooter({
      unidad: 'Millones de pesos MXN corrientes (no deflactados).',
      fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
      fuenteUrl: 'https://datos.gob.mx',
      metodologia: 'Snapshot: filtro a una SIEFORE en una fecha; cada fila es una AFORE. Serie atómica: par AFORE × SIEFORE atómico (no agregado). Serie agregada: totales por categoría (act_neto_total_basicas / act_neto_total_siefores / act_neto_total_adicionales) sin descomponer a SIEFORE individual. La categoría adicionales devuelve 0 filas — ver caveat al inicio.',
      endpoint: '/api/v1/consar/activo-neto/{snapshot,serie,agregado}',
    })}
  `;
}

function buildScript(): string {
  return `
  <script>
  (function() {
    'use strict';
    ${buildConsarApiHelpers()}

    // ----- Snapshot mensual + filtro siefore -----
    var snapMonth   = document.getElementById('an-snap-fecha');
    var snapSiefore = document.getElementById('an-snap-siefore');
    var snapApply   = document.getElementById('an-snap-apply');

    function loadSnap() {
      var fecha    = snapMonth.value;
      var sieSlug  = snapSiefore.value;
      if (!fecha || !sieSlug) return;
      clearError('an-snap-error');
      snapApply.disabled = true;
      fetchJson('/activo-neto/snapshot?fecha=' + encodeURIComponent(fecha))
        .then(function(d) {
          var filas = (d.filas || []).filter(function(r) { return r.siefore_slug === sieSlug; });
          // Ordenar por monto desc (nulls al final)
          filas.sort(function(a, b) {
            var av = a.monto_mxn_mm == null ? -Infinity : a.monto_mxn_mm;
            var bv = b.monto_mxn_mm == null ? -Infinity : b.monto_mxn_mm;
            return bv - av;
          });

          var withVal = filas.filter(function(r) { return r.monto_mxn_mm != null; });
          var total = withVal.reduce(function(s, r) { return s + r.monto_mxn_mm; }, 0);
          var maxRow = withVal[0];
          var minRow = withVal[withVal.length - 1];

          setKpi('an-snap-kpi-n', String(filas.length));
          setKpi('an-snap-kpi-fecha', fecha + ' · ' + sieSlug);
          setKpi('an-snap-kpi-tot', fmtMm(total));
          setKpi('an-snap-kpi-max', maxRow ? fmtMm(maxRow.monto_mxn_mm) : '—');
          setKpi('an-snap-kpi-max-sub', maxRow ? maxRow.afore_nombre_corto : '—');
          setKpi('an-snap-kpi-min', minRow ? fmtMm(minRow.monto_mxn_mm) : '—');
          setKpi('an-snap-kpi-min-sub', minRow ? minRow.afore_nombre_corto : '—');

          var tbody = document.querySelector('#an-snap-table tbody');
          if (filas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="consar-table-loading">Sin datos para esta SIEFORE en la fecha seleccionada.</td></tr>';
          } else {
            tbody.innerHTML = filas.map(function(a) {
              var afore = a.afore_codigo;
              var tipoBadge = afore === 'pensionissste' ? '<span class="badge badge--neutral">pública</span>'
                : afore === 'pension_bienestar' ? '<span class="badge badge--neutral">bienestar</span>'
                : '<span class="badge badge--neutral">privada</span>';
              return '<tr>' +
                '<td><strong>' + escapeHtml(a.afore_nombre_corto) + '</strong></td>' +
                '<td>' + tipoBadge + '</td>' +
                '<td class="num">' + fmtMm(a.monto_mxn_mm) + '</td>' +
              '</tr>';
            }).join('');
          }

          setText('#an-snap-meta', fecha + ' · ' + sieSlug + ' · ' + filas.length + ' AFOREs · ' + d.unit);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('an-snap-error', 'No se pudo cargar el snapshot: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          snapApply.disabled = false;
        });
    }
    snapApply.addEventListener('click', loadSnap);

    // ----- Serie atómica -----
    var serieAfore   = document.getElementById('an-serie-afore');
    var serieSiefore = document.getElementById('an-serie-siefore');
    var serieApply   = document.getElementById('an-serie-apply');

    function loadSerie() {
      var afore = serieAfore.value;
      var sie   = serieSiefore.value;
      if (!afore || !sie) return;
      clearError('an-serie-error');
      serieApply.disabled = true;
      fetchJson('/activo-neto/serie?afore_codigo=' + encodeURIComponent(afore) + '&siefore_slug=' + encodeURIComponent(sie))
        .then(function(d) {
          var s = d.serie || [];
          var first = s[0];
          var last  = s[s.length - 1];
          setKpi('an-serie-kpi-actual', last ? fmtMm(last.monto_mxn_mm) : '—');
          setKpi('an-serie-kpi-actual-sub', last ? last.fecha.slice(0, 7) : '—');
          setKpi('an-serie-kpi-inicial', first ? fmtMm(first.monto_mxn_mm) : '—');
          setKpi('an-serie-kpi-inicial-sub', first ? first.fecha.slice(0, 7) : '—');
          if (first && last && first.monto_mxn_mm != null && last.monto_mxn_mm != null) {
            var delta = last.monto_mxn_mm - first.monto_mxn_mm;
            var sign = delta >= 0 ? '+' : '−';
            setKpi('an-serie-kpi-delta', sign + fmtMm(Math.abs(delta)).slice(1));
          } else {
            setKpi('an-serie-kpi-delta', '—');
          }
          setKpi('an-serie-kpi-n', fmtN(d.n_puntos));

          var tbody = document.querySelector('#an-serie-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                '<td class="num">' + fmtMm(r.monto_mxn_mm) + '</td>' +
              '</tr>';
            }).join('');
          }

          setText('#an-serie-meta', d.afore.nombre_corto + ' × ' + d.siefore.slug + ' · ' + d.n_puntos + ' meses · ' + d.rango.desde + ' → ' + d.rango.hasta);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('an-serie-error', 'No se pudo cargar la serie atómica: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          serieApply.disabled = false;
        });
    }
    serieApply.addEventListener('click', loadSerie);

    // ----- Serie agregada -----
    var aggAfore = document.getElementById('an-agg-afore');
    var aggCat   = document.getElementById('an-agg-categoria');
    var aggApply = document.getElementById('an-agg-apply');

    function loadAgg() {
      var afore = aggAfore.value;
      var cat   = aggCat.value;
      if (!afore || !cat) return;
      clearError('an-agg-error');
      aggApply.disabled = true;
      fetchJson('/activo-neto/agregado?afore_codigo=' + encodeURIComponent(afore) + '&categoria=' + encodeURIComponent(cat))
        .then(function(d) {
          var s = d.serie || [];
          var tbody = document.querySelector('#an-agg-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                '<td class="num">' + fmtMm(r.monto_mxn_mm) + '</td>' +
              '</tr>';
            }).join('');
          }
          setText('#an-agg-meta', d.afore.nombre_corto + ' · ' + cat + ' · ' + d.n_puntos + ' meses · ' + d.rango.desde + ' → ' + d.rango.hasta);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          var msg = err && err.message ? err.message : String(err);
          // 404 con detail explicativo: mostrar mensaje informativo, no error rojo solo
          showError('an-agg-error', 'Sin datos: ' + msg);
          var tbody = document.querySelector('#an-agg-table tbody');
          if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin filas reportadas para esta categoría.</td></tr>';
        })
        .finally(function() {
          aggApply.disabled = false;
        });
    }
    aggApply.addEventListener('click', loadAgg);

    function boot() {
      loadSnap();
      loadSerie();
      loadAgg();
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
