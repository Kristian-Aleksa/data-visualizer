// G08 Diverging Bar — gains to the right of a dashed zero line, losses to the left; each bar's
// outer end is rounded and its signed value sits just beyond it, over round axis ticks.

import { defineChart } from '../../core/define';
import { quarticOut } from '../../core/ease';
import { pick } from '../../core/theme';
import { el, hit, keyed, tip, txt } from '../../core/vnode';
import { categories, crisp, MID, progress, roundRect, valueAxis } from './plot';
import { glanceFrame, hi } from './shared';

const DEMO: [string, number][] = [
  ['Enterprise', 86], ['Team', 54], ['Pro', 31], ['Starter', 12],
  ['Legacy Basic', -18], ['Trial expired', -42], ['Free dormant', -67],
];
const DUR = 0.9;
const STAGGER = 0.08;

export default defineChart({
  id: 'G08',
  name: 'Diverging Bar',
  family: 'glance',
  kinds: ['bars', 'comparison'],
  description: 'Gains right of a zero line, losses left: rounded bars with signed values.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 20,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', help: 'Positive values grow right, negative ones left.' },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, value]) => ({ label, value })) },
  text: {
    title: 'Where we gained, where we bled',
    subtitle: 'net accounts per segment · Q2 2026 · churn left, growth right',
    source: 'DIVERGING BAR · MONO-FANCY2 · CRM',
  },
  fields: [
    { key: 'barThickness', label: 'Bar thickness', group: 'options', section: 'Bars', type: 'number', min: 2, max: 60, step: 0.5, unit: 'px', default: 16 },
    { key: 'endRadius', label: 'End rounding', group: 'options', section: 'Bars', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 9, help: 'Capped at half the thickness.' },
    { key: 'labelDistance', label: 'Value label distance', group: 'options', section: 'Bars', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 5 },
    { key: 'valueSize', label: 'Value label size', group: 'options', section: 'Bars', type: 'number', min: 6, max: 24, step: 0.5, unit: 'px', default: 11 },
    { key: 'labelColumn', label: 'Label column width', group: 'options', section: 'Layout', type: 'number', min: 20, max: 300, step: 1, unit: 'px', default: 96 },
    { key: 'rightMargin', label: 'Right margin', group: 'options', section: 'Layout', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 52, help: 'Room for the value labels.' },
    { key: 'axisSize', label: 'Category label size', group: 'options', section: 'Layout', type: 'number', min: 6, max: 20, step: 0.5, unit: 'px', default: 9.5 },
    { key: 'splitNumber', label: 'About this many grid steps', group: 'options', section: 'Grid', type: 'number', min: 1, max: 12, step: 1, default: 5, help: 'Grid lines land on round numbers, so the count can differ a little.' },
    { key: 'zeroWidth', label: 'Zero line width', group: 'options', section: 'Grid', type: 'number', min: 0, max: 5, step: 0.1, unit: 'px', default: 1.5 },
    { key: 'zeroDashed', label: 'Dashed zero line', group: 'options', section: 'Grid', type: 'boolean', default: true },
    {
      key: 'sort', label: 'Order', group: 'options', section: 'Order', type: 'select', default: 'none',
      options: [{ value: 'none', label: 'As in the data' }, { value: 'desc', label: 'Largest gain first' }, { value: 'asc', label: 'Largest loss first' }],
    },
    { key: 'measure', label: 'What is counted', group: 'options', section: 'Units', type: 'text', default: 'accounts', help: 'Shown in tooltips after the value.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, grid: true, hover: true },
  paletteNeeds: ['highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => DUR + Math.max(0, ctx.rows.length - 1) * STAGGER * ctx.stagger,
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), v: Number(r.value) }));
    const sort = ctx.str('sort');
    if (sort === 'desc') rows.sort((a, b) => b.v - a.v);
    else if (sort === 'asc') rows.sort((a, b) => a.v - b.v);
    const n = rows.length;
    const left = ctx.num('labelColumn'), right = ctx.num('rightMargin'), top = 8, bottom = 8;
    const x0 = left, x1 = Math.max(left + 10, W - right), y0 = top, y1 = H - bottom;
    const axis = valueAxis(Math.min(...rows.map((r) => r.v)), Math.max(...rows.map((r) => r.v)), { splitNumber: Math.round(ctx.num('splitNumber')) });
    const X = (v: number) => x0 + ((v - axis.min) / (axis.max - axis.min)) * (x1 - x0);
    const zero = X(0);
    if (ctx.bool('showGrid')) {
      for (const t of axis.ticks) {
        const x = crisp(X(t), 1);
        el(s, 'line', { x1: x, y1: y0, x2: x, y2: y1, stroke: T.grid, 'stroke-width': 1, class: 'fade', style: 'animation-duration:.4s' });
      }
    }
    const cat = categories(n, y0, y1 - y0);
    const axisFs = ctx.fs(ctx.num('axisSize'));
    if (ctx.bool('categoryLabels')) {
      rows.forEach((r, i) => {
        txt(s, { x: x0 - 8, y: cat.at(i) + MID * axisFs, 'font-size': axisFs, 'font-weight': 600, fill: T.label, 'text-anchor': 'end', class: 'fade', style: 'animation-duration:.4s' }, r.name);
      });
    }
    const thick = Math.min(ctx.num('barThickness'), cat.band);
    const rad = ctx.num('endRadius');
    const maxGain = Math.max(...rows.map((r) => r.v));
    const vfs = ctx.fs(ctx.num('valueSize'));
    const dist = ctx.num('labelDistance');
    const unit = ctx.str('measure');
    rows.forEach(({ name, v }, i) => {
      const e = progress(ctx, i * STAGGER, DUR, quarticOut);
      const cy = cat.at(i), w = (X(v) - zero) * e;
      const g = keyed(el(s, 'g', {}), `bar-${i}`);
      tip(g, `${name} — ${v > 0 ? '+' : ''}${ctx.fmt(v)} ${unit}`.trim());
      const fill = v > 0 ? (v === maxGain ? hi(T, T.data) : T.data) : pick(T, '#B0AFA9', T.data2);
      if (Math.abs(w) > 0.01) el(g, 'path', { d: roundRect(zero, cy - thick / 2, w, thick, v > 0 ? [0, rad, rad, 0] : [rad, 0, 0, rad]), fill });
      if (ctx.bool('dataLabels')) {
        txt(g, {
          x: zero + w + (v < 0 ? -dist : dist), y: cy + MID * vfs, 'font-size': vfs, 'font-weight': 700, fill: T.text,
          'text-anchor': v < 0 ? 'end' : 'start', opacity: e > 0 ? 1 : 0,
        }, (v > 0 ? '+' : v < 0 ? '-' : '') + ctx.fmt(Math.abs(v)));
      }
      hit(g, 0, cy - cat.band / 2, W, cat.band);
    });
    const zw = ctx.num('zeroWidth');
    if (zw > 0) {
      const x = crisp(zero, zw);
      el(s, 'line', {
        x1: x, y1: y0, x2: x, y2: y1, stroke: T.muted, 'stroke-width': zw, 'stroke-dasharray': ctx.bool('zeroDashed') ? `${4 * zw} ${2 * zw}` : undefined,
        class: 'fade', style: 'animation-duration:.4s',
      });
    }
  },
});
