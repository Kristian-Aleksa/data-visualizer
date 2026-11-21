// Maps, large networks and extras: checks beyond the all-charts suite. The maps' outline data and
// placement, name matching, the shade steps, bubble mode and hover hooks; the big network cards'
// padding; and the extras' computed captions and counts.

import { describe, expect, it } from 'vitest';
import X01 from '../../src/charts/extras/X01';
import X03 from '../../src/charts/extras/X03';
import X04 from '../../src/charts/extras/X04';
import { lift, stepLabels } from '../../src/charts/maps/choropleth';
import { decodeRegions, decodeRing, projection } from '../../src/charts/maps/geo';
import { USA_REGIONS, USA_SCALE } from '../../src/charts/maps/geo-usa';
import { WORLD_REGIONS, WORLD_SCALE } from '../../src/charts/maps/geo-world';
import M01 from '../../src/charts/maps/M01';
import M02 from '../../src/charts/maps/M02';
import { US_NAMES, WORLD_NAMES } from '../../src/charts/maps/names';
import N02 from '../../src/charts/networks/N02';
import N03 from '../../src/charts/networks/N03';
import { buildScene } from '../../src/core/scene';
import { serialize } from '../../src/core/serialize';
import { measure } from '../../src/core/text/metrics';
import { MONO, PALM, WIRE } from '../../src/core/theme';
import type { ChartData, Settings } from '../../src/core/types';
import type { VNode } from '../../src/core/vnode';
import { INTERACTION_CSS } from '../../src/runtime/interact';

function find(root: VNode, pred: (n: VNode) => boolean): VNode[] {
  const out: VNode[] = [];
  const go = (n: VNode) => {
    if (pred(n)) out.push(n);
    n.children.forEach(go);
  };
  go(root);
  return out;
}
const body = (def: Parameters<typeof buildScene>[0], settings: Partial<Settings> = {}, data?: ChartData, theme = MONO) =>
  buildScene(def, { theme, settings, data }).body;
const textNode = (root: VNode, text: string) => find(root, (n) => n.tag === 'text' && n.text === text)[0];

