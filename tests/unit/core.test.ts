import { describe, expect, it } from 'vitest';
import B01 from '../../src/charts/basics/B01';
import G01 from '../../src/charts/glance/G01';
import N01 from '../../src/charts/networks/N01';
import { buildGraph } from '../../src/charts/shared/forcegraph';
import { CATALOG } from '../../src/charts/catalog';
import { contrast } from '../../src/core/color';
import { validateData } from '../../src/core/data';
import { cubicBezier } from '../../src/core/ease';
import { formatNumber } from '../../src/core/format';
import { rndAbs, rndSigned } from '../../src/core/rnd';
import { buildScene, timeAtProgress } from '../../src/core/scene';
import { serialize } from '../../src/core/serialize';
import { familyFromStack, FONT_CHOICES, FONTS, fontInfo, fontStack, weightFor, type Face } from '../../src/core/fonts';
import { TEXT_METRICS } from '../../src/core/text/all-metrics';
import { lineBox, measure, selectTextFont } from '../../src/core/text/metrics';
import { MONO, PALM, PORCELAIN, WIRE, themeFromPalette, paletteFromTheme } from '../../src/core/theme';
import type { ChartData } from '../../src/core/types';
import type { VNode } from '../../src/core/vnode';

const THEMES = [MONO, PORCELAIN, PALM, WIRE];

function find(root: VNode, pred: (n: VNode) => boolean): VNode[] {
  const out: VNode[] = [];
  const go = (n: VNode) => {
    if (pred(n)) out.push(n);
    n.children.forEach(go);
  };
  go(root);
  return out;
}

