// Builds the outlines the map charts (M01, M02) draw, from public-domain map data:
//   world — Natural Earth 1:50m countries, via the world-atlas package (TopoJSON)
//   USA   — U.S. Census Bureau state boundaries, via the us-atlas package (TopoJSON)
// The files are downloaded once into .cache/geo/ (not committed). Shared borders are simplified
// once, so neighbouring regions still meet exactly. Each outline is then stored compactly:
// coordinates rounded to 1/1000° (USA) or 1/100° (world), the ring's closing point dropped, and
// the steps between points written as variable-length base-64 numbers. src/charts/maps/geo.ts
// reads them back.
// Run with: npm run geo
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, '.cache/geo');

/** Shift a polygon by 360° when all of it lies past `beyond` (keeps a country in one piece across the date line). */
const wrapWest = (beyond) => (poly) => (poly[0].every(([x]) => x < beyond) ? poly.map((ring) => ring.map(([x, y]) => [x + 360, y])) : poly);
const wrapEast = (beyond) => (poly) => (poly[0].every(([x]) => x > beyond) ? poly.map((ring) => ring.map(([x, y]) => [x - 360, y])) : poly);

const SOURCES = [
  {
    file: 'states-10m.json',
    url: 'https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json',
    object: 'states',
    out: 'src/charts/maps/geo-usa.ts',
    name: 'USA',
    scale: 1000,
    tolerance: 0.02,
    // square degrees; about 10 px per degree on the US map
    minArea: 0.004,
    from: 'U.S. Census Bureau state boundaries (public domain), via us-atlas 3.0.1',
    // the 50 states, DC and Puerto Rico; other territories are left out
    keep: (f) => f.id !== '60' && f.id !== '66' && f.id !== '69' && f.id !== '78',
    fix: {
      // the westernmost Aleutians sit just past the date line: keep them west of the rest
      Alaska: (polys) => polys.map(wrapEast(0)),
      // the main islands only (the small northwestern islands stretch the inset too far)
      Hawaii: (polys) => polys.filter((p) => p[0].every(([x]) => x > -161)),
    },
  },
  {
    file: 'countries-50m.json',
    url: 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json',
    object: 'countries',
    out: 'src/charts/maps/geo-world.ts',
    name: 'WORLD',
    scale: 100,
    tolerance: 0.035,
    // square degrees; about 4 px per degree on the world map
    minArea: 0.02,
    from: 'Natural Earth 1:50m countries (public domain), via world-atlas 2.0.2',
    keep: (f) => f.properties?.name !== 'Antarctica',
    fix: {
      // the eastern tip of Russia and the eastern half of Fiji sit past the date line
      Russia: (polys) => polys.map(wrapWest(-160)),
      Fiji: (polys) => polys.map(wrapWest(-160)),
    },
  },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Zig-zag a signed integer, then write it 5 bits per character (32+ = more characters follow). */
function encodeInt(n) {
  let z = n < 0 ? -2 * n - 1 : 2 * n;
  let s = '';
  while (z >= 32) {
    s += ALPHABET[32 + (z % 32)];
    z = Math.floor(z / 32);
  }
  return s + ALPHABET[z];
}

/** A ring as steps between rounded points (closing point and repeated points left out). */
function encodeRing(ring, scale) {
  let px = 0;
  let py = 0;
  let s = '';
  let n = 0;
  const last = ring.length - (ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? 1 : 0);
  for (let i = 0; i < last; i++) {
    const X = Math.round(ring[i][0] * scale);
    const Y = Math.round(ring[i][1] * scale);
    if (n && X === px && Y === py) continue;
    s += encodeInt(X - px) + encodeInt(Y - py);
    px = X;
    py = Y;
    n++;
  }
  return { s, n };
}

/** Squared distance from p to the segment a–b. */
function segDist2(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1];
  return x * x + y * y;
}

