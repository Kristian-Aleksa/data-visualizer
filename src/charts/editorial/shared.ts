// Helpers shared by the Editorial charts: polar helpers (`pol`, `sect`) and the colour roles the
// Editorial palettes define on top of the theme.

import { alpha } from '../../core/color';
import { pick, type Theme } from '../../core/theme';

export const D2R = Math.PI / 180;

/** A point at `r` from (cx, cy), `deg` degrees clockwise from 3 o'clock (the gallery's `pol`). */
export const pol = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.cos(deg * D2R), cy + r * Math.sin(deg * D2R)];

/** A ring sector from a0 to a1 degrees (the gallery's `sect`). */
export function sect(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const big = a1 - a0 > 180 ? 1 : 0;
  const [xa, ya] = pol(cx, cy, r1, a0), [xb, yb] = pol(cx, cy, r1, a1);
  const [xc, yc] = pol(cx, cy, r0, a1), [xd, yd] = pol(cx, cy, r0, a0);
  return `M${xa} ${ya} A${r1} ${r1} 0 ${big} 1 ${xb} ${yb} L${xc} ${yc} A${r0} ${r0} 0 ${big} 0 ${xd} ${yd} Z`;
}

/** Faint: ink at 40% (Mono uses its literal grey). */
export const lFaint = (T: Theme, mono = '#C6C5BF') => pick(T, mono, alpha(T.text, 0.4));

/** Ring: the pencil-thin outline that gives pale dots a shape. */
export const lRing = (T: Theme) => alpha(T.text, 0.3);
