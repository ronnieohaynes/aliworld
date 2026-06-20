import {
  claimTheaterPremiereAttendance,
  syncTheaterAttendance,
  type TheaterAttendResponse,
} from '../lib/theaterAttendanceApi'
import { PREMIERE_ATTEND_THRESHOLD_SEC, getPremiereById } from '../data/theaterPremieres'
import { grantPlayerSkillXp } from './playerStore'
import { refreshPlayerGrants } from './grantsStore'
import { trackPremiereAttend } from '../lib/analytics'

const STORAGE_KEY = 'aliworld:theater:v1'

type TheaterLocal = {
  explainerSeen: boolean
  attendedPremiereIds: string[]
}

let attendedPremiereIds: string[] = []
let explainerSeen = false
let revision = 0
const listeners = new Set<() => void>()

function emit(): void {
  revision++
  for (const fn of listeners) fn()
}

function loadLocal(): TheaterLocal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { explainerSeen: false, attendedPremiereIds: [] }
    const parsed = JSON.parse(raw) as Partial<TheaterLocal>
    return {
      explainerSeen: parsed.explainerSeen === true,
      attendedPremiereIds: Array.isArray(parsed.attendedPremiereIds)
        ? parsed.attendedPremiereIds.filter((id) => typeof id === 'string')
        : [],
    }
  } catch {
    return { explainerSeen: false, attendedPremiereIds: [] }
  }
}

function saveLocal(patch: Partial<TheaterLocal>): void {
  const next = { ...loadLocal(), ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function mergeAttended(ids: string[]): void {
  const set = new Set([...attendedPremiereIds, ...ids])
  attendedPremiereIds = [...set]
  saveLocal({ attendedPremiereIds })
  emit()
}

export function getTheaterRevision(): number {
  return revision
}

export function subscribeTheaterStore(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function isTheaterExplainerSeen(): boolean {
  return explainerSeen
}

export function markTheaterExplainerSeen(): void {
  if (explainerSeen) return
  explainerSeen = true
  saveLocal({ explainerSeen: true })
  emit()
}

export function hasAttendedPremiere(premiereId: string): boolean {
  return attendedPremiereIds.includes(premiereId)
}

export function getAttendedPremiereIds(): readonly string[] {
  return attendedPremiereIds
}

/** Hydrate attended ids from server; falls back to local cache when offline. */
export async function refreshTheaterAttendance(): Promise<void> {
  const local = loadLocal()
  attendedPremiereIds = [...local.attendedPremiereIds]
  explainerSeen = local.explainerSeen
  emit()

  try {
    const data = await syncTheaterAttendance()
    if (data.attendedPremiereIds.length > 0) {
      mergeAttended(data.attendedPremiereIds)
    }
  } catch {
    // keep local cache
  }
}

function applyLocalAttendanceFallback(premiereId: string): TheaterAttendResponse {
  const premiere = getPremiereById(premiereId)
  const rewardXp = premiere?.rewardXp ?? 0
  if (attendedPremiereIds.includes(premiereId)) {
    return {
      granted: false,
      alreadyAttended: true,
      premiereId,
      rewardXp,
      offline: true,
    }
  }
  mergeAttended([premiereId])
  return {
    granted: true,
    alreadyAttended: false,
    premiereId,
    rewardXp,
    skinGranted: premiere?.eventSkinVariantId ?? null,
    loyaltySealHook: premiere?.loyaltySealHook ?? null,
    printsQueued: premiere?.rewardPrints ?? 0,
    offline: true,
  }
}

/** Grant XP on first genuine premiere attendance; server is source of truth when available. */
export async function tryClaimPremiereAttendance(
  premiereId: string,
  watchedSeconds: number,
): Promise<TheaterAttendResponse | null> {
  if (watchedSeconds < PREMIERE_ATTEND_THRESHOLD_SEC) return null
  if (attendedPremiereIds.includes(premiereId)) return null

  let result: TheaterAttendResponse
  try {
    result = await claimTheaterPremiereAttendance(premiereId, watchedSeconds)
  } catch {
    result = applyLocalAttendanceFallback(premiereId)
  }

  if (result.alreadyAttended || attendedPremiereIds.includes(premiereId)) {
    mergeAttended([premiereId])
    return result
  }

  if (!result.granted) return result

  mergeAttended([premiereId])

  if (result.rewardXp > 0) {
    grantPlayerSkillXp('luck', result.rewardXp)
  }

  trackPremiereAttend(premiereId, {
    rewardXp: result.rewardXp,
    skinGranted: result.skinGranted ?? undefined,
    offline: result.offline === true,
  })

  if (result.loyaltySealHook) {
    // Future loyalty / presence seal rail.
    console.debug('[theater] loyalty seal hook', result.loyaltySealHook)
  }

  if (!result.offline) {
    void refreshPlayerGrants()
  }

  emit()
  return result
}

// bootstrap from localStorage on module load
{
  const local = loadLocal()
  attendedPremiereIds = [...local.attendedPremiereIds]
  explainerSeen = local.explainerSeen
}
