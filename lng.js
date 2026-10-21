/* LNG supply chain globe: rotatable + zoomable orthographic globe of LNG
   shipping legs, liquefaction plants, import terminals, chokepoints, the 2026
   disruption events and the 2026–2031 supply pipeline, with a 2025-baseline /
   Oct-2026 toggle, plus charts, a voyage calculator (routed over a sea-lane
   graph built from the legs), an arbitrage calculator and a primer.
   Everything is driven by data/lng.json. */

const W = 760, H = 760;
const BASE_SCALE = W / 2.15;
const NM_PER_RAD = 3440.065;
// Literal hexes mirror the :root tokens in lng.html (SVG attrs don't resolve
// CSS variables reliably) - keep in sync by hand.
const C = {
  ocean: '#0e1a26', land: '#1c2a38', landEdge: '#2c3e50', border: '#25374a', graticule: '#16222e',
  leg: '#3987e5', liq: '#199e70', regas: '#d55181', choke: '#c98500', s2: '#d95926',
  ink: '#e8edf2', soft: '#8fa0b0', avoided: '#4a5866', bg: '#0b1016', voyage: '#ffffff',
};
const STATUS = {
  critical: { c: '#d03b3b', label: 'Halted / shut in', icon: '■' },
  serious: { c: '#ec835a', label: 'Constrained / rerouted', icon: '▲' },
  warning: { c: '#fab219', label: 'Sanctions / political risk', icon: '◆' },
  good: { c: '#0ca30c', label: 'Flowing, growing or in demand', icon: '●' },
  neutral: { c: '#3987e5', label: 'Flowing normally', icon: '○' },
};
// Event types for the disruption layer (same vocabulary as the main page).
const EVENT = {
  attack: { c: '#ff5a4a', label: 'attack on a ship' },
  strike: { c: '#ff8a3d', label: 'strike on a plant' },
  blockade: { c: '#e4574a', label: 'closure / blockade' },
  restriction: { c: '#d8c252', label: 'capacity limit / delay' },
  policy: { c: '#9aa8f0', label: 'sanctions / rules' },
  supply: { c: '#3ccf8e', label: 'new supply / start-up' },
  info: { c: '#cfd8e3', label: 'key fact / flow change' },
};
const ZONE_STYLE = {
  closure: { fill: '#e4574a', op: 0.24, stroke: '#ff7b6e' },
  attack: { fill: 'url(#hatch-attack)', op: 1, stroke: '#ff5a4a' },
  restriction: { fill: '#d8c252', op: 0.2, stroke: '#d8c252' },
};
// Supply-wave groups (categorical slots 1–5 of the validated dark palette).
const GROUP = {
  'US': { c: '#3987e5', label: 'United States' },
  'Middle East': { c: '#d95926', label: 'Qatar & UAE (behind Hormuz)' },
  'Africa': { c: '#199e70', label: 'Africa' },
  'Americas': { c: '#c98500', label: 'Canada, Mexico, Argentina' },
  'Asia-Pacific': { c: '#d55181', label: 'Australia & Oman' },
};
// Router: which graph nodes belong to which chokepoint.
const CHOKE_NODES = {
  hormuz: ['hormuz'], redsea: ['babelmandeb', 'redSea'], suez: ['suez'], panama: ['colon', 'panamaPac'],
  nsr: ['vilkitsky', 'bering'], malacca: ['malacca'], cape: ['capeS'], lombok: ['lombok'], turkish: ['dardanelles'],
};
const CHOKE_LABEL = {
  hormuz: 'Hormuz', redsea: 'Bab-el-Mandeb / Red Sea', suez: 'Suez Canal', panama: 'Panama Canal', nsr: 'Northern Sea Route',
  malacca: 'Malacca', cape: 'Cape of Good Hope', lombok: 'Lombok', turkish: 'Dardanelles',
};

const fmt = (v) => (v >= 10 ? d3.format('.0f')(v) : d3.format('.1f')(v));
const pct = (v) => (v >= 10 ? d3.format('.0f')(v) : d3.format('.1f')(v)) + '%';

let D = null;
const state = {
  scenario: '2025', tab: 'legs', active: null, k: 1, spin: false, voyage: null,
  layers: { legs: true, liq: true, regas: true, choke: true, labels: true, events: true, proj: false, seas: true },
};

// ---------------------------------------------------------------- globe setup
const svg = d3.select('#globe');
const projection = d3.geoOrthographic().scale(BASE_SCALE).translate([W / 2, H / 2]).clipAngle(90)
  // drop geometry outside the viewport: at high zoom this keeps paths small
  .clipExtent([[-10, -10], [W + 10, H + 10]])
  .rotate([-60, -18]);
const path = d3.geoPath(projection);
const defs = svg.append('defs');
const glow = defs.append('radialGradient').attr('id', 'atmo');
glow.append('stop').attr('offset', '85%').attr('stop-color', '#3987e5').attr('stop-opacity', 0.18);
glow.append('stop').attr('offset', '100%').attr('stop-color', '#3987e5').attr('stop-opacity', 0);
const hatch = defs.append('pattern').attr('id', 'hatch-attack').attr('patternUnits', 'userSpaceOnUse')
  .attr('width', 7).attr('height', 7).attr('patternTransform', 'rotate(45)');
hatch.append('rect').attr('width', 7).attr('height', 7).attr('fill', '#ff5a4a').attr('fill-opacity', 0.1);
hatch.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 7).attr('stroke', '#ff5a4a').attr('stroke-width', 2).attr('stroke-opacity', 0.45);

const gAtmo = svg.append('circle').attr('cx', W / 2).attr('cy', H / 2).attr('fill', 'url(#atmo)');
const gSphere = svg.append('circle').attr('cx', W / 2).attr('cy', H / 2).attr('fill', C.ocean);
const gGrat = svg.append('path').datum(d3.geoGraticule10()).attr('fill', 'none').attr('stroke', C.graticule).attr('stroke-width', 0.5);
const gLand = svg.append('path').attr('fill', C.land).attr('stroke', C.landEdge).attr('stroke-width', 0.5);
const gBorders = svg.append('path').attr('fill', 'none').attr('stroke', C.border).attr('stroke-width', 0.4);
const gZones = svg.append('g');
const gAvoided = svg.append('g');
const gLegs = svg.append('g');
const gLegHit = svg.append('g');
const gVoyage = svg.append('g').style('pointer-events', 'none');
const gRegas = svg.append('g');
const gProj = svg.append('g');
const gLiq = svg.append('g');
const gChoke = svg.append('g');
const gEvents = svg.append('g');
const gText = svg.append('g').style('pointer-events', 'none');

const tip = d3.select('#tip');
function showTip(event, html) {
  tip.html(html).style('display', 'block');
  const pad = 14, r = tip.node().getBoundingClientRect();
  let x = event.clientX + pad, y = event.clientY + pad;
  if (x + r.width > window.innerWidth - 8) x = event.clientX - r.width - pad;
  if (y + r.height > window.innerHeight - 8) y = event.clientY - r.height - pad;
  tip.style('left', x + 'px').style('top', y + 'px');
}
const hideTip = () => tip.style('display', 'none');

function isFront(lon, lat) {
  const r = projection.rotate();
  return d3.geoDistance([lon, lat], [-r[0], -r[1]]) < Math.PI / 2 - 0.01;
}

// Resolve a leg path (named points or [lat, lon]) to [{lon, lat, name, key}]
function resolve(p) {
  return p.map((x) => {
    if (typeof x === 'string') {
      const q = D.points[x];
      if (!q) throw new Error('unknown point ' + x);
      return { lat: q[0], lon: q[1], name: q[2], key: x };
    }
    return { lat: x[0], lon: x[1], name: '', key: `${x[0]},${x[1]}` };
  });
}
function arc(wps) {
  const coords = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const a = [wps[i].lon, wps[i].lat], b = [wps[i + 1].lon, wps[i + 1].lat];
    const n = Math.max(8, Math.ceil(d3.geoDistance(a, b) * 60));
    const it = d3.geoInterpolate(a, b);
    for (let s = i ? 1 : 0; s <= n; s++) coords.push(it(s / n));
  }
  return { type: 'LineString', coordinates: coords };
}
// point roughly halfway along a LineString, by arc length
function midpoint(line) {
  const c = line.coordinates;
  let total = 0;
  const seg = [];
  for (let i = 1; i < c.length; i++) { const d = d3.geoDistance(c[i - 1], c[i]); seg.push(d); total += d; }
  let acc = 0;
  for (let i = 0; i < seg.length; i++) { if (acc + seg[i] >= total / 2) return c[i + 1]; acc += seg[i]; }
  return c[Math.floor(c.length / 2)];
}
function zoneFeature(z) {
  let geom;
  if (z.circle) geom = d3.geoCircle().center([z.circle[0], z.circle[1]]).radius(z.circle[2])();
  else {
    const ring = [...z.polygon, z.polygon[0]];
    geom = { type: 'Polygon', coordinates: [ring] };
    // d3-geo reads winding order: flip a ring that came out as "everything but this patch"
    if (d3.geoArea(geom) > 2 * Math.PI) geom = { type: 'Polygon', coordinates: [ring.slice().reverse()] };
  }
  return { type: 'Feature', geometry: geom, properties: z };
}

const legValue = (l) => (state.scenario === '2026' ? (l.mt2026 ?? l.mt2025) : l.mt2025);
const legWidth = (mt) => Math.max(0.9, 0.9 + mt * 0.115);
const legColor = (l) => (state.scenario === '2026' ? STATUS[l.status].c : C.leg);
const share = (mt) => (100 * mt) / D.globalTrade2025Mt;
const isDown = (p) => /FORCE MAJEURE|Shut/i.test(p.status);

// ------------------------------------------------------------------ glyphs
function eventGlyph(sel, type) {
  const c = EVENT[type].c;
  sel.selectAll('*').remove();
  sel.append('circle').attr('class', 'focus-ring').attr('r', 13).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 1.5).style('display', 'none');
  sel.append('circle').attr('class', 'approx-ring').attr('r', 10.5).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 1).attr('stroke-dasharray', '2,2').style('display', 'none');
  if (type === 'attack' || type === 'strike') {
    const pts = d3.range(16).map((i) => { const r = i % 2 ? 3.2 : 8, a = (i * Math.PI) / 8; return [r * Math.sin(a), -r * Math.cos(a)]; });
    sel.append('path').attr('d', 'M' + pts.join('L') + 'Z').attr('fill', c).attr('stroke', C.bg).attr('stroke-width', 1);
    if (type === 'strike') sel.append('rect').attr('x', -2.2).attr('y', -2.2).attr('width', 4.4).attr('height', 4.4).attr('fill', C.bg);
  } else if (type === 'blockade') {
    sel.append('circle').attr('r', 6.5).attr('fill', c).attr('stroke', C.bg).attr('stroke-width', 1);
    sel.append('rect').attr('x', -4).attr('y', -1.3).attr('width', 8).attr('height', 2.6).attr('fill', '#fff');
  } else if (type === 'restriction') {
    sel.append('path').attr('d', 'M-6,-5 L6,-5 L0,6 Z').attr('fill', c).attr('stroke', C.bg).attr('stroke-width', 1);
  } else if (type === 'policy') {
    sel.append('rect').attr('x', -5.5).attr('y', -5.5).attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', c);
    sel.append('text').attr('text-anchor', 'middle').attr('y', 3.6).attr('font-size', 9.5).attr('font-weight', 700).attr('fill', C.bg).text('§');
  } else if (type === 'supply') {
    sel.append('circle').attr('r', 6.5).attr('fill', c).attr('stroke', C.bg).attr('stroke-width', 1);
    sel.append('path').attr('d', 'M0,-4 L3.6,0.6 L1.3,0.6 L1.3,4 L-1.3,4 L-1.3,0.6 L-3.6,0.6 Z').attr('fill', C.bg);
  } else {
    sel.append('circle').attr('r', 5.8).attr('fill', C.bg).attr('stroke', c).attr('stroke-width', 1.6);
    sel.append('text').attr('text-anchor', 'middle').attr('y', 3.4).attr('font-size', 8.5).attr('font-weight', 700).attr('fill', c).text('i');
  }
  sel.append('circle').attr('r', 11).attr('fill', 'transparent');
}

