/**
 * Weekly gym gauntlet, one-run four-fight progress, streak, and calendar rotation.
 */

import {
  getAbsoluteWeekIndex,
  getCurrentGymWeek,
  getGymLeaderFightIndex,
  getGymRunCombatId,
  getGymWeekById,
  getRetiredGymWeeks,
  gymWeekUsesClearCountScoring,
  isCurrentGymWeek,
  type GymWeekDefinition,
} from '../data/gymWeeks'
import { isGymWeekScoringOpen } from '../data/gymWeekSchedule'

const STORAGE_KEY = 'aliworld:gym:v2'
const LEGACY_STORAGE_KEY = 'aliworld:gym:v1'
const LEGACY_QUEST1_STORAGE_KEY = 'aliworld:quest1-five:v1'

export const FIVE_GYM1_ID = '5ive-gym1'

export type GymActiveRun = {
  weekId: string
  /** 0–3 henchman index or leader at 3 */
  fightIndex: number
  /** Practice replays, no rewards */
  practice: boolean
}

type GymState = {
  oceanviewGymVisited: boolean
  weeklyGauntletExplainerSeen: boolean
  /** Absolute calendar week index last synced (rollover + streak step-back). */
  trackedAbsoluteWeek: number | null
  /** Absolute week indices cleared for full reward. */
  clearedAbsoluteWeeks: number[]
  weeklyStreak: number
  activeRun: GymActiveRun | null
}

export type GymSerialized = {
  oceanviewGymVisited?: boolean
  weeklyGauntletExplainerSeen?: boolean
  trackedAbsoluteWeek?: number | null
  clearedAbsoluteWeeks?: number[]
  weeklyStreak?: number
  activeRun?: GymActiveRun | null
  /** @deprecated legacy cumulative wins, migrated on load */
  headWins?: Record<string, number>
  clearedHeads?: Record<string, boolean>
}

function emptyGymState(): GymState {
  return {
    oceanviewGymVisited: false,
    weeklyGauntletExplainerSeen: false,
    trackedAbsoluteWeek: null,
    clearedAbsoluteWeeks: [],
    weeklyStreak: 0,
    activeRun: null,
  }
}

function normalizeClearedWeeks(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const out: number[] = []
  for (const val of raw) {
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      out.push(Math.floor(val))
    }
  }
  return [...new Set(out)].sort((a, b) => a - b)
}

function normalizeActiveRun(raw: unknown): GymActiveRun | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<GymActiveRun>
  if (typeof o.weekId !== 'string' || !getGymWeekById(o.weekId)) return null
  const week = getGymWeekById(o.weekId)!
  const maxFightIndex = getGymLeaderFightIndex(week)
  const fightIndex =
    typeof o.fightIndex === 'number' && o.fightIndex >= 0 && o.fightIndex <= maxFightIndex
      ? Math.floor(o.fightIndex)
      : 0
  return sanitizeActiveRunForCalendar(
    {
      weekId: o.weekId,
      fightIndex,
      practice: o.practice === true,
    },
    Date.now(),
  )
}

function reconcileActiveRun(nowMs = Date.now()): GymActiveRun | null {
  const run = sanitizeActiveRunForCalendar(state.activeRun, nowMs)
  if (run !== state.activeRun) {
    state = { ...state, activeRun: run }
    saveGymToStorage()
    emit()
  }
  return run
}

/** Drop stale in-progress runs that don't match the live calendar week. */
function sanitizeActiveRunForCalendar(
  activeRun: GymActiveRun | null,
  nowMs = Date.now(),
): GymActiveRun | null {
  if (!activeRun) return null
  if (!getGymWeekById(activeRun.weekId)) return null

  const currentWeek = getCurrentGymWeek(nowMs)

  if (!activeRun.practice) {
    if (activeRun.weekId !== currentWeek.id || !isGymWeekScoringOpen(nowMs)) {
      return null
    }
    return activeRun
  }

  if (activeRun.weekId === currentWeek.id) return activeRun
  if (getRetiredGymWeeks(nowMs).some((week) => week.id === activeRun.weekId)) {
    return activeRun
  }
  return null
}

