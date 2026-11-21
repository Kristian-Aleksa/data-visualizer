// Shared force-directed network engine (N01 and G09).
//
// Layout is computed with d3-force from a fixed random seed for a fixed number of ticks, and
// every tick is recorded, so the entrance ("the network shakes itself into place") is a pure
// function of time and the video matches the preview. Results are cached, so scrubbing and
// video export don't recompute the physics. Dragged positions are stored in the data (x, y);
// pinned nodes are pulled to those spots during the entrance and end exactly there.

import { forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force';
import { toNumber } from '../../core/data';
import { mulberry32 } from '../../core/rnd';
import type { ChartData, Issue } from '../../core/types';

export type LinkKind = 'spoke' | 'intra' | 'backbone' | 'cross';

export interface GNode {
  id: string;
  group: string;
  value: number;
  hub: boolean;
  /** group index (for the colour ramp) */
  gi: number;
  pin: [number, number] | null;
}

export interface GLink {
  s: number;
  t: number;
  kind: LinkKind;
  weight: number | null;
}

export interface GraphModel {
  nodes: GNode[];
  links: GLink[];
  groups: string[];
  neighbors: number[][];
  /** stable identity for caching */
  key: string;
}

/** Turn the nodes/links tables into a graph. Problems become messages, never crashes. */
export function buildGraph(data: ChartData): { model: GraphModel; issues: Issue[] } {
  const issues: Issue[] = [];
  const nodes: GNode[] = [];
  const index = new Map<string, number>();
  const groups: string[] = [];
  const gIndex = new Map<string, number>();
  (data.nodes ?? []).forEach((r, row) => {
    const id = String(r.id ?? '').trim();
    if (!id) return;
    if (index.has(id)) {
      issues.push({ table: 'nodes', row, column: 'id', message: `Nodes, row ${row + 1}: the ID “${id}” is used twice; the second one is left out.` });
      return;
    }
    const group = String(r.group ?? '').trim() || id;
    if (!gIndex.has(group)) {
      gIndex.set(group, groups.length);
      groups.push(group);
    }
    const x = toNumber(r.x), y = toNumber(r.y);
    index.set(id, nodes.length);
    nodes.push({
      id,
      group,
      value: Math.max(0, toNumber(r.value) ?? 0),
      hub: String(r.type ?? '').trim().toLowerCase() === 'hub',
      gi: gIndex.get(group)!,
      pin: x !== null && y !== null ? [x, y] : null,
    });
  });
  const links: GLink[] = [];
  const seen = new Set<string>();
  (data.links ?? []).forEach((r, row) => {
    const a = String(r.source ?? '').trim(), b = String(r.target ?? '').trim();
    if (!a && !b) return;
    const s = index.get(a), t = index.get(b);
    if (s === undefined || t === undefined) {
      const missing = s === undefined ? a : b;
      issues.push({ table: 'links', row, column: s === undefined ? 'source' : 'target', message: `Links, row ${row + 1}: there’s no node with the ID “${missing}”, so this link is left out.` });
      return;
    }
    if (s === t) return;
    const k = s < t ? `${s}-${t}` : `${t}-${s}`;
    if (seen.has(k)) return;
    seen.add(k);
    const ns = nodes[s], nt = nodes[t];
    const kind: LinkKind = ns.hub && nt.hub ? 'backbone' : ns.group === nt.group ? ((ns.hub || nt.hub) ? 'spoke' : 'intra') : 'cross';
    links.push({ s, t, kind, weight: toNumber(r.weight) });
  });
  const neighbors = nodes.map(() => [] as number[]);
  for (const l of links) {
    neighbors[l.s].push(l.t);
    neighbors[l.t].push(l.s);
  }
  const key = JSON.stringify([nodes.map((n) => [n.id, n.value, n.hub, n.gi, n.pin]), links.map((l) => [l.s, l.t])]);
  return { model: { nodes, links, groups, neighbors, key }, issues };
}

export interface SimParams {
  repulsion: number;
  linkMin: number;
  linkMax: number;
  /** length of hub-to-hub and cross-group links */
  longLink: number;
  gravity: number;
  friction: number;
  ticks: number;
  seed: number;
  /** width and height of the area the nodes start scattered across (default 1032 × 620) */
  startBox?: [number, number];
}

type N = SimulationNodeDatum & { i: number };
type L = SimulationLinkDatum<N> & { kind: LinkKind; v: number };

// How the settings map onto d3-force's strengths (tuned so the defaults give compact, readable
// clusters: hubs about 110 px apart, clusters about 70 px across).
export const TUNING = { charge: 2.8, gravity: 1, spoke: 1, intra: 0.6, long: 0.2 };

function forces(model: GraphModel, p: SimParams, nodes: N[]): Simulation<N, L> {
  const vmax = Math.max(1, ...model.nodes.filter((n) => !n.hub).map((n) => n.value));
  const links: L[] = model.links.map((l) => {
    const leaf = model.nodes[l.s].hub ? model.nodes[l.t] : model.nodes[l.s];
    return { source: l.s, target: l.t, kind: l.kind, v: leaf.value };
  });
  return forceSimulation<N, L>(nodes)
    .randomSource(mulberry32(p.seed))
    .velocityDecay(Math.min(0.95, Math.max(0.05, 1 - p.friction)))
    .force('charge', forceManyBody<N>().strength(-p.repulsion * TUNING.charge))
    .force(
      'link',
      forceLink<N, L>(links)
        .id((d) => d.i)
        .distance((l) => (l.kind === 'spoke' ? p.linkMax - (p.linkMax - p.linkMin) * Math.min(1, l.v / vmax) : l.kind === 'intra' ? p.linkMax : p.longLink))
        // springs aren't weakened for busy nodes (d3's default would divide by node degree)
        .strength((l) => (l.kind === 'spoke' ? TUNING.spoke : l.kind === 'intra' ? TUNING.intra : TUNING.long)),
    )
    .force('x', forceX<N>(0).strength(p.gravity * TUNING.gravity))
    .force('y', forceY<N>(0).strength(p.gravity * TUNING.gravity));
}

export interface SimResult {
  /** positions per recorded tick: [x0, y0, x1, y1, …]; frames[0] = start, last = final */
  frames: Float32Array[];
}

/** Nodes start scattered across this area unless the params give another. */
const START_BOX: [number, number] = [1032, 620];

const cache = new Map<string, SimResult>();
export const clearSimCache = () => cache.clear();

export function simulate(model: GraphModel, p: SimParams): SimResult {
  const key = model.key + JSON.stringify(p);
  const hit = cache.get(key);
  if (hit) return hit;
  // Every node starts at a random spot in the chart area (seeded, so the same seed always gives
  // the same layout; d3's default start is a fixed spiral).
  const rand = mulberry32(Math.round(p.seed) * 2654435761);
  const [bw, bh] = p.startBox ?? START_BOX;
  const nodes: N[] = model.nodes.map((_, i) => ({ i, x: (rand() - 0.5) * bw, y: (rand() - 0.5) * bh }));
  const sim = forces(model, p, nodes).stop();
  const ticks = Math.max(1, Math.round(p.ticks));
  sim.alphaDecay(1 - Math.pow(0.001, 1 / ticks));
  const pinned = model.nodes.some((n) => n.pin);
  if (pinned) {
    sim
      .force('px', forceX<N>((d) => model.nodes[d.i].pin?.[0] ?? 0).strength((d) => (model.nodes[d.i].pin ? 0.25 : 0)))
      .force('py', forceY<N>((d) => model.nodes[d.i].pin?.[1] ?? 0).strength((d) => (model.nodes[d.i].pin ? 0.25 : 0)));
  }
  const snap = () => {
    const f = new Float32Array(nodes.length * 2);
    nodes.forEach((n, i) => {
      f[2 * i] = n.x ?? 0;
      f[2 * i + 1] = n.y ?? 0;
    });
    return f;
  };
  const frames = [snap()];
  for (let k = 0; k < ticks; k++) {
    sim.tick();
    frames.push(snap());
  }
  if (pinned) {
    const last = frames[frames.length - 1];
    model.nodes.forEach((n, i) => {
      if (n.pin) {
        last[2 * i] = n.pin[0];
        last[2 * i + 1] = n.pin[1];
      }
    });
  }
  const res = { frames };
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  cache.set(key, res);
  return res;
}

/** Positions at progress f (0..1) through the recorded settling, interpolated between ticks. */
export function positionsAt(res: SimResult, f: number): Float32Array {
  const last = res.frames.length - 1;
  if (f >= 1) return res.frames[last];
  const x = Math.max(0, f) * last;
  const i = Math.floor(x), t = x - i;
  const a = res.frames[i], b = res.frames[Math.min(last, i + 1)];
  if (t === 0) return a;
  const out = new Float32Array(a.length);
  for (let k = 0; k < a.length; k++) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

/** Fit the final layout into a w×h area (only ever shrinks). */
export function fitTransform(final: Float32Array, radii: number[], w: number, h: number, pad: number, auto: boolean): Fit {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < radii.length; i++) {
    const x = final[2 * i], y = final[2 * i + 1], r = radii[i];
    x0 = Math.min(x0, x - r);
    x1 = Math.max(x1, x + r);
    y0 = Math.min(y0, y - r);
    y1 = Math.max(y1, y + r);
  }
  if (!Number.isFinite(x0)) return { scale: 1, ox: w / 2, oy: h / 2 };
  const scale = auto ? Math.min(1, (w - 2 * pad) / Math.max(1, x1 - x0), (h - 2 * pad) / Math.max(1, y1 - y0)) : 1;
  return { scale, ox: w / 2 - ((x0 + x1) / 2) * scale, oy: h / 2 - ((y0 + y1) / 2) * scale };
}

/** A link drawn as a quadratic curve bowed sideways by `curve` × its length (0 = straight). */
export function edgePath(x1: number, y1: number, x2: number, y2: number, curve: number): string {
  const r = (v: number) => Math.round(v * 100) / 100;
  if (!curve) return `M${r(x1)} ${r(y1)}L${r(x2)} ${r(y2)}`;
  const cx = (x1 + x2) / 2 - (y1 - y2) * curve, cy = (y1 + y2) / 2 - (x2 - x1) * curve;
  return `M${r(x1)} ${r(y1)}Q${r(cx)} ${r(cy)} ${r(x2)} ${r(y2)}`;
}

// ── live dragging ───────────────────────────────────────────────────────────

/** A running simulation the drag code steers. Positions are in layout units. */
export interface LiveSim {
  nodes: { x?: number; y?: number }[];
  /** keep node i at (x, y) and the network lively */
  hold(i: number, x: number, y: number): void;
  /** the person let go: settle, then call `done` */
  release(done: () => void): void;
  stop(): void;
}

/** Starts a live simulation from these positions; calls `onTick` after every step. */
export type LiveEngine = (start: Float32Array, onTick: () => void) => LiveSim;

/** Live d3-force physics: the dragged node stays where it's dropped while the rest settles. */
export function d3Engine(model: GraphModel, params: SimParams): LiveEngine {
  return (start, onTick) => {
    const nodes: N[] = model.nodes.map((_, k) => ({ i: k, x: start[2 * k], y: start[2 * k + 1] }));
    const sim = forces(model, params, nodes).alpha(0.3).alphaTarget(0.25).on('tick', onTick);
    return {
      nodes,
      hold(i, x, y) {
        nodes[i].fx = x;
        nodes[i].fy = y;
      },
      release(done) {
        sim.alphaDecay(0.05).alphaTarget(0).on('end', done);
      },
      stop() {
        sim.stop();
      },
    };
  };
}

export interface LiveDragOptions {
  svg: SVGSVGElement;
  model: GraphModel;
  /** the physics to run while dragging (d3Engine) */
  engine: LiveEngine;
  final: Float32Array;
  /** layout → drawing transform currently on screen (read when a drag starts) */
  fit(): Fit;
  radii: number[];
  curve: (l: GLink) => number;
  /** called when the person starts dragging (e.g. finish the entrance animation) */
  onStart(): void;
  /** called once the network has settled after a drag, with every node's position (layout units) */
  onSettled(positions: Float32Array, fit: Fit): void;
}

export interface Fit {
  scale: number;
  ox: number;
  oy: number;
}

/** Drag a node: the rest of the network reacts live ("the galaxy fights back"). */
export function attachLiveDrag(o: LiveDragOptions): () => void {
  const { svg, model } = o;
  const engine = o.engine;
  let pos = Float32Array.from(o.final);
  let fit: Fit = { scale: 1, ox: 0, oy: 0 };
  let sim: LiveSim | null = null;
  let dragging = -1;
  let pointerId = -1;
  const viewport = () => svg.querySelector('[data-cs-viewport]') as SVGGraphicsElement | null;
  const toLayout = (cx: number, cy: number) => {
    const m = viewport()?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return [(p.x - fit.ox) / fit.scale, (p.y - fit.oy) / fit.scale] as const;
  };
  const els = () => ({
    nodes: svg.querySelectorAll<SVGCircleElement>('[data-cs-node]'),
    labels: svg.querySelectorAll<SVGElement>('[data-cs-label]'),
    links: svg.querySelectorAll<SVGPathElement>('[data-cs-link]'),
  });
  const draw = (nodes: LiveSim['nodes']) => {
    const { nodes: ns, labels, links } = els();
    const X = (i: number) => fit.ox + (nodes[i].x ?? 0) * fit.scale, Y = (i: number) => fit.oy + (nodes[i].y ?? 0) * fit.scale;
    ns.forEach((el) => {
      const i = Number(el.getAttribute('data-cs-node'));
      el.setAttribute('cx', String(X(i)));
      el.setAttribute('cy', String(Y(i)));
    });
    labels.forEach((el) => {
      const i = Number(el.getAttribute('data-cs-label'));
      const dx = Number(el.getAttribute('data-cs-dx') ?? 0), dy = Number(el.getAttribute('data-cs-dy') ?? 0);
      const t = el.tagName === 'g' ? el.querySelectorAll('text') : [el];
      t.forEach((tx) => {
        tx.setAttribute('x', String(X(i) + dx));
        tx.setAttribute('y', String(Y(i) + dy));
      });
    });
    links.forEach((el) => {
      const l = model.links[Number(el.getAttribute('data-cs-link'))];
      if (l) el.setAttribute('d', edgePath(X(l.s), Y(l.s), X(l.t), Y(l.t), o.curve(l)));
    });
  };
  const onDown = (e: PointerEvent) => {
    const target = (e.target as Element | null)?.closest?.('[data-cs-node]');
    if (!target || e.button !== 0) return;
    e.preventDefault();
    o.onStart(); // jump to the settled layout first
    fit = o.fit();
    const i = Number(target.getAttribute('data-cs-node'));
    // start from what is on screen (it may have been replayed or re-rendered since the last drag)
    els().nodes.forEach((el) => {
      const k = Number(el.getAttribute('data-cs-node'));
      const cx = Number(el.getAttribute('cx')), cy = Number(el.getAttribute('cy'));
      if (k < model.nodes.length && Number.isFinite(cx) && Number.isFinite(cy)) {
        pos[2 * k] = (cx - fit.ox) / fit.scale;
        pos[2 * k + 1] = (cy - fit.oy) / fit.scale;
      }
    });
    sim?.stop();
    const live = engine(pos, () => draw(live.nodes));
    sim = live;
    dragging = i;
    const p = toLayout(e.clientX, e.clientY);
    if (p) live.hold(i, p[0], p[1]);
    pointerId = e.pointerId;
    svg.setPointerCapture?.(e.pointerId);
    svg.classList.add('cs-dragging');
  };
  const onMove = (e: PointerEvent) => {
    if (dragging < 0 || !sim || e.pointerId !== pointerId) return;
    const p = toLayout(e.clientX, e.clientY);
    if (p) sim.hold(dragging, p[0], p[1]);
  };
  const onUp = (e: PointerEvent) => {
    if (dragging < 0 || e.pointerId !== pointerId || !sim) return;
    svg.classList.remove('cs-dragging');
    const s = sim;
    dragging = -1;
    s.release(() => {
      pos = new Float32Array(s.nodes.length * 2);
      s.nodes.forEach((n, k) => {
        pos[2 * k] = n.x ?? 0;
        pos[2 * k + 1] = n.y ?? 0;
      });
      o.onSettled(pos, fit);
    });
  };
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  return () => {
    sim?.stop();
    svg.removeEventListener('pointerdown', onDown);
    svg.removeEventListener('pointermove', onMove);
    svg.removeEventListener('pointerup', onUp);
    svg.removeEventListener('pointercancel', onUp);
  };
}

// ── saved positions ─────────────────────────────────────────────────────────

/**
 * Every node's position as data, in px from the centre of the chart area, exactly as drawn now.
 * A layout with saved positions is drawn without re-fitting, so nothing moves after a drop.
 */
export function withPositions(data: ChartData, m: GraphModel, pos: Float32Array, fit: Fit, w: number, h: number): ChartData {
  const at = new Map(m.nodes.map((n, i) => [n.id, i]));
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    ...data,
    nodes: (data.nodes ?? []).map((r) => {
      const i = at.get(String(r.id ?? '').trim());
      if (i === undefined) return r;
      return { ...r, x: r1(fit.ox + pos[2 * i] * fit.scale - w / 2), y: r1(fit.oy + pos[2 * i + 1] * fit.scale - h / 2) };
    }),
  };
}

/** The drawing transform written on the viewport: "scale ox oy width height". */
export function readFit(svg: SVGSVGElement): Fit & { w: number; h: number } {
  const v = String(svg.querySelector('[data-cs-viewport]')?.getAttribute('data-cs-fit') ?? '1 0 0 0 0').split(' ').map(Number);
  return { scale: v[0] || 1, ox: v[1] || 0, oy: v[2] || 0, w: v[3] || 0, h: v[4] || 0 };
}

export const hasPositions = (d: ChartData): boolean => (d.nodes ?? []).some((r) => r.x !== null && r.x !== undefined && String(r.x).trim() !== '');
