// Data validation for data/lng.json, data/disruptions.json, data/flows.json, data/prices.json and data/fleet.json.
// Schema checks (required fields, named points exist, lat/lon in range, types
// and statuses from the allowed sets, every event sourced), totals (legs sum
// <= world trade, exporter/importer tables sum to it) and the voyage router
// (every plant reaches every terminal with all passages open; Gulf plants are
// cut off with Hormuz closed). The allowed sets are read from the page scripts
// (lng.js, app.js), so the validator can't drift from what the pages draw.
// Usage: node scripts/validate.mjs   (exit code 1 on any error)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const errors = [];
let checks = 0;
function check(ok, msg) { checks++; if (!ok) errors.push(msg); return ok; }

function loadJSON(f) {
  try { return JSON.parse(read(f)); } catch (e) { errors.push(`${f}: invalid JSON (${e.message})`); return null; }
}

// Pull a `const NAME = { ... };` object literal out of a page script.
function constObject(file, name) {
  const src = read(file);
  const start = src.indexOf(`const ${name} = {`);
  if (start < 0) throw new Error(`${file}: const ${name} not found`);
  let i = src.indexOf('{', start), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return new Function(`return (${src.slice(i, j + 1)});`)();
  }
  throw new Error(`${file}: unterminated const ${name}`);
}

const LNG_STATUS = new Set(Object.keys(constObject('lng.js', 'STATUS')));
const LNG_EVENT = new Set(Object.keys(constObject('lng.js', 'EVENT')));
const LNG_ZONE = new Set(Object.keys(constObject('lng.js', 'ZONE_STYLE')));
const LNG_GROUP = new Set(Object.keys(constObject('lng.js', 'GROUP')));
const CHOKE_NODES = constObject('lng.js', 'CHOKE_NODES');
const APP_SEV = new Set(Object.keys(constObject('app.js', 'SEV_HEX')));
const APP_EVENT = new Set(Object.keys(constObject('app.js', 'EVENT')));
const APP_ZONE = new Set(Object.keys(constObject('app.js', 'ZONE_STYLE')));
const APP_SIZE = new Set(Object.keys(constObject('app.js', 'SIZE_WIDTH')).map(Number));
const REGAS_TYPES = new Set(['onshore', 'fsru', 'offshore GBS']);
const PROJECT_STATUS = new Set(['starting', 'construction', 'delayed']);
const DISRUPTION_CATEGORIES = new Set(['transport', 'structural', 'demand']);
const LABEL_SIDES = new Set(['left', 'right']);
const SUM_TOL = 0.15; // Mt: published tables are rounded to 0.1

// ------------------------------------------------------------ helpers
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isLat = (v) => isNum(v) && v >= -90 && v <= 90;
const isLon = (v) => isNum(v) && v >= -180 && v <= 180;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const sum = (rows, k) => rows.reduce((s, r) => s + (r[k] || 0), 0);

