// G01 Chunky Bars — chunky columns with their values on top: category slots, bars 80% of the
// slot, a round axis maximum, capsule tops, values drawn 10px above each bar, and an entrance of
// 900ms quartic ease-out, 110ms apart.

import { defineChart } from '../../core/define';
import { quarticOut } from '../../core/ease';
import { el, keyed, tip, txt } from '../../core/vnode';
import { niceAxisMax, glanceFrame, rampAt, ranksOf } from './shared';

const DEMO: [string, number][] = [['STARTER', 182], ['PRO', 486], ['TEAM', 391], ['ENT', 274]];
const DUR = 0.9;
const STAGGER = 0.11;

/** Rectangle with rounded top corners. */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const b = y + h;
  if (r <= 0) return `M${x} ${b}V${y}H${x + w}V${b}Z`;
  return `M${x} ${b}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${b}Z`;
}

export default defineChart({
  id: 'G01',
  name: 'Chunky Bars',
  family: 'glance',
  kinds: ['bars', 'ranking'],
  description: 'Bold rounded columns with the value printed on top: readable in seconds.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 24,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, value]) => ({ label, value })) },
  text: { title: 'Revenue by plan', subtitle: 'Q2 2026 · MRR, $K', source: 'CHUNKY BARS · MONO-DEMO · BILLING' },
  defaults: { numPrefix: '$', numSuffix: 'K' },
  fields: [
    { key: 'barWidth', label: 'Bar width', group: 'options', section: 'Bars', type: 'number', min: 5, max: 100, step: 1, unit: '% of slot', default: 52 },
    { key: 'radius', label: 'Corner rounding', group: 'options', section: 'Bars', type: 'number', min: 0, max: 99, step: 1, unit: 'px', default: 99, help: 'Capped at half the bar width, so 99 gives fully round tops.' },
    { key: 'headroom', label: 'Space above the tallest bar', group: 'options', section: 'Bars', type: 'number', min: 0, max: 100, step: 0.1, unit: '%', default: 11.1, help: 'The scale then rounds up to a whole number.' },
    { key: 'labelGap', label: 'Value label gap', group: 'options', section: 'Bars', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 10 },
    { key: 'valueSize', label: 'Value label size', group: 'options', section: 'Bars', type: 'number', min: 6, max: 40, step: 0.5, unit: 'px', default: 13 },
    { key: 'axisSize', label: 'Category label size', group: 'options', section: 'Bars', type: 'number', min: 5, max: 30, step: 0.5, unit: 'px', default: 9 },
    {
      key: 'colorBy', label: 'Colour bars by', group: 'options', section: 'Colour', type: 'select', default: 'rank',
      options: [{ value: 'rank', label: 'Rank (largest strongest)' }, { value: 'single', label: 'One colour' }, { value: 'series', label: 'Position (series colours)' }],
    },
    {
      key: 'sort', label: 'Order', group: 'options', section: 'Order', type: 'select', default: 'none',
      options: [{ value: 'none', label: 'As in the data' }, { value: 'desc', label: 'Largest first' }, { value: 'asc', label: 'Smallest first' }],
    },
    { key: 'measure', label: 'What is measured', group: 'options', section: 'Units', type: 'text', default: 'MRR', help: 'Shown in tooltips after the value.' },
  ],
  supports: { dataLabels: true, categoryLabels: true },
  paletteNeeds: ['sequential', 'highlight'],
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
    const tickFs = ctx.fs(ctx.num('axisSize'));
    const cats = ctx.bool('categoryLabels');
    // x axis: 8px tick + 8px padding + label line, plus 8px below
    const axisH = cats ? 24 + 1.2 * tickFs : 0;
    const bottom = H - axisH;
    const dataMax = Math.max(0, ...rows.map((r) => r.v));
    const max = niceAxisMax(dataMax * (1 + ctx.num('headroom') / 100), bottom);
    const band = W / n;
    const bw = band * 0.8 * (ctx.num('barWidth') / 100);
    const rk = ranksOf(rows.map((r) => r.v));
    const colorBy = ctx.str('colorBy');
    const ease = ctx.ease ?? quarticOut;
    rows.forEach((r, i) => {
      const x = (i + 0.5) * band;
      const yFinal = bottom - (r.v / max) * bottom;
      const local = ctx.time === Infinity ? 1 : (ctx.time - i * STAGGER * ctx.stagger) / DUR;
      const e = local <= 0 ? 0 : local >= 1 ? 1 : ease(local);
      const y = bottom + (yFinal - bottom) * e;
      const h = bottom - y;
      const color = colorBy === 'single' ? T.data : colorBy === 'series' ? T.ser[i % T.ser.length] : rampAt(T, rk[i], n);
      const g = keyed(el(s, 'g', {}), `bar-${i}`);
      tip(g, `${r.name}\n${ctx.fmt(r.v)} ${ctx.str('measure')}`.trim());
      if (h > 0.01) {
        const rad = Math.min(ctx.num('radius'), bw / 2, h / 2);
        el(g, 'path', { d: topRounded(x - bw / 2, y, bw, h, rad), fill: color });
      }
      if (ctx.bool('dataLabels')) {
        txt(g, { x, y: y - ctx.num('labelGap'), 'font-size': ctx.fs(ctx.num('valueSize')), 'font-weight': 700, fill: T.text, 'text-anchor': 'middle' }, ctx.fmt(r.v));
      }
      if (cats) {
        // the label's middle sits 16px (tick + padding) + half a line (1.2em) below the plot;
        // canvas "middle" baseline → alphabetic baseline is (ascent − descent) / 2 lower.
        txt(g, { x, y: bottom + 16 + (0.6 + 0.3638) * tickFs, 'font-size': tickFs, 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle' }, r.name);
      }
    });
  },
});
