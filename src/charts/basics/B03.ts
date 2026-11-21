// B03 Hairline Area — the "area" is made of days: one hairline per day, standing from the floor
// to its value, with a thin outline along the top and the peak day dotted and labelled.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, pick, type Theme } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, tip, txt } from '../../core/vnode';
import { captionLine, dayName, isoDay, label, monthName, parseDate, r2, threeTicks } from './shared';

const val = (d: number) => 34 + 26 * Math.sin(d / 7.2) + 12 * Math.sin(d / 2.8) + rnd(d + 1, 3) * 16;
const DEMO = Array.from({ length: 45 }, (_, d) => ({ date: isoDay(2026, 5, 18 + d), value: r2(val(d)) }));
const DEMO_MAX = Math.max(...DEMO.map((r) => r.value));
const SCALE = 2.35;
const X0 = 28;
const SPAN = 44 * 7.75;

/** Palm shades the hairlines in three parts ("SHADE = MONTH"). */
const shadeMode = (s: Settings, T: Theme) => {
  const m = String(s.shade ?? 'auto');
  return m === 'auto' ? (T.id === 'palm' ? 'thirds' : 'off') : m;
};
const autoCaption = (s: Settings, T: Theme) =>
  shadeMode(s, T) !== 'off' ? 'ONE HAIRLINE = ONE DAY · SHADE = MONTH · FLOOR TO PEAK' : 'ONE HAIRLINE = ONE DAY, FLOOR TO PEAK';

