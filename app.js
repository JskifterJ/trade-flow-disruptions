/* Trade Flow Disruptions — rotatable orthographic globe with two views:
   "Main flows" (data/flows.json: the pre-crisis map of how crude, LNG and
   products normally move) and "Disruptions now" (data/disruptions.json: what
   has broken). Both views are driven entirely by their data files, so a
   refresh only has to touch data/, never this script. */

const WIDTH = 640, HEIGHT = 640;
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
};
const SEV_HEX = {
  critical: '#e4574a',
  high: '#e8973a',
  moderate: '#d8c252',
  structural: '#7c8fe0',
};
const SIZE_WIDTH = { 1: 1.6, 2: 3, 3: 5 };

const svg = d3.select('#globe').attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
const projection = d3.geoOrthographic()
  .scale(WIDTH / 2.25)
  .translate([WIDTH / 2, HEIGHT / 2])
  .clipAngle(90)
  .rotate([-55, -12]); // center roughly on the Arabian Sea / Hormuz region
const path = d3.geoPath(projection);

const gSphere = svg.append('g');
const gGraticule = svg.append('g');
const gLand = svg.append('g');
const gAvoided = svg.append('g');
const gRoutes = svg.append('g');
const gPorts = svg.append('g');
const gChokepoints = svg.append('g');
const gLabels = svg.append('g');

gSphere.append('circle')
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
};
let FLOWS = null, DISRUPTIONS = null;

function isFront([lon, lat]) {
  const rot = projection.rotate();
  return d3.geoDistance([lon, lat], [-rot[0], -rot[1]]) < Math.PI / 2;
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

function render() {
  gLand.selectAll('path').attr('d', path);
  gGraticule.selectAll('path').attr('d', path);
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

// ---------- drawing ----------

function drawLand(landTopo) {
  const land = topojson.feature(landTopo, landTopo.objects.land);
  gLand.selectAll('path').data([land]).join('path')
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
        .attr('fill', COLOR.chokepoint).attr('font-size', 10.5)
        .attr('paint-order', 'stroke').attr('stroke', COLOR.ocean).attr('stroke-width', 3)
        .text((d) => d.name.replace(' + SUMED pipeline', '').replace(' (Bosphorus)', ''));
      return g;
    });

  applyHighlight();
  render();
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
    routes.forEach((r) => card(list, r, r.dateRange));
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
      : 'Select a disruption to read the full story and sources.');
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
  detail.append('div').text(r.why || r.summary);
  detail.append('span').attr('class', 'source').text(`Source: ${r.source}`);
}

// ---------- interaction ----------

function select(target) {
  const same = state.active && state.active.kind === target.kind && state.active.id === target.id;
  state.active = same ? null : target;
  applyHighlight();
  renderList();
  renderDetail();
  if (!state.active) return;
  // spin the globe so the selection faces the viewer
  let focus;
  if (target.kind === 'chokepoint') {
    const c = FLOWS.chokepoints.find((x) => x.id === target.id);
    focus = [c.lon, c.lat];
  } else {
    const r = currentRoutes().find((x) => x.id === target.id);
    focus = d3.geoCentroid(arcLine(r.waypoints));
  }
  rotateTo(focus);
}

function rotateTo([lon, lat]) {
  const from = projection.rotate();
  const to = [-lon, Math.max(-60, Math.min(60, -lat))];
  // take the short way round in longitude
  let dLon = to[0] - from[0];
  dLon = ((dLon + 540) % 360) - 180;
  const interp = d3.interpolate([from[0], from[1]], [from[0] + dLon, to[1]]);
  d3.transition().duration(900).tween('rotate', () => (t) => {
    projection.rotate(interp(t));
    render();
  });
}

function setMode(mode) {
  state.mode = mode;
  state.active = null;
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
}

let dragStart = null;
svg.call(d3.drag()
  .filter((event) => !event.target.closest('.chokepoint'))
  .on('start', (event) => { dragStart = { rotate: projection.rotate(), x: event.x, y: event.y }; })
  .on('drag', (event) => {
    if (!dragStart) return;
    const scale = 0.35;
    const r = dragStart.rotate;
    projection.rotate([r[0] + (event.x - dragStart.x) * scale,
      Math.max(-90, Math.min(90, r[1] - (event.y - dragStart.y) * scale))]);
    render();
  })
  .on('end', () => { dragStart = null; }));

Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json'),
  d3.json('data/flows.json'),
  d3.json('data/disruptions.json'),
]).then(([landTopo, flows, disruptions]) => {
  FLOWS = flows;
  DISRUPTIONS = disruptions;
  drawLand(landTopo);
  buildChrome();
  d3.select('#meta-row').text(
    `data current as of ${disruptions.lastUpdated} · disruptions refreshed ${disruptions.updateCadence}`);
  setMode('flows');
}).catch((err) => {
  d3.select('#meta-row').text('Could not load map/data — check the console (likely a local file:// CORS issue; serve via a local HTTP server).');
  console.error(err);
});
