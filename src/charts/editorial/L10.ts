// L10 Radial Patchwork — one translucent wedge per event on a 24-hour clock: angle = time of day,
// reach = size, so ink builds where events pile up. The wedges that caused an incident are
// outlined. The overlapping transparency is the data, so no opacity floor applies here.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { r3 } from '../basics/shared';
import { lFaint, pol, sect } from './shared';

const N = 46;
const INCIDENTS = [4, 17, 31];
const DEMO = Array.from({ length: N }, (_, i) => {
  const peak = rnd(i + 1, 2) > 0.5 ? 11 : 16;
  const hour = (peak + (rnd(i + 1, 3) - 0.5) * 7 + 24) % 24;
  const sw = 10 + rnd(i + 1, 4) * 34;
  const r1 = 34 + rnd(i + 1, 5) * 100;
  return { time: String(r3(hour)), files: r3(r1 * 6), minutes: r3(sw * 4), incident: INCIDENTS.includes(i) ? 'yes' : '' };
});
const DEMO_MAX = Math.max(...DEMO.map((d) => d.files)) / 6;

/** "10.5", "10:30" or "10:30:00" → hours. */
function hours(v: unknown): number | null {
  const s = String(v ?? '').trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) return Number(m[1]) + Number(m[2]) / 60 + Number(m[3] ?? 0) / 3600;
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
}
const clock = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
const yes = (v: unknown) => /^(y|yes|true|1|x)$/i.test(String(v ?? '').trim());

