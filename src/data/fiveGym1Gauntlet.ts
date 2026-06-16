import type { EnemyMoveId } from './enemyMoves'
import type { LeanSkill } from './skillCounter'
import type { NpcTelegraphFlavor } from './npcRegistry'

/** Wins required to clear week-one head; losses never reset this count. */
export const FIVE_GYM1_WINS_TO_CLEAR = 3

/** Round-3 guard riposte, punishes blind aggression into HOLD. */
export type FiveGym1GuardCounter = {
  chance: number
  damageMult: number
}

export type FiveGym1RoundConfig = {
  level: number
  fixedHp: number
  moves: EnemyMoveId[]
  leanSkill: LeanSkill
  telegraphFlavor: NpcTelegraphFlavor
  guardCounter?: FiveGym1GuardCounter
  enemyGuardPierce?: number
}

/** Per-round tuning, one block for difficulty passes. Index = wins before fight (0–2). */
export const FIVE_GYM1_ROUNDS: readonly FiveGym1RoundConfig[] = [
  {
    level: 4,
    fixedHp: 60,
    moves: ['STRIKE', 'BAIT', 'HAYMAKER', 'LOOP'],
    leanSkill: 'defense',
    telegraphFlavor: {
      STRIKE: 'sets a jab',
      BAIT: 'opens up',
      HAYMAKER: 'winds up',
      LOOP: 'draws the loop',
    },
  },
  {
    level: 7,
    fixedHp: 90,
    moves: ['STRIKE', 'BAIT', 'BAIT', 'HAYMAKER', 'LOOP'],
    leanSkill: 'defense',
    telegraphFlavor: {
      STRIKE: 'feints, then jabs',
      BAIT: 'leaves a gap',
      HAYMAKER: 'commits heavy',
      LOOP: 'spins the loop',
    },
  },
  {
    level: 10,
    fixedHp: 120,
    moves: ['STRIKE', 'BAIT', 'BAIT', 'BAIT', 'HAYMAKER', 'LOOP', 'LOOP'],
    leanSkill: 'defense',
    guardCounter: { chance: 0.7, damageMult: 2.85 },
    enemyGuardPierce: 0.55,
    telegraphFlavor: {
      STRIKE: 'cuts through',
      BAIT: 'dares you to swing',
      HAYMAKER: 'loads up',
      LOOP: 'the loop is coming',
    },
  },
] as const

export const FIVE_GYM1_DIALOGUE_BY_WINS: readonly string[] = [
  'week one. i run this floor. you want the work?',
  "that's one. it gets worse.",
  "two. don't get cute.",
]

export const FIVE_GYM1_DIALOGUE_CLEARED = "week one's yours. don't get comfortable."

/** Round index for combat (0–2); cleared rematches stay on round 3. */
export function fiveGym1RoundIndexForWins(wins: number): number {
  return Math.min(Math.max(0, wins), FIVE_GYM1_ROUNDS.length - 1)
}

export function fiveGym1DialogueForWins(wins: number, cleared: boolean): string {
  if (cleared) return FIVE_GYM1_DIALOGUE_CLEARED
  const idx = Math.min(Math.max(0, wins), FIVE_GYM1_DIALOGUE_BY_WINS.length - 1)
  return FIVE_GYM1_DIALOGUE_BY_WINS[idx]!
}
