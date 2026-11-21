// L19 Parallel Coordinates — one hairline per item across several axes; the bundle's shape shows
// which dimensions move together, and the item that does best across the board is inked and
// named. Any number of axes; each axis says whether higher or lower is better (or neither) when
// picking the winner.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { byPreset, pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { laterInk, laterShades5 } from '../basics/shared';

const DIMS: [string, number, number, string][] = [['PRICE $', 8, 30, 'neither'], ['CSAT', 6, 9.6, 'higher'], ['RETENTION %', 55, 95, 'higher'], ['GROWTH %', -5, 40, 'higher']];
const P: [string, number[]][] = [
  ['Editor', [12, 9.1, 91, 22]], ['Boards', [18, 8.4, 86, 18]], ['Forms', [9, 8.8, 78, 31]],
  ['Docs', [15, 8.0, 82, 12]], ['Chat', [7, 7.2, 64, 8]], ['Vault', [24, 7.8, 88, 6]],
  ['Flows', [21, 8.6, 90, 38]], ['Views', [11, 7.5, 71, 14]], ['Sync', [16, 6.9, 58, -2]],
  ['Pages', [8, 8.2, 74, 19]], ['Grid', [19, 7.1, 62, 4]], ['Hub', [13, 6.6, 52, 9]],
];

