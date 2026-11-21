// L01 Launch Fan — one spoke per feature, fanned out from a corner: the big dot sits at the
// launch week (sized by MAU today), small dots mark every week since, and the rim carries the
// names. Sorted by launch, the big dots cascade along an arc.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint, pol } from './shared';

const FEAT = ['Editor', 'Boards', 'Docs', 'Chat', 'Flows', 'Vault', 'Pages', 'Sync', 'Grid', 'Views', 'Hub', 'Forms'];
const LAUNCH = [1, 3, 4, 6, 8, 9, 11, 12, 14, 16, 17, 19];

export default defineChart({
  id: 'L01',
  name: 'Launch Fan',
  family: 'editorial',
  kinds: ['time', 'comparison'],
  description: 'One spoke per feature: a big dot at its launch week, sized by usage, and a dot for every week since.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 40,
      columns: [
        { key: 'feature', label: 'Feature', type: 'text', role: 'label' },
        { key: 'launch', label: 'Launch week', type: 'number', role: 'x', min: 0, integer: true },
        { key: 'mau', label: 'Users today', type: 'number', role: 'size', min: 0, help: 'Sets the size of the launch dot (the demo: thousands of monthly active users).' },
      ],
    }],
  },
  defaultData: { rows: FEAT.map((feature, i) => ({ feature, launch: LAUNCH[i], mau: Math.round(48 - i * 3 + rnd(i + 1, 3) * 10) })) },
  defaults: { numSuffix: 'k' },
  text: {
    title: 'Twelve features, fanned out',
    subtitle: 'one spoke per feature · big dot = launch week, sized by MAU today · small dots = every week since',
    source: 'LAUNCH FAN · MONO-EDITORIAL · PRODUCT ANALYTICS',
  },
  fields: [
    { key: 'sortByLaunch', label: 'Order spokes by launch week', group: 'options', section: 'Fan', type: 'boolean', default: true },
    { key: 'weeks', label: 'Weeks shown', group: 'options', section: 'Fan', type: 'number', min: 1, max: 104, step: 1, unit: 'weeks', default: 20, help: 'The rim. Launches after it are left out.' },
    { key: 'angleStart', label: 'First spoke angle', group: 'options', section: 'Fan', type: 'number', min: -360, max: 360, step: 1, unit: '°', default: -84, help: '0° points right, −90° points up.' },
    { key: 'angleEnd', label: 'Last spoke angle', group: 'options', section: 'Fan', type: 'number', min: -360, max: 360, step: 1, unit: '°', default: -8 },
    { key: 'originX', label: 'Fan corner, across', group: 'options', section: 'Fan', type: 'number', min: -200, max: 600, step: 1, unit: 'px', default: 40 },
    { key: 'originY', label: 'Fan corner, down', group: 'options', section: 'Fan', type: 'number', min: -200, max: 600, step: 1, unit: 'px', default: 304 },
    { key: 'baseRadius', label: 'Week 0 radius', group: 'options', section: 'Fan', type: 'number', min: 0, max: 300, step: 1, unit: 'px', default: 56 },
    { key: 'radiusPerWeek', label: 'Distance per week', group: 'options', section: 'Fan', type: 'number', min: 1, max: 40, step: 0.1, unit: 'px', default: 9.7 },
    { key: 'guideEvery', label: 'Week guide every', group: 'options', section: 'Fan', type: 'number', min: 0, max: 52, step: 1, unit: 'weeks', default: 5, help: '0 turns the dotted guides off.' },
    { key: 'dotScale', label: 'Launch dot size per √value', group: 'options', section: 'Dots', type: 'number', min: 0, max: 5, step: 0.05, default: 1.15 },
    { key: 'weekDot', label: 'Week dot size', group: 'options', section: 'Dots', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.1 },
    { key: 'weekDotJitter', label: 'Week dot size variation', group: 'options', section: 'Dots', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.2 },
    { key: 'weekDotOpacity', label: 'Week dot opacity', group: 'options', section: 'Dots', type: 'number', min: 0, max: 1, step: 0.05, default: 0.8, help: 'Colour palettes use about two thirds of this (0.55).' },
    { key: 'nameSize', label: 'Name size', group: 'options', section: 'Names', type: 'number', min: 3, max: 20, step: 0.5, unit: 'px', default: 7 },
    { key: 'labelGap', label: 'Name distance from rim', group: 'options', section: 'Names', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 9 },
    { key: 'unit', label: 'Value unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'MAU' },
  ],
  supports: { categoryLabels: true, axes: true, grid: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    let rows = ctx.rows.map((r) => ({ name: String(r.feature), launch: Math.round(Number(r.launch)), mau: Number(r.mau) }));
    const weeks = Math.max(1, Math.round(ctx.num('weeks')));
    rows = rows.filter((r) => r.launch <= weeks);
    if (ctx.bool('sortByLaunch')) rows = rows.map((r, i) => ({ r, i })).sort((a, b) => a.r.launch - b.r.launch || a.i - b.i).map((x) => x.r);
    const CX = ctx.num('originX'), CY = ctx.num('originY');
    const rOf = (w: number) => ctx.num('baseRadius') + w * ctx.num('radiusPerWeek');
    const a0 = ctx.num('angleStart'), a1 = ctx.num('angleEnd');
    const n = rows.length;
    const ang = (i: number) => (n > 1 ? a0 + i * ((a1 - a0) / (n - 1)) : (a0 + a1) / 2);
    // dotted week guides
    const every = Math.round(ctx.num('guideEvery'));
    if (every > 0 && ctx.bool('showGrid')) {
      for (let w = every, gi = 0; w <= weeks; w += every, gi++) {
        const r = rOf(w), [x1, y1] = pol(CX, CY, r, a0), [x2, y2] = pol(CX, CY, r, a1);
        const big = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 >= a0 ? 1 : 0;
        el(s, 'path', {
          d: `M${x1} ${y1} A${r} ${r} 0 ${big} ${sweep} ${x2} ${y2}`, fill: 'none', stroke: T.quiet, 'stroke-width': 1, 'stroke-dasharray': '2 5',
          class: 'fade', style: `animation-delay:${gi * 0.1}s`,
        });
        const [lx, ly] = pol(CX, CY, r, a0 - (a1 >= a0 ? 3.5 : -3.5));
        if (ctx.bool('showAxes')) txt(s, { x: lx, y: ly, 'font-size': ctx.fs(6.5), fill: lFaint(T, '#B0AFA9'), 'text-anchor': 'middle', class: 'fade', style: `animation-delay:${gi * 0.1}s` }, 'W' + w);
      }
    }
    const unit = ctx.str('unit');
    const dotOp = ctx.num('weekDotOpacity') * pick(T, 1, 0.55 / 0.8);
    rows.forEach(({ name, launch: L, mau }, i) => {
      const a = ang(i);
      // earlier launch = heavier (colour palettes)
      const col = T.ramp[4 - Math.min(4, Math.floor((L - 1) / (weeks / 5)))] ?? T.ramp[4];
      const g = keyed(el(s, 'g', {}), `f-${i}`);
      // hairline spoke from launch to rim
      const [sx, sy] = pol(CX, CY, rOf(L), a), [ex, ey] = pol(CX, CY, rOf(weeks), a);
      el(g, 'line', { x1: sx, y1: sy, x2: ex, y2: ey, stroke: pick(T, T.track, T.quiet), 'stroke-width': 0.7, class: 'fade', style: `animation-delay:${0.15 + i * 0.05}s` });
      // weekly texture dots
      for (let w = L + 1; w <= weeks; w++) {
        const [x, y] = pol(CX, CY, rOf(w), a);
        el(g, 'circle', {
          cx: x, cy: y, r: ctx.num('weekDot') + rnd(i + 1, w) * ctx.num('weekDotJitter'), fill: pick(T, T.faintData, col), opacity: Math.round(dotOp * 1000) / 1000,
          class: 'pop', style: `animation-delay:${0.2 + i * 0.06 + (w - L) * 0.015}s`,
        });
      }
      // launch dot, sized by MAU
      const [bx, by] = pol(CX, CY, rOf(L), a);
      const big = el(g, 'circle', {
        cx: bx, cy: by, r: Math.sqrt(Math.max(0, mau)) * ctx.num('dotScale'), fill: pick(T, T.data, T.heroMode && i === 0 ? T.hero : col),
        class: 'pop', style: `animation-delay:${0.15 + i * 0.07}s`,
      });
      tip(big, `${name} — launched W${L} · ${ctx.fmt(mau)} ${unit}`.trim());
      // rim label along the spoke
      if (ctx.bool('categoryLabels')) {
        const [tx, ty] = pol(CX, CY, rOf(weeks) + ctx.num('labelGap'), a);
        txt(g, {
          x: tx, y: ty, 'font-size': ctx.fs(ctx.num('nameSize')), 'font-weight': 600, fill: T.label, transform: `rotate(${a} ${tx} ${ty})`, 'dominant-baseline': 'middle',
          class: 'fade', style: `animation-delay:${0.3 + i * 0.05}s`,
        }, name);
      }
    });
  },
});
