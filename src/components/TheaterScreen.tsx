import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { getTheaterViewingBackgroundSrc } from '../data/battleBackgrounds'
import {
  PREMIERE_ATTEND_THRESHOLD_SEC,
  THEATER_LIBRARY,
  THEATER_PREMIERES,
  youtubeSubscribeUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '../data/theaterPremieres'
import {
  formatNextSlotLocal,
  getTheaterScheduleState,
  type TheaterScheduleState,
} from '../lib/theaterSchedule'
import {
  trackExternalLinkClick,
  trackLibraryPlay,
  trackTheaterOpen,
} from '../lib/analytics'
import {
  getAttendedPremiereIds,
  getTheaterRevision,
  hasAttendedPremiere,
  isTheaterExplainerSeen,
  markTheaterExplainerSeen,
  subscribeTheaterStore,
  tryClaimPremiereAttendance,
} from '../store/theaterStore'
import './TheaterScreen.css'

type Props = {
  onClose: () => void
}

type ScreenMode =
  | { kind: 'premiere'; youtubeId: string; premiereId: string; title: string }
  | { kind: 'library'; youtubeId: string; libraryId: string; title: string }
  | { kind: 'idle' }

function pickFeaturedPremiereId(schedule: TheaterScheduleState): string | null {
  if (schedule.kind === 'live') return schedule.window.premiere.id
  if (schedule.kind === 'between') return schedule.premiere.id
  return THEATER_PREMIERES[0]?.id ?? null
}

export function TheaterScreen({ onClose }: Props) {
  const theaterRevision = useSyncExternalStore(
    subscribeTheaterStore,
    getTheaterRevision,
    getTheaterRevision,
  )
  void theaterRevision

  const explainerSeen = useSyncExternalStore(
    subscribeTheaterStore,
    isTheaterExplainerSeen,
    isTheaterExplainerSeen,
  )

  const attendedIds = useSyncExternalStore(
    subscribeTheaterStore,
    getAttendedPremiereIds,
    getAttendedPremiereIds,
  )

  const [schedule, setSchedule] = useState<TheaterScheduleState>(() => getTheaterScheduleState())
  const [screen, setScreen] = useState<ScreenMode>(() => {
    const initial = getTheaterScheduleState()
    if (initial.kind === 'live') {
      return {
        kind: 'premiere',
        youtubeId: initial.window.premiere.youtubeId,
        premiereId: initial.window.premiere.id,
        title: initial.window.premiere.title,
      }
    }
    return { kind: 'idle' }
  })
  const [rewardToast, setRewardToast] = useState<string | null>(null)
  const watchedSecondsRef = useRef(0)
  const claimAttemptedRef = useRef(false)
  const tickRef = useRef<number | null>(null)

  const livePremiere =
    schedule.kind === 'live' ? schedule.window.premiere : null
  const featuredPremiereId = pickFeaturedPremiereId(schedule)
  const featuredPremiere = THEATER_PREMIERES.find((p) => p.id === featuredPremiereId) ?? null

  const activeYoutubeId =
    screen.kind === 'idle'
      ? null
      : screen.youtubeId

  const isLivePremiereOnScreen =
    screen.kind === 'premiere' &&
    schedule.kind === 'live' &&
    screen.premiereId === schedule.window.premiere.id

  const alreadyAttendedLive =
    livePremiere != null && hasAttendedPremiere(livePremiere.id)

  useEffect(() => {
    trackTheaterOpen()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const id = window.setInterval(() => {
      setSchedule(getTheaterScheduleState())
    }, 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isLivePremiereOnScreen || alreadyAttendedLive) {
      watchedSecondsRef.current = 0
      claimAttemptedRef.current = false
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
      return
    }

    watchedSecondsRef.current = 0
    claimAttemptedRef.current = false

    tickRef.current = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (screen.kind !== 'premiere') return
      watchedSecondsRef.current += 1
      const watched = watchedSecondsRef.current
      const premiereId = screen.premiereId
      if (watched >= PREMIERE_ATTEND_THRESHOLD_SEC && !claimAttemptedRef.current) {
        claimAttemptedRef.current = true
        void tryClaimPremiereAttendance(premiereId, watched).then((res) => {
          if (!res?.granted) return
          const parts = [`+${res.rewardXp} xp`]
          if (res.skinGranted) parts.push('event skin unlocked')
          setRewardToast(`premiere attended · ${parts.join(' · ')}`)
        })
      }
    }, 1000)

    return () => {
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [alreadyAttendedLive, isLivePremiereOnScreen, screen])

  useEffect(() => {
    if (schedule.kind !== 'live') return
    if (screen.kind === 'library') return
    setScreen({
      kind: 'premiere',
      youtubeId: schedule.window.premiere.youtubeId,
      premiereId: schedule.window.premiere.id,
      title: schedule.window.premiere.title,
    })
  }, [schedule, screen.kind])

  const handleDismissExplainer = useCallback(() => {
    markTheaterExplainerSeen()
  }, [])

  const handleLibraryPick = useCallback((id: string, youtubeId: string, title: string) => {
    setScreen({ kind: 'library', youtubeId, libraryId: id, title })
    trackLibraryPlay(youtubeId, { libraryId: id, title })
  }, [])

  const handleWatchFeatured = useCallback(() => {
    if (!featuredPremiere) return
    if (schedule.kind === 'live') {
      setScreen({
        kind: 'premiere',
        youtubeId: featuredPremiere.youtubeId,
        premiereId: featuredPremiere.id,
        title: featuredPremiere.title,
      })
      return
    }
    setScreen({
      kind: 'library',
      youtubeId: featuredPremiere.youtubeId,
      libraryId: featuredPremiere.id,
      title: featuredPremiere.title,
    })
    trackLibraryPlay(featuredPremiere.youtubeId, {
      libraryId: featuredPremiere.id,
      title: featuredPremiere.title,
      featured: true,
    })
  }, [featuredPremiere, schedule.kind])

  const embedSrc = useMemo(() => {
    if (!activeYoutubeId) return null
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
    })
    if (isLivePremiereOnScreen) params.set('autoplay', '1')
    return `https://www.youtube.com/embed/${activeYoutubeId}?${params.toString()}`
  }, [activeYoutubeId, isLivePremiereOnScreen])

  const statusLine = useMemo(() => {
    if (schedule.kind === 'live') {
      if (alreadyAttendedLive) {
        return 'you already caught this premiere — reward claimed. rewatch anytime.'
      }
      return `premiere live now · stay ${PREMIERE_ATTEND_THRESHOLD_SEC}s to earn your reward`
    }
    if (schedule.kind === 'between') {
      return `next premiere at ${formatNextSlotLocal(schedule.nextSlot)}`
    }
    return 'no premiere scheduled — browse the library'
  }, [alreadyAttendedLive, schedule])

  const outboundYoutubeId =
    activeYoutubeId ?? featuredPremiere?.youtubeId ?? THEATER_LIBRARY[0]?.youtubeId

  return (
    <div className="theater" role="dialog" aria-label="Danny theater viewing">
      <div className="theater__venue-frame">
        <img
          className="theater__venue-bg"
          src={getTheaterViewingBackgroundSrc()}
          alt=""
          draggable={false}
        />

        <div className="theater__screen-slot">
          {embedSrc ? (
            <iframe
              className="theater__screen"
              src={embedSrc}
              title={screen.kind === 'idle' ? 'theater screen' : screen.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : null}
        </div>

        <div className="theater__hud">
          <header className="theater__header">
            <div>
              <p className="theater__eyebrow">aliworld · danny&apos;s theater</p>
              <h1 className="theater__title">now showing</h1>
              <p className="theater__sub">premieres · library · youtube</p>
            </div>
            <div className="theater__header-actions">
              <button type="button" className="theater__btn" onClick={onClose}>
                leave seats
              </button>
            </div>
          </header>

          {!explainerSeen ? (
            <p className="theater__explainer">
              live premieres drop four times a day across timezones. watch during a slot to earn xp
              and event skins — once per drop. between slots, pick anything from the library.
              <button
                type="button"
                className="theater__btn theater__btn--accent"
                onClick={handleDismissExplainer}
              >
                got it
              </button>
            </p>
          ) : null}

          {rewardToast ? <p className="theater__reward-toast">{rewardToast}</p> : null}

          <p
            className={`theater__status-card${
              schedule.kind === 'live' ? ' theater__status-card--live' : ''
            }${alreadyAttendedLive ? ' theater__status-card--attended' : ''}`}
          >
            {statusLine}
          </p>

          {featuredPremiere && schedule.kind !== 'live' && screen.kind === 'idle' ? (
            <button
              type="button"
              className="theater__btn theater__btn--accent"
              onClick={handleWatchFeatured}
            >
              watch featured · {featuredPremiere.title}
            </button>
          ) : null}

          <div className="theater__links">
            {outboundYoutubeId ? (
              <a
                className="theater__btn theater__btn--accent"
                href={youtubeWatchUrl(outboundYoutubeId)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackExternalLinkClick(`youtube:watch:${outboundYoutubeId}`)}
              >
                watch full on youtube
              </a>
            ) : null}
            <a
              className="theater__btn"
              href={youtubeSubscribeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackExternalLinkClick('youtube:subscribe')}
            >
              subscribe
            </a>
          </div>

          {featuredPremiere ? (
            <>
              <h2 className="theater__section-title">
                {schedule.kind === 'live' ? 'now premiering' : 'featured drop'}
              </h2>
              <button
                type="button"
                className={`theater__library-item${
                  screen.kind !== 'idle' &&
                  ((screen.kind === 'premiere' && screen.premiereId === featuredPremiere.id) ||
                    (screen.kind === 'library' && screen.libraryId === featuredPremiere.id))
                    ? ' theater__library-item--active'
                    : ''
                }`}
                onClick={handleWatchFeatured}
              >
                <img
                  className="theater__thumb"
                  src={youtubeThumbnailUrl(featuredPremiere.youtubeId)}
                  alt=""
                  loading="lazy"
                />
                <span className="theater__library-label">
                  {featuredPremiere.title}
                  {attendedIds.includes(featuredPremiere.id) ? ' · attended' : ''}
                </span>
              </button>
            </>
          ) : null}

          <h2 className="theater__section-title">library</h2>
          <div className="theater__library">
            {THEATER_LIBRARY.map((video) => (
              <button
                key={video.id}
                type="button"
                className={`theater__library-item${
                  screen.kind === 'library' && screen.libraryId === video.id
                    ? ' theater__library-item--active'
                    : ''
                }`}
                onClick={() => handleLibraryPick(video.id, video.youtubeId, video.title)}
              >
                <img
                  className="theater__thumb"
                  src={youtubeThumbnailUrl(video.youtubeId)}
                  alt=""
                  loading="lazy"
                />
                <span className="theater__library-label">{video.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
