// B07 Stacked Rungs — one ladder per category, split into shaded segments with a one-rung gap
// between them; each segment's value sits beside it and the total sits on top.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, pick, type Theme } from '../../core/theme';
import type { ChartData, Settings } from '../../core/types';
import { el, hit, keyed, tip, txt } from '../../core/vnode';
import { captionLine, categoryLabel, label, plain } from './shared';

const DEMO: [string, number[]][] = [['NA', [18, 11, 7]], ['EU', [14, 9, 5]], ['APAC', [9, 7, 6]], ['LATAM', [5, 4, 2]]];
const SEG_KEYS = ['seg1', 'seg2', 'seg3', 'seg4'];

const unitText = (s: Settings, v: number) => `${s.unitPrefix ?? ''}${plain(v)}${s.unitSuffix ?? ''}`;

/** Segments that have at least one value in the data. */
const usedSegments = (data: ChartData) => SEG_KEYS.filter((k) => (data.rows ?? []).some((r) => r[k] !== null && r[k] !== undefined && String(r[k]).trim() !== ''));

function shadeWords(n: number, T: Theme): string[] {
  const first = pick(T, 'DARKEST', 'STRONGEST');
  return [[first], [first, 'PALE'], [first, 'MID', 'PALE'], [first, 'DARK', 'MID', 'PALE']][Math.max(0, Math.min(4, n) - 1)];
}

function autoCaption(s: Settings, T: Theme, data: ChartData): string {
  const segs = usedSegments(data);
  const words = shadeWords(segs.length, T);
  const names = segs.map((k, i) => `${words[i]} = ${String(s[`${k}Name`] ?? '').toUpperCase()}`);
  return [...names, `ONE RUNG = ${unitText(s, Number(s.unitValue)).toUpperCase()}`].join(' · ');
}

