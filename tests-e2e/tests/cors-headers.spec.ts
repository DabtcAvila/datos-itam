import { test, expect, request as playwrightRequest } from '@playwright/test';
import {
  ALL_PUBLIC_ENDPOINTS,
  API_BASE,
  FRONTEND_ORIGIN,
} from '../helpers/endpoints';

test.describe('CORS headers — production api.datos-itam.org', () => {
  for (const endpoint of ALL_PUBLIC_ENDPOINTS) {
    test(`${endpoint} returns 200 + correct CORS headers`, async () => {
      const ctx = await playwrightRequest.newContext({
        baseURL: API_BASE,
        extraHTTPHeaders: { Origin: FRONTEND_ORIGIN },
      });

      const response = await ctx.get(endpoint);

      expect(
        response.status(),
        `status for ${endpoint}`,
      ).toBe(200);

      const headers = response.headers();

      const acao = headers['access-control-allow-origin'];
      expect(
        acao,
        `missing Access-Control-Allow-Origin for ${endpoint}`,
      ).toBeDefined();
      expect(
        acao,
        `ACAO should echo ${FRONTEND_ORIGIN} for ${endpoint}`,
      ).toContain(FRONTEND_ORIGIN);

      const vary = headers['vary'];
      expect(
        vary,
        `missing Vary header for ${endpoint}`,
      ).toBeDefined();
      expect(
        vary.toLowerCase(),
        `Vary must contain Origin for ${endpoint}`,
      ).toContain('origin');

      const contentType = headers['content-type'] ?? '';
      expect(
        contentType,
        `content-type not JSON for ${endpoint}`,
      ).toContain('application/json');

      const body = await response.json();
      expect(
        body,
        `body not a valid JSON object/array for ${endpoint}`,
      ).toBeTruthy();

      await ctx.dispose();
    });
  }
});
