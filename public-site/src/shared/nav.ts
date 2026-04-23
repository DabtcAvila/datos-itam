export type DatasetTab = 'cdmx' | 'enigh' | 'comparativo' | 'consar' | 'pensional';

export function buildNavTabs(active: DatasetTab | null): string {
  const activeCdmx = active === 'cdmx' ? ' active' : '';
  const activeEnigh = active === 'enigh' ? ' active' : '';
  const activeComp = active === 'comparativo' ? ' active' : '';
  const activeConsar = active === 'consar' ? ' active' : '';
  const activePensional = active === 'pensional' ? ' active' : '';
  return `
    <nav class="dataset-tabs" aria-label="Datasets">
      <a href="/" class="dataset-tab${activeCdmx}" aria-current="${active === 'cdmx' ? 'page' : 'false'}">
        <span class="dataset-tab-title">Servidores CDMX</span>
        <span class="dataset-tab-sub">Remuneraciones — 246,831 personas</span>
      </a>
      <a href="/enigh" class="dataset-tab${activeEnigh}" aria-current="${active === 'enigh' ? 'page' : 'false'}">
        <span class="dataset-tab-title">ENIGH Nacional</span>
        <span class="dataset-tab-sub">Hogares 2024 NS — 91,414 muestra · 38.8M expandido</span>
      </a>
      <a href="/comparativo" class="dataset-tab${activeComp}" aria-current="${active === 'comparativo' ? 'page' : 'false'}">
        <span class="dataset-tab-title">Comparativo</span>
        <span class="dataset-tab-sub">CDMX ↔ ENIGH — 7 lecturas cruzadas</span>
      </a>
      <a href="/consar" class="dataset-tab${activeConsar}" aria-current="${active === 'consar' ? 'page' : 'false'}">
        <span class="dataset-tab-title">CONSAR AFORE</span>
        <span class="dataset-tab-sub">Recursos SAR 1998-2025 — 7 dashboards</span>
      </a>
      <a href="/pensional" class="dataset-tab${activePensional}" aria-current="${active === 'pensional' ? 'page' : 'false'}">
        <span class="dataset-tab-title">Pensional</span>
        <span class="dataset-tab-sub">CONSAR × ENIGH — 2 hipótesis cuantificadas</span>
      </a>
    </nav>
  `;
}
