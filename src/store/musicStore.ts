/**
 * GameShell music bar — facade over the context-aware audio manager.
 */

import { ADAM_MP3_ARTIFACT_ID } from '../data/adamMp3Handoff'
import { hasArtifact, subscribeArtifactStore } from './artifactStore'
import { hasMp3PlayerOwned, subscribeQuest1Store } from './quest1Store'
import {
  getMusicCurrent,
  grantMusicPlayer,
  isMusicMuted,
  isMusicPlayerGranted,
  setMusicMuted,
  subscribeAudioManager,
  toggleMusicMuted,
} from '../lib/audioManager'

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

export function getMusicStoreSnapshot(): {
  playing: boolean
  current: ReturnType<typeof getMusicCurrent>
  playerGranted: boolean
} {
  return {
    playing: hasMusicPlayer() && !isMusicMuted(),
    current: hasMusicPlayer() ? getMusicCurrent() : null,
    playerGranted: hasMusicPlayer(),
  }
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
