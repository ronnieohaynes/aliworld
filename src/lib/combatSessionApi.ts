import { randomCombatSeed } from '../data/combatRng'
import { supabase } from './supabaseClient'
import type { PlayerMoveId } from '../data/moveIds'

export type CombatFightSession = {
  fightId: string
  seed: number
  npcId: string
  /** True when the server issued this session; false for offline/local fallback. */
  serverIssued: boolean
}

type StartFightResponse = {
  fightId: string
  seed: number
  npcId?: string
}

export type CombatFightClaim = {
  result: 'win' | 'lose' | 'draw'
  turns: number
  playerHp: number
  enemyHp: number
}

export type ValidateFightResponse = {
  valid: boolean
  reason?: string
  alreadyValidated?: boolean
}

type StartFightOptions = {
  runItBack?: boolean
  isolateNpcMemory?: boolean
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('combat-session', { body })
  if (error) throw error
  if (!data || typeof data !== 'object') throw new Error('Invalid combat-session response')
  if ('error' in data && typeof (data as { error?: string }).error === 'string') {
    throw new Error((data as { error: string }).error)
  }
  return data as T
}

/** Server-issued fight seed; falls back to a local seed when offline or unauthenticated. */
export async function startCombatFight(
  npcId: string,
  options?: StartFightOptions,
): Promise<CombatFightSession> {
  try {
    const data = await post<StartFightResponse>({
      action: 'start_fight',
      npcId,
      runItBack: options?.runItBack ?? false,
      isolateNpcMemory: options?.isolateNpcMemory,
    })
    const seed = Number(data.seed)
    if (!Number.isFinite(seed) || typeof data.fightId !== 'string') {
      throw new Error('Malformed combat-session response')
    }
    return {
      fightId: data.fightId,
      seed: seed >>> 0,
      npcId: typeof data.npcId === 'string' ? data.npcId : npcId,
      serverIssued: true,
    }
  } catch (err) {
    console.warn(
      '[combat-session] start_fight fallback',
      err instanceof Error ? err.message : String(err),
    )
    return {
      fightId: `local-${Date.now()}`,
      seed: randomCombatSeed(),
      npcId,
      serverIssued: false,
    }
  }
}

/** Replay validation — scored gym gauntlet wins must pass before rewards count. */
export async function validateCombatFight(input: {
  fightId: string
  playerMoves: readonly PlayerMoveId[]
  claimed: CombatFightClaim
}): Promise<ValidateFightResponse> {
  const data = await post<ValidateFightResponse & { replay?: unknown }>({
    action: 'validate_fight',
    fightId: input.fightId,
    playerMoves: [...input.playerMoves],
    claimed: input.claimed,
  })
  return {
    valid: data.valid === true,
    reason: typeof data.reason === 'string' ? data.reason : undefined,
    alreadyValidated: data.alreadyValidated === true,
  }
}
