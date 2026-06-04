/**
 * GameShell music bar — thin facade over the context-aware audio manager.
 */

import {
  getMusicCurrent,
  isMusicMuted,
  setMusicMuted,
  subscribeAudioManager,
  toggleMusicMuted,
} from '../lib/audioManager'

export function subscribeMusicStore(listener: () => void): () => void {
  return subscribeAudioManager(listener)
}

export function getMusicStoreSnapshot(): { playing: boolean; current: ReturnType<typeof getMusicCurrent> } {
  return {
    playing: !isMusicMuted(),
    current: getMusicCurrent(),
  }
}

/** Transport "playing" = not muted (routing continues underneath). */
export function isSoundtrackPlaying(): boolean {
  return !isMusicMuted()
}

export function startSoundtrack(): void {
  setMusicMuted(false)
}

export function toggleSoundtrackPlaying(): void {
  toggleMusicMuted()
}

export function resumeSoundtrackIfNeeded(alreadyHasMp3: boolean): void {
  if (alreadyHasMp3) setMusicMuted(false)
}

export function stopSoundtrack(): void {
  setMusicMuted(true)
}
