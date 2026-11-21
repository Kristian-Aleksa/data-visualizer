// G12 Single Axis — small multiples: one row per weekday, each with its own hour axis; dot size =
// tickets. Weekends are pale.

import { defineChart } from '../../core/define';
import { backOut } from '../../core/ease';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { categories, MID, progress } from './plot';
import { glanceFrame, hi } from './shared';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONO_L = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];
const demoValue = (di: number, h: number) => {
  const workday = di < 5, core = h >= 9 && h <= 17;
  return Math.round((workday && core ? 6 + 5 * Math.sin(((h - 9) / 8) * Math.PI) : 0) + ((h + di) % 5 === 0 ? 2 : 0) + (h >= 22 || h <= 5 ? 0 : 1));
};

export default defineChart({
  id: 'G12',
  name: 'Single Axis',
  family: 'glance',
  kinds: ['heatmap', 'time'],
  description: 'Small multiples: one dot row per day on its own hour axis; dot size = volume.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 2000,
      columns: [
        { key: 'row', label: 'Row', type: 'text', role: 'category', help: 'For example the day.' },
        { key: 'column', label: 'Column', type: 'text', role: 'category', help: 'For example the hour, 00–23.' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: DAYS.flatMap((row, di) => Array.from({ length: 24 }, (_, h) => ({ row, column: String(h).padStart(2, '0'), value: demoValue(di, h) }))) },
  text: {
    title: 'Support load, day by day',
    subtitle: 'tickets per hour · each row is its own axis · dot = volume',
    source: 'SINGLE AXIS · MONO-FANCY3 · SUPPORT DESK',
  },
  fields: [
    { key: 'dotScale', label: 'Dot size per unit', group: 'options', section: 'Dots', type: 'number', min: 0.1, max: 20, step: 0.1, unit: 'px', default: 2.6, help: 'Dot diameter = value × this.' },
    { key: 'dotOpacity', label: 'Dot opacity', group: 'options', section: 'Dots', type: 'number', min: 0.05, max: 1, step: 0.01, default: 0.8 },
    { key: 'quietRows', label: 'Pale rows from row', group: 'options', section: 'Dots', type: 'number', min: 0, max: 30, step: 1, default: 6, help: 'Rows from this one on are drawn pale (6 = Saturday and Sunday). 0 = none.' },
    { key: 'labelColumn', label: 'Row label column', group: 'options', section: 'Layout', type: 'number', min: 20, max: 200, step: 1, unit: 'px', default: 52 },
    { key: 'rowGap', label: 'Gap between rows', group: 'options', section: 'Layout', type: 'number', min: 0, max: 13, step: 0.1, unit: '% of height', default: 8 },
    { key: 'axisRoom', label: 'Room for hour labels', group: 'options', section: 'Layout', type: 'number', min: 0, max: 60, step: 1, unit: 'px', default: 0, help: 'With none, the hour labels fall off the bottom. Give them 20 px to show them.' },
    { key: 'labelEvery', label: 'Hour label every', group: 'options', section: 'Layout', type: 'number', min: 1, max: 24, step: 1, unit: 'columns', default: 4 },
    { key: 'rowDelay', label: 'Delay between rows', group: 'options', section: 'Animation', type: 'number', min: 0, max: 2000, step: 10, unit: 'ms', default: 160 },
    { key: 'measure', label: 'What is counted', group: 'options', section: 'Units', type: 'text', default: 'tickets' },
  ],
  supports: { categoryLabels: true, axes: true, hover: true },
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => {
    const rowsN = new Set(ctx.rows.map((r) => String(r.row))).size;
    return 0.5 + (Math.max(0, rowsN - 1) * (ctx.num('rowDelay') / 1000) + 23 * 0.014) * ctx.stagger;
  },
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H0 } = ctx;
    const R: string[] = [], C: string[] = [];
    const cells: { r: number; c: number; v: number }[] = [];
    for (const row of ctx.rows) {
      const rn = String(row.row), cn = String(row.column);
      if (!R.includes(rn)) R.push(rn);
      if (!C.includes(cn)) C.push(cn);
      cells.push({ r: R.indexOf(rn), c: C.indexOf(cn), v: Number(row.value) });
    }
    const n = R.length;
    const H = H0 - ctx.num('axisRoom');
    const left = ctx.num('labelColumn'), right = 14;
    const per = 100 / n, gap = Math.min(per - 0.5, ctx.num('rowGap'));
    const rowTop = (i: number) => ((i * per + 6 * (7 / n)) / 100) * H;
    const rowH = ((per - gap) / 100) * H;
    const axis = categories(C.length, left, W - left - right, false);
    const quietFrom = Math.round(ctx.num('quietRows'));
    const colour = (i: number) => {
      if (quietFrom > 0 && i >= quietFrom - 1) return pick(T, '#C6C5BF', T.faintData);
      if (T.kind === 'mono') return MONO_L[Math.min(4, i)];
      return i === 0 ? hi(T, T.ser[0]) : T.ser[i % T.ser.length];
    };
    if (ctx.bool('categoryLabels')) {
      const fs = ctx.fs(9);
      R.forEach((name, i) => txt(s, {
        x: 5, y: H * ((i + 0.5) / n - 0.01) + 5 + MID * fs, 'font-size': fs, 'font-weight': 700, fill: T.muted, class: 'fade', style: 'animation-duration:.4s',
      }, name));
    }
    if (ctx.bool('showAxes')) {
      const fs = ctx.fs(8.5), every = Math.max(1, Math.round(ctx.num('labelEvery')));
      const y = rowTop(n - 1) + rowH + 8 + fs / 2;
      if (y + fs / 2 <= H0) {
        for (let c = 0; c < C.length; c += every) {
          txt(s, { x: axis.at(c), y: y + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': 'middle', class: 'fade', style: 'animation-duration:.4s' }, C[c]);
        }
      }
    }
    const k = ctx.num('dotScale') / 2, op = ctx.num('dotOpacity');
    const rowDelay = ctx.num('rowDelay') / 1000;
    const groups = R.map((_, i) => keyed(el(s, 'g', {}), `row-${i}`));
    const seen = new Array(n).fill(0);
    for (const cell of cells) {
      if (!(cell.v > 0)) continue;
      const di = seen[cell.r]++;
      const e = progress(ctx, cell.r * rowDelay + di * 0.014, 0.5, backOut);
      if (e <= 0) continue;
      const dot = el(groups[cell.r], 'circle', {
        cx: axis.at(cell.c), cy: rowTop(cell.r) + rowH / 2, r: Math.max(0, cell.v * k * e), fill: colour(cell.r), opacity: op,
      });
      tip(dot, `${R[cell.r]} ${C[cell.c]}:00 — ${ctx.fmt(cell.v)} ${ctx.str('measure')}`.trim());
    }
  },
});
