import { useEffect, useRef, useSyncExternalStore, type PointerEvent } from 'react'
import {
  MIDNIGHT_WALK_COLUMNS,
  MIDNIGHT_WALK_FRAME_HEIGHT,
  MIDNIGHT_WALK_FRAME_WIDTH,
  MIDNIGHT_WALK_FRAMES_PER_DIRECTION,
  MIDNIGHT_WALK_IDLE_FRAME,
  MIDNIGHT_WALK_ROWS,
} from '../constants/gameAssets'
import { getPlayerWalkSrc, subscribeCharacterStore } from '../store/characterStore'
import {
  PLAYER_START_X,
  PLAYER_START_Y,
  WORLD_CANVAS_FILL,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../constants/worldAssets'
import { COLLISION_ZONES, type CollisionZone } from '../data/collisionZones'
import { TRIGGER_ZONES, type TriggerAction } from '../data/triggerZones'
import { drawWorldMap } from '../game/drawWorldBackground'
import { useGameCanvas } from '../game/GameCanvasContext'
import { SpriteSheet, type Direction } from '../game/SpriteSheet'
import { loadWorldBackground } from '../game/WorldBackground'
import './Player.css'

const MOVE_SPEED = 120
const ANIM_FPS = 8
const ANIM_INTERVAL = 1 / ANIM_FPS
const WALK_FRAME_COUNT = MIDNIGHT_WALK_FRAMES_PER_DIRECTION

const PLAYER_DISPLAY_HEIGHT = 72
const PLAYER_DISPLAY_WIDTH = Math.floor(
  (MIDNIGHT_WALK_FRAME_WIDTH / MIDNIGHT_WALK_FRAME_HEIGHT) * PLAYER_DISPLAY_HEIGHT,
)

/** Inset within each 256px sheet row (sy = row * frameHeight + pad, then crop sh). */
const PLAYER_SOURCE_ROW_PADDING = 4
/** Tall enough to include shoe highlights at the bottom of up/down frames. */
const PLAYER_SOURCE_FRAME_HEIGHT = 252
/** Left row: bleed from the row below. */
const PLAYER_LEFT_SOURCE_ROW_PADDING = 12
const PLAYER_LEFT_SOURCE_FRAME_HEIGHT = 232
/** Right row crop. */
const PLAYER_RIGHT_SOURCE_ROW_PADDING = -10
const PLAYER_RIGHT_SOURCE_FRAME_HEIGHT = 232

const SPRITE_SHEET_ROW: Record<Direction, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}

/** Subtract from centered Y to shift sprite up and show full hair. */
const PLAYER_DRAW_Y_SHIFT_UP = 12

const HITBOX_WIDTH = 30
const HITBOX_HEIGHT = 20

const ZOOM_MAX = 2.0
const ZOOM_DEFAULT = 1.0
const ZOOM_STEP = 0.1
const COORD_GRID_SPACING = 100

function getMinZoom(screenW: number, screenH: number): number {
  return Math.min(screenW / WORLD_WIDTH, screenH / WORLD_HEIGHT)
}

function clampZoom(zoom: number, screenW: number, screenH: number): number {
  return Math.max(getMinZoom(screenW, screenH), Math.min(ZOOM_MAX, zoom))
}

/** Camera focus: follows Midnight when zoomed in; locks when full map is visible. */
function getWorldFocusPoint(
  worldX: number,
  worldY: number,
  zoom: number,
  screenW: number,
  screenH: number,
): Vec {
  const visibleW = screenW / zoom
  const visibleH = screenH / zoom

  let focusX = worldX
  let focusY = worldY

  if (visibleW >= WORLD_WIDTH) {
    focusX = WORLD_WIDTH / 2
  } else {
    const halfVisibleW = visibleW / 2
    focusX = Math.max(halfVisibleW, Math.min(WORLD_WIDTH - halfVisibleW, worldX))
  }

  if (visibleH >= WORLD_HEIGHT) {
    focusY = WORLD_HEIGHT / 2
  } else {
    const halfVisibleH = visibleH / 2
    focusY = Math.max(halfVisibleH, Math.min(WORLD_HEIGHT - halfVisibleH, worldY))
  }

  return { x: focusX, y: focusY }
}

function applyWorldTransform(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  focusX: number,
  focusY: number,
  screenW: number,
  screenH: number,
): void {
  ctx.translate(Math.floor(screenW / 2), Math.floor(screenH / 2))
  ctx.scale(zoom, zoom)
  ctx.translate(-focusX, -focusY)
}

