// Settings every chart shares (text, number format, artboard, interactivity, animation).
// Chart-specific options are added by each chart. The editor panels are generated from these
// field lists, so a new chart never needs a hand-built panel.

import { EASING_CHOICES } from './ease';
import { FONT_CHOICES } from './fonts';
import type { Field, Settings, Supports } from './types';

export const ARTBOARD_PRESETS: { value: string; label: string; w: number; h: number }[] = [
  { value: 'original', label: 'Default card', w: 0, h: 0 },
  { value: '16:9', label: '16:9 · 1920 × 1080', w: 1920, h: 1080 },
  { value: '1:1', label: '1:1 · 1080 × 1080', w: 1080, h: 1080 },
  { value: '4:5', label: '4:5 · 1080 × 1350', w: 1080, h: 1350 },
  { value: '9:16', label: '9:16 · 1080 × 1920', w: 1080, h: 1920 },
  { value: 'a4p', label: 'A4 portrait · 1240 × 1754', w: 1240, h: 1754 },
  { value: 'a4l', label: 'A4 landscape · 1754 × 1240', w: 1754, h: 1240 },
  { value: 'custom', label: 'Custom size', w: 0, h: 0 },
];

export { FONT_CHOICES, fontStack } from './fonts';

export const DEFAULT_SUPPORTS: Supports = {
  tooltip: true,
  hover: true,
  drag: false,
  zoom: false,
  clickFilter: false,
  dataLabels: false,
  categoryLabels: false,
  caption: false,
  legend: false,
  axes: false,
  grid: false,
};

export interface CommonDefaults {
  title: string;
  subtitle: string;
  source: string;
}

