// G18 Matrix Heat (Glance) — big rounded cells, each carrying its number; five shades by fixed
// breaks so the "newer versions run darker" diagonal reads in seconds.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { el, keyed, tip, txt } from '../../core/vnode';
import { captionLine, laterInk, laterShades5 } from '../basics/shared';
import { glanceFrame } from './shared';

const FEAT = ['EDITOR', 'BOARDS', 'DOCS', 'CHAT', 'FLOWS', 'VAULT'];
const VER = ['v2.0', 'v1.9', 'v1.8', 'v1.7', 'v1.6'];
const BASEV = [88, 74, 61, 42, 35, 27];
const demoValue = (r: number, c: number) => Math.max(2, Math.round(BASEV[c] - r * (6 + c * 0.8) + (rnd(r * 6 + c + 1, c + 3) - 0.5) * 10));

export default defineChart({
  id: 'G18',
  name: 'Matrix Heat (Glance)',
  family: 'glance',
  kinds: ['heatmap'],
  description: 'A heatmap of big rounded cells, each with its number, in five shades.',
  card: { width: 689, chartHeight: 506.3875 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 400,
      columns: [
        { key: 'row', label: 'Row', type: 'text', role: 'category', help: 'For example the version.' },
        { key: 'column', label: 'Column', type: 'text', role: 'category', help: 'For example the feature.' },
        { key: 'value', label: 'Value', type: 'number', role: 'value' },
      ],
    }],
  },
  defaultData: { rows: VER.flatMap((row, r) => FEAT.map((column, c) => ({ row, column, value: demoValue(r, c) }))) },
  text: {
    title: 'Adoption runs hot on the new versions',
    subtitle: '5 versions × 6 features · shade = % of accounts using it · every cell carries its number',
    source: 'MATRIX HEAT (GLANCE) · MONO-GLANCE · PRODUCT ANALYTICS',
  },
  fields: [
    { key: 'autoBreaks', label: 'Automatic shade breaks', group: 'options', section: 'Shades', type: 'boolean', default: false, help: 'On: five even steps between the smallest and largest value.' },
    { key: 'break1', label: 'Second shade above', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 15, when: (s) => s.autoBreaks !== true },
    { key: 'break2', label: 'Third shade above', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 30, when: (s) => s.autoBreaks !== true },
    { key: 'break3', label: 'Fourth shade above', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 46, when: (s) => s.autoBreaks !== true, help: 'Cells above this get light text.' },
    { key: 'break4', label: 'Darkest shade above', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 64, when: (s) => s.autoBreaks !== true },
    { key: 'cellWidth', label: 'Cell width', group: 'options', section: 'Cells', type: 'number', min: 8, max: 80, step: 0.5, unit: 'px', default: 42 },
    { key: 'cellHeight', label: 'Cell height', group: 'options', section: 'Cells', type: 'number', min: 8, max: 80, step: 0.5, unit: 'px', default: 36 },
    { key: 'cellGap', label: 'Gap between cells', group: 'options', section: 'Cells', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 6 },
    { key: 'cellRadius', label: 'Cell rounding', group: 'options', section: 'Cells', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 9 },
    { key: 'labelColumn', label: 'Row label column', group: 'options', section: 'Cells', type: 'number', min: 20, max: 200, step: 1, unit: 'px', default: 92 },
    { key: 'autoFit', label: 'Shrink to fit large grids', group: 'options', section: 'Cells', type: 'boolean', default: true },
    { key: 'measure', label: 'Tooltip ending', group: 'options', section: 'Units', type: 'text', default: 'of accounts', help: 'Tooltip: “EDITOR on v2.0 — 88% of accounts”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: () => 'SHADE = ADOPTION · NEWER VERSIONS RUN DARKER',
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  frame: glanceFrame,
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const R: string[] = [], C: string[] = [];
    const cells = new Map<string, number>();
    for (const r of ctx.rows) {
      const rn = String(r.row), cn = String(r.column);
      if (!R.includes(rn)) R.push(rn);
      if (!C.includes(cn)) C.push(cn);
      cells.set(`${R.indexOf(rn)}|${C.indexOf(cn)}`, Number(r.value));
    }
    const vals = [...cells.values()];
    let breaks = [ctx.num('break1'), ctx.num('break2'), ctx.num('break3'), ctx.num('break4')];
    if (ctx.bool('autoBreaks')) {
      const lo = Math.min(...vals), hi = Math.max(...vals);
      breaks = [1, 2, 3, 4].map((k) => lo + ((hi - lo) * k) / 5);
    }
    const shades = laterShades5(T);
    const shade = (t: number) => (t > breaks[3] ? shades[0] : t > breaks[2] ? shades[1] : t > breaks[1] ? shades[2] : t > breaks[0] ? shades[3] : shades[4]);
    const X0 = ctx.num('labelColumn'), Y0 = 58;
    let W = ctx.num('cellWidth'), H = ctx.num('cellHeight'), gap = ctx.num('cellGap');
    if (ctx.bool('autoFit')) {
      const k = Math.min(1, (392 - X0) / (C.length * (W + gap)), (282 - Y0) / (R.length * (H + gap)));
      [W, H, gap] = [W * k, H * k, gap * k];
    }
    const PX = W + gap, PY = H + gap;
    const ink = laterInk(T);
    const unit = ctx.str('measure');
    if (ctx.bool('categoryLabels')) {
      C.forEach((f, c) => txt(s, {
        x: X0 + c * PX + W / 2, y: Y0 - 12, 'font-size': ctx.fs(6.5), 'font-weight': 700, fill: T.muted, 'text-anchor': 'middle',
        'letter-spacing': '.04em', class: 'fade', style: `animation-delay:${c * 0.04}s`,
      }, f));
    }
    R.forEach((ver, r) => {
      if (ctx.bool('categoryLabels')) {
        txt(s, { x: X0 - 10, y: Y0 + r * PY + H / 2 + 3, 'font-size': ctx.fs(8.5), 'font-weight': 700, fill: T.label, 'text-anchor': 'end', class: 'fade', style: `animation-delay:${r * 0.05}s` }, ver);
      }
      C.forEach((f, c) => {
        const t = cells.get(`${r}|${c}`);
        if (t === undefined) return;
        const x = X0 + c * PX, y = Y0 + r * PY, dark = t > breaks[2];
        const g = keyed(el(s, 'g', {}), `cell-${r}-${c}`);
        const cell = el(g, 'rect', { x, y, width: W, height: H, rx: Math.min(ctx.num('cellRadius'), W / 2, H / 2), fill: shade(t), class: 'pop', style: `animation-delay:${(r * C.length + c) * 0.022}s` });
        tip(cell, `${f} on ${ver} — ${ctx.fmt(t)}% ${unit}`.trim());
        if (ctx.bool('dataLabels')) {
          txt(g, {
            x: x + W / 2, y: y + H / 2 + 4, 'font-size': ctx.fs(10.5), 'font-weight': 800, fill: dark ? T.bg : ink, 'text-anchor': 'middle',
            class: 'fade', style: `animation-delay:${0.15 + (r * C.length + c) * 0.022}s`,
          }, ctx.fmt(t));
        }
      });
    });
    captionLine(ctx, 'SHADE = ADOPTION · NEWER VERSIONS RUN DARKER', 300, 1, { fill: T.faintData });
  },
});
