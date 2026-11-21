// Editorial checks beyond the all-charts suite: the split card, portable text baselines, and the
// places where hand-placed or hard-coded bits became data and settings.

import { describe, expect, it } from 'vitest';
import L03 from '../../src/charts/editorial/L03';
import L05 from '../../src/charts/editorial/L05';
import L06 from '../../src/charts/editorial/L06';
import L09 from '../../src/charts/editorial/L09';
import L14 from '../../src/charts/editorial/L14';
import L17 from '../../src/charts/editorial/L17';
import L18 from '../../src/charts/editorial/L18';
import L19 from '../../src/charts/editorial/L19';
import { buildScene } from '../../src/core/scene';
import { portableBaseline, serialize } from '../../src/core/serialize';
import { X_HEIGHT } from '../../src/core/text/metrics';
import { MONO, PORCELAIN } from '../../src/core/theme';
import type { ChartData } from '../../src/core/types';
import type { VNode } from '../../src/core/vnode';

function find(root: VNode, pred: (n: VNode) => boolean): VNode[] {
  const out: VNode[] = [];
  const go = (n: VNode) => {
    if (pred(n)) out.push(n);
    n.children.forEach(go);
  };
  go(root);
  return out;
}
const texts = (root: VNode) => find(root, (n) => n.tag === 'text' && n.text !== undefined);

describe('portable text baselines', () => {
  it('turns dominant-baseline into the offset Chrome applies, before the label’s own rotation', () => {
    const a = portableBaseline({ x: 10, y: 20, 'font-size': 7, 'dominant-baseline': 'middle', transform: 'rotate(-30 10 20)' });
    expect(a['dominant-baseline']).toBeUndefined();
    expect(Number(a.y)).toBeCloseTo(20 + (X_HEIGHT / 2) * 7, 9);
    expect(a.transform).toBe('rotate(-30 10 20)');
    expect(Number(portableBaseline({ y: 0, 'font-size': 8, 'dominant-baseline': 'central' }).y)).toBeCloseTo(3, 9); // (8 − 2) / 2 at 8 px
    const svg = serialize(buildScene(L05, { theme: MONO }).root);
    expect(svg).not.toContain('dominant-baseline');
  });
});

describe('L03 Barcode Lollipop', () => {
  it('puts the text in a column beside the chart (split card)', () => {
    const sc = buildScene(L03, { theme: MONO });
    const { body } = sc.layout;
    expect(body.scale).toBeCloseTo(340 / 300, 9);
    expect(body.x).toBeCloseTo(28 + 250 + 30 + (1064 - 800 * (340 / 300)) / 2, 6);
    expect(body.y).toBeCloseTo(28, 9);
    const frameTexts = texts(sc.root).filter((t) => !find(sc.body, (n) => n === t).length);
    expect(frameTexts.find((t) => t.text?.startsWith('Every hairline'))?.attrs.x).toBe(28);
    expect(frameTexts.find((t) => t.text?.includes('WEEKDAY PEAK'))?.attrs.x).toBe(28);
    expect(frameTexts.find((t) => t.text?.startsWith('BARCODE LOLLIPOP'))?.attrs.x).toBe(308);
  });

  it('hollows days 6 and 7 of each week by default, or the real weekends from the dates', () => {
    const hollow = (setting: string) => find(buildScene(L03, { theme: MONO, settings: { hollowDays: setting } }).body, (n) => n.tag === 'circle' && n.attrs.fill === MONO.bg).map((n) => Number(n.attrs.cx));
    const x = (d: number) => 18 + d * 8.53;
    expect(hollow('original').slice(0, 2).map((v) => Math.round(v * 100))).toEqual([x(5), x(6)].map((v) => Math.round(v * 100)));
    // 1 April 2026 is a Wednesday: the first weekend is days 3 and 4
    expect(hollow('weekends').slice(0, 2).map((v) => Math.round(v * 100))).toEqual([x(3), x(4)].map((v) => Math.round(v * 100)));
    expect(hollow('none')).toEqual([]);
  });
});

describe('L05 Radial Convergence', () => {
  it('takes each item’s theme from the data, in the themes table’s order', () => {
    const data: ChartData = {
      items: [{ item: 'a', theme: 'B' }, { item: 'b', theme: 'A' }, { item: 'c', theme: 'NEW' }],
      themes: [{ theme: 'A' }, { theme: 'B' }],
    };
    const labels = texts(buildScene(L05, { theme: MONO, data }).body).map((t) => t.text).filter((t) => t?.includes(' · '));
    expect(labels).toEqual(['A · 1', 'B · 1', 'NEW · 1']);
  });
});

