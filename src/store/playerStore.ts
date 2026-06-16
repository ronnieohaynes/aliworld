import {
  getUnlockedMoves,
  isMoveUnlocked,
  type PlayerMoveId,
} from '../data/moves'
import { MOVES } from '../data/moveDefinitions'
import type { CityId } from '../data/cityConfig'
import { deriveBuildName } from '../data/buildName'
import type { BattleFeedbackEvent } from '../data/battleFeedback'
import type { TimingBonusGrant } from '../data/timingBonusXp'
import { combatXpLevelMultiplier } from '../data/moveBalance'
import { track } from '../lib/analytics'
import { PLAYER_LEVEL_MILESTONES } from '../lib/analyticsConstants'
import { isDevModeEnabled, subscribeDevMode } from '../lib/devMode'
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
  applyState as applyGymState,
  resetState as resetGymState,
  serialize as gymSerialize,
  subscribeGymStore,
  type GymSerialized,
} from './gymStore'
import {
  applyState as applyQuest1State,
  resetState as resetQuest1State,
  serialize as quest1Serialize,
  subscribeQuest1Store,
  type Quest1Serialized,
} from './quest1Store'
import {
  applyState as applyQuest2State,
  resetState as resetQuest2State,
  serialize as quest2Serialize,
  subscribeQuest2Store,
  type Quest2Serialized,
} from './quest2Store'
import {
  applyState as applyWorldMemoryState,
  resetState as resetWorldMemoryState,
  serialize as worldMemorySerialize,
  subscribeWorldMemoryStore,
  type WorldMemoryState,
} from './worldMemory'
import { applyMidnightVariantFromAccount, getMidnightVariant } from './characterStore'
import { isMidnightVariantId, type MidnightVariantId } from '../data/midnightVariants'
import {
  awardMoveXp,
  computePlayerLevel,
  createDefaultSkills,
  grantSkillXpAmount,
  playerLevelUpLine,
  totalXpForLevel,
  type SkillId,
  type SkillsState,
} from './skillStore'

type AccountProgression = {
  archetype: PlayerStoreState['archetype']
  skills: PlayerStoreState['skills']
  equippedMoves: PlayerStoreState['equippedMoves']
  quest1?: Partial<Quest1Serialized>
  quest2?: Partial<Quest2Serialized>
  gym?: Partial<GymSerialized>
  worldMemory?: Partial<WorldMemoryState>
  artifacts?: CollectibleArtifactId[]
  lastCity?: CityId
  lastX?: number
  lastY?: number
  midnightVariant?: MidnightVariantId
}

type AccountAvatarConfig = {
  archetype?: ArchetypeId
  skills?: SkillsState
  quest1?: Partial<Quest1Serialized>
  quest2?: Partial<Quest2Serialized>
  gym?: Partial<GymSerialized>
  worldMemory?: Partial<WorldMemoryState>
  artifacts?: unknown
  lastCity?: unknown
  lastX?: unknown
  lastY?: unknown
  midnightVariant?: unknown
}

type LastLocation = {
  city: CityId
  x: number
  y: number
}

/** Hold the latest city + position for the next account save (no save loop). */
let lastLocation: LastLocation | null = null

let accountHydrated = false
let hydrateInFlight: Promise<void> | null = null

const VALID_CITY_IDS: readonly CityId[] = [
  'five',
  'san-bruno',
  'southside',
  'blue-store-interior',
  'five-gym-interior',
]

