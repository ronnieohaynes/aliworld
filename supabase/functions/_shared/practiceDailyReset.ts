/** Edge-safe duplicate of src/data/practiceDailyReset.ts */

export const GHOST_DAILY_EPOCH_MS = Date.parse('2026-05-26T09:00:00.000Z')
export const MS_PER_GHOST_DAY = 24 * 60 * 60 * 1000

export function currentPracticeDayKey(nowMs = Date.now()): string {
  if (nowMs < GHOST_DAILY_EPOCH_MS) {
    return new Date(GHOST_DAILY_EPOCH_MS).toISOString().slice(0, 10)
  }
  const dayIndex = Math.floor((nowMs - GHOST_DAILY_EPOCH_MS) / MS_PER_GHOST_DAY)
  const periodStart = new Date(GHOST_DAILY_EPOCH_MS + dayIndex * MS_PER_GHOST_DAY)
  return periodStart.toISOString().slice(0, 10)
}

export const PRACTICE_COMBAT_XP_DAILY_CAP = 360
export const PRACTICE_COMBAT_XP_DIMINISHED_MULT = 0.12
export const PRACTICE_COMBAT_XP_SOFT_OVERFLOW = 72

export function practiceXpRemainingRoom(xpToday: number): number {
  const hardStop = PRACTICE_COMBAT_XP_DAILY_CAP + PRACTICE_COMBAT_XP_SOFT_OVERFLOW
  if (xpToday >= hardStop) return 0
  const { xpAfter } = practiceXpGrantFromRaw(xpToday, 100_000)
  return Math.max(0, xpAfter - xpToday)
}

export function practiceXpGrantFromRaw(
  xpToday: number,
  rawXp: number,
): { granted: number; xpAfter: number } {
  const raw = Math.max(0, Math.floor(rawXp))
  if (raw <= 0) return { granted: 0, xpAfter: xpToday }

  const hardStop = PRACTICE_COMBAT_XP_DAILY_CAP + PRACTICE_COMBAT_XP_SOFT_OVERFLOW
  if (xpToday >= hardStop) return { granted: 0, xpAfter: xpToday }

  let granted = 0
  let tally = xpToday

  const fullHeadroom = Math.max(0, PRACTICE_COMBAT_XP_DAILY_CAP - tally)
  const fullPart = Math.min(raw, fullHeadroom)
  granted += fullPart
  tally += fullPart

  const remaining = raw - fullPart
  if (remaining > 0 && tally < hardStop) {
    const dimCap = PRACTICE_COMBAT_XP_SOFT_OVERFLOW
    const dimUsed = Math.max(0, tally - PRACTICE_COMBAT_XP_DAILY_CAP)
    const dimHeadroom = Math.max(0, dimCap - dimUsed)
    const dimRaw = Math.min(remaining, dimHeadroom)
    granted += Math.floor(dimRaw * PRACTICE_COMBAT_XP_DIMINISHED_MULT)
    tally += dimRaw
  }

  return { granted, xpAfter: tally }
}
