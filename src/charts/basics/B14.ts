// B14 Rung Histogram — one ladder per bin, one rung per unit. Bin edges are written between the
// ladders (a histogram's bins are ranges, not categories). The peak bin is labelled and a dashed
// flag marks the median.

import { defineChart } from '../../core/define';
import { ordinalWord } from '../../core/format';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, byPreset, type Theme } from '../../core/theme';
import type { ChartData, Issue, Settings } from '../../core/types';
import { el, hit, keyed, tip, txt } from '../../core/vnode';
import { captionLine, label, laterInk, numberWord, plain } from './shared';

const BIN = [6, 14, 22, 19, 13, 9, 6, 4, 3, 2, 1, 1];

/** Palm shades the ladders by height ("DEEPER GREEN = TALLER PILE"). */
const shadeOn = (s: Settings, T: Theme) => s.shadeByHeight === 'on' || (s.shadeByHeight === 'auto' && T.id === 'palm');

function autoCaption(s: Settings, T: Theme): string {
  const parts = [`ONE RUNG = ${String(s.rungMeaning ?? '').toUpperCase()}`];
  if (shadeOn(s, T)) parts.push(T.id === 'palm' ? 'DEEPER GREEN = TALLER PILE' : 'DEEPER = TALLER PILE');
  else parts.push(`BINS OF ${numberWord(Number(s.binWidth))} ${String(s.binUnitWord ?? '').toUpperCase()}`);
  const n = Math.round(Number(s.dotEvery));
  if (n > 0) parts.push(`DOT MARKS EVERY ${ordinalWord(n)}`);
  return parts.join(' · ');
}

/** Counts per bin, either typed in or worked out from raw values. */
function binsOf(data: ChartData, s: Settings): number[] {
  if (s.dataMode !== 'raw') return (data.bins ?? []).map((r) => Math.max(0, Number(r.count) || 0));
  const n = Math.max(1, Math.round(Number(s.binCount))), w = Math.max(1e-9, Number(s.binWidth)), start = Number(s.binStart);
  const out = new Array<number>(n).fill(0);
  for (const r of data.values ?? []) {
    const v = Number(r.value);
    if (!Number.isFinite(v)) continue;
    out[Math.max(0, Math.min(n - 1, Math.floor((v - start) / w)))]++;
  }
  return out;
}