/** The encoder in scripts/build-geo.mjs. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function encodeRing(ring: [number, number][], scale: number): string {
  const int = (n: number) => {
    let z = n < 0 ? -2 * n - 1 : 2 * n;
    let s = '';
    while (z >= 32) {
      s += ALPHABET[32 + (z % 32)];
      z = Math.floor(z / 32);
    }
    return s + ALPHABET[z];
  };
  let px = 0, py = 0, s = '';
  for (const [x, y] of ring) {
    const X = Math.round(x * scale), Y = Math.round(y * scale);
    s += int(X - px) + int(Y - py);
    px = X;
    py = Y;
  }
  return s;
}

const US_SPECIAL = { Alaska: { left: -131, top: 25, width: 15 }, Hawaii: { left: -110, top: 28, width: 5 }, 'Puerto Rico': { left: -76, top: 26, width: 2 } };

describe('map outlines', () => {
  it('read back exactly what the build script wrote', () => {
    const ring: [number, number][] = [[-87.359, 35.001], [-85.607, 34.985], [-85.431, 34.125], [179.999, -89.5], [0, 0]];
    expect(decodeRing(encodeRing(ring, 1000), 1000)).toEqual(ring);
    // 50 states, DC and Puerto Rico; every country but Antarctica
    expect(USA_REGIONS).toHaveLength(52);
    expect(WORLD_REGIONS.length).toBeGreaterThan(230);
    expect(WORLD_REGIONS.some(([name]) => name === 'Antarctica')).toBe(false);
  });

  it('place the US map: insets tucked in, longitude squeezed, centred', () => {
    const regions = decodeRegions(USA_REGIONS, USA_SCALE, US_SPECIAL);
    const P = projection(regions, { W: 633, H: 340, top: 10, bottom: 48, aspectScale: 0.75 });
    expect(P.view.y).toBe(10);
    expect(P.view.h).toBe(282);
    expect(P.view.x + P.view.w / 2).toBeCloseTo(633 / 2, 9);
    const ak = regions.find((r) => r.name === 'Alaska')!;
    expect(ak.box.x).toBe(-131);
    expect(ak.box.w).toBe(15);
    expect(ak.center[0]).toBeCloseTo(-123.5, 9); // an inset's label sits in the middle of its box
  });

  it('put each label on its region', () => {
    const ca = textNode(body(M01), 'CA 96k');
    // California's middle, in the left part of the map
    expect(Number(ca.attrs.x)).toBeGreaterThan(100);
    expect(Number(ca.attrs.x)).toBeLessThan(170);
    expect(Number(ca.attrs.y)).toBeGreaterThan(110);
    expect(Number(ca.attrs.y)).toBeLessThan(190);
    const world = body(M02);
    const xs = new Map<string, number>();
    for (const text of ['US 95k', 'IN 62k', 'UK 48k', 'DE 41k', 'BR 39k']) {
      const t = textNode(world, text);
      expect(t, text).toBeTruthy();
      xs.set(text, Number(t.attrs.x));
    }
    // west to east: the Americas, then Europe, then India
    expect(xs.get('US 95k')!).toBeLessThan(xs.get('UK 48k')!);
    expect(xs.get('BR 39k')!).toBeLessThan(xs.get('DE 41k')!);
    expect(xs.get('DE 41k')!).toBeLessThan(xs.get('IN 62k')!);
  });

  it('keep countries that cross the date line in one piece', () => {
    const russia = decodeRegions(WORLD_REGIONS, WORLD_SCALE).find((r) => r.name === 'Russia')!;
    expect(russia.box.x).toBeGreaterThan(0);
    expect(russia.box.x + russia.box.w).toBeGreaterThan(180);
    expect(russia.box.w).toBeLessThan(200);
  });

  it('crop the world to its box (58° S to 76° N)', () => {
    const regions = decodeRegions(WORLD_REGIONS, WORLD_SCALE);
    const P = projection(regions, { W: 1344, H: 400, top: 4, bottom: 36, aspectScale: 0.75, bounds: [-170, 76, 190, -58] });
    expect(P.view.w).toBeCloseTo((360 / 134) * 0.75 * 360, 6);
    expect(P.view.x).toBeCloseTo(672 - P.view.w / 2, 6);
    expect(P.y(76)).toBeCloseTo(4, 9);
    expect(P.y(-58)).toBeCloseTo(364, 9);
  });
});

describe('map names', () => {
  it('accept names, everyday names and codes', () => {
    expect(US_NAMES.find('CA')).toBe('California');
    expect(US_NAMES.find('washington, d.c.')).toBe('District of Columbia');
    expect(US_NAMES.find('Washington')).toBe('Washington');
    expect(WORLD_NAMES.find('DEU')).toBe('Germany');
    expect(WORLD_NAMES.find('de')).toBe('Germany');
    expect(WORLD_NAMES.find('South Korea')).toBe('South Korea');
    expect(WORLD_NAMES.find('Korea')).toBe('South Korea');
    expect(WORLD_NAMES.find('Czech Rep.')).toBe('Czechia');
    expect(WORLD_NAMES.find('United States')).toBe('United States of America');
    expect(WORLD_NAMES.find('Taiwan')).toBe('Taiwan');
    expect(WORLD_NAMES.find('Côte d’Ivoire')).toBe('Côte d\'Ivoire');
    expect(WORLD_NAMES.find('Türkiye')).toBe('Turkey');
    expect(WORLD_NAMES.find('Atlantis')).toBeUndefined();
  });

  it('use short codes for labels (UK, not GB)', () => {
    expect(WORLD_NAMES.code('United Kingdom')).toBe('UK');
    expect(US_NAMES.code('California')).toBe('CA');
    expect(WORLD_NAMES.code('Siachen Glacier')).toBe('Siachen Glacier');
  });

  it('report rows that are not on the map or come twice, and draw the rest', () => {
    const data: ChartData = { rows: [{ region: 'CA', value: 50 }, { region: 'Atlantis', value: 3 }, { region: 'California', value: 9 }] };
    const sc = buildScene(M01, { theme: MONO, data });
    expect(sc.fatal).toBe(false);
    expect(sc.issues.map((i) => i.message).join(' ')).toMatch(/Atlantis.*isn’t on this map.*California.*twice/);
    const ca = find(sc.body, (n) => n.tag === 'path' && n.tip?.startsWith('California —') === true)[0];
    expect(ca.attrs.fill).toBe('#4A4944'); // 50 → fourth shade
  });
});

describe('map shades and legend', () => {
  it('words the steps for the legend', () => {
    expect(stepLabels([10, 21, 39, 65], { numSuffix: 'k' })).toEqual(['≤9k', '10–20k', '21–38k', '39–64k', '65k+']);
    expect(stepLabels([0.5, 1, 1.5, 2], { numSuffix: '' })).toEqual(['<0.5', '0.5–1', '1–1.5', '1.5–2', '2+']);
  });

  it('shades a value of exactly 9 in the "≤9k" step', () => {
    const paths = find(body(M01), (n) => n.tag === 'path' && !!n.key);
    const fillOf = (name: string) => paths[USA_REGIONS.findIndex((r) => r[0] === name)].attrs.fill;
    expect(fillOf('Indiana')).toBe('#D8D7D1');
    expect(fillOf('California')).toBe('#1C1C1A');
    expect(fillOf('Wyoming')).toBe('#E4E3DC'); // no data
    const wire = find(body(M01, {}, undefined, WIRE), (n) => n.tag === 'path' && !!n.key);
    expect(wire[USA_REGIONS.findIndex((r) => r[0] === 'California')].attrs.fill).toBe('#F5572F');
  });

  it('lays the legend out: swatch, 10px, words, 10px, next swatch, centred', () => {
    const b = body(M01);
    const rects = find(b, (n) => n.tag === 'rect' && n.attrs.width === 11);
    const words = ['≤9k', '10–20k', '21–38k', '39–64k', '65k+'];
    expect(rects).toHaveLength(5);
    const widths = words.map((w) => measure(w, 9, 400));
    const total = widths.reduce((a, w) => a + 21 + w, 0) + 40;
    expect(Number(rects[0].attrs.x)).toBeCloseTo(316.5 - total / 2, 6);
    for (let k = 0; k < 4; k++) expect(Number(rects[k + 1].attrs.x) - Number(rects[k].attrs.x)).toBeCloseTo(31 + widths[k], 6);
    expect(Number(rects[0].attrs.y)).toBe(340 - 21 - 11);
  });

  it('lifts a hovered region’s colour by 10%', () => {
    expect(lift('#1C1C1A')).toBe('#1E1E1C');
    expect(lift('#D8D7D1')).toBe('#EDECE5'); // 216, 215, 209 × 1.1, cut to whole numbers
    expect(lift('rgba(8,31,92,.1)')).toBe('rgba(8,34,101,0.1)');
  });
});

describe('map bubbles and hover', () => {
  it('draws one bubble per value on a blank map, sized by area', () => {
    const b = body(M01, { display: 'bubbles' });
    const circles = find(b, (n) => n.tag === 'circle');
    expect(circles).toHaveLength(41);
    expect(Math.max(...circles.map((c) => Number(c.attrs.r)))).toBe(20);
    const fills = new Set(find(b, (n) => n.tag === 'path' && !!n.key).map((p) => p.attrs.fill));
    expect([...fills]).toEqual(['#E4E3DC']);
    const ca = circles.find((c) => c.tip?.startsWith('California'))!;
    const tx = circles.find((c) => c.tip?.startsWith('Texas'))!;
    expect(Number(tx.attrs.r)).toBeCloseTo(20 * Math.sqrt(72 / 96), 9);
    expect(ca.key).toBe(find(b, (n) => n.tag === 'path' && n.tip?.startsWith('California') === true)[0].key);
  });

  it('marks outlines for the live hover (outline, lift, bring to front) and keeps static files clean', () => {
    const b = body(M02, {}, undefined, PALM);
    const p = find(b, (n) => n.tag === 'path' && !!n.key)[0];
    expect(p.attrs['data-cs-raise']).toBe(1);
    expect(String(p.attrs.style)).toMatch(/--cs-glow:#43593B;--cs-glow-o:1;--cs-glow-w:1\.98;--cs-dim:1;--cs-hot-fill:/);
    expect(find(b, (n) => n.attrs.class === 'cs-hover-label').length).toBeGreaterThan(200);
    const svg = serialize(buildScene(M02, { theme: PALM }).root);
    expect(svg).not.toContain('--cs-');
    expect(svg).not.toMatch(/class="[^"]*cs-/);
    expect(svg).not.toContain('data-cs-');
    expect(INTERACTION_CSS).toContain('.cs-hover-label:not(.cs-hot){opacity:0}');
    expect(INTERACTION_CSS).toContain('--cs-hot-fill');
  });
});

describe('big network cards', () => {
  it('use the stand-alone pages’ 34px padding', () => {
    const n02 = buildScene(N02, { theme: MONO }).layout;
    expect(n02.body.x).toBe(34);
    expect(n02.body.w).toBe(1032);
    const n03 = buildScene(N03, { theme: MONO }).layout;
    expect(n03.region.w).toBe(1132);
    expect(n03.body.scale).toBeCloseTo(1132 / 1140, 9);
  });
});

describe('extras', () => {
  it('X01 shares the ticks out by largest remainder and writes its own caption', () => {
    const b = body(X01, { ticks: 50 });
    const counts = [0, 1, 2].map((i) => find(b, (n) => n.key === `seg-${i}`)[0].children.filter((c) => c.tag === 'line').length);
    expect(counts).toEqual([34, 11, 5]);
    expect(textNode(body(X01), '68 + 21 + 11 = 100 · DOT MARKS EVERY TENTH')).toBeTruthy();
  });

  it('X03 draws one face per person and counts everyone past the first answer', () => {
    expect(find(body(X03), (n) => n.key?.startsWith('a-') === true)).toHaveLength(100);
    expect(textNode(body(X03), '72%')).toBeTruthy();
    const data: ChartData = { rows: [{ answer: 'CALM', people: 10 }, { answer: 'WORRIED', people: 40 }] };
    expect(textNode(body(X03, {}, data), '80%')).toBeTruthy();
  });

  it('X04 inks one tick per person', () => {
    const b = body(X04);
    const inked = (i: number) => find(b, (n) => n.key === `d-${i}`)[0].children.filter((c) => c.tag === 'line' && c.attrs.stroke === MONO.text).length;
    expect([inked(0), inked(1)]).toEqual([82, 49]);
  });
});
