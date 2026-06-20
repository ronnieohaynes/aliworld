import type { PlayerMoveId } from './moveIds'
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
  lastEnemyMove: PlayerMoveId | null
}

type MoveWeight = { move: PlayerMoveId; weight: number }

function aiTierForLevel(level: number): number {
  if (level < ENEMY_AI_TIER1_LEVEL) return 0
  if (level < ENEMY_AI_TIER2_LEVEL) return 1
  if (level < ENEMY_AI_TIER3_LEVEL) return 2
  return 3
}

const COUNTER_MAP: Record<string, PlayerMoveId[]> = {
  STRIKE: ['SLIP', 'ANCHOR'],
  FURY_SWEEP: ['ANCHOR', 'SLIP'],
  DARK_BREAK: ['STRIKE', 'CANNON'],
  CANNON: ['ANCHOR', 'SLIP'],
  BLACKOUT: ['STRIKE', 'CANNON'],
  SLIP: ['PARRY', 'WHISPER'],
  PARRY: ['PARRY', 'WHISPER'],
  ANCHOR: ['WHISPER', 'PARRY'],
  SECOND_WIND: ['CANNON', 'LOOP'],
  COUNTERWEIGHT: ['PARRY', 'WHISPER'],
  BRICK_WALL: ['PARRY', 'WHISPER'],
  INVINCIBLE: ['PARRY', 'WHISPER'],
  WHISPER: ['STRIKE', 'CANNON'],
  LOOP: ['ANCHOR', 'SLIP'],
  DEVILS_CUT: ['CANNON', 'LOOP'],
  SNAG: ['STRIKE', 'CANNON'],
  PHENOMENA: ['ANCHOR', 'STRIKE'],
  SEALED_FATE: ['CANNON', 'LOOP'],
  GRAVITY_SHIFT: ['STRIKE', 'CANNON'],
  REFRACT: ['ANCHOR', 'PARRY'],
  HYPERDRIVE: ['STRIKE', 'CANNON'],
}

function buildBaseWeights(moves: PlayerMoveId[]): MoveWeight[] {
  return moves.map((move) => ({ move, weight: 1 }))
}

function applyTier1Weights(weights: MoveWeight[], ctx: BattleContext): void {
  for (const w of weights) {
    if (ctx.playerIsExposed && (w.move === 'CANNON' || w.move === 'LOOP')) {
      w.weight *= 2.5
    }
    if (ctx.enemyHpPct < 0.3 && w.move === 'ANCHOR') {
      w.weight *= 2
    }
    if (ctx.turn === 1 && (w.move === 'STRIKE' || w.move === 'CANNON')) {
      w.weight *= 1.5
    }
  }
}

function applyTier2Weights(weights: MoveWeight[], ctx: BattleContext): void {
  applyTier1Weights(weights, ctx)

  for (const w of weights) {
    if (ctx.playerHpPct < 0.25 && (w.move === 'CANNON' || w.move === 'LOOP')) {
      w.weight *= 2
    }
    if (ctx.playerIsBracing && w.move === 'PARRY') {
      w.weight *= 3
    }
    if (ctx.playerIsBracing && (w.move === 'WHISPER')) {
      w.weight *= 2
    }
    if (ctx.playerIsBracing && (w.move === 'STRIKE' || w.move === 'CANNON')) {
      w.weight *= 0.3
    }
    if (ctx.enemyIsSlowed && w.move === 'ANCHOR') {
      w.weight *= 1.5
    }
    if (ctx.enemyIsShaken && w.move === 'ANCHOR') {
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
  availableMoves: PlayerMoveId[],
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
  availableMoves: PlayerMoveId[],
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

function selectWeighted(weights: MoveWeight[]): PlayerMoveId {
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
  moves: PlayerMoveId[],
  ctx: BattleContext,
  memory: NpcMemory,
): PlayerMoveId {
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
