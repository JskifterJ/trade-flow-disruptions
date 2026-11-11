# Build log

Newest first. Each nightly run adds: date, task, what changed, what was verified, open issues.

## 2026-11-11 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run did QA plus one small data update.
- **Merged `origin/main`:** already up to date. The 9 Nov refresh was merged last night.
- **Changed:**
  - `data/prices.json`: added the EU storage reading for gas day 1 Nov 2026, **74.56%**, and the same date in 2025, **82.86%**. Both come from oEnergetice.cz (3 Nov 2026), which cites GIE AGSI+. The figure fits the 74.62% we have for 21 Oct, and the IEA said EU storage was "75% at end-October" (as reported by MLex). `lastUpdated` is now 2026-11-11.
  - `lng.js` (`renderStorage`): the caption under the storage chart used to compare the latest point with the mid-October average, which would have been wrong now that the latest point is 1 Nov. It now says: the latest value; whether it is short of the 1 Nov target; the gap to the same day in 2025, when that point exists; then the mid-Oct gap, measured with the 2026 reading closest to 14 Oct (13 Oct, ≈15 pts). oEnergetice.cz is added to the source list.
  - `docs/BRIEFING.md`: the storage bullet now uses the 1 Nov figure and says the 80% target was missed.
- **Data checks (no edits):**
  - Prices: still no primary November Pink Sheet with October averages turned up. worldbank.org cannot be reached from this cloud session (DNS blocked), so `prices.json` still ends at Sep 2026.
  - Stade FSRU: nothing confirms commercial operation, so its status stays "due". energy-terminal.de cannot be reached from this session either.
- **Verified:**
  - `npm ci`, then `npm run validate`: 7,040 checks passed, and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors. I ran it before and after the change.
  - Screenshots looked at:
    - Storage card at 390px: the new 1 Nov point and its "74.6% · 1 Nov" label, the 2025 hollow dot above the target line, and the new caption all fit without overflow.
    - Prices chart on desktop and the 2026 events tab on phone: no regressions.
- **Open issues for the owner:**
  - The 1 Nov storage figure comes from a secondary site. I couldn't open the page from here, so it is taken from the search result's quote of the article. If you can, check it against AGSI+.
  - Allowing worldbank.org, energy-terminal.de and agsi.gie.eu in the environment's network settings would let the nightly runs check primary sources directly.
  - Still stand from earlier entries:
    - Oct 2026 prices, when the November Pink Sheet is out.
    - Stade commercial start: status → operating, and Germany regas 18.4 → 21.6 bcm.
    - The Qatar–Cheniere `type: "policy"` tag.
    - Minor label crowding.
    - A Reuters/UKMTO source for the 6 Nov Hormuz item.

## 2026-11-10 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** the 9 Nov weekly refresh (34bc009) merged cleanly with no conflicts. It brings `disruptions.json` up to date to 9 Nov: the Hormuz dateRange now runs "into early Nov", a 6 Nov tanker fires/mine-claims event, a 5 Nov JMIC "quieter Red Sea" event, and a 23 Jul EU 21st-package event on the Russia entry. `lng.json` gets two new events: 6 Nov Hormuz incidents, and EU 21st package vs Russian LNG (no coordinates, so it shows in the list only). The map-layer fields (focus/events/zones/regions) are intact.
- **Changed:** `data/lng.json`, one field only. The new "EU 21st package vs Russian LNG" event had a source with no date ("Skuld / Hellenic Shipping News"). I added "(Jul–Aug 2026)" to match the same item in `disruptions.json`.
- **Data checks (no edits):** a web search again found no primary November 2026 Pink Sheet, so `prices.json` still ends at Sep 2026. Aggregator pages (Cbonds) were not used.
- **Verified:**
  - `npm ci`, then `npm run validate`: 7,034 checks passed (up from 6,992, because of the new events), and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshots looked at: LNG "2026 events" tab on desktop. The 6 Nov event sorts last, opens its detail card with the approx-location note, and its map label sits beside the Hormuz marker and stays readable. The main page's Hormuz detail on desktop renders cleanly.
- **Open issues for the owner:**
  - The 6 Nov refresh text cites Invezz/OilPrice for IRGC claims, which are unconfirmed. The wording says so, but you may want a Reuters/UKMTO source once one is available.
  - Still stand: add Oct 2026 to `prices.json` when the November Pink Sheet is out; Stade commercial start (status → operating, Germany regas 18.4 → 21.6 bcm); the Qatar–Cheniere `type: "policy"` tag; the minor label crowding (Malacca on the main page, US Gulf and now the Hormuz cluster on the LNG page).

## 2026-11-09 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. The weekly refresh due around 9 Nov had not landed on `main` when this run started (00:03 UTC).
- **Changed:** nothing except this log entry. No regressions found.
- **Data checks (no edits):**
  - Prices: a web search found no primary November 2026 Pink Sheet with October averages. One secondary price-tracker page lists a World Bank Europe gas value for Oct 2026, but it was not used because it cannot be checked against the Pink Sheet. `prices.json` still ends at Sep 2026.
  - Stade FSRU: no report of commercial operation after the 2 Nov commissioning cargo, so its status stays "due".
- **Verified:**
  - `npm ci`, then `npm run validate`: 6,992 checks passed, and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshots looked at (not reviewed in recent runs): the arbitrage calculator on phone (sliders, presets, cost bars and legend fit at 390px) and the Pipeline tab on desktop (Rio Grande T4–T5 detail card and its source). Both render cleanly. Minor: the US Gulf event labels near Sabine Pass ("27 Oct 2026 · Qatar signs…", "Nov 2025 · Plaquemines…") sit close together but stay readable.
