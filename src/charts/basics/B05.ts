// B05 Tick Rows — horizontal bars built from ticks: each row is a queue, one tick per unit, with
// a dot every fifth tick and the total at the end of the row.

import { defineChart } from '../../core/define';
import { ordinalWord } from '../../core/format';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, type Theme } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, hit, keyed, tip, txt } from '../../core/vnode';
import { captionLine, label, plain, ranks } from './shared';

const DEMO: [string, number][] = [['PLATFORM', 34], ['GROWTH', 28], ['MOBILE', 22], ['INFRA', 17], ['ML', 11], ['DESIGN', 8]];

const shadeOn = (s: Settings, T: Theme) => s.shadeByRank === 'on' || (s.shadeByRank === 'auto' && T.id === 'palm');

function autoCaption(s: Settings, T: Theme): string {
  const u = Number(s.unitValue);
  const parts = [u === 1 ? `ONE TICK = ONE ${String(s.unitName ?? '').toUpperCase()}` : `ONE TICK = ${plain(u)} ${String(s.measure ?? '').toUpperCase()}`];
  if (shadeOn(s, T)) parts.push('SHADE = RANK');
  const n = Math.round(Number(s.dotEvery));
  if (n > 0) parts.push(`DOT MARKS EVERY ${ordinalWord(n)}`);
  return parts.join(' · ');
}

