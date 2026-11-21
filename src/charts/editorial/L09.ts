// L09 Bubble Almanac — a vintage almanac: ledger-paper hairlines under everything, a row per year
// and a column per area, translucent hand-drawn bubbles (area = value) big enough to collide, a
// dark "press mark" core, dashed rings for betas, marginal notes, and a footer of important
// events. The notes and events are data here.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import type { Row } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint } from './shared';

const AREAS = ['EDITOR', 'BOARDS', 'DOCS', 'CHAT', 'FLOWS', 'VAULT', 'PAGES', 'SYNC', 'GRID', 'VIEWS', 'HUB', 'FORMS'];
const BETA: Record<string, number> = { GRID: 2023, VIEWS: 2024, HUB: 2025, FORMS: 2025 };
const BORN: Record<string, number> = { EDITOR: 2019, BOARDS: 2019, DOCS: 2019, CHAT: 2020, FLOWS: 2020, VAULT: 2021, PAGES: 2021, SYNC: 2022, GRID: 2022, VIEWS: 2023, HUB: 2024, FORMS: 2024 };

function demoCells(): Row[] {
  const out: Row[] = [];
  for (let i = 0; i < 8; i++) {
    const yr = 2019 + i;
    AREAS.forEach((a, j) => {
      if (yr < BORN[a]) return;
      const age = yr - BORN[a];
      const v = Math.round((2 + age * 5) * (0.25 + rnd(i * 12 + j + 1, j + 3) ** 2 * 2.2));
      out.push({ year: String(yr), area: a, value: Math.max(1, v) * 10, beta: BETA[a] && yr <= BETA[a] ? 'yes' : '' });
    });
  }
  return out;
}

