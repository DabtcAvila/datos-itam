// Sub-sección /consar/traspasos — dataset CONSAR #08
//
// Endpoints:
//   GET /api/v1/consar/traspasos/snapshot?fecha=YYYY-MM
//   GET /api/v1/consar/traspasos/serie?afore_codigo=X[&desde&hasta]
//
// Cobertura: 1998-11 → 2025-06 (320 meses) × 10 AFOREs commercial.
// Identidad sistema-wide Σ cedidos = Σ recibidos cierra exacto desde 2019.

import { buildTable } from '../shared/table';
import { buildHeroCaveats, buildSourceFooter } from '../shared/caveats';
import { buildConsarApiHelpers } from '../shared/api';
import { buildAforeSelect, buildMonthInput, buildSelectorsBar } from '../shared/selectors';

export function buildTraspasos() {
  return {
    title: 'CONSAR · Traspasos — cuentas movidas entre AFOREs',
    metaDescription:
      'Traspasos de cuentas entre AFOREs. Snapshot mensual + serie histórica. Identidad Σ cedidos = Σ recibidos cierra exacto desde 2019. Cobertura 1998-11 → 2025-06 (320 meses) × 10 AFOREs.',
    hero: buildHero(),
    body: buildBody(),
    script: buildScript(),
  };
}

function buildHero(): string {
  return `
    <section class="hero">
      <div class="hero-text">
        <h1 style="font-size:1.4rem;margin-bottom:0.4rem">Traspasos — cuentas movidas entre AFOREs</h1>
        <p>
          Cuentas que un afiliado decide mover de una AFORE a otra. La serie cubre <strong>320 meses</strong>,
          de noviembre 1998 a junio 2025. Cada traspaso aparece dos veces en el reporting CONSAR: como cuenta
          cedida por la AFORE de origen y como cuenta recibida por la AFORE de destino. La diferencia
          recibidas − cedidas es el traspaso neto del mes para cada AFORE.
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Cobertura 1998-11 → 2025-06 · 320 meses</span>
        <span class="hero-badge">10 AFOREs reportando</span>
        <span class="hero-badge">2 endpoints · snapshot + serie</span>
      </div>
    </section>

    ${buildHeroCaveats({
      title: 'Hallazgos factuales del dataset',
      items: [
        {
          text: '<strong>Identidad sistema-wide Σ cedidos = Σ recibidos cierra exacto (delta = 0) desde 2019</strong> — siete años consecutivos de cierre al unidad. 2017-2018 cerraban dentro de 1 cuenta de diferencia. Pre-2017 amplio residuo (88-156%) durante la fase de maduración del reporting CONSAR.',
        },
        {
          text: '<strong>Junio 2025: 168,132 cuentas cedidas = 168,132 cuentas recibidas (delta = 0)</strong>. AFORE con mayor traspaso neto positivo: SURA +11,862 cuentas. AFORE con mayor traspaso neto negativo: Coppel −25,654 cuentas. La tabla del snapshot muestra el desglose completo.',
        },
        {
          text: '<strong>El conteo es de cuentas, no de saldos administrados</strong> — un traspaso mueve una cuenta entre AFOREs sin implicar un valor monetario reportado en este dataset. Para los movimientos en pesos, ver Flujos (#04). Para los saldos por cohorte, ver Activo neto (#07).',
          emphasis: true,
        },
      ],
    })}
  `;
}

