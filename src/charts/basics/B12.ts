// B12 Dumbbell Queue — before (hollow) and after (solid) on one track per row, with a countable
// bead for every unit saved strung between them.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { boost } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, hit, keyed, tip, txt } from '../../core/vnode';
import { captionLine, label, plain } from './shared';

const DEMO: [string, number, number][] = [['INVITE FLOW', 14, 6], ['FIRST BOARD', 19, 9], ['IMPORT DATA', 26, 13], ['TEAM SETUP', 31, 21], ['GO LIVE', 38, 30]];

const autoCaption = (s: Settings, mono: boolean) => {
  const u = Number(s.unitValue);
  const bead = u === 1 ? `ONE BEAD = ONE ${String(s.unitName ?? '').toUpperCase()} SAVED` : `ONE BEAD = ${plain(u)} ${String(s.measure ?? '').toUpperCase()} SAVED`;
  return `${bead} · HOLLOW = BEFORE · ${mono ? 'INK' : 'SOLID'} = AFTER`;
};

export default defineChart({
  id: 'B12',
  name: 'Dumbbell Queue',
  family: 'basics',
  kinds: ['comparison'],
  description: 'Before and after on one track, with a bead for every unit saved.',
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
        { key: 'before', label: 'Before', type: 'number', role: 'value' },
        { key: 'after', label: 'After', type: 'number', role: 'value' },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, before, after]) => ({ label, before, after })) },
  text: {
    title: 'Onboarding, before and after the redesign',
    subtitle: 'hollow dot = before · solid dot = after · beads on the track = minutes saved, countable',
    source: 'DUMBBELL QUEUE · MONO-BASIC · UX TIMING',
  },
  fields: [
    { key: 'xMin', label: 'Scale from', group: 'options', section: 'Scale', type: 'number', min: -1e6, max: 1e6, step: 1, default: 4 },
    { key: 'xMax', label: 'Scale to', group: 'options', section: 'Scale', type: 'number', min: -1e6, max: 1e6, step: 1, default: 40 },
    { key: 'autoRange', label: 'Widen the scale to fit the data', group: 'options', section: 'Scale', type: 'boolean', default: true },
    { key: 'unitValue', label: 'Value per bead', group: 'options', section: 'Beads', type: 'number', min: 0.1, max: 1000, step: 0.1, default: 1 },
    { key: 'beadSize', label: 'Bead size', group: 'options', section: 'Beads', type: 'number', min: 0.3, max: 6, step: 0.1, unit: 'px', default: 1.5, help: 'Colour palettes add 0.6 px.' },
    { key: 'beadJitter', label: 'Bead wobble', group: 'options', section: 'Beads', type: 'number', min: 0, max: 10, step: 0.1, unit: 'px', default: 2.6 },
    { key: 'beforeSize', label: '“Before” dot size', group: 'options', section: 'Dots', type: 'number', min: 1, max: 10, step: 0.1, unit: 'px', default: 4.2 },
    { key: 'afterSize', label: '“After” dot size', group: 'options', section: 'Dots', type: 'number', min: 1, max: 10, step: 0.1, unit: 'px', default: 4.6 },
    { key: 'rowSpacing', label: 'Row spacing', group: 'options', section: 'Rows', type: 'number', min: 16, max: 80, step: 1, unit: 'px', default: 46 },
    { key: 'labelColumn', label: 'Label column width', group: 'options', section: 'Rows', type: 'number', min: 40, max: 220, step: 1, unit: 'px', default: 118 },
    { key: 'lowWord', label: 'Left end label', group: 'options', section: 'Axis words', type: 'text', default: 'FASTER ←' },
    { key: 'highWord', label: 'Right end label', group: 'options', section: 'Axis words', type: 'text', default: 'MINUTES' },
    { key: 'unitName', label: 'One unit is a…', group: 'options', section: 'Units', type: 'text', default: 'minute', help: 'Caption: “ONE BEAD = ONE MINUTE SAVED”.' },
    { key: 'measure', label: 'Unit (plural)', group: 'options', section: 'Units', type: 'text', default: 'min', help: 'Tooltips: “14 min → 6 min”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (s, T) => autoCaption(s, T.kind === 'mono'),
  paletteNeeds: ['highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const D = ctx.rows.map((r) => ({ name: String(r.label), was: Number(r.before), now: Number(r.after) }));
    const n = D.length;
    const X0 = ctx.num('labelColumn'), X1 = 364;
    let [lo, hi] = [ctx.num('xMin'), ctx.num('xMax')];
    if (hi <= lo) hi = lo + 1;
    if (ctx.bool('autoRange')) {
      const vals = D.flatMap((d) => [d.was, d.now]);
      const mn = Math.min(...vals), mx = Math.max(...vals);
      if (mn < lo || mx > hi) {
        const pad = (Math.max(hi, mx) - Math.min(lo, mn)) * 0.04;
        if (mn < lo) lo = mn - pad;
        if (mx > hi) hi = mx + pad;
      }
    }
    const mapX = (v: number) => X0 + ((v - lo) / (hi - lo)) * (X1 - X0);
    let sp = ctx.num('rowSpacing');
    if ((n - 1) * sp > 214) sp = 214 / Math.max(1, n - 1);
    const y0 = (i: number) => 56 + i * sp;
    const unit = Math.max(1e-6, ctx.num('unitValue'));
    const measure = ctx.str('measure');
    const beadR = ctx.num('beadSize') + boost(T, 0, 0.6), bj = ctx.num('beadJitter');
    D.forEach(({ name, was, now }, i) => {
      const y = y0(i), xa = mapX(was), xb = mapX(now);
      const g = keyed(el(s, 'g', {}), `row-${i}`);
      tip(g, `${name} — ${label(ctx, was)} ${measure} → ${label(ctx, now)} ${measure}`.trim());
      if (ctx.bool('categoryLabels')) {
        txt(g, {
          x: X0 - 10, y: y + 3, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: T.label, 'text-anchor': 'end',
          'letter-spacing': '.06em', class: 'fade', style: `animation-delay:${i * 0.08}s`,
        }, name);
      }
      el(g, 'line', { x1: X0 - 6, y1: y, x2: X1 + 6, y2: y, stroke: T.track, 'stroke-width': 0.7, class: 'fade', style: `animation-delay:${i * 0.08}s` });
      const beads = Math.round(Math.abs(was - now) / unit);
      for (let k = 0; k < beads; k++) {
        const t = (k + 0.5) / beads, x = xb + t * (xa - xb), yy = y + (rnd(k + 1, i + 3) - 0.5) * bj;
        el(g, 'circle', {
          cx: x, cy: yy, r: beadR + rnd(k + 2, i + 4) * 0.9, fill: T.bead, opacity: boost(T, 0.85, 0.95),
          class: 'pop', style: `animation-delay:${0.3 + i * 0.08 + k * 0.03}s`,
        });
      }
      el(g, 'circle', {
        cx: xa, cy: y, r: ctx.num('beforeSize') + boost(T, 0, 0.6), fill: T.bg, stroke: T.data, 'stroke-width': boost(T, 1.3, 1.7),
        class: 'pop', style: `animation-delay:${0.2 + i * 0.08}s`,
      });
      el(g, 'circle', { cx: xb, cy: y, r: ctx.num('afterSize') + boost(T, 0, 0.6), fill: T.hero, class: 'pop', style: `animation-delay:${0.6 + i * 0.08}s` });
      if (ctx.bool('dataLabels')) {
        // the later value sits on the outer side of its dot, the earlier one on the other side
        const nowLeft = now <= was;
        txt(g, {
          x: nowLeft ? xa + 10 : xa - 10, y: y - 8, 'font-size': ctx.fs(8.5), 'font-weight': 700, fill: T.faintData,
          'text-anchor': nowLeft ? 'start' : 'end', class: 'fade', style: `animation-delay:${0.3 + i * 0.08}s`,
        }, label(ctx, was));
        txt(g, {
          x: nowLeft ? xb - 10 : xb + 10, y: y - 8, 'font-size': ctx.fs(10), 'font-weight': 800, fill: T.text,
          'text-anchor': nowLeft ? 'end' : 'start', class: 'fade', style: `animation-delay:${0.7 + i * 0.08}s`,
        }, label(ctx, now));
      }
      hit(g, 0, y - sp / 2, 400, sp);
    });
    if (ctx.bool('categoryLabels')) {
      txt(s, { x: X0, y: 290, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faint, class: 'fade' }, ctx.str('lowWord'));
      txt(s, { x: X1, y: 290, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faint, 'text-anchor': 'end', class: 'fade' }, ctx.str('highWord'));
    }
    captionLine(ctx, autoCaption(ctx.s, T.kind === 'mono'), 308, 1);
  },
});
