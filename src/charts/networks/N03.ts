// N03 Thread Triptych — three columns (sources, processors, destinations) and one hairline thread
// per route through them, as thick as its volume. Hover a thread to trace it, hover a label to
// pull its whole bundle, click to pin. A status line under the threads (live views only) says
// what's lit.

import { defineChart } from '../../core/define';
import { rndAbs as rnd } from '../../core/rnd';
import type { ChartData, Row } from '../../core/types';
import { el, keyed, tip, txt, type VNode } from '../../core/vnode';

const SRC = ['web-app', 'ios-app', 'android', 'desktop', 'cli', 'public-api', 'webhooks', 'forms', 'email-in', 'chat-widget',
  'billing-ev', 'auth-ev', 'search-log', 'audit-ev', 'crash-rep', 'perf-beacon', 'cdn-log', 'edge-log', 'job-ev', 'sync-ev',
  'import', 'export-req', 'admin-ui', 'partner-api', 'iot-ping', 'backfill'];
const MIDV = ['parse', 'validate', 'dedupe', 'enrich', 'geoip', 'sessionize', 'pii-mask', 'score', 'sample', 'route',
  'batch', 'window', 'join', 'flatten', 'filter', 'hash', 'encrypt', 'compact', 'index', 'tag'];
const MID = MIDV.flatMap((v) => [v + '-a', v + '-b']);
const DST = ['WAREHOUSE', 'ANALYTICS', 'CRM', 'ADS', 'BILLING', 'SEARCH', 'ML PIPE', 'ARCHIVE', 'AUDIT', 'EXPORTS'];

function demoRoutes(): Row[] {
  const out: Row[] = [];
  SRC.forEach((s, i) => {
    const n = 2 + Math.floor(rnd(i + 1, 5) * 2);
    for (let k = 0; k < n; k++) {
      const mi = Math.floor(rnd(i * 3 + k + 2, 13) * MID.length);
      const di = Math.min(9, Math.floor(rnd(i * 5 + k + 4, 19) ** 2 * 11)); // low destinations hoard
      const v = Math.round(1 + rnd(i * 7 + k + 6, 29) ** 2 * 30); // long tail
      out.push({ source: s, processor: MID[mi], destination: DST[di], volume: v });
    }
  });
  return out;
}

type Stage = 's' | 'm' | 'd';
/** Column order: the nodes table first, then anything the routes mention that it doesn't. */
function columns(data: ChartData) {
  const cols: Record<Stage, string[]> = { s: [], m: [], d: [] };
  const stageOf = (v: unknown): Stage | null => {
    const t = String(v ?? '').trim().toLowerCase();
    return t.startsWith('s') ? 's' : t.startsWith('p') || t.startsWith('m') ? 'm' : t.startsWith('d') ? 'd' : null;
  };
  for (const r of data.nodes ?? []) {
    const st = stageOf(r.stage), name = String(r.name ?? '').trim();
    if (st && name && !cols[st].includes(name)) cols[st].push(name);
  }
  const routes = (data.routes ?? []).map((r) => ({ s: String(r.source ?? '').trim(), m: String(r.processor ?? '').trim(), d: String(r.destination ?? '').trim(), v: Math.max(0, Number(r.volume) || 0) }));
  for (const r of routes) {
    if (!cols.s.includes(r.s)) cols.s.push(r.s);
    if (!cols.m.includes(r.m)) cols.m.push(r.m);
    if (!cols.d.includes(r.d)) cols.d.push(r.d);
  }
  return { cols, routes: routes.map((r) => ({ s: cols.s.indexOf(r.s), m: cols.m.indexOf(r.m), d: cols.d.indexOf(r.d), v: r.v })) };
}

