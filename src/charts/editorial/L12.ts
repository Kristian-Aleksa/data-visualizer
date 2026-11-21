// L12 Type Colonnade — a column of tiny repo names on the left, each wired by a hairline curve to
// the team that owns it on the right; team dots grow with what they own, so the pile-ups show the
// real org chart.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';

const PRE = ['core', 'ui', 'api', 'data', 'auth', 'sync', 'mail', 'flag', 'edge', 'doc', 'bot'];
const SUF = ['-kit', '-svc', '-web', '-cli', '-db', '-gw', '-sdk', '-jobs'];
const TEAM = ['PLATFORM', 'FRONTEND', 'BACKEND', 'DATA', 'INFRA', 'MOBILE', 'SECURITY', 'GROWTH', 'ML', 'DESIGN'];
const owner = (i: number) => {
  const w = rnd(i + 1, 17);
  return Math.min(9, Math.floor(w * w * 10)); // skewed: low teams hoard
};

export default defineChart({
  id: 'L12',
  name: 'Type Colonnade',
  family: 'editorial',
  kinds: ['flow'],
  description: 'A column of item names, each wired by a hairline to its owner; owners grow with what they hold.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [
      {
        key: 'repos',
        label: 'Items',
        minRows: 1,
        maxRows: 200,
        columns: [
          { key: 'repo', label: 'Item', type: 'text', role: 'label', help: 'For example the repo.' },
          { key: 'team', label: 'Owner', type: 'text', role: 'target', help: 'For example the team.' },
        ],
      },
      {
        key: 'teams',
        label: 'Owners',
        minRows: 0,
        maxRows: 30,
        columns: [{ key: 'team', label: 'Owner', type: 'text', role: 'category', help: 'Sets the order (owners with nothing yet still show). Owners missing here are added after these.' }],
      },
    ],
  },
  defaultData: {
    repos: Array.from({ length: 44 }, (_, i) => ({ repo: PRE[i % 11] + SUF[Math.floor(rnd(i + 1, 8) * 8) % 8] + (i > 21 ? '-v2' : ''), team: TEAM[owner(i)] })),
    teams: TEAM.map((team) => ({ team })),
  },
  text: {
    title: 'Forty-four repos, ten owners',
    subtitle: 'every hairline hands a repo to the team that owns it · the pile-ups are the org chart nobody drew',
    source: 'TYPE COLONNADE · MONO-EDITORIAL2 · CODE OWNERSHIP',
  },
  fields: [
    { key: 'repoPitch', label: 'Item spacing', group: 'options', section: 'Layout', type: 'number', min: 2, max: 30, step: 0.1, unit: 'px', default: 6.7, help: 'Shrinks automatically when the items wouldn’t fit.' },
    { key: 'teamPitch', label: 'Owner spacing', group: 'options', section: 'Layout', type: 'number', min: 6, max: 80, step: 0.5, unit: 'px', default: 28, help: 'Shrinks automatically when the owners wouldn’t fit.' },
    { key: 'curveWidth', label: 'Curve width', group: 'options', section: 'Curves', type: 'number', min: 0, max: 3, step: 0.05, unit: 'px', default: 0.6, help: 'Colour palettes draw curves a little thicker (0.8 px) and stronger.' },
    { key: 'curveOpacity', label: 'Curve opacity', group: 'options', section: 'Curves', type: 'number', min: 0, max: 1, step: 0.01, default: 0.6 },
    { key: 'dotBase', label: 'Owner dot base size', group: 'options', section: 'Owners', type: 'number', min: 0, max: 20, step: 0.1, unit: 'px', default: 2.6 },
    { key: 'dotPerItem', label: 'Owner dot growth per item', group: 'options', section: 'Owners', type: 'number', min: 0, max: 5, step: 0.05, unit: 'px', default: 0.55 },
    { key: 'break1', label: 'Middle shade from', group: 'options', section: 'Owners', type: 'number', min: 0, max: 1000, step: 1, default: 4, help: 'Mono’s three shades. Colour palettes use five, one per band of 3.' },
    { key: 'break2', label: 'Darkest shade from', group: 'options', section: 'Owners', type: 'number', min: 0, max: 1000, step: 1, default: 7 },
    { key: 'colourBand', label: 'Colour shade step', group: 'options', section: 'Owners', type: 'number', min: 1, max: 1000, step: 1, default: 3 },
    { key: 'repoLabelSize', label: 'Item name size', group: 'options', section: 'Labels', type: 'number', min: 2, max: 14, step: 0.5, unit: 'px', default: 5 },
    { key: 'unit', label: 'Items are', group: 'options', section: 'Units', type: 'text', default: 'repos', help: 'Tooltip: “PLATFORM owns 12 repos”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true },
  paletteNeeds: ['sequential'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const teams = (ctx.data.teams ?? []).map((r) => String(r.team ?? '').trim()).filter(Boolean);
    const repos = (ctx.data.repos ?? []).map((r) => ({ name: String(r.repo ?? ''), team: String(r.team ?? '').trim() }));
    for (const r of repos) if (!teams.includes(r.team)) teams.push(r.team);
    const N = repos.length, nT = teams.length;
    const rp = Math.min(ctx.num('repoPitch'), N > 1 ? 290 / (N - 1) : Infinity), tp = Math.min(ctx.num('teamPitch'), nT > 1 ? 256 / (nT - 1) : Infinity);
    const teamY = (j: number) => 36 + j * tp, repoY = (i: number) => 16 + i * rp;
    const counts = teams.map((t) => repos.filter((r) => r.team === t).length);
    const band = Math.max(1e-9, ctx.num('colourBand'));
    const colOf = (n: number) => T.ramp[Math.min(4, Math.floor(n / band))];
    const cw = ctx.num('curveWidth') * pick(T, 1, 0.8 / 0.6), co = Math.min(1, ctx.num('curveOpacity') * pick(T, 1, 0.78 / 0.6));
    repos.forEach((r, i) => {
      const yi = repoY(i), j = teams.indexOf(r.team), yj = teamY(j);
      const col = colOf(counts[j]);
      const g = keyed(el(s, 'g', {}), `t-${j}`);
      if (ctx.bool('dataLabels')) {
        txt(g, { x: 112, y: yi + 2, 'font-size': ctx.fs(ctx.num('repoLabelSize')), fill: T.muted, 'text-anchor': 'end', class: 'fade', style: `animation-delay:${i * 0.012}s` }, r.name);
      }
      el(g, 'rect', { x: 117, y: yi - 1.2, width: 4, height: 2.4, fill: pick(T, T.faintData, col), class: 'fade', style: `animation-delay:${i * 0.012}s` });
      el(g, 'path', {
        d: `M123 ${yi} C 200 ${yi} 220 ${yj} 288 ${yj}`, fill: 'none', stroke: pick(T, '#A8A7A0', col), 'stroke-width': Math.round(cw * 1000) / 1000,
        opacity: Math.round(co * 1000) / 1000, class: 'draw', style: `animation-delay:${0.2 + i * 0.015}s;animation-duration:.7s`,
      });
    });
    const b1 = ctx.num('break1'), b2 = ctx.num('break2');
    const unit = ctx.str('unit');
    teams.forEach((t, j) => {
      const y = teamY(j), grow = counts[j] * ctx.num('dotPerItem');
      const g = keyed(el(s, 'g', {}), `t-${j}`);
      el(g, 'circle', {
        cx: 293, cy: y, r: ctx.num('dotBase') + grow, fill: pick(T, counts[j] >= b2 ? T.text : counts[j] >= b1 ? T.label : T.faintData, colOf(counts[j])),
        class: 'pop', style: `animation-delay:${0.6 + j * 0.05}s`,
      });
      if (ctx.bool('categoryLabels')) {
        const lab = txt(g, { x: 302 + grow, y: y + 2.5, 'font-size': ctx.fs(7), 'font-weight': 700, fill: pick(T, '#4A4944', T.label), class: 'fade', style: `animation-delay:${0.65 + j * 0.05}s` }, `${t} · ${ctx.fmt(counts[j])}`);
        tip(lab, `${t} owns ${ctx.fmt(counts[j])} ${unit}`.trim());
      }
    });
  },
});