export default defineChart({
  id: 'L19',
  name: 'Parallel Coordinates',
  family: 'editorial',
  kinds: ['comparison', 'lines'],
  description: 'One hairline per item across several axes; the best all-rounder is inked and named.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [
      {
        key: 'rows',
        label: 'Values',
        minRows: 1,
        maxRows: 2000,
        columns: [
          { key: 'item', label: 'Item', type: 'text', role: 'label' },
          { key: 'axis', label: 'Axis', type: 'text', role: 'category' },
          { key: 'value', label: 'Value', type: 'number', role: 'value' },
        ],
      },
      {
        key: 'axes',
        label: 'Axes',
        minRows: 0,
        maxRows: 12,
        columns: [
          { key: 'axis', label: 'Axis', type: 'text', role: 'category', help: 'Sets the order. Axes missing here are added after these, with ranges from the data.' },
          { key: 'min', label: 'Bottom', type: 'number', role: 'value', required: false, help: 'Empty = the smallest value.' },
          { key: 'max', label: 'Top', type: 'number', role: 'value', required: false, help: 'Empty = the largest value.' },
          { key: 'better', label: 'Better is', type: 'text', required: false, help: '“higher”, “lower” or “neither” (left out when picking the winner).' },
        ],
      },
    ],
  },
  defaultData: {
    rows: P.flatMap(([item, vals]) => vals.map((value, k) => ({ item, axis: DIMS[k][0], value }))),
    axes: DIMS.map(([axis, min, max, better]) => ({ axis, min, max, better })),
  },
  text: {
    title: 'Twelve products, four dimensions',
    subtitle: 'one hairline = one product across price · satisfaction · retention · growth · ink = the one that wins everywhere',
    source: 'PARALLEL COORDS · MONO-EDITORIAL · PRODUCT PANEL',
  },
  fields: [
    { key: 'pick', label: 'Inked item', group: 'options', section: 'Winner', type: 'text', default: '', placeholder: 'Automatic', help: 'Empty = the best across the axes marked “higher” or “lower”. Type a name to ink that one instead.' },
    { key: 'showWinner', label: 'Ink a winner', group: 'options', section: 'Winner', type: 'boolean', default: true },
    { key: 'lineWidth', label: 'Hairline width', group: 'options', section: 'Lines', type: 'number', min: 0.1, max: 4, step: 0.05, unit: 'px', default: 0.65 },
    { key: 'winnerWidth', label: 'Winner line width', group: 'options', section: 'Lines', type: 'number', min: 0.1, max: 8, step: 0.1, unit: 'px', default: 2 },
    { key: 'lineOpacity', label: 'Hairline opacity', group: 'options', section: 'Lines', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5, help: 'Plus a little variation per line.' },
    { key: 'axisStart', label: 'First axis', group: 'options', section: 'Axes', type: 'number', min: 0, max: 400, step: 1, unit: 'px', default: 64 },
    { key: 'axisEnd', label: 'Last axis', group: 'options', section: 'Axes', type: 'number', min: 0, max: 400, step: 1, unit: 'px', default: 340 },
  ],
  supports: { categoryLabels: true, dataLabels: true, axes: true, caption: true },
  caption: () => 'ONE HAIRLINE = ONE PRODUCT · INK = BEST ACROSS THE BOARD',
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const axes: { name: string; lo: number | null; hi: number | null; better: string }[] = (ctx.data.axes ?? []).map((r) => ({
      name: String(r.axis ?? '').trim(), lo: r.min === null || r.min === undefined || r.min === '' ? null : Number(r.min),
      hi: r.max === null || r.max === undefined || r.max === '' ? null : Number(r.max), better: String(r.better ?? '').trim().toLowerCase(),
    })).filter((a) => a.name);
    const items: string[] = [];
    const val = new Map<string, number>();
    for (const r of ctx.rows) {
      const it = String(r.item), ax = String(r.axis).trim();
      if (!items.includes(it)) items.push(it);
      if (!axes.some((a) => a.name === ax)) axes.push({ name: ax, lo: null, hi: null, better: 'higher' });
      val.set(`${it}|${ax}`, Number(r.value));
    }
    const nA = axes.length;
    // ranges: as given, or from the data
    const rng = axes.map((a) => {
      const vs = items.map((it) => val.get(`${it}|${a.name}`)).filter((v): v is number => v !== undefined && Number.isFinite(v));
      let lo = a.lo ?? Math.min(...vs), hi = a.hi ?? Math.max(...vs);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) [lo, hi] = [0, 1];
      if (lo === hi) hi = lo + 1;
      return [lo, hi];
    });
    const x0 = ctx.num('axisStart'), x1 = ctx.num('axisEnd');
    const AX = axes.map((_, k) => (nA > 1 ? x0 + (k * (x1 - x0)) / (nA - 1) : (x0 + x1) / 2));
    const TOP = 64, BOT = 252;
    const mapY = (k: number, v: number) => BOT - ((v - rng[k][0]) / (rng[k][1] - rng[k][0])) * (BOT - TOP);
    // the winner: best on the axes that say which way is better
    const score = (it: string) => axes.reduce((sum, a, k) => {
      const v = val.get(`${it}|${a.name}`);
      if (v === undefined || !/^(higher|lower)$/.test(a.better)) return sum;
      const t = (v - rng[k][0]) / (rng[k][1] - rng[k][0]);
      return sum + (a.better === 'lower' ? 1 - t : t);
    }, 0);
    const want = ctx.str('pick').trim().toLowerCase();
    const hero = !ctx.bool('showWinner') ? '' : want ? items.find((it) => it.toLowerCase() === want) ?? '' : items.reduce((a, b) => (score(b) > score(a) ? b : a), items[0] ?? '');
    const S5 = laterShades5(T), ink = laterInk(T);
    const heroInk = byPreset(T, { mono: ink, porcelain: ink, palm: ink, wire: T.hero }, ink);
    const rail = T.faintData, railW = 1 * (T.inkBoost?.strokeScale ?? 1);
    if (ctx.bool('showAxes')) {
      axes.forEach((a, di) => {
        el(s, 'line', { x1: AX[di], y1: TOP - 8, x2: AX[di], y2: BOT + 8, stroke: rail, 'stroke-width': railW, class: 'fade', style: `animation-delay:${di * 0.06}s` });
        [TOP - 8, BOT + 8].forEach((yy) => el(s, 'line', { x1: AX[di] - 4, y1: yy, x2: AX[di] + 4, y2: yy, stroke: rail, 'stroke-width': railW, class: 'fade', style: `animation-delay:${di * 0.06}s` }));
        if (ctx.bool('categoryLabels')) txt(s, { x: AX[di], y: TOP - 22, 'font-size': ctx.fs(7), 'font-weight': 800, fill: T.label, 'text-anchor': 'middle', 'letter-spacing': '.08em', class: 'fade', style: `animation-delay:${di * 0.06}s` }, a.name);
        txt(s, { x: AX[di] + 8, y: TOP - 5, 'font-size': ctx.fs(6.5), 'font-weight': 600, fill: T.faint, class: 'fade', style: `animation-delay:${0.1 + di * 0.06}s` }, String(rng[di][1]));
        txt(s, { x: AX[di] + 8, y: BOT + 11, 'font-size': ctx.fs(6.5), 'font-weight': 600, fill: T.faint, class: 'fade', style: `animation-delay:${0.1 + di * 0.06}s` }, String(rng[di][0]));
      });
    }
    items.forEach((it, i) => {
      const isHero = it === hero;
      const pts = axes.map((a, k) => {
        const v = val.get(`${it}|${a.name}`);
        return v === undefined || !Number.isFinite(v) ? null : ([k, mapY(k, v)] as [number, number]);
      }).filter((p): p is [number, number] => p !== null);
      if (!pts.length) return;
      let d = `M${AX[pts[0][0]]} ${pts[0][1].toFixed(1)}`;
      for (let k = 0; k < pts.length - 1; k++) {
        const [ka, ya] = pts[k], [kb, yb] = pts[k + 1], mx = (AX[ka] + AX[kb]) / 2;
        d += ` C${mx} ${ya.toFixed(1)} ${mx} ${yb.toFixed(1)} ${AX[kb]} ${yb.toFixed(1)}`;
      }
      const g = keyed(el(s, 'g', {}), `it-${i}`);
      const ln = el(g, 'path', {
        d, fill: 'none', stroke: isHero ? pick(T, '#1C1C1A', T.hero) : S5[2], 'stroke-width': isHero ? ctx.num('winnerWidth') : ctx.num('lineWidth'),
        opacity: isHero ? 1 : Math.round((ctx.num('lineOpacity') + rnd(i + 1, 5) * 0.3) * 1000) / 1000, class: 'draw', style: `animation-delay:${0.2 + i * 0.05}s;animation-duration:.8s`,
      });
      tip(ln, `${it} — ${axes.map((a) => `${a.name} ${val.get(`${it}|${a.name}`) ?? '–'}`).join(' · ')}`);
      pts.forEach(([k, y]) => el(g, 'circle', { cx: AX[k], cy: y, r: isHero ? 3 : 1.4, fill: isHero ? heroInk : S5[2], opacity: isHero ? 1 : 0.7, class: 'pop', style: `animation-delay:${0.3 + i * 0.05 + k * 0.04}s` }));
      if (isHero && ctx.bool('dataLabels')) {
        const [kl, yl] = pts[pts.length - 1];
        txt(g, { x: AX[kl] + 12, y: yl + 3, 'font-size': ctx.fs(9), 'font-weight': 800, fill: heroInk, style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:1s`, class: 'fade' }, it);
      }
    });
    if (ctx.s.showCaption !== false) {
      txt(s, { x: 200, y: 302, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faintData, 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:1.2s' }, ctx.str('caption').trim() || 'ONE HAIRLINE = ONE PRODUCT · INK = BEST ACROSS THE BOARD');
    }
  },
});
