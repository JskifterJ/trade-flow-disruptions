/* Trade Flow Disruptions — rotatable, zoomable orthographic globe with two views:
   "Main flows" (data/flows.json: the pre-crisis map of how crude, LNG and
   products normally move) and "Disruptions now" (data/disruptions.json: what
   has broken). In the disruptions view each entry also carries a map layer:
   dated, located events (attacks, seizures, closures, caps…), shaded zones and
   sea/country name labels, shown when the disruption is selected. Both views
   are driven entirely by their data files, so a refresh only has to touch
   data/, never this script. */

const WIDTH = 640, HEIGHT = 640;
const BASE_SCALE = WIDTH / 2.25;
// SVG presentation attributes (fill/stroke set via .attr) don't resolve CSS
// custom properties as reliably as real CSS properties do, so every color
// used in an .attr() call below is a literal mirroring the :root token in
// index.html's <style> — keep the two in sync by hand if either changes.
const COLOR = {
  ocean: '#0e1a26',
  land: '#1c2a38',
  landEdge: '#2c3e50',
  graticule: '#1a2530',
  avoided: '#44525f',
  marker: '#e8edf2',
  chokepoint: '#f2d36b',
  bg: '#0b1016',
};
const SEV_HEX = {
  critical: '#e4574a',
  high: '#e8973a',
  moderate: '#d8c252',
  structural: '#7c8fe0',
};
const SIZE_WIDTH = { 1: 1.6, 2: 3, 3: 5 };

// Event types for the disruptions map layer: color + glyph + legend label.
const EVENT = {
  attack: { c: '#ff5a4a', label: 'attack on a ship' },
  strike: { c: '#ff8a3d', label: 'strike on infrastructure' },
  seizure: { c: '#e8973a', label: 'territory / port seized' },
  blockade: { c: '#e4574a', label: 'closure / blockade' },
  restriction: { c: '#d8c252', label: 'capacity limit' },
  policy: { c: '#9aa8f0', label: 'sanctions / rules' },
  response: { c: '#4fb3d9', label: 'escort / counter-move / easing' },
  info: { c: '#cfd8e3', label: 'key fact / flow change' },
};
const ZONE_STYLE = {
  closure: { fill: '#e4574a', op: 0.22, stroke: '#ff7b6e' },
  blockade: { fill: '#e4574a', op: 0.10, stroke: '#e4574a' },
  attack: { fill: 'url(#hatch-attack)', op: 1, stroke: '#ff5a4a' },
  restriction: { fill: '#d8c252', op: 0.18, stroke: '#d8c252' },
};

const svg = d3.select('#globe').attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
const projection = d3.geoOrthographic()
  .scale(BASE_SCALE)
  .translate([WIDTH / 2, HEIGHT / 2])
  .clipAngle(90)
  // drop geometry outside the viewport: at high zoom this keeps paths small
  .clipExtent([[-10, -10], [WIDTH + 10, HEIGHT + 10]])
  .rotate([-55, -12]); // center roughly on the Arabian Sea / Hormuz region
const path = d3.geoPath(projection);

const defs = svg.append('defs');
const hatch = defs.append('pattern').attr('id', 'hatch-attack').attr('patternUnits', 'userSpaceOnUse')
  .attr('width', 7).attr('height', 7).attr('patternTransform', 'rotate(45)');
hatch.append('rect').attr('width', 7).attr('height', 7).attr('fill', '#ff5a4a').attr('fill-opacity', 0.10);
hatch.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 7).attr('stroke', '#ff5a4a').attr('stroke-width', 2).attr('stroke-opacity', 0.45);

const gSphere = svg.append('g');
const gGraticule = svg.append('g');
const gLand = svg.append('g');
const gZones = svg.append('g');
const gAvoided = svg.append('g');
const gRoutes = svg.append('g');
const gPorts = svg.append('g');
const gChokepoints = svg.append('g');
const gEvents = svg.append('g');
const gLabels = svg.append('g');
const gMapText = svg.append('g').style('pointer-events', 'none'); // region, zone and event labels

const sphere = gSphere.append('circle')
  .attr('cx', WIDTH / 2).attr('cy', HEIGHT / 2).attr('r', projection.scale())
  .attr('fill', COLOR.ocean);

gGraticule.append('path')
  .datum(d3.geoGraticule10())
  .attr('fill', 'none')
  .attr('stroke', COLOR.graticule)
  .attr('stroke-width', 0.5);

