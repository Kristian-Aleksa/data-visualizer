// G19 Rank Strip — one row per item, one cell per period, shade = rank (#1 darkest). Rows are
// ordered by their final rank, so a climber's row darkens left to right; a flag at the end says
// how far each one moved.

import { defineChart } from '../../core/define';
import { boost, byPreset } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { captionLine, laterInk, laterShades5 } from '../basics/shared';
import { glanceFrame } from './shared';

const RANKS: [string, number[]][] = [['Flows', [5, 3, 2, 1, 1, 1]], ['Editor', [1, 1, 1, 2, 2, 2]], ['Boards', [2, 2, 3, 3, 3, 4]], ['Vault', [4, 5, 5, 4, 4, 3]], ['Docs', [3, 4, 4, 5, 5, 5]]];

/** Rows, periods and each row's rank per period (from ranks, or from values ranked per period). */
function ranking(rows: { item: string; period: string; v: number }[], fromValues: boolean) {
  const items: string[] = [], periods: string[] = [];
  const raw = new Map<string, number>();
  for (const r of rows) {
    if (!items.includes(r.item)) items.push(r.item);
    if (!periods.includes(r.period)) periods.push(r.period);
    raw.set(`${r.item}|${r.period}`, r.v);
  }
  const rk = items.map((it) => periods.map((p) => raw.get(`${it}|${p}`) ?? NaN));
  if (fromValues) {
    periods.forEach((_, q) => {
      const order = items.map((_, i) => i).filter((i) => Number.isFinite(rk[i][q])).sort((a, b) => rk[b][q] - rk[a][q]);
      const out = items.map(() => NaN);
      order.forEach((i, pos) => (out[i] = pos + 1));
      items.forEach((_, i) => (rk[i][q] = out[i]));
    });
  }
  return { items, periods, rk };
}

const autoCaption = (s: Settings) => `CELL = RANK THAT ${String(s.periodWord ?? '').toUpperCase()} · #1 WEARS BLACK · READ EACH ROW LIKE A FILMSTRIP`;

