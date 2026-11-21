// G04 Circular Graph — teams sit round a ring on a dark card, each taking an arc as wide as its
// dot; shared projects curve through the middle.

import { defineChart } from '../../core/define';
import { quarticOut } from '../../core/ease';
import { pick } from '../../core/theme';
import type { Issue } from '../../core/types';
import { el, tip, txt } from '../../core/vnode';
import { MID, progress } from './plot';
import { ringPositions } from '../shared/ring';
import { glanceDark, glanceDarkFrame } from './shared';

const TEAMS: [string, number][] = [
  ['Product', 52], ['Design', 38], ['Frontend', 46], ['Backend', 44], ['Data', 30],
  ['Growth', 34], ['Support', 22], ['Ops', 18], ['Legal', 9], ['Finance', 12],
];
const LINKS: [number, number, number][] = [
  [0, 1, 9], [0, 2, 8], [0, 3, 7], [1, 2, 9], [2, 3, 6], [3, 4, 7], [0, 5, 6], [5, 4, 5],
  [5, 6, 4], [6, 2, 3], [7, 3, 4], [7, 9, 3], [8, 9, 2], [0, 8, 2], [4, 2, 4], [1, 5, 3],
];
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export default defineChart({
  id: 'G04',
  name: 'Circular Graph',
  family: 'glance',
  kinds: ['network'],
  description: 'Teams round a ring, sized by weight; shared projects curve through the middle.',
  card: { width: 689, chartHeight: 320, dark: true },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [
      {
        key: 'nodes',
        label: 'Nodes',
        minRows: 2,
        maxRows: 80,
        columns: [
          { key: 'id', label: 'Name', type: 'text', role: 'id' },
          { key: 'value', label: 'Value', type: 'number', role: 'size', min: 0 },
        ],
      },
      {
        key: 'links',
        label: 'Links',
        minRows: 0,
        maxRows: 1000,
        columns: [
          { key: 'source', label: 'From', type: 'text', role: 'source' },
          { key: 'target', label: 'To', type: 'text', role: 'target' },
          { key: 'weight', label: 'Weight', type: 'number', role: 'weight', min: 0 },
        ],
      },
    ],
  },
  defaultData: {
    nodes: TEAMS.map(([id, value]) => ({ id, value })),
    links: LINKS.map(([s, t, weight]) => ({ source: TEAMS[s][0], target: TEAMS[t][0], weight })),
  },
  text: {
    title: 'Who works with whom',
    subtitle: 'cross-team collaborations · Q2 2026 · line = shared project',
    source: 'CIRCULAR GRAPH · MONO-FANCY · PROJECT DB',
  },
  fields: [
    { key: 'nodeScale', label: 'Dot size per unit', group: 'options', section: 'Nodes', type: 'number', min: 0.05, max: 5, step: 0.01, default: 0.62, help: 'Dot diameter = value × this.' },
    { key: 'tier1', label: 'Brightest dots: first', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 80, step: 1, unit: 'nodes', default: 4 },
    { key: 'tier2', label: 'Middle dots: next', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 80, step: 1, unit: 'nodes', default: 4 },
    { key: 'labelDistance', label: 'Label distance', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 7 },
    { key: 'linkScale', label: 'Line width per unit', group: 'options', section: 'Links', type: 'number', min: 0.05, max: 5, step: 0.05, default: 0.7 },
    { key: 'linkOpacity', label: 'Line opacity', group: 'options', section: 'Links', type: 'number', min: 0.05, max: 1, step: 0.01, default: 0.55 },
    { key: 'curve', label: 'Curve toward the centre', group: 'options', section: 'Links', type: 'number', min: 0, max: 0.33, step: 0.01, default: 0.28 },
    { key: 'margin', label: 'Ring margin', group: 'options', section: 'Layout', type: 'number', min: 0, max: 150, step: 1, unit: 'px', default: 34, help: 'Space kept above and below the ring (the sides keep 52 px for labels).' },
    { key: 'unit', label: 'Link unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'shared projects' },
  ],
  supports: { dataLabels: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceDarkFrame,
  naturalDuration: () => 1.2,
  validate(data) {
    const ids = new Set((data.nodes ?? []).map((n) => String(n.id)));
    const issues: Issue[] = [];
    (data.links ?? []).forEach((l, i) => {
      for (const end of [l.source, l.target]) if (!ids.has(String(end))) issues.push({ table: 'links', row: i, message: `Links, row ${i + 1}: there’s no node called “${end}”, so this link is left out.` });
    });
    return issues.slice(0, 10);
  },
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const nodes = (ctx.data.nodes ?? []).map((r) => ({ id: String(r.id), v: Number(r.value) }));
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const links = (ctx.data.links ?? [])
      .map((r) => ({ s: index.get(String(r.source)), t: index.get(String(r.target)), w: Number(r.weight) || 0 }))
      .filter((l): l is { s: number; t: number; w: number } => l.s !== undefined && l.t !== undefined);
    const m = ctx.num('margin');
    const rect = { x: 52, y: m, w: W - 104, h: H - 2 * m };
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, R = Math.min(rect.w, rect.h) / 2;
    // round the ring, each node taking the arc its dot needs
    const size = nodes.map((n) => Math.max(0, n.v * ctx.num('nodeScale')));
    const pos = ringPositions(size, R, cx, cy);
    const D = glanceDark(T);
    const e = progress(ctx, 0, 1.2, quarticOut);
    const t1 = Math.round(ctx.num('tier1')), t2 = t1 + Math.round(ctx.num('tier2'));
    const fillOf = (i: number) =>
      T.kind === 'mono' ? (i < t1 ? '#F0EFEB' : i < t2 ? '#8F8E88' : '#4A4944') : i === 0 ? T.heroDark : i < t1 ? T.bg : i < t2 ? D.mid : D.quiet;
    const k = Math.min(0.99, ctx.num('curve') * 3);
    const neighbours = nodes.map(() => new Set<number>());
    links.forEach((l) => {
      neighbours[l.s].add(l.t);
      neighbours[l.t].add(l.s);
    });
    links.forEach((l) => {
      if (e <= 0) return;
      const [x1, y1] = pos[l.s], [x2, y2] = pos[l.t];
      const qx = cx * k + ((x1 + x2) / 2) * (1 - k), qy = cy * k + ((y1 + y2) / 2) * (1 - k);
      // each line draws in from its first end: the curve cut at e
      const ax = x1 + (qx - x1) * e, ay = y1 + (qy - y1) * e;
      const bx = ax + (qx + (x2 - qx) * e - ax) * e, by = ay + (qy + (y2 - qy) * e - ay) * e;
      const path = el(s, 'path', {
        d: `M${r3(x1)} ${r3(y1)}Q${r3(ax)} ${r3(ay)} ${r3(bx)} ${r3(by)}`, fill: 'none', stroke: pick(T, '#4A4840', D.line),
        'stroke-width': l.w * ctx.num('linkScale'), 'stroke-opacity': ctx.num('linkOpacity'),
        'data-cs-rel': `n${l.s} n${l.t}`, class: 'cs-glow', style: `--cs-glow:${T.bg};--cs-glow-o:.8`,
      });
      tip(path, `${nodes[l.s].id} ↔ ${nodes[l.t].id} — ${ctx.fmt(l.w)} ${ctx.str('unit')}`.trim());
    });
    nodes.forEach((n, i) => {
      const [x, y] = pos[i];
      const dot = el(s, 'circle', {
        cx: x, cy: y, r: (size[i] / 2) * e, fill: fillOf(i), opacity: Math.round(e * 1000) / 1000,
        'data-cs-rel': [`n${i}`, ...[...neighbours[i]].map((j) => `n${j}`)].join(' '),
      });
      dot.key = `n${i}`;
      tip(dot, `${n.id} — ${ctx.fmt(n.v)}`);
    });
    if (ctx.bool('dataLabels')) {
      const fs = ctx.fs(9.5);
      nodes.forEach((n, i) => {
        const [x, y] = pos[i];
        txt(s, {
          x: x + size[i] / 2 + ctx.num('labelDistance'), y: y + MID * fs, 'font-size': fs, 'font-weight': 600, fill: pick(T, '#B3B0A4', D.mid),
          opacity: Math.round(e * 1000) / 1000, 'data-cs-rel': [`n${i}`, ...[...neighbours[i]].map((j) => `n${j}`)].join(' '), 'pointer-events': 'none',
        }, n.id);
      });
    }
  },
});
