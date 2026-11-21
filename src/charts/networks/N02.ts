// N02 Circular Graph, dense — sixty repos round a ring, grouped by org (one shade family per
// org), hundreds of shared-contributor links curving through the middle; only the giants carry a
// name, the rest show theirs on hover. Each node takes the arc its dot needs.

import { defineChart } from '../../core/define';
import { quarticOut } from '../../core/ease';
import { rndAbs, rndSigned } from '../../core/rnd';
import type { Theme } from '../../core/theme';
import type { ChartData, Issue, Row } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { MID, progress } from '../glance/plot';
import { ringPositions } from '../shared/ring';

const ORGS: [string, number][] = [['platform', 16], ['product', 14], ['data', 12], ['infra', 10], ['labs', 8]];

function demo(): ChartData {
  const nodes: Row[] = [];
  const meta: { org: number }[] = [];
  ORGS.forEach(([org, count], oi) => {
    for (let i = 0; i < count; i++) {
      // activity: a few giants per org, a long tail of small repos
      const heavy = i < 2 ? 30 + rndSigned(oi + 1, i + 2) * 45 : 4 + rndSigned(oi + 3, i + 7) * 16;
      nodes.push({ id: `${org}/${org.slice(0, 2)}-${String(i + 1).padStart(2, '0')}`, group: org, value: Math.round(heavy) });
      meta.push({ org: oi });
    }
  });
  // dense inside an org, sparser across
  const links: Row[] = [];
  meta.forEach((a, i) => meta.forEach((b, j) => {
    if (j <= i) return;
    if (rndSigned(i + 1, j + 2) < (a.org === b.org ? 0.16 : 0.045)) links.push({ source: nodes[i].id, target: nodes[j].id, weight: 1 + Math.round(rndAbs(i + 2, j + 3) * 6) });
  }));
  return { nodes, links };
}

/** Org shades: steps 0, 2, 3, 5 and 7 of the dark-card ramp (Mono's middle one is its own grey). */
const shadesOf = (T: Theme) => {
  const k = T.dark.dk8;
  return (T.kind === 'mono' ? [k[0], k[2], '#A5A39A', k[5], k[7]] : [k[0], k[2], k[3], k[5], k[7]]).concat([k[1], k[4], k[6]]);
};

