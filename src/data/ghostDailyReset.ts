/** Daily ghost-training reset, aligned with gym week epoch (Mon 09:00 UTC cadence). */

export const GHOST_DAILY_EPOCH_MS = Date.parse('2026-05-26T09:00:00.000Z')
export const MS_PER_GHOST_DAY = 24 * 60 * 60 * 1000

/** UTC day key for the current ghost-training period (YYYY-MM-DD at epoch boundary). */
export function currentGhostDayKey(nowMs = Date.now()): string {
  if (nowMs < GHOST_DAILY_EPOCH_MS) {
    return new Date(GHOST_DAILY_EPOCH_MS).toISOString().slice(0, 10)
  }
  const dayIndex = Math.floor((nowMs - GHOST_DAILY_EPOCH_MS) / MS_PER_GHOST_DAY)
  const periodStart = new Date(GHOST_DAILY_EPOCH_MS + dayIndex * MS_PER_GHOST_DAY)
  return periodStart.toISOString().slice(0, 10)
}

/** Seekable level range around the player — variety without brutal mismatch. */
export function ghostLevelBand(level: number): { min: number; max: number } {
  const clamped = Math.max(1, Math.floor(level))
  return { min: Math.max(1, clamped - 2), max: clamped + 3 }
}

export function levelInGhostBand(level: number, band: { min: number; max: number }): boolean {
  return level >= band.min && level <= band.max
}

/** Daily ghost set count presented to players. */
export const DAILY_GHOST_SET_SIZE = 3

/** Per-ghost daily cap: 1 full-prize fight + 2 grind rebattles. */
export const GHOST_DAILY_XP_BATTLE_CAP = 3

/** Passive skill XP granted on a first-win bonus fight (full prize). */
export const GHOST_FULL_PRIZE_XP = 16

/** Passive skill XP on grind rebattles (wins only). */
export const GHOST_GRIND_XP = 5

/** Added passive XP on champion win (opt-in, separate from daily set). */
export const GHOST_CHAMPION_BONUS_XP = 24

export type GhostFightTier = 'full' | 'grind' | 'champion'

export function ghostFightTierForAttempt(
  priorAttempts: number,
  isChampion: boolean,
): GhostFightTier | null {
  if (isChampion) return 'champion'
  if (priorAttempts >= GHOST_DAILY_XP_BATTLE_CAP) return null
  return priorAttempts === 0 ? 'full' : 'grind'
}
