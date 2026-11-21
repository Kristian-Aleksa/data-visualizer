// Geometry helpers: polar/sector/blob helpers, plus path flattening so the
// animation code can compute path lengths (for 'draw') and bounding boxes (for 'pop')
// without a browser.

import { rndAbs } from './rnd';
import { measure, ASC, DESC } from './text/metrics';
import type { Box, VNode } from './vnode';

export const D2R = Math.PI / 180;

export const pol = (cx: number, cy: number, r: number, deg: number): [number, number] => [
  cx + r * Math.cos(deg * D2R),
  cy + r * Math.sin(deg * D2R),
];

/** Annular sector path between radii r0..r1 and angles a0..a1 (degrees). */
export function sect(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const big = a1 - a0 > 180 ? 1 : 0;
  const [xa, ya] = pol(cx, cy, r1, a0), [xb, yb] = pol(cx, cy, r1, a1);
  const [xc, yc] = pol(cx, cy, r0, a1), [xd, yd] = pol(cx, cy, r0, a0);
  return `M${xa} ${ya} A${r1} ${r1} 0 ${big} 1 ${xb} ${yb} L${xc} ${yc} A${r0} ${r0} 0 ${big} 0 ${xd} ${yd} Z`;
}

/** Hand-drawn wobbly circle used by the editorial charts (seeded, so it never changes). */
export function blob(x: number, y: number, r: number, seed: number): string {
  const n = Math.max(14, Math.round(r * 1.6)), pts: [number, number][] = [];
  for (let t = 0; t < n; t++) {
    const a = (t / n) * Math.PI * 2;
    const w = 1 + 0.055 * Math.sin(a * 2 + seed * 7) + 0.04 * Math.sin(a * 3 + seed * 13) + (rndAbs(seed + t, 3) - 0.5) * 0.03;
    pts.push([x + Math.cos(a) * r * w, y + Math.sin(a) * r * w]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let t = 0; t < n; t++) {
    const p = pts[t], q = pts[(t + 1) % n];
    d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
  }
  return d + ' Z';
}

// ── path flattening ─────────────────────────────────────────────────────────

type Pt = [number, number];
const NUM = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

function arcPoints(x0: number, y0: number, rx: number, ry: number, rot: number, large: number, sweep: number, x: number, y: number): Pt[] {
  if (rx === 0 || ry === 0) return [[x, y]];
  const phi = rot * D2R, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x0 - x) / 2, dy = (y0 - y) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  let co = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) co = -co;
  const cx1 = (co * rx * y1) / ry, cy1 = (-co * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (x0 + x) / 2, cy = sin * cx1 + cos * cy1 + (y0 + y) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const steps = Math.max(4, Math.ceil(Math.abs(dt) / (Math.PI / 24)));
  const pts: Pt[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = t1 + (dt * i) / steps;
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    pts.push([cos * ex - sin * ey + cx, sin * ex + cos * ey + cy]);
  }
  return pts;
}

/** Flatten an SVG path into polylines (one per subpath). */
export function flattenPath(d: string): Pt[][] {
  const toks = d.match(NUM) ?? [];
  const subs: Pt[][] = [];
  let cur: Pt[] = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  let cmd = '';
  let lcx = 0, lcy = 0; // last control point (for S/T)
  let i = 0;
  const num = () => parseFloat(toks[i++]);
  const push = (p: Pt) => cur.push(p);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const lc = cmd.toLowerCase();
    const rel = cmd !== cmd.toUpperCase();
    const n = ARGS[lc];
    if (n === undefined) break;
    if (lc === 'z') {
      push([sx, sy]);
      x = sx;
      y = sy;
      subs.push(cur);
      cur = [];
      continue;
    }
    if (i + n > toks.length) break;
    if (lc === 'm') {
      const nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0);
      if (cur.length) subs.push(cur);
      cur = [[nx, ny]];
      x = sx = nx;
      y = sy = ny;
      cmd = rel ? 'l' : 'L';
      lcx = x;
      lcy = y;
    } else if (lc === 'l') {
      x = num() + (rel ? x : 0);
      y = num() + (rel ? y : 0);
      push([x, y]);
      lcx = x;
      lcy = y;
    } else if (lc === 'h') {
      x = num() + (rel ? x : 0);
      push([x, y]);
      lcx = x;
      lcy = y;
    } else if (lc === 'v') {
      y = num() + (rel ? y : 0);
      push([x, y]);
      lcx = x;
      lcy = y;
    } else if (lc === 'c' || lc === 's') {
      let x1: number, y1: number;
      if (lc === 'c') {
        x1 = num() + (rel ? x : 0);
        y1 = num() + (rel ? y : 0);
      } else {
        x1 = 2 * x - lcx;
        y1 = 2 * y - lcy;
      }
      const x2 = num() + (rel ? x : 0), y2 = num() + (rel ? y : 0);
      const ex = num() + (rel ? x : 0), ey = num() + (rel ? y : 0);
      for (let k = 1; k <= 20; k++) {
        const t = k / 20, u = 1 - t;
        push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey]);
      }
      lcx = x2;
      lcy = y2;
      x = ex;
      y = ey;
    } else if (lc === 'q' || lc === 't') {
      let x1: number, y1: number;
      if (lc === 'q') {
        x1 = num() + (rel ? x : 0);
        y1 = num() + (rel ? y : 0);
      } else {
        x1 = 2 * x - lcx;
        y1 = 2 * y - lcy;
      }
      const ex = num() + (rel ? x : 0), ey = num() + (rel ? y : 0);
      for (let k = 1; k <= 12; k++) {
        const t = k / 12, u = 1 - t;
        push([u * u * x + 2 * u * t * x1 + t * t * ex, u * u * y + 2 * u * t * y1 + t * t * ey]);
      }
      lcx = x1;
      lcy = y1;
      x = ex;
      y = ey;
    } else if (lc === 'a') {
      const rx = num(), ry = num(), rot = num(), large = num(), sweep = num();
      const ex = num() + (rel ? x : 0), ey = num() + (rel ? y : 0);
      for (const p of arcPoints(x, y, rx, ry, rot, large, sweep, ex, ey)) push(p);
      x = ex;
      y = ey;
      lcx = x;
      lcy = y;
    }
  }
  if (cur.length) subs.push(cur);
  return subs;
}

