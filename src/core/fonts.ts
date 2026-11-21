// The fonts a chart can be set in. Names, kinds and weights only: the font files are listed in
// src/export/fonts.ts and the letter widths in src/core/text/.

export type FamilyName =
  | 'Inter'
  | 'Aeonik'
  | 'Roboto'
  | 'Fira Sans'
  | 'Montserrat'
  | 'IBM Plex Serif'
  | 'PT Serif'
  | 'JetBrains Mono'
  | 'Cascadia Mono';

/** The six faces the charts use: weights 400–800 and italic 400. */
export type Face = '400' | '500' | '600' | '700' | '800' | '400i';
export const FACES: Face[] = ['400', '500', '600', '700', '800', '400i'];

export interface FontInfo {
  name: FamilyName;
  generic: 'sans-serif' | 'serif' | 'monospace';
  /** the upright weights the font has, of 400, 500, 600, 700 and 800 */
  weights: number[];
  /** whether Google Fonts serves it (code exports can link to it instead of embedding the files) */
  google: boolean;
}

export const FONTS: FontInfo[] = [
  { name: 'Inter', generic: 'sans-serif', weights: [400, 500, 600, 700, 800], google: true },
  { name: 'Aeonik', generic: 'sans-serif', weights: [400, 500, 700, 800], google: false },
  { name: 'Roboto', generic: 'sans-serif', weights: [400, 500, 600, 700, 800], google: true },
  { name: 'Fira Sans', generic: 'sans-serif', weights: [400, 500, 600, 700, 800], google: true },
  { name: 'Montserrat', generic: 'sans-serif', weights: [400, 500, 600, 700, 800], google: true },
  { name: 'IBM Plex Serif', generic: 'serif', weights: [400, 500, 600, 700], google: true },
  { name: 'PT Serif', generic: 'serif', weights: [400, 700], google: true },
  { name: 'JetBrains Mono', generic: 'monospace', weights: [400, 500, 600, 700, 800], google: true },
  { name: 'Cascadia Mono', generic: 'monospace', weights: [400, 500, 600, 700], google: true },
];

/** Choices for the Font setting. */
export const FONT_CHOICES = FONTS.map((f) => ({ value: f.name, label: f.name }));

/** The font for a Font setting value (Inter when it isn't one of ours). */
export const fontInfo = (name: unknown): FontInfo => FONTS.find((f) => f.name === String(name ?? '')) ?? FONTS[0];

/**
 * The CSS font stack for a Font setting. Every font falls back to Inter for the few symbols it
 * lacks (the text measurer and the outline export do the same).
 */
export function fontStack(name: unknown): string {
  const f = fontInfo(name);
  return f.name === 'Inter' ? 'Inter, sans-serif' : `'${f.name}', Inter, ${f.generic}`;
}

/** The font family a stack written by fontStack() starts with. */
export function familyFromStack(stack: unknown): FamilyName {
  const first = String(stack ?? '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  return fontInfo(first).name;
}

/**
 * The weight a face is drawn in when the font lacks it, picked the way browsers do: a missing
 * 500 uses 400; a missing 600 or 800 uses the next heavier weight, else the next lighter one.
 * (Aeonik's 800 is its Black, listed as 800 here.)
 */
export function weightFor(f: FontInfo, face: Face): number {
  const want = face === '400i' ? 400 : Number(face);
  if (f.weights.includes(want)) return want;
  const lighter = f.weights.filter((w) => w < want).sort((a, b) => b - a);
  const heavier = f.weights.filter((w) => w > want).sort((a, b) => a - b);
  if (want <= 500) return lighter[0] ?? heavier[0] ?? 400;
  return heavier[0] ?? lighter[0] ?? 400;
}
