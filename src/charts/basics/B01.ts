// B01 Rung Bars — a column chart where each bar is a ladder of rungs: one rung = one honest unit.
// Every hard-coded number is a setting.

import { defineChart } from '../../core/define';
import { formatNumber, ordinalWord } from '../../core/format';
import { rndAbs as rnd } from '../../core/rnd';
import { pick, type Theme } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, hit, keyed, tip, txt } from '../../core/vnode';

const DEMO: [string, number][] = [['FREE', 38], ['STARTER', 27], ['PRO', 22], ['TEAM', 16], ['SCALE', 11], ['ENT', 7]];

const plain = (v: number) => formatNumber(v, { prefix: '', suffix: '', decimals: -1, thousands: true, compact: false, percent: false });
const unitText = (s: Settings) => `${s.unitPrefix ?? ''}${plain(Number(s.unitValue))}${s.unitSuffix ?? ''}`.toUpperCase();

function autoCaption(s: Settings, rankShade: boolean): string {
  const parts = [`ONE RUNG = ${unitText(s)}`];
  if (rankShade) parts.push('SHADE = RANK');
  const n = Math.round(Number(s.dotEvery));
  if (n > 0) parts.push(`DOT MARKS EVERY ${ordinalWord(n)}`);
  return parts.join(' · ');
}

/** Palm shades bars by rank unless the setting says otherwise. */
const shadeOn = (s: Settings, T: Theme) => s.shadeByRank === 'on' || (s.shadeByRank === 'auto' && T.id === 'palm');

/** rank[i] = 0 for the largest value */
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map((d) => d[1]);
  return values.map((_, i) => order.indexOf(i));
}

