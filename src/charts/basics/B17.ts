// B17 Candlestick — candles without red and green: ink body = closed down, hollow body = closed
// up (Palm: wheat). Wicks are hairlines, bodies are capsules; the highest high and lowest low are
// labelled.

import { defineChart } from '../../core/define';
import { formatNumber, numberFormatFrom } from '../../core/format';
import { rndAbs as rnd } from '../../core/rnd';
import { boost } from '../../core/theme';
import type { Issue, Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { captionLine, dayName, label, laterInk, parseDate, r3 } from './shared';

// a deterministic random walk with a dip-and-recover arc
const DAYS: [number, number, number, number][] = [];
{
  let px = 52;
  for (let d = 0; d < 30; d++) {
    const drift = d < 10 ? 0.4 : d < 18 ? -1.5 : 1.3;
    const open = px;
    const close = Math.max(30, open + drift + (rnd(d + 1, 3) - 0.5) * 4.6);
    const hi = Math.max(open, close) + rnd(d + 2, 7) * 2.6;
    const lo = Math.min(open, close) - rnd(d + 3, 11) * 2.6;
    DAYS.push([open, close, hi, lo]);
    px = close;
  }
}
const DEMO = DAYS.map(([o, c, h, l], d) => ({ label: `W${Math.floor(d / 5) + 1}`, open: r3(o), high: r3(h), low: r3(l), close: r3(c) }));

const autoCaption = (s: Settings, palm: boolean) =>
  palm && s.upStyle === 'auto'
    ? 'GREEN BODY = CLOSED DOWN · WHEAT = CLOSED UP · WICK = THE DAY’S FULL REACH'
    : 'INK BODY = CLOSED DOWN · HOLLOW = CLOSED UP · WICK = THE DAY’S FULL REACH';

export default defineChart({
  id: 'B17',
  name: 'Candlestick',
  family: 'basics',
  kinds: ['time'],
  description: 'Candlesticks without red and green: ink closes down, hollow closes up.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 2,
      maxRows: 120,
      columns: [
        { key: 'label', label: 'Date or label', type: 'text', role: 'date', required: false, help: 'A date (YYYY-MM-DD) or a short label such as W1.' },
        { key: 'open', label: 'Open', type: 'number', role: 'value' },
        { key: 'high', label: 'High', type: 'number', role: 'value' },
        { key: 'low', label: 'Low', type: 'number', role: 'value' },
        { key: 'close', label: 'Close', type: 'number', role: 'value' },
      ],
    }],
  },
  defaultData: { rows: DEMO },
  defaults: { numPrefix: '$' },
  text: {
    title: 'Six weeks of the token, candle by candle',
    subtitle: 'body = open to close · wick = the day’s full reach · ink = closed down · hollow = closed up',
    source: 'CANDLESTICK · MONO-BASIC · MARKET DATA',
  },
  fields: [
    { key: 'fillWidth', label: 'Spread candles across the width', group: 'options', section: 'Candles', type: 'boolean', default: true },
    { key: 'pitch', label: 'Candle spacing', group: 'options', section: 'Candles', type: 'number', min: 2, max: 40, step: 0.1, unit: 'px', default: 11.2, when: (s) => s.fillWidth === false },
    { key: 'bodyWidth', label: 'Body width', group: 'options', section: 'Candles', type: 'number', min: 1, max: 30, step: 0.1, unit: 'px', default: 6.8 },
    { key: 'bodyRadius', label: 'Body corner radius', group: 'options', section: 'Candles', type: 'number', min: 0, max: 15, step: 0.1, unit: 'px', default: 3 },
    { key: 'minBody', label: 'Smallest body height', group: 'options', section: 'Candles', type: 'number', min: 0, max: 10, step: 0.1, unit: 'px', default: 2.5 },
    { key: 'wickWidth', label: 'Wick width', group: 'options', section: 'Candles', type: 'number', min: 0.1, max: 4, step: 0.05, unit: 'px', default: 0.7 },
    {
      key: 'upStyle', label: 'Closed-up candles', group: 'options', section: 'Candles', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'hollow', label: 'Hollow' }, { value: 'tinted', label: 'Tinted' }],
      help: 'Palm fills closed-up candles with wheat.',
    },
    { key: 'gridLines', label: 'Price grid lines', group: 'options', section: 'Grid', type: 'number', min: 0, max: 12, step: 1, default: 5 },
    { key: 'labelExtremes', label: 'Label the highest and lowest', group: 'options', section: 'Grid', type: 'boolean', default: true },
    { key: 'tickEvery', label: 'Long floor tick every', group: 'options', section: 'Grid', type: 'number', min: 1, max: 30, step: 1, unit: 'candles', default: 5, help: 'Time labels sit at the long ticks.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, T.id === 'palm'),
  paletteNeeds: ['highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  validate(data) {
    const issues: Issue[] = [];
    (data.rows ?? []).forEach((r, i) => {
      const [o, h, l, c] = [r.open, r.high, r.low, r.close].map(Number);
      if (h < Math.max(o, c) || l > Math.min(o, c)) issues.push({ table: 'rows', row: i, message: `Row ${i + 1}: the high should be the largest value and the low the smallest.` });
    });
    return issues.slice(0, 5);
  },
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ text: String(r.label ?? '').trim(), date: parseDate(r.label), o: Number(r.open), h: Number(r.high), l: Number(r.low), c: Number(r.close) }));
    const n = rows.length;
    const X0 = 40, BASE = 258, TOP = 44;
    const PW = ctx.bool('fillWidth') ? 336 / Math.max(1, n) : ctx.num('pitch');
    let vmin = Math.min(...rows.map((d) => Math.min(d.l, d.o, d.c))), vmax = Math.max(...rows.map((d) => Math.max(d.h, d.o, d.c)));
    if (vmax <= vmin) vmax = vmin + 1;
    const mapY = (v: number) => BASE - ((v - vmin) / (vmax - vmin)) * (BASE - TOP);
    const x = (d: number) => X0 + d * PW + PW / 2;
    const sw = (w: number) => w * boost(T, 1, 1.8);
    const ink = laterInk(T);
    const G = Math.round(ctx.num('gridLines'));
    for (let g = 0; g < G; g++) {
      const v = vmin + (G > 1 ? g / (G - 1) : 0) * (vmax - vmin);
      el(s, 'line', { x1: X0 - 4, y1: mapY(v), x2: X0 + n * PW + 4, y2: mapY(v), stroke: T.track, 'stroke-width': sw(0.8), class: 'fade', style: `animation-delay:${g * 0.03}s` });
      if (ctx.bool('categoryLabels')) {
        txt(s, { x: X0 - 8, y: mapY(v) + 3, 'font-size': ctx.fs(7.5), 'font-weight': 600, fill: T.muted, 'text-anchor': 'end', class: 'fade', style: `animation-delay:${g * 0.03}s` }, label(ctx, v));
      }
    }
    let hiD = 0, loD = 0;
    rows.forEach((d, i) => {
      if (d.h > rows[hiD].h) hiD = i;
      if (d.l < rows[loD].l) loD = i;
    });
    const nf = { ...numberFormatFrom(ctx.s), decimals: 1 };
    const one = (v: number) => formatNumber(v, nf);
    const palmUp = ctx.str('upStyle') === 'tinted' || (ctx.str('upStyle') === 'auto' && T.id === 'palm');
    const bw = ctx.num('bodyWidth');
    rows.forEach((d, i) => {
      const cx = x(i), up = d.c >= d.o;
      const yT = mapY(Math.max(d.o, d.c)), yB = mapY(Math.min(d.o, d.c));
      const g = keyed(el(s, 'g', {}), `day-${i}`);
      el(g, 'line', { x1: cx, y1: mapY(d.h), x2: cx, y2: mapY(d.l), stroke: T.label, 'stroke-width': sw(ctx.num('wickWidth')), class: 'fade', style: `animation-delay:${i * 0.03}s` });
      const look = up
        ? palmUp ? { fill: T.ramp6[5], stroke: T.ramp6[2], 'stroke-width': 1 } : { fill: T.bg, stroke: ink, 'stroke-width': sw(1.1) }
        : { fill: ink };
      const body = el(g, 'rect', {
        x: cx - bw / 2, y: yT, width: bw, height: Math.max(ctx.num('minBody'), yB - yT), rx: ctx.num('bodyRadius'), ...look,
        class: 'fade', style: `animation-delay:${0.05 + i * 0.03}s`,
      });
      tip(body, `${d.date ? dayName(d.date) : `Day ${i + 1}`} — open ${one(d.o)} · close ${one(d.c)} · high ${one(d.h)} · low ${one(d.l)}`);
      if (ctx.bool('labelExtremes') && ctx.bool('dataLabels')) {
        if (i === hiD) {
          txt(g, {
            x: cx, y: mapY(d.h) - 7, 'font-size': ctx.fs(8), 'font-weight': 800, fill: ink, 'text-anchor': 'middle',
            style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:1s`, class: 'fade',
          }, label(ctx, d.h));
        }
        if (i === loD) {
          txt(g, {
            x: cx, y: mapY(d.l) + 14, 'font-size': ctx.fs(T.heroMode ? 9.5 : 8), 'font-weight': 800, fill: T.heroMode ? T.hero : T.label, 'text-anchor': 'middle',
            style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:1s`, class: 'fade',
          }, label(ctx, d.l));
        }
      }
    });
    el(s, 'line', { x1: X0 - 4, y1: BASE + 8, x2: X0 + n * PW + 4, y2: BASE + 8, stroke: T.grid, 'stroke-width': sw(0.8), class: 'fade' });
    const every = Math.max(1, Math.round(ctx.num('tickEvery')));
    for (let d = 0; d < n; d++) {
      el(s, 'line', { x1: x(d), y1: BASE + 8, x2: x(d), y2: BASE + 8 - (d % every === 0 ? 6 : 3), stroke: T.floor, 'stroke-width': sw(0.6), class: 'fade', style: `animation-delay:${d * 0.008}s` });
    }
    if (ctx.bool('categoryLabels')) {
      for (let d = 0; d < n; d += every) {
        const r = rows[d];
        txt(s, {
          x: x(d), y: BASE + 21, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle', 'letter-spacing': '.08em', class: 'fade',
        }, r.date ? dayName(r.date) : r.text.toUpperCase());
      }
    }
    captionLine(ctx, autoCaption(ctx.s, T.id === 'palm'), 306, 1.1, { fill: T.faintData });
  },
});
