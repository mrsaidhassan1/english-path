// Small deterministic random helpers (same seed → same result).

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

export const rngFrom = (seed: number) => mulberry32(seed * 2654435761);

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = <T,>(arr: T[], rnd: () => number = Math.random): T => arr[Math.floor(rnd() * arr.length)];

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Stable shuffle of answer options (True/False and Yes/No stay in order). Returns display order as original indexes. */
export function optionOrder(options: string[], key: string): number[] {
  const idx = options.map((_, i) => i);
  const fixed = options.length === 2 && /^(true|yes)$/i.test(options[0]);
  return fixed ? idx : shuffle(idx, rngFrom(hashString(key)));
}
