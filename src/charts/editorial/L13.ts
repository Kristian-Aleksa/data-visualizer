// L13 Hourglass Stream — a funnel poured downward: each stage is a strip of ticks (one tick ≈ a
// few dozen people) as wide as the stage, with threads trickling to the next strip and the
// conversion parked in the left margin.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint } from './shared';

const STAGE: [string, number][] = [['VISITORS', 4200], ['SIGN-UPS', 1900], ['ACTIVATED', 960], ['RETAINED', 540], ['PAYING', 310]];

export default defineChart({
  id: 'L13',
  name: 'Hourglass Stream',
  family: 'editorial',
  kinds: ['flow', 'part-to-whole'],
  description: 'A funnel poured downward: tick strips as wide as each stage, threads trickling between them.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 330 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 12,
      columns: [
        { key: 'stage', label: 'Stage', type: 'text', role: 'label' },
        { key: 'value', label: 'People', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: STAGE.map(([stage, value]) => ({ stage, value })) },
  text: {
    title: 'The funnel, poured',
    subtitle: 'each strip\'s width = people at that stage · threads trickle down · Q2 2026 cohort',
    source: 'HOURGLASS STREAM · MONO-EDITORIAL2 · GROWTH',
  },
  fields: [
    { key: 'perTick', label: 'People per tick', group: 'options', section: 'Strips', type: 'number', min: 1, max: 1e6, step: 1, default: 40 },
    { key: 'maxWidth', label: 'Widest strip', group: 'options', section: 'Strips', type: 'number', min: 20, max: 340, step: 1, unit: 'px', default: 290 },
    { key: 'stagePitch', label: 'Stage spacing', group: 'options', section: 'Strips', type: 'number', min: 20, max: 120, step: 1, unit: 'px', default: 64, help: 'Shrinks automatically when the stages wouldn’t fit.' },
    { key: 'tickWidth', label: 'Tick width', group: 'options', section: 'Strips', type: 'number', min: 0.1, max: 4, step: 0.05, unit: 'px', default: 0.8, help: 'Colour palettes draw ticks a little thicker (1.1 px).' },
    { key: 'tickJitter', label: 'Tick jitter', group: 'options', section: 'Strips', type: 'number', min: 0, max: 10, step: 0.1, unit: 'px', default: 3 },
    { key: 'threads', label: 'Threads per gap', group: 'options', section: 'Threads', type: 'number', min: 0, max: 200, step: 1, default: 34 },
    { key: 'threadOpacity', label: 'Thread opacity', group: 'options', section: 'Threads', type: 'number', min: 0, max: 1, step: 0.01, default: 0.32 },
    { key: 'convertWord', label: 'Conversion caption', group: 'options', section: 'Labels', type: 'text', default: 'GET THROUGH' },
    {
      key: 'highlight', label: 'Highlight', group: 'options', section: 'Labels', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'leak', label: 'The leakiest step' }, { value: 'none', label: 'None' }],
      help: 'Colour palettes enlarge the lowest conversion in the highlight colour.',
    },
    { key: 'unit', label: 'People are', group: 'options', section: 'Units', type: 'text', default: 'people' },
  ],
  supports: { dataLabels: true, categoryLabels: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const st = ctx.rows.map((r) => ({ name: String(r.stage), c: Math.max(0, Number(r.value)) }));
    const n = st.length;
    const CXm = 185, pitch = Math.min(ctx.num('stagePitch'), n > 1 ? 256 / (n - 1) : Infinity);
    const sy = (k: number) => 34 + k * pitch;
    const max = Math.max(1e-9, ...st.map((x) => x.c));
    const w = (c: number) => (c / max) * ctx.num('maxWidth');
    const pct = st.slice(1).map((x, k) => (st[k].c > 0 ? Math.round((x.c / st[k].c) * 100) : 0));
    const hl = ctx.str('highlight');
    const leak = hl === 'leak' || (hl === 'auto' && T.kind !== 'mono') ? pct.indexOf(Math.min(...pct)) : -1;
    const tw = ctx.num('tickWidth') * pick(T, 1, 1.1 / 0.8);
    const per = Math.max(1e-9, ctx.num('perTick'));
    const unit = ctx.str('unit');
    st.forEach(({ name, c }, k) => {
      const y = sy(k), hw = w(c) / 2;
      const ramp = T.ramp[n > 1 ? Math.round((k / (n - 1)) * 4) : 4];
      const g = keyed(el(s, 'g', {}), `stage-${k}`);
      // barcode strip: one tick ≈ `per` people
      const ticks = Math.min(4000, Math.round(c / per));
      for (let t = 0; t < ticks; t++) {
        const x = CXm - hw + ((t + 0.5) / ticks) * hw * 2 + (rnd(t + 1, k + 3) - 0.5) * ctx.num('tickJitter');
        el(g, 'line', {
          x1: x, y1: y - 6, x2: x, y2: y + 6, stroke: pick(T, T.text, ramp), 'stroke-width': Math.round(tw * 1000) / 1000,
          opacity: pick(T, 0.45 + rnd(t + 2, k + 5) * 0.5, 0.6 + rnd(t + 2, k + 5) * 0.4), class: 'fade', style: `animation-delay:${k * 0.12 + t * 0.004}s`,
        });
      }
      // threads trickling to the next strip
      if (k < n - 1) {
        const hw1 = w(st[k + 1].c) / 2;
        for (let t = 0; t < Math.round(ctx.num('threads')); t++) {
          const xt = CXm + (rnd(t + 1, k * 7 + 1) - 0.5) * 2 * hw * 0.94;
          const xb = CXm + (rnd(t + 3, k * 7 + 5) - 0.5) * 2 * hw1 * 0.94;
          el(g, 'path', {
            d: `M${xt} ${y + 8} C${xt} ${y + 34} ${xb} ${sy(k + 1) - 34} ${xb} ${sy(k + 1) - 8}`, fill: 'none', stroke: pick(T, T.faintData, T.faintData), 'stroke-width': pick(T, 0.5, 0.7),
            opacity: Math.round(Math.min(1, ctx.num('threadOpacity') * pick(T, 1, 0.45 / 0.32)) * 1000) / 1000, class: 'draw', style: `animation-delay:${0.2 + k * 0.15 + t * 0.008}s;animation-duration:.8s`,
          });
        }
        // conversion between stages, parked in the left margin
        if (ctx.bool('dataLabels')) {
          const isLeak = k === leak;
          const conv = txt(g, {
            x: 26, y: (y + sy(k + 1)) / 2 + 3, 'font-size': ctx.fs(isLeak ? 10.5 : 8.5), 'font-weight': 800, fill: isLeak ? T.hero : T.muted,
            class: 'fade', style: `animation-delay:${0.5 + k * 0.15}s`,
          }, pct[k] + '%');
          tip(conv, `${pct[k]}% of ${name} get through to ${st[k + 1].name}`);
          txt(g, {
            x: 26, y: (y + sy(k + 1)) / 2 + 13, 'font-size': ctx.fs(6), 'font-weight': 600, fill: isLeak ? T.hero : lFaint(T), 'letter-spacing': '.08em',
            class: 'fade', style: `animation-delay:${0.5 + k * 0.15}s`,
          }, ctx.str('convertWord'));
        }
      }
      // stage label, tied to the strip edge
      if (ctx.bool('categoryLabels')) {
        el(g, 'line', { x1: CXm + hw + 6, y1: y, x2: 340, y2: y, stroke: T.grid, 'stroke-width': 0.8, class: 'fade', style: `animation-delay:${0.3 + k * 0.12}s` });
        txt(g, { x: 344, y: y - 1, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: pick(T, '#4A4944', T.label), 'letter-spacing': '.08em', class: 'fade', style: `animation-delay:${0.35 + k * 0.12}s` }, name);
        const count = txt(g, { x: 344, y: y + 10, 'font-size': ctx.fs(9.5), 'font-weight': 800, fill: T.text, class: 'fade', style: `animation-delay:${0.4 + k * 0.12}s` }, ctx.fmt(c));
        tip(count, `${name} — ${ctx.fmt(c)} ${unit}`.trim());
      }
    });
  },
});
