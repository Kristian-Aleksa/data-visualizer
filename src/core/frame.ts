// The artboard "card": background, title, subtitle, chart area and source line (28px padding,
// 16.5/11.5/9.5px type, line boxes rounded the way Chrome rounds them). At the "Default card"
// size everything is at 1×; at other sizes everything scales by k = sqrt(area / default area).

import type { ChartDef, FrameColors } from './chart';
import { ARTBOARD_PRESETS, fontStack } from './settings';
import { lineBox, wrap } from './text/metrics';
import type { Theme } from './theme';
import type { Settings } from './types';
import { el, txt, type VNode } from './vnode';

export interface TextBlock {
  /** left edge */
  x: number;
  lines: string[];
  size: number;
  weight: number;
  letterSpacing: number;
  /** y of the first line's top */
  top: number;
  ascent: number;
  lineHeight: number;
  height: number;
}

export interface FrameLayout {
  width: number;
  height: number;
  k: number;
  pad: { top: number; side: number; bottom: number };
  title: TextBlock;
  sub: TextBlock;
  src: TextBlock;
  /** the side column's note paragraph and legend (cards with `side`) */
  note?: TextBlock;
  legend?: TextBlock;
  region: { x: number; y: number; w: number; h: number };
  body: { x: number; y: number; scale: number; w: number; h: number };
}

/**
 * A wrapped block of text. `lineHeight` is CSS line-height in px (default: "normal"); the glyphs
 * sit in the middle of each line box, as in CSS. Explicit line breaks ("\n") are kept.
 */
function block(text: string, size: number, weight: number, lsEm: number, maxW: number, top: number, x = 0, lineHeight?: number): TextBlock {
  const lb = lineBox(size);
  const letterSpacing = lsEm * size;
  const lh = lineHeight ?? lb.height;
  const ascent = lb.ascent + (lh - lb.height) / 2;
  const lines = text.trim() ? text.trim().split('\n').flatMap((para) => (para.trim() ? wrap(para.trim(), maxW, size, weight, { letterSpacing }) : [''])) : [];
  return { x, lines, size, weight, letterSpacing, top, ascent, lineHeight: lh, height: lines.length * lh };
}

/** Type and spacing of the two card styles (compact gallery cards and large views). */
const CARD_STYLES = {
  gallery: { bottomRatio: 20 / 28, title: 16.5, titleGap: 3, sub: 11.5, subGap: 14, srcGap: 10, src: 9.5 },
  large: { bottomRatio: 24 / 34, title: 19, titleGap: 4, sub: 12, subGap: 10, srcGap: 12, src: 9.5 },
};

/** Where the chart drawing sits inside its region. */
function bodyIn(def: ChartDef, region: FrameLayout['region'], k: number): FrameLayout['body'] {
  if (def.size.responsive) return { x: region.x, y: region.y, scale: k, w: region.w / k, h: region.h / k };
  const sc = Math.min(region.w / def.size.w, region.h / def.size.h);
  return { x: region.x + (region.w - def.size.w * sc) / 2, y: region.y + (region.h - def.size.h * sc) / 2, scale: sc, w: def.size.w, h: def.size.h };
}

/**
 * The gallery's "split" card (L03): a text column (title, subtitle, note, legend) beside the
 * chart, with the source line under the chart. Grid: side column, 30px gap, chart column.
 */
function computeSplitLayout(def: ChartDef, s: Settings, W: number, H: number | null, k: number): FrameLayout {
  const st = CARD_STYLES.gallery;
  const pad = Number(s.padding ?? 28);
  const padTop = pad * k, padSide = pad * k, padBottom = pad * st.bottomRatio * k;
  const innerW = Math.max(80, W - 2 * padSide);
  const sideW = Math.min(innerW * 0.6, (def.card.side ?? 250) * k), gap = 30 * k;
  const pct = (key: string) => Number(s[key] ?? 100) / 100;
  let y = padTop;
  const title = block(String(s.title ?? ''), st.title * k * pct('titleSize'), 700, -0.02, sideW, y, padSide);
  if (title.lines.length) y += title.height + st.titleGap * k;
  const sub = block(String(s.subtitle ?? ''), st.sub * k * pct('subtitleSize'), 400, 0, sideW, y, padSide);
  if (sub.lines.length) y += sub.height + st.subGap * k;
  const note = block(String(s.note ?? ''), 11 * k * pct('subtitleSize'), 400, 0, sideW, y, padSide, 11 * 1.65 * k * pct('subtitleSize'));
  if (note.lines.length) y += note.height + 16 * k;
  const legend = block(String(s.legend ?? ''), 9 * k * pct('subtitleSize'), 600, 0.1, sideW, y, padSide, 18 * k * pct('subtitleSize'));
  const sideBottom = y + legend.height;
  const chartX = padSide + sideW + gap, chartW = Math.max(40, innerW - sideW - gap);
  const src = block(String(s.source ?? ''), st.src * k * pct('sourceSize'), 500, 0.08, chartW, 0, chartX);
  const srcH = src.lines.length ? st.srcGap * k + src.height : 0;
  const regionH = H === null ? def.card.chartHeight * k : Math.max(40, H - padTop - srcH - padBottom);
  const region = { x: chartX, y: padTop, w: chartW, h: regionH };
  src.top = region.y + region.h + st.srcGap * k;
  const height = H === null ? Math.round(Math.max(sideBottom, region.y + region.h + srcH) + padBottom) : H;
  return { width: W, height, k, pad: { top: padTop, side: padSide, bottom: padBottom }, title, sub, src, note, legend, region, body: bodyIn(def, region, k) };
}

