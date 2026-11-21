// VNode tree → live DOM inside an <svg>. Rendering patches the existing elements in place
// (fast enough to redraw hundreds of marks every animation frame), then per-frame updates of
// the animated marks are applied. Text gets its font properties as inline styles so a host
// website's CSS (e.g. `svg text { font-size: 20px }`) can't restyle an embedded chart.

import { evalAnim, type Timing } from './anim';
import { frameAttrs, isUiOnly } from './serialize';
import type { AttrValue, VNode } from './vnode';

const NS = 'http://www.w3.org/2000/svg';
const ANIMATED_ATTRS = ['opacity', 'transform', 'stroke-dasharray', 'stroke-dashoffset'] as const;
/** Attributes the live runtime manages itself; patching leaves them alone. */
const RUNTIME_OWNED = new Set(['class', 'style', 'data-cs-cls']);

interface Entry {
  node: VNode;
  el: Element;
  /** halo texts animate as a group: only opacity/transform apply */
  group: boolean;
}

export interface Mounted {
  svg: SVGSVGElement;
  animated: Entry[];
}

interface Ctx {
  entries: Entry[];
  interactive: boolean;
  family: string;
}

function desired(n: VNode, ctx: Ctx, base: Record<string, AttrValue>): Record<string, AttrValue> {
  const a: Record<string, AttrValue> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v === '' && k !== 'fill') continue;
    if (!ctx.interactive && k.startsWith('data-cs-')) continue;
    a[k] = v;
  }
  if (ctx.interactive) {
    if (n.tip) a['data-tip'] = n.tip;
    if (n.key) a['data-key'] = n.key;
  }
  return a;
}

function syncAttrs(el: Element, want: Record<string, AttrValue>) {
  for (const attr of Array.from(el.attributes)) {
    if (!(attr.name in want) && !RUNTIME_OWNED.has(attr.name)) el.removeAttribute(attr.name);
  }
  for (const [k, v] of Object.entries(want)) {
    if (k === 'class') continue;
    const s = String(v);
    if (k === 'style') {
      el.setAttribute('style', s);
      continue;
    }
    if (el.getAttribute(k) !== s) el.setAttribute(k, s);
  }
  if (!('style' in want) && el.tagName !== 'text') el.removeAttribute('style');
  // Chart classes are tracked so stale ones can be removed while runtime classes
  // (cs-hot for hover, …) survive re-renders.
  const prev = (el.getAttribute('data-cs-cls') ?? '').split(' ').filter(Boolean);
  const next = String(want.class ?? '').split(/\s+/).filter(Boolean);
  for (const c of prev) if (!next.includes(c)) el.classList.remove(c);
  for (const c of next) el.classList.add(c);
  if (next.length) el.setAttribute('data-cs-cls', next.join(' '));
  else el.removeAttribute('data-cs-cls');
  if (el.getAttribute('class') === '') el.removeAttribute('class');
}

function hardenText(el: Element, a: Record<string, AttrValue>, family: string) {
  const st = (el as SVGElement).style;
  if (!st) return;
  st.fontFamily = family;
  if (a['font-size'] !== undefined) st.fontSize = `${a['font-size']}px`;
  if (a['font-weight'] !== undefined) st.fontWeight = String(a['font-weight']);
  st.fontStyle = String(a['font-style'] ?? 'normal');
  st.letterSpacing = a['letter-spacing'] !== undefined ? `${a['letter-spacing']}px` : 'normal';
}

function sameShape(el: Element, n: VNode): boolean {
  if (n.tag === 'text' && n.halo) return el.tagName === 'g' && el.getAttribute('data-cs-halo') === '1';
  return el.tagName === n.tag && el.getAttribute('data-cs-halo') !== '1';
}

function createEl(n: VNode, ctx: Ctx): Element {
  if (n.tag === 'text' && n.halo) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('data-cs-halo', '1');
    g.append(document.createElementNS(NS, 'text'), document.createElementNS(NS, 'text'));
    updateEl(g, n, ctx);
    return g;
  }
  const el = document.createElementNS(NS, n.tag);
  updateEl(el, n, ctx);
  return el;
}

function updateEl(el: Element, n: VNode, ctx: Ctx) {
  if (n.tag === 'text' && n.halo) {
    const { opacity, transform, ...rest } = n.attrs;
    const groupBase: Record<string, AttrValue> = { 'data-cs-halo': '1' };
    if (opacity !== undefined) groupBase.opacity = opacity;
    if (transform !== undefined) groupBase.transform = transform;
    const want = desired(n, ctx, groupBase);
    want['data-cs-halo'] = '1';
    syncAttrs(el, want);
    const [halo, fill] = [el.children[0], el.children[1]];
    const haloAttrs = { ...rest, fill: 'none', stroke: n.halo.color, 'stroke-width': n.halo.width };
    syncAttrs(halo, desired({ ...n, tip: undefined, key: undefined }, { ...ctx, interactive: false }, haloAttrs));
    syncAttrs(fill, desired({ ...n, tip: undefined, key: undefined }, { ...ctx, interactive: false }, rest));
    for (const t of [halo, fill]) {
      if (t.textContent !== (n.text ?? '')) t.textContent = n.text ?? '';
      hardenText(t, rest, ctx.family);
    }
    if (n.anim) ctx.entries.push({ node: n, el, group: true });
    return;
  }
  syncAttrs(el, desired(n, ctx, n.attrs));
  if (n.tag === 'text') {
    if (el.textContent !== (n.text ?? '')) el.textContent = n.text ?? '';
    hardenText(el, n.attrs, ctx.family);
  } else {
    patchChildren(el, n.children, ctx);
  }
  if (n.anim) ctx.entries.push({ node: n, el, group: false });
}

function patchChildren(parent: Element, kids: VNode[], ctx: Ctx) {
  const wanted = ctx.interactive ? kids : kids.filter((k) => !isUiOnly(k));
  const existing = Array.from(parent.children);
  wanted.forEach((n, i) => {
    const el = existing[i];
    if (el && sameShape(el, n)) updateEl(el, n, ctx);
    else {
      const fresh = createEl(n, ctx);
      if (el) parent.replaceChild(fresh, el);
      else parent.appendChild(fresh);
    }
  });
  for (let i = wanted.length; i < existing.length; i++) existing[i].remove();
}

/** Render the tree into `svg`, reusing existing elements where the structure matches. */
export function mount(svg: SVGSVGElement, root: VNode, opts: { interactive?: boolean } = {}): Mounted {
  for (const [k, v] of Object.entries(root.attrs)) {
    if (k === 'xmlns') continue;
    if (svg.getAttribute(k) !== String(v)) svg.setAttribute(k, String(v));
  }
  const ctx: Ctx = { entries: [], interactive: !!opts.interactive, family: String(root.attrs['font-family'] ?? 'Inter, sans-serif') };
  patchChildren(svg, root.children, ctx);
  return { svg, animated: ctx.entries };
}

/** Update every animated mark to its state at natural time tau. */
export function applyFrame(m: Mounted, tau: number, timing: Timing): void {
  for (const e of m.animated) {
    const st = evalAnim(e.node, tau, timing);
    const a = frameAttrs(e.node, st);
    for (const name of ANIMATED_ATTRS) {
      if (e.group && name.startsWith('stroke')) continue;
      const v = a[name];
      if (v === undefined) e.el.removeAttribute(name);
      else if (e.el.getAttribute(name) !== String(v)) e.el.setAttribute(name, String(v));
    }
  }
}
