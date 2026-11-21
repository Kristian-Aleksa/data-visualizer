// Glance checks that go beyond the all-charts suite: the plot helpers (axes, rounded shapes,
// smoothed lines), ring and tree layouts, force physics, donut labels and the shape morph.

import { describe, expect, it } from 'vitest';
import G04 from '../../src/charts/glance/G04';
import G05 from '../../src/charts/glance/G05';
import G07 from '../../src/charts/glance/G07';
import G09 from '../../src/charts/glance/G09';
import { morphPath, outline, pathBox } from '../../src/charts/glance/morph';
import { layoutPieLabels } from '../../src/charts/glance/pielabels';
import { axisNumber, crisp, roundRect, roundSector, smoothLine, tickStep, valueAxis } from '../../src/charts/glance/plot';
import { buildGraph, simulate } from '../../src/charts/shared/forcegraph';
import { ringPositions } from '../../src/charts/shared/ring';
import { buildScene } from '../../src/core/scene';
import { serialize } from '../../src/core/serialize';
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

describe('plot helpers', () => {
  it('picks round tick steps and widens free ends to whole steps', () => {
    expect(tickStep(520, 5)).toBe(100);
    expect(tickStep(0.9, 5)).toBe(0.2);
    expect(tickStep(30, 5)).toBe(5);
    expect(tickStep(37, 5)).toBe(10);
    const a = valueAxis(3, 487);
    expect(a).toMatchObject({ min: 0, max: 500, interval: 100 });
    expect(a.ticks).toEqual([0, 100, 200, 300, 400, 500]);
    // fixed ends stay put; ticks only on whole steps inside them
    const b = valueAxis(0, 0, { min: 5, max: 26 });
    expect([b.min, b.max]).toEqual([5, 26]);
    expect(b.ticks).toEqual([5, 10, 15, 20, 25]);
    // `scale` doesn't stretch to zero; negatives work; one value gets room
    expect(valueAxis(6.6, 9.1, { scale: true }).min).toBeGreaterThan(0);
    expect(valueAxis(-42, 18).ticks).toContain(0);
    expect(valueAxis(0, 0)).toMatchObject({ min: 0, max: 1 });
  });

  it('formats axis numbers without floating-point noise', () => {
    expect(axisNumber(1234567)).toBe('1,234,567');
    expect(axisNumber(0.1 + 0.2)).toBe('0.3');
    expect(axisNumber(-0)).toBe('0');
  });

  it('snaps hairlines to whole pixels', () => {
    expect(crisp(10.2)).toBe(10.5);
    expect(crisp(10.7, 2)).toBe(11);
  });

  it('keeps rounded corners within half a side and handles negative sizes', () => {
    expect(pathBox(roundRect(10, 20, 30, 100, [6, 6, 0, 0]))).toMatchObject({ x: 10, y: 20, w: 30, h: 100 });
    // a 4px-tall bar can't have 6px corners: they shrink to 2px
    expect(roundRect(0, 0, 40, 4, 6)).toContain('A2 2 0 0 1');
    const flipped = pathBox(roundRect(50, 10, -30, -8, 3));
    expect(flipped.x).toBeCloseTo(20, 6);
    expect(flipped.y).toBeCloseTo(2, 6);
  });

  it('draws ring slices round the given centre', () => {
    const d = roundSector({ cx: 100, cy: 80, r0: 20, r: 60, startAngle: 0, endAngle: Math.PI / 2, cornerRadius: 4 });
    expect(d).toMatch(/^M/);
    expect(d).toMatch(/Z$/);
    const box = pathBox(d);
    // a quarter from three o'clock to six o'clock: right and below the centre
    expect(box.x).toBeGreaterThan(100 - 1e-6);
    expect(box.y).toBeGreaterThan(80 - 1e-6);
    expect(box.x + box.w).toBeCloseTo(160, 0);
    expect(box.y + box.h).toBeCloseTo(140, 0);
  });

  it('smooths lines without overshooting a peak', () => {
    const pts: [number, number][] = [[0, 50], [10, 10], [20, 50], [30, 40]];
    const d = smoothLine(pts, 0.5);
    const ys = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0])).filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...ys)).toBeLessThanOrEqual(50);
    expect(smoothLine(pts, 0)).toBe('M0 50L10 10L20 50L30 40');
  });
});

