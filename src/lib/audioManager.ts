import {
  getTrackById,
  resolveTrackIdForContext,
  type TrackDef,
} from '../data/musicRegistry'
import { isMusicPlayerOwned } from './musicPlayerGate'

const CROSSFADE_MS = 800
const FADE_OUT_MS = 400
const FADE_IN_MS = 400

const STORAGE_VOLUME = 'aliworld_music_volume'
const STORAGE_MUTED = 'aliworld_music_muted'

export type MusicCurrent = {
  trackId: string
  title: string
  artist: string
}

type FadeKind = 'out' | 'in' | 'duck' | 'unduck'

class AudioManager {
  private listeners = new Set<() => void>()
  /** Browser autoplay unlock (user gesture). Separate from MP3 ownership. */
  private unlocked = false
  private pendingContext: string | null = 'city:five'
  private activeContext: string | null = null
  private muted: boolean
  private volume: number
  private ducking = false
  private currentTrackId: string | null = null
  private currentMeta: MusicCurrent | null = null
  private audio = new Audio()
  private fadeGeneration = 0
  private fadeFrame = 0
  private loggedMissingContexts = new Set<string>()
  private lastProgressEmitMs = 0

  constructor() {
    this.muted = readMuted()
    this.volume = clampVolume(readVolume())
    this.audio.preload = 'auto'
    this.audio.volume = 0
    this.audio.addEventListener('timeupdate', () => this.emitProgress())
    this.audio.addEventListener('loadedmetadata', () => this.emit())
    this.audio.addEventListener('durationchange', () => this.emit())
  }

  isUnlocked(): boolean {
    return this.unlocked
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  /** Throttle playhead updates so the music bar does not re-render the whole game shell every frame. */
  private emitProgress(): void {
    const now = performance.now()
    if (now - this.lastProgressEmitMs < 250) return
    this.lastProgressEmitMs = now
    this.emit()
  }

  isMuted(): boolean {
    return this.muted
  }

  getVolume(): number {
    return this.volume
  }

  current(): MusicCurrent | null {
    if (!isMusicPlayerOwned()) return null
    return this.currentMeta
  }

  /** 0–1 playhead within the current track; 0 when idle or duration unknown. */
  playbackProgress(): number {
    if (!isMusicPlayerOwned() || !this.currentMeta || !this.audio.src) return 0
    const duration = this.audio.duration
    if (!Number.isFinite(duration) || duration <= 0) return 0
    const current = this.audio.currentTime
    if (!Number.isFinite(current) || current < 0) return 0
    return Math.min(1, current / duration)
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return
    this.muted = muted
    writeMuted(muted)
    // Cancel any in-flight fade so it can't override the new volume.
    this.fadeGeneration++
    if (!isMusicPlayerOwned()) {
      this.ensureSilenced()
      this.emit()
      return
    }
    this.applyOutputVolume()
    if (!muted && this.unlocked && this.audio.src && this.audio.paused) {
      void this.resumeSameTrack()
    }
    this.emit()
  }

  toggleMuted(): void {
    this.setMuted(!this.muted)
  }

  setVolume(level: number): void {
    const next = clampVolume(level)
    if (this.volume === next) return
    this.volume = next
    writeVolume(next)
    if (!isMusicPlayerOwned()) return
    this.applyOutputVolume()
    this.emit()
  }

  setContext(context: string): void {
    this.pendingContext = context
    if (!isMusicPlayerOwned()) {
      this.ensureSilenced()
      return
    }
    if (!this.unlocked) return

    if (context === 'cutscene') {
      this.enterCutscene()
      return
    }

    if (this.activeContext === 'cutscene' || this.ducking) {
      this.ducking = false
      this.activeContext = null
    }

    void this.applyContext(context)
  }

  private enterCutscene(): void {
    if (!isMusicPlayerOwned()) {
      this.ensureSilenced()
      return
    }
    this.activeContext = 'cutscene'
    this.pendingContext = 'cutscene'
    this.ducking = true
    void this.fadeToLevel(0, CROSSFADE_MS, 'duck')
    this.emit()
  }

  private canPlayAudio(): boolean {
    return isMusicPlayerOwned() && this.unlocked
  }

  private async applyContext(context: string, forceReload = false): Promise<void> {
    if (!isMusicPlayerOwned()) {
      this.ensureSilenced()
      return
    }
    if (!this.unlocked) return

    this.pendingContext = context
    this.activeContext = context

    const trackId = resolveTrackIdForContext(context)
    if (!trackId) {
      this.logMissingOnce(context)
      await this.fadeToSilence()
      return
    }

    const track = getTrackById(trackId)
    if (!track) {
      this.logMissingOnce(`${context}→${trackId}`)
      await this.fadeToSilence()
      return
    }

    if (!forceReload && trackId === this.currentTrackId && this.audio.src) {
      this.setCurrentMeta(track)
      void this.resumeSameTrack()
      return
    }

    await this.crossfadeToTrack(track)
  }

  private logMissingOnce(context: string): void {
    if (this.loggedMissingContexts.has(context)) return
    this.loggedMissingContexts.add(context)
    console.info(`[audio] no track mapped for context "${context}"`)
  }

  private setCurrentMeta(track: TrackDef): void {
    this.currentTrackId = track.id
    this.currentMeta = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
    }
  }

