// G20 Aggregate Sankey — two columns: sources on the left, targets on the right, ribbons as wide
// as the flow between them (at half opacity so crossings stay readable).

import { defineChart } from '../../core/define';
import { byPreset, type Theme } from '../../core/theme';
import { el, keyed, tip, txt } from '../../core/vnode';
import { captionLine, laterInk } from '../basics/shared';
import { glanceFrame } from './shared';

const SRC: [string, number[]][] = [['SEARCH', [20, 10, 4]], ['REFERRAL', [12, 9, 6]], ['SOCIAL', [12, 4, 2]], ['PAID', [6, 3, 3]], ['OTHER', [5, 2, 2]]];
const DST = ['FREE', 'PRO', 'TEAM'];

const sourceShades = (T: Theme): string[] =>
  byPreset(T, {
    mono: ['#1C1C1A', '#4A4944', '#8F8E88', '#B0AFA9', '#C6C5BF'],
    porcelain: [T.text, T.data, T.data2, T.faintData, T.faint],
    palm: T.ser.slice(0, 5),
    wire: [T.data, '#6E6D66', T.data2, T.faintData, T.faint],
  }, [T.data, T.data2, T.faintData, T.faint, T.quiet]);

const autoCaption = (T: Theme) =>
  T.heroMode ? 'RIBBON WIDTH = ACCOUNTS OF 100 · SHADE = CHANNEL · RED = THE WIDEST RIBBON'
    : T.id === 'palm' ? 'RIBBON WIDTH = ACCOUNTS OF 100 · COLOR = CHANNEL'
      : 'RIBBON WIDTH = ACCOUNTS OF 100 · SHADE = CHANNEL';

