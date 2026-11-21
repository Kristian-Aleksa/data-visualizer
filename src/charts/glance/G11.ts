// G11 Custom Pie — each slice's angle is its share and its radius its minutes per day, with
// dotted reference rings. Slices are rounded ring sectors with paper gaps.

import { defineChart } from '../../core/define';
import { cubicOut } from '../../core/ease';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { d3Isc } from '../shared/notices';
import { MID, progress, roundSector } from './plot';
import { glanceFrame, rampAt, ranksOf } from './shared';

const DEMO: [string, number, number][] = [
  ['Editor', 34, 42], ['Boards', 22, 31], ['Docs', 18, 38],
  ['Chat', 12, 11], ['Automations', 8, 24], ['Other', 6, 7],
];
const MONO_L = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];
const NBSP = ' ';

export default defineChart({
  id: 'G11',
  name: 'Custom Pie',
  family: 'glance',
  kinds: ['part-to-whole'],
  description: 'A pie where the angle is the share and the radius a second value, with reference rings.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  notices: [d3Isc('d3-shape and d3-path')],
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 16,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'share', label: 'Share', type: 'number', role: 'value', min: 0, help: 'Sets the angle. Any numbers; they’re turned into shares.' },
        { key: 'depth', label: 'Depth', type: 'number', role: 'size', min: 0, help: 'Sets the radius, e.g. minutes per day.' },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, share, depth]) => ({ label, share, depth })) },
  text: {
    title: 'Big slice, deep engagement',
    subtitle: 'angle = share of users · radius = minutes per day · dotted rings at 15 / 30 / 45 min',
    source: 'CUSTOM PIE · MONO-FANCY3 · PRODUCT ANALYTICS',
  },
  fields: [
    { key: 'depthMax', label: 'Depth at the outer edge', group: 'options', section: 'Radius', type: 'number', min: 0, max: 1e6, step: 1, default: 45, help: '0 = the largest depth in the data.' },
    { key: 'ringEvery', label: 'Reference ring every', group: 'options', section: 'Radius', type: 'number', min: 0, max: 1e6, step: 1, default: 15, help: '0 hides the rings.' },
    { key: 'outerRadius', label: 'Outer radius', group: 'options', section: 'Radius', type: 'number', min: 10, max: 50, step: 0.5, unit: '% of size', default: 37 },
    { key: 'innerRadius', label: 'Hole', group: 'options', section: 'Radius', type: 'number', min: 0, max: 90, step: 1, unit: '% of outer', default: 24 },
    { key: 'sliceRounding', label: 'Corner rounding', group: 'options', section: 'Slices', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 5 },
    { key: 'sliceGap', label: 'Gap between slices', group: 'options', section: 'Slices', type: 'number', min: 0, max: 12, step: 0.5, unit: 'px', default: 3 },
    { key: 'labelDistance', label: 'Label distance', group: 'options', section: 'Labels', type: 'number', min: 0, max: 80, step: 1, unit: 'px', default: 14 },
    { key: 'depthUnit', label: 'Depth unit', group: 'options', section: 'Labels', type: 'text', default: 'm', help: 'Label: “Editor  34% · 42m”.' },
    { key: 'depthName', label: 'Depth in words (tooltips)', group: 'options', section: 'Labels', type: 'text', default: 'min/day' },
    { key: 'shareName', label: 'Share in words (tooltips)', group: 'options', section: 'Labels', type: 'text', default: 'of users' },
    { key: 'sliceDelay', label: 'Delay between slices', group: 'options', section: 'Animation', type: 'number', min: 0, max: 1000, step: 10, unit: 'ms', default: 130 },
  ],
  supports: { dataLabels: true },
  paletteNeeds: ['sequential'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => 0.9 + Math.max(0, ctx.rows.length - 1) * (ctx.num('sliceDelay') / 1000) * ctx.stagger,
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const rows = ctx.rows.map((r) => ({ n: String(r.label), share: Number(r.share), mins: Number(r.depth) }));
    const byShare = [...rows].sort((a, b) => b.share - a.share);
    const total = rows.reduce((a, r) => a + r.share, 0) || 1;
    const scale = ctx.num('depthMax') || Math.max(...rows.map((r) => r.mins)) || 1;
    const TAU = Math.PI * 2;
    const cx = W / 2, cy = H / 2 + 6;
    const R = Math.min(W, H) * (ctx.num('outerRadius') / 100);
    const r0 = R * (ctx.num('innerRadius') / 100);
    const rOf = (m: number) => r0 + ((R - r0) * Math.min(m, scale)) / scale;
    const rk = ranksOf(byShare.map((d) => d.mins));
    const colour = (i: number) => (T.kind === 'mono' ? MONO_L[Math.min(5, rk[i])] : rampAt(T, rk[i], byShare.length));
    const ringEvery = ctx.num('ringEvery');
    if (ringEvery > 0) {
      for (let m = ringEvery, k = 0; m <= scale + 1e-9 && k < 50; m += ringEvery, k++) {
        el(s, 'circle', {
          cx, cy, r: rOf(m), fill: 'none', stroke: pick(T, '#D8D6CE', T.grid), 'stroke-width': 1, 'stroke-dasharray': '3 4',
          class: 'fade', style: 'animation-duration:.4s',
        });
      }
    }
    const delay = ctx.num('sliceDelay') / 1000;
    const lfs = ctx.fs(10);
    let acc = 0;
    byShare.forEach((d, i) => {
      const p0 = -Math.PI / 2 + (acc / total) * TAU, p1 = -Math.PI / 2 + ((acc + d.share) / total) * TAU;
      acc += d.share;
      const e = progress(ctx, i * delay, 0.9, cubicOut);
      const g = keyed(el(s, 'g', {}), `slice-${i}`);
      tip(g, `${d.n} — ${Math.round((d.share / total) * 1000) / 10}% ${ctx.str('shareName')} · ${ctx.fmt(d.mins)} ${ctx.str('depthName')}`.trim());
      const r = r0 + (rOf(d.mins) - r0) * e;
      const path = roundSector({ cx, cy, r0, r, startAngle: p0, endAngle: p1, clockwise: true, cornerRadius: ctx.num('sliceRounding') });
      if (path) el(g, 'path', { d: path, fill: colour(i), stroke: T.bg, 'stroke-width': ctx.num('sliceGap') });
      if (ctx.bool('dataLabels')) {
        const pm = (p0 + p1) / 2, lr = R + ctx.num('labelDistance'), cos = Math.cos(pm);
        txt(g, {
          x: cx + cos * lr, y: cy + Math.sin(pm) * lr + MID * lfs, 'font-size': lfs, 'font-weight': 600, fill: pick(T, '#55544E', T.label),
          'text-anchor': Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end', opacity: Math.round(e * 1000) / 1000,
        }, `${d.n}${NBSP} ${Math.round((d.share / total) * 100 * 10) / 10}% · ${ctx.fmt(d.mins)}${ctx.str('depthUnit')}`);
      }
    });
  },
});
