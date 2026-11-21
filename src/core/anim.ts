// Turns each mark's animation spec into its state at time tau. This is what makes every
// frame a pure function of t: the preview, the SVG export and each MP4 frame all call this.

import type { EaseFn } from './ease';
import { nodeBox, nodeLength } from './geom';
import { walk, type VNode } from './vnode';

export interface Timing {
  /** multiplier on every mark's delay (1 = the chart's own stagger) */
  stagger: number;
  /** replaces every mark's easing when set */
  ease?: EaseFn;
}

export interface AnimState {
  opacity?: number;
  transform?: string;
  dashArray?: string;
  dashOffset?: number;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Natural length of an effects timeline in seconds: the last mark's delay + duration. */
export function naturalLength(root: VNode, stagger: number): number {
  let end = 0;
  walk(root, (n) => {
    if (n.anim) end = Math.max(end, n.anim.delay * stagger + n.anim.dur);
  });
  return end;
}

function progress(n: VNode, tau: number, t: Timing): number {
  const a = n.anim!;
  if (tau === Infinity) return 1;
  const p = (tau - a.delay * t.stagger) / a.dur;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return (t.ease ?? a.ease)(p);
}

/** State of an animated node at natural time tau (seconds). null = its final, unanimated look. */
export function evalAnim(n: VNode, tau: number, t: Timing): AnimState | null {
  const a = n.anim;
  if (!a) return null;
  const rawP = tau === Infinity ? 1 : (tau - a.delay * t.stagger) / a.dur;
  if (rawP >= 1) return null;
  const e = progress(n, tau, t);
  switch (a.fx) {
    case 'fade': {
      const base = n.attrs.opacity === undefined ? 1 : Number(n.attrs.opacity);
      return { opacity: r3(base * e) };
    }
    case 'pop': {
      const b = nodeBox(n);
      if (!b) return { opacity: e > 0 ? undefined : 0 };
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      const s = Math.max(0, e);
      return { transform: `translate(${r3(cx)} ${r3(cy)}) scale(${r3(s)}) translate(${r3(-cx)} ${r3(-cy)})` };
    }
    case 'draw': {
      const len = nodeLength(n);
      if (len <= 0) return null;
      if (e <= 0) return { opacity: 0 };
      const own = n.attrs['stroke-dasharray'];
      const shown = len * Math.min(1, e);
      if (own !== undefined && own !== 'none' && String(own).trim() !== '') {
        // Reveal a dashed line progressively while keeping its dash pattern.
        const pat = String(own).split(/[\s,]+/).map(Number).filter((x) => x >= 0);
        const period = pat.reduce((s, x) => s + x, 0);
        if (!pat.length || period <= 0) return { dashArray: `${r3(shown)} ${r3(len)}`, dashOffset: 0 };
        const seq: number[] = [];
        let acc = 0;
        for (let i = 0; acc < shown && i < 4000; i++) {
          const seg = pat[i % pat.length];
          const take = Math.min(seg, shown - acc);
          seq.push(take);
          acc += take;
        }
        if (seq.length % 2 === 0) seq.push(0);
        seq.push(len + period);
        return { dashArray: seq.map(r3).join(' '), dashOffset: 0 };
      }
      return { dashArray: `${r3(len)} ${r3(len)}`, dashOffset: r3(len * (1 - e)) };
    }
  }
  return null;
}
