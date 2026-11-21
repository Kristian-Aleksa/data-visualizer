// Code exports, built to be pasted into a site or app without changes:
//  - HTML snippet: drop into any page or site-builder HTML block. Self-contained, no globals,
//    safe to paste several times on one page, text protected from the host page's CSS.
//  - Complete HTML page: one file that opens by double-click.
//  - React component (.tsx / .jsx): 'use client', SSR-safe, lint/type checks switched off for
//    the bundled runtime so strict TypeScript and Next.js builds pass unchanged.
//  - JavaScript module (.js / .ts): mountChart() plus a <graphit-…> custom element, for
//    Vue, Svelte, Angular or plain JavaScript apps.
//  - Embed snippet (iframe) and the settings JSON.
// Every export starts with a "Made with Graphit" line.

import { APP_NAME, CREDIT_COMMENT_LINES } from '../config';
import type { ChartDef } from '../core/chart';
import { buildScene } from '../core/scene';
import type { Theme } from '../core/theme';
import type { ChartData, Settings } from '../core/types';
import { fontInfo } from '../core/fonts';
import { TEXT_METRICS } from '../core/text/all-metrics';
import { familyOf, fontFaceCss, usedFaces, type FamilyName } from './fonts';

export type FontMode = 'google' | 'embed' | 'none';

export interface CodeInput {
  def: ChartDef;
  data: ChartData | undefined;
  /** user overrides only */
  settings: Settings;
  theme: Theme;
}

const runtimeCache = new Map<string, Promise<string>>();
export function fetchRuntime(id: string): Promise<string> {
  let p = runtimeCache.get(id);
  if (!p) {
    p = fetch(`/runtime/${id}.js`).then((r) => {
      if (!r.ok) throw new Error(`Couldn’t load the ${id} runtime (HTTP ${r.status}).`);
      return r.text();
    });
    p.catch(() => runtimeCache.delete(id));
    runtimeCache.set(id, p);
  }
  return p;
}

/** The credit lines for an export: "Made with", then notices for any open-source code the chart bundles. */
const creditLines = (def: ChartDef): string[] => [
  ...CREDIT_COMMENT_LINES,
  ...(def.notices ?? []).flatMap((n, i) => (i === 0 ? ['', 'Third-party code included in this file:'] : []).concat(n.split('\n'))),
];

/** JSON that is also safe inside <script> and JS source. */
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const json = (v: unknown, indent?: number) =>
  JSON.stringify(v, null, indent).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
const htmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The runtime wrapped so it defines no global variables. */
/** The runtime wrapped so it defines no global variables, with the chart font's letter widths added. */
const scoped = (bundle: string, m: Meta) => {
  const widths = TEXT_METRICS[m.family];
  const add = widths ? `GraphitRuntime.addTextFont(${json(m.family)}, ${json(widths)});\n` : '';
  return `(function () {\n${bundle.trim()}\n${add}return GraphitRuntime;\n})()`;
};

interface Meta {
  w: number;
  h: number;
  title: string;
  bg: string;
  slug: string;
  faces: Iterable<import('./fonts').Face>;
  family: FamilyName;
}

function metaOf(c: CodeInput): Meta {
  const sc = buildScene(c.def, { data: c.data, settings: c.settings, theme: c.theme });
  return {
    w: sc.width,
    h: sc.height,
    title: String(sc.settings.title || c.def.name),
    bg: c.def.card.dark ? c.theme.dark.cardBg : c.theme.bg,
    slug: c.def.id.toLowerCase(),
    faces: usedFaces(sc.root),
    family: familyOf(sc.root),
  };
}

/** The Google Fonts stylesheet for a font, with the weights it has (none for Aeonik, which isn't there). */
function googleUrl(family: FamilyName): string | null {
  const f = fontInfo(family);
  if (!f.google) return null;
  const faces = [...f.weights.map((w) => `0,${w}`), '1,400'].join(';');
  return `https://fonts.googleapis.com/css2?family=${f.name.replace(/ /g, '+')}:ital,wght@${faces}&display=swap`;
}

