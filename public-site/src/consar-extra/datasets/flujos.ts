// Sub-sección /consar/flujos — dataset CONSAR #04
//
// Endpoints:
//   GET /api/v1/consar/flujos/snapshot?fecha=YYYY-MM
//   GET /api/v1/consar/flujos/serie?afore_codigo=X[&desde&hasta]
//
// Cobertura: 2009-01 → 2025-06 (198 meses) × 10 AFOREs commercial.

import { buildTable } from '../shared/table';
import { buildHeroCaveats, buildSourceFooter } from '../shared/caveats';
import { buildConsarApiHelpers } from '../shared/api';
import { buildAforeSelect, buildMonthInput, buildSelectorsBar } from '../shared/selectors';

export function buildFlujos() {
  return {
    title: 'CONSAR · Flujos — entradas y salidas mensuales por AFORE',
    metaDescription:
      'Entradas y salidas mensuales de recursos por AFORE. Snapshot mensual + serie histórica. Cobertura 2009-01 → 2025-06 (198 meses) × 10 AFOREs.',
    hero: buildHero(),
    body: buildBody(),
    script: buildScript(),
  };
}

function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-text">
        <h1 style="font-size:1.4rem;margin-bottom:0.4rem">Flujos — entradas y salidas mensuales por AFORE</h1>
        <p>
          Movimientos brutos mensuales de recursos hacia y desde cada AFORE. La serie cubre <strong>198 meses</strong>,
          de enero 2009 a junio 2025. Las entradas incluyen aportaciones obligatorias, voluntarias y traspasos
          recibidos; las salidas incluyen retiros, traspasos cedidos y otros movimientos. Reportada en
          millones de pesos MXN corrientes.
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Cobertura 2009-01 → 2025-06 · 198 meses</span>
        <span class="hero-badge">10 AFOREs reportando</span>
        <span class="hero-badge">2 endpoints · snapshot + serie</span>
      </div>
    </section>

    ${buildHeroCaveats({
      title: 'Hallazgos factuales del dataset',
      items: [
        {
          text: '<strong>Junio 2025: flujo neto agregado del sistema = −1,080 mm MXN</strong>. Entradas sistema 28,688 mm; salidas sistema 29,768 mm. El signo negativo indica que en ese mes el conjunto de salidas fue mayor que el conjunto de entradas a nivel sistema.',
        },
        {
          text: '<strong>Distribución del flujo neto en junio 2025</strong> — XXI-Banorte reporta el mayor flujo neto positivo (+13,384 mm); Banamex reporta el mayor flujo neto negativo (−3,010 mm). Coppel −2,236 mm; SURA −1,831 mm. La tabla del snapshot muestra el desglose completo.',
        },
        {
          text: '<strong>Flujo neto bruto, no incluye revaluaciones</strong> — el dato es contable de movimientos. Cambios en el activo administrado por valuación de mercado se reportan separadamente en el dataset Activo neto (#07). Pensión Bienestar no aparece en este dataset.',
          emphasis: true,
        },
      ],
    })}
  `;
}

function buildBody(): string {
  const aforeSelect = buildAforeSelect({
    id: 'flu-serie-afore',
    label: 'AFORE',
    defaultValue: 'xxi_banorte',
    exclude: ['pension_bienestar'],
  });
  const monthInput = buildMonthInput({
    id: 'flu-snap-fecha',
    label: 'Fecha (mes)',
    defaultValue: '2025-06',
    min: '2009-01',
    max: '2025-06',
  });

  const tablaSnap = buildTable({
    id: 'flu-snap-table',
    columns: [
      { key: 'afore',    label: 'AFORE',                 align: 'left'  },
      { key: 'tipo',     label: 'Tipo pensión',          align: 'left'  },
      { key: 'entradas', label: 'Entradas (mm MXN)',     align: 'right' },
      { key: 'salidas',  label: 'Salidas (mm MXN)',      align: 'right' },
      { key: 'neto',     label: 'Flujo neto (mm MXN)',   align: 'right' },
    ],
    loadingText: 'Cargando snapshot…',
  });

  const tablaSerie = buildTable({
    id: 'flu-serie-table',
    columns: [
      { key: 'fecha',    label: 'Fecha',                 align: 'left'  },
      { key: 'entradas', label: 'Entradas (mm MXN)',     align: 'right' },
      { key: 'salidas',  label: 'Salidas (mm MXN)',      align: 'right' },
      { key: 'neto',     label: 'Flujo neto (mm MXN)',   align: 'right' },
    ],
    loadingText: 'Cargando serie histórica…',
  });

  return `
    <h2 class="section-title">Snapshot mensual — todas las AFOREs en una fecha</h2>

    ${buildSelectorsBar({
      controls: [monthInput],
      applyButtonId: 'flu-snap-apply',
      applyButtonLabel: 'Ver snapshot',
    })}

    <section class="kpis" aria-label="Indicadores agregados del snapshot">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Entradas sistema</div>
        <div class="kpi-value" id="flu-snap-kpi-ent">—</div>
        <div class="kpi-sub" id="flu-snap-kpi-fecha">fecha del snapshot</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Salidas sistema</div>
        <div class="kpi-value" id="flu-snap-kpi-sal">—</div>
        <div class="kpi-sub">millones MXN corrientes</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Flujo neto sistema</div>
        <div class="kpi-value" id="flu-snap-kpi-neto">—</div>
        <div class="kpi-sub" id="flu-snap-kpi-neto-sub">entradas − salidas</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">AFOREs reportando</div>
        <div class="kpi-value" id="flu-snap-kpi-n">—</div>
        <div class="kpi-sub">en la fecha seleccionada</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Tabla por AFORE — fecha seleccionada</h3>
      <span class="consar-toolbar-meta" id="flu-snap-meta">—</span>
    </div>
    ${tablaSnap}
    <div id="flu-snap-error" class="consar-error-banner" role="alert"></div>

    <h2 class="section-title" style="margin-top:2rem">Serie histórica — una AFORE en el tiempo</h2>

    ${buildSelectorsBar({
      controls: [aforeSelect],
      applyButtonId: 'flu-serie-apply',
      applyButtonLabel: 'Ver serie',
    })}

    <section class="kpis" aria-label="Indicadores de la serie histórica">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Entradas último mes</div>
        <div class="kpi-value" id="flu-serie-kpi-ent">—</div>
        <div class="kpi-sub" id="flu-serie-kpi-actual-sub">último mes reportado</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Salidas último mes</div>
        <div class="kpi-value" id="flu-serie-kpi-sal">—</div>
        <div class="kpi-sub">millones MXN corrientes</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Flujo neto último mes</div>
        <div class="kpi-value" id="flu-serie-kpi-neto">—</div>
        <div class="kpi-sub">entradas − salidas</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Cobertura</div>
        <div class="kpi-value" id="flu-serie-kpi-n">—</div>
        <div class="kpi-sub">meses reportados</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Serie histórica AFORE seleccionada</h3>
      <span class="consar-toolbar-meta" id="flu-serie-meta">—</span>
    </div>
    ${tablaSerie}
    <div id="flu-serie-error" class="consar-error-banner" role="alert"></div>

    ${buildSourceFooter({
      unidad: 'Millones de pesos MXN corrientes (no deflactados).',
      fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
      fuenteUrl: 'https://datos.gob.mx',
      metodologia: 'Snapshot: una fila por AFORE en la fecha seleccionada. Serie: todas las fechas reportadas para una AFORE específica. Las cifras son contables sobre movimientos brutos del mes; NO incluyen efectos de valuación de mercado.',
      endpoint: '/api/v1/consar/flujos/{snapshot,serie}',
    })}
  `;
}

function buildScript(): string {
  return `
  <script>
  (function() {
    'use strict';
    ${buildConsarApiHelpers()}

    // Renderea valor con clase numérica + signo neto
    function tdNeto(v) {
      if (v == null) return '<td class="num">—</td>';
      var sign = v >= 0 ? '+' : '−';
      var abs = Math.abs(v);
      var cls = v >= 0 ? 'badge badge--negative' : 'badge badge--positive';
      // Nota: badge--negative es color verde (positivo financiero), badge--positive rojo
      return '<td class="num"><span class="' + cls + '">' + sign + Number(abs).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span></td>';
    }

    // ----- Snapshot -----
    var snapMonth = document.getElementById('flu-snap-fecha');
    var snapApply = document.getElementById('flu-snap-apply');

    function loadSnap() {
      var fecha = snapMonth.value;
      if (!fecha) return;
      clearError('flu-snap-error');
      snapApply.disabled = true;
      fetchJson('/flujos/snapshot?fecha=' + encodeURIComponent(fecha))
        .then(function(d) {
          setKpi('flu-snap-kpi-ent', fmtMm(d.sistema_entradas_mm));
          setKpi('flu-snap-kpi-sal', fmtMm(d.sistema_salidas_mm));
          setKpi('flu-snap-kpi-neto', (d.sistema_flujo_neto_mm >= 0 ? '+' : '−') + fmtMm(Math.abs(d.sistema_flujo_neto_mm)).slice(1));
          setKpi('flu-snap-kpi-fecha', d.fecha);
          setKpi('flu-snap-kpi-n', String(d.n_afores_reportando));
          var sub = d.sistema_flujo_neto_mm >= 0 ? 'sistema en captación neta' : 'sistema en salida neta';
          setKpi('flu-snap-kpi-neto-sub', sub);

          var afores = (d.afores || []).slice().sort(function(a, b) {
            return (b.flujo_neto || 0) - (a.flujo_neto || 0);
          });
          var tbody = document.querySelector('#flu-snap-table tbody');
          if (afores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="consar-table-loading">Sin datos para esta fecha.</td></tr>';
          } else {
            tbody.innerHTML = afores.map(function(a) {
              var tipoBadge = a.tipo_pension === 'publica'
                ? '<span class="badge badge--neutral">pública</span>'
                : '<span class="badge badge--neutral">privada</span>';
              return '<tr>' +
                '<td><strong>' + escapeHtml(a.afore_nombre_corto) + '</strong></td>' +
                '<td>' + tipoBadge + '</td>' +
                '<td class="num">' + fmtN(a.montos_entradas, 2) + '</td>' +
                '<td class="num">' + fmtN(a.montos_salidas, 2) + '</td>' +
                tdNeto(a.flujo_neto) +
              '</tr>';
            }).join('');
          }

          setText('#flu-snap-meta', d.fecha + ' · ' + d.n_afores_reportando + ' AFOREs · ' + d.unit);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('flu-snap-error', 'No se pudo cargar el snapshot: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          snapApply.disabled = false;
        });
    }
    snapApply.addEventListener('click', loadSnap);

    // ----- Serie -----
    var serieAfore = document.getElementById('flu-serie-afore');
    var serieApply = document.getElementById('flu-serie-apply');

    function loadSerie() {
      var afore = serieAfore.value;
      if (!afore) return;
      clearError('flu-serie-error');
      serieApply.disabled = true;
      fetchJson('/flujos/serie?afore_codigo=' + encodeURIComponent(afore))
        .then(function(d) {
          var s = d.serie || [];
          var last = s[s.length - 1];
          if (last) {
            setKpi('flu-serie-kpi-ent', fmtN(last.montos_entradas, 2));
            setKpi('flu-serie-kpi-sal', fmtN(last.montos_salidas, 2));
            setKpi('flu-serie-kpi-neto', (last.flujo_neto >= 0 ? '+' : '−') + fmtN(Math.abs(last.flujo_neto), 2));
            setKpi('flu-serie-kpi-actual-sub', last.fecha.slice(0, 7));
          }
          setKpi('flu-serie-kpi-n', fmtN(d.n_puntos));

          var tbody = document.querySelector('#flu-serie-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                '<td class="num">' + fmtN(r.montos_entradas, 2) + '</td>' +
                '<td class="num">' + fmtN(r.montos_salidas, 2) + '</td>' +
                tdNeto(r.flujo_neto) +
              '</tr>';
            }).join('');
          }

          setText('#flu-serie-meta', d.afore.nombre_corto + ' · ' + d.n_puntos + ' meses · ' + d.rango.desde + ' → ' + d.rango.hasta);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('flu-serie-error', 'No se pudo cargar la serie: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          serieApply.disabled = false;
        });
    }
    serieApply.addEventListener('click', loadSerie);

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
