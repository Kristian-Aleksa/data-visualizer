// G10 Stagger Delay — fifty bars spring up one after another with an elastic overshoot, 36 ms
// apart, so the entrance reads as a wave (round axis ticks, 26% gap between bars, 4px top
// corners).

import { defineChart } from '../../core/define';
import { elasticOut } from '../../core/ease';
import { el, keyed, tip, txt } from '../../core/vnode';
import { axisNumber, categories, crisp, MID, progress, roundRect, valueAxis } from './plot';
import { glanceFrame, rampAt, ranksOf } from './shared';

const VALS = Array.from({ length: 50 }, (_, i) => Math.round(30 + 55 * Math.sin(i / 7.5) + 18 * Math.sin(i / 2.6) + (i % 5) * 3 + 28));
const MONO_SHADES = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];

export default defineChart({
  id: 'G10',
  name: 'Stagger Delay',
  family: 'glance',
  kinds: ['bars'],
  description: 'Fifty bars spring up one after another, so the entrance reads as a wave.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 200,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: VALS.map((value, i) => ({ label: String(i + 1), value })) },
  text: {
    title: 'Fifty markets, one wave',
    subtitle: 'sign-ups per market · bars cascade in · click to replay',
    source: 'STAGGER DELAY · MONO-FANCY2 · GROWTH',
  },
  fields: [
    { key: 'barGap', label: 'Gap between bars', group: 'options', section: 'Bars', type: 'number', min: 0, max: 90, step: 1, unit: '% of slot', default: 26 },
    { key: 'radius', label: 'Top corner radius', group: 'options', section: 'Bars', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 4 },
    {
      key: 'colorBy', label: 'Colour bars by', group: 'options', section: 'Bars', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'value', label: 'Value bands' }, { value: 'rank', label: 'Rank' }, { value: 'single', label: 'One colour' }],
      help: 'Mono shades by value bands, the colour palettes by rank.',
    },
    { key: 'waveDelay', label: 'Delay between bars', group: 'options', section: 'Wave', type: 'number', min: 0, max: 300, step: 1, unit: 'ms', default: 36 },
    { key: 'springTime', label: 'Spring time per bar', group: 'options', section: 'Wave', type: 'number', min: 50, max: 3000, step: 10, unit: 'ms', default: 640, help: 'With an elastic overshoot (change it under Animation → Easing).' },
    { key: 'labelEvery', label: 'Category label every', group: 'options', section: 'Axes', type: 'number', min: 1, max: 50, step: 1, unit: 'bars', default: 10 },
    { key: 'splitNumber', label: 'About this many grid steps', group: 'options', section: 'Axes', type: 'number', min: 1, max: 12, step: 1, default: 5 },
    { key: 'measure', label: 'Tooltip prefix', group: 'options', section: 'Units', type: 'text', default: 'Market', help: 'Tooltip: “Market 7 — 112”.' },
  ],
  supports: { categoryLabels: true, axes: true, grid: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => ctx.num('springTime') / 1000 + Math.max(0, ctx.rows.length - 1) * (ctx.num('waveDelay') / 1000) * ctx.stagger,
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), v: Number(r.value) }));
    const n = rows.length;
    const axesOn = ctx.bool('showAxes');
    const left = axesOn ? 36 : 10, right = 10, top = 14, bottom = 24;
    const x0 = left, x1 = W - right, y0 = top, y1 = H - bottom;
    const axis = valueAxis(0, Math.max(...rows.map((r) => r.v)), { splitNumber: Math.round(ctx.num('splitNumber')) });
    const Y = (v: number) => y1 - ((v - axis.min) / (axis.max - axis.min)) * (y1 - y0);
    if (ctx.bool('showGrid')) {
      for (const t of axis.ticks) {
        const y = crisp(Y(t), 1);
        el(s, 'line', { x1: x0, y1: y, x2: x1, y2: y, stroke: T.grid, 'stroke-width': 1, class: 'fade', style: 'animation-duration:.4s' });
      }
    }
    if (axesOn) {
      const fs = ctx.fs(9.5);
      for (const t of axis.ticks) {
        txt(s, { x: x0 - 8, y: Y(t) + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': 'end', class: 'fade', style: 'animation-duration:.4s' }, axisNumber(t));
      }
    }
    const cat = categories(n, x0, x1 - x0);
    if (ctx.bool('categoryLabels')) {
      const fs = ctx.fs(9), every = Math.max(1, Math.round(ctx.num('labelEvery')));
      for (let i = 0; i < n; i += every) {
        txt(s, { x: cat.at(i), y: y1 + 8 + fs / 2 + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': 'middle', class: 'fade', style: 'animation-duration:.4s' }, rows[i].name);
      }
    }
    const bw = cat.band * (1 - ctx.num('barGap') / 100);
    const mode = ctx.str('colorBy') === 'auto' ? (T.kind === 'mono' ? 'value' : 'rank') : ctx.str('colorBy');
    const rk = ranksOf(rows.map((r) => r.v));
    const bandSize = (axis.max * 16) / 120;
    const colour = (v: number, i: number) =>
      mode === 'single' ? T.data
        : mode === 'rank' ? rampAt(T, rk[i], n)
          : T.kind === 'mono' ? MONO_SHADES[Math.max(0, Math.min(5, Math.floor((axis.max - v) / bandSize)))]
            : [...T.ramp].reverse()[Math.max(0, Math.min(4, Math.floor((axis.max - v) / bandSize)))];
    const dur = ctx.num('springTime') / 1000, gap = ctx.num('waveDelay') / 1000;
    const rad = ctx.num('radius');
    rows.forEach(({ name, v }, i) => {
      const e = progress(ctx, i * gap, dur, elasticOut);
      const g = keyed(el(s, 'g', {}), `bar-${i}`);
      tip(g, `${ctx.str('measure')} ${name} — ${ctx.fmt(v)}`.trim());
      const h = (Y(0) - Y(v)) * e;
      if (Math.abs(h) > 0.01) el(g, 'path', { d: roundRect(cat.at(i) - bw / 2, Y(0) - h, bw, h, [rad, rad, 0, 0]), fill: colour(v, i) });
      el(g, 'rect', { x: cat.at(i) - cat.band / 2, y: y0, width: cat.band, height: y1 - y0, fill: 'transparent', 'data-cs-hit': 1 });
    });
  },
});