export default defineChart({
  id: 'B03',
  name: 'Hairline Area',
  family: 'basics',
  kinds: ['lines', 'time'],
  description: 'An area chart made of days: one hairline per day from the floor to its value.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 2,
      maxRows: 200,
      columns: [
        { key: 'date', label: 'Date', type: 'date', role: 'date', required: false, help: 'YYYY-MM-DD. Used for the month labels.' },
        { key: 'value', label: 'Value', type: 'number', role: 'value' },
      ],
    }],
  },
  defaultData: { rows: DEMO },
  defaults: { numSuffix: 'k' },
  text: {
    title: 'Concurrent users, filled with days',
    subtitle: 'one hairline = one day, floor to peak · the area is made of days, not paint',
    source: 'HAIRLINE AREA · MONO-BASIC · LIVE OPS',
  },
  fields: [
    { key: 'fillWidth', label: 'Spread days across the width', group: 'options', section: 'Layout', type: 'boolean', default: true },
    { key: 'daySpacing', label: 'Day spacing', group: 'options', section: 'Layout', type: 'number', min: 1, max: 30, step: 0.05, unit: 'px', default: 7.75, when: (s) => s.fillWidth === false },
    { key: 'peakHeight', label: 'Height of the peak day', group: 'options', section: 'Layout', type: 'number', min: 10, max: 120, step: 1, unit: '%', default: 100, help: '100% is the standard height for the highest value.' },
    { key: 'hairWidth', label: 'Hairline width', group: 'options', section: 'Hairlines', type: 'number', min: 0.1, max: 5, step: 0.05, unit: 'px', default: 0.55, help: 'Colour palettes draw hairlines thicker.' },
    { key: 'opacityJitter', label: 'Opacity variation', group: 'options', section: 'Hairlines', type: 'number', min: 0, max: 0.9, step: 0.01, default: 0.45 },
    {
      key: 'shade', label: 'Shade the days', group: 'options', section: 'Hairlines', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'off', label: 'One colour' }, { value: 'thirds', label: 'In three equal parts' }, { value: 'month', label: 'By calendar month' }],
      help: 'Palm shades the hairlines in three parts.',
    },
    { key: 'outlineWidth', label: 'Outline width', group: 'options', section: 'Outline and peak', type: 'number', min: 0, max: 5, step: 0.1, unit: 'px', default: 1.2 },
    { key: 'peakWidth', label: 'Peak hairline width', group: 'options', section: 'Outline and peak', type: 'number', min: 0.1, max: 6, step: 0.1, unit: 'px', default: 1.1 },
    { key: 'peakRadius', label: 'Peak dot size', group: 'options', section: 'Outline and peak', type: 'number', min: 0, max: 12, step: 0.1, unit: 'px', default: 4.2 },
    { key: 'peakLabelGap', label: 'Peak label gap', group: 'options', section: 'Outline and peak', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 11 },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true, hover: false },
  caption: (s, T) => autoCaption(s, T),
  paletteNeeds: ['highlight', 'sequential'],
  interactions: ['tooltip'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ date: parseDate(r.date), text: String(r.date ?? '').trim(), v: Number(r.value) }));
    const n = rows.length;
    const step = ctx.bool('fillWidth') ? SPAN / Math.max(1, n - 1) : ctx.num('daySpacing');
    const x = (d: number) => X0 + d * step;
    const base = 262;
    const vs = rows.map((r) => r.v);
    const vmax = Math.max(...vs);
    const k = vmax > 0 ? ((ctx.num('peakHeight') / 100) * SCALE * DEMO_MAX) / vmax : SCALE;
    const map = (v: number) => base - v * k;
    el(s, 'line', { x1: X0 - 6, y1: base, x2: Math.max(378, x(n - 1) + 9), y2: base, stroke: T.grid, 'stroke-width': 0.8, class: 'fade' });

    const peak = vs.indexOf(vmax);
    const mode = shadeMode(ctx.s, T);
    const third = Math.max(1, Math.ceil(n / 3));
    const months = [...new Set(rows.map((r) => (r.date ? r.date.getUTCFullYear() * 12 + r.date.getUTCMonth() : -1)))];
    const segOf = (d: number) => {
      if (mode === 'thirds') return Math.min(2, Math.floor(d / third));
      const r = rows[d];
      return r.date ? Math.min(2, months.indexOf(r.date.getUTCFullYear() * 12 + r.date.getUTCMonth()) % 3) : Math.min(2, Math.floor(d / third));
    };
    const jit = ctx.num('opacityJitter') * boost(T, 1, 0.2 / 0.45);
    const topOp = boost(T, 0.95, 1);
    const hw = ctx.num('hairWidth') * boost(T, 1, 1 / 0.55);
    vs.forEach((v, d) => {
      const isPeak = d === peak;
      const color = isPeak ? T.hero : mode === 'off' ? pick(T, '#8F8E88', T.data) : T.cat3l[segOf(d)];
      el(s, 'line', {
        x1: x(d), y1: base, x2: x(d), y2: map(v), stroke: color,
        'stroke-width': isPeak ? ctx.num('peakWidth') * boost(T, 1, 1.6 / 1.1) : hw,
        opacity: isPeak ? 1 : topOp - jit + rnd(d + 1, 7) * jit,
        class: 'fade', style: `animation-delay:${d * 0.014}s`,
      });
    });
    const ow = ctx.num('outlineWidth') * boost(T, 1, 2 / 1.2);
    if (ow > 0) {
      const pts = vs.map((v, d) => `${x(d)} ${map(v)}`).join(' L ');
      el(s, 'path', { d: 'M' + pts, fill: 'none', stroke: T.data, 'stroke-width': ow, class: 'draw', style: 'animation-delay:.4s;animation-duration:1.2s' });
    }
    const pr = rows[peak];
    const pd = el(s, 'circle', { cx: x(peak), cy: map(vmax), r: ctx.num('peakRadius'), fill: T.hero, class: 'pop', style: 'animation-delay:1.2s' });
    tip(pd, `${pr.date ? dayName(pr.date) : pr.text || `Day ${peak + 1}`} — ${label(ctx, vmax)} peak`);
    if (ctx.bool('dataLabels')) {
      txt(s, {
        x: x(peak), y: map(vmax) - ctx.num('peakLabelGap'), 'font-size': ctx.fs(9.5), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle',
        style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:1.3s`, class: 'fade',
      }, label(ctx, vmax));
    }
    if (ctx.bool('categoryLabels')) {
      for (const d of threeTicks(n)) {
        const r = rows[d];
        txt(s, {
          x: x(d), y: base + 18, 'font-size': ctx.fs(7.5), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle', 'letter-spacing': '.1em', class: 'fade',
        }, r.date ? monthName(r.date) : r.text.toUpperCase());
      }
    }
    captionLine(ctx, autoCaption(ctx.s, T), 306, 1.3);
  },
});
