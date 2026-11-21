// G13 Jitter Strip — one dot per ticket, spread vertically within its priority row so pile-ups
// show: round hour ticks, the axis title at the end of the zero line (the plot narrows so it
// fits), and row labels at the left.

import { defineChart } from '../../core/define';
import { cubicOut } from '../../core/ease';
import { rndSigned as rnd } from '../../core/rnd';
import { measure } from '../../core/text/metrics';
import { el, keyed, tip, txt } from '../../core/vnode';
import { axisNumber, crisp, MID, progress, valueAxis } from './plot';
import { gFaint, glanceFrame } from './shared';

const CATS = ['P0 CRITICAL', 'P1 HIGH', 'P2 NORMAL', 'P3 LOW'];
const MONO_L = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];

/** The demo's generated tickets (x only; the vertical jitter is worked out from the index). */
function demoPoints(ci: number, n: number, median: number, spread: number, outliers: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = rnd(i + 1, ci + 1), v = rnd(i + 7, ci + 3);
    let x = median + (u - 0.5) * spread * 2 + (v > 0.5 ? u * spread * 0.6 : 0);
    if (i < outliers) x = median + spread * 2.2 + u * spread * 3;
    out.push(Math.max(0.2, x));
  }
  return out;
}
const GROUPS = [demoPoints(0, 38, 0.8, 0.5, 2), demoPoints(1, 64, 2.4, 1.1, 3), demoPoints(2, 110, 6.5, 2.4, 4), demoPoints(3, 72, 14, 4.5, 3)];
const DEFAULT_TITLE = 'HOURS TO RESOLVE';

