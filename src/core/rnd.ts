// Deterministic "random" helpers.
//
// The charts generate demo data and visual jitter with a hash, not Math.random(), so charts look
// the same on every load. Two versions exist in the source and both are kept, because the
// generated data depends on which one a page used:
//  - rndAbs:    Basics, Editorial, Thread Triptych, the extras. Returns 0..1.
//  - rndSigned: Glance, dense Force Graph, dense Circular Graph. Returns -1..1 (no Math.abs).

export const rndAbs = (i: number, k: number): number => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

export const rndSigned = (i: number, k: number): number => (((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

/** Small seeded PRNG for layouts (e.g. d3-force), so physics settle the same way every time. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
