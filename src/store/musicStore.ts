/**
 * GameShell music bar — facade over the context-aware audio manager.
 */

import { ADAM_MP3_ARTIFACT_ID } from '../data/adamMp3Handoff'
import { hasArtifact, subscribeArtifactStore } from './artifactStore'
import { hasMp3PlayerOwned, subscribeQuest1Store } from './quest1Store'
import type { MusicCurrent } from '../lib/audioManager'
import {
  getMusicCurrent,
  grantMusicPlayer,
  isMusicMuted,
  isMusicPlayerGranted,
  setMusicMuted,
  subscribeAudioManager,
  toggleMusicMuted,
} from '../lib/audioManager'

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
  return hasMp3PlayerOwned() || hasArtifact(ADAM_MP3_ARTIFACT_ID)
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

export function isSoundtrackPlaying(): boolean {
  return hasMusicPlayer() && !isMusicMuted()
}

export async function grantMusicPlayerFromAdam(): Promise<void> {
  await grantMusicPlayer()
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
  if (!hasMusicPlayer()) return
  if (isMusicPlayerGranted()) {
    setMusicMuted(false)
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
