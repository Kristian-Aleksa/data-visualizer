// SVG export: the frame at t = 1 (or the scrubber position), with literal colours, prefixed ids,
// optional transparent background and optional text-to-outline conversion.

import { APP_NAME } from '../config';
import type { ChartDef } from '../core/chart';
import { buildScene, timeAtProgress, type Scene, type SceneInput } from '../core/scene';
import { serialize } from '../core/serialize';
import type { AttrValue, VNode } from '../core/vnode';
import { faceOf, familyOf, opentypeFont, type FamilyName } from './fonts';

export interface SvgExportOptions {
  /** 'final' = t = 1; 'current' = the given progress */
  frame: 'final' | 'current';
  progress: number;
  background: 'fill' | 'transparent';
  text: 'editable' | 'outlined';
}

/** The scene to export at a given progress (rebuilt per frame for self-animated charts). */
export function sceneAt(def: ChartDef, input: SceneInput, progress: number | 'final'): { scene: Scene; tau: number } {
  const probe = buildScene(def, input);
  const tau = progress === 'final' ? Infinity : timeAtProgress(progress, probe.timeline);
  const scene = def.animation === 'self' && tau !== Infinity ? buildScene(def, input, tau) : probe;
  return { scene, tau };
}

function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).slice(0, 5);
}

const num = (v: AttrValue | undefined, d = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : d;
};

/** Replace every <text> with filled outline paths (halos become stroked outlines underneath). */
export async function outlineText(root: VNode): Promise<VNode> {
  const family: FamilyName = familyOf(root);
  const clone = async (n: VNode): Promise<VNode> => {
    if (n.tag !== 'text') {
      const children = await Promise.all(n.children.map(clone));
      return { ...n, attrs: { ...n.attrs }, children, _box: undefined, _len: undefined };
    }
    const a = n.attrs;
    const face = faceOf(a['font-weight'], a['font-style'] === 'italic');
    const font = await opentypeFont(family, face);
    // characters the font lacks are drawn in Inter, as the browser does with the font stack
    const backup = family !== 'Inter' ? await opentypeFont('Inter', face) : null;
    const size = num(a['font-size'], 16);
    const ls = num(a['letter-spacing']);
    const text = n.text ?? '';
    // Lay glyphs out one by one (opentype.js's full shaping trips over some of Inter's
    // contextual rules); pair kerning still applies. Letter-spacing follows every glyph,
    // as in SVG, so anchors match the browser.
    const glyphs = [...text].map((ch) => {
      const g = font.charToGlyph(ch);
      return backup && !g.index ? { g: backup.charToGlyph(ch), f: backup } : { g, f: font };
    });
    const offsets: number[] = [];
    let adv = 0;
    glyphs.forEach(({ g, f }, i) => {
      offsets.push(adv);
      const scale = size / f.unitsPerEm;
      let w = (g.advanceWidth ?? 0) * scale + ls;
      const next = glyphs[i + 1];
      if (next && next.f === f) {
        try {
          w += f.getKerningValue(g, next.g) * scale;
        } catch {
          /* no kerning for this pair */
        }
      }
      adv += w;
    });
    const x0 = num(a.x), anchor = a['text-anchor'];
    const x = anchor === 'middle' ? x0 - adv / 2 : anchor === 'end' ? x0 - adv : x0;
    const y = num(a.y);
    const d = glyphs.map(({ g }, i) => g.getPath(x + offsets[i], y, size).toPathData(2)).filter(Boolean).join(' ');
    const group: VNode = { tag: 'g', attrs: {}, children: [], anim: n.anim, tip: n.tip, key: n.key };
    if (a.opacity !== undefined) group.attrs.opacity = a.opacity;
    if (a.transform !== undefined) group.attrs.transform = a.transform;
    if (n.halo) group.children.push({ tag: 'path', attrs: { d, fill: 'none', stroke: n.halo.color, 'stroke-width': n.halo.width, 'stroke-linejoin': 'round' }, children: [] });
    group.children.push({ tag: 'path', attrs: { d, fill: String(a.fill ?? '#000') }, children: [] });
    return group;
  };
  return clone(root);
}

export async function exportSvg(def: ChartDef, input: SceneInput, o: SvgExportOptions): Promise<string> {
  const settings = { ...(input.settings ?? {}), background: o.background === 'transparent' ? 'transparent' : (input.settings?.background ?? 'fill') };
  const { scene, tau } = sceneAt(def, { ...input, settings }, o.frame === 'final' ? 'final' : o.progress);
  const root = o.text === 'outlined' ? await outlineText(scene.root) : scene.root;
  const markup = serialize(root, { tau, timing: scene.timing, idPrefix: `cs-${def.id.toLowerCase()}-${shortHash(JSON.stringify(settings))}-` });
  const credit = `<!-- ${def.id} ${def.name}, made with ${APP_NAME} -->`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n${credit}\n${markup}\n`;
}