function buildBody(): string {
  const aforeSelect = buildAforeSelect({
    id: 'tra-serie-afore',
    label: 'AFORE',
    defaultValue: 'profuturo',
    exclude: ['pension_bienestar'],
  });
  const monthInput = buildMonthInput({
    id: 'tra-snap-fecha',
    label: 'Fecha (mes)',
    defaultValue: '2025-06',
    min: '1998-11',
    max: '2025-06',
  });

  const tablaSnap = buildTable({
    id: 'tra-snap-table',
    columns: [
      { key: 'afore',     label: 'AFORE',                   align: 'left'  },
      { key: 'tipo',      label: 'Tipo pensión',            align: 'left'  },
      { key: 'cedido',    label: 'Cuentas cedidas',         align: 'right' },
      { key: 'recibido',  label: 'Cuentas recibidas',       align: 'right' },
      { key: 'neto',      label: 'Traspaso neto',           align: 'right' },
    ],
    loadingText: 'Cargando snapshot…',
  });

  const tablaSerie = buildTable({
    id: 'tra-serie-table',
    columns: [
      { key: 'fecha',     label: 'Fecha',             align: 'left'  },
      { key: 'cedido',    label: 'Cedidas',           align: 'right' },
      { key: 'recibido',  label: 'Recibidas',         align: 'right' },
      { key: 'neto',      label: 'Neto',              align: 'right' },
    ],
    loadingText: 'Cargando serie histórica…',
  });

  return `
    <h2 class="section-title">Snapshot mensual — todas las AFOREs en una fecha</h2>

    ${buildSelectorsBar({
      controls: [monthInput],
      applyButtonId: 'tra-snap-apply',
      applyButtonLabel: 'Ver snapshot',
    })}

    <section class="kpis" aria-label="Indicadores agregados del snapshot">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Cuentas cedidas</div>
        <div class="kpi-value" id="tra-snap-kpi-ced">—</div>
        <div class="kpi-sub" id="tra-snap-kpi-fecha">fecha del snapshot</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Cuentas recibidas</div>
        <div class="kpi-value" id="tra-snap-kpi-rec">—</div>
        <div class="kpi-sub">total sistema en la fecha</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Delta (cedidas − recibidas)</div>
        <div class="kpi-value" id="tra-snap-kpi-delta">—</div>
        <div class="kpi-sub" id="tra-snap-kpi-cierre">identidad cierre</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">AFOREs reportando</div>
        <div class="kpi-value" id="tra-snap-kpi-n">—</div>
        <div class="kpi-sub">en la fecha seleccionada</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Tabla por AFORE — fecha seleccionada</h3>
      <span class="consar-toolbar-meta" id="tra-snap-meta">—</span>
    </div>
    ${tablaSnap}
    <div id="tra-snap-error" class="consar-error-banner" role="alert"></div>

    <h2 class="section-title" style="margin-top:2rem">Serie histórica — una AFORE en el tiempo</h2>

    ${buildSelectorsBar({
      controls: [aforeSelect],
      applyButtonId: 'tra-serie-apply',
      applyButtonLabel: 'Ver serie',
    })}

    <section class="kpis" aria-label="Indicadores de la serie histórica">
      <div class="kpi kpi--blue">
        <div class="kpi-label">Cedidas último mes</div>
        <div class="kpi-value" id="tra-serie-kpi-ced">—</div>
        <div class="kpi-sub" id="tra-serie-kpi-actual-sub">último mes reportado</div>
      </div>
      <div class="kpi kpi--green">
        <div class="kpi-label">Recibidas último mes</div>
        <div class="kpi-value" id="tra-serie-kpi-rec">—</div>
        <div class="kpi-sub">conteo en cuentas</div>
      </div>
      <div class="kpi kpi--yellow">
        <div class="kpi-label">Neto último mes</div>
        <div class="kpi-value" id="tra-serie-kpi-neto">—</div>
        <div class="kpi-sub">recibidas − cedidas</div>
      </div>
      <div class="kpi kpi--purple">
        <div class="kpi-label">Cobertura</div>
        <div class="kpi-value" id="tra-serie-kpi-n">—</div>
        <div class="kpi-sub">meses reportados</div>
      </div>
    </section>

    <div class="consar-toolbar">
      <h3>Serie histórica AFORE seleccionada</h3>
      <span class="consar-toolbar-meta" id="tra-serie-meta">—</span>
    </div>
    ${tablaSerie}
    <div id="tra-serie-error" class="consar-error-banner" role="alert"></div>

    ${buildSourceFooter({
      unidad: 'Conteo de cuentas (entero, no saldo monetario).',
      fuente: 'CONSAR vía datos.gob.mx (CC-BY-4.0)',
      fuenteUrl: 'https://datos.gob.mx',
      metodologia: 'Snapshot: una fila por AFORE en la fecha seleccionada con identidad sistema-wide. Serie: todas las fechas reportadas para una AFORE específica con neto = recibidas − cedidas.',
      endpoint: '/api/v1/consar/traspasos/{snapshot,serie}',
    })}
  `;
}

