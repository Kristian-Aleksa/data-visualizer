// L16 Matrix Heat — a category × category matrix in five shades (darker = higher); the diagonal
// is a dash (a thing with itself), zeros are specks, and the strongest pair gets a dashed box and
// its number. Values usually mirror across the diagonal.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import type { Row } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { laterShades5 } from '../basics/shared';

const FEAT = ['EDITOR', 'BOARDS', 'DOCS', 'CHAT', 'FLOWS', 'VAULT', 'PAGES', 'SYNC'];
const demo = (i: number, j: number) => {
  const a = Math.min(i, j), b = Math.max(i, j);
  const pop = (((8 - a) / 8) * (8 - b)) / 8; // the big features overlap most
  return Math.round(pop * 62 * (0.35 + rnd(a * 8 + b + 1, a + b + 3) * 0.9));
};
const DEMO: Row[] = FEAT.flatMap((row, i) => FEAT.flatMap((column, j) => (i === j ? [] : [{ row, column, value: demo(i, j) }])));

export default defineChart({
  id: 'L16',
  name: 'Matrix Heat',
  family: 'editorial',
  kinds: ['heatmap'],
  description: 'A category × category matrix in five shades, with the strongest pair boxed.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 900,
      columns: [
        { key: 'row', label: 'Row', type: 'text', role: 'category' },
        { key: 'column', label: 'Column', type: 'text', role: 'category' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0, help: '0 draws a speck.' },
      ],
    }],
  },
  defaultData: { rows: DEMO },
  text: {
    title: 'Which features get used together',
    subtitle: '8 × 8 co-usage · shade = share of accounts using both · dashed square = strongest pair',
    source: 'MATRIX HEAT · MONO-EDITORIAL · PRODUCT ANALYTICS',
  },
  fields: [
    { key: 'symmetric', label: 'Mirror across the diagonal', group: 'options', section: 'Matrix', type: 'boolean', default: true, help: 'A pair given one way fills in the other way too.' },
    { key: 'markDiagonal', label: 'Dash on the diagonal', group: 'options', section: 'Matrix', type: 'boolean', default: true, help: 'Off shows the diagonal’s own values, if any.' },
    { key: 'break1', label: 'Second shade above', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 6 },
    { key: 'break2', label: 'Third shade above', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 14 },
    { key: 'break3', label: 'Fourth shade above', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 24 },
    { key: 'break4', label: 'Darkest shade above', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 36 },
    { key: 'cell', label: 'Cell size', group: 'options', section: 'Cells', type: 'number', min: 4, max: 60, step: 0.5, unit: 'px', default: 22 },
    { key: 'cellGap', label: 'Gap between cells', group: 'options', section: 'Cells', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 4 },
    { key: 'cellRadius', label: 'Cell rounding', group: 'options', section: 'Cells', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 4 },
    { key: 'autoFit', label: 'Shrink to fit large matrices', group: 'options', section: 'Cells', type: 'boolean', default: true },
    { key: 'boxStrongest', label: 'Box the strongest pair', group: 'options', section: 'Cells', type: 'boolean', default: true },
    { key: 'legendTitle', label: 'Legend title', group: 'options', section: 'Legend', type: 'text', default: 'SHADE = %' },
    { key: 'valueSuffix', label: 'Value suffix', group: 'options', section: 'Legend', type: 'text', default: '%', help: 'After the legend ranges and in tooltips.' },
    { key: 'measure', label: 'Tooltip ending', group: 'options', section: 'Legend', type: 'text', default: 'of accounts use both' },
  ],
  supports: { dataLabels: true, categoryLabels: true, legend: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const cats: string[] = [];
    const cells = new Map<string, number>();
    for (const r of ctx.rows) {
      const a = String(r.row), b = String(r.column);
      for (const c of [a, b]) if (!cats.includes(c)) cats.push(c);
      cells.set(`${a}|${b}`, Math.max(0, Number(r.value)));
    }
    if (ctx.bool('symmetric')) {
      for (const [k, v] of [...cells]) {
        const [a, b] = k.split('|');
        if (!cells.has(`${b}|${a}`)) cells.set(`${b}|${a}`, v);
      }
    }
    const n = cats.length;
    const diag = ctx.bool('markDiagonal');
    const v = (i: number, j: number) => (i === j && diag ? -1 : cells.get(`${cats[i]}|${cats[j]}`) ?? 0);
    const b = [ctx.num('break1'), ctx.num('break2'), ctx.num('break3'), ctx.num('break4')];
    const S5 = laterShades5(T);
    const shade = (t: number) => (t > b[3] ? S5[0] : t > b[2] ? S5[1] : t > b[1] ? S5[2] : t > b[0] ? S5[3] : S5[4]);
    let C = ctx.num('cell'), P = C + ctx.num('cellGap');
    if (ctx.bool('autoFit') && n * P > 208) {
      const k = 208 / (n * P);
      C *= k;
      P *= k;
    }
    const X0 = 118, Y0 = 70;
    let max = 0, mi = -1, mj = -1;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (v(i, j) > max) [max, mi, mj] = [v(i, j), i, j];
    if (ctx.bool('categoryLabels')) {
      cats.forEach((f, i) => {
        txt(s, { x: X0 - 10, y: Y0 + i * P + C / 2 + 3, 'font-size': ctx.fs(7), 'font-weight': 700, fill: T.label, 'text-anchor': 'end', 'letter-spacing': '.06em', class: 'fade', style: `animation-delay:${i * 0.04}s` }, f);
        const cy = Y0 - 10, cx = X0 + i * P + C / 2;
        txt(s, { x: cx, y: cy, 'font-size': ctx.fs(7), 'font-weight': 700, fill: T.muted, 'letter-spacing': '.06em', transform: `rotate(-55 ${cx} ${cy})`, class: 'fade', style: `animation-delay:${i * 0.04}s` }, f);
      });
    }
    const suffix = ctx.str('valueSuffix');
    const rr = Math.min(ctx.num('cellRadius'), C / 2);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = X0 + j * P, y = Y0 + i * P, t = v(i, j), d = `animation-delay:${(i + j) * 0.02}s`;
        if (t < 0) {
          el(s, 'rect', { x: x + C / 2 - 3, y: y + C / 2 - 0.6, width: 6, height: 1.2, fill: T.quiet, class: 'fade', style: d });
          continue;
        }
        if (!t) {
          el(s, 'circle', { cx: x + C / 2, cy: y + C / 2, r: 0.9, fill: T.quiet, class: 'pop', style: d });
          continue;
        }
        const g = keyed(el(s, 'g', {}), `c-${Math.min(i, j)}-${Math.max(i, j)}`);
        const cell = el(g, 'rect', { x, y, width: C, height: C, rx: rr, fill: shade(t), class: 'pop', style: d });
        tip(cell, `${cats[i]} × ${cats[j]} — ${ctx.fmt(t)}${suffix} ${ctx.str('measure')}`.trim());
        if (i === mi && j === mj && ctx.bool('boxStrongest')) {
          el(g, 'rect', { x: x - 3.5, y: y - 3.5, width: C + 7, height: C + 7, rx: rr + 2, fill: 'none', stroke: pick(T, '#1C1C1A', T.hero), 'stroke-width': pick(T, 1, 1.8), 'stroke-dasharray': '2 3', class: 'fade', style: 'animation-delay:.9s' });
          if (ctx.bool('dataLabels')) txt(g, { x: x + C / 2, y: y + C / 2 + 3.5, 'font-size': ctx.fs(9), 'font-weight': 800, fill: T.bg, 'text-anchor': 'middle', class: 'fade', style: 'animation-delay:1s' }, ctx.fmt(t));
        }
      }
    }
    // shade legend, countable buckets
    if (ctx.str('legend') !== 'hidden') {
      const lo = [0, ...b.map((x) => Math.floor(x))];
      const labels = [`${lo[0] + 1}–${lo[1]}`, `${lo[1] + 1}–${lo[2]}`, `${lo[2] + 1}–${lo[3]}`, `${lo[3] + 1}–${lo[4]}`, `${lo[4] + 1}+`];
      [S5[4], S5[3], S5[2], S5[1], S5[0]].forEach((c, k) => {
        const x = 118 + k * 54;
        el(s, 'rect', { x, y: 292, width: 9, height: 9, rx: 2, fill: c, class: 'fade', style: `animation-delay:${1 + k * 0.05}s` });
        txt(s, { x: x + 13, y: 300, 'font-size': ctx.fs(6.5), 'font-weight': 600, fill: S5[2], class: 'fade', style: `animation-delay:${1 + k * 0.05}s` }, labels[k] + suffix);
      });
      txt(s, { x: 36, y: 300, 'font-size': ctx.fs(7), 'font-weight': 600, fill: S5[3], 'letter-spacing': '.1em', class: 'fade', style: 'animation-delay:1s' }, ctx.str('legendTitle'));
    }
  },
});