export default defineChart({
  id: 'B01',
  name: 'Rung Bars',
  family: 'basics',
  kinds: ['bars', 'comparison'],
  description: 'Columns built from countable rungs: one rung is one unit.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 16,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, value]) => ({ label, value })) },
  text: {
    title: 'Revenue by plan, rung by rung',
    subtitle: 'one rung = one $k of MRR · the bar is a ladder you can count',
    source: 'RUNG BARS · MONO-BASIC · BILLING',
  },
  fields: [
    { key: 'unitValue', label: 'Value per rung', group: 'options', section: 'Rungs', type: 'number', min: 0.1, max: 1000, step: 0.1, default: 1, help: 'Each bar gets value ÷ this many rungs.' },
    { key: 'rungStep', label: 'Rung spacing', group: 'options', section: 'Rungs', type: 'number', min: 2, max: 14, step: 0.1, unit: 'px', default: 5.6 },
    { key: 'rungLength', label: 'Rung length', group: 'options', section: 'Rungs', type: 'number', min: 3, max: 26, step: 0.5, unit: 'px', default: 14, help: 'Half the width of a bar.' },
    { key: 'rungWidth', label: 'Rung thickness', group: 'options', section: 'Rungs', type: 'number', min: 0.3, max: 4, step: 0.1, unit: 'px', default: 1 },
    { key: 'widthJitter', label: 'Length jitter', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.5 },
    { key: 'opacityJitter', label: 'Opacity variation', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 1, step: 0.05, default: 0.5, help: 'Colour palettes cap this so thin lines stay visible.' },
    { key: 'dotEvery', label: 'Marker dot every', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 20, step: 1, unit: 'rungs', default: 5, help: '0 turns the marker dots off.' },
    { key: 'barSpacing', label: 'Bar spacing', group: 'options', section: 'Bars', type: 'number', min: 16, max: 120, step: 1, unit: 'px', default: 56 },
    { key: 'labelGap', label: 'Value label gap', group: 'options', section: 'Bars', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 10 },
    { key: 'autoFit', label: 'Shrink to fit tall or many bars', group: 'options', section: 'Bars', type: 'boolean', default: true },
    {
      key: 'sort', label: 'Order', group: 'options', section: 'Order and emphasis', type: 'select', default: 'none',
      options: [{ value: 'none', label: 'As in the data' }, { value: 'desc', label: 'Largest first' }, { value: 'asc', label: 'Smallest first' }],
    },
    {
      key: 'highlight', label: 'Highlight', group: 'options', section: 'Order and emphasis', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'max', label: 'Largest bar' }, { value: 'first', label: 'First bar' }, { value: 'none', label: 'None' }],
      help: 'Wire draws one bar in its highlight colour.',
    },
    {
      key: 'shadeByRank', label: 'Shade bars by rank', group: 'options', section: 'Order and emphasis', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }],
      help: 'Palm shades bars from dark to light by size.',
    },
    { key: 'unitPrefix', label: 'Unit prefix', group: 'options', section: 'Units', type: 'text', default: '$', placeholder: 'e.g. $' },
    { key: 'unitSuffix', label: 'Unit suffix', group: 'options', section: 'Units', type: 'text', default: 'k', placeholder: 'e.g. k' },
    { key: 'measure', label: 'What is counted', group: 'options', section: 'Units', type: 'text', default: 'MRR', help: 'Shown in tooltips after the value.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, shadeOn(s, T)),
  paletteNeeds: ['highlight', 'sequential'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), v: Number(r.value) }));
    const sort = ctx.str('sort');
    if (sort === 'desc') rows.sort((a, b) => b.v - a.v);
    else if (sort === 'asc') rows.sort((a, b) => a.v - b.v);
    const n = rows.length;
    const unit = Math.max(1e-6, ctx.num('unitValue'));
    const counts = rows.map((r) => Math.max(0, Math.round(r.v / unit)));
    const base = 266;
    const HW = ctx.num('rungLength');
    let step = ctx.num('rungStep');
    let spacing = ctx.num('barSpacing');
    if (ctx.bool('autoFit')) {
      const maxN = Math.max(1, ...counts);
      const room = base - 26; // keep the tallest value label inside the drawing
      if ((maxN - 1) * step > room) step = room / Math.max(1, maxN - 1);
      const span = 344 - 2 * (HW + 6);
      if ((n - 1) * spacing > span) spacing = span / Math.max(1, n - 1);
    }
    const cx = 196; // centre of the default six bars (56 … 336)
    const x0 = (i: number) => cx + (i - (n - 1) / 2) * spacing;

    const rk = ranks(rows.map((r) => r.v));
    const hl = ctx.str('highlight');
    const heroIdx = hl === 'first' ? 0 : hl === 'max' || (hl === 'auto' && T.heroMode) ? rk.indexOf(0) : -1;
    const byRank = shadeOn(ctx.s, T);
    const jit = ctx.num('widthJitter');
    const opJ = T.inkBoost ? Math.min(ctx.num('opacityJitter'), 1 - T.inkBoost.opacityFloor) : ctx.num('opacityJitter');
    const sw = ctx.sw(ctx.num('rungWidth'));
    const dotEvery = Math.round(ctx.num('dotEvery'));
    const dotFill = pick(T, '#C6C5BF', T.faint);
    const gap = ctx.num('labelGap');
    const unitTxt = (v: number) => `${ctx.str('unitPrefix')}${plain(v)}${ctx.str('unitSuffix')}`;

    rows.forEach(({ name, v }, i) => {
      const x = x0(i);
      const cnt = counts[i];
      const color = i === heroIdx ? T.hero : byRank ? T.ramp6[Math.min(5, rk[i])] : T.data;
      const g = keyed(el(s, 'g', {}), `bar-${i}`);
      tip(g, `${name} — ${unitTxt(v)} ${ctx.str('measure')}`.trim());
      for (let k = 0; k < cnt; k++) {
        const y = base - k * step, w = HW - jit + rnd(k + 1, i + 2) * 2 * jit;
        el(g, 'line', {
          x1: x - w, y1: y, x2: x + w, y2: y, stroke: color, 'stroke-width': sw,
          opacity: 1 - opJ + rnd(k + 2, i + 4) * opJ, class: 'fade', style: `animation-delay:${i * 0.08 + k * 0.012}s`,
        });
        if (dotEvery > 0 && k % dotEvery === dotEvery - 1) {
          el(g, 'circle', { cx: x + HW + 4.5, cy: y, r: 0.8, fill: dotFill, class: 'fade', style: `animation-delay:${i * 0.08 + k * 0.012}s` });
        }
      }
      const topY = base - (Math.max(1, cnt) - 1) * step;
      if (ctx.bool('dataLabels')) {
        txt(g, {
          x, y: topY - gap, 'font-size': ctx.fs(11), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle',
          class: 'fade', style: `animation-delay:${0.4 + i * 0.08}s`,
        }, ctx.fmt(v));
      }
      if (ctx.bool('categoryLabels')) {
        txt(g, {
          x, y: base + 18, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: T.muted, 'text-anchor': 'middle',
          'letter-spacing': '.08em', class: 'fade', style: `animation-delay:${i * 0.08}s`,
        }, name);
      }
      const hy = topY - gap - 12;
      hit(g, x - HW - 3, hy, 2 * HW + 12, base + 24 - hy);
    });
    el(s, 'line', { x1: 28, y1: base + 4, x2: 372, y2: base + 4, stroke: T.grid, 'stroke-width': 0.8, class: 'fade' });
    if (ctx.s.showCaption !== false) {
      txt(s, {
        x: 200, y: 306, 'font-size': ctx.fs(7), 'font-weight': 600, fill: pick(T, '#B0AFA9', T.faint), 'text-anchor': 'middle',
        'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:.9s',
      }, ctx.str('caption').trim() || autoCaption(ctx.s, byRank));
    }
  },
});

export { autoCaption };
