import { useCallback, useMemo, useRef, useState } from 'react'
import { PixelCharacter } from './PixelCharacter'
import { HPBar } from './HPBar'
import { MiniPlayer } from './MiniPlayer'
import { WATCHER_COLORS, WATCHER_SPRITE } from '../sprites'
import { MDNGHT_SPRITE_SRC } from '../constants/characters'
import { AVATAR_PALETTE } from '../avatar/avatarPalette'
import { buildMdnghtHeadGrid } from '../avatar/buildAvatar'
import { useAvatarLoadout } from '../contexts/AvatarLoadoutContext'
import { SpriteImage } from './SpriteImage'
import { NOW_PLAYING } from '../constants/nowPlaying'
import { BATTLE_BACKGROUND_SRC } from '../constants/assets'
import { BattlePixelBackground } from './BattlePixelBackground'
import { useBattleLog } from '../hooks/useBattleLog'

const MAX_HP = 100

type MoveKind = 'neutral' | 'luck' | 'ghost'

type Move = {
  id: 'slap' | 'fade' | 'hype' | 'ghost'
  name: string
  kind: MoveKind
  blurb: string
}

const MOVES: Move[] = [
  { id: 'slap', name: 'SLAP', kind: 'neutral', blurb: 'direct strike. no variance.' },
  { id: 'fade', name: 'FADE', kind: 'luck', blurb: 'phase out. let the dice talk.' },
  { id: 'hype', name: 'HYPE', kind: 'luck', blurb: 'borrow noise. heal or hurt.' },
  { id: 'ghost', name: 'GHOST', kind: 'ghost', blurb: 'walk through. chip and mend.' },
]

function roll(a: number, b: number) {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)]!
}

const OPENERS = [
  'signal locked. the alley listens.',
  'two ghosts in a trenchcoat of violence.',
  'the feed thins. you do not.',
] as const

const SLAP_LINES = [
  'contact. meat remembers.',
  'a clean arc. the Watcher blinks.',
  'thunder in a small room.',
] as const

const FADE_LINES = [
  'probability hiccups—you were elsewhere.',
  'the dice cough. you take the lane.',
  'static eats the edge. good.',
] as const

const HYPE_LINES = [
  'crowd in your chest. volume illegal.',
  'you borrow tomorrow’s breath.',
  'hype sputters. still—you stand.',
  'luck turns its back. you don’t.',
] as const

const GHOST_LINES = [
  'you walk through the rule.',
  'not here. still hurting.',
  'purple phase. debt collected.',
] as const

const WATCHER_LINES = [
  'the Watcher tolls.',
  'red eye. cheap rent in your ribs.',
  'it hits like policy.',
] as const

const WIN_LINE = 'tape stops. you don’t.'
const LOSE_LINE = 'signal drowned. try the next life.'

export type BattleScreenProps = {
  onOpenAvatar?: () => void
  onOpenWorld?: () => void
}

const BATTLE_MDNGHT_HEAD_CELL = 3

