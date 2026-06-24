import type { PlayerMoveId } from '../src/data/moveIds'
import {
  battleReducer,
  createInitialBattleState,
  type ArchetypeId,
  type BattleResult,
  type BattleState,
} from './battleEngine'
import { getCombatRng } from './rng'
import type { SkillsState } from '../src/store/skillStore'

export type RunBattleOptions = {
  npcId: string
  seed: number
  playerMoves: readonly PlayerMoveId[]
  skills: SkillsState
  equippedMoves?: readonly [PlayerMoveId, PlayerMoveId, PlayerMoveId, PlayerMoveId]
  archetype?: ArchetypeId
  isolateNpcMemory?: boolean
  runItBack?: boolean
}

export type RunBattleResult = {
  result: BattleResult
  turns: number
  playerHp: number
  enemyHp: number
  rngDraws: number
  logDigest: string
}

function advanceBusyState(state: BattleState): BattleState {
  if (state.phase !== 'busy') return state
  if (state.pendingLevelUpNotification) {
    return battleReducer(state, { type: 'DISMISS_LEVEL_UP' })
  }
  if (state.resolveStep === 'pause_after_first') {
    return battleReducer(state, { type: 'RESOLVE_SECOND' })
  }
  if (state.resolveStep === 'pause_after_second') {
    return battleReducer(state, { type: 'RESOLVE_FINISH' })
  }
  return state
}

/** Headless fight runner — deterministic when seed + moves + skills are fixed. */
export function runBattle(options: RunBattleOptions): RunBattleResult {
  let state = createInitialBattleState(options.npcId, {
    combatSeed: options.seed,
    skills: options.skills,
    equippedMoves: options.equippedMoves,
    archetype: options.archetype,
    isolateNpcMemory: options.isolateNpcMemory ?? false,
    combatXpPolicy: 'none',
    runItBack: options.runItBack ?? false,
  })

  let moveIndex = 0
  let guard = 0
  const maxSteps = 500

  while (state.phase !== 'ended' && guard < maxSteps) {
    guard += 1
    if (state.phase === 'busy') {
      const next = advanceBusyState(state)
      if (next === state) break
      state = next
      continue
    }

    const move =
      options.playerMoves[moveIndex] ??
      options.playerMoves[options.playerMoves.length - 1] ??
      'STRIKE'
    moveIndex += 1
    state = battleReducer(state, { type: 'PLAYER_MOVE', move })
  }

  if (state.phase !== 'ended' || state.result == null) {
    throw new Error(`Combat simulation did not end (phase=${state.phase}, guard=${guard})`)
  }

  return {
    result: state.result,
    turns: state.turn,
    playerHp: state.playerHp,
    enemyHp: state.enemyHp,
    rngDraws: getCombatRng().draws(),
    logDigest: state.log.join('\n'),
  }
}
