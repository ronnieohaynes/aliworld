/** Danny: paste the public stream link for BETTER LUCK NEXT TIME? (Spotify, Apple Music, etc.) */
export const BLNT_TRACK_URL = 'https://blnt.dannyali.com'

/** Optional social links — leave empty string to hide. */
export const SOCIAL_INSTAGRAM_URL = ''
export const SOCIAL_TWITTER_URL = ''

/** Domains that should show the COMING SOON page. The real game shows everywhere
 *  else (aliworld.pages.dev, preview deploys, localhost) so danny + ronnie can test.
 *  TO LAUNCH: remove the domain(s) from this list (or empty it) — then the public
 *  domain serves the real game. */
const COMING_SOON_HOSTS: string[] = []

export function isComingSoonMode(): boolean {
  if (typeof window === 'undefined') return false
  return COMING_SOON_HOSTS.includes(window.location.hostname)
}