function migrateLegacyClears(parsed: Partial<GymSerialized>): number[] {
  const cleared: number[] = []
  if (parsed.clearedHeads?.[FIVE_GYM1_ID] === true) {
    cleared.push(0)
  }
  const legacyWins = parsed.headWins?.[FIVE_GYM1_ID]
  if (typeof legacyWins === 'number' && legacyWins >= 3) {
    if (!cleared.includes(0)) cleared.push(0)
  }
  try {
    const legacyRaw = localStorage.getItem(LEGACY_QUEST1_STORAGE_KEY)
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw) as {
        gymTier1Cleared?: boolean
        gym5ive1Cleared?: boolean
      }
      if (legacyParsed.gym5ive1Cleared === true || legacyParsed.gymTier1Cleared === true) {
        if (!cleared.includes(0)) cleared.push(0)
      }
    }
  } catch {
    // ignore
  }
  return cleared
}

function loadGymFromStorage(): GymState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const o = parsed as GymSerialized
        const legacyClears = migrateLegacyClears(o)
        const clearedAbsoluteWeeks = [
          ...new Set([...normalizeClearedWeeks(o.clearedAbsoluteWeeks), ...legacyClears]),
        ].sort((a, b) => a - b)
        return syncWeeklyCalendar({
          oceanviewGymVisited: o.oceanviewGymVisited === true,
          weeklyGauntletExplainerSeen: o.weeklyGauntletExplainerSeen === true,
          trackedAbsoluteWeek:
            typeof o.trackedAbsoluteWeek === 'number' ? o.trackedAbsoluteWeek : null,
          clearedAbsoluteWeeks,
          weeklyStreak:
            typeof o.weeklyStreak === 'number' && o.weeklyStreak >= 0
              ? Math.floor(o.weeklyStreak)
              : 0,
          activeRun: normalizeActiveRun(o.activeRun),
        })
      }
    }
  } catch {
    // ignore
  }

  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const parsed: unknown = JSON.parse(legacyRaw)
      if (parsed && typeof parsed === 'object') {
        const o = parsed as GymSerialized
        const legacyClears = migrateLegacyClears(o)
        return syncWeeklyCalendar({
          ...emptyGymState(),
          oceanviewGymVisited: o.oceanviewGymVisited === true,
          clearedAbsoluteWeeks: legacyClears,
        })
      }
    }
  } catch {
    // ignore
  }

  return syncWeeklyCalendar(emptyGymState())
}

function saveGymToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

let state: GymState = loadGymFromStorage()
let storeRevision = 0
const listeners = new Set<() => void>()

function emit(): void {
  storeRevision++
  for (const listener of listeners) {
    listener()
  }
}

export function getGymRevision(): number {
  return storeRevision
}

export function subscribeGymStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Advance calendar week, step streak back if prior week uncleared. */
export function syncWeeklyCalendar(input: GymState = state, nowMs = Date.now()): GymState {
  const abs = getAbsoluteWeekIndex(nowMs)
  let next = { ...input }

  if (next.trackedAbsoluteWeek == null) {
    next.trackedAbsoluteWeek = abs
    next.activeRun = sanitizeActiveRunForCalendar(next.activeRun, nowMs)
    return next
  }

  if (abs <= next.trackedAbsoluteWeek) {
    next.activeRun = sanitizeActiveRunForCalendar(next.activeRun, nowMs)
    return next
  }

  for (let w = next.trackedAbsoluteWeek; w < abs; w += 1) {
    if (!next.clearedAbsoluteWeeks.includes(w)) {
      next = {
        ...next,
        weeklyStreak: Math.max(0, next.weeklyStreak - 1),
      }
    }
  }

  next.trackedAbsoluteWeek = abs
  next.activeRun = sanitizeActiveRunForCalendar(next.activeRun, nowMs)
  return next
}

export function refreshWeeklyGymCalendar(nowMs = Date.now()): void {
  const synced = syncWeeklyCalendar(state, nowMs)
  if (
    synced.trackedAbsoluteWeek === state.trackedAbsoluteWeek &&
    synced.weeklyStreak === state.weeklyStreak &&
    synced.activeRun === state.activeRun &&
    synced.clearedAbsoluteWeeks === state.clearedAbsoluteWeeks
  ) {
    return
  }
  state = synced
  saveGymToStorage()
  emit()
}

