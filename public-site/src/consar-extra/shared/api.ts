// Helper compartido para fetch al API de producción desde sub-secciones CONSAR.
// El módulo se inyecta dentro del <script> inline del HTML SSR, no se importa
// como ESM en el cliente — por eso retorna una cadena con el cuerpo JS.

export const CONSAR_API_BASE = 'https://api.datos-itam.org/api/v1/consar';

// Snippet JS reutilizable que define fetchJson + helpers de formato.
// Se inserta una sola vez al inicio del <script> de cada página.
export function buildConsarApiHelpers(): string {
  return `
  var API_BASE = ${JSON.stringify(CONSAR_API_BASE)};
  var TIMEOUT_MS = 12000;

  function fetchJson(path) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function() { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    return fetch(API_BASE + path, ctrl ? { signal: ctrl.signal } : {})
      .then(function(r) {
        clearTimeout(timer);
        if (!r.ok) {
          return r.json().catch(function() { return null; }).then(function(body) {
            var detail = body && body.detail ? body.detail : 'HTTP ' + r.status;
            throw new Error(detail);
          });
        }
        return r.json();
      });
  }

  function fmtN(v, decimals) {
    if (v == null) return '—';
    decimals = decimals == null ? 0 : decimals;
    return Number(v).toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function fmtPct(v, decimals) {
    if (v == null) return '—';
    decimals = decimals == null ? 2 : decimals;
    return Number(v).toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
  }
  function fmtMm(v) {
    if (v == null) return '—';
    if (Math.abs(v) >= 1000000) return '$' + (v / 1000000).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' bill';
    return '$' + Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' mm';
  }
  function fmtMxn(v, decimals) {
    if (v == null) return '—';
    decimals = decimals == null ? 0 : decimals;
    return '$' + Number(v).toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function setKpi(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setText(selector, text) {
    var el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function showError(panelId, msg) {
    var el = document.getElementById(panelId);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('active');
  }
  function clearError(panelId) {
    var el = document.getElementById(panelId);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('active');
  }

  function markLive(badgeId) {
    var b = document.getElementById(badgeId);
    if (b) b.classList.add('active');
  }
  `;
}
