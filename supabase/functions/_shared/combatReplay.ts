/**
 * Deno-safe headless replay — imports shared combat-core/runBattle.
 * Polyfills localStorage before module graph loads (enemyMemoryStore).
 */

import type { SkillsSnapshot } from './combatProfile.ts'
import { runBattle } from './combatReplayBundle.js'

export type ReplayClaim = {
  result: 'win' | 'lose' | 'draw'
  turns: number
  playerHp: number
  enemyHp: number
}

export type ReplayInput = {
  npcId: string
  seed: number
  skills: SkillsSnapshot
  equippedMoves: readonly [string, string, string, string]
  archetype?: 'lck' | 'atk' | 'def' | 'spd'
  playerMoves: readonly string[]
  isolateNpcMemory?: boolean
  runItBack?: boolean
}

export type ReplayOutput = {
  result: 'win' | 'lose' | 'draw'
  turns: number
  playerHp: number
  enemyHp: number
  rngDraws: number
}

let storageReady = false

function ensureLocalStoragePolyfill(): void {
  if (storageReady) return
  storageReady = true
  const g = globalThis as typeof globalThis & { localStorage?: Storage }
  if (g.localStorage) return
  const store = new Map<string, string>()
  g.localStorage = {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

export async function replayCombatFight(input: ReplayInput): Promise<ReplayOutput> {
  ensureLocalStoragePolyfill()
  const result = runBattle({
    npcId: input.npcId,
    seed: input.seed,
    playerMoves: input.playerMoves,
    skills: input.skills,
    equippedMoves: input.equippedMoves,
    archetype: input.archetype,
    isolateNpcMemory: input.isolateNpcMemory ?? false,
    runItBack: input.runItBack ?? false,
  })
  return {
    result: result.result,
    turns: result.turns,
    playerHp: result.playerHp,
    enemyHp: result.enemyHp,
    rngDraws: result.rngDraws,
  }
}

export function replayMatchesClaim(replay: ReplayOutput, claim: ReplayClaim): boolean {
  return (
    replay.result === claim.result &&
    replay.turns === claim.turns &&
    replay.playerHp === claim.playerHp &&
    replay.enemyHp === claim.enemyHp
  )
}

export function normalizePlayerMoves(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const moves: string[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') return null
    moves.push(entry.toUpperCase())
  }
  return moves
}

export function parseReplayClaim(raw: unknown): ReplayClaim | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const result = o.result
  if (result !== 'win' && result !== 'lose' && result !== 'draw') return null
  const turns = Number(o.turns)
  const playerHp = Number(o.playerHp)
  const enemyHp = Number(o.enemyHp)
  if (!Number.isFinite(turns) || !Number.isFinite(playerHp) || !Number.isFinite(enemyHp)) {
    return null
  }
  return {
    result,
    turns: Math.floor(turns),
    playerHp: Math.floor(playerHp),
    enemyHp: Math.floor(enemyHp),
  }
}