export default defineChart({
  id: 'L10',
  name: 'Radial Patchwork',
  family: 'editorial',
  kinds: ['distribution', 'time'],
  description: 'Translucent wedges on a 24-hour clock: angle = time of day, reach = size; ink builds where they pile up.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 1000,
      columns: [
        { key: 'time', label: 'Time of day', type: 'text', role: 'x', help: 'Hours (10.5) or a clock time (10:30).' },
        { key: 'files', label: 'Size', type: 'number', role: 'size', min: 0, help: 'Sets how far the wedge reaches (the demo: files touched).' },
        { key: 'minutes', label: 'Duration (min)', type: 'number', role: 'value', min: 0, required: false, help: 'Sets the wedge’s width. Empty uses the default width.' },
        { key: 'incident', label: 'Incident', type: 'text', required: false, help: '“yes” outlines the wedge.' },
      ],
    }],
  },
  defaultData: { rows: DEMO },
  text: {
    title: 'A quarter of deploys, overlaid',
    subtitle: 'each wedge = one deploy · angle = time of day · reach = files touched · ink builds where deploys pile up',
    source: 'RADIAL PATCHWORK · MONO-EDITORIAL2 · DEPLOY LOG',
  },
  fields: [
    { key: 'maxReach', label: 'Longest wedge', group: 'options', section: 'Wedges', type: 'number', min: 20, max: 200, step: 0.001, unit: 'px', default: Math.round(DEMO_MAX * 1000) / 1000, help: 'The largest size reaches this far; the rest scale with it.' },
    { key: 'innerRadius', label: 'Inner radius', group: 'options', section: 'Wedges', type: 'number', min: 0, max: 100, step: 1, unit: 'px', default: 16 },
    { key: 'defaultMinutes', label: 'Width without a duration', group: 'options', section: 'Wedges', type: 'number', min: 1, max: 600, step: 1, unit: 'min', default: 108 },
    { key: 'opacityMin', label: 'Wedge opacity', group: 'options', section: 'Wedges', type: 'number', min: 0, max: 1, step: 0.01, default: 0.07, help: 'Colour palettes use stronger wedges (0.17).' },
    { key: 'opacityJitter', label: 'Opacity variation', group: 'options', section: 'Wedges', type: 'number', min: 0, max: 1, step: 0.01, default: 0.09 },
    { key: 'outlineWidth', label: 'Incident outline', group: 'options', section: 'Wedges', type: 'number', min: 0, max: 5, step: 0.1, unit: 'px', default: 1.1, help: 'Colour palettes draw it 1.5 px, in the highlight colour.' },
    { key: 'clockRadius', label: 'Clock radius', group: 'options', section: 'Clock', type: 'number', min: 40, max: 160, step: 1, unit: 'px', default: 140 },
    { key: 'itemWord', label: 'One wedge is a…', group: 'options', section: 'Units', type: 'text', default: 'deploy', help: 'Tooltip: “deploy #5 — 10:14 · 482 files”.' },
    { key: 'unit', label: 'Size unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'files' },
  ],
  supports: { categoryLabels: true, grid: true, caption: true },
  caption: () => 'OUTLINED = TRIGGERED AN INCIDENT',
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const CX = 200, CY = 168, RC = ctx.num('clockRadius');
    // 24 h rim ticks
    if (ctx.bool('showGrid')) {
      for (let h = 0; h < 96; h++) {
        const a = -90 + h * 3.75, [x1, y1] = pol(CX, CY, RC, a), [x2, y2] = pol(CX, CY, RC + (h % 4 === 0 ? 6 : 3), a);
        el(s, 'line', { x1, y1, x2, y2, stroke: lFaint(T), 'stroke-width': h % 4 === 0 ? 1 : 0.5, class: 'fade', style: `animation-delay:${h * 0.006}s` });
      }
    }
    if (ctx.bool('categoryLabels')) {
      [0, 6, 12, 18].forEach((h) => {
        const [x, y] = pol(CX, CY, RC + 17, -90 + h * 15);
        txt(s, { x, y: y + 3, 'font-size': ctx.fs(8), 'font-weight': 700, fill: T.muted, 'text-anchor': 'middle', class: 'fade' }, String(h).padStart(2, '0'));
      });
    }
    // the patchwork: translucent wedges pile into ink
    const rows = ctx.rows.map((r) => ({ hour: hours(r.time), files: Math.max(0, Number(r.files)), minutes: r.minutes === null || r.minutes === undefined || r.minutes === '' ? null : Number(r.minutes), incident: yes(r.incident) }))
      .filter((r): r is { hour: number; files: number; minutes: number | null; incident: boolean } => r.hour !== null);
    const maxFiles = Math.max(1e-9, ...rows.map((r) => r.files));
    const R0 = ctx.num('innerRadius');
    const word = ctx.str('itemWord'), unit = ctx.str('unit');
    const wedges = rows.map((r, i) => {
      const hour = ((r.hour % 24) + 24) % 24;
      const a0 = -90 + hour * 15, sw = (r.minutes ?? ctx.num('defaultMinutes')) / 4;
      const r1 = Math.max(R0 + 1, (r.files / maxFiles) * ctx.num('maxReach'));
      return { a0, sw, r1, hour, i, files: r.files, incident: r.incident };
    });
    const op0 = ctx.num('opacityMin') * pick(T, 1, 0.17 / 0.07), opJ = ctx.num('opacityJitter') * pick(T, 1, 0.15 / 0.09);
    wedges.forEach(({ a0, sw, r1, hour, i, files }) => {
      const w = el(keyed(el(s, 'g', {}), `w-${i}`), 'path', {
        d: sect(CX, CY, R0, r1, a0, a0 + sw), fill: pick(T, T.text, T.ramp[Math.min(4, Math.floor(hour / 4.8))]),
        'fill-opacity': Math.round(Math.min(1, op0 + rnd(i + 1, 6) * opJ) * 10000) / 10000, class: 'fade', style: `animation-delay:${0.2 + i * 0.022}s`,
      });
      tip(w, `${word} #${i + 1} — ${clock(hour)} · ${ctx.fmt(Math.round(files))} ${unit}`.trim());
    });
    // outlined wedges: the ones that paged somebody
    wedges.filter((w) => rows[w.i].incident).forEach(({ a0, sw, r1, i }, k) => {
      const w = el(keyed(el(s, 'g', {}), `w-${i}`), 'path', {
        d: sect(CX, CY, R0, r1, a0, a0 + sw), fill: 'none', stroke: pick(T, T.text, T.hero), 'stroke-width': ctx.num('outlineWidth') * pick(T, 1, 1.5 / 1.1),
        class: 'fade', style: `animation-delay:${1.2 + k * 0.15}s`,
      });
      tip(w, `${word} #${i + 1} — triggered an incident`);
    });
    el(s, 'circle', { cx: CX, cy: CY, r: 3, fill: pick(T, T.text, T.data), class: 'pop', style: 'animation-delay:1.3s' });
    if (ctx.s.showCaption !== false) {
      txt(s, { x: CX, y: 308, 'font-size': ctx.fs(7.5), 'font-weight': 600, fill: lFaint(T, '#B0AFA9'), 'text-anchor': 'middle', 'letter-spacing': '.12em', class: 'fade', style: 'animation-delay:1.4s' }, ctx.str('caption').trim() || 'OUTLINED = TRIGGERED AN INCIDENT');
    }
  },
});