const state = {
  mode: 'flows',              // 'flows' | 'disruptions'
  commodities: new Set(['crude', 'lng', 'products']),
  active: null,               // { kind: 'route' | 'chokepoint', id }
  focusEvent: null,           // index into the active disruption's events
  k: 1,                       // zoom factor
};
let FLOWS = null, DISRUPTIONS = null;

// ---------- tooltip ----------
// On a phone the 640-unit viewBox is drawn at ~360px; TS scales map label
// text (sizes and offsets) so it stays readable there. Set once at load.
let TS = 1;
function updateScreenScale() {
  const w = svg.node().getBoundingClientRect().width || WIDTH;
  TS = Math.max(1, Math.min(1.7, (WIDTH / w) * 0.85));
}

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

function isFront([lon, lat]) {
  const rot = projection.rotate();
  return d3.geoDistance([lon, lat], [-rot[0], -rot[1]]) < Math.PI / 2 - 0.01;
}

function arcLine(waypoints) {
  // Great-circle-interpolate between each consecutive waypoint pair so the
  // drawn line actually curves with the globe instead of cutting through it.
  const coords = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const interp = d3.geoInterpolate(
      [waypoints[i].lon, waypoints[i].lat], [waypoints[i + 1].lon, waypoints[i + 1].lat]);
    for (let s = 0; s <= 48; s++) {
      if (i > 0 && s === 0) continue; // avoid duplicate join point
      coords.push(interp(s / 48));
    }
  }
  return { type: 'LineString', coordinates: coords };
}

// Zone geometry: a polygon ring of [lon, lat] or a circle [lon, lat, radiusDeg].
// d3-geo treats rings by winding order, so flip any ring that came out as
// "the whole globe except this patch".
function zoneFeature(z) {
  let geom;
  if (z.circle) geom = d3.geoCircle().center([z.circle[0], z.circle[1]]).radius(z.circle[2])();
  else {
    const ring = [...z.polygon, z.polygon[0]];
    geom = { type: 'Polygon', coordinates: [ring] };
    if (d3.geoArea(geom) > 2 * Math.PI) geom = { type: 'Polygon', coordinates: [ring.slice().reverse()] };
  }
  return { type: 'Feature', geometry: geom, properties: z };
}

function eventGlyph(sel, type) {
  const c = EVENT[type].c;
  sel.selectAll('*').remove();
  sel.append('circle').attr('class', 'focus-ring').attr('r', 13).attr('fill', 'none')
    .attr('stroke', '#ffffff').attr('stroke-width', 1.5).style('display', 'none');
  sel.append('circle').attr('class', 'approx-ring').attr('r', 10.5).attr('fill', 'none')
    .attr('stroke', c).attr('stroke-width', 1).attr('stroke-dasharray', '2,2').style('display', 'none');
  if (type === 'attack' || type === 'strike') {
    const pts = d3.range(16).map((i) => {
      const r = i % 2 ? 3.2 : 8, a = (i * Math.PI) / 8;
      return [r * Math.sin(a), -r * Math.cos(a)];
    });
    sel.append('path').attr('d', 'M' + pts.join('L') + 'Z').attr('fill', c).attr('stroke', COLOR.bg).attr('stroke-width', 1);
    if (type === 'strike') sel.append('rect').attr('x', -2.2).attr('y', -2.2).attr('width', 4.4).attr('height', 4.4).attr('fill', COLOR.bg);
  } else if (type === 'seizure') {
    sel.append('line').attr('x1', -4).attr('y1', 7).attr('x2', -4).attr('y2', -7).attr('stroke', c).attr('stroke-width', 1.8);
    sel.append('path').attr('d', 'M-4,-7 L6,-4 L-4,-1 Z').attr('fill', c);
  } else if (type === 'blockade') {
    sel.append('circle').attr('r', 6.5).attr('fill', c).attr('stroke', COLOR.bg).attr('stroke-width', 1);
    sel.append('rect').attr('x', -4).attr('y', -1.3).attr('width', 8).attr('height', 2.6).attr('fill', '#fff');
  } else if (type === 'restriction') {
    sel.append('path').attr('d', 'M-6,-5 L6,-5 L0,6 Z').attr('fill', c).attr('stroke', COLOR.bg).attr('stroke-width', 1);
  } else if (type === 'policy') {
    sel.append('rect').attr('x', -5.5).attr('y', -5.5).attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', c);
    sel.append('text').attr('text-anchor', 'middle').attr('y', 3.6).attr('font-size', 9.5).attr('font-weight', 700).attr('fill', COLOR.bg).text('§');
  } else if (type === 'response') {
    sel.append('path').attr('d', 'M0,-7 L6,-3 L6,2 Q6,6 0,8 Q-6,6 -6,2 L-6,-3 Z').attr('fill', c).attr('stroke', COLOR.bg).attr('stroke-width', 1);
  } else {
    sel.append('circle').attr('r', 5.8).attr('fill', COLOR.bg).attr('stroke', c).attr('stroke-width', 1.6);
    sel.append('text').attr('text-anchor', 'middle').attr('y', 3.4).attr('font-size', 8.5).attr('font-weight', 700).attr('fill', c).text('i');
  }
  // generous invisible hit target
  sel.append('circle').attr('r', 11).attr('fill', 'transparent');
}