// ------------------------------------------------------------------ drawing
let LAND = { coarse: null, fine: null }, BORDERS = { coarse: null, fine: null };
function setWorld(coarse, fine) {
  LAND.coarse = topojson.feature(coarse, coarse.objects.land);
  BORDERS.coarse = topojson.mesh(coarse, coarse.objects.countries, (a, b) => a !== b);
  if (fine) {
    LAND.fine = topojson.feature(fine, fine.objects.land);
    BORDERS.fine = topojson.mesh(fine, fine.objects.countries, (a, b) => a !== b);
  }
}

function drawLegs() {
  const legs = state.layers.legs ? D.legs.slice().sort((a, b) => legValue(b) - legValue(a)) : [];
  gAvoided.selectAll('path').data(legs.filter((l) => l.avoided), (d) => d.id).join('path')
    .attr('fill', 'none').attr('stroke', C.avoided).attr('stroke-width', 1.3).attr('stroke-dasharray', '3,4')
    .each(function (d) { this.__line = arc(resolve(d.avoided)); });

  const lines = [];
  legs.forEach((l) => {
    lines.push({ l, key: l.id, line: arc(resolve(l.path)), main: true });
    if (l.secondary) lines.push({ l, key: l.id + '-2', line: arc(resolve(l.secondary)), main: false });
  });
  lines.reverse(); // smaller on top so thin legs stay clickable
  gLegs.selectAll('path').data(lines, (d) => d.key).join('path')
    .attr('fill', 'none').attr('stroke-linecap', 'round')
    .each(function (d) { this.__line = d.line; });
  gLegHit.selectAll('path').data(lines, (d) => d.key).join('path')
    .attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 12).style('cursor', 'pointer')
    .each(function (d) { this.__line = d.line; })
    .on('mousemove', (e, d) => showTip(e, legTip(d.l)))
    .on('mouseleave', hideTip)
    .on('click', (e, d) => select({ kind: 'leg', id: d.l.id }));
  styleLegs();
}

function styleLegs() {
  const hot = activeLegIds();
  gLegs.selectAll('path')
    .attr('stroke', (d) => legColor(d.l))
    .attr('stroke-width', (d) => (d.main ? legWidth(legValue(d.l)) : Math.max(0.9, legWidth(legValue(d.l)) * 0.5)))
    .attr('stroke-dasharray', (d) => (state.scenario === '2026' && d.l.status === 'critical' ? '6,4' : null))
    .attr('opacity', (d) => (state.voyage ? 0.18 : !hot ? 0.82 : hot.has(d.l.id) ? 1 : 0.1));
  gAvoided.selectAll('path').attr('opacity', (d) => (!hot || hot.has(d.id) ? 0.9 : 0.1));
}

function drawAssets() {
  const liq = state.layers.liq ? D.liquefaction : [];
  const reg = state.layers.regas ? D.regas : [];
  const chk = state.layers.choke ? D.chokepoints : [];
  const prj = state.layers.proj ? D.projects : [];
  const tri = d3.symbol().type(d3.symbolTriangle);
  const sq = d3.symbol().type(d3.symbolSquare);

  gLiq.selectAll('g').data(liq, (d) => d.name).join((en) => {
    const g = en.append('g').style('cursor', 'pointer')
      .on('mousemove', (e, d) => showTip(e, liqTip(d))).on('mouseleave', hideTip)
      .on('click', (e, d) => select({ kind: 'liq', id: d.name }));
    g.append('circle').attr('class', 'down').attr('fill', 'none').attr('stroke', STATUS.critical.c).attr('stroke-width', 1.8);
    g.append('path').attr('class', 'm').attr('stroke', C.bg).attr('stroke-width', 0.8);
    return g;
  }).each(function (d) {
    const size = 30 + d.mtpa * 9;
    d3.select(this).select('path.m').attr('d', tri.size(size)()).attr('fill', C.liq);
    d3.select(this).select('circle.down').attr('r', Math.sqrt(size) * 0.95 + 3);
  });

  gProj.selectAll('g').data(prj, (d) => d.name).join((en) => {
    const g = en.append('g').style('cursor', 'pointer')
      .on('mousemove', (e, d) => showTip(e, projTip(d))).on('mouseleave', hideTip)
      .on('click', (e, d) => select({ kind: 'proj', id: d.name }));
    g.append('path').attr('class', 'm').attr('fill', 'none').attr('stroke-width', 1.6).attr('stroke-dasharray', '3,2');
    return g;
  }).each(function (d) {
    // drawn larger than operating plants so a ring shows round existing sites
    d3.select(this).select('path.m').attr('d', tri.size(90 + d.mtpa * 14)()).attr('stroke', GROUP[d.group].c);
  });

  gRegas.selectAll('g').data(reg, (d) => d.name).join((en) => {
    const g = en.append('g').style('cursor', 'pointer')
      .on('mousemove', (e, d) => showTip(e, regasTip(d))).on('mouseleave', hideTip)
      .on('click', (e, d) => select({ kind: 'regas', id: d.name }));
    g.append('path').attr('class', 'm');
    return g;
  }).each(function (d) {
    const size = d.imports2025 ? 26 + d.imports2025 * 3.2 : 26;
    const fsru = d.type === 'fsru';
    d3.select(this).select('path.m').attr('d', sq.size(size)())
      .attr('fill', fsru ? C.bg : C.regas).attr('stroke', fsru ? C.regas : C.bg).attr('stroke-width', fsru ? 1.6 : 0.8);
  });

  gChoke.selectAll('g').data(chk, (d) => d.id).join((en) => {
    const g = en.append('g').style('cursor', 'pointer')
      .on('mousemove', (e, d) => showTip(e, chokeTip(d))).on('mouseleave', hideTip)
      .on('click', (e, d) => select({ kind: 'choke', id: d.id }));
    g.append('rect').attr('x', -5.5).attr('y', -5.5).attr('width', 11).attr('height', 11).attr('transform', 'rotate(45)')
      .attr('stroke', C.choke).attr('stroke-width', 2);
    return g;
  });

  const evs = state.layers.events ? D.events.map((e, i) => ({ ...e, idx: i })).filter((e) => e.lat != null) : [];
  gEvents.selectAll('g.ev').data(evs, (d) => d.idx).join((en) => en.append('g').attr('class', 'ev').style('cursor', 'pointer')
    .each(function (d) { eventGlyph(d3.select(this), d.type); })
    .on('mousemove', (e, d) => showTip(e, eventTip(d))).on('mouseleave', hideTip)
    .on('click', (e, d) => select({ kind: 'event', id: d.idx })));

  const zones = state.layers.events ? D.zones.map(zoneFeature) : [];
  gZones.selectAll('path').data(zones, (d) => d.properties.name).join('path')
    .attr('fill', (d) => ZONE_STYLE[d.properties.kind].fill)
    .attr('fill-opacity', (d) => ZONE_STYLE[d.properties.kind].op)
    .attr('stroke', (d) => ZONE_STYLE[d.properties.kind].stroke)
    .attr('stroke-width', 1).attr('stroke-dasharray', '4,3')
    .on('mousemove', (e, d) => showTip(e, `<b>${d.properties.name}</b>`)).on('mouseleave', hideTip);

  buildTexts();
  styleAssets();
}

function styleAssets() {
  const a = state.active;
  const isAct = (kind, id) => a && a.kind === kind && a.id === id;
  const hot = activeLegIds();
  const dim = (kind, id) => (!a || isAct(kind, id) || (hot && a.kind !== kind) ? 1 : 0.35);
  gLiq.selectAll('g').attr('opacity', (d) => dim('liq', d.name))
    .select('circle.down').style('display', (d) => (state.scenario === '2026' && isDown(d) ? null : 'none'));
  gRegas.selectAll('g').attr('opacity', (d) => dim('regas', d.name));
  gProj.selectAll('g').attr('opacity', (d) => dim('proj', d.name));
  gChoke.selectAll('rect').attr('fill', (d) => (isAct('choke', d.id) ? C.choke : C.ocean));
  gEvents.selectAll('g.ev').attr('opacity', (d) => (!a || a.kind !== 'event' || a.id === d.idx ? 1 : 0.35))
    .each(function (d) {
      const g = d3.select(this);
      g.select('.approx-ring').style('display', d.approx ? null : 'none');
      g.select('.focus-ring').style('display', isAct('event', d.idx) ? null : 'none');
    });
}

// ---------------------------------------------------------- label placement
// One text layer for leg volumes, asset names, events, zones and sea names.
// Each frame, labels are placed greedily by priority; a label that would
// overlap a placed one (or a marker) tries its other slots, else hides.
function buildTexts() {
  const T = [];
  if (state.layers.legs) D.legs.forEach((l) => T.push({ kind: 'leg', key: 'l-' + l.id, id: l.id, pt: midpoint(arc(resolve(l.path))) }));
  if (state.layers.liq) D.liquefaction.forEach((d) => T.push({ kind: 'liq', key: 'q-' + d.name, id: d.name, lon: d.lon, lat: d.lat, big: d.mtpa >= 14 }));
  if (state.layers.regas) D.regas.forEach((d) => T.push({ kind: 'regas', key: 'r-' + d.name, id: d.name, lon: d.lon, lat: d.lat, big: (d.imports2025 || 0) >= 40 }));
  if (state.layers.proj) D.projects.forEach((d) => T.push({ kind: 'proj', key: 'p-' + d.name, id: d.name, lon: d.lon, lat: d.lat, big: d.mtpa >= 12 }));
  if (state.layers.choke) D.chokepoints.forEach((d) => T.push({ kind: 'choke', key: 'c-' + d.id, id: d.id, lon: d.lon, lat: d.lat }));
  if (state.layers.events) {
    D.events.forEach((e, i) => { if (e.lat != null) T.push({ kind: 'event', key: 'e-' + i, id: i, lon: e.lon, lat: e.lat, side: e.labelSide }); });
    D.zones.forEach((z) => { const c = z.labelAt || d3.geoCentroid(zoneFeature(z)); T.push({ kind: 'zone', key: 'z-' + z.name, id: z.name, lon: c[0], lat: c[1], zkind: z.kind }); });
  }
  if (state.layers.seas) D.seas.forEach((s) => T.push({ kind: 'sea', key: 's-' + s.name, id: s.name, lon: s.lon, lat: s.lat, small: s.small }));
  gText.selectAll('text').data(T, (d) => d.key).join('text')
    .attr('paint-order', 'stroke').attr('stroke', C.bg).attr('stroke-linejoin', 'round').attr('stroke-width', 3)
    .each(function (d) {
      const t = d3.select(this);
      this.__w = null;
      if (d.kind === 'sea') {
        t.text(d.id).attr('font-size', d.small ? 9 : 10).attr('letter-spacing', '0.14em').attr('font-style', 'italic').attr('fill', '#6f9fcf');
        d.size = d.small ? 9 : 10;
      } else if (d.kind === 'zone') {
        const z = D.zones.find((x) => x.name === d.id);
        t.text(z.label || z.name).attr('font-size', 9.5).attr('font-style', 'italic').attr('fill', ZONE_STYLE[d.zkind].stroke);
        d.size = 9.5;
      } else if (d.kind === 'event') {
        const e = D.events[d.id];
        t.text(`${e.date} · ${e.title}`).attr('font-size', 10.5).attr('font-weight', 600).attr('fill', '#e8edf2');
        d.size = 10.5;
      } else if (d.kind === 'leg') {
        t.attr('font-size', 10.5).attr('font-weight', 600).attr('stroke-width', 3.2);
        d.size = 10.5;
      } else {
        const color = { liq: '#7fd6b3', regas: '#eda0c0', proj: '#b9c7d6', choke: '#e6b85c' }[d.kind];
        t.text(shortName(d)).attr('font-size', d.kind === 'choke' ? 10.5 : 9.8).attr('fill', color)
          .attr('font-style', d.kind === 'proj' ? 'italic' : null);
        d.size = d.kind === 'choke' ? 10.5 : 9.8;
      }
    });
  updateLegTexts();
}

