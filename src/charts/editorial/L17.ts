// L17 Calendar Heat — a year as a wall of days: one column per week, one row per weekday, dot
// area = that day's count, a speck for a quiet day; the busiest day gets a dashed ring and a
// margin note.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { byPreset, pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { isoDay, laterInk, laterShades5, parseDate } from '../basics/shared';

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const val = (w: number, d: number) => {
  const season = 1 + 0.55 * Math.sin((w - 8) / 9); // two release seasons
  if (d >= 5) return rnd(w * 7 + d + 1, 3) > 0.82 ? 1 : 0; // weekends are nearly silent
  return Math.round(season * (2.5 + rnd(w * 7 + d + 1, d + 2) * 9) * (rnd(w + 1, d + 5) > 0.12 ? 1 : 0));
};
// 52 weeks from Monday 30 December 2024 ("the busiest day of 2025")
const DEMO = Array.from({ length: 364 }, (_, i) => ({ date: isoDay(2024, 12, 30 + i), value: val(Math.floor(i / 7), i % 7) }));

export default defineChart({
  id: 'L17',
  name: 'Calendar Heat',
  family: 'editorial',
  kinds: ['calendar', 'heatmap'],
  description: 'A year as a wall of days: a column per week, a row per weekday, dot area = that day’s count.',
  card: { width: 1400, chartHeight: 260 },
  size: { w: 840, h: 232 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 800,
      columns: [
        { key: 'date', label: 'Date', type: 'date', role: 'date', required: false, help: 'YYYY-MM-DD. Without dates, days fill the weeks in order from a Monday.' },
        { key: 'value', label: 'Count', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: DEMO },
  text: {
    title: 'A year of deploys, day by day',
    subtitle: '52 weeks × 7 days · dot area = deploys that day · tiny dot = a quiet day · dashed ring = the busiest day of 2025',
    source: 'CALENDAR HEAT · MONO-EDITORIAL · DEPLOY LOG',
  },
  fields: [
    { key: 'pitch', label: 'Day spacing', group: 'options', section: 'Grid', type: 'number', min: 4, max: 30, step: 0.1, unit: 'px', default: 14.8, help: 'Shrinks automatically when the weeks wouldn’t fit.' },
    { key: 'dotBase', label: 'Dot base size', group: 'options', section: 'Dots', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.1 },
    { key: 'dotScale', label: 'Dot growth per √count', group: 'options', section: 'Dots', type: 'number', min: 0, max: 5, step: 0.05, default: 1.55 },
    { key: 'midShare', label: 'Middle shade above', group: 'options', section: 'Dots', type: 'number', min: 0, max: 1, step: 0.01, default: 0.33, help: 'As a share of the busiest day.' },
    { key: 'topShare', label: 'Darkest shade above', group: 'options', section: 'Dots', type: 'number', min: 0, max: 1, step: 0.01, default: 0.66 },
    {
      key: 'monthLabels', label: 'Month labels', group: 'options', section: 'Labels', type: 'select', default: 'even',
      options: [{ value: 'even', label: 'Evenly spaced' }, { value: 'dates', label: 'Where each month starts (from the dates)' }, { value: 'none', label: 'None' }],
      help: 'Evenly spaced puts the twelve months evenly across 52 weeks, which is only roughly where they start.',
    },
    { key: 'peakNote', label: 'Note on the busiest day', group: 'options', section: 'Labels', type: 'text', default: 'the release-week spike — {max} deploys in a day', help: '{max} becomes the count. Empty hides the note.' },
    { key: 'unit', label: 'Count unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'deploys' },
  ],
  supports: { categoryLabels: true, dataLabels: true, caption: true },
  caption: () => 'ONE DOT = ONE DAY · DOT AREA = DEPLOYS · TINY DOT = A QUIET DAY',
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const raw = ctx.rows.map((r) => ({ date: parseDate(r.date), v: Math.max(0, Number(r.value) || 0) }));
    const dated = raw.length > 0 && raw.every((r) => r.date);
    // week column and weekday row for each day
    const t0 = dated ? Math.min(...raw.map((r) => r.date!.getTime())) : 0;
    const mon0 = dated ? t0 - ((new Date(t0).getUTCDay() + 6) % 7) * 86400000 : 0;
    const days = raw.map((r, i) => {
      if (!dated) return { w: Math.floor(i / 7), d: i % 7, v: r.v, date: null as Date | null };
      const k = Math.round((r.date!.getTime() - mon0) / 86400000);
      return { w: Math.floor(k / 7), d: ((k % 7) + 7) % 7, v: r.v, date: r.date };
    });
    const weeks = Math.max(1, ...days.map((x) => x.w + 1));
    const X0 = 56, Y0 = 42, P = Math.min(ctx.num('pitch'), weeks > 1 ? 770 / (weeks - 1) : Infinity);
    let max = 0, peak = -1;
    days.forEach((x, i) => {
      if (x.v > max || (x.v === max && peak >= 0 && (x.w < days[peak].w || (x.w === days[peak].w && x.d < days[peak].d)))) [max, peak] = [x.v, i];
    });
    const S5 = laterShades5(T), ink = laterInk(T);
    const mid = byPreset(T, { mono: T.label, porcelain: T.label, palm: T.ramp6[2], wire: T.label }, T.label);
    const boostW = (w: number) => w * (T.inkBoost?.strokeScale ?? 1);
    if (ctx.bool('categoryLabels')) {
      ['MON', 'WED', 'FRI', 'SUN'].forEach((lab, k) => {
        txt(s, { x: X0 - 10, y: Y0 + [0, 2, 4, 6][k] * P + 3, 'font-size': ctx.fs(6.5), 'font-weight': 700, fill: S5[2], 'text-anchor': 'end', 'letter-spacing': '.06em', class: 'fade', style: `animation-delay:${k * 0.04}s` }, lab);
      });
    }
    const mode = ctx.str('monthLabels');
    if (mode !== 'none' && ctx.bool('categoryLabels')) {
      const marks: [number, string][] = [];
      if (mode === 'dates' && dated) {
        let last = -1;
        days.forEach((x) => {
          const m = x.date!.getUTCFullYear() * 12 + x.date!.getUTCMonth();
          if (m !== last && x.date!.getUTCDate() <= 7) marks.push([x.w, MON[x.date!.getUTCMonth()]]);
          last = m;
        });
      } else {
        MON.forEach((m, k) => marks.push([Math.round((k * weeks) / 12), m]));
      }
      marks.forEach(([w, m], k) => {
        const x = X0 + w * P;
        txt(s, { x, y: Y0 - 16, 'font-size': ctx.fs(7), 'font-weight': 700, fill: T.muted, 'letter-spacing': '.1em', class: 'fade', style: `animation-delay:${k * 0.03}s` }, m);
        el(s, 'line', { x1: x, y1: Y0 - 11, x2: x, y2: Y0 - 5, stroke: T.faint, 'stroke-width': boostW(0.7), class: 'fade', style: `animation-delay:${k * 0.03}s` });
      });
    }
    const unit = ctx.str('unit');
    const radius = (t: number) => ctx.num('dotBase') + Math.sqrt(t) * ctx.num('dotScale');
    // week by week, Monday to Sunday
    days.map((x, i) => ({ ...x, i })).sort((a, b) => a.w - b.w || a.d - b.d).forEach(({ w, d, v, date }) => {
      const x = X0 + w * P, y = Y0 + d * P, delay = `animation-delay:${w * 0.012 + d * 0.004}s`;
      if (!v) {
        el(s, 'circle', { cx: x, cy: y, r: 0.75, fill: T.quiet, class: 'pop', style: delay });
        return;
      }
      const dot = el(keyed(el(s, 'g', {}), `w-${w}`), 'circle', {
        cx: x, cy: y, r: radius(v), fill: v > max * ctx.num('topShare') ? ink : v > max * ctx.num('midShare') ? mid : T.faintData, class: 'pop', style: delay,
      });
      tip(dot, `W${w + 1} ${DAYS[d]}${date ? ` · ${date.toISOString().slice(0, 10)}` : ''} — ${ctx.fmt(v)} ${unit}`.trim());
    });
    // peak: dashed ring + marginalia hairline
    if (peak >= 0 && max > 0) {
      const px = X0 + days[peak].w * P, py = Y0 + days[peak].d * P, pr = radius(max);
      el(s, 'circle', { cx: px, cy: py, r: pr + 3.6, fill: 'none', stroke: pick(T, '#1C1C1A', T.hero), 'stroke-width': boostW(1), 'stroke-dasharray': '2 3', class: 'fade', style: 'animation-delay:1s' });
      const note = ctx.str('peakNote').trim();
      if (note && ctx.bool('dataLabels')) {
        el(s, 'path', { d: `M${px + pr + 6} ${py + 6} C${px + 34} ${py + 30} ${px + 52} ${py + 36} ${px + 72} ${py + 36}`, fill: 'none', stroke: T.faintData, 'stroke-width': boostW(0.7), class: 'fade', style: 'animation-delay:1.1s' });
        txt(s, { x: px + 78, y: py + 39, 'font-size': ctx.fs(7), fill: T.label, 'font-style': 'italic', class: 'fade', style: 'animation-delay:1.15s' }, note.replace('{max}', ctx.fmt(max)));
      }
    }
    if (ctx.s.showCaption !== false) {
      txt(s, { x: 420, y: 222, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faintData, 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:1.2s' }, ctx.str('caption').trim() || 'ONE DOT = ONE DAY · DOT AREA = DEPLOYS · TINY DOT = A QUIET DAY');
    }
  },
});