function requireFields(where, obj, fields) {
  for (const f of fields) {
    const v = obj?.[f];
    check(v !== undefined && v !== null && v !== '', `${where}: missing "${f}"`);
  }
}
function latLon(where, o) {
  check(isLat(o.lat), `${where}: lat ${o.lat} out of range`);
  check(isLon(o.lon), `${where}: lon ${o.lon} out of range`);
}
function optionalLatLon(where, o) {
  if (o.lat == null && o.lon == null) return;
  check(o.lat != null && o.lon != null, `${where}: lat and lon must come as a pair`);
  latLon(where, o);
}
function unique(where, rows, key) {
  const seen = new Set();
  rows.forEach((r) => { check(!seen.has(r[key]), `${where}: duplicate ${key} "${r[key]}"`); seen.add(r[key]); });
}
function inSet(where, v, set, what) { check(set.has(v), `${where}: ${what} "${v}" not in {${[...set].join(', ')}}`); }
function lonLatPair(where, p) { check(Array.isArray(p) && isLon(p[0]) && isLat(p[1]), `${where}: bad [lon, lat] ${JSON.stringify(p)}`); }
function zone(where, z, kinds) {
  requireFields(where, z, ['name', 'kind']);
  inSet(where, z.kind, kinds, 'zone kind');
  check(!!z.polygon !== !!z.circle, `${where}: needs exactly one of polygon / circle`);
  if (z.polygon) {
    check(Array.isArray(z.polygon) && z.polygon.length >= 3, `${where}: polygon needs >= 3 points`);
    (z.polygon || []).forEach((p, i) => lonLatPair(`${where} polygon[${i}]`, p));
  }
  if (z.circle) {
    lonLatPair(`${where} circle`, z.circle);
    check(isNum(z.circle?.[2]) && z.circle[2] > 0 && z.circle[2] < 90, `${where}: circle radius must be 0–90°`);
  }
  if (z.labelAt) lonLatPair(`${where} labelAt`, z.labelAt);
}
function event(where, e, types) {
  requireFields(where, e, ['date', 'type', 'title', 'text', 'source']);
  inSet(where, e.type, types, 'event type');
  optionalLatLon(where, e);
  if (e.labelSide != null) inSet(where, e.labelSide, LABEL_SIDES, 'labelSide');
  if (e.approx != null) check(typeof e.approx === 'boolean', `${where}: approx must be boolean`);
}
function waypoints(where, wps, min = 2) {
  if (!check(Array.isArray(wps) && wps.length >= min, `${where}: needs >= ${min} waypoints`)) return;
  wps.forEach((w, i) => { requireFields(`${where}[${i}]`, w, ['name']); latLon(`${where}[${i}] ${w.name}`, w); });
}
function focus(where, f) {
  if (!check(f && typeof f === 'object', `${where}: missing focus`)) return;
  latLon(`${where}.focus`, f);
  check(isNum(f.zoom) && f.zoom > 0, `${where}.focus: zoom must be > 0`);
}

