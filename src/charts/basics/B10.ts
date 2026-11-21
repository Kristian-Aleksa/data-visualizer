// B10 Dot Heat — a punch-card heatmap: one dot per cell, dot area = count, three shades by thirds
// of the maximum. Quiet cells keep a tiny dot so silence stays visible; the peak gets a dashed
// ring.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { captionLine, label } from './shared';

const DAY = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const demoValue = (i: number, j: number) => {
  const day = i < 5 ? 1 : 0.32;
  const hour = Math.exp(-((j - 4.6) ** 2) / 7) + 0.7 * Math.exp(-((j - 8.4) ** 2) / 5);
  return Math.round(day * hour * 22 * (0.6 + rnd(i * 12 + j + 1, j + 3) * 0.8));
};
const DEMO = DAY.flatMap((day, i) => Array.from({ length: 12 }, (_, j) => ({ row: day, column: `${8 + j}:00`, value: demoValue(i, j) })));

const autoCaption = (s: Settings, max: number) =>
  `DOT AREA = ${String(s.measure ?? '').toUpperCase()} · DASHED RING = THE PEAK, ${max} · TINY DOT = A QUIET ${String(s.cellName ?? '').toUpperCase()}`;

/** Row and column labels in order of first appearance, and the cell grid. */
function grid(rows: { row: string; col: string; v: number }[]) {
  const R: string[] = [], C: string[] = [];
  const cells = new Map<string, number>();
  for (const r of rows) {
    if (!R.includes(r.row)) R.push(r.row);
    if (!C.includes(r.col)) C.push(r.col);
    cells.set(`${R.indexOf(r.row)}|${C.indexOf(r.col)}`, r.v);
  }
  return { R, C, cells };
}