// ---------- rendering (called every frame while dragging / zooming) ----------

// Coarse coastline when zoomed out (cheap to redraw while dragging), the
// detailed one once zoomed in far enough for it to matter.
let LAND = { coarse: null, fine: null };
function render() {
  const s = projection.scale();
  sphere.attr('r', s);
  const land = state.k >= 2.5 && LAND.fine ? LAND.fine : LAND.coarse;
  gLand.selectAll('path').datum(land).attr('d', path);
  gGraticule.selectAll('path').attr('d', path);
  gZones.selectAll('path').attr('d', path);
  gAvoided.selectAll('path').attr('d', path);
  gRoutes.selectAll('path').attr('d', path);
  const place = function (d) {
    const p = projection([d.lon, d.lat]);
    const front = isFront([d.lon, d.lat]);
    d3.select(this).attr('transform', p ? `translate(${p[0]},${p[1]})` : 'translate(-100,-100)')
      .style('display', front ? null : 'none');
  };
  gPorts.selectAll('g').each(place);
  gChokepoints.selectAll('g').each(place);
  gLabels.selectAll('g').each(place);
  gEvents.selectAll('g.ev').each(place);
  placeMapText();
}

// Greedy label placement: highest-priority labels first, each tries its
// preferred side then the other; a label that would overlap one already
// placed (or leave the globe) is hidden. Widths are measured once and cached.
function placeMapText() {
  const placed = [];
  const overlaps = (b) => placed.some((p) => b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y);
  const nodes = gMapText.selectAll('text').nodes()
    .filter((n) => n.__d.show)
    .sort((a, b) => b.__d.priority - a.__d.priority);
  // measure before hiding: hidden text has no computed length
  nodes.forEach((n) => { if (!n.__w) { n.style.display = null; n.__w = n.getComputedTextLength(); } });
  gMapText.selectAll('text').style('display', 'none');
  // marker footprints block labels too
  gEvents.selectAll('g.ev').each(function (d) {
    if (this.style.display === 'none' || !d.on) return;
    const p = projection([d.lon, d.lat]);
    if (p) placed.push({ x: p[0] - 7, y: p[1] - 7, w: 14, h: 14 });
  });
  nodes.forEach((n) => {
    const d = n.__d;
    if (!isFront([d.lon, d.lat])) return;
    const p = projection([d.lon, d.lat]);
    if (!p) return;
    const w = n.__w, h = d.size + 3;
    // events can also sit above or below their marker if both sides are taken
    const sides = d.anchor === 'middle' ? ['middle', 'up', 'down']
      : d.anchor === 'end' ? ['end', 'start', 'above', 'below'] : ['start', 'end', 'above', 'below'];
    for (const pos of sides) {
      const side = pos === 'start' || pos === 'end' ? pos : 'middle';
      const dy = { above: -11, below: 19 * TS, up: d.dy - 13 * TS, down: d.dy + 13 * TS }[pos] ?? d.dy;
      const x = side === 'start' ? p[0] + d.dx : side === 'end' ? p[0] - d.dx - w : p[0] - w / 2;
      const y = p[1] + dy - h + 3;
      const box = { x: x - 2, y: y - 1, w: w + 4, h: h + 2 };
      if (box.x < 2 || box.x + box.w > WIDTH - 2 || box.y < 2 || box.y + box.h > HEIGHT - 2) continue;
      if (!d.force && overlaps(box)) continue;
      placed.push(box);
      d3.select(n).style('display', null)
        .attr('text-anchor', side)
        .attr('x', side === 'start' ? p[0] + d.dx : side === 'end' ? p[0] - d.dx : p[0])
        .attr('y', p[1] + dy);
      break;
    }
  });
}

// ---------- data shaping per mode ----------

