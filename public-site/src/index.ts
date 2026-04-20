import { renderDashboard } from './pages/dashboard';
import { stats } from './data/stats';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // API: raw stats JSON
    if (url.pathname === '/api/stats') {
      return new Response(JSON.stringify(stats, null, 2), {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Dashboard for all other routes
    const html = renderDashboard();

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
