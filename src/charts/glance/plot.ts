// Plot helpers shared by the Glance charts: tidy axis ticks, crisp hairlines, category slots,
// rounded bars and ring slices, smoothed lines and entrance progress. Everything returns plain
// numbers or SVG path data, so the charts stay pure functions of their settings and time.

import { arc } from 'd3-shape';
import type { DrawContext } from '../../core/chart';
import type { EaseFn } from '../../core/ease';

/** How far below the middle of a line of Inter the baseline sits, in font sizes (centres labels on a point). */
export const MID = 0.3638;

/** Two decimals of rounding noise are invisible; ten keep floating-point leftovers out of labels. */
const clean = (v: number) => {
  const r = Math.round(v * 1e10) / 1e10;
  return r === 0 ? 0 : r;
};

// ── value axes ──────────────────────────────────────────────────────────────

/** A round step (1, 2 or 5 × a power of ten) that splits `span` into about `count` parts. */
export function tickStep(span: number, count: number): number {
  const raw = Math.abs(span) / Math.max(1, count);
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  const pick = unit < 1.5 ? 1 : unit < 3 ? 2 : unit < 7 ? 5 : 10;
  return clean(pick * power);
}

export interface ValueAxis {
  min: number;
  max: number;
  interval: number;
  ticks: number[];
}

/**
 * A value axis: the data range (stretched to include zero unless `scale`), split into about
 * `splitNumber` round steps. Ends that aren't fixed by `min`/`max` are widened to whole steps;
 * ticks sit on every whole step inside the range.
 */
export function valueAxis(dataMin: number, dataMax: number, o: { splitNumber?: number; min?: number; max?: number; scale?: boolean } = {}): ValueAxis {
  let lo = o.min ?? (o.scale ? dataMin : Math.min(0, dataMin));
  let hi = o.max ?? (o.scale ? dataMax : Math.max(0, dataMax));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) [lo, hi] = [0, 1];
  if (hi < lo) [lo, hi] = [hi, lo];
  if (lo === hi) {
    // a single value: give it room (zero gets 0..1)
    if (lo === 0) hi = 1;
    else {
      const pad = Math.abs(lo) / 2;
      if (o.max === undefined) hi += pad;
      if (o.min === undefined) lo -= pad;
      if (lo === hi) hi += pad;
    }
  }
  const step = tickStep(hi - lo, o.splitNumber ?? 5);
  if (o.min === undefined) lo = clean(Math.floor(lo / step + 1e-9) * step);
  if (o.max === undefined) hi = clean(Math.ceil(hi / step - 1e-9) * step);
  const ticks: number[] = [];
  const first = Math.ceil(lo / step - 1e-9), last = Math.floor(hi / step + 1e-9);
  for (let k = first; k <= last && ticks.length < 1000; k++) ticks.push(clean(k * step));
  return { min: lo, max: hi, interval: step, ticks };
}

/** Axis numbers: thousands separators and only the decimals the value needs. */
export const axisNumber = (v: number) => clean(v).toLocaleString('en-US', { maximumFractionDigits: 10 });

// ── geometry ────────────────────────────────────────────────────────────────

/** Snap a hairline's position so a line of this width covers whole pixels (odd widths sit on .5). */
export function crisp(position: number, lineWidth = 1): number {
  const w = Math.round(lineWidth);
  if (w <= 0) return position;
  return w % 2 ? Math.floor(position) + 0.5 : Math.round(position);
}

/** Category positions: `n` equal slots (labels in the middle of each) or points spread end to end. */
export function categories(n: number, start: number, length: number, boundaryGap = true) {
  const band = boundaryGap ? length / Math.max(1, n) : length / Math.max(1, n - 1);
  return { band, at: (i: number) => (boundaryGap ? start + (i + 0.5) * band : start + i * band) };
}

const f = (v: number) => Math.round(v * 1e4) / 1e4;

/**
 * A rectangle with rounded corners, radii given as one number or [top-left, top-right,
 * bottom-right, bottom-left]. A negative width or height draws the rectangle the other way from
 * (x, y); the corners keep their screen positions. No radius is larger than half the side.
 */
export function roundRect(x: number, y: number, w: number, h: number, radius: number | number[]): string {
  const left = Math.min(x, x + w), top = Math.min(y, y + h);
  const W = Math.abs(w), H = Math.abs(h);
  const list = typeof radius === 'number' ? [radius, radius, radius, radius] : radius.length === 2 ? [radius[0], radius[1], radius[0], radius[1]] : radius;
  const cap = Math.min(W, H) / 2;
  const [tl, tr, br, bl] = [0, 1, 2, 3].map((i) => Math.max(0, Math.min(cap, list[i] ?? 0)));
  const corner = (r: number, ex: number, ey: number) => (r > 0 ? `A${f(r)} ${f(r)} 0 0 1 ${f(ex)} ${f(ey)}` : '');
  return (
    `M${f(left + tl)} ${f(top)}H${f(left + W - tr)}` +
    corner(tr, left + W, top + tr) +
    `V${f(top + H - br)}` +
    corner(br, left + W - br, top + H) +
    `H${f(left + bl)}` +
    corner(bl, left, top + H - bl) +
    `V${f(top + tl)}` +
    corner(tl, left + tl, top) +
    'Z'
  );
}