/** Hand-drawn circle: the radius wobbles on two slow sine waves, so no two bubbles are alike. */
function blob(x: number, y: number, r: number, seed: number): string {
  const n = Math.max(14, Math.round(r * 1.6)), pts: [number, number][] = [];
  for (let t = 0; t < n; t++) {
    const a = (t / n) * Math.PI * 2;
    const w = 1 + 0.055 * Math.sin(a * 2 + seed * 7) + 0.04 * Math.sin(a * 3 + seed * 13) + (rnd(seed + t, 3) - 0.5) * 0.03;
    pts.push([x + Math.cos(a) * r * w, y + Math.sin(a) * r * w]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let t = 0; t < n; t++) {
    const p = pts[t], q = pts[(t + 1) % n];
    d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
  }
  return d + ' Z';
}

const yes = (v: unknown) => /^(y|yes|true|1|x|beta)$/i.test(String(v ?? '').trim());

export default defineChart({
  id: 'L09',
  name: 'Bubble Almanac',
  family: 'editorial',
  kinds: ['heatmap', 'time'],
  description: 'A ledger of years × areas with translucent hand-drawn bubbles, margin notes and a footer of events.',
  card: { width: 1400, chartHeight: 420 },
  size: { w: 840, h: 400 },
  dataSchema: {
    tables: [
      {
        key: 'cells',
        label: 'Bubbles',
        minRows: 1,
        maxRows: 600,
        columns: [
          { key: 'year', label: 'Row', type: 'text', role: 'category', help: 'For example the year.' },
          { key: 'area', label: 'Column', type: 'text', role: 'category', help: 'For example the product area.' },
          { key: 'value', label: 'Value', type: 'number', role: 'size', min: 0 },
          { key: 'beta', label: 'Beta', type: 'text', required: false, help: '“yes” draws a dashed ring instead of a bubble.' },
        ],
      },
      {
        key: 'notes',
        label: 'Notes',
        minRows: 0,
        maxRows: 12,
        columns: [
          { key: 'year', label: 'Row', type: 'text', role: 'category' },
          { key: 'area', label: 'Column', type: 'text', role: 'category' },
          { key: 'text', label: 'Note', type: 'text', role: 'label' },
          { key: 'side', label: 'Side', type: 'text', required: false, help: '“above” (pointer rises to the right) or “below”.' },
        ],
      },
      {
        key: 'events',
        label: 'Events',
        minRows: 0,
        maxRows: 8,
        columns: [
          { key: 'label', label: 'When', type: 'text', role: 'label' },
          { key: 'text', label: 'Event', type: 'text', role: 'label' },
        ],
      },
    ],
  },
  defaultData: {
    cells: demoCells(),
    notes: [
      { year: '2024', area: 'CHAT', text: 'chat tickets triple after mobile GA', side: 'above' },
      { year: '2021', area: 'VIEWS', text: 'betas barely ticket — nobody files bugs on toys', side: 'below' },
    ],
    events: [
      { label: '2020', text: 'SLA introduced' },
      { label: '2022', text: 'self-serve help center' },
      { label: '2023', text: 'the GA wave' },
      { label: '2025', text: 'AI deflection live' },
    ],
  },
  text: {
    title: 'Eight years of tickets, one almanac',
    subtitle: 'bubble area = support tickets per product area, per year · bubbles overlap where years pile up · dark core = escalations · dashed ring = still in beta',
    source: 'BUBBLE ALMANAC · MONO-EDITORIAL2 · SUPPORT DESK',
  },
  fields: [
    { key: 'rowPitch', label: 'Row spacing', group: 'options', section: 'Grid', type: 'number', min: 8, max: 80, step: 0.5, unit: 'px', default: 34, help: 'Shrinks automatically when the rows wouldn’t fit.' },
    { key: 'colPitch', label: 'Column spacing', group: 'options', section: 'Grid', type: 'number', min: 8, max: 120, step: 0.5, unit: 'px', default: 57, help: 'Shrinks automatically when the columns wouldn’t fit.' },
    { key: 'ledgerGap', label: 'Ledger line spacing', group: 'options', section: 'Grid', type: 'number', min: 0, max: 30, step: 0.1, unit: 'px', default: 6.8, help: '0 turns the ledger paper off.' },
    { key: 'jitter', label: 'Bubble jitter', group: 'options', section: 'Bubbles', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 10 },
    { key: 'bubbleScale', label: 'Bubble size', group: 'options', section: 'Bubbles', type: 'number', min: 0.1, max: 12, step: 0.05, default: 3.8, help: 'Radius = √(value ÷ 10) × this.' },
    { key: 'coreSize', label: 'Core size', group: 'options', section: 'Bubbles', type: 'number', min: 0, max: 1, step: 0.01, default: 0.17, help: 'The dark core, as a share of the bubble’s radius.' },
    { key: 'wobble', label: 'Hand-drawn wobble', group: 'options', section: 'Bubbles', type: 'boolean', default: true },
    { key: 'colourBand', label: 'Colour shade step', group: 'options', section: 'Bubbles', type: 'number', min: 1, max: 1e9, step: 1, default: 120, help: 'Colour palettes shade bubbles one step darker per this much.' },
    { key: 'topLabels', label: 'Biggest bubbles labelled', group: 'options', section: 'Bubbles', type: 'number', min: 0, max: 20, step: 1, default: 3 },
    { key: 'labelAngle', label: 'Column label angle', group: 'options', section: 'Labels', type: 'number', min: -90, max: 90, step: 1, unit: '°', default: -32 },
    { key: 'eventsTitle', label: 'Events heading', group: 'options', section: 'Labels', type: 'text', default: 'IMPORTANT EVENTS' },
    { key: 'unit', label: 'Value unit (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'tickets' },
  ],
  supports: { dataLabels: true, categoryLabels: true, grid: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const years: string[] = [], areas: string[] = [];
    const cells = (ctx.data.cells ?? []).map((r) => {
      const yr = String(r.year), a = String(r.area);
      if (!years.includes(yr)) years.push(yr);
      if (!areas.includes(a)) areas.push(a);
      return { yr, a, value: Math.max(0, Number(r.value)), beta: yes(r.beta) };
    });
    const nY = years.length, nA = areas.length;
    const rp = Math.min(ctx.num('rowPitch'), nY > 1 ? 238 / (nY - 1) : Infinity);
    const cp = Math.min(ctx.num('colPitch'), nA > 1 ? 690 / (nA - 1) : Infinity);
    const rowY = (i: number) => 62 + i * rp, colX = (j: number) => 132 + j * cp;
    // ledger paper: hairlines edge to edge, under everything
    const lg = ctx.num('ledgerGap');
    if (ctx.bool('showGrid') && lg > 0) {
      for (let y = 40; y <= 318; y += lg) el(s, 'line', { x1: 56, y1: y, x2: 822, y2: y, stroke: pick(T, '#E4E3DC', T.quiet), 'stroke-width': 0.5, class: 'fade', style: `animation-delay:${(y - 40) * 0.001}s` });
    }
    years.forEach((yr, i) => {
      if (ctx.bool('showGrid')) el(s, 'line', { x1: 56, y1: rowY(i), x2: 822, y2: rowY(i), stroke: pick(T, '#D3D2CA', T.grid), 'stroke-width': 0.9, class: 'fade', style: `animation-delay:${i * 0.04}s` });
      if (ctx.bool('categoryLabels')) txt(s, { x: 48, y: rowY(i) + 3, 'font-size': ctx.fs(9), 'font-weight': 700, fill: T.muted, 'text-anchor': 'end', class: 'fade', style: `animation-delay:${i * 0.04}s` }, yr);
    });
    // small over large: the giants sit underneath as washes
    const vals = cells.map((c) => ({ ...c, i: years.indexOf(c.yr), j: areas.indexOf(c.a) })).sort((p, q) => q.value - p.value);
    const nTop = Math.round(ctx.num('topLabels'));
    const band = Math.max(1e-9, ctx.num('colourBand'));
    const shape = (x: number, y: number, r: number, seed: number) => (ctx.bool('wobble') ? blob(x, y, r, seed) : `M${x + r} ${y}A${r} ${r} 0 1 1 ${x - r} ${y}A${r} ${r} 0 1 1 ${x + r} ${y}Z`);
    const unit = ctx.str('unit');
    vals.forEach(({ value, i, j, a, yr, beta }, k) => {
      const x = colX(j) + (rnd(i * 7 + j + 2, j + 9) - 0.5) * ctx.num('jitter'), y = rowY(i), r = Math.sqrt(value / 10) * ctx.num('bubbleScale');
      const isTop = k < nTop;
      const col = T.ramp[Math.min(4, Math.floor(value / band))];
      const g = keyed(el(s, 'g', { class: 'pop', style: `animation-delay:${0.15 + k * 0.012}s` }), `a-${j}`);
      const seed = i * 12 + j;
      const dot = el(g, 'path', beta
        ? { d: shape(x, y, r, seed), fill: 'none', stroke: pick(T, T.muted, T.data2), 'stroke-width': pick(T, 1, 1.2), 'stroke-dasharray': '3 3' }
        : {
          d: shape(x, y, r, seed), fill: pick(T, T.text, col), 'fill-opacity': pick(T, 0.09 + rnd(i + 2, j + 4) * 0.1, 0.16 + rnd(i + 2, j + 4) * 0.14),
          stroke: pick(T, T.text, isTop ? T.hero : col), 'stroke-opacity': pick(T, 0.3 + rnd(i + 5, j + 7) * 0.35, isTop ? 0.95 : 0.5 + rnd(i + 5, j + 7) * 0.38),
          'stroke-width': pick(T, 0.6 + rnd(i + 3, j + 11) * 0.9, isTop ? 1.7 : 0.8 + rnd(i + 3, j + 11) * 1),
        });
      tip(dot, `${a} · ${yr} — ${ctx.fmt(value)} ${unit}${beta ? ' (beta)' : ''}`.trim());
      // escalation core: a small wobbly blot, nudged off-centre like a press mark
      if (!beta && ctx.num('coreSize') > 0) {
        const ox = (rnd(seed + 1, 17) - 0.5) * r * 0.3, oy = (rnd(seed + 3, 19) - 0.5) * r * 0.3;
        el(g, 'path', { d: shape(x + ox, y + oy, Math.max(1.4, r * ctx.num('coreSize')), seed + 29), fill: pick(T, T.text, isTop ? T.hero : T.text) });
      }
      if (isTop && ctx.bool('dataLabels')) {
        txt(s, { x, y: y - r - 5, 'font-size': ctx.fs(8.5), 'font-weight': 800, fill: pick(T, T.text, T.hero), 'text-anchor': 'middle', class: 'fade', style: 'animation-delay:1s' }, ctx.fmt(value));
      }
    });
    if (ctx.bool('categoryLabels')) {
      areas.forEach((a, j) => {
        const x = colX(j);
        txt(s, { x, y: 34, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: T.muted, 'letter-spacing': '.1em', transform: `rotate(${ctx.num('labelAngle')} ${x} 34)`, class: 'fade', style: `animation-delay:${j * 0.03}s` }, a);
      });
    }
    // marginalia: notes with pointer hairlines
    const pointer = lFaint(T, '#B0AFA9');
    (ctx.data.notes ?? []).forEach((n, k) => {
      const i = years.indexOf(String(n.year)), j = areas.indexOf(String(n.area));
      if (i < 0 || j < 0 || !String(n.text ?? '').trim()) return;
      const X = colX(j), Y = rowY(i), below = String(n.side ?? '').trim().toLowerCase() === 'below';
      const delay = `animation-delay:${1.1 + k * 0.1}s`;
      const d = below
        ? `M${X + 16} ${Y + 8} C${X + 40} ${Y + 26} ${X + 60} ${Y + 30} ${X + 80} ${Y + 30}`
        : `M${X + 30} ${Y - 14} C${X + 70} ${Y - 34} ${X + 96} ${Y - 38} ${X + 118} ${Y - 38}`;
      el(s, 'path', { d, fill: 'none', stroke: pointer, 'stroke-width': 0.7, class: 'fade', style: delay });
      txt(s, { x: below ? X + 86 : X + 124, y: below ? Y + 33 : Y - 35, 'font-size': ctx.fs(7), fill: T.label, 'font-style': 'italic', class: 'fade', style: delay }, String(n.text));
    });
    // footer strip: the almanac's timeline shelf
    const events = (ctx.data.events ?? []).filter((e) => String(e.label ?? '').trim() || String(e.text ?? '').trim());
    if (events.length) {
      const evY = 356;
      el(s, 'line', { x1: 56, y1: evY - 16, x2: 822, y2: evY - 16, stroke: lFaint(T), 'stroke-width': 0.8, class: 'fade', style: 'animation-delay:1.2s' });
      txt(s, { x: 56, y: evY - 24, 'font-size': ctx.fs(7), 'font-weight': 800, fill: T.muted, 'letter-spacing': '.16em', class: 'fade', style: 'animation-delay:1.2s' }, ctx.str('eventsTitle'));
      const step = events.length > 1 ? Math.min(196, 700 / (events.length - 1)) : 0;
      events.forEach((e, k) => {
        const x = 90 + k * step, delay = `animation-delay:${1.3 + k * 0.08}s`;
        el(s, 'line', { x1: x, y1: evY - 16, x2: x, y2: evY - 6, stroke: T.muted, 'stroke-width': 1, class: 'fade', style: delay });
        txt(s, { x, y: evY + 4, 'font-size': ctx.fs(8), 'font-weight': 800, fill: T.text, class: 'fade', style: delay }, String(e.label ?? ''));
        txt(s, { x, y: evY + 15, 'font-size': ctx.fs(7), fill: T.muted, class: 'fade', style: delay }, String(e.text ?? ''));
      });
    }
  },
});