function currentRoutes() {
  if (state.mode === 'flows') {
    return FLOWS.routes
      .filter((r) => state.commodities.has(r.commodity))
      .map((r) => ({ ...r, color: FLOWS.commodities[r.commodity].color, width: SIZE_WIDTH[r.size] || 2 }));
  }
  return DISRUPTIONS.routes.map((r) => ({ ...r, color: SEV_HEX[r.severity] || '#999', width: 2.2 }));
}

function currentChokepoints() {
  return state.mode === 'flows' ? FLOWS.chokepoints : [];
}

function activeDisruption() {
  if (state.mode !== 'disruptions' || !state.active || state.active.kind !== 'route') return null;
  return DISRUPTIONS.routes.find((r) => r.id === state.active.id);
}

// ---------- drawing ----------

function drawLand(coarseTopo, fineTopo) {
  LAND = {
    coarse: topojson.feature(coarseTopo, coarseTopo.objects.land),
    fine: fineTopo ? topojson.feature(fineTopo, fineTopo.objects.land) : null,
  };
  gLand.selectAll('path').data([LAND.coarse]).join('path')
    .attr('fill', COLOR.land)
    .attr('stroke', COLOR.landEdge)
    .attr('stroke-width', 0.6);
}

function drawRoutes() {
  const routes = currentRoutes();
  gAvoided.selectAll('path').remove();
  gRoutes.selectAll('path').remove();

  routes.forEach((r) => {
    if (r.avoidedWaypoints) {
      gAvoided.append('path').datum(arcLine(r.avoidedWaypoints))
        .attr('class', `alt route-${r.id}`)
        .attr('fill', 'none').attr('stroke', COLOR.avoided)
        .attr('stroke-width', 1.2).attr('stroke-dasharray', '3,3');
    }
    [r.waypoints, r.secondaryWaypoints].filter(Boolean).forEach((wps, i) => {
      gRoutes.append('path').datum(arcLine(wps))
        .attr('class', `route route-${r.id}`)
        .attr('fill', 'none')
        .attr('stroke', r.color)
        .attr('stroke-width', i === 0 ? r.width : Math.max(1.2, r.width * 0.6))
        .attr('stroke-linecap', 'round')
        .style('cursor', 'pointer')
        .on('click', () => select({ kind: 'route', id: r.id }))
        .append('title').text(r.title);
    });
  });

  // endpoint ports (first and last waypoint of each path), de-duplicated
  const ports = new Map();
  routes.forEach((r) => [r.waypoints, r.secondaryWaypoints].filter(Boolean).forEach((wps) => {
    [wps[0], wps[wps.length - 1]].forEach((w) => ports.set(`${w.lat},${w.lon}`, w));
  }));
  gPorts.selectAll('g').data([...ports.values()], (d) => `${d.lat},${d.lon}`).join(
    (enter) => {
      const g = enter.append('g');
      g.append('circle').attr('r', 2.6).attr('fill', COLOR.marker)
        .attr('stroke', '#0b1016').attr('stroke-width', 0.8);
      g.append('title').text((d) => d.name);
      return g;
    });

  const cps = currentChokepoints();
  gChokepoints.selectAll('g').data(cps, (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'chokepoint').style('cursor', 'pointer')
        .on('click', (event, d) => select({ kind: 'chokepoint', id: d.id }));
      g.append('rect').attr('x', -5).attr('y', -5).attr('width', 10).attr('height', 10)
        .attr('transform', 'rotate(45)')
        .attr('fill', COLOR.ocean).attr('stroke', COLOR.chokepoint).attr('stroke-width', 1.8);
      g.append('title').text((d) => `${d.name}: click for details`);
      return g;
    });
  gLabels.selectAll('g').data(cps, (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').style('pointer-events', 'none');
      g.append('text').attr('x', 8).attr('y', 4)
        .attr('fill', COLOR.chokepoint).attr('font-size', 10.5 * TS)
        .attr('paint-order', 'stroke').attr('stroke', COLOR.ocean).attr('stroke-width', 3 * TS)
        .text((d) => d.name.replace(' + SUMED pipeline', '').replace(' (Bosphorus)', ''));
      return g;
    });

  drawDisruptionLayer();
  applyHighlight();
  render();
}

