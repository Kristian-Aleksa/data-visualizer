// Map outlines and how they are placed on the chart (a plain longitude/latitude grid):
//  - inset regions (Alaska, Hawaii, Puerto Rico) are moved and shrunk into a box given in
//    degrees, and their label anchor becomes the middle of that box;
//  - the map's box is the union of the regions' boxes (outer rings only), or `bounds` if given;
//  - longitude is squeezed by the aspect scale, then the map is fitted between the top and
//    bottom margins (and the sides) and centred;
//  - a region's label anchor is the centroid of its largest piece.

/** [longitude, latitude] */
export type Pt = [number, number];
export interface Box { x: number; y: number; w: number; h: number }
export interface GeoRegion {
  name: string;
  /** polygons, each [outer ring, ...holes], in degrees */
  polys: Pt[][][];
  /** box around the outer rings, in degrees (y = latitude, growing north) */
  box: Box;
  /** label anchor, in degrees */
  center: Pt;
}
/** An inset: the region is fitted into this box (degrees; `top` is its south edge). */
export interface SpecialArea { left: number; top: number; width?: number; height?: number }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const VALUE = new Int8Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) VALUE[ALPHABET.charCodeAt(i)] = i;

/** Read back one ring written by scripts/build-geo.mjs (zig-zag steps, 5 bits per character). */
export function decodeRing(s: string, scale: number): Pt[] {
  const out: Pt[] = [];
  let i = 0;
  let x = 0;
  let y = 0;
  const next = () => {
    let z = 0;
    let mul = 1;
    let c: number;
    do {
      c = VALUE[s.charCodeAt(i++)];
      z += (c & 31) * mul;
      mul *= 32;
    } while (c >= 32);
    return z % 2 ? -(z + 1) / 2 : z / 2;
  };
  while (i < s.length) {
    x += next();
    y += next();
    out.push([x / scale, y / scale]);
  }
  return out;
}

function boxOf(polys: Pt[][][]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of polys) {
    for (const [x, y] of poly[0]) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 };
}

/** Signed area and centroid of a ring (shoelace formula). */
function ringStats(ring: Pt[]): { area: number; c: Pt } {
  let a = 0, x = 0, y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += cross;
    x += (ring[j][0] + ring[i][0]) * cross;
    y += (ring[j][1] + ring[i][1]) * cross;
  }
  return a ? { area: a / 2, c: [x / (3 * a), y / (3 * a)] } : { area: 0, c: ring[0] ? [ring[0][0], ring[0][1]] : [0, 0] };
}

/** Label anchor: the centroid of the region's largest piece (the box's middle if it has none). */
function centerOf(polys: Pt[][][], box: Box): Pt {
  let best: { area: number; c: Pt } | null = null;
  for (const poly of polys) {
    if (!poly[0]?.length) continue;
    const s = ringStats(poly[0]);
    if (!best || Math.abs(s.area) > Math.abs(best.area)) best = s;
  }
  return best ? best.c : [box.x + box.w / 2, box.y + box.h / 2];
}

function fitInto(r: GeoRegion, area: SpecialArea): void {
  const { box } = r;
  const aspect = box.w / box.h;
  let w = area.width ?? 0;
  let h = area.height ?? 0;
  if (!w) w = aspect * h;
  else if (!h) h = w / aspect;
  const sx = w / box.w, sy = h / box.h;
  r.polys = r.polys.map((poly) => poly.map((ring) => ring.map(([x, y]): Pt => [(x - box.x) * sx + area.left, (y - box.y) * sy + area.top])));
  r.box = { x: area.left, y: area.top, w, h };
  r.center = [area.left + w / 2, area.top + h / 2];
}

/** Decode a generated outline table (geo-usa.ts / geo-world.ts) into regions. */
export function decodeRegions(raw: [string, string[][]][], scale: number, special: Record<string, SpecialArea> = {}): GeoRegion[] {
  return raw.map(([name, polys]) => {
    const p = polys.map((poly) => poly.map((ring) => decodeRing(ring, scale)));
    const box = boxOf(p);
    const r: GeoRegion = { name, polys: p, box, center: centerOf(p, box) };
    if (special[name]) fitInto(r, special[name]);
    return r;
  });
}

export function unionBox(regions: GeoRegion[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const { box } of regions) {
    x0 = Math.min(x0, box.x);
    y0 = Math.min(y0, box.y);
    x1 = Math.max(x1, box.x + box.w);
    y1 = Math.max(y1, box.y + box.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export interface GeoLayout {
  /** drawing size */
  W: number;
  H: number;
  /** space kept free above and below the map */
  top: number;
  bottom: number;
  /** how much longitude is squeezed against latitude (0.75 suits mid latitudes) */
  aspectScale: number;
  /** map box in degrees: west, north, east, south */
  bounds?: [number, number, number, number];
  /** extra zoom around the middle of the map (1 = fitted) */
  zoom?: number;
}

export interface Projection {
  x(lon: number): number;
  y(lat: number): number;
  /** where the map box landed, in px */
  view: Box;
}

/** Fit the map box between the margins, keep the squeezed aspect, centre it. */
export function projection(regions: GeoRegion[], L: GeoLayout): Projection {
  let data = unionBox(regions);
  if (L.bounds) {
    const [w, n, e, s] = L.bounds;
    data = { x: Math.min(w, e), y: Math.min(n, s), w: Math.abs(e - w), h: Math.abs(n - s) };
  }
  const aspect = (data.w / data.h) * L.aspectScale;
  const room = Math.max(1, L.H - L.top - L.bottom);
  let vh = room;
  let vw = aspect * vh;
  // a map too wide for the room is fitted to the width instead
  if (vw > L.W) {
    vw = L.W;
    vh = vw / aspect;
  }
  const zoom = L.zoom ?? 1;
  const cx = L.W / 2, cy = L.top + room / 2;
  vw *= zoom;
  vh *= zoom;
  const view = { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh };
  const sx = vw / data.w, sy = vh / data.h;
  const top = data.y + data.h;
  return { x: (lon) => view.x + (lon - data.x) * sx, y: (lat) => view.y + (top - lat) * sy, view };
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const num = (v: number) => String(Math.round(v * 10) / 10 || 0);

/**
 * SVG path data for a region's polygons, in px: every point, rounded to 0.1px and written as
 * steps from the previous one (points that round onto the previous one are skipped).
 */
export function regionPath(r: GeoRegion, P: Projection): string {
  const out: string[] = [];
  for (const poly of r.polys) {
    for (const ring of poly) {
      if (ring.length < 2) continue;
      let px = r1(P.x(ring[0][0])), py = r1(P.y(ring[0][1]));
      let d = `M${num(px)} ${num(py)}`;
      for (let i = 1; i < ring.length; i++) {
        const x = r1(P.x(ring[i][0])), y = r1(P.y(ring[i][1]));
        if (x === px && y === py) continue;
        d += `l${num(x - px)} ${num(y - py)}`;
        px = x;
        py = y;
      }
      out.push(d + 'z');
    }
  }
  return out.join('');
}
