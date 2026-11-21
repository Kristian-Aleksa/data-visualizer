// B11 Tick Gauge — progress as a 210° dial of 100 ticks, one tick = 1% of the target: earned
// ticks are inked, the rest stay short and pale. Milestones are dotted and the tip gets a bead.

import { defineChart } from '../../core/define';
import { pol } from '../../core/geom';
import { rndAbs as rnd } from '../../core/rnd';
import { boost, type Theme } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, tip, txt } from '../../core/vnode';
import { captionLine, plain } from './shared';

/** Palm shades the inked ticks by quarter ("SHADE = QUARTER"). */
const shadeQuarters = (s: Settings, T: Theme) => s.shadeQuarters === 'on' || (s.shadeQuarters === 'auto' && T.id === 'palm');

const autoCaption = (s: Settings, T: Theme) => {
  const per = Math.round((100 / Math.max(1, Number(s.ticks))) * 100) / 100;
  return shadeQuarters(s, T)
    ? `ONE TICK = ${plain(per)}% OF TARGET · SHADE = QUARTER · INKED = EARNED`
    : `ONE TICK = ${plain(per)}% OF TARGET · INKED = EARNED`;
};

export default defineChart({
  id: 'B11',
  name: 'Tick Gauge',
  family: 'basics',
  kinds: ['part-to-whole'],
  description: 'Progress to a target as a dial of 100 ticks; earned ticks are inked.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 1,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label', required: false },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
        { key: 'target', label: 'Target', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: [{ label: 'Quarter revenue', value: 730, target: 1000 }] },
  defaults: { numPrefix: '$', numSuffix: 'k' },
  text: {
    title: "How far to the quarter's goal",
    subtitle: 'one tick = one percent of target · inked = earned · the dial reads left to right',
    source: 'TICK GAUGE · MONO-BASIC · QUARTERLY TARGET',
  },
  fields: [
    { key: 'ticks', label: 'Ticks on the dial', group: 'options', section: 'Dial', type: 'number', min: 10, max: 300, step: 1, default: 100 },
    { key: 'radius', label: 'Radius', group: 'options', section: 'Dial', type: 'number', min: 30, max: 140, step: 0.5, unit: 'px', default: 104 },
    { key: 'sweep', label: 'Sweep', group: 'options', section: 'Dial', type: 'number', min: 60, max: 360, step: 1, unit: '°', default: 210 },
    { key: 'startAngle', label: 'Start angle', group: 'options', section: 'Dial', type: 'number', min: -360, max: 0, step: 1, unit: '°', default: -195, help: 'Where the first tick sits (0° = three o’clock, −90° = twelve).' },
    { key: 'inkedLength', label: 'Earned tick length', group: 'options', section: 'Ticks', type: 'number', min: 2, max: 40, step: 0.5, unit: 'px', default: 13, help: 'Colour palettes add 2 px.' },
    { key: 'inkedJitter', label: 'Earned length variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 6 },
    { key: 'inkedWidth', label: 'Earned tick width', group: 'options', section: 'Ticks', type: 'number', min: 0.2, max: 4, step: 0.1, unit: 'px', default: 1, help: 'Colour palettes draw them 1.9× thicker.' },
    { key: 'blankLength', label: 'Remaining tick length', group: 'options', section: 'Ticks', type: 'number', min: 1, max: 30, step: 0.5, unit: 'px', default: 5 },
    { key: 'blankJitter', label: 'Remaining length variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 15, step: 0.5, unit: 'px', default: 2.5 },
    {
      key: 'shadeQuarters', label: 'Shade earned ticks by quarter', group: 'options', section: 'Ticks', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }],
      help: 'Palm shades each quarter of the dial.',
    },
    { key: 'milestoneEvery', label: 'Milestone every', group: 'options', section: 'Milestones', type: 'number', min: 0, max: 100, step: 1, unit: '%', default: 25, help: '0 hides the milestones.' },
    { key: 'beadSize', label: 'Tip bead size', group: 'options', section: 'Milestones', type: 'number', min: 0, max: 8, step: 0.1, unit: 'px', default: 2.4, help: 'Colour palettes add 0.8 px.' },
    { key: 'centreCaption', label: 'Line under the number', group: 'options', section: 'Centre', type: 'text', default: '', placeholder: 'Automatic: “27 TICKS TO GO”' },
    { key: 'measure', label: 'What the target is', group: 'options', section: 'Units', type: 'text', default: 'quarter target', help: 'Tooltip: “$730k of the $1,000k quarter target”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true, hover: false },
  caption: (s, T) => autoCaption(s, T),
  paletteNeeds: ['highlight', 'sequential'],
  interactions: ['tooltip'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const row = ctx.rows[0];
    const value = Number(row.value), target = Number(row.target);
    const pct = target > 0 ? (value / target) * 100 : 0;
    const N = Math.round(ctx.num('ticks'));
    const goal = Math.max(0, Math.min(N, Math.round((pct / 100) * N)));
    const cx = 200, cy = 190, R0 = ctx.num('radius'), A0 = ctx.num('startAngle'), SW = ctx.num('sweep');
    const inkLen = ctx.num('inkedLength') + boost(T, 0, 2), inkJ = ctx.num('inkedJitter');
    const blankLen = ctx.num('blankLength'), blankJ = ctx.num('blankJitter');
    const inkW = ctx.num('inkedWidth') * boost(T, 1, 1.9);
    const zones = shadeQuarters(ctx.s, T);
    const zone3 = [T.ramp6[4], T.ramp6[3], T.ramp6[0]];
    for (let k = 0; k < N; k++) {
      const a = A0 + (k / N) * SW, inked = k < goal;
      const len = inked ? inkLen + rnd(k + 1, 3) * inkJ : blankLen + rnd(k + 1, 7) * blankJ;
      const [x1, y1] = pol(cx, cy, R0, a), [x2, y2] = pol(cx, cy, R0 + len, a);
      el(s, 'line', {
        x1, y1, x2, y2, stroke: inked ? (zones ? zone3[Math.min(2, Math.floor((k / N) * 4))] : T.data) : T.floor,
        'stroke-width': inked ? inkW : 0.6, class: 'fade', style: `animation-delay:${k * 0.012}s`,
      });
    }
    const mEvery = ctx.num('milestoneEvery');
    if (mEvery > 0 && ctx.bool('categoryLabels')) {
      for (let m = mEvery; m <= 100 + 1e-9; m += mEvery) {
        const a = A0 + (m / 100) * SW, [dx, dy] = pol(cx, cy, R0 - 7, a), [tx, ty] = pol(cx, cy, R0 - 19, a);
        el(s, 'circle', { cx: dx, cy: dy, r: 1, fill: T.kind === 'mono' ? '#B0AFA9' : T.faint, class: 'fade', style: 'animation-delay:.8s' });
        txt(s, { x: tx, y: ty + 3, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.faint, 'text-anchor': 'middle', class: 'fade', style: 'animation-delay:.85s' }, plain(Math.round(m * 100) / 100));
      }
    }
    const aT = A0 + (goal / N) * SW, [ex, ey] = pol(cx, cy, R0 + 20, aT);
    const bead = ctx.num('beadSize') + boost(T, 0, 0.8);
    if (bead > 0) el(s, 'circle', { cx: ex, cy: ey, r: bead, fill: T.hero, class: 'pop', style: 'animation-delay:1.1s' });
    if (ctx.bool('dataLabels')) {
      const num = txt(s, { x: cx, y: cy - 4, 'font-size': ctx.fs(34), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle', class: 'fade', style: 'animation-delay:1s' }, `${plain(Math.round(pct))}%`);
      tip(num, `${ctx.fmt(value)} of the ${ctx.fmt(target)} ${ctx.str('measure')}`.trim());
      const left = N - goal;
      txt(s, {
        x: cx, y: cy + 16, 'font-size': ctx.fs(8), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle', 'letter-spacing': '.1em',
        class: 'fade', style: 'animation-delay:1.05s',
      }, ctx.str('centreCaption').trim() || (left > 0 ? `${left} TICK${left === 1 ? '' : 'S'} TO GO` : 'TARGET REACHED'));
    }
    captionLine(ctx, autoCaption(ctx.s, T), 300, 1.2);
  },
});
