import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import './QuestTransition.css'

/** Story / episode cards: 0.2s in, 1s hold, 0.2s out (~1.4s total). */
const FADE_IN_MS = 200
const FADE_OUT_MS = 200
const HOLD_MS = 1000

/** "Midnight's Story" quest_start card, 2× default duration. */
const QUEST_START_FADE_IN_MS = 400
const QUEST_START_FADE_OUT_MS = 400
const QUEST_START_HOLD_MS = 2000

export type QuestTransitionType =
  | 'quest_start'
  | 'episode_start'
  | 'episode_complete'
  | 'quest_complete'

function getTransitionTiming(type: QuestTransitionType): {
  fadeInMs: number
  fadeOutMs: number
  holdMs: number
} {
  if (type === 'quest_start') {
    return {
      fadeInMs: QUEST_START_FADE_IN_MS,
      fadeOutMs: QUEST_START_FADE_OUT_MS,
      holdMs: QUEST_START_HOLD_MS,
    }
  }
  return { fadeInMs: FADE_IN_MS, fadeOutMs: FADE_OUT_MS, holdMs: HOLD_MS }
}

export type ShowQuestTransitionParams = {
  questName: string
  episodeName?: string
  episodeNumber?: number
  type: QuestTransitionType
  /** Opaque black behind title card (episode handoff). */
  solidBlackBackdrop?: boolean
  /** Fires when exit fade begins (pair with world reveal). */
  onExitFadeStart?: () => void
  onComplete?: () => void
}

export type QuestTransitionHandle = {
  showTransition: (params: ShowQuestTransitionParams) => void
}

type ActiveTransition = ShowQuestTransitionParams

export const QuestTransition = forwardRef<QuestTransitionHandle>(function QuestTransition(
  _props,
  ref,
) {
  const [active, setActive] = useState<ActiveTransition | null>(null)
  const [visible, setVisible] = useState(false)
  const onCompleteRef = useRef<(() => void) | undefined>(undefined)
  const onExitFadeStartRef = useRef<(() => void) | undefined>(undefined)
  const runningRef = useRef(false)

  const finish = useCallback(() => {
    runningRef.current = false
    setVisible(false)
    setActive(null)
    onCompleteRef.current?.()
    onCompleteRef.current = undefined
    onExitFadeStartRef.current = undefined
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      showTransition(params: ShowQuestTransitionParams) {
        runningRef.current = true
        onCompleteRef.current = params.onComplete
        onExitFadeStartRef.current = params.onExitFadeStart
        setActive({
          questName: params.questName,
          episodeName: params.episodeName,
          episodeNumber: params.episodeNumber,
          type: params.type,
          solidBlackBackdrop: params.solidBlackBackdrop,
        })
        setVisible(false)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setVisible(true))
        })
      },
    }),
    [],
  )

  useEffect(() => {
    if (!active || !runningRef.current) return

    const { fadeInMs, fadeOutMs, holdMs } = getTransitionTiming(active.type)
    const fadeOutAt = fadeInMs + holdMs
    const doneAt = fadeOutAt + fadeOutMs

    const fadeOutId = window.setTimeout(() => {
      onExitFadeStartRef.current?.()
      setVisible(false)
    }, fadeOutAt)
    const doneId = window.setTimeout(finish, doneAt)

    return () => {
      window.clearTimeout(fadeOutId)
      window.clearTimeout(doneId)
    }
  }, [active, finish])

  if (!active) return null

  const showEpisode =
    (active.type === 'episode_start' || active.type === 'episode_complete') &&
    active.episodeName != null &&
    active.episodeName !== ''

  const episodeLabel =
    showEpisode && active.episodeNumber != null
      ? `episode ${active.episodeNumber}`
      : null

  const displayTitle =
    showEpisode && active.episodeName ? active.episodeName : active.questName

  const { fadeInMs, fadeOutMs } = getTransitionTiming(active.type)

  return (
    <div
      className={`quest-transition${active.solidBlackBackdrop ? ' quest-transition--solid-black' : ''}${visible ? ' quest-transition--visible' : ''}`}
      style={{
        ['--quest-transition-fade-in-ms' as string]: `${fadeInMs}ms`,
        ['--quest-transition-fade-out-ms' as string]: `${fadeOutMs}ms`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Quest transition"
    >
      <div className="quest-transition__content">
        {episodeLabel ? (
          <p className="quest-transition__eyebrow">{episodeLabel}</p>
        ) : null}
        <p className="quest-transition__title">{displayTitle}</p>
      </div>
    </div>
  )
})