function updateLegTexts() {
  gText.selectAll('text').filter((d) => d.kind === 'leg').each(function (d) {
    const l = D.legs.find((x) => x.id === d.id), v = legValue(l);
    const t = state.scenario === '2026' && l.mt2026 != null && Math.abs(l.mt2026 - l.mt2025) > 0.01
      ? `${fmt(l.mt2025)}→${fmt(v)} Mt` : `${fmt(v)} Mt · ${pct(share(v))}`;
    d3.select(this).text(t).attr('fill', state.scenario === '2026' ? STATUS[l.status].c : '#a9cdf5');
    this.__w = null;
  });
}

function shortName(d) {
  if (d.kind === 'choke') { const c = D.chokepoints.find((x) => x.id === d.id); return c.name.replace(' / Singapore', '').replace(' (Vilkitsky Strait)', '').replace(' / Turkish Straits', ''); }
  if (d.kind === 'liq') return d.id.replace(' (14 trains)', '').replace(' (incl. Stage 3)', '').replace(' (QCLNG, APLNG, GLNG)', '');
  if (d.kind === 'proj') { const p = D.projects.find((x) => x.name === d.id); return `${d.id} (${p.start})`; }
  return d.id.length > 26 ? d.id.split(' (')[0].split(' +')[0] : d.id;
}

function textRule(d) {
  const a = state.active, k = state.k;
  const act = (kind, id) => a && a.kind === kind && a.id === id;
  const hot = activeLegIds();
  switch (d.kind) {
    case 'leg': {
      const l = D.legs.find((x) => x.id === d.id), v = legValue(l);
      if (!state.layers.labels || state.voyage) return null;
      if (hot) return hot.has(d.id) ? { p: 95 } : null;
      return v >= 9 || k >= 2.2 || (state.scenario === '2026' && l.status === 'critical') ? { p: 60 + v / 10 } : null;
    }
    case 'event': return act('event', d.id) ? { p: 100, force: true } : (state.tab === 'events' || k >= 2.5) ? { p: 70 } : null;
    case 'zone': return k >= 2 ? { p: 25 } : null;
    case 'sea': return d.small && k < 2 ? null : { p: 12 };
    case 'choke': return { p: 55 };
    default: {
      const base = { liq: 45, regas: 40, proj: 35 }[d.kind];
      if (act(d.kind, d.id)) return { p: 99, force: true };
      if (d.kind === 'proj' && state.tab === 'proj') return { p: 50 };
      return k >= 2.4 || (d.big && k >= 1.25) ? { p: base } : null;
    }
  }
}

function placeTexts() {
  const nodes = gText.selectAll('text').nodes();
  const cand = [];
  nodes.forEach((n) => {
    const d = n.__data__;
    const rule = textRule(d);
    const lon = d.pt ? d.pt[0] : d.lon, lat = d.pt ? d.pt[1] : d.lat;
    if (!rule || !isFront(lon, lat)) { n.style.display = 'none'; return; }
    if (n.__w == null) { n.style.display = null; n.__w = n.getComputedTextLength(); }
    cand.push({ n, d, rule, lon, lat });
  });
  nodes.forEach((n) => { n.style.display = 'none'; });
  cand.sort((a, b) => b.rule.p - a.rule.p);
  const placed = [];
  const overlaps = (b) => placed.some((p) => b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y);
  // marker footprints of events block labels too
  gEvents.selectAll('g.ev').each(function (d) {
    if (this.style.display === 'none') return;
    const p = projection([d.lon, d.lat]);
    if (p) placed.push({ x: p[0] - 7, y: p[1] - 7, w: 14, h: 14 });
  });
  cand.forEach(({ n, d, rule, lon, lat }) => {
    const p = projection([lon, lat]);
    if (!p) return;
    const w = n.__w, h = d.size + 3;
    const centred = d.kind === 'sea' || d.kind === 'zone' || d.kind === 'leg';
    const dx = d.kind === 'event' ? 11 : 8, dy0 = d.kind === 'leg' ? -6 : d.kind === 'event' ? 4 : 3.5;
    const slots = centred ? ['middle', 'up', 'down']
      : d.side === 'left' ? ['end', 'start', 'above', 'below'] : ['start', 'end', 'above', 'below'];
    for (const s of slots) {
      const anchor = s === 'start' || s === 'end' ? s : 'middle';
      const dy = { above: -11, below: 19, up: dy0 - 13, down: dy0 + 13 }[s] ?? dy0;
      const x0 = anchor === 'start' ? p[0] + dx : anchor === 'end' ? p[0] - dx - w : p[0] - w / 2;
      const box = { x: x0 - 2, y: p[1] + dy - h + 2, w: w + 4, h: h + 2 };
      if (box.x < 2 || box.x + box.w > W - 2 || box.y < 2 || box.y + box.h > H - 2) continue;
      if (!rule.force && overlaps(box)) continue;
      placed.push(box);
      n.style.display = null;
      n.setAttribute('text-anchor', anchor);
      n.setAttribute('x', anchor === 'start' ? p[0] + dx : anchor === 'end' ? p[0] - dx : p[0]);
      n.setAttribute('y', p[1] + dy);
      break;
    }
  });
}

function render() {
  const s = projection.scale();
  gSphere.attr('r', s);
  gAtmo.attr('r', s * 1.08);
  gGrat.attr('d', path);
  const fine = state.k >= 2.5 && LAND.fine;
  gLand.datum(fine ? LAND.fine : LAND.coarse).attr('d', path);
  gBorders.datum(fine ? BORDERS.fine : BORDERS.coarse).attr('d', state.k >= 1.6 ? path : null);
  gZones.selectAll('path').attr('d', path);
  gAvoided.selectAll('path').attr('d', function () { return path(this.__line); });
  gLegs.selectAll('path').attr('d', function () { return path(this.__line); });
  gLegHit.selectAll('path').attr('d', function () { return path(this.__line); });
  gVoyage.selectAll('path').attr('d', function () { return path(this.__line); });
  const place = function (d) {
    const front = isFront(d.lon, d.lat);
    const p = projection([d.lon, d.lat]);
    d3.select(this).attr('transform', front && p ? `translate(${p[0]},${p[1]})` : null).style('display', front ? null : 'none');
  };
  gLiq.selectAll('g').each(place);
  gProj.selectAll('g').each(place);
  gRegas.selectAll('g').each(place);
  gChoke.selectAll('g').each(place);
  gEvents.selectAll('g.ev').each(place);
  placeTexts();
}

// --------------------------------------------------------------- tooltips
function legTip(l) {
  const v26 = l.mt2026 ?? l.mt2025;
  const st = STATUS[l.status];
  return `<b>${l.title}</b><br>2025: <b>${fmt(l.mt2025)} Mt</b> · ${pct(share(l.mt2025))} of world LNG<br>` +
    `Oct-2026 run-rate: <b>≈${fmt(v26)} Mt/yr</b><br>Voyage: ${l.days} days` +
    `<br><span style="color:${st.c}">${st.icon} ${st.label}</span>`;
}
function liqTip(d) {
  return `<b>${d.name}</b> · ${d.country}<br>Liquefaction ≈ <b>${fmt(d.mtpa)} Mtpa</b> (${pct(share(d.mtpa))} of 2025 trade)<br>${d.owner}<br><span style="color:${isDown(d) ? STATUS.critical.c : '#7fd6b3'}">${d.status}</span>`;
}
function projTip(d) {
  return `<span style="color:${GROUP[d.group].c}">UNDER CONSTRUCTION · ${GROUP[d.group].label.toUpperCase()}</span><br><b>${d.name}</b> · ${d.country}<br>` +
    `<b>${fmt(d.mtpa)} Mtpa</b>, target start <b>${d.start}</b>${d.status === 'delayed' ? ' (delayed)' : ''}<br>${d.note}`;
}
function regasTip(d) {
  return `<b>${d.name}</b> · ${d.country}<br>${d.type === 'fsru' ? 'Floating (FSRU)' : d.type === 'offshore GBS' ? 'Offshore gravity-based terminal' : 'Onshore terminal'}` +
    (d.imports2025 ? `<br>Country imports 2025: <b>${fmt(d.imports2025)} Mt</b>` : '') + `<br>${d.note}`;
}
function chokeTip(d) {
  const e = chokeExposure(d.id);
  return `<b>${d.name}</b><br>2025: <b>${fmt(e.mt25)} Mt</b> · ${pct(share(e.mt25))} of world LNG<br>Oct-2026 run-rate ≈ ${fmt(e.mt26)} Mt/yr<br>${d.status2026}`;
}
function eventTip(d) {
  const t = EVENT[d.type];
  return `<span style="color:${t.c}">${t.label.toUpperCase()}</span><br><b>${d.date} · ${d.title}</b><br>${d.text}` +
    (d.approx ? '<br><i>Approximate location.</i>' : '') + (d.source ? `<br><span class="src">${d.source}</span>` : '');
}

function chokeExposure(id) {
  const legs = D.legs.filter((l) => l.via.includes(id));
  return { legs, mt25: d3.sum(legs, (l) => l.mt2025), mt26: d3.sum(legs, (l) => l.mt2026 ?? l.mt2025) };
}

// ---------------------------------------------------------------- selection
function activeLegIds() {
  const a = state.active;
  if (!a) return null;
  if (a.kind === 'leg') return new Set([a.id]);
  if (a.kind === 'choke') return new Set(chokeExposure(a.id).legs.map((l) => l.id));
  if (a.kind === 'liq' || a.kind === 'regas') {
    const pool = a.kind === 'liq' ? D.liquefaction : D.regas;
    const p = pool.find((x) => x.name === a.id);
    // legs starting (plant) or ending (terminal) within ~150 km of the asset
    const ids = D.legs.filter((l) => {
      const w = resolve(l.path);
      const ends = a.kind === 'liq' ? [w[0]] : [w[w.length - 1], ...(l.secondary ? [resolve(l.secondary).slice(-1)[0]] : [])];
      return ends.some((e) => d3.geoDistance([e.lon, e.lat], [p.lon, p.lat]) < 0.025);
    }).map((l) => l.id);
    return new Set(ids);
  }
  return null;
}

function refresh() { styleLegs(); styleAssets(); renderList(); renderDetail(); render(); }

function select(t, opts = {}) {
  const same = state.active && state.active.kind === t.kind && state.active.id === t.id;
  state.active = same ? null : t;
  if (state.active) {
    const tabFor = { leg: 'legs', liq: 'liq', regas: 'regas', choke: 'choke', event: 'events', proj: 'proj' }[t.kind];
    if (state.tab !== tabFor) { state.tab = tabFor; syncTabs(); }
  }
  refresh();
  if (!state.active || opts.noRotate) return;
  let focus, zoom = null;
  if (t.kind === 'leg') {
    const l = D.legs.find((x) => x.id === t.id);
    const line = arc(resolve(l.path));
    focus = d3.geoCentroid(line);
    const len = d3.geoLength(line);
    zoom = len < 0.25 ? 3 : len < 0.6 ? 1.8 : 1;
  } else if (t.kind === 'event') {
    const e = D.events[t.id];
    if (e.lat == null) return;
    focus = [e.lon, e.lat];
    zoom = Math.max(state.k, 4);
  } else {
    const pool = { liq: D.liquefaction, regas: D.regas, proj: D.projects, choke: D.chokepoints }[t.kind];
    const p = pool.find((x) => (x.name || x.id) === t.id || x.id === t.id);
    focus = [p.lon, p.lat];
    zoom = Math.max(state.k, 2.2);
  }
  flyTo(focus, zoom);
  const row = document.querySelector('#list .row.on');
  if (row) { const ul = row.parentNode; if (row.offsetTop < ul.scrollTop || row.offsetTop > ul.scrollTop + ul.clientHeight - 40) ul.scrollTop = row.offsetTop - 40; }
}

function flyTo([lon, lat], k) {
  const from = projection.rotate();
  let dLon = (-lon - from[0]);
  dLon = ((dLon + 540) % 360) - 180;
  const to = [from[0] + dLon, Math.max(-70, Math.min(70, -lat))];
  const ri = d3.interpolate([from[0], from[1]], to);
  const k0 = state.k, k1 = k ?? k0;
  d3.transition().duration(1000).ease(d3.easeCubicInOut).tween('fly', () => (t) => {
    projection.rotate(ri(t));
    setZoom(k0 * Math.pow(k1 / k0, t), false);
    render();
  }).on('end', () => svg.call(zoomer.transform, d3.zoomIdentity.scale(state.k)));
}