describe('deterministic helpers', () => {
  it('keeps both rnd() variants exactly as in the source', () => {
    expect(rndAbs(1, 2)).toBe(Math.abs(((1 * 73856093) ^ (2 * 19349663)) % 1000) / 1000);
    // the signed variant can go negative (Glance / dense graphs rely on that)
    const anyNegative = Array.from({ length: 50 }, (_, i) => rndSigned(i + 1, 17)).some((v) => v < 0);
    expect(anyNegative).toBe(true);
    expect(Array.from({ length: 50 }, (_, i) => rndAbs(i + 1, 17)).every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('solves CSS cubic-bezier like a browser', () => {
    const ease = cubicBezier(0.25, 0.1, 0.25, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.8024, 3);
    const pop = cubicBezier(0.2, 0.7, 0.3, 1.3);
    expect(Math.max(...Array.from({ length: 99 }, (_, i) => pop((i + 1) / 100)))).toBeGreaterThan(1); // overshoots
  });

  it('measures Inter like Chrome lays out line boxes', () => {
    expect(lineBox(16.5).height).toBe(20);
    expect(lineBox(11.5).height).toBe(14);
    expect(lineBox(9.5).height).toBe(11);
    expect(measure('PRO', 9, 600)).toBeGreaterThan(measure('PRO', 9, 400));
  });

  it('formats numbers without locale surprises', () => {
    const f = { prefix: '$', suffix: 'K', decimals: -1, thousands: true, compact: false, percent: false };
    expect(formatNumber(486, f)).toBe('$486K');
    expect(formatNumber(1234567, { ...f, prefix: '', suffix: '' })).toBe('1,234,567');
    expect(formatNumber(1234567, { ...f, prefix: '', suffix: '', compact: true })).toBe('1.2M');
    expect(formatNumber(-12.345, { ...f, prefix: '', suffix: '', decimals: 1 })).toBe('−12.3');
  });

  it('computes WCAG contrast', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrast(MONO.text, MONO.bg)).toBeGreaterThan(4.5);
  });
});

describe('B01 Rung Bars', () => {
  it('lays out the default card exactly (padding, type sizes, line boxes)', () => {
    const sc = buildScene(B01, { theme: MONO });
    expect(sc.width).toBe(539);
    expect(sc.height).toBe(450);
    const L = sc.layout;
    expect(L.title.top).toBe(28);
    expect(L.region).toEqual({ x: 28, y: 79, w: 483, h: 330 });
    // the 400×320 drawing fits the 483×330 area (xMidYMid meet)
    expect(L.body.scale).toBeCloseTo(1.03125, 5);
    expect(L.body.x).toBeCloseTo(28 + (483 - 412.5) / 2, 5);
  });

  it('draws one rung per unit with its seeded jitter', () => {
    const sc = buildScene(B01, { theme: MONO });
    const rungs = find(sc.body, (n) => n.tag === 'line' && n.attrs.stroke === MONO.data);
    expect(rungs.length).toBe(38 + 27 + 22 + 16 + 11 + 7);
    const first = rungs[0];
    const w = 14 - 1.5 + rndAbs(1, 2) * 3;
    expect(Number(first.attrs.x1)).toBeCloseTo(56 - w, 6);
    expect(Number(first.attrs.opacity)).toBeCloseTo(0.5 + rndAbs(2, 4) * 0.5, 6);
    expect(first.anim?.fx).toBe('fade');
  });

  it('follows each palette: Wire makes the largest bar orange, Palm shades by rank', () => {
    const wire = buildScene(B01, { theme: WIRE });
    expect(find(wire.body, (n) => n.tag === 'line' && n.attrs.stroke === WIRE.hero).length).toBe(38);
    expect(find(wire.body, (n) => n.tag === 'line' && n.attrs['stroke-width'] === 1.8).length).toBeGreaterThan(0);
    const palm = buildScene(B01, { theme: PALM });
    const colors = new Set(find(palm.body, (n) => n.tag === 'line' && Number(n.attrs['stroke-width']) > 1).map((n) => n.attrs.stroke));
    expect(colors.size).toBe(6);
    const caption = find(palm.body, (n) => n.tag === 'text' && (n.text ?? '').startsWith('ONE RUNG'))[0];
    expect(caption.text).toBe('ONE RUNG = $1K · SHADE = RANK · DOT MARKS EVERY FIFTH');
  });

  it('is a pure function: same input, same SVG', () => {
    const a = serialize(buildScene(B01, { theme: PORCELAIN }).root);
    const b = serialize(buildScene(B01, { theme: PORCELAIN }).root);
    expect(a).toBe(b);
  });

  it('exports clean SVG at any frame', () => {
    const sc = buildScene(B01, { theme: MONO });
    for (const t of [0, 0.3, 1]) {
      const svg = serialize(sc.root, { tau: timeAtProgress(t, sc.timeline), timing: sc.timing, idPrefix: 'x-' });
      expect(svg).toContain('viewBox="0 0 539 450"');
      expect(svg).not.toContain('var(--');
      expect(svg).not.toContain('foreignObject');
      expect(svg).not.toContain('data-cs-hit');
      expect(svg).not.toContain('paint-order');
    }
    // at t = 0 every rung is still invisible
    const start = serialize(sc.root, { tau: 0, timing: sc.timing });
    expect(start).toMatch(/<line[^>]*opacity="0"/);
  });

  it('shows a friendly message instead of crashing on bad data', () => {
    const sc = buildScene(B01, { theme: MONO, data: { rows: [{ label: 'A', value: 'lots' }] } });
    expect(sc.fatal).toBe(true);
    expect(sc.issues[0].message).toMatch(/at least 1 complete row/);
    expect(sc.issues.some((i) => /should be a number/.test(i.message))).toBe(true);
    const v = validateData(B01.dataSchema, { rows: [{ label: 'A', value: '1,200' }] });
    expect(v.data.rows[0].value).toBe(1200);
  });
});

describe('G01 Chunky Bars', () => {
  it('keeps its bar, axis and label geometry', () => {
    const sc = buildScene(G01, { theme: MONO });
    expect(sc.width).toBe(689);
    expect(sc.height).toBe(440);
    expect(sc.layout.body.w).toBeCloseTo(633, 5);
    const bars = find(sc.body, (n) => n.tag === 'path');
    expect(bars.length).toBe(4);
    // measured: bar.y = 198.689 / 54.188 / 99.345 / 154.959 with base 285.2 and width 65.832
    const tops = bars.map((b) => Number(/V([\d.]+)/.exec(String(b.attrs.d))![1]));
    const widths = bars.map((b) => {
      const d = String(b.attrs.d);
      const x0 = Number(/^M([\d.]+)/.exec(d)![1]);
      const x1 = Number(/H([\d.]+)A/.exec(d)![1]);
      return x1 - x0;
    });
    const r = 65.832 / 2;
    [198.689, 54.188, 99.345, 154.959].forEach((y, i) => expect(tops[i] - r).toBeCloseTo(y, 2));
    widths.forEach((w) => expect(w + r).toBeCloseTo(65.832, 2));
    // colours by rank: PRO (largest) gets ink
    expect(bars[1].attrs.fill).toBe('#1C1C1A');
  });

  it('animates from t (bars grow from the axis)', () => {
    const probe = buildScene(G01, { theme: MONO });
    const mid = buildScene(G01, { theme: MONO }, 0.3);
    const start = buildScene(G01, { theme: MONO }, 0);
    expect(find(start.body, (n) => n.tag === 'path').length).toBe(0);
    expect(find(mid.body, (n) => n.tag === 'path').length).toBeGreaterThan(0);
    expect(probe.timeline.natural).toBeCloseTo(0.9 + 3 * 0.11, 5);
  });

  it('renders in every palette without errors', () => {
    for (const theme of [...THEMES, themeFromPalette(paletteFromTheme(PALM))]) {
      const sc = buildScene(G01, { theme });
      expect(sc.fatal).toBe(false);
    }
  });
});

describe('N01 Force Graph, dense', () => {
  it('builds the demo network from its seeded generator', () => {
    const { model, issues } = buildGraph(N01.defaultData);
    expect(issues).toEqual([]);
    expect(model.groups.length).toBe(8);
    expect(model.nodes.filter((n) => n.hub).length).toBe(8);
    const kinds = new Map<string, number>();
    model.links.forEach((l) => kinds.set(l.kind, (kinds.get(l.kind) ?? 0) + 1));
    expect(kinds.get('spoke')).toBe(model.nodes.length - 8); // every service hangs off its hub
    expect(kinds.get('backbone')).toBeGreaterThan(0);
    expect(kinds.get('cross')).toBeGreaterThan(0);
  });

  it('is a pure function: seeded physics gives the same SVG every time', () => {
    const a = serialize(buildScene(N01, { theme: MONO }).root);
    const b = serialize(buildScene(N01, { theme: MONO }).root);
    expect(a).toBe(b);
    const mid1 = serialize(buildScene(N01, { theme: MONO }, 1.2).root);
    const mid2 = serialize(buildScene(N01, { theme: MONO }, 1.2).root);
    expect(mid1).toBe(mid2);
    expect(mid1).not.toBe(a);
    const other = serialize(buildScene(N01, { theme: MONO, settings: { seed: 2 } }).root);
    expect(other).not.toBe(a);
  });

  it('explains duplicate IDs and links to missing nodes instead of crashing', () => {
    const data: ChartData = {
      nodes: [
        { id: 'a', group: 'g', value: 1, type: 'hub' },
        { id: 'a', group: 'g', value: 2 },
        { id: 'b', group: 'g', value: 1 },
      ],
      links: [{ source: 'a', target: 'zzz' }],
    };
    const sc = buildScene(N01, { theme: MONO, data });
    const text = sc.issues.map((i) => i.message).join('\n');
    expect(text).toMatch(/“a” is used twice/);
    expect(text).toMatch(/no node with the ID “zzz”/);
    expect(find(sc.body, (n) => n.tag === 'circle').length).toBe(2);
  });

  it('draws saved positions exactly where they are (px from the centre), with no re-fit', () => {
    const data: ChartData = {
      nodes: [
        { id: 'hub', group: 'g', value: 9, type: 'hub', x: 0, y: 0 },
        { id: 'n1', group: 'g', value: 1, x: 400, y: -250 },
      ],
      links: [{ source: 'hub', target: 'n1' }],
    };
    const sc = buildScene(N01, { theme: MONO, data });
    const { w, h } = sc.layout.body;
    const [hub, n1] = find(sc.body, (n) => n.tag === 'circle');
    expect(Number(hub.attrs.cx)).toBeCloseTo(w / 2, 6);
    expect(Number(hub.attrs.cy)).toBeCloseTo(h / 2, 6);
    expect(Number(n1.attrs.cx)).toBeCloseTo(w / 2 + 400, 6);
    expect(Number(n1.attrs.cy)).toBeCloseTo(h / 2 - 250, 6);
  });

  it('renders in every palette, and exports SVG without live-only parts', () => {
    for (const theme of [...THEMES, themeFromPalette(paletteFromTheme(WIRE))]) {
      const sc = buildScene(N01, { theme });
      expect(sc.fatal).toBe(false);
      const svg = serialize(sc.root, { idPrefix: 'n-' });
      expect(svg).not.toContain('data-cs-');
      expect(svg).not.toContain('cs-hover-label');
      expect(svg).not.toContain('var(--');
    }
  });
});

describe('fonts', () => {
  it('offers nine fonts, each with letter widths', () => {
    expect(FONT_CHOICES.map((c) => c.value)).toEqual(['Inter', 'Aeonik', 'Roboto', 'Fira Sans', 'Montserrat', 'IBM Plex Serif', 'PT Serif', 'JetBrains Mono', 'Cascadia Mono']);
    for (const f of FONTS) if (f.name !== 'Inter') expect(TEXT_METRICS[f.name], f.name).toBeTruthy();
  });

  it('sets the chosen font on the chart, falling back to Inter', () => {
    expect(fontStack('Inter')).toBe('Inter, sans-serif');
    expect(fontStack('Aeonik')).toBe("'Aeonik', Inter, sans-serif");
    expect(fontStack('PT Serif')).toBe("'PT Serif', Inter, serif");
    expect(fontStack('Cascadia Mono')).toBe("'Cascadia Mono', Inter, monospace");
    expect(fontStack('Comic Sans')).toBe('Inter, sans-serif');
    expect(familyFromStack(fontStack('IBM Plex Serif'))).toBe('IBM Plex Serif');
    expect(buildScene(B01, { theme: MONO, settings: { fontFamily: 'Montserrat' } }).root.attrs['font-family']).toBe("'Montserrat', Inter, sans-serif");
  });

  it('draws a missing weight with the one a browser would pick', () => {
    const pt = fontInfo('PT Serif');
    expect(['400', '500', '600', '700', '800', '400i'].map((f) => weightFor(pt, f as Face))).toEqual([400, 400, 700, 700, 700, 400]);
    const plex = fontInfo('IBM Plex Serif');
    expect(weightFor(plex, '800')).toBe(700);
    expect(weightFor(fontInfo('Aeonik'), '600')).toBe(700);
  });

  it('measures text with the chosen font’s widths while its chart is drawn, then goes back to Inter', () => {
    const inter = measure('Revenue by plan', 16, 700);
    const widths = (family: string) => {
      const restore = selectTextFont(family);
      const w = measure('Revenue by plan', 16, 700);
      restore();
      return w;
    };
    // Montserrat runs wide, PT Serif narrow; monospaced fonts give every letter the same room
    expect(widths('Montserrat')).toBeGreaterThan(inter);
    expect(widths('PT Serif')).toBeLessThan(inter);
    expect(widths('Cascadia Mono')).toBeCloseTo(15 * 16 * (1200 / 2048), 9);
    expect(widths('JetBrains Mono')).toBeCloseTo(15 * 16 * 0.6, 9);
    // a character a font lacks is measured as Inter draws it
    const restore = selectTextFont('Aeonik');
    const circled = measure('①', 16, 400);
    restore();
    expect(circled).toBeCloseTo(measure('①', 16, 400), 9);
    expect(measure('Revenue by plan', 16, 700)).toBe(inter);
    buildScene(B01, { theme: MONO, settings: { fontFamily: 'Roboto' } });
    expect(measure('Revenue by plan', 16, 700)).toBe(inter);
  });

  it('wraps a long title earlier in a wide font', () => {
    const title = 'Revenue by plan for every region we sell in, quarter by quarter, before and after the price change';
    const lines = (fontFamily: string) => buildScene(B01, { theme: MONO, settings: { fontFamily, title } }).layout.title.lines.length;
    expect(lines('Montserrat')).toBeGreaterThanOrEqual(lines('Inter'));
    expect(lines('Cascadia Mono')).toBeGreaterThan(lines('PT Serif'));
  });
});

describe('catalog', () => {
  it('lists all 65 charts once', () => {
    expect(CATALOG.length).toBe(65);
    expect(new Set(CATALOG.map((c) => c.id)).size).toBe(65);
  });
});
