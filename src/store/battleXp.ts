import type { BattleFeedbackEvent } from '../data/battleFeedback'
import { computeTimingBonusGrants } from '../data/timingBonusXp'
import { practiceCombatXpMultiplier } from '../data/practiceDailyReset'
import type { BattleState, LevelUpNotification, ResolveResult } from '../../combat-core/battleEngine'
import { applyCombatSkillXp } from './playerStore'
import { computePlayerLevel } from './skillStore'

/** Client-only XP applier — registered with combat-core via xpBridge. */
export function applyBattleSkillXpToState(
  state: BattleState,
  r: ResolveResult,
  log: string[],
): { state: BattleState; log: string[]; xpBonusEvents: BattleFeedbackEvent[] } {
  if (state.combatXpPolicy === 'none') {
    return { state, log, xpBonusEvents: [] }
  }

  let sessionEarned = state.practiceXpSessionEarned
  const practiceScale =
    state.combatXpPolicy === 'practice' && state.practiceXpBudget
      ? (raw: number) => {
          const mult = practiceCombatXpMultiplier(
            state.practiceXpBudget!,
            sessionEarned,
            raw,
          )
          const scaled = Math.max(0, Math.round(raw * mult))
          sessionEarned += scaled
          return scaled
        }
      : undefined

  const timingBonuses = computeTimingBonusGrants(r, state.npc.leanSkill, state.buildLoop)
  const xpResult = applyCombatSkillXp(r, timingBonuses, {
    enemyLevel: state.npc.level,
    playerLevel: computePlayerLevel(state.skillsSnapshot),
    playerHpAfterHit: state.playerHp,
    forceLevelXpMult: state.combatXpPolicy === 'fixed-level' ? 1 : undefined,
    practiceScale,
  })

  const xpBonusEvents = xpResult.bonusCallouts.filter((e) => e.kind !== 'xp-bonus')

  const hasLevelUp = xpResult.skillLevelUps.length > 0 || xpResult.playerLevelLine != null
  const pendingLevelUpNotification: LevelUpNotification | null = hasLevelUp
    ? {
        skillLevelUps: xpResult.skillLevelUps,
        newlyUnlockedMoves: xpResult.newlyUnlockedMoves,
        playerLevelBefore: xpResult.playerLevelBefore,
        playerLevelAfter: xpResult.playerLevel,
      }
    : null

  return {
    state: {
      ...state,
      pendingLevelUpNotification,
      practiceXpSessionEarned: sessionEarned,
    },
    log,
    xpBonusEvents,
  }
}
