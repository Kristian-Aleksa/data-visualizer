// B09 Rung Waterfall — from a starting total to the net, one small ladder per step: additions in
// solid rungs, subtractions in dashed rungs, joined by dashed hand-off lines.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, type Theme } from '../../core/theme';
import type { Issue, Settings } from '../../core/types';
import { el, hit, keyed, tip, txt } from '../../core/vnode';
import { captionLine, categoryLabel, plain } from './shared';

const DEMO: [string, number, string][] = [['GROSS', 42, 'start'], ['REFUNDS', -6, 'change'], ['COGS', -11, 'change'], ['OPS', -8, 'change'], ['NET', 17, 'total']];

type Kind = 'start' | 'change' | 'total';
const kindOf = (v: unknown): Kind => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'start' || s === 'total' ? s : 'change';
};

const unitText = (s: Settings, v: number) => `${s.unitPrefix ?? ''}${plain(v)}${s.unitSuffix ?? ''}`;

/** Palm always shows the net in its accent; Wire's one-highlight rule picks it too. */
const accentNet = (s: Settings, T: Theme) => s.highlightNet === 'on' || (s.highlightNet === 'auto' && (T.heroMode || T.id === 'palm'));

const autoCaption = (s: Settings, T: Theme) =>
  T.id === 'palm' && s.highlightNet === 'auto'
    ? `SOLID ADD · DASHED TAKE AWAY · NET IN ACCENT · ONE RUNG = ${unitText(s, Number(s.unitValue)).toUpperCase()}`
    : `SOLID RUNGS ADD · DASHED RUNGS TAKE AWAY · ONE RUNG = ${unitText(s, Number(s.unitValue)).toUpperCase()}`;