- **Open issues for the owner:**
  - When the November Pink Sheet is out, add Oct 2026 to `prices.json`.
  - Still stand: Stade commercial start (status → operating, Germany regas 18.4 → 21.6 bcm), the Qatar–Cheniere `type: "policy"` tag, and the minor label crowding on the main page (Malacca) and the LNG page (US Gulf).

## 2026-11-08 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. The latest refresh on `main` is still the one from 2 Nov, and it is already merged. The next weekly refresh is due around 9 Nov.
- **Changed:** nothing except this log entry. No regressions found.
- **Data checks (no edits):**
  - Prices: `prices.json` ends at Sep 2026 (Pink Sheet, Oct 2026 edition). A web search found no November 2026 Pink Sheet with October averages yet, so nothing was added.
  - Stade FSRU: a web search found no report of commercial operation after the 2 Nov commissioning cargo, so its status stays "due".
- **Verified:**
  - `npm ci`, then `npm run validate`: 6,992 checks passed, and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshots looked at (not reviewed in recent runs): the LNG voyage calculator on desktop (Sabine Pass→Tokyo: 9,449 nm via Panama, the Panama cap warning matches the 15 Oct data in `lng.json`) and the main page's print layout. Both render cleanly.
- **Open issues for the owner:**
  - When the November Pink Sheet is out, add Oct 2026 to `prices.json`. The arbitrage "latest month" preset picks it up automatically.
  - Still stand: Stade commercial start (status → operating, Germany regas 18.4 → 21.6 bcm), the Qatar–Cheniere `type: "policy"` tag, and the minor "≈8.7 mb/d · 20%" / Strait of Malacca label crowding (it also shows in the print layout).

## 2026-11-07 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. The latest refresh on `main` is still the one from 2 Nov.
- **Changed:** `data/lng.json`, text only. This follows up the Stade FSRU check from 5–6 Nov. energate messenger reported on 3 Nov 2026 that the first LNG cargo was unloaded onto Energos Force in Stade on 2 Nov: 160,000 m³ carried by the Lech Kaczynski from Plaquemines. LNG Prime ran the same news on 3 Nov. This cargo starts commissioning; it is not a commercial start. So the FSRU's status stays "due" and no number changes, but I updated its `source`, added a `note` (both show in the FSRU chart tooltip), and updated the note on the Germany regas row. Energos Infrastructure's press release supports the mid-Sep docking date.
- **Verified:**
  - `npm ci`, then `npm run validate`: 6,992 checks passed, and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshot looked at: LNG regas cards on phone (utilisation bars, EU terminal utilisation, FSRU chart and table). Everything renders without overflow, and Stade still shows "due" for Nov 2026.
- **Open issues for the owner:**
  - When DET confirms commercial operation at Stade, set its status to "operating" and add its 3.2 bcm/yr to the Germany regas total (18.4 → 21.6 bcm). The total is computed from the FSRU list and marked `derived`.
  - Still stand: the Qatar–Cheniere `type: "policy"` tag, and the minor label-crowding notes from earlier entries.

## 2026-11-06 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. The latest refresh on `main` is still the one from 2 Nov, and it is already merged.
- **Changed:** nothing except this log entry. No regressions found.
- **Verified:**
  - `npm ci`, then `npm run validate`: 6,992 checks passed, and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshots looked at (not reviewed in recent runs): LNG fleet and freight on phone (charter-rate chart, deliveries bars, ton-mile table, leg bar chart), and the main page's first route on phone. All render with no overflow.
- **Stade FSRU check (open issue from 5 Nov):** a web search found reports that Energos Force cooled down its tanks in Rotterdam and returned to Stade ahead of a November start-up (LNG Prime; Baird Maritime). No report confirms a first cargo or a commercial start yet, so its status in `lng.json` stays "due" for Nov 2026. Check again next week.
- **Open issues for the owner:**
  - Minor: on the phone view of the main page, the "≈8.7 mb/d · 20%" route label touches the "Strait of Malacca" label. It is still readable.
  - Still stand: the Qatar–Cheniere `type: "policy"` tag, and the label-crowding notes from earlier entries.

## 2026-11-05 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. The latest refresh on `main` is still the one from 2 Nov, and it is already merged.
- **Changed:** nothing except this log entry. No regressions found.
- **Verified:**
  - `npm ci`, then `npm run validate`: 6,992 checks passed, and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshots looked at (not reviewed in recent runs): LNG prices and storage on phone, LNG regas cards on desktop. Charts, legends, annotations and the FSRU table render cleanly with no overflow.
- **Open issues for the owner:**
  - The FSRU table lists Stade (Energos Force, 3.2 bcm/yr) as "due" for Nov 2026. It is now November, so the next weekly refresh or a manual check should confirm whether it has started and update its status.
  - Still stand: the Qatar–Cheniere `type: "policy"` tag, and the minor label-crowding notes from earlier entries.

## 2026-11-04 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. The 2 Nov refresh was merged in the previous run.
- **Changed:** `lng.js`. The "2026 events" list said "oldest first" but showed events in file order. Weekly refreshes append to the end of the file, so the 28 Sep force-majeure item appeared after the October items (flagged in the 3 Nov entry). A new `eventSortKey()` parses dates like "28 Feb 2026", "1–13 Oct 2026", "Oct 2026" and "Jan 2024 →", and the list now sorts by it. Month-only dates go first within their month, and ties keep file order. Only the display order changed. The data file is untouched, and selection, map ids and `#event=N` deep links still use file indices, so existing links keep working. No new numbers, so no new sources.
- **Verified:**
  - `npm ci`, then `npm run validate`: 6,992 checks passed, and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshot looked at: LNG "2026 events" tab on desktop. The list now runs 20 Sep → 28 Sep → Oct → 1–13 Oct → 7 Oct → 27 Oct, and the selected 27 Oct item still opens its detail card.
