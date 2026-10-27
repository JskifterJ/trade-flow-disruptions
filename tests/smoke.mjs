// Browser smoke tests: serves the repo over HTTP, loads index.html and
// lng.html at desktop and phone sizes in headless Chromium, clicks through
// every control and fails on any console error, page error, failed request,
// horizontal page overflow or broken expectation. Screenshots go to
// tests/screenshots/ (gitignored). CDN scripts and map files are served from
// node_modules, so the tests run offline and pin the same versions as the pages.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'tests', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const CDN = [
  [/cdn\.jsdelivr\.net\/npm\/d3@7\.9\.0\/dist\/(.+)$/, 'node_modules/d3/dist/'],
  [/cdn\.jsdelivr\.net\/npm\/topojson-client@3\.1\.0\/dist\/(.+)$/, 'node_modules/topojson-client/dist/'],
  [/cdn\.jsdelivr\.net\/npm\/world-atlas@2\.0\.2\/(.+)$/, 'node_modules/world-atlas/'],
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const VIEWPORTS = [['desktop', 1440, 900], ['phone', 390, 844]];
const failures = [];
let checks = 0;
let lastErrors = [];
function check(ok, msg) { checks++; if (!ok) failures.push(msg); }

// PW_CHROMIUM: use a preinstalled Chromium when it doesn't match the pinned Playwright build
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

async function openPage(file, vp) {
  const [name, width, height] = vp;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: name === 'phone' });
  const page = await ctx.newPage();
  const errors = [];
  lastErrors = errors;
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  await page.route(/^https?:\/\//, (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE)) return route.continue();
    for (const [re, dir] of CDN) {
      const m = url.match(re);
      if (m) return route.fulfill({ path: path.join(ROOT, dir, m[1]) });
    }
    errors.push(`unexpected external request: ${url}`);
    return route.abort();
  });
  await page.goto(`${BASE}/${file}`);
  return { page, ctx, errors, tag: `${file.replace('.html', '')}-${name}` };
}

