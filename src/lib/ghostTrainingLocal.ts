/**
 * Client-side ghost training when the edge function is unavailable (not deployed / offline).
 * Uses seeded ghosts only; no async cross-player loop until server sync works.
 */

import {
  currentGhostDayKey,
  ghostLevelBand,
  DAILY_GHOST_SET_SIZE,
  GHOST_DAILY_XP_BATTLE_CAP,
} from '../data/ghostDailyReset'
import { ghostCombatId, snapshotFromSeeded, type GhostSnapshot } from '../data/ghostCombat'
import { AUTHORED_CHAMPION, getSeededGhost, seededGhostsInBand, type SeededGhostDef } from '../data/seededGhosts'
import { computePlayerLevel } from '../store/skillStore'
import { getPlayerSkills } from '../store/playerStore'
import type { GhostOpponentRef, GhostTrainingSyncResponse, GhostSnapshotPayload } from './ghostTrainingApi'

const OFFLINE_STATE_KEY = 'aliworld:ghost-training:offline:v1'

type OfflineState = {
  dayKey: string
  opponentIds: string[]
  dailyCompleted: number[]
  dailyGhostAttempts: Record<string, number>
  dailyStreak: number
  bestDailyStreak: number
  explainerSeen: boolean
  championAttemptedDayKey: string | null
  championClearedDayKey: string | null
  stats: GhostTrainingSyncResponse['stats']
}

function defaultStats(): GhostTrainingSyncResponse['stats'] {
  return {
    ghostsFoughtTotal: 0,
    ghostWins: 0,
    ghostLosses: 0,
    flawlessWins: 0,
    championAttempts: 0,
    championWins: 0,
    dailySetsCompleted: 0,
    yourGhostWins: 0,
    yourGhostLosses: 0,
    yourGhostServed: 0,
  }
}

function loadOfflineState(dayKey: string): OfflineState {
  try {
    const raw = localStorage.getItem(OFFLINE_STATE_KEY)
    if (!raw) {
      return {
        dayKey,
        opponentIds: [],
        dailyCompleted: [],
        dailyGhostAttempts: {},
        dailyStreak: 0,
        bestDailyStreak: 0,
        explainerSeen: false,
        championAttemptedDayKey: null,
        championClearedDayKey: null,
        stats: defaultStats(),
      }
    }
    const parsed = JSON.parse(raw) as Partial<OfflineState>
    if (parsed.dayKey !== dayKey) {
      return {
        dayKey,
        opponentIds: [],
        dailyCompleted: [],
        dailyGhostAttempts: {},
        dailyStreak: 0,
        bestDailyStreak: parsed.bestDailyStreak ?? 0,
        explainerSeen: parsed.explainerSeen ?? false,
        championAttemptedDayKey: null,
        championClearedDayKey: null,
        stats: parsed.stats ?? defaultStats(),
      }
    }
    return {
      dayKey,
      opponentIds: Array.isArray(parsed.opponentIds) ? parsed.opponentIds : [],
      dailyCompleted: Array.isArray(parsed.dailyCompleted) ? parsed.dailyCompleted : [],
      dailyGhostAttempts:
        parsed.dailyGhostAttempts && typeof parsed.dailyGhostAttempts === 'object'
          ? (parsed.dailyGhostAttempts as Record<string, number>)
          : {},
      dailyStreak: parsed.dailyStreak ?? 0,
      bestDailyStreak: parsed.bestDailyStreak ?? 0,
      explainerSeen: parsed.explainerSeen ?? false,
      championAttemptedDayKey: parsed.championAttemptedDayKey ?? null,
      championClearedDayKey: parsed.championClearedDayKey ?? null,
      stats: parsed.stats ?? defaultStats(),
    }
  } catch {
    return {
      dayKey,
      opponentIds: [],
      dailyCompleted: [],
      dailyGhostAttempts: {},
      dailyStreak: 0,
      bestDailyStreak: 0,
      explainerSeen: false,
      championAttemptedDayKey: null,
      championClearedDayKey: null,
      stats: defaultStats(),
    }
  }
}

function saveOfflineState(state: OfflineState): void {
  localStorage.setItem(OFFLINE_STATE_KEY, JSON.stringify(state))
}

function pickSeeds(band: { min: number; max: number }, count: number): SeededGhostDef[] {
  const pool = seededGhostsInBand(band.min, band.max)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const picked: SeededGhostDef[] = []
  const usedSkills = new Set<string>()
  for (const seed of shuffled) {
    if (picked.length >= count) break
    if (usedSkills.has(seed.primarySkill) && picked.length < count - 1) continue
    picked.push(seed)
    usedSkills.add(seed.primarySkill)
  }
  for (const seed of shuffled) {
    if (picked.length >= count) break
    if (!picked.includes(seed)) picked.push(seed)
  }
  return picked.slice(0, count)
}