/** Persist dropping a stale in-progress run (e.g. after week rollover). */
export function invalidateStaleGymRun(nowMs = Date.now()): void {
  refreshWeeklyGymCalendar(nowMs)
}

export function isOceanviewGymVisited(): boolean {
  return state.oceanviewGymVisited
}

export function setOceanviewGymVisited(): void {
  if (state.oceanviewGymVisited) return
  state = { ...state, oceanviewGymVisited: true }
  saveGymToStorage()
  emit()
}

export function isWeeklyGauntletExplainerSeen(): boolean {
  return state.weeklyGauntletExplainerSeen
}

export function setWeeklyGauntletExplainerSeen(): void {
  if (state.weeklyGauntletExplainerSeen) return
  state = { ...state, weeklyGauntletExplainerSeen: true }
  saveGymToStorage()
  emit()
}

export function getWeeklyStreak(): number {
  return state.weeklyStreak
}

export function getActiveGymRun(): GymActiveRun | null {
  const run = reconcileActiveRun()
  return run ? { ...run } : null
}

export function getCurrentAbsoluteWeekIndex(nowMs = Date.now()): number {
  refreshWeeklyGymCalendar(nowMs)
  return getAbsoluteWeekIndex(nowMs)
}

export function isCurrentWeeklyGymCleared(nowMs = Date.now()): boolean {
  refreshWeeklyGymCalendar(nowMs)
  return state.clearedAbsoluteWeeks.includes(getAbsoluteWeekIndex(nowMs))
}

export function canStartScoredGymRun(nowMs = Date.now()): boolean {
  refreshWeeklyGymCalendar(nowMs)
  if (!isGymWeekScoringOpen(nowMs)) return false
  const week = getCurrentGymWeek(nowMs)
  if (gymWeekUsesClearCountScoring(week)) return true
  return !isCurrentWeeklyGymCleared(nowMs)
}

/** @deprecated, use isCurrentWeeklyGymCleared */
export function isGym5ive1Cleared(nowMs = Date.now()): boolean {
  return isCurrentWeeklyGymCleared(nowMs)
}

/** @deprecated, weekly gauntlet has no cumulative wins */
export function getGymHeadWins(_headId: string): number {
  return 0
}

export function isGymHeadCleared(_headId: string): boolean {
  return isCurrentWeeklyGymCleared()
}

export function beginGymRun(weekId: string, practice: boolean, nowMs = Date.now()): GymActiveRun | null {
  refreshWeeklyGymCalendar(nowMs)
  const week = getGymWeekById(weekId)
  if (!week) return null

  if (practice) {
    const retired = getRetiredGymWeeks(nowMs)
    const isLiveWeek = isCurrentGymWeek(weekId, nowMs)
    if (!isLiveWeek && !retired.some((w) => w.id === weekId)) return null
  } else {
    if (!isCurrentGymWeek(weekId, nowMs)) return null
    if (!isGymWeekScoringOpen(nowMs)) return null
    const alreadyCleared = isCurrentWeeklyGymCleared(nowMs)
    if (alreadyCleared && !gymWeekUsesClearCountScoring(week)) return null
  }

  const run: GymActiveRun = { weekId, fightIndex: 0, practice }
  state = { ...state, activeRun: run }
  saveGymToStorage()
  emit()
  return { ...run }
}

export function restartGymRun(): GymActiveRun | null {
  const run = reconcileActiveRun()
  if (!run) return null
  const nextRun: GymActiveRun = { ...run, fightIndex: 0 }
  state = { ...state, activeRun: nextRun }
  saveGymToStorage()
  emit()
  return { ...nextRun }
}

export function getActiveGymRunCombatId(): string | null {
  const run = reconcileActiveRun()
  if (!run) return null
  const week = getGymWeekById(run.weekId)
  if (!week) return null
  return getGymRunCombatId(week, run.fightIndex)
}

export function getActiveGymWeek(): GymWeekDefinition | null {
  const run = reconcileActiveRun()
  if (!run) return null
  return getGymWeekById(run.weekId) ?? null
}