async function noOverflow(page, tag, where) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  check(o.sw <= o.w + 1, `${tag} ${where}: page scrolls horizontally (${o.sw}px content in ${o.w}px viewport)`);
  // elements poking out of the viewport (hidden by a parent's overflow or not)
  const out = await page.evaluate(() => {
    const W = window.innerWidth;
    const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true; } return false; };
    return [...document.body.querySelectorAll('*')].filter((el) => {
      if (el.closest('svg') && el.tagName !== 'svg') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > W + 1 && getComputedStyle(el).position !== 'fixed' && !clipped(el);
    }).slice(0, 5).map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}`);
  });
  check(!out.length, `${tag} ${where}: elements extend past the ${o.w}px viewport: ${out.join(', ')}`);
}

// Pairs of visible globe labels whose boxes overlap by more than a few px.
async function labelOverlaps(page, selector) {
  return page.evaluate((sel) => {
    const boxes = [...document.querySelectorAll(sel)].filter((t) => {
      const cs = getComputedStyle(t);
      return t.textContent.trim() && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && +(t.getAttribute('opacity') ?? 1) > 0.05;
    }).map((t) => ({ t: t.textContent.trim(), b: t.getBoundingClientRect() })).filter((x) => x.b.width > 0);
    const hits = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].b, b = boxes[j].b;
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 3 && oy > 3) hits.push(`${boxes[i].t} × ${boxes[j].t}`);
    }
    return hits;
  }, selector);
}

// Shared top nav: both pages listed, the current one marked, nothing overflowing.
async function topNav(page, tag, file) {
  const nav = await page.evaluate(() => [...document.querySelectorAll('nav.topnav a')].map((a) => [a.getAttribute('href'), a.getAttribute('aria-current')]));
  check(nav.some(([h]) => h === 'index.html') && nav.some(([h]) => h === 'lng.html'), `${tag}: top nav must link both pages`);
  check(nav.filter(([, c]) => c === 'page').length === 1 && nav.find(([, c]) => c === 'page')?.[0] === file, `${tag}: top nav must mark ${file} as the current page`);
}

// ------------------------------------------------------------------ lng.html
async function testLng(vp) {
  const { page, ctx, errors, tag } = await openPage('lng.html', vp);
  await page.waitForFunction(() => /shipping legs/.test(document.querySelector('#meta-row')?.textContent || ''), null, { timeout: 15000 });
  await page.waitForTimeout(800);
  check(await page.locator('#globe path').count() > 50, `${tag}: globe did not draw`);
  await topNav(page, tag, 'lng.html');
  check(await page.locator('#kpis .kpi').count() >= 5, `${tag}: KPIs missing`);
  for (const id of ['#c-exp', '#c-imp', '#c-choke', '#c-gap', '#c-expo', '#c-wave', '#c-scen', '#c-prices', '#c-storage', '#c-charter', '#c-fleet', '#c-tonmile', '#c-tmlegs', '#c-regas', '#c-euutil', '#c-fsru', '#c-fsru-table', '#chain', '#timeline', '#gloss']) {
    check((await page.locator(id).innerHTML()).length > 50, `${tag}: ${id} is empty`);
  }
  // regression: the voyage calculator must not draw its default route on load
  // (that dims every leg and hides their volume labels)
  const legLabels = await page.evaluate(() => [...document.querySelectorAll('#globe text')]
    .filter((t) => t.__data__?.kind === 'leg' && t.style.display !== 'none').length);
  check(legLabels >= 3, `${tag}: only ${legLabels} leg volume labels visible on load`);
  check(!(await page.locator('#voy-clear').isVisible()), `${tag}: a voyage route is drawn on the globe at load`);
  await page.screenshot({ path: `${SHOTS}/${tag}-load.png`, fullPage: false });
  await noOverflow(page, tag, 'on load');
  const ov = await labelOverlaps(page, '#globe text');
  if (ov.length) console.log(`  note ${tag}: ${ov.length} overlapping globe labels at default view: ${ov.slice(0, 6).join('; ')}`);
  check(ov.length <= 3, `${tag}: ${ov.length} overlapping globe labels at default view (${ov.slice(0, 4).join('; ')})`);

  // scenario toggle
  await page.click('#scenario button[data-s="2026"]');
  check(await page.locator('#scen-banner.now').count() === 1, `${tag}: 2026 scenario banner did not switch`);
  await page.waitForTimeout(300);
  await page.locator('.globe-pane').screenshot({ path: `${SHOTS}/${tag}-globe-2026.png` });
  await page.click('#scenario button[data-s="2025"]');

  // every tab, select first row (and a few more), detail panel must fill
  const tabs = await page.locator('#tabs .tab').evaluateAll((els) => els.map((e) => e.dataset.t));
  check(tabs.length === 6, `${tag}: expected 6 tabs, got ${tabs.length}`);
  for (const t of tabs) {
    await page.click(`#tabs .tab[data-t="${t}"]`);
    const rows = page.locator('#list .row');
    const n = await rows.count();
    check(n > 0, `${tag}: tab ${t} has no rows`);
    for (const i of [...new Set([0, Math.floor(n / 2), n - 1])]) {
      await rows.nth(i).scrollIntoViewIfNeeded();
      await rows.nth(i).click();
      await page.waitForTimeout(250);
      const det = await page.locator('#detail').innerText();
      check(!/^Select a leg/.test(det.trim()) && det.length > 30, `${tag}: tab ${t} row ${i}: detail panel did not fill`);
    }
    await page.locator('main').screenshot({ path: `${SHOTS}/${tag}-tab-${t}.png` });
    await noOverflow(page, tag, `tab ${t}`);
  }

  // click a marker on the globe directly (a leg path)
  await page.click('#zreset'); await page.waitForTimeout(900);

  // zoom
  // the projection scale shows up in the sphere outline's width
  const scaleOf = () => page.evaluate(() => Math.max(...[...document.querySelectorAll('#globe path')].map((p) => p.getBBox().width)));
  const before = await scaleOf();
  await page.click('#zin'); await page.waitForTimeout(500);
  await page.click('#zin'); await page.waitForTimeout(500);
  check((await scaleOf()) !== before, `${tag}: zoom in did not change the globe`);
  await page.locator('.globe-pane').screenshot({ path: `${SHOTS}/${tag}-zoomed.png` });
  const ovz = await labelOverlaps(page, '#globe text');
  if (ovz.length) console.log(`  note ${tag}: ${ovz.length} overlapping globe labels when zoomed: ${ovz.slice(0, 6).join('; ')}`);
  await page.click('#zout'); await page.waitForTimeout(500);
  await page.click('#zreset'); await page.waitForTimeout(900);

  // voyage calculator: Sabine Pass -> Tokyo with default (Oct 2026) passages
  const voyFrom = page.locator('#voy-in select').nth(0), voyTo = page.locator('#voy-in select').nth(1);
  await voyFrom.selectOption('Sabine Pass'); await voyTo.selectOption('Tokyo Bay terminals');
  await page.waitForTimeout(200);
  check(await page.locator('#voy-out table.voy tr').count() >= 2, `${tag}: Sabine Pass→Tokyo gave no route table`);
  // textContent, not innerText: the "Via" column is hidden at phone width
  const firstRow = await page.locator('#voy-out table.voy tr').nth(1).textContent();
  check(/Panama/.test(firstRow), `${tag}: Sabine Pass→Tokyo shortest route should go via Panama, got "${firstRow.replace(/\s+/g, ' ')}"`);
  await page.locator('#voy-out table.voy tr').nth(1).click();
  await page.waitForTimeout(900);
  check(await page.locator('#voy-clear').isVisible(), `${tag}: voyage clear button not shown after picking a route`);
  await page.locator('#voy-in').locator('..').screenshot({ path: `${SHOTS}/${tag}-voyage.png` });
  await noOverflow(page, tag, 'voyage table');
  await voyFrom.selectOption('Ras Laffan (14 trains)');
  await page.waitForTimeout(200);
  check(/No open route/.test(await page.locator('#voy-out').innerText()), `${tag}: Ras Laffan→Tokyo with Hormuz closed should say "No open route"`);
  await page.locator('#voy-in input[data-k="hormuz"]').check();
  check(await page.locator('#voy-out table.voy tr').count() >= 2, `${tag}: Ras Laffan→Tokyo with Hormuz open gave no route`);
  await page.locator('#voy-in .presets:not(.charter) button').first().click();
  check(/No open route/.test(await page.locator('#voy-out').innerText()), `${tag}: "Oct 2026 conditions" preset did not close Hormuz`);
  await voyFrom.selectOption('Sabine Pass');
  await page.click('#voy-clear');

  // arbitrage sliders: push JKM down so Europe wins, then up so Asia wins
  const slider = async (i, v) => page.locator('#arb-inputs input[type=range]').nth(i).evaluate((el, val) => {
    el.value = val; el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await slider(2, 6);
  check(/NW Europe[\s\S]*✓ best/.test(await page.locator('#arb-out').innerText()), `${tag}: low JKM should make Europe the best destination`);
  await slider(2, 40);
  check(/Japan via Panama[\s\S]*✓ best/.test(await page.locator('#arb-out').innerText()), `${tag}: high JKM should make Japan via Panama the best destination`);
  await page.locator('#arb-inputs button').first().click();
  check(/\$10\.50/.test(await page.locator('#arb-inputs').innerText()), `${tag}: pre-crisis preset did not set prices`);
  // "Latest month" preset reads the newest month from data/prices.json
  const prices = await page.evaluate(() => fetch('data/prices.json').then((r) => r.json()));
  const lm = prices.monthly.at(-1);
  await page.locator('#arb-inputs button').nth(1).click();
  const arbText = await page.locator('#arb-inputs').innerText();
  check(arbText.includes(`$${lm.ttf.toFixed(2)}`) && arbText.includes(`$${lm.hh.toFixed(2)}`), `${tag}: latest-month preset did not load TTF/HH for ${lm.month}`);
  await page.locator('#arb-inputs').locator('..').locator('..').screenshot({ path: `${SHOTS}/${tag}-arbitrage.png` });

  // fleet & freight: charter default = latest Atlantic print, Pacific preset, tooltips, sourced Panama toll
  const fleet = await page.evaluate(() => fetch('data/fleet.json').then((r) => r.json()));
  const lastA = fleet.charter.prints.filter((p) => p.atlantic != null).at(-1), lastP = fleet.charter.prints.filter((p) => p.pacific != null).at(-1);
  const fmtUsd = (v) => '$' + v.toLocaleString('en-US');
  await voyFrom.selectOption('Sabine Pass'); await voyTo.selectOption('Tokyo Bay terminals');
  check((await page.locator('#voy-in').innerText()).includes(fmtUsd(lastA.atlantic)), `${tag}: voyage charter default is not the latest Atlantic print (${lastA.atlantic})`);
  check(/ACP toll/.test(await page.locator('#voy-out').innerText()), `${tag}: voyage note does not cite the ACP Panama toll`);
  const freightA = await page.locator('#voy-out table.voy tr').nth(1).locator('td').nth(5).textContent();
  await page.locator('#voy-in .presets.charter button').nth(1).click();
  check((await page.locator('#voy-in').innerText()).includes(fmtUsd(lastP.pacific)), `${tag}: Pacific spot preset did not set the charter rate`);
  const freightP = await page.locator('#voy-out table.voy tr').nth(1).locator('td').nth(5).textContent();
  check(freightA !== freightP, `${tag}: changing the charter rate did not change freight (${freightA})`);
  await page.click('#voy-clear').catch(() => {});
  const nPrints = fleet.charter.prints.reduce((n, p) => n + (p.atlantic != null) + (p.pacific != null), 0);
  check(await page.locator('#c-charter svg .pt').count() === nPrints, `${tag}: charter chart should draw ${nPrints} prints`);
  check(/Hormuz closed/.test(await page.locator('#c-charter').innerText()), `${tag}: charter chart missing the Hormuz annotation`);
  check(await page.locator('#c-fleet svg rect').count() >= fleet.fleet.deliveries.length, `${tag}: deliveries bars missing`);
  check(/Ships kept busy/.test(await page.locator('#c-tonmile').innerText()), `${tag}: ton-mile table missing`);
  await page.locator('#c-charter').scrollIntoViewIfNeeded();
  await page.locator('#c-charter svg .hit').last().hover();
  check(/Spark|Reuters/.test(await page.locator('#tip').innerText()), `${tag}: charter tooltip did not show a source`);
  await page.locator('#c-tmlegs svg g rect').last().hover();
  check(/bn t·nm/.test(await page.locator('#tip').innerText()), `${tag}: ton-mile bar tooltip did not show`);
  await page.mouse.move(0, 0);
  await page.locator('#c-charter').locator('..').locator('..').screenshot({ path: `${SHOTS}/${tag}-fleet-freight.png` });
  const fov = await labelOverlaps(page, '#c-charter svg text, #c-fleet svg text, #c-tmlegs svg text');
  check(fov.length === 0, `${tag}: overlapping fleet/freight chart labels: ${fov.slice(0, 4).join('; ')}`);

  // import side: one utilisation bar per country, EU trend, FSRU chart + table, tooltips with sources, terminal capacity in the detail panel
  const lngData = await page.evaluate(() => fetch('data/lng.json').then((r) => r.json()));
  const RC = lngData.regasCapacity;
  check(await page.locator('#c-regas .hb .track').count() === RC.countries.length, `${tag}: regas chart should have ${RC.countries.length} country bars`);
  check(await page.locator('#c-euutil svg rect').count() === RC.euUtilisation.length, `${tag}: EU utilisation chart should have ${RC.euUtilisation.length} bars`);
  check(await page.locator('#c-fsru svg rect.seg').count() === RC.fsrus.filter((f) => f.capacityBcm != null).length, `${tag}: FSRU chart segments missing`);
  check(await page.locator('#c-fsru-table tr').count() === RC.fsrus.length + 1, `${tag}: FSRU table should list ${RC.fsrus.length} units`);
  check((await page.locator('#c-regas-glob').innerText()).includes('1,247 Mtpa'), `${tag}: world regas tile missing`);
  await page.locator('#c-regas').scrollIntoViewIfNeeded();
  await page.locator('#c-regas .hb .track').first().hover();
  check(/Imports .* Mt ÷ capacity/.test(await page.locator('#tip').innerText()) && /Capacity: /.test(await page.locator('#tip').innerText()), `${tag}: regas bar tooltip did not show the calculation and source`);
  await page.locator('#c-fsru svg rect.seg').first().hover();
  check(/bcm\/yr/.test(await page.locator('#tip').innerText()), `${tag}: FSRU tooltip did not show`);
  await page.mouse.move(0, 0);
  await page.locator('#c-regas').locator('..').locator('..').screenshot({ path: `${SHOTS}/${tag}-regas.png` });
  const rov = await labelOverlaps(page, '#c-euutil svg text, #c-fsru svg text');
  check(rov.length === 0, `${tag}: overlapping regas chart labels: ${rov.slice(0, 4).join('; ')}`);
  await page.click('#tabs .tab[data-t="regas"]');
  const dahej = page.locator('#list .row', { hasText: 'Dahej' });
  await dahej.scrollIntoViewIfNeeded(); await dahej.click(); await page.waitForTimeout(250);
  const det = await page.locator('#detail').innerText();
  check(/Terminal regas capacity: 17\.5 Mtpa/.test(det) && /import capacity used in 2025/.test(det), `${tag}: Dahej detail panel lacks capacity/utilisation`);
  const marmara = page.locator('#list .row', { hasText: 'Marmara' });
  await marmara.scrollIntoViewIfNeeded(); await marmara.click(); await page.waitForTimeout(250);
  check(/Turkey as a whole: .*% of/.test(await page.locator('#detail').innerText()), `${tag}: Turkey terminal does not find the Türkiye capacity row`);
  await page.click('#tabs .tab[data-t="legs"]');
  await noOverflow(page, tag, 'regas');

  // prices & storage charts: one line per series, both shock annotations, hover tooltips
  check(await page.locator('#c-prices svg path').count() >= 3, `${tag}: price chart lines missing`);
  const pricesText = await page.locator('#c-prices').innerText();
  check(/Hormuz closed/.test(pricesText) && /Ras Laffan/.test(pricesText), `${tag}: price chart is missing the 28 Feb / 18 Mar annotations`);
  check(await page.locator('#c-storage svg circle').count() >= prices.storage.fill2026.length, `${tag}: storage chart points missing`);
  await page.locator('#c-prices').scrollIntoViewIfNeeded();
  const box = await page.locator('#c-prices svg rect').last().boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.15);
  check(/TTF \(Europe\): \$/.test(await page.locator('#tip').innerText()), `${tag}: price chart hover tooltip did not show`);
  await page.mouse.move(0, 0);
  await page.locator('#c-prices').locator('..').locator('..').screenshot({ path: `${SHOTS}/${tag}-prices-storage.png` });
  const pov = await labelOverlaps(page, '#c-prices svg text, #c-storage svg text');
  check(pov.length === 0, `${tag}: overlapping chart labels: ${pov.slice(0, 4).join('; ')}`);
  await noOverflow(page, tag, 'arbitrage');

  // tooltips on chart rows / globe
  const hb = page.locator('#c-exp .hb > *').nth(1);
  if (await hb.count()) await hb.hover();

  // layer toggles
  for (const l of ['proj', 'labels', 'seas', 'events']) await page.locator(`#layers input[data-l="${l}"]`).click();
  await page.waitForTimeout(200);
  for (const l of ['proj', 'labels', 'seas', 'events']) await page.locator(`#layers input[data-l="${l}"]`).click();

  // spin on and off
  await page.click('#spin'); await page.waitForTimeout(400); await page.click('#spin');

  await page.screenshot({ path: `${SHOTS}/${tag}-full.png`, fullPage: true });
  await noOverflow(page, tag, 'end');
  for (const e of errors) failures.push(`${tag}: ${e}`);
  await ctx.close();
}

