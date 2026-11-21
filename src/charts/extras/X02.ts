// X02 Category Lollipop — a vertical lollipop on a dark card. One stem per category, height =
// value, names tilted under the baseline; the top item is drawn bigger in the card's highlight
// colour. Palm uses a dark green card; the other palettes use their own dark card with
// paper-coloured marks and their dark-card accent for the top item.

import { alpha } from '../../core/color';
import { defineChart } from '../../core/define';
import { byPreset, type Theme } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';

const D: [string, number][] = [
  ['Writing tests', 101], ['Reading old code', 76], ['Automation scripts', 66], ['Scaffolding projects', 63], ['Looking up docs', 62],
  ['Refactoring', 58], ['Tweaking CSS', 56], ['PR descriptions', 53], ['SQL', 49], ['Regex', 46], ['Scrapers', 44], ['Naming things', 28],
];
/**
 * The card: Palm uses its dark green (the data colour); the other palettes use their
 * usual dark card, where their accent colour (the top item) stands out.
 */
const cardOf = (T: Theme) => byPreset(T, { mono: '#1C1C1A', porcelain: T.text, palm: T.data, wire: T.text }, T.text);
/** The paper colour for marks on the dark card. */
const ink = (T: Theme) => byPreset(T, { mono: T.bg, porcelain: T.bg, palm: '#F0EFE9', wire: T.bg }, T.bg);

export default defineChart({
  id: 'X02',
  name: 'Category Lollipop',
  family: 'extras',
  kinds: ['bars', 'ranking'],
  description: 'Vertical lollipops on a dark card, names tilted below; the top item stands out.',
  card: { width: 689, chartHeight: 330, dark: true },
  size: { w: 480, h: 250 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 30,
      columns: [
        { key: 'label', label: 'Category', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: D.map(([label, value]) => ({ label, value })) },
  text: {
    title: '12 things people most want AI to take over',
    subtitle: 'one stem = one task · height = mentions · wheat = top pick',
    source: 'LOLLIPOP · PALM-REPORT · DEVELOPER SURVEY',
  },
  fields: [
    {
      key: 'highlight', label: 'Highlight', group: 'options', section: 'Stems', type: 'select', default: 'max',
      options: [{ value: 'max', label: 'The largest' }, { value: 'first', label: 'The first row' }, { value: 'none', label: 'None' }],
    },
    { key: 'sort', label: 'Order', group: 'options', section: 'Stems', type: 'select', default: 'none', options: [{ value: 'none', label: 'As in the data' }, { value: 'desc', label: 'Largest first' }, { value: 'asc', label: 'Smallest first' }] },
    { key: 'pitch', label: 'Stem spacing', group: 'options', section: 'Stems', type: 'number', min: 8, max: 80, step: 0.5, unit: 'px', default: 37, help: 'Shrinks automatically when the stems wouldn’t fit.' },
    { key: 'scale', label: 'Height per unit', group: 'options', section: 'Stems', type: 'number', min: 0.01, max: 20, step: 0.01, unit: 'px', default: 1.45, help: 'Shrinks automatically when the tallest stem wouldn’t fit.' },
    { key: 'dotRadius', label: 'Dot size', group: 'options', section: 'Stems', type: 'number', min: 0.5, max: 12, step: 0.1, unit: 'px', default: 3.4 },
    { key: 'heroRadius', label: 'Highlighted dot size', group: 'options', section: 'Stems', type: 'number', min: 0.5, max: 16, step: 0.1, unit: 'px', default: 5 },
    { key: 'labelAngle', label: 'Name angle', group: 'options', section: 'Labels', type: 'number', min: -90, max: 90, step: 1, unit: '°', default: -52 },
    { key: 'unit', label: 'Tooltip wording', group: 'options', section: 'Units', type: 'text', default: 'mentioned by {v} people', help: '{v} becomes the value.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, grid: true, caption: true },
  caption: () => 'ONE STEM = ONE TASK · HEIGHT = MENTIONS',
  paletteNeeds: ['highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  frame: (T) => ({ bg: cardOf(T), title: T.bg, sub: alpha(T.bg, 0.62), src: alpha(T.bg, 0.45) }),
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    let rows = ctx.rows.map((r) => ({ name: String(r.label), v: Math.max(0, Number(r.value) || 0) }));
    const sort = ctx.str('sort');
    if (sort !== 'none') rows = [...rows].sort((a, b) => (sort === 'desc' ? b.v - a.v : a.v - b.v));
    const n = rows.length;
    const X0 = 34, base = 196;
    const PX = Math.min(ctx.num('pitch'), n > 1 ? 407 / (n - 1) : Infinity);
    const max = Math.max(1e-9, ...rows.map((r) => r.v));
    const k = Math.min(ctx.num('scale'), (base - 30) / max);
    const map = (v: number) => base - v * k;
    const hl = ctx.str('highlight');
    const heroI = hl === 'first' ? 0 : hl === 'max' ? rows.findIndex((r) => r.v === max) : -1;
    const paper = ink(T);
    if (ctx.bool('showGrid')) el(s, 'line', { x1: X0 - 12, y1: base, x2: X0 + (n - 1) * PX + 14, y2: base, stroke: alpha(T.bg, 0.25), 'stroke-width': 0.8, class: 'fade' });
    rows.forEach(({ name, v }, i) => {
      const x = X0 + i * PX, y = map(v), hero = i === heroI;
      const col = hero ? T.heroDark : paper;
      const g = keyed(el(s, 'g', {}), `c-${i}`);
      el(g, 'line', { x1: x, y1: base, x2: x, y2: y, stroke: col, 'stroke-width': hero ? 1.6 : 1, opacity: hero ? 1 : 0.8, class: 'fade', style: `animation-delay:${0.1 + i * 0.05}s` });
      const dot = el(g, 'circle', { cx: x, cy: y, r: hero ? ctx.num('heroRadius') : ctx.num('dotRadius'), fill: col, class: 'pop', style: `animation-delay:${0.2 + i * 0.05}s` });
      tip(dot, `${name} — ${ctx.str('unit').replace('{v}', ctx.fmt(v))}`);
      if (ctx.bool('dataLabels')) txt(g, { x, y: y - 9, 'font-size': ctx.fs(9), 'font-weight': 800, fill: col, 'text-anchor': 'middle', class: 'fade', style: `animation-delay:${0.4 + i * 0.05}s` }, ctx.fmt(v));
      if (ctx.bool('categoryLabels')) {
        txt(g, {
          x: x + 3, y: base + 8, 'font-size': ctx.fs(7), 'font-weight': 600, fill: alpha(T.bg, 0.75), 'text-anchor': 'end',
          transform: `rotate(${ctx.num('labelAngle')} ${x + 3} ${base + 8})`, class: 'fade', style: `animation-delay:${0.15 + i * 0.05}s`,
        }, name);
      }
    });
    if (ctx.s.showCaption !== false) {
      txt(s, { x: 240, y: 242, 'font-size': ctx.fs(6.5), 'font-weight': 600, fill: alpha(T.bg, 0.5), 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:.9s' }, ctx.str('caption').trim() || 'ONE STEM = ONE TASK · HEIGHT = MENTIONS');
    }
  },
});
