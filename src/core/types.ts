// Shared types for the chart core. Nothing in src/core may import React or app code:
// the core is bundled into every chart's standalone runtime for code exports.

import type { Theme } from './theme';

export type Primitive = string | number | boolean;
export type Cell = string | number | null;
export type Row = Record<string, Cell>;
/** Every chart's data is one or more named tables of rows. Single-table charts use `rows`. */
export type ChartData = Record<string, Row[]>;
export type Settings = Record<string, Primitive>;

export type Family = 'basics' | 'glance' | 'editorial' | 'maps' | 'networks' | 'extras';
export type Kind =
  | 'bars' | 'lines' | 'part-to-whole' | 'distribution' | 'network' | 'flow' | 'map'
  | 'calendar' | 'heatmap' | 'ranking' | 'comparison' | 'hierarchy' | 'scatter' | 'time';

export type PresetId = 'mono' | 'porcelain' | 'palm' | 'wire';
export type PaletteNeed = 'categorical' | 'sequential' | 'highlight';
export type Interaction = 'tooltip' | 'hover-highlight' | 'drag' | 'zoom-pan' | 'click-filter';

// ── data schema ────────────────────────────────────────────────────────────
export type ColumnType = 'text' | 'number' | 'date';
export type ColumnRole =
  | 'label' | 'value' | 'series' | 'date' | 'category' | 'id' | 'source' | 'target'
  | 'weight' | 'group' | 'region' | 'parent' | 'x' | 'y' | 'size';

export interface ColumnSpec {
  key: string;
  label: string;
  type: ColumnType;
  role?: ColumnRole;
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  help?: string;
}

export interface TableSpec {
  key: string;
  label: string;
  columns: ColumnSpec[];
  minRows: number;
  maxRows: number;
}

export interface DataSchema {
  tables: TableSpec[];
}

export interface Issue {
  table?: string;
  row?: number;
  column?: string;
  message: string;
  /** true when the chart can't be drawn because of it */
  fatal?: boolean;
}

// ── settings schema ────────────────────────────────────────────────────────
/** Where a field is shown in the editor. */
export type FieldGroup = 'text' | 'options' | 'interactivity' | 'animation' | 'artboard';

interface FieldBase {
  key: string;
  label: string;
  group: FieldGroup;
  /** Sub-heading inside the group, e.g. "Number format". */
  section?: string;
  help?: string;
  /** Hide the control unless this returns true for the current settings. */
  when?: (s: Settings) => boolean;
}
export interface NumberField extends FieldBase {
  type: 'number';
  min: number;
  max: number;
  step: number;
  unit?: string;
  default: number;
}
export interface BooleanField extends FieldBase {
  type: 'boolean';
  default: boolean;
}
export interface SelectField extends FieldBase {
  type: 'select';
  options: { value: string; label: string }[];
  default: string;
}
export interface TextField extends FieldBase {
  type: 'text';
  default: string;
  multiline?: boolean;
  placeholder?: string;
  /** Shown as the placeholder when the value is empty (the automatic text). */
  auto?: (s: Settings, d: ChartData, theme?: Theme) => string;
}
export interface ColorField extends FieldBase {
  type: 'color';
  /** '' means "use the palette". */
  default: string;
}
/** A button (not a stored value), e.g. "Clear dragged positions". */
export interface ActionField extends FieldBase {
  type: 'action';
  run: (data: ChartData, s: Settings) => { data?: ChartData; settings?: Settings };
  /** Disable the button unless this returns true. */
  enabled?: (data: ChartData, s: Settings) => boolean;
}
export type ValueField = NumberField | BooleanField | SelectField | TextField | ColorField;
export type Field = ValueField | ActionField;

export interface Supports {
  tooltip: boolean;
  hover: boolean;
  drag: boolean;
  zoom: boolean;
  clickFilter: boolean;
  dataLabels: boolean;
  categoryLabels: boolean;
  caption: boolean;
  legend: boolean;
  axes: boolean;
  grid: boolean;
}
