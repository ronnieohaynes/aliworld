import { forwardRef, useEffect, useImperativeHandle, useRef, useSyncExternalStore } from 'react'
import {
  MIDNIGHT_WALK_FRAME_HEIGHT,
  MIDNIGHT_WALK_FRAME_WIDTH,
  MIDNIGHT_WALK_FRAMES_PER_DIRECTION,
  MIDNIGHT_WALK_IDLE_FRAME,
} from '../constants/gameAssets'
import { getMidnightWalkSrc } from '../data/midnightVariants'
import {
  drawSheetFrame,
  loadSpriteSheetWithFallback,
} from '../game/characterLayers'
import {
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from '../store/characterStore'
import { WORLD_CANVAS_FILL } from '../constants/worldAssets'
import type { CollisionZone } from '../data/collisionZones'
import { NPC_SIZE } from '../data/npcs'
import type { TriggerAction } from '../data/triggerZones'
import type { CityConfig } from '../data/cityConfig'
import { drawWorldMap } from '../game/drawWorldBackground'
import { useGameCanvas } from '../game/GameCanvasContext'
import { playerScreenAnchor } from '../game/playerScreenAnchor'
import { getShowDebug } from '../store/playerStore'
import { SpriteSheet, type Direction } from '../game/SpriteSheet'
import { loadWorldBackgroundForSrc } from '../game/WorldBackground'
import './Player.css'

const MOVE_SPEED = 120
const ANIM_FPS = 8
const ANIM_INTERVAL = 1 / ANIM_FPS
const WALK_FRAME_COUNT = MIDNIGHT_WALK_FRAMES_PER_DIRECTION

const PLAYER_DISPLAY_HEIGHT = 72
const MIDNIGHT_DISPLAY_WIDTH = Math.floor(
  (MIDNIGHT_WALK_FRAME_WIDTH / MIDNIGHT_WALK_FRAME_HEIGHT) * PLAYER_DISPLAY_HEIGHT,
)
const PLAYER_DISPLAY_WIDTH = MIDNIGHT_DISPLAY_WIDTH

const SPRITE_SHEET_ROW: Record<Direction, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}

const NPC_SPRITE_COL: Record<Direction, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}

const NPC_DISPLAY_W = 48
const NPC_DISPLAY_H = 120
const NPC_INTERACT_POINT_RADIUS = 20

type InteractPoint = { x: number; y: number; npcFacing: Direction }

function getNpcInteractPoints(npc: { x: number; y: number }): InteractPoint[] {
  const half = NPC_SIZE / 2
  const drawX = npc.x - NPC_DISPLAY_W / 2
  const drawY = npc.y + half - NPC_DISPLAY_H
  return [
    { x: drawX + NPC_DISPLAY_W / 2, y: drawY, npcFacing: 'up' },
    { x: drawX + NPC_DISPLAY_W / 2, y: drawY + NPC_DISPLAY_H, npcFacing: 'down' },
    { x: drawX - 10, y: drawY + NPC_DISPLAY_H / 2 + 10, npcFacing: 'right' },
    { x: drawX + NPC_DISPLAY_W + 10, y: drawY + NPC_DISPLAY_H / 2 + 10, npcFacing: 'left' },
  ]
}

/** Subtract from centered Y to shift sprite up and show full hair. */
const PLAYER_DRAW_Y_SHIFT_UP = 12

const HITBOX_WIDTH = 30
const HITBOX_HEIGHT = 20

const ZOOM_MAX = 2.0
const ZOOM_DEFAULT = 1.0
const ZOOM_STEP = 0.1
const COORD_GRID_SPACING = 100

function getMinZoom(screenW: number, screenH: number, worldW: number, worldH: number): number {
  return Math.min(screenW / worldW, screenH / worldH)
}

function clampZoom(zoom: number, screenW: number, screenH: number, worldW: number, worldH: number): number {
  return Math.max(getMinZoom(screenW, screenH, worldW, worldH), Math.min(ZOOM_MAX, zoom))
}

