// The two maps — M01 (US states) and M02 (world countries) — share this body: real outlines
// shaded in five steps with a stepped legend underneath (11px swatches, 10px gaps, centred), or
// the same values drawn as bubbles on a blank map. Placement is in geo.ts. Hovering a region
// outlines it in ink, lifts its shade a little and shows its name.

import type { ChartDef } from '../../core/chart';
import { alpha, parseColor, toHex } from '../../core/color';
import { defineChart } from '../../core/define';
import { formatNumber, numberFormatFrom } from '../../core/format';
import { measure } from '../../core/text/metrics';
import { byPreset, pick, type Theme } from '../../core/theme';
import type { ChartData, Field, Issue, Settings } from '../../core/types';
import { el, keyed, tip, txt } from '../../core/vnode';
import { decodeRegions, projection, regionPath, type GeoLayout, type GeoRegion, type Projection, type SpecialArea } from './geo';
import type { NameBook } from './names';

export interface MapConfig {
  id: string;
  name: string;
  description: string;
  regionWord: string;
  raw: [string, string[][]][];
  scale: number;
  special?: Record<string, SpecialArea>;
  names: NameBook;
  card: { width: number; chartHeight: number };
  size: { w: number; h: number };
  text: { title: string; subtitle: string; source: string };
  /** demo rows: region, value, label nudge x, label nudge y */
  rows: [string, number, number?, number?][];
  /** the map's default layout numbers */
  d: {
    top: number;
    bottom: number;
    border: number;
    hoverBorder: number;
    /** whether the colour presets thicken the highlight outline too (the world map's do) */
    hoverBoost: boolean;
    legendBottom: number;
    labelTop: number;
    labelSize: number;
    labelHalo: number;
    labelStyle: 'light' | 'dark';
    bubbleMax: number;
    tipWording: string;
    noData: string;
    /** west, north, east, south */
    bounds?: [number, number, number, number];
  };
}

/** The map shades: Mono and Wire have their own map greys; the other palettes use their ramp. */
export const mapRamp = (T: Theme): string[] =>
  byPreset(T, {
    mono: ['#D8D7D1', '#B0AFA9', '#8F8E88', '#4A4944', '#1C1C1A'],
    porcelain: T.ramp,
    palm: T.ramp,
    wire: ['#DBDAD3', '#C0BFB7', '#8F8E86', '#6E6D66', '#F5572F'],
  }, T.ramp);
/** Ink: outlines of the hovered region, label text. */
export const mapInk = (T: Theme): string => byPreset(T, { mono: T.text, porcelain: T.text, palm: T.data, wire: T.data }, T.text);
/** Regions without a value. */
export const noDataFill = (T: Theme): string => pick(T, '#E4E3DC', alpha(T.text, 0.1));

/** Hover colour lift: each channel × 1.1. */
export function lift(c: string): string {
  const p = parseColor(c);
  if (!p) return c;
  const ch = [p[0], p[1], p[2]].map((v) => Math.min(255, Math.floor(v * 1.1)));
  return p[3] < 1 ? `rgba(${ch.join(',')},${+p[3].toFixed(3)})` : toHex([ch[0], ch[1], ch[2], 1]);
}

/** Match each row to a region on the map. */
function matchRows(cfg: MapConfig, regions: GeoRegion[], data: ChartData) {
  const onMap = new Set(regions.map((r) => r.name).filter(Boolean));
  const out = new Map<string, { v: number; dx: number; dy: number }>();
  const unknown: { row: number; text: string }[] = [];
  const twice: { row: number; text: string }[] = [];
  (data.rows ?? []).forEach((row, i) => {
    const text = String(row.region ?? '').trim();
    const v = Number(row.value);
    if (!text) return;
    const name = onMap.has(text) ? text : cfg.names.find(text);
    if (!name || !onMap.has(name)) {
      unknown.push({ row: i, text });
      return;
    }
    if (out.has(name)) {
      twice.push({ row: i, text });
      return;
    }
    if (row.value === null || row.value === undefined || row.value === '' || !Number.isFinite(v)) return;
    out.set(name, { v, dx: Number(row.dx) || 0, dy: Number(row.dy) || 0 });
  });
  return { values: out, unknown, twice };
}

