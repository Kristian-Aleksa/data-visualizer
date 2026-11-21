// L04 Arc Matrix — a bubble grid whose rows bow upward like horizons; bubble area = value, three
// shades by size, true zeros as specks, and the four biggest cells labelled.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';

const PROD = ['Editor', 'Boards', 'Docs', 'Flows', 'Chat', 'Vault', 'Pages', 'Sync'];
const CITY = ['SF', 'NYC', 'LON', 'BER', 'TOK', 'SYD', 'SIN', 'PAR', 'AMS', 'TOR', 'SEO', 'SAO'];
const WEIGHT = [9, 8, 7, 7, 6, 5, 5, 4, 4, 3, 3, 2];
const demo = (i: number, j: number) => {
  if (rnd(i * 13 + 1, j * 7 + 3) < 0.09) return 0; // a few true absences
  const age = 1 - i * 0.085; // older rows reach further
  return Math.min(40, Math.round(WEIGHT[j] * 3.4 * age * (0.45 + rnd(i + 1, j + 1) * 0.85)));
};

export default defineChart({
  id: 'L04',
  name: 'Arc Matrix',
  family: 'editorial',
  kinds: ['heatmap', 'comparison'],
  description: 'A bubble grid whose rows bow like horizons; bubble area = value, true zeros as specks.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 430, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 600,
      columns: [
        { key: 'row', label: 'Row', type: 'text', role: 'category', help: 'For example the product.' },
        { key: 'column', label: 'Column', type: 'text', role: 'category', help: 'For example the city.' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0, help: '0 draws a speck (a true absence).' },
      ],
    }],
  },
  defaultData: { rows: PROD.flatMap((row, i) => CITY.map((column, j) => ({ row, column, value: demo(i, j) }))) },
  text: {
    title: 'Eight products land in twelve cities',
    subtitle: 'bubble = paying accounts · each row bows like a horizon',
    source: 'ARC MATRIX · MONO-EDITORIAL · SALES GEO',
  },
  fields: [
    { key: 'rowPitch', label: 'Row spacing', group: 'options', section: 'Grid', type: 'number', min: 8, max: 80, step: 0.5, unit: 'px', default: 29 },
    { key: 'colPitch', label: 'Column spacing', group: 'options', section: 'Grid', type: 'number', min: 8, max: 80, step: 0.5, unit: 'px', default: 27 },
    { key: 'bow', label: 'Row bow', group: 'options', section: 'Grid', type: 'number', min: -60, max: 60, step: 0.5, unit: 'px', default: 16, help: 'How far the middle of each row rises.' },
    { key: 'autoFit', label: 'Shrink to fit large grids', group: 'options', section: 'Grid', type: 'boolean', default: true },
    { key: 'bubbleScale', label: 'Bubble size per √value', group: 'options', section: 'Bubbles', type: 'number', min: 0.1, max: 6, step: 0.05, default: 1.3 },
    { key: 'break1', label: 'Middle shade from', group: 'options', section: 'Bubbles', type: 'number', min: -1e9, max: 1e9, step: 1, default: 12, help: 'Mono’s three shades. Colour palettes use five, one per band of 8.' },
    { key: 'break2', label: 'Darkest shade from', group: 'options', section: 'Bubbles', type: 'number', min: -1e9, max: 1e9, step: 1, default: 25 },
    { key: 'colourBand', label: 'Colour shade step', group: 'options', section: 'Bubbles', type: 'number', min: 0.01, max: 1e9, step: 1, default: 8 },
    { key: 'topLabels', label: 'Biggest cells labelled', group: 'options', section: 'Bubbles', type: 'number', min: 0, max: 50, step: 1, default: 4 },
    { key: 'labelAngle', label: 'Column label angle', group: 'options', section: 'Labels', type: 'number', min: -90, max: 90, step: 1, unit: '°', default: -55 },
    { key: 'unit', label: 'Value unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'accounts' },
  ],
  supports: { dataLabels: true, categoryLabels: true, grid: true },
  paletteNeeds: ['sequential'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const R: string[] = [], C: string[] = [];
    const cells = new Map<string, number>();
    for (const r of ctx.rows) {
      const rn = String(r.row), cn = String(r.column);
      if (!R.includes(rn)) R.push(rn);
      if (!C.includes(cn)) C.push(cn);
      cells.set(`${R.indexOf(rn)}|${C.indexOf(cn)}`, Math.max(0, Number(r.value)));
    }
    let rp = ctx.num('rowPitch'), cp = ctx.num('colPitch');
    if (ctx.bool('autoFit')) {
      if (R.length > 1) rp = Math.min(rp, 226 / (R.length - 1));
      if (C.length > 1) cp = Math.min(cp, 308 / (C.length - 1));
    }
    const nC = C.length;
    const rowY = (i: number) => 74 + i * rp, colX = (j: number) => 92 + j * cp;
    const dy = (j: number) => -ctx.num('bow') * Math.sin((Math.PI * j) / Math.max(1, nC - 1));
    const v = (i: number, j: number) => cells.get(`${i}|${j}`) ?? 0;
    // the biggest cells get their number
    const all: [number, number, number][] = [];
    R.forEach((_, i) => C.forEach((_c, j) => all.push([v(i, j), i, j])));
    const top = all.sort((a, b) => b[0] - a[0]).slice(0, Math.round(ctx.num('topLabels'))).filter((d) => d[0] > 0).map((d) => d[1] * 100000 + d[2]);
    const b1 = ctx.num('break1'), b2 = ctx.num('break2'), band = Math.max(1e-9, ctx.num('colourBand'));
    const k = ctx.num('bubbleScale');
    const unit = ctx.str('unit');
    R.forEach((p, i) => {
      const g = keyed(el(s, 'g', {}), `r-${i}`);
      // the horizon arc
      if (ctx.bool('showGrid')) {
        const d = 'M' + C.map((_c, j) => `${colX(j)} ${rowY(i) + dy(j)}`).join(' L ');
        el(g, 'path', { d, fill: 'none', stroke: pick(T, T.track, T.quiet), 'stroke-width': 1, class: 'draw', style: `animation-delay:${i * 0.08}s` });
      }
      if (ctx.bool('categoryLabels')) {
        txt(g, { x: colX(0) - 8, y: rowY(i) + 3, 'font-size': ctx.fs(8), 'font-weight': 600, fill: T.label, 'text-anchor': 'end', class: 'fade', style: `animation-delay:${i * 0.08}s` }, p);
      }
      C.forEach((c, j) => {
        const x = colX(j), y = rowY(i) + dy(j), vv = v(i, j);
        if (!vv) {
          el(g, 'circle', { cx: x, cy: y, r: 0.9, fill: pick(T, T.quiet, T.floor), class: 'pop', style: `animation-delay:${0.2 + i * 0.08 + j * 0.02}s` });
          return;
        }
        const fill = pick(T, vv >= b2 ? T.text : vv >= b1 ? T.label : T.faintData, T.ramp[Math.min(4, Math.floor(vv / band))]);
        const r = Math.sqrt(vv) * k;
        const dot = el(g, 'circle', { cx: x, cy: y, r, fill, class: 'pop', style: `animation-delay:${0.2 + i * 0.08 + j * 0.02}s` });
        tip(dot, `${p} · ${c} — ${ctx.fmt(vv)} ${unit}`.trim());
        if (ctx.bool('dataLabels') && top.includes(i * 100000 + j)) {
          txt(g, { x, y: y - r - 4, 'font-size': ctx.fs(7), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle', class: 'fade', style: 'animation-delay:.6s' }, ctx.fmt(vv));
        }
      });
    });
    if (ctx.bool('categoryLabels')) {
      C.forEach((c, j) => {
        const x = colX(j), y = rowY(0) + dy(j) - 24;
        txt(s, {
          x, y, 'font-size': ctx.fs(7), 'font-weight': 700, fill: T.muted, 'letter-spacing': '.08em', transform: `rotate(${ctx.num('labelAngle')} ${x} ${y})`,
          class: 'fade', style: `animation-delay:${j * 0.03}s`,
        }, c);
      });
    }
  },
});