export default defineChart({
  id: 'B09',
  name: 'Rung Waterfall',
  family: 'basics',
  kinds: ['bars', 'flow'],
  description: 'A waterfall walked one ladder at a time: solid rungs add, dashed rungs take away.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 10,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', required: false, help: 'Changes are + or −. A total’s value is worked out for you.' },
        { key: 'type', label: 'Type', type: 'text', role: 'category', required: false, help: '“start”, “change” (the default) or “total”.' },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, value, type]) => ({ label, value, type })) },
  text: {
    title: 'From gross to net, step by step',
    subtitle: 'one rung = $1k · solid rungs add, hollow rungs take away · the ladder walks down',
    source: 'RUNG WATERFALL · MONO-BASIC · P&L',
  },
  fields: [
    { key: 'unitValue', label: 'Value per rung', group: 'options', section: 'Rungs', type: 'number', min: 0.1, max: 1000, step: 0.1, default: 1 },
    { key: 'rungStep', label: 'Rung spacing', group: 'options', section: 'Rungs', type: 'number', min: 2, max: 14, step: 0.1, unit: 'px', default: 5.2 },
    { key: 'rungLength', label: 'Rung length', group: 'options', section: 'Rungs', type: 'number', min: 3, max: 26, step: 0.5, unit: 'px', default: 11, help: 'Half the width of a ladder.' },
    { key: 'widthJitter', label: 'Length jitter', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.2 },
    { key: 'rungWidth', label: 'Rung thickness', group: 'options', section: 'Rungs', type: 'number', min: 0.3, max: 4, step: 0.1, unit: 'px', default: 1, help: 'Colour palettes draw rungs 1.8× thicker.' },
    { key: 'opacityJitter', label: 'Opacity variation', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.4, help: 'Colour palettes cap this so thin lines stay visible.' },
    { key: 'dash', label: 'Dashed rung pattern', group: 'options', section: 'Rungs', type: 'number', min: 0.5, max: 8, step: 0.5, unit: 'px', default: 2.5 },
    { key: 'stepSpacing', label: 'Step spacing', group: 'options', section: 'Steps', type: 'number', min: 30, max: 140, step: 1, unit: 'px', default: 72 },
    { key: 'handoff', label: 'Hand-off lines', group: 'options', section: 'Steps', type: 'boolean', default: true },
    { key: 'labelGap', label: 'Value label gap', group: 'options', section: 'Steps', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 8 },
    { key: 'autoFit', label: 'Shrink to fit tall or many steps', group: 'options', section: 'Steps', type: 'boolean', default: true },
    {
      key: 'highlightNet', label: 'Accent the total', group: 'options', section: 'Steps', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }],
      help: 'Palm and Wire draw the final total in their accent colour.',
    },
    { key: 'unitPrefix', label: 'Unit prefix', group: 'options', section: 'Units', type: 'text', default: '$' },
    { key: 'unitSuffix', label: 'Unit suffix', group: 'options', section: 'Units', type: 'text', default: 'k' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, T),
  paletteNeeds: ['highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  validate(data) {
    const issues: Issue[] = [];
    (data.rows ?? []).forEach((r, i) => {
      const k = kindOf(r.type);
      if (k !== 'total' && (r.value === null || r.value === undefined)) issues.push({ table: 'rows', row: i, column: 'value', message: `Row ${i + 1}: “${r.label}” needs a value (only totals can be left empty).` });
    });
    return issues;
  },
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    // the running level after each step; totals show the level reached so far
    let lv = 0;
    const rows = ctx.rows.map((r) => {
      const name = String(r.label), kind = kindOf(r.type), raw = Number(r.value ?? 0) || 0;
      if (kind === 'start') {
        lv = raw;
        return { name, kind, v: raw, lo: 0, hi: raw };
      }
      if (kind === 'total') return { name, kind, v: lv, lo: 0, hi: lv };
      const from = lv;
      lv += raw;
      return { name, kind, v: raw, lo: Math.min(from, lv), hi: Math.max(from, lv) };
    });
    const n = rows.length;
    const unit = Math.max(1e-6, ctx.num('unitValue'));
    const toK = (v: number) => Math.round(v / unit);
    const base = 252, HW = ctx.num('rungLength');
    let step = ctx.num('rungStep'), sp = ctx.num('stepSpacing');
    // levels reached by any ladder; when the running total dips below zero, the ladders are
    // lifted so the lowest one still stands on the floor
    const levels = rows.flatMap((r) => (r.kind === 'change' ? [toK(r.lo), toK(r.hi)] : [0, toK(r.v)]));
    const minK = Math.min(0, ...levels), maxK = Math.max(0, ...levels);
    if (ctx.bool('autoFit')) {
      const tallest = Math.max(1, maxK - minK);
      if (tallest * step > base - 30) step = (base - 30) / tallest;
      const span = 340 - 2 * (HW + 6);
      if ((n - 1) * sp > span) sp = span / Math.max(1, n - 1);
    }
    const x0 = (i: number) => 202 + (i - (n - 1) / 2) * sp;
    const yOf = (k: number) => base - (k - minK) * step;
    const jit = ctx.num('widthJitter');
    const sw = ctx.num('rungWidth') * boost(T, 1, 1.8);
    const oj = T.inkBoost ? Math.min(ctx.num('opacityJitter'), 1 - T.inkBoost.opacityFloor) : ctx.num('opacityJitter');
    const dash = ctx.num('dash');
    const accent = accentNet(ctx.s, T);
    const lastTotal = rows.map((r) => r.kind).lastIndexOf('total');
    rows.forEach(({ name, kind, v, lo, hi }, i) => {
      const x = x0(i), isTotal = kind !== 'change', neg = v < 0 && !isTotal;
      const from = isTotal ? 0 : toK(lo), to = isTotal ? toK(v) : toK(hi), cnt = Math.abs(to - from);
      const g = keyed(el(s, 'g', {}), `step-${i}`);
      tip(g, `${name} — ${neg ? '−' : ''}${unitText(ctx.s, Math.abs(v))}`);
      const ink = accent && i === lastTotal ? T.hero : T.data;
      for (let k = 0; k < cnt; k++) {
        const y = yOf(Math.min(from, to) + k), w = HW - jit + rnd(k + 1, i + 2) * 2 * jit;
        if (neg) {
          el(g, 'line', {
            x1: x - w, y1: y, x2: x + w, y2: y, stroke: T.data2, 'stroke-width': sw, 'stroke-dasharray': `${dash} ${dash}`,
            opacity: boost(T, 0.7, 0.85), class: 'fade', style: `animation-delay:${i * 0.12 + k * 0.014}s`,
          });
        } else {
          el(g, 'line', {
            x1: x - w, y1: y, x2: x + w, y2: y, stroke: ink, 'stroke-width': sw,
            opacity: 1 - oj + rnd(k + 2, i + 4) * oj, class: 'fade', style: `animation-delay:${i * 0.12 + k * 0.014}s`,
          });
        }
      }
      if (i < n - 1 && ctx.bool('handoff')) {
        const lvl = isTotal ? toK(v) : neg ? toK(lo) : toK(hi);
        el(g, 'line', {
          x1: x + HW + 2, y1: yOf(lvl), x2: x0(i + 1) - HW - 2, y2: yOf(lvl), stroke: T.faint,
          'stroke-width': 0.7, 'stroke-dasharray': '2 3', class: 'fade', style: `animation-delay:${0.3 + i * 0.12}s`,
        });
      }
      if (ctx.bool('dataLabels')) {
        txt(g, {
          x, y: yOf(Math.max(from, to)) - ctx.num('labelGap'), 'font-size': ctx.fs(10), 'font-weight': 800, fill: neg ? T.data2 : T.text,
          'text-anchor': 'middle', class: 'fade', style: `animation-delay:${0.4 + i * 0.12}s`,
        }, (neg ? '−' : '') + ctx.fmt(Math.abs(v)));
      }
      categoryLabel(ctx, g, x, base + 18, name, i * 0.12);
      const hy = yOf(Math.max(from, to)) - 22;
      hit(g, x - HW - 3, hy, 2 * HW + 6, Math.max(yOf(Math.min(from, to)), base) + 24 - hy);
    });
    el(s, 'line', { x1: 30, y1: yOf(0) + 4, x2: 370, y2: yOf(0) + 4, stroke: T.grid, 'stroke-width': 0.8, class: 'fade' });
    captionLine(ctx, autoCaption(ctx.s, T), 302, 1.2);
  },
});
