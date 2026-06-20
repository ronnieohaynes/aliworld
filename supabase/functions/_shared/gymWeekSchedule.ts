/**
 * Global gym week schedule — one deadline for every player on earth.
 *
 * Week runs Monday 00:00 → Sunday 21:00 America/Los_Angeles (PT, DST-aware).
 * After Sunday 21:00 PT until the next Monday 00:00 PT: week is "completed"
 * (frozen standings, practice only). Monday 00:00 PT opens the next week.
 *
 * First confirmed deadline: Sunday June 21, 2026 at 9:00 PM Pacific.
 *
 * Keep in sync with src/data/gymWeeks.ts consumers and gym-leaderboard edge.
 */

export const GYM_WEEK_TIMEZONE = 'America/Los_Angeles'
export const GYM_WEEK_DEADLINE_HOUR = 21
export const GYM_WEEK_DEADLINE_MINUTE = 0

/** Sunday June 21, 2026 21:00 Pacific — first live weekly deadline. */
export const GYM_WEEK_FIRST_DEADLINE_MS = zonedTimeToUtcMs(
  2026,
  6,
  21,
  GYM_WEEK_DEADLINE_HOUR,
  GYM_WEEK_DEADLINE_MINUTE,
  0,
  GYM_WEEK_TIMEZONE,
)

/** Mon 00:00 PT → Sun 21:00 PT = 165 hours of scored week time. */
const MS_MON_MIDNIGHT_TO_SUN_DEADLINE =
  (6 * 24 + GYM_WEEK_DEADLINE_HOUR) * 60 * 60 * 1000 +
  GYM_WEEK_DEADLINE_MINUTE * 60 * 1000

/** Calendar gap from one Monday 00:00 PT to the next (7 days). */
export const MS_PER_GYM_WEEK = 7 * 24 * 60 * 60 * 1000

export type GymWeekPhase = 'active' | 'completed'

export type GymWeekWindow = {
  weekIndex: number
  phase: GymWeekPhase
  weekStartMs: number
  deadlineMs: number
  nextWeekStartMs: number
  /** ISO timestamps for leaderboard RPC (inclusive since, exclusive until). */
  sinceIso: string
  untilIso: string | null
  frozen: boolean
}

type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  }
}

/** Convert a local wall-clock instant in `timeZone` to UTC epoch ms. */
export function zonedTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): number {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second)
  for (let i = 0; i < 4; i += 1) {
    const got = zonedParts(new Date(utc), timeZone)
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second)
    const gotAsUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second)
    utc += desiredAsUtc - gotAsUtc
  }
  return utc
}

export function getGymWeekStartMs(weekIndex: number): number {
  const firstStart = GYM_WEEK_FIRST_DEADLINE_MS - MS_MON_MIDNIGHT_TO_SUN_DEADLINE
  return firstStart + weekIndex * MS_PER_GYM_WEEK
}

export function getGymWeekDeadlineMs(weekIndex: number): number {
  return getGymWeekStartMs(weekIndex) + MS_MON_MIDNIGHT_TO_SUN_DEADLINE
}

export function getAbsoluteWeekIndex(nowMs = Date.now()): number {
  const firstStart = getGymWeekStartMs(0)
  if (nowMs < firstStart) return 0
  return Math.floor((nowMs - firstStart) / MS_PER_GYM_WEEK)
}

export function getGymWeekPhase(nowMs = Date.now()): GymWeekPhase {
  const idx = getAbsoluteWeekIndex(nowMs)
  const deadline = getGymWeekDeadlineMs(idx)
  const nextStart = getGymWeekStartMs(idx + 1)
  if (nowMs >= deadline && nowMs < nextStart) return 'completed'
  return 'active'
}

export function isGymWeekScoringOpen(nowMs = Date.now()): boolean {
  const idx = getAbsoluteWeekIndex(nowMs)
  if (nowMs < getGymWeekStartMs(idx)) return false
  return getGymWeekPhase(nowMs) === 'active'
}

export function getGymWeekCountdownTargetMs(nowMs = Date.now()): number | null {
  if (getGymWeekPhase(nowMs) !== 'active') return null
  return getGymWeekDeadlineMs(getAbsoluteWeekIndex(nowMs))
}

export function getGymWeekRemainingMs(nowMs = Date.now()): number {
  const target = getGymWeekCountdownTargetMs(nowMs)
  if (target == null) return 0
  return Math.max(0, target - nowMs)
}

export function formatGymWeekCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '0m'
  const totalMin = Math.floor(remainingMs / 60_000)
  const days = Math.floor(totalMin / (24 * 60))
  const hours = Math.floor((totalMin % (24 * 60)) / 60)
  const mins = totalMin % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${mins}m`)
  return parts.join(' ')
}

export function getGymWeekWindow(nowMs = Date.now()): GymWeekWindow {
  const weekIndex = getAbsoluteWeekIndex(nowMs)
  const phase = getGymWeekPhase(nowMs)
  const weekStartMs = getGymWeekStartMs(weekIndex)
  const deadlineMs = getGymWeekDeadlineMs(weekIndex)
  const nextWeekStartMs = getGymWeekStartMs(weekIndex + 1)
  const frozen = phase === 'completed'
  return {
    weekIndex,
    phase,
    weekStartMs,
    deadlineMs,
    nextWeekStartMs,
    sinceIso: new Date(weekStartMs).toISOString(),
    untilIso: frozen ? new Date(deadlineMs).toISOString() : null,
    frozen,
  }
}
