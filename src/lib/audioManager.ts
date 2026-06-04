import {
  getTrackById,
  resolveTrackIdForContext,
  type TrackDef,
} from '../data/musicRegistry'

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
  private unlocked = false
  private unlockListenersAttached = false
  private pendingContext: string | null = 'title'
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

  constructor() {
    this.muted = readMuted()
    this.volume = clampVolume(readVolume())
    this.audio.preload = 'auto'
    this.audio.volume = 0
    this.attachUnlockListeners()
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

  isMuted(): boolean {
    return this.muted
  }

  getVolume(): number {
    return this.volume
  }

  current(): MusicCurrent | null {
    return this.currentMeta
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return
    this.muted = muted
    writeMuted(muted)
    this.applyOutputVolume()
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
    this.applyOutputVolume()
    this.emit()
  }

  setContext(context: string): void {
    if (!this.unlocked) {
      this.pendingContext = context
      return
    }

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
    this.activeContext = 'cutscene'
    this.pendingContext = 'cutscene'
    this.ducking = true
    void this.fadeToLevel(0, CROSSFADE_MS, 'duck')
    this.emit()
  }

  private async applyContext(context: string, forceReload = false): Promise<void> {
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
    const gen = ++this.fadeGeneration
    try {
      if (this.unlocked && this.audio.paused) {
        await this.audio.play()
      }
    } catch {
      // missing file or autoplay
    }
    if (gen !== this.fadeGeneration) return
    await this.fadeToLevel(this.effectiveVolume(), FADE_IN_MS, 'in', gen)
    this.emit()
  }

  private async crossfadeToTrack(track: TrackDef): Promise<void> {
    const gen = ++this.fadeGeneration
    if (this.audio.src && !this.audio.paused) {
      await this.fadeToLevel(0, FADE_OUT_MS, 'out', gen)
      if (gen !== this.fadeGeneration) return
    }

    this.audio.loop = track.loop !== false
    this.audio.src = track.file
    this.setCurrentMeta(track)

    try {
      if (this.unlocked) {
        await this.audio.play()
      }
    } catch {
      // autoplay or missing file — stay silent
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
    if (this.muted || this.ducking) return 0
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

  private attachUnlockListeners(): void {
    if (this.unlockListenersAttached || typeof window === 'undefined') return
    this.unlockListenersAttached = true

    const unlock = () => {
      void this.unlockAudio()
    }

    window.addEventListener('pointerdown', unlock, { capture: true, once: false })
    window.addEventListener('keydown', unlock, { capture: true, once: false })
  }

  private async unlockAudio(): Promise<void> {
    if (this.unlocked) return
    this.unlocked = true

    this.audio.volume = 0
    try {
      await this.audio.play()
      this.audio.pause()
    } catch {
      // still mark unlocked — later play() may succeed
    }

    const ctx = this.pendingContext ?? this.activeContext ?? 'title'
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

export function getMusicCurrent(): MusicCurrent | null {
  return getManager().current()
}

export function isMusicMuted(): boolean {
  return getManager().isMuted()
}
