# Build log

Newest first. Each nightly run adds: date, task, what changed, what was verified, open issues.

## 2026-10-24 · task 3: prices & storage panel (nightly run)
- **New section 4 on `lng.html`: "Prices and storage".** Later sections are renumbered 5–8.
  - **Gas benchmarks chart** (`#c-prices`): monthly TTF, Henry Hub and the Japan LNG import price (cif), Mar 2024 → Sep 2026, on one $/MMBtu axis. JKM spot prints are hollow dots. The 28 Feb 2026 Hormuz closure and the 18 Mar Ras Laffan strike are dashed red lines with labels. Hovering shows all three prices, the TTF−HH spread and the Pink Sheet edition.
  - **EU storage chart** (`#c-storage`): 2026 refill season (20 Apr → 21 Oct, 12 dated points) against the 2021–25 average, the 2021–25 range, 2025 on the same dates and the 80% 1-Nov target.
  - Both charts are drawn at the container's pixel width and redrawn on resize, so the text stays at 10.5–11px on a 390px phone. That's unlike the older viewBox-scaled charts.
- **`data/prices.json`** (new). It holds 31 months of prices (each tagged with its Pink Sheet edition, with `japanLngEstimate` where the World Bank marks a value as an estimate), 3 JKM spot prints, the 2 annotations, and the storage series. Every storage point has its own source; derived points are flagged `derived`, rounded ones `approx`.
- **Arbitrage calculator:** the "Oct 2026 snapshot" button is now **"Latest month (Sep 2026)"**. It reads TTF and Henry Hub from the newest month in `prices.json` and JKM from the newest `jkmSpot` print. Monthly JKM averages are Platts-licensed. The slider defaults (5 Oct snapshot) are unchanged.
- **Validator:** new `validatePrices` in `scripts/validate.mjs`. It checks that months are consecutive YYYY-MM, prices are in (0, 100) with an edition, JKM and storage points have dates and sources, storage values are 0–100%, the range has min ≤ max, and series are in date order. 5,994 checks.
- **Smoke tests:** charts non-empty, ≥3 price lines, both annotations present, storage points drawn, hover tooltip shows, no overlapping chart labels, and the "Latest month" preset loads the newest TTF/HH. There's also a new `PW_CHROMIUM` env var to launch a preinstalled Chromium when it doesn't match the pinned Playwright build (this sandbox has build 1243, Playwright 1.56.1 wants 1194). CI is unaffected.
- **README / footer:** describe the panel, `prices.json`, the new validator checks and `PW_CHROMIUM`.
- **Sources:**
  - World Bank Pink Sheet editions of Jun 2024, Sep 2024, Oct 2024, Jan 2025, Apr 2025, Jul 2025, Oct 2025, Jan 2026, Apr 2026, Jul 2026 and Oct 2026 (2 Oct 2026). Jan 2026 Henry Hub (7.58) is the World Bank series as republished by YCharts. It is consistent with the Apr 2026 edition's Q1 average of 4.75 = mean(7.58, 3.61, 3.05).
  - JKM prints: Global LNG Hub weekly updates (14 and 28 Sep 2026) and the Reuters 5 Oct snapshot already used on the page.
  - Storage: GIE AGSI+ data as reported by ENGIE EnergyScan, Voltstack, global-energy-flow.com, CES Intelligence, Rigzone and TASS/Tasnim. The 2021–25 band (77.0–97.8%, average 88.9% on 14 Oct) is from Voltstack.
- **How the data was gathered:** this sandbox's network blocks worldbank.org, eia.gov, agsi.gie.eu and FRED, both for downloads and for page fetches. All values come from web-search extracts of the Pink Sheet PDFs. Their column headers don't come through, so each month was mapped by checking that three monthly values average to the quarterly figure in the same or a later edition. That check passed for Q3-24, Q4-24, Q1-25, Q2-25, Q3-25, Q4-25 and Q1-26 (TTF, and HH/Japan where available).
- **Verified:** `npm test` green (5,994 data checks; 238 browser checks at 1440×900 and 390×844, no console errors). Looked at the desktop and phone screenshots of the new section and the arbitrage panel, then moved the storage direct label off the line and trimmed the footnotes.
- **Open issues for the owner:**
  - **Spot-check a few values against the Pink Sheet Excel** (`CMO-Historical-Data-Monthly.xlsx`). I couldn't download it here, and search extracts are the weakest link in this task. Worth checking: Mar–May 2024, Sep 2024 Japan (13.24, estimate), and the late-2025 Japan values, which later editions revised by ~0.1.
  - **Jan–Feb 2024 are missing**, so the series starts in Mar 2024. Add them from the Excel file and the chart picks them up automatically. The validator requires consecutive months.
  - **"JKM" is a proxy.** The plan asked for JKM, but monthly JKM averages are Platts-licensed. The chart uses the World Bank's Japan LNG import price (oil-linked, lagging), which is a different thing, and shows JKM only as dated spot prints. The chart caption says so. If you have JKM monthly averages from a licensed source, add a `jkm` key per month.
  - **Storage comes from trackers, not AGSI+ directly.** The five-year range is a single date (14 Oct), and the average is 1 published point plus 3 derived from reported gaps. A proper band needs the AGSI+ download: compute 2021–25 min/max/mean by day.
  - The 80% target follows reports that the 2025 amendment allows a 10-point deviation from 90%. Confirm the wording if you quote it.

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
