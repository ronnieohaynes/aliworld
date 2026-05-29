import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  MIDNIGHT_WALK_FRAME_HEIGHT,
  MIDNIGHT_WALK_FRAME_WIDTH,
  MIDNIGHT_WALK_IDLE_FRAME,
  MIDNIGHT_WALK_SRC,
} from '../constants/gameAssets'
import { publicAsset } from '../utils/publicAsset'
import { chromaKeyImage } from '../game/chromaKeyImage'
import {
  applyBattleEndHealing,
  battleReducer,
  createInitialBattleState,
  getEnemyStatusText,
  getTelegraphText,
  type PlayerMove,
} from '../store/battleStore'
import { getOverworldPlayerHp, getPlayerLevel, setOverworldPlayerHp } from '../store/playerStore'
import './BattleScreen.css'
import './PlayerLevelBadge.css'

const MARK_SPRITE_SRC = publicAsset('Assets/Characters/npcs/npc3-idle-sheet.png')
const RESOLVE_DELAY_MS = 650
const END_WIN_DELAY_MS = 600
const END_LOSE_DELAY_MS = 500

const IDLE_SX = MIDNIGHT_WALK_IDLE_FRAME * MIDNIGHT_WALK_FRAME_WIDTH
const IDLE_SY = 0
const PLAYER_SPRITE_PX = 96
const ENEMY_SPRITE_W = 80
const ENEMY_SPRITE_H = 110

const MOVES: { move: PlayerMove; label: string; className: string }[] = [
  { move: 'STRIKE', label: 'STRIKE', className: 'battle-screen__move--strike' },
  { move: 'SLIP', label: 'SLIP', className: 'battle-screen__move--slip' },
  { move: 'HOLD', label: 'HOLD', className: 'battle-screen__move--hold' },
  { move: 'WHISPER', label: 'WHISPER', className: 'battle-screen__move--whisper' },
]

type Props = {
  npcId: string
  onBattleEnd: (result: 'win' | 'lose') => void
}

