// B06 Paired Rungs — grouped columns as two ladders side by side: the earlier period in faint
// rungs, the later one in ink. The difference is countable rung by rung.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, pick, type Theme } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, hit, keyed, tip, txt } from '../../core/vnode';
import { captionLine, categoryLabel, label, plain } from './shared';

const DEMO: [string, number, number][] = [['FREE', 31, 38], ['STARTER', 22, 27], ['PRO', 16, 22], ['TEAM', 13, 16], ['ENT', 6, 9]];

const unitText = (s: Settings, v: number) => `${s.unitPrefix ?? ''}${plain(v)}${s.unitSuffix ?? ''}`;

const autoCaption = (s: Settings, T: Theme) =>
  `FAINT = ${String(s.seriesBefore).toUpperCase()} · ${pick(T, 'INK', 'SOLID')} = ${String(s.seriesAfter).toUpperCase()} · ONE RUNG = ${unitText(s, Number(s.unitValue)).toUpperCase()}`;

export default defineChart({
  id: 'B06',
  name: 'Paired Rungs',
  family: 'basics',
  kinds: ['bars', 'comparison'],
  description: 'Two ladders per category: last period in faint rungs, this period in ink.',
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
        { key: 'before', label: 'Before', type: 'number', role: 'value', min: 0, help: 'The earlier period (faint rungs).' },
        { key: 'after', label: 'After', type: 'number', role: 'value', min: 0, help: 'The later period (ink rungs).' },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, before, after]) => ({ label, before, after })) },
  text: {
    title: 'This year against last, plan by plan',
    subtitle: 'two ladders per plan · solid rungs = 2026 · faint rungs = 2025 · one rung = $1k',
    source: 'PAIRED RUNGS · MONO-BASIC · BILLING YoY',
  },
  fields: [
    { key: 'seriesBefore', label: 'Earlier series name', group: 'options', section: 'Series', type: 'text', default: '2025' },
    { key: 'seriesAfter', label: 'Later series name', group: 'options', section: 'Series', type: 'text', default: '2026' },
    { key: 'unitValue', label: 'Value per rung', group: 'options', section: 'Rungs', type: 'number', min: 0.1, max: 1000, step: 0.1, default: 1 },
    { key: 'rungStep', label: 'Rung spacing', group: 'options', section: 'Rungs', type: 'number', min: 2, max: 14, step: 0.1, unit: 'px', default: 5.4 },
    { key: 'rungLength', label: 'Rung length', group: 'options', section: 'Rungs', type: 'number', min: 3, max: 24, step: 0.5, unit: 'px', default: 10, help: 'Half the width of a ladder.' },
    { key: 'widthJitter', label: 'Length jitter', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.2 },
    { key: 'rungWidth', label: 'Rung thickness', group: 'options', section: 'Rungs', type: 'number', min: 0.3, max: 4, step: 0.1, unit: 'px', default: 1, help: 'Colour palettes draw rungs 1.8× thicker.' },
    { key: 'opacityJitter', label: 'Opacity variation', group: 'options', section: 'Rungs', type: 'number', min: 0, max: 0.9, step: 0.05, default: 0.4 },
    { key: 'pairOffset', label: 'Ladder offset', group: 'options', section: 'Groups', type: 'number', min: 4, max: 40, step: 0.5, unit: 'px', default: 13, help: 'Distance of each ladder from the group centre.' },
    { key: 'groupSpacing', label: 'Group spacing', group: 'options', section: 'Groups', type: 'number', min: 30, max: 140, step: 1, unit: 'px', default: 66 },
    { key: 'labelGap', label: 'Value label gap', group: 'options', section: 'Groups', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 9 },
    { key: 'autoFit', label: 'Shrink to fit tall or many groups', group: 'options', section: 'Groups', type: 'boolean', default: true },
    { key: 'unitPrefix', label: 'Unit prefix', group: 'options', section: 'Units', type: 'text', default: '$' },
    { key: 'unitSuffix', label: 'Unit suffix', group: 'options', section: 'Units', type: 'text', default: 'k' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, T),
  paletteNeeds: ['highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), was: Number(r.before), now: Number(r.after) }));
    const n = rows.length;
    const unit = Math.max(1e-6, ctx.num('unitValue'));
    const cnt = (v: number) => Math.max(0, Math.round(v / unit));
    const base = 258, HW = ctx.num('rungLength'), off = ctx.num('pairOffset');
    let step = ctx.num('rungStep'), sp = ctx.num('groupSpacing');
    if (ctx.bool('autoFit')) {
      const maxN = Math.max(1, ...rows.map((r) => Math.max(cnt(r.was), cnt(r.now))));
      if ((maxN - 1) * step > base - 26) step = (base - 26) / Math.max(1, maxN - 1);
      const span = 340 - 2 * (off + HW + 4);
      if ((n - 1) * sp > span) sp = span / Math.max(1, n - 1);
    }
    const x0 = (i: number) => 196 + (i - (n - 1) / 2) * sp;
    const jit = ctx.num('widthJitter');
    const sw = ctx.num('rungWidth') * boost(T, 1, 1.8);
    const oj = ctx.num('opacityJitter');
    const wasJ = boost(T, oj, oj * 0.625), wasTop = boost(T, 0.9, 1);
    const nowJ = boost(T, oj, Math.min(oj, 0.15));
    const gap = ctx.num('labelGap');
    const u = (v: number) => unitText(ctx.s, v);
    rows.forEach(({ name, was, now }, i) => {
      const xa = x0(i) - off, xb = x0(i) + off;
      const g = keyed(el(s, 'g', {}), `pair-${i}`);
      tip(g, `${name} — ${u(was)} → ${u(now)}`);
      const nw = cnt(was), nn = cnt(now);
      for (let k = 0; k < nw; k++) {
        const y = base - k * step, w = HW - jit + rnd(k + 1, i + 2) * 2 * jit;
        el(g, 'line', {
          x1: xa - w, y1: y, x2: xa + w, y2: y, stroke: T.faintData, 'stroke-width': sw,
          opacity: wasTop - wasJ + rnd(k + 2, i + 3) * wasJ, class: 'fade', style: `animation-delay:${i * 0.08 + k * 0.01}s`,
        });
      }
      for (let k = 0; k < nn; k++) {
        const y = base - k * step, w = HW - jit + rnd(k + 1, i + 7) * 2 * jit;
        el(g, 'line', {
          x1: xb - w, y1: y, x2: xb + w, y2: y, stroke: T.data, 'stroke-width': sw,
          opacity: 1 - nowJ + rnd(k + 2, i + 8) * nowJ, class: 'fade', style: `animation-delay:${0.15 + i * 0.08 + k * 0.01}s`,
        });
      }
      if (ctx.bool('dataLabels')) {
        txt(g, {
          x: xb, y: base - (Math.max(1, nn) - 1) * step - gap, 'font-size': ctx.fs(10.5), 'font-weight': 800, fill: T.heroMode ? T.hero : T.text,
          'text-anchor': 'middle', class: 'fade', style: `animation-delay:${0.5 + i * 0.08}s`,
        }, label(ctx, now));
        txt(g, {
          x: xa, y: base - (Math.max(1, nw) - 1) * step - gap, 'font-size': ctx.fs(8.5), 'font-weight': 700, fill: T.faintData,
          'text-anchor': 'middle', class: 'fade', style: `animation-delay:${0.5 + i * 0.08}s`,
        }, label(ctx, was));
      }
      categoryLabel(ctx, g, x0(i), base + 18, name, i * 0.08);
      const top = base - (Math.max(nw, nn, 1) - 1) * step - gap - 12;
      hit(g, x0(i) - off - HW - 3, top, 2 * (off + HW + 3), base + 24 - top);
    });
    el(s, 'line', { x1: 30, y1: base + 4, x2: 370, y2: base + 4, stroke: T.grid, 'stroke-width': 0.8, class: 'fade' });
    captionLine(ctx, autoCaption(ctx.s, T), 306, 1);
  },
});
