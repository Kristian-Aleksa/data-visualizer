// Labels outside a pie or donut. Each label hangs off its slice on a two-part line: out from
// the rim, then across to a column of labels on that side. Labels on one side that would
// overlap are spread apart (and kept inside the view); a label that is too wide is shortened
// with an ellipsis, and if two still collide the smaller slice's label is hidden.

type Pt = [number, number];

export interface PieLabelIn {
  text: string;
  /** text width at the label size */
  width: number;
  startAngle: number;
  endAngle: number;
  /** bigger slices keep their labels when two collide */
  priority: number;
}

export interface PieLabelOut {
  text: string;
  x: number;
  y: number;
  align: 'left' | 'right';
  points: Pt[];
  hidden: boolean;
}

export interface PieLabelOptions {
  cx: number;
  cy: number;
  r: number;
  /** length of the line out from the rim, the length of the part across, and the gap before the text */
  len: number;
  len2: number;
  gap: number;
  /** vertical room one label needs */
  lineHeight: number;
  view: { x: number; y: number; w: number; h: number };
  measure: (text: string) => number;
}

interface Slot {
  i: number;
  dir: 1 | -1;
  /** where the line leaves the rim */
  rim: Pt;
  /** the height the label would like */
  want: number;
  y: number;
}

/** Spread one side's labels so they are at least `gap` apart and inside [top, bottom]. */
function spread(list: Slot[], gap: number, top: number, bottom: number) {
  list.sort((a, b) => a.want - b.want);
  let prev = -Infinity;
  for (const s of list) {
    s.y = Math.max(s.want, prev + gap);
    prev = s.y;
  }
  // too low: slide up from the bottom
  let next = Infinity;
  for (let k = list.length - 1; k >= 0; k--) {
    list[k].y = Math.min(list[k].y, bottom, next - gap);
    next = list[k].y;
  }
  // now too high: settle down from the top (anything left over is hidden later)
  prev = -Infinity;
  for (const s of list) {
    s.y = Math.max(s.y, top, prev + gap);
    prev = s.y;
  }
}

export function layoutPieLabels(items: PieLabelIn[], o: PieLabelOptions): PieLabelOut[] {
  const { cx, cy, r, len, len2, gap, lineHeight: lh, view } = o;
  const reach = r + len;
  const slots: Slot[] = items.map((it, i) => {
    const mid = (it.startAngle + it.endAngle) / 2;
    const nx = Math.cos(mid), ny = Math.sin(mid);
    return { i, dir: nx < 0 ? -1 : 1, rim: [cx + r * nx, cy + r * ny], want: cy + reach * ny, y: 0 };
  });
  const top = view.y + lh / 2, bottom = view.y + view.h - lh / 2;
  spread(slots.filter((s) => s.dir > 0), lh, top, bottom);
  spread(slots.filter((s) => s.dir < 0), lh, top, bottom);

  const out: PieLabelOut[] = slots.map((s) => {
    const it = items[s.i];
    const dy = s.y - cy;
    // the bend sits on a circle just outside the rim, at the label's height
    let bx = Math.abs(dy) < reach ? cx + s.dir * Math.sqrt(reach * reach - dy * dy) : s.rim[0];
    bx = s.dir > 0 ? Math.max(bx, s.rim[0]) : Math.min(bx, s.rim[0]);
    const column = cx + s.dir * (reach + len2);
    const end = s.dir > 0 ? Math.max(column, bx) : Math.min(column, bx);
    const x = end + s.dir * gap;
    const room = s.dir > 0 ? view.x + view.w - x : x - view.x;
    let text = it.text;
    if (it.width > room) {
      while (text.length > 0 && o.measure(text + '…') > room) text = text.slice(0, -1);
      text = text.trimEnd() ? text.trimEnd() + '…' : '';
    }
    return {
      text,
      x,
      y: s.y,
      align: s.dir > 0 ? 'left' : 'right',
      points: [s.rim, [bx, s.y], [end, s.y]],
      hidden: !text || s.y < view.y || s.y > view.y + view.h,
    };
  });

  // two labels still touching: the bigger slice keeps its label
  const shown: { x: number; y: number; w: number }[] = [];
  const order = items.map((_, i) => i).sort((a, b) => items[b].priority - items[a].priority);
  for (const i of order) {
    const l = out[i];
    if (l.hidden) continue;
    const w = Math.min(items[i].width, o.measure(l.text));
    const x = l.align === 'left' ? l.x : l.x - w;
    const hit = shown.some((s) => Math.min(s.x + s.w, x + w) - Math.max(s.x, x) > 0.05 && Math.abs(s.y - l.y) < lh - 0.05);
    if (hit) l.hidden = true;
    else shown.push({ x, y: l.y, w });
  }
  return out;
}