export default defineChart({
  id: 'N03',
  name: 'Thread Triptych',
  family: 'networks',
  kinds: ['flow', 'network'],
  description: 'Sources, processors and destinations in three columns, one thread per route; hover to trace, click to pin.',
  card: { width: 1200, chartHeight: 636, dark: true, style: 'large' },
  size: { w: 1140, h: 640 },
  dataSchema: {
    tables: [
      {
        key: 'routes',
        label: 'Routes',
        minRows: 1,
        maxRows: 1000,
        columns: [
          { key: 'source', label: 'Source', type: 'text', role: 'source' },
          { key: 'processor', label: 'Processor', type: 'text', role: 'category' },
          { key: 'destination', label: 'Destination', type: 'text', role: 'target' },
          { key: 'volume', label: 'Volume', type: 'number', role: 'weight', min: 0 },
        ],
      },
      {
        key: 'nodes',
        label: 'Column order',
        minRows: 0,
        maxRows: 300,
        columns: [
          { key: 'stage', label: 'Column', type: 'text', role: 'group', help: '“source”, “processor” or “destination”.' },
          { key: 'name', label: 'Name', type: 'text', role: 'label', help: 'Sets the order, and keeps names that no route uses yet.' },
        ],
      },
    ],
  },
  defaultData: {
    routes: demoRoutes(),
    nodes: [...SRC.map((name) => ({ stage: 'source', name })), ...MID.map((name) => ({ stage: 'processor', name })), ...DST.map((name) => ({ stage: 'destination', name }))],
  },
  defaults: { tooltip: false, numSuffix: 'k', padding: 34 },
  text: {
    title: 'Where the data actually goes — now answerable',
    subtitle: 'source → processor → destination · one thread per data path · hover to trace a route · hover any label to pull its whole bundle · click to pin, click dark space to release',
    source: 'THREAD TRIPTYCH · INTERACTIVE · DATA MAP',
  },
  fields: [
    { key: 'col1', label: 'Source column', group: 'options', section: 'Columns', type: 'number', min: 0, max: 1140, step: 1, unit: 'px', default: 180 },
    { key: 'col2', label: 'Processor column', group: 'options', section: 'Columns', type: 'number', min: 0, max: 1140, step: 1, unit: 'px', default: 560 },
    { key: 'col3', label: 'Destination column', group: 'options', section: 'Columns', type: 'number', min: 0, max: 1140, step: 1, unit: 'px', default: 930 },
    { key: 'header1', label: 'Source heading', group: 'options', section: 'Columns', type: 'text', default: '① SOURCE' },
    { key: 'header2', label: 'Processor heading', group: 'options', section: 'Columns', type: 'text', default: '② PROCESSOR' },
    { key: 'header3', label: 'Destination heading', group: 'options', section: 'Columns', type: 'text', default: '③ DESTINATION' },
    { key: 'widthPerUnit', label: 'Thread width per unit', group: 'options', section: 'Threads', type: 'number', min: 0.01, max: 2, step: 0.01, default: 0.14 },
    { key: 'minWidth', label: 'Thinnest thread', group: 'options', section: 'Threads', type: 'number', min: 0.1, max: 5, step: 0.05, unit: 'px', default: 0.6 },
    { key: 'opacityBase', label: 'Thread opacity', group: 'options', section: 'Threads', type: 'number', min: 0, max: 1, step: 0.01, default: 0.06, help: 'Plus a little more per unit of volume.' },
    { key: 'opacityPerUnit', label: 'Opacity per unit', group: 'options', section: 'Threads', type: 'number', min: 0, max: 0.2, step: 0.001, default: 0.012 },
    { key: 'opacityMax', label: 'Most extra opacity', group: 'options', section: 'Threads', type: 'number', min: 0, max: 1, step: 0.01, default: 0.2 },
    { key: 'srcNameSize', label: 'Source name size', group: 'options', section: 'Names', type: 'number', min: 3, max: 20, step: 0.1, unit: 'px', default: 7.5 },
    { key: 'procNameSize', label: 'Processor name size', group: 'options', section: 'Names', type: 'number', min: 3, max: 20, step: 0.1, unit: 'px', default: 5.4 },
    { key: 'dstNameSize', label: 'Destination name size', group: 'options', section: 'Names', type: 'number', min: 3, max: 24, step: 0.1, unit: 'px', default: 8.5 },
    { key: 'unit', label: 'Volume unit', group: 'options', section: 'Units', type: 'text', default: 'ev/day', help: '“14k ev/day” in the status line.' },
  ],
  supports: { categoryLabels: true, tooltip: true, hover: true, clickFilter: true },
  paletteNeeds: ['sequential'],
  interactions: ['tooltip', 'hover-highlight', 'click-filter'],
  animation: 'effects',
  frame: (t) => ({ bg: t.dark.cardBg, title: t.dark.text, sub: t.dark.sub, src: t.dark.srcRow }),
  validate(data) {
    return (data.routes ?? []).length ? [] : [{ fatal: true, message: 'Add at least one route (source, processor, destination and volume).' }];
  },
  draw(ctx) {
    const { root: s, theme: T } = ctx;
    const D = T.dark;
    const PAPER = D.dk8[0];
    const { cols, routes } = columns(ctx.data);
    const X1 = ctx.num('col1'), X2 = ctx.num('col2'), X3 = ctx.num('col3');
    // each column spreads its names over the same height
    const spread = (a: number, b: number, n: number) => (i: number) => (n > 1 ? a + (i * (b - a)) / (n - 1) : (a + b) / 2);
    const sy = spread(36, 601, cols.s.length), my = spread(30, 599.4, cols.m.length), dy = spread(60, 573, cols.d.length);
    const unit = ctx.str('unit');
    const fmt = (v: number) => `${ctx.fmt(v)} ${unit}`.trim();
    const path = (r: (typeof routes)[number]) =>
      `M${X1 + 6} ${sy(r.s)} C${(X1 + X2) / 2} ${sy(r.s)} ${(X1 + X2) / 2} ${my(r.m)} ${X2} ${my(r.m)}` +
      ` C${(X2 + X3) / 2} ${my(r.m)} ${(X2 + X3) / 2} ${dy(r.d)} ${X3 - 6} ${dy(r.d)}`;
    // column headings
    if (ctx.bool('categoryLabels')) {
      ([[X1, 'header1'], [X2, 'header2'], [X3, 'header3']] as const).forEach(([x, k]) =>
        txt(s, { x, y: 14, 'font-size': ctx.fs(9), 'font-weight': 800, fill: PAPER, 'letter-spacing': '.14em', 'text-anchor': 'middle', class: 'fade' }, ctx.str(k)));
    }
    // threads first, under the labels
    const threads = el(s, 'g', {});
    const rel: Record<string, Set<string>> = {};
    const add = (k: string, ...ks: string[]) => ks.forEach((x) => (rel[k] ??= new Set([k])).add(x));
    routes.forEach((r, i) => {
      const keys = [`s${r.s}`, `m${r.m}`, `d${r.d}`];
      keys.forEach((k) => add(k, `r${i}`, ...keys));
    });
    routes.forEach((r, i) => {
      const d = path(r);
      const label = `${cols.s[r.s]} → ${cols.m[r.m]} → ${cols.d[r.d]} · ${fmt(r.v)}`;
      const line = el(threads, 'path', {
        d, fill: 'none', stroke: PAPER, 'stroke-width': Math.max(ctx.num('minWidth'), r.v * ctx.num('widthPerUnit')),
        opacity: Math.round((ctx.num('opacityBase') + Math.min(ctx.num('opacityMax'), r.v * ctx.num('opacityPerUnit'))) * 10000) / 10000,
        'stroke-linecap': 'round', class: 'draw cs-glow', style: `animation-delay:${i * 0.01}s;--cs-glow:${PAPER};--cs-glow-o:.95;--cs-dim:.035`,
        'data-cs-rel': `r${i} s${r.s} m${r.m} d${r.d}`,
      });
      tip(line, label);
      // the fat invisible twin is what the pointer catches (it stays in the SVG too)
      const hit = keyed(el(threads, 'path', { d, fill: 'none', stroke: '#000', 'stroke-opacity': 0, 'stroke-width': 9 }), `r${i}`);
      tip(hit, label);
    });
    // node labels and ticks
    const nodeTip = (k: Stage, idx: number) => {
      const rs = routes.filter((r) => r[k] === idx);
      const total = rs.reduce((a, r) => a + r.v, 0);
      return `${cols[k][idx]} · ${rs.length} path${rs.length === 1 ? '' : 's'} · ${fmt(total)} total`;
    };
    const node = (k: Stage, idx: number, build: (g: VNode) => void, hit: [number, number, number, number]) => {
      const key = `${k}${idx}`;
      const g = el(s, 'g', { 'data-cs-rel': [...(rel[key] ?? new Set([key]))].join(' '), style: '--cs-dim:.25' });
      build(g);
      tip(keyed(el(g, 'rect', { x: hit[0], y: hit[1], width: hit[2], height: hit[3], fill: '#000', 'fill-opacity': 0 }), key), nodeTip(k, idx));
    };
    const tick = (g: VNode, x: number, y: number) => el(g, 'rect', { x: x - 3, y: y - 1.6, width: 6, height: 3.2, fill: PAPER, opacity: 0.85, class: 'fade' });
    cols.s.forEach((name, i) => node('s', i, (g) => {
      tick(g, X1, sy(i));
      if (ctx.bool('categoryLabels')) txt(g, { x: X1 - 9, y: sy(i) + 2.6, 'font-size': ctx.fs(ctx.num('srcNameSize')), 'font-weight': 600, fill: D.label, 'text-anchor': 'end', class: 'fade' }, name);
    }, [X1 - 92, sy(i) - 6.5, 98, 13]));
    cols.m.forEach((name, i) => node('m', i, (g) => {
      tick(g, X2, my(i));
      if (ctx.bool('categoryLabels')) txt(g, { x: X2 + 9, y: my(i) + 2.6, 'font-size': ctx.fs(ctx.num('procNameSize')), 'font-weight': 600, fill: D.dk8[7], class: 'fade' }, name);
    }, [X2 - 6, my(i) - 6.5, 98, 13]));
    cols.d.forEach((name, i) => node('d', i, (g) => {
      el(g, 'circle', { cx: X3, cy: dy(i), r: 3.4, fill: PAPER, class: 'fade' });
      if (ctx.bool('categoryLabels')) txt(g, { x: X3 + 12, y: dy(i) + 3, 'font-size': ctx.fs(ctx.num('dstNameSize')), 'font-weight': 700, fill: D.label, 'letter-spacing': '.08em', class: 'fade' }, name);
    }, [X3 - 8, dy(i) - 10, 120, 20]));
    // status line (live views only): the interaction code writes what's lit into it
    txt(s, { x: 0, y: 632, 'font-size': 12, fill: D.sub, 'data-cs-ui': 1, 'data-cs-status': 1 }, 'hover a thread or a label');
  },
  interact(api) {
    const status = api.svg.querySelector('[data-cs-status]');
    if (!status) return;
    const idle = 'hover a thread or a label';
    let pinnedText = '';
    const show = (e: PointerEvent) => {
      if (api.svg.classList.contains('cs-pinned')) {
        status.textContent = `${pinnedText} · PINNED, CLICK DARK SPACE TO RELEASE`;
        return;
      }
      const t = (e.target as Element | null)?.closest?.('[data-tip]')?.getAttribute('data-tip');
      status.textContent = t || idle;
      pinnedText = t || '';
    };
    const leave = () => {
      if (!api.svg.classList.contains('cs-pinned')) status.textContent = idle;
    };
    const click = (e: PointerEvent) => setTimeout(() => show(e), 0);
    api.svg.addEventListener('pointermove', show);
    api.svg.addEventListener('pointerleave', leave);
    api.svg.addEventListener('pointerup', click);
    return () => {
      api.svg.removeEventListener('pointermove', show);
      api.svg.removeEventListener('pointerleave', leave);
      api.svg.removeEventListener('pointerup', click);
    };
  },
});
