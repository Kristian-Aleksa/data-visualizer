// Entry point for the per-chart runtime bundles used by code exports (HTML, React, JS module).
// Bundled with esbuild as an IIFE that defines `GraphitRuntime` (exports wrap it so no
// global is left behind).

import type { ChartDef } from '../core/chart';
import { registerTextFont } from '../core/text/metrics';
import type { Theme } from '../core/theme';
import type { ChartData, Settings } from '../core/types';
import { Player } from './player';

export interface MountOptions {
  data?: ChartData;
  settings?: Partial<Settings>;
  theme: Theme;
  interactive?: boolean;
  /** true: play now; 'visible' (default): play when scrolled into view; false: show the end */
  autoplay?: boolean | 'visible';
}

export interface IntoOptions extends MountOptions {
  /** artboard size, used to reserve space before the chart draws */
  width: number;
  height: number;
  title: string;
}

/**
 * The page's CSS can't reach inside the shadow root, and `all: initial` on the <svg> drops
 * everything inherited from the page (text-transform, letter-spacing, …). Chart text carries
 * its own font settings inline, so it is unaffected by the reset.
 */
const SHADOW_CSS = ':host{display:block}svg{all:initial;display:block;width:100%;height:auto}';

export function createRuntime(chart: ChartDef) {
  const mount = (svg: SVGSVGElement, o: MountOptions) =>
    new Player(svg, chart, { data: o.data, settings: o.settings, theme: o.theme }, { interactive: o.interactive ?? true, autoplay: o.autoplay ?? 'visible' });
  return {
    id: chart.id,
    mount,
    /** Letter widths for a font other than Inter (an export adds the one its chart uses). */
    addTextFont: registerTextFont,
    /** Draw the chart inside `host` (a div or custom element), sealed off in a shadow root. */
    mountInto(host: HTMLElement, o: IntoOptions) {
      if (!host.style.display) host.style.display = 'block';
      if (!host.style.maxWidth) host.style.maxWidth = `${o.width}px`;
      const root: ShadowRoot | HTMLElement = host.attachShadow ? host.shadowRoot ?? host.attachShadow({ mode: 'open' }) : host;
      const style = document.createElement('style');
      style.textContent = SHADOW_CSS;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${o.width} ${o.height}`);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', o.title);
      if (root === host) svg.style.cssText = 'display:block;width:100%;height:auto';
      root.replaceChildren(style, svg);
      const player = mount(svg, o);
      return {
        destroy() {
          player.destroy();
          root.replaceChildren();
        },
        replay() {
          player.replay();
        },
      };
    },
  };
}