export default defineChart({
  id: 'G20',
  name: 'Aggregate Sankey',
  family: 'glance',
  kinds: ['flow'],
  description: 'Two-column flow: ribbons as wide as the amount moving from each source to each target.',
  card: { width: 689, chartHeight: 506.3875 },
  size: { w: 400, h: 320 },
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 400,
      columns: [
        { key: 'source', label: 'From', type: 'text', role: 'source' },
        { key: 'target', label: 'To', type: 'text', role: 'target' },
        { key: 'value', label: 'Amount', type: 'number', role: 'weight', min: 0 },
      ],
    }],
  },
  defaultData: { rows: SRC.flatMap(([source, vals]) => vals.map((value, j) => ({ source, target: DST[j], value }))) },
  text: {
    title: 'Channels pour into plans',
    subtitle: 'ribbon width = accounts · channels on the left, the plans they land in on the right',
    source: 'AGGREGATE SANKEY · MONO-GLANCE · ATTRIBUTION',
  },
  fields: [
    { key: 'scale', label: 'Ribbon thickness', group: 'options', section: 'Ribbons', type: 'number', min: 0.05, max: 20, step: 0.05, unit: 'px per unit', default: 1.9, help: 'Shrinks automatically if the columns would not fit.' },
    { key: 'ribbonOpacity', label: 'Ribbon opacity', group: 'options', section: 'Ribbons', type: 'number', min: 0.05, max: 1, step: 0.01, default: 0.5 },
    { key: 'gapLeft', label: 'Gap between sources', group: 'options', section: 'Columns', type: 'number', min: 0, max: 60, step: 0.5, unit: 'px', default: 8 },
    { key: 'gapRight', label: 'Gap between targets', group: 'options', section: 'Columns', type: 'number', min: 0, max: 60, step: 0.5, unit: 'px', default: 22 },
    { key: 'leftX', label: 'Left column position', group: 'options', section: 'Columns', type: 'number', min: 40, max: 200, step: 1, unit: 'px', default: 104 },
    { key: 'rightX', label: 'Right column position', group: 'options', section: 'Columns', type: 'number', min: 200, max: 360, step: 1, unit: 'px', default: 298 },
    { key: 'barWidth', label: 'Node bar width', group: 'options', section: 'Columns', type: 'number', min: 1, max: 30, step: 0.5, unit: 'px', default: 9 },
    { key: 'measure', label: 'Tooltip ending', group: 'options', section: 'Units', type: 'text', default: 'accounts of 100' },
  ],
  supports: { dataLabels: true, categoryLabels: true, caption: true },
  caption: (_s, T) => autoCaption(T),
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'effects',
  frame: glanceFrame,
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const srcs: string[] = [], dsts: string[] = [];
    const flow = new Map<string, number>();
    for (const r of ctx.rows) {
      const a = String(r.source), b = String(r.target), v = Math.max(0, Number(r.value) || 0);
      if (!srcs.includes(a)) srcs.push(a);
      if (!dsts.includes(b)) dsts.push(b);
      flow.set(`${a}|${b}`, (flow.get(`${a}|${b}`) ?? 0) + v);
    }
    const val = (i: number, j: number) => flow.get(`${srcs[i]}|${dsts[j]}`) ?? 0;
    const XL = ctx.num('leftX'), XR = ctx.num('rightX'), Y0 = 34, MID = (XL + XR) / 2;
    const GAPL = ctx.num('gapLeft'), GAPR = ctx.num('gapRight'), BW = ctx.num('barWidth');
    const srcTot = srcs.map((_, i) => dsts.reduce((a, _d, j) => a + val(i, j), 0));
    const dstTot = dsts.map((_, j) => srcs.reduce((a, _s, i) => a + val(i, j), 0));
    let SC = ctx.num('scale');
    const room = 284 - Y0;
    const need = Math.max(srcTot.reduce((a, b) => a + b, 0) * SC + GAPL * (srcs.length - 1), dstTot.reduce((a, b) => a + b, 0) * SC + GAPR * (dsts.length - 1) + 2);
    if (need > room) SC = Math.max(0.01, (room - Math.max(GAPL * (srcs.length - 1), GAPR * (dsts.length - 1) + 2)) / Math.max(1e-9, Math.max(srcTot.reduce((a, b) => a + b, 0), dstTot.reduce((a, b) => a + b, 0))));
    const sy: number[] = [], dy: number[] = [];
    let y = Y0;
    srcTot.forEach((t, i) => {
      sy[i] = y;
      y += t * SC + GAPL;
    });
    y = Y0 + 2;
    dstTot.forEach((t, j) => {
      dy[j] = y;
      y += t * SC + GAPR;
    });
    const syc = [...sy], dyc = [...dy];
    const SH = sourceShades(T);
    const shadeOf = (i: number) => SH[i % SH.length];
    let widest = -1, wi = -1, wj = -1;
    srcs.forEach((_, i) => dsts.forEach((_d, j) => {
      if (val(i, j) > widest) [widest, wi, wj] = [val(i, j), i, j];
    }));
    const op = ctx.num('ribbonOpacity');
    srcs.forEach((a, i) => {
      dsts.forEach((b, j) => {
        const v = val(i, j);
        if (!v) return;
        const sa = syc[i], sb = sa + v * SC, da = dyc[j], db = da + v * SC;
        syc[i] = sb;
        dyc[j] = db;
        const heroRib = T.heroMode && i === wi && j === wj;
        const g = keyed(el(s, 'g', {}), `flow-${i}-${j}`);
        g.attrs['data-cs-rel'] = `src-${i} dst-${j} flow-${i}-${j}`;
        const rib = el(g, 'path', {
          d: `M${XL} ${sa} C${MID} ${sa} ${MID} ${da} ${XR} ${da} L${XR} ${db} C${MID} ${db} ${MID} ${sb} ${XL} ${sb} Z`,
          fill: heroRib ? T.hero : shadeOf(i), opacity: heroRib ? Math.min(1, op + 0.18) : op, class: 'fade', style: `animation-delay:${0.2 + (i * dsts.length + j) * 0.06}s`,
        });
        tip(rib, `${a} → ${b} — ${ctx.fmt(v)} ${ctx.str('measure')}`.trim());
      });
    });
    const srcLabel = byPreset(T, { mono: '#4A4944', porcelain: T.data, palm: T.ramp6[2], wire: '#6E6D66' }, T.label);
    srcs.forEach((name, i) => {
      const g = keyed(el(s, 'g', {}), `src-${i}`);
      el(g, 'rect', { x: XL - BW, y: sy[i], width: BW, height: srcTot[i] * SC, rx: Math.min(4, BW / 2), fill: shadeOf(i), class: 'fade', style: `animation-delay:${i * 0.06}s` });
      if (ctx.bool('categoryLabels')) {
        txt(g, {
          x: XL - 16, y: sy[i] + (srcTot[i] * SC) / 2 + 2.5, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: srcLabel, 'text-anchor': 'end',
          'letter-spacing': '.05em', class: 'fade', style: `animation-delay:${i * 0.06}s`,
        }, `${name} · ${ctx.fmt(srcTot[i])}`);
      }
    });
    const ink = laterInk(T);
    dsts.forEach((name, j) => {
      const g = keyed(el(s, 'g', {}), `dst-${j}`);
      el(g, 'rect', { x: XR, y: dy[j], width: BW, height: dstTot[j] * SC, rx: Math.min(4, BW / 2), fill: T.kind === 'mono' ? '#3A3934' : ink, class: 'fade', style: `animation-delay:${0.1 + j * 0.06}s` });
      if (ctx.bool('categoryLabels')) {
        txt(g, { x: XR + 16, y: dy[j] + (dstTot[j] * SC) / 2 - 3, 'font-size': ctx.fs(7.5), 'font-weight': 700, fill: srcLabel, 'letter-spacing': '.05em', class: 'fade', style: `animation-delay:${0.15 + j * 0.06}s` }, name);
      }
      if (ctx.bool('dataLabels')) {
        txt(g, { x: XR + 16, y: dy[j] + (dstTot[j] * SC) / 2 + 9, 'font-size': ctx.fs(10), 'font-weight': 800, fill: ink, class: 'fade', style: `animation-delay:${0.2 + j * 0.06}s` }, ctx.fmt(dstTot[j]));
      }
    });
    captionLine(ctx, autoCaption(T), 302, 1.1, { fill: T.faintData });
  },
});
