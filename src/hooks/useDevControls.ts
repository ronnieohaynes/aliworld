import { useEffect, useRef, type RefObject } from 'react'
import { clearMidnightVariant } from '../store/characterStore'
import { toggleShowDebug } from '../store/playerStore'
import { EPISODE_1_CAPTIONS } from '../data/episode1Captions'
import type { PlayCutsceneOptions } from '../lib/playCutscene'
import type { PlayerHandle } from '../components/Player'

const DEV_MODE = import.meta.env.DEV

type CutsceneDevPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

let cutsceneDevPlayer: CutsceneDevPlayer | null = null
let cutsceneDevEndSeconds = 0
let cutsceneDevSkip: (() => void) | null = null

/** Registered by CutsceneOverlay while mounted (dev Shift+E skip-to-end). */
export function registerCutsceneDevSkip(skip: (() => void) | null): void {
  cutsceneDevSkip = skip
}

/** Registered when the YouTube player is ready (seek fallback). */
export function registerCutsceneDevPlayer(
  player: CutsceneDevPlayer | null,
  endSeconds = 0,
): void {
  cutsceneDevPlayer = player
  cutsceneDevEndSeconds = endSeconds
}

function devSkipActiveCutscene(): boolean {
  if (cutsceneDevSkip) {
    cutsceneDevSkip()
    return true
  }
  if (!cutsceneDevPlayer) return false
  // Fallback before skip handler registers; endSeconds is absolute YT time.
  cutsceneDevPlayer.seekTo(Math.max(0, cutsceneDevEndSeconds - 0.25), true)
  return true
}

const E1_CUTSCENE: Pick<PlayCutsceneOptions, 'videoId' | 'startSeconds' | 'endSeconds'> = {
  videoId: '6t83Cdmq1fM',
  startSeconds: 112,
  endSeconds: 204,
}

export type UseDevControlsOptions = {
  playerRef: RefObject<PlayerHandle | null>
  playCutscene: (opts: PlayCutsceneOptions) => void
  canPlayCutscene: () => boolean
  spawnDevSpar: () => void
  canSpawnDevSpar: () => boolean
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

/** Dev-only global keyboard shortcuts (no-op in production builds). */
export function useDevControls(options: UseDevControlsOptions): void {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!DEV_MODE) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      const {
        playerRef,
        playCutscene,
        canPlayCutscene,
        spawnDevSpar,
        canSpawnDevSpar,
      } = optionsRef.current

      if (e.key === '`' || e.code === 'Backquote') {
        e.preventDefault()
        toggleShowDebug()
        return
      }

      if (e.shiftKey && (e.code === 'Digit1' || e.key === '!' || e.key === '1')) {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        if (!canPlayCutscene()) return
        e.preventDefault()
        playCutscene({
          ...E1_CUTSCENE,
          isEpisodeCutscene: true,
          captions: EPISODE_1_CAPTIONS,
          onComplete: () => {},
        })
        return
      }

      if (e.shiftKey && (e.code === 'KeyE' || e.key === 'E')) {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        if (devSkipActiveCutscene()) {
          e.preventDefault()
          e.stopPropagation()
        }
        return
      }

      if (e.key === 'k' || e.key === 'K') {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        if (!canSpawnDevSpar()) return
        e.preventDefault()
        spawnDevSpar()
        return
      }

      if (e.key === 'm' || e.key === 'M') {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        e.preventDefault()
        clearMidnightVariant()
        return
      }

      const player = playerRef.current
      if (!player) return

      if (e.key === 'c' || e.key === 'C') {
        player.devToggleCollisionDebug()
        return
      }

      if (e.key === 'x' || e.key === 'X') {
        player.devToggleCoordinateOverlay()
        return
      }

      if (e.key === '+' || e.key === '=' || e.key === 'Equal') {
        e.preventDefault()
        player.devZoomIn()
        return
      }

      if (e.key === '-' || e.key === 'Minus') {
        e.preventDefault()
        player.devZoomOut()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}