export default defineChart({
  id: 'G13',
  name: 'Jitter Strip',
  family: 'glance',
  kinds: ['distribution', 'scatter'],
  description: 'One dot per item, jittered within its row so pile-ups and outliers show.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 5000,
      columns: [
        { key: 'group', label: 'Row', type: 'text', role: 'category', help: 'Each different name gets its own row, in order of first appearance.' },
        { key: 'value', label: 'Value', type: 'number', role: 'value' },
      ],
    }],
  },
  defaultData: { rows: GROUPS.flatMap((pts, ci) => pts.map((v) => ({ group: CATS[ci], value: Math.round(v * 1000) / 1000 }))) },
  defaults: { numSuffix: 'h' },
  text: {
    title: 'Response times, spread out',
    subtitle: 'every dot = one ticket · jitter reveals the pile-up · by priority',
    source: 'JITTER STRIP · MONO-FANCY3 · SUPPORT DESK',
  },
  fields: [
    { key: 'dotSize', label: 'Dot size', group: 'options', section: 'Dots', type: 'number', min: 1, max: 30, step: 0.5, unit: 'px', default: 7 },
    { key: 'dotOpacity', label: 'Dot opacity', group: 'options', section: 'Dots', type: 'number', min: 0.05, max: 1, step: 0.01, default: 0.62 },
    { key: 'jitter', label: 'Vertical spread', group: 'options', section: 'Dots', type: 'number', min: 0, max: 1, step: 0.01, default: 0.58, help: 'Share of a row’s height the dots spread over.' },
    { key: 'axisTitle', label: 'Axis title', group: 'options', section: 'Axis', type: 'text', default: DEFAULT_TITLE },
    { key: 'splitNumber', label: 'About this many grid steps', group: 'options', section: 'Axis', type: 'number', min: 1, max: 12, step: 1, default: 5 },
    { key: 'labelColumn', label: 'Row label column', group: 'options', section: 'Axis', type: 'number', min: 20, max: 300, step: 1, unit: 'px', default: 86 },
    { key: 'rowDelay', label: 'Delay between rows', group: 'options', section: 'Animation', type: 'number', min: 0, max: 2000, step: 10, unit: 'ms', default: 260 },
    { key: 'measure', label: 'Tooltip ending', group: 'options', section: 'Units', type: 'text', default: 'to resolve', help: 'Tooltip: “P1 HIGH — 2.4h to resolve”.' },
  ],
  supports: { categoryLabels: true, axes: true, grid: true, hover: false },
  paletteNeeds: ['sequential'],
  interactions: ['tooltip'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => {
    const groups = new Set(ctx.rows.map((r) => String(r.group))).size;
    return 0.45 + (Math.max(0, groups - 1) * (ctx.num('rowDelay') / 1000) + 36 * 0.009) * ctx.stagger;
  },
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const names: string[] = [];
    const pts = ctx.rows.map((r) => {
      const g = String(r.group);
      if (!names.includes(g)) names.push(g);
      return { ci: names.indexOf(g), x: Number(r.value) };
    });
    const nCat = names.length;
    const title = ctx.str('axisTitle').trim();
    const left = ctx.num('labelColumn'), top = 14, bottom = 30;
    const right = title ? Math.max(16, 15 + measure(title, 8.5, 400) + 6) : 16;
    const x0 = left, x1 = W - right, y0 = top, y1 = H - bottom;
    const axis = valueAxis(Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x)), { splitNumber: Math.round(ctx.num('splitNumber')) });
    const X = (v: number) => x0 + ((v - axis.min) / (axis.max - axis.min)) * (x1 - x0);
    const yMin = -0.6, yMax = nCat - 0.4;
    const Y = (v: number) => y0 + ((v - yMin) / (yMax - yMin)) * (y1 - y0);
    if (ctx.bool('showGrid')) {
      for (const t of axis.ticks) {
        const x = crisp(X(t), 1);
        el(s, 'line', { x1: x, y1: y0, x2: x, y2: y1, stroke: T.grid, 'stroke-width': 1, class: 'fade', style: 'animation-duration:.4s' });
      }
    }
    const unit = ctx.str('numSuffix');
    if (ctx.bool('showAxes')) {
      if (title) txt(s, { x: x1 + 15, y: Y(0) + MID * 8.5, 'font-size': ctx.fs(8.5), fill: gFaint(T), class: 'fade', style: 'animation-duration:.4s' }, title);
      const fs = ctx.fs(9.5);
      for (const t of axis.ticks) txt(s, { x: X(t), y: y1 + 8 + fs / 2 + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': 'middle', class: 'fade', style: 'animation-duration:.4s' }, axisNumber(t) + unit);
    }
    if (ctx.bool('categoryLabels')) {
      const fs = ctx.fs(9);
      names.forEach((name, ci) => txt(s, {
        x: X(0) - 11, y: Y(ci) + MID * fs, 'font-size': fs, 'font-weight': 700, fill: T.label, 'text-anchor': 'end', opacity: 0.8, class: 'fade', style: 'animation-duration:.4s',
      }, name));
    }
    // a dot takes the colour of the row it lands nearest (after the jitter)
    const colour = (ci: number) => (T.kind === 'mono' ? MONO_L[Math.min(5, ci)] : T.ramp[Math.max(0, 4 - Math.min(4, ci))]);
    const r0 = ctx.num('dotSize') / 2, op = ctx.num('dotOpacity'), jit = ctx.num('jitter');
    const rowDelay = ctx.num('rowDelay') / 1000;
    const seen = new Array(nCat).fill(0);
    const groups = names.map((_, ci) => keyed(el(s, 'g', {}), `row-${ci}`));
    pts.forEach((p, i) => {
      const k = seen[p.ci]++;
      const jy = p.ci + (rnd(k + 13, p.ci + 5) - 0.5) * jit;
      if (jy < yMin || jy > yMax || p.x < axis.min || p.x > axis.max) return; // outside the plot: left out
      const near = Math.max(0, Math.min(nCat - 1, Math.round(jy)));
      const e = progress(ctx, near * rowDelay + (i % 37) * 0.009, 0.45, cubicOut);
      if (e <= 0) return;
      const dot = el(groups[p.ci], 'circle', { cx: X(p.x), cy: Y(jy), r: r0 * e, fill: colour(near), opacity: op });
      tip(dot, `${names[p.ci]} — ${p.x.toFixed(1)}${unit} ${ctx.str('measure')}`.trim());
    });
  },
});
