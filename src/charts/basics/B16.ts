// B16 Stream Ribbon — a streamgraph: series stacked around a centre line (silhouette baseline),
// separated by paper seams. Today's leader is darkest; each band is named at its widest week.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, byPreset } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { captionLine, isoDay, laterInk, monthName, parseDate, r3, ranks } from './shared';

const N = 48;
const mk = (base: number, trend: number, w1: number, w2: number, seed: number) =>
  Array.from({ length: N }, (_, t) => Math.max(2, base + trend * t + 10 * Math.sin(t / w1 + seed) + 5 * Math.sin(t / w2 + seed * 2) + rnd(t + 1, seed) * 6));
const SERIES: [string, number[]][] = [
  ['LEGACY EDITOR', mk(46, -0.62, 9, 3.7, 2)],
  ['BOARDS', mk(26, 0.1, 11, 4.2, 5)],
  ['FLOWS', mk(12, 0.78, 10, 3.1, 8)],
];
// weekly periods from Monday 26 January, so every eighth week lands on JAN, MAR, MAY …
const DEMO = SERIES.flatMap(([series, vals]) => vals.map((v, t) => ({ period: isoDay(2026, 1, 26 + 7 * t), series, value: r3(v) })));
const DEMO_TOTAL = Math.max(...Array.from({ length: N }, (_, t) => SERIES.reduce((a, [, v]) => a + r3(v[t]), 0)));
const SCALE = 1.15;
const f1 = (v: number) => v.toFixed(1);

/** Periods and series in order of first appearance, and the values table. */
function pivot(rows: { p: string; s: string; v: number }[]) {
  const P: string[] = [], S: string[] = [];
  const val = new Map<string, number>();
  for (const r of rows) {
    if (!P.includes(r.p)) P.push(r.p);
    if (!S.includes(r.s)) S.push(r.s);
    val.set(`${S.indexOf(r.s)}|${P.indexOf(r.p)}`, Math.max(0, r.v));
  }
  return { P, S, vals: S.map((_, si) => P.map((_, t) => val.get(`${si}|${t}`) ?? 0)) };
}

/** The ribbon edge: quadratic curves through the midpoints of the points. */
function smooth(pts: [number, number][]): string {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const p = pts[k], q = pts[k + 1];
    d += ` Q${f1(p[0])} ${f1(p[1])} ${f1((p[0] + q[0]) / 2)} ${f1((p[1] + q[1]) / 2)}`;
  }
  return d + ` L${f1(pts[pts.length - 1][0])} ${f1(pts[pts.length - 1][1])}`;
}

const autoCaption = (s: Settings, heroMode: boolean) =>
  `BAND WIDTH = ${String(s.measureShort ?? '').toUpperCase()} · ${heroMode ? 'RED' : 'DARKEST'} = TODAY’S LEADER · THE RIVER IS THE TOTAL`;