export function BattleScreen({ npcId, onBattleEnd }: Props) {
  const playerCanvasRef = useRef<HTMLCanvasElement>(null)
  const enemyCanvasRef = useRef<HTMLCanvasElement>(null)
  const endHandledRef = useRef(false)

  const [state, dispatch] = useReducer(
    battleReducer,
    npcId,
    (id) =>
      createInitialBattleState(id, {
        carryHp: getOverworldPlayerHp() ?? undefined,
      }),
  )

  const busy = state.phase !== 'player'
  const playerHpPct = Math.max(0, (state.playerHp / state.playerStats.maxHp) * 100)
  const enemyHpPct = Math.max(0, (state.enemyHp / state.enemyMaxHp) * 100)
  const enemyStatus = getEnemyStatusText(state)
  const playerLevel = getPlayerLevel()

  const handleMove = useCallback(
    (move: PlayerMove) => {
      if (state.phase !== 'player') return
      dispatch({ type: 'PLAYER_MOVE', move })
    },
    [state.phase],
  )

  useEffect(() => {
    if (state.phase !== 'busy' && state.phase !== 'ended') return

    const delay = state.result
      ? state.result === 'win'
        ? END_WIN_DELAY_MS
        : END_LOSE_DELAY_MS
      : RESOLVE_DELAY_MS

    const timer = window.setTimeout(() => {
      if (state.result) {
        if (endHandledRef.current) return
        endHandledRef.current = true
        const healed = applyBattleEndHealing(
          state.result,
          state.playerStats.maxHp,
          state.playerHp,
        )
        setOverworldPlayerHp(healed)
        onBattleEnd(state.result)
        return
      }
      dispatch({ type: 'RESOLVE_COMPLETE' })
    }, delay)

    return () => window.clearTimeout(timer)
  }, [state.phase, state.result, state.playerHp, state.playerStats.maxHp, onBattleEnd])

  useEffect(() => {
    const canvas = playerCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const img = new Image()
    img.src = MIDNIGHT_WALK_SRC
    img.onload = () => {
      const keyed = chromaKeyImage(img, { edgeConnected: true })
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, PLAYER_SPRITE_PX, PLAYER_SPRITE_PX)
      ctx.drawImage(
        keyed,
        IDLE_SX,
        IDLE_SY,
        MIDNIGHT_WALK_FRAME_WIDTH,
        MIDNIGHT_WALK_FRAME_HEIGHT,
        0,
        0,
        PLAYER_SPRITE_PX,
        PLAYER_SPRITE_PX,
      )
    }
  }, [])

  useEffect(() => {
    const canvas = enemyCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const spriteSrc = state.npc.spriteSrc ?? MARK_SPRITE_SRC
    const img = new Image()
    img.src = spriteSrc
    img.onload = () => {
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, ENEMY_SPRITE_W, ENEMY_SPRITE_H)
      const frameW = Math.floor(img.width / 4)
      const frameH = img.height
      ctx.drawImage(img, 0, 0, frameW, frameH, 0, 0, ENEMY_SPRITE_W, ENEMY_SPRITE_H)
    }
    img.onerror = () => {
      ctx.clearRect(0, 0, ENEMY_SPRITE_W, ENEMY_SPRITE_H)
    }
  }, [state.npc.spriteSrc])

  return (
    <div className="battle-screen" aria-label={`Battle vs ${state.npc.displayName}`}>
      <section className="battle-screen__enemy">
        <span className="battle-screen__enemy-name">{state.npc.displayName}</span>
        <div className="battle-screen__hp-track">
          <div
            className="battle-screen__hp-fill battle-screen__hp-fill--enemy"
            style={{ width: `${enemyHpPct}%` }}
          />
        </div>
        <div className="battle-screen__status">{enemyStatus || '\u00a0'}</div>
        <div className="battle-screen__enemy-sprite">
          <canvas
            ref={enemyCanvasRef}
            className="battle-screen__enemy-sprite-canvas"
            width={ENEMY_SPRITE_W}
            height={ENEMY_SPRITE_H}
          />
        </div>
      </section>

      <div className="battle-screen__divider" role="separator" />

      <section className="battle-screen__middle">
        <p className="battle-screen__telegraph">{getTelegraphText(state)}</p>
        <div className="battle-screen__log" aria-live="polite">
          {state.log.map((line, i) => (
            <div key={`${i}-${line}`} className="battle-screen__log-line">
              {line}
            </div>
          ))}
        </div>
      </section>

      <section className="battle-screen__player">
        <canvas
          ref={playerCanvasRef}
          className="battle-screen__player-sprite-canvas"
          width={PLAYER_SPRITE_PX}
          height={PLAYER_SPRITE_PX}
        />
        <div className="battle-screen__player-label">
          <span>YOU</span>
          <span
            className={`player-level-badge battle-screen__player-level${state.playerLevelFlash ? ' player-level-badge--flash' : ''}`}
          >
            LVL {playerLevel}
          </span>
          {state.playerBrace > 0 && (
            <span className="battle-screen__brace">braced</span>
          )}
        </div>
        <div className="battle-screen__hp-track">
          <div
            className="battle-screen__hp-fill battle-screen__hp-fill--player"
            style={{ width: `${playerHpPct}%` }}
          />
        </div>
        <div className="battle-screen__hp-numbers">
          {state.playerHp} / {state.playerStats.maxHp}
        </div>
      </section>

      <div className="battle-screen__wheel">
        <div className="battle-screen__wheel-inner">
          {MOVES.map(({ move, label, className }) => (
            <button
              key={move}
              type="button"
              className={`battle-screen__move ${className}${busy ? ' battle-screen__move--busy' : ''}`}
              disabled={busy}
              onClick={() => handleMove(move)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
