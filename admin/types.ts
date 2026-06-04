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
  email: string
  handle: string | null
  level: number
  joined: string
}

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
