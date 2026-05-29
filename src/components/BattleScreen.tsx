import { useEffect, useRef } from 'react'
import {
  MIDNIGHT_WALK_FRAME_HEIGHT,
  MIDNIGHT_WALK_FRAME_WIDTH,
  MIDNIGHT_WALK_IDLE_FRAME,
  MIDNIGHT_WALK_SRC,
} from '../constants/gameAssets'
import { chromaKeyImage } from '../game/chromaKeyImage'
import { publicAsset } from '../utils/publicAsset'
import './BattleScreen.css'

const BATTLE_BG_SRC = publicAsset('Assets/Backgrounds/13gallons-interior.png')

/** Front-facing idle: row 0, column 1 of the 4×4 walk sheet. */
const IDLE_SX = MIDNIGHT_WALK_IDLE_FRAME * MIDNIGHT_WALK_FRAME_WIDTH
const IDLE_SY = 0
const SPRITE_CANVAS_PX = 96

type Move = {
  label: string
  luck: boolean
  ghost: boolean
}

const MOVES: Move[] = [
  { label: 'SLAP', luck: false, ghost: false },
  { label: 'FADE', luck: true, ghost: false },
  { label: 'HYPE', luck: true, ghost: false },
  { label: 'GHOST', luck: false, ghost: true },
]

export function BattleScreen() {
  const spriteCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = spriteCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const img = new Image()
    img.src = MIDNIGHT_WALK_SRC
    img.onload = () => {
      const keyed = chromaKeyImage(img, { edgeConnected: true })
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, SPRITE_CANVAS_PX, SPRITE_CANVAS_PX)
      ctx.drawImage(
        keyed,
        IDLE_SX,
        IDLE_SY,
        MIDNIGHT_WALK_FRAME_WIDTH,
        MIDNIGHT_WALK_FRAME_HEIGHT,
        0,
        0,
        SPRITE_CANVAS_PX,
        SPRITE_CANVAS_PX,
      )
    }
  }, [])

  return (
    <div className="battle-screen">
      {/* Background — falls back to solid dark fill via CSS */}
      <img
        className="battle-screen__bg"
        src={BATTLE_BG_SRC}
        alt=""
        draggable={false}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />

      {/* HP bars */}
      <div className="battle-screen__hud">
        <div className="battle-screen__hp">
          <span className="battle-screen__hp-label">MDNGHT</span>
          <div className="battle-screen__hp-track">
            <div className="battle-screen__hp-fill battle-screen__hp-fill--player" />
          </div>
        </div>
        <div className="battle-screen__hp battle-screen__hp--right">
          <span className="battle-screen__hp-label">MARK</span>
          <div className="battle-screen__hp-track">
            <div className="battle-screen__hp-fill battle-screen__hp-fill--enemy" />
          </div>
        </div>
      </div>

      {/* Arena sprites */}
      <div className="battle-screen__arena">
        <div className="battle-screen__sprite battle-screen__sprite--player">
          <canvas
            ref={spriteCanvasRef}
            className="battle-screen__sprite-canvas"
            width={SPRITE_CANVAS_PX}
            height={SPRITE_CANVAS_PX}
          />
        </div>
        <div className="battle-screen__sprite battle-screen__sprite--enemy" />
      </div>

      {/* Bottom panel */}
      <div className="battle-screen__bottom">
        <div className="battle-screen__log">A wild MARK appeared!</div>
        <div className="battle-screen__moves">
          {MOVES.map((move) => (
            <button
              key={move.label}
              type="button"
              className={`battle-screen__move${move.ghost ? ' battle-screen__move--ghost' : ''}`}
            >
              {move.label}
              {move.luck && <span className="battle-screen__move-luck" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
