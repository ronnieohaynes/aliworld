import { useCallback, useEffect, useRef, useState } from 'react'
import { NOW_PLAYING } from '../constants/nowPlaying'

/** Minimal WAV so the element stays in a real “playing” state (near-silent). */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA=='

function IconSkip() {
  return (
    <svg className="mini-player-svg" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M6 4h2v16H6V4zm12 0v16l-10-8 10-8z" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg className="mini-player-svg" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg className="mini-player-svg" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M8 5v14l11-7-11-7z" />
    </svg>
  )
}

export function MiniPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = 0.0001
    const tryPlay = () => {
      void el.play().catch(() => {})
    }
    if (!paused) tryPlay()
    const onVis = () => {
      if (document.visibilityState === 'visible' && !paused) tryPlay()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [paused])

  const togglePause = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (paused) {
      void el.play()
      setPaused(false)
    } else {
      el.pause()
      setPaused(true)
    }
  }, [paused])

  const skip = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    try {
      const d = el.duration
      el.currentTime = Number.isFinite(d) && d > 0 ? Math.min(d - 0.01, el.currentTime + 12) : 0
    } catch {
      el.currentTime = 0
    }
  }, [])

  return (
    <footer className="mini-player" aria-label="Now playing">
      <audio ref={audioRef} src={SILENT_WAV} loop playsInline preload="auto" />
      <div className="mini-player-art" aria-hidden>
        <span className="mini-player-art-rim" />
      </div>
      <div className="mini-player-meta">
        <p className="mini-player-track">{NOW_PLAYING.track}</p>
        <p className="mini-player-artist">{NOW_PLAYING.artist}</p>
      </div>
      <div className="mini-player-controls">
        <button type="button" className="mini-player-btn" onClick={skip} aria-label="Skip forward">
          <IconSkip />
        </button>
        <button
          type="button"
          className="mini-player-btn mini-player-btn--main"
          onClick={togglePause}
          aria-label={paused ? 'Play' : 'Pause'}
        >
          {paused ? <IconPlay /> : <IconPause />}
        </button>
      </div>
    </footer>
  )
}
