// L05 Radial Convergence — items sit on a rim; each sends a curve to the hub of the theme that
// claimed it, so the bundles show which themes pull hardest. Hubs are sized by how many items
// they claim. Every item's theme comes from the data.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import { pick } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { pol } from './shared';

const THEME: [string, number][] = [['PERF', 15], ['INTEGRATIONS', 10], ['PRICING', 9], ['MOBILE', 8], ['UX', 6]];
const BLOCKS = THEME.flatMap(([, n], h) => Array<number>(n).fill(h));
const hubOf = (i: number) => (rnd(i + 1, 11) > 0.92 ? (BLOCKS[i] + 2) % 5 : BLOCKS[i]);

export default defineChart({
  id: 'L05',
  name: 'Radial Convergence',
  family: 'editorial',
  kinds: ['flow', 'network'],
  description: 'Items on a rim, each curving into the hub of the theme that claimed it.',
  card: { width: 689, chartHeight: 330 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [
      {
        key: 'items',
        label: 'Items',
        minRows: 1,
        maxRows: 300,
        columns: [
          { key: 'item', label: 'Item', type: 'text', role: 'label', help: 'The short code printed on the rim.' },
          { key: 'theme', label: 'Theme', type: 'text', role: 'group' },
        ],
      },
      {
        key: 'themes',
        label: 'Themes',
        minRows: 0,
        maxRows: 24,
        columns: [{ key: 'theme', label: 'Theme', type: 'text', role: 'category', help: 'Sets the order of the hubs. Themes missing here are added after these.' }],
      },
    ],
  },
  defaultData: {
    items: BLOCKS.map((_, i) => ({ item: 'R-' + String(i + 1).padStart(2, '0'), theme: THEME[hubOf(i)][0] })),
    themes: THEME.map(([theme]) => ({ theme })),
  },
  text: {
    title: '48 requests pull toward five themes',
    subtitle: 'every rim node = a feature request · lines bundle into the theme that claimed it',
    source: 'RADIAL CONVERGENCE · MONO-EDITORIAL · FEEDBACK BOARD',
  },
  fields: [
    { key: 'rimRadius', label: 'Rim radius', group: 'options', section: 'Layout', type: 'number', min: 30, max: 160, step: 1, unit: 'px', default: 116 },
    { key: 'hubRadius', label: 'Hub ring radius', group: 'options', section: 'Layout', type: 'number', min: 0, max: 120, step: 1, unit: 'px', default: 34 },
    { key: 'firstHubAngle', label: 'First hub angle', group: 'options', section: 'Layout', type: 'number', min: -360, max: 360, step: 1, unit: '°', default: -75, help: 'Hubs are spread evenly from here. −90° is straight up.' },
    { key: 'rimTension', label: 'Curve pull, rim end', group: 'options', section: 'Curves', type: 'number', min: 0, max: 1, step: 0.01, default: 0.42 },
    { key: 'hubTension', label: 'Curve pull, hub end', group: 'options', section: 'Curves', type: 'number', min: 0, max: 1, step: 0.01, default: 0.3 },
    { key: 'curveWidth', label: 'Curve width', group: 'options', section: 'Curves', type: 'number', min: 0, max: 4, step: 0.05, unit: 'px', default: 0.7, help: 'Colour palettes draw curves slightly thicker (0.9 px) and stronger.' },
    { key: 'curveOpacity', label: 'Curve opacity', group: 'options', section: 'Curves', type: 'number', min: 0, max: 1, step: 0.01, default: 0.55 },
    { key: 'hubScale', label: 'Hub size per √count', group: 'options', section: 'Hubs', type: 'number', min: 0, max: 6, step: 0.05, default: 1.55 },
    { key: 'rimDot', label: 'Rim dot size', group: 'options', section: 'Hubs', type: 'number', min: 0, max: 6, step: 0.1, unit: 'px', default: 1.6 },
    { key: 'unit', label: 'Items are', group: 'options', section: 'Units', type: 'text', default: 'requests', help: 'Tooltip: “PERF — 15 requests”.' },
  ],
  supports: { dataLabels: true, categoryLabels: true },
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const CX = 200, CY = 162, R = ctx.num('rimRadius');
    const themes = (ctx.data.themes ?? []).map((r) => String(r.theme ?? '').trim()).filter(Boolean);
    const items = (ctx.data.items ?? []).map((r) => ({ code: String(r.item ?? ''), theme: String(r.theme ?? '').trim() }));
    for (const it of items) if (!themes.includes(it.theme)) themes.push(it.theme);
    const nT = themes.length, N = items.length;
    const angleOf = (h: number) => ctx.num('firstHubAngle') + (h * 360) / Math.max(1, nT);
    const hubPt = (h: number) => pol(CX, CY, ctx.num('hubRadius'), angleOf(h));
    const counts = themes.map((t) => items.filter((it) => it.theme === t).length);
    const most = Math.max(0, ...counts);
    const ser = (h: number) => T.ser[h % T.ser.length];
    const cw = ctx.num('curveWidth') * pick(T, 1, 0.9 / 0.7), co = Math.min(1, ctx.num('curveOpacity') * pick(T, 1, 0.62 / 0.55));
    items.forEach((it, i) => {
      const deg = (i / N) * 360 - 90, [px, py] = pol(CX, CY, R, deg);
      const h = themes.indexOf(it.theme), [hx, hy] = hubPt(h);
      const c1x = CX + (px - CX) * ctx.num('rimTension'), c1y = CY + (py - CY) * ctx.num('rimTension');
      const c2x = CX + (hx - CX) * ctx.num('hubTension'), c2y = CY + (hy - CY) * ctx.num('hubTension');
      const g = keyed(el(s, 'g', {}), `t-${h}`);
      el(g, 'path', {
        d: `M${px} ${py} C${c1x} ${c1y} ${c2x} ${c2y} ${hx} ${hy}`, fill: 'none', stroke: pick(T, '#A8A7A0', ser(h)), 'stroke-width': Math.round(cw * 1000) / 1000,
        opacity: Math.round(co * 1000) / 1000, class: 'draw', style: `animation-delay:${i * 0.018}s`,
      });
      el(g, 'circle', { cx: px, cy: py, r: ctx.num('rimDot'), fill: pick(T, T.label, ser(h)), class: 'pop', style: `animation-delay:${i * 0.018}s` });
      // tiny rim code, flipped on the left half so it stays readable
      if (ctx.bool('dataLabels')) {
        const flip = deg > 90 && deg < 270, [lx, ly] = pol(CX, CY, R + 7, deg);
        txt(g, {
          x: lx, y: ly, 'font-size': ctx.fs(5.5), fill: T.muted, 'text-anchor': flip ? 'end' : 'start', 'dominant-baseline': 'middle',
          transform: `rotate(${flip ? deg + 180 : deg} ${lx} ${ly})`, class: 'fade', style: `animation-delay:${0.2 + i * 0.01}s`,
        }, it.code);
      }
    });
    const unit = ctx.str('unit');
    themes.forEach((name, h) => {
      const deg = angleOf(h), [hx, hy] = hubPt(h);
      const g = keyed(el(s, 'g', {}), `t-${h}`);
      const hub = el(g, 'circle', {
        cx: hx, cy: hy, r: Math.sqrt(counts[h]) * ctx.num('hubScale'), fill: pick(T, T.text, counts[h] === most ? T.hero : ser(h)),
        class: 'pop', style: `animation-delay:${0.5 + h * 0.08}s`,
      });
      tip(hub, `${name} — ${ctx.fmt(counts[h])} ${unit}`.trim());
      if (ctx.bool('categoryLabels')) {
        // theme label parked outside the rim, past the code ring
        const [tx, ty] = pol(CX, CY, R + 34, deg);
        txt(g, {
          x: tx, y: ty, 'font-size': ctx.fs(8), 'font-weight': 800, fill: T.text, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'letter-spacing': '.08em',
          style: `animation-delay:${0.6 + h * 0.08}s`, class: 'fade',
        }, `${name} · ${ctx.fmt(counts[h])}`);
        // hairline tying the label to its hub, skimming past the rim
        const [gx, gy] = pol(CX, CY, R + 22, deg);
        el(g, 'line', { x1: hx, y1: hy, x2: gx, y2: gy, stroke: pick(T, T.faint, T.track), 'stroke-width': 0.7, 'stroke-dasharray': '1 3', class: 'fade', style: `animation-delay:${0.7 + h * 0.08}s` });
      }
    });
  },
});
