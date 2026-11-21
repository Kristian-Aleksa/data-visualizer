// L15 Ballot Tally — a multi-select survey: each option is a row of 100 hairline ticks (a hundred
// people in line) and the ones who picked it are inked tall. Options are independent, so rows
// don't add up to 100.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint } from './shared';

const ASK: [string, number][] = [['DO MORE WITH THE SAME PAY', 51], ['AN UNSUSTAINABLE PACE', 46], ['QUALITY OF WORK SLIPPING', 41], ['BEING REPLACED OUTRIGHT', 22]];

export default defineChart({
  id: 'L15',
  name: 'Ballot Tally',
  family: 'editorial',
  kinds: ['bars', 'part-to-whole'],
  description: 'One row of 100 ticks per answer; the people who picked it are inked.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 10,
      columns: [
        { key: 'answer', label: 'Answer', type: 'text', role: 'label' },
        { key: 'value', label: 'Picked by', type: 'number', role: 'value', min: 0, help: 'Out of the ticks per row (100 = per cent).' },
      ],
    }],
  },
  defaultData: { rows: ASK.map(([answer, value]) => ({ answer, value })) },
  text: {
    title: 'What they fear, tick by tick',
    subtitle: 'one tick = one respondent in a hundred · inked = picked it · they could pick several',
    source: 'BALLOT TALLY · MONO-SMALL · WORKPLACE SURVEY',
  },
  fields: [
    { key: 'ticks', label: 'Ticks per row', group: 'options', section: 'Ticks', type: 'number', min: 10, max: 300, step: 1, default: 100, help: 'The row spreads them across the same width.' },
    { key: 'pickedHeight', label: 'Inked tick height', group: 'options', section: 'Ticks', type: 'number', min: 1, max: 40, step: 0.5, unit: 'px', default: 12 },
    { key: 'pickedJitter', label: 'Inked height variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 5 },
    { key: 'blankHeight', label: 'Blank tick height', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 20, step: 0.1, unit: 'px', default: 4.5 },
    { key: 'blankJitter', label: 'Blank height variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 10, step: 0.1, unit: 'px', default: 2 },
    { key: 'dotEvery', label: 'Dot every', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 50, step: 1, unit: 'ticks', default: 10, help: '0 turns the counting dots off.' },
    { key: 'rowPitch', label: 'Row spacing', group: 'options', section: 'Rows', type: 'number', min: 30, max: 120, step: 1, unit: 'px', default: 62, help: 'Shrinks automatically when the rows wouldn’t fit.' },
    {
      key: 'highlight', label: 'Highlight', group: 'options', section: 'Rows', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'max', label: 'The most picked' }, { value: 'none', label: 'None' }],
      help: 'Colour palettes ink the most-picked answer in the highlight colour, with a bigger number.',
    },
  ],
  supports: { dataLabels: true, categoryLabels: true, grid: true, caption: true },
  caption: () => 'ONE TICK = ONE RESPONDENT · DOT MARKS EVERY TENTH',
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.answer), v: Math.max(0, Number(r.value)) }));
    const N = Math.max(1, Math.round(ctx.num('ticks')));
    const step = (3.44 * 100) / N;
    const pitch = Math.min(ctx.num('rowPitch'), rows.length > 1 ? 186 / (rows.length - 1) : Infinity);
    const hl = ctx.str('highlight');
    const topI = hl === 'max' || (hl === 'auto' && T.kind !== 'mono') ? rows.findIndex((r) => r.v === Math.max(...rows.map((q) => q.v))) : -1;
    const every = Math.round(ctx.num('dotEvery'));
    rows.forEach(({ name, v }, i) => {
      const base = 78 + i * pitch, top = i === topI;
      const g = keyed(el(s, 'g', {}), `row-${i}`);
      if (ctx.bool('categoryLabels')) txt(g, { x: 28, y: base - 26, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: T.label, 'letter-spacing': '.08em', class: 'fade', style: `animation-delay:${i * 0.1}s` }, name);
      if (ctx.bool('showGrid')) el(g, 'line', { x1: 28, y1: base, x2: 372, y2: base, stroke: T.grid, 'stroke-width': 0.6, class: 'fade', style: `animation-delay:${i * 0.1}s` });
      for (let k = 0; k < N; k++) {
        const x = 28 + k * step, picked = k < v;
        const h = picked ? ctx.num('pickedHeight') + rnd(k + 1, i + 2) * ctx.num('pickedJitter') : ctx.num('blankHeight') + rnd(k + 1, i + 5) * ctx.num('blankJitter');
        el(g, 'line', {
          x1: x, y1: base, x2: x, y2: base - h, stroke: picked ? pick(T, T.text, top ? T.hero : T.ser[i % T.ser.length]) : T.floor,
          'stroke-width': picked ? pick(T, 0.9, 1.3) : pick(T, 0.55, 0.6), class: 'fade', style: `animation-delay:${i * 0.1 + k * 0.006}s`,
        });
        if (every > 0 && k % every === 0) el(g, 'circle', { cx: x, cy: base + 4.5, r: 0.8, fill: lFaint(T), class: 'fade', style: `animation-delay:${i * 0.1 + k * 0.006}s` });
      }
      if (ctx.bool('dataLabels')) {
        const lab = txt(g, {
          x: 28 + (Math.max(1, v) - 1) * step + 9, y: base - 11, 'font-size': ctx.fs(top ? 12.5 : 11), 'font-weight': 800, fill: top ? T.hero : T.text,
          style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:${0.5 + i * 0.1}s`, class: 'fade',
        }, ctx.fmt(v));
        tip(lab, `${ctx.fmt(v)} of ${N} picked this — they could pick several`);
      }
    });
    if (ctx.s.showCaption !== false) {
      txt(s, { x: 200, y: 314, 'font-size': ctx.fs(7), 'font-weight': 600, fill: lFaint(T, '#B0AFA9'), 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:1.1s' }, ctx.str('caption').trim() || 'ONE TICK = ONE RESPONDENT · DOT MARKS EVERY TENTH');
    }
  },
});