function computeLayout(def: ChartDef, s: Settings, W: number, H: number | null, k: number): FrameLayout {
  if (def.card.side) return computeSplitLayout(def, s, W, H, k);
  const st = CARD_STYLES[def.card.style ?? 'gallery'];
  const pad = Number(s.padding ?? 28);
  const padTop = pad * k, padSide = pad * k, padBottom = pad * st.bottomRatio * k;
  const innerW = Math.max(40, W - 2 * padSide);
  const pct = (key: string) => Number(s[key] ?? 100) / 100;
  let y = padTop;
  const title = block(String(s.title ?? ''), st.title * k * pct('titleSize'), 700, -0.02, innerW, y, padSide);
  if (title.lines.length) y += title.height + st.titleGap * k;
  const sub = block(String(s.subtitle ?? ''), st.sub * k * pct('subtitleSize'), 400, 0, innerW, y, padSide);
  if (sub.lines.length) y += sub.height + st.subGap * k;
  else if (title.lines.length) y += (st.subGap - st.titleGap) * k;
  const src = block(String(s.source ?? ''), st.src * k * pct('sourceSize'), 500, 0.08, innerW, 0, padSide);
  const bottom = (src.lines.length ? st.srcGap * k + src.height : 0) + padBottom;
  const regionH = H === null ? def.card.chartHeight * k : Math.max(40, H - y - bottom);
  const height = H === null ? Math.round(y + regionH + bottom) : H;
  const region = { x: padSide, y, w: innerW, h: regionH };
  src.top = region.y + region.h + st.srcGap * k;
  return { width: W, height, k, pad: { top: padTop, side: padSide, bottom: padBottom }, title, sub, src, region, body: bodyIn(def, region, k) };
}

/** Artboard size for the current settings: [width, height | null (auto)]. */
export function artboardSize(def: ChartDef, s: Settings): [number, number | null] {
  const preset = String(s.artboard ?? 'original');
  if (preset === 'custom') return [Number(s.width) || 1200, Number(s.height) || 800];
  const p = ARTBOARD_PRESETS.find((a) => a.value === preset);
  if (p && p.w) return [p.w, p.h];
  return [def.card.width, null];
}

export function layoutFrame(def: ChartDef, s: Settings): FrameLayout {
  const [W, H] = artboardSize(def, s);
  if (H === null) return computeLayout(def, s, W, null, 1);
  const base = computeLayout(def, s, def.card.width, null, 1);
  const k = Math.sqrt((W * H) / (base.width * base.height));
  return computeLayout(def, s, W, H, k);
}

export function frameColors(def: ChartDef, theme: Theme): FrameColors {
  const base: FrameColors = def.card.dark
    ? { bg: theme.dark.cardBg, title: theme.dark.text, sub: theme.dark.muted, src: theme.dark.faint }
    : { bg: theme.bg, title: theme.text, sub: theme.muted, src: theme.faint };
  return { ...base, ...(def.frame?.(theme) ?? {}) };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Build the root <svg> with background and text; returns the root and the chart body group. */
export function buildFrame(def: ChartDef, s: Settings, theme: Theme, L: FrameLayout): { root: VNode; body: VNode; colors: FrameColors } {
  const colors = frameColors(def, theme);
  const family = fontStack(s.fontFamily);
  const root: VNode = {
    tag: 'svg',
    attrs: {
      xmlns: 'http://www.w3.org/2000/svg',
      width: L.width,
      height: L.height,
      viewBox: `0 0 ${L.width} ${L.height}`,
      'font-family': family,
    },
    children: [],
  };
  if (s.background !== 'transparent') {
    const r = Math.min(Math.max(0, Number(s.cornerRadius) || 0), L.width / 2, L.height / 2);
    el(root, 'rect', { x: 0, y: 0, width: L.width, height: L.height, rx: r || undefined, fill: String(s.bgColor || '') || colors.bg });
  }
  const lines = (b: TextBlock, fill: string) => {
    b.lines.forEach((line, i) => {
      txt(root, {
        x: r2(b.x),
        y: r2(b.top + i * b.lineHeight + b.ascent),
        'font-size': r2(b.size),
        'font-weight': b.weight,
        'letter-spacing': b.letterSpacing ? r2(b.letterSpacing) : undefined,
        fill,
      }, line);
    });
  };
  lines(L.title, colors.title);
  lines(L.sub, colors.sub);
  if (L.note) lines(L.note, def.card.dark ? colors.sub : theme.label);
  if (L.legend) lines(L.legend, colors.sub);
  lines(L.src, colors.src);
  const body = el(root, 'g', {
    transform: `translate(${r2(L.body.x)} ${r2(L.body.y)}) scale(${Math.round(L.body.scale * 10000) / 10000})`,
    'data-cs-body': 1,
  });
  return { root, body, colors };
}
