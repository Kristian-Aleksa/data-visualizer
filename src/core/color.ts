// Colour utilities: parsing, mixing, transparency and WCAG contrast.

export type RGBA = [number, number, number, number];

export function parseColor(c: string): RGBA | null {
  const s = c.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((ch) => ch + ch).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const v = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [v(0), v(2), v(4), h.length === 8 ? v(6) / 255 : 1];
  }
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map((x) => parseFloat(x));
    if (p.length < 3 || p.slice(0, 3).some((x) => !Number.isFinite(x))) return null;
    return [p[0], p[1], p[2], p.length > 3 && Number.isFinite(p[3]) ? p[3] : 1];
  }
  return null;
}

export function isColor(c: string): boolean {
  return parseColor(c) !== null;
}

const hex2 = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');

export function toHex([r, g, b]: RGBA): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();
}

/** Composite a (possibly transparent) colour over an opaque background. */
export function flatten(c: string, over: string): RGBA {
  const fg = parseColor(c) ?? [0, 0, 0, 1];
  const bg = parseColor(over) ?? [255, 255, 255, 1];
  const a = fg[3];
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
}

/** a → b by t (0..1). Works on opaque colours; transparent inputs are flattened over white. */
export function mix(a: string, b: string, t: number): string {
  const ca = flatten(a, '#ffffff'), cb = flatten(b, '#ffffff');
  return toHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t, 1]);
}

export function alpha(c: string, a: number): string {
  const p = parseColor(c);
  if (!p) return c;
  return `rgba(${Math.round(p[0])},${Math.round(p[1])},${Math.round(p[2])},${+(a * p[3]).toFixed(3)})`;
}

function luminance([r, g, b]: RGBA): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio of a foreground colour on a background (both may be transparent). */
export function contrast(fg: string, bg: string): number {
  const b = flatten(bg, '#ffffff');
  const f = flatten(fg, toHex(b));
  const l1 = luminance(f), l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Is this colour light (needs dark text on it)? */
export function isLight(c: string): boolean {
  return luminance(flatten(c, '#ffffff')) > 0.4;
}

/** Saturation-ish test: does a colour carry hue (vs. a grey)? */
export function isChromatic(c: string): boolean {
  const p = parseColor(c);
  if (!p) return false;
  return Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) > 24;
}