/** Fields shared by every chart, filtered by what the chart supports. */
export function commonFields(sup: Supports, text: CommonDefaults): Field[] {
  const f: Field[] = [
    // Text
    { key: 'title', label: 'Title', group: 'text', type: 'text', default: text.title },
    { key: 'subtitle', label: 'Subtitle', group: 'text', type: 'text', default: text.subtitle, multiline: true },
    { key: 'source', label: 'Source line', group: 'text', type: 'text', default: text.source, help: 'The small line under the chart. Leave empty to hide it.' },
  ];
  if (sup.caption) {
    f.push(
      { key: 'showCaption', label: 'Show chart caption', group: 'text', type: 'boolean', default: true },
      { key: 'caption', label: 'Caption', group: 'text', type: 'text', default: '', placeholder: 'Automatic', help: 'The small key inside the chart. Leave empty for the automatic text.', when: (s) => s.showCaption !== false },
    );
  }
  if (sup.dataLabels) f.push({ key: 'dataLabels', label: 'Data labels', group: 'text', section: 'Labels', type: 'boolean', default: true });
  if (sup.categoryLabels) f.push({ key: 'categoryLabels', label: 'Category labels', group: 'text', section: 'Labels', type: 'boolean', default: true });
  f.push(
    { key: 'fontFamily', label: 'Font', group: 'text', section: 'Font', type: 'select', options: FONT_CHOICES, default: 'Inter' },
    { key: 'titleSize', label: 'Title size', group: 'text', section: 'Font', type: 'number', min: 40, max: 300, step: 1, unit: '%', default: 100 },
    { key: 'subtitleSize', label: 'Subtitle size', group: 'text', section: 'Font', type: 'number', min: 40, max: 300, step: 1, unit: '%', default: 100 },
    { key: 'labelSize', label: 'Chart label size', group: 'text', section: 'Font', type: 'number', min: 40, max: 300, step: 1, unit: '%', default: 100 },
    { key: 'sourceSize', label: 'Source line size', group: 'text', section: 'Font', type: 'number', min: 40, max: 300, step: 1, unit: '%', default: 100 },
    { key: 'numPrefix', label: 'Prefix', group: 'text', section: 'Number format', type: 'text', default: '', placeholder: 'e.g. $' },
    { key: 'numSuffix', label: 'Suffix', group: 'text', section: 'Number format', type: 'text', default: '', placeholder: 'e.g. k' },
    {
      key: 'numDecimals', label: 'Decimals', group: 'text', section: 'Number format', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'Automatic' }, ...['0', '1', '2', '3', '4'].map((v) => ({ value: v, label: v }))],
    },
    { key: 'numThousands', label: 'Thousands separator (1,234)', group: 'text', section: 'Number format', type: 'boolean', default: true },
    { key: 'numCompact', label: 'Compact numbers (1.2K)', group: 'text', section: 'Number format', type: 'boolean', default: false },
    { key: 'numPercent', label: 'Add a % sign', group: 'text', section: 'Number format', type: 'boolean', default: false },
  );
  if (sup.legend) {
    f.push({
      key: 'legend', label: 'Legend', group: 'options', section: 'Layout', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As designed' }, { value: 'top', label: 'Top' }, { value: 'right', label: 'Right' }, { value: 'bottom', label: 'Bottom' }, { value: 'hidden', label: 'Hidden' }],
    });
  }
  if (sup.axes) f.push({ key: 'showAxes', label: 'Axes', group: 'options', section: 'Layout', type: 'boolean', default: true });
  if (sup.grid) f.push({ key: 'showGrid', label: 'Gridlines', group: 'options', section: 'Layout', type: 'boolean', default: true });

  // Interactivity
  f.push({ key: 'clickReplay', label: 'Click to replay', group: 'interactivity', type: 'boolean', default: true, help: 'Clicking the chart (or its empty space) replays the entrance.' });
  if (sup.tooltip) f.push({ key: 'tooltip', label: 'Tooltips', group: 'interactivity', type: 'boolean', default: true, help: 'Show details when the pointer is over a mark.' });
  if (sup.hover) f.push({ key: 'hover', label: 'Hover highlight', group: 'interactivity', type: 'boolean', default: true, help: 'Fade everything except the hovered item.' });
  if (sup.drag) f.push({ key: 'drag', label: 'Drag nodes', group: 'interactivity', type: 'boolean', default: true, help: 'In the editor, dragged positions are saved with the chart (undo works).' });
  if (sup.zoom) f.push({ key: 'zoom', label: 'Zoom and pan', group: 'interactivity', type: 'boolean', default: true, help: 'Drag empty space to pan. Click the chart once, then scroll to zoom (or pinch, or Ctrl+scroll). Double-click resets.' });
  if (sup.clickFilter) f.push({ key: 'clickFilter', label: 'Click to pin a highlight', group: 'interactivity', type: 'boolean', default: true, help: 'Click a mark to keep it highlighted; click empty space to let go.' });

  // Animation
  f.push(
    { key: 'animEnabled', label: 'Entrance animation', group: 'animation', type: 'boolean', default: true },
    { key: 'animDuration', label: 'Duration', group: 'animation', type: 'number', min: 0, max: 20, step: 0.1, unit: 's', default: 0, help: '0 = the chart’s own timing.', when: on },
    { key: 'animStagger', label: 'Stagger', group: 'animation', type: 'number', min: 0, max: 300, step: 1, unit: '%', default: 100, help: 'How spread out the marks are. 0% = all at once.', when: on },
    { key: 'animEasing', label: 'Easing', group: 'animation', type: 'select', options: EASING_CHOICES, default: 'original', when: on },
    { key: 'animDelay', label: 'Start delay', group: 'animation', type: 'number', min: 0, max: 5, step: 0.1, unit: 's', default: 0, when: on },
    { key: 'animHold', label: 'Hold at end', group: 'animation', type: 'number', min: 0, max: 10, step: 0.1, unit: 's', default: 1, help: 'Used by video export and looping.', when: on },
    { key: 'animLoop', label: 'Loop', group: 'animation', type: 'boolean', default: false, when: on },
  );

  // Artboard (right panel)
  f.push(
    { key: 'artboard', label: 'Size', group: 'artboard', type: 'select', options: ARTBOARD_PRESETS.map(({ value, label }) => ({ value, label })), default: 'original' },
    { key: 'width', label: 'Width', group: 'artboard', type: 'number', min: 200, max: 4000, step: 1, unit: 'px', default: 1200, when: (s) => s.artboard === 'custom' },
    { key: 'height', label: 'Height', group: 'artboard', type: 'number', min: 200, max: 4000, step: 1, unit: 'px', default: 800, when: (s) => s.artboard === 'custom' },
    { key: 'padding', label: 'Padding', group: 'artboard', type: 'number', min: 0, max: 160, step: 1, unit: 'px', default: 28 },
    { key: 'background', label: 'Background', group: 'artboard', type: 'select', options: [{ value: 'fill', label: 'Filled' }, { value: 'transparent', label: 'Transparent' }], default: 'fill' },
    { key: 'cornerRadius', label: 'Corner radius', group: 'artboard', type: 'number', min: 0, max: 120, step: 1, unit: 'px', default: 24, help: 'Rounds the corners of the filled background (24 px by default; 0 for square).', when: (s) => s.background !== 'transparent' },
    { key: 'bgColor', label: 'Background colour', group: 'artboard', type: 'color', default: '', when: (s) => s.background !== 'transparent' },
  );
  return f;
}

const on = (s: Settings) => s.animEnabled !== false;

export function defaultsOf(fields: Field[]): Settings {
  const s: Settings = {};
  for (const f of fields) if (f.type !== 'action') s[f.key] = f.default;
  return s;
}

/** Keep only values that differ from the defaults (used for storage and share links). */
export function diffSettings(s: Settings, defaults: Settings): Settings {
  const out: Settings = {};
  for (const [k, v] of Object.entries(s)) if (defaults[k] !== v) out[k] = v;
  return out;
}

/** Clamp/clean user settings against the schema so bad values can never crash a chart. */
export function sanitizeSettings(fields: Field[], input: Partial<Settings>): Settings {
  const out: Settings = {};
  for (const f of fields) {
    if (f.type === 'action') continue;
    const v = input[f.key];
    if (v === undefined) {
      out[f.key] = f.default;
      continue;
    }
    switch (f.type) {
      case 'number': {
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        out[f.key] = Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, n)) : f.default;
        break;
      }
      case 'boolean':
        out[f.key] = typeof v === 'boolean' ? v : v === 'true';
        break;
      case 'select':
        out[f.key] = f.options.some((o) => o.value === String(v)) ? String(v) : f.default;
        break;
      default:
        out[f.key] = String(v);
    }
  }
  return out;
}
