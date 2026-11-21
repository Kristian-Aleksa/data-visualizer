// G15 Dynamic Data — a live-looking stream: a finite series scrolls through a 50-reading window,
// a new reading every 300 ms, each step sliding in over 260 ms. The last frame shows the last 50
// readings, and Loop keeps it streaming.

import { parseColor, toHex } from '../../core/color';
import { defineChart } from '../../core/define';
import { rndSigned as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { MID, smoothArea, smoothLine } from './plot';
import { glanceFrame } from './shared';

/** The demo random walk: 50 starting readings, then the ones a live feed would add. */
const DEMO = (() => {
  const out: number[] = [];
  let v = 64, t = 0;
  for (; t < 50; t++) {
    v = Math.max(30, v + (rnd(t + 1, 7) - 0.48) * 9);
    out.push(Math.round(v));
  }
  for (; t < 90; t++) {
    v = Math.max(30, Math.min(125, v + (rnd(t + 1, 7) - 0.48) * 9));
    out.push(Math.round(v));
  }
  return out;
})();

/** Readings that have arrived by natural time `time`, and how far the latest step has slid. */
function streamAt(n: number, win: number, every: number, slide: number, time: number) {
  const steps = Math.max(0, n - win);
  if (time === Infinity || steps === 0) return { k: steps, frac: 0 };
  // reading k+1 arrives at k·every and slides in over `slide` seconds
  const k = Math.min(steps, Math.floor(time / every));
  if (k >= steps) return { k: steps, frac: 0 };
  return { k, frac: Math.min(1, (time - k * every) / slide) };
}

export default defineChart({
  id: 'G15',
  name: 'Dynamic Data',
  family: 'glance',
  kinds: ['lines', 'time'],
  description: 'A live line: new readings stream in from the right while the window slides along.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 2,
      maxRows: 5000,
      columns: [{ key: 'value', label: 'Reading', type: 'number', role: 'value', help: 'In time order. The chart streams through them.' }],
    }],
  },
  defaultData: { rows: DEMO.map((value) => ({ value })) },
  defaults: { numSuffix: 'k', animLoop: true },
  text: {
    title: 'Concurrent users, streaming',
    subtitle: 'one new reading every 300ms · window of 50 · click to restart',
    source: 'DYNAMIC DATA · MONO-FANCY4 · LIVE OPS',
  },
  fields: [
    { key: 'window', label: 'Readings in view', group: 'options', section: 'Stream', type: 'number', min: 5, max: 500, step: 1, default: 50 },
    { key: 'every', label: 'New reading every', group: 'options', section: 'Stream', type: 'number', min: 50, max: 5000, step: 10, unit: 'ms', default: 300 },
    { key: 'slide', label: 'Slide time', group: 'options', section: 'Stream', type: 'number', min: 0, max: 5000, step: 10, unit: 'ms', default: 260 },
    { key: 'yMin', label: 'Scale from', group: 'options', section: 'Scale', type: 'number', min: -1e9, max: 1e9, step: 1, default: 20 },
    { key: 'yMax', label: 'Scale to', group: 'options', section: 'Scale', type: 'number', min: -1e9, max: 1e9, step: 1, default: 130 },
    { key: 'autoRange', label: 'Widen the scale to fit the data', group: 'options', section: 'Scale', type: 'boolean', default: true },
    { key: 'smooth', label: 'Line smoothing', group: 'options', section: 'Line', type: 'number', min: 0, max: 1, step: 0.05, default: 0.45 },
    { key: 'lineWidth', label: 'Line width', group: 'options', section: 'Line', type: 'number', min: 0, max: 8, step: 0.1, unit: 'px', default: 2.4 },
    { key: 'areaStrength', label: 'Area shade at the top', group: 'options', section: 'Line', type: 'number', min: 0, max: 1, step: 0.01, default: 0.16 },
    { key: 'badge', label: 'Badge text', group: 'options', section: 'Badge', type: 'text', default: 'LIVE', help: 'Leave empty to hide the badge.' },
    { key: 'measure', label: 'What is measured', group: 'options', section: 'Units', type: 'text', default: 'users', help: 'Tooltip: “64k users”.' },
  ],
  supports: { dataLabels: true },
  paletteNeeds: ['highlight'],
  interactions: ['tooltip'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => {
    const steps = Math.max(0, ctx.rows.length - Math.round(ctx.num('window')));
    return steps ? (steps - 1) * (ctx.num('every') / 1000) + Math.max(0.001, ctx.num('slide') / 1000) : 0.001;
  },
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const vals = ctx.rows.map((r) => Number(r.value));
    const n = vals.length;
    const win = Math.max(2, Math.min(n, Math.round(ctx.num('window'))));
    const left = 14, right = 58, top = 44, bottom = 20;
    const x0 = left, x1 = W - right, y0 = top, y1 = H - bottom;
    const step = (x1 - x0) / (win - 1);
    let lo = ctx.num('yMin'), hi = ctx.num('yMax');
    if (hi <= lo) hi = lo + 1;
    if (ctx.bool('autoRange')) {
      lo = Math.min(lo, ...vals);
      hi = Math.max(hi, ...vals);
    }
    const Y = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
    const { k, frac } = streamAt(n, win, ctx.num('every') / 1000, Math.max(1e-3, ctx.num('slide') / 1000), ctx.time);
    // during a slide the next reading enters from the right while the oldest leaves on the left
    const sliding = frac > 0 && k + win < n;
    const shown = vals.slice(k, k + win + (sliding ? 1 : 0));
    const pts = shown.map((v, j) => [x0 + (j - (sliding ? frac : 0)) * step, Y(v)] as [number, number]);

    const ink = parseColor(T.data) ?? [28, 28, 26, 1];
    const defs = el(s, 'defs', {});
    const grad = el(defs, 'linearGradient', { id: 'g15-area', x1: 0, y1: 0, x2: 0, y2: 1 });
    el(grad, 'stop', { offset: 0, 'stop-color': toHex([ink[0], ink[1], ink[2], 1]), 'stop-opacity': Math.round(ink[3] * ctx.num('areaStrength') * 1000) / 1000 });
    el(grad, 'stop', { offset: 1, 'stop-color': toHex([ink[0], ink[1], ink[2], 1]), 'stop-opacity': 0 });
    let parent = s;
    if (sliding) {
      const clip = el(defs, 'clipPath', { id: 'g15-window' });
      el(clip, 'rect', { x: x0, y: 0, width: x1 - x0, height: H });
      parent = el(s, 'g', { 'clip-path': 'url(#g15-window)' });
    }
    const sm = ctx.num('smooth');
    // the area closes on zero when zero is in view, otherwise on the bottom of the scale
    el(parent, 'path', { d: smoothArea(pts, sm, Y(lo > 0 ? lo : Math.min(0, hi))), fill: 'url(#g15-area)', opacity: 0.7 });
    if (ctx.num('lineWidth') > 0) el(parent, 'path', { d: smoothLine(pts, sm), fill: 'none', stroke: T.data, 'stroke-width': ctx.num('lineWidth') });
    // hover targets: one per visible reading
    const unit = ctx.str('measure');
    pts.forEach(([x], j) => {
      if (x < x0 - 1e-6 || x > x1 + 1e-6) return;
      const g = keyed(el(s, 'g', {}), `pt-${k + j}`);
      tip(g, `${ctx.fmt(shown[j])} ${unit}`.trim());
      el(g, 'rect', { x: x - step / 2, y: y0, width: step, height: y1 - y0, fill: 'transparent', 'data-cs-hit': 1 });
    });
    if (ctx.bool('dataLabels')) {
      const lastIdx = sliding && frac >= 1 ? shown.length - 1 : sliding ? shown.length - 2 : shown.length - 1;
      const [lx, ly] = pts[Math.max(0, lastIdx)];
      const fs = ctx.fs(14);
      txt(s, { x: lx + 8, y: ly + MID * fs, 'font-size': fs, 'font-weight': 800, fill: T.text }, ctx.fmt(shown[Math.max(0, lastIdx)]));
    }
    const badge = ctx.str('badge').trim();
    if (badge) {
      // the badge group's box sits 16 px from the left and 10 px from the top
      el(s, 'circle', { cx: 20, cy: 15, r: 4, fill: pick(T, '#4A4944', T.hero) });
      const fs = ctx.fs(11);
      txt(s, { x: 31, y: 10 + fs / 2 + MID * fs, 'font-size': fs, 'font-weight': 800, fill: T.text }, badge);
    }
  },
});
