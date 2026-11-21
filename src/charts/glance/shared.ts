// Helpers shared by the Glance charts.

import { alpha, mix } from '../../core/color';
import { pick, type Theme } from '../../core/theme';

/** Rank → colour on a 5-step ramp, as the Glance palettes do: the top item gets the
 *  heaviest step (Wire's orange), the rest spread over the lighter four. */
export function rampAt(t: Theme, rank: number, n: number): string {
  const R = t.ramp;
  if (rank === 0) return R[4];
  return R[Math.max(0, Math.min(3, 3 - Math.round(((rank - 1) / Math.max(1, n - 2)) * 3)))];
}

/** rank[i] = 0 for the largest value */
export function ranksOf(values: number[]): number[] {
  const order = values.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map((d) => d[1]);
  return values.map((_, i) => order.indexOf(i));
}

/** The Glance palettes use a slightly stronger faint tone (.40) for the source line. */
export function glanceFrame(t: Theme) {
  return t.kind === 'mono' ? {} : { src: alpha(t.text, 0.4) };
}

/** A round axis maximum for a 0-based scale, with about one tick per 12.6 px of plot height (at most 11). */
export function niceAxisMax(max: number, plotHeight: number): number {
  if (max <= 0) return 1;
  const maxTicks = Math.min(11, Math.max(2, Math.ceil(plotHeight / (10.5 * 1.2))));
  const raw = max / (maxTicks - 1);
  const exp = Math.floor(Math.log10(raw));
  const f = raw / Math.pow(10, exp);
  const nice = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * Math.pow(10, exp);
  return Math.ceil(max / nice - 1e-9) * nice;
}

/** The Glance palettes' faint tone is a little stronger (.40) than the other families'. */
export const gFaint = (t: Theme) => pick(t, '#C6C5BF', alpha(t.text, 0.4));

/** Wire's "one highlight" rule: the lead item takes the highlight colour. */
export const hi = (t: Theme, c: string) => (t.heroMode ? t.hero : c);

/**
 * Glance's dark cards use the palette's ink as the card colour (the big network views use a
 * separate dark set). Lines on them are mixes of the card colour toward paper.
 */
export function glanceDark(t: Theme) {
  const bg = pick(t, '#1C1C1A', t.text);
  return {
    bg,
    text: t.bg,
    sub: pick(t, '#8F8E88', alpha(t.bg, 0.62)),
    src: pick(t, '#55554F', alpha(t.bg, 0.24)),
    /** light ink on the dark card (DMID) */
    mid: alpha(t.bg, 0.62),
    /** quiet ink on the dark card (DQ) */
    quiet: alpha(t.bg, 0.24),
    line: mix(bg, t.bg, 0.2),
    line2: mix(bg, t.bg, 0.13),
  };
}

/** Frame colours for a Glance dark card. */
export const glanceDarkFrame = (t: Theme) => {
  const d = glanceDark(t);
  return { bg: d.bg, title: d.text, sub: d.sub, src: d.src };
};
