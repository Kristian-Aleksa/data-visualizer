// B04 Tick Donut — a dial of 100 ticks, one tick = one percent. Each source shades a run of
// ticks; labels sit outside on dotted leader lines; the centre names the unit.

import { defineChart } from '../../core/define';
import { ordinalWord } from '../../core/format';
import { pol } from '../../core/geom';
import { rndAbs as rnd } from '../../core/rnd';
import { boost } from '../../core/theme';
import type { Settings } from '../../core/types';
import { el, tip, txt } from '../../core/vnode';
import { captionLine, plain } from './shared';

const D2R = Math.PI / 180;
const DEMO: [string, number][] = [['ORGANIC', 37], ['PAID', 28], ['REFERRAL', 21], ['SOCIAL', 14]];

/** Split `total` ticks in proportion to the values (largest remainder, so they always add up). */
function apportion(values: number[], total: number): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / sum) * total);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => [e - Math.floor(e), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let j = 0; left > 0 && j < order.length; j++, left--) out[order[j][1]]++;
  return out;
}

function autoCaption(s: Settings): string {
  const parts: string[] = [];
  if (Number(s.startAngle) === 0) parts.push('TWELVE O’CLOCK IS ZERO');
  const n = Math.round(Number(s.dotEvery));
  if (n > 0) parts.push(`DOT MARKS EVERY ${ordinalWord(n)}`);
  parts.push('READS CLOCKWISE');
  return parts.join(' · ');
}

const centreCaption = (ticks: number) => `TICKS · ONE = ${plain(Math.round((100 / ticks) * 100) / 100)}%`;

