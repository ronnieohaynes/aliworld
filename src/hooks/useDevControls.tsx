import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { clearMidnightVariant } from '../store/characterStore'
import { clearShowDebug, toggleShowDebug } from '../store/playerStore'
import { EPISODE_1_CAPTIONS } from '../data/episode1Captions'
import type { PlayCutsceneOptions } from '../lib/playCutscene'
import type { PlayerHandle } from '../components/Player'
import {
  DevModeConfirmModal,
  DevModeIndicator,
  DevModeToast,
} from '../components/DevModeUI'
import {
  isDevAllowedOnHost,
  readDevModeSession,
  writeDevModeSession,
} from '../lib/devMode'

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
  canToggleDevMode: () => boolean
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

function isShiftDigit2(e: KeyboardEvent): boolean {
  return e.shiftKey && e.code === 'Digit2'
}

type ConfirmKind = 'enable' | 'disable'

/**
 * Session-gated dev shortcuts. Hard-blocked on DEV_BLOCKED_HOSTS; enable via Shift+2 confirm.
 */
export function useDevControls(options: UseDevControlsOptions): ReactNode {
  const optionsRef = useRef(options)
  optionsRef.current = options

  const devAllowed = isDevAllowedOnHost()
  const [devModeEnabled, setDevModeEnabled] = useState(() =>
    devAllowed ? readDevModeSession() : false,
  )
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 2000)
  }, [])

  const applyDevMode = useCallback(
    (enabled: boolean) => {
      writeDevModeSession(enabled)
      setDevModeEnabled(enabled)
      if (!enabled) clearShowDebug()
      showToast(enabled ? 'dev mode on.' : 'dev mode off.')
    },
    [showToast],
  )

  const handleConfirmEnable = useCallback(() => {
    setConfirmKind(null)
    applyDevMode(true)
  }, [applyDevMode])

  const handleConfirmDisable = useCallback(() => {
    setConfirmKind(null)
    applyDevMode(false)
  }, [applyDevMode])

  const handleCancelConfirm = useCallback(() => {
    setConfirmKind(null)
  }, [])

  useEffect(() => {
    if (!devAllowed) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const {
        playerRef,
        playCutscene,
        canPlayCutscene,
        canToggleDevMode,
        spawnDevSpar,
        canSpawnDevSpar,
      } = optionsRef.current

      if (isShiftDigit2(e)) {
        if (!canToggleDevMode()) return
        if (confirmKind != null) return
        e.preventDefault()
        setConfirmKind(devModeEnabled ? 'disable' : 'enable')
        return
      }

      if (!devModeEnabled) return

      if (e.key === '`' || e.code === 'Backquote') {
        e.preventDefault()
        toggleShowDebug()
        return
      }

      if (e.shiftKey && (e.code === 'Digit1' || e.key === '!' || e.key === '1')) {
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
        if (devSkipActiveCutscene()) {
          e.preventDefault()
          e.stopPropagation()
        }
        return
      }

      if (e.key === 'k' || e.key === 'K') {
        if (!canSpawnDevSpar()) return
        e.preventDefault()
        spawnDevSpar()
        return
      }

      if (e.key === 'm' || e.key === 'M') {
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
  }, [confirmKind, devAllowed, devModeEnabled])

  if (!devAllowed) return null

  return (
    <>
      {confirmKind === 'enable' ? (
        <DevModeConfirmModal
          kind="enable"
          onConfirm={handleConfirmEnable}
          onCancel={handleCancelConfirm}
        />
      ) : null}
      {confirmKind === 'disable' ? (
        <DevModeConfirmModal
          kind="disable"
          onConfirm={handleConfirmDisable}
          onCancel={handleCancelConfirm}
        />
      ) : null}
      {devModeEnabled ? <DevModeIndicator /> : null}
      {toastMessage ? <DevModeToast message={toastMessage} /> : null}
    </>
  )
}
