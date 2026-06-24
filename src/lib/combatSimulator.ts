import type { PlayerMoveId } from '../data/moveIds'
import { runBattle, type RunBattleResult } from '../../combat-core/runBattle'
import type { ArchetypeId } from '../store/battleStore'
import {
  getPlayerSkills,
  type PlayerStoreState,
} from '../store/playerStore'
import type { SkillsState } from '../store/skillStore'

export type CombatSimOptions = {
  npcId: string
  seed: number
  playerMoves: readonly PlayerMoveId[]
  archetype?: ArchetypeId
  skills?: SkillsState
  equippedMoves?: PlayerStoreState['equippedMoves']
  isolateNpcMemory?: boolean
  runItBack?: boolean
}

export type CombatSimResult = RunBattleResult

/** Headless fight runner — deterministic when seed + moves are fixed. */
export function simulateCombat(options: CombatSimOptions): CombatSimResult {
  return runBattle({
    npcId: options.npcId,
    seed: options.seed,
    playerMoves: options.playerMoves,
    skills: options.skills ?? getPlayerSkills(),
    equippedMoves: options.equippedMoves,
    archetype: options.archetype,
    isolateNpcMemory: options.isolateNpcMemory,
    runItBack: options.runItBack,
  })
}