// Events, zones and name labels for the disruptions view.
function drawDisruptionLayer() {
  const on = state.mode === 'disruptions';
  const routes = on ? DISRUPTIONS.routes : [];
  const zones = routes.flatMap((r) => (r.zones || []).map((z) => ({ ...zoneFeature(z), route: r.id })));
  gZones.selectAll('path').data(zones, (d) => d.route + d.properties.name).join('path')
    .attr('fill', (d) => ZONE_STYLE[d.properties.kind].fill)
    .attr('fill-opacity', (d) => ZONE_STYLE[d.properties.kind].op)
    .attr('stroke', (d) => ZONE_STYLE[d.properties.kind].stroke)
    .attr('stroke-width', 1).attr('stroke-dasharray', '4,3')
    .on('mousemove', (e, d) => showTip(e, `<b>${d.properties.name}</b>`))
    .on('mouseleave', hideTip);

  const events = routes.flatMap((r) => (r.events || [])
    .map((e, i) => ({ ...e, route: r.id, idx: i, key: `${r.id}-${i}` }))
    .filter((e) => e.lat != null));
  gEvents.selectAll('g.ev').data(events, (d) => d.key).join((enter) => enter.append('g').attr('class', 'ev')
    .style('cursor', 'pointer')
    .each(function (d) { eventGlyph(d3.select(this), d.type); })
    .on('mousemove', (e, d) => showTip(e, eventTip(d)))
    .on('mouseleave', hideTip)
    .on('click', (e, d) => {
      e.stopPropagation();
      if (!state.active || state.active.id !== d.route) select({ kind: 'route', id: d.route }, { noFly: true });
      focusEvent(d.idx);
    }));

  // text layer: region names, zone names, event labels
  const texts = [];
  routes.forEach((r) => {
    (r.regions || []).forEach((g) => texts.push({ kind: 'region', route: r.id, key: `rg-${r.id}-${g.name}`, ...g }));
    (r.zones || []).forEach((z) => {
      const c = d3.geoCentroid(zoneFeature(z));
      const at = z.labelAt ? [z.labelAt[0], z.labelAt[1]] : c;
      texts.push({ kind: 'zone', route: r.id, key: `zn-${r.id}-${z.name}`, name: z.label || z.name, lon: at[0], lat: at[1], zkind: z.kind });
    });
    (r.events || []).forEach((e, i) => {
      if (e.lat == null) return;
      texts.push({ kind: 'event', route: r.id, idx: i, key: `ev-${r.id}-${i}`, name: `${e.date} · ${e.title}`, lat: e.lat, lon: e.lon, type: e.type, side: e.labelSide });
    });
  });
  gMapText.selectAll('text').data(texts, (d) => d.key).join('text')
    .attr('paint-order', 'stroke').attr('stroke', COLOR.bg).attr('stroke-linejoin', 'round')
    .each(function (d) {
      const t = d3.select(this);
      if (d.kind === 'region') {
        t.text(d.name).attr('font-size', d.small ? 9.5 : 11).attr('letter-spacing', d.small ? '0.06em' : '0.16em')
          .attr('font-style', d.land ? 'normal' : 'italic').attr('font-weight', d.land ? 600 : 500)
          .attr('fill', d.land ? '#7f8fa0' : '#8fc1f0').attr('stroke-width', 3);
      } else if (d.kind === 'zone') {
        t.text(d.name).attr('font-size', 9.5).attr('font-style', 'italic')
          .attr('fill', ZONE_STYLE[d.zkind].stroke).attr('stroke-width', 3);
      } else {
        t.text(d.name).attr('font-size', 10.5).attr('font-weight', 600).attr('fill', '#e8edf2').attr('stroke-width', 3.2);
      }
      t.attr('font-size', +t.attr('font-size') * TS).attr('stroke-width', +t.attr('stroke-width') * TS);
    });
}

function eventTip(d) {
  const t = EVENT[d.type];
  return `<span style="color:${t.c}">${t.label.toUpperCase()}</span><br><b>${d.date} · ${d.title}</b><br>${d.text}` +
    (d.approx ? '<br><i>Approximate location (exact position not published).</i>' : '') +
    (d.source ? `<br><span class="src">${d.source}</span>` : '');
}

function routeIdsFor(active) {
  if (!active) return null;
  if (active.kind === 'route') return new Set([active.id]);
  return new Set(FLOWS.routes.filter((r) => (r.via || []).includes(active.id)).map((r) => r.id));
}

