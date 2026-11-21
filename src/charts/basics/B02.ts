// B02 Hairline Line — a hairline through one dot per day, over a "barcode" calendar floor (one
// tick per day, busy or not). Weekends are hollow; the biggest days are enlarged and labelled.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { boost } from '../../core/theme';
import { el, tip, txt } from '../../core/vnode';
import { captionLine, dayName, isoDay, isWeekend, label, parseDate, peaks, r2, threeTicks } from './shared';

const val = (d: number) => 46 + 22 * Math.sin(d / 4.6) + 14 * Math.sin(d / 2.1) + rnd(d + 1, 5) * 12;
const DEMO = Array.from({ length: 30 }, (_, d) => ({ date: isoDay(2026, 6, 1 + d), value: r2(val(d)) }));
const DEMO_MAX = Math.max(...DEMO.map((r) => r.value));
/** default vertical scale: px per sign-up */
const SCALE = 2.15;
/** default horizontal extent: 30 days, 11.7 px apart, from x = 30 */
const X0 = 30;
const SPAN = 29 * 11.7;

const autoCaption = (hollow: boolean) => (hollow ? 'ONE DOT = ONE DAY · HOLLOW = WEEKEND' : 'ONE DOT = ONE DAY');

export default defineChart({
  id: 'B02',
  name: 'Hairline Line',
  family: 'basics',
  kinds: ['lines', 'time'],
  description: 'A hairline with one dot per day over a calendar floor; weekends are hollow.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 2,
      maxRows: 120,
      columns: [
        { key: 'date', label: 'Date', type: 'date', role: 'date', required: false, help: 'YYYY-MM-DD. Used for weekends and the axis labels.' },
        { key: 'value', label: 'Value', type: 'number', role: 'value' },
      ],
    }],
  },
  defaultData: { rows: DEMO },
  text: {
    title: 'Thirty days of sign-ups',
    subtitle: 'one dot = one day · hollow = weekend · the barcode floor keeps the calendar honest',
    source: 'HAIRLINE LINE · MONO-BASIC · GROWTH',
  },
  fields: [
    { key: 'fillWidth', label: 'Spread days across the width', group: 'options', section: 'Layout', type: 'boolean', default: true },
    { key: 'daySpacing', label: 'Day spacing', group: 'options', section: 'Layout', type: 'number', min: 2, max: 40, step: 0.1, unit: 'px', default: 11.7, when: (s) => s.fillWidth === false },
    { key: 'peakHeight', label: 'Height of the busiest day', group: 'options', section: 'Layout', type: 'number', min: 10, max: 120, step: 1, unit: '%', default: 100, help: '100% is the standard height for the highest value.' },
    { key: 'lineWidth', label: 'Line width', group: 'options', section: 'Line and dots', type: 'number', min: 0, max: 5, step: 0.1, unit: 'px', default: 1, help: 'Colour palettes draw lines 2.2× thicker.' },
    { key: 'dotRadius', label: 'Dot size', group: 'options', section: 'Line and dots', type: 'number', min: 0, max: 8, step: 0.1, unit: 'px', default: 2.1 },
    { key: 'hollowWeekends', label: 'Hollow weekends', group: 'options', section: 'Line and dots', type: 'boolean', default: true },
    { key: 'peakCount', label: 'Labelled peaks', group: 'options', section: 'Peaks', type: 'number', min: 0, max: 10, step: 1, default: 2 },
    { key: 'peakGap', label: 'Peaks at least … apart', group: 'options', section: 'Peaks', type: 'number', min: 1, max: 30, step: 1, unit: 'days', default: 5 },
    { key: 'peakRadius', label: 'Peak dot size', group: 'options', section: 'Peaks', type: 'number', min: 0, max: 12, step: 0.1, unit: 'px', default: 4.2 },
    { key: 'peakLabelGap', label: 'Peak label gap', group: 'options', section: 'Peaks', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 11 },
    { key: 'showFloor', label: 'Calendar floor', group: 'options', section: 'Floor', type: 'boolean', default: true },
    { key: 'floorHeight', label: 'Floor tick height', group: 'options', section: 'Floor', type: 'number', min: 1, max: 30, step: 0.5, unit: 'px', default: 7, when: (s) => s.showFloor !== false },
    { key: 'measure', label: 'What is counted', group: 'options', section: 'Units', type: 'text', default: 'sign-ups', help: 'Shown in tooltips after the value.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true, hover: false },
  caption: (s) => autoCaption(s.hollowWeekends !== false),
  paletteNeeds: ['highlight'],
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
    const x1 = x(Math.max(0, n - 1));

    if (ctx.bool('showFloor')) {
      for (let d = 0; d < n; d++) {
        el(s, 'line', { x1: x(d), y1: base, x2: x(d), y2: base - ctx.num('floorHeight'), stroke: T.floor, 'stroke-width': 0.6, class: 'fade', style: `animation-delay:${d * 0.008}s` });
      }
    }
    el(s, 'line', { x1: X0 - 6, y1: base, x2: Math.max(376, x1 + 6), y2: base, stroke: T.grid, 'stroke-width': 0.8, class: 'fade' });
    const top = peaks(vs, Math.round(ctx.num('peakCount')), ctx.num('peakGap'));
    const pts = vs.map((v, d) => `${x(d)} ${map(v)}`).join(' L ');
    const lw = ctx.num('lineWidth') * boost(T, 1, 2.2);
    if (lw > 0) el(s, 'path', { d: 'M' + pts, fill: 'none', stroke: T.data, 'stroke-width': lw, class: 'draw', style: 'animation-duration:1.2s' });
    const hollow = ctx.bool('hollowWeekends');
    const unit = ctx.str('measure');
    vs.forEach((v, d) => {
      const row = rows[d];
      const weekend = hollow && (row.date ? isWeekend(row.date) : d % 7 === 5 || d % 7 === 6);
      const big = top.includes(d);
      const r = (big ? ctx.num('peakRadius') : ctx.num('dotRadius')) + boost(T, 0, 1);
      const dot = el(s, 'circle', {
        cx: x(d), cy: map(v), r,
        fill: weekend ? T.bg : big ? T.hero : T.data, stroke: big ? T.hero : T.data, 'stroke-width': weekend ? boost(T, 1, 1.4) : 0,
        class: 'pop', style: `animation-delay:${0.2 + d * 0.03}s`,
      });
      const when = row.date ? dayName(row.date) : row.text || `Day ${d + 1}`;
      tip(dot, `${when} — ${label(ctx, v)} ${unit}`.trim());
      if (big && ctx.bool('dataLabels')) {
        txt(s, {
          x: x(d), y: map(v) - ctx.num('peakLabelGap'), 'font-size': ctx.fs(9.5), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle',
          style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:${1 + d * 0.01}s`, class: 'fade',
        }, label(ctx, v));
      }
    });
    if (ctx.bool('categoryLabels')) {
      for (const d of threeTicks(n)) {
        const row = rows[d];
        txt(s, {
          x: x(d), y: base + 18, 'font-size': ctx.fs(7.5), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle',
          'letter-spacing': '.1em', class: 'fade',
        }, row.date ? dayName(row.date) : row.text.toUpperCase());
      }
    }
    captionLine(ctx, autoCaption(hollow), 306, 1.1);
  },
});