function setZoom(k, rerender = true) {
  state.k = Math.max(0.85, Math.min(14, k));
  projection.scale(BASE_SCALE * state.k);
  if (rerender) render();
}

// ------------------------------------------------------------- interaction
const zoomer = d3.zoom().scaleExtent([0.85, 14])
  .filter((e) => e.type === 'wheel' || (e.type === 'touchstart' && e.touches.length > 1) || e.type === 'dblclick')
  .on('zoom', (e) => setZoom(e.transform.k));
svg.call(zoomer).on('dblclick.zoom', null);

let dragStart = null;
svg.call(d3.drag()
  .filter((e) => !e.button && (!e.touches || e.touches.length === 1))
  .clickDistance(5)
  .on('start', (e) => { stopSpin(); dragStart = { r: projection.rotate(), x: e.x, y: e.y }; })
  .on('drag', (e) => {
    if (!dragStart) return;
    const s = 0.32 / state.k;
    projection.rotate([dragStart.r[0] + (e.x - dragStart.x) * s, Math.max(-85, Math.min(85, dragStart.r[1] - (e.y - dragStart.y) * s))]);
    hideTip();
    render();
  })
  .on('end', () => { dragStart = null; }));

let spinTimer = null;
function stopSpin() { if (spinTimer) { spinTimer.stop(); spinTimer = null; } state.spin = false; d3.select('#spin').style('color', null); }
d3.select('#spin').on('click', () => {
  if (spinTimer) return stopSpin();
  state.spin = true; d3.select('#spin').style('color', C.ink);
  let last = 0;
  spinTimer = d3.timer((el) => {
    const r = projection.rotate();
    projection.rotate([r[0] + (el - last) * 0.006, r[1]]);
    last = el; render();
  });
});
d3.select('#zin').on('click', () => svg.transition().duration(350).call(zoomer.scaleBy, 1.6));
d3.select('#zout').on('click', () => svg.transition().duration(350).call(zoomer.scaleBy, 1 / 1.6));
d3.select('#zreset').on('click', () => { state.active = null; clearVoyage(); refresh(); flyTo([60, 18], 1); });

d3.selectAll('#scenario button').on('click', function () {
  state.scenario = this.dataset.s;
  d3.selectAll('#scenario button').classed('on', function () { return this.dataset.s === state.scenario; });
  updateScenarioChrome();
  drawLegs(); updateLegTexts(); refresh();
});
d3.selectAll('#layers input').on('change', function () {
  state.layers[this.dataset.l] = this.checked;
  drawLegs(); drawAssets(); render();
});
d3.selectAll('#tabs .tab').on('click', function () { state.tab = this.dataset.t; syncTabs(); renderList(); render(); });
function syncTabs() { d3.selectAll('#tabs .tab').classed('on', function () { return this.dataset.t === state.tab; }); }

function updateScenarioChrome() {
  const now = state.scenario === '2026';
  d3.select('#scen-banner').classed('now', now).html(now
    ? '<b style="color:#ff8a80">Now (Oct 2026):</b> line colour shows each leg\'s status. Dashed red legs are halted, and line widths are rough current run-rates. Hormuz has been closed since 28 Feb and Ras Laffan has been under force majeure since 2 Mar; US, Australian and Omani supply is filling the gap. Red rings mark plants that are shut.'
    : '<b style="color:#a9cdf5">2025 baseline:</b> a record 427.9 Mt traded. Line width is proportional to annual volume, and labels show Mt and share of world trade (GIIGNL 2025 flows). The dashed grey line is the Qatar→Europe Suez route, abandoned for the Cape since 2024.');
  const L = d3.select('#legend').html('');
  const sw = (svgInner, text) => L.append('span').html(`<svg width="18" height="12">${svgInner}</svg>${text}`);
  sw(`<path d="M9 1 L16 11 L2 11 Z" fill="${C.liq}"/>`, 'export plant (size = Mtpa)');
  sw(`<path d="M9 1 L16 11 L2 11 Z" fill="none" stroke="${GROUP.US.c}" stroke-width="1.4" stroke-dasharray="2,1.5"/>`, 'under construction');
  sw(`<rect x="4" y="2" width="9" height="9" fill="${C.regas}"/>`, 'import terminal');
  sw(`<rect x="4" y="2" width="9" height="9" fill="none" stroke="${C.regas}" stroke-width="1.6"/>`, 'floating terminal (FSRU)');
  sw(`<rect x="5" y="2" width="7" height="7" transform="rotate(45 8.5 5.5)" fill="none" stroke="${C.choke}" stroke-width="1.8"/>`, 'chokepoint');
  if (!now) {
    sw(`<line x1="1" y1="6" x2="17" y2="6" stroke="${C.leg}" stroke-width="5"/>`, 'shipping leg (width = Mt/yr)');
    sw(`<line x1="1" y1="6" x2="17" y2="6" stroke="${C.avoided}" stroke-width="1.4" stroke-dasharray="3,3"/>`, 'route abandoned');
  } else {
    Object.values(STATUS).forEach((s) => sw(`<line x1="1" y1="6" x2="17" y2="6" stroke="${s.c}" stroke-width="4" ${s === STATUS.critical ? 'stroke-dasharray="5,3"' : ''}/>`, `${s.icon} ${s.label}`));
    sw(`<circle cx="9" cy="6" r="5" fill="none" stroke="${STATUS.critical.c}" stroke-width="1.8"/>`, 'plant shut');
  }
  const E = d3.select('#legend-events').html('');
  Object.entries(EVENT).forEach(([type, t]) => {
    const s = E.append('span');
    eventGlyph(s.append('svg').attr('width', 16).attr('height', 16).attr('viewBox', '-9 -9 18 18').append('g'), type);
    s.append('span').text(t.label);
  });
  [['attack', 'attack zone'], ['closure', 'closed strait'], ['restriction', 'capped canal']].forEach(([k, label]) => {
    const z = ZONE_STYLE[k];
    E.append('span').html(`<svg width="16" height="12"><rect x="1" y="1" width="14" height="10" fill="${k === 'attack' ? 'url(#hatch-attack)' : z.fill}" fill-opacity="${k === 'attack' ? 1 : 0.4}" stroke="${z.stroke}" stroke-dasharray="3,2"/></svg>${label}`);
  });
}

// ------------------------------------------------------------------ side list
function renderList() {
  const list = d3.select('#list').html('');
  const a = state.active;
  const on = (kind, id) => a && a.kind === kind && a.id === id;
  if (state.tab === 'legs') {
    const total = d3.sum(D.legs, legValue);
    list.append('div').attr('class', 'group-label').text(state.scenario === '2026'
      ? `${D.legs.length} legs · ≈${fmt(total)} Mt/yr current run-rate (vs ${fmt(d3.sum(D.legs, (l) => l.mt2025))} in 2025)`
      : `${D.legs.length} legs · ${fmt(total)} of ${fmt(D.globalTrade2025Mt)} Mt mapped (GIIGNL 2025 flows)`);
    const max = d3.max(D.legs, (l) => l.mt2025);
    D.legs.slice().sort((x, y) => legValue(y) - legValue(x)).forEach((l) => {
      const v = legValue(l), st = STATUS[l.status];
      const r = list.append('div').attr('class', 'row').classed('on', on('leg', l.id)).on('click', () => select({ kind: 'leg', id: l.id }));
      r.append('div').attr('class', 't').text(l.title);
      r.append('div').attr('class', 'n').html(`${fmt(v)} Mt · <b>${pct(share(v))}</b>`);
      const sub = r.append('div').attr('class', 'sub');
      sub.append('div').attr('class', 'bar').append('i').style('width', (100 * v / max) + '%').style('background', state.scenario === '2026' ? st.c : C.leg);
      if (state.scenario === '2026') sub.append('span').attr('class', 'pill').style('color', st.c).style('border-color', st.c).text(`${st.icon} ${st.label}`);
      else sub.append('span').text(`${l.days} days`);
    });
  } else if (state.tab === 'liq') {
    list.append('div').attr('class', 'group-label').text(`${D.liquefaction.length} plants shown · world capacity ${D.capacityTotals.liquefaction} Mtpa (end-2025)`);
    const max = d3.max(D.liquefaction, (d) => d.mtpa);
    d3.groups(D.liquefaction, (d) => d.country)
      .sort((x, y) => d3.sum(y[1], (d) => d.mtpa) - d3.sum(x[1], (d) => d.mtpa))
      .forEach(([country, plants]) => {
        list.append('div').attr('class', 'group-label').text(`${country} · ${fmt(d3.sum(plants, (d) => d.mtpa))} Mtpa`);
        plants.sort((x, y) => y.mtpa - x.mtpa).forEach((p) => {
          const r = list.append('div').attr('class', 'row').classed('on', on('liq', p.name)).on('click', () => select({ kind: 'liq', id: p.name }));
          r.append('div').attr('class', 't').text(p.name);
          r.append('div').attr('class', 'n').text(`${fmt(p.mtpa)} Mtpa`);
          const sub = r.append('div').attr('class', 'sub');
          sub.append('div').attr('class', 'bar').append('i').style('width', (100 * p.mtpa / max) + '%').style('background', isDown(p) ? STATUS.critical.c : C.liq);
          sub.append('span').style('color', isDown(p) ? '#ff8a80' : null).text(p.status.length > 44 ? p.status.slice(0, 42) + '…' : p.status);
        });
      });
  } else if (state.tab === 'regas') {
    list.append('div').attr('class', 'group-label').text(`${D.regas.length} terminals and hubs shown · world regas ${D.capacityTotals.regas} Mtpa`);
    d3.groups(D.regas, (d) => d.country).forEach(([country, ts]) => {
      const imp = ts.find((t) => t.imports2025);
      list.append('div').attr('class', 'group-label').text(country + (imp ? ` · imports ${fmt(imp.imports2025)} Mt (2025)` : ''));
      ts.forEach((t) => {
        const r = list.append('div').attr('class', 'row').classed('on', on('regas', t.name)).on('click', () => select({ kind: 'regas', id: t.name }));
        r.append('div').attr('class', 't').text(t.name);
        r.append('div').attr('class', 'n').text(t.type === 'fsru' ? 'FSRU' : t.type === 'offshore GBS' ? 'offshore' : 'onshore');
      });
    });
  } else if (state.tab === 'choke') {
    list.append('div').attr('class', 'group-label').text('Share of 2025 world LNG trade passing through');
    D.chokepoints.map((c) => ({ c, e: chokeExposure(c.id) })).sort((x, y) => y.e.mt25 - x.e.mt25).forEach(({ c, e }) => {
      const r = list.append('div').attr('class', 'row').classed('on', on('choke', c.id)).on('click', () => select({ kind: 'choke', id: c.id }));
      r.append('div').attr('class', 't').text(c.name);
      r.append('div').attr('class', 'n').html(`${fmt(e.mt25)} Mt · <b>${pct(share(e.mt25))}</b>`);
      const sub = r.append('div').attr('class', 'sub');
      sub.append('div').attr('class', 'bar').append('i').style('width', share(e.mt25) * 3 + '%').style('background', C.choke);
      sub.append('span').text(`now ≈${fmt(e.mt26)} Mt/yr`);
    });
  } else if (state.tab === 'events') {
    if (!state.layers.events) list.append('div').attr('class', 'group-label').text('Tick "2026 events" above to show these on the globe');
    list.append('div').attr('class', 'group-label').text(`${D.events.length} events, oldest first · click to fly there`);
    D.events.forEach((e, i) => {
      const t = EVENT[e.type];
      const r = list.append('div').attr('class', 'row ev-row').classed('on', on('event', i)).classed('nomap', e.lat == null)
        .on('click', () => select({ kind: 'event', id: i }));
      const ico = r.append('svg').attr('width', 18).attr('height', 18).attr('viewBox', '-9 -9 18 18').attr('class', 'ev-ico');
      eventGlyph(ico.append('g'), e.type);
      const body = r.append('div');
      body.append('div').html(`<span class="ev-date">${e.date}</span> <b>${e.title}</b>${e.lat == null ? ' <span class="ev-tag">not mapped</span>' : ''}`);
      body.append('div').attr('class', 'ev-src').style('color', t.c).text(t.label);
    });
  } else {
    const total = d3.sum(D.projects, (p) => p.mtpa);
    list.append('div').attr('class', 'group-label').text(`${D.projects.length} projects · ${fmt(total)} Mtpa starting 2026–2031${state.layers.proj ? '' : ' · tick "under construction" to map them'}`);
    d3.groups(D.projects, (p) => p.start).sort((x, y) => x[0] - y[0]).forEach(([yr, ps]) => {
      list.append('div').attr('class', 'group-label').text(`${yr} · +${fmt(d3.sum(ps, (p) => p.mtpa))} Mtpa`);
      ps.sort((x, y) => y.mtpa - x.mtpa).forEach((p) => {
        const r = list.append('div').attr('class', 'row').classed('on', on('proj', p.name)).on('click', () => {
          if (!state.layers.proj) { state.layers.proj = true; d3.select('#layers input[data-l=proj]').property('checked', true); drawAssets(); }
          select({ kind: 'proj', id: p.name });
        });
        r.append('div').attr('class', 't').text(p.name);
        r.append('div').attr('class', 'n').text(`${fmt(p.mtpa)} Mtpa`);
        const sub = r.append('div').attr('class', 'sub');
        sub.append('span').attr('class', 'pill').style('color', GROUP[p.group].c).style('border-color', GROUP[p.group].c).text(p.country + (p.hormuz ? ' · behind Hormuz' : ''));
        if (p.status === 'delayed') sub.append('span').style('color', '#ff8a80').text('delayed');
      });
    });
  }
}

