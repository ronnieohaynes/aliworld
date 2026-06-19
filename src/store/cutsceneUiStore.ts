export type CutsceneGestureKind = 'play' | null

export type CutsceneUiSnapshot = {
  active: boolean
  progress: number
  landscapeFullscreen: boolean
  soundMuted: boolean
  videoPaused: boolean
  gestureKind: CutsceneGestureKind
  title: string
  subtitle: string
}

const INACTIVE: CutsceneUiSnapshot = {
  active: false,
  progress: 0,
  landscapeFullscreen: true,
  soundMuted: true,
  videoPaused: false,
  gestureKind: null,
  title: '',
  subtitle: '',
}

let snapshot: CutsceneUiSnapshot = INACTIVE
const listeners = new Set<() => void>()

let skipFn: (() => void) | null = null
let enterFullscreenFn: (() => void) | null = null
let exitFullscreenFn: (() => void) | null = null
let toggleSoundMutedFn: (() => void) | null = null
let togglePlayPauseFn: (() => void) | null = null
let resumeFromGestureFn: (() => void) | null = null

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeCutsceneUiStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCutsceneUiSnapshot(): CutsceneUiSnapshot {
  return snapshot
}

export function setCutsceneUiActive(
  active: boolean,
  meta?: { title: string; subtitle?: string },
): void {
  snapshot = active
    ? {
        active: true,
        progress: 0,
        landscapeFullscreen: true,
        soundMuted: true,
        videoPaused: false,
        gestureKind: null,
        title: meta?.title ?? 'cutscene',
        subtitle: meta?.subtitle ?? 'ALIWORLD',
      }
    : INACTIVE
  emit()
}

export function updateCutsceneUi(
  partial: Partial<Omit<CutsceneUiSnapshot, 'active' | 'subtitle'>>,
): void {
  if (!snapshot.active) return
  snapshot = { ...snapshot, ...partial }
  emit()
}

export function registerCutsceneUiHandlers(handlers: {
  skip: () => void
  enterFullscreen: () => void
  exitFullscreen: () => void
  toggleSoundMuted: () => void
  togglePlayPause: () => void
  resumeFromGesture: () => void
}): void {
  skipFn = handlers.skip
  enterFullscreenFn = handlers.enterFullscreen
  exitFullscreenFn = handlers.exitFullscreen
  toggleSoundMutedFn = handlers.toggleSoundMuted
  togglePlayPauseFn = handlers.togglePlayPause
  resumeFromGestureFn = handlers.resumeFromGesture
}

export function unregisterCutsceneUiHandlers(): void {
  skipFn = null
  enterFullscreenFn = null
  exitFullscreenFn = null
  toggleSoundMutedFn = null
  togglePlayPauseFn = null
  resumeFromGestureFn = null
}

export function cutsceneUiSkip(): void {
  skipFn?.()
}

export function cutsceneUiEnterFullscreen(): void {
  enterFullscreenFn?.()
}

export function cutsceneUiExitFullscreen(): void {
  exitFullscreenFn?.()
}

export function cutsceneUiToggleSoundMuted(): void {
  toggleSoundMutedFn?.()
}

export function cutsceneUiTogglePlayPause(): void {
  togglePlayPauseFn?.()
}

export function cutsceneUiResumeFromGesture(): void {
  resumeFromGestureFn?.()
}