  private async resumeSameTrack(): Promise<void> {
    if (!this.canPlayAudio()) return

    const gen = ++this.fadeGeneration
    if (!this.muted) {
      try {
        if (this.audio.paused) {
          await this.audio.play()
        }
      } catch {
        // missing file or autoplay
      }
    } else {
      this.audio.pause()
      this.audio.volume = 0
    }
    if (gen !== this.fadeGeneration) return
    await this.fadeToLevel(this.effectiveVolume(), FADE_IN_MS, 'in', gen)
    this.emit()
  }

  private async crossfadeToTrack(track: TrackDef): Promise<void> {
    if (!this.canPlayAudio()) return

    const gen = ++this.fadeGeneration
    if (this.audio.src && !this.audio.paused && !this.muted) {
      await this.fadeToLevel(0, FADE_OUT_MS, 'out', gen)
      if (gen !== this.fadeGeneration) return
    }

    this.audio.loop = track.loop !== false
    this.audio.src = track.file
    this.setCurrentMeta(track)

    if (this.muted) {
      this.audio.pause()
      this.audio.volume = 0
      this.emit()
      return
    }

    try {
      await this.audio.play()
    } catch {
      // autoplay or missing file, stay silent
    }

    if (gen !== this.fadeGeneration) return
    await this.fadeToLevel(this.effectiveVolume(), FADE_IN_MS, 'in', gen)
    this.emit()
  }

  private async fadeToSilence(): Promise<void> {
    const gen = ++this.fadeGeneration
    await this.fadeToLevel(0, FADE_OUT_MS, 'out', gen)
    if (gen !== this.fadeGeneration) return
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.currentTrackId = null
    this.currentMeta = null
    this.emit()
  }

  private effectiveVolume(): number {
    if (!isMusicPlayerOwned() || this.muted || this.ducking) return 0
    return this.volume
  }

  private applyOutputVolume(): void {
    this.audio.volume = this.effectiveVolume()
  }

  private fadeToLevel(
    target: number,
    durationMs: number,
    kind: FadeKind,
    generation = this.fadeGeneration,
  ): Promise<void> {
    if (durationMs <= 0) {
      if (generation === this.fadeGeneration) {
        this.audio.volume = target
      }
      return Promise.resolve()
    }

    const start = this.audio.volume
    const startTime = performance.now()

    return new Promise((resolve) => {
      const step = (now: number) => {
        if (generation !== this.fadeGeneration) {
          resolve()
          return
        }
        const t = Math.min(1, (now - startTime) / durationMs)
        const level = start + (target - start) * t
        this.audio.volume = Math.max(0, Math.min(1, level))
        if (t < 1) {
          this.fadeFrame = requestAnimationFrame(step)
        } else {
          if (kind === 'duck' && generation === this.fadeGeneration) {
            this.audio.pause()
          }
          if (kind === 'unduck' && generation === this.fadeGeneration) {
            this.applyOutputVolume()
          }
          resolve()
        }
      }
      cancelAnimationFrame(this.fadeFrame)
      this.fadeFrame = requestAnimationFrame(step)
    })
  }

  /** Stop playback and drop unlock state (new game / pre-grant). */
  resetForNewGame(): void {
    this.fadeGeneration++
    cancelAnimationFrame(this.fadeFrame)
    this.unlocked = false
    this.ensureSilenced()
    this.pendingContext = 'city:five'
  }

