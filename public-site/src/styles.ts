export const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #0a0a0a;
  --bg-card: #141414;
  --bg-hover: #1a1a1a;
  --border: #262626;
  --text: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --accent: #3b82f6;
  --accent-dim: #1e3a5f;
  --green: #22c55e;
  --green-dim: #14532d;
  --red: #ef4444;
  --red-dim: #7f1d1d;
  --yellow: #eab308;
  --yellow-dim: #713f12;
  --purple: #a855f7;
  --purple-dim: #581c87;
  --pink: #ec4899;
  --pink-dim: #831843;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* Header */
.header {
  border-bottom: 1px solid var(--border);
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-brand {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.header-brand span { color: var(--accent); }

.header-subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.header-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.header-badge {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg-card);
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--border);
}

/* Container */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Hero */
.hero {
  margin-bottom: 1.5rem;
}

.hero-text {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 800px;
}

.hero-text strong {
  color: var(--text);
}

.hero-badges {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.hero-badge {
  font-size: 0.7rem;
  color: var(--accent);
  background: var(--accent-dim);
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

/* Insights */
.insights {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.insights-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.5rem;
}

.insight {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.insight strong {
  color: var(--text);
}

.insight-icon {
  color: var(--accent);
  font-size: 0.5rem;
  flex-shrink: 0;
  position: relative;
  top: -1px;
}

/* Bruto vs Neto */
.bruto-neto-summary {
  margin-bottom: 1rem;
}

.bn-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
}

.bn-row:last-child { border-bottom: none; }
.bn-label { color: var(--text-muted); }
.bn-value { font-weight: 600; }
.bn-deduction .bn-value { color: var(--red); }

/* About section */
.about-section {
  margin-bottom: 1.5rem;
}

.about-section h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.about-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
}

.about-card-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.about-card p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.about-card a {
  color: var(--accent);
  text-decoration: none;
}

.about-card strong {
  color: var(--text);
}

/* KPI Cards */
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.kpi {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  transition: border-color 0.2s;
}

.kpi:hover { border-color: var(--accent); }

.kpi-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.kpi-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.kpi--blue .kpi-value { color: var(--accent); }
.kpi--green .kpi-value { color: var(--green); }
.kpi--yellow .kpi-value { color: var(--yellow); }
.kpi--purple .kpi-value { color: var(--purple); }

/* Sector filter */
.sector-filter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.sector-filter label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.sector-filter select {
  flex: 1;
  max-width: 500px;
  padding: 0.5rem 0.75rem;
  background: var(--bg-card);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  appearance: auto;
}

.sector-filter select:focus {
  outline: none;
  border-color: var(--accent);
}

.sector-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  animation: fadeSlideIn 0.3s ease;
}

.sector-panel-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
}

.sector-panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.sector-stat {
  text-align: center;
}

.sector-stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.sector-stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent);
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Charts grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
}

.chart-card h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.chart-wrapper {
  position: relative;
  height: 280px;
}

.full-width {
  grid-column: 1 / -1;
}

.full-width .chart-wrapper {
  height: 400px;
}

/* Stats panel */
.stats-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
}

.stat-row:last-child { border-bottom: none; }
.stat-label { color: var(--text-muted); }
.stat-value { font-weight: 600; }

/* Gender Gap Analysis */
.gender-gap-display {
  text-align: center;
  padding: 1rem 0 1.25rem;
}

.gap-value {
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.gap-severity {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
}

.gap-description {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}

.gap-high { color: var(--red); }
.gap-medium { color: var(--yellow); }
.gap-low { color: var(--green); }

.gap-bar-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.gap-bar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.gap-bar-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  min-width: 120px;
  flex-shrink: 0;
}

.gap-bar-track {
  flex: 1;
  height: 24px;
  background: var(--bg);
  border-radius: 6px;
  overflow: hidden;
}

.gap-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.6s ease;
}

.gap-bar--male {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.6), rgba(59, 130, 246, 0.9));
}

.gap-bar--female {
  background: linear-gradient(90deg, rgba(236, 72, 153, 0.6), rgba(236, 72, 153, 0.9));
}

.gap-bar-value {
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 80px;
  text-align: right;
  flex-shrink: 0;
}

/* Tables */
.table-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.table-section h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 2px solid var(--border);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

tr:hover td { background: var(--bg-hover); }

.badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge--positive {
  background: var(--red-dim);
  color: var(--red);
}

.badge--negative {
  background: var(--green-dim);
  color: var(--green);
}