function renderDetail() {
  const el = d3.select('#detail').html('');
  const a = state.active;
  if (!a) {
    el.append('span').attr('class', 'placeholder').text('Select a shipping leg, plant, terminal, chokepoint, event or project, in the list or on the globe, to see its volume, share of world trade, the assets involved and its 2026 status.');
    return;
  }
  if (a.kind === 'leg') {
    const l = D.legs.find((x) => x.id === a.id), st = STATUS[l.status];
    const w = resolve(l.path);
    el.append('h4').text(l.title);
    el.append('div').style('font-size', '11.5px').text(`Exporter: ${l.exporter}`);
    el.append('div').attr('class', 'fig').html(
      `<div><b>${fmt(l.mt2025)} Mt</b>2025 volume</div><div><b>${pct(share(l.mt2025))}</b>of world LNG</div>` +
      `<div><b>≈${fmt(l.mt2026 ?? l.mt2025)}</b>Mt/yr now</div><div><b>${l.days}</b>days at sea</div>`);
    el.append('div').text(l.why);
    el.append('div').style('margin-top', '6px').style('font-size', '11.5px')
      .html(`<b style="color:var(--ink)">Load:</b> ${w[0].name} → <b style="color:var(--ink)">Discharge:</b> ${w[w.length - 1].name}` +
        (l.via.length ? ` · <b style="color:var(--ink)">Via:</b> ${l.via.map((v) => D.chokepoints.find((c) => c.id === v).name).join(', ')}` : ' · no major chokepoint'));
    el.append('div').attr('class', 'stat').style('border-color', st.c).html(`<b style="color:${st.c}">${st.icon} ${st.label} (Oct 2026)</b><br>${l.statusText}`);
    el.append('span').attr('class', 'src').text('Source: ' + l.source + '. 2026 run-rates are estimates (≈).');
  } else if (a.kind === 'liq') {
    const p = D.liquefaction.find((x) => x.name === a.id);
    el.append('h4').text(p.name);
    el.append('div').style('font-size', '11.5px').text(`${p.country} · ${p.owner}`);
    el.append('div').attr('class', 'fig').html(`<div><b>≈${fmt(p.mtpa)} Mtpa</b>liquefaction capacity</div><div><b>${pct(share(p.mtpa))}</b>of 2025 world trade</div>`);
    el.append('div').attr('class', 'stat').style('border-color', isDown(p) ? STATUS.critical.c : C.liq).text(p.status);
    const legs = [...(activeLegIds() || [])].map((id) => D.legs.find((l) => l.id === id).title);
    if (legs.length) el.append('div').style('margin-top', '8px').style('font-size', '11.5px').text('Shipping legs from here: ' + legs.join(' · '));
    const near = D.projects.filter((q) => d3.geoDistance([q.lon, q.lat], [p.lon, p.lat]) < 0.03);
    if (near.length) el.append('div').style('margin-top', '6px').style('font-size', '11.5px').text('Expansion under way here: ' + near.map((q) => `${q.name} (+${fmt(q.mtpa)} Mtpa, ${q.start})`).join(' · '));
  } else if (a.kind === 'proj') {
    const p = D.projects.find((x) => x.name === a.id);
    el.append('h4').text(p.name);
    el.append('div').style('font-size', '11.5px').html(`${p.country} · <span style="color:${GROUP[p.group].c}">${GROUP[p.group].label}</span>`);
    el.append('div').attr('class', 'fig').html(`<div><b>${fmt(p.mtpa)} Mtpa</b>new capacity</div><div><b>${p.start}</b>target start</div><div><b>${pct(share(p.mtpa))}</b>of 2025 world trade</div>`);
    el.append('div').text(p.note);
    if (p.hormuz) el.append('div').attr('class', 'stat').style('border-color', STATUS.critical.c).text('Behind Hormuz: this capacity only reaches the market if the strait is open.');
    el.append('span').attr('class', 'src').text('Source: ' + D.projectsSource);
  } else if (a.kind === 'regas') {
    const t = D.regas.find((x) => x.name === a.id);
    el.append('h4').text(t.name);
    el.append('div').style('font-size', '11.5px').text(`${t.country} · ${t.type === 'fsru' ? 'Floating storage & regasification unit (FSRU)' : t.type === 'offshore GBS' ? 'Offshore gravity-based structure' : 'Onshore regasification terminal'}`);
    if (t.imports2025) el.append('div').attr('class', 'fig').html(`<div><b>${fmt(t.imports2025)} Mt</b>country imports 2025</div><div><b>${pct(share(t.imports2025))}</b>of world LNG</div>`);
    el.append('div').style('margin-top', '6px').text(t.note);
    const legs = [...(activeLegIds() || [])].map((id) => D.legs.find((l) => l.id === id).title);
    if (legs.length) el.append('div').style('margin-top', '8px').style('font-size', '11.5px').text('Legs arriving here on the map: ' + legs.join(' · '));
  } else if (a.kind === 'event') {
    const e = D.events[a.id], t = EVENT[e.type];
    el.append('div').style('color', t.c).style('font-size', '11px').text(t.label.toUpperCase());
    el.append('h4').text(`${e.date} · ${e.title}`);
    el.append('div').text(e.text);
    if (e.approx) el.append('div').style('margin-top', '6px').style('font-size', '11.5px').style('font-style', 'italic').text('Approximate location: the exact position was not published.');
    if (e.lat == null) el.append('div').style('margin-top', '6px').style('font-size', '11.5px').style('font-style', 'italic').text('Not tied to a single location, so it is not drawn on the map.');
    el.append('span').attr('class', 'src').text('Source: ' + (e.source || 'see timeline'));
  } else {
    const c = D.chokepoints.find((x) => x.id === a.id), e = chokeExposure(c.id);
    el.append('h4').text(c.name);
    el.append('div').attr('class', 'fig').html(`<div><b>${fmt(e.mt25)} Mt</b>2025 LNG through</div><div><b>${pct(share(e.mt25))}</b>of world LNG</div><div><b>≈${fmt(e.mt26)}</b>Mt/yr now</div>`);
    el.append('div').text(c.why);
    el.append('div').attr('class', 'stat').style('border-color', C.choke).html(`<b style="color:#e6b85c">Oct 2026</b><br>${c.status2026}`);
    if (e.legs.length) el.append('div').style('margin-top', '8px').style('font-size', '11.5px').text('Legs through here: ' + e.legs.map((l) => `${l.title} (${fmt(l.mt2025)} Mt)`).join(' · '));
    el.append('span').attr('class', 'src').text('Source: ' + c.source);
  }
}

// --------------------------------------------------------------------- KPIs
function renderKpis() {
  const hz = chokeExposure('hormuz');
  const k = [
    { v: '427.9 Mt', l: 'LNG traded worldwide in 2025, a record (+5.4%)', s: 'GIIGNL 2026' },
    { v: pct(share(hz.mt25)), l: 'of world LNG passed the Strait of Hormuz in 2025 (Qatar + UAE)', s: 'computed from GIIGNL flows; IEA ≈19–20%' },
    { v: '~0.6 Mt', l: 'Qatar\'s expected October exports, vs ≈6.7 Mt/month before the war', s: 'Kpler via Reuters, 12 Oct 2026', alert: true },
    { v: '410–435 Mt', l: '2026 world supply under GIIGNL\'s disruption scenarios, vs ~475 Mt expected pre-crisis', s: 'GIIGNL Annual Report 2026', alert: true },
    { v: '≈3×', l: 'Asian and European spot LNG vs pre-war (late Sep peak). JKM ≈$25, TTF ≈$24, HH ≈$3 /MMBtu', s: 'Reuters; price snapshot 5 Oct 2026', alert: true },
  ];
  d3.select('#kpis').selectAll('div').data(k).join('div').attr('class', (d) => 'kpi' + (d.alert ? ' alert' : ''))
    .html((d) => `<div class="v">${d.v}</div><div class="l">${d.l}</div><div class="s">${d.s}</div>`);
}

