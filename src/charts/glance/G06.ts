// G06 Dual Area ("rainfall") — two panels: daily spend hangs as bars from the top; sign-ups flow
// below as a smoothed line over a fading area. Hovering a day shows both values and a crosshair
// through both panels.

import { alpha, parseColor, toHex } from '../../core/color';
import { defineChart } from '../../core/define';
import { quarticOut } from '../../core/ease';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { axisNumber, categories, crisp, MID, progress, roundRect, smoothArea, smoothLine, valueAxis } from './plot';
import { glanceFrame, hi } from './shared';

const FLOW = [42, 45, 44, 48, 52, 55, 53, 58, 64, 62, 66, 71, 69, 75, 82, 79, 84, 80, 86, 92, 88, 95, 91, 97, 104, 101, 108, 105, 112, 118];
const RAIN = [2, 0, 4, 8, 3, 0, 6, 12, 7, 3, 9, 15, 6, 2, 11, 5, 8, 14, 4, 9, 6, 13, 3, 7, 10, 5, 12, 8, 15, 6];
const DUR = 1.2;

export default defineChart({
  id: 'G06',
  name: 'Dual Area',
  family: 'glance',
  kinds: ['lines', 'bars', 'time'],
  description: 'Spend hangs from the top as bars while sign-ups flow below as a smoothed area.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 2,
      maxRows: 400,
      columns: [
        { key: 'label', label: 'Day', type: 'text', role: 'label' },
        { key: 'top', label: 'Top (bars)', type: 'number', role: 'value', min: 0, help: 'Hangs from the top, e.g. spend.' },
        { key: 'bottom', label: 'Bottom (line)', type: 'number', role: 'value', help: 'Flows below, e.g. sign-ups.' },
      ],
    }],
  },
  defaultData: { rows: FLOW.map((bottom, i) => ({ label: String(i + 1), top: RAIN[i], bottom })) },
  text: {
    title: 'Campaigns rain down, sign-ups flow',
    subtitle: 'daily ad spend (from top, $K) vs sign-ups (flow, hundreds) · 30 days',
    source: 'DUAL AREA · MONO-FANCY · GROWTH + ADS',
  },
  fields: [
    { key: 'topHeight', label: 'Top panel height', group: 'options', section: 'Panels', type: 'number', min: 5, max: 60, step: 1, unit: '%', default: 26 },
    { key: 'bottomStart', label: 'Bottom panel starts at', group: 'options', section: 'Panels', type: 'number', min: 10, max: 90, step: 1, unit: '%', default: 42 },
    { key: 'topMax', label: 'Top scale maximum', group: 'options', section: 'Panels', type: 'number', min: 0, max: 1e9, step: 1, default: 18, help: '0 = automatic.' },
    { key: 'barWidth', label: 'Bar width', group: 'options', section: 'Bars', type: 'number', min: 5, max: 100, step: 1, unit: '% of slot', default: 55 },
    { key: 'barRadius', label: 'Bar tip rounding', group: 'options', section: 'Bars', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 4 },
    { key: 'smooth', label: 'Line smoothing', group: 'options', section: 'Line', type: 'number', min: 0, max: 1, step: 0.05, default: 0.4 },
    { key: 'lineWidth', label: 'Line width', group: 'options', section: 'Line', type: 'number', min: 0, max: 8, step: 0.1, unit: 'px', default: 2.2 },
    { key: 'areaStrength', label: 'Area shade at the top', group: 'options', section: 'Line', type: 'number', min: 0, max: 1, step: 0.01, default: 0.22, help: 'Fades to nothing at the bottom.' },
    { key: 'labelEvery', label: 'Day label every', group: 'options', section: 'Axes', type: 'number', min: 1, max: 60, step: 1, unit: 'days', default: 7 },
    { key: 'dayPrefix', label: 'Day label prefix', group: 'options', section: 'Axes', type: 'text', default: 'D' },
    { key: 'topPrefix', label: 'Top value prefix', group: 'options', section: 'Units', type: 'text', default: '$' },
    { key: 'topSuffix', label: 'Top value suffix', group: 'options', section: 'Units', type: 'text', default: 'K' },
    { key: 'topName', label: 'Top value in words', group: 'options', section: 'Units', type: 'text', default: 'spend' },
    { key: 'bottomName', label: 'Bottom value in words', group: 'options', section: 'Units', type: 'text', default: 'sign-ups' },
  ],
  supports: { categoryLabels: true, axes: true, grid: true },
  paletteNeeds: ['highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: () => DUR,
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), top: Number(r.top), bottom: Number(r.bottom) }));
    const n = rows.length;
    const left = 44, right = 14;
    const x0 = left, x1 = W - right;
    const t0 = 8, t1 = t0 + (ctx.num('topHeight') / 100) * H;
    const b0 = (ctx.num('bottomStart') / 100) * H, b1 = H - 26;
    const cat = categories(n, x0, x1 - x0);
    const topAxis = valueAxis(0, Math.max(...rows.map((r) => r.top)), ctx.num('topMax') > 0 ? { max: ctx.num('topMax') } : {});
    const botAxis = valueAxis(Math.min(...rows.map((r) => r.bottom)), Math.max(...rows.map((r) => r.bottom)));
    const YT = (v: number) => t0 + ((v - topAxis.min) / (topAxis.max - topAxis.min)) * (t1 - t0);
    const YB = (v: number) => b1 - ((v - botAxis.min) / (botAxis.max - botAxis.min)) * (b1 - b0);
    const e = progress(ctx, 0, DUR, quarticOut);

    if (ctx.bool('showGrid')) {
      for (const t of botAxis.ticks) {
        const y = crisp(YB(t), 1);
        el(s, 'line', { x1: x0, y1: y, x2: x1, y2: y, stroke: T.grid, 'stroke-width': 1, class: 'fade', style: 'animation-duration:.4s' });
      }
    }
    if (ctx.bool('showAxes')) {
      const tf = ctx.fs(9), bf = ctx.fs(9.5);
      for (const t of topAxis.ticks) {
        txt(s, { x: x0 - 8, y: YT(t) + MID * tf, 'font-size': tf, fill: pick(T, '#B0AFA9', alpha(T.text, 0.4)), 'text-anchor': 'end', class: 'fade', style: 'animation-duration:.4s' },
          `${ctx.str('topPrefix')}${axisNumber(t)}${ctx.str('topSuffix')}`);
      }
      for (const t of botAxis.ticks) {
        txt(s, { x: x0 - 8, y: YB(t) + MID * bf, 'font-size': bf, fill: T.muted, 'text-anchor': 'end', class: 'fade', style: 'animation-duration:.4s' }, axisNumber(t));
      }
    }
    if (ctx.bool('categoryLabels')) {
      const fs = ctx.fs(9.5), every = Math.max(1, Math.round(ctx.num('labelEvery')));
      for (let i = 0; i < n; i += every) {
        txt(s, { x: cat.at(i), y: b1 + 8 + fs / 2 + MID * fs, 'font-size': fs, fill: T.muted, 'text-anchor': 'middle', class: 'fade', style: 'animation-duration:.4s' }, ctx.str('dayPrefix') + rows[i].name);
      }
    }
    // spend bars hanging from the top
    const bw = cat.band * (ctx.num('barWidth') / 100);
    const rmax = Math.max(...rows.map((r) => r.top));
    const br = ctx.num('barRadius');
    rows.forEach((r, i) => {
      const fill = T.kind === 'mono' ? '#B0AFA9' : r.top === rmax ? hi(T, T.data2) : T.data2;
      const h = (YT(r.top) - t0) * e;
      if (h > 0.01) el(s, 'path', { d: roundRect(cat.at(i) - bw / 2, t0, bw, h, [0, 0, br, br]), fill });
    });
    // sign-ups: smoothed line over a fading area, revealed left to right
    const pts = rows.map((r, i) => [cat.at(i), YB(r.bottom)] as [number, number]);
    const ink = parseColor(T.data) ?? [28, 28, 26, 1];
    const defs = el(s, 'defs', {});
    const grad = el(defs, 'linearGradient', { id: 'g06-area', x1: 0, y1: 0, x2: 0, y2: 1 });
    el(grad, 'stop', { offset: 0, 'stop-color': toHex([ink[0], ink[1], ink[2], 1]), 'stop-opacity': Math.round(ink[3] * ctx.num('areaStrength') * 1000) / 1000 });
    el(grad, 'stop', { offset: 1, 'stop-color': toHex([ink[0], ink[1], ink[2], 1]), 'stop-opacity': 0 });
    let lineParent = s;
    if (e < 1) {
      const clip = el(defs, 'clipPath', { id: 'g06-reveal' });
      el(clip, 'rect', { x: x0 - 2, y: 0, width: Math.max(0, (x1 - x0 + 4) * e), height: H });
      lineParent = el(s, 'g', { 'clip-path': 'url(#g06-reveal)' });
    }
    const sm = ctx.num('smooth');
    if (pts.length > 1) {
      el(lineParent, 'path', { d: smoothArea(pts, sm, YB(Math.max(botAxis.min, 0))), fill: 'url(#g06-area)', opacity: 0.7 });
      if (ctx.num('lineWidth') > 0) el(lineParent, 'path', { d: smoothLine(pts, sm), fill: 'none', stroke: T.data, 'stroke-width': ctx.num('lineWidth') });
    }
    // hover: one column per day with both values, plus a crosshair through both panels
    const fx = pick(T, '#B0AFA9', alpha(T.text, 0.4));
    rows.forEach((r, i) => {
      const g = keyed(el(s, 'g', {}), `day-${i}`);
      tip(g, `Day ${r.name} — ${ctx.str('topName')} ${ctx.str('topPrefix')}${axisNumber(r.top)}${ctx.str('topSuffix')} · ${axisNumber(r.bottom)} ${ctx.str('bottomName')}`);
      el(g, 'rect', { x: cat.at(i) - cat.band / 2, y: t0, width: cat.band, height: b1 - t0, fill: 'transparent', 'data-cs-hit': 1 });
      el(s, 'line', { x1: crisp(cat.at(i)), y1: t0, x2: crisp(cat.at(i)), y2: b1, stroke: fx, 'stroke-width': 1, class: 'cs-hover-label', 'data-cs-rel': `day-${i}`, 'data-cs-ui': 1 });
    });
  },
});
