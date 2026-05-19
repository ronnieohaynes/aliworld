import { useEffect, useRef, type PointerEvent } from 'react'
import {
  MIDNIGHT_WALK_COLUMNS,
  MIDNIGHT_WALK_DRAW_OFFSET_Y,
  MIDNIGHT_WALK_DISPLAY_HEIGHT,
  MIDNIGHT_WALK_DISPLAY_WIDTH,
  MIDNIGHT_WALK_FRAME_HEIGHT,
  MIDNIGHT_WALK_FRAME_WIDTH,
  MIDNIGHT_WALK_FRAMES_PER_DIRECTION,
  MIDNIGHT_WALK_IDLE_FRAME,
  MIDNIGHT_WALK_ROWS,
  MIDNIGHT_WALK_SRC,
} from '../constants/gameAssets'
import {
  PLAYER_START_X,
  PLAYER_START_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../constants/worldAssets'
import { drawWorldBackground } from '../game/drawWorldBackground'
import { useGameCanvas } from '../game/GameCanvasContext'
import { SpriteSheet, type Direction } from '../game/SpriteSheet'
import { loadWorldBackground } from '../game/WorldBackground'
import './Player.css'

const MOVE_SPEED = 120
const ANIM_FPS = 8
const ANIM_INTERVAL = 1 / ANIM_FPS
const WALK_FRAME_COUNT = MIDNIGHT_WALK_FRAMES_PER_DIRECTION

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowDown: 'down',
  ArrowUp: 'up',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

type Vec = { x: number; y: number }

type DebugInfo = {
  direction: Direction
  frame: number
  sx: number
  sy: number
  state: 'moving' | 'idle'
}

function formatDebugText({ direction, frame, sx, sy, state }: DebugInfo): string {
  return [
    `direction: ${direction}`,
    `frame: ${frame}`,
    `sx: ${sx.toFixed(1)}  sy: ${sy.toFixed(1)}`,
    `state: ${state}`,
  ].join('\n')
}

function drawDebugOverlay(ctx: CanvasRenderingContext2D, info: DebugInfo) {
  const lines = formatDebugText(info).split('\n')
  const pad = 8
  const lineHeight = 18
  const boxW = 220
  const boxH = pad * 2 + lines.length * lineHeight

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
  ctx.fillRect(0, 0, boxW, boxH)
  ctx.font = '14px monospace'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, pad + i * lineHeight)
  })
}

/** Open-world movement (world bounds enforced via clamped next position). */
function canMoveTo(_worldX: number, _worldY: number): boolean {
  return true
}

