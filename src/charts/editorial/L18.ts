// L18 Ridgeline — one ridge per group, made of vertical hairlines under an inked crest; rows
// overlap slightly and each sits on a paper slab that hides the row behind it. The peak dot
// carries the typical value. Each ridge comes from a centre and a spread (plus an optional small
// second bump), or from raw samples (the density is then estimated from them).

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { byPreset, type Theme } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { laterInk } from '../basics/shared';

const ROWS: [string, number, number][] = [['MOBILE', 3.2, 1.3], ['DESKTOP', 5.1, 1.9], ['API', 7.4, 2.3], ['IMPORTS', 10.8, 3.2], ['BATCH', 15.2, 4]];

const autoCaption = (T: Theme) =>
  T.id === 'palm' ? 'EACH CREST = ONE PIPELINE · DEEPER GREEN = FASTER · DOT = THE PEAK'
    : T.heroMode ? 'EACH CREST = ONE PIPELINE · THE AREA IS MADE OF HAIRLINES · RED DOT = THE PEAK'
      : 'EACH CREST = ONE PIPELINE · THE AREA IS MADE OF HAIRLINES · DOT = THE PEAK';

export default defineChart({
  id: 'L18',
  name: 'Ridgeline',
  family: 'editorial',
  kinds: ['distribution'],
  description: 'One hairline ridge per group, overlapping slightly; the peak dot carries the typical value.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [
      {
        key: 'rows',
        label: 'Ridges',
        minRows: 0,
        maxRows: 12,
        columns: [
          { key: 'name', label: 'Group', type: 'text', role: 'label' },
          { key: 'centre', label: 'Typical value', type: 'number', role: 'value', help: 'Where the ridge peaks.' },
          { key: 'spread', label: 'Spread', type: 'number', role: 'value', min: 0.0001, help: 'How wide the ridge is (one standard deviation).' },
        ],
      },
      {
        key: 'samples',
        label: 'Samples',
        minRows: 0,
        maxRows: 20000,
        columns: [
          { key: 'name', label: 'Group', type: 'text', role: 'group' },
          { key: 'value', label: 'Value', type: 'number', role: 'value' },
        ],
      },
    ],
  },
  defaultData: { rows: ROWS.map(([name, centre, spread]) => ({ name, centre, spread })), samples: [] },
  text: {
    title: 'Five pipelines, five tempos',
    subtitle: 'each crest = one pipeline\'s completion-time shape · the area is made of hairlines · dot = the peak',
    source: 'RIDGELINE · MONO-EDITORIAL · DATA PLATFORM',
  },
  fields: [
    {
      key: 'shapeFrom', label: 'Ridges come from', group: 'options', section: 'Data', type: 'select', default: 'params',
      options: [{ value: 'params', label: 'Typical value and spread (the Ridges table)' }, { value: 'samples', label: 'Raw samples (the Samples table)' }],
    },
    { key: 'bumpShare', label: 'Second bump height', group: 'options', section: 'Data', type: 'number', min: 0, max: 2, step: 0.01, default: 0.26, help: 'Adds a small later bump to each ridge. 0 turns it off.', when: (s) => s.shapeFrom !== 'samples' },
    { key: 'bumpAt', label: 'Second bump at', group: 'options', section: 'Data', type: 'number', min: 1, max: 5, step: 0.05, unit: '× typical', default: 2.1, when: (s) => s.shapeFrom !== 'samples' },
    { key: 'xMax', label: 'Axis end', group: 'options', section: 'Axis', type: 'number', min: 0.001, max: 1e9, step: 1, default: 24 },
    { key: 'tickEvery', label: 'Tick every', group: 'options', section: 'Axis', type: 'number', min: 0.001, max: 1e9, step: 1, default: 6 },
    { key: 'valueSuffix', label: 'Value suffix', group: 'options', section: 'Axis', type: 'text', default: 'h' },
    { key: 'ridgeHeight', label: 'Ridge height', group: 'options', section: 'Ridges', type: 'number', min: 5, max: 120, step: 1, unit: 'px', default: 54 },
    { key: 'rowPitch', label: 'Row spacing', group: 'options', section: 'Ridges', type: 'number', min: 10, max: 80, step: 1, unit: 'px', default: 44, help: 'Shrinks automatically when the rows wouldn’t fit.' },
    { key: 'samplesPerRidge', label: 'Points per ridge', group: 'options', section: 'Ridges', type: 'number', min: 8, max: 300, step: 1, default: 72, help: 'Every second one gets a hairline.' },
    { key: 'slabOpacity', label: 'Ridge cover', group: 'options', section: 'Ridges', type: 'number', min: 0, max: 1, step: 0.01, default: 0.96, help: 'How much each ridge hides the one behind it.' },
    { key: 'tooltipText', label: 'Tooltip wording', group: 'options', section: 'Units', type: 'text', default: 'most runs finish around', help: '“MOBILE — most runs finish around 3.2h”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, axes: true, grid: true, caption: true },
  caption: (_s, T) => autoCaption(T),
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  validate(data, s) {
    const fromSamples = String(s.shapeFrom) === 'samples';
    const n = fromSamples ? (data.samples ?? []).length : (data.rows ?? []).length;
    return n ? [] : [{ fatal: true, message: fromSamples ? 'Add some rows to the Samples table (group and value), or switch “Ridges come from” back.' : 'Add at least one ridge (group, typical value and spread).' }];
  },
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const X0 = 92, X1 = 372, N = Math.max(8, Math.round(ctx.num('samplesPerRidge'))), LIFT = ctx.num('ridgeHeight');
    const MAXH = ctx.num('xMax');
    const xs = Array.from({ length: N }, (_, k) => (k / (N - 1)) * MAXH);
    // each ridge: a name, its density at every point and the value it peaks at
    let ridges: { name: string; dens: number[]; centre: number }[];
    if (ctx.str('shapeFrom') === 'samples') {
      const groups = new Map<string, number[]>();
      for (const r of ctx.data.samples ?? []) {
        const g = String(r.name);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(Number(r.value));
      }
      ridges = [...groups].map(([name, vals]) => {
        const n = vals.length, mean = vals.reduce((a, b) => a + b, 0) / n;
        const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1)) || MAXH / 20;
        const bw = 1.06 * sd * Math.pow(n, -0.2); // Silverman's rule
        const dens = xs.map((h) => vals.reduce((a, v) => a + Math.exp(-((h - v) ** 2) / (2 * bw * bw)), 0));
        return { name, dens, centre: xs[dens.indexOf(Math.max(...dens))] };
      });
    } else {
      const share = ctx.num('bumpShare'), at = ctx.num('bumpAt');
      ridges = ctx.rows.map((r) => {
        const c = Number(r.centre), sp = Math.max(1e-4, Number(r.spread));
        return { name: String(r.name), centre: c, dens: xs.map((h) => Math.exp(-((h - c) ** 2) / (2 * sp * sp)) + share * Math.exp(-((h - c * at) ** 2) / (2 * (sp * 1.7) ** 2))) };
      });
    }
    const n = ridges.length;
    const rowY = (i: number) => 96 + i * Math.min(ctx.num('rowPitch'), n > 1 ? 176 / (n - 1) : Infinity);
    const ink = laterInk(T);
    const boostW = (w: number) => w * (T.inkBoost?.strokeScale ?? 1);
    const suffix = ctx.str('valueSuffix');
    ridges.forEach(({ name, dens, centre }, i) => {
      const y0 = rowY(i);
      const rc = T.ramp6[Math.min(i, T.ramp6.length - 1)];
      const dmax = Math.max(1e-12, ...dens);
      const pts = dens.map((d, k) => [X0 + (k / (N - 1)) * (X1 - X0), y0 - (d / dmax) * LIFT]);
      const crest = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ');
      const g = keyed(el(s, 'g', {}), `r-${i}`);
      el(g, 'path', { d: crest + ` L${X1} ${y0} L${X0} ${y0} Z`, fill: T.bg, 'fill-opacity': ctx.num('slabOpacity'), class: 'fade', style: `animation-delay:${i * 0.1}s` });
      pts.forEach(([px, py], k) => {
        if (k % 2) return;
        el(g, 'line', {
          x1: px, y1: y0, x2: px, y2: py, stroke: byPreset(T, { mono: '#8F8E88', porcelain: T.data2, palm: rc, wire: T.data2 }, T.data2), 'stroke-width': boostW(0.5),
          opacity: byPreset(T, { mono: 0.28, porcelain: 0.28, palm: 0.34, wire: 0.28 }, 0.28) + rnd(k + 1, i + 3) * 0.32, class: 'fade', style: `animation-delay:${i * 0.1 + k * 0.004}s`,
        });
      });
      el(g, 'path', { d: crest, fill: 'none', stroke: byPreset(T, { mono: ink, porcelain: ink, palm: rc, wire: ink }, ink), 'stroke-width': boostW(0.9), class: 'draw', style: `animation-delay:${0.1 + i * 0.1}s;animation-duration:.8s` });
      if (ctx.bool('showGrid')) el(g, 'line', { x1: X0, y1: y0, x2: X1, y2: y0, stroke: T.grid, 'stroke-width': boostW(0.7), class: 'fade', style: `animation-delay:${i * 0.1}s` });
      const pk = dens.indexOf(dmax), [px, py] = pts[pk];
      const dot = el(g, 'circle', { cx: px, cy: py, r: 2.6, fill: byPreset(T, { mono: ink, porcelain: ink, palm: rc, wire: T.hero }, ink), class: 'pop', style: `animation-delay:${0.6 + i * 0.1}s` });
      tip(dot, `${name} — ${ctx.str('tooltipText')} ${centre.toFixed(1)}${suffix}`);
      if (ctx.bool('dataLabels')) {
        txt(g, {
          x: px + 7, y: py + 1, 'font-size': ctx.fs(8), 'font-weight': 800, fill: byPreset(T, { mono: ink, porcelain: ink, palm: ink, wire: T.hero }, ink),
          style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:${0.7 + i * 0.1}s`, class: 'fade',
        }, centre.toFixed(1) + suffix);
      }
      if (ctx.bool('categoryLabels')) txt(g, { x: X0 - 10, y: y0 - 3, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: T.label, 'text-anchor': 'end', 'letter-spacing': '.06em', class: 'fade', style: `animation-delay:${i * 0.1}s` }, name);
    });
    if (ctx.bool('showAxes') && n) {
      const yb = rowY(n - 1), every = Math.max(MAXH / 100, ctx.num('tickEvery'));
      for (let h = 0, k = 0; h <= MAXH + 1e-9 && k < 101; h += every, k++) {
        const x = X0 + (h / MAXH) * (X1 - X0), hv = Math.round(h * 1e6) / 1e6;
        el(s, 'line', { x1: x, y1: yb + 4, x2: x, y2: yb + 9, stroke: T.floor, 'stroke-width': boostW(0.6), class: 'fade', style: 'animation-delay:.8s' });
        txt(s, { x, y: yb + 20, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle', class: 'fade', style: 'animation-delay:.85s' }, hv + suffix);
      }
    }
    if (ctx.s.showCaption !== false) {
      txt(s, { x: 200, y: 308, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faintData, 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:1.1s' }, ctx.str('caption').trim() || autoCaption(T));
    }
  },
});