.badge--neutral {
  background: var(--bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

/* Footer */
.footer {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.8rem;
  border-top: 1px solid var(--border);
}

.footer a {
  color: var(--accent);
  text-decoration: none;
}

/* Section title */
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
  margin-top: 0.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .header { padding: 1rem; }
  .container { padding: 1rem; }
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
  .stats-panel { grid-template-columns: 1fr; }
  .chart-wrapper { height: 220px; }
  .full-width .chart-wrapper { height: 300px; }
  .gap-bar-label { min-width: 80px; }
  .gap-bar-value { min-width: 60px; font-size: 0.75rem; }
  .header-subtitle { font-size: 0.8rem; }
  .insights-grid { grid-template-columns: 1fr; }
  .about-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .kpis { grid-template-columns: 1fr; }
  .kpi-value { font-size: 1.5rem; }
  .gap-value { font-size: 2rem; }
  .header-meta { display: none; }
}

/* Skeleton loading shimmer */
.skeleton {
  position: relative;
  overflow: hidden;
  color: transparent !important;
}
.skeleton::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.live-badge {
  font-size: 0.65rem;
  color: var(--green);
  background: var(--green-dim);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  border: 1px solid rgba(34, 197, 94, 0.3);
  display: none;
}
.live-badge.active { display: inline-block; }

/* Filter panel (Session 2) */
.filter-section { margin: 2rem 0; }

.filter-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.filter-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.filter-reset-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-reset-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
  border-color: var(--accent);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.9rem;
}

.filter-field { display: flex; flex-direction: column; gap: 0.35rem; }
.filter-field label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.filter-field select,
.filter-field input {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s;
}
.filter-field select:focus,
.filter-field input:focus {
  border-color: var(--accent);
}

.filtered-stats {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
}

.fs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.fs-title { font-size: 0.95rem; font-weight: 600; color: var(--text); }
.fs-indicator {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg);
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--border);
}

.fs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.fs-kpi {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.85rem 1rem;
}
.fs-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.fs-value { font-size: 1.35rem; font-weight: 700; color: var(--text); margin-top: 0.25rem; font-variant-numeric: tabular-nums; }

.fs-histogram { margin-top: 0.5rem; }

.chart-wrapper--tall { height: 520px; }

.chart-note {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: -0.25rem 0 0.75rem;
}
.chart-note code {
  background: var(--bg);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.7rem;
  color: var(--accent);
}

.section-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin: 1.5rem 0 0.75rem;
}

/* Explorer (Session 3) */
.explorer { margin: 1.5rem 0; }

.explorer-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.explorer-search {
  flex: 1 1 260px;
  min-width: 260px;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.55rem 0.8rem;
  font-size: 0.9rem;
  outline: none;
}
.explorer-search:focus { border-color: var(--accent); }

.explorer-perpage {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.explorer-perpage select {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.5rem;
  font-size: 0.85rem;
}

.explorer-export-btn {
  background: var(--accent-dim);
  color: var(--text);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 0.55rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.explorer-export-btn:hover:not(:disabled) { background: var(--accent); }
.explorer-export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-card);
  border-color: var(--border);
  color: var(--text-muted);
}

.explorer-table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
}

.explorer-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.explorer-table th {
  text-align: left;
  padding: 0.75rem 0.9rem;
  background: var(--bg);
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.explorer-table th.sortable { cursor: pointer; user-select: none; }
.explorer-table th.sortable:hover { color: var(--text); }
.explorer-table th.num { text-align: right; }
.explorer-table th.sorted-asc::after { content: ' ▲'; color: var(--accent); }
.explorer-table th.sorted-desc::after { content: ' ▼'; color: var(--accent); }

.explorer-table td {
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
.explorer-table td.num { text-align: right; }
.explorer-table tbody tr:hover { background: var(--bg-hover); }
.explorer-table .loading-row {
  text-align: center;
  color: var(--text-muted);
  padding: 2rem;
  font-style: italic;
}

.explorer-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.explorer-summary { font-size: 0.8rem; color: var(--text-muted); }
.explorer-pages { display: flex; gap: 0.5rem; align-items: center; }
.page-btn {
  background: var(--bg-card);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { background: var(--bg-hover); border-color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-label { font-size: 0.8rem; color: var(--text-secondary); }

/* Print styles */
@media print {
  body {
    background: #fff;
    color: #000;
  }
  .header { border-color: #ccc; }
  .kpi, .chart-card, .table-section {
    background: #fff;
    border-color: #ccc;
    break-inside: avoid;
  }
  .badge {
    border: 1px solid #ccc;
    background: #f5f5f5;
    color: #333;
  }
  .gap-bar-track { background: #eee; }
  .gap-bar--male { background: #3b82f6; }
  .gap-bar--female { background: #ec4899; }
  .footer { border-color: #ccc; }
}
`;