/** JS statements that load the chart font once per page. */
async function fontLoader(requested: FontMode, m: Meta, indent = '  '): Promise<string> {
  const mode: FontMode = requested === 'google' && !googleUrl(m.family) ? 'embed' : requested;
  if (mode === 'none') return '';
  const id = `cs-font-${m.family.toLowerCase().replace(/\s+/g, '-')}${mode === 'embed' ? '-embedded' : ''}`;
  const body =
    mode === 'google'
      ? `var link = document.createElement('link');\n${indent}  link.id = '${id}';\n${indent}  link.rel = 'stylesheet';\n${indent}  link.href = '${googleUrl(m.family)}';\n${indent}  document.head.appendChild(link);`
      : `var style = document.createElement('style');\n${indent}  style.id = '${id}';\n${indent}  style.textContent = ${json(await fontFaceCss(m.family, m.faces))};\n${indent}  document.head.appendChild(style);`;
  return `if (!document.getElementById('${id}')) {\n${indent}  ${body}\n${indent}}`;
}

const options = (c: CodeInput, m: Meta, indent: string) =>
  [
    `data: ${json(c.data ?? c.def.defaultData)}`,
    `settings: ${json(c.settings)}`,
    `theme: ${json(c.theme)}`,
    `width: ${m.w}`,
    `height: ${m.h}`,
    `title: ${json(m.title)}`,
    `interactive: true`,
    `autoplay: 'visible'`,
  ]
    .map((l) => `${indent}${l}`)
    .join(',\n');

/** Inline styles for the element that holds the chart (inline beats any page CSS). */
const hostStyle = (m: Meta) => `display:block;max-width:${m.w}px;margin:0 auto;padding:0;border:0;background:none;aspect-ratio:${m.w} / ${m.h}`;

// ── HTML ────────────────────────────────────────────────────────────────

export async function htmlSnippet(c: CodeInput, fonts: FontMode = 'google'): Promise<string> {
  const [runtime, m] = [await fetchRuntime(c.def.id), metaOf(c)];
  const load = await fontLoader(fonts, m, '  ');
  return `<!--
  ${c.def.id} ${c.def.name}: paste this whole block where the chart should appear.
  It needs no other files and can be pasted more than once on a page.
${creditLines(c.def).map((l) => `  ${l}`).join('\n')}
-->
<div data-cs-chart="${m.slug}" role="img" aria-label="${htmlEscape(m.title)}" style="${hostStyle(m)}"></div>
<script>
(function () {
  var script = document.currentScript;
  var host = script && script.previousElementSibling;
  if (!host || host.getAttribute('data-cs-chart') !== '${m.slug}' || host.hasAttribute('data-cs-ready')) {
    host = document.querySelector('[data-cs-chart="${m.slug}"]:not([data-cs-ready])');
  }
  if (!host) return;
  host.setAttribute('data-cs-ready', '');
  ${load ? `${load}\n  ` : ''}var runtime = ${scoped(runtime, m)};
  runtime.mountInto(host, {
${options(c, m, '    ')}
  });
})();
</script>
`;
}

export async function htmlPage(c: CodeInput, fonts: FontMode = 'embed'): Promise<string> {
  const m = metaOf(c);
  const snippet = (await htmlSnippet(c, fonts)).replace(/^<!--[\s\S]*?-->\n/, '');
  return `<!--
${creditLines(c.def).map((l) => `  ${l}`).join('\n')}
-->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlEscape(m.title)}</title>
<style>html,body{margin:0;background:${m.bg}}body{padding:24px 16px}</style>
</head>
<body>
${snippet}</body>
</html>
`;
}

/** @deprecated kept for older callers: the complete page. */
export const htmlExport = (c: CodeInput, opts: { embedFonts: boolean }) => htmlPage(c, opts.embedFonts ? 'embed' : 'google');

// ── React ───────────────────────────────────────────────────────────────

const pascal = (s: string) => s.replace(/[^A-Za-z0-9]+(.)?/g, (_, ch: string | undefined) => (ch ? ch.toUpperCase() : '')).replace(/^./, (x) => x.toUpperCase());
export const componentName = (def: ChartDef) => `${pascal(def.name)}Chart`;

