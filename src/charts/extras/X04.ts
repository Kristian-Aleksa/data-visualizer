// X04 Ballot Rings — one dial of 100 ticks per percentage, side by side: the share who said yes
// is inked long, the rest stay short, a bead marks where the ink stops and the number sits in the
// middle.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint, pol } from '../editorial/shared';

const D: [string, number][] = [['AT LEAST MODERATELY BETTER', 82], ['VERY OR EXTREMELY BETTER', 49]];

export default defineChart({
  id: 'X04',
  name: 'Ballot Rings',
  family: 'extras',
  kinds: ['part-to-whole', 'comparison'],
  description: 'A dial of 100 ticks per percentage, side by side; the share is inked round the dial.',
  card: { width: 1100, chartHeight: 340 },
  size: { w: 720, h: 300 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 4,
      columns: [
        { key: 'label', label: 'Dial', type: 'text', role: 'label' },
        { key: 'value', label: 'Share', type: 'number', role: 'value', min: 0, help: 'Out of the ticks per dial (100 = per cent).' },
      ],
    }],
  },
  defaultData: { rows: D.map(([label, value]) => ({ label, value })) },
  text: {
    title: 'Is AI actually making them better?',
    subtitle: 'one tick = one person in a hundred · inked = better at their job because of AI · the right dial lives inside the left',
    source: 'BALLOT RINGS · AI PRODUCTIVITY, 2 NUMBERS',
  },
  fields: [
    { key: 'ticks', label: 'Ticks per dial', group: 'options', section: 'Dials', type: 'number', min: 10, max: 360, step: 1, default: 100 },
    { key: 'radius', label: 'Dial radius', group: 'options', section: 'Dials', type: 'number', min: 10, max: 120, step: 1, unit: 'px', default: 64 },
    { key: 'spacing', label: 'Dial spacing', group: 'options', section: 'Dials', type: 'number', min: 50, max: 600, step: 1, unit: 'px', default: 292, help: 'Shrinks automatically when the dials wouldn’t fit.' },
    { key: 'inkedLength', label: 'Inked tick length', group: 'options', section: 'Ticks', type: 'number', min: 1, max: 40, step: 0.5, unit: 'px', default: 12 },
    { key: 'inkedJitter', label: 'Inked length variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 6 },
    { key: 'blankLength', label: 'Blank tick length', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 20, step: 0.1, unit: 'px', default: 4.5 },
    { key: 'blankJitter', label: 'Blank length variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 10, step: 0.1, unit: 'px', default: 2 },
    { key: 'dotEvery', label: 'Dot every', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 50, step: 1, unit: 'ticks', default: 10, help: '0 turns the counting dots off.' },
    { key: 'ofText', label: 'Under the number', group: 'options', section: 'Labels', type: 'text', default: 'OF 100' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: () => 'ONE TICK = ONE PERSON · TWELVE O’CLOCK IS ZERO · THE RIGHT DIAL LIVES INSIDE THE LEFT',
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), v: Math.max(0, Number(r.value) || 0) }));
    const n = rows.length, N = Math.max(1, Math.round(ctx.num('ticks')));
    const R0 = ctx.num('radius');
    const gap = Math.min(ctx.num('spacing'), n > 1 ? (720 - 2 * (R0 + 30)) / (n - 1) : Infinity);
    const top = rows.findIndex((r) => r.v === Math.max(...rows.map((q) => q.v)));
    const every = Math.round(ctx.num('dotEvery'));
    rows.forEach(({ name, v }, i) => {
      const cx = 360 + (i - (n - 1) / 2) * gap, cy = 134;
      // colour palettes ink the biggest dial in the highlight colour, the rest in the data colour
      const inkC = pick(T, T.text, i === top ? T.hero : T.data);
      const g = keyed(el(s, 'g', {}), `d-${i}`);
      for (let k = 0; k < N; k++) {
        const a = (k * 360) / N - 90, picked = k < v;
        const len = picked ? ctx.num('inkedLength') + rnd(k + 1, i + 2) * ctx.num('inkedJitter') : ctx.num('blankLength') + rnd(k + 1, i + 5) * ctx.num('blankJitter');
        const [x1, y1] = pol(cx, cy, R0, a), [x2, y2] = pol(cx, cy, R0 + len, a);
        el(g, 'line', { x1, y1, x2, y2, stroke: picked ? inkC : T.floor, 'stroke-width': picked ? pick(T, 0.95, 1.3) : pick(T, 0.55, 0.6), class: 'fade', style: `animation-delay:${i * 0.1 + k * 0.006}s` });
        if (every > 0 && k % every === 0) {
          const [dx, dy] = pol(cx, cy, R0 - 5, a);
          el(g, 'circle', { cx: dx, cy: dy, r: 0.8, fill: lFaint(T), class: 'fade', style: `animation-delay:${i * 0.1 + k * 0.006}s` });
        }
      }
      const [ex, ey] = pol(cx, cy, R0 + 18, (Math.min(v, N) * 360) / N - 90);
      el(g, 'circle', { cx: ex, cy: ey, r: 2.2, fill: inkC, class: 'pop', style: `animation-delay:${0.5 + i * 0.1}s` });
      if (ctx.bool('dataLabels')) {
        const num = txt(g, { x: cx, y: cy + 2, 'font-size': ctx.fs(24), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle', class: 'fade', style: `animation-delay:${0.4 + i * 0.1}s` }, ctx.fmt(v));
        tip(num, `${name} — ${ctx.fmt(v)} of ${N}`);
        txt(g, { x: cx, y: cy + 18, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle', 'letter-spacing': '.1em', class: 'fade', style: `animation-delay:${0.4 + i * 0.1}s` }, ctx.str('ofText'));
      }
      if (ctx.bool('categoryLabels')) {
        txt(g, { x: cx, y: cy + R0 + 42, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: pick(T, '#55554F', T.label), 'text-anchor': 'middle', 'letter-spacing': '.06em', class: 'fade', style: `animation-delay:${0.5 + i * 0.1}s` }, name);
      }
    });
    if (ctx.s.showCaption !== false) {
      txt(s, { x: 360, y: 290, 'font-size': ctx.fs(7), 'font-weight': 600, fill: lFaint(T, '#B0AFA9'), 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:1s' }, ctx.str('caption').trim() || 'ONE TICK = ONE PERSON · TWELVE O’CLOCK IS ZERO · THE RIGHT DIAL LIVES INSIDE THE LEFT');
    }
  },
});