export default defineChart({
  id: 'B14',
  name: 'Rung Histogram',
  family: 'basics',
  kinds: ['distribution', 'bars'],
  description: 'A histogram of rung ladders, with bin edges between them and a median flag.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [
      {
        key: 'bins',
        label: 'Bins',
        minRows: 0,
        maxRows: 40,
        columns: [{ key: 'count', label: 'Count', type: 'number', role: 'value', min: 0, help: 'How many fall in each bin, in order. Bin edges come from the options.' }],
      },
      {
        key: 'values',
        label: 'Raw values',
        minRows: 0,
        maxRows: 5000,
        columns: [{ key: 'value', label: 'Value', type: 'number', role: 'value', help: 'Used when “Data is” is set to raw values.' }],
      },
    ],
  },
  defaultData: { bins: BIN.map((count) => ({ count })), values: [] },
  text: {
    title: 'Most tickets resolve within six hours',
    subtitle: 'one rung = one ticket in a hundred · bins of two hours · the ladder shows the pile',
    source: 'RUNG HISTOGRAM · MONO-BASIC · SUPPORT DESK',
  },
  fields: [
    {
      key: 'dataMode', label: 'Data is', group: 'options', section: 'Bins', type: 'select', default: 'bins',
      options: [{ value: 'bins', label: 'Counts per bin (Bins table)' }, { value: 'raw', label: 'Raw values (Raw values table)' }],
    },
    { key: 'binStart', label: 'First bin starts at', group: 'options', section: 'Bins', type: 'number', min: -1e6, max: 1e6, step: 1, default: 0 },
    { key: 'binWidth', label: 'Bin width', group: 'options', section: 'Bins', type: 'number', min: 0.01, max: 1e6, step: 0.5, default: 2 },
    { key: 'binCount', label: 'Number of bins', group: 'options', section: 'Bins', type: 'number', min: 1, max: 40, step: 1, default: 12, when: (s) => s.dataMode === 'raw' },
    { key: 'axisUnit', label: 'Edge label unit', group: 'options', section: 'Bins', type: 'text', default: 'h', placeholder: 'e.g. h' },
    { key: 'binUnitWord', label: 'Bin unit in words', group: 'options', section: 'Bins', type: 'text', default: 'hours', help: 'Caption: “BINS OF TWO HOURS”.' },
    { key: 'edgeLabelEvery', label: 'Edge label every', group: 'options', section: 'Bins', type: 'number', min: 1, max: 10, step: 1, unit: 'edges', default: 2 },
    { key: 'unitValue', label: 'Count per rung', group: 'options', section: 'Rungs', type: 'number', min: 0.1, max: 1000, step: 0.1, default: 1 },
    { key: 'rungStep', label: 'Rung spacing', group: 'options', section: 'Rungs', type: 'number', min: 2, max: 14, step: 0.1, unit: 'px', default: 5.4 },
    { key: 'rungLength', label: 'Rung length', group: 'options', section: 'Rungs', type: 'number', min: 2, max: 20, step: 0.5, unit: 'px', default: 10.5, help: 'Half the width of a ladder.' },
    { key: 'widthJitter', label: 'Length jitter', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.4 },
    { key: 'rungWidth', label: 'Rung thickness', group: 'options', section: 'Rungs', type: 'number', min: 0.3, max: 4, step: 0.1, unit: 'px', default: 1, help: 'Colour palettes draw rungs 1.8× thicker.' },
    { key: 'opacityJitter', label: 'Opacity variation', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.45 },
    { key: 'dotEvery', label: 'Marker dot every', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 20, step: 1, unit: 'rungs', default: 5, help: '0 turns the marker dots off.' },
    {
      key: 'shadeByHeight', label: 'Shade ladders by height', group: 'options', section: 'Rungs', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }],
      help: 'Palm shades taller piles darker.',
    },
    { key: 'fillWidth', label: 'Spread bins across the width', group: 'options', section: 'Layout', type: 'boolean', default: true },
    { key: 'binPitch', label: 'Bin spacing', group: 'options', section: 'Layout', type: 'number', min: 8, max: 60, step: 0.5, unit: 'px', default: 27.5, when: (s) => s.fillWidth === false },
    { key: 'autoFit', label: 'Shrink to fit tall piles', group: 'options', section: 'Layout', type: 'boolean', default: true },
    { key: 'showMedian', label: 'Median flag', group: 'options', section: 'Median', type: 'boolean', default: true },
    {
      key: 'medianPlace', label: 'Flag position', group: 'options', section: 'Median', type: 'select', default: 'original',
      options: [{ value: 'original', label: 'In the median bin' }, { value: 'exact', label: 'Exactly, by interpolation' }],
      when: (s) => s.showMedian !== false,
    },
    { key: 'medianText', label: 'Flag text', group: 'options', section: 'Median', type: 'text', default: 'HALF RESOLVED BY HERE', when: (s) => s.showMedian !== false },
    { key: 'rungMeaning', label: 'One rung is', group: 'options', section: 'Units', type: 'text', default: 'one ticket in a hundred', help: 'Caption: “ONE RUNG = …”.' },
    { key: 'measure', label: 'What is counted', group: 'options', section: 'Units', type: 'text', default: 'tickets' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, T),
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  validate(data, s) {
    const issues: Issue[] = [];
    const mode = s.dataMode === 'raw' ? 'values' : 'bins';
    if (!(data[mode] ?? []).length) {
      issues.push({ table: mode, fatal: true, message: mode === 'bins' ? 'This chart needs at least 1 bin count in the Bins table.' : 'Add some numbers to the Raw values table (or switch “Data is” back to counts).' });
    }
    return issues;
  },
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const counts = binsOf(ctx.data, ctx.s);
    const n = counts.length;
    const unit = Math.max(1e-6, ctx.num('unitValue'));
    const rungs = counts.map((c) => Math.max(0, Math.round(c / unit)));
    const X0 = 44, base = 252, HW = ctx.num('rungLength');
    const PW = ctx.bool('fillWidth') ? 330 / Math.max(1, n) : ctx.num('binPitch');
    let step = ctx.num('rungStep');
    const top = Math.max(1, ...rungs);
    if (ctx.bool('autoFit') && top * step > base - 46) step = (base - 46) / top;
    const ink = laterInk(T);
    const shade = shadeOn(ctx.s, T);
    const ramp = [ink, T.ramp6[2], T.ramp6[3], T.ramp6[4]];
    const colour = (v: number) => (!shade ? ink : v > top * 0.75 ? ramp[0] : v > top * 0.45 ? ramp[1] : v > top * 0.2 ? ramp[2] : ramp[3]);
    const oj = ctx.num('opacityJitter') * byPreset(T, { mono: 1, porcelain: 1, palm: 0.32 / 0.45, wire: 1 }, 1);
    const jit = ctx.num('widthJitter');
    const sw = (w: number) => w * boost(T, 1, 1.8);
    const dotEvery = Math.round(ctx.num('dotEvery'));
    const start = ctx.num('binStart'), bw = ctx.num('binWidth'), u = ctx.str('axisUnit');
    const total = counts.reduce((a, b) => a + b, 0);
    const edge = (e: number) => plain(Math.round((start + e * bw) * 1000) / 1000);
    rungs.forEach((v, i) => {
      const x = X0 + i * PW + PW / 2;
      const g = keyed(el(s, 'g', {}), `bin-${i}`);
      tip(g, `${label(ctx, counts[i])} of ${label(ctx, total)} ${ctx.str('measure')} took ${edge(i)}–${edge(i + 1)}${u}`);
      for (let k = 0; k < v; k++) {
        const y = base - k * step, w = HW - jit + rnd(k + 1, i + 2) * 2 * jit;
        el(g, 'line', {
          x1: x - w, y1: y, x2: x + w, y2: y, stroke: colour(v), 'stroke-width': sw(ctx.num('rungWidth')),
          opacity: 1 - oj + rnd(k + 2, i + 4) * oj, class: 'fade', style: `animation-delay:${i * 0.06 + k * 0.012}s`,
        });
        if (dotEvery > 0 && k % dotEvery === dotEvery - 1) {
          el(g, 'circle', { cx: x + HW + 3.5, cy: y, r: 0.7, fill: T.faint, class: 'fade', style: `animation-delay:${i * 0.06 + k * 0.012}s` });
        }
      }
      const hy = base - Math.max(0, v - 1) * step - 22;
      hit(g, X0 + i * PW, hy, PW, base + 24 - hy);
    });
    const pk = counts.indexOf(Math.max(...counts));
    if (ctx.bool('dataLabels') && pk >= 0) {
      txt(s, {
        x: X0 + pk * PW + PW / 2, y: base - (Math.max(1, rungs[pk]) - 1) * step - 10, 'font-size': ctx.fs(11), 'font-weight': 800, fill: ink,
        'text-anchor': 'middle', class: 'fade', style: 'animation-delay:.8s',
      }, label(ctx, counts[pk]));
    }
    el(s, 'line', { x1: X0 - 4, y1: base + 4, x2: X0 + n * PW + 4, y2: base + 4, stroke: T.grid, 'stroke-width': sw(0.8), class: 'fade' });
    const every = Math.max(1, Math.round(ctx.num('edgeLabelEvery')));
    for (let e = 0; e <= n; e++) {
      const x = X0 + e * PW;
      el(s, 'line', { x1: x, y1: base + 4, x2: x, y2: base + (e % every === 0 ? 11 : 8), stroke: T.floor, 'stroke-width': sw(0.6), class: 'fade', style: `animation-delay:${e * 0.02}s` });
      if (e % every === 0 && ctx.bool('categoryLabels')) {
        txt(s, { x, y: base + 21, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle', class: 'fade', style: `animation-delay:${e * 0.02}s` }, edge(e) + u);
      }
    }
    if (ctx.bool('showMedian') && total > 0) {
      let acc = 0, mb = 0;
      for (let i = 0; i < n; i++) {
        if (acc + counts[i] >= total / 2) {
          mb = i;
          break;
        }
        acc += counts[i];
      }
      const frac = ctx.str('medianPlace') === 'exact' && counts[mb] > 0 ? (total / 2 - acc) / counts[mb] : 0.7;
      const mx = X0 + mb * PW + PW * frac;
      const flag = T.heroMode ? T.hero : T.id === 'palm' ? T.heat[1] : T.data2;
      el(s, 'line', {
        x1: mx, y1: base + 4, x2: mx, y2: base - rungs[mb] * step - 16, stroke: flag, 'stroke-width': sw(0.9), 'stroke-dasharray': '2 4',
        class: 'fade', style: 'animation-delay:1s',
      });
      txt(s, {
        x: mx + 4, y: base - rungs[mb] * step - 20, 'font-size': ctx.fs(7.5), 'font-weight': 800, fill: T.heroMode ? T.hero : T.label,
        class: 'fade', style: 'animation-delay:1.1s',
      }, ctx.str('medianText'));
    }
    captionLine(ctx, autoCaption(ctx.s, T), 306, 1.2, { fill: T.faintData });
  },
});
