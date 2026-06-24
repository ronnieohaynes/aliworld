export * from '../../combat-core/battleEngine'

import {
  battleReducer as coreBattleReducer,
  createInitialBattleState as coreCreateInitialBattleState,
  DEFAULT_ARCHETYPE,
  type BattleAction,
  type BattleState,
} from '../../combat-core/battleEngine'
import { registerSkillXpApplier } from '../../combat-core/xpBridge'
import { getEquippedMoves, getPlayerSkills, getPlayerStoreState } from './playerStore'
import { applyBattleSkillXpToState } from './battleXp'

registerSkillXpApplier(applyBattleSkillXpToState)

export { getOverworldPlayerHp, setOverworldPlayerHp } from './playerStore'

type CoreInitOptions = NonNullable<Parameters<typeof coreCreateInitialBattleState>[1]>

export function createInitialBattleState(
  npcId: string,
  options?: CoreInitOptions,
): BattleState {
  const player = getPlayerStoreState()
  return coreCreateInitialBattleState(npcId, {
    ...options,
    archetype: options?.archetype ?? player.archetype ?? DEFAULT_ARCHETYPE,
    accessories: options?.accessories ?? player.accessories ?? [],
    skills: options?.skills ?? getPlayerSkills(),
    equippedMoves: options?.equippedMoves ?? getEquippedMoves(),
  })
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  if (action.type === 'INIT') {
    return createInitialBattleState(action.npcId, {
      archetype: action.archetype,
      accessories: action.accessories,
      carryHp: action.carryHp,
      runItBack: action.runItBack,
      combatXpPolicy: action.combatXpPolicy,
      battleEndHealing: action.battleEndHealing,
      practiceXpBudget: action.practiceXpBudget,
      combatSeed: action.combatSeed,
      isolateNpcMemory: action.isolateNpcMemory,
    })
  }
  return coreBattleReducer(state, action)
}

export type { SkillLevelUp } from './playerStore'
