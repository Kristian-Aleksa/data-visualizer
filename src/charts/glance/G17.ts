// G17 Violin — each group's density (a Gaussian kernel estimate over raw samples) is mirrored
// into a smooth silhouette; a paper tick marks the median. Shade: the fastest group is darkest.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, type Theme } from '../../core/theme';
import type { Issue, Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { captionLine, categoryLabel, laterInk, laterShades4, plain } from '../basics/shared';
import { glanceFrame } from './shared';

const G: [string, number, number][] = [['ENT', 1.6, 0.8], ['PRO', 3.4, 1.6], ['STARTER', 6.2, 2.6], ['FREE', 9.5, 4.2]];
const M = 64;
const sample = (g: number, i: number) => {
  const [, c, s] = G[g];
  return Math.max(0.2, c + s * (rnd(i + 1, g * 3 + 1) + rnd(i + 7, g * 3 + 2) + rnd(i + 13, g * 3 + 3) - 1.5));
};
const f1 = (v: number) => v.toFixed(1);

const autoCaption = (s: Settings, T: Theme) =>
  T.heroMode && s.highlightSlowest !== 'off'
    ? 'WIDTH = HOW MANY TICKETS WAIT THAT LONG · RED = THE SLOWEST PLAN · DARKEST = FASTEST'
    : 'WIDTH = HOW MANY TICKETS WAIT THAT LONG · PAPER TICK = MEDIAN · DARKEST = FASTEST';

export default defineChart({
  id: 'G17',
  name: 'Violin',
  family: 'glance',
  kinds: ['distribution'],
  description: 'Mirrored density silhouettes per group, with a paper tick at the median.',
  card: { width: 689, chartHeight: 506.3875 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [
      {
        key: 'samples',
        label: 'Samples',
        minRows: 2,
        maxRows: 20000,
        columns: [
          { key: 'group', label: 'Group', type: 'text', role: 'category' },
          { key: 'value', label: 'Value', type: 'number', role: 'value' },
        ],
      },
      {
        key: 'groups',
        label: 'Smoothing (optional)',
        minRows: 0,
        maxRows: 20,
        columns: [
          { key: 'group', label: 'Group', type: 'text', role: 'category' },
          { key: 'bandwidth', label: 'Smoothing width', type: 'number', role: 'value', min: 0.0001, help: 'In the same unit as the values. Leave a group out for automatic smoothing.' },
        ],
      },
    ],
  },
  defaultData: {
    samples: G.flatMap(([group], g) => Array.from({ length: M }, (_, i) => ({ group, value: Math.round(sample(g, i) * 1e6) / 1e6 }))),
    groups: G.map(([group, , s]) => ({ group, bandwidth: Math.round(Math.max(0.9, s * 0.72) * 1000) / 1000 })),
  },
  defaults: { numSuffix: 'h' },
  text: {
    title: 'How fast each plan gets an answer',
    subtitle: 'hours to first reply · silhouette = where tickets pile up · paper tick = median',
    source: 'VIOLIN · MONO-GLANCE · SUPPORT DESK',
  },
  fields: [
    { key: 'yMax', label: 'Scale top', group: 'options', section: 'Scale', type: 'number', min: 0.1, max: 1e6, step: 1, default: 17 },
    { key: 'gridStep', label: 'Grid line every', group: 'options', section: 'Scale', type: 'number', min: 0.1, max: 1e6, step: 1, default: 4 },
    { key: 'autoRange', label: 'Raise the top to fit the data', group: 'options', section: 'Scale', type: 'boolean', default: true },
    { key: 'halfWidth', label: 'Violin half-width', group: 'options', section: 'Violins', type: 'number', min: 4, max: 60, step: 0.5, unit: 'px', default: 30 },
    { key: 'spacing', label: 'Violin spacing', group: 'options', section: 'Violins', type: 'number', min: 30, max: 160, step: 1, unit: 'px', default: 84 },
    { key: 'smoothing', label: 'Automatic smoothing', group: 'options', section: 'Violins', type: 'number', min: 0.1, max: 4, step: 0.05, default: 1, help: 'Scales the automatic smoothing width (groups without one in the Smoothing table).' },
    { key: 'tailPad', label: 'Tail length', group: 'options', section: 'Violins', type: 'number', min: 0, max: 5, step: 0.1, unit: '× smoothing', default: 1.6, help: 'How far past the data the ends taper.' },
    { key: 'points', label: 'Outline points', group: 'options', section: 'Violins', type: 'number', min: 8, max: 200, step: 1, default: 44 },
    {
      key: 'highlightSlowest', label: 'Accent the slowest', group: 'options', section: 'Violins', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }],
      help: 'Wire writes the slowest median in its highlight colour.',
    },
    { key: 'measure', label: 'Tooltip ending', group: 'options', section: 'Units', type: 'text', default: 'to first reply' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, T),
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  frame: glanceFrame,
  validate(data) {
    const counts = new Map<string, number>();
    for (const r of data.samples ?? []) counts.set(String(r.group), (counts.get(String(r.group)) ?? 0) + 1);
    const thin = [...counts].filter(([, n]) => n < 2).map(([g]) => g);
    return thin.length ? [{ table: 'samples', message: `Each group needs at least 2 samples (${thin.join(', ')} ${thin.length === 1 ? 'has' : 'have'} one).` } as Issue] : [];
  },
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const names: string[] = [];
    const byGroup = new Map<string, number[]>();
    for (const r of ctx.data.samples ?? []) {
      const g = String(r.group);
      if (!byGroup.has(g)) {
        byGroup.set(g, []);
        names.push(g);
      }
      byGroup.get(g)!.push(Number(r.value));
    }
    const bwOf = new Map((ctx.data.groups ?? []).map((r) => [String(r.group), Number(r.bandwidth)]));
    const groups = names.map((name) => ({ name, vs: [...byGroup.get(name)!].sort((a, b) => a - b) })).filter((g) => g.vs.length >= 2);
    const TOP = 40, BASE = 262;
    const step = Math.max(1e-9, ctx.num('gridStep'));
    let HMAX = ctx.num('yMax');
    if (ctx.bool('autoRange')) {
      const hi = Math.max(...groups.map((g) => g.vs[g.vs.length - 1]));
      if (hi > HMAX) HMAX = Math.ceil(hi / step) * step;
    }
    const mapY = (h: number) => BASE - (h / HMAX) * (BASE - TOP);
    const n = groups.length;
    let sp = ctx.num('spacing');
    if ((n - 1) * sp > 300) sp = 300 / Math.max(1, n - 1);
    const colX = (g: number) => 202 + (g - (n - 1) / 2) * sp;
    const u = ctx.str('numSuffix');
    for (let h = 0, k = 0; h <= HMAX + 1e-9 && k < 60; h += step, k++) {
      el(s, 'line', { x1: 34, y1: mapY(h), x2: 378, y2: mapY(h), stroke: T.track, 'stroke-width': 0.8 * boost(T, 1, 1.8), class: 'fade', style: `animation-delay:${h * 0.01}s` });
      if (ctx.bool('categoryLabels')) {
        txt(s, { x: 28, y: mapY(h) + 3, 'font-size': ctx.fs(7.5), 'font-weight': 600, fill: T.muted, 'text-anchor': 'end', class: 'fade', style: `animation-delay:${h * 0.01}s` }, plain(Math.round(h * 1000) / 1000) + u);
      }
    }
    const shades = laterShades4(T);
    const ink = laterInk(T);
    // darkest = fastest: shade by median rank
    const meds = groups.map((g) => g.vs[Math.floor(g.vs.length / 2)]);
    const order = meds.map((m, i) => [m, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((d) => d[1]);
    const accentSlow = ctx.str('highlightSlowest') === 'on' || (ctx.str('highlightSlowest') === 'auto' && T.heroMode);
    const W = ctx.num('halfWidth'), NPTS = Math.round(ctx.num('points'));
    groups.forEach(({ name, vs }, g) => {
      const rank = order.indexOf(g);
      const med = meds[g];
      const sd = Math.sqrt(vs.reduce((a, v) => a + (v - vs.reduce((b, w) => b + w, 0) / vs.length) ** 2, 0) / vs.length);
      const bw = bwOf.get(name) ?? Math.max(0.9, sd * 1.44 * 0.72) * ctx.num('smoothing');
      const pad = ctx.num('tailPad');
      const lo = Math.max(0, vs[0] - bw * pad), hi = Math.min(HMAX, vs[vs.length - 1] + bw * pad);
      const grid = Array.from({ length: NPTS }, (_, k) => lo + (k / (NPTS - 1)) * (hi - lo));
      const dens = grid.map((h) => vs.reduce((a, v) => a + Math.exp(-((h - v) ** 2) / (2 * bw * bw)), 0));
      const dmax = Math.max(...dens) || 1;
      const x = colX(g);
      const pts: [number, number][] = [];
      grid.forEach((h, k) => pts.push([x + (dens[k] / dmax) * W, mapY(h)]));
      for (let k = NPTS - 1; k >= 0; k--) pts.push([x - (dens[k] / dmax) * W, mapY(grid[k])]);
      let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
      for (let t = 0; t < pts.length; t++) {
        const p = pts[t], q = pts[(t + 1) % pts.length];
        d += ` Q${f1(p[0])} ${f1(p[1])} ${f1((p[0] + q[0]) / 2)} ${f1((p[1] + q[1]) / 2)}`;
      }
      const grp = keyed(el(s, 'g', {}), `violin-${g}`);
      const body = el(grp, 'path', { d: d + ' Z', fill: shades[Math.min(shades.length - 1, rank)], class: 'fade', style: `animation-delay:${g * 0.14}s` });
      tip(body, `${name} — median ${med.toFixed(1)}${u} ${ctx.str('measure')}`.trim());
      const mk = Math.round(((med - lo) / (hi - lo || 1)) * (NPTS - 1));
      const wAtMed = (dens[Math.max(0, Math.min(NPTS - 1, mk))] / dmax) * W;
      el(grp, 'line', { x1: x - wAtMed, y1: mapY(med), x2: x + wAtMed, y2: mapY(med), stroke: T.bg, 'stroke-width': 2.2, class: 'fade', style: `animation-delay:${0.5 + g * 0.14}s` });
      if (ctx.bool('dataLabels')) {
        const slow = accentSlow && rank === n - 1;
        txt(grp, {
          x: x + W + 5, y: mapY(med) + 3, 'font-size': ctx.fs(slow ? 11 : 9.5), 'font-weight': 800, fill: slow ? T.hero : ink,
          class: 'fade', style: `animation-delay:${0.6 + g * 0.14}s`,
        }, med.toFixed(1) + u);
      }
      categoryLabel(ctx, grp, x, BASE + 18, name, g * 0.14);
    });
    captionLine(ctx, autoCaption(ctx.s, T), 306, 1.1, { fill: T.faintData });
  },
});
