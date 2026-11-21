// Builds a complete frame: the artboard card plus the chart, at a given moment in time.
// Everything is computed from (data, settings, theme, time), with no DOM involved, so the
// preview, SVG export, MP4 frames and code exports all draw the exact same thing.

import { naturalLength, type Timing } from './anim';
import type { ChartDef, DrawContext } from './chart';
import { validateData } from './data';
import { easeByName } from './ease';
import { formatNumber, numberFormatFrom } from './format';
import { buildFrame, layoutFrame, type FrameLayout } from './frame';
import { sanitizeSettings } from './settings';
import { selectTextFont } from './text/metrics';
import type { Theme } from './theme';
import type { ChartData, Issue, Settings } from './types';
import { txt, type VNode } from './vnode';

export interface Timeline {
  enabled: boolean;
  /** the chart's own entrance length in seconds (at the current stagger) */
  natural: number;
  /** the entrance length the user asked for (Duration setting, or natural) */
  duration: number;
  /** duration / natural */
  scale: number;
  startDelay: number;
  hold: number;
  loop: boolean;
  /** startDelay + duration: the whole entrance */
  length: number;
}

export interface Scene {
  root: VNode;
  body: VNode;
  width: number;
  height: number;
  layout: FrameLayout;
  settings: Settings;
  data: ChartData;
  issues: Issue[];
  /** true when the chart couldn't be drawn (message shown instead) */
  fatal: boolean;
  timing: Timing;
  timeline: Timeline;
}

export interface SceneInput {
  data?: ChartData;
  settings?: Partial<Settings>;
  theme: Theme;
}

function message(body: VNode, w: number, h: number, text: string, color: string) {
  const lines = text.length > 70 ? [text.slice(0, text.lastIndexOf(' ', 70)), text.slice(text.lastIndexOf(' ', 70) + 1)] : [text];
  lines.forEach((line, i) =>
    txt(body, { x: w / 2, y: h / 2 + (i - (lines.length - 1) / 2) * 16, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: color }, line),
  );
}

export function buildScene(def: ChartDef, input: SceneInput, time = Infinity): Scene {
  const settings = sanitizeSettings(def.settingsSchema, input.settings ?? {});
  // text is measured with the chosen font's widths while this scene is built
  const restore = selectTextFont(settings.fontFamily);
  try {
    return sceneFor(def, input, settings, time);
  } finally {
    restore();
  }
}

function sceneFor(def: ChartDef, input: SceneInput, settings: Settings, time: number): Scene {
  const theme = input.theme;
  const v = validateData(def.dataSchema, input.data ?? def.defaultData);
  const extra = !v.fatal && def.validate ? def.validate(v.data, settings) : [];
  const issues = [...extra.filter((i) => i.fatal), ...v.issues, ...extra.filter((i) => !i.fatal)];
  const fatal = v.fatal || extra.some((i) => i.fatal);
  const layout = layoutFrame(def, settings);
  const { root, body, colors } = buildFrame(def, settings, theme, layout);

  const stagger = Number(settings.animStagger ?? 100) / 100;
  const ease = easeByName(String(settings.animEasing ?? 'original'));
  const fmtSpec = numberFormatFrom(settings);
  const labelScale = Number(settings.labelSize ?? 100) / 100;
  const boost = theme.inkBoost;
  const ctx: DrawContext = {
    root: body,
    w: layout.body.w,
    h: layout.body.h,
    data: v.data,
    rows: v.data[def.dataSchema.tables[0].key] ?? [],
    s: settings,
    num: (k) => Number(settings[k]),
    bool: (k) => settings[k] === true,
    str: (k) => String(settings[k] ?? ''),
    theme,
    mono: theme.kind === 'mono',
    time,
    stagger,
    ease,
    fs: (px) => Math.round(px * labelScale * 100) / 100,
    fmt: (n) => formatNumber(n, fmtSpec),
    sw: (w) => (boost ? Math.round(w * boost.strokeScale * 100) / 100 : w),
  };

  let failed = fatal;
  if (fatal) {
    message(body, layout.body.w, layout.body.h, issues[0]?.message ?? 'This data can’t be drawn.', colors.sub);
  } else {
    try {
      def.draw(ctx);
    } catch (err) {
      failed = true;
      body.children = [];
      const why = err instanceof Error ? err.message : String(err);
      issues.unshift({ message: `Couldn’t draw this chart with the current data (${why}).` });
      message(body, layout.body.w, layout.body.h, 'Couldn’t draw this chart with the current data.', colors.sub);
    }
  }

  const effects = naturalLength(root, stagger);
  const selfLen = !failed && def.animation === 'self' && def.naturalDuration ? def.naturalDuration(ctx) : 0;
  const natural = Math.max(effects, selfLen, 0.001);
  const startDelay = Math.max(0, Number(settings.animDelay) || 0);
  const duration = Number(settings.animDuration) > 0 ? Number(settings.animDuration) : natural;
  const timeline: Timeline = {
    enabled: settings.animEnabled !== false,
    natural,
    duration,
    scale: duration / natural,
    startDelay,
    hold: Math.max(0, Number(settings.animHold) || 0),
    loop: settings.animLoop === true,
    length: startDelay + duration,
  };
  return {
    root,
    body,
    width: layout.width,
    height: layout.height,
    layout,
    settings,
    data: v.data,
    issues,
    fatal: failed,
    timing: { stagger, ease },
    timeline,
  };
}

/** Clock seconds since the entrance began → the chart's natural time (Infinity = finished). */
export function naturalTime(clock: number, tl: Timeline): number {
  if (!tl.enabled) return Infinity;
  const local = clock - tl.startDelay;
  if (local >= tl.duration) return Infinity;
  if (local <= 0) return 0;
  return local / tl.scale;
}

/** Progress t (0..1 across the entrance) → natural time. */
export function timeAtProgress(t: number, tl: Timeline): number {
  return naturalTime(Math.min(1, Math.max(0, t)) * tl.length, tl);
}
