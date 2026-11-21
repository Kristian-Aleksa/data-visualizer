// The artboard preview: live chart (Player), zoom-to-fit, replay, play/pause, a scrubber for t,
// and the interactive-preview toggle.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ChartDef } from '../core/chart';
import type { ChartData, Issue } from '../core/types';
import type { SceneInput } from '../core/scene';
import { Player } from '../runtime/player';
import { IconFit, IconHand, IconMinus, IconPause, IconPlay, IconPlus, IconReplay } from './icons';

export interface PreviewHandle {
  replay(): void;
  togglePlay(): void;
  fit(): void;
  zoom(delta: number): void;
  toggleInteractive(): void;
  /** current progress 0..1 through the entrance */
  progress(): number;
}

interface Props {
  def: ChartDef;
  input: SceneInput;
  width: number;
  height: number;
  issues: Issue[];
  fatal: boolean;
  /** an interaction changed the data (e.g. dragged node positions) */
  onDataChange?: (data: ChartData) => void;
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const Preview = forwardRef<PreviewHandle, Props>(function Preview({ def, input, width, height, issues, fatal, onDataChange }, ref) {
  const dataCb = useRef(onDataChange);
  dataCb.current = onDataChange;
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const [clock, setClock] = useState({ t: 0, len: 1, playing: false });
  const [interactive, setInteractive] = useState(true);
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit');
  const [fitScale, setFitScale] = useState(1);
  const frameReq = useRef(0);
  const latest = useRef({ t: 0, len: 1, playing: false });

  const onFrame = useCallback((t: number, len: number, playing: boolean) => {
    latest.current = { t, len, playing };
    if (!frameReq.current) {
      frameReq.current = requestAnimationFrame(() => {
        frameReq.current = 0;
        setClock(latest.current);
      });
    }
  }, []);

  // one player per chart
  useEffect(() => {
    if (!svgRef.current) return;
    const p = new Player(svgRef.current, def, input, { interactive, autoplay: !reducedMotion(), onFrame, onDataChange: (d) => dataCb.current?.(d) });
    player.current = p;
    return () => {
      p.destroy();
      player.current = null;
      cancelAnimationFrame(frameReq.current);
      frameReq.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def]);

  // new data / settings / palette: redraw at the current position
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    player.current?.update(input, { interactive });
  }, [input, interactive]);

  // zoom to fit
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const s = Math.min((el.clientWidth - 48) / width, (el.clientHeight - 48) / height);
      setFitScale(Math.max(0.05, Math.min(4, s)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);
  const scale = zoomMode === 'fit' ? fitScale : zoomMode;

  useImperativeHandle(ref, () => ({
    replay: () => player.current?.replay(),
    togglePlay: () => {
      const p = player.current;
      if (!p) return;
      if (p.playing) p.pause();
      else p.play();
    },
    fit: () => setZoomMode('fit'),
    zoom: (d) => setZoomMode((z) => Math.max(0.1, Math.min(4, +((z === 'fit' ? fitScale : z) * (d > 0 ? 1.25 : 0.8)).toFixed(3)))),
    toggleInteractive: () => setInteractive((v) => !v),
    progress: () => {
      const { t, len } = latest.current;
      return len > 0 ? Math.min(1, t / len) : 1;
    },
  }), [fitScale]);

  const progress = clock.len > 0 ? Math.min(1, clock.t / clock.len) : 1;
  const shown = issues.filter((i) => !/up to \d+ rows/.test(i.message) || fatal);

  return (
    <div className="stage">
      <div ref={viewRef} className={`stage-view${zoomMode !== 'fit' && scale > fitScale ? ' zoomed' : ''}`} style={{ display: 'grid', placeItems: 'center', overflow: zoomMode === 'fit' ? 'hidden' : 'auto' }}>
        <div className="artboard" style={{ position: 'relative', left: 'auto', top: 'auto', width: Math.round(width * scale), height: Math.round(height * scale), margin: 24, overflow: 'hidden' }}>
          <svg ref={svgRef} role="img" aria-label={String(input.settings?.title ?? def.text.title)} style={{ width: '100%', height: '100%' }} />
        </div>
        {shown.length > 0 && (
          <div className="stage-issues">
            <div className={`notice ${fatal ? 'err' : 'warn'}`} role="status">
              {shown[0].message}
              {shown.length > 1 ? ` (+${shown.length - 1} more in the Data section)` : ''}
            </div>
          </div>
        )}
      </div>
      <div className="stage-bar">
        <button className="icon-btn" onClick={() => player.current?.replay()} title="Replay (R)" aria-label="Replay animation">
          <IconReplay />
        </button>
        <button
          className="icon-btn"
          onClick={() => {
            const p = player.current;
            if (p?.playing) p.pause();
            else p?.play();
          }}
          title="Play / pause (Space)"
          aria-label={clock.playing ? 'Pause' : 'Play'}
        >
          {clock.playing ? <IconPause /> : <IconPlay />}
        </button>
        <input
          className="scrub"
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          aria-label="Animation position"
          onChange={(e) => player.current?.seek(Number(e.target.value) / 1000)}
          style={{ accentColor: 'var(--ink)' }}
        />
        <span className="time">
          {Math.min(clock.t, clock.len).toFixed(2)} / {clock.len.toFixed(2)} s
        </span>
        <span className="sep" style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <button className="icon-btn" aria-pressed={interactive} onClick={() => setInteractive((v) => !v)} title="Interactive preview: tooltips and hover (I)" aria-label="Interactive preview" style={interactive ? { background: 'var(--sel)', color: 'var(--ink)' } : undefined}>
          <IconHand />
        </button>
        <button className="icon-btn" onClick={() => setZoomMode('fit')} title="Fit to screen (F)" aria-label="Fit to screen">
          <IconFit />
        </button>
        <button className="icon-btn" onClick={() => setZoomMode((z) => Math.max(0.1, +((z === 'fit' ? fitScale : z) * 0.8).toFixed(3)))} title="Zoom out (−)" aria-label="Zoom out">
          <IconMinus />
        </button>
        <span className="time" style={{ minWidth: 44 }}>{Math.round(scale * 100)}%</span>
        <button className="icon-btn" onClick={() => setZoomMode((z) => Math.min(4, +((z === 'fit' ? fitScale : z) * 1.25).toFixed(3)))} title="Zoom in (+)" aria-label="Zoom in">
          <IconPlus />
        </button>
      </div>
    </div>
  );
});