/** Option types written into the TypeScript exports (all optional, so `<Chart />` type-checks). */
const OPTION_TYPES = `  /** Your own data, in the same shape as chartData. */
  data?: Record<string, Array<Record<string, string | number | null | undefined>>>;
  /** Settings to change, for example { title: 'My title' }. */
  settings?: Record<string, string | number | boolean | undefined>;
  /** Colours, in the same shape as chartTheme. */
  theme?: Record<string, unknown>;
  /** Tooltips, hover, zoom and dragging (default true). */
  interactive?: boolean;
  /** 'visible' (default): play when scrolled into view. true: play at once. false: show the end. */
  autoplay?: boolean | 'visible';`;

export async function reactExport(c: CodeInput, fonts: FontMode = 'google', lang: 'tsx' | 'jsx' = 'tsx'): Promise<string> {
  const [runtime, m] = [await fetchRuntime(c.def.id), metaOf(c)];
  const name = componentName(c.def);
  const load = await fontLoader(fonts, m, '  ');
  const file = `${name}.${lang}`;
  const ts = lang === 'tsx';
  const propsType = ts
    ? `
export type ${name}Props = {
${OPTION_TYPES}
  className?: string;
  style?: React.CSSProperties;
};
`
    : '';
  return `${creditLines(c.def).map((l) => (l ? `// ${l}` : '//')).join('\n')}
//
// ${c.def.id} ${c.def.name} as a React component, exported from ${APP_NAME}.
// 1. Save this file in your app as ${file} (for example in a components folder).
// 2. Use it:  import ${name} from './${name}';   then   <${name} />
// Works in Next.js (App and Pages Router), Vite and Create React App, with React 18 or 19.
// Optional props: data, settings, theme, interactive, autoplay ('visible' | true | false),
// className, style. The chart fills the width of its container.
/* eslint-disable */
// @ts-nocheck
'use client';

import * as React from 'react';

/** The chart engine (bundled, no other dependencies). */
const ChartRuntime = ${scoped(runtime, m)};

export const chartData = ${json(c.data ?? c.def.defaultData)};
export const chartSettings = ${json(c.settings)};
export const chartTheme = ${json(c.theme)};
${propsType}
function loadFonts() {
  if (typeof document === 'undefined') return;
  ${load || '// fonts: the page’s own fonts are used'}
}

export default function ${name}({
  data = chartData,
  settings,
  theme = chartTheme,
  interactive = true,
  autoplay = 'visible',
  className,
  style,
}${ts ? `: ${name}Props` : ''}) {
  const ref = React.useRef(null);
  const label = String((settings && settings.title) || ${json(m.title)});
  const key = JSON.stringify([data, settings || null, theme]);
  React.useEffect(() => {
    if (!ref.current) return undefined;
    loadFonts();
    const chart = ChartRuntime.mountInto(ref.current, {
      data,
      settings: { ...chartSettings, ...(settings || {}) },
      theme,
      width: ${m.w},
      height: ${m.h},
      title: label,
      interactive,
      autoplay,
    });
    return () => chart.destroy();
  }, [key, interactive, autoplay]);
  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={className}
      style={{ display: 'block', maxWidth: ${m.w}, margin: '0 auto', padding: 0, border: 0, aspectRatio: '${m.w} / ${m.h}', ...style }}
    />
  );
}
`;
}

// ── JavaScript module ───────────────────────────────────────────────────

export const customTag = (def: ChartDef) => `graphit-${def.id.toLowerCase()}`;

export async function jsModuleExport(c: CodeInput, fonts: FontMode = 'google', lang: 'js' | 'ts' = 'js'): Promise<string> {
  const [runtime, m] = [await fetchRuntime(c.def.id), metaOf(c)];
  const tag = customTag(c.def);
  const load = await fontLoader(fonts, m, '  ');
  const file = `${m.slug}-${c.def.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${lang}`;
  return `${creditLines(c.def).map((l) => (l ? `// ${l}` : '//')).join('\n')}
//
// ${c.def.id} ${c.def.name} as a JavaScript module, exported from ${APP_NAME}. No dependencies.
// Save as ${file}, then either:
//  • HTML: <script type="module" src="./${file.replace(/\.ts$/, '.js')}"></script>  and  <${tag}></${tag}>
//  • Any app: import { mountChart } from './${file.replace(/\.(js|ts)$/, '')}';
//      const chart = mountChart(element);   // later: chart.destroy()
//    Vue: call it in onMounted with a template ref. Svelte: in onMount. Angular: in ngAfterViewInit.
// mountChart(element, { data, settings, theme, interactive, autoplay }) accepts overrides.
/* eslint-disable */
// @ts-nocheck

const ChartRuntime = ${scoped(runtime, m)};

export const chartData = ${json(c.data ?? c.def.defaultData)};
export const chartSettings = ${json(c.settings)};
export const chartTheme = ${json(c.theme)};

function loadFonts() {
  ${load || '// fonts: the page’s own fonts are used'}
}
${
  lang === 'ts'
    ? `
export type ChartOptions = {
${OPTION_TYPES}
};

export type ChartHandle = { destroy(): void; replay(): void };

/** Draw the chart inside an element (or the element a CSS selector finds). */
export function mountChart(target: string | Element, options: ChartOptions = {}): ChartHandle {`
    : `
/**
 * Draw the chart inside an element (or the element a CSS selector finds).
 * @param {string | Element} target
 * @param {{ data?: object, settings?: object, theme?: object, interactive?: boolean, autoplay?: boolean | 'visible' }} [options]
 * @returns {{ destroy(): void, replay(): void }}
 */
export function mountChart(target, options = {}) {`
}
  if (typeof document === 'undefined') return { destroy() {}, replay() {} };
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!host) throw new Error('mountChart: no element found for ' + String(target));
  loadFonts();
  const opts = {
    data: options.data || chartData,
    settings: Object.assign({}, chartSettings, options.settings || {}),
    theme: options.theme || chartTheme,
    width: ${m.w},
    height: ${m.h},
    title: String((options.settings && options.settings.title) || ${json(m.title)}),
    interactive: options.interactive !== undefined ? options.interactive : true,
    autoplay: options.autoplay !== undefined ? options.autoplay : 'visible',
  };
  if (typeof SVGSVGElement !== 'undefined' && host instanceof SVGSVGElement) {
    const player = ChartRuntime.mount(host, opts);
    return { destroy() { player.destroy(); }, replay() { player.replay(); } };
  }
  return ChartRuntime.mountInto(host, opts);
}

