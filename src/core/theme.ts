// Colour systems. Mono comes from the source's mono-tokens.js and the literal greys used in the
// galleries; Porcelain, Palm and Wire are copied from color-presets.js. Custom palettes derive
// the same full set of roles from a handful of user colours, the way the presets derive their
// muted/faint tones from the text colour.

import { alpha, isChromatic, isLight, mix } from './color';
import type { PresetId } from './types';

export interface DarkRoles {
  cardBg: string;
  text: string;
  muted: string;
  faint: string;
  /** 8-step ramp, bright (core) → dim, for the dense dark graphs */
  dk8: string[];
  hl: string;
  label: string;
  sub: string;
  srcRow: string;
  rule: string;
  linkSame: string;
  linkCross: string;
  linkHeavy: string;
  linkFaint: string;
}

export interface Theme {
  id: string;
  name: string;
  kind: 'mono' | 'preset' | 'custom';
  bg: string;
  text: string;
  muted: string;
  label: string;
  faint: string;
  floor: string;
  quiet: string;
  track: string;
  grid: string;
  data: string;
  data2: string;
  hero: string;
  heroDark: string;
  faintData: string;
  bead: string;
  halo: string;
  /** greys / tints from darkest to lightest */
  ladder: string[];
  cat3: string[];
  cat3l: string[];
  cat4: string[];
  heat: string[];
  ser: string[];
  /** ordinal ramp, light → heavy (5 steps) */
  ramp: string[];
  /** ordinal ramp, dark → light (6 steps) */
  ramp6: string[];
  dramp4: string[];
  rampDark: string[];
  dark: DarkRoles;
  /** Colour presets thicken hairlines and raise faint opacities so thin lines stay visible. */
  inkBoost: { strokeScale: number; opacityFloor: number } | null;
  /** Wire: one element per chart is drawn in the highlight colour. */
  heroMode: boolean;
}

export const INK_BOOST = { strokeScale: 1.8, opacityFloor: 0.85 };

const MONO_DARK: DarkRoles = {
  cardBg: '#1C1C1A',
  text: '#F0EFEB',
  muted: '#8F8E88',
  faint: '#55554F',
  dk8: ['#F0EFEB', '#DCDAD2', '#C9C7BD', '#B3B0A4', '#9C9A91', '#8F8E88', '#7C7A72', '#6A6963'],
  hl: '#F0EFEB',
  label: '#B3B0A4',
  sub: '#8F8E88',
  srcRow: '#55554F',
  rule: '#2E2D29',
  linkSame: '#55534B',
  linkCross: '#3A3934',
  linkHeavy: '#55534B',
  linkFaint: '#2E2D29',
};

export const MONO: Theme = {
  id: 'mono',
  name: 'Mono',
  kind: 'mono',
  bg: '#F0EFEB',
  text: '#1C1C1A',
  muted: '#8F8E88',
  label: '#6A6963',
  faint: '#C6C5BF',
  floor: '#CFCEC7',
  quiet: '#D8D6CE',
  track: '#E3E2DB',
  grid: '#DEDDD6',
  data: '#1C1C1A',
  data2: '#8F8E88',
  hero: '#1C1C1A',
  heroDark: '#F0EFEB',
  faintData: '#B0AFA9',
  bead: '#8F8E88',
  halo: '#F0EFEB',
  ladder: ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF', '#D8D7D1'],
  cat3: ['#1C1C1A', '#8F8E88', '#C0BFB8'],
  cat3l: ['#1C1C1A', '#6A6963', '#B0AFA9'],
  cat4: ['#1C1C1A', '#55554F', '#8F8E88', '#B0AFA9'],
  heat: ['#1C1C1A', '#8F8E88', '#C6C5BF'],
  ser: ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'],
  ramp: ['#C6C5BF', '#B0AFA9', '#A8A7A0', '#8F8E88', '#1C1C1A'],
  ramp6: ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'],
  dramp4: ['#F0EFEB', '#B0AFA9', '#8F8E88', '#55554F'],
  rampDark: ['#4A4944', '#6A6963', '#8F8E88', '#B3B0A4', '#F0EFEB'],
  dark: MONO_DARK,
  inkBoost: null,
  heroMode: false,
};

