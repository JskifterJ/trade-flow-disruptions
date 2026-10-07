# Energy Trade Flows

**Live:** https://jskifterj.github.io/trade-flow-disruptions/

An interactive globe with two views:

- **Main flows**: the pre-crisis (2025) map of how crude oil, LNG and refined products move by sea. Covers 14 major routes, line width by rough size class, and 8 clickable chokepoints (Hormuz, Malacca, Bab-el-Mandeb, Suez, the Cape, Panama, the Turkish and Danish straits). Each one shows its volume and why a trader cares. Includes a short primer and glossary (mb/d, VLCC, arbitrage, crack spreads, benchmarks).
- **Disruptions now**: what 2026 broke and where the barrels went. The Hormuz closure and the bypass pipelines, Qatar's LNG force majeure, the renewed Red Sea attacks, Panama drought limits, the Russian shadow fleet, plus one petrochemicals structural shift.

First built in Oct 2026 as a chemicals/plastics sketch while preparing for Tricon Energy's Commercial Development Program. Rebuilt on 2026-10-07 around energy flows, for learning the map and for commodity-trading applications.

## Viewing it

This is a static page with no build step. Fetching `data/disruptions.json` over `file://` is blocked by the browser's CORS policy, so serve it over HTTP:

```
python -m http.server 8080
# then open http://localhost:8080
```

Drag the globe to rotate it. Click a route in the right-hand list to highlight it and read the full story and sources; click it again to deselect.

## How it's built

- `index.html` — markup and styling (dark, "trade routes at night" theme)
- `app.js` — D3 v7 orthographic-projection globe: land from `world-atlas`, routes drawn as great-circle-interpolated arcs, drag-to-rotate, click-to-highlight
- `data/flows.json` — the baseline map: commodities, chokepoints, routes, glossary, each cited
- `data/disruptions.json` — the 2026 disruptions: chokepoints, routes, severities, summaries, sources, dated

Routes are categorized by severity (`critical` / `high` / `moderate`, red→orange→yellow) or marked `structural` (purple) when the story is a demand-side shift rather than a transport disruption. A route can carry an `avoidedWaypoints` path (the route everyone used to take, drawn dashed) alongside its real `waypoints` path — see the Red Sea entry for the clearest example.

## Keeping it current

`data/disruptions.json` is meant to be refreshed weekly (see `scripts/` for the update routine) rather than hand-edited each time — re-running the refresh re-searches for current chokepoint/trade-flow news and rewrites the file. The page itself never needs to change for a data refresh.

## Known limitation

Not built from vessel-tracked AIS data — waypoints are illustrative routing (real ports/chokepoints, straight great-circle legs between them), not an actual shipping-lane dataset. Good enough to carry the story in an interview; not a substitute for real freight-tracking data if this ever needs to be more than that.
