// The chart contract. Each chart module calls defineChart({...}) with its data schema, demo
// data, options and a draw() function; defineChart adds the shared settings, the merged
// settings schema (which generates the editor) and the brief's render(svgEl, data, settings,
// theme, t) entry point.

import type { EaseFn } from './ease';
import type { Theme } from './theme';
import type {
  ChartData, DataSchema, Family, Field, Interaction, Issue, Kind, PaletteNeed, Row, Settings, Supports,
} from './types';
import type { VNode } from './vnode';

export interface DrawContext {
  /** Group to draw into, in the chart's own coordinates (0..w, 0..h). */
  root: VNode;
  w: number;
  h: number;
  data: ChartData;
  /** The first table's rows (most charts have only one table). */
  rows: Row[];
  s: Settings;
  num(key: string): number;
  bool(key: string): boolean;
  str(key: string): string;
  theme: Theme;
  /** True for the Mono palette (some marks use Mono's exact greys). */
  mono: boolean;
  /** Natural seconds since the entrance started; Infinity = final frame. */
  time: number;
  /** Multiplier on stagger delays (from the Stagger setting). */
  stagger: number;
  /** Easing override from the Easing setting, if any. */
  ease?: EaseFn;
  /** Font size scaled by the "Chart label size" setting. */
  fs(px: number): number;
  /** Number formatted with the Number format settings. */
  fmt(v: number): string;
  /** Stroke width after the colour presets' line thickening. */
  sw(w: number): number;
}

export interface FrameColors {
  bg: string;
  title: string;
  sub: string;
  src: string;
}

/** Handed to a chart's own interaction code (e.g. dragging nodes) in live views. */
export interface InteractApi {
  svg: SVGSVGElement;
  data: ChartData;
  settings: Settings;
  theme: Theme;
  /** Which interactions the settings allow. */
  enabled: { drag: boolean; zoom: boolean; tooltip: boolean; hover: boolean };
  /** Save changed data (e.g. dragged positions). Only provided inside the editor. */
  commitData?: (data: ChartData) => void;
  /** Jump the entrance animation to its final frame (call before live changes). */
  finish(): void;
}

export interface ChartSpec {
  id: string;
  name: string;
  family: Family;
  kinds: Kind[];
  /** One plain-English line. */
  description: string;
  /**
   * The chart's default card: width and chart area height in px, whether it is a dark card, and
   * its type style ('gallery' = compact cards, 'large' = big stand-alone views). `side` puts the
   * title, subtitle, note and legend in a column of that width beside the chart (L03).
   */
  card: { width: number; chartHeight: number; dark?: boolean; style?: 'gallery' | 'large'; side?: number };
  /** The chart's own drawing size. Responsive charts re-lay out to any artboard shape. */
  size: { w: number; h: number; responsive?: boolean };
  dataSchema: DataSchema;
  defaultData: ChartData;
  text: { title: string; subtitle: string; source: string };
  /** Overrides for shared defaults (e.g. number prefix). */
  defaults?: Settings;
  /** Chart-specific options. */
  fields: Field[];
  supports: Partial<Supports>;
  /** The automatic in-chart caption (shown as the placeholder of the Caption box). */
  caption?: (s: Settings, theme: Theme, data: ChartData) => string;
  paletteNeeds: PaletteNeed[];
  interactions: Interaction[];
  /** 'effects': marks use fade/pop/draw. 'self': draw() animates itself from ctx.time. */
  animation: 'effects' | 'self';
  /** For 'self' charts: natural entrance length in seconds. */
  naturalDuration?: (ctx: DrawContext) => number;
  frame?: (theme: Theme) => Partial<FrameColors>;
  validate?: (data: ChartData, s: Settings) => Issue[];
  draw(ctx: DrawContext): void;
  /**
   * Notices for open-source code bundled into this chart's runtime (printed at the top of its
   * code exports).
   */
  notices?: string[];
  /** Chart-specific live interactions (drag, …). Returns a cleanup function. */
  interact?: (api: InteractApi) => (() => void) | void;
}

export interface ChartDef extends ChartSpec {
  supportsAll: Supports;
  /** Every customizable parameter (shared + chart-specific): drives the editor UI. */
  settingsSchema: Field[];
  defaultSettings: Settings;
  /** The brief's contract: draw the chart into svgEl at animation progress t (0..1). */
  render(svgEl: SVGSVGElement, data: ChartData | undefined, settings: Partial<Settings> | undefined, theme: Theme, t?: number): void;
}
