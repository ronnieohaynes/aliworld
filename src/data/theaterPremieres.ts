import type { MidnightVariantId } from './midnightVariants'

/** Dev preview + post-e2 drop. Off on production until the theater ships. */
export const THEATER_ENABLED = true

/** Minimum seconds in a live slot before attendance counts. */
export const PREMIERE_ATTEND_THRESHOLD_SEC = 45

/** Each daily slot window length (ms). */
export const PREMIERE_SLOT_DURATION_MS = 90 * 60 * 1000

export type TheaterPremiere = {
  id: string
  title: string
  youtubeId: string
  /** UTC date string YYYY-MM-DD when premiere run starts. */
  startDate: string
  durationDays: number
  /** Four fixed UTC clock times HH:MM (24h). */
  slotTimesUtc: readonly [string, string, string, string]
  rewardXp: number
  /** Stored as prints grant (dormant); player receives XP now. */
  rewardPrints: number
  eventSkinVariantId?: MidnightVariantId
  /** Hook for future loyalty / presence seal. */
  loyaltySealHook?: string
}

export type TheaterLibraryVideo = {
  id: string
  title: string
  youtubeId: string
}

/** Active + upcoming premieres (newest featured first in UI). */
export const THEATER_PREMIERES: readonly TheaterPremiere[] = [
  {
    id: 'premiere-drop-01',
    title: 'better luck next time? (live cut)',
    youtubeId: 'dQw4w9WgXcQ',
    startDate: '2026-05-26',
    durationDays: 60,
    slotTimesUtc: ['16:00', '20:00', '00:00', '04:00'],
    rewardXp: 180,
    rewardPrints: 25,
    eventSkinVariantId: 'danny-ali',
    loyaltySealHook: 'theater-premiere-01',
  },
]

export const THEATER_LIBRARY: readonly TheaterLibraryVideo[] = [
  { id: 'lib-01', title: 'midnight in the 5ive', youtubeId: 'dQw4w9WgXcQ' },
  { id: 'lib-02', title: 'oceanview sessions', youtubeId: 'dQw4w9WgXcQ' },
  { id: 'lib-03', title: 'southside after dark', youtubeId: 'dQw4w9WgXcQ' },
]

export function youtubeThumbnailUrl(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
}

export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`
}

export function youtubeSubscribeUrl(channelHint = '@dannyali'): string {
  return `https://www.youtube.com/${channelHint}?sub_confirmation=1`
}

export function getPremiereById(id: string): TheaterPremiere | undefined {
  return THEATER_PREMIERES.find((p) => p.id === id)
}
