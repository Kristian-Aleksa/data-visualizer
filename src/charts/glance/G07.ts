// G07 Scatter Morph — the same items fly between three views every few seconds: a bubble scatter,
// a ranked bar chart and a donut. Between views every mark morphs into its next shape while its
// colour blends, the new axes appear at once and the new labels fade in.

import type { DrawContext } from '../../core/chart';
import { defineChart } from '../../core/define';
import { cubicInOut, cubicOut } from '../../core/ease';
import { measure } from '../../core/text/metrics';
import { el, keyed, tip, txt, type VNode } from '../../core/vnode';
import { d3Isc } from '../shared/notices';
import { axisNumber, categories, circlePath, crisp, MID, roundRect, roundSector, valueAxis } from './plot';
import { blendColor, morphPath, pathBox } from './morph';
import { layoutPieLabels } from './pielabels';
import { gFaint, glanceFrame, rampAt } from './shared';

const P12: [string, number, number, number][] = [
  ['Editor', 12, 9.1, 486], ['Boards', 18, 8.4, 391], ['Forms', 9, 8.8, 274],
  ['Docs', 15, 8.0, 318], ['Chat', 7, 7.2, 182], ['Vault', 24, 7.8, 226],
  ['Flows', 21, 8.6, 352], ['Views', 11, 7.5, 198], ['Sync', 16, 6.9, 141],
  ['Pages', 8, 8.2, 243], ['Grid', 19, 7.1, 167], ['Hub', 13, 6.6, 118],
];
const MONO_L = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];
type View = 'scatter' | 'bars' | 'donut';
const ORDER: View[] = ['scatter', 'bars', 'donut'];

interface Item {
  name: string;
  x: number;
  y: number;
  v: number;
  /** 0 = largest value */
  rank: number;
}

interface Mark {
  d: string;
  /** dots are drawn as circles while still */
  circle?: [number, number, number];
  fill: string;
  opacity: number;
  border: number;
}

interface ViewDraw {
  marks: Mark[];
  /** axes and grid lines (shown at once), donut label lines (fade with the labels) */
  under(g: VNode, a: number): void;
  over(g: VNode, a: number): void;
  tip(i: number): string;
}

/** Mono shades pairs of items (by data order in the scatter, by rank elsewhere). */
function colourOf(ctx: DrawContext, items: Item[], i: number, view: View): string {
  const T = ctx.theme;
  if (T.kind === 'mono') return MONO_L[Math.min(5, Math.floor((view === 'scatter' ? i : items[i].rank) / 2))];
  return rampAt(T, items[i].rank, items.length);
}

const fade = (a: number) => (a < 1 ? { opacity: Math.round(a * 1000) / 1000 } : {});