// ------------------------------------------------------------ lng.json
function validateLng(D) {
  const F = 'lng.json';
  requireFields(F, D, ['lastUpdated', 'globalTrade2025Mt', 'points', 'chokepoints', 'legs', 'liquefaction', 'regas',
    'exporters2025', 'exportersSource', 'importRegions2025', 'importers2025', 'importersSource', 'timeline', 'sources',
    'exposure', 'scenarios2026', 'capacityTotals', 'projects', 'projectsSource', 'events', 'zones', 'seas', 'extraLanes']);
  check(isDate(D.lastUpdated), `${F}: lastUpdated must be YYYY-MM-DD`);
  const T = D.globalTrade2025Mt;
  check(isNum(T) && T > 0, `${F}: globalTrade2025Mt must be a positive number`);

  // named points: [lat, lon, name]
  for (const [k, p] of Object.entries(D.points || {})) {
    check(Array.isArray(p) && p.length === 3 && isLat(p[0]) && isLon(p[1]) && isStr(p[2]), `${F} points.${k}: expected [lat, lon, name], got ${JSON.stringify(p)}`);
  }
  const pathOk = (where, p) => {
    if (!check(Array.isArray(p) && p.length >= 2, `${where}: path needs >= 2 points`)) return;
    p.forEach((x, i) => {
      if (typeof x === 'string') check(x in D.points, `${where}[${i}]: unknown point "${x}"`);
      else check(Array.isArray(x) && isLat(x[0]) && isLon(x[1]), `${where}[${i}]: bad [lat, lon] ${JSON.stringify(x)}`);
    });
  };

  const chokeIds = new Set((D.chokepoints || []).map((c) => c.id));
  unique(`${F} chokepoints`, D.chokepoints || [], 'id');
  (D.chokepoints || []).forEach((c, i) => {
    const w = `${F} chokepoints[${i}] ${c.id}`;
    requireFields(w, c, ['id', 'name', 'why', 'status2026', 'source']);
    latLon(w, c);
  });
  for (const [c, ns] of Object.entries(CHOKE_NODES)) ns.forEach((n) => check(n in D.points, `lng.js CHOKE_NODES.${c}: unknown point "${n}"`));

  unique(`${F} legs`, D.legs || [], 'id');
  (D.legs || []).forEach((l, i) => {
    const w = `${F} legs[${i}] ${l.id}`;
    requireFields(w, l, ['id', 'exporter', 'title', 'mt2025', 'path', 'via', 'days', 'why', 'status', 'statusText', 'source']);
    check(isNum(l.mt2025) && l.mt2025 >= 0, `${w}: mt2025 must be >= 0`);
    if (l.mt2026 != null) check(isNum(l.mt2026) && l.mt2026 >= 0, `${w}: mt2026 must be >= 0`);
    inSet(w, l.status, LNG_STATUS, 'status');
    pathOk(`${w} path`, l.path);
    if (l.secondary) pathOk(`${w} secondary`, l.secondary);
    if (l.avoided) pathOk(`${w} avoided`, l.avoided);
    (l.via || []).forEach((v) => check(chokeIds.has(v), `${w}: via "${v}" is not a chokepoint id`));
  });
  const legSum = sum(D.legs || [], 'mt2025');
  check(legSum <= T + SUM_TOL, `${F}: legs sum to ${legSum.toFixed(1)} Mt, more than world trade ${T}`);

  unique(`${F} liquefaction`, D.liquefaction || [], 'name');
  (D.liquefaction || []).forEach((p, i) => {
    const w = `${F} liquefaction[${i}] ${p.name}`;
    requireFields(w, p, ['name', 'country', 'mtpa', 'owner', 'status']);
    latLon(w, p);
    check(isNum(p.mtpa) && p.mtpa > 0, `${w}: mtpa must be > 0`);
  });
  unique(`${F} regas`, D.regas || [], 'name');
  (D.regas || []).forEach((t, i) => {
    const w = `${F} regas[${i}] ${t.name}`;
    requireFields(w, t, ['name', 'country', 'type', 'note']);
    latLon(w, t);
    inSet(w, t.type, REGAS_TYPES, 'type');
    if (t.imports2025 != null) check(isNum(t.imports2025) && t.imports2025 >= 0, `${w}: imports2025 must be >= 0`);
  });
  unique(`${F} projects`, D.projects || [], 'name');
  (D.projects || []).forEach((p, i) => {
    const w = `${F} projects[${i}] ${p.name}`;
    requireFields(w, p, ['name', 'country', 'mtpa', 'start', 'status', 'note', 'group']);
    latLon(w, p);
    check(isNum(p.mtpa) && p.mtpa > 0, `${w}: mtpa must be > 0`);
    check(Number.isInteger(p.start) && p.start >= 2024 && p.start <= 2040, `${w}: start must be a year`);
    inSet(w, p.status, PROJECT_STATUS, 'status');
    inSet(w, p.group, LNG_GROUP, 'group');
    check(typeof p.hormuz === 'boolean', `${w}: hormuz must be boolean`);
  });
  (D.events || []).forEach((e, i) => event(`${F} events[${i}] ${e.title}`, e, LNG_EVENT));
  (D.zones || []).forEach((z, i) => zone(`${F} zones[${i}] ${z.name}`, z, LNG_ZONE));
  (D.seas || []).forEach((s, i) => { requireFields(`${F} seas[${i}]`, s, ['name']); latLon(`${F} seas[${i}] ${s.name}`, s); });
  (D.extraLanes || []).forEach((r, i) => pathOk(`${F} extraLanes[${i}]`, r));
  (D.timeline || []).forEach((t, i) => requireFields(`${F} timeline[${i}]`, t, ['date', 'text']));

  // country/region tables must add up to world trade
  for (const k of ['exporters2025', 'importers2025', 'importRegions2025']) {
    const rows = D[k] || [];
    rows.forEach((r, i) => { requireFields(`${F} ${k}[${i}]`, r, ['name']); check(isNum(r.mt) && r.mt >= 0, `${F} ${k}[${i}] ${r.name}: mt must be >= 0`); });
    const s = sum(rows, 'mt');
    check(Math.abs(s - T) <= SUM_TOL, `${F}: ${k} sums to ${s.toFixed(1)} Mt, expected ${T}`);
  }
  (D.exposure?.rows || []).forEach((r, i) => check(isNum(r.pct) && r.pct >= 0 && r.pct <= 100 && isNum(r.mt), `${F} exposure.rows[${i}] ${r.name}: bad pct/mt`));
  (D.scenarios2026?.rows || []).forEach((r, i) => check(isNum(r.mt) && r.mt > 0, `${F} scenarios2026.rows[${i}]: bad mt`));
  check(isStr(D.scenarios2026?.source), `${F}: scenarios2026.source missing`);
  check(isStr(D.capacityTotals?.source), `${F}: capacityTotals.source missing`);

  if (errors.length === 0) validateRouter(D);
  return { legs: D.legs.length, plants: D.liquefaction.length, terminals: D.regas.length, legSumMt: +legSum.toFixed(1) };
}

