// G14 Bar Race — one period every 1.15 s: values glide for 0.95 s, the scale's end follows the
// leader, and whenever two bars cross they swap rows over 0.3 s. Everything is computed from the
// time, so any frame (and every video frame) is exact.

import { defineChart } from '../../core/define';
import { rndSigned as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { categories, MID, roundRect } from './plot';
import { glanceFrame, rampAt } from './shared';

const P = ['Editor', 'Boards', 'Docs', 'Chat', 'Flows', 'Vault', 'Pages', 'Sync'];
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const VALS: number[][] = [P.map((_, i) => [42, 38, 30, 26, 18, 14, 10, 8][i])];
for (let y = 1; y < YEARS.length; y++) VALS.push(VALS[y - 1].map((v, i) => v * (1.04 + rnd(i + 1, y + 1) * 0.5)));
const MONO_L = ['#1C1C1A', '#4A4944', '#6A6963', '#8F8E88', '#B0AFA9', '#C6C5BF'];

interface Race {
  periods: string[];
  items: string[];
  vals: number[][];
}

function pivot(rows: { period: string; item: string; v: number }[]): Race {
  const periods: string[] = [], items: string[] = [];
  const m = new Map<string, number>();
  for (const r of rows) {
    if (!periods.includes(r.period)) periods.push(r.period);
    if (!items.includes(r.item)) items.push(r.item);
    m.set(`${r.period}|${r.item}`, r.v);
  }
  return { periods, items, vals: periods.map((p) => items.map((it) => m.get(`${p}|${it}`) ?? 0)) };
}

/**
 * Each bar's row position at time `time`, as a (fractional) rank: 0 = top. Between periods the
 * values glide linearly; when two cross, the pair swaps rows over `swap` seconds.
 */
function rowsAt(r: Race, time: number, per: number, glide: number, swap: number): number[] {
  const n = r.items.length;
  const v0 = r.vals[0];
  // above[i][j] = 1 when j is drawn above i
  const above: number[][] = v0.map((vi, i) => v0.map((vj, j) => (j !== i && (vj > vi || (vj === vi && j < i)) ? 1 : 0)));
  const shown = above.map((row) => row.slice());
  for (let y = 1; y < r.periods.length; y++) {
    const start = y * per;
    if (start > time) break;
    const a = r.vals[y - 1], b = r.vals[y];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        // j is above i while a[j] − a[i] > 0; the difference changes linearly while values glide
        const before = a[j] - a[i], after = b[j] - b[i];
        if ((before > 0) === (after > 0) || after === 0) continue;
        const tCross = start + glide * (before / (before - after));
        if (tCross > time) continue;
        const target = after > 0 ? 1 : 0;
        const k = swap > 0 ? Math.min(1, (time - tCross) / swap) : 1;
        shown[i][j] = above[i][j] + (target - above[i][j]) * k;
        above[i][j] = target;
      }
    }
  }
  return shown.map((row) => row.reduce((s, x) => s + x, 0));
}

