// CSS extra para sub-secciones /consar/<slug>.
// Se inyecta DESPUÉS del CSS global (styles.ts) para que las clases
// más específicas tomen precedencia. Variables CSS reutilizadas:
// --bg, --bg-card, --bg-hover, --border, --text, --text-secondary,
// --text-muted, --accent, --accent-dim, --green, --green-dim, --red,
// --red-dim, --yellow, --yellow-dim, --purple.

export const CONSAR_EXTRA_CSS = `
/* ===== Sub-nav nivel-2 (capítulos narrativos + pills horizontales) ===== */
.consar-subnav {
  display: flex;
  gap: 1.4rem;
  padding: 0.85rem 2rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  overflow-x: auto;
  scrollbar-width: none;
}
.consar-subnav::-webkit-scrollbar { display: none; }

.consar-subnav-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex-shrink: 0;
  position: relative;
}
.consar-subnav-group + .consar-subnav-group::before {
  content: "";
  position: absolute;
  left: -0.7rem;
  top: 0.25rem;
  bottom: 0.25rem;
  width: 1px;
  background: var(--border);
}
.consar-subnav-chapter {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 700;
  padding-left: 0.15rem;
  white-space: nowrap;
}
.consar-subnav-pills {
  display: flex;
  gap: 0.4rem;
}

.consar-subnav-pill {
  display: inline-flex;
  align-items: baseline;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.consar-subnav-pill:hover {
  color: var(--text);
  border-color: var(--accent);
}
.consar-subnav-pill.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-dim);
}

@media (max-width: 720px) {
  .consar-subnav {
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.7rem 1rem;
    overflow-x: visible;
  }
  .consar-subnav-group + .consar-subnav-group::before { display: none; }
  .consar-subnav-pills {
    overflow-x: auto;
    scrollbar-width: none;
    flex-wrap: nowrap;
  }
  .consar-subnav-pills::-webkit-scrollbar { display: none; }
  .consar-subnav-pill { padding: 0.35rem 0.65rem; font-size: 0.75rem; }
}

/* ===== Hero caveats (bloque inline cerca del hero) ===== */
.consar-hero-caveats {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 2px solid var(--accent);
  border-radius: 6px;
  padding: 0.85rem 1rem;
  margin: 1rem 0 1.5rem;
  max-width: 880px;
}
.consar-hero-caveats-title {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.45rem;
  font-weight: 600;
}
.consar-hero-caveats-list {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
  padding-left: 1.2rem;
  margin: 0;
}
.consar-hero-caveats-list li { margin-bottom: 0.35rem; }
.consar-hero-caveats-list li:last-child { margin-bottom: 0; }
.consar-hero-caveats-list strong { color: var(--text); }
.consar-hero-caveats-list code {
  background: var(--bg);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-size: 0.8rem;
}
.consar-hero-caveat-item--emph {
  border-left: 2px solid var(--yellow);
  padding-left: 0.6rem;
  margin-left: -0.6rem;
}

/* ===== Selectors bar ===== */
.consar-selectors-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: flex-end;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  margin-bottom: 1.5rem;
}
.consar-selector {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}
.consar-selector-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.consar-selector-input {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
  font-size: 0.85rem;
  font-family: inherit;
  min-width: 160px;
  appearance: auto;
}
.consar-selector-input:focus {
  outline: none;
  border-color: var(--accent);
}
.consar-apply-btn {
  background: var(--accent);
  color: white;
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 0.55rem 1.1rem;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: filter 0.15s, transform 0.05s;
  align-self: flex-end;
  height: 38px;
}
.consar-apply-btn:hover { filter: brightness(1.08); }
.consar-apply-btn:active { transform: translateY(1px); }
.consar-apply-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 560px) {
  .consar-selector { flex: 1 1 calc(50% - 0.5rem); min-width: 0; }
  .consar-selector-input { min-width: 0; width: 100%; }
  .consar-apply-btn { width: 100%; }
}

/* ===== Tabla del dataset ===== */
.consar-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.consar-table-loading {
  text-align: center;
  color: var(--text-muted);
  padding: 1.5rem;
  font-style: italic;
}
.consar-table tbody tr.consar-table-row-warning td {
  background: rgba(234, 179, 8, 0.04);
}

/* ===== Mapping flag badge ===== */
.consar-mapping-badge {
  display: inline-block;
  padding: 0.1rem 0.55rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}
.consar-mapping-badge--confirmed {
  background: var(--green-dim);
  color: var(--green);
}
.consar-mapping-badge--inferred {
  background: var(--yellow-dim);
  color: var(--yellow);
  cursor: help;
}

/* ===== Source footer ===== */
.consar-source-footer {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.85rem 1rem;
  margin-top: 1.5rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.7;
}
.consar-source-row { padding: 0.1rem 0; }
.consar-source-row strong { color: var(--text-secondary); margin-right: 0.4rem; }
.consar-source-row a {
  color: var(--accent);
  text-decoration: none;
}
.consar-source-row a:hover { text-decoration: underline; }
.consar-source-row code {
  background: var(--bg);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-size: 0.78rem;
}

/* ===== Error banner inline (sub-section) ===== */
.consar-error-banner {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid var(--red);
  color: var(--red);
  border-radius: 6px;
  padding: 0.7rem 0.95rem;
  font-size: 0.85rem;
  margin: 1rem 0;
  display: none;
}
.consar-error-banner.active { display: block; }

/* ===== Refresh button (clonado de demo.ts pattern) ===== */
.consar-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}
.consar-toolbar h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}
.consar-toolbar-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}
.consar-refresh-btn {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.consar-refresh-btn:hover { border-color: var(--accent); color: var(--accent); }
.consar-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== Visually hidden (a11y) ===== */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

/* ===== Chart container (Phase D — comparativo multi-line) ===== */
.consar-chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem 1rem 0.85rem;
  margin: 0.5rem 0 1.25rem;
}
.consar-chart-wrap {
  position: relative;
  width: 100%;
  height: 420px;
}
.consar-chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-style: italic;
  text-align: center;
  padding: 0 1rem;
}
@media (max-width: 720px) {
  .consar-chart-wrap { height: 320px; }
}

/* ===== Dataset cards agrupadas por capítulo (Phase E + sub-fase narrativa) ===== */
.consar-cards-chapter {
  margin: 1.5rem 0 0;
}
.consar-cards-chapter:first-of-type { margin-top: 1rem; }
.consar-cards-chapter-head {
  margin-bottom: 0.7rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}
.consar-cards-chapter-title {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  font-weight: 700;
  margin: 0 0 0.2rem 0;
}
.consar-cards-chapter-intro {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.consar-dataset-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}
@media (max-width: 960px) {
  .consar-dataset-cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .consar-dataset-cards-grid { grid-template-columns: 1fr; }
}

.consar-dataset-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.95rem 1rem 0.85rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, transform 0.05s, background 0.15s;
  min-width: 0;
}
.consar-dataset-card:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}
.consar-dataset-card:hover .consar-dataset-card-cta { color: var(--accent); }
.consar-dataset-card:active { transform: translateY(1px); }
.consar-dataset-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.consar-dataset-card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.01em;
}
.consar-dataset-card-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}
.consar-dataset-card-cta {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-top: auto;
  transition: color 0.15s;
}

/* ===== Comparativo cross-afore table (wide) ===== */
.consar-table-cross {
  font-size: 0.78rem;
}
.consar-table-cross thead th {
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 1;
  white-space: nowrap;
}
.consar-table-cross td.consar-precio-null {
  color: var(--text-muted);
  font-style: italic;
}
.consar-table-cross-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 6px;
  max-height: 420px;
  overflow-y: auto;
}
`;