export default defineChart({
  id: 'B04',
  name: 'Tick Donut',
  family: 'basics',
  kinds: ['part-to-whole'],
  description: 'A donut of 100 ticks, one tick per percent, shaded by source.',
  card: { width: 539, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 12,
      columns: [
        { key: 'label', label: 'Label', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0, help: 'Any numbers: they are turned into shares of the dial.' },
      ],
    }],
  },
  defaultData: { rows: DEMO.map(([label, value]) => ({ label, value })) },
  text: {
    title: 'Where the traffic comes from',
    subtitle: 'one tick = one percent · four sources shade the dial · read it like a clock',
    source: 'TICK DONUT · MONO-BASIC · ACQUISITION',
  },
  fields: [
    { key: 'ticks', label: 'Ticks round the dial', group: 'options', section: 'Dial', type: 'number', min: 12, max: 360, step: 1, default: 100, help: '100 = one tick per percent.' },
    { key: 'innerRadius', label: 'Inner radius', group: 'options', section: 'Dial', type: 'number', min: 10, max: 120, step: 0.5, unit: 'px', default: 64 },
    { key: 'startAngle', label: 'Start angle', group: 'options', section: 'Dial', type: 'number', min: -180, max: 180, step: 1, unit: '°', default: 0, help: '0 = twelve o’clock. Ticks run clockwise.' },
    { key: 'tickLength', label: 'Tick length', group: 'options', section: 'Ticks', type: 'number', min: 1, max: 40, step: 0.5, unit: 'px', default: 10, help: 'Colour palettes add 2 px.' },
    { key: 'tickJitter', label: 'Length variation', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 6 },
    { key: 'tickWidth', label: 'Tick width', group: 'options', section: 'Ticks', type: 'number', min: 0.2, max: 4, step: 0.1, unit: 'px', default: 1, help: 'Colour palettes draw ticks 1.9× thicker.' },
    { key: 'dotEvery', label: 'Marker dot every', group: 'options', section: 'Ticks', type: 'number', min: 0, max: 50, step: 1, unit: 'ticks', default: 10, help: '0 turns the dots off.' },
    { key: 'labelDistance', label: 'Label distance', group: 'options', section: 'Labels', type: 'number', min: 10, max: 90, step: 1, unit: 'px', default: 38, help: 'From the inner radius.' },
    { key: 'leaderStart', label: 'Leader line start', group: 'options', section: 'Labels', type: 'number', min: 0, max: 60, step: 1, unit: 'px', default: 20 },
    { key: 'centreText', label: 'Centre number', group: 'options', section: 'Centre', type: 'text', default: '', placeholder: 'The number of ticks' },
    { key: 'centreCaption', label: 'Centre caption', group: 'options', section: 'Centre', type: 'text', default: '', placeholder: 'Automatic' },
    { key: 'measure', label: 'What the shares are of', group: 'options', section: 'Units', type: 'text', default: 'traffic', help: 'Used in tooltips: “37% of traffic”.' },
  ],
  supports: { dataLabels: true, caption: true },
  caption: (s) => autoCaption(s),
  paletteNeeds: ['categorical'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const rows = ctx.rows.map((r) => ({ name: String(r.label), v: Number(r.value) }));
    const total = Math.round(ctx.num('ticks'));
    const counts = apportion(rows.map((r) => r.v), total);
    const sum = rows.reduce((a, r) => a + r.v, 0);
    const cx = 200, cy = 148, R0 = ctx.num('innerRadius');
    const per = 360 / total;
    const a0 = ctx.num('startAngle') - 90;
    const shades = rows.length <= 4 ? T.cat4 : T.ser;
    const len0 = ctx.num('tickLength') + boost(T, 0, 2);
    const jit = ctx.num('tickJitter');
    const tw = ctx.num('tickWidth') * boost(T, 1, 1.9);
    const dotEvery = Math.round(ctx.num('dotEvery'));
    const labR = R0 + ctx.num('labelDistance'), leadR = R0 + ctx.num('leaderStart');
    let k0 = 0;
    rows.forEach(({ name, v }, si) => {
      const shade = shades[si % shades.length];
      const g = el(s, 'g', {});
      g.key = `seg-${si}`;
      const pct = sum > 0 ? Math.round((v / sum) * 1000) / 10 : 0;
      tip(g, `${name} — ${plain(pct)}% of ${ctx.str('measure')}`.trim());
      for (let k = 0; k < counts[si]; k++) {
        const idx = k0 + k, a = a0 + idx * per;
        const len = len0 + rnd(idx + 1, si + 2) * jit;
        const [x1, y1] = pol(cx, cy, R0, a), [x2, y2] = pol(cx, cy, R0 + len, a);
        el(g, 'line', { x1, y1, x2, y2, stroke: shade, 'stroke-width': tw, class: 'fade', style: `animation-delay:${idx * 0.012}s` });
        if (dotEvery > 0 && idx % dotEvery === 0) {
          const [dx, dy] = pol(cx, cy, R0 - 5, a);
          el(g, 'circle', { cx: dx, cy: dy, r: 0.8, fill: T.faint, class: 'fade', style: `animation-delay:${idx * 0.012}s` });
        }
      }
      if (ctx.bool('dataLabels') && counts[si] > 0) {
        const mid = a0 + (k0 + counts[si] / 2) * per;
        const [lx, ly] = pol(cx, cy, labR, mid), [gx, gy] = pol(cx, cy, leadR, mid);
        el(g, 'line', { x1: gx, y1: gy, x2: lx, y2: ly, stroke: T.faint, 'stroke-width': 0.7, 'stroke-dasharray': '1 3', class: 'fade', style: `animation-delay:${0.6 + si * 0.1}s` });
        const c = Math.cos(mid * D2R);
        txt(g, {
          x: lx, y: ly + 3, 'font-size': ctx.fs(8), 'font-weight': 800, fill: shade, 'text-anchor': c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle',
          'letter-spacing': '.06em', style: `paint-order:stroke;stroke:${T.bg};stroke-width:3px;animation-delay:${0.65 + si * 0.1}s`, class: 'fade',
        }, `${name} · ${ctx.fmt(v)}`);
      }
      k0 += counts[si];
    });
    txt(s, { x: cx, y: cy - 2, 'font-size': ctx.fs(22), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle', class: 'fade', style: 'animation-delay:.9s' }, ctx.str('centreText').trim() || String(total));
    txt(s, {
      x: cx, y: cy + 14, 'font-size': ctx.fs(7), 'font-weight': 600, fill: T.muted, 'text-anchor': 'middle', 'letter-spacing': '.1em', class: 'fade', style: 'animation-delay:.9s',
    }, ctx.str('centreCaption').trim() || centreCaption(total));
    captionLine(ctx, autoCaption(ctx.s), 296, 1.1);
  },
});
