// B15 Tick Box — a box plot: hairline whiskers with caps, a capsule box for the middle half, a
// paper tick for the median and hollow dots for outliers. Boxes are shaded so the fastest is
// darkest.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, type Theme } from '../../core/theme';
import type { ChartData, Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { captionLine, categoryLabel, laterInk, laterShades4, plain } from './shared';

interface Box {
  name: string;
  mn: number;
  q1: number;
  md: number;
  q3: number;
  mx: number;
  outs: number[];
}

const DEMO: [string, number[], number[]][] = [
  ['ENT', [0.4, 0.9, 1.5, 2.6, 4.4], [6.2]],
  ['PRO', [0.8, 2.1, 3.3, 5, 7.8], [10.5]],
  ['STARTER', [1.5, 3.8, 6.1, 8.9, 13.2], [16.8]],
  ['FREE', [2.2, 6, 9.4, 13.8, 19.6], [22.1, 23.5]],
];

/** Quartile by linear interpolation (the common "type 7" rule, as in spreadsheets). */
function quantile(sorted: number[], p: number): number {
  const h = (sorted.length - 1) * p, lo = Math.floor(h);
  return sorted[lo] + (sorted[Math.min(sorted.length - 1, lo + 1)] - sorted[lo]) * (h - lo);
}

function boxesOf(data: ChartData, s: Settings): Box[] {
  if (s.dataMode === 'raw') {
    const groups = new Map<string, number[]>();
    for (const r of data.samples ?? []) {
      const v = Number(r.value);
      if (!Number.isFinite(v)) continue;
      const k = String(r.group ?? '').trim();
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(v);
    }
    return [...groups].map(([name, vals]) => {
      const v = vals.sort((a, b) => a - b);
      const q1 = quantile(v, 0.25), md = quantile(v, 0.5), q3 = quantile(v, 0.75), f = 1.5 * (q3 - q1);
      const inside = v.filter((x) => x >= q1 - f && x <= q3 + f);
      return { name, mn: inside[0] ?? q1, q1, md, q3, mx: inside[inside.length - 1] ?? q3, outs: v.filter((x) => x < q1 - f || x > q3 + f) };
    });
  }
  return (data.boxes ?? []).map((r) => {
    const nums = ['min', 'q1', 'median', 'q3', 'max'].map((k) => Number(r[k]));
    const [mn, q1, md, q3, mx] = [...nums].sort((a, b) => a - b);
    const outs = String(r.outliers ?? '').split(/[,;\s]+/).map((x) => parseFloat(x)).filter((x) => Number.isFinite(x));
    return { name: String(r.label), mn, q1, md, q3, mx, outs };
  });
}

const autoCaption = (s: Settings, T: Theme) =>
  T.heroMode && s.highlightSlowest !== 'off'
    ? 'BOX = MIDDLE HALF · PAPER TICK = MEDIAN · RED = THE SLOWEST PLAN · DARKEST = FASTEST'
    : 'BOX = MIDDLE HALF · PAPER TICK = MEDIAN · HOLLOW = OUTLIER · DARKEST = FASTEST';

export default defineChart({
  id: 'B15',
  name: 'Tick Box',
  family: 'basics',
  kinds: ['distribution'],
  description: 'A box plot with capsule boxes, a paper median tick and hollow outliers.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [
      {
        key: 'boxes',
        label: 'Summaries',
        minRows: 0,
        maxRows: 8,
        columns: [
          { key: 'label', label: 'Label', type: 'text', role: 'label' },
          { key: 'min', label: 'Min', type: 'number', role: 'value', help: 'End of the lower whisker.' },
          { key: 'q1', label: 'Q1', type: 'number', role: 'value' },
          { key: 'median', label: 'Median', type: 'number', role: 'value' },
          { key: 'q3', label: 'Q3', type: 'number', role: 'value' },
          { key: 'max', label: 'Max', type: 'number', role: 'value', help: 'End of the upper whisker.' },
          { key: 'outliers', label: 'Outliers', type: 'text', required: false, help: 'Optional, separated by commas: 22.1, 23.5' },
        ],
      },
      {
        key: 'samples',
        label: 'Raw samples',
        minRows: 0,
        maxRows: 20000,
        columns: [
          { key: 'group', label: 'Group', type: 'text', role: 'category' },
          { key: 'value', label: 'Value', type: 'number', role: 'value' },
        ],
      },
    ],
  },
  defaultData: {
    boxes: DEMO.map(([label, [min, q1, median, q3, max], outs]) => ({ label, min, q1, median, q3, max, outliers: outs.join(', ') })),
    samples: [],
  },
  text: {
    title: 'Reply times, boxed by plan',
    subtitle: 'box = the middle half of tickets · paper tick = median · hollow dot = an outlier nobody enjoyed',
    source: 'TICK BOX · MONO-BASIC · SUPPORT DESK',
  },
  fields: [
    {
      key: 'dataMode', label: 'Data is', group: 'options', section: 'Data', type: 'select', default: 'summary',
      options: [{ value: 'summary', label: 'Five-number summaries' }, { value: 'raw', label: 'Raw samples (worked out for you)' }],
      help: 'Raw samples: whiskers reach the furthest points within 1.5 × the box; the rest are outliers.',
    },
    { key: 'yMax', label: 'Scale top', group: 'options', section: 'Scale', type: 'number', min: 0.1, max: 1e6, step: 1, default: 24 },
    { key: 'gridStep', label: 'Grid line every', group: 'options', section: 'Scale', type: 'number', min: 0.1, max: 1e6, step: 1, default: 6 },
    { key: 'autoRange', label: 'Raise the top to fit the data', group: 'options', section: 'Scale', type: 'boolean', default: true },
    { key: 'axisUnit', label: 'Unit', group: 'options', section: 'Scale', type: 'text', default: 'h' },
    { key: 'boxWidth', label: 'Box width', group: 'options', section: 'Boxes', type: 'number', min: 4, max: 70, step: 0.5, unit: 'px', default: 24 },
    { key: 'boxRadius', label: 'Corner radius', group: 'options', section: 'Boxes', type: 'number', min: 0, max: 35, step: 0.5, unit: 'px', default: 9 },
    { key: 'capWidth', label: 'Whisker cap width', group: 'options', section: 'Boxes', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 14 },
    { key: 'boxSpacing', label: 'Box spacing', group: 'options', section: 'Boxes', type: 'number', min: 30, max: 160, step: 1, unit: 'px', default: 84 },
    { key: 'outlierJitter', label: 'Outlier spread', group: 'options', section: 'Boxes', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 8 },
    { key: 'outlierRadius', label: 'Outlier size', group: 'options', section: 'Boxes', type: 'number', min: 0.5, max: 8, step: 0.1, unit: 'px', default: 2.6 },
    {
      key: 'shadeBy', label: 'Darkest box', group: 'options', section: 'Shading', type: 'select', default: 'median',
      options: [{ value: 'median', label: 'The lowest median' }, { value: 'order', label: 'The first row' }],
    },
    {
      key: 'highlightSlowest', label: 'Accent the slowest', group: 'options', section: 'Shading', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }],
      help: 'Wire writes the slowest median in its highlight colour.',
    },
    { key: 'measure', label: 'What is measured', group: 'options', section: 'Units', type: 'text', default: 'tickets answered', help: 'Tooltip: “half of tickets answered in 0.9–2.6h”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, T),
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  validate(data, s) {
    const key = s.dataMode === 'raw' ? 'samples' : 'boxes';
    return (data[key] ?? []).length ? [] : [{ table: key, fatal: true, message: key === 'boxes' ? 'This chart needs at least 1 row of summaries.' : 'Add some samples to the Raw samples table (or switch “Data is” back to summaries).' }];
  },
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const G = boxesOf(ctx.data, ctx.s);
    const n = G.length;
    const TOP = 42, BASE = 260;
    const step = Math.max(1e-9, ctx.num('gridStep'));
    let MAXH = ctx.num('yMax');
    if (ctx.bool('autoRange')) {
      const hi = Math.max(...G.flatMap((b) => [b.mx, ...b.outs]));
      if (hi > MAXH) MAXH = Math.ceil(hi / step) * step;
    }
    const mapY = (v: number) => BASE - (v / MAXH) * (BASE - TOP);
    let sp = ctx.num('boxSpacing');
    if ((n - 1) * sp > 300) sp = 300 / Math.max(1, n - 1);
    const colX = (g: number) => 204 + (g - (n - 1) / 2) * sp;
    const BW = ctx.num('boxWidth');
    const sw = (w: number) => w * boost(T, 1, 1.8);
    const ink = laterInk(T);
    const shades = laterShades4(T);
    const palm = T.id === 'palm';
    const u = ctx.str('axisUnit');
    for (let h = 0, k = 0; h <= MAXH + 1e-9 && k < 60; h += step, k++) {
      el(s, 'line', { x1: 36, y1: mapY(h), x2: 378, y2: mapY(h), stroke: T.track, 'stroke-width': sw(0.8), class: 'fade', style: `animation-delay:${h * 0.008}s` });
      if (ctx.bool('categoryLabels')) {
        txt(s, { x: 30, y: mapY(h) + 3, 'font-size': ctx.fs(7.5), 'font-weight': 600, fill: T.muted, 'text-anchor': 'end', class: 'fade', style: `animation-delay:${h * 0.008}s` }, plain(Math.round(h * 1000) / 1000) + u);
      }
    }
    // darkest = fastest: shade by median rank (or by row order)
    const order = ctx.str('shadeBy') === 'order' ? G.map((_, i) => i) : G.map((b, i) => [b.md, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[1]);
    const rankOf = G.map((_, i) => order.indexOf(i));
    const slowest = rankOf.indexOf(n - 1);
    const accentSlow = ctx.str('highlightSlowest') === 'on' || (ctx.str('highlightSlowest') === 'auto' && T.heroMode);
    const cap = ctx.num('capWidth') / 2;
    G.forEach(({ name, mn, q1, md, q3, mx, outs }, g) => {
      const x = colX(g);
      const shade = shades[Math.min(shades.length - 1, rankOf[g])];
      const whisker = palm ? shade : T.data2;
      const grp = keyed(el(s, 'g', {}), `box-${g}`);
      el(grp, 'line', { x1: x, y1: mapY(mn), x2: x, y2: mapY(mx), stroke: whisker, 'stroke-width': sw(0.8), class: 'draw', style: `animation-delay:${g * 0.12}s;animation-duration:.6s` });
      for (const vv of [mn, mx]) {
        el(grp, 'line', { x1: x - cap, y1: mapY(vv), x2: x + cap, y2: mapY(vv), stroke: whisker, 'stroke-width': sw(1), class: 'fade', style: `animation-delay:${0.2 + g * 0.12}s` });
      }
      const box = el(grp, 'rect', {
        x: x - BW / 2, y: mapY(q3), width: BW, height: mapY(q1) - mapY(q3), rx: Math.min(ctx.num('boxRadius'), BW / 2),
        fill: shade, class: 'pop', style: `animation-delay:${0.15 + g * 0.12}s`,
      });
      tip(box, `${name} — half of ${ctx.str('measure')} in ${plain(q1)}–${plain(q3)}${u}`);
      el(grp, 'line', { x1: x - BW / 2 + 3, y1: mapY(md), x2: x + BW / 2 - 3, y2: mapY(md), stroke: T.bg, 'stroke-width': 2.2, class: 'fade', style: `animation-delay:${0.5 + g * 0.12}s` });
      if (ctx.bool('dataLabels')) {
        const slow = accentSlow && g === slowest;
        txt(grp, {
          x: x + BW / 2 + 6, y: mapY(md) + 3, 'font-size': ctx.fs(slow ? 11 : 9.5), 'font-weight': 800, fill: slow ? T.hero : ink,
          class: 'fade', style: `animation-delay:${0.6 + g * 0.12}s`,
        }, md.toFixed(1) + u);
      }
      outs.forEach((o, k) => {
        const d = el(grp, 'circle', {
          cx: x + (rnd(k + 1, g + 3) - 0.5) * ctx.num('outlierJitter'), cy: mapY(o), r: ctx.num('outlierRadius'), fill: T.bg,
          stroke: palm ? shade : T.label, 'stroke-width': palm ? 1.3 : sw(1.1), class: 'pop', style: `animation-delay:${0.7 + g * 0.12 + k * 0.06}s`,
        });
        tip(d, `${name} outlier — ${plain(o)}${u}`);
      });
      categoryLabel(ctx, grp, x, BASE + 18, name, g * 0.12);
    });
    captionLine(ctx, autoCaption(ctx.s, T), 306, 1.2, { fill: T.faintData });
  },
});