function screenToWorld(
  screenX: number,
  screenY: number,
  zoom: number,
  focusX: number,
  focusY: number,
  screenW: number,
  screenH: number,
): Vec {
  return {
    x: (screenX - screenW / 2) / zoom + focusX,
    y: (screenY - screenH / 2) / zoom + focusY,
  }
}

function drawCoordinateGrid(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  focusX: number,
  focusY: number,
  screenW: number,
  screenH: number,
): void {
  const visibleW = screenW / zoom
  const visibleH = screenH / zoom
  const minX = focusX - visibleW / 2
  const maxX = focusX + visibleW / 2
  const minY = focusY - visibleH / 2
  const maxY = focusY + visibleH / 2

  const startX = Math.max(0, Math.floor(minX / COORD_GRID_SPACING) * COORD_GRID_SPACING)
  const endX = Math.min(
    WORLD_WIDTH,
    Math.ceil(maxX / COORD_GRID_SPACING) * COORD_GRID_SPACING,
  )
  const startY = Math.max(0, Math.floor(minY / COORD_GRID_SPACING) * COORD_GRID_SPACING)
  const endY = Math.min(
    WORLD_HEIGHT,
    Math.ceil(maxY / COORD_GRID_SPACING) * COORD_GRID_SPACING,
  )

  const lineWidth = 1 / zoom
  const labelSize = 10 / zoom
  const labelPad = 2 / zoom

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.lineWidth = lineWidth
  ctx.font = `${labelSize}px monospace`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  const clipMinY = Math.max(0, minY)
  const clipMaxY = Math.min(WORLD_HEIGHT, maxY)
  const clipMinX = Math.max(0, minX)
  const clipMaxX = Math.min(WORLD_WIDTH, maxX)

  for (let x = startX; x <= endX; x += COORD_GRID_SPACING) {
    ctx.beginPath()
    ctx.moveTo(x, clipMinY)
    ctx.lineTo(x, clipMaxY)
    ctx.stroke()
  }

  for (let y = startY; y <= endY; y += COORD_GRID_SPACING) {
    ctx.beginPath()
    ctx.moveTo(clipMinX, y)
    ctx.lineTo(clipMaxX, y)
    ctx.stroke()
  }

  for (let x = startX; x <= endX; x += COORD_GRID_SPACING) {
    for (let y = startY; y <= endY; y += COORD_GRID_SPACING) {
      ctx.fillText(`${x},${y}`, x + labelPad, y + labelPad)
    }
  }
}

function drawMidnightCrosshair(
  ctx: CanvasRenderingContext2D,
  worldX: number,
  worldY: number,
  zoom: number,
): void {
  const lineWidth = 1 / zoom
  const arm = 12 / zoom
  const labelPad = 6 / zoom
  const labelSize = 11 / zoom

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(worldX - arm, worldY)
  ctx.lineTo(worldX + arm, worldY)
  ctx.moveTo(worldX, worldY - arm)
  ctx.lineTo(worldX, worldY + arm)
  ctx.stroke()

  ctx.font = `${labelSize}px monospace`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(
    `(${worldX.toFixed(1)}, ${worldY.toFixed(1)})`,
    worldX + labelPad,
    worldY + labelPad,
  )
}

type PointerWorldState = {
  x: number
  y: number
  active: boolean
}

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

type CoordinateReadout = {
  worldX: number
  worldY: number
  zoom: number
  pointer: PointerWorldState
}

function formatDebugText(
  { direction, frame, sx, sy, state }: DebugInfo,
  coords?: CoordinateReadout | null,
): string {
  const lines = [
    `direction: ${direction}`,
    `frame: ${frame}`,
    `sx: ${sx.toFixed(1)}  sy: ${sy.toFixed(1)}`,
    `state: ${state}`,
  ]
  if (coords) {
    lines.push(
      `Midnight: (${coords.worldX.toFixed(1)}, ${coords.worldY.toFixed(1)})`,
      `Zoom: ${coords.zoom.toFixed(2)}`,
      coords.pointer.active
        ? `Pointer: (${coords.pointer.x.toFixed(1)}, ${coords.pointer.y.toFixed(1)})`
        : 'Pointer: —',
    )
  }
  return lines.join('\n')
}

