// Checks that run over every registered chart: palettes, purity, clean SVG, bad data, and
// every setting pushed to its limits. A new chart gets all of these for free.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../src/charts/catalog';
import { CHARTS } from '../../src/charts/registry';
import type { ChartDef } from '../../src/core/chart';
import { buildScene, timeAtProgress } from '../../src/core/scene';
import { serialize } from '../../src/core/serialize';
import { MONO, PALM, paletteFromTheme, PORCELAIN, themeFromPalette, WIRE } from '../../src/core/theme';
import type { ChartData, Settings } from '../../src/core/types';
import { walk, type VNode } from '../../src/core/vnode';

const THEMES = [MONO, PORCELAIN, PALM, WIRE, themeFromPalette({ ...paletteFromTheme(PALM), id: 'test', name: 'Test' })];

/**
 * No NaN/Infinity anywhere in the drawing. (The SVG writer turns them into 0 as a safety net,
 * so look at the drawing itself.)
 */
function assertFinite(root: VNode, where: string) {
  walk(root, (n) => {
    for (const [k, v] of Object.entries(n.attrs)) {
      const bad = typeof v === 'number' ? !Number.isFinite(v) : /NaN|Infinity/.test(v);
      expect(bad, `${where}: <${n.tag} ${k}="${v}">`).toBe(false);
      // browsers reject negative sizes
      if ((k === 'width' || k === 'height' || k === 'r' || k === 'rx') && Number(v) < 0) expect.fail(`${where}: <${n.tag} ${k}="${v}">`);
    }
  });
}

function svgOf(def: ChartDef, data: ChartData | undefined, settings: Partial<Settings>, t = 1, theme = MONO) {
  const sc = buildScene(def, { data, settings, theme });
  const tau = timeAtProgress(t, sc.timeline);
  const frame = def.animation === 'self' && tau !== Infinity ? buildScene(def, { data, settings, theme }, tau) : sc;
  return { sc, root: frame.root, svg: serialize(frame.root, { tau, timing: frame.timing, idPrefix: 't-' }) };
}

describe('registry', () => {
  it('has a chart for every gallery entry, and every chart is listed', () => {
    const done = CATALOG.map((c) => c.id).sort();
    const registered = CHARTS.map((c) => c.id).sort();
    expect(registered).toEqual(expect.arrayContaining(done));
    for (const id of registered) expect(CATALOG.some((c) => c.id === id), `${id} is not in the catalog`).toBe(true);
  });
});

for (const def of CHARTS) {
  describe(`${def.id} ${def.name}`, () => {
    it('renders in every palette, with clean SVG at the start, middle and end', () => {
      for (const theme of THEMES) {
        for (const t of [0, 0.5, 1]) {
          const { sc, svg, root } = svgOf(def, undefined, {}, t, theme);
          expect(sc.fatal, `${theme.name}: ${sc.issues.map((i) => i.message).join(' / ')}`).toBe(false);
          expect(svg).toMatch(/^<svg[^>]* viewBox="0 0 \d+(\.\d+)? \d+(\.\d+)?"/);
          expect(svg).not.toContain('var(--');
          expect(svg).not.toContain('<foreignObject');
          expect(svg).not.toContain('data-cs-');
          expect(svg).not.toMatch(/href="(?!#)/);
          assertFinite(root, `${theme.name} t=${t}`);
        }
      }
    });

    it('is a pure function of its input', () => {
      expect(svgOf(def, undefined, {}).svg).toBe(svgOf(def, undefined, {}).svg);
      expect(svgOf(def, undefined, {}, 0.37).svg).toBe(svgOf(def, undefined, {}, 0.37).svg);
    });

    it('turns bad or missing data into messages, never a crash', () => {
      const first = def.dataSchema.tables[0];
      const garbage: ChartData = { [first.key]: [Object.fromEntries(first.columns.map((c) => [c.key, c.type === 'number' ? 'lots' : '']))] };
      const bad = buildScene(def, { data: garbage, theme: MONO });
      expect(bad.issues.length).toBeGreaterThan(0);
      const empty = buildScene(def, { data: {}, theme: MONO });
      expect(empty.fatal).toBe(true);
      expect(empty.issues[0].message.length).toBeGreaterThan(10);
    });

    it('survives every setting at its limits', () => {
      for (const f of def.settingsSchema) {
        const values: unknown[] =
          f.type === 'number' ? [f.min, f.max] : f.type === 'boolean' ? [!f.default] : f.type === 'select' ? f.options.map((o) => o.value) : f.type === 'text' ? ['', 'A much longer piece of text than anyone would expect here'] : [];
        for (const v of values) {
          const settings = { [f.key]: v } as Partial<Settings>;
          let root: VNode | undefined;
          expect(() => (root = svgOf(def, undefined, settings).root), `${f.key} = ${String(v)}`).not.toThrow();
          assertFinite(root!, `${f.key} = ${String(v)}`);
        }
      }
    });

    it('copes with a missing first row and with negative numbers', () => {
      const first = def.dataSchema.tables[0];
      const rows = def.defaultData[first.key] ?? [];
      const variants: [string, ChartData][] = [
        ['first row missing', { ...def.defaultData, [first.key]: rows.slice(1) }],
        ['numbers negated', { ...def.defaultData, [first.key]: rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? -v : v]))) }],
      ];
      for (const [what, data] of variants) {
        let root: VNode | undefined;
        expect(() => (root = svgOf(def, data, {}).root), what).not.toThrow();
        assertFinite(root!, what);
      }
    });

    it('draws with only one row of data', () => {
      const first = def.dataSchema.tables[0];
      const rows = def.defaultData[first.key] ?? [];
      if (first.minRows > 1 || !rows.length) return;
      const { sc, root } = svgOf(def, { ...def.defaultData, [first.key]: rows.slice(0, 1) }, {});
      expect(sc.fatal).toBe(false);
      assertFinite(root, 'one row');
    });
  });
}
