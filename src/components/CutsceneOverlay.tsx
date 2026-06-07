import { useEffect, useRef, useState } from 'react'
import { trackTheaterVideoPlay } from '../lib/analytics'
import type { Caption, PlayCutsceneOptions } from '../lib/playCutscene'
import { loadYouTubeIframeApi, type YTPlayer } from '../lib/youtubeIframeApi'
import { registerCutsceneDevPlayer, registerCutsceneDevSkip } from '../hooks/useDevControls'
import './CutsceneOverlay.css'

const YT_UNSTARTED = -1
const YT_PLAYING = 1
const YT_PAUSED = 2
const YT_BUFFERING = 3
const YT_CUED = 5
const AUTOPLAY_CHECK_MS = 700

/** Seconds into the clip (0 at startSeconds), for captions and progress. */
function clipRelativeSeconds(
  playbackSeconds: number,
  startSeconds: number,
  endSeconds: number,
): number {
  const span = endSeconds - startSeconds
  if (span <= 0) return 0
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

function resolveClipTime(
  apiClipTime: number,
  clockClipTime: number,
  skipAnchor: number | null,
): number {
  if (skipAnchor != null) {
    return Math.max(apiClipTime, clockClipTime, skipAnchor)
  }
  if (apiClipTime > 0.05) {
    return Math.max(apiClipTime, clockClipTime)
  }
  return clockClipTime
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
  const skipToClipEndRef = useRef<() => void>(() => {})
  const resumeFromUserGestureRef = useRef<() => void>(() => {})
  const pendingDevSkipRef = useRef(false)
  const devSkipAnchorClipRef = useRef<number | null>(null)
  const autoplayCheckIdRef = useRef(0)
  const endedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const onEndedRef = useRef(onEnded)
  const [progress, setProgress] = useState(0)
  const [activeCaption, setActiveCaption] = useState<Caption | null>(null)
  const [postHoldPhase, setPostHoldPhase] = useState<'none' | 'hold' | 'fade-to-black'>('none')
  const [skipVisible, setSkipVisible] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [soundMuted, setSoundMuted] = useState(true)
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
    setSkipVisible(false)
    setAutoplayBlocked(false)
    setSoundMuted(true)
    let pollId = 0
    let skipRevealId = 0
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
      setAutoplayBlocked(false)
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

    const clipSeekTarget = () => startSeconds + Math.max(0, spanSeconds - 0.25)

    const readApiClipTime = (player: YTPlayer): number => {
      if (typeof player.getCurrentTime !== 'function') return 0
      const current = player.getCurrentTime()
      if (typeof current !== 'number' || !Number.isFinite(current)) return 0
      return clipRelativeSeconds(current, startSeconds, endSeconds)
    }

    const openPlaybackGate = () => {
      if (endedRef.current || playbackGateOpenRef.current) return
      playbackGateOpenRef.current = true
      pollPlaybackProgress()
      if (pollId === 0) {
        pollId = window.setInterval(pollPlaybackProgress, 250)
      }
    }

    const scheduleAutoplayCheck = (player: YTPlayer) => {
      const checkId = ++autoplayCheckIdRef.current
      window.setTimeout(() => {
        if (endedRef.current || checkId !== autoplayCheckIdRef.current) return
        const state =
          typeof player.getPlayerState === 'function' ? player.getPlayerState() : YT_UNSTARTED
        if (state === YT_PLAYING || state === YT_BUFFERING) {
          setAutoplayBlocked(false)
          openPlaybackGate()
          return
        }
        setAutoplayBlocked(true)
      }, AUTOPLAY_CHECK_MS)
    }

    const tryStartPlayback = (player: YTPlayer) => {
      player.mute?.()
      setSoundMuted(true)
      // Do NOT set playbackStartedAtMsRef here — we don't know yet when the
      // video will actually start playing (buffering may take hundreds of ms).
      // onStateChange(YT_PLAYING) is the authoritative clock start point.
      player.playVideo()
      scheduleAutoplayCheck(player)
    }

    const resumeFromUserGesture = () => {
      const player = playerRef.current
      if (!player || endedRef.current) return
      setAutoplayBlocked(false)
      player.unMute?.()
      setSoundMuted(false)
      // Sync clock from the API's actual current time so captions stay aligned
      // whether the video was already playing muted or starting fresh.
      if (typeof player.getCurrentTime === 'function') {
        const current = player.getCurrentTime()
        if (typeof current === 'number' && Number.isFinite(current)) {
          const apiClip = Math.max(0, current - startSeconds)
          playbackStartedAtMsRef.current = Date.now() - apiClip * 1000
        }
      }
      if (playbackStartedAtMsRef.current == null) {
        playbackStartedAtMsRef.current = Date.now()
      }
      player.playVideo()
      openPlaybackGate()
      scheduleAutoplayCheck(player)
    }
    resumeFromUserGestureRef.current = resumeFromUserGesture

    const tryCompleteIfSeekAtEnd = () => {
      const player = playerRef.current
      if (!player || endedRef.current || spanSeconds <= 0) return
      const apiClipTime = readApiClipTime(player)
      if (apiClipTime >= spanSeconds - 0.5) {
        nearEndPollsRef.current = 2
        completePlayback()
      }
    }

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
    skipToClipEndRef.current = skipToEndForDev
    registerCutsceneDevSkip(skipToEndForDev)

    skipRevealId = window.setTimeout(() => setSkipVisible(true), 5000)

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
      const clockClipTime = startedAt != null ? (Date.now() - startedAt) / 1000 : 0

      const skipAnchor = devSkipAnchorClipRef.current
      let clipTime = resolveClipTime(apiClipTime, clockClipTime, skipAnchor)
      clipTime = spanSeconds > 0 ? Math.min(spanSeconds, Math.max(0, clipTime)) : 0

      const playheadMoved = apiClipTime > lastApiClipTimeRef.current + 0.02
      if (playerState === YT_PLAYING || playheadMoved || clipTime > 0.15) {
        playbackLatchedRef.current = true
      }
      lastApiClipTimeRef.current = apiClipTime

      const canAdvance =
        playerState === YT_PLAYING ||
        (playbackLatchedRef.current &&
          (playerState === YT_BUFFERING ||
            playerState === YT_UNSTARTED ||
            playerState === YT_CUED))

      if (playerState !== YT_PAUSED) {
        setActiveCaption(findActiveCaption(captions, clipTime))
      }

      if (!canAdvance) {
        return
      }

      const next = spanSeconds > 0 ? Math.min(1, Math.max(0, clipTime / spanSeconds)) : 0
      setProgress(next)

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
            mute: 1,
            start: startSeconds,
            end: endSeconds,
            enablejsapi: 1,
            origin: window.location.origin,
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
              tryStartPlayback(event.target)
              if (pendingDevSkipRef.current) {
                skipToEndForDev()
              }
              window.setTimeout(() => {
                if (endedRef.current) return
                openPlaybackGate()
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
              if (event.data === YT_PLAYING || event.data === YT_BUFFERING) {
                setAutoplayBlocked(false)
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
              openPlaybackGate()
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
      window.clearTimeout(skipRevealId)
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

  const handleOverlayTap = () => {
    if (autoplayBlocked || soundMuted) {
      resumeFromUserGestureRef.current()
    }
  }

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
      onClick={handleOverlayTap}
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
      {autoplayBlocked ? (
        <button type="button" className="cutscene-overlay__play-prompt" onClick={handleOverlayTap}>
          tap to play ▸
        </button>
      ) : soundMuted ? (
        <button type="button" className="cutscene-overlay__play-prompt cutscene-overlay__play-prompt--muted" onClick={handleOverlayTap}>
          tap for sound ▸
        </button>
      ) : null}
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
      {skipVisible ? (
        <button
          type="button"
          className="cutscene-overlay__skip"
          onClick={(e) => {
            e.stopPropagation()
            skipToClipEndRef.current()
          }}
        >
          skip ▸
        </button>
      ) : null}
    </div>
  )
}
