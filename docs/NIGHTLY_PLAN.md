# Nightly build plan: LNG world-overview tool

A scheduled cloud agent works through this list, **one task per night, top to bottom**.
Edit freely: reorder, add or delete tasks, and the next run picks up the first unchecked one.
Each task should leave the site working, the tests green, and a dated entry in `docs/BUILD_LOG.md`.

Rules for every run are in the routine prompt; the short version: work on branch
`lng-supply-chain`, merge `origin/main` first, never push to `main`, cite a source for every number.

---

- [x] **1. Browser QA harness + bug fixes (do first: `lng.html` has never been opened in a browser).**
  Add Playwright (`package.json`, `tests/smoke.mjs`, `npm test`) that serves the folder, loads
  `index.html` and `lng.html` at 1440×900 and 390×844, fails on any console error, and exercises:
  scenario toggle, every side-panel tab, selecting a leg/plant/terminal/chokepoint/event/project,
  zoom in/out, the voyage calculator (Sabine Pass→Tokyo; Ras Laffan→Tokyo with Hormuz closed shows
  "No open route"), the arbitrage sliders, and the disruptions view on the main page (select each
  disruption). Save screenshots to `tests/screenshots/` (gitignored). Look at the screenshots and
  fix what's broken: overlapping labels, overflow, unreadable text, layout at phone width. (done 2026-10-22)

- [x] **2. Data validation + CI.** `scripts/validate.mjs`: schema checks for `data/lng.json`,
  `data/disruptions.json`, `data/flows.json` (required fields, every named point exists, lat/lon in
  range, statuses/types from the allowed sets, every event has a source), legs sum ≤ global total,
  exporter/importer tables sum to 427.9, router reaches every plant→terminal pair. GitHub Actions
  workflow running validate + smoke tests on pushes and PRs. Document both in the README. (done 2026-10-23)

- [x] **3. Prices & storage panel on `lng.html`.** Monthly JKM, TTF and Henry Hub, Jan 2024 → latest
  (sourced: e.g. World Bank Pink Sheet, EIA, ICE/Platts as reported), and EU gas storage fill vs
  5-year range (GIE AGSI). Two charts (one series per axis, no dual axes), annotate the 28 Feb 2026
  closure and 18 Mar Ras Laffan strike. Put the price data in `data/prices.json` with sources; make
  the arbitrage calculator's "Oct 2026" preset read the latest month from it. (done 2026-10-24)

- [x] **4. Fleet & freight.** LNG carrier fleet size, orderbook and deliveries, spot charter rates
  (Atlantic/Pacific, 2024–2026), and the 2026 ton-mile effect of Cape/Atlantic→Asia routing.
  New card + `data/fleet.json`; replace the voyage calculator's illustrative charter default with
  the latest sourced rate (keep the slider), and source canal fees if published. (done 2026-10-25)

- [x] **5. Import side: regas capacity and utilisation.** From GIIGNL Annual Report 2026 (public PDF)
  and GIE ALSI: regas capacity by country vs 2025 imports (utilisation), Europe's terminal
  utilisation trend, FSRUs added since 2022. Update `regas` entries with capacity, add a chart. (done 2026-10-26)

- [x] **6. Main-page parity.** Bring `index.html` / `data/flows.json` up to the LNG page's standard:
  sourced per-route volumes (EIA World Oil Transit Chokepoints, IEA, Kpler as reported) labelled
  on the lines with share of seaborne trade, a shared top nav between the two pages, consistent
  legend and detail panel. (done 2026-10-27)

- [x] **7. UX polish.** Deep links (`#leg=us-europe`, `#event=3`, voyage from/to in the URL), an asset
  search box, keyboard access to lists and tabs, a table view for each chart, mobile layout pass,
  and a print-friendly "briefing" layout. README overhaul with screenshots from task 1's harness. (done 2026-10-28)

- [x] **8. "LNG in 10 minutes" briefing + final review.** `docs/BRIEFING.md`: a one-page,
  sourced explainer of the market and the 2026 shock, using the tool's numbers. Then run every
  test, fix leftovers, and write a summary of the week at the top of `docs/BUILD_LOG.md`. (done 2026-10-29)

When every box is ticked: do a QA-only run (tests + screenshots + fix regressions), log it, and stop.
