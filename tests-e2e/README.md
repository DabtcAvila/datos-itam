# tests-e2e — Playwright E2E for datos-itam.org observatory

End-to-end tests that validate the public observatory from a real browser context, running against **production** (`https://datos-itam.org` + `https://api.datos-itam.org`). Executed in GitHub Actions on every push to `main` and every PR to `main`.

Added in S8.5 as a safety net after the S8 CORS incident, where 26 backend tests passed while production was broken because `curl` without an `Origin` header does not exercise CORS. These tests catch that entire class of bug automatically.

## Requirements

- Node 20 LTS (match CI; newer majors should also work)
- npm 10+

## Install

```bash
cd tests-e2e
npm ci
npx playwright install chromium   # --with-deps only needed on Linux CI
```

## Run

```bash
npm test                              # full suite
npx playwright test tests/cors-headers.spec.ts   # single file
npx playwright test -g "decil filter"            # by test title (grep)
npx playwright test --headed                     # watch a browser open
npx playwright test --ui                         # interactive UI mode
npx playwright show-report                       # last HTML report
```

Target is always production. Do not point the `baseURL` at local `wrangler dev` — the whole point is to catch deploy-level bugs (CORS, CDN cache, asset paths) that local does not reproduce.

## What each test covers

| File | Covers |
|---|---|
| `tests/cors-headers.spec.ts` | **Test 5 — critical**: each of the 17 public endpoints returns `200` with `Access-Control-Allow-Origin: https://datos-itam.org`, `Vary: Origin`, JSON body. Regression gate for the S8 incident. |
| `tests/cdmx-landing.spec.ts` | **Test 1**: `/` loads, title, nav, active tab, KPIs numeric, at least one chart canvas sized, no console errors. |
| `tests/enigh-landing.spec.ts` | **Test 2**: `/enigh` loads, 4 hero KPIs within tolerance (91,414 exact · 38.8M ±0.1% · $25,955 ±5% · $15,891 ±5%), 8 live fetches respond `200`, validaciones `≥13/13` populated, `EN VIVO` badge active, active tab, no console errors. |
| `tests/enigh-filter.spec.ts` | **Test 3**: changing the decil selector in Dashboard 4 fires `/gastos/by-rubro?decil=1`, response is `200` with `decil=1` in body, the *Alimentos* row's percentage moves from ~37.72% toward D1 value, the Gasto total display updates. |
| `tests/navigation.spec.ts` | **Test 4**: CDMX ↔ ENIGH tab clicks change URL, `aria-current="page"`, `.active` class, content swaps in. |
| `tests/mobile-responsive.spec.ts` | **Test 6**: viewport 375×667. Currently marked `test.fail()` — see *Known issues* below. Screenshots auto-saved to `screenshots/`. |

## How to interpret failures

Failures fall into three buckets. Diagnose before touching the test.

### 1. Timeout on an API call

Most likely cause: Railway cold start or Neon pooler first-request latency. Confirm manually before assuming a bug:

```bash
curl -sI -H "Origin: https://datos-itam.org" https://api.datos-itam.org/api/v1/enigh/metadata
# Should return 200 with access-control-allow-origin + vary: Origin
```

If the manual check is instant, the earlier timeout was a one-off — CI retries (`retries: 2`) absorbs it. If the manual check itself is slow or errors, there's a real problem (deploy regression, database issue, CDN pollution). Do not raise the timeout to mask it.

### 2. Assertion diff (expected X, got Y)

A data value, text content, or DOM structure changed. **Investigate, do not auto-adjust.**
- The API response shape may have genuinely changed (intentional rollout, contract break, or regression).
- The public-site HTML may have been restructured (different selector, different KPI target, different text).
- INEGI data may have been reissued with new numbers.

Compare the test's expectation against a current manual check (curl or browser DevTools). If the change is intentional and the new value is correct, update the test with a commit message that cites the underlying change. If the change is unintentional, that's the bug — file it, don't patch the test.

### 3. Flakiness (passes sometimes, fails sometimes)

Stop before adding retries. Flake typically has a concrete cause:
- **Timing**: the test asserts before the async work completes. Replace `waitForTimeout` or implicit waits with `waitForResponse`, `expect.poll`, or an event-driven wait.
- **Race condition**: the test selects the right element at the wrong moment (e.g. during a chart re-render). Scope the assertion to the settled state.
- **Real intermittent bug**: production fails 5% of the time. That's the signal, not the noise — reproduce, report, do not retry around it.