function normalizeLastCity(raw: unknown): CityId | undefined {
  if (typeof raw !== 'string') return undefined
  let id = raw
  if (id === 'daly-city' || id === '5ive') id = 'five'
  if (id === 'blue-store') id = 'southside'
  return VALID_CITY_IDS.includes(id as CityId) ? (id as CityId) : undefined
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

/** Saved overworld location after hydrate (for GameScreen restore). */
export function getLastSavedLocation(): LastLocation | null {
  return lastLocation
}

/** Resolves once account progression (including location) has been loaded. */
export function whenAccountHydrated(): Promise<void> {
  if (accountHydrated) return Promise.resolve()
  if (hydrateInFlight) return hydrateInFlight
  return hydrateFromAccount()
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

export async function saveProgressionToAccount(s: PlayerStoreState): Promise<boolean> {
  const userId = getAuthState().session?.user?.id
  if (!userId) return true

  try {
    const { error } = await supabase.from('aw_profiles').upsert({
      user_id: userId,
      moves_equipped: s.equippedMoves,
      avatar_config: {
        archetype: s.archetype,
        skills: s.skills,
        quest1: quest1Serialize(),
        quest2: quest2Serialize(),
        gym: gymSerialize(),
        worldMemory: worldMemorySerialize(),
        artifacts: artifactSerialize(),
        midnightVariant: getMidnightVariant() ?? undefined,
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
    if (error) {
      console.error('[save]', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[save]', err instanceof Error ? err.message : String(err))
    return false
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
    const rawVariant = avatarConfig?.midnightVariant
    const midnightVariant =
      typeof rawVariant === 'string' && isMidnightVariantId(rawVariant) ? rawVariant : undefined

    return {
      equippedMoves: normalizeEquippedMoves(data.moves_equipped),
      archetype: avatarConfig?.archetype,
      skills: avatarConfig?.skills,
      quest1: avatarConfig?.quest1,
      quest2: avatarConfig?.quest2,
      gym: avatarConfig?.gym,
      worldMemory: avatarConfig?.worldMemory,
      artifacts: normalizeArtifacts(avatarConfig?.artifacts),
      ...(lastCity !== undefined && lastX !== undefined && lastY !== undefined
        ? { lastCity, lastX, lastY }
        : {}),
      ...(midnightVariant ? { midnightVariant } : {}),
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
let trackedBuildName = deriveBuildName(state.skills).name

function trackBuildNameIfChanged(skills: SkillsState): void {
  const next = deriveBuildName(skills).name
  if (next === trackedBuildName) return
  trackedBuildName = next
  track('build_name_changed', { buildName: next })
}

function trackSkillLevelUps(before: SkillsState, after: SkillsState): void {
  const combatSkills: SkillId[] = ['attack', 'speed', 'defense', 'luck']
  for (const skill of combatSkills) {
    if (after[skill].level > before[skill].level) {
      track('skill_levelup', { skill, level: after[skill].level })
    }
  }
}

function trackPlayerLevelMilestones(before: SkillsState, after: SkillsState): void {
  const prev = computePlayerLevel(before)
  const next = computePlayerLevel(after)
  if (next <= prev) return
  for (const threshold of PLAYER_LEVEL_MILESTONES) {
    if (prev < threshold && next >= threshold) {
      track('player_level_milestone', { level: threshold })
    }
  }
}

const listeners = new Set<() => void>()
const saveStatusListeners = new Set<() => void>()
let skipAccountSave = false

export type AccountSaveStatus = 'idle' | 'saving' | 'offline'

let accountSaveStatus: AccountSaveStatus = 'idle'
let pendingSaveSnapshot: PlayerStoreState | null = null
let saveLoopInFlight: Promise<void> | null = null

const SAVE_RETRY_DELAYS_MS = [800, 2000, 5000] as const

function setAccountSaveStatus(next: AccountSaveStatus): void {
  if (accountSaveStatus === next) return
  accountSaveStatus = next
  for (const listener of saveStatusListeners) {
    listener()
  }
}

export function getAccountSaveStatus(): AccountSaveStatus {
  return accountSaveStatus
}

export function subscribeAccountSaveStatus(listener: () => void): () => void {
  saveStatusListeners.add(listener)
  return () => saveStatusListeners.delete(listener)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function runAccountSaveLoop(): Promise<void> {
  while (pendingSaveSnapshot) {
    const snapshot = pendingSaveSnapshot
    pendingSaveSnapshot = null
    setAccountSaveStatus('saving')

    let saved = false
    for (let attempt = 0; attempt <= SAVE_RETRY_DELAYS_MS.length; attempt++) {
      saved = await saveProgressionToAccount(snapshot)
      if (saved) break
      const delay = SAVE_RETRY_DELAYS_MS[attempt]
      if (delay == null) break
      await sleep(delay)
    }

    if (!saved) {
      pendingSaveSnapshot = snapshot
      setAccountSaveStatus('offline')
      return
    }

    setAccountSaveStatus('idle')
  }
}

function queueAccountSave(snapshot: PlayerStoreState): void {
  pendingSaveSnapshot = snapshot
  if (saveLoopInFlight) return
  saveLoopInFlight = runAccountSaveLoop().finally(() => {
    saveLoopInFlight = null
  })
}

function persistProgressionToAccount(): void {
  if (skipAccountSave) return
  queueAccountSave(state)
}

function emit(): void {
  persistProgressionToAccount()
  for (const listener of listeners) {
    listener()
  }
}

subscribeDevMode(() => {
  for (const listener of listeners) {
    listener()
  }
})

/** Save current progression + quest/world/artifact state to the account. */
export function triggerAccountProgressionSave(): void {
  persistProgressionToAccount()
}

subscribeQuest1Store(persistProgressionToAccount)
subscribeQuest2Store(persistProgressionToAccount)
subscribeGymStore(persistProgressionToAccount)
subscribeWorldMemoryStore(persistProgressionToAccount)
subscribeArtifactStore(persistProgressionToAccount)

export async function hydrateFromAccount(): Promise<void> {
  if (accountHydrated) return
  if (hydrateInFlight) return hydrateInFlight

  hydrateInFlight = (async () => {
    skipAccountSave = true
    try {
      const data = await loadProgressionFromAccount()

      if (data) {
        state = {
          ...state,
          archetype: data.archetype ?? state.archetype,
          skills: data.skills ?? state.skills,
          equippedMoves: data.equippedMoves ?? state.equippedMoves,
        }
        trackedBuildName = deriveBuildName(state.skills).name
        for (const listener of listeners) {
          listener()
        }

        applyQuest1State(data.quest1 ?? {})
        applyQuest2State(data.quest2 ?? {})
        applyGymState({
          ...(data.gym ?? {}),
          ...((data.quest1 as { gymTier1Cleared?: boolean } | undefined)?.gymTier1Cleared
            ? { gymTier1Cleared: true }
            : {}),
        } as Partial<GymSerialized & { gymTier1Cleared?: boolean }>)
        applyWorldMemoryState(data.worldMemory ?? {})
        applyArtifactState(data.artifacts ?? [])

        if (data.lastCity !== undefined && data.lastX !== undefined && data.lastY !== undefined) {
          lastLocation = { city: data.lastCity, x: data.lastX, y: data.lastY }
        }

        const rawVariant = data.midnightVariant
        if (typeof rawVariant === 'string' && isMidnightVariantId(rawVariant)) {
          applyMidnightVariantFromAccount(rawVariant)
        }
      }
    } catch (err) {
      console.error('[hydrate]', err instanceof Error ? err.message : String(err))
    } finally {
      skipAccountSave = false
      accountHydrated = true
    }
  })()

  try {
    await hydrateInFlight
  } finally {
    hydrateInFlight = null
  }
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
  accountHydrated = false
  hydrateInFlight = null
  pendingSaveSnapshot = null
  setAccountSaveStatus('idle')
  state = createDefaultPlayerState()
  trackedBuildName = deriveBuildName(state.skills).name
  for (const listener of listeners) {
    listener()
  }
  resetQuest1State()
  resetQuest2State()
  resetGymState()
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
  track('move_equipped', { slot, moveId })
  emit()
}

export function setPlayerSkills(skills: SkillsState): void {
  state = { ...state, skills }
  emit()
}

/** Story / milestone skill XP — persists and triggers account save. */
export function grantPlayerSkillXp(skill: SkillId, amount: number): string[] {
  const before = state.skills
  const { skills, lines } = grantSkillXpAmount(before, skill, amount)
  trackSkillLevelUps(before, skills)
  trackPlayerLevelMilestones(before, skills)
  state = { ...state, skills }
  trackBuildNameIfChanged(skills)
  emit()
  return lines
}

export { totalXpForLevel }

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

export type SkillLevelUp = {
  skill: SkillId
  from: number
  to: number
}

export type CombatXpResult = {
  skillLines: string[]
  playerLevelLine: string | null
  playerLevel: number
  playerLevelBefore: number
  bonusCallouts: BattleFeedbackEvent[]
  levelXpMult: number
  skillLevelUps: SkillLevelUp[]
  newlyUnlockedMoves: PlayerMoveId[]
}

/** Apply combat XP to persistent skills; returns skill + combat level-up log lines. */
export function applyCombatSkillXp(
  r: ResolveResult,
  timingBonuses: TimingBonusGrant[] = [],
  options?: { enemyLevel?: number; playerLevel?: number; playerHpAfterHit?: number },
): CombatXpResult {
  const prevPlayerLevel = computePlayerLevel(state.skills)
  const playerLevelBefore = options?.playerLevel ?? prevPlayerLevel
  const enemyLevel = options?.enemyLevel ?? playerLevelBefore
  const levelXpMult = combatXpLevelMultiplier(enemyLevel, playerLevelBefore)
  const scaleXp = (amount: number) => Math.max(0, Math.round(amount * levelXpMult))

  const before = state.skills
  const { skills: afterMoveXp, levelUpLines } = awardMoveXp(before, r, scaleXp)
  let skills = afterMoveXp
  let levelUpLinesAll = [...levelUpLines]

  // HP XP: grant incoming damage as HP XP only if player survived the hit
  const playerHpAfterHit = options?.playerHpAfterHit ?? 1
  if (r.incoming > 0 && playerHpAfterHit > 0) {
    const hpXp = scaleXp(r.incoming)
    const result = grantSkillXpAmount(skills, 'hp', hpXp)
    skills = result.skills
    levelUpLinesAll = [...levelUpLinesAll, ...result.lines]
  }

  for (const bonus of timingBonuses) {
    const result = grantSkillXpAmount(skills, bonus.skill, scaleXp(bonus.amount))
    skills = result.skills
    levelUpLinesAll = [...levelUpLinesAll, ...result.lines]
  }

  // Compute which skills actually leveled up and newly unlocked moves
  const skillIds: SkillId[] = ['attack', 'speed', 'defense', 'luck', 'hp']
  const skillLevelUps: SkillLevelUp[] = skillIds
    .filter((id) => skills[id].level > before[id].level)
    .map((id) => ({ skill: id, from: before[id].level, to: skills[id].level }))

  const movesBefore = new Set(getUnlockedMoves(before))
  const movesAfter = getUnlockedMoves(skills)
  const newlyUnlockedMoves: PlayerMoveId[] = movesAfter.filter((m) => !movesBefore.has(m))

  trackSkillLevelUps(before, skills)
  trackPlayerLevelMilestones(before, skills)
  state = { ...state, skills }
  trackBuildNameIfChanged(skills)
  emit()
  const playerLevel = computePlayerLevel(skills)
  const playerLevelLine =
    playerLevel > prevPlayerLevel ? playerLevelUpLine(playerLevel) : null
  const bonusCallouts: BattleFeedbackEvent[] = timingBonuses.map((bonus) => bonus.callout)
  if (levelXpMult > 1.01) {
    bonusCallouts.unshift({
      kind: 'xp-bonus',
      text: '+xp · outleveled bonus',
      target: 'player',
      tone: 'attack',
    })
  }
  return {
    skillLines: levelUpLinesAll,
    playerLevelLine,
    playerLevel,
    playerLevelBefore: prevPlayerLevel,
    bonusCallouts,
    levelXpMult,
    skillLevelUps,
    newlyUnlockedMoves,
  }
}

export function getPlayerLevel(): number {
  return computePlayerLevel(state.skills)
}

export function getShowDebug(): boolean {
  return isDevModeEnabled() && state.showDebug
}

export function toggleShowDebug(): void {
  if (!isDevModeEnabled()) return
  state = { ...state, showDebug: !state.showDebug }
  emit()
}

export function clearShowDebug(): void {
  if (!state.showDebug) return
  state = { ...state, showDebug: false }
  emit()
}

/** Reset skills, level, and loadout for START menu New Game. */
export function resetPlayerProgressForNewGame(): void {
  lastLocation = null
  state = createDefaultPlayerState()
  emit()
}

export { computePlayerLevel, createDefaultSkills }
export type { SkillsState, SkillId } from './skillStore'
export type { PlayerMoveId } from '../data/moves'
