import { renderDashboard } from './pages/dashboard';
import { renderEnighDashboard } from './pages/enigh';
import { renderComparativoDashboard } from './pages/comparativo';
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
    if (path === '/enigh') {
      html = renderEnighDashboard();
    } else if (path === '/comparativo') {
      html = renderComparativoDashboard();
    } else if (path === '/terms') {
      html = renderTerms();
    } else if (path === '/cdmx') {
      html = renderDashboard();
    } else {
      html = renderDashboard();
    }

    return new Response(html, {
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
