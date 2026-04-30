import { renderDashboard } from './pages/dashboard';
import { renderEnighDashboard } from './pages/enigh';
import { renderComparativoDashboard } from './pages/comparativo';
import { renderConsarDashboard } from './pages/consar';
import { renderConsarDataset } from './pages/consar-dataset';
import { renderPensionalDashboard } from './pages/pensional';
import { renderDemo } from './pages/demo';
import { renderTerms } from './pages/terms';
import { stats } from './data/stats';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    // Health check
    if (path === '/health') {
      return new Response('OK', { status: 200 });
    }

    // API: raw stats JSON
    if (path === '/api/stats') {
      return new Response(JSON.stringify(stats, null, 2), {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    let html: string;
    let status = 200;
    const consarSubMatch = /^\/consar\/([a-z][a-z0-9-]*)$/.exec(path);
    if (path === '/enigh') {
      html = renderEnighDashboard();
    } else if (path === '/comparativo') {
      html = renderComparativoDashboard();
    } else if (path === '/consar') {
      html = renderConsarDashboard();
    } else if (consarSubMatch) {
      const sub = renderConsarDataset(consarSubMatch[1]);
      if (sub) {
        html = sub;
      } else {
        // Slug no implementado o desconocido: devolver landing CONSAR con 404.
        // El sub-nav muestra el slug aún así; usuario navega manualmente.
        html = renderConsarDashboard();
        status = 404;
      }
    } else if (path === '/pensional') {
      html = renderPensionalDashboard();
    } else if (path === '/demo') {
      html = renderDemo();
    } else if (path === '/terms') {
      html = renderTerms();
    } else if (path === '/cdmx') {
      html = renderDashboard();
    } else {
      html = renderDashboard();
    }

    return new Response(html, {
      status,
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};