export function Player() {
  const { ctx, width, height, registerLoop, unregisterLoop, setDebugHud } =
    useGameCanvas()
  const loopId = useRef(Symbol('player-loop'))
  const sheetRef = useRef<SpriteSheet | null>(null)

  const worldPos = useRef<Vec>({ x: PLAYER_START_X, y: PLAYER_START_Y })
  const direction = useRef<Direction>('down')
  const animFrame = useRef(MIDNIGHT_WALK_IDLE_FRAME)
  const animElapsed = useRef(0)
  const keysDown = useRef(new Set<string>())
  const touchDir = useRef<Direction | null>(null)

  useEffect(() => {
    const sheet = new SpriteSheet(
      MIDNIGHT_WALK_SRC,
      MIDNIGHT_WALK_COLUMNS,
      MIDNIGHT_WALK_ROWS,
      MIDNIGHT_WALK_FRAME_WIDTH,
      MIDNIGHT_WALK_FRAME_HEIGHT,
      {
        chromaKey: true,
        removeGroundShadow: false,
        framesPerDirection: MIDNIGHT_WALK_FRAMES_PER_DIRECTION,
      },
    )
    sheetRef.current = sheet
    void sheet.load().catch((err) => console.error(err))
    void loadWorldBackground().catch((err) => console.error(err))

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key in KEY_TO_DIR) {
        e.preventDefault()
        keysDown.current.add(e.key)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.key)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const setTouchDirection = (dir: Direction | null) => {
    touchDir.current = dir
  }

  const bindDpadPointer = (dir: Direction) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      setTouchDirection(dir)
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      setTouchDirection(null)
    },
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      setTouchDirection(null)
    },
  })

  useEffect(() => {
    const id = loopId.current

    const step = (dt: number) => {
      const sheet = sheetRef.current
      let vx = 0
      let vy = 0

      const touch = touchDir.current
      if (touch) {
        if (touch === 'left') vx -= 1
        if (touch === 'right') vx += 1
        if (touch === 'up') vy -= 1
        if (touch === 'down') vy += 1
        direction.current = touch
      } else {
        if (keysDown.current.has('ArrowLeft')) vx -= 1
        if (keysDown.current.has('ArrowRight')) vx += 1
        if (keysDown.current.has('ArrowUp')) vy -= 1
        if (keysDown.current.has('ArrowDown')) vy += 1

        if (vx !== 0 || vy !== 0) {
          if (Math.abs(vx) > Math.abs(vy)) {
            direction.current = vx < 0 ? 'left' : 'right'
          } else {
            direction.current = vy < 0 ? 'up' : 'down'
          }
        }
      }

      const isMoving =
        touchDir.current !== null ||
        keysDown.current.has('ArrowLeft') ||
        keysDown.current.has('ArrowRight') ||
        keysDown.current.has('ArrowUp') ||
        keysDown.current.has('ArrowDown')
      const frameCount = sheet?.framesPerDirection ?? WALK_FRAME_COUNT

      if (isMoving) {
        animElapsed.current += dt
        while (animElapsed.current >= ANIM_INTERVAL) {
          animElapsed.current -= ANIM_INTERVAL
          animFrame.current = (animFrame.current + 1) % frameCount
        }
      } else {
        animFrame.current = MIDNIGHT_WALK_IDLE_FRAME
        animElapsed.current = 0
      }

      if (isMoving && sheet?.loaded) {
        const len = Math.hypot(vx, vy) || 1
        vx = (vx / len) * MOVE_SPEED
        vy = (vy / len) * MOVE_SPEED

        const halfW = MIDNIGHT_WALK_DISPLAY_WIDTH / 2
        const halfH = MIDNIGHT_WALK_DISPLAY_HEIGHT / 2

        const nextX = Math.max(
          halfW,
          Math.min(WORLD_WIDTH - halfW, worldPos.current.x + vx * dt),
        )
        const nextY = Math.max(
          halfH,
          Math.min(WORLD_HEIGHT - halfH, worldPos.current.y + vy * dt),
        )

        const tryX = canMoveTo(nextX, worldPos.current.y)
        const tryY = canMoveTo(worldPos.current.x, nextY)
        const tryBoth = canMoveTo(nextX, nextY)

        if (tryBoth) {
          worldPos.current.x = nextX
          worldPos.current.y = nextY
        } else if (tryX) {
          worldPos.current.x = nextX
        } else if (tryY) {
          worldPos.current.y = nextY
        }
      }

      const cameraX = Math.max(
        0,
        Math.min(WORLD_WIDTH - width, worldPos.current.x - width / 2),
      )
      const cameraY = Math.max(
        0,
        Math.min(WORLD_HEIGHT - height, worldPos.current.y - height / 2),
      )

      ctx.imageSmoothingEnabled = false
      drawWorldBackground(ctx, cameraX, cameraY, width, height)

      const facing = direction.current
      const frame = isMoving ? animFrame.current : MIDNIGHT_WALK_IDLE_FRAME
      const state: 'moving' | 'idle' = isMoving ? 'moving' : 'idle'

      let sx = 0
      let sy = 0

      if (sheet?.loaded) {
        const centerX = width / 2
        const centerY = height / 2
        const dw = MIDNIGHT_WALK_DISPLAY_WIDTH
        const dh = MIDNIGHT_WALK_DISPLAY_HEIGHT
        const screenX = Math.floor(centerX - dw / 2)
        const screenY = Math.floor(centerY - dh / 2) + MIDNIGHT_WALK_DRAW_OFFSET_Y
        ;({ sx, sy } = sheet.getFrameRect(facing, frame))
        sheet.drawFrame(ctx, facing, frame, screenX, screenY, dw, dh)
      }

      const debugInfo: DebugInfo = { direction: facing, frame, sx, sy, state }
      drawDebugOverlay(ctx, debugInfo)
      setDebugHud(formatDebugText(debugInfo))
    }

    registerLoop(id, step)
    return () => unregisterLoop(id)
  }, [ctx, width, height, registerLoop, unregisterLoop, setDebugHud])

  return (
    <div className="player-controls" aria-hidden={false}>
      <div className="player-dpad">
        <button
          type="button"
          className="player-dpad-btn player-dpad-btn--up"
          aria-label="Move up"
          {...bindDpadPointer('up')}
        />
        <button
          type="button"
          className="player-dpad-btn player-dpad-btn--left"
          aria-label="Move left"
          {...bindDpadPointer('left')}
        />
        <button
          type="button"
          className="player-dpad-btn player-dpad-btn--right"
          aria-label="Move right"
          {...bindDpadPointer('right')}
        />
        <button
          type="button"
          className="player-dpad-btn player-dpad-btn--down"
          aria-label="Move down"
          {...bindDpadPointer('down')}
        />
      </div>
    </div>
  )
}
