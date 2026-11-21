// Field controls generated from the settings schema. Every number gets a slider AND a number
// box; colours get a picker AND a hex box; every control can be reset to its default.

import { useEffect, useId, useState, type ReactNode } from 'react';
import { isColor, parseColor, toHex } from '../core/color';
import type { Theme } from '../core/theme';
import type { ActionField, BooleanField, ChartData, ColorField, Field, NumberField, Primitive, SelectField, Settings, TextField } from '../core/types';

interface Base<F extends Field> {
  field: F;
  value: Primitive;
  settings: Settings;
  data: ChartData;
  /** the palette in use (automatic captions depend on it) */
  theme?: Theme;
  onChange: (v: Primitive | undefined) => void;
}

function Head({ id, label, changed, onReset }: { id: string; label: string; changed: boolean; onReset: () => void }) {
  return (
    <div className="field-head">
      <label htmlFor={id}>{label}</label>
      {changed && (
        <button type="button" className="reset" onClick={onReset} title="Reset to default" aria-label={`Reset ${label}`}>
          ↺
        </button>
      )}
    </div>
  );
}

const decimals = (step: number) => String(step).split('.')[1]?.length ?? 0;
const show = (v: number, step: number) => String(+v.toFixed(Math.max(decimals(step), 2)));

export function NumberControl({ field, value, onChange }: Base<NumberField>) {
  const id = useId();
  const v = typeof value === 'number' && Number.isFinite(value) ? value : field.default;
  const [text, setText] = useState(show(v, field.step));
  useEffect(() => setText(show(v, field.step)), [v, field.step]);
  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(',', '.'));
    if (Number.isFinite(n)) onChange(Math.min(field.max, Math.max(field.min, n)));
  };
  return (
    <div className="field">
      <Head id={id} label={field.label} changed={v !== field.default} onReset={() => onChange(undefined)} />
      <div className="range-row">
        <input type="range" aria-label={field.label} min={field.min} max={field.max} step={field.step} value={v} onChange={(e) => onChange(Number(e.target.value))} />
        <input
          id={id}
          className="num"
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setText(show(v, field.step))}
        />
        {field.unit && <span className="unit">{field.unit}</span>}
      </div>
      {field.help && <div className="field-help">{field.help}</div>}
    </div>
  );
}

export function BooleanControl({ field, value, onChange }: Base<BooleanField>) {
  const id = useId();
  return (
    <div>
      <div className="switch-row">
        <label htmlFor={id}>{field.label}</label>
        <input id={id} type="checkbox" role="switch" className="switch" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
      </div>
      {field.help && <div className="field-help" style={{ padding: '0 14px 4px' }}>{field.help}</div>}
    </div>
  );
}

export function SelectControl({ field, value, onChange }: Base<SelectField>) {
  const id = useId();
  return (
    <div className="field">
      <Head id={id} label={field.label} changed={value !== field.default} onReset={() => onChange(undefined)} />
      <select id={id} className="select" value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {field.help && <div className="field-help">{field.help}</div>}
    </div>
  );
}

export function TextControl({ field, value, settings, data, theme, onChange }: Base<TextField>) {
  const id = useId();
  const placeholder = field.auto ? field.auto(settings, data, theme) : field.placeholder;
  const v = String(value ?? '');
  return (
    <div className="field">
      <Head id={id} label={field.label} changed={v !== field.default} onReset={() => onChange(undefined)} />
      {field.multiline ? (
        <textarea id={id} className="textarea" rows={2} value={v} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" type="text" value={v} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.help && <div className="field-help">{field.help}</div>}
    </div>
  );
}

export function ColorInput({ id, value, fallback, onChange }: { id?: string; value: string; fallback: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const swatch = isColor(value) ? toHex(parseColor(value)!) : isColor(fallback) ? toHex(parseColor(fallback)!) : '#000000';
  return (
    <div className="color-row">
      <input type="color" aria-label="Pick a colour" value={swatch} onChange={(e) => onChange(e.target.value.toUpperCase())} />
      <input
        id={id}
        className="input"
        value={text}
        placeholder={fallback}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value === '' || isColor(e.target.value)) onChange(e.target.value);
        }}
      />
    </div>
  );
}

export function ColorControl({ field, value, onChange, fallback }: Base<ColorField> & { fallback?: string }) {
  const id = useId();
  return (
    <div className="field">
      <Head id={id} label={field.label} changed={String(value ?? '') !== field.default} onReset={() => onChange(undefined)} />
      <ColorInput id={id} value={String(value ?? '')} fallback={fallback ?? 'Palette colour'} onChange={(v) => onChange(v)} />
      {field.help && <div className="field-help">{field.help}</div>}
    </div>
  );
}

export function ActionControl({ field, settings, data, onAction }: Base<ActionField> & { onAction?: (f: ActionField) => void }) {
  const enabled = field.enabled ? field.enabled(data, settings) : true;
  return (
    <div className="field">
      <button type="button" className="btn small" disabled={!enabled || !onAction} onClick={() => onAction?.(field)}>
        {field.label}
      </button>
      {field.help && <div className="field-help">{field.help}</div>}
    </div>
  );
}

export function FieldControl(p: Base<Field> & { fallback?: string; onAction?: (f: ActionField) => void }) {
  const f = p.field;
  switch (f.type) {
    case 'action':
      return <ActionControl {...p} field={f} />;
    case 'number':
      return <NumberControl {...p} field={f} />;
    case 'boolean':
      return <BooleanControl {...p} field={f} />;
    case 'select':
      return <SelectControl {...p} field={f} />;
    case 'color':
      return <ColorControl {...p} field={f} />;
    default:
      return <TextControl {...p} field={f} />;
  }
}

/** All fields of one group, with sub-headings for sections. */
export function SchemaFields({
  fields, settings, data, theme, onChange, onAction, fallbacks = {},
}: {
  fields: Field[];
  settings: Settings;
  data: ChartData;
  theme?: Theme;
  onChange: (key: string, v: Primitive | undefined) => void;
  onAction?: (f: ActionField) => void;
  /** what an empty colour field currently resolves to (shown in its swatch) */
  fallbacks?: Record<string, string>;
}) {
  const visible = fields.filter((f) => !f.when || f.when(settings));
  // fields that share a section stay together under one heading (a chart's own "Layout" fields
  // join the shared Axes/Gridlines toggles), in the order the sections first appear
  const sections = new Map<string | undefined, Field[]>();
  for (const f of visible) {
    if (!sections.has(f.section)) sections.set(f.section, []);
    sections.get(f.section)!.push(f);
  }
  const out: ReactNode[] = [];
  for (const [section, list] of sections) {
    if (section) out.push(<div key={`s-${section}`} className="subhead">{section}</div>);
    for (const f of list) {
      out.push(<FieldControl key={f.key} field={f} value={settings[f.key]} settings={settings} data={data} theme={theme} fallback={fallbacks[f.key]} onAction={onAction} onChange={(v) => onChange(f.key, v)} />);
    }
  }
  return <>{out}</>;
}

export function Section({ title, count, open = true, children }: { title: string; count?: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="sec" open={open}>
      <summary>
        {title}
        {count && <span className="count">{count}</span>}
      </summary>
      <div className="sec-body">{children}</div>
    </details>
  );
}
