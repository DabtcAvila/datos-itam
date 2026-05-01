// Sub-sección /consar/pea-cotizantes — dataset CONSAR #02
//
// Endpoint único: GET /api/v1/consar/pea-cotizantes/serie
// Shape: {n_puntos, anio_min, anio_max, serie: [{anio, cotizantes, pea, porcentaje_pea_afore, brecha_no_cubierta_pct}]}
// Cobertura: 2010-2024 (15 puntos anuales).
// NO requiere selectores — la serie completa es pequeña y estable.

import { buildTable } from '../shared/table';
import { buildHeroCaveats, buildSourceFooter } from '../shared/caveats';
import { buildConsarApiHelpers } from '../shared/api';

export interface PeaCotizantesPage {
  title: string;
  metaDescription: string;
  hero: string;
  body: string;
  script: string;
}

export function buildPeaCotizantes(): PeaCotizantesPage {
  return {
    title: 'CONSAR · PEA y cotizantes — cobertura formal del SAR',
    metaDescription:
      'Cobertura formal del SAR sobre la Población Económicamente Activa mexicana, 2010-2024. ' +
      'Serie anual: cotizantes, PEA, ratio de cobertura y brecha no cubierta.',
    hero: buildHero(),
    body: buildBody(),
    script: buildScript(),
  };
}

// ---------------------------------------------------------------------
// Hero — copy descriptivo factual (disciplina S13)
// ---------------------------------------------------------------------

