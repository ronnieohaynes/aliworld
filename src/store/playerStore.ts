import {
  getUnlockedMoves,
  isMoveUnlocked,
  type PlayerMoveId,
} from '../data/moves'
import { MOVES } from '../data/moveDefinitions'
import type { CityId } from '../data/cityConfig'
import { supabase } from '../lib/supabaseClient'
import type { AccessoryBonuses, ArchetypeId, ResolveResult } from './battleStore'
import { isCollectibleArtifactId, type CollectibleArtifactId } from '../data/artifacts'
import { getAuthState } from './authStore'
import {
  applyState as applyArtifactState,
  resetState as resetArtifactState,
  serialize as artifactSerialize,
  subscribeArtifactStore,
} from './artifactStore'
import {
  applyState as applyQuest1State,
  resetState as resetQuest1State,
  serialize as quest1Serialize,
  subscribeQuest1Store,
  type Quest1Serialized,
} from './quest1Store'
import {
  applyState as applyWorldMemoryState,
  resetState as resetWorldMemoryState,
  serialize as worldMemorySerialize,
  subscribeWorldMemoryStore,
  type WorldMemoryState,
} from './worldMemory'
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
  quest1?: Partial<Quest1Serialized>
  worldMemory?: Partial<WorldMemoryState>
  artifacts?: CollectibleArtifactId[]
  lastCity?: CityId
  lastX?: number
  lastY?: number
}

type AccountAvatarConfig = {
  archetype?: ArchetypeId
  skills?: SkillsState
  quest1?: Partial<Quest1Serialized>
  worldMemory?: Partial<WorldMemoryState>
  artifacts?: unknown
  lastCity?: unknown
  lastX?: unknown
  lastY?: unknown
}

type LastLocation = {
  city: CityId
  x: number
  y: number
}

/** Latest overworld location — updated by GameScreen; not part of reactive player state. */
let lastLocation: LastLocation | null = null

const VALID_CITY_IDS: readonly CityId[] = ['daly-city', 'san-bruno']

function normalizeLastCity(raw: unknown): CityId | undefined {
  if (typeof raw !== 'string') return undefined
  return VALID_CITY_IDS.includes(raw as CityId) ? (raw as CityId) : undefined
}

function normalizeWorldCoord(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined
  return raw
}

/** Hold the latest city + position for the next account save (no save loop). */
export function setLastLocation(city: string, x: number, y: number): void {
  const cityId = normalizeLastCity(city)
  if (!cityId) return
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  lastLocation = { city: cityId, x, y }
}

function normalizeArtifacts(raw: unknown): CollectibleArtifactId[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (id): id is CollectibleArtifactId =>
      typeof id === 'string' && isCollectibleArtifactId(id),
  )
}

const DEFAULT_EQUIPPED_MOVES: PlayerStoreState['equippedMoves'] = [
  'STRIKE',
  'SLIP',
  'HOLD',
  'WHISPER',
]

function normalizeMoveId(raw: unknown): PlayerMoveId | null {
  if (typeof raw !== 'string') return null
  const upper = raw.toUpperCase() as PlayerMoveId
  return MOVES[upper] ? upper : null
}

function normalizeEquippedMoves(raw: unknown): PlayerStoreState['equippedMoves'] {
  const rawEquipped = Array.isArray(raw) ? raw : []
  const normalized = rawEquipped.map(normalizeMoveId)
  return [
    normalized[0] ?? DEFAULT_EQUIPPED_MOVES[0],
    normalized[1] ?? DEFAULT_EQUIPPED_MOVES[1],
    normalized[2] ?? DEFAULT_EQUIPPED_MOVES[2],
    normalized[3] ?? DEFAULT_EQUIPPED_MOVES[3],
  ]
}

export async function saveProgressionToAccount(s: PlayerStoreState): Promise<void> {
  const userId = getAuthState().session?.user?.id
  if (!userId) return

  try {
    const { error } = await supabase.from('aw_profiles').upsert({
      user_id: userId,
      moves_equipped: s.equippedMoves,
      avatar_config: {
        archetype: s.archetype,
        skills: s.skills,
        quest1: quest1Serialize(),
        worldMemory: worldMemorySerialize(),
        artifacts: artifactSerialize(),
        ...(lastLocation
          ? {
              lastCity: lastLocation.city,
              lastX: lastLocation.x,
              lastY: lastLocation.y,
            }
          : {}),
      },
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

    const avatarConfig = data.avatar_config as AccountAvatarConfig | null
    const lastCity = normalizeLastCity(avatarConfig?.lastCity)
    const lastX = normalizeWorldCoord(avatarConfig?.lastX)
    const lastY = normalizeWorldCoord(avatarConfig?.lastY)

    return {
      equippedMoves: normalizeEquippedMoves(data.moves_equipped),
      archetype: avatarConfig?.archetype,
      skills: avatarConfig?.skills,
      quest1: avatarConfig?.quest1,
      worldMemory: avatarConfig?.worldMemory,
      artifacts: normalizeArtifacts(avatarConfig?.artifacts),
      ...(lastCity !== undefined && lastX !== undefined && lastY !== undefined
        ? { lastCity, lastX, lastY }
        : {}),
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

function persistProgressionToAccount(): void {
  if (skipAccountSave) return
  void saveProgressionToAccount(state)
}

function emit(): void {
  persistProgressionToAccount()
  for (const listener of listeners) {
    listener()
  }
}

/** Save current progression + quest/world/artifact state to the account. */
export function triggerAccountProgressionSave(): void {
  persistProgressionToAccount()
}

subscribeQuest1Store(persistProgressionToAccount)
subscribeWorldMemoryStore(persistProgressionToAccount)
subscribeArtifactStore(persistProgressionToAccount)

export async function hydrateFromAccount(): Promise<void> {
  const data = await loadProgressionFromAccount()
  if (!data) return

  skipAccountSave = true

  state = {
    ...state,
    archetype: data.archetype ?? state.archetype,
    skills: data.skills ?? state.skills,
    equippedMoves: data.equippedMoves ?? state.equippedMoves,
  }
  for (const listener of listeners) {
    listener()
  }

  applyQuest1State(data.quest1 ?? {})
  applyWorldMemoryState(data.worldMemory ?? {})
  applyArtifactState(data.artifacts ?? [])

  if (data.lastCity !== undefined && data.lastX !== undefined && data.lastY !== undefined) {
    lastLocation = { city: data.lastCity, x: data.lastX, y: data.lastY }
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
  lastLocation = null
  state = createDefaultPlayerState()
  for (const listener of listeners) {
    listener()
  }
  resetQuest1State()
  resetWorldMemoryState()
  resetArtifactState()
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