function applyHighlight() {
  const ids = routeIdsFor(state.active);
  const on = (el) => !ids || [...ids].some((id) => el.classList.contains(`route-${id}`));
  gRoutes.selectAll('path').attr('opacity', (d, i, n) => (on(n[i]) ? (ids ? 1 : 0.7) : 0.12));
  gAvoided.selectAll('path').attr('opacity', (d, i, n) => (on(n[i]) ? 0.85 : 0.1));
  gChokepoints.selectAll('rect').attr('fill', (d) =>
    state.active && state.active.kind === 'chokepoint' && state.active.id === d.id ? COLOR.chokepoint : COLOR.ocean);

  // disruption layer: the selected disruption's events/zones/names at full
  // strength, everything else faded; with nothing selected, all markers and
  // the main sea names show quietly so the map still reads at a glance.
  const act = activeDisruption();
  gZones.selectAll('path').attr('opacity', (d) => (!act ? 0.55 : d.route === act.id ? 1 : 0.08));
  gEvents.selectAll('g.ev')
    .each(function (d) { d.on = !act || d.route === act.id; })
    .attr('opacity', (d) => (!act ? 0.75 : d.route === act.id ? 1 : 0.1))
    .style('pointer-events', (d) => (!act || d.route === act.id ? null : 'none'));
  gEvents.selectAll('g.ev').each(function (d) {
    const g = d3.select(this);
    g.select('.approx-ring').style('display', d.approx && act && d.route === act.id ? null : 'none');
    g.select('.focus-ring').style('display', act && d.route === act.id && state.focusEvent === d.idx ? null : 'none');
  });
  const seen = new Set();
  gMapText.selectAll('text').each(function (d) {
    const mine = act && d.route === act.id;
    let show = false, priority = 0;
    if (d.kind === 'event') { show = !!mine; priority = state.focusEvent === d.idx && mine ? 100 : 50; }
    else if (d.kind === 'zone') { show = !!mine; priority = 15; }
    else if (mine) { show = true; priority = d.land ? 25 : 40; }
    else if (!act && !d.small && !d.land && !seen.has(d.name)) { show = true; priority = 5; seen.add(d.name); }
    this.__d = {
      ...d, show, priority, force: priority === 100,
      size: (d.kind === 'region' ? (d.small ? 9.5 : 11) : d.kind === 'zone' ? 9.5 : 10.5) * TS,
      dx: d.kind === 'event' ? 11 : 0, dy: 4 * TS,
      anchor: d.kind === 'event' ? (d.side === 'left' ? 'end' : 'start') : 'middle',
    };
    d3.select(this).attr('opacity', d.kind === 'region' && !act ? 0.55 : 1);
  });
}

// ---------- side panel ----------

function renderList() {
  const list = d3.select('#route-list').html('');
  const routes = currentRoutes();
  if (state.mode === 'flows') {
    Object.entries(FLOWS.commodities).forEach(([key, c]) => {
      const group = routes.filter((r) => r.commodity === key);
      if (!group.length) return;
      list.append('div').attr('class', 'group-label').text(c.label);
      group.forEach((r) => card(list, r, r.volume));
    });
  } else {
    routes.forEach((r) => {
      const n = (r.events || []).filter((e) => e.lat != null).length;
      card(list, r, r.dateRange + (n ? ` · ${n} events on map` : ''));
    });
  }
}

function card(list, r, sub) {
  const el = list.append('div').attr('class', 'route-card')
    .classed('active', state.active && state.active.kind === 'route' && state.active.id === r.id)
    .on('click', () => select({ kind: 'route', id: r.id }));
  const row = el.append('div').attr('class', 'title-row');
  row.append('span').attr('class', 'sev-dot').style('background', r.color);
  row.append('h3').text(r.title);
  el.append('div').attr('class', 'date-range').text(sub);
}