function buildScript(): string {
  return `
  <script>
  (function() {
    'use strict';
    ${buildConsarApiHelpers()}

    function tdNetoCuentas(v) {
      if (v == null) return '<td class="num">—</td>';
      var sign = v >= 0 ? '+' : '−';
      var cls = v >= 0 ? 'badge badge--negative' : 'badge badge--positive';
      // Convención S9: badge--negative=verde (positivo), badge--positive=rojo (negativo)
      return '<td class="num"><span class="' + cls + '">' + sign + Number(Math.abs(v)).toLocaleString('es-MX') + '</span></td>';
    }

    // ----- Snapshot -----
    var snapMonth = document.getElementById('tra-snap-fecha');
    var snapApply = document.getElementById('tra-snap-apply');

    function loadSnap() {
      var fecha = snapMonth.value;
      if (!fecha) return;
      clearError('tra-snap-error');
      snapApply.disabled = true;
      fetchJson('/traspasos/snapshot?fecha=' + encodeURIComponent(fecha))
        .then(function(d) {
          var ide = d.identidad || {};
          setKpi('tra-snap-kpi-ced', fmtN(ide.sistema_total_cedido));
          setKpi('tra-snap-kpi-rec', fmtN(ide.sistema_total_recibido));
          var delta = ide.delta;
          setKpi('tra-snap-kpi-delta', delta == null ? '—' : (delta === 0 ? '0' : (delta > 0 ? '+' : '−') + fmtN(Math.abs(delta))));
          setKpi('tra-snap-kpi-cierre', ide.cierre_al_unidad ? 'cierre exacto al unidad' : 'identidad con residuo');
          setKpi('tra-snap-kpi-fecha', d.fecha);
          setKpi('tra-snap-kpi-n', String(d.n_afores_reportando));

          var afores = (d.afores || []).slice().sort(function(a, b) {
            return (b.traspaso_neto || 0) - (a.traspaso_neto || 0);
          });
          var tbody = document.querySelector('#tra-snap-table tbody');
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
                '<td class="num">' + fmtN(a.num_tras_cedido) + '</td>' +
                '<td class="num">' + fmtN(a.num_tras_recibido) + '</td>' +
                tdNetoCuentas(a.traspaso_neto) +
              '</tr>';
            }).join('');
          }

          setText('#tra-snap-meta', d.fecha + ' · ' + d.n_afores_reportando + ' AFOREs · identidad delta = ' + (delta == null ? '—' : delta));
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('tra-snap-error', 'No se pudo cargar el snapshot: ' + (err && err.message ? err.message : err));
        })
        .finally(function() {
          snapApply.disabled = false;
        });
    }
    snapApply.addEventListener('click', loadSnap);

    // ----- Serie -----
    var serieAfore = document.getElementById('tra-serie-afore');
    var serieApply = document.getElementById('tra-serie-apply');

    function loadSerie() {
      var afore = serieAfore.value;
      if (!afore) return;
      clearError('tra-serie-error');
      serieApply.disabled = true;
      fetchJson('/traspasos/serie?afore_codigo=' + encodeURIComponent(afore))
        .then(function(d) {
          var s = d.serie || [];
          var last = s[s.length - 1];
          if (last) {
            setKpi('tra-serie-kpi-ced', fmtN(last.num_tras_cedido));
            setKpi('tra-serie-kpi-rec', fmtN(last.num_tras_recibido));
            setKpi('tra-serie-kpi-neto', last.traspaso_neto == null ? '—' : ((last.traspaso_neto >= 0 ? '+' : '−') + fmtN(Math.abs(last.traspaso_neto))));
            setKpi('tra-serie-kpi-actual-sub', last.fecha.slice(0, 7));
          }
          setKpi('tra-serie-kpi-n', fmtN(d.n_puntos));

          var tbody = document.querySelector('#tra-serie-table tbody');
          if (s.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="consar-table-loading">Sin serie reportada.</td></tr>';
          } else {
            var sortedDesc = s.slice().reverse();
            tbody.innerHTML = sortedDesc.map(function(r) {
              return '<tr>' +
                '<td>' + escapeHtml(r.fecha) + '</td>' +
                '<td class="num">' + fmtN(r.num_tras_cedido) + '</td>' +
                '<td class="num">' + fmtN(r.num_tras_recibido) + '</td>' +
                tdNetoCuentas(r.traspaso_neto) +
              '</tr>';
            }).join('');
          }

          setText('#tra-serie-meta', d.afore.nombre_corto + ' · ' + d.n_puntos + ' meses · ' + d.rango.desde + ' → ' + d.rango.hasta);
          markLive('consarLiveBadge');
        })
        .catch(function(err) {
          showError('tra-serie-error', 'No se pudo cargar la serie: ' + (err && err.message ? err.message : err));
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
