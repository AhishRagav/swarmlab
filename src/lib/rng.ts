export interface RNG {
  random(): number
}

/**
 * Creates a pseudo-random number generator.
 * If a seed is provided, a deterministic 32-bit PRNG (Mulberry32) is returned.
 * If seed is undefined, a wrapper around Math.random() is returned.
 */
export function createRNG(seed?: number): RNG {
  if (seed === undefined) {
    return {
      random: () => Math.random(),
    }
  }

  // Mulberry32 32-bit PRNG
  let s = Math.floor(seed) >>> 0
  return {
    random: () => {
      s = (s + 0x6d2b79f5) >>> 0
      let t = Math.imul(s ^ (s >>> 15), 1 | s)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}
