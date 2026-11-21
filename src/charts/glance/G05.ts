// G05 Tree — a left-to-right tree. The root sits on the left, each level one column further
// right, leaves in a tidy column with their names on the right. Each top-level branch keeps one
// shade. The layout is d3-hierarchy's tidy tree (Reingold–Tilford as improved by Buchheim et
// al.).

import { hierarchy, tree as tidyTree, type HierarchyPointNode } from 'd3-hierarchy';
import type { DrawContext } from '../../core/chart';
import { defineChart } from '../../core/define';
import { quarticOut } from '../../core/ease';
import type { Issue, Row } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { d3Isc } from '../shared/notices';
import { MID, progress } from './plot';
import { glanceFrame, hi } from './shared';

const DEMO: [string, string[]][] = [
  ['Editor', ['Blocks', 'Tables', 'Comments', 'History']],
  ['Automate', ['Workflows', 'Triggers', 'Webhooks']],
  ['Collaborate', ['Spaces', 'Guests', 'Mentions']],
  ['Integrate', ['API', 'Slack', 'GitHub']],
];
/** Mono shades for the top-level branches, in order. */
const MONO_ORDER = [0, 2, 3, 4, 5, 1];

interface TNode {
  name: string;
  row: number;
  children: TNode[];
}

/** Rows (name, parent) → one tree. Rows that can't join it are reported and left out. */
function buildTree(rows: Row[]): { root: TNode | null; issues: Issue[] } {
  const issues: Issue[] = [];
  const byName = new Map<string, TNode>();
  const parentOf: [TNode, string][] = [];
  let root: TNode | null = null;
  rows.forEach((r, i) => {
    const name = String(r.name ?? '').trim();
    if (byName.has(name)) {
      issues.push({ table: 'rows', row: i, message: `Row ${i + 1}: “${name}” is already in the table, so this row is left out.` });
      return;
    }
    const node: TNode = { name, row: i, children: [] };
    byName.set(name, node);
    const parent = String(r.parent ?? '').trim();
    if (parent) parentOf.push([node, parent]);
    else if (root) issues.push({ table: 'rows', row: i, message: `Row ${i + 1}: “${name}” has no parent, but “${root.name}” is already the root, so it’s left out.` });
    else root = node;
  });
  for (const [node, p] of parentOf) {
    const parent = byName.get(p);
    if (parent) parent.children.push(node);
    else issues.push({ table: 'rows', row: node.row, message: `Row ${node.row + 1}: there’s no “${p}” for “${node.name}” to hang from, so it’s left out.` });
  }
  if (!root) {
    issues.unshift({ table: 'rows', fatal: true, message: 'One row needs an empty Parent: that row is the root, drawn on the left.' });
    return { root: null, issues };
  }
  // rows that hang from a left-out row, or whose parents loop back on each other
  const seen = new Set<TNode>();
  const stack: TNode[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    seen.add(n);
    stack.push(...n.children);
  }
  const reported = new Set(issues.map((i) => i.row));
  const lost = [...byName.values()].filter((n) => !seen.has(n) && !reported.has(n.row));
  if (lost.length) {
    const names = lost.slice(0, 4).map((n) => `“${n.name}”`).join(', ') + (lost.length > 4 ? '…' : '');
    issues.push({ table: 'rows', message: `${names}: no chain of parents leads back to the root, so ${lost.length === 1 ? 'it’s' : 'they’re'} left out.` });
  }
  return { root, issues };
}

function branchShades(ctx: DrawContext, n: number): string[] {
  const T = ctx.theme;
  return Array.from({ length: n }, (_, i) => (T.kind === 'mono' ? T.ser[MONO_ORDER[i % MONO_ORDER.length] % T.ser.length] : i === 0 ? hi(T, T.ser[0]) : T.ser[i % T.ser.length]));
}

