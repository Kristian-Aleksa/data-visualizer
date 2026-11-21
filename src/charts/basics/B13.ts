// B13 Nested Treemap — a two-level treemap. Area encodes the value only; groups are separated by
// a named band and gaps, not by colour (Mono). The layout is d3-hierarchy's squarified treemap.

import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import { contrast } from '../../core/color';
import { d3Isc } from '../shared/notices';
import { defineChart } from '../../core/define';
import { byPreset } from '../../core/theme';
import { measure } from '../../core/text/metrics';
import { el, keyed, tip, txt } from '../../core/vnode';
import { plain } from './shared';

const DEMO: [string, [string, number][]][] = [
  ['PRODUCT', [['Core app', 260], ['Collaboration', 190], ['Search', 110], ['Mobile', 80]]],
  ['PLATFORM', [['AI systems', 170], ['Data infra', 120], ['APIs', 105]]],
  ['GROWTH', [['Acquisition', 90], ['Retention', 80], ['Onboarding', 75]]],
];

interface TNode {
  name: string;
  value?: number;
  /** group index, and item index within the group */
  gi: number;
  ii: number;
  children?: TNode[];
}

/** Text that fits `max` px (with an ellipsis), or '' when not even one letter fits. */
function fit(text: string, max: number, size: number, weight: number): string {
  if (measure(text, size, weight) <= max) return text;
  for (let n = text.length - 1; n > 0; n--) {
    const t = text.slice(0, n).trimEnd() + '…';
    if (measure(t, size, weight) <= max) return t;
  }
  return '';
}