/** After a gauntlet fight win, returns next combat id or null when run complete. */
export function advanceGymRunAfterWin(): {
  nextCombatId: string | null
  completed: boolean
  run: GymActiveRun
} | null {
  const run = reconcileActiveRun()
  if (!run) return null
  const week = getGymWeekById(run.weekId)
  if (!week) return null

  const leaderIndex = getGymLeaderFightIndex(week)
  if (run.fightIndex >= leaderIndex) {
    return { nextCombatId: null, completed: true, run: { ...run } }
  }

  const nextIndex = run.fightIndex + 1
  const nextRun: GymActiveRun = { ...run, fightIndex: nextIndex }
  state = { ...state, activeRun: nextRun }
  saveGymToStorage()
  emit()
  return {
    nextCombatId: getGymRunCombatId(week, nextIndex),
    completed: false,
    run: nextRun,
  }
}

/** Loss ends the run, must restart from henchman 1 on next attempt. */
export function resetGymRunOnLoss(): void {
  if (!state.activeRun) return
  state = { ...state, activeRun: null }
  saveGymToStorage()
  emit()
}

export type GymWeekClearResult = {
  weekId: string
  absoluteWeekIndex: number
  streak: number
  practice: boolean
  /** First scored clear this calendar week (seal + bonus rewards). */
  firstClear: boolean
}

/** Mark current-week gauntlet cleared; updates streak on first clear. No-op for practice. */
export function recordWeeklyGymClear(nowMs = Date.now()): GymWeekClearResult | null {
  const run = reconcileActiveRun(nowMs)
  if (!run || run.practice) return null
  if (!isCurrentGymWeek(run.weekId, nowMs)) return null
  if (!isGymWeekScoringOpen(nowMs)) return null

  const week = getGymWeekById(run.weekId)
  if (!week) return null

  const abs = getAbsoluteWeekIndex(nowMs)
  const firstClear = !state.clearedAbsoluteWeeks.includes(abs)

  let streak = state.weeklyStreak
  if (firstClear) {
    const prevCleared = state.clearedAbsoluteWeeks.filter((w) => w < abs).pop()
    if (prevCleared == null) {
      streak = 1
    } else if (prevCleared === abs - 1) {
      streak += 1
    } else {
      const missed = abs - prevCleared - 1
      streak = Math.max(0, streak - missed) + 1
    }
  }

  state = {
    ...state,
    clearedAbsoluteWeeks: firstClear
      ? [...state.clearedAbsoluteWeeks, abs].sort((a, b) => a - b)
      : state.clearedAbsoluteWeeks,
    weeklyStreak: streak,
    activeRun: null,
  }
  saveGymToStorage()
  emit()

  return {
    weekId: run.weekId,
    absoluteWeekIndex: abs,
    streak,
    practice: false,
    firstClear,
  }
}

export function clearActiveGymRun(): void {
  if (!state.activeRun) return
  state = { ...state, activeRun: null }
  saveGymToStorage()
  emit()
}

export function serialize(): GymSerialized {
  return {
    oceanviewGymVisited: state.oceanviewGymVisited,
    weeklyGauntletExplainerSeen: state.weeklyGauntletExplainerSeen,
    trackedAbsoluteWeek: state.trackedAbsoluteWeek,
    clearedAbsoluteWeeks: [...state.clearedAbsoluteWeeks],
    weeklyStreak: state.weeklyStreak,
    activeRun: state.activeRun ? { ...state.activeRun } : null,
  }
}

export function applyState(data: Partial<GymSerialized>): void {
  const legacyClears = migrateLegacyClears(data)
  state = syncWeeklyCalendar({
    oceanviewGymVisited: data.oceanviewGymVisited === true,
    weeklyGauntletExplainerSeen: data.weeklyGauntletExplainerSeen === true,
    trackedAbsoluteWeek:
      typeof data.trackedAbsoluteWeek === 'number' ? data.trackedAbsoluteWeek : null,
    clearedAbsoluteWeeks: [
      ...new Set([
        ...normalizeClearedWeeks(data.clearedAbsoluteWeeks),
        ...legacyClears,
      ]),
    ].sort((a, b) => a - b),
    weeklyStreak:
      typeof data.weeklyStreak === 'number' && data.weeklyStreak >= 0
        ? Math.floor(data.weeklyStreak)
        : 0,
    activeRun: normalizeActiveRun(data.activeRun),
  })
  saveGymToStorage()
  emit()
}

export function resetState(): void {
  state = emptyGymState()
  saveGymToStorage()
  emit()
}
