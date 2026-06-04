import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  getMusicStoreSnapshot,
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

const JOYSTICK_DEADZONE = 14

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

/** 8-way stick vector → cardinal key set (Player combines held arrows for diagonals). */
function stickVectorToDirections(dx: number, dy: number): Direction[] {
  const mag = Math.hypot(dx, dy)
  if (mag < JOYSTICK_DEADZONE) return []

  const angle = Math.atan2(dy, dx)
  const sector = Math.round(angle / (Math.PI / 4))
  const s = ((sector % 8) + 8) % 8

  const sectors: Direction[][] = [
    ['right'],
    ['down', 'right'],
    ['down'],
    ['down', 'left'],
    ['left'],
    ['up', 'left'],
    ['up'],
    ['up', 'right'],
  ]
  return sectors[s] ?? []
}

function clampKnobOffset(
  dx: number,
  dy: number,
  maxThrow: number,
): { x: number; y: number } {
  const mag = Math.hypot(dx, dy)
  if (mag <= maxThrow || mag === 0) return { x: dx, y: dy }
  const scale = maxThrow / mag
  return { x: dx * scale, y: dy * scale }
}

function maxThrowForZone(size: number): number {
  const knobSize = size * (60 / 140)
  return Math.max(JOYSTICK_DEADZONE + 4, (size - knobSize) / 2)
}

type Props = {
  children: ReactNode
  onInteract?: () => void
  onScript?: () => void
  onFannyPack?: () => void
  onSelect?: () => void
  onStart?: () => void
  startButtonRef?: RefObject<HTMLButtonElement | null>
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

function GameShellJoystick() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const activeDirsRef = useRef<Set<Direction>>(new Set())
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })
  const [engaged, setEngaged] = useState(false)

  const releaseAllKeys = useCallback(() => {
    for (const dir of activeDirsRef.current) {
      dispatchArrowKey(ARROW_KEYS[dir], 'keyup')
    }
    activeDirsRef.current = new Set()
  }, [])

  const applyDirections = useCallback(
    (nextDirs: Direction[]) => {
      const nextSet = new Set(nextDirs)
      const prev = activeDirsRef.current

      for (const dir of prev) {
        if (!nextSet.has(dir)) dispatchArrowKey(ARROW_KEYS[dir], 'keyup')
      }
      for (const dir of nextSet) {
        if (!prev.has(dir)) dispatchArrowKey(ARROW_KEYS[dir], 'keydown')
      }
      activeDirsRef.current = nextSet
    },
    [],
  )

  useEffect(() => () => releaseAllKeys(), [releaseAllKeys])

  const updateFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const zone = zoneRef.current
      if (!zone) return

      const rect = zone.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const rawDx = clientX - cx
      const rawDy = clientY - cy
      const zoneSize = Math.min(rect.width, rect.height)
      const clamped = clampKnobOffset(rawDx, rawDy, maxThrowForZone(zoneSize))

      setKnobOffset(clamped)
      applyDirections(stickVectorToDirections(clamped.x, clamped.y))
    },
    [applyDirections],
  )

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setEngaged(true)
    updateFromClient(e.clientX, e.clientY)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.preventDefault()
    updateFromClient(e.clientX, e.clientY)
  }

  const resetStick = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setEngaged(false)
    setKnobOffset({ x: 0, y: 0 })
    releaseAllKeys()
  }

  const onLostPointerCapture = () => {
    setEngaged(false)
    setKnobOffset({ x: 0, y: 0 })
    releaseAllKeys()
  }

  return (
    <div
      ref={zoneRef}
      className={`game-shell__joystick${engaged ? ' game-shell__joystick--engaged' : ''}`}
      aria-label="Move stick"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={resetStick}
      onPointerCancel={resetStick}
      onLostPointerCapture={onLostPointerCapture}
    >
      <div className="game-shell__joystick-base" aria-hidden />
      <div
        className="game-shell__joystick-knob"
        style={{ transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))` }}
        aria-hidden
      />
    </div>
  )
}

export function GameShell({
  children,
  onInteract = () => {},
  onScript = () => {},
  onFannyPack = () => {},
  onSelect = () => {},
  onStart = () => {},
  startButtonRef,
}: Props) {
  const clock = useLiveClock()
  const music = useSyncExternalStore(
    subscribeMusicStore,
    getMusicStoreSnapshot,
    getMusicStoreSnapshot,
  )
  const playerGranted = music.playerGranted
  const playing = music.playing
  const track = music.current

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
        <GameShellJoystick />

        <div className="game-shell__center-btns">
          <button type="button" className="game-shell__pill-btn" onClick={onSelect}>
            SELECT
          </button>
          <button
            type="button"
            ref={startButtonRef}
            className="game-shell__pill-btn"
            onClick={onStart}
          >
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
        className={`game-shell__music${
          !playerGranted ? ' game-shell__music--locked' : ''
        }${playing && track ? ' game-shell__music--playing' : ''}`}
        aria-live="polite"
      >
        <div className="game-shell__album-art" aria-hidden>
          <span className="game-shell__album-hole" />
        </div>
        <div className="game-shell__track">
          <div className="game-shell__track-title">
            {!playerGranted ? 'no player yet' : track ? track.title : 'no track'}
          </div>
          <div className="game-shell__track-artist">
            {!playerGranted ? '—' : track ? track.artist : '—'}
          </div>
          <div className="game-shell__progress">
            <div className="game-shell__progress-fill" />
          </div>
        </div>
        <div className="game-shell__transport">
          <button
            type="button"
            className="game-shell__transport-btn game-shell__transport-btn--ghost"
            aria-hidden
            tabIndex={-1}
            disabled
          >
            ◀◀
          </button>
          <button
            type="button"
            className="game-shell__transport-btn"
            aria-label={playing ? 'Mute music' : 'Unmute music'}
            onClick={togglePlay}
            disabled={!playerGranted}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            className="game-shell__transport-btn game-shell__transport-btn--ghost"
            aria-hidden
            tabIndex={-1}
            disabled
          >
            ▶▶
          </button>
        </div>
      </div>
    </div>
  )
}
