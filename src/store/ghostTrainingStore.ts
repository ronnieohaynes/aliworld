import {
  buildLocalGhostTrainingSync,
  markLocalExplainerSeen,
  recordLocalGhostMatch,
} from '../lib/ghostTrainingLocal'
import {
  dismissGhostNews,
  markGhostExplainerSeen,
  recordGhostMatch,
  syncGhostTraining,
  type GhostOpponentRef,
  type GhostSnapshotPayload,
  type GhostTrainingSyncResponse,
} from '../lib/ghostTrainingApi'
import {
  cacheGhostSnapshot,
  ghostCombatId,
  type GhostSnapshot,
} from '../data/ghostCombat'
import type { ArchetypeId } from './battleStore'
import type { BuildLoopSkill } from '../data/buildName'
import type { LeanSkill } from '../data/skillCounter'
import type { SkillsState } from './skillStore'
import { grantPlayerSkillXp } from './playerStore'

const STORAGE_KEY = 'aliworld:ghost-training:v1'

export type GhostTrainingUiState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: GhostTrainingSyncResponse }

type PendingBattle = {
  combatId: string
  dailySlot?: number
  isChampion: boolean
}

type GhostTrainingLocal = {
  lastSyncDayKey: string | null
  pendingBattle: PendingBattle | null
}

let uiState: GhostTrainingUiState = { kind: 'idle' }
const listeners = new Set<() => void>()

function emit(): void {
  for (const fn of listeners) fn()
}

export function subscribeGhostTrainingStore(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getGhostTrainingUiState(): GhostTrainingUiState {
  return uiState
}

function loadLocal(): GhostTrainingLocal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { lastSyncDayKey: null, pendingBattle: null }
    const parsed = JSON.parse(raw) as Partial<GhostTrainingLocal>
    return {
      lastSyncDayKey: typeof parsed.lastSyncDayKey === 'string' ? parsed.lastSyncDayKey : null,
      pendingBattle: parsed.pendingBattle ?? null,
    }
  } catch {
    return { lastSyncDayKey: null, pendingBattle: null }
  }
}