export default defineChart({
  id: 'B10',
  name: 'Dot Heat',
  family: 'basics',
  kinds: ['heatmap', 'calendar'],
  description: 'A punch-card heatmap: dot area is the count; quiet cells keep a tiny dot.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 600,
      columns: [
        { key: 'row', label: 'Row', type: 'text', role: 'category', help: 'For example the day.' },
        { key: 'column', label: 'Column', type: 'text', role: 'category', help: 'For example the hour.' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: DEMO },
  text: {
    title: 'When support gets loud',
    subtitle: '7 days × 12 hours · dot area = tickets · biggest cell labeled · silence stays visible',
    source: 'DOT HEAT · MONO-BASIC · SUPPORT DESK',
  },
  fields: [
    { key: 'pitchX', label: 'Column spacing', group: 'options', section: 'Grid', type: 'number', min: 8, max: 60, step: 0.5, unit: 'px', default: 27 },
    { key: 'pitchY', label: 'Row spacing', group: 'options', section: 'Grid', type: 'number', min: 8, max: 60, step: 0.5, unit: 'px', default: 30 },
    { key: 'autoFit', label: 'Shrink to fit large grids', group: 'options', section: 'Grid', type: 'boolean', default: true },
    { key: 'baseRadius', label: 'Smallest dot', group: 'options', section: 'Dots', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.2 },
    { key: 'radiusScale', label: 'Dot growth', group: 'options', section: 'Dots', type: 'number', min: 0.1, max: 8, step: 0.05, default: 2.1, help: 'Radius = smallest dot + √value × this. Shrinks if dots would overlap.' },
    { key: 'quietRadius', label: 'Quiet-cell dot', group: 'options', section: 'Dots', type: 'number', min: 0, max: 4, step: 0.1, unit: 'px', default: 0.8, help: 'Drawn where the value is 0.' },
    { key: 'midStep', label: 'Middle shade from', group: 'options', section: 'Shades', type: 'number', min: 0, max: 100, step: 1, unit: '% of max', default: 33 },
    { key: 'highStep', label: 'Darkest shade from', group: 'options', section: 'Shades', type: 'number', min: 0, max: 100, step: 1, unit: '% of max', default: 66 },
    { key: 'peakRing', label: 'Ring the peak', group: 'options', section: 'Peak', type: 'boolean', default: true },
    { key: 'ringGap', label: 'Ring gap', group: 'options', section: 'Peak', type: 'number', min: 0, max: 12, step: 0.1, unit: 'px', default: 3.4 },
    { key: 'columnLabelEvery', label: 'Column label every', group: 'options', section: 'Labels', type: 'number', min: 1, max: 12, step: 1, unit: 'columns', default: 2 },
    { key: 'measure', label: 'What is counted', group: 'options', section: 'Units', type: 'text', default: 'tickets' },
    { key: 'cellName', label: 'One cell is a…', group: 'options', section: 'Units', type: 'text', default: 'hour', help: 'Used in the caption: “TINY DOT = A QUIET HOUR”.' },
  ],
  supports: { categoryLabels: true, caption: true },
  caption: (s, _T, d) => autoCaption(s, Math.max(0, ...(d.rows ?? []).map((r) => Number(r.value) || 0))),
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const { R, C, cells } = grid(ctx.rows.map((r) => ({ row: String(r.row), col: String(r.column), v: Number(r.value) })));
    let px = ctx.num('pitchX'), py = ctx.num('pitchY');
    if (ctx.bool('autoFit')) {
      if ((C.length - 1) * px > 297) px = 297 / Math.max(1, C.length - 1);
      if ((R.length - 1) * py > 180) py = 180 / Math.max(1, R.length - 1);
    }
    const x0 = (j: number) => 64 + j * px, y0 = (i: number) => 58 + i * py;
    let max = 0, mi = -1, mj = -1;
    for (let i = 0; i < R.length; i++) for (let j = 0; j < C.length; j++) {
      const t = cells.get(`${i}|${j}`);
      if (t !== undefined && t > max) [max, mi, mj] = [t, i, j];
    }
    const r0 = ctx.num('baseRadius');
    let rk = ctx.num('radiusScale');
    if (ctx.bool('autoFit') && max > 0) {
      const room = Math.min(px, py) * 0.5 - r0;
      if (r0 + Math.sqrt(max) * rk > Math.min(px, py) * 0.5 && room > 0) rk = room / Math.sqrt(max);
    }
    const hi = ctx.num('highStep') / 100, mid = ctx.num('midStep') / 100;
    const shade = (t: number) => (t > max * hi ? pick(T, '#1C1C1A', T.heat[0]) : t > max * mid ? pick(T, '#6A6963', T.heat[1]) : pick(T, '#B0AFA9', T.heat[2]));
    const measure = ctx.str('measure');
    for (let i = 0; i < R.length; i++) {
      if (ctx.bool('categoryLabels')) {
        txt(s, {
          x: 50, y: y0(i) + 3, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: T.label, 'text-anchor': 'end',
          'letter-spacing': '.08em', class: 'fade', style: `animation-delay:${i * 0.05}s`,
        }, R[i]);
      }
      for (let j = 0; j < C.length; j++) {
        const t = cells.get(`${i}|${j}`);
        if (t === undefined) continue;
        const x = x0(j), y = y0(i);
        const delay = `animation-delay:${i * 0.05 + j * 0.015}s`;
        if (!t) {
          const q = el(s, 'circle', { cx: x, cy: y, r: ctx.num('quietRadius'), fill: T.quiet, class: 'pop', style: delay });
          tip(q, `${R[i]} ${C[j]} — none`);
          continue;
        }
        const r = r0 + Math.sqrt(t) * rk;
        const dot = keyed(el(s, 'circle', { cx: x, cy: y, r, fill: shade(t), class: 'pop', style: delay }), `cell-${i}-${j}`);
        tip(dot, `${R[i]} ${C[j]} — ${label(ctx, t)} ${measure}`.trim());
        if (i === mi && j === mj && ctx.bool('peakRing')) {
          el(s, 'circle', {
            cx: x, cy: y, r: r + ctx.num('ringGap'), fill: 'none', stroke: T.hero, 'stroke-width': 1, 'stroke-dasharray': '2 3',
            class: 'fade', style: 'animation-delay:1s',
          });
        }
      }
    }
    if (ctx.bool('categoryLabels')) {
      const every = Math.max(1, Math.round(ctx.num('columnLabelEvery')));
      for (let j = 0; j < C.length; j += every) {
        txt(s, {
          x: x0(j), y: y0(R.length - 1) + 26, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faint, 'text-anchor': 'middle',
          class: 'fade', style: `animation-delay:${j * 0.02}s`,
        }, C[j]);
      }
    }
    captionLine(ctx, autoCaption(ctx.s, max), 306, 1.1);
  },
});
