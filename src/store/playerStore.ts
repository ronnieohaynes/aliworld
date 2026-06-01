import {
  getUnlockedMoves,
  isMoveUnlocked,
  type PlayerMoveId,
} from '../data/moves'
import { supabase } from '../lib/supabaseClient'
import type { AccessoryBonuses, ArchetypeId, ResolveResult } from './battleStore'
import { getAuthState } from './authStore'
import {
  awardMoveXp,
  computePlayerLevel,
  createDefaultSkills,
  playerLevelUpLine,
  type SkillsState,
} from './skillStore'

type AccountProgression = {
  archetype: PlayerStoreState['archetype']
  skills: PlayerStoreState['skills']
  equippedMoves: PlayerStoreState['equippedMoves']
}

const DEFAULT_EQUIPPED_MOVES: PlayerStoreState['equippedMoves'] = [
  'STRIKE',
  'SLIP',
  'HOLD',
  'WHISPER',
]

function isEquippedMovesTuple(
  value: unknown,
): value is PlayerStoreState['equippedMoves'] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((id) => typeof id === 'string')
  )
}

export async function saveProgressionToAccount(s: PlayerStoreState): Promise<void> {
  const userId = getAuthState().session?.user?.id
  if (!userId) return

  try {
    const { error } = await supabase.from('aw_profiles').upsert({
      user_id: userId,
      moves_equipped: s.equippedMoves,
      avatar_config: { archetype: s.archetype, skills: s.skills },
      updated_at: new Date().toISOString(),
    })
    if (error) console.error('[save]', error.message)
  } catch (err) {
    console.error('[save]', err instanceof Error ? err.message : String(err))
  }
}

export async function loadProgressionFromAccount(): Promise<Partial<AccountProgression> | null> {
  const userId = getAuthState().session?.user?.id
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('aw_profiles')
      .select('moves_equipped, avatar_config')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return null

    const avatarConfig = data.avatar_config as
      | { archetype?: ArchetypeId; skills?: SkillsState }
      | null

    return {
      equippedMoves: data.moves_equipped as AccountProgression['equippedMoves'] | undefined,
      archetype: avatarConfig?.archetype,
      skills: avatarConfig?.skills,
    }
  } catch {
    return null
  }
}

export type PlayerStoreState = {
  archetype: ArchetypeId
  accessories: AccessoryBonuses[]
  skills: SkillsState
  /** Four active battle slots — move ids unlocked via skill ladders. */
  equippedMoves: readonly [PlayerMoveId, PlayerMoveId, PlayerMoveId, PlayerMoveId]
  /** Overworld / between-battle HP; null = use computed max on next battle. */
  hp: number | null
  showDebug: boolean
}

let state: PlayerStoreState = createDefaultPlayerState()

const listeners = new Set<() => void>()
let skipAccountSave = false

function emit(): void {
  if (!skipAccountSave) {
    void saveProgressionToAccount(state)
  }
  for (const listener of listeners) {
    listener()
  }
}

export async function hydrateFromAccount(): Promise<void> {
  const data = await loadProgressionFromAccount()
  if (!data) return

  skipAccountSave = true
  state = {
    ...state,
    archetype: data.archetype ?? state.archetype,
    skills: data.skills ?? state.skills,
    equippedMoves: isEquippedMovesTuple(data.equippedMoves)
      ? data.equippedMoves
      : state.equippedMoves,
  }
  for (const listener of listeners) {
    listener()
  }
  skipAccountSave = false
}

function createDefaultPlayerState(): PlayerStoreState {
  return {
    archetype: 'atk',
    accessories: [],
    skills: createDefaultSkills(),
    equippedMoves: DEFAULT_EQUIPPED_MOVES,
    hp: null,
    showDebug: false,
  }
}

/** Reset to defaults in memory only — used on logout so the next user starts clean. */
export function resetProgression(): void {
  skipAccountSave = true
  state = createDefaultPlayerState()
  for (const listener of listeners) {
    listener()
  }
  skipAccountSave = false
}

export function getPlayerStoreState(): PlayerStoreState {
  return state
}

export function subscribePlayerStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPlayerSkills(): SkillsState {
  return state.skills
}

export function getEquippedMoves(): PlayerStoreState['equippedMoves'] {
  return state.equippedMoves
}

/** Slots filled with unlocked moves only (preserves slot order). */
export function getActiveEquippedMoves(): PlayerMoveId[] {
  return state.equippedMoves.filter((id) => isMoveUnlocked(id, state.skills))
}

/** Moves unlocked but not in any equipped slot — equip pool for loadout UI. */
export function getUnequippedUnlockedMoves(): PlayerMoveId[] {
  const unlocked = new Set(getUnlockedMoves(state.skills))
  for (const id of state.equippedMoves) unlocked.delete(id)
  return [...unlocked]
}

export function setEquippedMove(slot: 0 | 1 | 2 | 3, moveId: PlayerMoveId): void {
  if (!isMoveUnlocked(moveId, state.skills)) return
  const slots: [PlayerMoveId, PlayerMoveId, PlayerMoveId, PlayerMoveId] = [
    state.equippedMoves[0],
    state.equippedMoves[1],
    state.equippedMoves[2],
    state.equippedMoves[3],
  ]
  slots[slot] = moveId
  state = { ...state, equippedMoves: slots }
  emit()
}

export function setPlayerSkills(skills: SkillsState): void {
  state = { ...state, skills }
  emit()
}

export function getOverworldPlayerHp(): number | null {
  return state.hp
}

export function setOverworldPlayerHp(hp: number | null): void {
  state = { ...state, hp }
  emit()
}

export function setPlayerArchetype(archetype: ArchetypeId): void {
  state = { ...state, archetype }
  emit()
}

export type CombatXpResult = {
  skillLines: string[]
  playerLevelLine: string | null
  playerLevel: number
}

/** Apply combat XP to persistent skills; returns skill + combat level-up log lines. */
export function applyCombatSkillXp(r: ResolveResult): CombatXpResult {
  const prevPlayerLevel = computePlayerLevel(state.skills)
  const { skills, levelUpLines } = awardMoveXp(state.skills, r)
  state = { ...state, skills }
  emit()
  const playerLevel = computePlayerLevel(skills)
  const playerLevelLine =
    playerLevel > prevPlayerLevel ? playerLevelUpLine(playerLevel) : null
  return {
    skillLines: levelUpLines,
    playerLevelLine,
    playerLevel,
  }
}

export function getPlayerLevel(): number {
  return computePlayerLevel(state.skills)
}

export function getShowDebug(): boolean {
  return state.showDebug
}

export function toggleShowDebug(): void {
  state = { ...state, showDebug: !state.showDebug }
  emit()
}

/** Reset skills, level, and loadout for START menu New Game. */
export function resetPlayerProgressForNewGame(): void {
  state = createDefaultPlayerState()
  emit()
}

export { computePlayerLevel, createDefaultSkills }
export type { SkillsState, SkillId } from './skillStore'
export type { PlayerMoveId } from '../data/moves'
