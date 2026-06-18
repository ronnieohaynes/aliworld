import { supabase } from './supabaseClient'

export type GhostOpponentRef = {
  source: 'real' | 'seed' | 'champion'
  id: string
  combatId: string
  slot: number
}

export type GhostSnapshotPayload = {
  source: 'real' | 'seed' | 'champion'
  id: string
  userId?: string
  handle: string
  displayName: string
  archetype: string
  skills: Record<string, { level: number; xp: number }>
  movesEquipped: string[]
  level: number
  buildType: string | null
  leanSkill: string
  buildName: string
  variantId: string
  isFullCharacter?: boolean
  champion?: boolean
}

export type GhostTrainingSyncResponse = {
  dayKey: string
  opponents: GhostOpponentRef[]
  snapshots: GhostSnapshotPayload[]
  champion: GhostSnapshotPayload
  dailyCompleted: number[]
  dailyStreak: number
  bestDailyStreak: number
  championAttemptedToday: boolean
  championClearedToday: boolean
  usedSeedFallback: boolean
  explainerSeen: boolean
  news: { wins: number; losses: number; total: number } | null
  stats: {
    ghostsFoughtTotal: number
    ghostWins: number
    ghostLosses: number
    flawlessWins: number
    championAttempts: number
    championWins: number
    dailySetsCompleted: number
    yourGhostWins: number
    yourGhostLosses: number
    yourGhostServed: number
  }
  passiveXpToday: number
  passiveXpCap: number
}

export type GhostRecordMatchRequest = {
  combatId: string
  won: boolean
  flawless?: boolean
  isChampion?: boolean
  dailySlot?: number
}

export type GhostRecordMatchResponse = {
  ok: boolean
  dailyCompleted: number[]
  championBadgeGranted?: boolean
  fighterPassiveXp?: number
}

function endpoint(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  if (!base) throw new Error('Missing VITE_SUPABASE_URL')
  return `${base.replace(/\/$/, '')}/functions/v1/ghost-training`
}

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sign in required for ghost training')
  }
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!anonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY')
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  }
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let message = `Ghost training request failed (${res.status})`
    try {
      const errBody = (await res.json()) as { error?: string }
      if (errBody.error) message = errBody.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

/** Harvest ghost from server profile + refresh daily set. */
export async function syncGhostTraining(): Promise<GhostTrainingSyncResponse> {
  return post({ action: 'sync' })
}

export async function recordGhostMatch(
  payload: GhostRecordMatchRequest,
): Promise<GhostRecordMatchResponse> {
  return post({ action: 'record_match', ...payload })
}

export async function dismissGhostNews(): Promise<void> {
  await post({ action: 'dismiss_news' })
}

export async function markGhostExplainerSeen(): Promise<void> {
  await post({ action: 'mark_explainer' })
}
