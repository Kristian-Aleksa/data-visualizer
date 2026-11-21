// L14 Hundred Field — shares of a hundred become a hundred people: one sunflower-spiral cluster
// of dots per group, so every share is countable. The cluster spots are data (empty x/y arranges
// them on a ring) and the footnote adds itself up.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import type { ChartData, Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint, lRing, pol } from './shared';

const SEG: [string, number, number, number][] = [['CHARGED', 41, 132, 140], ['TORN', 35, 276, 116], ['ADRIFT', 12, 186, 252], ['AVERSE', 12, 322, 238]];

const sharesOf = (d: ChartData) => (d.rows ?? []).map((r) => Math.max(0, Math.round(Number(r.people) || 0)));
const autoCaption = (_s: Settings, d: ChartData) => {
  const v = sharesOf(d);
  return `ONE DOT = ONE PERSON · ${v.join(' + ')} = ${v.reduce((a, b) => a + b, 0)}`;
};

export default defineChart({
  id: 'L14',
  name: 'Hundred Field',
  family: 'editorial',
  kinds: ['part-to-whole'],
  description: 'Shares of a hundred as a hundred people: one countable spiral cluster per group.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 12,
      columns: [
        { key: 'name', label: 'Group', type: 'text', role: 'label' },
        { key: 'people', label: 'People', type: 'number', role: 'value', min: 0, integer: true, help: 'One dot each (out of 100, or any total).' },
        { key: 'x', label: 'X', type: 'number', role: 'x', required: false, help: 'Cluster centre in the 400 × 320 drawing. Leave empty to arrange automatically.' },
        { key: 'y', label: 'Y', type: 'number', role: 'y', required: false },
      ],
    }],
  },
  defaultData: { rows: SEG.map(([name, people, x, y]) => ({ name, people, x, y })) },
  text: {
    title: 'A hundred of us, four minds',
    subtitle: 'one dot = one person in a hundred · four attitude clusters, sized by share · 2026 survey',
    source: 'HUNDRED FIELD · MONO-SMALL · ATTITUDE SURVEY',
  },
  fields: [
    { key: 'spiral', label: 'Spiral spacing', group: 'options', section: 'Clusters', type: 'number', min: 1, max: 20, step: 0.1, unit: 'px', default: 5.9 },
    { key: 'jitter', label: 'Jitter', group: 'options', section: 'Clusters', type: 'number', min: 0, max: 20, step: 0.1, unit: 'px', default: 3 },
    { key: 'dotMin', label: 'Dot size', group: 'options', section: 'Clusters', type: 'number', min: 0.3, max: 8, step: 0.1, unit: 'px', default: 1.5 },
    { key: 'dotJitter', label: 'Dot size variation', group: 'options', section: 'Clusters', type: 'number', min: 0, max: 8, step: 0.1, unit: 'px', default: 1.7 },
    { key: 'spokeEvery', label: 'Spoke every', group: 'options', section: 'Clusters', type: 'number', min: 0, max: 50, step: 1, unit: 'dots', default: 5, help: '0 turns the spokes off.' },
    {
      key: 'links', label: 'Dashed links', group: 'options', section: 'Layout', type: 'select', default: 'grid',
      options: [{ value: 'grid', label: 'Neighbours in pairs' }, { value: 'ring', label: 'Around in a ring' }, { value: 'none', label: 'None' }],
    },
  ],
  supports: { categoryLabels: true, grid: true, caption: true },
  caption: (s, _T, d) => autoCaption(s, d),
  paletteNeeds: ['categorical'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const segs = ctx.rows.map((r) => ({
      name: String(r.name), v: Math.max(0, Math.min(2000, Math.round(Number(r.people) || 0))),
      x: r.x === null || r.x === undefined || r.x === '' ? null : Number(r.x), y: r.y === null || r.y === undefined || r.y === '' ? null : Number(r.y),
    }));
    const n = segs.length, total = segs.reduce((a, b) => a + b.v, 0);
    // clusters without a spot go round a ring
    const pos = segs.map((g, i): [number, number] => {
      if (g.x !== null && g.y !== null) return [g.x, g.y];
      const a = ((-150 + (i * 360) / n) * Math.PI) / 180;
      return [210 + 112 * Math.cos(a), 165 + 78 * Math.sin(a)];
    });
    // dashed constellation hairlines tying the cluster cores
    const mode = ctx.str('links');
    const pairs: [number, number][] = [];
    if (mode === 'grid') {
      for (let i = 0; i < n; i++) {
        if (i % 2 === 0 && i + 1 < n) pairs.push([i, i + 1]);
        if (i + 2 < n) pairs.push([i, i + 2]);
      }
    } else if (mode === 'ring' && n > 1) {
      for (let i = 0; i < (n > 2 ? n : 1); i++) pairs.push([i, (i + 1) % n]);
    }
    if (ctx.bool('showGrid')) {
      pairs.forEach(([a, b], k) => {
        el(s, 'line', { x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1], stroke: T.grid, 'stroke-width': 0.7, 'stroke-dasharray': '2 5', class: 'fade', style: `animation-delay:${0.9 + k * 0.1}s` });
      });
    }
    const shade = (ci: number) => pick(T, ci < 4 ? T.cat4[ci] : T.ladder[Math.min(T.ladder.length - 1, ci)], T.ser[ci % T.ser.length]);
    const every = Math.round(ctx.num('spokeEvery'));
    segs.forEach(({ name, v }, ci) => {
      const [cx, cy] = pos[ci];
      const g = keyed(el(s, 'g', {}), `g-${ci}`);
      let edge = 0;
      for (let k = 0; k < v; k++) {
        const a = k * 137.508 + ci * 55;
        const rr = 4 + Math.sqrt(k) * ctx.num('spiral') + rnd(k + 1, ci + 2) * ctx.num('jitter');
        edge = Math.max(edge, rr);
        const [x, y] = pol(cx, cy, rr, a);
        // hairline spoke for every 5th person, core to dot
        if (every > 0 && k % every === 0) el(g, 'line', { x1: cx, y1: cy, x2: x, y2: y, stroke: pick(T, '#CDCCC5', T.track), 'stroke-width': 0.6, class: 'fade', style: `animation-delay:${ci * 0.14 + k * 0.012}s` });
        const dot = el(g, 'circle', {
          cx: x, cy: y, r: ctx.num('dotMin') + rnd(k + 2, ci + 3) * ctx.num('dotJitter'), fill: shade(ci),
          ...(T.kind === 'mono' ? { opacity: 0.9 } : { stroke: lRing(T), 'stroke-width': 0.4 }), class: 'pop', style: `animation-delay:${ci * 0.14 + k * 0.012}s`,
        });
        tip(dot, `${name} — one of ${ctx.fmt(v)} in ${ctx.fmt(total)}`);
      }
      el(g, 'circle', { cx, cy, r: 2.4, fill: T.text, class: 'pop', style: `animation-delay:${ci * 0.14}s` });
      if (ctx.bool('categoryLabels')) {
        txt(g, {
          x: cx, y: cy + edge + 13, 'font-size': ctx.fs(8), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle', 'letter-spacing': '.1em',
          style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:${0.5 + ci * 0.12}s`, class: 'fade',
        }, `${name} · ${ctx.fmt(v)}`);
      }
    });
    if (ctx.s.showCaption !== false) {
      txt(s, { x: 200, y: 314, 'font-size': ctx.fs(7), 'font-weight': 600, fill: lFaint(T, '#B0AFA9'), 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:1.3s' }, ctx.str('caption').trim() || autoCaption(ctx.s, ctx.data));
    }
  },
});
