import type { BattleFeedbackEvent, BattleFeedbackTone } from './battleFeedback'
import { deriveBuildLoopType } from './buildName'
import type { UpcomingMove } from './enemyMoves'
import { getEnemyMoveDef, type EnemyMoveId } from './enemyMoves'
import {
  ADVANTAGE_XP_BONUS,
  COUNTER_XP_BONUS,
  PERFECT_GUARD_XP_BONUS,
  TELEGRAPH_READ_XP_BONUS,
} from './moveBalance'
import { getSkillCounterRelation, type LeanSkill } from './skillCounter'
import type { ResolveResult } from '../store/battleStore'
import { getPlayerSkills } from '../store/playerStore'
import type { SkillId } from '../store/skillStore'

export type TimingBonusGrant = {
  skill: SkillId
  amount: number
  callout: BattleFeedbackEvent
}

const COMBAT_SKILL_TONE: Record<'attack' | 'speed' | 'defense' | 'luck', BattleFeedbackTone> = {
  attack: 'attack',
  speed: 'speed',
  defense: 'defense',
  luck: 'luck',
}

function bonusCallout(
  skill: 'attack' | 'speed' | 'defense' | 'luck',
  text: string,
): BattleFeedbackEvent {
  return {
    kind: 'xp-bonus',
    text,
    target: 'player',
    tone: COMBAT_SKILL_TONE[skill],
  }
}

function isHeavyTelegraphedMove(move: UpcomingMove): boolean {
  if (move === 'STUNNED') return false
  return getEnemyMoveDef(move as EnemyMoveId).damageMult >= 1.6
}

/** Extra skill XP when the player reads the fight — stacked only when distinct moments fire. */
export function computeTimingBonusGrants(
  r: ResolveResult,
  enemyLean: LeanSkill,
): TimingBonusGrant[] {
  if (!r.playerActed) return []

  const grants: TimingBonusGrant[] = []

  if (r.dodged && r.playerDmg > 0) {
    grants.push({
      skill: 'speed',
      amount: COUNTER_XP_BONUS,
      callout: bonusCallout('speed', '+xp clean counter!'),
    })
  }

  if (r.perfectGuardBonus) {
    grants.push({
      skill: 'defense',
      amount: PERFECT_GUARD_XP_BONUS,
      callout: bonusCallout('defense', '+xp perfect guard!'),
    })
  }

  const buildSkill = deriveBuildLoopType(getPlayerSkills())
  const relation = getSkillCounterRelation(buildSkill, enemyLean)
  if (relation === 'advantage' && r.playerDmg > 0 && buildSkill) {
    grants.push({
      skill: buildSkill,
      amount: ADVANTAGE_XP_BONUS,
      callout: bonusCallout(buildSkill, '+xp advantage!'),
    })
  }

  if (
    r.enemyAttacks &&
    isHeavyTelegraphedMove(r.eMove) &&
    (r.dodged || r.braced || r.damageBlocked > 0)
  ) {
    const skill: 'speed' | 'defense' = r.dodged ? 'speed' : 'defense'
    grants.push({
      skill,
      amount: TELEGRAPH_READ_XP_BONUS,
      callout: bonusCallout(skill, '+xp read the telegraph!'),
    })
  }

  return grants
}