/** A full circle as path data (two half arcs), so it can morph into other outlines. */
export const circlePath = (cx: number, cy: number, r: number) =>
  `M${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 1 ${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 1 ${f(cx + r)} ${f(cy)}Z`;

/** Collects canvas-style drawing calls (as d3-shape makes them) as SVG path data, moved by (dx, dy). */
class SvgPath {
  d = '';
  private at: [number, number] | null = null;
  constructor(private readonly dx: number, private readonly dy: number) {}
  moveTo(x: number, y: number) {
    this.d += `M${f(x + this.dx)} ${f(y + this.dy)}`;
    this.at = [x, y];
  }
  lineTo(x: number, y: number) {
    this.d += `${this.at ? 'L' : 'M'}${f(x + this.dx)} ${f(y + this.dy)}`;
    this.at = [x, y];
  }
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw = false) {
    const TAU = 2 * Math.PI;
    const sx = x + r * Math.cos(a0), sy = y + r * Math.sin(a0);
    if (!this.at) this.moveTo(sx, sy);
    else if (Math.abs(this.at[0] - sx) > 1e-6 || Math.abs(this.at[1] - sy) > 1e-6) this.lineTo(sx, sy);
    if (!r) return;
    const turn = ccw ? a0 - a1 : a1 - a0;
    const sweep = ccw ? 0 : 1;
    const R = f(r);
    if (turn >= TAU - 1e-9) {
      const ox = x - r * Math.cos(a0), oy = y - r * Math.sin(a0);
      this.d += `A${R} ${R} 0 1 ${sweep} ${f(ox + this.dx)} ${f(oy + this.dy)}A${R} ${R} 0 1 ${sweep} ${f(sx + this.dx)} ${f(sy + this.dy)}`;
      this.at = [sx, sy];
      return;
    }
    const span = ((turn % TAU) + TAU) % TAU;
    if (span < 1e-9) return;
    const end = ccw ? a0 - span : a0 + span;
    const ex = x + r * Math.cos(end), ey = y + r * Math.sin(end);
    this.d += `A${R} ${R} 0 ${span > Math.PI ? 1 : 0} ${sweep} ${f(ex + this.dx)} ${f(ey + this.dy)}`;
    this.at = [ex, ey];
  }
  closePath() {
    this.d += 'Z';
  }
}

export interface SectorShape {
  cx: number;
  cy: number;
  /** inner and outer radius */
  r0: number;
  r: number;
  /** radians, 0 = three o'clock, growing clockwise on screen */
  startAngle: number;
  endAngle: number;
  clockwise?: boolean;
  cornerRadius?: number;
}

/** A ring slice with rounded corners (d3-shape's arc), as SVG path data. */
export function roundSector(sh: SectorShape): string {
  const out = new SvgPath(sh.cx, sh.cy);
  // d3 measures angles from twelve o'clock
  const [a0, a1] = sh.clockwise === false ? [sh.endAngle, sh.startAngle] : [sh.startAngle, sh.endAngle];
  arc<null>()
    .innerRadius(Math.max(0, Math.min(sh.r0, sh.r)))
    .outerRadius(Math.max(0, sh.r0, sh.r))
    .cornerRadius(Math.max(0, sh.cornerRadius ?? 0))
    .startAngle(a0 + Math.PI / 2)
    .endAngle(a1 + Math.PI / 2)
    .context(out as unknown as CanvasRenderingContext2D)(null);
  return out.d;
}

// ── smoothed lines ──────────────────────────────────────────────────────────

/**
 * A curve through the points: each point's direction follows its neighbours (more of it as
 * `smooth` goes from 0 to 1), and no control point rises above or dips below the two points it
 * joins, so peaks stay peaks and flat runs stay flat.
 */
export function smoothLine(pts: [number, number][], smooth: number): string {
  if (!pts.length) return '';
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const k = Math.max(0, Math.min(1, smooth)) / 3;
  const between = (v: number, a: number, b: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), v));
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    if (k === 0) {
      d += `L${f(x2)} ${f(y2)}`;
      continue;
    }
    const [x0, y0] = pts[i - 1] ?? pts[i], [x3, y3] = pts[i + 2] ?? pts[i + 1];
    const c1x = between(x1 + (x2 - x0) * k, x1, x2), c1y = between(y1 + (y2 - y0) * k, y1, y2);
    const c2x = between(x2 - (x3 - x1) * k, x1, x2), c2y = between(y2 - (y3 - y1) * k, y1, y2);
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(x2)} ${f(y2)}`;
  }
  return d;
}

/** The smoothed line closed down to a baseline (the area under it). */
export function smoothArea(pts: [number, number][], smooth: number, baseY: number): string {
  if (!pts.length) return '';
  const last = pts[pts.length - 1], first = pts[0];
  return `${smoothLine(pts, smooth)}L${f(last[0])} ${f(baseY)}L${f(first[0])} ${f(baseY)}Z`;
}

// ── animation ───────────────────────────────────────────────────────────────

/** Eased progress (0..1) of a mark that starts `delay` seconds in and lasts `dur` seconds. */
export function progress(ctx: DrawContext, delay: number, dur: number, ease: EaseFn): number {
  if (ctx.time === Infinity) return 1;
  const p = (ctx.time - delay * ctx.stagger) / dur;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return (ctx.ease ?? ease)(p);
}