export default defineChart({
  id: 'B05',
  name: 'Tick Rows',
  family: 'basics',
  kinds: ['bars'],
  description: 'Horizontal bars made of ticks: each row is a queue you can count.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 14,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, value]) => ({ label, value })) },
  text: {
    title: 'Six teams, shipped and counted',
    subtitle: 'one tick = one release this quarter · the row is a queue, not a bar',
    source: 'TICK ROWS · MONO-BASIC · RELEASE LOG',
  },
  fields: [
    { key: 'unitValue', label: 'Value per tick', group: 'options', section: 'Ticks', type: 'number', min: 0.1, max: 1000, step: 0.1, default: 1, help: 'Each row gets value ÷ this many ticks.' },
    { key: 'tickPitch', label: 'Tick spacing', group: 'options', section: 'Ticks', type: 'number', min: 2, max: 20, step: 0.1, unit: 'px', default: 6.9 },
    { key: 'tickHeight', label: 'Tick height', group: 'options', section: 'Ticks', type: 'number', min: 2, max: 30, step: 0.5, unit: 'px', default: 9 },
    { key: 'tickJitter', label: 'Height variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 15, step: 0.5, unit: 'px', default: 6 },
    { key: 'tickWidth', label: 'Tick width', group: 'options', section: 'Ticks', type: 'number', min: 0.2, max: 4, step: 0.1, unit: 'px', default: 0.9, help: 'Colour palettes draw ticks thicker.' },
    { key: 'opacityJitter', label: 'Opacity variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.45, help: 'Colour palettes cap this so thin lines stay visible.' },
    { key: 'dotEvery', label: 'Marker dot every', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 20, step: 1, unit: 'ticks', default: 5, help: '0 turns the marker dots off.' },
    { key: 'rowSpacing', label: 'Row spacing', group: 'options', section: 'Rows', type: 'number', min: 14, max: 80, step: 1, unit: 'px', default: 44 },
    { key: 'labelColumn', label: 'Label column width', group: 'options', section: 'Rows', type: 'number', min: 30, max: 220, step: 1, unit: 'px', default: 104 },
    { key: 'trackUnits', label: 'Track length', group: 'options', section: 'Rows', type: 'number', min: 0, max: 500, step: 1, unit: 'ticks', default: 0, help: '0 = as long as the longest row.' },
    { key: 'valueGap', label: 'Value label gap', group: 'options', section: 'Rows', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 10 },
    { key: 'autoFit', label: 'Shrink to fit long or many rows', group: 'options', section: 'Rows', type: 'boolean', default: true },
    {
      key: 'sort', label: 'Order', group: 'options', section: 'Order and emphasis', type: 'select', default: 'none',
      options: [{ value: 'none', label: 'As in the data' }, { value: 'desc', label: 'Largest first' }, { value: 'asc', label: 'Smallest first' }],
    },
    {
      key: 'highlight', label: 'Highlight', group: 'options', section: 'Order and emphasis', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'max', label: 'Largest row' }, { value: 'first', label: 'First row' }, { value: 'none', label: 'None' }],
      help: 'Wire draws one row in its highlight colour.',
    },
    {
      key: 'shadeByRank', label: 'Shade rows by rank', group: 'options', section: 'Order and emphasis', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }],
      help: 'Palm shades rows from dark to light by size.',
    },
    { key: 'unitName', label: 'One unit is a…', group: 'options', section: 'Units', type: 'text', default: 'release', help: 'Used in the caption: “ONE TICK = ONE RELEASE”.' },
    { key: 'measure', label: 'What is counted', group: 'options', section: 'Units', type: 'text', default: 'releases', help: 'Shown in tooltips after the value.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, T),
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
    const X0 = ctx.num('labelColumn');
    const track = Math.round(ctx.num('trackUnits')) || Math.max(1, ...counts);
    let PX = ctx.num('tickPitch');
    let rowSp = ctx.num('rowSpacing');
    if (ctx.bool('autoFit')) {
      const room = 372 - 30 - X0; // keep the end-of-row number inside the drawing
      if (Math.max(track, ...counts) * PX > room) PX = room / Math.max(track, ...counts);
      if ((n - 1) * rowSp > 228) rowSp = 228 / Math.max(1, n - 1);
    }
    const y0 = (i: number) => 52 + i * rowSp;
    const rk = ranks(rows.map((r) => r.v));
    const hl = ctx.str('highlight');
    const heroIdx = hl === 'first' ? 0 : hl === 'max' || (hl === 'auto' && T.heroMode) ? rk.indexOf(0) : -1;
    const byRank = shadeOn(ctx.s, T);
    const jit = T.inkBoost ? Math.min(ctx.num('opacityJitter'), 1 - T.inkBoost.opacityFloor) : ctx.num('opacityJitter');
    const tw = ctx.num('tickWidth') * boost(T, 1, 1.7 / 0.9);
    const h0 = ctx.num('tickHeight'), hj = ctx.num('tickJitter');
    const dotEvery = Math.round(ctx.num('dotEvery'));
    const measure = ctx.str('measure');

    rows.forEach(({ name, v }, i) => {
      const y = y0(i);
      const g = keyed(el(s, 'g', {}), `row-${i}`);
      tip(g, `${name} — ${label(ctx, v)} ${measure}`.trim());
      if (ctx.bool('categoryLabels')) {
        txt(g, {
          x: X0 - 10, y: y + 3, 'font-size': ctx.fs(8), 'font-weight': 700, fill: T.label, 'text-anchor': 'end',
          'letter-spacing': '.08em', class: 'fade', style: `animation-delay:${i * 0.08}s`,
        }, name);
      }
      el(g, 'line', { x1: X0, y1: y + 9, x2: X0 + track * PX, y2: y + 9, stroke: T.grid, 'stroke-width': 0.6, class: 'fade', style: `animation-delay:${i * 0.08}s` });
      const ink = i === heroIdx ? T.hero : byRank ? T.ramp6[Math.min(5, rk[i])] : T.data;
      for (let k = 0; k < counts[i]; k++) {
        const x = X0 + k * PX + PX / 2, h = h0 + rnd(k + 1, i + 2) * hj;
        el(g, 'line', {
          x1: x, y1: y + 9, x2: x, y2: y + 9 - h, stroke: ink, 'stroke-width': tw,
          opacity: 1 - jit + rnd(k + 3, i + 5) * jit, class: 'fade', style: `animation-delay:${i * 0.08 + k * 0.012}s`,
        });
        if (dotEvery > 0 && k % dotEvery === dotEvery - 1) {
          el(g, 'circle', { cx: x, cy: y + 13, r: 0.8, fill: T.faint, class: 'fade', style: `animation-delay:${i * 0.08 + k * 0.012}s` });
        }
      }
      if (ctx.bool('dataLabels')) {
        txt(g, {
          x: X0 + counts[i] * PX + ctx.num('valueGap'), y: y + 4, 'font-size': ctx.fs(11), 'font-weight': 800, fill: T.text,
          class: 'fade', style: `animation-delay:${0.4 + i * 0.08}s`,
        }, label(ctx, v));
      }
      hit(g, 0, y - rowSp / 2 + 4, 400, rowSp);
    });
    captionLine(ctx, autoCaption(ctx.s, T), 308, 0.9);
  },
});