// ------------------------------------------------------------- value chain
function renderChain(arb) {
  const gas = 1.15 * arb.hh, liq = arb.fee, ship = arb.fEu, regas = arb.regas;
  const total = gas + liq + ship + regas;
  const ico = {
    field: `<svg viewBox="0 0 120 46" class="ico"><rect x="0" y="38" width="120" height="8" fill="#1c2a38"/><path d="M30 38 L40 6 L50 38 M34 26 L46 26 M36 18 L44 18" stroke="${C.soft}" stroke-width="2" fill="none"/><path d="M60 34 H118" stroke="${C.leg}" stroke-width="3"/><circle cx="85" cy="34" r="3" fill="${C.leg}"/></svg>`,
    liq: `<svg viewBox="0 0 120 46" class="ico"><rect x="4" y="16" width="16" height="30" fill="#22344a"/><rect x="24" y="8" width="10" height="38" fill="#22344a"/><rect x="38" y="20" width="22" height="26" fill="#22344a"/><path d="M68 46 V22 a14 8 0 0 1 28 0 V46" fill="${C.liq}" opacity=".85"/><path d="M100 46 V26 a9 6 0 0 1 18 0 V46" fill="${C.liq}" opacity=".6"/></svg>`,
    ship: `<svg viewBox="0 0 120 46" class="ico"><path d="M4 30 H116 L106 42 H14 Z" fill="#22344a"/><circle cx="34" cy="24" r="8" fill="${C.leg}"/><circle cx="56" cy="24" r="8" fill="${C.leg}"/><circle cx="78" cy="24" r="8" fill="${C.leg}"/><rect x="92" y="14" width="10" height="16" fill="${C.soft}"/><path d="M0 44 Q10 40 20 44 T40 44 T60 44 T80 44 T100 44 T120 44" stroke="#2c3e50" fill="none"/></svg>`,
    regas: `<svg viewBox="0 0 120 46" class="ico"><path d="M2 36 H54 L48 44 H8 Z" fill="#22344a"/><circle cx="20" cy="30" r="6" fill="${C.regas}"/><circle cx="36" cy="30" r="6" fill="${C.regas}"/><path d="M66 46 V24 a12 7 0 0 1 24 0 V46" fill="${C.regas}" opacity=".8"/><path d="M94 40 H118" stroke="${C.soft}" stroke-width="3"/></svg>`,
    grid: `<svg viewBox="0 0 120 46" class="ico"><path d="M0 40 H120" stroke="${C.leg}" stroke-width="3"/><rect x="10" y="18" width="20" height="22" fill="#22344a"/><rect x="14" y="8" width="5" height="10" fill="#22344a"/><path d="M50 40 V20 L60 12 L70 20 V40 Z" fill="#22344a"/><path d="M88 40 L96 10 L104 40 M90 30 H102 M92 20 H100" stroke="${C.soft}" stroke-width="2" fill="none"/></svg>`,
    trade: `<svg viewBox="0 0 120 46" class="ico"><path d="M6 36 L26 28 L40 32 L58 14 L74 20 L92 8 L114 12" stroke="${C.choke}" stroke-width="2.5" fill="none"/><path d="M6 40 L30 38 L50 40 L70 34 L114 36" stroke="${C.leg}" stroke-width="2" fill="none"/><text x="104" y="30" fill="${C.soft}" font-size="10">$</text></svg>`,
  };
  const steps = [
    { h: 'Upstream gas', icon: ico.field, body: 'Gas fields (North Field in Qatar, Permian and Haynesville shale in the US, Carnarvon in Australia) and the pipelines that feed the plant. Feed gas can come from a hub (US: bought at Henry Hub) or from dedicated fields (Qatar, Australia).',
      cost: `Gas: <b>$${gas.toFixed(2)}</b> (115% × HH $${arb.hh.toFixed(2)})` },
    { h: 'Liquefaction', icon: ico.liq, body: 'Pre-treatment, then refrigeration to −162 °C in "trains", with cryogenic storage tanks (~160–200k m³ each) and a loading jetty. The most expensive step: ~$1,000–2,000 per tonne of yearly capacity to build. The world had 524 Mtpa at end-2025, 16.5 Mtpa of it floating (FLNG).',
      cost: `Tolling fee: <b>$${liq.toFixed(2)}</b>` },
    { h: 'Shipping', icon: ico.ship, body: '~800 large LNG carriers, mostly ~174,000 m³ membrane ships, plus Q-Flex/Q-Max (Qatar) and Arc7 ice-breakers (Yamal). Boil-off of 0.1–0.15% a day is burned as fuel. Voyage length decides how many ships the trade needs (see the voyage calculator).',
      cost: `Freight to NW Europe: <b>$${ship.toFixed(2)}</b>` },
    { h: 'Regasification', icon: ico.regas, body: 'Import terminal (onshore, or a floating FSRU) that stores the LNG and warms it back to gas. The world has 1,247 Mtpa of regas, ~2.4× its liquefaction, so import capacity is rarely the constraint.',
      cost: `Regas: <b>$${regas.toFixed(2)}</b>` },
    { h: 'Grid and storage', icon: ico.grid, body: 'Send-out into the national pipeline grid and underground storage (Europe fills storage in summer for winter), then to power plants, industry (fertiliser, chemicals) and homes.',
      cost: `Delivered cost: <b>$${total.toFixed(2)}</b>/MMBtu` },
    { h: 'Trading layer', icon: ico.trade, body: 'Portfolio players (Shell, TotalEnergies, BP, QatarEnergy, JERA, traders like Vitol, Trafigura, Gunvor) buy FOB, then optimise destination, timing and shipping across hubs: HH, TTF and JKM. 35% of 2025 trade was bought spot.',
      cost: `vs TTF $${arb.ttf.toFixed(2)} → margin <b>$${(arb.ttf - total).toFixed(2)}</b>` },
  ];
  d3.select('#chain').selectAll('div.step').data(steps).join('div').attr('class', 'step')
    .html((d, i) => `<div class="num">STEP ${i + 1}</div><h3>${d.h}</h3>${d.icon}<div>${d.body}</div><div class="cost">${d.cost}</div>`);
}

// ------------------------------------------------------------------ charts
function hbars(sel, rows, { color = C.leg, max, valueText, tipText, labelWidth }) {
  const root = d3.select(sel).html('').append('div').attr('class', 'hb');
  if (labelWidth) root.style('grid-template-columns', `${labelWidth}px 1fr 92px`);
  const m = max ?? d3.max(rows, (r) => r.v);
  rows.forEach((r) => {
    const tipFn = (e) => showTip(e, tipText ? tipText(r) : `<b>${r.name}</b><br>${valueText(r)}`);
    root.append('div').attr('class', 'lab').attr('title', r.name).text(r.name).on('mousemove', tipFn).on('mouseleave', hideTip);
    const t = root.append('div').attr('class', 'track').on('mousemove', tipFn).on('mouseleave', hideTip);
    if (r.v2 != null) {
      t.append('div').attr('class', 'fill a2').style('width', Math.max(0.5, 100 * r.v / m) + '%').style('background', color);
      t.append('div').attr('class', 'fill b').style('width', Math.max(0.5, 100 * r.v2 / m) + '%').style('background', C.s2);
    } else {
      t.append('div').attr('class', 'fill').style('width', Math.max(0.5, 100 * r.v / m) + '%').style('background', r.color || color);
    }
    root.append('div').attr('class', 'val').text(valueText(r));
  });
}

function renderCharts() {
  const T = D.globalTrade2025Mt;
  hbars('#c-exp', D.exporters2025.map((e) => ({ name: e.name, v: e.mt })), {
    valueText: (r) => `${fmt(r.v)} Mt · ${pct(100 * r.v / T)}`,
  });
  d3.select('#c-exp-src').text(D.exportersSource);

  const regC = { Asia: C.leg, Europe: C.s2, 'Middle East & Africa': C.liq, Americas: C.choke };
  const reg = d3.select('#c-imp-reg').html('');
  const key = reg.append('div').attr('class', 'keyline');
  D.importRegions2025.forEach((r) => key.append('span').html(`<i style="background:${regC[r.name]}"></i>${r.name} ${fmt(r.mt)} Mt (${pct(100 * r.mt / T)})`));
  const st = reg.append('div').attr('class', 'stack').style('margin-bottom', '14px');
  D.importRegions2025.forEach((r) => st.append('span').style('width', (100 * r.mt / T) + '%').style('background', regC[r.name])
    .on('mousemove', (e) => showTip(e, `<b>${r.name}</b><br>${fmt(r.mt)} Mt · ${pct(100 * r.mt / T)} of 2025 imports`)).on('mouseleave', hideTip));
  hbars('#c-imp', D.importers2025.map((e) => ({ name: e.name, v: e.mt })), {
    color: C.regas, max: d3.max(D.importers2025, (d) => d.mt), valueText: (r) => `${fmt(r.v)} Mt · ${pct(100 * r.v / T)}`,
  });
  d3.select('#c-imp-src').text(D.importersSource);

  const ch = D.chokepoints.map((c) => ({ c, e: chokeExposure(c.id) })).filter((x) => x.e.mt25 > 0 || x.c.id === 'babelmandeb')
    .sort((a, b) => b.e.mt25 - a.e.mt25)
    .map(({ c, e }) => ({ name: c.name.replace(' / Singapore', '').replace(' (Vilkitsky Strait)', '').replace(' / Turkish Straits', ''), v: share(e.mt25), v2: share(e.mt26), c, e }));
  hbars('#c-choke', ch, {
    max: d3.max(ch, (r) => Math.max(r.v, r.v2)),
    valueText: (r) => `${pct(r.v)} → ${pct(r.v2)}`,
    tipText: (r) => `<b>${r.c.name}</b><br>2025: ${fmt(r.e.mt25)} Mt (${pct(r.v)})<br>Oct-2026 run-rate: ≈${fmt(r.e.mt26)} Mt/yr (${pct(r.v2)})<br>${r.c.status2026}`,
  });

  const byEx = d3.rollups(D.legs, (v) => ({ a: d3.sum(v, (l) => l.mt2025), b: d3.sum(v, (l) => l.mt2026 ?? l.mt2025) }), (l) => l.exporter)
    .map(([name, x]) => ({ name: name.length > 18 ? name.split(',')[0] + ' & others' : name, v: x.a, v2: x.b }))
    .sort((a, b) => b.v - a.v).slice(0, 9);
  hbars('#c-gap', byEx, {
    max: d3.max(byEx, (r) => Math.max(r.v, r.v2)),
    valueText: (r) => `${fmt(r.v)} → ${fmt(r.v2)} ${r.v2 > r.v + 0.5 ? '▲' : r.v2 < r.v - 0.5 ? '▼' : ''}`,
  });
  const q = byEx.find((r) => r.name === 'Qatar');
  d3.select('#c-gap-foot').text(`Qatar alone: ${fmt(q.v)} → ≈${fmt(q.v2)} Mt/yr (≈${fmt(q.v - q.v2)} Mt/yr lost, about ${pct(100 * (q.v - q.v2) / T)} of world supply). US growth (+14% in 2026) and Golden Pass only partly fill it. 2026 values are estimates.`);

  hbars('#c-expo', D.exposure.rows.map((r) => ({ name: r.name, v: r.pct, mt: r.mt })), {
    color: STATUS.critical.c, max: 100, labelWidth: 100,
    valueText: (r) => `${r.v}% · ${fmt(r.mt)} Mt`,
    tipText: (r) => `<b>${r.name}</b><br>${r.v}% of 2025 LNG imports came from Qatar + UAE (${fmt(r.mt)} Mt)`,
  });
  d3.select('#c-expo-src').text(D.exposure.note);
}

// ---------------------------------------------------- supply wave (2026–31)
function renderSupplyWave() {
  const years = d3.range(2026, 2032);
  const groups = Object.keys(GROUP);
  const byYear = years.map((y) => {
    const row = { year: y };
    groups.forEach((g) => { row[g] = d3.sum(D.projects.filter((p) => p.start === y && p.group === g), (p) => p.mtpa); });
    row.total = d3.sum(groups, (g) => row[g]);
    return row;
  });
  let cum = 0; byYear.forEach((r) => { cum += r.total; r.cum = cum; });
  const damaged = 12.8;
  const wrap = d3.select('#c-wave').html('');
  const key = wrap.append('div').attr('class', 'keyline');
  groups.forEach((g) => key.append('span').html(`<i style="background:${GROUP[g].c}"></i>${GROUP[g].label}`));
  key.append('span').html(`<i style="background:${STATUS.critical.c}"></i>damaged at Ras Laffan`);

  const w = 640, h = 270, m = { t: 26, r: 10, b: 28, l: 40 };
  const x = d3.scaleBand().domain(years).range([m.l, w - m.r]).padding(0.32);
  const yMax = d3.max(byYear, (r) => r.total) * 1.12;
  const y = d3.scaleLinear().domain([-damaged * 1.25, yMax]).range([h - m.b, m.t]).nice();
  const s = wrap.append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('class', 'wave');
  s.append('g').selectAll('line').data(y.ticks(5)).join('line')
    .attr('x1', m.l).attr('x2', w - m.r).attr('y1', (d) => y(d)).attr('y2', (d) => y(d))
    .attr('stroke', (d) => (d === 0 ? '#3a4f66' : '#1c2733')).attr('stroke-width', 1);
  s.append('g').selectAll('text').data(y.ticks(5)).join('text')
    .attr('x', m.l - 6).attr('y', (d) => y(d) + 3.5).attr('text-anchor', 'end').attr('font-size', 10.5).attr('fill', C.soft).text((d) => d);
  s.append('text').attr('x', m.l - 6).attr('y', 12).attr('text-anchor', 'end').attr('font-size', 10.5).attr('fill', C.soft).text('Mtpa');
  const stack = d3.stack().keys(groups)(byYear);
  stack.forEach((layer) => {
    s.append('g').selectAll('rect').data(layer).join('rect')
      .attr('x', (d) => x(d.data.year)).attr('width', x.bandwidth())
      .attr('y', (d) => y(d[1])).attr('height', (d) => Math.max(0, y(d[0]) - y(d[1]) - (d[1] - d[0] > 0 ? 2 : 0)))
      .attr('fill', GROUP[layer.key].c)
      .on('mousemove', (e, d) => {
        const ps = D.projects.filter((p) => p.start === d.data.year && p.group === layer.key);
        showTip(e, `<b>${d.data.year} · ${GROUP[layer.key].label}: +${fmt(d[1] - d[0])} Mtpa</b><br>` + ps.map((p) => `${p.name} ${fmt(p.mtpa)}`).join('<br>'));
      }).on('mouseleave', hideTip);
  });
  s.append('rect').attr('x', x(2026)).attr('width', x.bandwidth()).attr('y', y(0) + 2).attr('height', y(-damaged) - y(0) - 2)
    .attr('fill', STATUS.critical.c).attr('rx', 2)
    .on('mousemove', (e) => showTip(e, '<b>Ras Laffan Trains 4 & 6 damaged: −12.8 Mtpa</b><br>18 Mar 2026; repairs 3–5 years (QatarEnergy). On top of this, all of Qatar\'s 77 Mtpa is cut off while Hormuz stays closed.'))
    .on('mouseleave', hideTip);
  s.append('text').attr('x', x(2026) + x.bandwidth() / 2).attr('y', y(-damaged) + 13).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#ff8a80').text('−12.8');
  s.append('g').selectAll('text').data(byYear).join('text')
    .attr('x', (d) => x(d.year) + x.bandwidth() / 2).attr('y', (d) => y(d.total) - 5).attr('text-anchor', 'middle')
    .attr('font-size', 10.5).attr('font-weight', 600).attr('fill', C.ink).text((d) => `+${fmt(d.total)}`);
  s.append('g').selectAll('text').data(years).join('text')
    .attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', h - 9).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', C.soft).text((d) => d);

  const hz = d3.sum(D.projects.filter((p) => p.hormuz), (p) => p.mtpa);
  const us = d3.sum(D.projects.filter((p) => p.group === 'US'), (p) => p.mtpa);
  const total = d3.sum(D.projects, (p) => p.mtpa);
  d3.select('#c-wave-foot').text(`${fmt(total)} Mtpa of new capacity is targeted for 2026–2031, on top of the world's ${D.capacityTotals.liquefaction} Mtpa: ${fmt(us)} Mtpa in the US and ${fmt(hz)} Mtpa behind Hormuz (Qatar's North Field East and South, UAE's Ruwais). ${D.projectsSource}`);

  hbars('#c-scen', D.scenarios2026.rows.map((r) => ({ name: r.name, v: r.mt, color: /actual/.test(r.name) ? C.soft : /Pre-crisis/.test(r.name) ? C.leg : STATUS.serious.c })), {
    max: 500, labelWidth: 210, valueText: (r) => `${fmt(r.v)} Mt`,
  });
}