export default defineChart({
  id: 'B13',
  name: 'Nested Treemap',
  family: 'basics',
  kinds: ['hierarchy', 'part-to-whole'],
  description: 'A two-level treemap: area is the value, groups are named in a band above their items.',
  card: { width: 1100, chartHeight: 360 },
  size: { w: 1044, h: 360 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 200,
      columns: [
        { key: 'group', label: 'Group', type: 'text', role: 'parent', help: 'The parent box, e.g. PRODUCT.' },
        { key: 'label', label: 'Item', type: 'text', role: 'label' },
        { key: 'value', label: 'Value', type: 'number', role: 'value', min: 0 },
      ],
    }],
  },
  defaultData: { rows: DEMO.flatMap(([group, items]) => items.map(([label, value]) => ({ group, label, value }))) },
  text: {
    title: 'Where the work went',
    subtitle: '1,280 shipped hours · area = effort · parent bands preserve the product hierarchy',
    source: 'NESTED TREEMAP · MONO-BASIC · WORK PORTFOLIO',
  },
  fields: [
    { key: 'squareRatio', label: 'Box shape', group: 'options', section: 'Layout', type: 'number', min: 1, max: 4, step: 0.05, default: 1.2, help: 'The width-to-height ratio the boxes aim for (1 = squares).' },
    { key: 'sortByValue', label: 'Largest first', group: 'options', section: 'Layout', type: 'boolean', default: true },
    { key: 'groupGap', label: 'Gap between groups', group: 'options', section: 'Layout', type: 'number', min: 0, max: 30, step: 0.5, unit: 'px', default: 5 },
    { key: 'groupBorder', label: 'Group border', group: 'options', section: 'Layout', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 3 },
    { key: 'itemGap', label: 'Gap between items', group: 'options', section: 'Layout', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 3 },
    { key: 'itemBorder', label: 'Item inset', group: 'options', section: 'Layout', type: 'number', min: 0, max: 12, step: 0.5, unit: 'px', default: 2 },
    { key: 'bandHeight', label: 'Group band height', group: 'options', section: 'Group bands', type: 'number', min: 0, max: 60, step: 1, unit: 'px', default: 32 },
    { key: 'bandPadding', label: 'Band text indent', group: 'options', section: 'Group bands', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 10 },
    { key: 'bandSize', label: 'Band text size', group: 'options', section: 'Group bands', type: 'number', min: 6, max: 24, step: 0.5, unit: 'px', default: 10 },
    { key: 'showPercent', label: 'Add each group’s share', group: 'options', section: 'Group bands', type: 'boolean', default: true, help: '“PRODUCT · 50%”' },
    { key: 'itemLabelSize', label: 'Item label size', group: 'options', section: 'Item labels', type: 'number', min: 6, max: 28, step: 0.5, unit: 'px', default: 12 },
    { key: 'labelPadX', label: 'Label indent', group: 'options', section: 'Item labels', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 8 },
    { key: 'labelPadY', label: 'Label top padding', group: 'options', section: 'Item labels', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 10 },
    { key: 'lineHeight', label: 'Label line height', group: 'options', section: 'Item labels', type: 'number', min: 8, max: 40, step: 0.5, unit: 'px', default: 18 },
    { key: 'valueUnit', label: 'Value unit (labels)', group: 'options', section: 'Units', type: 'text', default: 'h', help: '“260 h”' },
    { key: 'measure', label: 'Unit in words (tooltips)', group: 'options', section: 'Units', type: 'text', default: 'hours' },
  ],
  notices: [d3Isc('d3-hierarchy')],
  supports: { dataLabels: true, categoryLabels: true },
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    // groups and items in data order
    const groups: { name: string; items: { name: string; v: number }[] }[] = [];
    for (const r of ctx.rows) {
      const g = String(r.group ?? '').trim(), v = Math.max(0, Number(r.value) || 0);
      let grp = groups.find((x) => x.name === g);
      if (!grp) groups.push((grp = { name: g, items: [] }));
      grp.items.push({ name: String(r.label), v });
    }
    const sums = groups.map((g) => g.items.reduce((a, b) => a + b.v, 0));
    const total = sums.reduce((a, b) => a + b, 0);
    const ratio = ctx.num('squareRatio'), sort = ctx.bool('sortByValue');
    const band = ctx.num('bandHeight'), gb = ctx.num('groupBorder'), inset = ctx.num('itemBorder');
    const tree: TNode = {
      name: '', gi: -1, ii: -1,
      children: groups.map((g, gi) => ({ name: g.name, gi, ii: -1, children: g.items.map((it, ii) => ({ name: it.name, value: it.v, gi, ii })) })),
    };
    const root = hierarchy(tree).sum((d) => d.value ?? 0);
    if (sort) root.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const groupGap = ctx.num('groupGap'), itemGap = ctx.num('itemGap');
    const laid = treemap<TNode>()
      .tile(treemapSquarify.ratio(Math.max(1, ratio)))
      .size([ctx.w, ctx.h])
      .paddingInner((n) => (n.depth === 0 ? groupGap : itemGap))
      .paddingOuter((n) => (n.depth === 1 ? gb : 0))
      .paddingTop((n) => (n.depth === 1 ? Math.max(gb, band) : 0))(root);
    const boxOf = (n: { x0: number; y0: number; x1: number; y1: number }) => ({ x: n.x0, y: n.y0, w: Math.max(0, n.x1 - n.x0), h: Math.max(0, n.y1 - n.y0) });
    const gBoxes = groups.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
    const iBoxesOf = groups.map((g) => g.items.map(() => ({ x: 0, y: 0, w: 0, h: 0 })));
    for (const n of laid.descendants()) {
      if (n.depth === 1) gBoxes[n.data.gi] = boxOf(n);
      else if (n.depth === 2) iBoxesOf[n.data.gi][n.data.ii] = boxOf(n);
    }

    // colours: Mono shades nothing (area alone encodes effort); presets colour by group
    const fills = byPreset(T, {
      mono: ['#55554F'],
      porcelain: [T.hero, T.data, T.faintData],
      palm: [T.data, T.bead, T.hero],
      wire: [T.data, T.data2, T.faintData],
    }, [T.data, T.data2, T.faintData]);
    const darkText = byPreset(T, { mono: [false], porcelain: [false, false, true], palm: [false, false, true], wire: [false, true, true] }, null);
    const labelOn = (fill: string, gi: number) =>
      darkText ? (darkText[gi % darkText.length] ? T.text : T.bg) : contrast(T.text, fill) > contrast(T.bg, fill) ? T.text : T.bg;
    // Wire's one highlight: the single largest item
    let heroG = -1, heroI = -1;
    if (T.heroMode) {
      let best = -1;
      groups.forEach((g, gi) => g.items.forEach((it, ii) => {
        if (it.v > best) [best, heroG, heroI] = [it.v, gi, ii];
      }));
    }
    const fs = ctx.fs(ctx.num('itemLabelSize')), bfs = ctx.fs(ctx.num('bandSize'));
    const lh = ctx.num('lineHeight'), padX = ctx.num('labelPadX'), padY = ctx.num('labelPadY');
    const mid = 0.3638; // centres each label line: Inter's middle → baseline
    const unit = ctx.str('valueUnit');
    let order = 0;
    groups.forEach((g, gi) => {
      const G = gBoxes[gi];
      const grp = keyed(el(s, 'g', {}), `group-${gi}`);
      const pct = total > 0 ? Math.round((sums[gi] / total) * 100) : 0;
      tip(grp, `${g.name}\n${plain(sums[gi])} ${ctx.str('measure')} · ${plain(total > 0 ? Math.round((sums[gi] / total) * 1000) / 10 : 0)}%`);
      if (ctx.bool('categoryLabels') && band > 0 && G.w > 2 * gb) {
        const text = ctx.bool('showPercent') ? `${g.name} · ${pct}%` : g.name;
        const shown = fit(text, G.w - 2 * gb - 2 * ctx.num('bandPadding'), bfs, 700);
        if (shown) {
          txt(grp, {
            x: G.x + gb + ctx.num('bandPadding'), y: G.y + band / 2 + mid * bfs, 'font-size': bfs, 'font-weight': 700, fill: T.text,
            class: 'fade', style: `animation-delay:${0.1 + gi * 0.08}s;animation-duration:.9s`,
          }, shown);
        }
      }
      g.items.forEach((it, ii) => {
        const b = iBoxesOf[gi][ii];
        const x = b.x + inset, y = b.y + inset, w = Math.max(0, b.w - 2 * inset), h = Math.max(0, b.h - 2 * inset);
        if (w <= 0 || h <= 0) return;
        const fill = gi === heroG && ii === heroI ? T.hero : fills[gi % fills.length];
        const leaf = el(grp, 'g', {});
        tip(leaf, `${g.name} / ${it.name}\n${plain(it.v)} ${ctx.str('measure')} · ${plain(total > 0 ? Math.round((it.v / total) * 1000) / 10 : 0)}%`);
        el(leaf, 'rect', {
          x, y, width: w, height: h, fill, class: 'pop',
          style: `animation-delay:${order * 0.04}s;animation-duration:.9s;animation-timing-function:quarticOut`,
        });
        if (ctx.bool('dataLabels')) {
          const color = gi === heroG && ii === heroI ? T.bg : labelOn(fill, gi);
          const room = w - 2 * padX;
          const lines = [fit(it.name, room, fs, 700), fit(`${plain(it.v)} ${unit}`.trim(), room, fs, 700)];
          lines.forEach((line, li) => {
            if (!line || padY + (li + 1) * lh > h) return;
            txt(leaf, {
              x: x + padX, y: y + padY + lh / 2 + li * lh + mid * fs, 'font-size': fs, 'font-weight': 700, fill: color,
              class: 'fade', style: `animation-delay:${0.3 + order * 0.04}s;animation-duration:.9s`,
            }, line);
          });
        }
        order++;
      });
    });
  },
});