function renderDetail() {
  const detail = d3.select('#detail').html('');
  const a = state.active;
  if (!a) {
    detail.append('span').attr('class', 'placeholder').text(state.mode === 'flows'
      ? 'Click a route, or a yellow chokepoint diamond on the globe, to see what moves there and why it matters.'
      : 'Select a disruption to zoom to it: the map then shows where the attacks, seizures, closures and limits happened, the affected zone, and the seas involved. Click any event to fly to it.');
    return;
  }
  if (a.kind === 'chokepoint') {
    const c = FLOWS.chokepoints.find((x) => x.id === a.id);
    detail.append('h4').text(c.name);
    detail.append('div').attr('class', 'figure').text(c.flow);
    detail.append('div').text(c.why);
    const through = FLOWS.routes.filter((r) => (r.via || []).includes(c.id));
    if (through.length) {
      detail.append('div').attr('class', 'through').text('Main flows through here: ' + through.map((r) => r.title).join(' · '));
    }
    detail.append('span').attr('class', 'source').text(`Source: ${c.source}`);
    return;
  }
  const pool = state.mode === 'flows' ? FLOWS.routes : DISRUPTIONS.routes;
  const r = pool.find((x) => x.id === a.id);
  detail.append('h4').text(r.title);
  if (r.volume) detail.append('div').attr('class', 'figure').text(r.volume);
  if (r.events && r.events.length) {
    detail.append('div').attr('class', 'ev-head').text('What happened, where (click to fly there)');
    const ul = detail.append('ul').attr('class', 'ev-list');
    r.events.forEach((e, i) => {
      const t = EVENT[e.type];
      const li = ul.append('li').classed('on', state.focusEvent === i).classed('nomap', e.lat == null);
      const ico = li.append('svg').attr('width', 18).attr('height', 18).attr('viewBox', '-9 -9 18 18').attr('class', 'ev-ico');
      eventGlyph(ico.append('g'), e.type);
      const body = li.append('div');
      body.append('div').html(`<span class="ev-date">${e.date}</span> <b>${e.title}</b>` +
        (e.approx ? ' <span class="ev-tag">approx. location</span>' : '') + (e.lat == null ? ' <span class="ev-tag">not mapped</span>' : ''));
      body.append('div').attr('class', 'ev-text').text(e.text);
      body.append('div').attr('class', 'ev-src').style('color', t.c).text(t.label + (e.source ? ' · ' + e.source : ''));
      if (e.lat != null) li.on('click', () => focusEvent(i));
    });
  }
  detail.append('div').attr('class', 'story').text(r.why || r.summary);
  detail.append('span').attr('class', 'source').text(`Source: ${r.source}`);
}

// ---------- interaction ----------

function select(target, opts = {}) {
  const same = state.active && state.active.kind === target.kind && state.active.id === target.id;
  state.active = same ? null : target;
  state.focusEvent = null;
  applyHighlight();
  renderList();
  renderDetail();
  render();
  if (!state.active || opts.noFly) return;
  // spin (and, for disruptions, zoom) the globe so the selection faces the viewer
  let focus, k = state.k;
  if (target.kind === 'chokepoint') {
    const c = FLOWS.chokepoints.find((x) => x.id === target.id);
    focus = [c.lon, c.lat];
  } else {
    const r = currentRoutes().find((x) => x.id === target.id);
    if (r.focus) { focus = [r.focus.lon, r.focus.lat]; k = r.focus.zoom; }
    else focus = d3.geoCentroid(arcLine(r.waypoints));
  }
  rotateTo(focus, k);
}

function focusEvent(i) {
  const r = activeDisruption();
  if (!r) return;
  state.focusEvent = state.focusEvent === i ? null : i;
  applyHighlight();
  renderDetail();
  render();
  if (state.focusEvent == null) return;
  const e = r.events[i];
  rotateTo([e.lon, e.lat], Math.max(state.k, (r.focus ? r.focus.zoom : 2) * 1.5));
  // scroll only the event list, not the page
  const li = document.querySelector('#detail .ev-list li.on');
  if (li) {
    const ul = li.parentNode;
    if (li.offsetTop < ul.scrollTop || li.offsetTop + li.offsetHeight > ul.scrollTop + ul.clientHeight) ul.scrollTop = li.offsetTop - 8;
  }
}

function rotateTo([lon, lat], k = state.k) {
  const from = projection.rotate();
  const to = [-lon, Math.max(-70, Math.min(70, -lat))];
  // take the short way round in longitude
  let dLon = to[0] - from[0];
  dLon = ((dLon + 540) % 360) - 180;
  const interp = d3.interpolate([from[0], from[1]], [from[0] + dLon, to[1]]);
  const k0 = state.k;
  // zoom geometrically so big zoom changes don't feel like a lurch at the end
  const kInterp = (t) => k0 * Math.pow(k / k0, t);
  d3.transition().duration(1100).ease(d3.easeCubicInOut).tween('rotate', () => (t) => {
    projection.rotate(interp(t));
    setZoom(kInterp(t), false);
    render();
  }).on('end', () => svg.call(zoomer.transform, d3.zoomIdentity.scale(state.k)));
}

function setZoom(k, rerender = true) {
  state.k = Math.max(0.9, Math.min(40, k));
  projection.scale(BASE_SCALE * state.k);
  if (rerender) render();
}

