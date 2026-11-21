// Deterministic text measurement from the fonts' real advance widths (see scripts/gen-metrics.mjs).
// Used for wrapping titles, anchoring labels and animation bounding boxes, so charts never
// need to measure text in the DOM and stay pure functions. Vertical metrics are Inter's for
// every font, so baselines sit in the same place whichever font is chosen.
//
// Inter's widths are built in. Other fonts' widths are added with registerTextFont(): the app
// adds them all (src/core/text/all-metrics.ts); a code export carries only the one it uses.

import INTER from './inter-metrics.json';

type WeightKey = '400' | '500' | '600' | '700' | '800' | '400i';

/** A font's letter widths as scripts/gen-metrics.mjs writes them (characters in Inter's order). */
export interface FontMetrics {
  unitsPerEm: number;
  /** one advance for every character (monospaced fonts) */
  mono?: number;
  /** advances per weight; -1 = the font lacks it; a weight name = drawn with that weight's file */
  widths?: Partial<Record<WeightKey, number[] | string>>;
}

interface Table {
  upm: number;
  mono?: number;
  widths?: Record<WeightKey, number[]>;
}

/** Each character's position in the width tables. */
const index = new Map<string, number>();
[...INTER.chars].forEach((c, i) => index.set(c, i));

function table(m: FontMetrics): Table {
  if (m.mono) return { upm: m.unitsPerEm, mono: m.mono };
  const raw = m.widths ?? {};
  const pick = (k: WeightKey): number[] => {
    const v = raw[k];
    return Array.isArray(v) ? v : typeof v === 'string' && Array.isArray(raw[v as WeightKey]) ? (raw[v as WeightKey] as number[]) : [];
  };
  const keys: WeightKey[] = ['400', '500', '600', '700', '800', '400i'];
  return { upm: m.unitsPerEm, widths: Object.fromEntries(keys.map((k) => [k, pick(k)])) as Record<WeightKey, number[]> };
}

const INTER_T = table(INTER as FontMetrics);
const fonts = new Map<string, Table>([['Inter', INTER_T]]);
/** Widths in use while a chart is drawn. */
let active: Table = INTER_T;

/** Make a font's widths available for measuring. */
export function registerTextFont(family: string, metrics: FontMetrics): void {
  if (family && metrics?.unitsPerEm > 0) fonts.set(family, table(metrics));
}

/**
 * Measure with this font's widths until the returned function is called (charts are drawn
 * synchronously, so the scene builder switches around one draw). A font whose widths
 * haven't been registered is measured as Inter.
 */
export function selectTextFont(family: unknown): () => void {
  const prev = active;
  active = fonts.get(String(family ?? '')) ?? INTER_T;
  return () => {
    active = prev;
  };
}

const M = INTER;
const UPM = M.unitsPerEm;

/** Inter vertical metrics as fractions of the font size. */
export const ASC = M.ascender / UPM; // 0.96875
export const DESC = -M.descender / UPM; // 0.2412
export const X_HEIGHT = M.xHeight / UPM;
export const CAP_HEIGHT = M.capHeight / UPM;

function weightKey(weight: number | string | undefined, italic: boolean): WeightKey {
  if (italic) return '400i';
  const w = typeof weight === 'string' ? parseInt(weight, 10) || 400 : weight ?? 400;
  if (w >= 750) return '800';
  if (w >= 650) return '700';
  if (w >= 550) return '600';
  if (w >= 450) return '500';
  return '400';
}

export interface MeasureOptions {
  italic?: boolean;
  /** Extra space after every character, in px (CSS/SVG letter-spacing). */
  letterSpacing?: number;
}

/** Width in px of `text` set in the current font at `size` px. */
export function measure(text: string, size: number, weight?: number | string, opts: MeasureOptions = {}): number {
  const key = weightKey(weight, !!opts.italic);
  const T = active;
  let em = 0;
  let n = 0;
  for (const ch of text) {
    const i = index.get(ch);
    const w = i === undefined ? -1 : T.mono ?? T.widths?.[key][i] ?? -1;
    if (w > 0) em += w / T.upm;
    else {
      // a character the font lacks is drawn in Inter (or, failing that, is a typical wide one)
      const iw = i === undefined ? -1 : INTER_T.widths![key][i];
      em += (iw > 0 ? iw : 1200) / INTER_T.upm;
    }
    n++;
  }
  return em * size + n * (opts.letterSpacing ?? 0);
}

/**
 * CSS `line-height: normal` for Inter as Chrome lays it out: the ascent and descent are each
 * rounded to whole pixels, so titles sit where an HTML card would put them.
 */
export function lineBox(size: number): { ascent: number; height: number } {
  const ascent = Math.round(ASC * size);
  const descent = Math.round(DESC * size);
  return { ascent, height: ascent + descent };
}

/** Greedy word wrap. Long single words are kept whole rather than split. */
export function wrap(text: string, maxWidth: number, size: number, weight?: number | string, opts: MeasureOptions = {}): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push('');
      continue;
    }
    let line = words[0];
    for (const w of words.slice(1)) {
      const next = line + ' ' + w;
      if (measure(next, size, weight, opts) <= maxWidth) line = next;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}
