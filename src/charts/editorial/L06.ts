// L06 Cluster Field — a core cluster drawn as golden-angle spokes with a dot per member,
// satellite islands with their own members, and dotted paths from the core to each island. The
// first data row is the core; island positions are data too (empty x/y places them on a ring
// around the core).

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lRing, pol } from './shared';

const GROUPS: [string, number, number, number][] = [
  ['CORE', 80, 300, 172], ['PLUGINS', 22, 622, 78], ['THEMES', 16, 706, 214], ['DOCS', 13, 540, 268], ['FORKS', 12, 92, 72], ['MIRRORS', 9, 774, 58],
];
const GOLDEN = 137.508;

export default defineChart({
  id: 'L06',
  name: 'Cluster Field',
  family: 'editorial',
  kinds: ['network'],
  description: 'A core cluster of spokes with satellite islands, each with its own members.',
  card: { width: 1400, chartHeight: 360 },
  size: { w: 840, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 40,
      columns: [
        { key: 'name', label: 'Cluster', type: 'text', role: 'label', help: 'The first row is the core; the rest are islands.' },
        { key: 'members', label: 'Members', type: 'number', role: 'value', min: 0, integer: true },
        { key: 'x', label: 'X', type: 'number', role: 'x', required: false, help: 'Position in the 840 × 320 drawing. Leave empty to place it automatically.' },
        { key: 'y', label: 'Y', type: 'number', role: 'y', required: false },
      ],
    }],
  },
  defaultData: { rows: GROUPS.map(([name, members, x, y]) => ({ name, members, x, y })) },
  text: {
    title: 'The contributor field',
    subtitle: '80 core contributors orbit the main repo · satellite islands keep their own gravity · dotted paths = cross-contribution',
    source: 'CLUSTER FIELD · MONO-EDITORIAL · CONTRIBUTOR GRAPH',
  },
  fields: [
    { key: 'spokeMin', label: 'Shortest spoke', group: 'options', section: 'Core', type: 'number', min: 0, max: 150, step: 1, unit: 'px', default: 28 },
    { key: 'spokeJitter', label: 'Spoke length variation', group: 'options', section: 'Core', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 88 },
    { key: 'coreDot', label: 'Core dot size', group: 'options', section: 'Core', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 6.5, help: 'Colour palettes draw it 0.5 px bigger, in the highlight colour.' },
    { key: 'memberDot', label: 'Member dot size', group: 'options', section: 'Core', type: 'number', min: 0, max: 8, step: 0.1, unit: 'px', default: 1.6 },
    { key: 'memberDotJitter', label: 'Member dot size variation', group: 'options', section: 'Core', type: 'number', min: 0, max: 8, step: 0.1, unit: 'px', default: 1.8 },
    { key: 'coreOpacity', label: 'Core member opacity', group: 'options', section: 'Core', type: 'number', min: 0, max: 1, step: 0.01, default: 0.85 },
    { key: 'coreLabelGap', label: 'Core label below the centre', group: 'options', section: 'Core', type: 'number', min: -200, max: 200, step: 1, unit: 'px', default: 140 },
    { key: 'islandMin', label: 'Island inner radius', group: 'options', section: 'Islands', type: 'number', min: 0, max: 80, step: 0.5, unit: 'px', default: 9 },
    { key: 'islandJitter', label: 'Island spread', group: 'options', section: 'Islands', type: 'number', min: 0, max: 120, step: 0.5, unit: 'px', default: 26 },
    { key: 'islandLabelGap', label: 'Island label below the centre', group: 'options', section: 'Islands', type: 'number', min: -100, max: 100, step: 1, unit: 'px', default: 44 },
    { key: 'pathBow', label: 'Path bow', group: 'options', section: 'Paths', type: 'number', min: -150, max: 150, step: 1, unit: 'px', default: 30, help: 'How far the dotted paths arc upward.' },
    { key: 'memberWord', label: 'One member is a…', group: 'options', section: 'Units', type: 'text', default: 'contributor', help: 'Tooltips: “core contributor #12”, “PLUGINS — 22 contributors”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, grid: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.name), n: Math.max(0, Math.min(2000, Math.round(Number(r.members) || 0))), x: r.x === null || r.x === undefined || r.x === '' ? null : Number(r.x), y: r.y === null || r.y === undefined || r.y === '' ? null : Number(r.y) }));
    if (!rows.length) return;
    const core = rows[0], islands = rows.slice(1);
    const HX = core.x ?? 300, HY = core.y ?? 172;
    // islands without a position go on a ring around the core, inside the drawing
    const pos = islands.map((it, ci) => {
      if (it.x !== null && it.y !== null) return [it.x, it.y] as [number, number];
      const a = -90 + (ci * 360) / Math.max(1, islands.length);
      return [Math.max(40, Math.min(800, HX + 300 * Math.cos((a * Math.PI) / 180))), Math.max(40, Math.min(276, HY + 110 * Math.sin((a * Math.PI) / 180)))] as [number, number];
    });
    const word = ctx.str('memberWord').trim();
    const plural = (n: number) => (word ? ` ${word}${n === 1 ? '' : 's'}` : '');
    // dotted cross-contribution paths, core → each island
    if (ctx.bool('showGrid')) {
      pos.forEach(([x, y], ci) => {
        const mx = (HX + x) / 2, my = (HY + y) / 2 - ctx.num('pathBow');
        el(s, 'path', {
          d: `M${HX} ${HY} Q${mx} ${my} ${x} ${y}`, fill: 'none', stroke: T.grid, 'stroke-width': 0.9, 'stroke-dasharray': '2 4',
          class: 'draw', style: `animation-delay:${0.8 + ci * 0.12}s;animation-duration:.7s`,
        });
      });
    }
    // the core: golden-angle spokes, one dot per member
    const cg = keyed(el(s, 'g', {}), 'core');
    for (let i = 0; i < core.n; i++) {
      const a = i * GOLDEN, len = ctx.num('spokeMin') + rnd(i + 1, 7) * ctx.num('spokeJitter');
      const [x, y] = pol(HX, HY, len, a);
      el(cg, 'line', { x1: HX, y1: HY, x2: x, y2: y, stroke: pick(T, T.faint, T.track), 'stroke-width': 0.6, class: 'draw', style: `animation-delay:${i * 0.012}s;animation-duration:.5s` });
      const dot = el(cg, 'circle', {
        cx: x, cy: y, r: ctx.num('memberDot') + rnd(i + 1, 4) * ctx.num('memberDotJitter'), fill: pick(T, T.text, T.ser[0]),
        opacity: Math.round(Math.min(1, ctx.num('coreOpacity') * pick(T, 1, 0.9 / 0.85)) * 1000) / 1000, class: 'pop', style: `animation-delay:${0.15 + i * 0.012}s`,
      });
      tip(dot, `${core.name.toLowerCase()}${word ? ' ' + word : ''} #${i + 1}`);
    }
    const hub = el(cg, 'circle', { cx: HX, cy: HY, r: ctx.num('coreDot') + pick(T, 0, 0.5), fill: pick(T, T.text, T.hero), class: 'pop' });
    tip(hub, `${core.name} — ${ctx.fmt(core.n)}${plural(core.n)}`);
    if (ctx.bool('categoryLabels')) {
      txt(cg, {
        x: HX, y: HY + ctx.num('coreLabelGap'), 'font-size': ctx.fs(8), 'font-weight': 800, fill: pick(T, T.text, T.hero), 'text-anchor': 'middle',
        'letter-spacing': '.1em', style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px`, class: 'fade',
      }, `${core.name} · ${ctx.fmt(core.n)}`);
    }
    // satellite islands, heavier shade for bigger islands (colour palettes)
    const ns = islands.map((it) => it.n), lo = Math.min(...ns), hi = Math.max(...ns);
    islands.forEach((it, ci) => {
      const [x, y] = pos[ci];
      const col = T.ramp[1 + Math.round(hi > lo ? ((it.n - lo) / (hi - lo)) * 3 : 3)];
      const g = keyed(el(s, 'g', {}), `island-${ci}`);
      const centre = el(g, 'circle', { cx: x, cy: y, r: 3.5, fill: pick(T, '#4A4944', col), class: 'pop', style: `animation-delay:${0.9 + ci * 0.12}s` });
      tip(centre, `${it.name} — ${ctx.fmt(it.n)}${plural(it.n)}`);
      for (let k = 0; k < it.n; k++) {
        const a = k * GOLDEN + ci * 40, rr = ctx.num('islandMin') + rnd(k + 1, ci + 2) * ctx.num('islandJitter');
        const [dx, dy] = pol(x, y, rr, a);
        if (k % 2 === 0) el(g, 'line', { x1: x, y1: y, x2: dx, y2: dy, stroke: pick(T, T.quiet, T.track), 'stroke-width': 0.5, class: 'fade', style: `animation-delay:${1 + ci * 0.12 + k * 0.02}s` });
        el(g, 'circle', {
          cx: dx, cy: dy, r: 1.4 + rnd(k + 3, ci + 5) * 1.4, fill: pick(T, T.label, col),
          ...(T.kind === 'mono' ? {} : { stroke: lRing(T), 'stroke-width': 0.4 }),
          class: 'pop', style: `animation-delay:${1 + ci * 0.12 + k * 0.02}s`,
        });
      }
      if (ctx.bool('categoryLabels')) {
        txt(g, {
          x, y: y + ctx.num('islandLabelGap'), 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: T.muted, 'text-anchor': 'middle',
          'letter-spacing': '.12em', style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px`, class: 'fade',
        }, `${it.name} · ${ctx.fmt(it.n)}`);
      }
    });
  },
});