function setMode(mode) {
  state.mode = mode;
  state.active = null;
  state.focusEvent = null;
  d3.selectAll('.tab').classed('active', function () { return this.dataset.mode === mode; });
  d3.select('#chips').style('display', mode === 'flows' ? null : 'none');
  d3.select('#legend-flows').style('display', mode === 'flows' ? null : 'none');
  d3.select('#legend-disruptions').style('display', mode === 'flows' ? 'none' : null);
  d3.select('#mode-note').text(mode === 'flows' ? FLOWS.baselineNote : DISRUPTIONS.focus);
  drawRoutes();
  renderList();
  renderDetail();
}

function buildChrome() {
  d3.selectAll('.tab').on('click', function () { setMode(this.dataset.mode); });
  const chips = d3.select('#chips');
  Object.entries(FLOWS.commodities).forEach(([key, c]) => {
    chips.append('button').attr('class', 'chip on').attr('type', 'button')
      .html(`<i style="background:${c.color}"></i>${c.label}`)
      .on('click', function () {
        state.commodities.has(key) ? state.commodities.delete(key) : state.commodities.add(key);
        d3.select(this).classed('on', state.commodities.has(key));
        if (state.active && state.active.kind === 'route' && !currentRoutes().some((r) => r.id === state.active.id)) state.active = null;
        drawRoutes(); renderList(); renderDetail();
      });
  });
  const gl = d3.select('#glossary');
  FLOWS.glossary.forEach(([term, def]) => {
    gl.append('dt').text(term);
    gl.append('dd').text(def);
  });
  // event-type legend for the disruptions view
  const leg = d3.select('#legend-events');
  Object.entries(EVENT).forEach(([type, t]) => {
    const s = leg.append('span');
    eventGlyph(s.append('svg').attr('width', 16).attr('height', 16).attr('viewBox', '-9 -9 18 18').append('g'), type);
    s.append('span').text(t.label);
  });
  [['attack', 'attack zone'], ['closure', 'closed / blockaded waters']].forEach(([k, label]) => {
    const z = ZONE_STYLE[k];
    leg.append('span').html(`<svg width="16" height="12"><rect x="1" y="1" width="14" height="10" fill="${k === 'attack' ? 'url(#hatch-attack)' : z.fill}" fill-opacity="${k === 'attack' ? 1 : 0.35}" stroke="${z.stroke}" stroke-dasharray="3,2"/></svg>${label}`);
  });
  d3.select('#zin').on('click', () => svg.transition().duration(350).call(zoomer.scaleBy, 1.6));
  d3.select('#zout').on('click', () => svg.transition().duration(350).call(zoomer.scaleBy, 1 / 1.6));
  d3.select('#zreset').on('click', () => {
    state.active = null; state.focusEvent = null;
    applyHighlight(); renderList(); renderDetail();
    rotateTo([55, 12], 1);
  });
}

// wheel / pinch zoom (rotation is handled by the drag below)
const zoomer = d3.zoom().scaleExtent([0.9, 40])
  .filter((e) => e.type === 'wheel' || (e.type === 'touchstart' && e.touches && e.touches.length > 1))
  .on('zoom', (e) => setZoom(e.transform.k));
svg.call(zoomer).on('dblclick.zoom', null);

let dragStart = null;
svg.call(d3.drag()
  .filter((event) => !event.button && (!event.touches || event.touches.length === 1))
  .clickDistance(5)
  .on('start', (event) => { dragStart = { rotate: projection.rotate(), x: event.x, y: event.y }; })
  .on('drag', (event) => {
    if (!dragStart) return;
    const scale = 0.35 / state.k;
    const r = dragStart.rotate;
    projection.rotate([r[0] + (event.x - dragStart.x) * scale,
      Math.max(-90, Math.min(90, r[1] - (event.y - dragStart.y) * scale))]);
    hideTip();
    render();
  })
  .on('end', () => { dragStart = null; }));

Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json'),
  d3.json('data/flows.json'),
  d3.json('data/disruptions.json'),
]).then(([landTopo, flows, disruptions]) => {
  FLOWS = flows;
  DISRUPTIONS = disruptions;
  updateScreenScale();
  drawLand(landTopo);
  // detailed coastline for close zooms, loaded in the background
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json')
    .then((fine) => { drawLand(landTopo, fine); render(); })
    .catch(() => {});
  buildChrome();
  d3.select('#meta-row').text(
    `data current as of ${disruptions.lastUpdated} · disruptions refreshed ${disruptions.updateCadence}`);
  setMode('flows');
}).catch((err) => {
  d3.select('#meta-row').text('Could not load map/data — check the console (likely a local file:// CORS issue; serve via a local HTTP server).');
  console.error(err);
});
