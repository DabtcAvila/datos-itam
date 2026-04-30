// Sub-sección /consar/comisiones — dataset CONSAR #06
//
// Endpoints:
//   GET /api/v1/consar/comisiones/snapshot?fecha=YYYY-MM
//   GET /api/v1/consar/comisiones/serie?afore_codigo=X[&desde&hasta]
//
// Cobertura: 2008-03 → 2025-06 (208 meses) × 10 AFOREs commercial.
// NO reporta Pensión Bienestar (régimen administrativo distinto).

import { buildTable } from '../shared/table';
import { buildHeroCaveats, buildSourceFooter } from '../shared/caveats';
import { buildConsarApiHelpers } from '../shared/api';
import { buildAforeSelect, buildMonthInput, buildSelectorsBar } from '../shared/selectors';

export function buildComisiones() {
  return {
    title: 'CONSAR · Comisiones — % anual sobre saldo administrado',
    metaDescription:
      'Comisiones cobradas por las AFOREs sobre el saldo administrado. Snapshot mensual + serie histórica. Cobertura 2008-03 → 2025-06 (208 meses) × 10 AFOREs.',
    hero: buildHero(),
    body: buildBody(),
    script: buildScript(),
  };
}

function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-text">
        <h1 style="font-size:1.4rem;margin-bottom:0.4rem">Comisiones — porcentaje anual sobre saldo administrado</h1>
        <p>
          Comisiones cobradas por las AFOREs a sus afiliados, expresadas como porcentaje anual del saldo
          administrado. La serie cubre <strong>208 meses</strong>, de marzo 2008 (cuando entró en vigor la
          reforma de transparencia CONSAR) a junio 2025. Reportada para 10 AFOREs commercial; Pensión Bienestar
          no aparece en este dataset bajo régimen administrativo distinto.
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Cobertura 2008-03 → 2025-06 · 208 meses</span>
        <span class="hero-badge">10 AFOREs reportando</span>
        <span class="hero-badge">2 endpoints · snapshot + serie</span>
      </div>
    </section>

    ${buildHeroCaveats({
      title: 'Hallazgos factuales del dataset',
      items: [
        {
          text: '<strong>Tendencia secular descendente</strong> — promedio sistema 2008 = <strong>1.99%</strong>; junio 2025 = <strong>0.547%</strong>. La trayectoria es monótonamente descendente con escalones discretos en años de revisión regulatoria CONSAR.',
        },
        {
          text: '<strong>Junio 2025: 9 de 10 AFOREs privadas reportan 0.55% (cap regulatorio actual)</strong>. PensionISSSTE reporta 0.52% — la única AFORE pública del sistema. Rango sistema-wide [0.52%, 0.55%]; ninguna AFORE excede el cap.',
        },
        {
          text: '<strong>Pensión Bienestar (FPB9) no reporta comisión</strong> bajo este dataset — fondo bajo régimen administrativo diferenciado introducido en julio 2024. Sus saldos sí aparecen en el dataset Recursos SAR (#09) y en Activo neto (#07).',
        },
      ],
    })}
  `;
}

function buildBody(): string {
  // Sección A: Snapshot mensual
  const aforeSelectSerie = buildAforeSelect({
    id: 'com-serie-afore',
    label: 'AFORE',
    defaultValue: 'profuturo',
    exclude: ['pension_bienestar'],
  });
  const monthInput = buildMonthInput({
    id: 'com-snap-fecha',
    label: 'Fecha (mes)',
    defaultValue: '2025-06',
    min: '2008-03',
    max: '2025-06',
  });

  const tablaSnap = buildTable({
    id: 'com-snap-table',
    columns: [
      { key: 'afore',     label: 'AFORE',          align: 'left'  },
      { key: 'tipo',      label: 'Tipo pensión',   align: 'left'  },
      { key: 'comision',  label: 'Comisión (%)',   align: 'right' },
    ],
    loadingText: 'Cargando snapshot…',
  });

  const tablaSerie = buildTable({
    id: 'com-serie-table',
    columns: [
      { key: 'fecha',    label: 'Fecha',           align: 'left'  },
      { key: 'comision', label: 'Comisión (%)',    align: 'right' },
    ],
    loadingText: 'Cargando serie histórica…',
  });

  return `
    <!-- =============== Sección A: Snapshot mensual =============== -->
    <h2 class="section-title">Snapshot mensual — todas las AFOREs en una fecha</h2>

    ${buildSelectorsBar({
      controls: [monthInput],
      applyButtonId: 'com-snap-apply',
      applyButtonLabel: 'Ver snapshot',
    })}

    <section class="kpis" aria-label="Indicadores agregados del snapshot">
      <div class="kpi kpi--blue">
        <div class="kpi-label">AFOREs reportando</div>
        <div class="kpi-value" id="com-snap-kpi-n">—</div>
        <div class="kpi-sub" id="com-snap-kpi-fecha">fecha del snapshot</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Promedio simple</div>
        <div class="kpi-value" id="com-snap-kpi-prom">—</div>
        <div class="kpi-sub">% sobre saldo administrado</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Mínima</div>
        <div class="kpi-value" id="com-snap-kpi-min">—</div>
        <div class="kpi-sub" id="com-snap-kpi-min-sub">AFORE con menor comisión</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Máxima</div>
        <div class="kpi-value" id="com-snap-kpi-max">—</div>
        <div class="kpi-sub" id="com-snap-kpi-max-sub">AFORE con mayor comisión</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Tabla por AFORE — fecha seleccionada</h3>
      <span class="consar-toolbar-meta" id="com-snap-meta">—</span>
    </div>
    ${tablaSnap}
    <div id="com-snap-error" class="consar-error-banner" role="alert"></div>

    <!-- =============== Sección B: Serie histórica =============== -->
    <h2 class="section-title" style="margin-top:2rem">Serie histórica — una AFORE en el tiempo</h2>

    ${buildSelectorsBar({
      controls: [aforeSelectSerie],
      applyButtonId: 'com-serie-apply',
      applyButtonLabel: 'Ver serie',
    })}

    <section class="kpis" aria-label="Indicadores de la serie histórica">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Comisión actual</div>
        <div class="kpi-value" id="com-serie-kpi-actual">—</div>
        <div class="kpi-sub" id="com-serie-kpi-actual-sub">último mes reportado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Comisión inicial</div>
        <div class="kpi-value" id="com-serie-kpi-inicial">—</div>
        <div class="kpi-sub" id="com-serie-kpi-inicial-sub">primer mes reportado</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Reducción acumulada</div>
        <div class="kpi-value" id="com-serie-kpi-delta">—</div>
        <div class="kpi-sub">puntos porcentuales (no deflactado)</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Cobertura</div>
        <div class="kpi-value" id="com-serie-kpi-n">—</div>
        <div class="kpi-sub">meses reportados</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Serie histórica AFORE seleccionada</h3>
      <span class="consar-toolbar-meta" id="com-serie-meta">—</span>
    </div>
    ${tablaSerie}
    <div id="com-serie-error" class="consar-error-banner" role="alert"></div>

    ${buildSourceFooter({
      unidad: 'Porcentaje anual sobre saldo administrado.',
      fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
      fuenteUrl: 'https://datos.gob.mx',
      metodologia: 'Snapshot: una fila por AFORE en la fecha seleccionada. Serie: todas las fechas reportadas para una AFORE específica. Promedios simples sin ponderar por saldo administrado.',
      endpoint: '/api/v1/consar/comisiones/{snapshot,serie}',
    })}
  `;
}

function buildScript(): string {
  return `
  <script>
  (function() {
    'use strict';
    ${buildConsarApiHelpers()}

    // ----- Snapshot mensual -----
    var snapMonth = document.getElementById('com-snap-fecha');
    var snapApply = document.getElementById('com-snap-apply');

    function loadSnap() {
      var fecha = snapMonth.value;
      if (!fecha) return;
      clearError('com-snap-error');
      snapApply.disabled = true;
      fetchJson('/comisiones/snapshot?fecha=' + encodeURIComponent(fecha))
        .then(function(d) {
          setKpi('com-snap-kpi-n', String(d.n_afores_reportando));
          setKpi('com-snap-kpi-fecha', d.fecha);
          setKpi('com-snap-kpi-prom', fmtPct(d.promedio_simple_pct, 3));
          setKpi('com-snap-kpi-min', fmtPct(d.minima_pct, 2));
          setKpi('com-snap-kpi-max', fmtPct(d.maxima_pct, 2));

          var afores = (d.afores || []).slice().sort(function(a, b) {
            return (a.comision_pct || 0) - (b.comision_pct || 0);
          });
          var minA = afores[0];
          var maxA = afores[afores.length - 1];
          setKpi('com-snap-kpi-min-sub', minA ? minA.afore_nombre_corto : '—');
          setKpi('com-snap-kpi-max-sub', maxA ? maxA.afore_nombre_corto : '—');

          var tbody = document.querySelector('#com-snap-table tbody');
          if (afores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="consar-table-loading">Sin datos para esta fecha.</td></tr>';
          } else {
            tbody.innerHTML = afores.map(function(a) {
              var tipoBadge = a.tipo_pension === 'publica'
                ? '<span class="badge badge--neutral">pública</span>'
                : '<span class="badge badge--neutral">privada</span>';
              return '<tr>' +
                '<td><strong>' + escapeHtml(a.afore_nombre_corto) + '</strong></td>' +
                '<td>' + tipoBadge + '</td>' +
                '<td class="num">' + fmtPct(a.comision_pct, 2) + '</td>' +
              '</tr>';
            }).join('');
          }

          setText('#com-snap-meta', d.fecha + ' · ' + d.n_afores_reportando + ' AFOREs · unidad: ' + d.unit);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('com-snap-error', 'No se pudo cargar el snapshot: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          snapApply.disabled = false;
        });
    }

    snapApply.addEventListener('click', loadSnap);

    // ----- Serie histórica -----
    var serieAfore = document.getElementById('com-serie-afore');
    var serieApply = document.getElementById('com-serie-apply');

    function loadSerie() {
      var afore = serieAfore.value;
      if (!afore) return;
      clearError('com-serie-error');
      serieApply.disabled = true;
      fetchJson('/comisiones/serie?afore_codigo=' + encodeURIComponent(afore))
        .then(function(d) {
          var s = d.serie || [];
          var first = s[0];
          var last = s[s.length - 1];
          setKpi('com-serie-kpi-actual', last ? fmtPct(last.comision_pct, 2) : '—');
          setKpi('com-serie-kpi-actual-sub', last ? last.fecha.slice(0, 7) : '—');
          setKpi('com-serie-kpi-inicial', first ? fmtPct(first.comision_pct, 2) : '—');
          setKpi('com-serie-kpi-inicial-sub', first ? first.fecha.slice(0, 7) : '—');
          if (first && last && first.comision_pct != null && last.comision_pct != null) {
            var delta = first.comision_pct - last.comision_pct;
            setKpi('com-serie-kpi-delta', '−' + Number(delta).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' pp');
          } else {
            setKpi('com-serie-kpi-delta', '—');
          }
          setKpi('com-serie-kpi-n', fmtN(d.n_puntos));

          var tbody = document.querySelector('#com-serie-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            // Render más reciente arriba
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                '<td class="num">' + fmtPct(r.comision_pct, 2) + '</td>' +
              '</tr>';
            }).join('');
          }

          setText('#com-serie-meta', d.afore.nombre_corto + ' · ' + d.n_puntos + ' meses · ' + d.rango.desde + ' → ' + d.rango.hasta);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('com-serie-error', 'No se pudo cargar la serie: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          serieApply.disabled = false;
        });
    }

    serieApply.addEventListener('click', loadSerie);

    // Bootstrap: cargar snapshot 2025-06 + serie Profuturo en paralelo
    function boot() {
      loadSnap();
      loadSerie();
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
