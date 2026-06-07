/**
 * GameShell music bar — facade over the context-aware audio manager.
 */

import { isMusicEnabled } from '../config/musicEnabled'
import { isMusicPlayerOwned } from '../lib/musicPlayerGate'
import type { MusicCurrent } from '../lib/audioManager'
import {
  getMusicCurrent,
  getMusicPlaybackProgress,
  grantMusicPlayer,
  grantMusicPlayerFromGesture,
  isMusicMuted,
  setMusicContext,
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

// ── Cached primitive snapshots — values are frozen at emit time so
//    useSyncExternalStore never sees a mid-render change (fixes #185).
let _playerGranted = hasMusicPlayer()
let _muted = hasMusicPlayer() ? isMusicMuted() : false
let _trackTitle = hasMusicPlayer() ? (getMusicCurrent()?.title ?? '') : ''
let _trackArtist = hasMusicPlayer() ? (getMusicCurrent()?.artist ?? '') : ''
let _progress = hasMusicPlayer() ? getMusicPlaybackProgress() : 0

function refreshPrimitiveSnapshots(): void {
  _playerGranted = hasMusicPlayer()
  _muted = _playerGranted ? isMusicMuted() : false
  const current = _playerGranted ? getMusicCurrent() : null
  _trackTitle = current?.title ?? ''
  _trackArtist = current?.artist ?? ''
  _progress = _playerGranted ? getMusicPlaybackProgress() : 0
}

export function subscribeMusicStore(listener: () => void): () => void {
  const wrapped = () => {
    refreshPrimitiveSnapshots()
    listener()
  }
  const unsubAudio = subscribeAudioManager(wrapped)
  const unsubQuest = subscribeQuest1Store(wrapped)
  const unsubArtifacts = subscribeArtifactStore(wrapped)
  return () => {
    unsubAudio()
    unsubQuest()
    unsubArtifacts()
  }
}

/** Primitive selectors — safe for useSyncExternalStore without object snapshots. */
export function getMusicPlayerGrantedSnapshot(): boolean {
  return _playerGranted
}

export function getMusicMutedSnapshot(): boolean {
  return _muted
}

export function getMusicPlayingSnapshot(): boolean {
  return _playerGranted && !_muted
}

export function getMusicTrackIdSnapshot(): string | null {
  return _playerGranted ? (getMusicCurrent()?.trackId ?? null) : null
}

export function getMusicTrackTitleSnapshot(): string {
  return _trackTitle
}

export function getMusicTrackArtistSnapshot(): string {
  return _trackArtist
}

export function getMusicProgressSnapshot(): number {
  return _progress
}

export function isSoundtrackPlaying(): boolean {
  return hasMusicPlayer() && !isMusicMuted()
}

export function grantMusicPlayerFromAdam(cityContext: string): void {
  if (!isMusicEnabled()) return
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
  if (!isMusicEnabled() || !hasMusicPlayer()) return
  void grantMusicPlayer()
}

/** Set the active music context and unlock/resume playback when the player is owned. */
export function syncMusicForContext(context: string): void {
  if (!isMusicEnabled() || !hasMusicPlayer()) return
  setMusicContext(context)
  void grantMusicPlayer()
}

export function stopSoundtrack(): void {
  setMusicMuted(true)
}

/** @deprecated use resumeMusicPlayerIfOwned */
export function resumeSoundtrackIfNeeded(alreadyHasMp3: boolean): void {
  if (alreadyHasMp3) resumeMusicPlayerIfOwned()
}
