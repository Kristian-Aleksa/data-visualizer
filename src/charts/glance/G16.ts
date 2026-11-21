// G16 Draw-in + Counter — a running total draws itself left to right while the headline number
// counts up in step with it (both on the same cubic ease-out).

import { parseColor, toHex } from '../../core/color';
import { defineChart } from '../../core/define';
import { cubicOut } from '../../core/ease';
import { formatNumber } from '../../core/format';
import { rndSigned as rnd } from '../../core/rnd';
import { el, txt } from '../../core/vnode';
import { categories, MID, progress, smoothArea, smoothLine } from './plot';
import { gFaint, glanceFrame, hi } from './shared';
import { monthName, parseDate } from '../basics/shared';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];
const DAILY = Array.from({ length: 180 }, (_, i) => 14 + 10 * Math.sin(i / 29) + i * 0.12 + rnd(i + 1, 3) * 6);

export default defineChart({
  id: 'G16',
  name: 'Draw-in + Counter',
  family: 'glance',
  kinds: ['lines', 'time'],
  description: 'A running total draws itself in one stroke while the headline number counts up.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 2,
      maxRows: 2000,
      columns: [
        { key: 'label', label: 'Day', type: 'date', role: 'date', required: false, help: 'A date (YYYY-MM-DD) puts month names at month starts; any other label is shown every “Time label every” rows.' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', help: 'The amount for that day (the chart adds them up).' },
      ],
    }],
  },
  defaultData: { rows: DAILY.map((v, i) => ({ label: MONTHS[Math.floor(i / 30)], value: Math.round(v * 1000) / 1000 })) },
  text: {
    title: 'H1 revenue, drawn in one stroke',
    subtitle: 'cumulative ARR · the line draws, the number counts · click to replay',
    source: 'DRAW-IN + COUNTER · MONO-FANCY4 · FINANCE',
  },
  fields: [
    { key: 'runningTotal', label: 'Plot the running total', group: 'options', section: 'Line', type: 'boolean', default: true, help: 'Off plots each row’s value as it is.' },
    { key: 'drawTime', label: 'Drawing time', group: 'options', section: 'Line', type: 'number', min: 0.2, max: 20, step: 0.1, unit: 's', default: 2.6 },
    { key: 'smooth', label: 'Line smoothing', group: 'options', section: 'Line', type: 'number', min: 0, max: 1, step: 0.05, default: 0.2 },
    { key: 'lineWidth', label: 'Line width', group: 'options', section: 'Line', type: 'number', min: 0, max: 8, step: 0.1, unit: 'px', default: 2.6 },
    { key: 'areaStrength', label: 'Area shade at the top', group: 'options', section: 'Line', type: 'number', min: 0, max: 1, step: 0.01, default: 0.14 },
    { key: 'headroom', label: 'Space above the line', group: 'options', section: 'Line', type: 'number', min: 0, max: 100, step: 1, unit: '%', default: 6 },
    { key: 'showCounter', label: 'Counting headline', group: 'options', section: 'Headline', type: 'boolean', default: true },
    { key: 'counterDivide', label: 'Divide the total by', group: 'options', section: 'Headline', type: 'number', min: 1, max: 1e9, step: 1, default: 1000, help: '1000 turns thousands into millions.', when: (s) => s.showCounter !== false },
    { key: 'counterDecimals', label: 'Decimals', group: 'options', section: 'Headline', type: 'number', min: 0, max: 4, step: 1, default: 2, when: (s) => s.showCounter !== false },
    { key: 'counterPrefix', label: 'Prefix', group: 'options', section: 'Headline', type: 'text', default: '$', when: (s) => s.showCounter !== false },
    { key: 'counterSuffix', label: 'Suffix', group: 'options', section: 'Headline', type: 'text', default: 'M', when: (s) => s.showCounter !== false },
    { key: 'counterCaption', label: 'Line under the number', group: 'options', section: 'Headline', type: 'text', default: 'ARR · H1 2026', when: (s) => s.showCounter !== false },
    { key: 'labelEvery', label: 'Time label every', group: 'options', section: 'Axis', type: 'number', min: 1, max: 1000, step: 1, unit: 'rows', default: 30 },
  ],
  supports: { categoryLabels: true, tooltip: false, hover: false },
  paletteNeeds: ['highlight'],
  interactions: [],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => ctx.num('drawTime'),
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const rows = ctx.rows.map((r) => ({ text: String(r.label ?? '').trim(), date: parseDate(r.label), v: Number(r.value) }));
    const n = rows.length;
    let acc = 0;
    const series = rows.map((r) => (ctx.bool('runningTotal') ? (acc += r.v) : r.v));
    const total = ctx.bool('runningTotal') ? acc : series[n - 1];
    const plotted = series.map((v) => (ctx.bool('runningTotal') ? Math.round(v) : v));
    const left = 14, right = 20, top = 64, bottom = 24;
    const x0 = left, x1 = W - right, y0 = top, y1 = H - bottom;
    const cat = categories(n, x0, x1 - x0, false);
    const yMax = Math.max(...series) * (1 + ctx.num('headroom') / 100) || 1;
    const yMin = Math.min(0, ...series);
    const Y = (v: number) => y1 - ((v - yMin) / (yMax - yMin)) * (y1 - y0);
    const e = progress(ctx, 0, ctx.num('drawTime'), cubicOut);

    if (ctx.bool('categoryLabels')) {
      const fs = ctx.fs(9);
      const every = Math.max(1, Math.round(ctx.num('labelEvery')));
      const dated = rows.every((r) => r.date);
      rows.forEach((r, i) => {
        const show = dated ? i === 0 || r.date!.getUTCMonth() !== rows[i - 1].date!.getUTCMonth() : i % every === 0;
        if (!show) return;
        txt(s, { x: cat.at(i), y: y1 + 8 + fs / 2 + MID * fs, 'font-size': fs, 'font-weight': 600, fill: gFaint(T), 'text-anchor': 'middle', class: 'fade', style: 'animation-duration:.4s' }, dated ? monthName(r.date!) : r.text.toUpperCase());
      });
    }
    const pts = plotted.map((v, i) => [cat.at(i), Y(v)] as [number, number]);
    const ink = parseColor(T.data) ?? [28, 28, 26, 1];
    const defs = el(s, 'defs', {});
    const grad = el(defs, 'linearGradient', { id: 'g16-area', x1: 0, y1: 0, x2: 0, y2: 1 });
    el(grad, 'stop', { offset: 0, 'stop-color': toHex([ink[0], ink[1], ink[2], 1]), 'stop-opacity': Math.round(ink[3] * ctx.num('areaStrength') * 1000) / 1000 });
    el(grad, 'stop', { offset: 1, 'stop-color': toHex([ink[0], ink[1], ink[2], 1]), 'stop-opacity': 0 });
    let parent = s;
    if (e < 1) {
      const clip = el(defs, 'clipPath', { id: 'g16-reveal' });
      el(clip, 'rect', { x: x0 - 2, y: 0, width: Math.max(0, (x1 - x0 + 4) * e), height: H });
      parent = el(s, 'g', { 'clip-path': 'url(#g16-reveal)' });
    }
    const sm = ctx.num('smooth');
    el(parent, 'path', { d: smoothArea(pts, sm, Y(Math.max(yMin, 0))), fill: 'url(#g16-area)', opacity: 0.7 });
    if (ctx.num('lineWidth') > 0) el(parent, 'path', { d: smoothLine(pts, sm), fill: 'none', stroke: T.data, 'stroke-width': ctx.num('lineWidth') });

    if (ctx.bool('showCounter')) {
      const value = (total * e) / Math.max(1e-9, ctx.num('counterDivide'));
      const text = `${ctx.str('counterPrefix')}${formatNumber(value, { prefix: '', suffix: '', decimals: Math.round(ctx.num('counterDecimals')), thousands: false, compact: false, percent: false })}${ctx.str('counterSuffix')}`;
      const big = ctx.fs(32), small = ctx.fs(10);
      txt(s, { x: 16, y: 8 + big / 2 + MID * big, 'font-size': big, 'font-weight': 800, fill: hi(T, T.text) }, text);
      if (ctx.str('counterCaption').trim()) txt(s, { x: 16, y: 8 + 38 + small / 2 + MID * small, 'font-size': small, 'font-weight': 600, fill: T.muted }, ctx.str('counterCaption'));
    }
  },
});