export default defineChart({
  id: 'G05',
  name: 'Tree',
  family: 'glance',
  kinds: ['hierarchy'],
  description: 'A left-to-right tree: the root on the left, each level a column, leaves listed on the right.',
  card: { width: 689, chartHeight: 320 },
  size: { w: 633, h: 320, responsive: true },
  notices: [d3Isc('d3-hierarchy')],
  dataSchema: {
    tables: [{
      key: 'rows',
      label: '',
      minRows: 1,
      maxRows: 300,
      columns: [
        { key: 'name', label: 'Name', type: 'text', role: 'id' },
        { key: 'parent', label: 'Parent', type: 'text', role: 'parent', required: false, help: 'The box it hangs from. Leave it empty for the root (one row only).' },
      ],
    }],
  },
  defaultData: {
    rows: [
      { name: 'Platform', parent: '' },
      ...DEMO.flatMap(([branch, kids]) => [{ name: branch, parent: 'Platform' }, ...kids.map((name) => ({ name, parent: branch }))]),
    ],
  },
  text: {
    title: 'Everything the platform ships',
    subtitle: 'product areas and capabilities · Jun 2026',
    source: 'TREE · MONO-FANCY · PRODUCT CATALOG',
  },
  fields: [
    { key: 'dotSize', label: 'Dot size', group: 'options', section: 'Nodes', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 7 },
    { key: 'groupGap', label: 'Gap between groups', group: 'options', section: 'Nodes', type: 'number', min: 1, max: 6, step: 0.1, unit: '× row', default: 2, help: 'Space between neighbours with different parents, in rows (neighbours with the same parent are 1 row apart).' },
    { key: 'lineWidth', label: 'Line width', group: 'options', section: 'Lines', type: 'number', min: 0, max: 10, step: 0.1, unit: 'px', default: 1.4 },
    { key: 'curve', label: 'Curve', group: 'options', section: 'Lines', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5, help: '0 draws straight lines.' },
    { key: 'rootLabelSize', label: 'Root name size', group: 'options', section: 'Names', type: 'number', min: 6, max: 30, step: 0.5, unit: 'px', default: 11.5 },
    { key: 'nodeLabelSize', label: 'Other names size', group: 'options', section: 'Names', type: 'number', min: 6, max: 30, step: 0.5, unit: 'px', default: 10 },
    { key: 'labelDistance', label: 'Name distance', group: 'options', section: 'Names', type: 'number', min: 0, max: 40, step: 0.5, unit: 'px', default: 5 },
    { key: 'marginLeft', label: 'Left margin', group: 'options', section: 'Layout', type: 'number', min: 0, max: 300, step: 1, unit: 'px', default: 64, help: 'Room for the root’s name.' },
    { key: 'marginRight', label: 'Right margin', group: 'options', section: 'Layout', type: 'number', min: 0, max: 300, step: 1, unit: 'px', default: 96, help: 'Room for the leaves’ names.' },
    { key: 'marginTop', label: 'Top margin', group: 'options', section: 'Layout', type: 'number', min: 0, max: 150, step: 1, unit: 'px', default: 8 },
    { key: 'marginBottom', label: 'Bottom margin', group: 'options', section: 'Layout', type: 'number', min: 0, max: 150, step: 1, unit: 'px', default: 8 },
  ],
  supports: { dataLabels: true },
  paletteNeeds: ['categorical', 'highlight'],
  interactions: ['tooltip', 'hover-highlight'],
  animation: 'self',
  frame: glanceFrame,
  naturalDuration: () => 1.1,
  validate(data) {
    return buildTree(data.rows ?? []).issues;
  },
  draw(ctx) {
    const { root: s, theme: T, w: W, h: H } = ctx;
    const built = buildTree(ctx.rows).root;
    if (!built) return;
    const x0 = ctx.num('marginLeft'), y0 = ctx.num('marginTop');
    const width = W - x0 - ctx.num('marginRight'), height = H - y0 - ctx.num('marginBottom');
    const gap = ctx.num('groupGap');
    // d3's x runs down the page here (the breadth), y across (the depth)
    const laid = tidyTree<TNode>().size([height, width]).separation((a, b) => (a.parent === b.parent ? 1 : gap))(hierarchy(built, (d) => d.children));
    const nodes = laid.descendants(); // pre-order: each parent before its children
    const index = new Map(nodes.map((n, i) => [n, i]));
    const shades = branchShades(ctx, laid.children?.length ?? 0);
    const colourOf = (n: HierarchyPointNode<TNode>) => (n.depth === 0 ? T.text : shades[laid.children!.indexOf(n.ancestors()[n.depth - 1])]);
    // every node lights up its whole line: ancestors and descendants
    const rel = (n: HierarchyPointNode<TNode>) => [...n.ancestors(), ...n.descendants().slice(1)].map((m) => `n${index.get(m)}`).join(' ');
    const pathOf = (n: HierarchyPointNode<TNode>) => n.ancestors().reverse().map((m) => m.data.name).join(' › ');

    const e = progress(ctx, 0, 1.1, quarticOut);
    // everything flies out from the root
    const ox = x0 + laid.y, oy = y0 + laid.x;
    const X = (n: HierarchyPointNode<TNode>) => ox + (x0 + n.y - ox) * e;
    const Y = (n: HierarchyPointNode<TNode>) => oy + (y0 + n.x - oy) * e;
    const c = ctx.num('curve'), lw = ctx.num('lineWidth');
    if (lw > 0) {
      for (const n of nodes) {
        if (!n.parent) continue;
        const x1 = X(n.parent), y1 = Y(n.parent), x2 = X(n), y2 = Y(n);
        el(s, 'path', {
          d: `M${x1} ${y1}C${x1 + (x2 - x1) * c} ${y1} ${x2 + (x1 - x2) * c} ${y2} ${x2} ${y2}`,
          fill: 'none', stroke: colourOf(n), 'stroke-width': lw, 'data-cs-rel': rel(n),
        });
      }
    }
    const r = (ctx.num('dotSize') / 2) * e;
    for (const n of nodes) {
      if (r <= 0) break;
      const dot = keyed(el(s, 'circle', { cx: X(n), cy: Y(n), r, fill: colourOf(n), opacity: Math.round(e * 1000) / 1000, 'data-cs-rel': rel(n) }), `n${index.get(n)}`);
      tip(dot, pathOf(n));
    }
    if (ctx.bool('dataLabels')) {
      for (const n of nodes) {
        const leaf = !n.children, fs = ctx.fs(n.depth === 0 ? ctx.num('rootLabelSize') : ctx.num('nodeLabelSize'));
        const dx = r + ctx.num('labelDistance');
        const label = keyed(txt(s, {
          x: leaf ? X(n) + dx : X(n) - dx, y: Y(n) + MID * fs, 'font-size': fs, 'font-weight': leaf ? 500 : 600,
          fill: n.depth === 0 ? T.text : leaf ? T.muted : T.label, 'text-anchor': leaf ? 'start' : 'end', 'data-cs-rel': rel(n),
        }, n.data.name), `n${index.get(n)}`);
        tip(label, pathOf(n));
      }
    }
  },
});
