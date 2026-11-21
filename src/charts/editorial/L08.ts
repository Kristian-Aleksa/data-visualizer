// L08 Dotty Matrix — one isometric dot grid per group, stacked like decks; dot area = value,
// empty cells are specks. Each deck is a paper slab, so upper decks cover the ones below (drawing
// order matters).

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint, lRing } from './shared';

const SQUAD = ['PLATFORM', 'GROWTH', 'MOBILE', 'INFRA'];
const MONO_SHADE = ['#C6C5BF', '#A8A7A0', '#6A6963', '#1C1C1A'];
const demo = (k: number, r: number, c: number) => {
  const load = rnd(k * 37 + r * 6 + c + 1, k + 2);
  return load < 0.3 ? 0 : Math.round(load * 12);
};

export default defineChart({
  id: 'L08',
  name: 'Dotty Matrix',
  family: 'editorial',
  kinds: ['heatmap'],
  description: 'Isometric dot grids stacked like decks, one per group; dot area = value.',
  card: { width: 689, chartHeight: 340 },
  size: { w: 400, h: 372 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 2000,
      columns: [
        { key: 'plane', label: 'Plane', type: 'text', role: 'group', help: 'One deck per plane, bottom to top.' },
        { key: 'column', label: 'Column', type: 'text', role: 'category', help: 'For example the week.' },
        { key: 'row', label: 'Row', type: 'text', role: 'category', help: 'For example the lane.' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0, help: '0 draws a speck.' },
      ],
    }],
  },
  defaultData: {
    rows: SQUAD.flatMap((plane, k) => Array.from({ length: 36 }, (_, i) => ({ plane, column: `week ${(i % 6) + 1}`, row: `lane ${Math.floor(i / 6) + 1}`, value: demo(k, Math.floor(i / 6), i % 6) }))),
  },
  text: {
    title: 'Four squads, stacked in space',
    subtitle: 'each plane = one squad · 6 × 6 weeks of activity · dot area = tasks closed',
    source: 'DOTTY MATRIX · MONO-EDITORIAL2 · SPRINT BOARD',
  },
  fields: [
    { key: 'pitch', label: 'Grid spacing', group: 'options', section: 'Decks', type: 'number', min: 4, max: 60, step: 0.5, unit: 'px', default: 20, help: 'Across; down is half of it (isometric).' },
    { key: 'deckGap', label: 'Deck spacing', group: 'options', section: 'Decks', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: 64 },
    { key: 'autoFit', label: 'Shrink to fit more decks or bigger grids', group: 'options', section: 'Decks', type: 'boolean', default: true },
    { key: 'slabOpacity', label: 'Deck opacity', group: 'options', section: 'Decks', type: 'number', min: 0, max: 1, step: 0.01, default: 0.96, help: 'Lower lets the decks below show through.' },
    { key: 'dotBase', label: 'Dot base size', group: 'options', section: 'Dots', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1 },
    { key: 'dotScale', label: 'Dot growth per √value', group: 'options', section: 'Dots', type: 'number', min: 0, max: 4, step: 0.05, default: 1.15 },
    { key: 'unit', label: 'Value unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'tasks' },
  ],
  supports: { categoryLabels: true },
  paletteNeeds: ['categorical'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const planes: string[] = [], cols: string[] = [], rowsL: string[] = [];
    const cells = new Map<string, number>();
    for (const r of ctx.rows) {
      const p = String(r.plane), c = String(r.column), w = String(r.row);
      if (!planes.includes(p)) planes.push(p);
      if (!cols.includes(c)) cols.push(c);
      if (!rowsL.includes(w)) rowsL.push(w);
      cells.set(`${planes.indexOf(p)}|${rowsL.indexOf(w)}|${cols.indexOf(c)}`, Math.max(0, Number(r.value)));
    }
    const nK = planes.length, nC = cols.length, nR = rowsL.length;
    let pitch = ctx.num('pitch'), gap = ctx.num('deckGap');
    if (ctx.bool('autoFit')) {
      pitch = Math.min(pitch, (pitch * 6) / Math.max(6, nC, nR));
      if (nK > 1) gap = Math.min(gap, 192 / (nK - 1));
    }
    const P = (c: number, r: number, k: number): [number, number] => [196 + (c - r) * pitch, 236 + (c + r) * (pitch / 2) - k * gap];
    const shade = (k: number) => {
      const top = nK - 1;
      return pick(T, MONO_SHADE[top > 0 ? Math.round((k / top) * 3) : 3], T.ser[(top - k) % T.ser.length]);
    };
    const unit = ctx.str('unit');
    for (let k = 0; k < nK; k++) {
      const g = keyed(el(s, 'g', {}), `plane-${k}`);
      // the deck: a paper slab, so upper decks cover lower ones
      const c1 = nC - 1 + 0.8, r1 = nR - 1 + 0.8;
      const cs = [P(-0.8, -0.8, k), P(c1, -0.8, k), P(c1, r1, k), P(-0.8, r1, k)];
      el(g, 'path', { d: 'M' + cs.map((p) => p.join(' ')).join(' L ') + ' Z', fill: T.bg, 'fill-opacity': ctx.num('slabOpacity'), stroke: T.grid, 'stroke-width': 0.9, class: 'fade', style: `animation-delay:${k * 0.16}s` });
      for (let r = 0; r < nR; r++) {
        for (let c = 0; c < nC; c++) {
          const v = cells.get(`${k}|${r}|${c}`) ?? 0;
          const [x, y] = P(c, r, k);
          const delay = `animation-delay:${k * 0.16 + (r * nC + c) * 0.008}s`;
          if (!v) {
            el(g, 'circle', { cx: x, cy: y, r: 0.7, fill: pick(T, T.quiet, T.floor), class: 'pop', style: delay });
            continue;
          }
          const dot = el(g, 'circle', {
            cx: x, cy: y, r: ctx.num('dotBase') + Math.sqrt(v) * ctx.num('dotScale') * (pitch / 20), fill: shade(k),
            ...(T.kind === 'mono' ? {} : { stroke: lRing(T), 'stroke-width': 0.45 }), class: 'pop', style: delay,
          });
          tip(dot, `${planes[k]} · ${cols[c]} × ${rowsL[r]} — ${ctx.fmt(v)} ${unit}`.trim());
        }
      }
      // label off the deck's right corner, tied by a short hairline
      if (ctx.bool('categoryLabels')) {
        const [cxr, cyr] = P(c1, -0.8, k);
        el(g, 'line', { x1: cxr + 4, y1: cyr, x2: cxr + 22, y2: cyr, stroke: lFaint(T), 'stroke-width': 0.8, class: 'fade', style: `animation-delay:${0.2 + k * 0.16}s` });
        txt(g, {
          x: cxr + 27, y: cyr + 2.5, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: k === nK - 1 ? T.text : T.muted, 'letter-spacing': '.12em',
          class: 'fade', style: `animation-delay:${0.2 + k * 0.16}s`,
        }, planes[k]);
      }
    }
  },
});