describe('L06 Cluster Field', () => {
  it('places islands without a position on a ring inside the drawing', () => {
    const data: ChartData = { rows: [{ name: 'CORE', members: 10 }, { name: 'ONE', members: 5 }, { name: 'TWO', members: 5 }, { name: 'THREE', members: 5 }] };
    const sc = buildScene(L06, { theme: MONO, data });
    const centres = find(sc.body, (n) => n.tag === 'circle' && n.attrs.r === 3.5);
    expect(centres.length).toBe(3);
    for (const c of centres) {
      expect(Number(c.attrs.cx)).toBeGreaterThanOrEqual(40);
      expect(Number(c.attrs.cx)).toBeLessThanOrEqual(800);
      expect(Number(c.attrs.cy)).toBeGreaterThanOrEqual(40);
      expect(Number(c.attrs.cy)).toBeLessThanOrEqual(276);
    }
    expect(texts(sc.body).some((t) => t.text === 'CORE · 10')).toBe(true);
  });
});

describe('L09 Bubble Almanac', () => {
  it('draws the notes and events from data', () => {
    const sc = buildScene(L09, { theme: MONO });
    const t = texts(sc.body).map((x) => x.text);
    expect(t).toContain('chat tickets triple after mobile GA');
    expect(t).toContain('AI deflection live');
    const none = buildScene(L09, { theme: MONO, data: { ...L09.defaultData, notes: [], events: [] } });
    expect(texts(none.body).some((x) => x.text === 'IMPORTANT EVENTS')).toBe(false);
  });
});

describe('L14 Hundred Field', () => {
  it('adds up its own footnote', () => {
    expect(texts(buildScene(L14, { theme: MONO }).body).some((t) => t.text === 'ONE DOT = ONE PERSON · 41 + 35 + 12 + 12 = 100')).toBe(true);
    const data: ChartData = { rows: [{ name: 'YES', people: 60 }, { name: 'NO', people: 40 }] };
    expect(texts(buildScene(L14, { theme: MONO, data }).body).some((t) => t.text === 'ONE DOT = ONE PERSON · 60 + 40 = 100')).toBe(true);
  });
});

describe('L17 Calendar Heat', () => {
  it('spaces months evenly, or where each month starts', () => {
    const month = (setting: string, m: string) => texts(buildScene(L17, { theme: MONO, settings: { monthLabels: setting } }).body).find((t) => t.text === m)!;
    const X = (w: number) => 56 + w * 14.8;
    expect(Number(month('even', 'MAR').attrs.x)).toBeCloseTo(X(Math.round((2 * 52) / 12)), 6);
    // 1 March 2025 falls in the week starting Monday 24 February (week 8)
    expect(Number(month('dates', 'MAR').attrs.x)).toBeCloseTo(X(8), 6);
  });
});

describe('L18 Ridgeline', () => {
  it('can build ridges from raw samples', () => {
    const samples = [...Array.from({ length: 40 }, (_, i) => ({ name: 'FAST', value: 4 + Math.sin(i) * 0.8 })), ...Array.from({ length: 40 }, (_, i) => ({ name: 'SLOW', value: 16 + Math.cos(i) * 2 }))];
    const sc = buildScene(L18, { theme: MONO, settings: { shapeFrom: 'samples' }, data: { rows: [], samples } });
    expect(sc.fatal).toBe(false);
    const peaks = texts(sc.body).filter((t) => /h$/.test(t.text ?? '') && Number(t.attrs['font-size']) === 8).map((t) => parseFloat(t.text!));
    expect(peaks.length).toBe(2);
    expect(Math.abs(peaks[0] - 4)).toBeLessThan(1);
    expect(Math.abs(peaks[1] - 16)).toBeLessThan(1.5);
  });
});

describe('L19 Parallel Coordinates', () => {
  it('inks the best all-rounder on the axes that count, or the one you name', () => {
    const named = (settings: Record<string, string>, theme = MONO) => texts(buildScene(L19, { theme, settings }).body).filter((t) => Number(t.attrs['font-size']) === 9).map((t) => t.text);
    expect(named({})).toEqual(['Flows']);
    expect(named({ pick: 'editor' })).toEqual(['Editor']);
    expect(named({}, PORCELAIN)).toEqual(['Flows']);
  });
});