function scatterView(ctx: DrawContext, items: Item[], grow: number): ViewDraw {
  const { theme: T, w: W, h: H } = ctx;
  const showAxes = ctx.bool('showAxes');
  const xName = ctx.str('xName').trim(), yName = ctx.str('yName').trim();
  const nameFs = ctx.fs(ctx.num('axisNameSize'));
  const x0 = ctx.num('gridLeft'), y0 = ctx.num('gridTop'), y1 = H - ctx.num('gridBottom');
  const x1 = W - (xName && showAxes ? Math.max(ctx.num('gridRight'), 15 + measure(xName, nameFs, 400) + 6) : ctx.num('gridRight'));
  const xs = items.map((d) => d.x), ys = items.map((d) => d.y);
  const fixed = (a: number, b: number) => ({ min: Math.min(a, b), max: Math.max(a, b) });
  const ax = ctx.bool('autoRange') ? valueAxis(Math.min(...xs), Math.max(...xs), { scale: true }) : valueAxis(0, 0, fixed(ctx.num('xMin'), ctx.num('xMax')));
  const ay = ctx.bool('autoRange') ? valueAxis(Math.min(...ys), Math.max(...ys), { scale: true }) : valueAxis(0, 0, fixed(ctx.num('yMin'), ctx.num('yMax')));
  const X = (v: number) => x0 + ((v - ax.min) / (ax.max - ax.min || 1)) * (x1 - x0);
  const Y = (v: number) => y1 - ((v - ay.min) / (ay.max - ay.min || 1)) * (y1 - y0);
  const op = ctx.num('dotOpacity');
  const marks: Mark[] = items.map((d, i) => {
    const cx = X(d.x), cy = Y(d.y), r = ((Math.sqrt(d.v) * ctx.num('dotScale')) / 2) * grow;
    return { d: circlePath(cx, cy, r), circle: [cx, cy, r], fill: colourOf(ctx, items, i, 'scatter'), opacity: op, border: 0 };
  });
  return {
    marks,
    under(g) {
      if (ctx.bool('showGrid')) {
        for (const t of ay.ticks) el(g, 'path', { d: `M${x0} ${crisp(Y(t))}L${x1} ${crisp(Y(t))}`, fill: 'none', stroke: T.grid });
        for (const t of ax.ticks) el(g, 'path', { d: `M${crisp(X(t))} ${y0}L${crisp(X(t))} ${y1}`, fill: 'none', stroke: T.grid });
      }
      if (!showAxes) return;
      if (yName) txt(g, { x: x0, y: y0 - 15 - nameFs / 2 + MID * nameFs, 'font-size': nameFs, fill: gFaint(T), 'text-anchor': 'middle' }, yName);
      if (xName) txt(g, { x: x1 + 15, y: y1 + MID * nameFs, 'font-size': nameFs, fill: gFaint(T) }, xName);
      const fs = ctx.fs(ctx.num('axisTextSize'));
      for (const t of ay.ticks) txt(g, { x: x0 - 8, y: Y(t) + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': 'end' }, axisNumber(t));
      for (const t of ax.ticks) txt(g, { x: X(t), y: y1 + 8 + fs / 2 + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': 'middle' }, axisNumber(t));
    },
    over(g, a) {
      if (!ctx.bool('dataLabels') || a <= 0) return;
      const fs = ctx.fs(ctx.num('pointLabelSize'));
      marks.forEach((m, i) => {
        const [cx, cy, r] = m.circle!;
        txt(g, {
          x: cx, y: cy - r - ctx.num('pointLabelDistance') - fs / 2 + MID * fs, 'font-size': fs, fill: T.muted, 'fill-opacity': op,
          'text-anchor': 'middle', 'data-cs-rel': `item-${i}`, ...fade(a),
        }, items[i].name);
      });
    },
    tip: (i) => `${items[i].name} — ${ctx.fmt(items[i].v)} · ${xName || 'x'} ${axisNumber(items[i].x)} · ${yName || 'y'} ${axisNumber(items[i].y)}`,
  };
}

function barsView(ctx: DrawContext, items: Item[], grow: number): ViewDraw {
  const { theme: T, w: W, h: H } = ctx;
  const x0 = ctx.num('gridLeft'), x1 = W - ctx.num('gridRight'), y0 = ctx.num('gridTop'), y1 = H - ctx.num('barGridBottom');
  const vmax = Math.max(0, ...items.map((d) => d.v));
  const ay = ctx.bool('autoBarMax') ? valueAxis(0, vmax) : valueAxis(0, vmax, { max: Math.max(1e-9, ctx.num('barMax')) });
  const Y = (v: number) => y1 - ((v - ay.min) / (ay.max - ay.min || 1)) * (y1 - y0);
  const cat = categories(items.length, x0, x1 - x0);
  const bw = cat.band * (1 - ctx.num('barGap') / 100);
  const rad = ctx.num('barRadius');
  const base = Y(Math.max(ay.min, 0));
  const marks: Mark[] = items.map((d, i) => {
    const h = (base - Y(d.v)) * grow;
    return { d: roundRect(cat.at(d.rank) - bw / 2, base - h, bw, h, [rad, rad, 0, 0]), fill: colourOf(ctx, items, i, 'bars'), opacity: 1, border: 0 };
  });
  return {
    marks,
    under(g) {
      if (ctx.bool('showGrid')) for (const t of ay.ticks) el(g, 'path', { d: `M${x0} ${crisp(Y(t))}L${x1} ${crisp(Y(t))}`, fill: 'none', stroke: T.grid });
      if (ctx.bool('showAxes')) {
        const fs = ctx.fs(ctx.num('axisTextSize'));
        for (const t of ay.ticks) txt(g, { x: x0 - 8, y: Y(t) + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': 'end' }, axisNumber(t));
      }
      if (ctx.bool('categoryLabels')) {
        const fs = ctx.fs(ctx.num('categoryTextSize'));
        const rot = ctx.num('labelRotate');
        items.forEach((d, i) => {
          const x = cat.at(d.rank), y = y1 + 8;
          if (!rot) txt(g, { x, y: y + fs / 2 + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': 'middle', 'data-cs-rel': `item-${i}` }, d.name);
          else txt(g, { x, y: y + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': rot > 0 ? 'end' : 'start', transform: `rotate(${-rot} ${x} ${y})`, 'data-cs-rel': `item-${i}` }, d.name);
        });
      }
    },
    over() {},
    tip: (i) => `${items[i].name} — ${ctx.fmt(items[i].v)}`,
  };
}

function donutView(ctx: DrawContext, items: Item[], grow: number): ViewDraw {
  const { theme: T, w: W, h: H } = ctx;
  const cx = W / 2, cy = H / 2, half = Math.min(W, H) / 2;
  const r = (Math.max(ctx.num('innerRadius'), ctx.num('outerRadius')) / 100) * half;
  const r0 = (Math.min(ctx.num('innerRadius'), ctx.num('outerRadius')) / 100) * half;
  const byRank = items.map((_, i) => i).sort((a, b) => items[a].rank - items[b].rank);
  const sum = items.reduce((s, d) => s + d.v, 0);
  // slices start at the top and run clockwise
  const start = Math.PI * 1.5;
  const angles: [number, number][] = [];
  let a = start;
  for (const i of byRank) {
    const span = sum > 0 ? (items[i].v / sum) * Math.PI * 2 : (Math.PI * 2) / items.length;
    angles[i] = [a, a + span];
    a += span;
  }
  const sweepEnd = start + grow * Math.PI * 2;
  const shape = (s: number, e: number) =>
    e - s > 1e-9 ? roundSector({ cx, cy, r0, r, startAngle: s, endAngle: e, clockwise: true, cornerRadius: ctx.num('sliceRounding') }) : '';
  const marks: Mark[] = items.map((_, i) => {
    const [s, e] = angles[i];
    const e2 = Math.min(e, sweepEnd);
    return { d: shape(Math.min(s, e2), e2), fill: colourOf(ctx, items, i, 'donut'), opacity: 1, border: ctx.num('sliceBorder') };
  });
  const fs = ctx.fs(ctx.num('sliceLabelSize'));
  const labels = ctx.bool('dataLabels')
    ? layoutPieLabels(byRank.map((i) => {
      const box = pathBox(shape(angles[i][0], angles[i][1]));
      return { text: items[i].name, width: measure(items[i].name, fs, 400), startAngle: angles[i][0], endAngle: angles[i][1], priority: box.w * box.h };
    }), {
      cx, cy, r, len: ctx.num('lineLength1'), len2: ctx.num('lineLength2'), gap: ctx.num('labelGap'), lineHeight: fs * 1.25,
      view: { x: 0, y: 0, w: W, h: H }, measure: (s) => measure(s, fs, 400),
    })
    : [];
  return {
    marks,
    under(g, alpha) {
      if (alpha <= 0) return;
      labels.forEach((l, k) => {
        if (l.hidden) return;
        const p = l.points.map(([x, y]) => `${Math.round(x * 1e4) / 1e4} ${Math.round(y * 1e4) / 1e4}`);
        el(g, 'path', { d: `M${p[0]}L${p[1]}L${p[2]}`, fill: 'none', stroke: gFaint(T), 'data-cs-rel': `item-${byRank[k]}`, ...fade(alpha) });
      });
    },
    over(g, alpha) {
      if (alpha <= 0) return;
      labels.forEach((l, k) => {
        if (l.hidden) return;
        txt(g, {
          x: l.x, y: l.y + MID * fs, 'font-size': fs, fill: T.label, 'text-anchor': l.align === 'left' ? 'start' : 'end',
          'data-cs-rel': `item-${byRank[k]}`, ...fade(alpha),
        }, l.text);
      });
    },
    tip: (i) => `${items[i].name} — ${ctx.fmt(items[i].v)}${sum > 0 ? ` · ${Math.round((items[i].v / sum) * 1000) / 10}%` : ''}`,
  };
}

/** Where the cycle is: entering, morphing from one view to the next, or holding. */
function phase(ctx: DrawContext, seq: View[]) {
  if (ctx.time === Infinity) return { to: seq[0], from: null as View | null, p: 1, grow: 1, labels: 1 };
  const I = Math.max(0.2, ctx.num('interval'));
  const M = Math.max(0, Math.min(ctx.num('morphTime'), I));
  const loop = ctx.s.animLoop === true;
  const t = Math.max(0, ctx.time);
  const k = Math.min(loop ? 2 : 3, Math.floor(t / I));
  const local = t - k * I;
  const to = seq[k % 3];
  if (k === 0 && !loop) {
    // first appearance grows in over 1 s; a looping cycle morphs in instead
    const e = (ctx.ease ?? cubicOut)(Math.min(1, local / Math.min(1, I)));
    return { to, from: null as View | null, p: 1, grow: e, labels: e };
  }
  const raw = M > 0 ? Math.min(1, local / M) : 1;
  return { to, from: seq[(k + 2) % 3] as View | null, p: (ctx.ease ?? cubicInOut)(raw), grow: 1, labels: Math.max(0, Math.min(1, raw * 2 - 1)) };
}

export default defineChart({
  id: 'G07',
  name: 'Scatter Morph',
  family: 'glance',
  kinds: ['scatter', 'bars', 'part-to-whole'],
  description: 'One dataset, three views: the same items fly from a bubble scatter to ranked bars to a donut.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  notices: [d3Isc('d3-shape and d3-path')],
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 60,
      columns: [
        { key: 'name', label: 'Name', type: 'text', role: 'label' },
        { key: 'x', label: 'X (scatter)', type: 'number', role: 'x', help: 'Across, in the scatter view (the demo: price in $).' },
        { key: 'y', label: 'Y (scatter)', type: 'number', role: 'y', help: 'Up, in the scatter view (the demo: CSAT).' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0, help: 'Dot size, bar height and slice size.' },
      ],
    }],
  },
  defaultData: { rows: P12.map(([name, x, y, value]) => ({ name, x, y, value })) },
  defaults: { animLoop: true },
  text: {
    title: 'One dataset, three views',
    subtitle: 'watch the same 12 products fly between views · every 3s',
    source: 'SCATTER MORPH · MONO-FANCY · COHORTS',
  },
  fields: [
    {
      key: 'stillView', label: 'Still frame shows', group: 'options', section: 'Views', type: 'select', default: 'scatter',
      options: [{ value: 'scatter', label: 'Scatter' }, { value: 'bars', label: 'Bars' }, { value: 'donut', label: 'Donut' }],
      help: 'Also where the cycle starts and ends (SVG exports show this view).',
    },
    { key: 'interval', label: 'Time per view', group: 'options', section: 'Views', type: 'number', min: 0.5, max: 20, step: 0.1, unit: 's', default: 3 },
    { key: 'morphTime', label: 'Morph time', group: 'options', section: 'Views', type: 'number', min: 0, max: 10, step: 0.05, unit: 's', default: 1.1 },
    { key: 'autoRange', label: 'Automatic axis ranges', group: 'options', section: 'Scatter', type: 'boolean', default: false },
    { key: 'xMin', label: 'X from', group: 'options', section: 'Scatter', type: 'number', min: -1e9, max: 1e9, step: 0.1, default: 5, when: (s) => s.autoRange !== true },
    { key: 'xMax', label: 'X to', group: 'options', section: 'Scatter', type: 'number', min: -1e9, max: 1e9, step: 0.1, default: 26, when: (s) => s.autoRange !== true },
    { key: 'yMin', label: 'Y from', group: 'options', section: 'Scatter', type: 'number', min: -1e9, max: 1e9, step: 0.1, default: 6, when: (s) => s.autoRange !== true },
    { key: 'yMax', label: 'Y to', group: 'options', section: 'Scatter', type: 'number', min: -1e9, max: 1e9, step: 0.1, default: 9.6, when: (s) => s.autoRange !== true },
    { key: 'xName', label: 'X axis name', group: 'options', section: 'Scatter', type: 'text', default: 'PRICE $' },
    { key: 'yName', label: 'Y axis name', group: 'options', section: 'Scatter', type: 'text', default: 'CSAT' },
    { key: 'dotScale', label: 'Dot size per √value', group: 'options', section: 'Scatter', type: 'number', min: 0, max: 10, step: 0.05, default: 1.35, help: 'Diameter = √value × this.' },
    { key: 'dotOpacity', label: 'Dot opacity', group: 'options', section: 'Scatter', type: 'number', min: 0, max: 1, step: 0.01, default: 0.8 },
    { key: 'pointLabelDistance', label: 'Name above dot', group: 'options', section: 'Scatter', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 5 },
    { key: 'autoBarMax', label: 'Automatic bar scale', group: 'options', section: 'Bars', type: 'boolean', default: false },
    { key: 'barMax', label: 'Bar scale top', group: 'options', section: 'Bars', type: 'number', min: 0, max: 1e9, step: 1, default: 520, when: (s) => s.autoBarMax !== true },
    { key: 'barGap', label: 'Gap between bars', group: 'options', section: 'Bars', type: 'number', min: 0, max: 95, step: 1, unit: '% of slot', default: 32 },
    { key: 'barRadius', label: 'Bar rounding', group: 'options', section: 'Bars', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 6 },
    { key: 'labelRotate', label: 'Name tilt', group: 'options', section: 'Bars', type: 'number', min: -90, max: 90, step: 1, unit: '°', default: 38 },
    { key: 'innerRadius', label: 'Hole size', group: 'options', section: 'Donut', type: 'number', min: 0, max: 100, step: 1, unit: '%', default: 26 },
    { key: 'outerRadius', label: 'Donut size', group: 'options', section: 'Donut', type: 'number', min: 1, max: 100, step: 1, unit: '%', default: 72, help: 'Both as % of half the shorter side.' },
    { key: 'sliceRounding', label: 'Slice rounding', group: 'options', section: 'Donut', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 6 },
    { key: 'sliceBorder', label: 'Gap between slices', group: 'options', section: 'Donut', type: 'number', min: 0, max: 10, step: 0.5, unit: 'px', default: 2 },
    { key: 'lineLength1', label: 'Label line, first part', group: 'options', section: 'Donut', type: 'number', min: 0, max: 80, step: 1, unit: 'px', default: 15 },
    { key: 'lineLength2', label: 'Label line, second part', group: 'options', section: 'Donut', type: 'number', min: 0, max: 120, step: 1, unit: 'px', default: 30 },
    { key: 'labelGap', label: 'Gap before label', group: 'options', section: 'Donut', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 5 },
    { key: 'axisTextSize', label: 'Axis numbers', group: 'options', section: 'Text sizes', type: 'number', min: 5, max: 24, step: 0.5, unit: 'px', default: 9.5 },
    { key: 'axisNameSize', label: 'Axis names', group: 'options', section: 'Text sizes', type: 'number', min: 5, max: 24, step: 0.5, unit: 'px', default: 8.5 },
    { key: 'pointLabelSize', label: 'Scatter names', group: 'options', section: 'Text sizes', type: 'number', min: 5, max: 24, step: 0.5, unit: 'px', default: 8.5 },
    { key: 'categoryTextSize', label: 'Bar names', group: 'options', section: 'Text sizes', type: 'number', min: 5, max: 24, step: 0.5, unit: 'px', default: 8.5 },
    { key: 'sliceLabelSize', label: 'Donut names', group: 'options', section: 'Text sizes', type: 'number', min: 5, max: 24, step: 0.5, unit: 'px', default: 9 },
    { key: 'gridLeft', label: 'Plot left', group: 'options', section: 'Layout', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 38 },
    { key: 'gridRight', label: 'Plot right', group: 'options', section: 'Layout', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 16 },
    { key: 'gridTop', label: 'Plot top', group: 'options', section: 'Layout', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 30 },
    { key: 'gridBottom', label: 'Plot bottom (scatter)', group: 'options', section: 'Layout', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 30 },
    { key: 'barGridBottom', label: 'Plot bottom (bars)', group: 'options', section: 'Layout', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 44, help: 'Room for the tilted names.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, axes: true, grid: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => {
    const I = Math.max(0.2, ctx.num('interval')), M = Math.max(0, Math.min(ctx.num('morphTime'), I));
    return ctx.s.animLoop === true ? 3 * I : 3 * I + M;
  },
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const items: Item[] = ctx.rows.map((r) => ({ name: String(r.name), x: Number(r.x), y: Number(r.y), v: Math.max(0, Number(r.value) || 0), rank: 0 }));
    items.map((_, i) => i).sort((a, b) => items[b].v - items[a].v).forEach((i, k) => (items[i].rank = k));
    const still = (ORDER.includes(ctx.str('stillView') as View) ? ctx.str('stillView') : 'scatter') as View;
    const at = ORDER.indexOf(still);
    const seq: View[] = [still, ORDER[(at + 1) % 3], ORDER[(at + 2) % 3]];
    const ph = phase(ctx, seq);
    const make = (v: View, grow: number) => (v === 'scatter' ? scatterView : v === 'bars' ? barsView : donutView)(ctx, items, grow);
    const to = make(ph.to, ph.grow);
    const from = ph.from && ph.p < 1 ? make(ph.from, 1) : null;
    to.under(el(s, 'g', {}), ph.labels);
    const marks = el(s, 'g', {});
    items.forEach((_, i) => {
      const g = keyed(el(marks, 'g', {}), `item-${i}`);
      tip(g, to.tip(i));
      const m = to.marks[i];
      if (from) {
        const a = from.marks[i], t = ph.p;
        const border = a.border + (m.border - a.border) * t;
        el(g, 'path', {
          d: morphPath(a.d, m.d, t), fill: blendColor(a.fill, m.fill, t), 'fill-opacity': Math.round((a.opacity + (m.opacity - a.opacity) * t) * 1000) / 1000,
          ...(border > 0 ? { stroke: T.bg, 'stroke-width': Math.round(border * 1000) / 1000, 'stroke-linejoin': 'round' } : {}),
        });
      } else if (m.circle) {
        if (m.circle[2] > 0) el(g, 'circle', { cx: m.circle[0], cy: m.circle[1], r: m.circle[2], fill: m.fill, 'fill-opacity': m.opacity });
      } else if (m.d) {
        el(g, 'path', { d: m.d, fill: m.fill, ...(m.opacity < 1 ? { 'fill-opacity': m.opacity } : {}), ...(m.border > 0 ? { stroke: T.bg, 'stroke-width': m.border, 'stroke-linejoin': 'round' } : {}) });
      }
    });
    to.over(el(s, 'g', {}), ph.labels);
  },
});
