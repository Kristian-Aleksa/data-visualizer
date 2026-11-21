// X01 Tick Strip — a hundred hairline ticks in one row, split into segments by shade; each
// segment's label sits under it (first left-aligned, last right-aligned, the rest centred) and a
// dot marks every tenth tick.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import type { ChartData } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint } from '../editorial/shared';

const SEG: [string, number][] = [['IN PUBLIC', 68], ['PRIVATE', 21], ['OPEN', 11]];
const MONO_SHADES = ['#1C1C1A', '#8F8E88', '#C6C5BF'];

const valuesOf = (d: ChartData) => (d.rows ?? []).map((r) => Math.max(0, Number(r.value) || 0));
const autoCaption = (d: ChartData) => {
  const v = valuesOf(d);
  return `${v.join(' + ')} = ${v.reduce((a, b) => a + b, 0)} · DOT MARKS EVERY TENTH`;
};

/** Ticks per segment, rounded so they add up to exactly `total` (largest remainders first). */
function shareOut(values: number[], total: number): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v / sum) * total), out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
    if (left-- > 0) out[i]++;
  });
  return out;
}

export default defineChart({
  id: 'X01',
  name: 'Tick Strip',
  family: 'extras',
  kinds: ['part-to-whole'],
  description: 'A hundred ticks in one row, split into shaded segments that add up to the whole.',
  card: { width: 689, chartHeight: 133 },
  size: { w: 400, h: 84 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 8,
      columns: [
        { key: 'label', label: 'Segment', type: 'text', role: 'label' },
        { key: 'value', label: 'Share', type: 'number', role: 'value', min: 0, help: 'Out of 100 (other totals are scaled to the ticks).' },
      ],
    }],
  },
  defaultData: { rows: SEG.map(([label, value]) => ({ label, value })) },
  text: {
    title: '1,204 questions asked between Aug 2025 and Jul 2026',
    subtitle: 'one tick = 1% ≈ 12 questions · ink = answered in public · mid-grey = answered privately · pale = still open',
    source: 'TICK STRIP · MONO-REPORT · FORUM + CALL LOGS',
  },
  fields: [
    { key: 'ticks', label: 'Ticks', group: 'options', section: 'Ticks', type: 'number', min: 10, max: 300, step: 1, default: 100, help: 'The strip keeps its width; segments get their share of the ticks.' },
    { key: 'tickHeight', label: 'Tick height', group: 'options', section: 'Ticks', type: 'number', min: 1, max: 40, step: 0.5, unit: 'px', default: 12 },
    { key: 'tickJitter', label: 'Height variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 7 },
    { key: 'dotEvery', label: 'Dot every', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 50, step: 1, unit: 'ticks', default: 10, help: '0 turns the counting dots off.' },
    { key: 'unit', label: 'Tooltip ending', group: 'options', section: 'Units', type: 'text', default: '% of all questions' },
  ],
  supports: { categoryLabels: true, grid: true, caption: true },
  caption: (_s, _T, d) => autoCaption(d),
  paletteNeeds: ['sequential'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const segs = ctx.rows.map((r) => ({ name: String(r.label), v: Math.max(0, Number(r.value) || 0) }));
    const N = Math.max(1, Math.round(ctx.num('ticks')));
    const counts = shareOut(segs.map((x) => x.v), N);
    const base = 46, X0 = 14, PX = (3.72 * 100) / N, n = segs.length;
    const shade = (si: number) => pick(T, MONO_SHADES[si] ?? T.ladder[Math.min(T.ladder.length - 1, si + 2)], [T.data, T.data2, T.faintData][si] ?? T.ser[si % T.ser.length]);
    const pale = (si: number) => n > 1 && si === n - 1;
    if (ctx.bool('showGrid')) el(s, 'line', { x1: X0, y1: base, x2: X0 + N * PX, y2: base, stroke: T.grid, 'stroke-width': 0.8, class: 'fade' });
    const every = Math.round(ctx.num('dotEvery'));
    let k0 = 0;
    segs.forEach(({ name, v }, si) => {
      const g = keyed(el(s, 'g', {}), `seg-${si}`);
      for (let k = 0; k < counts[si]; k++) {
        const idx = k0 + k, x = X0 + idx * PX + PX / 2;
        const h = ctx.num('tickHeight') + rnd(idx + 1, si + 2) * ctx.num('tickJitter');
        el(g, 'line', {
          x1: x, y1: base, x2: x, y2: base - h, stroke: shade(si), 'stroke-width': pale(si) ? 0.7 : 0.9,
          opacity: pale(si) ? 0.9 : 0.6 + rnd(idx + 3, si + 5) * 0.4, class: 'fade', style: `animation-delay:${idx * 0.008}s`,
        });
        if (every > 0 && idx % every === 0) el(g, 'circle', { cx: x, cy: base + 4.5, r: 0.8, fill: lFaint(T), class: 'fade', style: `animation-delay:${idx * 0.008}s` });
      }
      if (ctx.bool('categoryLabels')) {
        // first label left-aligned, last right-aligned, the rest centred under their segment
        const [lx, anchor] = si === 0 ? [X0, 'start'] : si === n - 1 ? [X0 + N * PX, 'end'] : [X0 + (k0 + counts[si] / 2) * PX, 'middle'];
        const lab = txt(g, {
          x: lx, y: base + 18, 'font-size': ctx.fs(7.5), 'font-weight': 800, fill: pale(si) ? T.muted : shade(si), 'text-anchor': anchor,
          'letter-spacing': '.06em', class: 'fade', style: `animation-delay:${0.5 + si * 0.12}s`,
        }, `${name} · ${ctx.fmt(v)}`);
        tip(lab, `${name} — ${ctx.fmt(v)}${ctx.str('unit')}`);
      }
      k0 += counts[si];
    });
    if (ctx.s.showCaption !== false) {
      txt(s, { x: 200, y: 78, 'font-size': ctx.fs(6.5), 'font-weight': 600, fill: lFaint(T, '#B0AFA9'), 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:.9s' }, ctx.str('caption').trim() || autoCaption(ctx.data));
    }
  },
});
