// A tiny virtual SVG tree. Charts build it with el()/txt()/tip(). The tree is then either
// mounted into a live <svg> (preview, embed, standalone HTML) or serialized (SVG/MP4 export).
//
// Marks animate with CSS-style classes ('fade' | 'pop' | 'draw') plus an inline
// `animation-delay`/`animation-duration`. el() reads those and stores them as an Anim spec,
// so every frame can be computed from time instead of left to the browser.

import { CSS_EASE, cubicBezier, NAMED_EASE, type EaseFn } from './ease';

export type AttrValue = string | number;
export type AttrInput = Record<string, AttrValue | undefined | null | false>;

export type Effect = 'fade' | 'pop' | 'draw';

export interface Anim {
  fx: Effect;
  /** seconds */
  delay: number;
  /** seconds */
  dur: number;
  ease: EaseFn;
}

/** A text halo (a `paint-order:stroke` paper outline behind labels). */
export interface Halo {
  color: string;
  width: number;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface VNode {
  tag: string;
  attrs: Record<string, AttrValue>;
  children: VNode[];
  text?: string;
  anim?: Anim;
  /** Tooltip text (shown as the element's <title>). */
  tip?: string;
  /** Hover-highlight group: marks sharing a key light up together. */
  key?: string;
  halo?: Halo;
  /** Cached geometry, filled lazily by the animation code. */
  _len?: number;
  _box?: Box | null;
}

const DEFAULT_DUR: Record<Effect, number> = { fade: 0.9, pop: 0.5, draw: 1 };

function seconds(v: string): number {
  const s = v.trim();
  if (s.endsWith('ms')) return parseFloat(s) / 1000;
  return parseFloat(s);
}

/** `cubic-bezier(a,b,c,d)` or an easing name such as `quarticOut` (see ease.ts). */
function timingFunction(v: string): EaseFn | undefined {
  const m = /^cubic-bezier\(([^)]*)\)$/.exec(v.trim());
  if (m) {
    const [a, b, c, d] = m[1].split(',').map(Number);
    return [a, b, c, d].every(Number.isFinite) ? cubicBezier(a, b, c, d) : undefined;
  }
  return NAMED_EASE[v.trim()];
}

export function vnode(tag: string, attrs: AttrInput = {}): VNode {
  const node: VNode = { tag, attrs: {}, children: [] };
  setAttrs(node, attrs);
  return node;
}

/** Apply attributes, interpreting class/style. */
export function setAttrs(node: VNode, attrs: AttrInput): void {
  let fx: Effect | undefined;
  let delay = node.anim?.delay ?? 0;
  let dur: number | undefined;
  let ease: EaseFn | undefined;
  let paintOrderStroke = false;
  let haloColor: string | undefined;
  let haloWidth: number | undefined;
  const keptStyle: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') {
      const keep: string[] = [];
      for (const tok of String(v).split(/\s+/)) {
        if (tok === 'fade' || tok === 'pop' || tok === 'draw') fx = tok;
        else if (tok) keep.push(tok);
      }
      if (keep.length) node.attrs.class = keep.join(' ');
      continue;
    }
    if (k === 'style') {
      for (const decl of String(v).split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const prop = decl.slice(0, i).trim();
        const val = decl.slice(i + 1).trim();
        if (prop === 'animation-delay') delay = seconds(val);
        else if (prop === 'animation-duration') dur = seconds(val);
        else if (prop === 'animation-timing-function') ease = timingFunction(val);
        else if (prop === 'paint-order') paintOrderStroke = val.startsWith('stroke');
        else if (prop === 'stroke') haloColor = val;
        else if (prop === 'stroke-width') haloWidth = parseFloat(val);
        else if (prop) keptStyle.push(`${prop}:${val}`);
      }
      continue;
    }
    node.attrs[k] = v;
  }
  if (paintOrderStroke && haloColor) {
    node.halo = { color: haloColor, width: haloWidth ?? 1 };
  } else {
    // stroke declared in style without paint-order is an ordinary stroke
    if (haloColor) keptStyle.push(`stroke:${haloColor}`);
    if (haloWidth !== undefined) keptStyle.push(`stroke-width:${haloWidth}px`);
  }
  if (keptStyle.length) node.attrs.style = keptStyle.join(';');
  // letter-spacing in em → px (design tools don't all read em units)
  const ls = node.attrs['letter-spacing'];
  const fsz = node.attrs['font-size'];
  if (typeof ls === 'string' && ls.trim().endsWith('em') && typeof fsz === 'number') {
    node.attrs['letter-spacing'] = Math.round(parseFloat(ls) * fsz * 1000) / 1000;
  }
  if (fx) node.anim = { fx, delay, dur: dur ?? DEFAULT_DUR[fx], ease: ease ?? CSS_EASE[fx] };
  else if (node.anim) {
    node.anim.delay = delay;
    if (dur !== undefined) node.anim.dur = dur;
    if (ease) node.anim.ease = ease;
  }
}

/** Append a child element: el(parent, 'line', {...}). */
export function el(parent: VNode, tag: string, attrs: AttrInput = {}): VNode {
  const n = vnode(tag, attrs);
  parent.children.push(n);
  return n;
}

/** Append a <text>: txt(parent, {...}, 'label'). */
export function txt(parent: VNode, attrs: AttrInput, text: string | number): VNode {
  const n = el(parent, 'text', attrs);
  n.text = String(text);
  return n;
}

/** Attach a tooltip: tip(node, 'text'). */
export function tip(node: VNode, text: string): void {
  node.tip = text;
}

/**
 * An invisible hover target. Only exists in interactive views (preview, embed, HTML export);
 * SVG and video exports leave it out.
 */
export function hit(parent: VNode, x: number, y: number, width: number, height: number): VNode {
  return el(parent, 'rect', { x, y, width, height, fill: 'transparent', 'data-cs-hit': 1 });
}

/** Mark nodes as one hover-highlight group. */
export function keyed<T extends VNode>(node: T, key: string): T {
  node.key = key;
  return node;
}

/** Visit every node depth-first. */
export function walk(node: VNode, fn: (n: VNode, parent: VNode | null) => void, parent: VNode | null = null): void {
  fn(node, parent);
  for (const c of node.children) walk(c, fn, node);
}