- **Open issues for the owner:**
  - Still stands: the Qatar–Cheniere purchase is tagged `type: "policy"` (the "sanctions / rules" icon). Fix it in the weekly-refresh prompt on `main` if you want "key fact / flow change".
  - The minor label-crowding notes from earlier entries still stand.

## 2026-11-03 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** the weekly refresh for 2 Nov landed (commit 2dd6e95). It brought the end-Oct Hormuz attacks (29 Oct: UKMTO counted 43 October incidents, 30 of them on tankers), Brent at a six-month high, QatarEnergy's purchase of US LNG from Cheniere (27 Oct) and Plaquemines Phase 1 reaching commercial operation. `data/disruptions.json` merged cleanly. `data/lng.json` conflicted only at the end of the file: main's closing `]}` collided with this branch's `regasCapacity` block. I kept the branch block. Main's new events, timeline entry and `lastUpdated` 2026-11-02 merged automatically, and both JSON files parse.
- **Changed:** `docs/BRIEFING.md` §4 item 7 (Oct). The "at least 18 ships attacked" line is replaced by UKMTO's October tally of 43 incidents, 30 on tankers [UKMTO via The National / CNBC, 30 Oct 2026]. The item also adds the QatarEnergy–Cheniere deal of up to 4 Mt/yr [Semafor / Reuters, 27 Oct 2026] and Plaquemines Phase 1 reaching commercial operation [gCaptain / Industrial Info, Oct 2026]. All of these figures are already sourced in the data files.
- **Verified:**
  - `npm ci`, then `npm run validate`: 6,992 checks passed, and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshots looked at: main-page Hormuz disruption on desktop (shows the new end-Oct summary and source) and the LNG "2026 events" tab on phone (the new Qatar–US LNG and Plaquemines markers render, and the detail card reads correctly).
- **Open issues for the owner:**
  - The refresh on `main` tagged the Qatar–Cheniere purchase as `type: "policy"`, so the LNG page shows it with the "sanctions / rules" icon. "key fact / flow change" may suit it better. That change belongs in the weekly-refresh prompt on `main`.
  - The LNG events list follows the order of the file, not the date. The 28 Sep force-majeure item appears after the October items. Sorting by date in the data, or in `lng.js`, would fix this. I left it alone this run because QA runs should not reshape the data.
  - Earlier minor label-crowding notes still stand.

## 2026-11-02 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. `disruptions.json` still says `lastUpdated` 2026-10-26. This run started at 00:04 UTC on 2 Nov, so the weekly refresh may still land later today.
- **Changed:** nothing except this log entry. No regressions found.
- **Verified:**
  - `npm ci`, then `npm run validate`: 6,950 checks passed, and all 1,634 plant→terminal pairs are routable.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshots looked at (not reviewed in recent runs): LNG Pipeline tab on phone, LNG arbitrage calculator on desktop, main-page first disruption (Hormuz) on desktop. All render cleanly with no overflow.
- **Open issues for the owner:**
  - If the next run's merge still shows no refresh after 26 Oct, check the weekly workflow on `main`.
  - Minor: on the phone Pipeline view, the "Rio Grande LNG T1–T3 (2027)" and "T4–T5 (2030)" map labels sit side by side and close together. They are still readable, so I left them.
  - Earlier items still stand: read `BRIEFING.md`, and re-check its sections 3–4 after the next weekly refresh.