const lenCache = new Map<string, number>();
export function pathLength(d: string): number {
  const hit = lenCache.get(d);
  if (hit !== undefined) return hit;
  let len = 0;
  for (const sub of flattenPath(d)) for (let i = 1; i < sub.length; i++) len += Math.hypot(sub[i][0] - sub[i - 1][0], sub[i][1] - sub[i - 1][1]);
  if (lenCache.size > 5000) lenCache.clear();
  lenCache.set(d, len);
  return len;
}

function boxOfPoints(pts: Pt[]): Box | null {
  if (!pts.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

const num = (v: unknown, d = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : d;
};

/** Object bounding box of a node (CSS `transform-box: fill-box`), ignoring transforms. */
export function nodeBox(n: VNode): Box | null {
  if (n._box !== undefined) return n._box;
  const a = n.attrs;
  let b: Box | null = null;
  switch (n.tag) {
    case 'line':
      b = boxOfPoints([[num(a.x1), num(a.y1)], [num(a.x2), num(a.y2)]]);
      break;
    case 'circle': {
      const cx = num(a.cx), cy = num(a.cy), r = num(a.r);
      b = { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
      break;
    }
    case 'ellipse': {
      const cx = num(a.cx), cy = num(a.cy), rx = num(a.rx), ry = num(a.ry);
      b = { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry };
      break;
    }
    case 'rect': {
      const x = num(a.x), y = num(a.y);
      b = { x0: x, y0: y, x1: x + num(a.width), y1: y + num(a.height) };
      break;
    }
    case 'path':
      b = boxOfPoints(flattenPath(String(a.d ?? '')).flat());
      break;
    case 'polygon':
    case 'polyline': {
      const v = String(a.points ?? '').trim().split(/[\s,]+/).map(Number);
      const pts: Pt[] = [];
      for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]]);
      b = boxOfPoints(pts);
      break;
    }
    case 'text': {
      const size = num(a['font-size'], 16);
      const w = measure(n.text ?? '', size, a['font-weight'] ?? 400, { letterSpacing: num(a['letter-spacing']), italic: a['font-style'] === 'italic' });
      const x = num(a.x), y = num(a.y);
      const anchor = a['text-anchor'];
      const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
      b = { x0: left, y0: y - ASC * size, x1: left + w, y1: y + DESC * size };
      break;
    }
    default: {
      for (const c of n.children) {
        const cb = nodeBox(c);
        if (!cb) continue;
        b = b ? { x0: Math.min(b.x0, cb.x0), y0: Math.min(b.y0, cb.y0), x1: Math.max(b.x1, cb.x1), y1: Math.max(b.y1, cb.y1) } : { ...cb };
      }
    }
  }
  n._box = b;
  return b;
}

/** Length of a stroked node, for the 'draw' animation. */
export function nodeLength(n: VNode): number {
  if (n._len !== undefined) return n._len;
  const a = n.attrs;
  let len = 0;
  if (n.tag === 'line') len = Math.hypot(num(a.x2) - num(a.x1), num(a.y2) - num(a.y1));
  else if (n.tag === 'path') len = pathLength(String(a.d ?? ''));
  else if (n.tag === 'circle') len = 2 * Math.PI * num(a.r);
  else if (n.tag === 'rect') len = 2 * (num(a.width) + num(a.height));
  else if (n.tag === 'polyline' || n.tag === 'polygon') {
    const v = String(a.points ?? '').trim().split(/[\s,]+/).map(Number);
    for (let i = 2; i + 1 < v.length; i += 2) len += Math.hypot(v[i] - v[i - 2], v[i + 1] - v[i - 1]);
  }
  n._len = len;
  return len;
}
