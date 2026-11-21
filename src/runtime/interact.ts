// Interactions shared by the preview, the embed page and exported code: tooltips, hover
// highlight (with "related" groups for networks), zoom/pan and click-to-replay. Works by event
// delegation on the <svg>, so it keeps working when frames are re-rendered.
//
// Markup conventions (set by charts, only present in live views):
//  data-tip="…"            tooltip text
//  data-key="k"            hoverable item key
//  data-cs-rel="k1 k2 …"   light up when any of these keys is hovered (default: own key)
//  class cs-node / cs-link / cs-hover-label   network styling while focused
//  class cs-glow + style "--cs-glow:#hex;--cs-glow-o:.8;--cs-glow-w:1.6"   a hot link takes this colour (and width)
//  style "--cs-dim:.05"    how faint the mark goes while something else is highlighted
//  style "--cs-hot-fill:#hex"   the fill a mark takes while highlighted (maps lighten a region)
//  class cs-hide-hot       hidden while highlighted (a label that a highlight label replaces)
//  data-cs-raise           brought to the front of its group when highlighted (map outlines)
//  svg class cs-pinned     set while a click has pinned the highlight (clickPin)
//  data-cs-viewport        the group that zoom/pan transforms
//  data-cs-drag            draggable marks (pointer events go to the chart's drag code)

import type { Theme } from '../core/theme';

export interface InteractOptions {
  tooltip: boolean;
  hover: boolean;
  zoom: boolean;
  clickReplay: boolean;
  /** Clicking a mark keeps its highlight until empty space is clicked ("Click to pin"). */
  clickPin?: boolean;
  theme: Theme;
  dark?: boolean;
  onReplay?: () => void;
}

export interface Interactions {
  detach(): void;
  /** Re-apply view state (zoom) after the chart re-rendered. */
  afterRender(): void;
}

const STYLE_ID = 'cs-runtime-style';
export const INTERACTION_CSS = `
svg.cs-focus [data-key]:not(.cs-hot),svg.cs-focus [data-cs-rel]:not(.cs-hot){opacity:var(--cs-dim,.16)}
svg.cs-focus .cs-node:not(.cs-hot){opacity:.1}
svg.cs-focus .cs-link:not(.cs-hot){opacity:.03}
svg.cs-focus .cs-link.cs-hot{opacity:1;stroke:var(--cs-hl);stroke-opacity:.9;stroke-width:1.4px}
svg.cs-focus .cs-glow.cs-hot{opacity:1;stroke:var(--cs-glow);stroke-opacity:var(--cs-glow-o,.85)}
svg.cs-focus .cs-glow.cs-hot[style*="--cs-glow-w"]{stroke-width:var(--cs-glow-w)}
svg .cs-hover-label{opacity:0;pointer-events:none}
svg.cs-focus .cs-hover-label:not(.cs-hot){opacity:0}
svg.cs-focus .cs-hot[style*="--cs-hot-fill"]{fill:var(--cs-hot-fill)}
svg.cs-focus .cs-hide-hot.cs-hot{opacity:0}
svg.cs-focus .cs-hover-label.cs-hot{opacity:1}
svg [data-key],svg [data-cs-rel]{transition:opacity .15s ease}
svg.cs-zoomable{touch-action:none}
svg.cs-zoomable [data-cs-viewport]{cursor:grab}
svg.cs-panning [data-cs-viewport]{cursor:grabbing}
svg [data-cs-drag]{cursor:pointer}
`;

/** Add the interaction styles once to the document, or to the shadow root the chart lives in. */
function ensureStyle(svg: SVGSVGElement) {
  if (typeof document === 'undefined') return;
  const root = svg.getRootNode();
  if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
    if (root.querySelector('style[data-cs-runtime]')) return;
    const s = document.createElement('style');
    s.setAttribute('data-cs-runtime', '');
    s.textContent = INTERACTION_CSS;
    root.appendChild(s);
    return;
  }
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = INTERACTION_CSS;
  document.head.appendChild(s);
}