export const PORCELAIN: Theme = {
  id: 'porcelain',
  name: 'Porcelain',
  kind: 'preset',
  bg: '#F7F2EB',
  text: '#081F5C',
  muted: 'rgba(8,31,92,.60)',
  label: 'rgba(8,31,92,.72)',
  faint: 'rgba(8,31,92,.32)',
  floor: 'rgba(8,31,92,.24)',
  quiet: 'rgba(8,31,92,.15)',
  track: 'rgba(8,31,92,.12)',
  grid: 'rgba(8,31,92,.16)',
  data: '#334EAC',
  data2: '#7096D1',
  hero: '#081F5C',
  heroDark: '#7096D1',
  faintData: '#BAD6EB',
  bead: '#7096D1',
  halo: 'rgba(247,242,235,.92)',
  ladder: ['#081F5C', '#334EAC', '#7096D1', '#BAD6EB', '#D0E3FF', 'rgba(8,31,92,.15)', 'rgba(8,31,92,.08)'],
  cat3: ['#334EAC', '#7096D1', '#BAD6EB'],
  cat3l: ['#334EAC', '#7096D1', 'rgba(8,31,92,.6)'],
  cat4: ['#081F5C', '#334EAC', '#7096D1', '#BAD6EB'],
  heat: ['#334EAC', '#7096D1', '#BAD6EB'],
  ser: ['#334EAC', '#081F5C', '#7096D1', '#BAD6EB', '#D0E3FF', 'rgba(51,78,172,.4)'],
  ramp: ['#D0E3FF', '#BAD6EB', '#7096D1', '#334EAC', '#081F5C'],
  ramp6: ['#081F5C', '#334EAC', '#7096D1', '#9DBFE2', '#BAD6EB', '#D0E3FF'],
  dramp4: ['#D0E3FF', '#BAD6EB', '#7096D1', 'rgba(247,242,235,.26)'],
  rampDark: ['rgba(247,242,235,.26)', 'rgba(247,242,235,.42)', 'rgba(247,242,235,.60)', 'rgba(247,242,235,.84)', '#7096D1'],
  dark: {
    cardBg: '#081F5C',
    text: '#F7F2EB',
    muted: '#809EC6',
    faint: '#3E5A8F',
    dk8: ['#EDEFF1', '#D5DBE2', '#BCC7D7', '#9EB3CD', '#809EC6', '#6C93C7', '#4D82C6', '#3472C2'],
    hl: '#EDEFF1',
    label: '#9EB3CD',
    sub: '#809EC6',
    srcRow: '#3E5A8F',
    rule: '#1B3159',
    linkSame: '#32517B',
    linkCross: '#263E5E',
    linkHeavy: '#3B6091',
    linkFaint: '#213650',
  },
  inkBoost: INK_BOOST,
  heroMode: false,
};

export const PALM: Theme = {
  id: 'palm',
  name: 'Palm',
  kind: 'preset',
  bg: '#F0EFEB',
  text: '#58402E',
  muted: 'rgba(88,64,46,.60)',
  label: 'rgba(88,64,46,.72)',
  faint: 'rgba(88,64,46,.32)',
  floor: 'rgba(88,64,46,.24)',
  quiet: 'rgba(88,64,46,.15)',
  track: 'rgba(88,64,46,.12)',
  grid: 'rgba(88,64,46,.16)',
  data: '#43593B',
  data2: '#58402E',
  hero: '#D4A017',
  heroDark: '#F2D17E',
  faintData: '#ACAD79',
  bead: '#77835A',
  halo: 'rgba(240,239,235,.92)',
  ladder: ['#43593B', '#5A7049', '#77835A', '#929960', '#ACAD79', '#F2D17E', 'rgba(88,64,46,.15)'],
  cat3: ['#43593B', '#929960', '#F2D17E'],
  cat3l: ['#43593B', '#77835A', '#ACAD79'],
  cat4: ['#43593B', '#77835A', '#ACAD79', '#F2D17E'],
  heat: ['#43593B', '#929960', '#F2D17E'],
  ser: ['#43593B', '#D4A017', '#77835A', '#F2D17E', '#ACAD79', '#58402E'],
  ramp: ['#F2D17E', '#ACAD79', '#929960', '#77835A', '#43593B'],
  ramp6: ['#43593B', '#5A7049', '#77835A', '#929960', '#ACAD79', '#F2D17E'],
  dramp4: ['#F2D17E', '#ACAD79', 'rgba(240,239,235,.55)', 'rgba(240,239,235,.26)'],
  rampDark: ['rgba(240,239,235,.26)', 'rgba(240,239,235,.42)', 'rgba(240,239,235,.60)', 'rgba(240,239,235,.84)', '#F2D17E'],
  dark: {
    cardBg: '#28311F',
    text: '#F0EFEB',
    muted: '#92A763',
    faint: '#5A6B47',
    dk8: ['#F0EFE9', '#DDDBC9', '#C8CAA8', '#AFB885', '#92A763', '#7EA056', '#658D49', '#4F7D3E'],
    hl: '#F2D17E',
    label: '#ACAD79',
    sub: '#92A763',
    srcRow: '#5A6B47',
    rule: '#38452C',
    linkSame: '#405333',
    linkCross: '#334329',
    linkHeavy: '#4C6340',
    linkFaint: '#2C3823',
  },
  inkBoost: INK_BOOST,
  heroMode: false,
};