describe('ring layout', () => {
  it('spaces equal dots evenly and gives big dots more room', () => {
    const even = ringPositions([10, 10, 10, 10], 100, 0, 0);
    even.forEach(([x, y]) => expect(Math.hypot(x, y)).toBeCloseTo(100, 6));
    const gap = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    expect(gap(even[0], even[1])).toBeCloseTo(gap(even[1], even[2]), 6);
    const mixed = ringPositions([60, 10, 10, 10], 100, 0, 0);
    expect(gap(mixed[0], mixed[1])).toBeGreaterThan(gap(mixed[1], mixed[2]));
  });

  it('puts G04’s teams on one circle', () => {
    const sc = buildScene(G04, { theme: MONO });
    const dots = find(sc.body, (n) => n.tag === 'circle');
    expect(dots.length).toBeGreaterThan(5);
    expect(Number(dots[0].attrs.r)).toBeCloseTo((52 * 0.62) / 2, 6);
  });

  it('reports links to missing nodes and leaves them out', () => {
    const data: ChartData = { nodes: [{ id: 'A', value: 5 }, { id: 'B', value: 5 }], links: [{ source: 'A', target: 'Z', weight: 1 }, { source: 'A', target: 'B', weight: 2 }] };
    const sc = buildScene(G04, { theme: MONO, data });
    expect(sc.issues.map((i) => i.message).join(' ')).toMatch(/no node called “Z”/);
    expect(find(sc.body, (n) => n.tag === 'path' && n.attrs.fill === 'none').length).toBe(1);
  });
});

describe('G05 Tree', () => {
  it('lays out a tidy tree: root on the left, leaves one row apart, groups two', () => {
    const sc = buildScene(G05, { theme: MONO });
    const dots = find(sc.body, (n) => n.tag === 'circle');
    expect(dots.length).toBe(18);
    expect(Number(dots[0].attrs.cx)).toBeCloseTo(64, 6);
    expect(Number(dots[0].attrs.cy)).toBeCloseTo(8 + (8.75 * 304) / 17, 4);
    const github = dots[dots.length - 1];
    expect(Number(github.attrs.cx)).toBeCloseTo(64 + 473, 6);
    expect(Number(github.attrs.cy)).toBeCloseTo(8 + (16 * 304) / 17, 4);
  });

  it('explains duplicates, second roots, missing parents and loops', () => {
    const rows = [
      { name: 'Root', parent: '' },
      { name: 'A', parent: 'Root' },
      { name: 'A', parent: 'Root' },
      { name: 'Other root', parent: '' },
      { name: 'B', parent: 'Nowhere' },
      { name: 'C', parent: 'D' },
      { name: 'D', parent: 'C' },
    ];
    const sc = buildScene(G05, { theme: MONO, data: { rows } });
    const msg = sc.issues.map((i) => i.message).join('\n');
    expect(sc.fatal).toBe(false);
    expect(msg).toMatch(/“A” is already in the table/);
    expect(msg).toMatch(/“Root” is already the root/);
    expect(msg).toMatch(/no “Nowhere” for “B”/);
    expect(msg).toMatch(/“C”, “D”: no chain of parents leads back to the root/);
    expect(find(sc.body, (n) => n.tag === 'circle').length).toBe(2);
    const none = buildScene(G05, { theme: MONO, data: { rows: [{ name: 'X', parent: 'Y' }] } });
    expect(none.fatal).toBe(true);
  });
});

describe('G09 Force Graph', () => {
  const params = { repulsion: 90, linkMin: 73, linkMax: 73, longLink: 73, gravity: 0.12, friction: 0.4, ticks: 300, seed: 7, startBox: [600, 300] as [number, number] };

  it('settles over 4 s into a hub-and-spokes layout', () => {
    const sc = buildScene(G09, { theme: MONO });
    expect(sc.timeline.natural).toBeCloseTo(4, 6);
    const { model } = buildGraph(G09.defaultData);
    const res = simulate(model, params);
    expect(res.frames.length).toBe(301);
    const fin = res.frames[300];
    expect(Math.hypot(fin[0], fin[1])).toBeLessThan(40); // the hub ends near the centre
    for (let i = 1; i < model.nodes.length; i++) {
      const d = Math.hypot(fin[2 * i] - fin[0], fin[2 * i + 1] - fin[1]);
      expect(d, model.nodes[i].id).toBeGreaterThan(40);
      expect(d, model.nodes[i].id).toBeLessThan(180);
    }
    expect(simulate(model, { ...params, seed: 8 }).frames[300]).not.toEqual(fin);
  });

  it('puts dragged (saved) positions exactly where they were dropped', () => {
    const data: ChartData = {
      nodes: [{ id: 'Hub', value: 30, type: 'hub', x: 0, y: 0 }, { id: 'App', value: 10, type: 'app', x: 120, y: -40 }],
      links: [{ source: 'App', target: 'Hub', weight: null }],
    };
    const sc = buildScene(G09, { theme: MONO, data });
    const { w, h } = sc.layout.body;
    const [hub, app] = find(sc.body, (n) => n.tag === 'circle');
    expect(Number(hub.attrs.cx)).toBeCloseTo(w / 2, 6);
    expect(Number(app.attrs.cx)).toBeCloseTo(w / 2 + 120, 6);
    expect(Number(app.attrs.cy)).toBeCloseTo(h / 2 - 40, 6);
  });

  it('keeps the drag hooks out of exported SVG', () => {
    const svg = serialize(buildScene(G09, { theme: PORCELAIN }).root, { idPrefix: 'g-' });
    expect(svg).not.toContain('data-cs-');
  });
});

