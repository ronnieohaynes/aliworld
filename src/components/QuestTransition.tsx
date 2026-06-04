import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import './QuestTransition.css'

const FADE_IN_MS = 1_600
const FADE_OUT_MS = 800
const HOLD_MS = 3000

export type QuestTransitionType =
  | 'quest_start'
  | 'episode_start'
  | 'episode_complete'
  | 'quest_complete'

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

    const fadeOutAt = FADE_IN_MS + HOLD_MS
    const doneAt = fadeOutAt + FADE_OUT_MS

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
      ? `EPISODE ${active.episodeNumber} — ${active.episodeName}`
      : active.episodeName

  return (
    <div
      className={`quest-transition${active.solidBlackBackdrop ? ' quest-transition--solid-black' : ''}${visible ? ' quest-transition--visible' : ''}`}
      style={{
        ['--quest-transition-fade-in-ms' as string]: `${FADE_IN_MS}ms`,
        ['--quest-transition-fade-out-ms' as string]: `${FADE_OUT_MS}ms`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Quest transition"
    >
      <div className="quest-transition__content">
        <p className="quest-transition__quest">{active.questName}</p>
        {showEpisode ? (
          <p className="quest-transition__episode">{episodeLabel}</p>
        ) : null}
      </div>
    </div>
  )
})