  private ensureSilenced(): void {
    this.fadeGeneration++
    cancelAnimationFrame(this.fadeFrame)
    this.audio.pause()
    this.audio.volume = 0
    if (this.audio.src) {
      this.audio.removeAttribute('src')
    }
    this.currentTrackId = null
    this.currentMeta = null
    this.activeContext = null
    this.ducking = false
    this.emit()
  }

  /** Unlock autoplay and fade in the current pending context (requires MP3 ownership). */
  async grantPlayer(): Promise<void> {
    if (!isMusicPlayerOwned()) return

    if (this.unlocked) {
      const ctx = this.pendingContext ?? this.activeContext ?? 'city:five'
      await this.applyContext(ctx, true)
      this.emit()
      return
    }
    await this.unlockAudio()
  }

  /**
   * Call synchronously from a user gesture (Adam MP3 handoff).
   * Starts playback for `context` immediately, do not defer behind async boundaries.
   */
  grantFromUserGesture(context: string): void {
    if (!isMusicPlayerOwned()) return
    this.pendingContext = context
    this.activeContext = context

    if (!this.unlocked) {
      this.unlocked = true
      this.audio.volume = 0
      try {
        void this.audio.play().catch(() => {})
      } catch {
        // gesture may still carry through applyContext play()
      }
    }

    void this.applyContext(context, true)
    this.emit()
  }

  private async unlockAudio(): Promise<void> {
    if (!isMusicPlayerOwned()) {
      this.ensureSilenced()
      return
    }

    if (this.unlocked) {
      const ctx = this.pendingContext ?? this.activeContext ?? 'city:five'
      await this.applyContext(ctx, true)
      this.emit()
      return
    }

    this.unlocked = true
    this.audio.volume = 0
    try {
      await this.audio.play()
      this.audio.pause()
    } catch {
      // still mark unlocked, later play() may succeed after Adam's gesture
    }

    if (!isMusicPlayerOwned()) {
      this.ensureSilenced()
      this.unlocked = false
      return
    }

    const ctx = this.pendingContext ?? this.activeContext ?? 'city:five'
    await this.applyContext(ctx, true)
    this.emit()
  }
}

let manager: AudioManager | null = null

function getManager(): AudioManager {
  if (!manager) manager = new AudioManager()
  return manager
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(0, Math.min(1, value))
}

function readVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_VOLUME)
    if (raw == null) return 1
    return clampVolume(Number.parseFloat(raw))
  } catch {
    return 1
  }
}

function writeVolume(value: number): void {
  try {
    localStorage.setItem(STORAGE_VOLUME, String(clampVolume(value)))
  } catch {
    // ignore quota / private mode
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_MUTED) === '1'
  } catch {
    return false
  }
}

function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_MUTED, muted ? '1' : '0')
  } catch {
    // ignore
  }
}

export function subscribeAudioManager(listener: () => void): () => void {
  return getManager().subscribe(listener)
}

export function setMusicContext(context: string): void {
  getManager().setContext(context)
}

export function setMusicMuted(muted: boolean): void {
  getManager().setMuted(muted)
}

export function toggleMusicMuted(): void {
  getManager().toggleMuted()
}

export function setMusicVolume(level: number): void {
  getManager().setVolume(level)
}

export function getMusicVolume(): number {
  return getManager().getVolume()
}

/** UI volume level 1–100 (mute is separate). */
export function getMusicVolumePercent(): number {
  return Math.max(1, Math.min(100, Math.round(getManager().getVolume() * 100)))
}

export function setMusicVolumePercent(percent: number): void {
  const clamped = Math.max(1, Math.min(100, Math.round(percent)))
  setMusicVolume(clamped / 100)
}

export function getMusicCurrent(): MusicCurrent | null {
  return getManager().current()
}

export function getMusicPlaybackProgress(): number {
  return getManager().playbackProgress()
}

export function isMusicMuted(): boolean {
  return getManager().isMuted()
}

export function isMusicPlayerGranted(): boolean {
  return isMusicPlayerOwned()
}

export function isAudioUnlocked(): boolean {
  return getManager().isUnlocked()
}

export function grantMusicPlayer(): Promise<void> {
  return getManager().grantPlayer()
}

export function grantMusicPlayerFromGesture(context: string): void {
  getManager().grantFromUserGesture(context)
}

export function resetMusicPlayerForNewGame(): void {
  getManager().resetForNewGame()
}
