// Video export: every frame is the same pure render as the preview, at t = frame / fps,
// rasterised (with fonts embedded) into a canvas and encoded in the browser with Mediabunny.

import type { VideoCodec } from 'mediabunny';
import type { ChartDef } from '../core/chart';
import { buildScene, naturalTime, type SceneInput } from '../core/scene';
import { serialize } from '../core/serialize';
import { familyOf, fontFaceCss, usedFaces } from './fonts';

export type VideoFormat = 'mp4' | 'webm' | 'webm-alpha';

export interface VideoOptions {
  scale: 1 | 2;
  fps: 30 | 60;
  /** entrance length in seconds (0 = the chart's own) */
  duration: number;
  hold: number;
  loops: number;
  background: string;
  format: VideoFormat;
}

export interface VideoSupport {
  mp4: boolean;
  webm: boolean;
  alpha: boolean;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Mediabunny is only downloaded when a video feature is first used. */
const mediabunny = () => import('mediabunny');

export async function videoSupport(width: number, height: number): Promise<VideoSupport> {
  if (typeof VideoEncoder === 'undefined') return { mp4: false, webm: false, alpha: false };
  const { canEncodeVideo, QUALITY_HIGH } = await mediabunny();
  const size = { width: even(width), height: even(height), bitrate: QUALITY_HIGH };
  const [mp4, webm, alpha] = await Promise.all([
    canEncodeVideo('avc', size).catch(() => false),
    canEncodeVideo('vp9', size).catch(() => false),
    canEncodeVideo('vp9', { ...size, alpha: 'keep' }).catch(() => false),
  ]);
  return { mp4, webm, alpha };
}

export interface VideoResult {
  blob: Blob;
  ext: 'mp4' | 'webm';
  width: number;
  height: number;
  frames: number;
  seconds: number;
}

async function rasterise(svg: string, ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, w: number, h: number) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    img.src = url;
    await img.decode();
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportVideo(
  def: ChartDef,
  input: SceneInput,
  o: VideoOptions,
  onProgress: (p: number) => void,
  signal?: AbortSignal,
): Promise<VideoResult> {
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat } = await mediabunny();
  const alpha = o.format === 'webm-alpha';
  const settings = {
    ...(input.settings ?? {}),
    background: alpha ? 'transparent' : 'fill',
    bgColor: alpha ? '' : o.background,
    cornerRadius: 0, // a video frame is rectangular: rounded corners would turn black
    animHold: o.hold,
    ...(o.duration > 0 ? { animDuration: o.duration } : {}),
  };
  const inp: SceneInput = { ...input, settings };
  const base = buildScene(def, inp);
  const tl = base.timeline;
  const W = even(base.width * o.scale), H = even(base.height * o.scale);
  const cycle = (tl.enabled ? tl.length : 0) + o.hold;
  const seconds = Math.max(1 / o.fps, cycle * Math.max(1, o.loops));
  const frames = Math.max(1, Math.round(seconds * o.fps));

  const codec: VideoCodec = o.format === 'mp4' ? 'avc' : 'vp9';
  const output = new Output({ format: o.format === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(), target: new BufferTarget() });
  const canvas: OffscreenCanvas | HTMLCanvasElement = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('This browser can’t draw video frames (no 2D canvas).');
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH, ...(alpha ? { alpha: 'keep' as const } : {}) });
  output.addVideoTrack(source, { frameRate: o.fps });
  await output.start();

  const css = await fontFaceCss(familyOf(base.root), usedFaces(base.root));
  const head = `<defs><style>${css}</style></defs>`;
  const sized = (markup: string) => markup.replace(/^<svg([^>]*?) width="[^"]*" height="[^"]*"/, `<svg$1 width="${W}" height="${H}"`);

  let lastTau = NaN;
  try {
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
      const clock = (i / o.fps) % cycle;
      const tau = naturalTime(clock, tl);
      if (tau !== lastTau) {
        const scene = def.animation === 'self' && tau !== Infinity ? buildScene(def, inp, tau) : base;
        await rasterise(sized(serialize(scene.root, { tau, timing: scene.timing, head })), ctx, W, H);
        lastTau = tau;
      }
      await source.add(i / o.fps, 1 / o.fps);
      onProgress((i + 1) / frames);
    }
    await output.finalize();
  } catch (err) {
    if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel().catch(() => undefined);
    throw err;
  }
  const buf = output.target.buffer;
  if (!buf) throw new Error('The video encoder returned no data.');
  const ext = o.format === 'mp4' ? 'mp4' : 'webm';
  return { blob: new Blob([buf], { type: ext === 'mp4' ? 'video/mp4' : 'video/webm' }), ext, width: W, height: H, frames, seconds };
}

/** Read a finished file back to check what was actually written. */
export async function probeVideo(blob: Blob): Promise<{ duration: number; width: number; height: number; fps: number; codec: string | null }> {
  const { Input, BlobSource, ALL_FORMATS } = await mediabunny();
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  try {
    const duration = await input.computeDuration();
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('No video track found.');
    const stats = await track.computePacketStats();
    return { duration, width: track.displayWidth, height: track.displayHeight, fps: stats.averagePacketRate, codec: track.codec };
  } finally {
    input.dispose();
  }
}
