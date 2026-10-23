# Energy Trade Flows

**Live:** https://jskifterj.github.io/trade-flow-disruptions/

An interactive globe with two views:

- **Main flows**: the pre-crisis (2025) map of how crude oil, LNG and refined products move by sea. Covers 14 major routes, line width by rough size class, and 8 clickable chokepoints (Hormuz, Malacca, Bab-el-Mandeb, Suez, the Cape, Panama, the Turkish and Danish straits). Each one shows its volume and why a trader cares. Includes a short primer and glossary (mb/d, VLCC, arbitrage, crack spreads, benchmarks).
- **Disruptions now**: what 2026 broke and where the barrels went. The Hormuz closure and the bypass pipelines, Qatar's LNG force majeure, the renewed Red Sea attacks, Panama drought limits, the Russian shadow fleet, plus one petrochemicals structural shift.

- **LNG deep dive** (`lng.html`): a zoomable globe of the LNG supply chain. It shows 43 liquefaction plants, 38 import terminals/FSRUs, 9 chokepoints and 30 shipping legs, each labelled with Mt/yr and share of world trade (427.9 Mt in 2025). A 2025-baseline / Oct-2026 toggle shows the Hormuz/Qatar shock. The page also has charts (exporters, importers, chokepoint exposure, the supply hole), a value-chain explainer, a US-cargo arbitrage calculator, a timeline and a primer. Data is in `data/lng.json`. Leg-level splits and 2026 run-rates are estimates, marked ≈.

First built in Oct 2026 as a chemicals/plastics sketch while preparing for Tricon Energy's Commercial Development Program. Rebuilt on 2026-10-07 around energy flows, for learning the map and for commodity-trading applications.

## Viewing it

This is a static page with no build step. Fetching `data/disruptions.json` over `file://` is blocked by the browser's CORS policy, so serve it over HTTP:

```
python -m http.server 8080
# then open http://localhost:8080
```

Drag the globe to rotate it. Click a route in the right-hand list to highlight it and read the full story and sources; click it again to deselect.

## Testing

Two checks, both run by `npm test` (Node 18+):

```
npm install
npx playwright install chromium   # skip if a Chromium is already installed for Playwright
npm test            # = npm run validate && npm run smoke
npm run validate    # data checks only, no browser, ~1 s
```

**Data validation.** `scripts/validate.mjs` checks the three data files and exits non-zero on any error:

- **Schema:** required fields on every leg, plant, terminal, project, chokepoint, event, zone and route; unique ids; every named point in a leg path or `extraLanes` exists in `points`; lat/lon in range; dates are `YYYY-MM-DD`.
- **Allowed values:** leg statuses, event types, zone kinds, project groups, severities and route sizes must match the ones the pages can draw. These sets are read from `lng.js` and `app.js` (`STATUS`, `EVENT`, `ZONE_STYLE`, `GROUP`, `SEV_HEX`, `SIZE_WIDTH`), so they don't drift.
- **Sources:** every event on both pages, every LNG leg and chokepoint, and every main-page route and chokepoint needs a `source`.
- **Map layer:** every route in `disruptions.json` must keep `focus`, `events`, `zones` and `regions`, so a weekly refresh can't silently drop them.
- **Totals:** LNG legs sum to no more than world trade (427.9 Mt). The exporter, importer and import-region tables each sum to it (±0.15 Mt for rounding).
- **Router:** rebuilds the voyage calculator's sea-lane graph. Every plant reaches every terminal with all passages open (1,634 pairs), no asset sits more than 600 nm from a lane, and with Hormuz closed Ras Laffan→Tokyo has no route while Sabine Pass→Tokyo still does.

**Browser smoke tests.** Playwright with headless Chromium.

`tests/smoke.mjs` serves the folder on a local port, loads `index.html` and `lng.html` at 1440×900 and 390×844, and clicks through the scenario toggle, every side-panel tab and a sample of rows, zoom, layer toggles, the voyage calculator (Sabine Pass→Tokyo; Ras Laffan→Tokyo with Hormuz closed must say "No open route"), the arbitrage sliders and presets, and every disruption on the main page. It fails on any console error, failed request, horizontal overflow or broken expectation. CDN scripts and map files are served from `node_modules` (same pinned versions), so it runs offline. Screenshots land in `tests/screenshots/` (gitignored).

**CI.** `.github/workflows/ci.yml` runs both on every push and pull request (Node 20, Ubuntu). The screenshots are uploaded as a build artifact.

## How it's built

- `index.html` — markup and styling (dark, "trade routes at night" theme)
- `app.js` — D3 v7 orthographic-projection globe: land from `world-atlas`, routes drawn as great-circle-interpolated arcs, drag-to-rotate, click-to-highlight
- `data/flows.json` — the baseline map: commodities, chokepoints, routes, glossary, each cited
- `data/disruptions.json` — the 2026 disruptions: chokepoints, routes, severities, summaries, sources, dated

Each disruption also carries its own map layer, shown when you select it. The globe zooms to the entry's `focus` and draws:

- `events`: dated incidents with a location, typed as `attack`, `strike`, `seizure`, `blockade`, `restriction`, `policy`, `response` or `info`, each with its own icon and a source. `approx: true` marks a location that wasn't published exactly. An event with no `lat`/`lon` still appears in the side-panel timeline.
- `zones`: shaded areas (a `polygon` of `[lon, lat]` points or a `circle` of `[lon, lat, radiusDeg]`) such as the Red Sea attack zone or the closed strait, each with a short on-map `label`.
- `regions`: sea and country names (Red Sea, Gulf of Aden, Persian Gulf…) placed with collision avoidance.

Click an event marker, or a row in the side-panel timeline, to fly to it.

Routes are categorized by severity (`critical` / `high` / `moderate`, red→orange→yellow) or marked `structural` (purple) when the story is a demand-side shift rather than a transport disruption. A route can carry an `avoidedWaypoints` path (the route everyone used to take, drawn dashed) alongside its real `waypoints` path — see the Red Sea entry for the clearest example.

## Keeping it current

`data/disruptions.json` is meant to be refreshed weekly (see `scripts/` for the update routine) rather than hand-edited each time — re-running the refresh re-searches for current chokepoint/trade-flow news and rewrites the file. The page itself never needs to change for a data refresh. A refresh must keep each route's `focus`, `events`, `zones` and `regions` fields, adding new events rather than dropping the map layer. Run `npm run validate` after a refresh: it fails if a route loses those fields or an event has no source.

## Known limitation

Not built from vessel-tracked AIS data — waypoints are illustrative routing (real ports/chokepoints, straight great-circle legs between them), not an actual shipping-lane dataset. Good enough to carry the story in an interview; not a substitute for real freight-tracking data if this ever needs to be more than that.