/** Douglas–Peucker: keep the points that stray more than `tol` from the simplified line. */
function simplify(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const tol2 = tol * tol;
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1, best = tol2;
    for (let i = a + 1; i < b; i++) {
      const d = segDist2(points[i], points[a], points[b]);
      if (d > best) [best, far] = [d, i];
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** TopoJSON arcs → absolute [lon, lat] points (raw and simplified). */
function decodeArcs(topo, tol) {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  return topo.arcs.map((arc) => {
    let x = 0, y = 0;
    const pts = arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
    // a closed arc (a whole island) is split at its farthest point so both halves keep their shape
    if (pts.length > 3 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) {
      let far = 1, best = -1;
      pts.forEach((p, i) => {
        const d = (p[0] - pts[0][0]) ** 2 + (p[1] - pts[0][1]) ** 2;
        if (d > best) [best, far] = [d, i];
      });
      return { raw: pts, simple: [...simplify(pts.slice(0, far + 1), tol), ...simplify(pts.slice(far), tol).slice(1)] };
    }
    return { raw: pts, simple: simplify(pts, tol) };
  });
}

function ringOf(indexes, arcs, key) {
  const out = [];
  for (const i of indexes) {
    const pts = i < 0 ? [...arcs[~i][key]].reverse() : arcs[i][key];
    out.push(...(out.length ? pts.slice(1) : pts));
  }
  // a ring that crosses the date line jumps from +180 to −180; keep its longitudes continuous
  // instead (they may then run a little past ±180), so it isn't drawn across the whole map
  let shift = 0;
  return out.map(([x, y], k) => {
    if (k > 0) {
      const prev = out[k - 1][0];
      if (x - prev > 180) shift -= 360;
      else if (prev - x > 180) shift += 360;
    }
    return [x + shift, y];
  });
}

const area = (ring) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a / 2);
};

async function load(src) {
  const path = join(cache, src.file);
  if (!existsSync(path)) {
    mkdirSync(cache, { recursive: true });
    console.log(`downloading ${src.url}`);
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`${src.url}: HTTP ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

for (const src of SOURCES) {
  const topo = await load(src);
  const arcs = decodeArcs(topo, src.tolerance);
  const regions = [];
  for (const g of topo.objects[src.object].geometries) {
    if (!g.properties?.name || !src.keep(g)) continue;
    const name = String(g.properties.name);
    const shapes = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
    let polys = shapes.map((rings) => rings.map((r) => ({ simple: ringOf(r, arcs, 'simple'), raw: ringOf(r, arcs, 'raw') })));
    // islands too small to see at the chart's size are dropped, but every region keeps its biggest piece
    let biggest = 0;
    polys.forEach((p, k) => {
      if (area(p[0].raw) > area(polys[biggest][0].raw)) biggest = k;
    });
    polys = polys
      .filter((p, k) => k === biggest || (p[0].simple.length >= 4 && area(p[0].raw) >= src.minArea))
      .map((p) => [p[0].simple.length >= 4 ? p[0].simple : p[0].raw, ...p.slice(1).filter((h) => h.simple.length >= 4 && area(h.raw) >= src.minArea).map((h) => h.simple)]);
    if (src.fix[name]) polys = src.fix[name](polys);
    const all = polys.map((p) => p.map((ring) => encodeRing(ring, src.scale)));
    let encoded = all.filter((p) => p[0].n >= 3).map((p) => p.filter((r) => r.n >= 3).map((r) => r.s));
    // a region smaller than the rounding (Vatican, Monaco) keeps its few points, so rows can still name it
    if (!encoded.length) encoded = all.slice(0, 1).map((p) => [p[0].s]);
    if (!encoded.length || !encoded[0][0]) throw new Error(`${name}: no outline left`);
    regions.push([name, encoded]);
  }
  regions.sort((a, b) => a[0].localeCompare(b[0]));
  const body = regions.map((r) => '  ' + JSON.stringify(r)).join(',\n');
  const ts = `// Generated by scripts/build-geo.mjs — do not edit by hand.
// Outlines: ${src.from}. Simplified, rounded to 1/${src.scale}° and re-encoded (see geo.ts).
export const ${src.name}_SCALE = ${src.scale};
export const ${src.name}_REGIONS: [string, string[][]][] = [
${body},
];
`;
  writeFileSync(join(root, src.out), ts);
  console.log(`${src.out}: ${regions.length} regions, ${(ts.length / 1024).toFixed(1)} KB`);
}
