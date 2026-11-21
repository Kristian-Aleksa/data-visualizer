// Nodes of different sizes placed round a circle: each node gets the arc its dot needs and the
// rest of the circle is shared out equally, so big dots never crowd their neighbours. The first
// node sits just after three o'clock and the order runs clockwise.

export function ringPositions(sizes: number[], R: number, cx: number, cy: number): [number, number][] {
  const n = sizes.length;
  if (!n) return [];
  // the angle a dot of diameter d covers on the circle (a dot wider than the circle takes half of it)
  const arcs = sizes.map((d) => (R > 0 && d < 2 * R ? 2 * Math.asin(d / 2 / R) : Math.PI));
  const spare = (2 * Math.PI - arcs.reduce((a, b) => a + b, 0)) / n;
  let start = 0;
  return arcs.map((w) => {
    const mid = start + (w + spare) / 2;
    start += w + spare;
    return [cx + R * Math.cos(mid), cy + R * Math.sin(mid)];
  });
}
