// Shape morphing for G07: any two closed outlines (a dot, a rounded bar, a donut slice) are
// sampled into the same number of points, lined up so the shape turns as little as possible, and
// blended point by point. Pure functions of t, so every frame (and every video frame) is exact.

import { parseColor } from '../../core/color';

type Pt = [number, number];

const STEP = Math.PI / 24; // arc flattening: one point every 7.5°

function arcPoints(out: Pt[], x1: number, y1: number, r: number, large: number, sweep: number, x2: number, y2: number) {
  // SVG arc (circular, no rotation): endpoints → centre (SVG 1.1, appendix F.6.5)
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const d2 = dx * dx + dy * dy;
  if (!r || !d2) {
    out.push([x2, y2]);
    return;
  }
  let rr = Math.abs(r);
  if (d2 > rr * rr) rr = Math.sqrt(d2);
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (rr * rr - d2) / d2));
  const cx = k * dy + (x1 + x2) / 2, cy = -k * dx + (y1 + y2) / 2;
  const a1 = Math.atan2(y1 - cy, x1 - cx);
  let da = Math.atan2(y2 - cy, x2 - cx) - a1;
  if (sweep && da < 0) da += Math.PI * 2;
  if (!sweep && da > 0) da -= Math.PI * 2;
  const n = Math.max(1, Math.ceil(Math.abs(da) / STEP));
  for (let i = 1; i <= n; i++) out.push([cx + rr * Math.cos(a1 + (da * i) / n), cy + rr * Math.sin(a1 + (da * i) / n)]);
}

/** The first outline of a path made of absolute M/L/H/V/A/Z commands, as a polygon. */
export function outline(d: string): Pt[] {
  const tok = d.match(/[MLHVAZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  const pts: Pt[] = [];
  let i = 0, x = 0, y = 0, cmd = '';
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/^[A-Z]$/i.test(tok[i])) {
      cmd = tok[i++].toUpperCase();
      if (cmd === 'Z') {
        if (pts.length) return pts;
        continue;
      }
    }
    switch (cmd) {
      case 'M':
        if (pts.length) return pts;
        x = num();
        y = num();
        pts.push([x, y]);
        cmd = 'L';
        break;
      case 'L':
        x = num();
        y = num();
        pts.push([x, y]);
        break;
      case 'H':
        x = num();
        pts.push([x, y]);
        break;
      case 'V':
        y = num();
        pts.push([x, y]);
        break;
      case 'A': {
        const r = num();
        num();
        num();
        const large = num(), sweep = num(), x2 = num(), y2 = num();
        arcPoints(pts, x, y, r, large, sweep, x2, y2);
        [x, y] = [x2, y2];
        break;
      }
      default:
        i++;
    }
  }
  return pts;
}

/** `n` points evenly spaced along the closed polygon, starting at its first point. */
export function resample(pts: Pt[], n: number): Pt[] {
  if (pts.length === 0) return [];
  const ring = [...pts, pts[0]];
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < ring.length; i++) {
    const l = Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]);
    seg.push(l);
    total += l;
  }
  if (total === 0) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]] as Pt);
  const out: Pt[] = [];
  let j = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const at = (total * k) / n;
    while (j < seg.length - 1 && acc + seg[j] < at) acc += seg[j++];
    const t = seg[j] ? (at - acc) / seg[j] : 0;
    out.push([ring[j][0] + (ring[j + 1][0] - ring[j][0]) * t, ring[j][1] + (ring[j + 1][1] - ring[j][1]) * t]);
  }
  return out;
}

const centroid = (p: Pt[]): Pt => {
  let x = 0, y = 0;
  for (const q of p) {
    x += q[0];
    y += q[1];
  }
  return [x / p.length, y / p.length];
};

const N = 72;
const cache = new Map<string, [Pt[], Pt[]]>();

/** Both outlines as N points each, the second rotated in order to line up with the first. */
function pair(a: string, b: string): [Pt[], Pt[]] {
  const key = a + '|' + b;
  const hit = cache.get(key);
  if (hit) return hit;
  let A = resample(outline(a), N), B = resample(outline(b), N);
  // a missing shape grows from (or shrinks to) the other one's middle
  if (!A.length && !B.length) A = B = Array.from({ length: N }, () => [0, 0] as Pt);
  else if (!A.length) A = B.map(() => centroid(B));
  else if (!B.length) B = A.map(() => centroid(A));
  const ca = centroid(A), cb = centroid(B);
  let best = 0, bestCost = Infinity;
  for (let k = 0; k < N; k++) {
    let cost = 0;
    for (let i = 0; i < N && cost < bestCost; i++) {
      const p = A[i], q = B[(i + k) % N];
      const ex = p[0] - ca[0] - (q[0] - cb[0]), ey = p[1] - ca[1] - (q[1] - cb[1]);
      cost += ex * ex + ey * ey;
    }
    if (cost < bestCost) [bestCost, best] = [cost, k];
  }
  const res: [Pt[], Pt[]] = [A, A.map((_, i) => B[(i + best) % N])];
  if (cache.size > 400) cache.delete(cache.keys().next().value!);
  cache.set(key, res);
  return res;
}

/** The outline between path `a` (t = 0) and path `b` (t = 1). */
export function morphPath(a: string, b: string, t: number): string {
  const [A, B] = pair(a, b);
  const r = (v: number) => Math.round(v * 100) / 100;
  return A.map((p, i) => `${i ? 'L' : 'M'}${r(p[0] + (B[i][0] - p[0]) * t)} ${r(p[1] + (B[i][1] - p[1]) * t)}`).join('') + 'Z';
}

/** Colour between a and b, keeping transparency (rgba out). */
export function blendColor(a: string, b: string, t: number): string {
  const ca = parseColor(a) ?? [0, 0, 0, 1], cb = parseColor(b) ?? [0, 0, 0, 1];
  const c = ca.map((v, i) => v + (cb[i] - v) * t);
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.round(c[3] * 1000) / 1000})`;
}

/** Bounding box of a path's first outline. */
export function pathBox(d: string): { x: number; y: number; w: number; h: number } {
  const p = outline(d);
  if (!p.length) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
