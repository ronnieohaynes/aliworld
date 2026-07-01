import { MOVES } from '../data/moveDefinitions'
import type { PlayerMoveId } from '../data/moveIds'
import { isMoveUnlocked } from '../data/moves'
import { grantPlayerSkillXp, getPlayerSkills } from '../store/playerStore'
import { cumulativeXpForLevel } from '../store/skillStore'

/** Episode 3 mass-conversion reward — luck ladder rung 3. */
export const E3_STORY_MOVE_ID: PlayerMoveId = 'LOOP'

export function grantE3EpisodeMoveUnlock(): string[] {
  const skills = getPlayerSkills()
  if (isMoveUnlocked(E3_STORY_MOVE_ID, skills)) return []
  const def = MOVES[E3_STORY_MOVE_ID]
  if (!def) return []
  const skillState = skills[def.skill]
  const targetLevel = def.unlockAtSkillLevel
  if (skillState.level >= targetLevel) return []
  const targetXp = cumulativeXpForLevel(targetLevel)
  const currentTotal = cumulativeXpForLevel(skillState.level) + Math.max(0, skillState.xp)
  const grant = Math.max(1, targetXp - currentTotal)
  return grantPlayerSkillXp(def.skill, grant)
}
