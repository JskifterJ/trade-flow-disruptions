# Build log

Newest first. Each nightly run adds: date, task, what changed, what was verified, open issues.

## 2026-10-23 · task 2: data validation + CI (nightly run)
- **Validator:** `scripts/validate.mjs` (no dependencies, `npm run validate`). It checks `data/lng.json`,
  `data/disruptions.json` and `data/flows.json`: required fields, unique ids, named points exist, lat/lon in
  range, dates, allowed statuses/types/kinds/groups/severities/sizes, a source on every event, leg,
  chokepoint and route, and the disruption map-layer fields (focus/events/zones/regions). It also checks
  totals: legs ≤ 427.9 Mt and the exporter/importer/region tables = 427.9 (±0.15). The allowed sets are
  parsed from the constants in `lng.js` / `app.js`, so the validator stays in sync with what the pages draw.
  - **Router:** rebuilds the voyage graph in Node. 1,634/1,634 plant→terminal pairs routable, every asset
    within 600 nm of a lane, Ras Laffan→Tokyo blocked with Hormuz closed, Sabine Pass→Tokyo still open.
  - 5,725 checks pass.
- **Data fix it found:** `importers2025` listed only the top 14 countries (352.2 Mt), so the importer table
  didn't add up to world trade. Added an "All others" row of 75.7 Mt, flagged `"derived": true`. It is
  arithmetic (427.9 minus the listed countries), and `importersSource` now says so. `lng.js` mutes the
  "All others" bar in both country charts (grey `C.avoided`), so it doesn't read as a country.
- **CI:** `.github/workflows/ci.yml` runs on every push and PR: Node 20, `npm ci`, validate, Playwright
  Chromium, smoke tests, and uploads the screenshots as an artifact. `npm test` now runs validate + smoke
  (`npm run smoke` = browser tests only).
- **README:** new Testing section (what the validator checks, CI). The refresh note now says to run validate.
- **Sources:** no new figures. The 75.7 Mt remainder is derived from the existing GIIGNL Annual Report 2026 figures.
- **Verified:** `npm test` green (5,725 data checks; 222 browser checks at 1440×900 and 390×844, no console
  errors). Injected faults to check the validator catches them, then restored the files: unknown path point,
  lat 95, bad event type, missing source, dropped `zones`, bad severity, and emptied `extraLanes`, which
  flags the far-off Latin American terminals. Looked at importer/exporter chart screenshots on desktop and phone.
- **Open issues for the owner:**
  - CI has not run yet. The first push of `.github/workflows/ci.yml` triggers it, so check the Actions tab.
    The actions are pinned to major tags (`@v4`), not commit SHAs.
  - The "All others" importer bar (76 Mt) is the longest bar in the chart. That's accurate, but you may
    prefer to show it as a footnote instead.
  - `PROJECT_STATUS`, `REGAS_TYPES` and the disruption categories are listed in the validator itself, because
    the pages have no constant for them. Add a value there if you introduce a new one.

## 2026-10-22 · task 1: browser QA harness + bug fixes (nightly run)
- **Harness:** `package.json` (devDeps pinned: playwright 1.56.1, d3 7.9.0, topojson-client 3.1.0,
  world-atlas 2.0.2), `tests/smoke.mjs`, `npm test`, `.gitignore` (node_modules, tests/screenshots).
  It covers everything in the task spec; 222 checks, all passing. CDN URLs are routed to
  `node_modules` because this sandbox can't reach jsdelivr, which also makes the tests offline-safe.
  It flags any unexpected external request.
- **Bugs found and fixed:**
  - `lng.html`: on load the voyage calculator drew its default Sabine Pass→Tokyo route on the globe.
    That dimmed every shipping leg to 18% opacity and hid **all** leg volume labels (the stray white
    dashed arc near Japan). Now the table fills on load but nothing is drawn until the user touches
    the calculator (`renderVoyage(draw)` in `lng.js`). The test guards against this coming back.
  - `lng.html` at 390px: globe labels rendered at ~5px. Added a screen-scale factor (`TS`/`MS` in
    `lng.js`) that enlarges label text, offsets and markers when the SVG is drawn small. It
    recomputes on resize.
  - `index.html` at 390px: same small-label problem. Same text scaling added in `app.js` (computed at load).
  - `index.html` loaded `topojson-client@3` (unpinned). Pinned to `3.1.0`.
  - `lng.html` grids (`main`, `.charts`, `.arb`, `.voyage`) used `1fr` at narrow widths. On phones the
    voyage table overflowed its column. Now `minmax(0, 1fr)`, and `#voy-out` scrolls horizontally.
- **Sources:** none needed (no new figures).
- **Verified:** `npm test` green at both viewports. Reviewed screenshots of load, the 2026 scenario,
  every tab, zoom, voyage, arbitrage and disruption views on desktop and phone. JSON files unchanged.
- **Open issues for the owner:**
  - On phones, tapping a list row zooms the globe, but the globe is scrolled off-screen above the list.
    Consider scrolling it into view (task 7, mobile pass).
  - The main page's Ras Laffan area is crowded: the shut-plant ring overlaps the strike/attack markers.
    It's readable, but could be tidied.
  - The label-overlap check allows ≤3 overlapping globe labels at the default view (currently 0).
  - Merging `origin/main` was a fast-forward: PR #1 has already been merged into main.

## 2026-10-21 · setup (interactive session)
- Branch `lng-supply-chain` holds the LNG page (`lng.html`), the disruption map layer on the main
  page, and the merge of main's weekly refreshes (12 and 19 Oct). PR #1 → main.
- Not yet verified in a browser: `lng.html` after the GIIGNL data upgrade, events/pipeline layers,
  supply-wave chart and voyage calculator (static checks and a Node router test passed:
  1,634/1,634 plant→terminal pairs routable). That's why task 1 is the browser QA harness.
