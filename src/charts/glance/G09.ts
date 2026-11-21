// G09 Force Graph — one hub, its integrations around it, a few side roads between them. The
// network shakes itself into place with seeded d3-force physics, recorded step by step so any
// frame (and every video frame) is exact. Drag a node and the rest of the web reacts.

import { defineChart } from '../../core/define';
import { quarticOut } from '../../core/ease';
import { pick } from '../../core/theme';
import type { ChartData, Issue, Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { d3Isc } from '../shared/notices';
import { attachLiveDrag, buildGraph, d3Engine, edgePath, hasPositions, positionsAt, readFit, simulate, withPositions, type GNode, type GraphModel, type SimParams } from '../shared/forcegraph';
import { MID, progress } from './plot';
import { glanceDark, glanceDarkFrame } from './shared';

const HUB: [string, number] = ['Core API', 52];
const APPS: [string, number][] = [
  ['Slack', 34], ['GitHub', 30], ['Figma', 22], ['Notion', 26], ['Linear', 18], ['Drive', 16],
  ['Zoom', 10], ['Jira', 14], ['Sheets', 12], ['Intercom', 8], ['Stripe', 20], ['Segment', 9],
];
const SIDE_ROADS: [string, string, number][] = [['Slack', 'GitHub', 12], ['GitHub', 'Linear', 12], ['Figma', 'Notion', 10], ['Stripe', 'Sheets', 10]];

const DEMO: ChartData = {
  nodes: [
    { id: HUB[0], value: HUB[1], type: 'hub', x: null, y: null },
    ...APPS.map(([id, value]) => ({ id, value, type: 'app', x: null, y: null })),
  ],
  links: [
    ...APPS.map(([id]) => ({ source: id, target: HUB[0], weight: null })),
    ...SIDE_ROADS.map(([source, target, weight]) => ({ source, target, weight })),
  ],
};

const SETTLE = 4; // seconds the recorded settling takes to play

// every link here joins two different groups, so they all use the one link length
const params = (s: Settings): SimParams => ({
  repulsion: Number(s.repulsion),
  linkMin: Number(s.linkLength),
  linkMax: Number(s.linkLength),
  longLink: Number(s.linkLength),
  gravity: Number(s.gravity),
  friction: Number(s.friction),
  ticks: Number(s.ticks),
  seed: Number(s.seed),
  startBox: [600, 300],
});

const dotSize = (n: GNode, s: Settings) => Math.max(0, Number(s.dotBase) + n.value * Number(s.dotPerUnit));

/** A link that touches a hub is a spoke; the rest are side roads. */
function linkStyle(m: GraphModel, s: number, t: number, weight: number | null, st: Settings) {
  const a = m.nodes[s], b = m.nodes[t];
  if (a.hub || b.hub) {
    const leaf = a.hub && b.hub ? Math.min(a.value, b.value) : a.hub ? b.value : a.value;
    return { spoke: true, width: Math.max(Number(st.spokeMin), (weight ?? leaf) * Number(st.spokePerUnit)) };
  }
  return { spoke: false, width: weight === null ? 1 : Math.max(0, weight * Number(st.sidePerUnit)) };
}

export default defineChart({
  id: 'G09',
  name: 'Force Graph',
  family: 'glance',
  kinds: ['network'],
  description: 'A hub and its satellites shake themselves into place; drag a node and the web fights back.',
  card: { width: 689, chartHeight: 320, dark: true },
  size: { w: 633, h: 320, responsive: true },
  notices: [d3Isc('d3-force, d3-quadtree, d3-dispatch and d3-timer')],
  dataSchema: {
    tables: [
      {
        key: 'nodes',
        label: 'Nodes',
        minRows: 1,
        maxRows: 150,
        columns: [
          { key: 'id', label: 'ID', type: 'text', role: 'id', help: 'Unique name; links refer to it.' },
          { key: 'value', label: 'Value', type: 'number', role: 'size', min: 0, help: 'Sets the dot size.' },
          { key: 'type', label: 'Type', type: 'text', required: false, help: '“hub” for the centre, anything else for the others.' },
          { key: 'x', label: 'X', type: 'number', role: 'x', required: false, help: 'Saved position in px from the centre (set by dragging). Leave empty for automatic.' },
          { key: 'y', label: 'Y', type: 'number', role: 'y', required: false },
        ],
      },
      {
        key: 'links',
        label: 'Links',
        minRows: 0,
        maxRows: 1000,
        columns: [
          { key: 'source', label: 'From (ID)', type: 'text', role: 'source' },
          { key: 'target', label: 'To (ID)', type: 'text', role: 'target' },
          { key: 'weight', label: 'Weight', type: 'number', role: 'weight', required: false, min: 0, help: 'Optional; makes the line thicker. A link to the hub without one uses its node’s value; other links without one are 1 px.' },
        ],
      },
    ],
  },
  defaultData: DEMO,
  defaults: { numSuffix: 'k' },
  text: {
    title: 'Integrations, pulled into orbit',
    subtitle: 'force layout · node = monthly syncs · drag a node, the web fights back',
    source: 'FORCE GRAPH · NEW · INTEGRATION HUB',
  },
  fields: [
    { key: 'repulsion', label: 'Repulsion', group: 'options', section: 'Layout', type: 'number', min: 0, max: 1000, step: 1, default: 90, help: 'How hard nodes push each other apart.' },
    { key: 'linkLength', label: 'Link length', group: 'options', section: 'Layout', type: 'number', min: 1, max: 300, step: 1, unit: 'px', default: 73 },
    { key: 'gravity', label: 'Gravity', group: 'options', section: 'Layout', type: 'number', min: 0, max: 1, step: 0.01, default: 0.12, help: 'Pull towards the centre.' },
    { key: 'friction', label: 'Friction', group: 'options', section: 'Layout', type: 'number', min: 0.02, max: 0.95, step: 0.01, default: 0.4, help: 'Lower settles more slowly and smoothly.' },
    { key: 'ticks', label: 'Physics steps', group: 'options', section: 'Layout', type: 'number', min: 60, max: 1000, step: 10, default: 300 },
    { key: 'seed', label: 'Layout variation', group: 'options', section: 'Layout', type: 'number', min: 1, max: 999, step: 1, default: 7, help: 'Try other numbers for a different arrangement.' },
    { key: 'autoFit', label: 'Shrink to fit the artboard', group: 'options', section: 'Layout', type: 'boolean', default: true },
    { key: 'margin', label: 'Edge margin', group: 'options', section: 'Layout', type: 'number', min: 0, max: 100, step: 1, unit: 'px', default: 14, help: 'Used when shrinking to fit.', when: (s) => s.autoFit !== false },
    {
      key: 'clearPositions', label: 'Clear dragged positions', group: 'options', section: 'Layout', type: 'action',
      help: 'Dragging saves every node’s position. This lets the physics arrange them again.',
      enabled: (d) => hasPositions(d),
      run: (d) => ({ data: { ...d, nodes: (d.nodes ?? []).map((r) => ({ ...r, x: null, y: null })) } }),
    },
    { key: 'dotBase', label: 'Dot base size', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 60, step: 0.5, unit: 'px', default: 8 },
    { key: 'dotPerUnit', label: 'Dot growth per value', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 5, step: 0.01, default: 0.75, help: 'Diameter = base + value × this.' },
    { key: 'brightFrom', label: 'Bright dots from value', group: 'options', section: 'Nodes', type: 'number', min: -1e9, max: 1e9, step: 1, default: 15, help: 'Smaller nodes get the dim shade.' },
    { key: 'labelDistance', label: 'Name distance', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 6 },
    { key: 'hubLabelSize', label: 'Hub name size', group: 'options', section: 'Nodes', type: 'number', min: 4, max: 30, step: 0.5, unit: 'px', default: 10.5 },
    { key: 'nodeLabelSize', label: 'Other names size', group: 'options', section: 'Nodes', type: 'number', min: 4, max: 30, step: 0.5, unit: 'px', default: 9 },
    { key: 'spokeMin', label: 'Thinnest hub link', group: 'options', section: 'Links', type: 'number', min: 0, max: 10, step: 0.05, unit: 'px', default: 0.8 },
    { key: 'spokePerUnit', label: 'Hub link width per value', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.005, default: 0.09 },
    { key: 'sidePerUnit', label: 'Side-road width per weight', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.005, default: 0.1, help: 'Side roads link two nodes that aren’t hubs.' },
    { key: 'spokeOpacity', label: 'Hub link opacity', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.01, default: 0.6 },
    { key: 'sideOpacity', label: 'Side-road opacity', group: 'options', section: 'Links', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
    { key: 'unit', label: 'Tooltip unit', group: 'options', section: 'Units', type: 'text', default: 'syncs/mo', help: 'Shown after each node’s value.' },
  ],
  supports: { dataLabels: true, drag: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight', 'drag'],
  animation: 'self',
  frame: glanceDarkFrame,
  naturalDuration: () => SETTLE,
  validate(data) {
    return buildGraph(data).issues.slice(0, 20) as Issue[];
  },
  draw(ctx) {
    const { theme: T, s, w: W, h: H } = ctx;
    const { model } = buildGraph(ctx.data);
    const res = simulate(model, params(s));
    const final = res.frames[res.frames.length - 1];
    const sizes = model.nodes.map((n) => dotSize(n, s));
    // gravity centres the network in the chart area; it is only shrunk if it spills over
    let scale = 1;
    if (!model.nodes.some((n) => n.pin) && ctx.bool('autoFit')) {
      let mx = 0, my = 0;
      sizes.forEach((d, i) => {
        mx = Math.max(mx, Math.abs(final[2 * i]) + d / 2);
        my = Math.max(my, Math.abs(final[2 * i + 1]) + d / 2);
      });
      const m = ctx.num('margin');
      scale = Math.max(0.05, Math.min(1, (W / 2 - m) / Math.max(1, mx), (H / 2 - m) / Math.max(1, my)));
    }
    const fit = { scale, ox: W / 2, oy: H / 2 };
    const pos = positionsAt(res, ctx.time === Infinity ? 1 : ctx.time / SETTLE);
    const X = (i: number) => fit.ox + pos[2 * i] * fit.scale;
    const Y = (i: number) => fit.oy + pos[2 * i + 1] * fit.scale;
    // dots grow and links draw in over the first 1.2 s while the physics runs
    const e = progress(ctx, 0, 1.2, quarticOut);
    const D = glanceDark(T);
    const rel = (i: number) => [`n${i}`, ...model.neighbors[i].map((j) => `n${j}`)].join(' ');
    const glow = `--cs-glow:${T.bg};--cs-glow-o:.85`;
    const drag = ctx.bool('drag');

    const vp = el(ctx.root, 'g', { 'data-cs-viewport': 1, 'data-cs-fit': `${fit.scale} ${fit.ox} ${fit.oy} ${W} ${H}` });
    if (e > 0) {
      model.links.forEach((l, j) => {
        const st = linkStyle(model, l.s, l.t, l.weight, s);
        if (st.width <= 0) return;
        const x1 = X(l.s), y1 = Y(l.s);
        el(vp, 'path', {
          d: edgePath(x1, y1, x1 + (X(l.t) - x1) * e, y1 + (Y(l.t) - y1) * e, 0),
          fill: 'none',
          stroke: st.spoke ? pick(T, '#4A4840', D.line) : pick(T, '#3A3934', D.line2),
          'stroke-width': Math.round(st.width * 1000) / 1000,
          'stroke-opacity': st.spoke ? ctx.num('spokeOpacity') : ctx.num('sideOpacity'),
          class: 'cs-glow', style: glow, 'data-cs-rel': `n${l.s} n${l.t}`, 'data-cs-link': j,
        });
      });
    }
    const unit = ctx.str('unit');
    const bright = ctx.num('brightFrom');
    model.nodes.forEach((n, i) => {
      if (e <= 0) return;
      const fill = n.hub ? pick(T, '#F0EFEB', T.heroDark) : n.value >= bright ? pick(T, '#B3B0A4', T.bg) : pick(T, '#6A6963', D.mid);
      const c = el(vp, 'circle', {
        cx: X(i), cy: Y(i), r: (sizes[i] / 2) * e, fill, opacity: Math.round(e * 1000) / 1000,
        'data-cs-rel': rel(i), 'data-cs-node': i, 'data-cs-drag': drag ? 1 : undefined,
      });
      keyed(c, `n${i}`);
      tip(c, `${n.id} — ${ctx.fmt(n.value)} ${unit}`.trim());
    });
    if (ctx.bool('dataLabels') && e > 0) {
      model.nodes.forEach((n, i) => {
        const fs = ctx.fs(n.hub ? ctx.num('hubLabelSize') : ctx.num('nodeLabelSize'));
        const dx = (sizes[i] / 2) * e + ctx.num('labelDistance'), dy = MID * fs;
        txt(vp, {
          x: X(i) + dx, y: Y(i) + dy, 'font-size': fs, 'font-weight': n.hub ? 800 : 600, fill: n.hub ? T.bg : pick(T, '#8F8E88', D.mid),
          opacity: Math.round(e * 1000) / 1000, 'data-cs-rel': rel(i), 'data-cs-label': i, 'data-cs-dx': dx, 'data-cs-dy': dy, 'pointer-events': 'none',
        }, n.id);
      });
    }
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
      radii: model.nodes.map((n) => dotSize(n, api.settings) / 2),
      curve: () => 0,
      onStart: () => api.finish(),
      onSettled: (pos, fit) => {
        const { w, h } = readFit(api.svg);
        api.commitData?.(withPositions(api.data, model, pos, fit, w, h));
      },
    });
  },
});
