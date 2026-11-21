// X03 Hundred Faces — a hundred faces in a grid, one per person: the mouth curve and the fill
// darken with the answer level, so ink piles up where the worry does. A legend runs along the top
// and a bracket counts everyone past the first level.

import { contrast } from '../../core/color';
import { defineChart } from '../../core/define';
import { pick, type Theme } from '../../core/theme';
import type { ChartData } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';

const SEG: [string, number, number][] = [['NOT AT ALL', 28, -2.6], ['SLIGHTLY', 31, -0.6], ['MODERATELY', 21, 1.4], ['VERY', 12, 2.6], ['EXTREMELY', 8, 3.6]];
const MONO_FILL = ['#F0EFEB', '#DEDDD6', '#B0AFA9', '#55554F', '#1C1C1A'];

const countsOf = (d: ChartData) => (d.rows ?? []).map((r) => Math.max(0, Math.round(Number(r.people) || 0)));
const autoCaption = (d: ChartData) => {
  const v = countsOf(d);
  return `ONE FACE = ONE PERSON IN A HUNDRED · THE MOUTH IS THE DATA · ${v.join('+')} = ${v.reduce((a, b) => a + b, 0)}`;
};
const ladder = (T: Theme) => pick(T, MONO_FILL, [T.bg, T.ramp[0], T.ramp[2], T.ramp[3], T.ramp[4]]);

