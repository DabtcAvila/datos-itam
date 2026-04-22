export type DatasetTab = 'cdmx' | 'enigh';

export function buildNavTabs(active: DatasetTab | null): string {
  const activeCdmx = active === 'cdmx' ? ' active' : '';
  const activeEnigh = active === 'enigh' ? ' active' : '';
  return `
    <nav class="dataset-tabs" aria-label="Datasets">
      <a href="/" class="dataset-tab${activeCdmx}" aria-current="${active === 'cdmx' ? 'page' : 'false'}">
        <span class="dataset-tab-title">Servidores CDMX</span>
        <span class="dataset-tab-sub">Remuneraciones — 246,821 personas</span>
      </a>
      <a href="/enigh" class="dataset-tab${activeEnigh}" aria-current="${active === 'enigh' ? 'page' : 'false'}">
        <span class="dataset-tab-title">ENIGH Nacional</span>
        <span class="dataset-tab-sub">Hogares 2024 NS — 91,414 muestra · 38.8M expandido</span>
      </a>
    </nav>
  `;
}
