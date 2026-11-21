// Easing functions: CSS cubic-bezier (for the charts' CSS-style animations) and the named
// curves the charts and the "Easing" setting use.

export type EaseFn = (p: number) => number;

/** CSS cubic-bezier(x1, y1, x2, y2), solved the way browsers do (Newton, then bisection). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EaseFn {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solveX = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-7) return t;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-7) return t;
      if (x > v) lo = t; else hi = t;
      t = (hi - lo) / 2 + lo;
      if (hi - lo < 1e-9) break;
    }
    return t;
  };
  return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : sy(solveX(p)));
}

export const linear: EaseFn = (p) => p;

// Named easing curves (progress 0..1 in, eased progress out).
const out = (power: number): EaseFn => (k) => 1 - Math.pow(1 - k, power);
export const quadraticOut: EaseFn = out(2);
export const cubicOut: EaseFn = out(3);
export const quarticOut: EaseFn = out(4);
export const quinticOut: EaseFn = out(5);
export const cubicInOut: EaseFn = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(2 - 2 * k, 3) / 2);
/** Runs about 10% past the end, then settles back. */
export const backOut: EaseFn = (k) => {
  const over = 1.70158, u = k - 1;
  return 1 + u * u * ((over + 1) * u + over);
};
/** Springs past the end and wobbles to rest (period 0.4). */
export const elasticOut: EaseFn = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1);
/** Drops and bounces three times, each bounce lower. */
export const bounceOut: EaseFn = (k) => {
  const g = 7.5625, d = 2.75;
  if (k < 1 / d) return g * k * k;
  if (k < 2 / d) return g * (k - 1.5 / d) ** 2 + 0.75;
  if (k < 2.5 / d) return g * (k - 2.25 / d) ** 2 + 0.9375;
  return g * (k - 2.625 / d) ** 2 + 0.984375;
};

/** The three timing functions the CSS-style animations use. */
export const CSS_EASE = {
  fade: cubicBezier(0.25, 0.1, 0.25, 1), // `ease`
  pop: cubicBezier(0.2, 0.7, 0.3, 1.3), // slight overshoot
  draw: cubicBezier(0.4, 0, 0.2, 1),
} as const;

export const NAMED_EASE: Record<string, EaseFn> = {
  linear,
  quadraticOut,
  cubicOut,
  cubicInOut,
  quarticOut,
  quinticOut,
  backOut,
  elasticOut,
  bounceOut,
};

/** Choices offered by the "Easing" control. 'original' keeps each mark's own easing (shown as Default). */
export const EASING_CHOICES: { value: string; label: string }[] = [
  { value: 'original', label: 'Default' },
  { value: 'linear', label: 'Linear' },
  { value: 'cubicOut', label: 'Ease out' },
  { value: 'cubicInOut', label: 'Ease in-out' },
  { value: 'quarticOut', label: 'Quick ease out' },
  { value: 'backOut', label: 'Overshoot' },
  { value: 'elasticOut', label: 'Elastic' },
  { value: 'bounceOut', label: 'Bounce' },
];

export function easeByName(name: string | undefined): EaseFn | undefined {
  if (!name || name === 'original') return undefined;
  return NAMED_EASE[name];
}
