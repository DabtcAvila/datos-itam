import { CSS } from '../styles';
import { buildNavTabs } from '../shared/nav';

export function renderTerms(): string {
  const updated = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Términos de uso | datos-itam</title>
  <meta name="description" content="Términos de uso del Observatorio datos-itam: naturaleza del proyecto, fuentes, licencia y contacto.">
  <meta name="robots" content="index, follow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>">
  <style>${CSS}
    .terms-container { max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 4rem; line-height: 1.7; }
    .terms-container h1 { font-size: 1.75rem; margin: 0 0 0.5rem; color: var(--text); }
    .terms-container h2 { font-size: 1.15rem; margin: 2rem 0 0.6rem; color: var(--text); font-weight: 600; }
    .terms-container p { color: var(--text-secondary); margin: 0 0 0.8rem; }
    .terms-container ul { color: var(--text-secondary); padding-left: 1.25rem; margin: 0 0 0.8rem; }
    .terms-container li { margin: 0.3rem 0; }
    .terms-container a { color: var(--accent); text-decoration: none; }
    .terms-container a:hover { text-decoration: underline; }
    .terms-container code { background: var(--bg-card); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.85em; }
    .terms-meta { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem; }
    .terms-footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--text-muted); }
  </style>
</head>
<body>

  <header class="header">
    <div>
      <div class="header-brand">datos<span>-</span>itam</div>
      <div class="header-subtitle">Observatorio de Datos Públicos Mexicanos</div>
    </div>
  </header>

  ${buildNavTabs(null)}

  <main class="terms-container">
    <h1>Términos de uso — Observatorio datos-itam</h1>
    <p class="terms-meta">Actualizado: ${updated}</p>

    <h2>1. Naturaleza del proyecto</h2>
    <p>
      Proyecto académico del ITAM (Instituto Tecnológico Autónomo de México),
      materia Bases de Datos, semestre 2026. Observatorio público no comercial.
    </p>
    <p>Autor: Observatorio datos-itam (David F. Ávila Díaz).</p>

    <h2>2. Fuentes de datos</h2>
    <ul>
      <li><strong>INEGI ENIGH 2024 Nueva Serie</strong> — Encuesta Nacional de Ingresos y Gastos de los Hogares (dominio público).</li>
      <li><strong>CDMX Open Data — Servidores Públicos</strong> — Datos Abiertos del Gobierno de la Ciudad de México (dominio público).</li>
      <li>
        Referencia oficial:
        <a href="https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/enigh/ENIGH_2024NS.pdf" target="_blank" rel="noopener">Comunicado INEGI 112/25</a>
        (julio 2025).
      </li>
    </ul>

    <h2>3. Sin garantías</h2>
    <ul>
      <li>Los datos se proveen "tal como están" (<em>as-is</em>), sin garantía de ningún tipo.</li>
      <li>Se reproducen oficialmente al peso contra fuente INEGI (13 bounds validated, Δ máx 0.078%) pero sin garantía de continuidad o exactitud futura.</li>
      <li>El proyecto puede cambiar, pausarse o descontinuarse sin aviso previo.</li>
    </ul>

    <h2>4. Uso permitido</h2>
    <ul>
      <li>Cualquier uso es bienvenido: académico, periodístico, investigación, educativo.</li>
      <li>Se agradece pero no se requiere atribución.</li>
      <li>Los datos originales mantienen sus respectivas licencias (INEGI y CDMX, dominio público mexicano).</li>
    </ul>

    <h2>5. Limitaciones</h2>
    <ul>
      <li>API de lectura pública, sin SLA comprometido.</li>
      <li>Rate limits no formales — se espera uso razonable.</li>
      <li>Sin costo asociado al uso de los datos expuestos.</li>
    </ul>

    <h2>6. Contacto</h2>
    <ul>
      <li>Email: <a href="mailto:df.avila.diaz@gmail.com">df.avila.diaz@gmail.com</a></li>
      <li>Sitio: <a href="https://datos-itam.org">https://datos-itam.org</a></li>
      <li>Para reporte de bugs o solicitudes: mismo email.</li>
    </ul>

    <h2>7. Licencia del código</h2>
    <p>
      El código fuente está publicado bajo la
      <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener">MIT License</a>.
      Ver <code>license_info</code> en la especificación OpenAPI:
      <a href="https://api.datos-itam.org/docs" target="_blank" rel="noopener">/docs</a>.
    </p>

    <div class="terms-footer">
      <p>Actualizado ${updated} · Observatorio datos-itam · Proyecto académico ITAM Bases de Datos 2026.</p>
    </div>
  </main>

</body>
</html>`;
}