export const WIRE: Theme = {
  id: 'wire',
  name: 'Wire',
  kind: 'preset',
  bg: '#F0F0EE',
  text: '#1F1E1C',
  muted: 'rgba(31,30,28,.60)',
  label: 'rgba(31,30,28,.72)',
  faint: 'rgba(31,30,28,.32)',
  floor: 'rgba(31,30,28,.24)',
  quiet: 'rgba(31,30,28,.15)',
  track: 'rgba(31,30,28,.12)',
  grid: 'rgba(31,30,28,.16)',
  data: '#22211F',
  data2: '#8F8E86',
  hero: '#F5572F',
  heroDark: '#F5572F',
  faintData: '#C0BFB7',
  bead: '#8F8E86',
  halo: 'rgba(255,255,255,.92)',
  ladder: ['#22211F', '#4A4944', '#6E6D66', '#8F8E86', '#C0BFB7', '#DBDAD3', 'rgba(31,30,28,.15)'],
  cat3: ['#F5572F', '#22211F', '#8F8E86'],
  cat3l: ['#F5572F', '#22211F', '#6E6D66'],
  cat4: ['#F5572F', '#22211F', '#8F8E86', '#C0BFB7'],
  heat: ['#F5572F', '#6E6D66', '#C0BFB7'],
  ser: ['#22211F', '#8F8E86', '#C0BFB7', 'rgba(34,33,31,.52)', '#DBDAD3', 'rgba(34,33,31,.3)'],
  ramp: ['#DBDAD3', '#C0BFB7', '#8F8E86', '#22211F', '#F5572F'],
  ramp6: ['#22211F', '#4A4944', '#6E6D66', '#8F8E86', '#C0BFB7', '#DBDAD3'],
  dramp4: ['#F5572F', '#C0BFB7', '#8F8E86', 'rgba(240,240,238,.26)'],
  rampDark: ['rgba(240,240,238,.26)', 'rgba(240,240,238,.42)', 'rgba(240,240,238,.60)', 'rgba(240,240,238,.84)', '#F5572F'],
  // The source has no Wire versions of the dark graphs ("they'd duplicate Mono"), so the dark
  // roles reuse Mono's greys with Wire's own dark card.
  dark: { ...MONO_DARK, cardBg: '#1F1E1C', text: '#F0F0EE', muted: 'rgba(240,240,238,.62)', faint: 'rgba(240,240,238,.24)', hl: '#F5572F' },
  inkBoost: INK_BOOST,
  heroMode: true,
};

export const PRESETS: Record<PresetId, Theme> = { mono: MONO, porcelain: PORCELAIN, palm: PALM, wire: WIRE };
export const PRESET_ORDER: PresetId[] = ['mono', 'porcelain', 'palm', 'wire'];

// ── custom palettes ─────────────────────────────────────────────────────────

export interface CustomPalette {
  id: string;
  name: string;
  bg: string;
  ink: string;
  /** '' = derived from ink */
  grid: string;
  series: string[];
  highlight: string;
  /** Background for dark cards; '' = derived */
  darkBg: string;
  inkBoost: boolean;
  heroMode: boolean;
}

/** A starting point for the custom palette editor, taken from any theme. */
export function paletteFromTheme(t: Theme, id = 'draft', name = `${t.name} copy`): CustomPalette {
  return {
    id,
    name,
    bg: t.bg,
    ink: t.text,
    grid: '',
    series: [...t.cat4],
    highlight: t.hero,
    darkBg: t.dark.cardBg,
    inkBoost: t.inkBoost !== null || t.cat4.some(isChromatic),
    heroMode: t.heroMode,
  };
}

function pad(list: string[], n: number, fill: (i: number) => string): string[] {
  const out = list.filter(Boolean).slice(0, n);
  while (out.length < n) out.push(fill(out.length));
  return out;
}

