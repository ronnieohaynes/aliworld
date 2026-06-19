import { useEffect, useRef, useState } from 'react'
import { trackTheaterVideoPlay } from '../lib/analytics'
import type { Caption, PlayCutsceneOptions } from '../lib/playCutscene'
import { loadYouTubeIframeApi, type YTPlayer } from '../lib/youtubeIframeApi'
import { registerCutsceneDevPlayer, registerCutsceneDevSkip } from '../hooks/useDevControls'
import {
  registerCutsceneUiHandlers,
  setCutsceneUiActive,
  unregisterCutsceneUiHandlers,
  updateCutsceneUi,
} from '../store/cutsceneUiStore'
import './CutsceneOverlay.css'

const YT_UNSTARTED = -1
const YT_PLAYING = 1
const YT_PAUSED = 2
const YT_BUFFERING = 3
const AUTOPLAY_CHECK_MS = 700

/** Seconds into the clip (0 at startSeconds), for progress. */
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

function clampClipTime(clipTime: number, spanSeconds: number): number {
  if (spanSeconds <= 0) return 0
  return Math.min(spanSeconds, Math.max(0, clipTime))
}

function readYouTubeVideoTitle(player: YTPlayer): string | null {
  const title = player.getVideoData?.().title?.trim()
  return title || null
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
  videoTitle,
  captions,
  youtubeCaptions = false,
  onComplete,
  onEnded,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const hostIdRef = useRef(`cutscene-${Math.random().toString(36).slice(2)}`)
  const playerRef = useRef<YTPlayer | null>(null)
  const playbackGateOpenRef = useRef(false)
  const playbackStartedRef = useRef(false)
  const nearEndPollsRef = useRef(0)
  const lastKnownClipTimeRef = useRef(0)
  const lastApiClipTimeRef = useRef(0)
  const completePlaybackRef = useRef<() => void>(() => {})
  const skipToClipEndRef = useRef<() => void>(() => {})
  const resumeFromUserGestureRef = useRef<() => void>(() => {})
  const toggleSoundMutedRef = useRef<() => void>(() => {})
  const togglePlayPauseRef = useRef<() => void>(() => {})
  const userPausedRef = useRef(false)
  const devSkipAnchorClipRef = useRef<number | null>(null)
  const userGestureStartedRef = useRef(false)
  const autoplayCheckIdRef = useRef(0)
  const endedRef = useRef(false)
  const teardownCompletedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const onEndedRef = useRef(onEnded)
  const [progress, setProgress] = useState(0)
  const [activeCaption, setActiveCaption] = useState<Caption | null>(null)
  const [postHoldPhase, setPostHoldPhase] = useState<'none' | 'hold' | 'fade-to-black'>('none')
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [soundMuted, setSoundMuted] = useState(true)
  const [videoPaused, setVideoPaused] = useState(false)
  const [landscapeFullscreen, setLandscapeFullscreen] = useState(true)
  const autoplayBlockedRef = useRef(false)
  const soundMutedRef = useRef(true)
  autoplayBlockedRef.current = autoplayBlocked
  soundMutedRef.current = soundMuted
  onCompleteRef.current = onComplete
  onEndedRef.current = onEnded
  const useCustomCaptions = !youtubeCaptions && (captions?.length ?? 0) > 0

  useEffect(() => {
    endedRef.current = false
    teardownCompletedRef.current = false
    playbackGateOpenRef.current = false
    playbackStartedRef.current = false
    nearEndPollsRef.current = 0
    lastKnownClipTimeRef.current = 0
    lastApiClipTimeRef.current = 0
    devSkipAnchorClipRef.current = null
    userGestureStartedRef.current = false
    userPausedRef.current = false
    setProgress(0)
    setActiveCaption(null)
    setPostHoldPhase('none')
    setAutoplayBlocked(false)
    setSoundMuted(true)
    setVideoPaused(false)
    setLandscapeFullscreen(true)
    let pollId = 0
    let failId = 0
    let holdId = 0
    let fadeOutId = 0

    const spanSeconds = Math.max(0, endSeconds - startSeconds)

    const teardown = () => {
      if (teardownCompletedRef.current) return
      teardownCompletedRef.current = true
      registerCutsceneDevSkip(null)
      registerCutsceneDevPlayer(null)
      playerRef.current?.destroy()
      playerRef.current = null
      onEndedRef.current()
    }

    const completePlayback = (userSkip = false) => {
      if (endedRef.current) return
      endedRef.current = true
      devSkipAnchorClipRef.current = null
      window.clearInterval(pollId)
      window.clearTimeout(failId)
      window.clearTimeout(holdId)
      window.clearTimeout(fadeOutId)
      setProgress(1)
      setActiveCaption(null)
      setAutoplayBlocked(false)
      playerRef.current?.pauseVideo?.()
      onCompleteRef.current(userSkip ? { userSkip: true } : undefined)
      const hold = userSkip ? 0 : postCompleteHoldMs
      const fadeToBlack = userSkip
        ? 0
        : postCompleteFadeToBlackMs > 0
          ? postCompleteFadeToBlackMs
          : hold > 0
            ? 1_500
            : 0
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

    const updateProgressAtClipTime = (clipTime: number) => {
      const clamped = clampClipTime(clipTime, spanSeconds)
      if (useCustomCaptions) {
        setActiveCaption(findActiveCaption(captions, clamped))
      }
      setProgress(spanSeconds > 0 ? clamped / spanSeconds : 0)
    }

    const openPlaybackGate = () => {
      if (endedRef.current || playbackGateOpenRef.current) return
      playbackGateOpenRef.current = true
      pollPlaybackProgress()
      if (pollId === 0) {
        pollId = window.setInterval(pollPlaybackProgress, 250)
      }
    }

    const markPlaybackActive = (player?: YTPlayer) => {
      playbackStartedRef.current = true
      setAutoplayBlocked(false)
      if (player) {
        openPlaybackGate()
      }
    }

    const scheduleAutoplayCheck = (player: YTPlayer) => {
      const checkId = ++autoplayCheckIdRef.current
      window.setTimeout(() => {
        if (endedRef.current || checkId !== autoplayCheckIdRef.current) return
        if (userGestureStartedRef.current || playbackStartedRef.current) {
          setAutoplayBlocked(false)
          return
        }
        const state =
          typeof player.getPlayerState === 'function' ? player.getPlayerState() : YT_UNSTARTED
        const apiClipTime = readApiClipTime(player)
        if (state === YT_PLAYING || apiClipTime > 0.01) {
          markPlaybackActive(player)
          return
        }
        setAutoplayBlocked(true)
      }, AUTOPLAY_CHECK_MS)
    }

    const tryStartPlayback = (player: YTPlayer) => {
      player.mute?.()
      setSoundMuted(true)
      player.playVideo()
      scheduleAutoplayCheck(player)
    }

    const resumeFromUserGesture = () => {
      const player = playerRef.current
      if (!player || endedRef.current) return
      userGestureStartedRef.current = true
      setAutoplayBlocked(false)
      if (autoplayBlockedRef.current) {
        player.playVideo()
        openPlaybackGate()
        return
      }
      if (soundMutedRef.current) {
        player.unMute?.()
        setSoundMuted(false)
        player.playVideo()
      }
    }
    resumeFromUserGestureRef.current = resumeFromUserGesture

    const toggleSoundMuted = () => {
      const player = playerRef.current
      if (!player || endedRef.current) return
      if (soundMutedRef.current) {
        userGestureStartedRef.current = true
        player.unMute?.()
        setSoundMuted(false)
        setAutoplayBlocked(false)
        player.playVideo()
        openPlaybackGate()
      } else {
        player.mute?.()
        setSoundMuted(true)
      }
    }
    toggleSoundMutedRef.current = toggleSoundMuted

    const enforceUserPause = (player: YTPlayer) => {
      freezeProgress(player)
      setVideoPaused(true)
      const state =
        typeof player.getPlayerState === 'function' ? player.getPlayerState() : YT_UNSTARTED
      if (state === YT_PLAYING || state === YT_BUFFERING) {
        player.pauseVideo()
      }
    }

    const togglePlayPause = () => {
      const player = playerRef.current
      if (!player || endedRef.current) return
      userGestureStartedRef.current = true
      setAutoplayBlocked(false)

      if (!userPausedRef.current) {
        userPausedRef.current = true
        setVideoPaused(true)
        player.pauseVideo()
        enforceUserPause(player)
        return
      }

      userPausedRef.current = false
      setVideoPaused(false)
      player.playVideo()
      openPlaybackGate()
    }
    togglePlayPauseRef.current = togglePlayPause

    const skipToEnd = () => {
      if (endedRef.current) return
      userPausedRef.current = false
      userGestureStartedRef.current = true
      playbackGateOpenRef.current = true
      playbackStartedRef.current = true
      setAutoplayBlocked(false)
      setVideoPaused(false)

      const player = playerRef.current
      if (player) {
        const anchorClip = Math.max(0, spanSeconds - 0.25)
        devSkipAnchorClipRef.current = anchorClip
        lastKnownClipTimeRef.current = anchorClip
        updateProgressAtClipTime(anchorClip)
        player.seekTo(clipSeekTarget(), true)
        player.pauseVideo?.()
      } else {
        setProgress(1)
      }

      completePlayback(true)
    }
    skipToClipEndRef.current = skipToEnd
    registerCutsceneDevSkip(skipToEnd)

    const resolveClipTimeWhilePlaying = (apiClipTime: number): number => {
      const skipAnchor = devSkipAnchorClipRef.current
      let clipTime = apiClipTime
      if (
        clipTime <= 0.05 &&
        playbackStartedRef.current &&
        lastKnownClipTimeRef.current > 0.05
      ) {
        clipTime = lastKnownClipTimeRef.current
      }
      if (skipAnchor != null) {
        clipTime = Math.max(clipTime, skipAnchor)
      }
      return clampClipTime(clipTime, spanSeconds)
    }

    const syncProgressFromPlayer = (player: YTPlayer) => {
      const clipTime = resolveClipTimeWhilePlaying(readApiClipTime(player))
      lastKnownClipTimeRef.current = clipTime
      updateProgressAtClipTime(clipTime)
    }

    const freezeProgress = (player: YTPlayer) => {
      const apiClipTime = readApiClipTime(player)
      if (apiClipTime > 0.05) {
        lastKnownClipTimeRef.current = clampClipTime(apiClipTime, spanSeconds)
      }
      if (playbackStartedRef.current) {
        updateProgressAtClipTime(lastKnownClipTimeRef.current)
      }
    }

    /** Keep the clip running unless the user paused from the shell controls. */
    const resumeIfPausedMidClip = (player: YTPlayer) => {
      if (endedRef.current) return false
      if (userPausedRef.current) {
        enforceUserPause(player)
        return true
      }
      const apiClipTime = readApiClipTime(player)
      if (apiClipTime >= spanSeconds - 0.5) {
        freezeProgress(player)
        return true
      }
      player.playVideo()
      return true
    }

    const pollPlaybackProgress = () => {
      const player = playerRef.current
      if (!player || !playbackGateOpenRef.current) return

      if (userPausedRef.current) {
        enforceUserPause(player)
        return
      }

      const playerState =
        typeof player.getPlayerState === 'function' ? player.getPlayerState() : YT_UNSTARTED
      const apiClipTime = readApiClipTime(player)
      const playheadAdvancing = apiClipTime > lastApiClipTimeRef.current + 0.01
      lastApiClipTimeRef.current = apiClipTime

      if (playerState === YT_PAUSED) {
        resumeIfPausedMidClip(player)
        return
      }

      const videoIsPlaying =
        playerState === YT_PLAYING || (playheadAdvancing && playerState !== YT_UNSTARTED)

      if (videoIsPlaying) {
        playbackStartedRef.current = true
        setAutoplayBlocked(false)
        syncProgressFromPlayer(player)
      } else if (playbackStartedRef.current) {
        freezeProgress(player)
      }

      if (!playbackStartedRef.current || spanSeconds <= 0) return

      const clipTime = lastKnownClipTimeRef.current
      if (videoIsPlaying && clipTime >= spanSeconds - 0.35) {
        nearEndPollsRef.current += 1
        if (nearEndPollsRef.current >= 2) {
          completePlayback()
        }
      } else {
        nearEndPollsRef.current = 0
      }
    }

    const syncMusicBarTitle = (player: YTPlayer) => {
      const youtubeTitle = readYouTubeVideoTitle(player)
      if (youtubeTitle) {
        updateCutsceneUi({ title: youtubeTitle })
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
            cc_load_policy: youtubeCaptions ? 1 : 0,
            ...(youtubeCaptions ? { cc_lang_pref: 'en' } : {}),
          },
          events: {
            onReady: (event) => {
              playerRef.current = event.target
              registerCutsceneDevPlayer(event.target, endSeconds)
              syncMusicBarTitle(event.target)
              tryStartPlayback(event.target)
              window.setTimeout(() => {
                if (endedRef.current) return
                openPlaybackGate()
              }, 400)
            },
            onStateChange: (event) => {
              if (userPausedRef.current) {
                if (event.data === YT_PLAYING || event.data === YT_BUFFERING) {
                  event.target.pauseVideo()
                }
                if (event.data === YT_PAUSED || event.data === YT_PLAYING || event.data === YT_BUFFERING) {
                  enforceUserPause(event.target)
                }
                return
              }
              if (event.data === YT_PAUSED) {
                resumeIfPausedMidClip(event.target)
                return
              }
              if (event.data === YT_BUFFERING) {
                const apiClipTime = readApiClipTime(event.target)
                if (apiClipTime > 0.01) {
                  markPlaybackActive(event.target)
                  syncProgressFromPlayer(event.target)
                }
                return
              }
              if (event.data === YT_PLAYING) {
                setVideoPaused(false)
                markPlaybackActive(event.target)
                syncProgressFromPlayer(event.target)
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
      if (teardownCompletedRef.current) return
      if (endedRef.current) {
        onEndedRef.current()
        return
      }
      registerCutsceneDevPlayer(null)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId, startSeconds, endSeconds, postCompleteHoldMs, postCompleteFadeToBlackMs, captions, youtubeCaptions])

  useEffect(() => {
    overlayRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const title = videoTitle?.trim() || 'cutscene'
    setCutsceneUiActive(true, { title, subtitle: 'ALIWORLD' })
    registerCutsceneUiHandlers({
      skip: () => skipToClipEndRef.current(),
      enterFullscreen: () => setLandscapeFullscreen(true),
      exitFullscreen: () => setLandscapeFullscreen(false),
      toggleSoundMuted: () => toggleSoundMutedRef.current(),
      togglePlayPause: () => togglePlayPauseRef.current(),
      resumeFromGesture: () => resumeFromUserGestureRef.current(),
    })
    return () => {
      unregisterCutsceneUiHandlers()
      setCutsceneUiActive(false)
    }
  }, [videoTitle])

  useEffect(() => {
    updateCutsceneUi({
      progress,
      landscapeFullscreen,
      soundMuted,
      videoPaused,
      gestureKind: autoplayBlocked ? 'play' : null,
    })
  }, [autoplayBlocked, landscapeFullscreen, progress, soundMuted, videoPaused])

  useEffect(() => {
    if (postHoldPhase !== 'none') {
      setLandscapeFullscreen(false)
    }
  }, [postHoldPhase])

  useEffect(() => {
    if (!landscapeFullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLandscapeFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [landscapeFullscreen])

  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [landscapeFullscreen])

  const handleOverlayTap = () => {
    if (autoplayBlocked) {
      resumeFromUserGestureRef.current()
    }
  }

  return (
    <div
      ref={overlayRef}
      className={`cutscene-overlay${
        postHoldPhase === 'hold' ? ' cutscene-overlay--post-hold' : ''
      }${postHoldPhase === 'fade-to-black' ? ' cutscene-overlay--fade-to-black' : ''}${
        landscapeFullscreen ? ' cutscene-overlay--landscape-fullscreen' : ''
      }`}
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
        <div className="cutscene-overlay__video-stage">
          <div id={hostIdRef.current} className="cutscene-overlay__player-host" />
          {useCustomCaptions && activeCaption ? (
            <div
              key={`${activeCaption.start}-${activeCaption.end}`}
              className="cutscene-overlay__caption-slot"
              aria-live="polite"
            >
              <p className="cutscene-overlay__caption">{activeCaption.text}</p>
            </div>
          ) : null}
        </div>
      </div>
      {autoplayBlocked ? (
        <button type="button" className="cutscene-overlay__play-prompt" onClick={handleOverlayTap}>
          tap to play ▸
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
    </div>
  )
}