export default defineChart({
  id: 'N02',
  name: 'Circular Graph, dense',
  family: 'networks',
  kinds: ['network'],
  description: 'A dense ring of nodes grouped by colour, links curving through the middle; hover lights up a node’s world.',
  card: { width: 1100, chartHeight: 620, dark: true, style: 'large' },
  size: { w: 1032, h: 620, responsive: true },
  dataSchema: {
    tables: [
      {
        key: 'nodes',
        label: 'Nodes',
        minRows: 2,
        maxRows: 300,
        columns: [
          { key: 'id', label: 'ID', type: 'text', role: 'id', help: 'Unique name; links refer to it.' },
          { key: 'group', label: 'Group', type: 'text', role: 'group', required: false, help: 'Nodes in the same group share a shade and sit together.' },
          { key: 'value', label: 'Value', type: 'number', role: 'size', min: 0 },
        ],
      },
      {
        key: 'links',
        label: 'Links',
        minRows: 0,
        maxRows: 3000,
        columns: [
          { key: 'source', label: 'From (ID)', type: 'text', role: 'source' },
          { key: 'target', label: 'To (ID)', type: 'text', role: 'target' },
          { key: 'weight', label: 'Weight', type: 'number', role: 'weight', min: 0, required: false, help: 'Line width. Empty = 1.' },
        ],
      },
    ],
  },
  defaultData: demo(),
  text: {
    title: 'Six hundred collaborations, one ring',
    subtitle: '60 repos · line = shared contributors · hover a repo to light up its world · click to replay',
    source: 'CIRCULAR GRAPH · DENSE · SOURCE · GIT LOG',
  },
  fields: [
    { key: 'margin', label: 'Ring margin', group: 'options', section: 'Ring', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 24 },
    { key: 'nodeBase', label: 'Node base size', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 30, step: 0.1, unit: 'px', default: 3.5 },
    { key: 'nodeScale', label: 'Node growth per √value', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 6, step: 0.05, default: 1.7 },
    { key: 'labelFrom', label: 'Name the nodes from value', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 1e9, step: 1, default: 26, help: 'Smaller nodes show their name on hover.' },
    { key: 'nameSize', label: 'Name size', group: 'options', section: 'Nodes', type: 'number', min: 4, max: 20, step: 0.5, unit: 'px', default: 8.5 },
    { key: 'linkBase', label: 'Link base width', group: 'options', section: 'Links', type: 'number', min: 0, max: 4, step: 0.05, unit: 'px', default: 0.4 },
    { key: 'linkScale', label: 'Link width per weight', group: 'options', section: 'Links', type: 'number', min: 0, max: 2, step: 0.01, default: 0.28 },
    { key: 'curve', label: 'Curve toward the centre', group: 'options', section: 'Links', type: 'number', min: 0, max: 0.33, step: 0.01, default: 0.3 },
    { key: 'sameOpacity', label: 'Within-group opacity', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
    { key: 'crossOpacity', label: 'Across-group opacity', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.01, default: 0.32 },
    { key: 'unit', label: 'Value unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'contributors' },
    { key: 'linkUnit', label: 'Weight unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'shared' },
  ],
  supports: { dataLabels: true, tooltip: true, hover: true },
  paletteNeeds: ['sequential'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  defaults: { padding: 34 },
  naturalDuration: () => 1.8,
  frame: (t) => ({ bg: t.dark.cardBg, title: t.dark.dk8[0], sub: t.dark.sub, src: t.dark.srcRow }),
  validate(data) {
    const ids = new Set((data.nodes ?? []).map((n) => String(n.id).trim()));
    const issues: Issue[] = [];
    (data.links ?? []).forEach((l, i) => {
      for (const end of [l.source, l.target]) if (!ids.has(String(end).trim())) issues.push({ table: 'links', row: i, message: `Links, row ${i + 1}: there’s no node with the ID “${end}”, so this link is left out.` });
    });
    return issues.slice(0, 10);
  },
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const D = T.dark;
    const groups: string[] = [];
    const nodes = (ctx.data.nodes ?? []).map((r) => {
      const g = String(r.group ?? '').trim() || String(r.id);
      if (!groups.includes(g)) groups.push(g);
      return { id: String(r.id).trim(), g: groups.indexOf(g), v: Math.max(0, Number(r.value) || 0) };
    });
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const links = (ctx.data.links ?? [])
      .map((r) => ({ s: index.get(String(r.source).trim()), t: index.get(String(r.target).trim()), w: r.weight === null || r.weight === undefined || r.weight === '' ? 1 : Math.max(0, Number(r.weight)) }))
      .filter((l): l is { s: number; t: number; w: number } => l.s !== undefined && l.t !== undefined && l.s !== l.t);
    const m = ctx.num('margin');
    const cx = m + (W - 2 * m) / 2, cy = m + (H - 2 * m) / 2, R = Math.min(W - 2 * m, H - 2 * m) / 2;
    // round the ring, each node taking the arc its dot needs
    const size = nodes.map((n) => ctx.num('nodeBase') + Math.sqrt(n.v) * ctx.num('nodeScale'));
    const pos = ringPositions(size, R, cx, cy);
    const e = progress(ctx, 0, 1.8, quarticOut);
    const shades = shadesOf(T);
    const neighbours = nodes.map(() => new Set<number>());
    links.forEach((l) => {
      neighbours[l.s].add(l.t);
      neighbours[l.t].add(l.s);
    });
    const rel = (i: number) => [`n${i}`, ...[...neighbours[i]].map((j) => `n${j}`)].join(' ');
    const k = Math.min(0.99, ctx.num('curve') * 3);
    const r3 = (v: number) => Math.round(v * 1000) / 1000;
    const glow = `--cs-glow:${D.hl};--cs-glow-o:${T.kind === 'mono' ? 0.9 : 0.95};--cs-glow-w:1.6;--cs-dim:.03`;
    if (e > 0) {
      links.forEach((l) => {
        const [x1, y1] = pos[l.s], [x2, y2] = pos[l.t];
        const qx = cx * k + ((x1 + x2) / 2) * (1 - k), qy = cy * k + ((y1 + y2) / 2) * (1 - k);
        // each line draws in from its first end
        const ax = x1 + (qx - x1) * e, ay = y1 + (qy - y1) * e;
        const bx = ax + (qx + (x2 - qx) * e - ax) * e, by = ay + (qy + (y2 - qy) * e - ay) * e;
        const same = nodes[l.s].g === nodes[l.t].g;
        const path = el(s, 'path', {
          d: `M${r3(x1)} ${r3(y1)}Q${r3(ax)} ${r3(ay)} ${r3(bx)} ${r3(by)}`, fill: 'none', stroke: same ? D.linkSame : D.linkCross,
          'stroke-width': r3(ctx.num('linkBase') + l.w * ctx.num('linkScale')), 'stroke-opacity': same ? ctx.num('sameOpacity') : ctx.num('crossOpacity'),
          'data-cs-rel': `n${l.s} n${l.t}`, class: 'cs-glow', style: glow,
        });
        tip(path, `${nodes[l.s].id} ↔ ${nodes[l.t].id} — ${ctx.fmt(l.w)} ${ctx.str('linkUnit')}`.trim());
      });
    }
    nodes.forEach((n, i) => {
      if (e <= 0) return;
      const [x, y] = pos[i];
      const dot = el(s, 'circle', { cx: x, cy: y, r: (size[i] / 2) * e, fill: shades[n.g % shades.length], opacity: Math.round(e * 1000) / 1000, 'data-cs-rel': rel(i), style: '--cs-dim:.12' });
      keyed(dot, `n${i}`);
      tip(dot, `${n.id} — ${ctx.fmt(n.v)} ${ctx.str('unit')}`.trim());
    });
    // names: the giants always, the rest on hover; rotated to read outward from the ring
    const fs = ctx.fs(ctx.num('nameSize'));
    nodes.forEach((n, i) => {
      const [x, y] = pos[i];
      let rad = Math.atan2(y - cy, x - cx);
      if (rad < 0) rad += Math.PI * 2;
      const left = x < cx;
      if (left) rad -= Math.PI;
      const dx = (size[i] / 2) * e + 4;
      const big = n.v >= ctx.num('labelFrom');
      const attrs = {
        x: left ? x - dx : x + dx, y: y + MID * fs, 'font-size': fs, 'font-weight': 600, 'text-anchor': left ? 'end' : 'start',
        transform: `rotate(${r3((rad * 180) / Math.PI)} ${r3(x)} ${r3(y)})`,
      };
      if (big && ctx.bool('dataLabels')) txt(s, { ...attrs, fill: D.label, opacity: Math.round(e * 1000) / 1000, 'data-cs-rel': rel(i), style: '--cs-dim:.12', 'pointer-events': 'none' }, n.id);
      else txt(s, { ...attrs, fill: D.hl, class: 'cs-hover-label', 'data-cs-ui': 1, 'data-cs-rel': rel(i) }, n.id);
    });
  },
});