function getWorldFocusPoint(
  worldX: number,
  worldY: number,
  zoom: number,
  screenW: number,
  screenH: number,
  worldW: number,
  worldH: number,
): Vec {
  const visibleW = screenW / zoom
  const visibleH = screenH / zoom

  let focusX = worldX
  let focusY = worldY

  if (visibleW >= worldW) {
    focusX = worldW / 2
  } else {
    const halfVisibleW = visibleW / 2
    focusX = Math.max(halfVisibleW, Math.min(worldW - halfVisibleW, worldX))
  }

  if (visibleH >= worldH) {
    focusY = worldH / 2
  } else {
    const halfVisibleH = visibleH / 2
    focusY = Math.max(halfVisibleH, Math.min(worldH - halfVisibleH, worldY))
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

/** Map pointer position on the CSS-sized canvas to internal canvas coordinates. */
function displayPointToLogical(
  canvasEl: HTMLCanvasElement,
  logicalW: number,
  logicalH: number,
  displayX: number,
  displayY: number,
): Vec {
  const dw = canvasEl.clientWidth || logicalW
  const dh = canvasEl.clientHeight || logicalH
  return {
    x: (displayX / dw) * logicalW,
    y: (displayY / dh) * logicalH,
  }
}

/** Map internal canvas coordinates to CSS display pixels (overlays). */
function logicalPointToDisplay(
  canvasEl: HTMLCanvasElement,
  logicalW: number,
  logicalH: number,
  logicalX: number,
  logicalY: number,
): Vec {
  const dw = canvasEl.clientWidth || logicalW
  const dh = canvasEl.clientHeight || logicalH
  return {
    x: (logicalX / logicalW) * dw,
    y: (logicalY / logicalH) * dh,
  }
}

function drawCoordinateGrid(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  focusX: number,
  focusY: number,
  screenW: number,
  screenH: number,
  worldW: number,
  worldH: number,
): void {
  const visibleW = screenW / zoom
  const visibleH = screenH / zoom
  const minX = focusX - visibleW / 2
  const maxX = focusX + visibleW / 2
  const minY = focusY - visibleH / 2
  const maxY = focusY + visibleH / 2

  const startX = Math.max(0, Math.floor(minX / COORD_GRID_SPACING) * COORD_GRID_SPACING)
  const endX = Math.min(
    worldW,
    Math.ceil(maxX / COORD_GRID_SPACING) * COORD_GRID_SPACING,
  )
  const startY = Math.max(0, Math.floor(minY / COORD_GRID_SPACING) * COORD_GRID_SPACING)
  const endY = Math.min(
    worldH,
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
  const clipMaxY = Math.min(worldH, maxY)
  const clipMinX = Math.max(0, minX)
  const clipMaxX = Math.min(worldW, maxX)

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

function getFeetHitbox(worldX: number, worldY: number): CollisionZone {
  const feetY = worldY + PLAYER_DISPLAY_HEIGHT / 2
  return {
    x: worldX - HITBOX_WIDTH / 2,
    y: feetY - HITBOX_HEIGHT / 2,
    width: HITBOX_WIDTH,
    height: HITBOX_HEIGHT,
  }
}

const NPC_COLLISION_RADIUS = 30

function getNpcCollisionRect(npc: { x: number; y: number }): CollisionZone {
  return { x: npc.x - NPC_COLLISION_RADIUS + 15, y: npc.y - NPC_COLLISION_RADIUS - 20, width: 45, height: NPC_COLLISION_RADIUS * 2 + 15 }
}

function drawCollisionZonesDebug(ctx: CanvasRenderingContext2D, collisionZones: CollisionZone[], npcs: { x: number; y: number; id: string }[]): void {
  for (const zone of collisionZones) {
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
  for (const npc of npcs) {
    const r = getNpcCollisionRect(npc)
    ctx.fillStyle = 'rgba(0, 100, 255, 0.2)'
    ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.width), Math.floor(r.height))
    ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.width), Math.floor(r.height))

    for (const pt of getNpcInteractPoints(npc)) {
      ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(Math.floor(pt.x), Math.floor(pt.y), NPC_INTERACT_POINT_RADIUS, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(0, 255, 100, 0.15)'
      ctx.fill()
    }
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

export type PlayerHandle = {
  setPosition: (x: number, y: number) => void
  getNearbyNpcId: () => string | null
}

type PlayerProps = {
  cityConfig: CityConfig
  onTrigger?: (action: TriggerAction) => void
  onTriggerExit?: (action: TriggerAction) => void
  dialogueActive?: boolean
  dialogueNpcId?: string | null
}

export const Player = forwardRef<PlayerHandle, PlayerProps>(function Player(
  { cityConfig, onTrigger, onTriggerExit, dialogueActive, dialogueNpcId },
  ref,
) {
  const { canvas, ctx, width, height, registerLoop, unregisterLoop, setDebugHud } =
    useGameCanvas()
  const onTriggerRef = useRef(onTrigger)
  const onTriggerExitRef = useRef(onTriggerExit)
  const activeTriggerIds = useRef(new Set<string>())
  const loopId = useRef(Symbol('player-loop'))
  const midnightSheetRef = useRef<SpriteSheet | null>(null)
  const selectedMidnightVariant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )

  const cityConfigRef = useRef(cityConfig)

  const worldPos = useRef<Vec>({ x: cityConfig.spawnX, y: cityConfig.spawnY })
  const direction = useRef<Direction>('down')
  const animFrame = useRef(MIDNIGHT_WALK_IDLE_FRAME)
  const animElapsed = useRef(0)
  const keysDown = useRef(new Set<string>())
  const wasMoving = useRef(false)
  const lastFacing = useRef<Direction>('down')
  const showCollisionDebug = useRef(false)
  const showCoordinateOverlay = useRef(false)
  const pointerWorldPos = useRef<PointerWorldState>({ x: 0, y: 0, active: false })
  const cameraRef = useRef({
    zoom: ZOOM_DEFAULT,
    focusX: cityConfig.spawnX,
    focusY: cityConfig.spawnY,
    width,
    height,
  })
  const zoomLevel = useRef(ZOOM_DEFAULT)
  const pinchStartSpan = useRef(0)
  const pinchStartZoom = useRef(ZOOM_DEFAULT)
  const screenSizeRef = useRef({ width, height })
  const nearbyNpcIdRef = useRef<string | null>(null)
  const dialogueActiveRef = useRef(false)
  const dialogueNpcIdRef = useRef<string | null>(null)
  const npcFacingMap = useRef(new Map<string, Direction>())
  const npcSpritesRef = useRef(new Map<string, HTMLImageElement>())
  const npcIdleTimers = useRef(new Map<string, { elapsed: number; interval: number }>())
  const triggerCooldown = useRef(0)

  useEffect(() => {
    cityConfigRef.current = cityConfig
    activeTriggerIds.current.clear()
    triggerCooldown.current = 1

    void loadWorldBackgroundForSrc(cityConfig.mapSrc).catch((err) => console.error(err))

    npcFacingMap.current.clear()
    npcIdleTimers.current.clear()

    const sprites = npcSpritesRef.current
    for (const npc of cityConfig.npcs) {
      if (!npc.spriteSrc) continue
      if (sprites.has(npc.id)) continue
      const src = npc.spriteSrc
      const img = new Image()
      img.onload = () => {
        for (const n of cityConfig.npcs) {
          if (n.spriteSrc === src) sprites.set(n.id, img)
        }
      }
      img.onerror = (err) => {
        console.error(`[NPC sprite FAILED] ${src}`, err)
      }
      img.src = src
    }
  }, [cityConfig])

  useImperativeHandle(ref, () => ({
    setPosition(x: number, y: number) {
      worldPos.current = { x, y }
      activeTriggerIds.current.clear()
      triggerCooldown.current = 1
    },
    getNearbyNpcId() {
      return nearbyNpcIdRef.current
    },
  }))

  useEffect(() => {
    dialogueActiveRef.current = !!dialogueActive
  }, [dialogueActive])

  useEffect(() => {
    const prevId = dialogueNpcIdRef.current
    dialogueNpcIdRef.current = dialogueNpcId ?? null

    if (dialogueNpcId) {
      const cfg = cityConfigRef.current
      const npc = cfg.npcs.find((n) => n.id === dialogueNpcId)
      if (npc) {
        const px = worldPos.current.x
        const py = worldPos.current.y
        let bestFacing: Direction = 'down'
        let bestDist = Infinity
        for (const pt of getNpcInteractPoints(npc)) {
          const dist = Math.hypot(px - pt.x, py - pt.y)
          if (dist < bestDist) {
            bestDist = dist
            bestFacing = pt.npcFacing
          }
        }
        npcFacingMap.current.set(dialogueNpcId, bestFacing)
      }
    } else if (prevId) {
      npcFacingMap.current.delete(prevId)
    }
  }, [dialogueNpcId])

  useEffect(() => {
    onTriggerRef.current = onTrigger
  }, [onTrigger])

  useEffect(() => {
    onTriggerExitRef.current = onTriggerExit
  }, [onTriggerExit])

  useEffect(() => {
    screenSizeRef.current = { width, height }
  }, [width, height])

  useEffect(() => {
    let cancelled = false
    midnightSheetRef.current = null
    const walkSrc = getMidnightWalkSrc(selectedMidnightVariant)

    void loadSpriteSheetWithFallback(walkSrc).then((sheet) => {
      if (cancelled) return
      midnightSheetRef.current = sheet
    })

    return () => {
      cancelled = true
      midnightSheetRef.current = null
    }
  }, [selectedMidnightVariant])

  useEffect(() => {
    void loadWorldBackgroundForSrc(cityConfig.mapSrc).catch((err) => console.error(err))

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
        const cfg = cityConfigRef.current
        zoomLevel.current = clampZoom(zoomLevel.current + ZOOM_STEP, sw, sh, cfg.worldWidth, cfg.worldHeight)
        return
      }
      if (e.key === '-' || e.key === 'Minus') {
        e.preventDefault()
        const { width: sw, height: sh } = screenSizeRef.current
        const cfg = cityConfigRef.current
        zoomLevel.current = clampZoom(zoomLevel.current - ZOOM_STEP, sw, sh, cfg.worldWidth, cfg.worldHeight)
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
  }, [cityConfig.mapSrc])

  useEffect(() => {
    const el = canvas
    if (!el) return

    el.style.touchAction = 'none'
    el.style.imageRendering = 'pixelated'

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
          const cfg = cityConfigRef.current
          zoomLevel.current = clampZoom(
            pinchStartZoom.current * (span / pinchStartSpan.current),
            sw,
            sh,
            cfg.worldWidth,
            cfg.worldHeight,
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
      const displayX = clientX - rect.left
      const displayY = clientY - rect.top
      const { zoom, focusX, focusY, width: sw, height: sh } = cameraRef.current
      const logical = displayPointToLogical(el, sw, sh, displayX, displayY)
      const world = screenToWorld(logical.x, logical.y, zoom, focusX, focusY, sw, sh)
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

  useEffect(() => {
    const id = loopId.current

    const step = (dt: number) => {
      const cfg = cityConfigRef.current
      const frozen = dialogueActiveRef.current
      const walkSheet = midnightSheetRef.current
      let vx = 0
      let vy = 0

      if (!frozen) {
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
      const isMoving = !frozen && (
        keysDown.current.has('ArrowLeft') ||
        keysDown.current.has('ArrowRight') ||
        keysDown.current.has('ArrowUp') ||
        keysDown.current.has('ArrowDown')
      )
      const frameCount = walkSheet?.framesPerDirection ?? WALK_FRAME_COUNT

      if (isMoving && (!wasMoving.current || lastFacing.current !== facing)) {
        animFrame.current = 0
        animElapsed.current = 0
      }
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
      wasMoving.current = isMoving
      lastFacing.current = facing

      const rightOnly =
        facing === 'right' &&
        vx > 0 &&
        vy === 0 &&
        keysDown.current.has('ArrowRight') &&
        !keysDown.current.has('ArrowLeft') &&
        !keysDown.current.has('ArrowUp') &&
        !keysDown.current.has('ArrowDown')

      const collidesAt = (wx: number, wy: number): boolean => {
        const hitbox = getFeetHitbox(wx, wy)
        if (cfg.collisionZones.some((zone) => rectsOverlap(hitbox, zone))) return true
        return cfg.npcs.some((npc) => rectsOverlap(hitbox, getNpcCollisionRect(npc)))
      }

      if (isMoving && walkSheet?.loaded) {
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
          Math.min(cfg.worldWidth - halfW, worldPos.current.x + dx),
        )
        const nextY = Math.max(
          halfH,
          Math.min(cfg.worldHeight - halfH, worldPos.current.y + dy),
        )

        if (dx !== 0 && !collidesAt(nextX, worldPos.current.y)) {
          worldPos.current.x = nextX
        }
        if (dy !== 0 && !collidesAt(worldPos.current.x, nextY)) {
          worldPos.current.y = nextY
        }
      }

      const zoom = clampZoom(zoomLevel.current, width, height, cfg.worldWidth, cfg.worldHeight)
      zoomLevel.current = zoom
      const worldX = worldPos.current.x
      const worldY = worldPos.current.y

      if (triggerCooldown.current > 0) {
        triggerCooldown.current = Math.max(0, triggerCooldown.current - dt)
      } else if (!frozen) {
        for (const zone of cfg.triggerZones) {
          const hitbox = getFeetHitbox(worldX, worldY)
          const inside = rectsOverlap(hitbox, zone)
          if (inside) {
            if (!activeTriggerIds.current.has(zone.id)) {
              activeTriggerIds.current.add(zone.id)
              onTriggerRef.current?.(zone.action)
            }
          } else if (activeTriggerIds.current.has(zone.id)) {
            activeTriggerIds.current.delete(zone.id)
            onTriggerExitRef.current?.(zone.action)
          }
        }
      }

      const dirs: Direction[] = ['down', 'up', 'left', 'right']
      const activeDialogueNpc = dialogueNpcIdRef.current
      for (const npc of cfg.npcs) {
        if (npc.id === activeDialogueNpc) continue
        let timer = npcIdleTimers.current.get(npc.id)
        if (!timer) {
          timer = { elapsed: 0, interval: 2 + Math.random() * 2 }
          npcIdleTimers.current.set(npc.id, timer)
        }
        timer.elapsed += dt
        if (timer.elapsed >= timer.interval) {
          timer.elapsed = 0
          timer.interval = 2 + Math.random() * 2
          npcFacingMap.current.set(npc.id, dirs[Math.floor(Math.random() * 4)]!)
        }
      }

      let closestNpcId: string | null = null
      let closestDist = Infinity
      for (const npc of cfg.npcs) {
        for (const pt of getNpcInteractPoints(npc)) {
          const dist = Math.hypot(worldX - pt.x, worldY - pt.y)
          if (dist < NPC_INTERACT_POINT_RADIUS && dist < closestDist) {
            closestDist = dist
            closestNpcId = npc.id
          }
        }
      }
      nearbyNpcIdRef.current = closestNpcId

      const focus = getWorldFocusPoint(worldX, worldY, zoom, width, height, cfg.worldWidth, cfg.worldHeight)
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

      drawWorldMap(ctx, cfg.mapSrc, cfg.worldWidth, cfg.worldHeight)

      if (showCollisionDebug.current) {
        drawCollisionZonesDebug(ctx, cfg.collisionZones, cfg.npcs)
      }

      const frame = isMoving ? animFrame.current : MIDNIGHT_WALK_IDLE_FRAME
      const state: 'moving' | 'idle' = isMoving ? 'moving' : 'idle'

      let sx = 0
      let sy = 0

      const dh = Math.floor(PLAYER_DISPLAY_HEIGHT)
      const worldDrawY = Math.floor(worldY - dh / 2) - PLAYER_DRAW_Y_SHIFT_UP
      const dw = Math.floor(PLAYER_DISPLAY_WIDTH)
      const worldDrawX = Math.floor(worldX - dw / 2)

      const logicalAnchorX = (worldX - focus.x) * zoom + width / 2
      const logicalAnchorY = (worldDrawY - focus.y) * zoom + height / 2 - 14
      const anchorDisplay = logicalPointToDisplay(
        canvas,
        width,
        height,
        logicalAnchorX,
        logicalAnchorY,
      )
      playerScreenAnchor.x = anchorDisplay.x
      playerScreenAnchor.y = anchorDisplay.y
      playerScreenAnchor.active = true

      const midnightSheet = midnightSheetRef.current

      type Renderable = { sortY: number; kind: 'midnight' } | { sortY: number; kind: 'npc'; npc: typeof cfg.npcs[number] }
      const midnightBottomY = worldDrawY + dh
      const renderables: Renderable[] = [{ sortY: midnightBottomY, kind: 'midnight' }]
      for (const npc of cfg.npcs) {
        const half = NPC_SIZE / 2
        const npcDisplayH = 120
        const npcBottomY = (npc.y + half - npcDisplayH) + npcDisplayH
        renderables.push({ sortY: npcBottomY, kind: 'npc', npc })
      }
      renderables.sort((a, b) => a.sortY - b.sortY)

      for (const entry of renderables) {
        if (entry.kind === 'midnight') {
          if (midnightSheet?.loaded) {
            const rect = midnightSheet.getFrameRect(facing, frame)
            sx = Math.floor(rect.sx)
            sy = Math.floor(SPRITE_SHEET_ROW[facing] * MIDNIGHT_WALK_FRAME_HEIGHT)
            drawSheetFrame(ctx, midnightSheet, facing, frame, worldDrawX, worldDrawY, dw, dh)
          }
        } else {
          const npc = entry.npc
          const half = NPC_SIZE / 2
          const npcFacing = npcFacingMap.current.get(npc.id) ?? 'down'
          const spriteImg = npcSpritesRef.current.get(npc.id)

          if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
            const cols = npc.spriteColumns ?? 4
            const frameW = Math.floor(spriteImg.naturalWidth / cols)
            const frameH = spriteImg.naturalHeight
            const col = NPC_SPRITE_COL[npcFacing]
            const nsx = Math.floor(col * frameW)
            const displayW = 48
            const displayH = 120
            const dx = Math.floor(npc.x - displayW / 2)
            const dy = Math.floor(npc.y + half - displayH)

            ctx.imageSmoothingEnabled = false
            ctx.drawImage(
              spriteImg,
              nsx,
              0,
              frameW,
              frameH,
              Math.floor(dx),
              Math.floor(dy),
              Math.floor(displayW),
              Math.floor(displayH),
            )
          } else {
            const nx = Math.floor(npc.x - half)
            const ny = Math.floor(npc.y - half)
            ctx.fillStyle = npc.color
            ctx.fillRect(nx, ny, NPC_SIZE, NPC_SIZE)

            const cx = Math.floor(npc.x)
            const cy = Math.floor(npc.y)
            ctx.fillStyle = 'rgba(255,255,255,0.8)'
            if (npcFacing === 'down') {
              ctx.fillRect(cx - 5, cy + 1, 3, 3)
              ctx.fillRect(cx + 3, cy + 1, 3, 3)
            } else if (npcFacing === 'left') {
              ctx.fillRect(cx - 8, cy - 2, 3, 3)
              ctx.fillRect(cx - 8, cy + 3, 3, 3)
            } else if (npcFacing === 'right') {
              ctx.fillRect(cx + 6, cy - 2, 3, 3)
              ctx.fillRect(cx + 6, cy + 3, 3, 3)
            }
          }
        }
      }

      if (showCoordinateOverlay.current) {
        drawCoordinateGrid(ctx, zoom, focus.x, focus.y, width, height, cfg.worldWidth, cfg.worldHeight)
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
      if (getShowDebug()) {
        drawDebugOverlay(ctx, debugInfo, coordReadout)
        setDebugHud(formatDebugText(debugInfo, coordReadout))
      } else {
        setDebugHud('')
      }
    }

    registerLoop(id, step)
    return () => unregisterLoop(id)
  }, [ctx, width, height, registerLoop, unregisterLoop, setDebugHud])

  return null
})