/** Legend wording for the steps: ≤9k · 10–20k · 21–38k · 39–64k · 65k+ (whole-number steps). */
export function stepLabels(breaks: number[], s: Settings): string[] {
  const nf = numberFormatFrom(s);
  const bare = (v: number) => formatNumber(v, { ...nf, prefix: '', suffix: '' });
  const full = (v: number) => formatNumber(v, nf);
  const whole = breaks.every(Number.isInteger);
  const out = [whole ? `≤${full(breaks[0] - 1)}` : `<${full(breaks[0])}`];
  for (let i = 0; i + 1 < breaks.length; i++) out.push(`${nf.prefix}${bare(breaks[i])}–${whole ? full(breaks[i + 1] - 1) : full(breaks[i + 1])}`);
  out.push(`${full(breaks[breaks.length - 1])}+`);
  return out;
}

export function mapChart(cfg: MapConfig): ChartDef {
  const { d } = cfg;
  let regionsCache: GeoRegion[] | null = null;
  const regionsOf = () => (regionsCache ??= decodeRegions(cfg.raw, cfg.scale, cfg.special));
  // outlines are re-projected only when the placement changes
  const geoCache = new Map<string, { P: Projection; paths: string[] }>();
  const geometry = (L: GeoLayout) => {
    const key = JSON.stringify(L);
    let g = geoCache.get(key);
    if (!g) {
      const regions = regionsOf();
      const P = projection(regions, L);
      g = { P, paths: regions.map((r) => regionPath(r, P)) };
      if (geoCache.size > 6) geoCache.delete(geoCache.keys().next().value as string);
      geoCache.set(key, g);
    }
    return g;
  };

  const fields: Field[] = [
    {
      key: 'display', label: 'Show values as', group: 'options', section: 'Map', type: 'select', default: 'shaded',
      options: [{ value: 'shaded', label: 'Shaded regions' }, { value: 'bubbles', label: 'Bubbles' }],
    },
    { key: 'mapTop', label: 'Space above the map', group: 'options', section: 'Map', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: d.top },
    { key: 'mapBottom', label: 'Space below the map', group: 'options', section: 'Map', type: 'number', min: 0, max: 200, step: 1, unit: 'px', default: d.bottom, help: 'Room for the legend. With the legend at the top, the two spaces swap.' },
    { key: 'aspectScale', label: 'East–west squeeze', group: 'options', section: 'Map', type: 'number', min: 0.3, max: 1.5, step: 0.01, default: 0.75, help: 'Longitude is drawn at this share of latitude (0.75 suits most maps).' },
    { key: 'mapZoom', label: 'Zoom', group: 'options', section: 'Map', type: 'number', min: 0.5, max: 4, step: 0.05, unit: '×', default: 1 },
    { key: 'borderWidth', label: 'Border width', group: 'options', section: 'Map', type: 'number', min: 0, max: 5, step: 0.05, unit: 'px', default: d.border },
  ];
  if (d.bounds) {
    const [w, n, e, s] = d.bounds;
    fields.push(
      { key: 'boundWest', label: 'West edge', group: 'options', section: 'Map area', type: 'number', min: -360, max: 360, step: 1, unit: '°', default: w },
      { key: 'boundEast', label: 'East edge', group: 'options', section: 'Map area', type: 'number', min: -360, max: 360, step: 1, unit: '°', default: e, help: 'More than 180 wraps past the date line.' },
      { key: 'boundNorth', label: 'North edge', group: 'options', section: 'Map area', type: 'number', min: -90, max: 90, step: 1, unit: '°', default: n },
      { key: 'boundSouth', label: 'South edge', group: 'options', section: 'Map area', type: 'number', min: -90, max: 90, step: 1, unit: '°', default: s, help: 'Where the map stops in the south (58° S keeps the far south off the map).' },
    );
  }
  fields.push(
    { key: 'step1', label: 'Second shade from', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 10, help: 'Values below this get the lightest shade.' },
    { key: 'step2', label: 'Third shade from', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 21 },
    { key: 'step3', label: 'Fourth shade from', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 39 },
    { key: 'step4', label: 'Darkest shade from', group: 'options', section: 'Shades', type: 'number', min: -1e9, max: 1e9, step: 1, default: 65 },
    { key: 'bubbleMax', label: 'Largest bubble', group: 'options', section: 'Bubbles', type: 'number', min: 2, max: 80, step: 0.5, unit: 'px', default: d.bubbleMax, help: 'Radius of the biggest value; areas follow the values.', when: (s) => s.display === 'bubbles' },
    { key: 'bubbleMin', label: 'Smallest bubble', group: 'options', section: 'Bubbles', type: 'number', min: 0, max: 20, step: 0.5, unit: 'px', default: 1.5, when: (s) => s.display === 'bubbles' },
    { key: 'bubbleOpacity', label: 'Bubble opacity', group: 'options', section: 'Bubbles', type: 'number', min: 0.1, max: 1, step: 0.05, default: 0.9, when: (s) => s.display === 'bubbles' },
    { key: 'labelTop', label: 'Label the largest', group: 'options', section: 'Labels', type: 'number', min: 0, max: 60, step: 1, unit: 'regions', default: d.labelTop },
    { key: 'labelText', label: 'Label wording', group: 'options', section: 'Labels', type: 'text', default: '{code} {v}', help: '{code} = short code, {name} = name, {v} = value.' },
    { key: 'mapLabelSize', label: 'Label size', group: 'options', section: 'Labels', type: 'number', min: 4, max: 24, step: 0.5, unit: 'px', default: d.labelSize },
    {
      key: 'labelStyle', label: 'Label colours', group: 'options', section: 'Labels', type: 'select', default: d.labelStyle,
      options: [{ value: 'light', label: 'Paper text, ink outline' }, { value: 'dark', label: 'Ink text, paper outline' }],
    },
    { key: 'labelHalo', label: 'Label outline', group: 'options', section: 'Labels', type: 'number', min: 0, max: 8, step: 0.5, unit: 'px', default: d.labelHalo },
    { key: 'hoverLabelSize', label: 'Name size on hover', group: 'options', section: 'Labels', type: 'number', min: 4, max: 24, step: 0.5, unit: 'px', default: 10 },
    { key: 'legendSwatch', label: 'Swatch size', group: 'options', section: 'Legend', type: 'number', min: 2, max: 30, step: 0.5, unit: 'px', default: 11 },
    { key: 'legendGap', label: 'Gap between items', group: 'options', section: 'Legend', type: 'number', min: 0, max: 60, step: 1, unit: 'px', default: 10 },
    { key: 'legendTextGap', label: 'Gap after a swatch', group: 'options', section: 'Legend', type: 'number', min: 0, max: 40, step: 1, unit: 'px', default: 10 },
    { key: 'legendEdge', label: 'Distance from the edge', group: 'options', section: 'Legend', type: 'number', min: 0, max: 120, step: 1, unit: 'px', default: d.legendBottom },
    { key: 'tipWording', label: 'Tooltip wording', group: 'options', section: 'Tooltips', type: 'text', default: d.tipWording, help: '{v} becomes the value.' },
    { key: 'noDataText', label: 'Tooltip without a value', group: 'options', section: 'Tooltips', type: 'text', default: d.noData },
    { key: 'hoverBorder', label: 'Highlight outline', group: 'options', section: 'Tooltips', type: 'number', min: 0, max: 6, step: 0.05, unit: 'px', default: d.hoverBorder },
  );

  return defineChart({
    id: cfg.id,
    name: cfg.name,
    family: 'maps',
    kinds: ['map'],
    description: cfg.description,
    card: cfg.card,
    size: cfg.size,
    dataSchema: {
      tables: [{
        key: 'rows',
        label: '',
        minRows: 1,
        maxRows: 400,
        columns: [
          { key: 'region', label: cfg.regionWord, type: 'text', role: 'region', help: cfg.id === 'M01' ? 'State name or postal code, e.g. “California” or “CA”.' : 'Country name or ISO code, e.g. “Germany”, “DE” or “DEU”.' },
          { key: 'value', label: 'Value', type: 'number', role: 'value' },
          { key: 'dx', label: 'Label nudge →', type: 'number', role: 'x', required: false, help: 'Moves this region’s label right (px); negative moves it left.' },
          { key: 'dy', label: 'Label nudge ↓', type: 'number', role: 'y', required: false, help: 'Moves this region’s label down (px); negative moves it up.' },
        ],
      }],
    },
    defaultData: { rows: cfg.rows.map(([region, value, dx, dy]) => ({ region, value, dx: dx ?? null, dy: dy ?? null })) },
    defaults: { numSuffix: 'k' },
    text: cfg.text,
    fields,
    supports: { dataLabels: true, legend: true, tooltip: true, hover: true },
    paletteNeeds: ['sequential'],
    interactions: ['tooltip', 'hover-highlight'],
    animation: 'effects',
    validate(data) {
      const { unknown, twice } = matchRows(cfg, regionsOf(), data);
      const issues: Issue[] = [];
      for (const u of unknown) issues.push({ table: 'rows', row: u.row, column: 'region', message: `“${u.text}” isn’t on this map, so it is left out.` });
      for (const t of twice) issues.push({ table: 'rows', row: t.row, column: 'region', message: `“${t.text}” is listed twice; the first row is used.` });
      return issues;
    },
    draw(ctx) {
      const { root: s, theme: T } = ctx;
      const W = cfg.size.w, H = cfg.size.h;
      const regions = regionsOf();
      const breaks = [ctx.num('step1'), ctx.num('step2'), ctx.num('step3'), ctx.num('step4')];
      for (let i = 1; i < 4; i++) breaks[i] = Math.max(breaks[i], breaks[i - 1]);
      const stepOf = (v: number) => breaks.filter((b) => v >= b).length;
      // legend measures first: the map makes room when the legend moves (top swaps the two
      // margins, right narrows the map)
      const legend = ctx.str('legend');
      const labels = stepLabels(breaks, ctx.s);
      const sw = ctx.num('legendSwatch'), gap = ctx.num('legendGap'), tg = ctx.num('legendTextGap'), fsz = ctx.fs(9), edge = ctx.num('legendEdge');
      const widths = labels.map((t) => measure(t, fsz, 400));
      const colW = sw + tg + Math.max(...widths);
      let top = ctx.num('mapTop'), bottom = ctx.num('mapBottom'), mapW = W;
      if (legend === 'top') [top, bottom] = [bottom, top];
      else if (legend === 'right') {
        mapW = Math.max(40, W - colW - edge - 12);
        bottom = top;
      }
      const L: GeoLayout = { W: mapW, H, top, bottom, aspectScale: Math.max(0.05, ctx.num('aspectScale')), zoom: ctx.num('mapZoom') };
      if (d.bounds) L.bounds = [ctx.num('boundWest'), ctx.num('boundNorth'), ctx.num('boundEast'), ctx.num('boundSouth')];
      const { P, paths } = geometry(L);
      const { values } = matchRows(cfg, regions, ctx.data);
      const ramp = mapRamp(T), INK = mapInk(T), PAPER = T.bg, empty = noDataFill(T);
      const bubbles = ctx.str('display') === 'bubbles';
      const hoverW = d.hoverBoost ? ctx.sw(ctx.num('hoverBorder')) : ctx.num('hoverBorder');
      const sweep = (x: number) => Math.max(0, Math.min(1, (x - P.view.x) / Math.max(1, P.view.w))) * 0.4;
      const fmtTip = (name: string) => {
        const v = values.get(name);
        return v ? `${name} — ${ctx.str('tipWording').replace('{v}', ctx.fmt(v.v))}` : `${name} — ${ctx.str('noDataText')}`;
      };

      // outlines
      const gMap = el(s, 'g', {});
      regions.forEach((r, i) => {
        const v = values.get(r.name);
        const fill = v && !bubbles ? ramp[stepOf(v.v)] : empty;
        const p = el(gMap, 'path', {
          d: paths[i], fill, stroke: PAPER, 'stroke-width': ctx.sw(ctx.num('borderWidth')), class: 'fade cs-glow', 'data-cs-raise': r.name ? 1 : undefined,
          style: `animation-delay:${sweep(P.x(r.center[0])).toFixed(3)}s;--cs-glow:${INK};--cs-glow-o:1;--cs-glow-w:${hoverW};--cs-dim:1;--cs-hot-fill:${lift(fill)}`,
        });
        if (r.name) {
          keyed(p, `r${i}`);
          tip(p, fmtTip(r.name));
        }
      });

      // bubbles: biggest first so small ones stay on top
      if (bubbles) {
        const max = Math.max(1e-9, ...[...values.values()].map((v) => Math.abs(v.v)));
        const gB = el(s, 'g', {});
        regions
          .map((r, i) => ({ r, i, v: values.get(r.name) }))
          .filter((o) => o.v)
          .sort((a, b) => Math.abs(b.v!.v) - Math.abs(a.v!.v))
          .forEach(({ r, i, v }) => {
            const cx = P.x(r.center[0]), cy = P.y(r.center[1]);
            const rad = Math.max(ctx.num('bubbleMin'), ctx.num('bubbleMax') * Math.sqrt(Math.abs(v!.v) / max));
            const c = el(gB, 'circle', {
              cx, cy, r: rad, fill: ramp[stepOf(v!.v)], 'fill-opacity': ctx.num('bubbleOpacity'), stroke: PAPER, 'stroke-width': ctx.sw(0.8),
              class: 'pop', style: `animation-delay:${(0.2 + sweep(cx)).toFixed(3)}s;--cs-dim:1`,
            });
            keyed(c, `r${i}`);
            tip(c, fmtTip(r.name));
          });
      }

      // labels on the largest values
      const labelled = new Map<string, string>();
      if (ctx.bool('dataLabels') && ctx.num('labelTop') > 0) {
        const top = [...values.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, Math.round(ctx.num('labelTop')));
        const light = ctx.str('labelStyle') !== 'dark';
        const gL = el(s, 'g', {});
        for (const [name, v] of top) {
          const i = regions.findIndex((r) => r.name === name);
          const r = regions[i];
          const text = ctx.str('labelText').replace('{code}', cfg.names.code(name)).replace('{name}', name).replace('{v}', ctx.fmt(v.v));
          labelled.set(name, text);
          const halo = ctx.num('labelHalo');
          // the group carries the hover hooks (outlined text is drawn as a pair of texts)
          const g = el(gL, 'g', { class: 'cs-hide-hot', 'data-cs-rel': `r${i}`, style: '--cs-dim:1', 'pointer-events': 'none' });
          txt(g, {
            x: P.x(r.center[0]) + v.dx, y: P.y(r.center[1]) + v.dy, 'font-size': ctx.fs(ctx.num('mapLabelSize')), 'font-weight': 800,
            fill: light ? PAPER : INK, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'fade',
            style: `animation-delay:.55s${halo > 0 ? `;paint-order:stroke;stroke:${light ? INK : PAPER};stroke-width:${halo}` : ''}`,
          }, text);
        }
      }

      // the name that appears on hover (live views only)
      const gH = el(s, 'g', {});
      regions.forEach((r, i) => {
        if (!r.name) return;
        const v = values.get(r.name);
        const nudge = labelled.has(r.name) && v ? [v.dx, v.dy] : [0, 0];
        const g = el(gH, 'g', { class: 'cs-hover-label', 'data-cs-ui': 1, 'data-cs-rel': `r${i}` });
        txt(g, {
          x: P.x(r.center[0]) + nudge[0], y: P.y(r.center[1]) + nudge[1], 'font-size': ctx.fs(ctx.num('hoverLabelSize')), 'font-weight': 800, fill: INK,
          'text-anchor': 'middle', 'dominant-baseline': 'central', style: `paint-order:stroke;stroke:${PAPER};stroke-width:3`,
        }, labelled.get(r.name) ?? r.name);
      });

      // legend: one swatch and range per step
      if (legend !== 'hidden') {
        const color = ramp[2];
        const items: { x: number; y: number }[] = [];
        if (legend === 'right') {
          const x = W - edge - colW;
          labels.forEach((_, k) => items.push({ x, y: H - edge - (labels.length - k) * sw - (labels.length - 1 - k) * gap }));
        } else {
          const total = widths.reduce((a, w) => a + sw + tg + w, 0) + gap * (labels.length - 1);
          let x = W / 2 - total / 2;
          const y = legend === 'top' ? edge : H - edge - sw;
          widths.forEach((w) => {
            items.push({ x, y });
            x += sw + tg + w + gap;
          });
        }
        const gLeg = el(s, 'g', {});
        labels.forEach((t, k) => {
          const { x, y } = items[k];
          el(gLeg, 'rect', { x, y, width: sw, height: sw, fill: ramp[k], class: 'fade', style: `animation-delay:${0.3 + k * 0.04}s` });
          txt(gLeg, { x: x + sw + tg, y: y + sw / 2, 'font-size': fsz, fill: color, 'dominant-baseline': 'central', class: 'fade', style: `animation-delay:${0.3 + k * 0.04}s` }, t);
        });
      }
    },
  });
}
