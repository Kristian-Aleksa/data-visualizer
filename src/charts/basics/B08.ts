// B08 Plumb Scatter — a scatter where every dot hangs a plumb line to a barcode floor: read x
// where the line lands, y by its height. The best and worst points are named.

import { defineChart } from '../../core/define';
import { boost, pick } from '../../core/theme';
import { el, tip, txt } from '../../core/vnode';
import { captionLine, label } from './shared';

const DEMO: [string, number, number][] = [
  ['Editor', 72, 86], ['Boards', 58, 74], ['Docs', 44, 79], ['Chat', 38, 62], ['Flows', 66, 58],
  ['Vault', 82, 71], ['Pages', 28, 55], ['Sync', 52, 49], ['Grid', 88, 44], ['Views', 20, 68],
  ['Hub', 76, 32], ['Forms', 34, 38],
];

/** Widen [lo, hi] to include the data (with a little room) when it falls outside. */
function widen(lo: number, hi: number, vals: number[]): [number, number] {
  const mn = Math.min(...vals), mx = Math.max(...vals);
  if (mn >= lo && mx <= hi) return [lo, hi];
  const a = Math.min(lo, mn), b = Math.max(hi, mx), pad = (b - a) * 0.04 || 1;
  return [mn < lo ? a - pad : a, mx > hi ? b + pad : b];
}