export default defineChart({
  id: 'G19',
  name: 'Rank Strip',
  family: 'glance',
  kinds: ['ranking', 'time'],
  description: 'One row per item, one cell per period, shaded by rank; the climber’s row darkens.',
  card: { width: 689, chartHeight: 506.3875 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 600,
      columns: [
        { key: 'item', label: 'Item', type: 'text', role: 'label' },
        { key: 'period', label: 'Period', type: 'text', role: 'category' },
        { key: 'value', label: 'Rank or value', type: 'number', role: 'value', help: 'A rank (1 = top) or a value to rank, as set under Chart options.' },
      ],
    }],
  },
  defaultData: { rows: RANKS.flatMap(([item, rk]) => rk.map((value, q) => ({ item, period: `Q${q + 1}`, value }))) },
  text: {
    title: 'Flows climbs to the top',
    subtitle: 'one row per product, one cell per quarter · darker = higher rank · a bar race you can print',
    source: 'RANK STRIP · MONO-GLANCE · BILLING',
  },
  fields: [
    {
      key: 'valuesAre', label: 'Numbers are', group: 'options', section: 'Data', type: 'select', default: 'ranks',
      options: [{ value: 'ranks', label: 'Ranks (1 = top)' }, { value: 'values', label: 'Values (largest ranks first)' }],
    },
    {
      key: 'highlight', label: 'Bold row', group: 'options', section: 'Rows', type: 'select', default: 'climber',
      options: [{ value: 'climber', label: 'The biggest climber' }, { value: 'top', label: 'The final #1' }, { value: 'none', label: 'None' }],
    },
    { key: 'cell', label: 'Cell size', group: 'options', section: 'Cells', type: 'number', min: 8, max: 60, step: 0.5, unit: 'px', default: 32 },
    { key: 'cellGapX', label: 'Gap across', group: 'options', section: 'Cells', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 6 },
    { key: 'cellGapY', label: 'Gap down', group: 'options', section: 'Cells', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 10 },
    { key: 'cellRadius', label: 'Cell rounding', group: 'options', section: 'Cells', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 8 },
    { key: 'darkRanks', label: 'Light numbers on the top', group: 'options', section: 'Cells', type: 'number', min: 0, max: 5, step: 1, unit: 'ranks', default: 2 },
    { key: 'labelColumn', label: 'Row label column', group: 'options', section: 'Cells', type: 'number', min: 20, max: 200, step: 1, unit: 'px', default: 110 },
    { key: 'autoFit', label: 'Shrink to fit large strips', group: 'options', section: 'Cells', type: 'boolean', default: true },
    { key: 'showChange', label: 'Change flag (▲ / ▼)', group: 'options', section: 'Cells', type: 'boolean', default: true },
    { key: 'periodWord', label: 'One period is a…', group: 'options', section: 'Units', type: 'text', default: 'quarter', help: 'Caption: “CELL = RANK THAT QUARTER”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s) => autoCaption(s),
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  frame: glanceFrame,
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const { items, periods, rk } = ranking(ctx.rows.map((r) => ({ item: String(r.item), period: String(r.period), v: Number(r.value) })), ctx.str('valuesAre') === 'values');
    const last = periods.length - 1;
    // rows ordered by final rank: the climber lands on top
    const order = items.map((_, i) => i).sort((a, b) => (rk[a][last] || 1e9) - (rk[b][last] || 1e9));
    const moved = items.map((_, i) => (rk[i][0] || 0) - (rk[i][last] || 0));
    const hl = ctx.str('highlight');
    const hero = hl === 'none' ? -1 : hl === 'top' ? order[0] : moved.indexOf(Math.max(...moved));
    let C = ctx.num('cell'), gx = ctx.num('cellGapX'), gy = ctx.num('cellGapY');
    const X0 = ctx.num('labelColumn'), Y0 = 64;
    if (ctx.bool('autoFit')) {
      const k = Math.min(1, (392 - 30 - X0) / (periods.length * (C + gx)), (282 - Y0) / (items.length * (C + gy)));
      [C, gx, gy] = [C * k, gx * k, gy * k];
    }
    const PX = C + gx, PY = C + gy;
    const shades = laterShades5(T);
    const ink = laterInk(T);
    const quietText = byPreset(T, { mono: '#55544E', porcelain: T.label, palm: T.text, wire: T.text }, T.label);
    const darkN = Math.round(ctx.num('darkRanks'));
    if (ctx.bool('categoryLabels')) {
      periods.forEach((q, k) => txt(s, {
        x: X0 + k * PX + C / 2, y: Y0 - 12, 'font-size': ctx.fs(7.5), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle',
        'letter-spacing': '.08em', class: 'fade', style: `animation-delay:${k * 0.04}s`,
      }, q));
    }
    order.forEach((idx, i) => {
      const y = Y0 + i * PY, isHero = idx === hero, name = items[idx];
      const g = keyed(el(s, 'g', {}), `item-${idx}`);
      if (ctx.bool('categoryLabels')) {
        txt(g, {
          x: X0 - 12, y: y + C / 2 + 3, 'font-size': ctx.fs(8.5), 'font-weight': isHero ? 800 : 600, fill: isHero ? ink : T.label, 'text-anchor': 'end',
          class: 'fade', style: `animation-delay:${i * 0.07}s`,
        }, name);
      }
      rk[idx].forEach((r, q) => {
        if (!Number.isFinite(r)) return;
        const cell = el(g, 'rect', {
          x: X0 + q * PX, y, width: C, height: C, rx: Math.min(ctx.num('cellRadius'), C / 2), fill: shades[Math.max(0, Math.min(shades.length - 1, r - 1))],
          stroke: T.floor, 'stroke-width': boost(T, 0.5, 0.9), class: 'pop', style: `animation-delay:${i * 0.07 + q * 0.035}s`,
        });
        tip(cell, `${name} — #${r} in ${periods[q]}`);
        if (ctx.bool('dataLabels')) {
          txt(g, {
            x: X0 + q * PX + C / 2, y: y + C / 2 + 3.5, 'font-size': ctx.fs(9.5), 'font-weight': 800, fill: r <= darkN ? T.bg : quietText, 'text-anchor': 'middle',
            class: 'fade', style: `animation-delay:${0.1 + i * 0.07 + q * 0.035}s`,
          }, r);
        }
      });
      if (ctx.bool('showChange')) {
        const d = moved[idx];
        txt(g, {
          x: X0 + periods.length * PX + 8, y: y + C / 2 + 3, 'font-size': ctx.fs(8), 'font-weight': 800, fill: d > 0 ? ink : d < 0 ? T.faintData : T.faint,
          class: 'fade', style: `animation-delay:${0.5 + i * 0.07}s`,
        }, d > 0 ? '▲' + d : d < 0 ? '▼' + -d : '—');
      }
    });
    captionLine(ctx, autoCaption(ctx.s), 308, 1.1, { fill: T.faintData });
  },
});