// ---------------------------------------------------------------- index.html
async function testIndex(vp) {
  const { page, ctx, errors, tag } = await openPage('index.html', vp);
  await page.waitForFunction(() => document.querySelectorAll('#route-list .route-card').length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  check(await page.locator('#globe path').count() > 10, `${tag}: globe did not draw`);
  await page.screenshot({ path: `${SHOTS}/${tag}-load.png` });
  await noOverflow(page, tag, 'on load');
  await topNav(page, tag, 'index.html');

  // flows: every route has a sourced volume; labels on the lines, no overlaps
  const flows = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/flows.json'), 'utf8'));
  const nLabels = await page.evaluate(() => [...document.querySelectorAll('#globe text')]
    .filter((t) => / · \d+%|<1%/.test(t.textContent) && t.getBoundingClientRect().width > 0).length);
  check(nLabels >= 5, `${tag}: only ${nLabels} route volume labels visible at load`);
  const ovf = await labelOverlaps(page, '#globe text');
  if (ovf.length) console.log(`  note ${tag}: ${ovf.length} overlapping labels on the flows globe: ${ovf.slice(0, 6).join('; ')}`);
  check(ovf.length === 0, `${tag}: overlapping flows-globe labels (${ovf.slice(0, 4).join('; ')})`);
  check(await page.locator('#route-list .route-card .n').count() === flows.routes.length, `${tag}: not every flow card shows a volume`);
  check(await page.locator('#route-list .route-card .bar i').count() === flows.routes.length, `${tag}: not every flow card has a share bar`);

  // flows: select each route, toggle commodity chips
  let cards = page.locator('#route-list .route-card');
  let n = await cards.count();
  for (let i = 0; i < n; i++) {
    await cards.nth(i).scrollIntoViewIfNeeded();
    await cards.nth(i).click();
    await page.waitForTimeout(120);
    const txt = (await page.locator('#detail').innerText()).trim();
    check(!/^Select a route/.test(txt), `${tag}: flows route ${i}: detail did not fill`);
    check(await page.locator('#detail .fig b').count() >= 2 && /of seaborne/.test(txt) && /Volume: /.test(txt), `${tag}: flows route ${i}: no volume/share tiles or volume source`);
    if (i === 0) {
      await page.waitForTimeout(1300); // let the globe finish turning to the route
      const sel = await page.evaluate(() => [...document.querySelectorAll('#globe text')]
        .filter((t) => / · (\d+|<1)%/.test(t.textContent) && t.getBoundingClientRect().width > 0).map((t) => t.textContent));
      check(sel.length === 1, `${tag}: selected route should show exactly its own label (saw ${sel.length})`);
      await page.locator('main').screenshot({ path: `${SHOTS}/${tag}-route-0.png` });
    }
  }
  // a chokepoint: oil volume and its share of seaborne oil
  await cards.nth(n - 1).click(); // deselect
  await page.click('#zreset'); await page.waitForTimeout(1300);
  await page.evaluate(() => {
    const g = [...document.querySelectorAll('#globe g.chokepoint')].find((x) => x.__data__.id === 'hormuz');
    g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(1300);
  const ctxt = await page.locator('#detail').innerText();
  check(/Strait of Hormuz/.test(ctxt) && /mb\/d/.test(ctxt) && /of seaborne oil/.test(ctxt), `${tag}: Hormuz detail lacks oil volume/share`);
  const ovc = await labelOverlaps(page, '#globe text');
  check(ovc.length === 0, `${tag}: overlapping labels with Hormuz selected (${ovc.slice(0, 4).join('; ')})`);
  await page.locator('main').screenshot({ path: `${SHOTS}/${tag}-hormuz.png` });
  const chips = page.locator('#chips .chip');
  for (let i = 0; i < await chips.count(); i++) { await chips.nth(i).click(); await chips.nth(i).click(); }

  await page.click('#zin'); await page.waitForTimeout(400);
  await page.click('#zout'); await page.waitForTimeout(400);
  await page.click('#zreset'); await page.waitForTimeout(700);

  // disruptions: select every disruption and click its first located event
  await page.click('.tab[data-mode="disruptions"]');
  check(await page.locator('#legend-disruptions').isVisible(), `${tag}: disruptions legend not shown`);
  cards = page.locator('#route-list .route-card');
  n = await cards.count();
  check(n > 0, `${tag}: no disruptions listed`);
  for (let i = 0; i < n; i++) {
    await cards.nth(i).scrollIntoViewIfNeeded();
    await cards.nth(i).click();
    await page.waitForTimeout(400);
    check(!/^Select a route/.test((await page.locator('#detail').innerText()).trim()), `${tag}: disruption ${i}: detail did not fill`);
    const ev = page.locator('#detail .ev-list li').first();
    if (await ev.count()) { await ev.scrollIntoViewIfNeeded(); await ev.click(); await page.waitForTimeout(300); }
    if (i === 0) await page.locator('main').screenshot({ path: `${SHOTS}/${tag}-disruption-0.png` });
    await noOverflow(page, tag, `disruption ${i}`);
  }
  await page.screenshot({ path: `${SHOTS}/${tag}-full.png`, fullPage: true });
  for (const e of errors) failures.push(`${tag}: ${e}`);
  await ctx.close();
}

try {
  for (const vp of VIEWPORTS) {
    console.log(`index.html @ ${vp[1]}×${vp[2]}`); await testIndex(vp);
    console.log(`lng.html @ ${vp[1]}×${vp[2]}`); await testLng(vp);
  }
} catch (e) {
  failures.push(`test crashed: ${e.stack || e}`);
  for (const e2 of lastErrors) failures.push(`  (page errors so far) ${e2}`);
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${checks} checks, ${failures.length} failures. Screenshots in tests/screenshots/`);
failures.forEach((f) => console.log('  ✗ ' + f));
process.exit(failures.length ? 1 : 0);