// ------------------------------------------------------- voyage calculator
// Sea-lane graph: every consecutive waypoint pair of every leg (main,
// secondary and abandoned paths) plus a few extra lanes. Plants and
// terminals hook onto their nearest node.
let GRAPH = null;
function buildGraph() {
  const nodes = new Map(), adj = new Map();
  const addPath = (wps) => {
    wps.forEach((w) => { if (!nodes.has(w.key)) { nodes.set(w.key, w); adj.set(w.key, []); } });
    for (let i = 0; i < wps.length - 1; i++) {
      const a = wps[i], b = wps[i + 1];
      const d = d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]) * NM_PER_RAD;
      adj.get(a.key).push({ to: b.key, d }); adj.get(b.key).push({ to: a.key, d });
    }
  };
  D.legs.forEach((l) => { addPath(resolve(l.path)); if (l.secondary) addPath(resolve(l.secondary)); if (l.avoided) addPath(resolve(l.avoided)); });
  D.extraLanes.forEach((r) => addPath(resolve(r)));
  GRAPH = { nodes, adj };
}
function nearestNode(lon, lat) {
  let best = null, bd = Infinity;
  GRAPH.nodes.forEach((n, key) => { const d = d3.geoDistance([lon, lat], [n.lon, n.lat]); if (d < bd) { bd = d; best = key; } });
  return { key: best, d: bd * NM_PER_RAD };
}
function shortest(from, to, blocked) {
  const dist = new Map([[from, 0]]), prev = new Map(), done = new Set();
  while (true) {
    let u = null, du = Infinity;
    dist.forEach((d, k) => { if (!done.has(k) && d < du) { du = d; u = k; } });
    if (u == null) return null;
    if (u === to) break;
    done.add(u);
    for (const { to: v, d } of GRAPH.adj.get(u)) {
      if (blocked.has(v) && v !== to) continue;
      const nd = du + d;
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); }
    }
  }
  const keys = [to];
  while (keys[0] !== from) keys.unshift(prev.get(keys[0]));
  return { keys, nm: dist.get(to) };
}
const VOY = { from: 'Sabine Pass', to: 'Tokyo Bay terminals', speed: 17, volume: 1, charter: 80000, panamaWait: 3,
  allow: { hormuz: false, redsea: false, panama: true, nsr: false } };
function chokesOn(keys) {
  return Object.entries(CHOKE_NODES).filter(([, ns]) => keys.some((k) => ns.includes(k))).map(([c]) => c);
}
function routeVoyage(allow) {
  const src = D.liquefaction.find((p) => p.name === VOY.from), dst = D.regas.find((t) => t.name === VOY.to);
  const a = nearestNode(src.lon, src.lat), b = nearestNode(dst.lon, dst.lat);
  const blocked = new Set(Object.entries(allow).filter(([, ok]) => !ok).flatMap(([c]) => CHOKE_NODES[c]));
  // an endpoint that *is* a blocked node (e.g. a plant inside the Gulf) is still blocked
  const r = shortest(a.key, b.key, blocked);
  if (!r) return null;
  const wps = [{ lon: src.lon, lat: src.lat, name: src.name, key: 'src' }, ...r.keys.map((k) => GRAPH.nodes.get(k)), { lon: dst.lon, lat: dst.lat, name: dst.name, key: 'dst' }];
  const nm = r.nm + a.d + b.d;
  const chokes = chokesOn(r.keys);
  const canalDays = (chokes.includes('panama') ? 1 + VOY.panamaWait : 0) + (chokes.includes('suez') ? 1 : 0);
  const seaDays = nm / (VOY.speed * 24);
  const oneWay = seaDays + canalDays;
  const rt = 2 * oneWay + 2; // laden + ballast, plus a day each to load and discharge
  const fees = 2 * ((chokes.includes('panama') ? 0.45e6 : 0) + (chokes.includes('suez') ? 0.6e6 : 0));
  const perShip = 350 / rt;
  const cargoes = VOY.volume / 0.075;
  return { wps, nm, chokes, seaDays, canalDays, oneWay, rt, fees,
    freight: (VOY.charter * rt + fees) / 3.5e6, ships: cargoes / perShip, perShip, boil: 0.12 * oneWay };
}
function renderVoyageInputs() {
  const box = d3.select('#voy-in').html('');
  const sel = (label, key, opts) => {
    const lab = box.append('label').attr('class', 'sel');
    lab.append('span').text(label);
    const s = lab.append('select').on('change', function () { VOY[key] = this.value; renderVoyage(); });
    d3.groups(opts, (o) => o.country).forEach(([country, os]) => {
      const og = s.append('optgroup').attr('label', country);
      os.forEach((o) => og.append('option').attr('value', o.name).property('selected', o.name === VOY[key]).text(o.name));
    });
  };
  sel('Load at (export plant)', 'from', D.liquefaction.slice().sort((a, b) => a.country.localeCompare(b.country)));
  sel('Discharge at (import terminal)', 'to', D.regas.slice().sort((a, b) => a.country.localeCompare(b.country)));
  const num = (label, key, min, max, step, f) => {
    const lab = box.append('label');
    lab.append('span').text(label);
    const out = lab.append('output').text(f(VOY[key]));
    lab.append('input').attr('type', 'range').attr('min', min).attr('max', max).attr('step', step).property('value', VOY[key])
      .on('input', function () { VOY[key] = +this.value; out.text(f(VOY[key])); renderVoyage(); });
  };
  num('Ship speed (knots)', 'speed', 12, 20, 0.5, (v) => `${v} kn`);
  num('Volume to deliver (Mtpa)', 'volume', 0.5, 10, 0.5, (v) => `${v} Mtpa`);
  num('Charter rate ($/day, illustrative)', 'charter', 10000, 250000, 5000, (v) => `$${d3.format(',')(v)}`);
  num('Panama waiting time (days)', 'panamaWait', 0, 15, 0.5, (v) => `${v} d`);
  const tg = box.append('div').attr('class', 'toggles');
  tg.append('div').attr('class', 'cap').text('Open passages');
  [['hormuz', 'Strait of Hormuz'], ['redsea', 'Red Sea (Bab-el-Mandeb)'], ['panama', 'Panama Canal'], ['nsr', 'Northern Sea Route (Jul–Nov)']].forEach(([k, label]) => {
    const l = tg.append('label').attr('class', 'chk');
    l.append('input').attr('type', 'checkbox').attr('data-k', k).property('checked', VOY.allow[k])
      .on('change', function () { VOY.allow[k] = this.checked; renderVoyage(); });
    l.append('span').text(label);
  });
  const pr = box.append('div').attr('class', 'presets');
  pr.append('button').attr('class', 'btn').attr('type', 'button').text('Oct 2026 conditions').on('click', () => setAllow({ hormuz: false, redsea: false, panama: true, nsr: false }, 3));
  pr.append('button').attr('class', 'btn').attr('type', 'button').text('Pre-2024 (all open)').on('click', () => setAllow({ hormuz: true, redsea: true, panama: true, nsr: false }, 0.5));
}
function setAllow(a, wait) {
  VOY.allow = { ...a }; VOY.panamaWait = wait;
  d3.selectAll('#voy-in .toggles input').each(function () { this.checked = VOY.allow[this.dataset.k]; });
  d3.selectAll('#voy-in label').each(function () {
    const s = d3.select(this);
    if (s.select('span').text().startsWith('Panama waiting')) { s.select('input').property('value', wait); s.select('output').text(`${wait} d`); }
  });
  renderVoyage();
}
function renderVoyage() {
  const out = d3.select('#voy-out').html('');
  const best = routeVoyage(VOY.allow);
  const alts = [];
  if (best) {
    alts.push({ label: 'Shortest open route', r: best });
    // alternatives: close each optional passage the best route uses
    best.chokes.filter((c) => ['panama', 'redsea', 'suez', 'hormuz', 'nsr'].includes(c)).forEach((c) => {
      const r = routeVoyage({ ...VOY.allow, [c]: false });
      if (r && !alts.some((x) => Math.abs(x.r.nm - r.nm) < 5)) alts.push({ label: `Avoiding ${CHOKE_LABEL[c]}`, r });
    });
    // and what the trip looks like with every passage open (pre-crisis)
    const all = routeVoyage({ hormuz: true, redsea: true, panama: true, nsr: VOY.allow.nsr });
    if (all && !alts.some((x) => Math.abs(x.r.nm - all.nm) < 5)) alts.push({ label: 'If every passage were open', r: all });
  }
  if (!best) {
    const src = D.liquefaction.find((p) => p.name === VOY.from);
    out.append('div').attr('class', 'voy-none').html(`<b>No open route.</b> ${/Qatar|UAE/.test(src.country) ? 'Every exit from the Gulf passes the Strait of Hormuz: tick it to see the pre-war route.' : 'Open another passage (e.g. Panama or the Red Sea).'}`);
    showVoyage(null);
    return;
  }
  const tbl = out.append('table').attr('class', 'voy');
  tbl.append('tr').html('<th>Route</th><th>Distance</th><th>One way</th><th>Round trip</th><th>Ships for volume</th><th>Freight</th><th>Via</th>');
  alts.forEach((a, i) => {
    const r = a.r;
    const tr = tbl.append('tr').classed('on', i === 0).style('cursor', 'pointer')
      .on('click', function () { tbl.selectAll('tr').classed('on', false); d3.select(this).classed('on', true); showVoyage(r, true); });
    tr.html(`<td><b>${a.label}</b></td><td>${d3.format(',')(Math.round(r.nm))} nm</td><td>${r.oneWay.toFixed(1)} d</td><td>${r.rt.toFixed(0)} d</td>` +
      `<td>${r.ships.toFixed(1)} ships</td><td>$${r.freight.toFixed(2)}/MMBtu</td><td>${r.chokes.map((c) => CHOKE_LABEL[c]).join(', ') || 'open ocean'}</td>`);
  });
  const r = best;
  const warn = [];
  if (r.chokes.includes('hormuz')) warn.push('Hormuz is effectively closed to LNG (Oct 2026).');
  if (r.chokes.includes('redsea')) warn.push('LNG carriers have avoided the Red Sea since 2024; attacks continue.');
  if (r.chokes.includes('panama')) warn.push('Panama is capped at 32–33 transits a day (El Niño); LNG competes for slots.');
  if (r.chokes.includes('nsr')) warn.push('The Northern Sea Route is only open to conventional carriers ~Jul–Nov.');
  out.append('div').attr('class', 'voy-note').html(
    `<b>Reading it:</b> at ${VOY.speed} kn the shortest open route takes <b>${r.oneWay.toFixed(1)} days</b> one way and <b>${r.rt.toFixed(0)} days</b> round trip, so one ship delivers ~${r.perShip.toFixed(1)} cargoes a year. ` +
    `Moving ${VOY.volume} Mtpa (~${Math.round(VOY.volume / 0.075)} cargoes) ties up <b>${r.ships.toFixed(1)} ships</b>. Boil-off burns ~${r.boil.toFixed(1)}% of the cargo on the laden leg. ` +
    `Freight = charter × round-trip days + canal fees, spread over ~3.5 million MMBtu delivered. ` + (warn.length ? `<br><span style="color:#ffb199">⚠ ${warn.join(' ')}</span>` : '') +
    `<br><span class="muted">Distances run along the map's sea lanes, so they read a few % above true sailing distances. Canal fees, speed and charter are illustrative.</span>`);
  showVoyage(r, false);
}
function showVoyage(r, fly) {
  state.voyage = r;
  gVoyage.selectAll('*').remove();
  if (r) {
    const line = arc(r.wps);
    gVoyage.append('path').attr('fill', 'none').attr('stroke', C.bg).attr('stroke-width', 6).attr('stroke-linecap', 'round').node().__line = line;
    gVoyage.append('path').attr('fill', 'none').attr('stroke', C.voyage).attr('stroke-width', 2.6).attr('stroke-dasharray', '7,4').attr('stroke-linecap', 'round').node().__line = line;
    if (fly) {
      const len = d3.geoLength(line);
      flyTo(d3.geoCentroid(line), len < 0.3 ? 3 : len < 0.8 ? 1.6 : 1);
    }
  }
  d3.select('#voy-clear').style('display', r ? null : 'none');
  styleLegs(); render();
}
function clearVoyage() { state.voyage = null; gVoyage.selectAll('*').remove(); d3.select('#voy-clear').style('display', 'none'); }

