// Plays a chart's entrance animation in a live <svg>: play / pause / seek / replay / loop,
// with interactions attached. Used by the editor preview, the embed page and exported code.

import type { ChartDef } from '../core/chart';
import { applyFrame, mount, type Mounted } from '../core/mount';
import { buildScene, naturalTime, type Scene, type SceneInput } from '../core/scene';
import type { ChartData } from '../core/types';
import { attachInteractions, type Interactions } from './interact';

export interface PlayerOptions {
  /** tooltips, hover, zoom, drag and click-to-replay (as allowed by the chart's settings) */
  interactive?: boolean;
  /** true: play now; 'visible': play once the chart scrolls into view; false: show the end */
  autoplay?: boolean | 'visible';
  /** called after every rendered frame with the clock (s) and entrance length (s) */
  onFrame?: (clock: number, length: number, playing: boolean) => void;
  /** called when an interaction changes the data (e.g. dragged node positions) */
  onDataChange?: (data: ChartData) => void;
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Player {
  private def: ChartDef;
  private input: SceneInput;
  private opts: PlayerOptions;
  private svg: SVGSVGElement;
  private base!: Scene;
  private mounted: Mounted | null = null;
  private raf = 0;
  private startedAt = 0;
  private ints: Interactions | null = null;
  private chartCleanup: (() => void) | void = undefined;
  private io: IntersectionObserver | null = null;
  /** interactions are (re)attached after the next render, once the marks exist in the DOM */
  private needsAttach = false;
  clock = 0;
  playing = false;

  constructor(svg: SVGSVGElement, def: ChartDef, input: SceneInput, opts: PlayerOptions = {}) {
    this.svg = svg;
    this.def = def;
    this.input = input;
    this.opts = opts;
    this.rebuild();
    const enabled = this.base.timeline.enabled && !reducedMotion();
    if (opts.autoplay === 'visible' && enabled && typeof IntersectionObserver !== 'undefined') {
      this.seekClock(0);
      this.io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.io?.disconnect();
          this.io = null;
          this.play(true);
        }
      }, { threshold: 0.3 });
      this.io.observe(svg);
    } else if (opts.autoplay && enabled) this.play(true);
    else this.seekClock(this.base.timeline.length);
  }

  get scene(): Scene {
    return this.base;
  }

  /** Entrance length + hold: one full cycle. */
  get cycle(): number {
    const tl = this.base.timeline;
    return tl.length + tl.hold;
  }

  private rebuild() {
    this.detach();
    this.base = buildScene(this.def, this.input);
    this.mounted = this.def.animation === 'self' ? null : mount(this.svg, this.base.root, { interactive: !!this.opts.interactive });
    this.needsAttach = true;
  }

  private detach() {
    this.ints?.detach();
    this.ints = null;
    if (typeof this.chartCleanup === 'function') this.chartCleanup();
    this.chartCleanup = undefined;
  }

  private attach() {
    this.detach();
    if (!this.opts.interactive) return;
    const s = this.base.settings;
    const sup = this.def.supportsAll;
    const enabled = {
      tooltip: sup.tooltip && s.tooltip !== false,
      hover: sup.hover && s.hover !== false,
      zoom: sup.zoom && s.zoom !== false,
      drag: sup.drag && s.drag !== false,
    };
    this.ints = attachInteractions(this.svg, {
      ...enabled,
      clickReplay: s.clickReplay !== false,
      clickPin: sup.clickFilter && s.clickFilter !== false,
      theme: this.input.theme,
      dark: this.def.card.dark,
      onReplay: () => this.replay(),
    });
    if (this.def.interact && !this.base.fatal) {
      this.chartCleanup = this.def.interact({
        svg: this.svg,
        data: this.base.data,
        settings: s,
        theme: this.input.theme,
        enabled,
        commitData: this.opts.onDataChange,
        finish: () => {
          if (this.clock < this.base.timeline.length || this.playing) this.seekClock(this.base.timeline.length);
        },
      });
    }
  }

  /** New data / settings / theme. Keeps the current position. */
  update(input: SceneInput, opts?: Partial<PlayerOptions>) {
    this.input = input;
    if (opts) this.opts = { ...this.opts, ...opts };
    this.rebuild();
    this.render();
  }

  private render() {
    const tl = this.base.timeline;
    const tau = naturalTime(this.clock, tl);
    const interactive = !!this.opts.interactive;
    if (this.def.animation === 'self') {
      const scene = tau === Infinity ? this.base : buildScene(this.def, this.input, tau);
      const m = mount(this.svg, scene.root, { interactive });
      applyFrame(m, tau, scene.timing);
    } else if (this.mounted) {
      applyFrame(this.mounted, tau, this.base.timing);
    }
    if (this.needsAttach) {
      this.needsAttach = false;
      this.attach();
    }
    this.ints?.afterRender();
    this.opts.onFrame?.(this.clock, tl.length, this.playing);
  }

  private tick = (now: number) => {
    const tl = this.base.timeline;
    this.clock = (now - this.startedAt) / 1000;
    if (this.clock >= this.cycle) {
      if (tl.loop) {
        this.startedAt = now;
        this.clock = 0;
      } else {
        this.clock = tl.length;
        this.playing = false;
        this.render();
        return;
      }
    }
    this.render();
    this.raf = requestAnimationFrame(this.tick);
  };

  play(fromStart = false) {
    cancelAnimationFrame(this.raf);
    if (!this.base.timeline.enabled) {
      this.seekClock(0);
      return;
    }
    if (fromStart || this.clock >= this.base.timeline.length) this.clock = 0;
    this.playing = true;
    this.startedAt = performance.now() - this.clock * 1000;
    this.raf = requestAnimationFrame(this.tick);
  }

  pause() {
    cancelAnimationFrame(this.raf);
    this.playing = false;
    this.render();
  }

  replay() {
    this.play(true);
  }

  /** Jump to progress t (0..1) through the entrance. */
  seek(t: number) {
    this.seekClock(Math.min(1, Math.max(0, t)) * this.base.timeline.length);
  }

  private seekClock(c: number) {
    cancelAnimationFrame(this.raf);
    this.playing = false;
    this.clock = c;
    this.render();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.io?.disconnect();
    this.io = null;
    this.needsAttach = false;
    this.detach();
  }
}
