// L07 Brand Spectrum — rows of opposing traits; a big dot shows where we sit between them, small
// dots the competitors. A wide ribbon threads our position down the page; it is drawn in the
// paper colour by default, so it stays invisible unless you give it a colour.

import { defineChart } from '../../core/define';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint, lRing } from './shared';

const ROWS: [string, string, number, number[]][] = [
  ['FRIEND', 'AUTHORITY', 74, [42, 52, 57]],
  ['SERIOUS', 'PLAYFUL', 80, [60, 65, 86]],
  ['RELIABLE', 'RISK-TAKING', 40, [30, 34, 50]],
  ['CONTEMPORARY', 'CLASSIC', 22, [36, 41, 73]],
];

export default defineChart({
  id: 'L07',
  name: 'Brand Spectrum',
  family: 'editorial',
  kinds: ['comparison'],
  description: 'Rows of opposing traits: a big dot for us, small dots for competitors, between the two poles.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 460, h: 300 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 12,
      columns: [
        { key: 'left', label: 'Left trait', type: 'text', role: 'label' },
        { key: 'right', label: 'Right trait', type: 'text', role: 'label' },
        { key: 'us', label: 'Us (%)', type: 'number', role: 'value', min: 0, max: 100, help: '0 = fully the left trait, 100 = fully the right one.' },
        { key: 'a', label: 'Competitor A (%)', type: 'number', role: 'value', min: 0, max: 100, required: false },
        { key: 'b', label: 'Competitor B (%)', type: 'number', role: 'value', min: 0, max: 100, required: false },
        { key: 'c', label: 'Competitor C (%)', type: 'number', role: 'value', min: 0, max: 100, required: false },
      ],
    }],
  },
  defaultData: { rows: ROWS.map(([left, right, us, [a, b, c]]) => ({ left, right, us, a, b, c })) },
  text: {
    title: 'Where the brand sits',
    subtitle: 'panel of 120 customers placed us between opposing traits · big dot = us · small dots = competitors',
    source: 'BRAND SPECTRUM · MONO-EDITORIAL2 · BRAND SURVEY',
  },
  fields: [
    { key: 'usName', label: 'Our name', group: 'options', section: 'Names', type: 'text', default: 'us' },
    { key: 'competitorNames', label: 'Competitor names', group: 'options', section: 'Names', type: 'text', default: 'A, B, C', help: 'Comma-separated, in column order.' },
    { key: 'legendText', label: 'Legend', group: 'options', section: 'Names', type: 'text', default: '● US    ● COMPETITORS A · B · C' },
    { key: 'ribbonColor', label: 'Ribbon colour', group: 'options', section: 'Ribbon', type: 'color', default: '', help: 'Empty = the paper colour (so the ribbon doesn’t show).' },
    { key: 'ribbonWidth', label: 'Ribbon width', group: 'options', section: 'Ribbon', type: 'number', min: 0, max: 60, step: 1, unit: 'px', default: 30 },
    { key: 'ribbonOpacity', label: 'Ribbon opacity', group: 'options', section: 'Ribbon', type: 'number', min: 0, max: 1, step: 0.01, default: 0.9 },
    { key: 'trackStart', label: 'Track start', group: 'options', section: 'Layout', type: 'number', min: 0, max: 460, step: 1, unit: 'px', default: 118 },
    { key: 'trackEnd', label: 'Track end', group: 'options', section: 'Layout', type: 'number', min: 0, max: 460, step: 1, unit: 'px', default: 342 },
    { key: 'rowPitch', label: 'Row spacing', group: 'options', section: 'Layout', type: 'number', min: 10, max: 120, step: 1, unit: 'px', default: 60, help: 'Shrinks automatically when the rows wouldn’t fit.' },
    { key: 'usRadius', label: 'Our dot size', group: 'options', section: 'Dots', type: 'number', min: 1, max: 20, step: 0.5, unit: 'px', default: 8 },
    { key: 'competitorRadius', label: 'Competitor dot size', group: 'options', section: 'Dots', type: 'number', min: 0.5, max: 12, step: 0.1, unit: 'px', default: 3.2 },
  ],
  supports: { categoryLabels: true, legend: true, grid: true },
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({
      a: String(r.left), b: String(r.right), us: Number(r.us) / 100,
      comp: (['a', 'b', 'c'] as const).map((k) => (r[k] === null || r[k] === undefined || r[k] === '' ? null : Number(r[k]) / 100)),
    }));
    const X0 = ctx.num('trackStart'), X1 = ctx.num('trackEnd');
    const pitch = Math.min(ctx.num('rowPitch'), rows.length > 1 ? 180 / (rows.length - 1) : Infinity);
    const Y = (i: number) => 58 + i * pitch, px = (t: number) => X0 + t * (X1 - X0);
    const names = ctx.str('competitorNames').split(',').map((x) => x.trim());
    const usName = ctx.str('usName');
    // the ribbon first, underneath everything
    if (rows.length && ctx.num('ribbonWidth') > 0) {
      let d = `M${px(rows[0].us)} ${Y(0)}`;
      for (let i = 1; i < rows.length; i++) d += ` C${px(rows[i - 1].us)} ${Y(i - 1) + pitch / 2} ${px(rows[i].us)} ${Y(i) - pitch / 2} ${px(rows[i].us)} ${Y(i)}`;
      el(s, 'path', {
        d, fill: 'none', stroke: ctx.str('ribbonColor') || pick(T, '#F0EFEB', T.halo), 'stroke-width': ctx.num('ribbonWidth'), 'stroke-linecap': 'round',
        'stroke-linejoin': 'round', opacity: ctx.num('ribbonOpacity'), class: 'draw', style: 'animation-duration:1.4s',
      });
    }
    const rail = lFaint(T, '#B0AFA9');
    rows.forEach(({ a, b, us, comp }, i) => {
      const y = Y(i);
      const g = keyed(el(s, 'g', {}), `row-${i}`);
      if (ctx.bool('showGrid')) {
        el(g, 'line', { x1: X0, y1: y, x2: X1, y2: y, stroke: rail, 'stroke-width': 1, class: 'fade', style: `animation-delay:${i * 0.08}s` });
        [X0, X1].forEach((x) => el(g, 'line', { x1: x, y1: y - 4, x2: x, y2: y + 4, stroke: rail, 'stroke-width': 1, class: 'fade', style: `animation-delay:${i * 0.08}s` }));
      }
      if (ctx.bool('categoryLabels')) {
        txt(g, { x: X0 - 14, y: y + 3, 'font-size': ctx.fs(8), 'font-weight': 600, fill: T.label, 'text-anchor': 'end', 'letter-spacing': '.1em', class: 'fade', style: `animation-delay:${i * 0.08}s` }, a);
        txt(g, { x: X1 + 14, y: y + 3, 'font-size': ctx.fs(8), 'font-weight': 600, fill: T.label, 'letter-spacing': '.1em', class: 'fade', style: `animation-delay:${i * 0.08}s` }, b);
      }
      comp.forEach((t, k) => {
        if (t === null) return;
        const c = el(g, 'circle', {
          cx: px(t), cy: y, r: ctx.num('competitorRadius'), fill: pick(T, T.muted, T.ser[(i + 1) % 4]),
          ...(T.kind === 'mono' ? {} : { stroke: lRing(T), 'stroke-width': 0.6 }), class: 'pop', style: `animation-delay:${0.3 + i * 0.1 + k * 0.05}s`,
        });
        tip(c, `competitor ${names[k] || 'ABC'[k]} — ${Math.round(t * 100)}% toward ${b}`);
      });
      const usDot = el(g, 'circle', { cx: px(us), cy: y, r: ctx.num('usRadius'), fill: pick(T, T.text, T.hero), class: 'pop', style: `animation-delay:${0.5 + i * 0.1}s` });
      tip(usDot, `${usName} — ${Math.round(us * 100)}% toward ${b}`);
    });
    if (ctx.str('legend') !== 'hidden' && ctx.str('legendText').trim()) {
      txt(s, { x: X0, y: 284, 'font-size': ctx.fs(7.5), 'font-weight': 600, fill: rail, 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:.9s' }, ctx.str('legendText'));
    }
  },
});
