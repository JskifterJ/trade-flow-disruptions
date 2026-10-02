/* Trade Flow Disruptions — rotatable orthographic globe over real chemicals/
   plastics trade routes, driven entirely by data/disruptions.json so a
   weekly scheduled refresh only has to touch the data file, never this
   script. */

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
};
const SEV_HEX = {
  critical: '#e4574a',
  high: '#e8973a',
  moderate: '#d8c252',
  structural: '#7c8fe0',
};

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
const gChokepoints = svg.append('g');

gSphere.append('circle')
  .attr('cx', WIDTH / 2).attr('cy', HEIGHT / 2).attr('r', projection.scale())
  .attr('fill', COLOR.ocean);

const graticule = d3.geoGraticule10();
gGraticule.append('path')
  .datum(graticule)
  .attr('fill', 'none')
  .attr('stroke', COLOR.graticule)
  .attr('stroke-width', 0.5);

let worldLand = null;
let routeData = [];

function isFront([lon, lat]) {
  const rot = projection.rotate();
  const center = [-rot[0], -rot[1]];
  return d3.geoDistance([lon, lat], center) < Math.PI / 2;
}

function arcLine(waypoints) {
  // Great-circle-interpolate between each consecutive waypoint pair so the
  // drawn line actually curves with the globe instead of cutting straight
  // through it.
  const coords = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = [waypoints[i].lon, waypoints[i].lat];
    const b = [waypoints[i + 1].lon, waypoints[i + 1].lat];
    const interp = d3.geoInterpolate(a, b);
    const steps = 48;
    for (let s = 0; s <= steps; s++) {
      if (i > 0 && s === 0) continue; // avoid duplicate join point
      coords.push(interp(s / steps));
    }
  }
  return { type: 'LineString', coordinates: coords };
}

function render() {
  gLand.selectAll('path').attr('d', path);
  gGraticule.selectAll('path').attr('d', path);
  gAvoided.selectAll('path').attr('d', path);
  gRoutes.selectAll('path').attr('d', path);
  gChokepoints.selectAll('circle').each(function (d) {
    const p = projection([d.lon, d.lat]);
    const front = isFront([d.lon, d.lat]);
    d3.select(this)
      .attr('cx', p ? p[0] : -100)
      .attr('cy', p ? p[1] : -100)
      .attr('opacity', front ? 0.9 : 0);
  });
}

function drawLand(landTopo) {
  const land = topojson.feature(landTopo, landTopo.objects.land);
  gLand.selectAll('path').data([land]).join('path')
    .attr('fill', COLOR.land)
    .attr('stroke', COLOR.landEdge)
    .attr('stroke-width', 0.6);
  render();
}

function drawRoutes(routes) {
  gAvoided.selectAll('path').remove();
  gRoutes.selectAll('path').remove();
  gChokepoints.selectAll('circle').remove();

  routes.forEach((r) => {
    const altWaypoints = r.avoidedWaypoints || r.secondaryWaypoints;
    if (altWaypoints) {
      gAvoided.append('path')
        .datum(arcLine(altWaypoints))
        .attr('class', `avoided route-${r.id}`)
        .attr('fill', 'none')
        .attr('stroke', COLOR.avoided)
        .attr('stroke-width', 1.1)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.7);
    }
    gRoutes.append('path')
      .datum(arcLine(r.waypoints))
      .attr('class', `route route-${r.id}`)
      .attr('fill', 'none')
      .attr('stroke', SEV_HEX[r.severity] || '#999')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.55);
  });

  // chokepoint markers, de-duplicated by coordinate
  const seen = new Map();
  routes.forEach((r) => {
    [...r.waypoints, ...(r.avoidedWaypoints || []), ...(r.secondaryWaypoints || [])]
      .forEach((w) => {
        const key = `${w.lat.toFixed(2)},${w.lon.toFixed(2)}`;
        if (!seen.has(key)) seen.set(key, w);
      });
  });
  gChokepoints.selectAll('circle')
    .data([...seen.values()])
    .join('circle')
    .attr('r', 2.6)
    .attr('fill', '#e8edf2')
    .attr('stroke', '#0b1016')
    .attr('stroke-width', 0.8);

  render();
}

function highlightRoute(id) {
  gRoutes.selectAll('path').attr('opacity', (d, i, nodes) => {
    const el = nodes[i];
    return el.classList.contains(`route-${id}`) ? 1 : 0.18;
  }).attr('stroke-width', (d, i, nodes) => {
    const el = nodes[i];
    return el.classList.contains(`route-${id}`) ? 3.2 : 1.6;
  });
  gAvoided.selectAll('path').attr('opacity', (d, i, nodes) => {
    const el = nodes[i];
    return el.classList.contains(`route-${id}`) ? 0.85 : 0.15;
  });
}

function resetHighlight() {
  gRoutes.selectAll('path').attr('opacity', 0.55).attr('stroke-width', 2);
  gAvoided.selectAll('path').attr('opacity', 0.7);
}

function renderRouteList(routes) {
  const list = d3.select('#route-list');
  const cards = list.selectAll('.route-card').data(routes, (d) => d.id);
  const entered = cards.enter().append('div')
    .attr('class', 'route-card')
    .on('click', (event, d) => selectRoute(d));

  entered.append('div').attr('class', 'title-row').call((row) => {
    row.append('span').attr('class', 'sev-dot')
      .style('background', (d) => SEV_HEX[d.severity] || '#999');
    row.append('h3').text((d) => d.title);
  });
  entered.append('div').attr('class', 'date-range').text((d) => d.dateRange);
}

let activeRouteId = null;

function selectRoute(d) {
  const detail = d3.select('#detail');
  if (activeRouteId === d.id) {
    // second click on the same card: deselect
    activeRouteId = null;
    d3.selectAll('.route-card').classed('active', false);
    resetHighlight();
    detail.html('').append('span').attr('class', 'placeholder')
      .text('Select a route to read the full story and sources.');
    return;
  }
  activeRouteId = d.id;
  d3.selectAll('.route-card').classed('active', (c) => c.id === d.id);
  highlightRoute(d.id);
  detail.html('');
  detail.append('div').text(d.summary);
  detail.append('span').attr('class', 'source').text(`Source: ${d.source}`);
}

let dragStart = null;
svg.call(d3.drag()
  .on('start', (event) => { dragStart = { rotate: projection.rotate(), x: event.x, y: event.y }; })
  .on('drag', (event) => {
    if (!dragStart) return;
    const scale = 0.35;
    const dx = (event.x - dragStart.x) * scale;
    const dy = (event.y - dragStart.y) * scale;
    const r = dragStart.rotate;
    projection.rotate([r[0] + dx, Math.max(-90, Math.min(90, r[1] - dy))]);
    render();
  })
  .on('end', () => { dragStart = null; }));

Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json'),
  d3.json('data/disruptions.json'),
]).then(([landTopo, data]) => {
  worldLand = landTopo;
  routeData = data.routes;
  drawLand(landTopo);
  drawRoutes(routeData);
  renderRouteList(routeData);
  d3.select('#meta-row').text(
    `data current as of ${data.lastUpdated} · refreshed ${data.updateCadence} · ${data.focus}`
  );
}).catch((err) => {
  d3.select('#meta-row').text('Could not load map/data — check the console (likely a local file:// CORS issue; serve via a local HTTP server).');
  console.error(err);
});
