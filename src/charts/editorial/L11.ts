// L11 Trend Lineage — one vertical line per feature running down the years: ● shipped, ○
// reworked, dashed where it lay dormant, and running on to today if it's still alive (dead ones
// stop with a small dot).

import { defineChart } from '../../core/define';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { lFaint } from './shared';

const TR: [string, [number, 'f' | 'o'][], boolean][] = [
  ['Dark mode', [[2017, 'f'], [2022, 'o']], true],
  ['Kanban', [[2016, 'f']], true],
  ['Wikis', [[2016, 'f'], [2019, 'o']], false],
  ['Slash cmds', [[2018, 'f']], true],
  ['Templates', [[2019, 'f'], [2024, 'o']], true],
  ['Inbox', [[2020, 'f']], false],
  ['Live cursors', [[2020, 'f'], [2023, 'o']], true],
  ['AI drafts', [[2023, 'f'], [2025, 'o']], true],
  ['Voice notes', [[2021, 'f']], false],
  ['Offline', [[2018, 'f'], [2026, 'o']], true],
];
const yes = (v: unknown) => /^(y|yes|true|1|x|alive)$/i.test(String(v ?? '').trim());

export default defineChart({
  id: 'L11',
  name: 'Trend Lineage',
  family: 'editorial',
  kinds: ['time'],
  description: 'One line per feature down the years: shipped, reworked, dormant, and alive today or not.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 340 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 400,
      columns: [
        { key: 'feature', label: 'Feature', type: 'text', role: 'label' },
        { key: 'year', label: 'Year', type: 'number', role: 'date', integer: true },
        { key: 'event', label: 'Event', type: 'text', role: 'category', help: '“shipped” (●) or “reworked” (○).' },
        { key: 'alive', label: 'Alive today', type: 'text', required: false, help: '“yes” on any of the feature’s rows runs its line on to today.' },
      ],
    }],
  },
  defaultData: { rows: TR.flatMap(([feature, ev, alive]) => ev.map(([year, t]) => ({ feature, year, event: t === 'f' ? 'shipped' : 'reworked', alive: alive ? 'yes' : 'no' }))) },
  text: {
    title: 'Features rise, fall, come back',
    subtitle: '● shipped · ○ reworked · dashed = dormant years · line runs on if it\'s still alive today',
    source: 'TREND LINEAGE · MONO-EDITORIAL2 · PRODUCT HISTORY',
  },
  fields: [
    { key: 'today', label: 'Today (year)', group: 'options', section: 'Years', type: 'number', min: 1900, max: 2200, step: 1, default: 2026, help: 'Alive lines run down to here.' },
    { key: 'pxPerYear', label: 'Year spacing', group: 'options', section: 'Years', type: 'number', min: 4, max: 60, step: 0.5, unit: 'px', default: 24, help: 'Shrinks automatically when the years wouldn’t fit.' },
    { key: 'dormantAfter', label: 'Dashed after a gap of', group: 'options', section: 'Years', type: 'number', min: 0, max: 50, step: 1, unit: 'years', default: 2, help: 'Longer gaps between events are drawn dashed (dormant).' },
    { key: 'colPitch', label: 'Feature spacing', group: 'options', section: 'Features', type: 'number', min: 6, max: 80, step: 0.5, unit: 'px', default: 31, help: 'Shrinks automatically when the features wouldn’t fit.' },
    { key: 'nodeRadius', label: 'Event dot size', group: 'options', section: 'Features', type: 'number', min: 1, max: 12, step: 0.1, unit: 'px', default: 5.5 },
    { key: 'labelAngle', label: 'Name angle', group: 'options', section: 'Features', type: 'number', min: -90, max: 90, step: 1, unit: '°', default: -38 },
    {
      key: 'highlight', label: 'Highlight', group: 'options', section: 'Features', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'As the palette does' }, { value: 'latest', label: 'The most recently active' }, { value: 'none', label: 'None' }],
      help: 'Colour palettes draw the most recently active feature in the highlight colour.',
    },
  ],
  supports: { categoryLabels: true, grid: true },
  paletteNeeds: ['sequential', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const feats: { name: string; ev: [number, boolean][]; alive: boolean }[] = [];
    for (const r of ctx.rows) {
      const name = String(r.feature);
      let f = feats.find((x) => x.name === name);
      if (!f) feats.push((f = { name, ev: [], alive: false }));
      f.ev.push([Math.round(Number(r.year)), !/^re|^o$|○/i.test(String(r.event ?? '').trim())]);
      if (yes(r.alive)) f.alive = true;
    }
    feats.forEach((f) => f.ev.sort((a, b) => a[0] - b[0]));
    const years = feats.flatMap((f) => f.ev.map((e) => e[0]));
    const Y0 = Math.min(...years), today = Math.max(Math.round(ctx.num('today')), ...years);
    const span = Math.max(1, today - Y0);
    const py = Math.min(ctx.num('pxPerYear'), 240 / span), cp = Math.min(ctx.num('colPitch'), feats.length > 1 ? 296 / (feats.length - 1) : Infinity);
    const yY = (yr: number) => 34 + (yr - Y0) * py, colX = (c: number) => 76 + c * cp;
    if (ctx.bool('showGrid') || ctx.bool('categoryLabels')) {
      for (let yr = Y0; yr <= today; yr++) {
        if (ctx.bool('showGrid')) el(s, 'line', { x1: 60, y1: yY(yr), x2: 372, y2: yY(yr), stroke: pick(T, T.track, T.quiet), 'stroke-width': 0.8, class: 'fade', style: `animation-delay:${(yr - Y0) * 0.03}s` });
        if (ctx.bool('categoryLabels') && yr % 2 === 0) txt(s, { x: 52, y: yY(yr) + 3, 'font-size': ctx.fs(8), 'font-weight': 600, fill: T.muted, 'text-anchor': 'end', class: 'fade', style: `animation-delay:${(yr - Y0) * 0.03}s` }, yr);
      }
    }
    // the most recently active feature leads (colour palettes)
    const hl = ctx.str('highlight');
    const heroOn = hl === 'latest' || (hl === 'auto' && T.kind !== 'mono');
    const lastOf = (f: (typeof feats)[number]) => f.ev[f.ev.length - 1][0];
    const HC = heroOn && feats.length ? feats.map((f, i) => [lastOf(f), i]).sort((a, b) => b[0] - a[0])[0][1] : -1;
    const R = ctx.num('nodeRadius');
    feats.forEach((f, c) => {
      const x = colX(c), hero = c === HC, last = lastOf(f);
      const col = hero ? T.hero : T.ramp[f.alive ? Math.min(4, Math.max(2, Math.round(((last - Y0) / span) * 4))) : 1];
      const line = pick(T, '#B0AFA9', col), lw = pick(T, 1, hero ? 1.8 : 1.4);
      const g = keyed(el(s, 'g', {}), `f-${c}`);
      // segments between events: solid while fresh, dashed once dormant
      for (let k = 0; k < f.ev.length - 1; k++) {
        const gap = f.ev[k + 1][0] - f.ev[k][0];
        el(g, 'line', {
          x1: x, y1: yY(f.ev[k][0]) + 7, x2: x, y2: yY(f.ev[k + 1][0]) - 7, stroke: line, 'stroke-width': lw,
          'stroke-dasharray': gap > ctx.num('dormantAfter') ? '2 4' : 'none', class: 'draw', style: `animation-delay:${0.3 + c * 0.07}s;animation-duration:.6s`,
        });
      }
      if (f.alive) el(g, 'line', { x1: x, y1: yY(last) + 7, x2: x, y2: yY(today) + 16, stroke: line, 'stroke-width': lw, class: 'draw', style: `animation-delay:${0.45 + c * 0.07}s;animation-duration:.6s` });
      f.ev.forEach(([yr, shipped]) => {
        const node = el(g, 'circle', shipped
          ? { cx: x, cy: yY(yr), r: R, fill: pick(T, T.text, col), class: 'pop', style: `animation-delay:${0.35 + c * 0.07}s` }
          : { cx: x, cy: yY(yr), r: R, fill: T.bg, stroke: pick(T, T.text, col), 'stroke-width': pick(T, 1.4, 1.6), class: 'pop', style: `animation-delay:${0.35 + c * 0.07}s` });
        tip(node, `${f.name} — ${shipped ? 'shipped' : 'reworked'} ${yr}`);
      });
      // terminal dot: alive lands on today's baseline, dead stops where it stopped
      el(g, 'circle', { cx: x, cy: f.alive ? yY(today) + 16 : yY(last) + 12, r: f.alive ? 3 : 1.6, fill: pick(T, f.alive ? T.text : T.faint, col), class: 'pop', style: `animation-delay:${0.6 + c * 0.07}s` });
      if (ctx.bool('categoryLabels')) {
        const ly = yY(today) + 26;
        txt(g, {
          x, y: ly, 'font-size': ctx.fs(6.8), 'font-weight': hero ? 800 : 600, fill: hero ? T.hero : pick(T, f.alive ? '#4A4944' : '#B0AFA9', f.alive ? T.label : lFaint(T)),
          transform: `rotate(${ctx.num('labelAngle')} ${x} ${ly})`, 'text-anchor': 'end', class: 'fade',
          style: `${hero ? `paint-order:stroke;stroke:${T.bg};stroke-width:3px;` : ''}animation-delay:${0.7 + c * 0.05}s`,
        }, f.name);
      }
    });
  },
});