## 2026-11-01 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. There has still been no weekly refresh since 26 Oct (`disruptions.json` `lastUpdated` 2026-10-26).
- **Changed:** nothing except this log entry. No regressions found.
- **Verified:**
  - `npm ci`, then `npm run validate`: 6,950 checks passed.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium`: 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshots looked at (not reviewed in the last two runs): LNG fleet and freight on phone, LNG "2026 events" tab on desktop, main-page first crude route on phone. Charts, legends, tables and detail panels render cleanly with no overflow.
- **Open issues for the owner:**
  - The weekly refresh is due around 2 Nov. If it hasn't landed by the next run's merge, check the `main` workflow.
  - Two small label crowding spots, both still readable, left as they are: on the main page at phone width, the "≈8.7 mb/d · 20%" route label touches the "Strait of Malacca" label. On the LNG desktop events view, the Ras Laffan event labels (2 Mar, 28 Sep, 18 Mar) stack tightly around the marker.
  - The 28–30 Oct items still stand: read `BRIEFING.md`, and re-check its sections 3–4 after the next weekly refresh.

## 2026-10-31 · QA-only run (nightly run)
- **Plan status:** all eight tasks are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. There has been no weekly refresh since 26 Oct, so `disruptions.json` still says `lastUpdated` 2026-10-26.
- **Changed:** nothing except this log entry. No regressions found.
- **Verified:**
  - `npm run validate`: 6,950 checks passed.
  - `npm run smoke` with `PW_CHROMIUM=/opt/pw-browsers/chromium` (the sandbox's preinstalled build 1243): 584 checks, 0 failures at 1440×900 and 390×844, no console errors.
  - Screenshots looked at (ones not reviewed in the 30 Oct run): LNG regas panel on phone, LNG "Now (Oct 2026)" globe on desktop, main-page Hormuz disruption on phone. Charts, labels, legends and the FSRU table render cleanly with no overflow.
- **Open issues for the owner:**
  - The weekly refresh last ran on 26 Oct, so the next one is due around 2 Nov. It is not overdue yet.
  - The 28–30 Oct items still stand: read `BRIEFING.md`, and re-check its sections 3–4 after the next weekly refresh.

## 2026-10-30 · QA-only run (nightly run)
- **Plan status:** all eight tasks in `docs/NIGHTLY_PLAN.md` are ticked, so this run only did QA.
- **Merged `origin/main`:** already up to date. There has been no new weekly refresh since 26 Oct, so `disruptions.json` still says `lastUpdated` 2026-10-26.
- **Changed:** nothing except this log entry. I found no regressions to fix.
- **Verified:**
  - `npm run validate`: 6,950 checks passed.
  - `npm run smoke` with `PW_CHROMIUM` pointing at this sandbox's preinstalled Chromium: 584 checks and 0 failures at 1440×900 and 390×844, with no console errors. This sandbox's Chromium (build 1243) doesn't match pinned Playwright 1.56.1 (build 1194). CI installs its own browser and is unaffected.
  - Screenshots I looked at:
    - LNG page load on desktop.
    - Prices and storage on phone.
    - Voyage calculator on phone.
    - Main page load on phone.
    - Main page Hormuz disruption on desktop.
  - Labels, charts and tables all render without overflow.
- **Open issues for the owner:**
  - The 28 Oct and 29 Oct items still stand: read `BRIEFING.md`, and re-check its sections 3–4 after the next weekly refresh.
  - In the Hormuz disruption close-up, the "28 Feb 2026 · Strait closes" label sits close to the route line. It is still readable, so I left it as is.

## Week in review · 22–29 Oct 2026 (nightly tasks 1–8)
Eight nightly runs took the LNG page from a never-opened draft to a tested, sourced tool. All eight plan tasks are done.
- **Quality net (tasks 1–2).** A Playwright smoke suite (now 584 checks at 1440×900 and 390×844, failing on any console error or overflow) and a data validator (6,950 checks: schema, allowed values, sources, totals = 427.9 Mt, router reachability), both run in CI on every push.
- **Content (tasks 3–5).**
  - Prices and EU storage: World Bank Pink Sheet and GIE AGSI+ via trackers.
  - Fleet and freight: IGU and Spark prints, the ACP toll and computed tonne-miles.
  - The import side: regas utilisation by country, the EU utilisation trend and the 13 FSRUs started since 2022.
  - Each figure carries its publisher and date in `data/*.json`.
- **Main page (task 6).** It now has sourced route volumes and shares of seaborne trade. The LNG routes are sums of the LNG page's legs, so the two pages can't disagree. A shared nav links the pages.
- **UX (task 7).** Deep links, asset search, keyboard access, a table view for every chart, a print briefing, and a README with screenshots.
- **Explainer (task 8).** `docs/BRIEFING.md`.
- **Weakest data, check before relying on it in an interview:**
  - The regas capacity patchwork (mixed dates and bases).
  - Oil route volumes derived from shares × totals.
  - The one-month products denominator.
  - Spark charter prints from aggregators, with no prints for Mar–Jul 2026.
  - Monthly "JKM" is a Japan import-price proxy; real JKM is only shown as spot prints.
  - The arbitrage calculator's freight, canal and regas defaults are illustrative.
  - The sandbox blocked every primary PDF and data download, so all figures come from web-search extracts. The exact items to spot-check are listed under each day below.
- **From here:** the plan is complete. Later runs are QA-only unless the owner adds tasks.

## 2026-10-29 · task 8: "LNG in 10 minutes" briefing + final review (nightly run)
- **Merged `origin/main`**: already up to date. No new weekly refresh since 26 Oct.
- **`docs/BRIEFING.md` (new).** A one-page explainer in six parts:
  1. The market: 2025 trade, top exporters and importers, capacity, fleet.
  2. Pricing and the US FOB netback. It includes a worked example from the arbitrage calculator's 5 Oct defaults: the JKM–TTF spread of $1.34 is below Panama's extra cost of ≈$1.60, so the cargo goes to Europe.
  3. The chokepoints.
  4. The 2026 shock in seven dates, with Hormuz exposure by importer and the effects on prices, storage, freight and tonne-miles, plus GIIGNL's three output scenarios.
  5. The 2027 supply wave, including how much of it sits behind Hormuz.
  6. Five interview questions.
  - Every figure comes from the repo's data files and names its source. Arithmetic is marked "computed here":
    - Top-3 exporters 63%.
    - Qatar+UAE 85.6 Mt = 20%.
    - Hormuz oil 26% of seaborne.
    - Qatar+UAE ≈7.1 Mt/month in 2025.
    - Pipeline 219 Mtpa, of which 100 targets 2027, 117 is US and 58 sits behind Hormuz.
  - It has four deep links into `lng.html`, and the README links to it from the top.
- **Leftovers fixed (from the 28 Oct open issues):**
  - `app.js`: switching the main page from Disruptions back to Main flows (by click or by keyboard) now returns to the home globe instead of keeping the disruption's zoom.
  - `app.js`: a chokepoint name that would run off the globe's right edge now flips to the left of its diamond. Its collision footprint follows the label. "Strait of Malacca" is no longer clipped at 390px.
- **Smoke tests: 584 checks, up from 573.**
  - Every `lng.html#…` link in `BRIEFING.md` must load without being rewritten.
  - The zoom must reset when switching back to flows.
  - No chokepoint label may extend past the globe's edges.
- **Sources:** no new figures. The briefing uses existing data: GIIGNL Annual Report 2026, IGU World LNG Report 2026, World Bank Pink Sheet, GIE AGSI+ via trackers, Spark via Reuters/LNG Prime, ACP tariff, EIA chokepoints, Kpler/Reuters, Bloomberg.
- **Verified:**
  - `npm test` is green: 6,950 data checks and 584 browser checks at both viewports, with no console errors and no overflow.
  - I looked at the main-page load screenshots on desktop (unchanged) and phone (Malacca label now inside the globe).
  - I checked the briefing's arithmetic against the data files with Node: the leg sums, the project totals by start year and Hormuz flag, and the arbitrage margins of 16.36, 16.10 and 15.50 $/MMBtu.
- **Open issues for the owner:**
  - **Read `docs/BRIEFING.md` once for tone and emphasis.** It is written for interview prep, so the "five questions" section states interpretations, such as why Henry Hub fell, as well as sourced facts.
  - **The briefing is a snapshot (data as of 26 Oct).** It does not update itself when `lng.json` or the weekly refresh changes. Re-check sections 3–4 after each refresh.
  - The pipeline figure (219 Mtpa) counts only the 24 projects the tool tracks. That is GIIGNL's 200 Mtpa under construction plus starting trains, not a complete list.
  - The main page still has no search box; I judged it unnecessary for 14 routes. The briefing PDF still prints charts one per row.

## 2026-10-28 · task 7: UX polish (nightly run)
- **Merged `origin/main`**: already up to date, no new weekly refresh since 26 Oct.
- **Deep links on both pages.** The hash now mirrors the view, updated with `history.replaceState`, so the address bar is always a shareable link. Opening a link restores the view, and editing the hash in an open tab moves it. Unknown values are dropped.
  - `lng.html` takes `#leg=`, `#plant=`, `#terminal=`, `#project=` (name slugs; a bracketed suffix can be left off, e.g. `ras-laffan`), `#choke=`, `#event=` (1-based, oldest first) and `#scenario=2026`. The voyage calculator adds `#from=…&to=…&open=hormuz,panama`, which draws that route.
  - `index.html` takes `#route=`, `#choke=`, `#disruption=` (+ `&event=n`) and `#view=disruptions`.
  - The detail panel has a **Copy link to this view** button.
- **Asset search** (`lng.html`). One box above the tabs covers every plant, terminal, leg, chokepoint, event and project. It matches on name, country, owner and type, ranks prefix matches first and shows 8 results. It is an ARIA combobox: ↑/↓, Enter, Esc, and "No match". Choosing a project switches on the under-construction layer.
- **Keyboard access.**
  - The tab strips on both pages use the WAI-ARIA tabs pattern: `role=tab`, `aria-selected`, roving tabindex, and ←/→/Home/End.
  - List rows, route cards, mapped event rows and voyage-table rows are focusable buttons (`aria-pressed`): Enter/Space selects and ↑/↓ moves. Focus stays on the row when the list redraws.
  - There is a visible `:focus-visible` ring, and the detail panel is `aria-live`.
- **Table view for every chart.** All 15 chart cards on `lng.html` (the ton-mile card is already a table) get a **Show as table** `<details>`. It holds the same numbers plus their source per row: monthly prices with their Pink Sheet edition, every storage point, charter print, regas country and so on. Numbers are right-aligned, the table scrolls inside the card on phones, and it survives the resize redraw with its open state kept.
- **Print briefing.** A *print briefing* button on both pages, plus `@media print` styles: a light page, controls, lists and calculator inputs hidden, one column, and no page breaks inside cards. Chart text, gridlines and hollow marks are recoloured for paper through attribute selectors, while the globe keeps its dark ocean (`print-color-adjust: exact`). A header line stamps the print date and the deep link to the exact view.
- **Mobile pass.**
  - Tighter header, sections and KPI tiles below 600px; the 5th KPI now spans the row instead of sitting alone.
  - The search input is 16px on phones, so iOS doesn't zoom in on focus.
  - The main page at 390px was already fine.
- **Timeline order fix.** `lng.json`'s timeline had the 28 Sep 2026 force-majeure entry (from the 26 Oct weekly refresh) after 15 Oct. The timeline is now sorted by its free-text dates when drawn. I left the data untouched, to avoid merge conflicts with future refreshes that append entries.
- **README overhaul.** The README is restructured: the two pages, how to use them (search, tables, keyboard, print), a deep-link reference table, testing, how it's built, and keeping it current. It has 9 screenshots in `docs/img/` (JPEG, ≈1 MB in total), regenerated by the new `npm run shots` (`README_SHOTS=1` on the smoke run).
- **Validator:** plant, terminal and project names must give unique link slugs, and a short slug may not collide with another item's full slug. 6,950 checks. I injected a duplicate terminal name: it was caught, then I restored the file.
- **Smoke tests:** 573 checks, up from 350.
  - Every deep-link kind on both pages, the combined LNG link (scenario + leg + voyage + passages), voyage changes rewriting the link, `hashchange`, and bad values dropped.
  - Search by keyboard and by mouse.
  - Tab and row keyboard navigation with focus retention.
  - One non-empty table view per chart, with row counts matched to the data (exporters, regas countries, price months) and resize-safe.
  - Emulated print media: white background, controls hidden, the dated link in the header, no overflow at A4 width. It also writes a sample `lng-desktop-briefing.pdf`.
- **Sources:** no new figures this run. Everything shown comes from the existing data files and their sources.
- **Verified:** `npm test` is green (6,950 data checks and 573 browser checks at 1440×900 and 390×844, with no console errors and no overflow). I looked at the search, table-view (desktop and phone), phone-load, 2026-globe and disruptions screenshots, the main-page print screenshot and 12 pages of the LNG briefing PDF. That led to fixing text-column alignment in the tables, the 5-across KPI row in print, the dark hollow marks and status boxes in print, and the hard-to-read yellow figure text and padding in the main-page print.
- **Open issues for the owner:**
  - The briefing prints charts one per row (≈14 A4 pages for the LNG page). Two per row would shrink the SVG chart text below readable size, because charts are drawn at screen width.
  - The main page has no search box (14 routes, so the list is the search). Its charts-free layout needs no table views.
  - Chart bars and globe markers themselves are not keyboard targets. The table views and lists are the keyboard and screen-reader path to the same data.
  - "Strait of Malacca" is clipped at the globe's right edge on the main page at 390px (an older issue, cosmetic).
  - On the main page, switching from Disruptions back to Main flows keeps the disruption's zoom level (older behaviour). Press reset.

## 2026-10-27 · task 6: main-page parity (nightly run)
- **Merged `origin/main`** (weekly refresh of 26 Oct: Qatar force majeure extended into Nov–Dec). `data/disruptions.json` merged cleanly. `data/lng.json` conflicted only on its closing brackets: I kept this branch's `regasCapacity` and main's new events and `lastUpdated` 2026-10-26. Both files validate.
- **Sourced route volumes on `index.html`.** Each of the 14 routes in `data/flows.json` now has a `flow` with `value`, `unit` (mb/d or Mt), `period`, `basis`, `source` and `approx`. `basis` says what is counted and gives the arithmetic when a figure is derived. The line label reads volume · share of that commodity's seaborne trade (for example "≈8.7 mb/d · 20%" or "79 Mt · 18%"). Line width now follows the share; the three size classes and the `size` field are gone. The labels go through the existing collision-avoiding placer: chokepoint names and diamonds now count as obstacles, and a selected route always shows its own label. Labels are tinted to match each commodity's colour.
- **The five LNG routes are sums of the LNG page's GIIGNL legs** (`flow.legs`), so the two pages can't disagree. For example, Qatar→Asia = qatar-neasia + qatar-sasia = 66.4 Mt.
- **Denominators** are in a new `seaborneTotals` block:
  - Crude ≈44 mb/d: IEA, Hormuz's "nearly 15 mb/d = nearly 34% of global crude trade". The division is mine.
  - Products ≈31.5 mb/d: IEA OMR Aug 2026, which gives July 2026 at 27.7 mb/d, 3.8 below a year earlier. This is one month, derived.
  - LNG 427.9 Mt: GIIGNL.
  - All oil 79.8 mb/d: EIA, H1 2025.
  - Chokepoints have an `oil` figure from EIA World Oil Transit Chokepoints (updated 3 Mar 2026, H1 2025). This adds Cape 9.1, Panama 2.3, Turkish 3.7 and Danish 4.9 mb/d to the existing four.
- **Detail panel and list now match `lng.html`.** The panel uses figure tiles (volume, share, number of chokepoints), a "Counts:" line, the via list, a link to the LNG page for LNG routes, and separate story and volume-source lines. A chokepoint shows its mb/d, its share of seaborne oil, and the flows through it with their volumes. Each list card shows "volume · share" with a share bar, sorted by volume, and each group header names its denominator.
- **Legend, nav and primer.** The flows legend now explains the width scale. A **shared top nav** (`nav.topnav`, with identical markup and CSS on both pages and `aria-current` on the active page) replaces the old ad-hoc links. Primer point 4 is rewritten, and the globe's aria-label no longer talks about "chemicals".
- **Validator:** `seaborneTotals` units and sources; each route's flow unit matches its commodity; shares per commodity add up to ≤100% (now crude 42%, LNG 56%, products 6%); LNG routes equal the sum of their `lng.json` legs; the LNG total equals `globalTrade2025Mt`; chokepoint oil is sourced. 6,740 checks.
- **Smoke tests:** the top nav on both pages; at least 5 route labels at load; no label overlaps on the flows globe at load or with Hormuz selected; one volume and one bar per card; volume tiles and source in every route's detail; one label for a selected route; Hormuz's oil share. 350 checks.
- **Sources (web-search extracts, gathered by two research sub-agents; page fetches are blocked in the sandbox):**
  - EIA World Oil Transit Chokepoints (3 Mar 2026) and Hormuz destination shares for Q1 2025 (via Statista/Visual Capitalist/AFP).
  - EIA Today in Energy (10 Mar 2026: US crude exports, and US transport-fuel exports by destination).
  - IEA Strait of Hormuz factsheet (2026); IEA OMR (12 Mar, 13 May and Aug 2026).
  - S&P Global Commodities at Sea (15 Jan 2026); Reuters (Jan 2026, India supplier shares); Moscow Times/Kommersant/Energy Intelligence (Kozmino).
  - NUPRC via Economic Confidential, and Angolan official data via Le360 (Jan 2026).
  - MDIC/StoneX via Agência iNFRA (8 Jan 2026, Brazil).
- **Verified:** `npm test` is green: 6,740 data checks and 350 browser checks at 1440×900 and 390×844, with no console errors and no overflow. I looked at the desktop load, the Hormuz screenshot, and the phone route-0 and LNG-page screenshots. I fixed rounding so that 20.9 no longer shows as "21".
- **Open issues for the owner:**
  - **Most oil route figures are estimates (≈)** built from shares × totals. Check them before an interview, especially:
    - Russia→India ≈1.6 mb/d: 33.3% × an assumed ≈4.8 mb/d.
    - US→Europe crude ≈1.8 mb/d: the 2024 base of 1.93 less EIA's −7%.
    - Gulf→China/Japan/Korea 8.7 mb/d: Q1 2025 only.
  - **The products denominator is one month (Jul 2025).** Swap in a full-year Kpler/Vortexa figure if you have one.
  - **"US Gulf Coast products → Latin America" ≈1.16 mb/d is a floor.** It counts gasoline, diesel and jet to named buyers only, and leaves out LPG.
  - **"Middle East & India diesel/jet → Europe" ≈0.72 mb/d counts the Middle East only.** India adds roughly another 0.15–0.25 mb/d.
  - The narrative `volume` sentences are kept, so some still quote older context (e.g. "~84% of Hormuz crude goes to Asia" is 2024; it was 89% in H1 2025).

## 2026-10-26 · task 5: import side, regas capacity and utilisation (nightly run)
- **New section 6 on `lng.html`: "The import side".** Voyage, arbitrage, timeline and primer are renumbered 7–10. It has four cards, all drawn at container width and redrawn on resize:
  - **Regas utilisation by country** (`#c-regas`). Three tiles at the top: world regas 1,247 Mtpa = 2.9× 2025 trade (GIIGNL); IGU's 39.2% average use of 1,113.5 Mtpa; floating capacity 216 Mtpa. Below them, bars for 17 countries showing 2025 imports ÷ capacity, coloured by region. The range runs from Poland ≈100%, the Netherlands ≈96% and Belgium 90% down to Japan 30%, the UK 27% and Greece ≈23%. Tooltips show the division, the capacity's date, source and confidence, and any published utilisation figure (India: IGU says 47%, our computed figure is 48%).
  - **EU terminal utilisation 2021 → Q1 2026** (`#c-euutil`): IEEFA's series of 63 / 58.5 / 42 / 51 / 55%. 2021 is a hollow bar because it comes from a different basis (GIE ALSI, Jan 2021–Jan 2022, 41.7%). Q1 2026 is hollow too, as a part year.
  - **FSRUs started in Europe since 2022** (`#c-fsru`): bcm/yr added per start year, stacked by where each unit is now (operating, closed or charter ended, due). The footnote gives 12 units started Sep 2022–May 2025, ≈47 bcm/yr still operating and 13 bcm/yr gone again (Le Havre, Mukran's second unit). Stade is due in Nov 2026.
  - **FSRU table** (`#c-fsru-table`): vessel, start month, capacity and status for all 13 units. It doubles as the table view for the chart. The vessel column is hidden below 600px.
- **Map and side panel:** 13 `regas` entries now carry `capacity`, `capacityMtpa` and `capacitySource`, and they show in the tooltip and the detail panel. The detail panel and the Import-terminals list group labels also show the country's utilisation. There is a Turkey→Türkiye alias, because the terminals and the GIIGNL tables spell it differently.
- **Primer #5:** Germany went "from zero to four operating units, with a fifth due at Stade", not "three".
- **Data:** `regasCapacity` in `data/lng.json` holds global totals, `countries[]` (capacity + unit + asOf + confidence + source, `derived` where I summed or converted), `euUtilisation[]`, `euCapacity[]` (ACER) and `fsrus[]`.
- **Validator:** new `validateRegasCapacity` checks units, regions, confidence, sources, 2025 imports present, implied utilisation 5–105%, FSRU start order and statuses (read from `FSRU_STATUS` in `lng.js`), and the GIIGNL total = `capacityTotals.regas`. Terminal capacity needs a source. 6,549 checks in all. I injected five faults (implausible capacity, bad status, missing source, pre-2022 start, missing terminal source); all were caught, then I restored the file.
- **Smoke tests:** bar count equals the country count, EU bar count, FSRU segments and table rows, the world-regas tile, bar and FSRU tooltips with sources, no label overlaps, Dahej's detail panel showing 17.5 Mtpa and its utilisation, and the Turkey alias. 300 checks.
- **Sources:**
  - GIIGNL Annual Report 2026 (global 1,247 Mtpa).
  - IGU World LNG Report 2026: global 1,113.5 Mtpa / 39.2% / 216.1 Mtpa floating; China 175 Mtpa; India 52.5 Mtpa / ~47% (via Swarajya/Chemindigest).
  - IGU World LNG Report 2025 as tabulated by Incorrys: Japan 217, Korea 143 (end-2024).
  - SynMax/Leviaton 2025: Spain 49, UK 36, Türkiye 34.1, France 30.4 Mtpa.
  - Operators and ministries: Gasunie, Snam (via S&P), Fluxys, Gaz-System (22 Jan 2025), Singapore MTI/SLNG, KIPIC, LNG Prime, Argus/S&P.
  - IEEFA European LNG Tracker (May 2026) and Global LNG Outlook 2024–28; GIE ALSI via Food & Water Europe; ACER (2025).
  - FSRU dates and statuses: the operators (DET, Deutsche ReGas, Gastrade, TotalEnergies, BOTAŞ via GEM) as reported by LNG Prime, Il Post and Shipping Italy.
  - The sandbox again blocked every PDF and page fetch (giignl, IGU, IEEFA, ACER), so all of this comes from web-search extracts, gathered by three parallel research sub-agents and checked against each other.
- **Verified:** `npm test` is green: 6,549 data checks and 300 browser checks at 1440×900 and 390×844, with no console errors and no horizontal overflow. I looked at the desktop and phone screenshots of the new section and of the Import-terminals tab, then shortened the tile and status labels.
- **Open issues for the owner:**
  - **The country capacities are a patchwork.** This is the weakest part of the task: dates range from end-2024 to 2026, and the bases (IGU, SynMax, operators) differ. Every row says which it uses. If you can download the **GIIGNL 2026 PDF**, replace `regasCapacity.countries` with its end-2025 country table on a single basis. The chart and validator pick the new rows up automatically. Taiwan is left out because no published total was found.
  - **Check the low-confidence rows.** Germany (≈18.4 bcm) is summed from the FSRU list at 2026 capacities, though Wilhelmshaven 2 only ran at 1.9 bcm in 2025. Greece is Revithoussa plus a converted Alexandroupolis figure. Japan may be 219 Mtpa for end-2025 (Rystad/IGU, unconfirmed).
  - **The FSRU capacities are nominal.** Inkoo and Wilhelmshaven 1 are approximate (≈5). Piombino's 5 bcm is Snam's widely quoted figure, but I didn't see it in an extract. Saros has only a 28 mcm/d send-out figure, so it isn't in the bars. Confirm whether the Krk upgrade (Nov 2025) should be listed; it is an onshore-moored FSRU expansion and is left out.
  - **No EU utilisation after Q1 2026** was found. Add H1/Q3 2026 when IEEFA publishes; the chart takes any number of periods.
  - **Gaps in the analysis:** the arbitrage regas fee ($0.50/MMBtu) is still illustrative, and utilisation ignores seasonality (winter peaks are what Japan and Korea are built for).

## 2026-10-25 · task 4: fleet & freight (nightly run)
- **New section 5 on `lng.html`: "Fleet and freight".** Later sections are renumbered 6–9. It has four cards, all drawn at container pixel width and redrawn on resize:
  - **Spot charter rates** (`#c-charter`): 20 dated Spark Commodities prints, Oct 2024 → ≈23 Oct 2026, for Atlantic (Spark30S) and Pacific (Spark25S) on one $k/day axis. Dec 2025 is a monthly average (square). Hollow dots mean the date or value is approximate. The mid-Mar → early-Aug 2026 gap and the sparse 2024–25 prints are drawn as faint dotted joins. The chart marks the Hormuz closure and labels only the peak ($287.5k) and the latest Atlantic print. Every tooltip names its source.
  - **Carrier deliveries** (`#c-fleet`): IGU counts of 32 / 64 / 79 delivered in 2023–25 and 107 scheduled for 2026. Below it are tiles for 804 active, 301 on order (37%) and the orderbook going 337 → 301. The footnote explains why IGU, Clarksons, GIIGNL and Drewry counts differ.
  - **2026 ton-mile effect** (`#c-tonmile`) and **legs with the biggest change** (`#c-tmlegs`, diverging bars). These are computed in the browser from the map's 31 legs (laden distance along each drawn path × volume, 2025 vs the Oct-2026 run-rate). Volume falls −10%, average haul rises +1% (4,484 → 4,536 nm), tonne-miles fall −9%, and "ships kept busy" (a floor at 17 kn) drops from 392 to 358. In short: voyages got a bit longer but the trade shrank, while 107 ships are due. That explains why rates are back below pre-war levels.
- **Voyage calculator:** the charter default is now the latest Atlantic print from `fleet.json` ($21,750/day) instead of the illustrative $80,000. I kept the slider, with $250 steps and a $5k–300k range, and added "Atlantic spot" / "Pacific spot" preset buttons. The Panama fee is now the ACP tariff: $2.05/m³ × 174,000 m³ = $356,700 per transit, charged for the laden and ballast legs. The note says the ballast rate wasn't retrieved, so this is an upper bound that excludes tugs and slot auctions. Suez stays at an illustrative $600k, flagged `estimate`. The note also shows the charter cost and canal tolls per round trip.
- **`data/fleet.json`** (new): charter prints (each with a source; `approxDate`/`approx` flags), annotations, IGU deliveries and fleet snapshots (the end-2024 active count of 742 is flagged `activeDerived`), Drewry order counts, the Clarksons Jul-2026 count, and canal fees.
- **Text updates:** the primer, value-chain "Shipping" step and "what the shock did" list now use IGU's 804 instead of "~800", and say rates collapsed after the spike. The footer and README now describe the new panel and data file.
- **Validator:** new `validateFleet`. Prints must be dated, ascending, sourced, in $/day, with at least one print per basin; delivery years must be consecutive; snapshots must be dated and sourced; the Panama rate needs a source and Suez must be flagged as an estimate. 6,128 checks. I injected four faults (missing source, out-of-order date, broken year, Suez estimate flag removed): all were caught, then I restored the file.
- **Smoke tests:** check that the new charts are non-empty, the print count matches the data, the Hormuz annotation is present, deliveries bars and the ton-mile table render, and tooltips work. They also check that the charter default equals the latest Atlantic print, the Pacific preset changes the rate and the freight, the voyage note cites the ACP toll, and fleet/freight labels don't overlap. 268 checks.
- **Sources:**
  - Spark Commodities posts on X (31 Oct 2024, 22 Jan 2025, 27 Feb 2025, 2 Jan 2026; dates decoded from post IDs).
  - LNG Prime weekly Spark reports (Nov 2024, 31 Oct 2025, 4 Mar and 7/14/21/28 Aug, 25 Sep, 2 Oct, 16 Oct 2026).
  - Reuters, 7 Oct 2026 (via BOE Report/EnergyNow), and its weekly LNG column of ≈23 Oct (via rallies.ai).
  - Riviera Maritime Media (3–4 Mar 2026), Timera Energy (17 Mar 2026 and the Aug "freight rates collapse" note), MNI (22 Jan 2025), ShipUniverse (Oct 2026).
  - IGU World LNG Report 2024/2025/2026; Drewry; Clarksons via Xinde Marine News.
  - ACP Official Tariff item 1010 (1 Jan 2025); GMK Center (10 Jun 2026) on the SCA LNG surcharge.
  - This sandbox blocks page fetches and PDF downloads (lngprime, IGU and pancanal all returned 403/ENOTFOUND), so every figure comes from web-search extracts.
- **Verified:** `npm test` is green: 6,128 data checks and 268 browser checks at 1440×900 and 390×844, with no console errors. I looked at the desktop and phone screenshots of the new section and the voyage calculator. I fixed a duplicated Clarksons sentence and a symmetric axis that wasted half the diverging chart.
- **Open issues for the owner:**
  - **The latest print (21,750 / 30,750, ≈23 Oct) comes from an aggregator** republishing Reuters' weekly column, and its exact date is unconfirmed. If it's wrong, delete the last entry in `charter.prints` and the calculator falls back to 6 Oct ($25,750).
  - **Mar–Jul 2026 has no prints.** Spark's history is licensed. If you have access, add dated prints and the chart picks them up. Also check the early-March peak date (stored as ≈6 Mar) and the Pacific peak ($225,750, single source).
  - **The Panama ballast toll** isn't public in what I could reach, so the calculator charges the laden rate both ways. Check ACP tariff item 1010 for the ballast/round-trip rate. Suez base dues are still a placeholder.
  - **The arbitrage calculator's freight defaults** (fEu/fPan/fCape $/MMBtu) are still illustrative. A follow-up could derive them from the latest charter print and the router distances.
  - **"Ships kept busy" is a lower bound.** It is not comparable to the 804-ship fleet; the caption says so.

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
