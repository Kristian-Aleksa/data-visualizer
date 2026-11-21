// L02 Dot Cascade — one column of dots per category (one dot = a few incidents), each column
// stepping up a dotted diagonal, so the ascending order reads as a staircase. The top dot carries
// the total.

import { defineChart } from '../../core/define';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { glanceDark, glanceDarkFrame } from '../glance/shared';

const CAUSE = ['DNS', 'CDN', 'QUOTA', 'DISK', 'CERT', 'CACHE', 'QUEUE', 'LOCK', 'OOM', 'NET', '3P API', 'CONFIG', 'DB', 'DEPLOY', 'CODE', 'HUMAN'];
const COUNT = [1, 1, 2, 3, 3, 4, 5, 6, 7, 9, 11, 13, 15, 18, 22, 27];

export default defineChart({
  id: 'L02',
  name: 'Dot Cascade',
  family: 'editorial',
  kinds: ['bars', 'ranking'],
  description: 'Columns of countable dots stepping up a diagonal, smallest to largest, on a dark card.',
  card: { width: 689, chartHeight: 330, dark: true },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 40,
      columns: [
        { key: 'label', label: 'Category', type: 'text', role: 'label' },
        { key: 'value', label: 'Count', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: CAUSE.map((label, i) => ({ label, value: COUNT[i] })) },
  text: {
    title: 'What breaks, stacked and ranked',
    subtitle: 'incidents by root cause · 2019 → 2026 · one dot = 2 incidents · sorted ascending',
    source: 'DOT CASCADE · MONO-EDITORIAL · INCIDENT LOG',
  },
  fields: [
    { key: 'unitValue', label: 'Count per dot', group: 'options', section: 'Dots', type: 'number', min: 0.01, max: 10000, step: 1, default: 2, help: 'Each column gets count ÷ this many dots (rounded up).' },
    { key: 'dotPitch', label: 'Dot spacing', group: 'options', section: 'Dots', type: 'number', min: 2, max: 30, step: 0.1, unit: 'px', default: 8.8 },
    { key: 'dotRadius', label: 'Dot size', group: 'options', section: 'Dots', type: 'number', min: 0.5, max: 10, step: 0.1, unit: 'px', default: 2.2 },
    { key: 'topRadius', label: 'Top dot size', group: 'options', section: 'Dots', type: 'number', min: 0.5, max: 16, step: 0.1, unit: 'px', default: 4.6, help: 'Colour palettes draw the largest column’s top dot 1 px bigger, in the highlight colour.' },
    { key: 'sortAsc', label: 'Sort smallest to largest', group: 'options', section: 'Columns', type: 'boolean', default: true },
    { key: 'columnPitch', label: 'Column spacing', group: 'options', section: 'Columns', type: 'number', min: 4, max: 80, step: 0.1, unit: 'px', default: 22.2 },
    { key: 'slope', label: 'Step up per column', group: 'options', section: 'Columns', type: 'number', min: -20, max: 30, step: 0.1, unit: 'px', default: 7.5 },
    { key: 'autoFit', label: 'Shrink to fit many or tall columns', group: 'options', section: 'Columns', type: 'boolean', default: true },
    { key: 'bandSize', label: 'Shade step every', group: 'options', section: 'Columns', type: 'number', min: 1, max: 10000, step: 1, default: 6, help: 'Colour palettes shade columns one step darker per this many (counts, not dots).' },
    { key: 'unit', label: 'What is counted', group: 'options', section: 'Units', type: 'text', default: 'incidents' },
  ],
  supports: { dataLabels: true, categoryLabels: true, grid: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  frame: glanceDarkFrame,
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    let rows = ctx.rows.map((r) => ({ name: String(r.label), v: Math.max(0, Number(r.value)) }));
    if (ctx.bool('sortAsc')) rows = rows.map((r, i) => ({ r, i })).sort((a, b) => a.r.v - b.r.v || a.i - b.i).map((x) => x.r);
    const unit = Math.max(1e-9, ctx.num('unitValue'));
    const counts = rows.map((r) => Math.ceil(r.v / unit));
    let pitch = ctx.num('columnPitch'), slope = ctx.num('slope'), dp = ctx.num('dotPitch');
    const n = rows.length;
    if (ctx.bool('autoFit') && n > 0) {
      // keep the last column inside the drawing…
      if (n > 1) {
        const k = Math.min(1, 338 / ((n - 1) * pitch));
        pitch *= k;
        slope *= k;
      }
      // …and every column's number below the top edge
      counts.forEach((c, i) => {
        if (c > 1) dp = Math.min(dp, Math.max(0.5, (272 - i * slope - 35) / (c - 1)));
      });
    }
    const x = (i: number) => 34 + i * pitch, base = (i: number) => 272 - i * slope;
    const D = glanceDark(T);
    const worst = rows.length ? rows.findIndex((r) => r.v === Math.max(...rows.map((q) => q.v))) : -1;
    const band = Math.max(1e-9, ctx.num('bandSize'));
    // dotted diagonal baseline
    if (ctx.bool('showGrid') && n > 0) {
      el(s, 'line', { x1: x(0) - 8, y1: base(0) + 4, x2: x(n - 1) + 8, y2: base(n - 1) + 4, stroke: pick(T, '#4A4944', D.quiet), 'stroke-width': 1, 'stroke-dasharray': '2 4', class: 'fade' });
    }
    const R = ctx.num('dotRadius');
    rows.forEach(({ name, v }, i) => {
      const cnt = counts[i], bx = x(i), by = base(i);
      const bd = Math.min(4, Math.floor(v / band));
      const g = keyed(el(s, 'g', {}), `c-${i}`);
      for (let k = 0; k < cnt - 1; k++) {
        el(g, 'circle', {
          cx: bx, cy: by - 12 - k * dp, r: R, fill: pick(T, '#B3B0A4', T.rampDark[bd]), opacity: pick(T, 0.9, 0.95),
          class: 'pop', style: `animation-delay:${i * 0.05 + k * 0.03}s`,
        });
      }
      const topY = by - 12 - Math.max(0, cnt - 1) * dp;
      const hero = T.kind !== 'mono' && i === worst;
      const top = el(g, 'circle', {
        cx: bx, cy: topY, r: ctx.num('topRadius') + (hero ? 1 : 0), fill: pick(T, '#F0EFEB', hero ? T.heroDark : T.rampDark[Math.min(4, bd + 1)]),
        class: 'pop', style: `animation-delay:${i * 0.05 + cnt * 0.03}s`,
      });
      tip(top, `${name} — ${ctx.fmt(v)} ${ctx.str('unit')}`.trim());
      if (ctx.bool('dataLabels')) {
        txt(g, {
          x: bx, y: topY - 10, 'font-size': ctx.fs(9), 'font-weight': 700, fill: hero ? T.heroDark : D.text, 'text-anchor': 'middle',
          class: 'fade', style: `animation-delay:${0.2 + i * 0.05}s`,
        }, ctx.fmt(v));
      }
      if (ctx.bool('categoryLabels')) {
        txt(g, {
          x: bx, y: by + 12, 'font-size': ctx.fs(6.5), 'font-weight': 600, fill: pick(T, '#6A6963', D.mid), 'text-anchor': 'end',
          transform: `rotate(-90 ${bx} ${by + 12})`, class: 'fade', style: `animation-delay:${0.1 + i * 0.05}s`,
        }, name);
      }
    });
  },
});
