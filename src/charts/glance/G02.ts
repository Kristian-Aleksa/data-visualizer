// G02 Donut, Redesigned — a donut reworked as a waffle of 100 dots, one dot per percent, filled
// in order by source, with a legend of names and big percentages beside it.

import { defineChart } from '../../core/define';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { glanceFrame, hi } from './shared';

const DEMO: [string, number][] = [['Search', 34], ['Referral', 27], ['Social', 18], ['Partners', 12], ['Paid', 9]];
const LAD = ['#1C1C1A', '#4A4944', '#8F8E88', '#B0AFA9', '#D8D7D1'];

/** Split `total` dots in proportion to the values (largest remainder, so they always add up). */
function apportion(values: number[], total: number): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / sum) * total);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => [e - Math.floor(e), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let j = 0; left > 0 && j < order.length; j++, left--) out[order[j][1]]++;
  return out;
}

export default defineChart({
  id: 'G02',
  name: 'Donut, Redesigned',
  family: 'glance',
  kinds: ['part-to-whole'],
  description: 'A waffle of 100 dots instead of a donut: one dot per percent, filled by source.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 380, h: 300 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 8,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0, help: 'Any numbers: they are turned into shares of the dots.' },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, value]) => ({ label, value })) },
  text: {
    title: 'Where sign-ups come from',
    subtitle: 'Q2 2026 · every dot = 1% of new accounts',
    source: 'DONUT, REDESIGNED · MONO-REDESIGN · ATTRIBUTION',
  },
  fields: [
    { key: 'dots', label: 'Dots in all', group: 'options', section: 'Waffle', type: 'number', min: 10, max: 400, step: 1, default: 100, help: '100 = one dot per percent.' },
    { key: 'columns', label: 'Columns', group: 'options', section: 'Waffle', type: 'number', min: 1, max: 40, step: 1, default: 10 },
    { key: 'cell', label: 'Dot spacing', group: 'options', section: 'Waffle', type: 'number', min: 4, max: 60, step: 0.5, unit: 'px', default: 21 },
    { key: 'dotRadius', label: 'Dot size', group: 'options', section: 'Waffle', type: 'number', min: 1, max: 30, step: 0.1, unit: 'px', default: 7.5 },
    { key: 'legendX', label: 'Legend position', group: 'options', section: 'Legend', type: 'number', min: 0, max: 380, step: 1, unit: 'px', default: 246 },
    { key: 'legendGap', label: 'Legend row spacing', group: 'options', section: 'Legend', type: 'number', min: 16, max: 80, step: 1, unit: 'px', default: 40 },
    { key: 'strongRows', label: 'Bold percentages for the top', group: 'options', section: 'Legend', type: 'number', min: 0, max: 8, step: 1, unit: 'rows', default: 2 },
  ],
  supports: { dataLabels: true, tooltip: true },
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  frame: glanceFrame,
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), v: Number(r.value) }));
    const total = Math.round(ctx.num('dots'));
    const counts = apportion(rows.map((r) => r.v), total);
    const sum = rows.reduce((a, r) => a + r.v, 0) || 1;
    const COLS = Math.round(ctx.num('columns')), CELL = ctx.num('cell'), R = ctx.num('dotRadius'), X0 = 8, Y0 = 10;
    const colour = (g: number) => (T.kind === 'mono' ? LAD[g % LAD.length] : g === 0 ? hi(T, T.ser[0]) : T.ser[g % T.ser.length]);
    const groups = rows.map((_, g) => keyed(el(s, 'g', {}), `src-${g}`));
    let idx = 0;
    rows.forEach((r, g) => {
      tip(groups[g], `${r.name} — ${Math.round((r.v / sum) * 1000) / 10}%`);
      for (let k = 0; k < counts[g]; k++) {
        const c = idx + k, row = Math.floor(c / COLS), col = c % COLS;
        el(groups[g], 'circle', { cx: X0 + col * CELL + R, cy: Y0 + row * CELL + R, r: R, fill: colour(g), class: 'pop', style: `animation-delay:${c * 0.008 + g * 0.05}s` });
      }
      idx += counts[g];
    });
    if (ctx.bool('dataLabels')) {
      const lx = ctx.num('legendX'), gap = ctx.num('legendGap'), strong = Math.round(ctx.num('strongRows'));
      rows.forEach((r, g) => {
        // drawn after all the dots; shares the dots' hover key
        const lg = keyed(el(s, 'g', {}), `src-${g}`);
        tip(lg, `${r.name} — ${Math.round((r.v / sum) * 1000) / 10}%`);
        const y = 26 + g * gap;
        el(lg, 'circle', { cx: lx, cy: y, r: 6, fill: colour(g) });
        txt(lg, { x: lx + 14, y: y - 1, 'font-size': ctx.fs(10.5), 'font-weight': 600, fill: T.text }, r.name);
        txt(lg, { x: lx + 14, y: y + 13, 'font-size': ctx.fs(15), 'font-weight': 800, fill: g < strong ? T.text : pick(T, '#8F8E88', T.muted) }, `${Math.round((r.v / sum) * 100)}%`);
      });
    }
  },
});
