// G03 Pictorial Bar — each row repeats a tree icon, one per 10k trees, over a pale track of the
// same icons; the last icon is cut where the value ends. The gaps stretch so whole icons fill the
// axis.

import { defineChart } from '../../core/define';
import { quarticOut } from '../../core/ease';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { categories, MID, progress } from './plot';
import { glanceFrame } from './shared';

const YEARS = ['2022', '2023', '2024', '2025', '2026'];
const VALS = [26, 41, 63, 88, 117];
const MONO_L = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];

/** Icons as polygons in a 0..1 box (so a cut icon is just a clipped polygon). */
const ICONS: Record<string, [number, number][]> = {
  tree: [[20, 0], [38, 28], [29, 28], [40, 46], [26, 46], [26, 58], [14, 58], [14, 46], [0, 46], [11, 28], [2, 28]].map(([x, y]) => [x / 40, y / 58]),
  person: [[0.5, 0], [0.64, 0.06], [0.68, 0.2], [0.62, 0.32], [0.86, 0.38], [0.96, 0.62], [0.82, 0.64], [0.76, 0.48], [0.74, 1], [0.56, 1], [0.5, 0.7], [0.44, 1], [0.26, 1], [0.24, 0.48], [0.18, 0.64], [0.04, 0.62], [0.14, 0.38], [0.38, 0.32], [0.32, 0.2], [0.36, 0.06]],
  house: [[0.5, 0], [1, 0.45], [0.86, 0.45], [0.86, 1], [0.6, 1], [0.6, 0.66], [0.4, 0.66], [0.4, 1], [0.14, 1], [0.14, 0.45], [0, 0.45]],
  circle: Array.from({ length: 28 }, (_, k) => [0.5 + 0.5 * Math.cos((k / 28) * Math.PI * 2), 0.5 + 0.5 * Math.sin((k / 28) * Math.PI * 2)] as [number, number]),
  square: [[0.08, 0.08], [0.92, 0.08], [0.92, 0.92], [0.08, 0.92]],
};

