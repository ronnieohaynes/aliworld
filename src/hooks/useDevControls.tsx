import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { clearMidnightVariant } from '../store/characterStore'
import { clearShowDebug, toggleShowDebug } from '../store/playerStore'
import { EPISODE_CUTSCENE_PRESETS, buildEpisodeCutsceneOptions } from '../data/episodeCutscenes'
import type { PlayCutsceneOptions } from '../lib/playCutscene'
import type { PlayerHandle } from '../components/Player'
import {
  DevModeConfirmModal,
  DevModeQuestPickerModal,
  DevModeToolbar,
  DevModeToast,
} from '../components/DevModeUI'
import { getDevJumpableQuests, type DevQuestJumpId } from '../lib/devQuestJump'
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

function isCutsceneDevActive(): boolean {
  return cutsceneDevSkip != null || cutsceneDevPlayer != null
}

function episodeFromDigitKey(e: KeyboardEvent): number | null {
  const match = /^Digit([1-9])$/.exec(e.code)
  if (!match) return null
  return Number(match[1])
}

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

type DevEpisodeCutscenePreset = Pick<
  PlayCutsceneOptions,
  | 'videoId'
  | 'startSeconds'
  | 'endSeconds'
  | 'videoTitle'
  | 'isEpisodeCutscene'
  | 'captions'
  | 'youtubeCaptions'
>

/** Shift+E+1 … Shift+E+9 episode cutscene previews (extend as episodes ship). */
const DEV_EPISODE_CUTSCENES: Record<number, DevEpisodeCutscenePreset> = {
  1: { ...EPISODE_CUTSCENE_PRESETS[1], isEpisodeCutscene: true },
  2: { ...EPISODE_CUTSCENE_PRESETS[2], isEpisodeCutscene: true },
  3: { ...EPISODE_CUTSCENE_PRESETS[3], isEpisodeCutscene: true },
}

const SHIFT_E_CHORD_MS = 800

export type UseDevControlsOptions = {
  playerRef: RefObject<PlayerHandle | null>
  playCutscene: (opts: PlayCutsceneOptions) => void
  canPlayCutscene: () => boolean
  canToggleDevMode: () => boolean
  spawnDevSpar: () => void
  canSpawnDevSpar: () => boolean
  canStartTutorialBattle: () => boolean
  startTutorialBattle: () => void
  openShop: () => void
  canJumpToQuest: () => boolean
  jumpToQuest: (questId: DevQuestJumpId) => void
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
  const [questPickerOpen, setQuestPickerOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const shiftEChordArmedRef = useRef(false)
  const shiftEChordTimerRef = useRef<number | null>(null)

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

  const tryStartTutorialBattle = useCallback(() => {
    const { canStartTutorialBattle, startTutorialBattle } = optionsRef.current
    if (!canStartTutorialBattle()) {
      showToast('cannot start tutorial here.')
      return
    }
    startTutorialBattle()
    showToast('walker tutorial battle…')
  }, [showToast])

  const tryOpenQuestPicker = useCallback(() => {
    const { canJumpToQuest } = optionsRef.current
    if (!canJumpToQuest()) {
      showToast('cannot jump to quest here.')
      return
    }
    setQuestPickerOpen(true)
  }, [showToast])

  const handleQuestPick = useCallback(
    (questId: DevQuestJumpId) => {
      setQuestPickerOpen(false)
      optionsRef.current.jumpToQuest(questId)
      const label = getDevJumpableQuests().find((q) => q.id === questId)?.label ?? questId
      showToast(`${label} — from the start.`)
    },
    [showToast],
  )

  const handleCancelQuestPicker = useCallback(() => {
    setQuestPickerOpen(false)
  }, [])

  useEffect(() => {
    if (!devAllowed) return

    const clearShiftEChord = () => {
      shiftEChordArmedRef.current = false
      if (shiftEChordTimerRef.current != null) {
        window.clearTimeout(shiftEChordTimerRef.current)
        shiftEChordTimerRef.current = null
      }
    }

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
        canStartTutorialBattle,
      } = optionsRef.current

      const episode = episodeFromDigitKey(e)
      if (devModeEnabled && shiftEChordArmedRef.current && episode != null) {
        const preset = DEV_EPISODE_CUTSCENES[episode]
        e.preventDefault()
        clearShiftEChord()
        if (preset && canPlayCutscene()) {
          playCutscene({
            ...buildEpisodeCutsceneOptions(episode as 1 | 2 | 3),
            devEpisodePreview: true,
          })
        }
        return
      }

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

      if (e.shiftKey && e.code === 'KeyE') {
        e.preventDefault()
        if (isCutsceneDevActive() && devSkipActiveCutscene()) {
          clearShiftEChord()
          return
        }
        shiftEChordArmedRef.current = true
        if (shiftEChordTimerRef.current != null) {
          window.clearTimeout(shiftEChordTimerRef.current)
        }
        shiftEChordTimerRef.current = window.setTimeout(() => {
          shiftEChordArmedRef.current = false
          shiftEChordTimerRef.current = null
        }, SHIFT_E_CHORD_MS)
        return
      }

      if (e.shiftKey && (e.code === 'Digit5' || e.key === '%' || e.key === '5')) {
        e.preventDefault()
        if (questPickerOpen) return
        tryOpenQuestPicker()
        return
      }

      if (e.shiftKey && (e.code === 'Digit3' || e.key === '#' || e.key === '3')) {
        e.preventDefault()
        optionsRef.current.openShop()
        return
      }

      if (e.key === 'k' || e.key === 'K') {
        if (!canSpawnDevSpar()) return
        e.preventDefault()
        spawnDevSpar()
        return
      }

      if (e.shiftKey && (e.code === 'KeyT' || e.key === 'T')) {
        e.preventDefault()
        if (!canStartTutorialBattle()) {
          showToast('cannot start tutorial here.')
          return
        }
        optionsRef.current.startTutorialBattle()
        showToast('walker tutorial battle…')
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
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      clearShiftEChord()
    }
  }, [confirmKind, devAllowed, devModeEnabled, questPickerOpen, showToast, tryOpenQuestPicker])

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
      {questPickerOpen ? (
        <DevModeQuestPickerModal
          quests={getDevJumpableQuests()}
          onSelect={handleQuestPick}
          onCancel={handleCancelQuestPicker}
        />
      ) : null}
      {devModeEnabled ? (
        <DevModeToolbar
          onOpenShop={() => optionsRef.current.openShop()}
          onStartTutorial={tryStartTutorialBattle}
          canStartTutorial={() => optionsRef.current.canStartTutorialBattle()}
          onOpenQuestPicker={tryOpenQuestPicker}
        />
      ) : null}
      {toastMessage ? <DevModeToast message={toastMessage} /> : null}
    </>
  )
}
