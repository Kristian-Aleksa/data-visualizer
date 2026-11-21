// Helpers shared by the Basics charts: the small caption under each chart, category and axis
// labels, dates for time axes, and number formatting.

import type { DrawContext } from '../../core/chart';
import { formatNumber } from '../../core/format';
import { byPreset, pick, type Theme } from '../../core/theme';
import type { Cell } from '../../core/types';
import { txt, type VNode } from '../../core/vnode';

/** 1234.5 → "1,234.5" with no prefix or suffix (for captions and units). */
export const plain = (v: number) => formatNumber(v, { prefix: '', suffix: '', decimals: -1, thousands: true, compact: false, percent: false });

/** Round to 2 decimals (generated demo data is stored this way). */
export const r2 = (v: number) => Math.round(v * 100) / 100;
/** Round to 3 decimals, for demo data drawn on a steep scale. */
export const r3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * A data label: "Automatic" decimals round to whole numbers. Any other
 * Decimals setting, and the prefix/suffix settings, apply as usual.
 */
export function label(ctx: DrawContext, v: number): string {
  return ctx.fmt(String(ctx.s.numDecimals ?? 'auto') === 'auto' ? Math.round(v) : v);
}

/** The tiny caption line under a Basics chart (7 px, 600 weight, .12em tracking). */
export function captionLine(ctx: DrawContext, auto: string, y: number, delay: number, opts: { x?: number; fill?: string } = {}): void {
  if (ctx.s.showCaption === false) return;
  const T = ctx.theme;
  txt(ctx.root, {
    x: opts.x ?? 200, y, 'font-size': ctx.fs(7), 'font-weight': 600, fill: opts.fill ?? pick(T, '#B0AFA9', T.faint), 'text-anchor': 'middle',
    'letter-spacing': '.12em', class: 'fade', style: `animation-delay:${delay}s`,
  }, ctx.str('caption').trim() || auto);
}

/** A category label under a column (7.5 px, 700 weight, .08em tracking, muted). */
export function categoryLabel(ctx: DrawContext, parent: VNode, x: number, y: number, text: string, delay: number, tracking = '.08em'): void {
  if (!ctx.bool('categoryLabels')) return;
  txt(parent, {
    x, y, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: ctx.theme.muted, 'text-anchor': 'middle',
    'letter-spacing': tracking, class: 'fade', style: `animation-delay:${delay}s`,
  }, text);
}

// ── dates ──────────────────────────────────────────────────────────────────

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2026-06-01" for year, month (1–12) and day; days past the month's end roll over. */
export function isoDay(y: number, m: number, d: number): string {
  const t = new Date(Date.UTC(y, m - 1, d));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/**
 * A calendar date from "2026-06-01", "2026/6/1" or "6/1/2026" (US order). Anything else is
 * treated as a plain label, so charts never guess at ambiguous dates.
 */
export function parseDate(v: Cell | undefined): Date | null {
  const s = String(v ?? '').trim();
  let y: number, m: number, d: number;
  let r = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) [y, m, d] = [+r[3], +r[1], +r[2]];
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCMonth() === m - 1 ? t : null;
}

export const monthName = (d: Date) => MONTHS[d.getUTCMonth()];
/** "JUN 15" */
export const dayName = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
export const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/** Indices of the first, middle and last item, for three-label time axes. */
export function threeTicks(n: number): number[] {
  if (n <= 0) return [];
  return [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
}

/** Indices of the n largest values that are at least `gap` apart (the peak rule). */
export function peaks(values: number[], n: number, gap: number): number[] {
  const out: number[] = [];
  if (n <= 0) return out;
  for (const d of [...values.keys()].sort((a, b) => values[b] - values[a])) {
    if (out.every((t) => Math.abs(t - d) >= gap)) out.push(d);
    if (out.length === n) break;
  }
  return out;
}

/**
 * The "ink" of the four charts added later to the Basics gallery (rung histogram, tick box,
 * stream ribbon, candlestick). Each preset sets it: Porcelain uses its text
 * navy, Palm and Wire their data colour.
 */
export const laterInk = (T: Theme) => byPreset(T, { mono: '#1C1C1A', porcelain: T.text, palm: T.data, wire: T.data }, T.data);

/** The later charts' 4-step shade list, darkest first (B15 box plot, G17 violin). */
export const laterShades4 = (T: Theme): string[] =>
  byPreset(T, {
    mono: ['#1C1C1A', '#4A4944', '#8F8E88', '#B0AFA9'],
    porcelain: T.cat4,
    palm: [T.ramp6[0], T.ramp6[2], T.ramp6[3], T.ramp6[4]],
    wire: [T.data, '#6E6D66', T.data2, T.faintData],
  }, [T.data, T.ramp6[2], T.ramp6[3], T.ramp6[4]]);

/** The later charts' 5-step shade list, darkest (or Wire's accent) first (G18 matrix heat, G19 rank strip). */
export const laterShades5 = (T: Theme): string[] =>
  byPreset(T, {
    mono: ['#1C1C1A', '#4A4944', '#8F8E88', '#B0AFA9', '#D8D7D1'],
    porcelain: [T.text, T.data, T.data2, T.faintData, '#D0E3FF'],
    palm: [T.data, T.ramp6[2], T.ramp6[3], T.ramp6[4], T.ramp6[5]],
    wire: [T.hero, '#6E6D66', T.data2, T.faintData, '#DBDAD3'],
  }, [T.data, T.ramp6[1], T.ramp6[2], T.ramp6[3], T.ramp6[4]]);

const WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'];
/** 2 → "TWO" (whole numbers up to twelve), otherwise digits. */
export const numberWord = (n: number) => (Number.isInteger(n) && n >= 0 && n <= 12 ? WORDS[n] : plain(n));

/** rank[i] = 0 for the largest value. */
export function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map((d) => d[1]);
  return values.map((_, i) => order.indexOf(i));
}
