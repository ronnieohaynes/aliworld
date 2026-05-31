import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  isSoundtrackPlaying,
  subscribeMusicStore,
  toggleSoundtrackPlaying,
} from '../store/musicStore'
import './GameShell.css'

const ARROW_KEYS = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
} as const

type Direction = keyof typeof ARROW_KEYS

function dispatchArrowKey(key: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
    }),
  )
}

type Props = {
  children: ReactNode
  onInteract?: () => void
  onScript?: () => void
  onFannyPack?: () => void
  onSelect?: () => void
  onStart?: () => void
}

function CultSigil({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="game-shell__sigil"
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-hidden
    >
      <polygon points="11,3 20,19 2,19" fill="#534AB7" />
    </svg>
  )
}

function formatClock(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function useLiveClock(): string {
  const [time, setTime] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const tick = () => setTime(formatClock(new Date()))
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return time
}

function bindDpadKey(dir: Direction) {
  const key = ARROW_KEYS[dir]
  return {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dispatchArrowKey(key, 'keydown')
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      dispatchArrowKey(key, 'keyup')
    },
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      dispatchArrowKey(key, 'keyup')
    },
  }
}

export function GameShell({
  children,
  onInteract = () => {},
  onScript = () => {},
  onFannyPack = () => {},
  onSelect = () => {},
  onStart = () => {},
}: Props) {
  const clock = useLiveClock()
  const playing = useSyncExternalStore(
    subscribeMusicStore,
    isSoundtrackPlaying,
    isSoundtrackPlaying,
  )

  const togglePlay = useCallback(() => {
    toggleSoundtrackPlaying()
  }, [])

  return (
    <div className="game-shell">
      <header className="game-shell__topbar">
        <CultSigil />
        <span className="game-shell__brand">ALIWORLD</span>
        <time className="game-shell__clock" aria-label="Local time">
          {clock}
        </time>
      </header>

      <div className="game-shell__bezel">
        <div className="game-shell__viewport">
          <div className="game-shell__viewport-inner">{children}</div>
        </div>
      </div>

      <div className="game-shell__controls">
        <div className="game-shell__dpad" aria-label="Direction pad">
          <div className="game-shell__dpad-body" aria-hidden>
            <div className="game-shell__dpad-bar game-shell__dpad-bar--h" />
            <div className="game-shell__dpad-bar game-shell__dpad-bar--v" />
            <span className="game-shell__dpad-arrow game-shell__dpad-arrow--up" />
            <span className="game-shell__dpad-arrow game-shell__dpad-arrow--down" />
            <span className="game-shell__dpad-arrow game-shell__dpad-arrow--left" />
            <span className="game-shell__dpad-arrow game-shell__dpad-arrow--right" />
          </div>
          <button
            type="button"
            className="game-shell__dpad-hit game-shell__dpad-hit--up"
            aria-label="Move up"
            {...bindDpadKey('up')}
          />
          <button
            type="button"
            className="game-shell__dpad-hit game-shell__dpad-hit--down"
            aria-label="Move down"
            {...bindDpadKey('down')}
          />
          <button
            type="button"
            className="game-shell__dpad-hit game-shell__dpad-hit--left"
            aria-label="Move left"
            {...bindDpadKey('left')}
          />
          <button
            type="button"
            className="game-shell__dpad-hit game-shell__dpad-hit--right"
            aria-label="Move right"
            {...bindDpadKey('right')}
          />
        </div>

        <div className="game-shell__center-btns">
          <button type="button" className="game-shell__pill-btn" onClick={onSelect}>
            SELECT
          </button>
          <button type="button" className="game-shell__pill-btn" onClick={onStart}>
            START
          </button>
        </div>

        <div className="game-shell__actions">
          <button
            type="button"
            className="game-shell__action game-shell__action--interact"
            aria-label="INTERACT"
            title="INTERACT"
            onClick={onInteract}
          >
            <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden>
              <polygon points="6,1 11,9 1,9" fill="#AFA9EC" />
            </svg>
          </button>
          <button
            type="button"
            className="game-shell__action game-shell__action--script"
            aria-label="SCRIPT"
            title="SCRIPT"
            onClick={onScript}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path
                d="M2 10 L2 2 L7 2 L10 5 L10 10 Z"
                fill="none"
                stroke="#378ADD"
                strokeWidth="1.2"
              />
              <line x1="4" y1="6" x2="8" y2="6" stroke="#378ADD" strokeWidth="1" />
              <line x1="4" y1="8" x2="7" y2="8" stroke="#378ADD" strokeWidth="1" />
            </svg>
          </button>
          <button
            type="button"
            className="game-shell__action game-shell__action--pack"
            aria-label="FANNY PACK"
            title="FANNY PACK"
            onClick={onFannyPack}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <rect
                x="2"
                y="3"
                width="8"
                height="7"
                rx="1"
                fill="none"
                stroke="#534AB7"
                strokeWidth="1.2"
              />
              <path d="M4 3 V2 H8 V3" fill="none" stroke="#534AB7" strokeWidth="1" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`game-shell__music${playing ? ' game-shell__music--playing' : ''}`}
        aria-live="polite"
      >
        <div className="game-shell__album-art" aria-hidden>
          <span className="game-shell__album-hole" />
        </div>
        <div className="game-shell__track">
          <div className="game-shell__track-title">BETTER LUCK NEXT TIME</div>
          <div className="game-shell__track-artist">Danny Ali</div>
          <div className="game-shell__progress">
            <div className="game-shell__progress-fill" />
          </div>
        </div>
        <div className="game-shell__transport">
          <button type="button" className="game-shell__transport-btn" aria-label="Previous track">
            ◀◀
          </button>
          <button
            type="button"
            className="game-shell__transport-btn"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={togglePlay}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button type="button" className="game-shell__transport-btn" aria-label="Next track">
            ▶▶
          </button>
        </div>
      </div>
    </div>
  )
}