export function themeFromPalette(p: CustomPalette): Theme {
  const bg = p.bg || '#FFFFFF';
  const ink = p.ink || '#111111';
  const series = p.series.filter(Boolean);
  const data = series[0] ?? ink;
  const hero = p.highlight || data;
  const darkBg = p.darkBg || (isLight(ink) ? mix(bg, '#000000', 0.85) : ink);
  const dText = isLight(darkBg) ? ink : bg;
  const ladder = [0, 0.18, 0.33, 0.48, 0.6, 0.7, 0.8].map((t) => mix(ink, bg, t));
  const tint = (t: number) => mix(data, bg, t);
  return {
    id: `custom:${p.id}`,
    name: p.name || 'Custom',
    kind: 'custom',
    bg,
    text: ink,
    muted: alpha(ink, 0.6),
    label: alpha(ink, 0.72),
    faint: alpha(ink, 0.32),
    floor: alpha(ink, 0.24),
    quiet: alpha(ink, 0.15),
    track: alpha(ink, 0.12),
    grid: p.grid || alpha(ink, 0.16),
    data,
    data2: series[1] ?? tint(0.45),
    hero,
    heroDark: p.highlight || mix(data, bg, 0.5),
    faintData: series[3] ?? tint(0.6),
    bead: series[1] ?? tint(0.4),
    halo: alpha(bg, 0.92),
    ladder,
    cat3: pad(series, 3, (i) => ladder[i * 2 + 1]),
    cat3l: pad(series, 3, (i) => ladder[i * 2 + 1]),
    cat4: pad(series, 4, (i) => ladder[i + 2]),
    heat: [data, tint(0.45), tint(0.75)],
    ser: pad(series, 6, (i) => ladder[Math.min(6, i + 1)]),
    ramp: [tint(0.8), tint(0.6), tint(0.4), data, p.heroMode ? hero : mix(data, ink, 0.55)],
    ramp6: [data, tint(0.15), tint(0.3), tint(0.45), tint(0.6), tint(0.75)],
    dramp4: [p.heroMode ? hero : mix(dText, darkBg, 0.1), mix(dText, darkBg, 0.35), mix(dText, darkBg, 0.55), alpha(dText, 0.26)],
    rampDark: [alpha(dText, 0.26), alpha(dText, 0.42), alpha(dText, 0.6), alpha(dText, 0.84), p.heroMode ? hero : dText],
    dark: {
      cardBg: darkBg,
      text: dText,
      muted: alpha(dText, 0.62),
      faint: alpha(dText, 0.24),
      dk8: [0, 0.12, 0.22, 0.32, 0.42, 0.5, 0.58, 0.66].map((t) => mix(dText, darkBg, t)),
      hl: p.highlight || dText,
      label: alpha(dText, 0.7),
      sub: alpha(dText, 0.55),
      srcRow: alpha(dText, 0.3),
      rule: mix(darkBg, dText, 0.12),
      linkSame: mix(darkBg, dText, 0.3),
      linkCross: mix(darkBg, dText, 0.2),
      linkHeavy: mix(darkBg, dText, 0.35),
      linkFaint: mix(darkBg, dText, 0.14),
    },
    inkBoost: p.inkBoost ? INK_BOOST : null,
    heroMode: p.heroMode,
  };
}

export function resolveTheme(id: string, palettes: CustomPalette[]): Theme {
  if (id in PRESETS) return PRESETS[id as PresetId];
  if (id.startsWith('custom:')) {
    const p = palettes.find((x) => `custom:${x.id}` === id);
    if (p) return themeFromPalette(p);
  }
  return MONO;
}

/** Mono uses a few exact greys of its own; presets use a role. Charts call pick() for those. */
export function pick<V>(t: Theme, monoValue: V, other: V): V {
  return t.kind === 'mono' ? monoValue : other;
}

/**
 * Line widths, dot sizes and opacities: Mono's value, or the thicker value the colour presets use
 * (their "ink boost" rule, so thin lines stay visible in colour). Custom palettes follow their
 * own ink-boost switch.
 */
export function boost<V>(t: Theme, monoValue: V, boosted: V): V {
  return t.inkBoost ? boosted : monoValue;
}

/** A value that differs per preset (where no shared role fits); custom palettes get `fallback`. */
export function byPreset<V>(t: Theme, values: Record<PresetId, V>, fallback: V): V {
  return Object.prototype.hasOwnProperty.call(values, t.id) ? values[t.id as PresetId] : fallback;
}
