// L03 Barcode Lollipop — every day is a full-height hairline (the barcode); the day's peak is a
// dot with a stem hanging below it (texture, not data); the top three peaks are labelled. The
// card puts its text in a column beside the chart.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { isoDay, isWeekend, parseDate, r3 } from '../basics/shared';

const N = 90;
const val = (d: number) => 95 + 55 * Math.sin(d / 9.5) + 30 * Math.sin(d / 3.7) + rnd(d + 1, 5) * 40;
const DEMO = Array.from({ length: N }, (_, d) => ({ date: isoDay(2026, 4, 1 + d), value: r3(val(d)) }));
const DEMO_MAX = Math.max(...DEMO.map((r) => r.value));
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const NOTE = 'Every hairline is a day, whether or not anything happened in it. The dot marks the day\'s peak; the stem below it is just gravity. Read the field, not the numbers — the season has a texture before it has a value.';
const LEGEND = ['●  WEEKDAY PEAK', '○  WEEKEND PEAK', '│  ONE CALENDAR DAY', '◉  TOP-3, LABELED'].join('\n');

export default defineChart({
  id: 'L03',
  name: 'Barcode Lollipop',
  family: 'editorial',
  kinds: ['lines', 'time'],
  description: 'Every day a hairline; each day’s peak a dot on a hanging stem; the top three labelled.',
  card: { width: 1400, chartHeight: 340, side: 250 },
  size: { w: 800, h: 300 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 2,
      maxRows: 400,
      columns: [
        { key: 'date', label: 'Date', type: 'date', role: 'date', required: false, help: 'YYYY-MM-DD. Used for the month labels (and weekends, if you choose).' },
        { key: 'value', label: 'Peak', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: DEMO },
  defaults: { numSuffix: 'k' },
  text: {
    title: 'Ninety days as a barcode',
    subtitle: 'peak concurrent users, daily · Apr – Jun 2026',
    source: 'BARCODE LOLLIPOP · MONO-EDITORIAL · LIVE OPS',
  },
  fields: [
    { key: 'note', label: 'Note', group: 'text', section: 'Side column', type: 'text', multiline: true, default: NOTE },
    { key: 'legend', label: 'Legend', group: 'text', section: 'Side column', type: 'text', multiline: true, default: LEGEND, help: 'One line per row.' },
    { key: 'fillWidth', label: 'Spread days across the width', group: 'options', section: 'Layout', type: 'boolean', default: true },
    { key: 'daySpacing', label: 'Day spacing', group: 'options', section: 'Layout', type: 'number', min: 1, max: 40, step: 0.01, unit: 'px', default: 8.53, when: (s) => s.fillWidth === false },
    { key: 'peakHeight', label: 'Height of the highest day', group: 'options', section: 'Layout', type: 'number', min: 10, max: 150, step: 1, unit: '%', default: 100, help: '100% is the standard height for the highest value.' },
    { key: 'stemMin', label: 'Shortest stem', group: 'options', section: 'Stems and dots', type: 'number', min: 0, max: 100, step: 0.5, unit: 'px', default: 14 },
    { key: 'stemJitter', label: 'Stem length variation', group: 'options', section: 'Stems and dots', type: 'number', min: 0, max: 100, step: 0.5, unit: 'px', default: 26 },
    { key: 'stemWidth', label: 'Stem width', group: 'options', section: 'Stems and dots', type: 'number', min: 0, max: 5, step: 0.05, unit: 'px', default: 1.1, help: 'Colour palettes draw stems a little thicker (1.5 px).' },
    { key: 'dotRadius', label: 'Dot size', group: 'options', section: 'Stems and dots', type: 'number', min: 0.5, max: 10, step: 0.1, unit: 'px', default: 2.7 },
    { key: 'peakRadius', label: 'Peak dot size', group: 'options', section: 'Stems and dots', type: 'number', min: 0.5, max: 14, step: 0.1, unit: 'px', default: 4.6 },
    {
      key: 'hollowDays', label: 'Hollow dots', group: 'options', section: 'Stems and dots', type: 'select', default: 'original',
      options: [{ value: 'original', label: 'Days 6 and 7 of every week' }, { value: 'weekends', label: 'Weekends (from the dates)' }, { value: 'none', label: 'None' }],
      help: 'Counting weeks from the first row: with the demo’s April 1 start the hollow dots fall on Mondays and Tuesdays.',
    },
    { key: 'peakCount', label: 'Peaks labelled', group: 'options', section: 'Peaks', type: 'number', min: 0, max: 20, step: 1, default: 3 },
    { key: 'peakGap', label: 'Days between labelled peaks', group: 'options', section: 'Peaks', type: 'number', min: 1, max: 60, step: 1, unit: 'days', default: 6, help: 'At least this far apart, so labels never collide.' },
    { key: 'barcodeWidth', label: 'Barcode line width', group: 'options', section: 'Barcode', type: 'number', min: 0, max: 4, step: 0.05, unit: 'px', default: 0.7 },
    { key: 'unit', label: 'Value unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'peak' },
  ],
  supports: { dataLabels: true, categoryLabels: true, grid: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ date: parseDate(r.date), raw: String(r.date ?? ''), v: Math.max(0, Number(r.value)) }));
    const n = rows.length;
    const pitch = ctx.bool('fillWidth') ? (8.53 * 89) / Math.max(1, n - 1) : ctx.num('daySpacing');
    const X = (d: number) => 18 + d * pitch;
    const vs = rows.map((r) => r.v);
    const k = (0.75 * (DEMO_MAX / Math.max(1e-9, Math.max(...vs)))) * (ctx.num('peakHeight') / 100);
    // the barcode: one hairline per day, full height
    if (ctx.bool('showGrid')) {
      for (let d = 0; d < n; d++) {
        el(s, 'line', { x1: X(d), y1: 8, x2: X(d), y2: 258, stroke: T.grid, 'stroke-width': ctx.num('barcodeWidth'), class: 'fade', style: `animation-delay:${d * 0.004}s` });
      }
    }
    // top peaks, kept apart so labels never collide
    const top: number[] = [];
    const want = Math.round(ctx.num('peakCount')), gap = Math.round(ctx.num('peakGap'));
    for (const d of vs.map((_, i) => i).sort((a, b) => vs[b] - vs[a])) {
      if (top.length >= want) break;
      if (top.every((t) => Math.abs(t - d) >= gap)) top.push(d);
    }
    const vlo = Math.min(...vs), vhi = Math.max(...vs);
    const vband = (v: number) => 1 + Math.min(3, Math.floor(((v - vlo) / (vhi - vlo + 1e-9)) * 4));
    const hollowMode = ctx.str('hollowDays');
    const unit = ctx.str('unit');
    const stemW = ctx.num('stemWidth') * pick(T, 1, 1.5 / 1.1);
    rows.forEach((row, d) => {
      const x = X(d), v = vs[d], y = 252 - v * k;
      const weekend = hollowMode === 'original' ? d % 7 === 5 || d % 7 === 6 : hollowMode === 'weekends' ? !!row.date && isWeekend(row.date) : false;
      const col = T.ramp[vband(v)];
      const g = keyed(el(s, 'g', {}), `d-${d}`);
      const stemEnd = Math.min(256, y + ctx.num('stemMin') + rnd(d + 1, 9) * ctx.num('stemJitter'));
      el(g, 'line', { x1: x, y1: y, x2: x, y2: stemEnd, stroke: pick(T, T.text, col), 'stroke-width': Math.round(stemW * 1000) / 1000, class: 'fade', style: `animation-delay:${0.3 + d * 0.008}s` });
      const big = top.includes(d);
      const dot = el(g, 'circle', {
        cx: x, cy: y, r: big ? ctx.num('peakRadius') : ctx.num('dotRadius'),
        fill: weekend ? T.bg : pick(T, T.text, big ? T.hero : col), stroke: pick(T, T.text, big ? T.hero : col), 'stroke-width': weekend ? pick(T, 1.2, 1.4) : 0,
        class: 'pop', style: `animation-delay:${0.3 + d * 0.008}s`,
      });
      const when = row.date ? `${MONTHS[row.date.getUTCMonth()].charAt(0)}${MONTHS[row.date.getUTCMonth()].slice(1).toLowerCase()} ${row.date.getUTCDate()}` : `Day ${d + 1}`;
      tip(dot, `${when} — ${ctx.fmt(Math.round(v))} ${unit}`.trim());
      if (big && ctx.bool('dataLabels')) {
        txt(g, { x, y: y - 10, 'font-size': ctx.fs(9), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle', class: 'fade', style: `animation-delay:${0.9 + d * 0.004}s` }, ctx.fmt(Math.round(v)));
      }
    });
    // month labels at the first day of each month
    if (ctx.bool('categoryLabels')) {
      let last = -1;
      rows.forEach((row, d) => {
        if (!row.date) return;
        const m = row.date.getUTCFullYear() * 12 + row.date.getUTCMonth();
        if (m === last) return;
        last = m;
        txt(s, { x: X(d), y: 276, 'font-size': ctx.fs(8), 'font-weight': 600, fill: T.muted, 'letter-spacing': '.12em', class: 'fade' }, MONTHS[row.date.getUTCMonth()]);
      });
    }
  },
});