export default defineChart({
  id: 'X03',
  name: 'Hundred Faces',
  family: 'extras',
  kinds: ['part-to-whole'],
  description: 'A hundred faces, one per person: the mouth and the shade carry each answer.',
  card: { width: 1100, chartHeight: 380 },
  size: { w: 720, h: 340 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 10,
      columns: [
        { key: 'answer', label: 'Answer', type: 'text', role: 'label', help: 'From the calmest to the most worried.' },
        { key: 'people', label: 'People', type: 'number', role: 'value', min: 0, integer: true },
        { key: 'mouth', label: 'Mouth curve', type: 'number', role: 'value', required: false, help: 'Negative = smile, positive = frown. Empty spreads them from −2.6 to 3.6.' },
      ],
    }],
  },
  defaultData: { rows: SEG.map(([answer, people, mouth]) => ({ answer, people, mouth })) },
  text: {
    title: 'How worried is the room',
    subtitle: 'one face = one person in a hundred · the mouth is the data · dark ink piles up where worry does',
    source: 'HUNDRED FACES · LAYOFF WORRY, 5 NUMBERS',
  },
  fields: [
    { key: 'columns', label: 'Faces per row', group: 'options', section: 'Faces', type: 'number', min: 2, max: 60, step: 1, default: 20 },
    { key: 'cell', label: 'Face spacing', group: 'options', section: 'Faces', type: 'number', min: 8, max: 60, step: 0.5, unit: 'px', default: 26, help: 'Shrinks automatically when the faces wouldn’t fit.' },
    { key: 'faceRadius', label: 'Face size', group: 'options', section: 'Faces', type: 'number', min: 2, max: 30, step: 0.1, unit: 'px', default: 8.6 },
    { key: 'eyebrows', label: 'Eyebrows on the last answer', group: 'options', section: 'Faces', type: 'boolean', default: true },
    { key: 'showBracket', label: 'Bracket', group: 'options', section: 'Bracket', type: 'boolean', default: true, help: 'Counts everyone past the first answer.' },
    { key: 'bracketText', label: 'Bracket words', group: 'options', section: 'Bracket', type: 'text', multiline: true, default: 'CARRY SOME\nWORRY', when: (s) => s.showBracket !== false },
    { key: 'legendSuffix', label: 'After the legend numbers', group: 'options', section: 'Legend', type: 'text', default: '%' },
  ],
  supports: { dataLabels: true, legend: true, caption: true },
  caption: (_s, _T, d) => autoCaption(d),
  paletteNeeds: ['sequential'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const segs = ctx.rows.map((r) => ({ name: String(r.answer), n: Math.max(0, Math.min(1000, Math.round(Number(r.people) || 0))), mouth: r.mouth === null || r.mouth === undefined || r.mouth === '' ? null : Number(r.mouth) }));
    const L = segs.length, total = segs.reduce((a, b) => a + b.n, 0);
    const COLS = Math.max(2, Math.round(ctx.num('columns'))), rows = Math.max(1, Math.ceil(total / COLS));
    const X0 = 98, Y0 = 52;
    const cell = Math.min(ctx.num('cell'), 520 / Math.max(1, COLS), 260 / Math.max(1, rows));
    // faces shrink with the spacing when they have to; eyes and mouths scale with the face
    const R = Math.min(ctx.num('faceRadius') * (cell / ctx.num('cell')), cell / 2);
    const fills = ladder(T);
    const fillOf = (si: number) => fills[L > 1 ? Math.round((si / (L - 1)) * (fills.length - 1)) : 0];
    const curveOf = (si: number) => segs[si].mouth ?? (L > 1 ? -2.6 + (6.2 * si) / (L - 1) : 0);
    const k = R / 8.6;
    let idx = 0;
    segs.forEach(({ name, n }, si) => {
      const fill = fillOf(si);
      const fg = contrast(T.text, fill) >= contrast(T.bg, fill) ? T.text : T.bg;
      const curve = curveOf(si) * k;
      for (let j = 0; j < n; j++, idx++) {
        const x = X0 + (idx % COLS) * cell, y = Y0 + Math.floor(idx / COLS) * cell;
        const g = keyed(el(s, 'g', { class: 'pop', style: `animation-delay:${idx * 0.008}s` }), `a-${si}`);
        el(g, 'circle', { cx: x, cy: y, r: R, fill, stroke: T.text, 'stroke-width': 1 });
        el(g, 'circle', { cx: x - 3 * k, cy: y - 2.4 * k, r: 1 * k, fill: fg });
        el(g, 'circle', { cx: x + 3 * k, cy: y - 2.4 * k, r: 1 * k, fill: fg });
        if (si === L - 1 && L > 1 && ctx.bool('eyebrows')) {
          el(g, 'line', { x1: x - 4.4 * k, y1: y - 5.6 * k, x2: x - 1.8 * k, y2: y - 4.4 * k, stroke: fg, 'stroke-width': 0.9 });
          el(g, 'line', { x1: x + 4.4 * k, y1: y - 5.6 * k, x2: x + 1.8 * k, y2: y - 4.4 * k, stroke: fg, 'stroke-width': 0.9 });
        }
        const my = y + 3.2 * k;
        el(g, 'path', { d: `M ${x - 3.4 * k} ${my} Q ${x} ${my + curve} ${x + 3.4 * k} ${my}`, fill: 'none', stroke: fg, 'stroke-width': 1 });
        tip(g, `${name} — one of ${ctx.fmt(n)} in ${ctx.fmt(total)}`);
      }
    });
    // top legend: shares with names
    if (ctx.str('legend') !== 'hidden') {
      let lx = 98;
      segs.forEach(({ name, n }, si) => {
        if (ctx.bool('dataLabels')) txt(s, { x: lx, y: 24, 'font-size': ctx.fs(8), 'font-weight': 800, fill: T.text, class: 'fade', style: `animation-delay:${0.2 + si * 0.06}s` }, ctx.fmt(n) + ctx.str('legendSuffix'));
        txt(s, { x: lx + 26, y: 24, 'font-size': ctx.fs(6.6), 'font-weight': 600, fill: T.muted, 'letter-spacing': '.06em', class: 'fade', style: `animation-delay:${0.2 + si * 0.06}s` }, name);
        lx += Math.max(88, name.length * 5.4 + 40);
      });
    }
    // bracket: everyone past the first answer
    const first = segs[0]?.n ?? 0;
    if (ctx.bool('showBracket') && L > 1 && total > first) {
      const r0 = Math.floor(first / COLS), r1 = Math.floor((total - 1) / COLS), mid = (r0 + r1) / 2;
      const bx = X0 + COLS * cell - 6;
      el(s, 'line', { x1: bx + 14, y1: Y0 + r0 * cell - 13, x2: bx + 14, y2: Y0 + r1 * cell + 13, stroke: T.muted, 'stroke-width': 1, class: 'fade', style: 'animation-delay:1s' });
      [Y0 + r0 * cell - 13, Y0 + r1 * cell + 13].forEach((yy) => el(s, 'line', { x1: bx + 9, y1: yy, x2: bx + 14, y2: yy, stroke: T.muted, 'stroke-width': 1, class: 'fade', style: 'animation-delay:1s' }));
      txt(s, { x: bx + 22, y: Y0 + mid * cell - 6, 'font-size': ctx.fs(10.5), 'font-weight': 800, fill: T.text, class: 'fade', style: 'animation-delay:1.1s' }, `${Math.round(((total - first) / total) * 100)}%`);
      ctx.str('bracketText').split('\n').filter((l) => l.trim()).forEach((line, li) => {
        txt(s, { x: bx + 22, y: Y0 + mid * cell + 6 + li * 9, 'font-size': ctx.fs(6.6), 'font-weight': 600, fill: T.muted, 'letter-spacing': '.06em', class: 'fade', style: 'animation-delay:1.1s' }, line.trim());
      });
    }
    if (ctx.s.showCaption !== false) {
      txt(s, { x: 360, y: 330, 'font-size': ctx.fs(7), 'font-weight': 600, fill: pick(T, '#B0AFA9', T.faintData), 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:1.2s' }, ctx.str('caption').trim() || autoCaption(ctx.data));
    }
  },
});
