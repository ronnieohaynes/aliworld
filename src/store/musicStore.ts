/**
 * GameShell music bar — facade over the context-aware audio manager.
 */

import { isMusicPlayerOwned } from '../lib/musicPlayerGate'
import type { MusicCurrent } from '../lib/audioManager'
import {
  getMusicCurrent,
  getMusicPlaybackProgress,
  grantMusicPlayer,
  grantMusicPlayerFromGesture,
  isMusicMuted,
  resetMusicPlayerForNewGame,
  setMusicMuted,
  subscribeAudioManager,
  toggleMusicMuted,
} from '../lib/audioManager'
import { subscribeArtifactStore } from './artifactStore'
import { subscribeQuest1Store } from './quest1Store'

export type MusicStoreSnapshot = {
  playing: boolean
  current: MusicCurrent | null
  playerGranted: boolean
}

/** Stable reference for useSyncExternalStore — only replaced when values change. */
let musicStoreSnapshot: MusicStoreSnapshot = {
  playing: false,
  current: null,
  playerGranted: false,
}

export function hasMusicPlayer(): boolean {
  return isMusicPlayerOwned()
}

export function subscribeMusicStore(listener: () => void): () => void {
  const unsubAudio = subscribeAudioManager(listener)
  const unsubQuest = subscribeQuest1Store(listener)
  const unsubArtifacts = subscribeArtifactStore(listener)
  return () => {
    unsubAudio()
    unsubQuest()
    unsubArtifacts()
  }
}

export function getMusicStoreSnapshot(): MusicStoreSnapshot {
  const playerGranted = hasMusicPlayer()
  const playing = playerGranted && !isMusicMuted()
  const current = playerGranted ? getMusicCurrent() : null
  const prev = musicStoreSnapshot
  if (
    prev.playerGranted === playerGranted &&
    prev.playing === playing &&
    prev.current === current
  ) {
    return prev
  }
  musicStoreSnapshot = { playerGranted, playing, current }
  return musicStoreSnapshot
}

/** Primitive selectors — safe for useSyncExternalStore without object snapshots. */
export function getMusicPlayerGrantedSnapshot(): boolean {
  return hasMusicPlayer()
}

export function getMusicMutedSnapshot(): boolean {
  if (!hasMusicPlayer()) return false
  return isMusicMuted()
}

export function getMusicPlayingSnapshot(): boolean {
  return hasMusicPlayer() && !isMusicMuted()
}

export function getMusicTrackIdSnapshot(): string | null {
  if (!hasMusicPlayer()) return null
  return getMusicCurrent()?.trackId ?? null
}

export function getMusicTrackTitleSnapshot(): string {
  if (!hasMusicPlayer()) return ''
  return getMusicCurrent()?.title ?? ''
}

export function getMusicTrackArtistSnapshot(): string {
  if (!hasMusicPlayer()) return ''
  return getMusicCurrent()?.artist ?? ''
}

export function getMusicProgressSnapshot(): number {
  if (!hasMusicPlayer()) return 0
  return getMusicPlaybackProgress()
}

export function isSoundtrackPlaying(): boolean {
  return hasMusicPlayer() && !isMusicMuted()
}

export function grantMusicPlayerFromAdam(cityContext: string): void {
  grantMusicPlayerFromGesture(cityContext)
}

export function startSoundtrack(): void {
  if (!hasMusicPlayer()) return
  setMusicMuted(false)
}

export function toggleSoundtrackPlaying(): void {
  if (!hasMusicPlayer()) return
  toggleMusicMuted()
}

export function resumeMusicPlayerIfOwned(): void {
  if (!hasMusicPlayer()) {
    resetMusicPlayerForNewGame()
    return
  }
  void grantMusicPlayer()
}

export function stopSoundtrack(): void {
  setMusicMuted(true)
}

/** @deprecated use resumeMusicPlayerIfOwned */
export function resumeSoundtrackIfNeeded(alreadyHasMp3: boolean): void {
  if (alreadyHasMp3) resumeMusicPlayerIfOwned()
}