function saveLocal(patch: Partial<GhostTrainingLocal>): void {
  const next = { ...loadLocal(), ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function payloadToSnapshot(p: GhostSnapshotPayload): GhostSnapshot {
  return {
    source: p.source,
    id: p.id,
    userId: p.userId,
    handle: p.handle,
    displayName: p.displayName,
    archetype: p.archetype as ArchetypeId,
    skills: p.skills as SkillsState,
    movesEquipped: p.movesEquipped,
    level: p.level,
    buildType: (p.buildType as BuildLoopSkill | null) ?? null,
    leanSkill: p.leanSkill as LeanSkill,
    buildName: p.buildName,
    variantId: p.variantId,
    isFullCharacter: p.isFullCharacter,
    champion: p.champion,
  }
}

function cacheSnapshots(data: GhostTrainingSyncResponse): void {
  for (const snap of data.snapshots) {
    cacheGhostSnapshot(payloadToSnapshot(snap))
  }
  cacheGhostSnapshot(payloadToSnapshot(data.champion))
}

export async function refreshGhostTraining(): Promise<GhostTrainingSyncResponse | null> {
  uiState = { kind: 'loading' }
  emit()
  try {
    const data = await syncGhostTraining()
    cacheSnapshots(data)
    saveLocal({ lastSyncDayKey: data.dayKey })
    uiState = { kind: 'ready', data }
    emit()
    return data
  } catch {
    const local = buildLocalGhostTrainingSync()
    cacheSnapshots(local)
    saveLocal({ lastSyncDayKey: local.dayKey })
    uiState = { kind: 'ready', data: local }
    emit()
    return local
  }
}

/** Fire-and-forget harvest on build change (server reads aw_profiles). */
export function triggerGhostHarvest(): void {
  void syncGhostTraining().then((data) => {
    if (!data) return
    cacheSnapshots(data)
    if (uiState.kind === 'ready' || uiState.kind === 'idle') {
      uiState = { kind: 'ready', data }
      emit()
    }
  }).catch(() => {
    // harvest is best-effort
  })
}

export function beginGhostBattle(ref: GhostOpponentRef | { combatId: string; isChampion: boolean; slot?: number }): string {
  const combatId = ref.combatId
  const isChampion = 'isChampion' in ref ? ref.isChampion : false
  const pending: PendingBattle = {
    combatId,
    dailySlot: 'slot' in ref ? ref.slot : undefined,
    isChampion,
  }
  saveLocal({ pendingBattle: pending })
  return combatId
}

export function getPendingGhostBattle(): PendingBattle | null {
  return loadLocal().pendingBattle
}

export function clearPendingGhostBattle(): void {
  saveLocal({ pendingBattle: null })
}

export async function completeGhostBattle(
  result: 'win' | 'lose' | 'draw',
  options?: { playerHpRatio?: number },
): Promise<void> {
  const pending = getPendingGhostBattle()
  clearPendingGhostBattle()
  if (!pending || result === 'draw') return

  const flawless = result === 'win' && (options?.playerHpRatio ?? 0) >= 0.99
  const offline = uiState.kind === 'ready' && uiState.data.offline === true

  if (offline) {
    const res = recordLocalGhostMatch({
      combatId: pending.combatId,
      won: result === 'win',
      flawless,
      isChampion: pending.isChampion,
      dailySlot: pending.dailySlot,
    })
    if (uiState.kind === 'ready') {
      uiState = {
        kind: 'ready',
        data: {
          ...uiState.data,
          dailyCompleted: res.dailyCompleted,
          dailyGhostAttempts: res.dailyGhostAttempts,
          championClearedToday: pending.isChampion && result === 'win'
            ? true
            : uiState.data.championClearedToday,
          championAttemptedToday: pending.isChampion
            ? true
            : uiState.data.championAttemptedToday,
        },
      }
      emit()
    }
    return
  }

  try {
    const res = await recordGhostMatch({
      combatId: pending.combatId,
      won: result === 'win',
      flawless,
      isChampion: pending.isChampion,
      dailySlot: pending.dailySlot,
    })

    if (res.xpEligible && res.fighterPassiveXp && res.fighterPassiveXp > 0) {
      applyPassiveGhostXp(res.fighterPassiveXp)
    }

    if (uiState.kind === 'ready') {
      const completed = res.dailyCompleted ?? uiState.data.dailyCompleted
      uiState = {
        kind: 'ready',
        data: {
          ...uiState.data,
          dailyCompleted: completed,
          dailyGhostAttempts: res.dailyGhostAttempts ?? uiState.data.dailyGhostAttempts,
          championClearedToday: pending.isChampion && result === 'win'
            ? true
            : uiState.data.championClearedToday,
          championAttemptedToday: pending.isChampion
            ? true
            : uiState.data.championAttemptedToday,
        },
      }
      emit()
    }

    void refreshGhostTraining()
  } catch {
    // match logging is best-effort; don't block battle exit
  }
}

function applyPassiveGhostXp(amount: number): void {
  if (amount <= 0) return
  grantPlayerSkillXp('attack', amount)
}

export async function dismissGhostTrainingNews(): Promise<void> {
  try {
    await dismissGhostNews()
    if (uiState.kind === 'ready') {
      uiState = { kind: 'ready', data: { ...uiState.data, news: null } }
      emit()
    }
  } catch {
    // ignore
  }
}

export async function acknowledgeGhostExplainer(): Promise<void> {
  if (uiState.kind === 'ready' && uiState.data.offline) {
    markLocalExplainerSeen()
    uiState = { kind: 'ready', data: { ...uiState.data, explainerSeen: true } }
    emit()
    return
  }
  try {
    await markGhostExplainerSeen()
    if (uiState.kind === 'ready') {
      uiState = { kind: 'ready', data: { ...uiState.data, explainerSeen: true } }
      emit()
    }
  } catch {
    // ignore
  }
}

export function championCombatId(champion: GhostSnapshotPayload): string {
  if (champion.source === 'real' && champion.userId) {
    return ghostCombatId('champion', champion.userId)
  }
  return ghostCombatId('champion', champion.id)
}

export function cacheChampionForBattle(champion: GhostSnapshotPayload): string {
  const snap = payloadToSnapshot({ ...champion, champion: true })
  const combatId =
    champion.source === 'real' && champion.userId
      ? ghostCombatId('champion', champion.userId)
      : ghostCombatId('champion', champion.id)
  cacheGhostSnapshot({ ...snap, source: 'champion', champion: true })
  return combatId
}
