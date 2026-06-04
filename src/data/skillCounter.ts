import { deriveBuildLoopType, type BuildLoopSkill } from './buildName'
import {
  COUNTER_ADVANTAGE_DMG_MULT,
  COUNTER_ADVANTAGE_INCOMING_MULT,
  COUNTER_DISADVANTAGE_DMG_MULT,
  COUNTER_DISADVANTAGE_INCOMING_MULT,
} from './moveBalance'
import { getPlayerSkills } from '../store/playerStore'

export type LeanSkill = BuildLoopSkill | 'none'

export type CounterRelation = 'advantage' | 'disadvantage' | 'neutral'

/** attack > speed > luck > defense > attack */
const BEATS: Record<BuildLoopSkill, BuildLoopSkill> = {
  attack: 'speed',
  speed: 'luck',
  luck: 'defense',
  defense: 'attack',
}

export function getSkillCounterRelation(
  playerType: BuildLoopSkill | null,
  enemyLean: LeanSkill,
): CounterRelation {
  if (!playerType || enemyLean === 'none') return 'neutral'
  if (playerType === enemyLean) return 'neutral'
  if (BEATS[playerType] === enemyLean) return 'advantage'
  if (BEATS[enemyLean] === playerType) return 'disadvantage'
  return 'neutral'
}

export function getPlayerCounterRelation(enemyLean: LeanSkill): CounterRelation {
  return getSkillCounterRelation(deriveBuildLoopType(getPlayerSkills()), enemyLean)
}

export function applySkillCounterModifiers(
  out: { playerDmg: number; incoming: number },
  relation: CounterRelation,
): void {
  if (relation === 'neutral') return
  if (relation === 'advantage') {
    if (out.playerDmg > 0) {
      out.playerDmg = Math.max(1, Math.floor(out.playerDmg * COUNTER_ADVANTAGE_DMG_MULT))
    }
    if (out.incoming > 0) {
      out.incoming = Math.max(1, Math.floor(out.incoming * COUNTER_ADVANTAGE_INCOMING_MULT))
    }
    return
  }
  if (out.playerDmg > 0) {
    out.playerDmg = Math.max(1, Math.floor(out.playerDmg * COUNTER_DISADVANTAGE_DMG_MULT))
  }
  if (out.incoming > 0) {
    out.incoming = Math.max(1, Math.floor(out.incoming * COUNTER_DISADVANTAGE_INCOMING_MULT))
  }
}

export function counterMatchupLabel(
  relation: CounterRelation,
  enemyLean: LeanSkill = 'none',
): string | null {
  if (relation === 'advantage') return 'type advantage'
  if (relation === 'disadvantage') return 'outmatched'
  if (enemyLean !== 'none') return `${enemyLean} lean`
  return null
}
