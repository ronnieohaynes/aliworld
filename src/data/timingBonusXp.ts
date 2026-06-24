import type { BattleFeedbackEvent, BattleFeedbackTone } from './battleFeedback'
import type { BuildLoopSkill } from './buildName'
import type { UpcomingMove } from './enemyMoves'
import type { PlayerMoveId } from './moveIds'
import { MOVES } from './moveDefinitions'
import {
  ADVANTAGE_XP_BONUS,
  COUNTER_XP_BONUS,
  PERFECT_GUARD_XP_BONUS,
  TELEGRAPH_READ_XP_BONUS,
} from './moveBalance'
import { getSkillCounterRelation, type LeanSkill } from './skillCounter'
import type { ResolveResult } from '../store/battleStore'
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
  const def = MOVES[move as PlayerMoveId]
  if (!def) return false
  const b = def.behavior
  if (b.kind === 'cannon' || b.kind === 'blackout' || b.kind === 'sealed-fate') return true
  if ('profile' in b && b.profile && 'damageMult' in b.profile) {
    return b.profile.damageMult >= 1.6
  }
  return false
}

/** Extra skill XP when the player reads the fight, stacked only when distinct moments fire. */
export function computeTimingBonusGrants(
  r: ResolveResult,
  enemyLean: LeanSkill,
  buildLoop: BuildLoopSkill | null = null,
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

  const relation = getSkillCounterRelation(buildLoop, enemyLean)
  if (relation === 'advantage' && r.playerDmg > 0 && buildLoop) {
    grants.push({
      skill: buildLoop,
      amount: ADVANTAGE_XP_BONUS,
      callout: bonusCallout(buildLoop, '+xp advantage!'),
    })
  }

  if (
    isHeavyTelegraphedMove(r.eMove) &&
    r.rawIncoming > 0 &&
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