function rectsOverlap(a: CollisionZone, b: CollisionZone): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/** Feet-centered hitbox in world space (worldPos is the character anchor at screen center). */
function getFeetHitbox(worldX: number, worldY: number): CollisionZone {
  const feetY = worldY + PLAYER_DISPLAY_HEIGHT / 2
  return {
    x: worldX - HITBOX_WIDTH / 2,
    y: feetY - HITBOX_HEIGHT / 2,
    width: HITBOX_WIDTH,
    height: HITBOX_HEIGHT,
  }
}

function collidesAt(worldX: number, worldY: number): boolean {
  const hitbox = getFeetHitbox(worldX, worldY)
  return COLLISION_ZONES.some((zone) => rectsOverlap(hitbox, zone))
}

function drawCollisionZonesDebug(ctx: CanvasRenderingContext2D): void {
  for (const zone of COLLISION_ZONES) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
    ctx.fillRect(
      Math.floor(zone.x),
      Math.floor(zone.y),
      Math.floor(zone.width),
      Math.floor(zone.height),
    )
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(
      Math.floor(zone.x),
      Math.floor(zone.y),
      Math.floor(zone.width),
      Math.floor(zone.height),
    )
  }
}

function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  info: DebugInfo,
  coords?: CoordinateReadout | null,
) {
  const lines = formatDebugText(info, coords).split('\n')
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

type PlayerProps = {
  onTrigger?: (action: TriggerAction) => void
}

export function Player({ onTrigger }: PlayerProps) {
  const { canvas, ctx, width, height, registerLoop, unregisterLoop, setDebugHud } =
    useGameCanvas()
  const onTriggerRef = useRef(onTrigger)
  const activeTriggerIds = useRef(new Set<string>())
  const loopId = useRef(Symbol('player-loop'))
  const sheetRef = useRef<SpriteSheet | null>(null)

  const worldPos = useRef<Vec>({ x: PLAYER_START_X, y: PLAYER_START_Y })
  const direction = useRef<Direction>('down')
  const animFrame = useRef(MIDNIGHT_WALK_IDLE_FRAME)
  const animElapsed = useRef(0)
  const keysDown = useRef(new Set<string>())
  const touchDir = useRef<Direction | null>(null)
  const wasMoving = useRef(false)
  const lastFacing = useRef<Direction>('down')
  const showCollisionDebug = useRef(false)
  const showCoordinateOverlay = useRef(false)
  const pointerWorldPos = useRef<PointerWorldState>({ x: 0, y: 0, active: false })
  const cameraRef = useRef({
    zoom: ZOOM_DEFAULT,
    focusX: PLAYER_START_X,
    focusY: PLAYER_START_Y,
    width,
    height,
  })
  const zoomLevel = useRef(ZOOM_DEFAULT)
  const pinchStartSpan = useRef(0)
  const pinchStartZoom = useRef(ZOOM_DEFAULT)
  const screenSizeRef = useRef({ width, height })
  const walkSrc = useSyncExternalStore(
    subscribeCharacterStore,
    getPlayerWalkSrc,
    getPlayerWalkSrc,
  )

  useEffect(() => {
    onTriggerRef.current = onTrigger
  }, [onTrigger])

  useEffect(() => {
    screenSizeRef.current = { width, height }
  }, [width, height])

  useEffect(() => {
    const sheet = new SpriteSheet(
      walkSrc,
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
    return () => {
      sheetRef.current = null
    }
  }, [walkSrc])

  useEffect(() => {
    void loadWorldBackground().catch((err) => console.error(err))

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        showCollisionDebug.current = !showCollisionDebug.current
        return
      }
      if (e.key === 'x' || e.key === 'X') {
        showCoordinateOverlay.current = !showCoordinateOverlay.current
        if (!showCoordinateOverlay.current) {
          pointerWorldPos.current.active = false
        }
        return
      }
      if (e.key === '+' || e.key === '=' || e.key === 'Equal') {
        e.preventDefault()
        const { width: sw, height: sh } = screenSizeRef.current
        zoomLevel.current = clampZoom(zoomLevel.current + ZOOM_STEP, sw, sh)
        return
      }
      if (e.key === '-' || e.key === 'Minus') {
        e.preventDefault()
        const { width: sw, height: sh } = screenSizeRef.current
        zoomLevel.current = clampZoom(zoomLevel.current - ZOOM_STEP, sw, sh)
        return
      }
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

  useEffect(() => {
    const el = canvas
    if (!el) return

    el.style.touchAction = 'none'

    const pinchSpan = (touches: TouchList) => {
      if (touches.length < 2) return 0
      const a = touches[0]!
      const b = touches[1]!
      return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        pinchStartSpan.current = pinchSpan(e.touches)
        pinchStartZoom.current = zoomLevel.current
        e.preventDefault()
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && pinchStartSpan.current > 0) {
        const span = pinchSpan(e.touches)
        if (span > 0) {
          const { width: sw, height: sh } = screenSizeRef.current
          zoomLevel.current = clampZoom(
            pinchStartZoom.current * (span / pinchStartSpan.current),
            sw,
            sh,
          )
        }
        e.preventDefault()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartSpan.current = 0
      }
    }

    const updatePointerFromClient = (clientX: number, clientY: number) => {
      if (!showCoordinateOverlay.current) return
      const rect = el.getBoundingClientRect()
      const screenX = clientX - rect.left
      const screenY = clientY - rect.top
      const { zoom, focusX, focusY, width: sw, height: sh } = cameraRef.current
      const world = screenToWorld(screenX, screenY, zoom, focusX, focusY, sw, sh)
      pointerWorldPos.current = { x: world.x, y: world.y, active: true }
    }

    const onPointerMove = (e: globalThis.PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY)
    }

    const onPointerDown = (e: globalThis.PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY)
    }

    const onPointerLeave = () => {
      pointerWorldPos.current.active = false
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerleave', onPointerLeave)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [canvas])

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
        vx = touch === 'left' ? -1 : touch === 'right' ? 1 : 0
        vy = touch === 'up' ? -1 : touch === 'down' ? 1 : 0
        direction.current = touch
      } else {
        const left = keysDown.current.has('ArrowLeft')
        const right = keysDown.current.has('ArrowRight')
        const up = keysDown.current.has('ArrowUp')
        const down = keysDown.current.has('ArrowDown')
        const horizontalOnly = (left || right) && !up && !down
        const verticalOnly = (up || down) && !left && !right

        vx = (left ? -1 : 0) + (right ? 1 : 0)
        vy = (up ? -1 : 0) + (down ? 1 : 0)

        if (horizontalOnly) {
          vy = 0
          direction.current = vx < 0 ? 'left' : 'right'
        } else if (verticalOnly) {
          vx = 0
          direction.current = vy < 0 ? 'up' : 'down'
        } else if (vx !== 0 || vy !== 0) {
          if (Math.abs(vx) > Math.abs(vy)) {
            direction.current = vx < 0 ? 'left' : 'right'
          } else if (Math.abs(vy) > Math.abs(vx)) {
            direction.current = vy < 0 ? 'up' : 'down'
          } else {
            direction.current = vy < 0 ? 'up' : 'down'
          }
        }
      }

      const facing = direction.current
      const isMoving =
        touchDir.current !== null ||
        keysDown.current.has('ArrowLeft') ||
        keysDown.current.has('ArrowRight') ||
        keysDown.current.has('ArrowUp') ||
        keysDown.current.has('ArrowDown')
      const frameCount = sheet?.framesPerDirection ?? WALK_FRAME_COUNT

      if (isMoving && (!wasMoving.current || lastFacing.current !== facing)) {
        animFrame.current = 0
        animElapsed.current = 0
      }
      wasMoving.current = isMoving
      lastFacing.current = facing

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

      const rightOnly =
        facing === 'right' &&
        vx > 0 &&
        vy === 0 &&
        (touch === 'right' ||
          (keysDown.current.has('ArrowRight') &&
            !keysDown.current.has('ArrowLeft') &&
            !keysDown.current.has('ArrowUp') &&
            !keysDown.current.has('ArrowDown')))

      if (isMoving && sheet?.loaded) {
        let speedX = 0
        let speedY = 0
        if (rightOnly) {
          speedX = MOVE_SPEED
          speedY = 0
        } else if (vx !== 0 && vy !== 0) {
          const len = Math.hypot(vx, vy)
          speedX = (vx / len) * MOVE_SPEED
          speedY = (vy / len) * MOVE_SPEED
        } else if (vx !== 0) {
          speedX = Math.sign(vx) * MOVE_SPEED
        } else if (vy !== 0) {
          speedY = Math.sign(vy) * MOVE_SPEED
        }

        const dx = speedX * dt
        let dy = speedY * dt
        if (rightOnly) {
          dy = 0
        }

        const halfW = PLAYER_DISPLAY_WIDTH / 2
        const halfH = PLAYER_DISPLAY_HEIGHT / 2

        const nextX = Math.max(
          halfW,
          Math.min(WORLD_WIDTH - halfW, worldPos.current.x + dx),
        )
        const nextY = Math.max(
          halfH,
          Math.min(WORLD_HEIGHT - halfH, worldPos.current.y + dy),
        )

        if (dx !== 0 && !collidesAt(nextX, worldPos.current.y)) {
          worldPos.current.x = nextX
        }
        if (dy !== 0 && !collidesAt(worldPos.current.x, nextY)) {
          worldPos.current.y = nextY
        }
      }

      const zoom = clampZoom(zoomLevel.current, width, height)
      zoomLevel.current = zoom
      const worldX = worldPos.current.x
      const worldY = worldPos.current.y

      for (const zone of TRIGGER_ZONES) {
        const hitbox = getFeetHitbox(worldX, worldY)
        const inside = rectsOverlap(hitbox, zone)
        if (inside) {
          if (!activeTriggerIds.current.has(zone.id)) {
            activeTriggerIds.current.add(zone.id)
            onTriggerRef.current?.(zone.action)
          }
        } else {
          activeTriggerIds.current.delete(zone.id)
        }
      }

      const focus = getWorldFocusPoint(worldX, worldY, zoom, width, height)
      cameraRef.current = {
        zoom,
        focusX: focus.x,
        focusY: focus.y,
        width,
        height,
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = WORLD_CANVAS_FILL
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.imageSmoothingEnabled = false
      applyWorldTransform(ctx, zoom, focus.x, focus.y, width, height)

      drawWorldMap(ctx)

      if (showCollisionDebug.current) {
        drawCollisionZonesDebug(ctx)
      }

      const frame = isMoving ? animFrame.current : MIDNIGHT_WALK_IDLE_FRAME
      const state: 'moving' | 'idle' = isMoving ? 'moving' : 'idle'

      let sx = 0
      let sy = 0

      if (sheet?.loaded) {
        const source = (sheet as unknown as { drawSource: CanvasImageSource | null })
          .drawSource
        if (source) {
          const dw = Math.floor(PLAYER_DISPLAY_WIDTH)
          const dh = Math.floor(PLAYER_DISPLAY_HEIGHT)
          const worldDrawX = Math.floor(worldX - dw / 2)
          const worldDrawY = Math.floor(worldY - dh / 2) - PLAYER_DRAW_Y_SHIFT_UP
          const rect = sheet.getFrameRect(facing, frame)
          sx = Math.floor(rect.sx)
          const rowIndex = SPRITE_SHEET_ROW[facing]
          let rowPad = PLAYER_SOURCE_ROW_PADDING
          let srcH = PLAYER_SOURCE_FRAME_HEIGHT
          if (facing === 'left') {
            rowPad = PLAYER_LEFT_SOURCE_ROW_PADDING
            srcH = PLAYER_LEFT_SOURCE_FRAME_HEIGHT
          } else if (facing === 'right') {
            rowPad = PLAYER_RIGHT_SOURCE_ROW_PADDING
            srcH = PLAYER_RIGHT_SOURCE_FRAME_HEIGHT
          }
          sy = Math.floor(rowIndex * MIDNIGHT_WALK_FRAME_HEIGHT + rowPad)
          const sw = Math.floor(rect.sw)
          const sh = Math.floor(srcH)
          ctx.drawImage(source, sx, sy, sw, sh, worldDrawX, worldDrawY, dw, dh)
        }
      }

      if (showCoordinateOverlay.current) {
        drawCoordinateGrid(ctx, zoom, focus.x, focus.y, width, height)
        drawMidnightCrosshair(ctx, worldX, worldY, zoom)
      }

      ctx.restore()

      const debugInfo: DebugInfo = { direction: facing, frame, sx, sy, state }
      const coordReadout = showCoordinateOverlay.current
        ? {
            worldX,
            worldY,
            zoom,
            pointer: pointerWorldPos.current,
          }
        : null
      drawDebugOverlay(ctx, debugInfo, coordReadout)
      setDebugHud(formatDebugText(debugInfo, coordReadout))
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
