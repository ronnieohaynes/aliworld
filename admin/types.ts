export type DayCount = {
  day: string
  count: number
}

export type AnalyticsSummary = {
  dau: DayCount[]
  signups: DayCount[]
  avgSessionMinutes: number
  questDropoff: { step: string; players: number }[]
  episodeCompletion: { episode: string; players: number }[]
  buildPopularity: { build: string; players: number }[]
  battleStats: {
    enemy: string
    wins: number
    losses: number
    avgTurns: number | null
  }[]
  funnelClicks: { destination: string; clicks: number }[]
  theaterOpens: number
}

export type AdminUserRow = {
  user_id: string
  email: string
  handle: string | null
  level: number
  joined: string
}

export type AdminUserDetail = {
  user_id: string
  email: string
  handle: string | null
  created: string | null
  last_sign_in: string | null
  last_played_at: string | null
  level: number
  skills: Record<string, { level: number; xp: number }>
  equipped_moves: unknown
  moves_unlocked: unknown
  current_episode: number
  episodes_completed: unknown
  quest1: unknown
  quest2: unknown
  world_memory: unknown
  artifacts: unknown
  event_count: number
  last_seen: string | null
}

export type EmailSignupRow = {
  email: string
  created_at: string
}

export type CombinedEmailRow = {
  email: string
  source: 'account' | 'signup'
  created_at: string
}

export type RecentEventRow = {
  id: string
  ts: string
  type: string
  metadata: unknown
  user_id: string | null
  handle: string | null
}

export type AdminTabId = 'overview' | 'users' | 'emails' | 'events' | 'ops'

export function isAnalyticsEmpty(summary: AnalyticsSummary): boolean {
  return (
    summary.dau.length === 0 &&
    summary.signups.length === 0 &&
    summary.questDropoff.length === 0 &&
    summary.episodeCompletion.length === 0 &&
    summary.buildPopularity.length === 0 &&
    summary.battleStats.length === 0 &&
    summary.funnelClicks.length === 0 &&
    summary.theaterOpens === 0
  )
}