/** Tooltip box. Fully inline-styled so a host website's CSS can't change it. */
function makeTip(bg: string, fg: string): HTMLDivElement {
  const tip = document.createElement('div');
  tip.setAttribute('role', 'tooltip');
  const st = tip.style;
  st.setProperty('all', 'initial');
  Object.assign(st, {
    position: 'fixed', zIndex: '2147483000', pointerEvents: 'none', maxWidth: '280px', padding: '9px 13px', borderRadius: '10px',
    font: '500 12px/1.4 Inter, system-ui, sans-serif', whiteSpace: 'pre-line', boxShadow: '0 6px 24px rgba(0,0,0,.18)',
    opacity: '0', transform: 'translateY(4px)', transition: 'opacity .12s ease, transform .12s ease', textAlign: 'left',
    letterSpacing: '0', background: bg, color: fg, display: 'block', boxSizing: 'border-box', left: '0', top: '0',
  });
  return tip;
}
const showTip = (tip: HTMLDivElement, on: boolean) => {
  tip.style.opacity = on ? '1' : '0';
  tip.style.transform = on ? 'none' : 'translateY(4px)';
};

export function attachInteractions(svg: SVGSVGElement, opts: InteractOptions): Interactions {
  ensureStyle(svg);
  const t = opts.theme;
  svg.style.setProperty('--cs-hl', opts.dark ? t.dark.hl : t.hero);
  // House style: ink box with paper text on light cards, the reverse on dark cards.
  const tip = makeTip(opts.dark ? t.dark.text : t.text, opts.dark ? t.dark.cardBg : t.bg);
  document.body.appendChild(tip);

  // ── hover highlight ──
  let hotKey: string | null = null;
  const setFocus = (key: string | null) => {
    if (key === hotKey) return;
    hotKey = key;
    svg.classList.toggle('cs-focus', key !== null);
    for (const el of svg.querySelectorAll('[data-key],[data-cs-rel]')) {
      const rel = el.getAttribute('data-cs-rel');
      const hot = key !== null && (rel ? rel.split(' ').includes(key) : el.getAttribute('data-key') === key);
      el.classList.toggle('cs-hot', hot);
    }
    // outlines that should show whole while highlighted go to the front of their group
    if (key !== null) for (const el of svg.querySelectorAll('.cs-hot[data-cs-raise]')) el.parentNode?.appendChild(el);
  };

  // ── zoom / pan ──
  let view = { k: 1, x: 0, y: 0 };
  let active = false; // wheel zooms only after the person has clicked into the chart
  const viewport = () => svg.querySelector('[data-cs-viewport]') as SVGGElement | null;
  if (opts.zoom && viewport()) svg.classList.add('cs-zoomable');
  const applyView = () => {
    const g = viewport();
    if (!g) return;
    if (view.k === 1 && view.x === 0 && view.y === 0) g.removeAttribute('transform');
    else g.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
  };
  const local = (clientX: number, clientY: number) => {
    const g = viewport();
    const parent = g?.parentNode as SVGGraphicsElement | null;
    const m = parent?.getScreenCTM?.();
    if (!m) return { x: clientX, y: clientY };
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  let down: { x: number; y: number; cx: number; cy: number; view: typeof view; pan: boolean; moved: boolean; onMark: boolean } | null = null;

  const onMove = (e: PointerEvent) => {
    if (down) {
      const dx = e.clientX - down.cx, dy = e.clientY - down.cy;
      if (!down.moved && Math.hypot(dx, dy) > 4) down.moved = true;
      if (down.pan && down.moved) {
        const p = local(e.clientX, e.clientY);
        view = { ...down.view, x: down.view.x + (p.x - down.x), y: down.view.y + (p.y - down.y) };
        applyView();
        svg.classList.add('cs-panning');
      }
    }
    const target = e.target as Element | null;
    if (opts.tooltip) {
      const tipEl = target?.closest?.('[data-tip]');
      const text = tipEl?.getAttribute('data-tip');
      if (text && !(down && down.moved)) {
        tip.textContent = text;
        showTip(tip, true);
        const pad = 14;
        const w = tip.offsetWidth, h = tip.offsetHeight;
        let x = e.clientX + pad, y = e.clientY + pad;
        if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
        if (y + h > window.innerHeight - 8) y = e.clientY - h - pad;
        tip.style.left = `${Math.max(8, x)}px`;
        tip.style.top = `${Math.max(8, y)}px`;
      } else showTip(tip, false);
    }
    if (opts.hover && !pinned && !(down && down.moved)) {
      const keyEl = target?.closest?.('[data-key]');
      setFocus(keyEl ? keyEl.getAttribute('data-key') : null);
    }
  };
  const onLeave = () => {
    showTip(tip, false);
    if (!down && !pinned) setFocus(null);
  };
  // ── click to pin ──
  let pinned = false;
  const pin = (key: string | null) => {
    pinned = key !== null;
    svg.classList.toggle('cs-pinned', pinned);
    hotKey = '\u0000'; // force a refresh, even when clearing
    setFocus(key);
  };
  const onDown = (e: PointerEvent) => {
    active = true;
    const onMark = !!(e.target as Element | null)?.closest?.('[data-cs-drag]');
    const p = local(e.clientX, e.clientY);
    down = { x: p.x, y: p.y, cx: e.clientX, cy: e.clientY, view: { ...view }, pan: opts.zoom && !onMark && !!viewport(), moved: false, onMark };
    if (down.pan) svg.setPointerCapture?.(e.pointerId);
  };
  const onUp = (e: PointerEvent) => {
    const d = down;
    down = null;
    svg.classList.remove('cs-panning');
    if (svg.hasPointerCapture?.(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    if (!d || d.moved || d.onMark || e.button !== 0) return;
    if (opts.clickPin && opts.hover) {
      // a mark pins its highlight; empty space lets go (and replays only when nothing was pinned)
      const keyEl = (e.target as Element | null)?.closest?.('[data-key]');
      if (keyEl) return pin(keyEl.getAttribute('data-key'));
      if (pinned) return pin(null);
    }
    if (opts.clickReplay) opts.onReplay?.();
  };
  const onWheel = (e: WheelEvent) => {
    if (!opts.zoom || !viewport()) return;
    if (!active && !e.ctrlKey && !e.metaKey) return; // let the page scroll
    e.preventDefault();
    const p = local(e.clientX, e.clientY);
    const k = Math.min(8, Math.max(0.4, view.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))));
    view = { k, x: p.x - ((p.x - view.x) * k) / view.k, y: p.y - ((p.y - view.y) * k) / view.k };
    applyView();
  };
  const onDbl = (e: MouseEvent) => {
    if (!opts.zoom || (e.target as Element | null)?.closest?.('[data-cs-drag]')) return;
    view = { k: 1, x: 0, y: 0 };
    applyView();
  };
  const onDocDown = (e: PointerEvent) => {
    if (!svg.contains(e.target as Node)) active = false;
  };

  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerleave', onLeave);
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('dblclick', onDbl);
  document.addEventListener('pointerdown', onDocDown, true);

  return {
    afterRender() {
      applyView();
      if (hotKey !== null) {
        const k = hotKey;
        hotKey = null;
        setFocus(k);
      }
    },
    detach() {
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerleave', onLeave);
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onUp);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('dblclick', onDbl);
      document.removeEventListener('pointerdown', onDocDown, true);
      pinned = false;
      svg.classList.remove('cs-pinned');
      setFocus(null);
      svg.classList.remove('cs-zoomable', 'cs-panning');
      view = { k: 1, x: 0, y: 0 };
      applyView();
      tip.remove();
    },
  };
}