/** Keep the part of a polygon left of x = `maxX` (Sutherland–Hodgman against one edge). */
function clipLeft(pts: [number, number][], maxX: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ina = a[0] <= maxX, inb = b[0] <= maxX;
    if (ina) out.push(a);
    if (ina !== inb) {
      const t = (maxX - a[0]) / (b[0] - a[0]);
      out.push([maxX, a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const polyPath = (pts: [number, number][]) => (pts.length < 3 ? '' : 'M' + pts.map(([x, y]) => `${r4(x)} ${r4(y)}`).join('L') + 'Z');

export default defineChart({
  id: 'G03',
  name: 'Pictorial Bar',
  family: 'glance',
  kinds: ['bars', 'time'],
  description: 'Rows of repeated icons, one icon per unit, over a pale track; the last icon is cut to size.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 12,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: YEARS.map((label, i) => ({ label, value: VALS[i] })) },
  defaults: { numSuffix: 'k' },
  text: {
    title: 'Trees planted, year by year',
    subtitle: 'reforestation program · thousands of trees',
    source: 'PICTORIAL BAR · MONO-FANCY · GREEN OPS',
  },
  fields: [
    {
      key: 'icon', label: 'Icon', group: 'options', section: 'Icons', type: 'select', default: 'tree',
      options: [{ value: 'tree', label: 'Tree' }, { value: 'person', label: 'Person' }, { value: 'house', label: 'House' }, { value: 'circle', label: 'Circle' }, { value: 'square', label: 'Square' }],
    },
    { key: 'unitValue', label: 'Value per icon', group: 'options', section: 'Icons', type: 'number', min: 0.1, max: 1e6, step: 1, default: 10 },
    { key: 'iconWidth', label: 'Icon width', group: 'options', section: 'Icons', type: 'number', min: 2, max: 60, step: 0.5, unit: 'px', default: 17 },
    { key: 'iconHeight', label: 'Icon height', group: 'options', section: 'Icons', type: 'number', min: 2, max: 60, step: 0.5, unit: 'px', default: 24 },
    { key: 'iconGap', label: 'Gap between icons', group: 'options', section: 'Icons', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 3, help: 'Stretched a little so whole icons fill the track.' },
    { key: 'trackIcons', label: 'Track length', group: 'options', section: 'Track', type: 'number', min: 0, max: 200, step: 1, unit: 'icons', default: 13, help: '0 = a little longer than the longest row.' },
    { key: 'showTrack', label: 'Show the pale track', group: 'options', section: 'Track', type: 'boolean', default: true },
    { key: 'rowDelay', label: 'Delay between rows', group: 'options', section: 'Animation', type: 'number', min: 0, max: 1000, step: 10, unit: 'ms', default: 120 },
    { key: 'measure', label: 'What is counted', group: 'options', section: 'Units', type: 'text', default: 'trees', help: 'Tooltip: “2026 — 117k trees”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true },
  paletteNeeds: ['sequential'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => 0.9 + Math.max(0, ctx.rows.length - 1) * (ctx.num('rowDelay') / 1000) * ctx.stagger,
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), v: Number(r.value) }));
    const n = rows.length;
    const left = ctx.bool('categoryLabels') ? 44 : 10, right = 56, top = 10, bottom = 8;
    const x0 = left, x1 = W - right, y0 = top, y1 = H - bottom;
    const unit = Math.max(1e-9, ctx.num('unitValue'));
    const icons = rows.map((r) => r.v / unit);
    const axisMax = Math.round(ctx.num('trackIcons')) || Math.ceil(Math.max(...icons) * 1.1) || 1;
    const L = x1 - x0; // the whole axis, 0 .. axisMax icons
    const iw = ctx.num('iconWidth'), ih = ctx.num('iconHeight');
    // as many whole icons as fit along the axis with at least the set gap, then the gaps are
    // widened evenly so the icons run exactly end to end
    const m0 = ctx.num('iconGap');
    const fullTimes = Math.max(1, Math.floor((L + 2 * m0) / (iw + 2 * m0) + 1e-6));
    const margin = (L - fullTimes * iw) / 2 / Math.max(fullTimes - 1, 1);
    const uLen = iw + 2 * margin, endFix = 2 * margin;
    const shape = ICONS[ctx.str('icon')] ?? ICONS.tree;
    const cat = categories(n, y0, y1 - y0);
    const fs = ctx.fs(10.5), vfs = ctx.fs(12);
    const shades = rows.map((_, i) => {
      if (T.kind === 'mono') return MONO_L[Math.max(0, Math.min(5, n - 1 - i))];
      return T.ramp[n > 1 ? Math.round((i / (n - 1)) * 4) : 4];
    });
    const quiet = pick(T, '#DEDDD6', T.quiet);
    const delay = ctx.num('rowDelay') / 1000;
    const iconAt = (cx: number, cy: number, cut: number) =>
      polyPath(clipLeft(shape.map(([px, py]) => [cx - iw / 2 + px * iw, cy - ih / 2 + py * ih] as [number, number]), cut));

    if (ctx.bool('categoryLabels')) {
      rows.forEach((r, i) => txt(s, { x: x0 - 8, y: cat.at(i) + MID * fs, 'font-size': fs, 'font-weight': 700, fill: T.muted, 'text-anchor': 'end', class: 'fade', style: 'animation-duration:.4s' }, r.name));
    }
    rows.forEach((r, i) => {
      const cy = cat.at(i);
      const e = progress(ctx, i * delay, 0.9, quarticOut);
      const g = keyed(el(s, 'g', {}), `row-${i}`);
      tip(g, `${r.name} — ${ctx.fmt(r.v)} ${ctx.str('measure')}`.trim());
      if (ctx.bool('showTrack')) {
        const trackEnd = x0 + L * e;
        for (let k = 0; k < fullTimes; k++) {
          const cx = x0 + k * uLen + iw / 2;
          if (cx - iw / 2 >= trackEnd) break;
          const d = iconAt(cx, cy, trackEnd);
          if (d) el(g, 'path', { d, fill: quiet });
        }
      }
      const len = (Math.min(icons[i], axisMax) / axisMax) * L;
      // enough icons to reach the end of the value (the last one is cut there)
      const times = len > 0 ? Math.ceil((len + endFix) / uLen - 1e-6) : 0;
      const cut = x0 + len * e;
      for (let k = 0; k < times; k++) {
        const cx = x0 + k * uLen + iw / 2;
        if (cx - iw / 2 >= cut) break;
        const d = iconAt(cx, cy, cut);
        if (d) el(g, 'path', { d, fill: shades[i] });
      }
      if (ctx.bool('dataLabels')) {
        const pathLen = times * uLen - endFix;
        txt(g, {
          x: x0 + Math.max(len, pathLen) + 5 + 8, y: cy + MID * vfs, 'font-size': vfs, 'font-weight': 700, fill: T.text,
          opacity: e > 0.6 ? 1 : 0,
        }, ctx.fmt(r.v));
      }
    });
  },
});
