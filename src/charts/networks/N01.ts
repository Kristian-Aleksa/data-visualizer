// N01 Force Graph, dense — a galaxy of services that settles itself into domain clusters with
// seeded d3-force physics (recorded tick by tick), adjacency hover, drag that "fights back", zoom
// and pan.

import { pick } from '../../core/theme';
import { d3Isc } from '../shared/notices';
import { defineChart } from '../../core/define';
import { rndSigned as rnd } from '../../core/rnd';
import type { ChartData, Issue, Row, Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { attachLiveDrag, buildGraph, d3Engine, edgePath, fitTransform, hasPositions, positionsAt, readFit, simulate, withPositions, type GLink, type GNode, type GraphModel, type SimParams } from '../shared/forcegraph';

const DOMAINS: [string, number][] = [
  ['auth', 26], ['billing', 24], ['content', 28], ['search', 20],
  ['notify', 22], ['media', 20], ['analytics', 18], ['edge', 14],
];

/** The demo network: eight domains, each a hub with its services, a few side links and cross links. */
function demoData(): ChartData {
  const nodes: Row[] = [];
  const links: Row[] = [];
  const meta: { name: string; hub: boolean; dom: number }[] = [];
  DOMAINS.forEach(([dom, count], di) => {
    nodes.push({ id: dom, group: dom, value: 60 + Math.round(rnd(di + 1, 3) * 50), type: 'hub', x: null, y: null });
    meta.push({ name: dom, hub: true, dom: di });
    for (let i = 0; i < count; i++) {
      const v = i < 3 ? 14 + rnd(di + 2, i + 4) * 18 : 2 + rnd(di + 5, i + 9) * 9;
      const name = `${dom}-${String(i + 1).padStart(2, '0')}`;
      nodes.push({ id: name, group: dom, value: Math.round(v), type: 'service', x: null, y: null });
      meta.push({ name, hub: false, dom: di });
      links.push({ source: name, target: dom, weight: null });
      if (i > 1 && rnd(di + 3, i + 11) < 0.22) {
        const j = 1 + Math.floor(rnd(di + 4, i + 13) * i);
        // link to an earlier sibling (picks outside the range are skipped)
        if (j >= 1 && j <= i) links.push({ source: name, target: `${dom}-${String(j).padStart(2, '0')}`, weight: null });
      }
    }
  });
  for (let a = 0; a < DOMAINS.length; a++) {
    for (let b = a + 1; b < DOMAINS.length; b++) {
      if (rnd(a + 7, b + 9) < 0.42) links.push({ source: DOMAINS[a][0], target: DOMAINS[b][0], weight: Math.round(rnd(a + 2, b + 3) * 1000) / 1000 });
    }
  }
  for (let k = 0; k < 26; k++) {
    const a = meta[1 + Math.floor(rnd(k + 1, 17) * (meta.length - 1))];
    const b = meta[1 + Math.floor(rnd(k + 3, 23) * (meta.length - 1))];
    if (a && b && a.name !== b.name && a.dom !== b.dom && !a.hub && !b.hub) links.push({ source: a.name, target: b.name, weight: null });
  }
  return { nodes, links };
}

const SETTLE = 3.5; // seconds for the recorded settling at default speed

function params(s: Settings): SimParams {
  return {
    repulsion: Number(s.repulsion),
    linkMin: Number(s.linkMin),
    linkMax: Math.max(Number(s.linkMin), Number(s.linkMax)),
    longLink: Number(s.longLink),
    gravity: Number(s.gravity),
    friction: Number(s.friction),
    ticks: Number(s.ticks),
    seed: Number(s.seed),
  };
}

const diameter = (n: GNode, s: Settings) =>
  n.hub ? Number(s.hubSize) + Math.sqrt(n.value) * Number(s.hubScale) : Number(s.serviceSize) + Math.sqrt(n.value) * Number(s.serviceScale);
const curveOf = (l: GLink, s: Settings) => (l.kind === 'backbone' ? Number(s.backboneCurve) : l.kind === 'cross' ? Number(s.crossCurve) : 0);

function linkWidth(l: GLink, m: GraphModel, s: Settings): number {
  if (l.kind === 'spoke') {
    const leaf = m.nodes[l.s].hub ? m.nodes[l.t] : m.nodes[l.s];
    return Number(s.spokeWidth) + (l.weight ?? leaf.value) * Number(s.spokeScale);
  }
  if (l.kind === 'backbone') return Math.max(0.3, Number(s.backboneWidth) + (l.weight ?? 0.5) * Number(s.backboneScale));
  return Number(s.thinWidth);
}

const DEMO = demoData();

export default defineChart({
  id: 'N01',
  name: 'Force Graph, dense',
  family: 'networks',
  kinds: ['network'],
  description: 'A dense service network that settles itself into domain clusters; drag, zoom and hover to explore.',
  card: { width: 1100, chartHeight: 620, dark: true, style: 'large' },
  size: { w: 1032, h: 620, responsive: true },
  dataSchema: {
    tables: [
      {
        key: 'nodes',
        label: 'Nodes',
        minRows: 2,
        maxRows: 600,
        columns: [
          { key: 'id', label: 'ID', type: 'text', role: 'id', help: 'Unique name; links refer to it.' },
          { key: 'group', label: 'Group', type: 'text', role: 'group', required: false, help: 'Nodes in the same group share a colour.' },
          { key: 'value', label: 'Value', type: 'number', role: 'size', min: 0, help: 'Sets the node size.' },
          { key: 'type', label: 'Type', type: 'text', required: false, help: '“hub” for a group’s centre, anything else for a regular node.' },
          { key: 'x', label: 'X', type: 'number', role: 'x', required: false, help: 'Saved position in px from the centre (set by dragging). Leave empty for automatic.' },
          { key: 'y', label: 'Y', type: 'number', role: 'y', required: false },
        ],
      },
      {
        key: 'links',
        label: 'Links',
        minRows: 0,
        maxRows: 2400,
        columns: [
          { key: 'source', label: 'From (ID)', type: 'text', role: 'source' },
          { key: 'target', label: 'To (ID)', type: 'text', role: 'target' },
          { key: 'weight', label: 'Weight', type: 'number', role: 'weight', required: false, help: 'Optional; makes the line thicker.' },
        ],
      },
    ],
  },
  defaultData: DEMO,
  text: {
    title: 'A galaxy of one hundred eighty services',
    subtitle: '8 domains self-organize · node = call volume · drag anything, the galaxy fights back · click empty space to replay',
    source: 'FORCE GRAPH · DENSE · SOURCE · SERVICE MESH',
  },
  defaults: { padding: 34 },
  fields: [
    { key: 'repulsion', label: 'Repulsion', group: 'options', section: 'Layout', type: 'number', min: 5, max: 400, step: 1, default: 46, help: 'How hard nodes push each other apart.' },
    { key: 'linkMin', label: 'Shortest link', group: 'options', section: 'Layout', type: 'number', min: 1, max: 120, step: 1, unit: 'px', default: 10, help: 'Busier nodes sit closer to their hub.' },
    { key: 'linkMax', label: 'Longest link', group: 'options', section: 'Layout', type: 'number', min: 2, max: 200, step: 1, unit: 'px', default: 42 },
    { key: 'longLink', label: 'Hub-to-hub distance', group: 'options', section: 'Layout', type: 'number', min: 10, max: 400, step: 1, unit: 'px', default: 42 },
    { key: 'gravity', label: 'Gravity', group: 'options', section: 'Layout', type: 'number', min: 0, max: 1, step: 0.01, default: 0.16, help: 'Pull towards the centre.' },
    { key: 'friction', label: 'Friction', group: 'options', section: 'Layout', type: 'number', min: 0.02, max: 0.95, step: 0.01, default: 0.22, help: 'Lower settles more slowly and smoothly.' },
    { key: 'ticks', label: 'Physics steps', group: 'options', section: 'Layout', type: 'number', min: 60, max: 1000, step: 10, default: 300 },
    { key: 'seed', label: 'Layout variation', group: 'options', section: 'Layout', type: 'number', min: 1, max: 999, step: 1, default: 1, help: 'Try other numbers for a different arrangement.' },
    { key: 'autoFit', label: 'Shrink to fit the artboard', group: 'options', section: 'Layout', type: 'boolean', default: true },
    {
      key: 'clearPositions', label: 'Clear dragged positions', group: 'options', section: 'Layout', type: 'action',
      help: 'Dragging saves every node’s position. This lets the physics arrange them again.',
      enabled: (d) => hasPositions(d),
      run: (d) => ({ data: { ...d, nodes: (d.nodes ?? []).map((r) => ({ ...r, x: null, y: null })) } }),
    },
    { key: 'hubSize', label: 'Hub base size', group: 'options', section: 'Nodes', type: 'number', min: 2, max: 80, step: 0.5, unit: 'px', default: 16 },
    { key: 'hubScale', label: 'Hub growth per value', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 6, step: 0.05, default: 1.6, help: 'Diameter = base + √value × this.' },
    { key: 'serviceSize', label: 'Node base size', group: 'options', section: 'Nodes', type: 'number', min: 0.5, max: 40, step: 0.1, unit: 'px', default: 2.5 },
    { key: 'serviceScale', label: 'Node growth per value', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 6, step: 0.05, default: 1.5 },
    { key: 'hubBorder', label: 'Hub outline', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 8, step: 0.5, unit: 'px', default: 2 },
    { key: 'hubLabels', label: 'Hub names', group: 'options', section: 'Nodes', type: 'boolean', default: true },
    { key: 'hubLabelSize', label: 'Hub name size', group: 'options', section: 'Nodes', type: 'number', min: 4, max: 30, step: 0.5, unit: 'px', default: 9.5 },
    { key: 'spokeWidth', label: 'Spoke width', group: 'options', section: 'Links', type: 'number', min: 0.1, max: 6, step: 0.05, unit: 'px', default: 0.5 },
    { key: 'spokeScale', label: 'Spoke growth per value', group: 'options', section: 'Links', type: 'number', min: 0, max: 0.4, step: 0.005, default: 0.05 },
    { key: 'backboneWidth', label: 'Hub-to-hub width', group: 'options', section: 'Links', type: 'number', min: 0.1, max: 10, step: 0.1, unit: 'px', default: 1.6 },
    { key: 'backboneScale', label: 'Hub-to-hub growth per weight', group: 'options', section: 'Links', type: 'number', min: 0, max: 8, step: 0.1, default: 2.2 },
    { key: 'thinWidth', label: 'Other link width', group: 'options', section: 'Links', type: 'number', min: 0.1, max: 6, step: 0.05, unit: 'px', default: 0.5 },
    { key: 'spokeOpacity', label: 'Spoke opacity', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
    { key: 'intraOpacity', label: 'Within-group opacity', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.01, default: 0.4 },
    { key: 'backboneOpacity', label: 'Hub-to-hub opacity', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.01, default: 0.65 },
    { key: 'crossOpacity', label: 'Across-group opacity', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.01, default: 0.38 },
    { key: 'backboneCurve', label: 'Hub-to-hub curve', group: 'options', section: 'Links', type: 'number', min: -0.6, max: 0.6, step: 0.01, default: 0.08 },
    { key: 'crossCurve', label: 'Across-group curve', group: 'options', section: 'Links', type: 'number', min: -0.6, max: 0.6, step: 0.01, default: 0.15 },
    { key: 'tipSuffix', label: 'Tooltip unit', group: 'options', section: 'Units', type: 'text', default: 'k calls/day', help: 'Shown after each node’s value.' },
  ],
  notices: [d3Isc('d3-force, d3-quadtree, d3-dispatch and d3-timer')],
  supports: { tooltip: true, hover: true, drag: true, zoom: true },
  paletteNeeds: ['sequential'],
  interactions: ['tooltip', 'hover-highlight', 'drag', 'zoom-pan'],
  animation: 'self',
  naturalDuration: () => SETTLE,
  frame: (t) => ({ bg: t.dark.cardBg, title: t.dark.dk8[0], sub: t.dark.sub, src: t.dark.srcRow }),
  validate(data) {
    const { issues } = buildGraph(data);
    return issues.slice(0, 20) as Issue[];
  },
  draw(ctx) {
    const { theme: T, s } = ctx;
    const { model } = buildGraph(ctx.data);
    const p = params(s);
    const res = simulate(model, p);
    const final = res.frames[res.frames.length - 1];
    const radii = model.nodes.map((n) => diameter(n, s) / 2);
    // saved positions are px from the centre: draw them as they are (no re-fit, no jump)
    const fit = model.nodes.some((n) => n.pin) ? { scale: 1, ox: ctx.w / 2, oy: ctx.h / 2 } : fitTransform(final, radii, ctx.w, ctx.h, 6, ctx.bool('autoFit'));
    const pos = positionsAt(res, ctx.time === Infinity ? 1 : ctx.time / SETTLE);
    const X = (i: number) => fit.ox + pos[2 * i] * fit.scale;
    const Y = (i: number) => fit.oy + pos[2 * i + 1] * fit.scale;
    const dark = T.dark;
    const shade = (gi: number) => dark.dk8[gi % dark.dk8.length];
    const linkColor = {
      spoke: pick(T, '#3F3E38', dark.linkSame),
      intra: pick(T, '#33322D', dark.linkCross),
      backbone: pick(T, '#55534B', dark.linkSame),
      cross: pick(T, '#2E2D29', dark.linkFaint),
    };
    const linkOpacity = { spoke: ctx.num('spokeOpacity'), intra: ctx.num('intraOpacity'), backbone: ctx.num('backboneOpacity'), cross: ctx.num('crossOpacity') };
    const rel = (i: number) => [`n${i}`, ...model.neighbors[i].map((j) => `n${j}`)].join(' ');
    const drag = ctx.bool('drag');

    const vp = el(ctx.root, 'g', { 'data-cs-viewport': 1, 'data-cs-fit': `${fit.scale} ${fit.ox} ${fit.oy} ${ctx.w} ${ctx.h}` });
    model.links.forEach((l, j) => {
      el(vp, 'path', {
        d: edgePath(X(l.s), Y(l.s), X(l.t), Y(l.t), curveOf(l, s)),
        fill: 'none',
        stroke: linkColor[l.kind],
        'stroke-width': Math.round(linkWidth(l, model, s) * 1000) / 1000,
        opacity: linkOpacity[l.kind],
        class: 'cs-link',
        'data-cs-rel': `n${l.s} n${l.t}`,
        'data-cs-link': j,
      });
    });
    const unit = ctx.str('tipSuffix');
    model.nodes.forEach((n, i) => {
      const c = el(vp, 'circle', {
        cx: X(i), cy: Y(i), r: radii[i], fill: shade(n.gi),
        stroke: n.hub && ctx.num('hubBorder') > 0 ? dark.cardBg : undefined,
        'stroke-width': n.hub && ctx.num('hubBorder') > 0 ? ctx.num('hubBorder') : undefined,
        class: 'cs-node',
        'data-cs-rel': rel(i),
        'data-cs-node': i,
        'data-cs-drag': drag ? 1 : undefined,
      });
      keyed(c, `n${i}`);
      tip(c, `${n.id} — ${ctx.fmt(n.value)}${unit}`.trim());
    });
    const fs = ctx.fs(ctx.num('hubLabelSize'));
    const mid = 0.3638 * fs; // canvas "middle" baseline → alphabetic
    if (ctx.bool('hubLabels')) {
      model.nodes.forEach((n, i) => {
        if (!n.hub) return;
        txt(vp, {
          x: X(i), y: Y(i) + mid, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 800, fill: dark.cardBg,
          class: 'cs-node', 'data-cs-rel': rel(i), 'data-cs-label': i, 'data-cs-dy': mid, 'pointer-events': 'none',
        }, n.id);
      });
    }
    // labels that appear on hover (live views only)
    model.nodes.forEach((n, i) => {
      const dx = radii[i] + 4;
      txt(vp, {
        x: X(i) + dx, y: Y(i) + mid, 'font-size': fs, 'font-weight': 800, fill: dark.dk8[0],
        class: 'cs-hover-label', 'data-cs-ui': 1, 'data-cs-rel': `n${i}`, 'data-cs-label': i, 'data-cs-dx': dx, 'data-cs-dy': mid,
      }, n.id);
    });
  },
  interact(api) {
    if (!api.enabled.drag) return;
    const { model } = buildGraph(api.data);
    const p = params(api.settings);
    const res = simulate(model, p);
    return attachLiveDrag({
      svg: api.svg,
      model,
      engine: d3Engine(model, p),
      final: res.frames[res.frames.length - 1],
      fit: () => readFit(api.svg),
      radii: model.nodes.map((n) => diameter(n, api.settings) / 2),
      curve: (l) => curveOf(l, api.settings),
      onStart: () => api.finish(),
      onSettled: (pos, fit) => {
        const { w, h } = readFit(api.svg);
        api.commitData?.(withPositions(api.data, model, pos, fit, w, h));
      },
    });
  },
});
