# Build log

Newest first. Each nightly run adds: date, task, what changed, what was verified, open issues.

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