export default defineChart({
  id: 'B16',
  name: 'Stream Ribbon',
  family: 'basics',
  kinds: ['lines', 'time', 'part-to-whole'],
  description: 'A streamgraph: series flow around a centre line; the leader is darkest.',
  card: { width: 1100, chartHeight: 300 },
  size: { w: 840, h: 300 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 2,
      maxRows: 2000,
      columns: [
        { key: 'period', label: 'Period', type: 'date', role: 'date', help: 'A date (YYYY-MM-DD) or any label, one per week/month.' },
        { key: 'series', label: 'Series', type: 'text', role: 'series' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: DEMO },
  text: {
    title: 'Three products trade the same river',
    subtitle: '48 weeks of usage share · band width = weekly active accounts · the river swells where the total grows',
    source: 'STREAM RIBBON · MONO-BASIC · PRODUCT ANALYTICS',
  },
  fields: [
    { key: 'thickness', label: 'River thickness', group: 'options', section: 'River', type: 'number', min: 10, max: 160, step: 1, unit: '%', default: 100, help: '100% is the standard thickness for the widest week.' },
    { key: 'seam', label: 'Seam between bands', group: 'options', section: 'River', type: 'number', min: 0, max: 8, step: 0.1, unit: 'px', default: 2 },
    { key: 'smoothBoth', label: 'Smooth both edges of each band', group: 'options', section: 'River', type: 'boolean', default: false, help: 'Off smooths only the top edge.' },
    { key: 'labelMargin', label: 'Keep band names away from the ends', group: 'options', section: 'Labels', type: 'number', min: 0, max: 20, step: 1, unit: 'periods', default: 4 },
    { key: 'labelEvery', label: 'Time label every', group: 'options', section: 'Labels', type: 'number', min: 1, max: 52, step: 1, unit: 'periods', default: 8 },
    { key: 'measure', label: 'What the bands show', group: 'options', section: 'Units', type: 'text', default: 'weekly active accounts', help: 'Used in tooltips.' },
    { key: 'measureShort', label: 'Short name (caption)', group: 'options', section: 'Units', type: 'text', default: 'weekly actives' },
    { key: 'periodWord', label: 'One period is a…', group: 'options', section: 'Units', type: 'text', default: 'week', help: 'Tooltip: “… 48 weeks”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, T.heroMode),
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const { P, S, vals } = pivot(ctx.rows.map((r) => ({ p: String(r.period ?? '').trim(), s: String(r.series ?? '').trim(), v: Number(r.value) })));
    const n = P.length;
    const X0 = 36, X1 = 744, CY = 138;
    const x = (t: number) => X0 + (n > 1 ? (t / (n - 1)) * (X1 - X0) : (X1 - X0) / 2);
    const tot = P.map((_, t) => vals.reduce((a, v) => a + v[t], 0));
    const maxTot = Math.max(...tot);
    const SC = maxTot > 0 ? ((ctx.num('thickness') / 100) * SCALE * DEMO_TOTAL) / maxTot : SCALE;
    // darkest = today's leader (largest in the last period)
    const rk = ranks(vals.map((v) => v[n - 1] ?? 0));
    const lead = T.heroMode ? T.hero : laterInk(T);
    const list = T.id === 'palm' ? T.heat : [lead, T.data2, T.faint];
    const extra = T.ramp6.slice(1);
    const shadeOf = (r: number) => (r < list.length ? (r === 0 ? (T.id === 'palm' ? list[0] : lead) : list[r]) : extra[(r - list.length) % extra.length]);
    const quietLabel = byPreset(T, { mono: '#4A4944', porcelain: T.data, palm: T.text, wire: '#6E6D66' }, T.text);
    let run = tot.map((t) => CY - (t * SC) / 2);
    const margin = Math.round(ctx.num('labelMargin'));
    S.forEach((name, si) => {
      const v = vals[si];
      const top: [number, number][] = run.map((y, t) => [x(t), y]);
      const bot: [number, number][] = run.map((y, t) => [x(t), y + v[t] * SC]);
      run = bot.map((p) => p[1]);
      const back = [...bot].reverse();
      const d = ctx.bool('smoothBoth') && back.length > 2
        ? smooth(top) + ' L ' + smooth(back).slice(1) + ' Z'
        : smooth(top) + ' L ' + back.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L ') + ' Z';
      const shade = shadeOf(rk[si]);
      const g = keyed(el(s, 'g', {}), `band-${si}`);
      const band = el(g, 'path', { d, fill: shade, stroke: T.bg, 'stroke-width': ctx.num('seam'), class: 'fade', style: `animation-delay:${si * 0.16}s` });
      tip(band, `${name} — ${ctx.str('measure')}, ${n} ${ctx.str('periodWord')}${n === 1 ? '' : 's'}`);
      if (ctx.bool('dataLabels')) {
        let lo = Math.min(margin, n - 1), hi = n - 1 - (margin + 1);
        if (hi < lo) [lo, hi] = [0, n - 1];
        let wk = lo;
        v.forEach((val, t) => {
          if (t >= lo && t <= hi && val > v[wk]) wk = t;
        });
        const midY = (top[wk][1] + bot[wk][1]) / 2;
        txt(g, {
          x: x(wk), y: midY + 3, 'font-size': ctx.fs(9), 'font-weight': 800, 'text-anchor': 'middle', fill: rk[si] === 0 ? T.bg : quietLabel,
          'letter-spacing': '.06em', class: 'fade', style: `animation-delay:${0.5 + si * 0.14}s`,
        }, name);
      }
    });
    const base = 252;
    const sw = (w: number) => w * boost(T, 1, 1.8);
    el(s, 'line', { x1: X0 - 6, y1: base, x2: X1 + 6, y2: base, stroke: T.grid, 'stroke-width': sw(0.8), class: 'fade' });
    const every = Math.max(1, Math.round(ctx.num('labelEvery')));
    for (let t = 0; t < n; t++) {
      el(s, 'line', { x1: x(t), y1: base, x2: x(t), y2: base - (t % every === 0 ? 7 : 4), stroke: T.floor, 'stroke-width': sw(0.6), class: 'fade', style: `animation-delay:${t * 0.006}s` });
    }
    if (ctx.bool('categoryLabels')) {
      for (let t = 0; t < n; t += every) {
        const d = parseDate(P[t]);
        txt(s, {
          x: x(t), y: base + 15, 'font-size': ctx.fs(7.5), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle', 'letter-spacing': '.1em', class: 'fade',
        }, d ? monthName(d) : P[t].toUpperCase());
      }
    }
    captionLine(ctx, autoCaption(ctx.s, T.heroMode), 288, 1.1, { x: 390, fill: T.faintData });
  },
});