export default defineChart({
  id: 'B08',
  name: 'Plumb Scatter',
  family: 'basics',
  kinds: ['scatter'],
  description: 'A scatter plot where every dot hangs a plumb line to the floor.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 60,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'x', label: 'X (across)', type: 'number', role: 'x' },
        { key: 'y', label: 'Y (height)', type: 'number', role: 'y' },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, x, y]) => ({ label, x, y })) },
  text: {
    title: 'Price against satisfaction, twelve products',
    subtitle: 'every dot hangs a plumb line to the floor · read x by the line, y by the height',
    source: 'PLUMB SCATTER · MONO-BASIC · PRODUCT PANEL',
  },
  fields: [
    { key: 'xMin', label: 'X from', group: 'options', section: 'Axes', type: 'number', min: -1e6, max: 1e6, step: 1, default: 0 },
    { key: 'xMax', label: 'X to', group: 'options', section: 'Axes', type: 'number', min: -1e6, max: 1e6, step: 1, default: 100 },
    { key: 'yMin', label: 'Y floor', group: 'options', section: 'Axes', type: 'number', min: -1e6, max: 1e6, step: 1, default: 20, help: 'The value at floor level.' },
    { key: 'yMax', label: 'Y top', group: 'options', section: 'Axes', type: 'number', min: -1e6, max: 1e6, step: 1, default: 100 },
    { key: 'autoRange', label: 'Widen the axes to fit the data', group: 'options', section: 'Axes', type: 'boolean', default: true },
    { key: 'xLow', label: 'Left end label', group: 'options', section: 'Axis words', type: 'text', default: 'CHEAP' },
    { key: 'xHigh', label: 'Right end label', group: 'options', section: 'Axis words', type: 'text', default: 'PREMIUM' },
    { key: 'yWord', label: 'Up-axis label', group: 'options', section: 'Axis words', type: 'text', default: 'HAPPIER ↑' },
    { key: 'xName', label: 'X name (tooltips)', group: 'options', section: 'Axis words', type: 'text', default: 'price' },
    { key: 'yName', label: 'Y name (tooltips)', group: 'options', section: 'Axis words', type: 'text', default: 'satisfaction' },
    { key: 'floorTicks', label: 'Floor ticks', group: 'options', section: 'Floor', type: 'number', min: 0, max: 100, step: 1, default: 20, help: 'Number of gaps between ticks; 0 hides them.' },
    { key: 'majorEvery', label: 'Long tick every', group: 'options', section: 'Floor', type: 'number', min: 1, max: 20, step: 1, unit: 'ticks', default: 5 },
    { key: 'dotRadius', label: 'Dot size', group: 'options', section: 'Dots', type: 'number', min: 0.5, max: 10, step: 0.1, unit: 'px', default: 2.6, help: 'Colour palettes add 0.8 px.' },
    { key: 'heroRadius', label: 'Named dot size', group: 'options', section: 'Dots', type: 'number', min: 0.5, max: 14, step: 0.1, unit: 'px', default: 4.6 },
    { key: 'plumbWidth', label: 'Plumb line width', group: 'options', section: 'Dots', type: 'number', min: 0.1, max: 4, step: 0.05, unit: 'px', default: 0.55 },
    {
      key: 'named', label: 'Name these points', group: 'options', section: 'Dots', type: 'select', default: 'both',
      options: [{ value: 'both', label: 'Highest and lowest' }, { value: 'best', label: 'Highest' }, { value: 'worst', label: 'Lowest' }, { value: 'none', label: 'None' }],
    },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true, hover: false },
  caption: () => 'EVERY DOT HANGS A PLUMB LINE · READ X AT THE FLOOR',
  paletteNeeds: ['highlight'],
  interactions: ['tooltip'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const P = ctx.rows.map((r) => ({ name: String(r.label), px: Number(r.x), sat: Number(r.y) }));
    const X0 = 48, X1 = 368, base = 258, H = 208;
    let [xa, xb] = [ctx.num('xMin'), ctx.num('xMax')];
    let [ya, yb] = [ctx.num('yMin'), ctx.num('yMax')];
    if (xb <= xa) xb = xa + 1;
    if (yb <= ya) yb = ya + 1;
    if (ctx.bool('autoRange')) {
      [xa, xb] = widen(xa, xb, P.map((p) => p.px));
      [ya, yb] = widen(ya, yb, P.map((p) => p.sat));
    }
    const mapX = (p: number) => X0 + ((p - xa) / (xb - xa)) * (X1 - X0);
    const mapY = (v: number) => base - ((v - ya) / (yb - ya)) * H;
    const G = Math.round(ctx.num('floorTicks')), major = Math.max(1, Math.round(ctx.num('majorEvery')));
    for (let g = 0; g <= G && G > 0; g++) {
      const x = X0 + (g / G) * (X1 - X0);
      el(s, 'line', { x1: x, y1: base, x2: x, y2: base - (g % major === 0 ? 7 : 4), stroke: T.floor, 'stroke-width': 0.6, class: 'fade', style: `animation-delay:${g * 0.01}s` });
    }
    el(s, 'line', { x1: X0 - 6, y1: base, x2: X1 + 6, y2: base, stroke: T.grid, 'stroke-width': 0.8, class: 'fade' });
    if (ctx.bool('categoryLabels')) {
      txt(s, { x: X0, y: base + 16, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faint, class: 'fade' }, ctx.str('xLow'));
      txt(s, { x: X1, y: base + 16, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faint, 'text-anchor': 'end', class: 'fade' }, ctx.str('xHigh'));
    }
    const named = ctx.str('named');
    const best = P.length ? P.reduce((a, b) => (b.sat > a.sat ? b : a)) : null;
    const worst = P.length ? P.reduce((a, b) => (b.sat < a.sat ? b : a)) : null;
    const pw = ctx.num('plumbWidth') * boost(T, 1, 1 / 0.55);
    const grow = boost(T, 0, 0.8);
    P.forEach((p, i) => {
      const x = mapX(p.px), y = mapY(p.sat);
      const hero = (p === best && (named === 'both' || named === 'best')) || (p === worst && (named === 'both' || named === 'worst'));
      el(s, 'line', { x1: x, y1: base, x2: x, y2: y, stroke: T.faintData, 'stroke-width': pw, opacity: boost(T, 0.6, 0.75), class: 'fade', style: `animation-delay:${0.2 + i * 0.05}s` });
      const dot = el(s, 'circle', {
        cx: x, cy: y, r: (hero ? ctx.num('heroRadius') : ctx.num('dotRadius')) + grow, fill: hero ? T.hero : pick(T, '#55554F', T.data),
        class: 'pop', style: `animation-delay:${0.25 + i * 0.05}s`,
      });
      tip(dot, `${p.name} — ${ctx.str('xName')} ${ctx.fmt(p.px)} · ${ctx.str('yName')} ${ctx.fmt(p.sat)}`);
      if (hero && ctx.bool('dataLabels')) {
        txt(s, {
          x, y: y - 10, 'font-size': ctx.fs(8.5), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle',
          style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:.8s`, class: 'fade',
        }, `${p.name} · ${label(ctx, p.sat)}`);
      }
    });
    if (ctx.bool('categoryLabels')) {
      const yy = mapY(ya + (yb - ya) * (65 / 80));
      txt(s, {
        x: 26, y: yy, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faint, transform: `rotate(-90 26 ${yy})`,
        'text-anchor': 'end', 'letter-spacing': '.08em', class: 'fade',
      }, ctx.str('yWord'));
    }
    captionLine(ctx, 'EVERY DOT HANGS A PLUMB LINE · READ X AT THE FLOOR', 306, 1);
  },
});
