# ms-playwright-tests

End-to-end automation suite for the Mobile Sentrix admin (`dev.mobilesentrix.com/devadmin`), built with [Playwright](https://playwright.dev) and TypeScript. Reporting is wired through both the built-in HTML reporter and [Allure](https://allurereport.org/).

## Project setup

- **Test runner:** `@playwright/test` (TypeScript)
- **Browsers:** Chromium (project `chromium` in `playwright.config.ts`)
- **Auth strategy:** one-time login in `global-setup.ts` saves an authenticated session to `auth.json`; every spec then loads it via `use: { storageState: 'auth.json' }`, avoiding per-test login cost
- **Login spec opts out** of storageState with `test.use({ storageState: { cookies: [], origins: [] } })` so it starts unauthenticated
- **Headed by default** (`headless: false`, `--start-maximized`) so flows are visually debuggable. Override with `--headed=false` or set `headless: true` in the config for CI

## Installation steps

Prerequisites: **Node.js 18+** and npm.

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers (first time only)
npx playwright install chromium

# 3. Create a .env file at the repo root
cat > .env <<'EOF'
ADMIN_URL=https://dev.mobilesentrix.com/devadmin
ADMIN_USER=<your admin username>
ADMIN_PASS=<your admin password>
FRONTEND_URL=https://dev.mobilesentrix.com
FRONTEND_USER=<storefront username>
FRONTEND_PASS=<storefront password>
EOF
```

`config/env.ts` throws at startup if `ADMIN_USER` / `ADMIN_PASS` are missing.

## Run commands

| Command | What it does |
| --- | --- |
| `npm test` | Run the full suite (Chromium, headed) |
| `npm run test:headed` | Same as above, explicit `--headed` flag |
| `npm run test:debug` | Run with the Playwright Inspector |
| `npm run test:po` | Run only the Purchase Order specs (`tests/purchase-order/`) |
| `npx playwright test <file>` | Run a single spec, e.g. `npx playwright test filter-po-by-status.spec.ts` |
| `npx playwright test -g "TC_PO_010"` | Run tests whose title matches a regex |
| `npx playwright show-report` | Open the built-in HTML report from `playwright-report/` |
| `npm run allure:generate` | Build the Allure report from `allure-results/` into `allure-report/` |
| `npm run allure:open` | Serve the generated `allure-report/` |
| `npm run allure:serve` | Build + serve directly from `allure-results/` (no pre-generation) |

`globalSetup` regenerates `auth.json` on every run, so a stale session never lingers between days.

## Folder structure

```
ms-playwright-tests/
├── config/
│   └── env.ts                  # Typed env access (ADMIN_URL/USER/PASS); throws if missing
├── global-setup.ts             # Logs in once, saves auth.json for the whole suite
├── pages/                      # Page Object Models
│   ├── admin-login.page.ts
│   └── purchase-order.page.ts
├── utils/
│   └── po-navigation.ts        # gotoPoGrid / gotoCreateNewOrder (rotating-key aware)
├── test-data/
│   └── po.data.ts              # Suppliers, filter helpers, categories, qty defaults
├── tests/
│   ├── login/
│   │   └── admin-login.spec.ts
│   └── purchase-order/         # 16 PO specs (create, search, filter, lifecycle, import/export, …)
├── playwright.config.ts        # Reporters, storageState, retries, viewport
├── package.json                # Scripts: test, test:po, allure:*
├── auth.json                   # (generated) authenticated storageState — DO NOT commit
├── screenshots/                # Manual page.screenshot() output (gitignored)
├── test-results/               # Failure artifacts (screenshots, video, trace)
├── playwright-report/          # Built-in HTML report
├── allure-results/             # Raw Allure results
└── allure-report/              # Generated Allure HTML report
```

### Page Object conventions

- Pages live in `pages/`; each exposes named `Locator` properties + action methods.
- Navigation that requires a rotating URL key (e.g. `/Purchase_Orders/List/key/<rotating>/`) is centralized in `utils/po-navigation.ts` — never hardcode the key.
- Reusable test inputs (suppliers, filter placeholders, default quantities) live in `test-data/po.data.ts`.

## Reporting details

Two reporters are configured in `playwright.config.ts`:

```ts
reporter: [
  ['html'],
  ['allure-playwright'],
],
```

Per-test artifacts on failure (also retained for retries):

- `screenshot: 'only-on-failure'` → `test-results/<test>/test-failed-1.png`
- `video: 'retain-on-failure'` → `test-results/<test>/video.webm`
- `trace: 'on-first-retry'` → `test-results/<test>/trace.zip` (open with `npx playwright show-trace <path>`)

### Built-in HTML report

```bash
npx playwright show-report
# → opens playwright-report/index.html
```

### Allure report

Allure picks up results emitted to `allure-results/` during the run.

```bash
# After a test run, build the report:
npm run allure:generate         # → allure-report/

# Then open it:
npm run allure:open             # serves allure-report/

# Or do both in one shot, no pre-generation needed:
npm run allure:serve            # serves directly from allure-results/
```

The Allure report shows: pass/fail/flaky breakdown, per-test steps (`test.step(...)` annotations show up as expandable nodes), attached screenshots/videos/traces, history (if `allure-report/history/` is preserved across runs), and timeline / suite breakdowns.

## Useful tips

- **Single test, headed, with the Inspector:** `npx playwright test <file> --debug`
- **Update only `auth.json` (smoke-test login):** delete `auth.json` and run any spec — `globalSetup` will re-create it.
- **Don't commit:** `auth.json`, `.env`, `node_modules/`, `test-results/`, `playwright-report/`, `allure-results/`, `allure-report/`, `screenshots/`.
