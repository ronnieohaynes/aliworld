/** Danny: paste the public stream link for BETTER LUCK NEXT TIME? (Spotify, Apple Music, etc.) */
export const BLNT_TRACK_URL = 'https://example.com/better-luck-next-time'

/** Optional social links — leave empty string to hide. */
export const SOCIAL_INSTAGRAM_URL = ''
export const SOCIAL_TWITTER_URL = ''

export function isComingSoonMode(): boolean {
  return import.meta.env.VITE_COMING_SOON === 'true'
}