describe('G07 Scatter Morph', () => {
  it('cycles scatter → bars → donut, looping by default', () => {
    expect(buildScene(G07, { theme: MONO }).timeline.natural).toBeCloseTo(9, 9);
    expect(buildScene(G07, { theme: MONO, settings: { animLoop: false } }).timeline.natural).toBeCloseTo(10.1, 9);
    const dots = (t: number) => find(buildScene(G07, { theme: MONO }, t).body, (n) => n.tag === 'circle').length;
    expect(dots(2)).toBe(12); // holding the scatter
    expect(dots(3.5)).toBe(0); // morphing into bars
    expect(dots(Infinity)).toBe(12); // still frame
  });

  it('draws each still view on its own', () => {
    const bars = buildScene(G07, { theme: MONO, settings: { stillView: 'bars' } });
    const tilted = texts(bars.body).filter((t) => String(t.attrs.transform ?? '').startsWith('rotate(-38'));
    expect(tilted.length).toBe(12);
    const donut = buildScene(G07, { theme: MONO, settings: { stillView: 'donut' } });
    const slices = find(donut.body, (n) => n.tag === 'path' && n.attrs.stroke === MONO.bg);
    expect(slices.length).toBe(12);
    expect(texts(donut.body).length).toBeGreaterThanOrEqual(10);
  });

  it('lines donut labels up in a column on each side, a line apart', () => {
    const n = 12;
    const items = Array.from({ length: n }, (_, i) => ({ text: `Item ${i}`, width: 30, startAngle: Math.PI * 1.5 + (i * Math.PI * 2) / n, endAngle: Math.PI * 1.5 + ((i + 1) * Math.PI * 2) / n, priority: 100 }));
    const out = layoutPieLabels(items, { cx: 300, cy: 160, r: 110, len: 15, len2: 30, gap: 5, lineHeight: 11, view: { x: 0, y: 0, w: 600, h: 320 }, measure: (s) => s.length * 5 });
    for (const side of ['left', 'right'] as const) {
      const list = out.filter((l) => l.align === side && !l.hidden).sort((a, b) => a.y - b.y);
      expect(new Set(list.map((l) => l.x)).size).toBe(1);
      for (let i = 1; i < list.length; i++) expect(list[i].y - list[i - 1].y).toBeGreaterThanOrEqual(11 - 1e-9);
      // the line ends next to its label
      for (const l of list) expect(Math.abs(l.points[2][0] - l.x)).toBeCloseTo(5, 9);
    }
  });

  it('never leaves two visible donut labels overlapping', () => {
    const n = 40;
    const items = Array.from({ length: n }, (_, i) => ({ text: `Item ${i}`, width: 30, startAngle: Math.PI * 1.5 + (i * Math.PI * 2) / n, endAngle: Math.PI * 1.5 + ((i + 1) * Math.PI * 2) / n, priority: 100 }));
    const out = layoutPieLabels(items, { cx: 300, cy: 160, r: 110, len: 15, len2: 30, gap: 5, lineHeight: 9.2, view: { x: 0, y: 0, w: 600, h: 320 }, measure: (s) => s.length * 5 });
    const shown = out.filter((l) => !l.hidden);
    expect(shown.length).toBeGreaterThan(10);
    for (let i = 0; i < shown.length; i++) {
      for (let j = i + 1; j < shown.length; j++) {
        const a = shown[i], b = shown[j];
        const ax = a.align === 'left' ? a.x : a.x - 30, bx = b.align === 'left' ? b.x : b.x - 30;
        const overlapX = Math.min(ax + 30, bx + 30) - Math.max(ax, bx), overlapY = 9.2 - Math.abs(a.y - b.y);
        expect(overlapX > 0.05 && overlapY > 0.05, `${a.text} / ${b.text}`).toBe(false);
      }
    }
  });
});

describe('shape morph', () => {
  it('traces outlines and blends between them', () => {
    const bar = roundRect(10, 20, 30, 100, [6, 6, 0, 0]);
    const box = pathBox(bar);
    expect(box.x).toBeCloseTo(10, 6);
    expect(box.y).toBeCloseTo(20, 6);
    expect(box.w).toBeCloseTo(30, 6);
    expect(box.h).toBeCloseTo(100, 6);
    const dot = 'M60 50A10 10 0 1 1 40 50A10 10 0 1 1 60 50Z';
    expect(outline(dot).length).toBeGreaterThan(40);
    const near = (a: ReturnType<typeof pathBox>, b: ReturnType<typeof pathBox>) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));
    expect(near(pathBox(morphPath(bar, dot, 0)), box)).toBeLessThan(1);
    expect(near(pathBox(morphPath(bar, dot, 1)), pathBox(dot))).toBeLessThan(0.5);
    const mid = pathBox(morphPath(bar, dot, 0.5));
    expect(mid.y).toBeGreaterThan(20);
    expect(mid.y + mid.h).toBeLessThan(120);
    // a missing shape grows from the other one's middle instead of failing
    expect(morphPath('', dot, 0)).toMatch(/^M50 50/);
  });
});
