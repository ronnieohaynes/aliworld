/**
 * Seeded combat RNG — single stream for all fight rolls (jitter, crit, dodge, AI, etc.).
 * Shared by client (Vite) and edge (Deno). Same seed + same inputs → identical outcomes.
 */

export type CombatRng = {
  next: () => number
  nextInt: (min: number, max: number) => number
  jitter: (damage: number) => number
  readonly seed: number
  readonly draws: () => number
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeededRng(seed: number): CombatRng {
  const normalized = seed >>> 0
  const nextUnit = mulberry32(normalized)
  let drawCount = 0

  const api: CombatRng = {
    seed: normalized,
    draws: () => drawCount,
    next: () => {
      drawCount += 1
      return nextUnit()
    },
    nextInt: (min: number, max: number) => {
      const lo = Math.ceil(min)
      const hi = Math.floor(max)
      if (hi < lo) return lo
      return lo + Math.floor(api.next() * (hi - lo + 1))
    },
    jitter: (damage: number) => {
      const d = Math.floor(damage)
      if (d <= 0) return 0
      return Math.max(0, d + Math.floor((api.next() - 0.5) * 3))
    },
  }
  return api
}

export function createMathRandomRng(): CombatRng {
  let drawCount = 0
  const api: CombatRng = {
    seed: 0,
    draws: () => drawCount,
    next: () => {
      drawCount += 1
      return Math.random()
    },
    nextInt: (min: number, max: number) => {
      const lo = Math.ceil(min)
      const hi = Math.floor(max)
      if (hi < lo) return lo
      return lo + Math.floor(api.next() * (hi - lo + 1))
    },
    jitter: (damage: number) => {
      const d = Math.floor(damage)
      if (d <= 0) return 0
      return Math.max(0, d + Math.floor((api.next() - 0.5) * 3))
    },
  }
  return api
}

let activeRng: CombatRng = createMathRandomRng()

export function getCombatRng(): CombatRng {
  return activeRng
}

export function setCombatRng(rng: CombatRng): void {
  activeRng = rng
}

export function withCombatRng<T>(rng: CombatRng, fn: () => T): T {
  const prev = activeRng
  activeRng = rng
  try {
    return fn()
  } finally {
    activeRng = prev
  }
}

export function randomCombatSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}