export const tagName = '${tag}';

if (typeof window !== 'undefined' && window.customElements && !window.customElements.get(tagName)) {
  window.customElements.define(
    tagName,
    class extends HTMLElement {
      connectedCallback() {
        if (this._chart) return;
        if (!this.style.display) this.style.display = 'block';
        if (!this.style.maxWidth) this.style.maxWidth = '${m.w}px';
        if (!this.style.aspectRatio) this.style.aspectRatio = '${m.w} / ${m.h}';
        this._chart = mountChart(this);
      }
      disconnectedCallback() {
        if (this._chart) this._chart.destroy();
        this._chart = null;
      }
    },
  );
}
`;
}

// ── Embed ───────────────────────────────────────────────────────────────

export function embedUrl(origin: string, id: string, state: string): string {
  return `${origin}/embed/${id.toLowerCase()}#s=${state}`;
}

export function embedSnippet(c: CodeInput, origin: string, state: string): string {
  const m = metaOf(c);
  return `<!-- ${CREDIT_COMMENT_LINES.join(' ')} -->
<iframe
  src="${embedUrl(origin, c.def.id, state)}"
  title="${htmlEscape(m.title)}"
  width="${m.w}" height="${m.h}"
  style="display:block;width:100%;max-width:${m.w}px;height:auto;aspect-ratio:${m.w} / ${m.h};border:0;margin:0 auto"
  loading="lazy"
  allowfullscreen></iframe>
`;
}
