// VNode tree → SVG markup. Used for SVG export, MP4 frames and thumbnails. Produces only the
// SVG subset that Figma and Illustrator import cleanly: literal colours, no CSS variables, no
// <foreignObject>, prefixed ids, and text halos written as a separate stroke copy instead of
// `paint-order` (which Illustrator ignores), and `dominant-baseline` turned into a plain offset
// (Illustrator ignores that too). Interactive-only helpers are left out.

import { evalAnim, type AnimState, type Timing } from './anim';
import { ASC, DESC, X_HEIGHT } from './text/metrics';
import type { AttrValue, VNode } from './vnode';

export interface SerializeOptions {
  /** natural time; Infinity (default) = final frame */
  tau?: number;
  timing?: Timing;
  /** prefix for every id (and url(#id) reference) so pasted charts can't clash */
  idPrefix?: string;
  /** keep interaction attributes and interactive-only elements (for live HTML) */
  interactive?: boolean;
  /** extra markup inserted right after the opening <svg> tag (e.g. embedded @font-face) */
  head?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function round(v: number): string {
  const r = Math.round(v * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r);
}
const LONG = /-?\d+\.\d{3,}(?:e[-+]?\d+)?/g;
const ROUNDED_ATTRS = new Set(['d', 'points', 'transform', 'stroke-dasharray']);

/** Elements that only exist in live, interactive views (hover targets, hover labels). */
export function isUiOnly(n: VNode): boolean {
  return n.attrs['data-cs-ui'] !== undefined || n.attrs['data-cs-hit'] !== undefined;
}

function fmtAttr(name: string, v: AttrValue): string {
  if (typeof v === 'number') return Number.isFinite(v) ? round(v) : '0';
  if (ROUNDED_ATTRS.has(name)) return v.replace(LONG, (m) => round(parseFloat(m)));
  return v;
}

/** Final attribute set of a node at a given animation state (shared with the DOM mounter). */
export function frameAttrs(n: VNode, st: AnimState | null): Record<string, AttrValue> {
  if (!st) return n.attrs;
  const a: Record<string, AttrValue> = { ...n.attrs };
  if (st.opacity !== undefined) a.opacity = st.opacity;
  if (st.transform !== undefined) a.transform = st.transform;
  if (st.dashArray !== undefined) {
    a['stroke-dasharray'] = st.dashArray;
    a['stroke-dashoffset'] = st.dashOffset ?? 0;
  }
  return a;
}

function prefixIds(name: string, v: string, prefix: string): string {
  if (!prefix) return v;
  if (name === 'id') return prefix + v;
  if ((name === 'href' || name === 'xlink:href') && v.startsWith('#')) return '#' + prefix + v.slice(1);
  return v.replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`);
}

/**
 * Static files (SVG, video frames) leave out what only the live runtime reads: data-cs-*
 * attributes, cs-* classes and --cs-* style properties.
 */
function staticValue(k: string, v: AttrValue): AttrValue {
  if (k === 'class') return String(v).split(/\s+/).filter((c) => c && !c.startsWith('cs-')).join(' ');
  if (k === 'style') return String(v).split(';').filter((d) => d.trim() && !d.trim().startsWith('--cs-')).join(';');
  return v;
}

function attrsToString(a: Record<string, AttrValue>, prefix: string, interactive: boolean): string {
  let out = '';
  for (const [key, val] of Object.entries(a)) {
    if (!interactive && key.startsWith('data-cs-')) continue;
    const v = interactive ? val : staticValue(key, val);
    if (v === '' && key !== 'fill') continue;
    out += ` ${key}="${esc(prefixIds(key, fmtAttr(key, v), prefix))}"`;
  }
  return out;
}

type Opts = Required<Pick<SerializeOptions, 'tau' | 'idPrefix' | 'interactive'>> & { timing: Timing };

function dataAttrs(n: VNode, o: Opts): string {
  if (!o.interactive) return '';
  return (n.tip ? ` data-tip="${esc(n.tip)}"` : '') + (n.key ? ` data-key="${esc(n.key)}"` : '');
}

/**
 * Text centred with `dominant-baseline` moved by the same amount Chrome moves it (Inter metrics:
 * "middle" = half the x-height, "central" = half of ascent minus descent, in whole pixels).
 * The offset applies before the text's own transform, so rotated labels move along their axis.
 */
export function portableBaseline(a: Record<string, AttrValue>): Record<string, AttrValue> {
  const db = a['dominant-baseline'];
  if (db !== 'middle' && db !== 'central') return a;
  const fs = Number(a['font-size']), y = Number(a.y ?? 0);
  if (!Number.isFinite(fs) || !Number.isFinite(y)) return a;
  const { ['dominant-baseline']: _drop, ...rest } = a;
  const shift = db === 'middle' ? (X_HEIGHT / 2) * fs : (Math.round(ASC * fs) - Math.round(DESC * fs)) / 2;
  return { ...rest, y: y + shift };
}

function nodeToString(n: VNode, o: Opts): string {
  if (isUiOnly(n) && !o.interactive) return '';
  const st = evalAnim(n, o.tau, o.timing);
  const a = n.tag === 'text' ? portableBaseline(frameAttrs(n, st)) : frameAttrs(n, st);
  const data = dataAttrs(n, o);
  if (n.tag === 'text') {
    const body = escText(n.text ?? '');
    if (n.halo) {
      // Halo as a stroke-only copy underneath (identical to paint-order:stroke, but portable).
      const { opacity, transform, ...rest } = a;
      const group: Record<string, AttrValue> = {};
      if (opacity !== undefined) group.opacity = opacity;
      if (transform !== undefined) group.transform = transform;
      const halo = { ...rest, fill: 'none', stroke: n.halo.color, 'stroke-width': n.halo.width };
      return `<g${attrsToString(group, o.idPrefix, o.interactive)}${data}><text${attrsToString(halo, o.idPrefix, o.interactive)}>${body}</text><text${attrsToString(rest, o.idPrefix, o.interactive)}>${body}</text></g>`;
    }
    return `<text${attrsToString(a, o.idPrefix, o.interactive)}${data}>${body}</text>`;
  }
  const kids = n.children.map((c) => nodeToString(c, o)).join('');
  const attrs = attrsToString(a, o.idPrefix, o.interactive);
  if (!kids && n.tag !== 'g' && n.tag !== 'svg') return `<${n.tag}${attrs}${data}/>`;
  if (!kids && n.tag === 'g' && !attrs && !data) return '';
  return `<${n.tag}${attrs}${data}>${kids}</${n.tag}>`;
}

export function serialize(root: VNode, opts: SerializeOptions = {}): string {
  const o: Opts = {
    tau: opts.tau ?? Infinity,
    timing: opts.timing ?? { stagger: 1 },
    idPrefix: opts.idPrefix ?? '',
    interactive: opts.interactive ?? false,
  };
  const inner = root.children.map((c) => nodeToString(c, o)).join('');
  return `<svg${attrsToString(root.attrs, o.idPrefix, o.interactive)}>${opts.head ?? ''}${inner}</svg>`;
}
