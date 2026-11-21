import type { ChartDef, ChartSpec } from './chart';
import { applyFrame, mount } from './mount';
import { buildScene, timeAtProgress } from './scene';
import { commonFields, DEFAULT_SUPPORTS, defaultsOf } from './settings';
import { MONO } from './theme';
import type { Field } from './types';

/** Turn a chart spec into a full definition: shared settings, schema, defaults and render(). */
export function defineChart(spec: ChartSpec): ChartDef {
  const supportsAll = { ...DEFAULT_SUPPORTS, ...spec.supports };
  const common = commonFields(supportsAll, spec.text);
  const schema: Field[] = [
    ...common.filter((f) => f.group !== 'artboard'),
    ...spec.fields,
    ...common.filter((f) => f.group === 'artboard'),
  ];
  const seen = new Set<string>();
  for (const f of schema) {
    // a chart option with the same key as a shared setting would silently read the wrong value
    if (seen.has(f.key)) throw new Error(`Chart ${spec.id}: the setting key "${f.key}" is used twice.`);
    seen.add(f.key);
  }
  for (const f of schema) {
    const d = spec.defaults?.[f.key];
    if (d !== undefined) (f as { default: unknown }).default = d;
    if (f.key === 'caption' && f.type === 'text' && spec.caption) f.auto = (s, d, theme) => spec.caption!(s, theme ?? MONO, d);
  }
  const def: ChartDef = {
    ...spec,
    supportsAll,
    settingsSchema: schema,
    defaultSettings: defaultsOf(schema),
    render(svgEl, data, settings, theme, t = 1) {
      const input = { data, settings, theme };
      const probe = buildScene(def, input);
      const tau = timeAtProgress(t, probe.timeline);
      const scene = def.animation === 'self' && tau !== Infinity ? buildScene(def, input, tau) : probe;
      const m = mount(svgEl, scene.root);
      applyFrame(m, tau, scene.timing);
    },
  };
  return def;
}