// ------------------------------------------------------------ arbitrage calc
const ARB = { hh: 3.07, ttf: 24.09, jkm: 25.43, fee: 2.5, fEu: 1.2, fPan: 2.2, canal: 0.6, fCape: 3.4, regas: 0.5 };
const ARB_KEYS = ['hh', 'ttf', 'jkm', 'fee', 'fEu', 'fPan', 'canal', 'fCape', 'regas'];
function renderArbInputs() {
  const spec = [
    ['hh', 'Henry Hub (US gas), $/MMBtu', 1, 10, 0.05],
    ['ttf', 'TTF (Europe), $/MMBtu', 4, 60, 0.1],
    ['jkm', 'JKM (Asia spot), $/MMBtu', 4, 60, 0.1],
    ['fee', 'Liquefaction (tolling) fee', 1.5, 4, 0.05],
    ['fEu', 'Freight US Gulf → NW Europe', 0.4, 4, 0.05],
    ['fPan', 'Freight US Gulf → Japan via Panama', 0.8, 6, 0.05],
    ['canal', 'Panama canal fee + slot cost', 0, 3, 0.05],
    ['fCape', 'Freight US Gulf → Japan via Cape', 1.2, 8, 0.05],
    ['regas', 'Regasification', 0.2, 1.2, 0.05],
  ];
  const box = d3.select('#arb-inputs');
  spec.forEach(([k, label, min, max, step]) => {
    const lab = box.append('label');
    lab.append('span').text(label);
    const out = lab.append('output').text('$' + ARB[k].toFixed(2));
    lab.append('input').attr('type', 'range').attr('min', min).attr('max', max).attr('step', step).property('value', ARB[k])
      .on('input', function () { ARB[k] = +this.value; out.text('$' + ARB[k].toFixed(2)); renderArb(); renderChain(ARB); });
  });
  box.append('button').attr('class', 'btn').attr('type', 'button').text('Pre-crisis (Asian spot $9–11)').style('margin-right', '6px')
    .on('click', () => setArb({ hh: 3.5, ttf: 10.5, jkm: 10.5 }));
  box.append('button').attr('class', 'btn').attr('type', 'button').text('Oct 2026 snapshot')
    .on('click', () => setArb({ hh: 3.07, ttf: 24.09, jkm: 25.43 }));
}
function setArb(v) {
  Object.assign(ARB, v);
  d3.select('#arb-inputs').selectAll('label').each(function (d, i) {
    const k = ARB_KEYS[i];
    d3.select(this).select('input').property('value', ARB[k]);
    d3.select(this).select('output').text('$' + ARB[k].toFixed(2));
  });
  renderArb(); renderChain(ARB);
}
function renderArb() {
  const base = 1.15 * ARB.hh + ARB.fee;
  const opts = [
    { name: 'NW Europe (TTF)', price: ARB.ttf, segs: [['Gas 115%×HH', 1.15 * ARB.hh, C.leg], ['Liquefaction', ARB.fee, C.liq], ['Freight', ARB.fEu, C.choke], ['Regas', ARB.regas, C.regas]], days: '≈13 days' },
    { name: 'Japan via Panama (JKM)', price: ARB.jkm, segs: [['Gas 115%×HH', 1.15 * ARB.hh, C.leg], ['Liquefaction', ARB.fee, C.liq], ['Freight', ARB.fPan, C.choke], ['Canal', ARB.canal, C.s2], ['Regas', ARB.regas, C.regas]], days: '≈24 days' },
    { name: 'Japan via Cape (JKM)', price: ARB.jkm, segs: [['Gas 115%×HH', 1.15 * ARB.hh, C.leg], ['Liquefaction', ARB.fee, C.liq], ['Freight', ARB.fCape, C.choke], ['Regas', ARB.regas, C.regas]], days: '≈37 days' },
  ];
  opts.forEach((o) => { o.cost = d3.sum(o.segs, (s) => s[1]); o.margin = o.price - o.cost; });
  const best = opts.reduce((a, b) => (b.margin > a.margin ? b : a));
  const maxX = Math.max(d3.max(opts, (o) => Math.max(o.cost, o.price)) * 1.08, 8);
  const out = d3.select('#arb-out').html('');
  const key = out.append('div').attr('class', 'keyline');
  [['Gas 115%×HH', C.leg], ['Liquefaction', C.liq], ['Freight', C.choke], ['Canal', C.s2], ['Regas', C.regas]].forEach(([n, c]) => key.append('span').html(`<i style="background:${c}"></i>${n}`));
  key.append('span').html('<i style="background:var(--ink);width:2px"></i>destination price');
  opts.forEach((o) => {
    const r = out.append('div').attr('class', 'arb-row');
    r.append('div').attr('class', 'h').html(`<span><b>${o.name}</b> · ${o.days}</span><span>cost $${o.cost.toFixed(2)} · margin <b class="${o === best ? 'winner' : ''}">$${o.margin.toFixed(2)}</b> ($${(o.margin * 3.6).toFixed(0)}m/cargo)${o === best ? ' <span class="winner">✓ best</span>' : ''}</span>`);
    const t = r.append('div').attr('class', 'track');
    const s = t.append('div').attr('class', 'stack').style('width', (100 * o.cost / maxX) + '%');
    o.segs.forEach(([n, v, c]) => s.append('span').style('flex', `${v} 0 0`).style('background', c)
      .on('mousemove', (e) => showTip(e, `<b>${n}</b>: $${v.toFixed(2)}/MMBtu`)).on('mouseleave', hideTip));
    t.append('div').attr('class', 'price').style('left', (100 * o.price / maxX) + '%').attr('data-l', `$${o.price.toFixed(2)}`);
  });
  const spread = ARB.jkm - ARB.ttf;
  const panExtra = ARB.fPan + ARB.canal - ARB.fEu;
  d3.select('#arb-note').html(
    `<b>Reading it:</b> the JKM–TTF spread is <b>$${spread.toFixed(2)}</b>, and going to Japan via Panama instead of Europe costs <b>$${panExtra.toFixed(2)}</b> more. ` +
    (spread > panExtra ? 'The spread covers it, so <b>cargoes turn to Asia</b> and Panama slots get bid up. ' : 'The spread doesn\'t cover it, so <b>cargoes go to Europe</b>, the short voyage. ') +
    `The fixed cost of getting gas onto the ship ($${base.toFixed(2)}) is the same everywhere. With TTF and JKM near $24–25, the margin over a ~$7 delivered cost is the windfall US offtakers and portfolio traders capture while Qatar is out. Before the crisis Asian spot was $9–11 (GIIGNL) and margins were a few dollars.`);
}

// -------------------------------------------------------------- timeline etc
function renderTimeline() {
  d3.select('#timeline').selectAll('li').data(D.timeline).join('li')
    .attr('class', (d) => (/2027/.test(d.date) ? 'future' : /2026/.test(d.date) ? 'war' : ''))
    .html((d) => `<b>${d.date}</b>${d.text}`);
}
function renderGlossary() {
  const g = [
    ['Mtpa', 'Million tonnes per annum: the unit for plant capacity and trade flows.'],
    ['Train', 'One liquefaction production line. Plants add trains to expand.'],
    ['FLNG', 'Floating liquefaction vessel moored over or near a field (Prelude, Coral Sul, GTA, Nguya).'],
    ['FSRU', 'Floating storage and regasification unit: a ship-based import terminal.'],
    ['Regas', 'Regasification: warming LNG back to gas at the import terminal.'],
    ['Boil-off', 'LNG that evaporates in transit (~0.1–0.15% a day), usually burned as ship fuel.'],
    ['FOB / DES', 'Free on board (buyer ships it) vs. delivered ex-ship (seller ships it).'],
    ['Tolling fee', 'Fixed $/MMBtu paid to a US plant to liquefy gas, owed even if a cargo is cancelled.'],
    ['FID', 'Final investment decision: the point where a project is funded and construction starts.'],
    ['Henry Hub', 'US gas benchmark, Louisiana. Feed-gas price for US LNG.'],
    ['TTF', 'Dutch Title Transfer Facility: Europe\'s gas benchmark (quoted in €/MWh).'],
    ['JKM', 'Japan-Korea Marker: Platts\' North-Asian spot LNG price.'],
    ['Oil-indexed slope', 'Contract price = slope × Brent (+ constant), typical in long-term Asian deals.'],
    ['Force majeure', 'Contract clause excusing delivery for events outside the seller\'s control (Qatar, Mar 2026).'],
    ['Netback', 'Destination price minus freight and regas: what a cargo is worth at the loading port.'],
    ['Arc7', 'Highest ice class of LNG carrier, able to break ~2 m ice. Used for Yamal.'],
  ];
  const dl = d3.select('#gloss');
  g.forEach(([t, d]) => { dl.append('dt').text(t); dl.append('dd').text(d); });
}

// ------------------------------------------------------------------- boot
Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'),
  d3.json('data/lng.json'),
]).then(([world, data]) => {
  D = data;
  D.legs.forEach((l) => resolve(l.path)); // validate point names early
  setWorld(world);
  buildGraph();
  updateScenarioChrome();
  drawLegs();
  drawAssets();
  render();
  renderList();
  renderDetail();
  renderKpis();
  renderChain(ARB);
  renderCharts();
  renderSupplyWave();
  renderVoyageInputs();
  renderVoyage();
  d3.select('#voy-clear').on('click', () => { clearVoyage(); styleLegs(); render(); d3.selectAll('table.voy tr').classed('on', false); });
  renderArbInputs();
  renderArb();
  renderTimeline();
  renderGlossary();
  d3.select('#meta-row').text(`data as of ${D.lastUpdated} · ${D.legs.length} shipping legs · ${D.liquefaction.length} export plants · ${D.projects.length} projects under construction · ${D.regas.length} import terminals · ${D.events.length} 2026 events`);
  d3.select('#upd').text(D.lastUpdated);
  d3.select('#sources').selectAll('li').data(D.sources).join('li').text((d) => d);
  // detailed coastline for close zooms, loaded in the background
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json')
    .then((fine) => { setWorld(world, fine); render(); }).catch(() => {});
}).catch((err) => {
  d3.select('#meta-row').text('Could not load map/data. Serve the folder over HTTP (python -m http.server) rather than opening the file directly. ' + err.message);
  console.error(err);
});