// ------------------------------------------------------------ voyage router
// Mirrors buildGraph / nearestNode / shortest in lng.js.
const NM_PER_RAD = 3440.065;
function geoDistance(a, b) {
  const r = Math.PI / 180, [l1, p1] = [a[0] * r, a[1] * r], [l2, p2] = [b[0] * r, b[1] * r];
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
let routerStats = null;
function validateRouter(D) {
  const resolve = (p) => p.map((x) => (typeof x === 'string'
    ? { lat: D.points[x][0], lon: D.points[x][1], key: x } : { lat: x[0], lon: x[1], key: `${x[0]},${x[1]}` }));
  const nodes = new Map(), adj = new Map();
  const addPath = (wps) => {
    wps.forEach((w) => { if (!nodes.has(w.key)) { nodes.set(w.key, w); adj.set(w.key, []); } });
    for (let i = 0; i < wps.length - 1; i++) {
      const d = geoDistance([wps[i].lon, wps[i].lat], [wps[i + 1].lon, wps[i + 1].lat]) * NM_PER_RAD;
      adj.get(wps[i].key).push({ to: wps[i + 1].key, d }); adj.get(wps[i + 1].key).push({ to: wps[i].key, d });
    }
  };
  D.legs.forEach((l) => { addPath(resolve(l.path)); if (l.secondary) addPath(resolve(l.secondary)); if (l.avoided) addPath(resolve(l.avoided)); });
  D.extraLanes.forEach((r) => addPath(resolve(r)));
  const nearest = (o) => {
    let best = null, bd = Infinity;
    nodes.forEach((n, k) => { const d = geoDistance([o.lon, o.lat], [n.lon, n.lat]); if (d < bd) { bd = d; best = k; } });
    return { key: best, nm: bd * NM_PER_RAD };
  };
  // flood fill from a node; blocked nodes can't be entered (except the target, as in lng.js)
  const reach = (from, blocked = new Set()) => {
    const seen = new Set([from]), stack = [from];
    while (stack.length) for (const { to } of adj.get(stack.pop())) if (!seen.has(to) && !blocked.has(to)) { seen.add(to); stack.push(to); }
    return seen;
  };
  const plants = D.liquefaction.map((p) => ({ p, n: nearest(p) }));
  const terms = D.regas.map((t) => ({ t, n: nearest(t) }));
  // assets hook on to the nearest lane node; a long hook means a missing lane
  for (const { p, n } of plants) check(n.nm < 600, `router: plant ${p.name} is ${Math.round(n.nm)} nm from the nearest lane node (${n.key})`);
  for (const { t, n } of terms) check(n.nm < 600, `router: terminal ${t.name} is ${Math.round(n.nm)} nm from the nearest lane node (${n.key})`);
  let pairs = 0, ok = 0;
  const cache = new Map();
  for (const { p, n } of plants) {
    if (!cache.has(n.key)) cache.set(n.key, reach(n.key));
    const r = cache.get(n.key);
    for (const { t, n: m } of terms) {
      pairs++;
      if (check(r.has(m.key), `router: no route ${p.name} → ${t.name}`)) ok++;
    }
  }
  // Hormuz closed: Ras Laffan can't reach Tokyo; Sabine Pass still can (via Panama or the Cape)
  const blocked = new Set(CHOKE_NODES.hormuz);
  const at = (pool, name) => pool.find((x) => (x.p || x.t).name === name)?.n.key;
  const rl = at(plants, 'Ras Laffan (14 trains)'), sp = at(plants, 'Sabine Pass'), tk = at(terms, 'Tokyo Bay terminals');
  if (check(rl && sp && tk, 'router: Ras Laffan, Sabine Pass or Tokyo Bay missing from the data')) {
    const fromRl = new Set([rl]), stack = [rl];
    // the Gulf plant's own node isn't blocked, but leaving it through Hormuz is
    while (stack.length) for (const { to } of adj.get(stack.pop())) if (!fromRl.has(to) && !blocked.has(to)) { fromRl.add(to); stack.push(to); }
    check(!fromRl.has(tk), 'router: Ras Laffan → Tokyo still routable with Hormuz closed');
    check(reach(sp, blocked).has(tk), 'router: Sabine Pass → Tokyo not routable with Hormuz closed');
  }
  routerStats = { nodes: nodes.size, pairs, ok };
}

// ------------------------------------------------------------ disruptions.json
function validateDisruptions(D) {
  const F = 'disruptions.json';
  requireFields(F, D, ['lastUpdated', 'updateCadence', 'focus', 'chokepoints', 'routes']);
  check(isDate(D.lastUpdated), `${F}: lastUpdated must be YYYY-MM-DD`);
  unique(`${F} chokepoints`, D.chokepoints || [], 'id');
  (D.chokepoints || []).forEach((c, i) => { requireFields(`${F} chokepoints[${i}]`, c, ['id', 'name']); latLon(`${F} chokepoints[${i}] ${c.id}`, c); });
  unique(`${F} routes`, D.routes || [], 'id');
  let nEvents = 0;
  (D.routes || []).forEach((r, i) => {
    const w = `${F} routes[${i}] ${r.id}`;
    // focus/events/zones/regions are the map layer: a weekly refresh must keep them
    requireFields(w, r, ['id', 'title', 'category', 'severity', 'dateRange', 'summary', 'source', 'waypoints', 'focus', 'events', 'zones', 'regions']);
    inSet(w, r.category, DISRUPTION_CATEGORIES, 'category');
    inSet(w, r.severity, APP_SEV, 'severity');
    waypoints(`${w} waypoints`, r.waypoints);
    if (r.secondaryWaypoints) waypoints(`${w} secondaryWaypoints`, r.secondaryWaypoints);
    if (r.avoidedWaypoints) waypoints(`${w} avoidedWaypoints`, r.avoidedWaypoints);
    focus(w, r.focus);
    check(Array.isArray(r.events), `${w}: events must be an array`);
    (r.events || []).forEach((e, j) => { nEvents++; event(`${w} events[${j}] ${e.title}`, e, APP_EVENT); });
    (r.zones || []).forEach((z, j) => zone(`${w} zones[${j}] ${z.name}`, z, APP_ZONE));
    (r.regions || []).forEach((g, j) => { requireFields(`${w} regions[${j}]`, g, ['name']); latLon(`${w} regions[${j}] ${g.name}`, g); });
  });
  return { routes: D.routes.length, events: nEvents };
}

// ------------------------------------------------------------ flows.json
function validateFlows(D) {
  const F = 'flows.json';
  requireFields(F, D, ['lastUpdated', 'baselineNote', 'commodities', 'chokepoints', 'routes', 'glossary']);
  check(isDate(D.lastUpdated), `${F}: lastUpdated must be YYYY-MM-DD`);
  for (const [k, c] of Object.entries(D.commodities || {})) {
    requireFields(`${F} commodities.${k}`, c, ['label', 'color']);
    check(/^#[0-9a-f]{6}$/i.test(c.color), `${F} commodities.${k}: color must be #rrggbb`);
  }
  unique(`${F} chokepoints`, D.chokepoints || [], 'id');
  const ids = new Set((D.chokepoints || []).map((c) => c.id));
  (D.chokepoints || []).forEach((c, i) => { const w = `${F} chokepoints[${i}] ${c.id}`; requireFields(w, c, ['id', 'name', 'flow', 'why', 'source']); latLon(w, c); });
  unique(`${F} routes`, D.routes || [], 'id');
  (D.routes || []).forEach((r, i) => {
    const w = `${F} routes[${i}] ${r.id}`;
    requireFields(w, r, ['id', 'commodity', 'size', 'title', 'volume', 'via', 'waypoints', 'why', 'source']);
    check(r.commodity in (D.commodities || {}), `${w}: unknown commodity "${r.commodity}"`);
    inSet(w, r.size, APP_SIZE, 'size');
    (r.via || []).forEach((v) => check(ids.has(v), `${w}: via "${v}" is not a chokepoint id`));
    waypoints(`${w} waypoints`, r.waypoints);
    if (r.secondaryWaypoints) waypoints(`${w} secondaryWaypoints`, r.secondaryWaypoints);
  });
  (D.glossary || []).forEach((g, i) => check(Array.isArray(g) && g.length === 2 && isStr(g[0]) && isStr(g[1]), `${F} glossary[${i}]: expected [term, definition]`));
  return { routes: D.routes.length, chokepoints: D.chokepoints.length };
}

// ------------------------------------------------------------ prices.json
function validatePrices(D) {
  const F = 'prices.json';
  requireFields(F, D, ['lastUpdated', 'source', 'monthly', 'jkmSpot', 'annotations', 'storage']);
  check(isDate(D.lastUpdated), `${F}: lastUpdated must be YYYY-MM-DD`);
  // the page plots these keys; one source covers the whole table, plus the edition per month
  const keys = ['ttf', 'hh', 'japanLng'];
  keys.forEach((k) => check(D.series && isStr(D.series[k]?.name), `${F}: series.${k}.name missing`));
  let prev = null;
  D.monthly.forEach((r, i) => {
    const w = `${F} monthly[${i}] (${r.month})`;
    check(typeof r.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(r.month), `${w}: month must be YYYY-MM`);
    keys.forEach((k) => check(isNum(r[k]) && r[k] > 0 && r[k] < 100, `${w}: ${k} must be a price in (0, 100) $/MMBtu`));
    check(isStr(r.edition), `${w}: edition (source) missing`);
    if (prev) {
      const [y0, m0] = prev.split('-').map(Number), [y1, m1] = r.month.split('-').map(Number);
      check((y1 * 12 + m1) - (y0 * 12 + m0) === 1, `${w}: months must be consecutive (previous ${prev})`);
    }
    prev = r.month;
  });
  D.jkmSpot.forEach((d, i) => {
    const w = `${F} jkmSpot[${i}]`;
    check(isDate(d.date), `${w}: bad date`);
    check(isNum(d.value) && d.value > 0 && d.value < 100, `${w}: bad value`);
    check(isStr(d.source), `${w}: source missing`);
  });
  D.annotations.forEach((a, i) => check(isDate(a.date) && isStr(a.label), `${F} annotations[${i}]: needs date + label`));
  const S = D.storage;
  requireFields(`${F} storage`, S, ['target', 'fill2026', 'fill2025', 'fiveYearAvg', 'fiveYearRange']);
  check(isNum(S.target?.value) && isStr(S.target?.source), `${F} storage.target: needs value + source`);
  ['fill2026', 'fill2025', 'fiveYearAvg'].forEach((k) => (S[k] || []).forEach((d, i) => {
    const w = `${F} storage.${k}[${i}]`;
    check(isDate(d.date), `${w}: bad date`);
    check(isNum(d.value) && d.value >= 0 && d.value <= 100, `${w}: value must be a % in [0, 100]`);
    check(isStr(d.source), `${w}: source missing`);
  }));
  (S.fiveYearRange || []).forEach((b, i) => check(isDate(b.date) && isNum(b.min) && isNum(b.max) && b.min <= b.max && isStr(b.source),
    `${F} storage.fiveYearRange[${i}]: needs date, min <= max, source`));
  const sorted = (arr) => arr.every((d, i) => !i || d.date > arr[i - 1].date);
  check(sorted(S.fill2026 || []), `${F} storage.fill2026: dates must be ascending (the page draws a line through them)`);
  check(sorted(S.fiveYearAvg || []), `${F} storage.fiveYearAvg: dates must be ascending`);
  return { months: D.monthly.length, from: D.monthly[0]?.month, to: D.monthly.at(-1)?.month, storagePoints: (S.fill2026 || []).length };
}

// ------------------------------------------------------------ fleet.json
function validateFleet(D) {
  const F = 'fleet.json';
  requireFields(F, D, ['lastUpdated', 'charter', 'annotations', 'fleet', 'canalFees']);
  check(isDate(D.lastUpdated), `${F}: lastUpdated must be YYYY-MM-DD`);
  const C = D.charter;
  ['atlantic', 'pacific'].forEach((k) => check(isStr(C.series?.[k]?.name), `${F}: charter.series.${k}.name missing`));
  check(isStr(C.source), `${F}: charter.source missing`);
  C.prints.forEach((p, i) => {
    const w = `${F} charter.prints[${i}] (${p.date})`;
    check(isDate(p.date), `${w}: bad date`);
    check(p.atlantic != null || p.pacific != null, `${w}: needs an atlantic or pacific value`);
    ['atlantic', 'pacific'].forEach((k) => p[k] == null || check(isNum(p[k]) && p[k] > 0 && p[k] < 600000, `${w}: ${k} must be $/day in (0, 600000)`));
    check(isStr(p.source), `${w}: source missing`);
    check(!i || p.date > C.prints[i - 1].date, `${w}: prints must be in ascending date order`);
  });
  check(C.prints.some((p) => p.atlantic != null) && C.prints.some((p) => p.pacific != null), `${F}: the voyage calculator needs at least one print per basin`);
  D.annotations.forEach((a, i) => check(isDate(a.date) && isStr(a.label), `${F} annotations[${i}]: needs date + label`));
  const FL = D.fleet;
  check(isStr(FL.source), `${F}: fleet.source missing`);
  FL.deliveries.forEach((d, i) => check(Number.isInteger(d.year) && Number.isInteger(d.ships) && d.ships > 0 && isStr(d.source) && (!i || d.year === FL.deliveries[i - 1].year + 1),
    `${F} fleet.deliveries[${i}]: needs consecutive year, integer ships > 0, source`));
  FL.snapshots.forEach((x, i) => check(isDate(x.date) && Number.isInteger(x.active) && Number.isInteger(x.orderbook) && isStr(x.source) && (!i || x.date > FL.snapshots[i - 1].date),
    `${F} fleet.snapshots[${i}]: needs ascending date, integer active + orderbook, source`));
  (FL.orders || []).forEach((o, i) => check(isStr(o.period) && Number.isInteger(o.ships) && isStr(o.source), `${F} fleet.orders[${i}]: needs period, ships, source`));
  const P = D.canalFees?.panama, S = D.canalFees?.suez;
  check(isNum(D.canalFees?.cargoM3) && D.canalFees.cargoM3 > 100000, `${F} canalFees.cargoM3: expected a carrier size in m³`);
  check(isNum(P?.ratePerM3) && P.ratePerM3 > 0 && P.ratePerM3 < 10 && isStr(P.source), `${F} canalFees.panama: needs ratePerM3 ($/m³) + source`);
  check(isNum(S?.perTransitUsd) && S.perTransitUsd > 0 && isStr(S.source) && S.estimate === true, `${F} canalFees.suez: needs perTransitUsd + source, flagged estimate`);
  return { prints: C.prints.length, latest: C.prints.at(-1)?.date, deliveryYears: FL.deliveries.map((d) => d.year).join('–') };
}

// ------------------------------------------------------------ run
const out = [];
const run = (file, fn) => {
  const D = loadJSON(`data/${file}`);
  if (!D) return;
  const before = errors.length;
  try { const s = fn(D); out.push(`${file}: ${errors.length === before ? 'ok' : 'FAIL'} ${JSON.stringify(s)}`); }
  catch (e) { errors.push(`${file}: validator crashed (${e.message})`); }
};
run('lng.json', validateLng);
run('disruptions.json', validateDisruptions);
run('flows.json', validateFlows);
run('prices.json', validatePrices);
run('fleet.json', validateFleet);
out.forEach((l) => console.log(l));
if (routerStats) console.log(`router: ${routerStats.ok}/${routerStats.pairs} plant→terminal pairs routable over ${routerStats.nodes} lane nodes`);
if (errors.length) {
  console.error(`\n${errors.length} error(s) in ${checks} checks:`);
  errors.forEach((e) => console.error('  ✗ ' + e));
  process.exit(1);
}
console.log(`\nAll ${checks} checks passed.`);