function snapshotToPayload(snap: GhostSnapshot): GhostSnapshotPayload {
  return {
    source: snap.source,
    id: snap.id,
    userId: snap.userId,
    handle: snap.handle,
    displayName: snap.displayName,
    archetype: snap.archetype,
    skills: snap.skills,
    movesEquipped: snap.movesEquipped,
    level: snap.level,
    buildType: snap.buildType,
    leanSkill: snap.leanSkill,
    buildName: snap.buildName,
    variantId: snap.variantId,
    isFullCharacter: snap.isFullCharacter,
    champion: snap.champion,
  }
}

/** Build a playable daily set from local seeds (dev / pre-deploy fallback). */
export function buildLocalGhostTrainingSync(): GhostTrainingSyncResponse {
  const dayKey = currentGhostDayKey()
  let state = loadOfflineState(dayKey)

  const playerLevel = computePlayerLevel(getPlayerSkills())
  const band = ghostLevelBand(playerLevel)

  if (state.opponentIds.length === 0) {
    const seeds = pickSeeds(band, 3)
    state = { ...state, opponentIds: seeds.map((s) => s.id) }
    saveOfflineState(state)
  }

  const opponents: GhostOpponentRef[] = state.opponentIds.map((id, slot) => ({
    source: 'seed',
    id,
    combatId: ghostCombatId('seed', id),
    slot,
  }))

  const snapshots = state.opponentIds
    .map((id) => {
      const seed = getSeededGhost(id)
      return seed ? snapshotToPayload(snapshotFromSeeded(seed)) : null
    })
    .filter((s): s is GhostSnapshotPayload => s != null)

  const championSnap = snapshotFromSeeded(AUTHORED_CHAMPION, true)

  return {
    dayKey,
    opponents,
    snapshots,
    champion: snapshotToPayload(championSnap),
    dailyCompleted: state.dailyCompleted,
    dailyGhostAttempts: state.dailyGhostAttempts,
    perGhostDailyCap: GHOST_DAILY_XP_BATTLE_CAP,
    dailyStreak: state.dailyStreak,
    bestDailyStreak: state.bestDailyStreak,
    championAttemptedToday: state.championAttemptedDayKey === dayKey,
    championClearedToday: state.championClearedDayKey === dayKey,
    usedSeedFallback: true,
    explainerSeen: state.explainerSeen,
    news: null,
    stats: state.stats,
    passiveXpToday: 0,
    passiveXpCap: 120,
    offline: true,
  }
}

export function recordLocalGhostMatch(payload: {
  combatId: string
  won: boolean
  flawless: boolean
  isChampion: boolean
  dailySlot?: number
}): { dailyCompleted: number[]; dailyGhostAttempts: Record<string, number>; xpEligible: boolean } {
  const dayKey = currentGhostDayKey()
  const state = loadOfflineState(dayKey)
  const stats = { ...state.stats }

  let dailyCompleted = [...state.dailyCompleted]
  const dailyGhostAttempts = { ...state.dailyGhostAttempts }
  if (payload.isChampion) {
    stats.ghostsFoughtTotal += 1
    if (payload.won) stats.ghostWins += 1
    else stats.ghostLosses += 1
    if (payload.won && payload.flawless) stats.flawlessWins += 1
    stats.championAttempts += 1
    if (payload.won) stats.championWins += 1
    saveOfflineState({
      ...state,
      stats,
      championAttemptedDayKey: dayKey,
      championClearedDayKey: payload.won ? dayKey : state.championClearedDayKey,
    })
    return { dailyCompleted, dailyGhostAttempts, xpEligible: true }
  }

  const priorAttempts = Math.max(0, Number(dailyGhostAttempts[payload.combatId] ?? 0))
  const xpEligible = priorAttempts < GHOST_DAILY_XP_BATTLE_CAP
  if (xpEligible) {
    dailyGhostAttempts[payload.combatId] = priorAttempts + 1
    stats.ghostsFoughtTotal += 1
    if (payload.won) stats.ghostWins += 1
    else stats.ghostLosses += 1
    if (payload.won && payload.flawless) stats.flawlessWins += 1
  }

  if (
    xpEligible &&
    payload.won &&
    payload.dailySlot != null &&
    !dailyCompleted.includes(payload.dailySlot)
  ) {
    dailyCompleted.push(payload.dailySlot)
  }

  let dailyStreak = state.dailyStreak
  let bestDailyStreak = state.bestDailyStreak
  let dailySetsCompleted = stats.dailySetsCompleted

  if (dailyCompleted.length >= DAILY_GHOST_SET_SIZE && state.dailyCompleted.length < DAILY_GHOST_SET_SIZE) {
    dailySetsCompleted += 1
    dailyStreak += 1
    bestDailyStreak = Math.max(bestDailyStreak, dailyStreak)
  }

  saveOfflineState({
    ...state,
    dailyCompleted,
    dailyGhostAttempts,
    dailyStreak,
    bestDailyStreak,
    stats: { ...stats, dailySetsCompleted },
  })

  return { dailyCompleted, dailyGhostAttempts, xpEligible }
}

export function markLocalExplainerSeen(): void {
  const dayKey = currentGhostDayKey()
  const state = loadOfflineState(dayKey)
  saveOfflineState({ ...state, explainerSeen: true })
}
