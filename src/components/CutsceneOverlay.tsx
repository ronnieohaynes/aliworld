import { useEffect, useRef, useState } from 'react'
import { trackTheaterVideoPlay } from '../lib/analytics'
import type { Caption, PlayCutsceneOptions } from '../lib/playCutscene'
import { registerCutsceneDevPlayer, registerCutsceneDevSkip } from '../hooks/useDevControls'
import './CutsceneOverlay.css'

const YT_UNSTARTED = -1
const YT_PLAYING = 1
const YT_PAUSED = 2
const YT_BUFFERING = 3
const YT_CUED = 5

type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  destroy: () => void
  getCurrentTime: () => number
  getPlayerState: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

type YTNamespace = {
  Player: new (
    elementId: string,
    options: {
      videoId: string
      playerVars?: Record<string, number | string>
      events?: {
        onReady?: (event: { target: YTPlayer }) => void
        onStateChange?: (event: { data: number; target: YTPlayer }) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let ytApiPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  ytApiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.head.appendChild(script)
  })
  return ytApiPromise
}

/** Seconds into the clip (0 at startSeconds), for captions and progress. */
function clipRelativeSeconds(
  playbackSeconds: number,
  startSeconds: number,
  endSeconds: number,
): number {
  const span = endSeconds - startSeconds
  if (span <= 0) return 0
  // IFrame API returns position from the video start, not 0 at clip start.
  if (playbackSeconds >= startSeconds - 0.5) {
    return Math.min(span, Math.max(0, playbackSeconds - startSeconds))
  }
  if (playbackSeconds >= 0 && playbackSeconds <= span + 1) {
    return playbackSeconds
  }
  return Math.max(0, playbackSeconds - startSeconds)
}

function findActiveCaption(captions: Caption[] | undefined, clipTime: number): Caption | null {
  if (!captions?.length) return null
  for (const entry of captions) {
    if (clipTime >= entry.start && clipTime <= entry.end) {
      return entry
    }
  }
  return null
}

type Props = PlayCutsceneOptions & {
  onEnded: () => void
}

export function CutsceneOverlay({
  videoId,
  startSeconds,
  endSeconds,
  postCompleteHoldMs = 0,
  postCompleteFadeToBlackMs = 0,
  captions,
  onComplete,
  onEnded,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const hostIdRef = useRef(`cutscene-${Math.random().toString(36).slice(2)}`)
  const playerRef = useRef<YTPlayer | null>(null)
  const playbackStartedAtMsRef = useRef<number | null>(null)
  const pausedAtMsRef = useRef<number | null>(null)
  const playbackGateOpenRef = useRef(false)
  const nearEndPollsRef = useRef(0)
  const playbackLatchedRef = useRef(false)
  const lastApiClipTimeRef = useRef(0)
  const completePlaybackRef = useRef<() => void>(() => {})
  const pendingDevSkipRef = useRef(false)
  const devSkipAnchorClipRef = useRef<number | null>(null)
  const endedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const onEndedRef = useRef(onEnded)
  const [progress, setProgress] = useState(0)
  const [activeCaption, setActiveCaption] = useState<Caption | null>(null)
  const [postHoldPhase, setPostHoldPhase] = useState<'none' | 'hold' | 'fade-to-black'>('none')
  onCompleteRef.current = onComplete
  onEndedRef.current = onEnded

  useEffect(() => {
    endedRef.current = false
    playbackStartedAtMsRef.current = null
    pausedAtMsRef.current = null
    playbackGateOpenRef.current = false
    nearEndPollsRef.current = 0
    playbackLatchedRef.current = false
    lastApiClipTimeRef.current = 0
    devSkipAnchorClipRef.current = null
    setProgress(0)
    setActiveCaption(null)
    setPostHoldPhase('none')
    let pollId = 0
    let failId = 0
    let holdId = 0
    let fadeOutId = 0

    const spanSeconds = Math.max(0, endSeconds - startSeconds)

    const teardown = () => {
      registerCutsceneDevSkip(null)
      registerCutsceneDevPlayer(null)
      playerRef.current?.destroy()
      playerRef.current = null
      playbackStartedAtMsRef.current = null
      onEndedRef.current()
    }

    const completePlayback = () => {
      if (endedRef.current) return
      endedRef.current = true
      devSkipAnchorClipRef.current = null
      window.clearInterval(pollId)
      window.clearTimeout(failId)
      setProgress(1)
      setActiveCaption(null)
      playerRef.current?.pauseVideo?.()
      onCompleteRef.current()
      const hold = postCompleteHoldMs
      const fadeToBlack =
        postCompleteFadeToBlackMs > 0 ? postCompleteFadeToBlackMs : hold > 0 ? 1_500 : 0
      if (hold > 0) {
        setPostHoldPhase('hold')
        holdId = window.setTimeout(() => {
          setPostHoldPhase('fade-to-black')
          fadeOutId = window.setTimeout(teardown, fadeToBlack)
        }, hold)
      } else {
        teardown()
      }
    }
    completePlaybackRef.current = completePlayback

    const clipSeekTarget = () =>
      startSeconds + Math.max(0, spanSeconds - 0.25)

    const readApiClipTime = (player: YTPlayer): number => {
      if (typeof player.getCurrentTime !== 'function') return 0
      const current = player.getCurrentTime()
      if (typeof current !== 'number' || !Number.isFinite(current)) return 0
      return clipRelativeSeconds(current, startSeconds, endSeconds)
    }

    const tryCompleteIfSeekAtEnd = () => {
      const player = playerRef.current
      if (!player || endedRef.current || spanSeconds <= 0) return
      const apiClipTime = readApiClipTime(player)
      if (apiClipTime >= spanSeconds - 0.5) {
        nearEndPollsRef.current = 2
        completePlayback()
      }
    }

    /** Dev only: jump playhead to clip end; normal end detection + post-hold still run. */
    const skipToEndForDev = () => {
      if (endedRef.current) return
      playbackGateOpenRef.current = true
      playbackLatchedRef.current = true

      const player = playerRef.current
      if (!player) {
        pendingDevSkipRef.current = true
        return
      }

      pendingDevSkipRef.current = false
      const anchorClip = Math.max(0, spanSeconds - 0.25)
      devSkipAnchorClipRef.current = anchorClip
      playbackStartedAtMsRef.current = Date.now() - anchorClip * 1000
      pausedAtMsRef.current = null
      lastApiClipTimeRef.current = anchorClip
      player.seekTo(clipSeekTarget(), true)
      player.playVideo?.()
      nearEndPollsRef.current = 2
      if (spanSeconds > 0) {
        const next = Math.min(1, anchorClip / spanSeconds)
        setProgress(next)
        setActiveCaption(findActiveCaption(captions, anchorClip))
      }

      window.setTimeout(() => {
        pollPlaybackProgress()
        tryCompleteIfSeekAtEnd()
      }, 200)
      window.setTimeout(() => {
        pollPlaybackProgress()
        tryCompleteIfSeekAtEnd()
      }, 600)
      window.setTimeout(() => {
        tryCompleteIfSeekAtEnd()
      }, 1200)
    }
    registerCutsceneDevSkip(skipToEndForDev)

    const pollPlaybackProgress = () => {
      const player = playerRef.current
      if (!player || !playbackGateOpenRef.current) return

      const playerState =
        typeof player.getPlayerState === 'function' ? player.getPlayerState() : YT_PLAYING

      const apiClipTime = readApiClipTime(player)

      if (playerState === YT_PAUSED && apiClipTime < spanSeconds - 0.5) {
        setActiveCaption(null)
        return
      }

      const startedAt = playbackStartedAtMsRef.current
      const clockClipTime =
        startedAt != null ? (Date.now() - startedAt) / 1000 : 0

      const skipAnchor = devSkipAnchorClipRef.current
      let clipTime: number
      if (skipAnchor != null) {
        // After Shift+E, keep UI tied to playhead (not pre-skip wall clock).
        clipTime = Math.max(apiClipTime, clockClipTime, skipAnchor)
      } else {
        // Prefer advancing API time; wall clock covers stuck/zero getCurrentTime().
        clipTime = clockClipTime
        if (apiClipTime > 0.05 || clockClipTime < 0.5) {
          if (apiClipTime <= clockClipTime + 3) {
            clipTime = Math.max(apiClipTime, clockClipTime)
          } else if (apiClipTime >= spanSeconds - 0.35) {
            clipTime = apiClipTime
          }
        }
      }
      clipTime = spanSeconds > 0 ? Math.min(spanSeconds, clipTime) : 0

      const playheadMoved = apiClipTime > lastApiClipTimeRef.current + 0.02
      if (
        playerState === YT_PLAYING ||
        playheadMoved ||
        clipTime > 0.15
      ) {
        playbackLatchedRef.current = true
      }
      lastApiClipTimeRef.current = apiClipTime

      const canAdvance =
        playerState === YT_PLAYING ||
        (playbackLatchedRef.current &&
          (playerState === YT_BUFFERING ||
            playerState === YT_UNSTARTED ||
            playerState === YT_CUED))

      if (!canAdvance) {
        setActiveCaption(null)
        return
      }

      const hideCaption = playerState === YT_BUFFERING

      const next =
        spanSeconds > 0 ? Math.min(1, Math.max(0, clipTime / spanSeconds)) : 0
      setProgress(next)
      setActiveCaption(hideCaption ? null : findActiveCaption(captions, clipTime))

      if (spanSeconds <= 0) return

      if (skipAnchor == null && clockClipTime >= spanSeconds - 0.35) {
        completePlayback()
        return
      }

      if (apiClipTime >= spanSeconds - 0.35 || clipTime >= spanSeconds - 0.35) {
        nearEndPollsRef.current += 1
        if (nearEndPollsRef.current >= 2) {
          completePlayback()
        }
      } else {
        nearEndPollsRef.current = 0
      }
    }

    trackTheaterVideoPlay(videoId)

    void loadYouTubeIframeApi()
      .then(() => {
        if (endedRef.current || !window.YT?.Player) {
          completePlayback()
          return
        }
        new window.YT.Player(hostIdRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            start: startSeconds,
            end: endSeconds,
            enablejsapi: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            fs: 0,
            disablekb: 1,
          },
          events: {
            onReady: (event) => {
              playerRef.current = event.target
              registerCutsceneDevPlayer(event.target, endSeconds)
              playbackStartedAtMsRef.current = Date.now()
              event.target.playVideo()
              if (pendingDevSkipRef.current) {
                skipToEndForDev()
              }
              window.setTimeout(() => {
                if (endedRef.current) return
                playbackGateOpenRef.current = true
                pollPlaybackProgress()
                if (pollId === 0) {
                  pollId = window.setInterval(pollPlaybackProgress, 250)
                }
              }, 400)
            },
            onStateChange: (event) => {
              if (event.data === YT_PAUSED) {
                if (pausedAtMsRef.current == null) {
                  pausedAtMsRef.current = Date.now()
                }
                setActiveCaption(null)
                return
              }
              if (event.data === YT_BUFFERING) {
                setActiveCaption(null)
              }
              if (event.data === YT_PLAYING && pausedAtMsRef.current != null) {
                const pausedMs = Date.now() - pausedAtMsRef.current
                pausedAtMsRef.current = null
                if (playbackStartedAtMsRef.current != null) {
                  playbackStartedAtMsRef.current += pausedMs
                }
              }
              if (event.data === YT_PLAYING) {
                playbackLatchedRef.current = true
              }
              if (event.data !== YT_PLAYING) return
              if (playbackStartedAtMsRef.current == null) {
                playbackStartedAtMsRef.current = Date.now()
              }
              if (!playbackGateOpenRef.current) {
                playbackGateOpenRef.current = true
                pollPlaybackProgress()
                if (pollId === 0) {
                  pollId = window.setInterval(pollPlaybackProgress, 250)
                }
              }
            },
          },
        })
      })
      .catch(() => completePlayback())

    failId = window.setTimeout(completePlayback, (spanSeconds + 30) * 1000)

    return () => {
      registerCutsceneDevSkip(null)
      window.clearInterval(pollId)
      window.clearTimeout(failId)
      window.clearTimeout(holdId)
      window.clearTimeout(fadeOutId)
      if (!endedRef.current) {
        registerCutsceneDevPlayer(null)
        playerRef.current?.destroy()
        playerRef.current = null
        playbackStartedAtMsRef.current = null
      }
    }
  }, [videoId, startSeconds, endSeconds, postCompleteHoldMs, postCompleteFadeToBlackMs, captions])

  useEffect(() => {
    overlayRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={overlayRef}
      className={`cutscene-overlay${
        postHoldPhase === 'hold' ? ' cutscene-overlay--post-hold' : ''
      }${postHoldPhase === 'fade-to-black' ? ' cutscene-overlay--fade-to-black' : ''}`}
      style={
        postCompleteFadeToBlackMs > 0 || postCompleteHoldMs > 0
          ? {
              ['--cutscene-post-fade-ms' as string]: `${
                postCompleteFadeToBlackMs > 0 ? postCompleteFadeToBlackMs : 1_500
              }ms`,
            }
          : undefined
      }
      role="dialog"
      aria-modal="true"
      aria-label="Cutscene"
      tabIndex={-1}
    >
      <div className="cutscene-overlay__frame">
        <div id={hostIdRef.current} className="cutscene-overlay__player-host" />
        {activeCaption ? (
          <div
            key={`${activeCaption.start}-${activeCaption.end}`}
            className="cutscene-overlay__caption-slot"
            aria-live="polite"
          >
            <p className="cutscene-overlay__caption">{activeCaption.text}</p>
          </div>
        ) : null}
      </div>
      <div
        className="cutscene-overlay__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className="cutscene-overlay__progress-fill"
          style={{ width: `${Math.round(progress * 10000) / 100}%` }}
        />
      </div>
    </div>
  )
}