export default defineChart({
  id: 'B07',
  name: 'Stacked Rungs',
  family: 'basics',
  kinds: ['bars', 'part-to-whole'],
  description: 'Stacked columns made of rungs, with a breathing gap between segments.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 8,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'seg1', label: 'Segment 1', type: 'number', role: 'value', min: 0, help: 'Bottom segment (darkest). Name it under Chart options.' },
        { key: 'seg2', label: 'Segment 2', type: 'number', role: 'value', min: 0, required: false },
        { key: 'seg3', label: 'Segment 3', type: 'number', role: 'value', min: 0, required: false },
        { key: 'seg4', label: 'Segment 4', type: 'number', role: 'value', min: 0, required: false, help: 'Optional fourth segment.' },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, [a, b, c]]) => ({ label, seg1: a, seg2: b, seg3: c, seg4: null })) },
  text: {
    title: "Where each region's revenue sits",
    subtitle: 'one rung = $1k · three products stack up the ladder, darkest carries the most',
    source: 'STACKED RUNGS · MONO-BASIC · REVENUE MIX',
  },
  fields: [
    { key: 'seg1Name', label: 'Segment 1 name', group: 'options', section: 'Segments', type: 'text', default: 'CORE' },
    { key: 'seg2Name', label: 'Segment 2 name', group: 'options', section: 'Segments', type: 'text', default: 'ADD-ONS' },
    { key: 'seg3Name', label: 'Segment 3 name', group: 'options', section: 'Segments', type: 'text', default: 'SERVICES' },
    { key: 'seg4Name', label: 'Segment 4 name', group: 'options', section: 'Segments', type: 'text', default: '' },
    { key: 'segmentGap', label: 'Gap between segments', group: 'options', section: 'Segments', type: 'number', min: 0, max: 4, step: 1, unit: 'rungs', default: 1 },
    { key: 'unitValue', label: 'Value per rung', group: 'options', section: 'Rungs', type: 'number', min: 0.1, max: 1000, step: 0.1, default: 1 },
    { key: 'rungStep', label: 'Rung spacing', group: 'options', section: 'Rungs', type: 'number', min: 2, max: 14, step: 0.1, unit: 'px', default: 5.2 },
    { key: 'rungLength', label: 'Rung length', group: 'options', section: 'Rungs', type: 'number', min: 3, max: 26, step: 0.5, unit: 'px', default: 13, help: 'Half the width of a ladder.' },
    { key: 'widthJitter', label: 'Length jitter', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.4 },
    { key: 'rungWidth', label: 'Rung thickness', group: 'options', section: 'Rungs', type: 'number', min: 0.3, max: 4, step: 0.1, unit: 'px', default: 1, help: 'Colour palettes draw rungs 1.8× thicker.' },
    { key: 'opacityJitter', label: 'Opacity variation', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.4, help: 'Colour palettes cap this so thin lines stay visible.' },
    { key: 'columnSpacing', label: 'Column spacing', group: 'options', section: 'Columns', type: 'number', min: 30, max: 140, step: 1, unit: 'px', default: 76 },
    { key: 'segLabelGap', label: 'Segment label gap', group: 'options', section: 'Columns', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 7 },
    { key: 'labelGap', label: 'Total label gap', group: 'options', section: 'Columns', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 8 },
    { key: 'autoFit', label: 'Shrink to fit tall or many columns', group: 'options', section: 'Columns', type: 'boolean', default: true },
    { key: 'unitPrefix', label: 'Unit prefix', group: 'options', section: 'Units', type: 'text', default: '$' },
    { key: 'unitSuffix', label: 'Unit suffix', group: 'options', section: 'Units', type: 'text', default: 'k' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T, d) => autoCaption(s, T, d),
  paletteNeeds: ['categorical'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const segs = usedSegments(ctx.data);
    const S = segs.length;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), vals: segs.map((k) => Math.max(0, Number(r[k] ?? 0) || 0)) }));
    const n = rows.length;
    const unit = Math.max(1e-6, ctx.num('unitValue'));
    const cnt = (v: number) => Math.max(0, Math.round(v / unit));
    const base = 262, HW = ctx.num('rungLength');
    const gapR = Math.round(ctx.num('segmentGap'));
    let step = ctx.num('rungStep'), sp = ctx.num('columnSpacing');
    if (ctx.bool('autoFit')) {
      const tallest = Math.max(1, ...rows.map((r) => r.vals.reduce((a, v) => a + cnt(v), 0) + (S - 1) * gapR + 2));
      if (tallest * step > base - 34) step = (base - 34) / tallest;
      const span = 328 - 2 * (HW + 20);
      if ((n - 1) * sp > span) sp = span / Math.max(1, n - 1);
    }
    const x0 = (i: number) => 186 + (i - (n - 1) / 2) * sp;
    const shades = S <= 3 ? T.cat3 : T.cat4;
    const labelFill = (si: number) => {
      const c = shades[si];
      if (T.kind === 'mono') return c === '#C0BFB8' || si > 0 ? '#8F8E88' : c;
      return si < 3 ? T.cat3l[si] : T.cat4[si];
    };
    const jit = ctx.num('widthJitter');
    const sw = ctx.num('rungWidth') * boost(T, 1, 1.8);
    const oj = T.inkBoost ? Math.min(ctx.num('opacityJitter'), 1 - T.inkBoost.opacityFloor) : ctx.num('opacityJitter');
    rows.forEach(({ name, vals }, i) => {
      const x = x0(i);
      const g = keyed(el(s, 'g', {}), `stack-${i}`);
      let k0 = 0;
      vals.forEach((v, si) => {
        const c = cnt(v);
        const seg = el(g, 'g', {});
        tip(seg, `${name} ${String(ctx.s[`${segs[si]}Name`] ?? '')} — ${unitText(ctx.s, v)}`);
        for (let k = 0; k < c; k++) {
          const y = base - (k0 + k + si * gapR) * step, w = HW - jit + rnd(k + 1, i * 3 + si + 2) * 2 * jit;
          el(seg, 'line', {
            x1: x - w, y1: y, x2: x + w, y2: y, stroke: shades[si], 'stroke-width': sw,
            opacity: 1 - oj + rnd(k + 2, i + si + 4) * oj, class: 'fade', style: `animation-delay:${i * 0.09 + (k0 + k) * 0.012}s`,
          });
        }
        if (ctx.bool('dataLabels') && c > 0) {
          const midY = base - (k0 + c / 2 + si * gapR) * step;
          txt(seg, {
            x: x + HW + ctx.num('segLabelGap'), y: midY + 2.5, 'font-size': ctx.fs(8), 'font-weight': 800, fill: labelFill(si),
            class: 'fade', style: `animation-delay:${0.5 + i * 0.09 + si * 0.06}s`,
          }, label(ctx, v));
        }
        k0 += c;
      });
      const total = vals.reduce((a, b) => a + b, 0);
      const topK = k0 + (S - 1) * gapR;
      if (ctx.bool('dataLabels')) {
        txt(g, {
          x, y: base - topK * step - ctx.num('labelGap'), 'font-size': ctx.fs(10.5), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle',
          class: 'fade', style: `animation-delay:${0.6 + i * 0.09}s`,
        }, label(ctx, total));
      }
      categoryLabel(ctx, g, x, base + 18, name, i * 0.09);
      const hy = base - topK * step - 22;
      hit(g, x - HW - 3, hy, 2 * HW + 26, base + 24 - hy);
    });
    el(s, 'line', { x1: 36, y1: base + 4, x2: 364, y2: base + 4, stroke: T.grid, 'stroke-width': 0.8, class: 'fade' });
    captionLine(ctx, autoCaption(ctx.s, T, ctx.data), 306, 1.1);
  },
});