`retries: 2` is already configured for CI to absorb pure network jitter. Anything past that is a smell.

## Adding a new test

Start from this minimal shape:

```ts
// tests/new-feature.spec.ts
import { test, expect } from '@playwright/test';

test('new feature behaves correctly', async ({ page }) => {
  await page.goto('/some-route', { waitUntil: 'networkidle' });
  await expect(page.locator('#some-id')).toBeVisible();
});
```

The `baseURL` (`https://datos-itam.org`) and a global `Origin` header are set in `playwright.config.ts` — your test does not need to repeat them.

For tests that assert against API endpoints directly (no page), use `playwrightRequest.newContext({ baseURL: API_BASE, extraHTTPHeaders: { Origin: FRONTEND_ORIGIN } })` — see `cors-headers.spec.ts` for the pattern.

For mobile-specific tests, add `test.use({ viewport: { width: 375, height: 667 } })` at file scope.

## Known issues

### Test 6 — `test.fail()` for mobile horizontal overflow (S8.6)

The mobile responsive test is annotated `test.fail()` because it currently detects a legitimate CSS bug in production:

- `/` at 375px: `scrollWidth=516, clientWidth=375` → **+141px overflow**
- `/enigh` at 375px: `scrollWidth=464, clientWidth=375` → **+89px overflow**

**Root cause**: `.charts-grid` uses `grid-template-columns: repeat(auto-fit, minmax(420px, 1fr))` without a media query for viewports ≤ ~450px, so `.chart-card` elements exceed the viewport.

The `test.fail()` annotation makes CI green while the bug is tracked. When S8.6 lands the CSS fix, the test will pass and Playwright will report it as an **unexpected pass** — a loud signal to remove the annotation and revert to a plain `test()`.

## GitHub Actions

The workflow lives at `.github/workflows/e2e.yml`:
- Triggers: `push` to `main`, `pull_request` to `main`
- Runner: `ubuntu-latest`
- Node 20 LTS with npm cache keyed on `tests-e2e/package-lock.json`
- Installs `--with-deps chromium` (only on CI; local does not need `--with-deps`)
- Uploads `playwright-report/` and `test-results/` as artifacts (retention 14 days) on failure
- Concurrency group cancels in-flight runs for the same ref

Typical CI runtime: ~45-60s total (~18s tests, ~30s Playwright browser install cold).

### Branch protection (required status check)

To block merges on failing tests, configure in GitHub UI — not via API:

1. Repo → **Settings** → **Branches** → **Branch protection rules** → **Add rule**
2. Branch name pattern: `main`
3. Enable **Require status checks to pass before merging**
4. In the status checks search, add:
   - **`Playwright E2E (chromium, prod)`** ← this is the **job** name, not the workflow filename
5. Optional for a single-developer repo: **Require a pull request before merging**
6. Save

Note: the check will only appear in the picker after at least one run has completed on the default branch. Push once, wait for the run to finish, then the check is selectable.

### Node.js 20 runtime deprecation (cosmetic warning)

Runs produce this annotation:

> Node.js 20 actions are deprecated. … will be forced to run with Node.js 24 by default starting June 2nd, 2026.

This refers to the **JS runtime inside `actions/checkout@v4` and `actions/setup-node@v4`**, not the Node version we request for the test project (that remains 20 LTS, set by our own `setup-node` step). When GitHub flips the default or releases `@v5` of these actions, the annotation disappears. No action required today.

## Files

```
tests-e2e/
├── README.md                          (this file)
├── package.json                       (devDeps only: @playwright/test, typescript, @types/node)
├── package-lock.json
├── tsconfig.json                      (strict)
├── playwright.config.ts               (baseURL prod, chromium, retries 2 CI / 0 local)
├── helpers/
│   └── endpoints.ts                   (17 public endpoints)
├── tests/
│   ├── cors-headers.spec.ts           (Test 5 — 17 parametrized)
│   ├── cdmx-landing.spec.ts           (Test 1)
│   ├── enigh-landing.spec.ts          (Test 2)
│   ├── enigh-filter.spec.ts           (Test 3)
│   ├── navigation.spec.ts             (Test 4)
│   └── mobile-responsive.spec.ts      (Test 6 — test.fail())
└── screenshots/                       (gitignored PNG/JPG; .gitkeep tracked)
```
