import type { EnemyMoveId } from './enemyMoves'
import type { NpcMemory } from '../store/enemyMemoryStore'
import { getPlayerMoveFrequencies } from '../store/enemyMemoryStore'
import { ENEMY_AI_TIER1_LEVEL, ENEMY_AI_TIER2_LEVEL, ENEMY_AI_TIER3_LEVEL } from './moveBalance'

/**
 * Enemy AI tiers — higher level = smarter move selection.
 *
 * Tier 0 (level 1–2): Pure random (legacy behavior).
 * Tier 1 (level 3–4): Weighted random — favors good moves situationally.
 * Tier 2 (level 5–7): Reactive — reads battle state (player HP, own HP, status).
 * Tier 3 (level 8+):  Adaptive — learns from past encounters + reactive.
 */

export type BattleContext = {
  turn: number
  playerHpPct: number
  enemyHpPct: number
  playerIsExposed: boolean
  playerIsBracing: boolean
  enemyIsSlowed: boolean
  enemyIsShaken: boolean
  enemyIsBleeding: boolean
  lastPlayerMove: string | null
  lastEnemyMove: EnemyMoveId | null
}

type MoveWeight = { move: EnemyMoveId; weight: number }

function aiTierForLevel(level: number): number {
  if (level < ENEMY_AI_TIER1_LEVEL) return 0
  if (level < ENEMY_AI_TIER2_LEVEL) return 1
  if (level < ENEMY_AI_TIER3_LEVEL) return 2
  return 3
}

const COUNTER_MAP: Record<string, EnemyMoveId[]> = {
  STRIKE: ['SLIP', 'HOLD'],
  FURY_SWEEP: ['HOLD', 'SLIP'],
  DARK_BREAK: ['STRIKE', 'HAYMAKER'],
  CANNON: ['HOLD', 'SLIP'],
  BLACKOUT: ['STRIKE', 'HAYMAKER'],
  SLIP: ['BAIT', 'WHISPER'],
  PARRY: ['BAIT', 'WHISPER'],
  HOLD: ['WHISPER', 'BAIT'],
  ANCHOR: ['WHISPER', 'BAIT'],
  SECOND_WIND: ['HAYMAKER', 'LOOP'],
  COUNTERWEIGHT: ['BAIT', 'WHISPER'],
  BRICK_WALL: ['BAIT', 'WHISPER'],
  INVINCIBLE: ['BAIT', 'WHISPER'],
  WHISPER: ['STRIKE', 'HAYMAKER'],
  LOOP: ['HOLD', 'SLIP'],
  DEVILS_CUT: ['HAYMAKER', 'LOOP'],
  SNAG: ['STRIKE', 'HAYMAKER'],
  PHENOMENA: ['HOLD', 'STRIKE'],
  SEALED_FATE: ['HAYMAKER', 'LOOP'],
  GRAVITY_SHIFT: ['STRIKE', 'HAYMAKER'],
  REFRACT: ['HOLD', 'BAIT'],
  HYPERDRIVE: ['STRIKE', 'HAYMAKER'],
}

function buildBaseWeights(moves: EnemyMoveId[]): MoveWeight[] {
  return moves.map((move) => ({ move, weight: 1 }))
}

function applyTier1Weights(weights: MoveWeight[], ctx: BattleContext): void {
  for (const w of weights) {
    if (ctx.playerIsExposed && (w.move === 'HAYMAKER' || w.move === 'LOOP')) {
      w.weight *= 2.5
    }
    if (ctx.enemyHpPct < 0.3 && w.move === 'HOLD') {
      w.weight *= 2
    }
    if (ctx.turn === 1 && (w.move === 'STRIKE' || w.move === 'HAYMAKER')) {
      w.weight *= 1.5
    }
  }
}

function applyTier2Weights(weights: MoveWeight[], ctx: BattleContext): void {
  applyTier1Weights(weights, ctx)

  for (const w of weights) {
    if (ctx.playerHpPct < 0.25 && (w.move === 'HAYMAKER' || w.move === 'LOOP')) {
      w.weight *= 2
    }
    if (ctx.playerIsBracing && w.move === 'BAIT') {
      w.weight *= 3
    }
    if (ctx.playerIsBracing && (w.move === 'WHISPER')) {
      w.weight *= 2
    }
    if (ctx.playerIsBracing && (w.move === 'STRIKE' || w.move === 'HAYMAKER')) {
      w.weight *= 0.3
    }
    if (ctx.enemyIsSlowed && w.move === 'HOLD') {
      w.weight *= 1.5
    }
    if (ctx.enemyIsShaken && w.move === 'HOLD') {
      w.weight *= 1.8
    }
    if (w.move === ctx.lastEnemyMove && ctx.turn > 2) {
      w.weight *= 0.6
    }
  }
}

function applyPatternLearning(
  weights: MoveWeight[],
  npcId: string,
  availableMoves: EnemyMoveId[],
  learnStrength: number,
): void {
  const freqs = getPlayerMoveFrequencies(npcId)
  if (Object.keys(freqs).length === 0) return

  const available = new Set(availableMoves)

  for (const [playerMove, freq] of Object.entries(freqs)) {
    if (freq < 0.15) continue
    const counters = COUNTER_MAP[playerMove]
    if (!counters) continue
    for (const counter of counters) {
      if (!available.has(counter)) continue
      const w = weights.find((x) => x.move === counter)
      if (w) {
        w.weight *= 1 + freq * learnStrength
      }
    }
  }
}

function applyLastMoveCounter(
  weights: MoveWeight[],
  ctx: BattleContext,
  availableMoves: EnemyMoveId[],
  strength: number,
): void {
  if (!ctx.lastPlayerMove) return
  const counters = COUNTER_MAP[ctx.lastPlayerMove]
  if (!counters) return
  const available = new Set(availableMoves)
  for (const counter of counters) {
    if (!available.has(counter)) continue
    const w = weights.find((x) => x.move === counter)
    if (w) w.weight *= 1 + strength
  }
}

function selectWeighted(weights: MoveWeight[]): EnemyMoveId {
  const total = weights.reduce((s, w) => s + w.weight, 0)
  let roll = Math.random() * total
  for (const w of weights) {
    roll -= w.weight
    if (roll <= 0) return w.move
  }
  return weights[weights.length - 1]!.move
}

export function chooseMoveAI(
  npcId: string,
  level: number,
  moves: EnemyMoveId[],
  ctx: BattleContext,
  memory: NpcMemory,
): EnemyMoveId {
  if (moves.length === 0) return 'STRIKE'
  if (moves.length === 1) return moves[0]!

  const tier = aiTierForLevel(level)

  if (tier === 0) {
    return moves[Math.floor(Math.random() * moves.length)]!
  }

  const dedupedMoves = [...new Set(moves)]
  const weights = buildBaseWeights(dedupedMoves)

  // Preserve intentional duplicates as extra base weight
  for (const w of weights) {
    const count = moves.filter((m) => m === w.move).length
    if (count > 1) w.weight = count
  }

  if (tier >= 1) applyTier1Weights(weights, ctx)
  if (tier >= 2) {
    applyTier2Weights(weights, ctx)
    applyLastMoveCounter(weights, ctx, dedupedMoves, 0.8)
  }
  if (tier >= 3) {
    const learnStrength = Math.min(3, 0.5 + memory.totalFights * 0.25)
    applyPatternLearning(weights, npcId, dedupedMoves, learnStrength)
    applyLastMoveCounter(weights, ctx, dedupedMoves, 1.5)
  }

  return selectWeighted(weights)
}
