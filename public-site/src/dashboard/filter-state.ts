export function buildFilterStateScript(): string {
  return `
  <script>
  (function() {
    var FILTER_KEYS = [
      'sector_id', 'sexo', 'edad_min', 'edad_max',
      'sueldo_min', 'sueldo_max',
      'tipo_contratacion_id', 'tipo_personal_id', 'universo_id',
      'puesto_search'
    ];

    function readFromURL() {
      var params = new URLSearchParams(window.location.search);
      var f = {};
      FILTER_KEYS.forEach(function(k) {
        var v = params.get(k);
        if (v !== null && v !== '') f[k] = v;
      });
      return f;
    }

    function toQS(f) {
      var params = new URLSearchParams();
      Object.keys(f).forEach(function(k) {
        if (f[k] !== undefined && f[k] !== null && f[k] !== '') {
          params.set(k, f[k]);
        }
      });
      return params.toString();
    }

    function pushToURL(f) {
      var qs = toQS(f);
      var newUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
      window.history.pushState({ filters: f }, '', newUrl);
    }

    // Global singleton
    window.__filterState = {
      current: readFromURL(),
      keys: FILTER_KEYS,
      set: function(key, value) {
        if (value === undefined || value === null || value === '') {
          delete this.current[key];
        } else {
          this.current[key] = String(value);
        }
        pushToURL(this.current);
        this.emit();
      },
      setMany: function(patch) {
        var self = this;
        Object.keys(patch).forEach(function(k) {
          var v = patch[k];
          if (v === undefined || v === null || v === '') delete self.current[k];
          else self.current[k] = String(v);
        });
        pushToURL(self.current);
        self.emit();
      },
      reset: function() {
        this.current = {};
        pushToURL({});
        this.emit();
      },
      toQS: function() { return toQS(this.current); },
      get: function(key) { return this.current[key]; },
      isEmpty: function() { return Object.keys(this.current).length === 0; },
      emit: function() {
        window.dispatchEvent(new CustomEvent('filters:changed', { detail: this.current }));
      }
    };

    // Sync to URL popstate (back/forward)
    window.addEventListener('popstate', function() {
      window.__filterState.current = readFromURL();
      window.__filterState.emit();
    });
  })();
  <\/script>
  `;
}
