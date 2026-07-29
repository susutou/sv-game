/** Seeded PRNG (mulberry32) */

export function createRng(seed: number): { next: () => number; state: () => number; set: (s: number) => void } {
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state: () => s,
    set: (v: number) => {
      s = v >>> 0;
    },
  };
}

export function pickWeighted<T>(
  rng: { next: () => number },
  items: { item: T; weight: number }[],
): T | null {
  const total = items.reduce((a, b) => a + Math.max(0, b.weight), 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const { item, weight } of items) {
    r -= Math.max(0, weight);
    if (r <= 0) return item;
  }
  return items[items.length - 1]?.item ?? null;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

export function formatPct(n: number): string {
  return `${Math.round(n)}%`;
}