function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-text">
        <h1 style="font-size:1.4rem;margin-bottom:0.4rem">PEA y cotizantes — cobertura formal del SAR</h1>
        <p>
          Cobertura formal del Sistema de Ahorro para el Retiro (SAR) sobre la Población Económicamente Activa
          (PEA) mexicana. La serie cubre <strong>15 años anuales</strong>, de 2010 a 2024, y reporta cotizantes,
          PEA y el ratio entre ambos. Reportada por CONSAR sobre datos INEGI-ENOE.
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Cobertura 2010-2024 · 15 puntos anuales</span>
        <span class="hero-badge">Granularidad: año fiscal</span>
        <span class="hero-badge">1 endpoint · sin selectores</span>
      </div>
    </section>

    ${buildHeroCaveats({
      title: 'Hallazgos factuales del dataset',
      items: [
        {
          text: '<strong>Rango observado [40.40%, 48.40%]</strong> — el ratio cotizantes / PEA osciló dentro de esta banda durante los 15 años. Mínimo 2011 (40.40%); pico 2018 (48.40%). 2024 = 47.69%.',
        },
        {
          text: '<strong>Trayectoria no monotónica</strong> — ascenso 2010-2018, descenso 2019-2021, estabilización ~47-48% en 2022-2024. Las observaciones son anuales puntuales (no promedios móviles).',
        },
        {
          text: '<strong>Brecha siempre &gt;50%</strong> — en los 15 años de cobertura, la fracción de la PEA que NO se reporta como cotizante al SAR no bajó del 51.6%.',
          emphasis: true,
        },
      ],
    })}
  `;
}

// ---------------------------------------------------------------------
// Body — KPI bar + tabla
// ---------------------------------------------------------------------

function buildBody(): string {
  const tableHtml = buildTable({
    id: 'pea-table',
    columns: [
      { key: 'anio',                  label: 'Año',                    align: 'left'  },
      { key: 'cotizantes',            label: 'Cotizantes',             align: 'right' },
      { key: 'pea',                   label: 'PEA total',              align: 'right' },
      { key: 'porcentaje_pea_afore',  label: 'Cobertura SAR (%)',      align: 'right' },
      { key: 'brecha_no_cubierta_pct', label: 'Brecha no cubierta (%)', align: 'right' },
    ],
    loadingText: 'Cargando serie 2010-2024…',
    caption: 'Tabla anual: cotizantes, PEA, cobertura y brecha — 15 filas',
  });

  return `
    <!-- KPI bar (4 chips) -->
    <section class="kpis" aria-label="Indicadores agregados de cobertura SAR">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Cobertura último año</div>
        <div class="kpi-value" id="pea-kpi-ultimo">—</div>
        <div class="kpi-sub" id="pea-kpi-ultimo-sub">año reportado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Pico histórico</div>
        <div class="kpi-value" id="pea-kpi-pico">—</div>
        <div class="kpi-sub" id="pea-kpi-pico-sub">año del pico</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Mínimo histórico</div>
        <div class="kpi-value" id="pea-kpi-min">—</div>
        <div class="kpi-sub" id="pea-kpi-min-sub">año del mínimo</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Brecha último año</div>
        <div class="kpi-value" id="pea-kpi-brecha">—</div>
        <div class="kpi-sub" id="pea-kpi-brecha-sub">% PEA fuera del SAR</div>
      </div>
    </section>

    <!-- Tabla con toolbar de refresh -->
    <section style="margin-top:1.5rem">
      <div class="consar-toolbar">
        <h3>Serie anual cotizantes / PEA — 2010-2024</h3>
        <div style="display:flex;align-items:center;gap:0.85rem;flex-wrap:wrap">
          <span class="consar-toolbar-meta">Última actualización: <span id="pea-last-update">—</span></span>
          <button type="button" id="pea-refresh" class="consar-refresh-btn">Refrescar</button>
        </div>
      </div>
      ${tableHtml}
      <div id="pea-error" class="consar-error-banner" role="alert"></div>
    </section>

    ${buildSourceFooter({
      unidad: 'Cotizantes y PEA en personas; cobertura y brecha en porcentaje (0-100).',
      fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
      fuenteUrl: 'https://datos.gob.mx',
      metodologia: 'Ingesta directa del CSV oficial datosgob_02_pea_vs_cotizantes_datos_abiertos_2024.csv (15 filas anuales). Las cifras de cotizantes y PEA se entregan tal como las publica CONSAR; cobertura = cotizantes / PEA × 100; brecha = 100 − cobertura.',
      endpoint: '/api/v1/consar/pea-cotizantes/serie',
    })}
  `;
}

// ---------------------------------------------------------------------
// Script — fetch + render
// ---------------------------------------------------------------------

function buildScript(): string {
  return `
  <script>
  (function() {
    'use strict';
    ${buildConsarApiHelpers()}

    var refreshBtn = document.getElementById('pea-refresh');
    var lastUpdate = document.getElementById('pea-last-update');

    function renderTable(serie) {
      var tbody = document.querySelector('#pea-table tbody');
      if (!tbody) return;
      if (!serie || !serie.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="consar-table-loading">Sin datos.</td></tr>';
        return;
      }
      tbody.innerHTML = serie.map(function(r) {
        return '<tr>' +
          '<td><strong>' + r.anio + '</strong></td>' +
          '<td class="num">' + fmtN(r.cotizantes) + '</td>' +
          '<td class="num">' + fmtN(r.pea) + '</td>' +
          '<td class="num"><strong>' + fmtPct(r.porcentaje_pea_afore, 2) + '</strong></td>' +
          '<td class="num">' + fmtPct(r.brecha_no_cubierta_pct, 2) + '</td>' +
        '</tr>';
      }).join('');
    }

    function renderKpis(serie) {
      if (!serie || !serie.length) return;
      // último año
      var last = serie[serie.length - 1];
      setKpi('pea-kpi-ultimo', fmtPct(last.porcentaje_pea_afore, 2));
      setKpi('pea-kpi-ultimo-sub', String(last.anio));
      setKpi('pea-kpi-brecha', fmtPct(last.brecha_no_cubierta_pct, 2));
      setKpi('pea-kpi-brecha-sub', 'PEA fuera del SAR · ' + last.anio);

      // pico
      var pico = serie.reduce(function(a, b) { return b.porcentaje_pea_afore > a.porcentaje_pea_afore ? b : a; }, serie[0]);
      setKpi('pea-kpi-pico', fmtPct(pico.porcentaje_pea_afore, 2));
      setKpi('pea-kpi-pico-sub', 'Año ' + pico.anio);

      // mínimo
      var minR = serie.reduce(function(a, b) { return b.porcentaje_pea_afore < a.porcentaje_pea_afore ? b : a; }, serie[0]);
      setKpi('pea-kpi-min', fmtPct(minR.porcentaje_pea_afore, 2));
      setKpi('pea-kpi-min-sub', 'Año ' + minR.anio);
    }

    function load() {
      clearError('pea-error');
      refreshBtn.disabled = true;
      fetchJson('/pea-cotizantes/serie')
        .then(function(d) {
          if (!d || !Array.isArray(d.serie)) throw new Error('Respuesta inesperada del API');
          renderKpis(d.serie);
          renderTable(d.serie);
          var now = new Date();
          lastUpdate.textContent = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('pea-error', 'No se pudo cargar la serie: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          refreshBtn.disabled = false;
        });
    }

    refreshBtn.addEventListener('click', load);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', load);
    } else {
      load();
    }
  })();
  </script>
  `;
}