export default defineChart({
  id: 'G14',
  name: 'Bar Race',
  family: 'glance',
  kinds: ['bars', 'ranking', 'time'],
  description: 'Bars race period by period: values glide, the leader sets the scale, rows re-sort as they cross.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 5000,
      columns: [
        { key: 'period', label: 'Period', type: 'text', role: 'date', help: 'For example the year. Periods play in the order they first appear.' },
        { key: 'item', label: 'Item', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: YEARS.flatMap((year, y) => P.map((item, i) => ({ period: String(year), item, value: Math.round(VALS[y][i] * 1000) / 1000 }))) },
  defaults: { numPrefix: '$', numSuffix: 'K' },
  text: {
    title: 'Eight products race for revenue',
    subtitle: 'MRR by product, $K · 2019 → 2026 · leader wears black · click to replay',
    source: 'BAR RACE · MONO-FANCY4 · BILLING',
  },
  fields: [
    { key: 'perPeriod', label: 'Time per period', group: 'options', section: 'Race', type: 'number', min: 0.2, max: 10, step: 0.05, unit: 's', default: 1.15 },
    { key: 'glide', label: 'Glide time', group: 'options', section: 'Race', type: 'number', min: 0, max: 10, step: 0.05, unit: 's', default: 0.95, help: 'How long the values take to move to the next period.' },
    { key: 'swap', label: 'Row swap time', group: 'options', section: 'Race', type: 'number', min: 0, max: 3, step: 0.05, unit: 's', default: 0.3 },
    { key: 'barGap', label: 'Gap between bars', group: 'options', section: 'Bars', type: 'number', min: 0, max: 90, step: 1, unit: '% of row', default: 32 },
    { key: 'radius', label: 'Bar rounding', group: 'options', section: 'Bars', type: 'number', min: 0, max: 99, step: 1, unit: 'px', default: 99, help: '99 gives fully round ends.' },
    { key: 'rowsShown', label: 'Rows shown', group: 'options', section: 'Bars', type: 'number', min: 1, max: 40, step: 1, default: 8, help: 'The rest wait below until they climb.' },
    { key: 'labelColumn', label: 'Name column width', group: 'options', section: 'Layout', type: 'number', min: 10, max: 200, step: 1, unit: 'px', default: 64 },
    { key: 'rightMargin', label: 'Right margin', group: 'options', section: 'Layout', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 64 },
    { key: 'watermark', label: 'Big period watermark', group: 'options', section: 'Layout', type: 'boolean', default: true },
    { key: 'watermarkSize', label: 'Watermark size', group: 'options', section: 'Layout', type: 'number', min: 10, max: 120, step: 1, unit: 'px', default: 44, when: (s) => s.watermark !== false },
  ],
  supports: { dataLabels: true, categoryLabels: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: (ctx) => {
    const periods = new Set(ctx.rows.map((r) => String(r.period))).size;
    return Math.max(0.001, (periods - 1) * ctx.num('perPeriod') + ctx.num('glide') + ctx.num('swap'));
  },
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const race = pivot(ctx.rows.map((r) => ({ period: String(r.period), item: String(r.item), v: Number(r.value) })));
    const nP = race.periods.length, n = race.items.length;
    const per = ctx.num('perPeriod'), glide = Math.min(ctx.num('glide'), per), swap = ctx.num('swap');
    const time = ctx.time;
    const y = time === Infinity ? nP - 1 : Math.min(nP - 1, Math.max(0, Math.floor(time / per)));
    const p = time === Infinity || y === 0 || glide <= 0 ? 1 : Math.min(1, Math.max(0, (time - y * per) / glide));
    const prev = race.vals[Math.max(0, y - 1)], cur = race.vals[y];
    const v = cur.map((c, i) => prev[i] + (c - prev[i]) * p);
    const xMax = (Math.max(...prev) + (Math.max(...cur) - Math.max(...prev)) * p) || 1;
    const rowPos = rowsAt(race, time === Infinity ? 1e12 : time, per, glide, swap);
    const shownRows = Math.max(1, Math.round(ctx.num('rowsShown')));
    const left = ctx.num('labelColumn'), right = ctx.num('rightMargin'), top = 8, bottom = 8;
    const x0 = left, x1 = W - right, y0 = top, y1 = H - bottom;
    const cat = categories(shownRows, y0, y1 - y0);
    const X = (val: number) => x0 + (val / xMax) * (x1 - x0);
    const thick = cat.band * (1 - ctx.num('barGap') / 100);
    const rad = ctx.num('radius');
    // colour follows the current rank
    const rankNow = v.map((_, i) => v.filter((w, j) => w > v[i] || (w === v[i] && j < i)).length);
    const colour = (r: number) => (T.kind === 'mono' ? MONO_L[Math.min(5, r)] : rampAt(T, r, n));
    if (ctx.bool('watermark')) {
      const fs = ctx.fs(ctx.num('watermarkSize'));
      txt(s, { x: W - 18, y: H - 14 - fs / 2 + MID * fs, 'font-size': fs, 'font-weight': 800, fill: pick(T, '#DEDDD6', T.grid), 'text-anchor': 'end' }, race.periods[y]);
    }
    const order = race.items.map((_, i) => i);
    for (const i of order) {
      const row = rowPos[i];
      if (row > shownRows - 0.5 + 1e-9) continue;
      const cy = cat.at(row);
      const g = keyed(el(s, 'g', {}), `item-${i}`);
      tip(g, `${race.items[i]} — ${ctx.fmt(Math.round(v[i]))}`);
      if (ctx.bool('categoryLabels')) {
        const fs = ctx.fs(9.5);
        txt(g, { x: x0 - 8, y: cy + MID * fs, 'font-size': fs, 'font-weight': 600, fill: T.label, 'text-anchor': 'end' }, race.items[i]);
      }
      const w = X(v[i]) - x0;
      if (w > 0.01) el(g, 'path', { d: roundRect(x0, cy - thick / 2, w, thick, rad), fill: colour(rankNow[i]) });
      if (ctx.bool('dataLabels')) {
        const fs = ctx.fs(12);
        txt(g, { x: x0 + w + 5, y: cy + MID * fs, 'font-size': fs, 'font-weight': 800, fill: T.text }, ctx.fmt(Math.round(v[i])));
      }
      el(g, 'rect', { x: 0, y: cy - cat.band / 2, width: W, height: cat.band, fill: 'transparent', 'data-cs-hit': 1 });
    }
  },
});