export function BattleScreen({ onOpenAvatar, onOpenWorld }: BattleScreenProps) {
  const battleStageRef = useRef<HTMLDivElement>(null)
  const { face, acc } = useAvatarLoadout()
  const mdnghtHeadGrid = useMemo(() => buildMdnghtHeadGrid(face, acc), [face, acc])
  const { logMove } = useBattleLog()
  const [watcherHp, setWatcherHp] = useState(MAX_HP)
  const [mdnghtHp, setMdnghtHp] = useState(MAX_HP)
  const [busy, setBusy] = useState(false)
  const [logLine, setLogLine] = useState<string>(() => pick(OPENERS))

  const reset = useCallback(() => {
    setWatcherHp(MAX_HP)
    setMdnghtHp(MAX_HP)
    setBusy(false)
    setLogLine(pick(OPENERS))
  }, [])

  const resolveMove = useCallback(
    (move: Move) => {
      let nextW = watcherHp
      let nextM = mdnghtHp

      switch (move.id) {
        case 'slap':
          nextW -= roll(10, 16)
          setLogLine(pick(SLAP_LINES))
          break
        case 'fade': {
          const wild = Math.random()
          if (wild < 0.18) {
            nextW -= roll(0, 4)
            setLogLine('fade whiffs. the air laughs once.')
          } else {
            nextW -= roll(8, 26)
            setLogLine(pick(FADE_LINES))
          }
          break
        }
        case 'hype': {
          if (Math.random() < 0.5) {
            nextM += roll(6, 22)
            setLogLine(pick(HYPE_LINES))
          } else {
            nextW -= roll(4, 18)
            setLogLine('hype spills outward—they eat it.')
          }
          break
        }
        case 'ghost':
          nextW -= roll(7, 13)
          nextM += roll(3, 9)
          setLogLine(pick(GHOST_LINES))
          break
        default:
          break
      }

      nextW = Math.max(0, Math.min(MAX_HP, nextW))
      nextM = Math.max(0, Math.min(MAX_HP, nextM))

      setWatcherHp(nextW)
      setMdnghtHp(nextM)
      void logMove(move.id, nextM, nextW)

      window.setTimeout(() => {
        if (nextW <= 0) {
          setLogLine(WIN_LINE)
          setBusy(false)
          return
        }

        const cut = roll(7, 14)
        const after = Math.max(0, nextM - cut)
        setMdnghtHp(after)
        setLogLine(`${pick(WATCHER_LINES)} (−${cut})`)

        void logMove('rival_turn', after, nextW)

        window.setTimeout(() => {
          if (after <= 0) {
            setLogLine(LOSE_LINE)
          }
          setBusy(false)
        }, 420)
      }, 480)
    },
    [watcherHp, mdnghtHp, logMove],
  )

  const applyMove = useCallback(
    (move: Move) => {
      if (busy || watcherHp <= 0 || mdnghtHp <= 0) return
      setBusy(true)
      resolveMove(move)
    },
    [busy, watcherHp, mdnghtHp, resolveMove],
  )

  const ended = !busy && (watcherHp <= 0 || mdnghtHp <= 0)

  return (
    <div className="battle">
      <div className="battle-surface">
        <header className="status-bar">
          <div className="status-bar-left">
            <span className="status-bar-ep">{NOW_PLAYING.episode}</span>
            <span className="status-bar-dot" aria-hidden>
              ·
            </span>
          </div>
          <span className="status-bar-track">{NOW_PLAYING.track}</span>
          <div className="status-bar-right status-bar-right--dual">
            {onOpenWorld ? (
              <button type="button" className="status-bar-nav" onClick={onOpenWorld}>
                WORLD
              </button>
            ) : null}
            {onOpenAvatar ? (
              <button type="button" className="status-bar-nav" onClick={onOpenAvatar}>
                MDNGHT
              </button>
            ) : !onOpenWorld ? (
              <span className="status-bar-right-spacer" aria-hidden />
            ) : null}
          </div>
        </header>

        <div className="battle-stage" ref={battleStageRef}>
          <BattlePixelBackground src={BATTLE_BACKGROUND_SRC} containerRef={battleStageRef} />
          <div className="battle-stage-veil" aria-hidden />
          <section className="arena" aria-label="Battle arena">
            <div className="arena-fighter arena-fighter--watcher">
              <div className="arena-char-slot">
                <div className="arena-sprite">
                  <PixelCharacter grid={WATCHER_SPRITE} colors={WATCHER_COLORS} cellSize={8} />
                </div>
              </div>
              <p className="arena-name">THE WATCHER</p>
              <HPBar current={watcherHp} max={MAX_HP} variant="watcher" />
            </div>

            <div className="arena-dots" aria-hidden>
              {Array.from({ length: 11 }, (_, i) => (
                <span key={i} className="arena-dot" />
              ))}
            </div>

            <div className="arena-fighter arena-fighter--mdnght">
              <div className="arena-char-slot">
                <div className="arena-sprite arena-sprite--flip">
                  <div className="arena-mdnght-stack">
                    <SpriteImage
                      src={MDNGHT_SPRITE_SRC}
                      alt="MDNGHT"
                      className="arena-mdnght-body arena-sprite-img"
                    />
                    <div className="arena-mdnght-face">
                      <PixelCharacter
                        grid={mdnghtHeadGrid}
                        colors={AVATAR_PALETTE}
                        cellSize={BATTLE_MDNGHT_HEAD_CELL}
                        className="arena-mdnght-face-pixel"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="arena-name">MDNGHT</p>
              <HPBar current={mdnghtHp} max={MAX_HP} variant="mdnght" />
            </div>
          </section>
        </div>

        <p className={`battle-log${ended ? ' battle-log--ended' : ''}`} role="status" aria-live="polite">
          {logLine}
        </p>

        <nav className="move-grid" aria-label="Moves">
          {MOVES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`move-btn move-btn--${m.kind}`}
              style={{ gridArea: m.id }}
              disabled={busy || watcherHp <= 0 || mdnghtHp <= 0}
              onClick={() => applyMove(m)}
            >
              <span className="move-btn-stack">
                <span className="move-btn-label">
                  {m.kind === 'luck' ? <span className="move-btn-luck-dot" aria-hidden /> : null}
                  {m.name}
                </span>
                <span className="move-btn-blurb">{m.blurb}</span>
              </span>
            </button>
          ))}
        </nav>

        {ended ? (
          <button type="button" className="battle-reboot" onClick={reset}>
            REBOOT SIGNAL
          </button>
        ) : null}

        <MiniPlayer />
      </div>
    </div>
  )
}
