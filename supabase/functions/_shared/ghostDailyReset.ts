/** Edge-safe duplicate of src/data/ghostDailyReset.ts */

export const GHOST_DAILY_EPOCH_MS = Date.parse('2026-05-26T09:00:00.000Z')
export const MS_PER_GHOST_DAY = 24 * 60 * 60 * 1000

export function currentGhostDayKey(nowMs = Date.now()): string {
  if (nowMs < GHOST_DAILY_EPOCH_MS) {
    return new Date(GHOST_DAILY_EPOCH_MS).toISOString().slice(0, 10)
  }
  const dayIndex = Math.floor((nowMs - GHOST_DAILY_EPOCH_MS) / MS_PER_GHOST_DAY)
  const periodStart = new Date(GHOST_DAILY_EPOCH_MS + dayIndex * MS_PER_GHOST_DAY)
  return periodStart.toISOString().slice(0, 10)
}

export function ghostLevelBand(level: number): { min: number; max: number } {
  const clamped = Math.max(1, Math.floor(level))
  const min = Math.floor((clamped - 1) / 5) * 5 + 1
  return { min, max: min + 4 }
}

export function levelInGhostBand(level: number, band: { min: number; max: number }): boolean {
  return level >= band.min && level <= band.max
}

export const PASSIVE_XP_DAILY_CAP = 120
export const PASSIVE_XP_PER_GHOST_WIN = 8
export const DAILY_SET_SIZE = 3
export const GHOST_DAILY_XP_BATTLE_CAP = 3
