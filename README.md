# Trade Flow Disruptions

An interactive globe of chemicals, plastics and raw-materials trade routes, laid over the supply-chain disruptions actually moving prices right now — the Strait of Hormuz, the Red Sea/Cape of Good Hope reroute, the Panama Canal, and the structural China PE/PP export flip.

Built while prepping for an interview with [Tricon Energy](https://www.tricon.com)'s Commercial Development Program, and kept here because the underlying questions (which chokepoint matters most this month, how transport disruption compounds with demand-side shifts) outlast any one interview.

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
- `data/disruptions.json` — the actual content: chokepoints, routes, severities, summaries, sources, dated

Routes are categorized by severity (`critical` / `high` / `moderate`, red→orange→yellow) or marked `structural` (purple) when the story is a demand-side shift rather than a transport disruption. A route can carry an `avoidedWaypoints` path (the route everyone used to take, drawn dashed) alongside its real `waypoints` path — see the Red Sea entry for the clearest example.

## Keeping it current

`data/disruptions.json` is meant to be refreshed weekly (see `scripts/` for the update routine) rather than hand-edited each time — re-running the refresh re-searches for current chokepoint/trade-flow news and rewrites the file. The page itself never needs to change for a data refresh.

## Known limitation

Not built from vessel-tracked AIS data — waypoints are illustrative routing (real ports/chokepoints, straight great-circle legs between them), not an actual shipping-lane dataset. Good enough to carry the story in an interview; not a substitute for real freight-tracking data if this ever needs to be more than that.
