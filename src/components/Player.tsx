import { forwardRef, useEffect, useImperativeHandle, useRef, useSyncExternalStore } from 'react'
import {
  GAME_CANVAS_WIDTH,
  MIDNIGHT_WALK_FRAME_HEIGHT,
  MIDNIGHT_WALK_FRAME_WIDTH,
  MIDNIGHT_WALK_FRAMES_PER_DIRECTION,
  MIDNIGHT_WALK_IDLE_FRAME,
} from '../constants/gameAssets'
import {
  formatMidnightVariantTuningDebug,
  getMidnightVariantRenderTuning,
  getMidnightWalkSrc,
} from '../data/midnightVariants'
import {
  drawSheetFrame,
  loadSpriteSheetWithFallback,
} from '../game/characterLayers'
import {
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from '../store/characterStore'
import { WORLD_CANVAS_FILL } from '../constants/worldAssets'
import { getCollisionZones, type CollisionZone } from '../data/collisionZones'
import { NPC_INTERACT_RANGE, NPC_SIZE } from '../data/npcs'
import { getNpcCombatLevel } from '../data/npcRegistry'
import { drawStoryIdleNpcPose, type StoryIdlePoses } from '../game/npcIdleSprites'
import {
  assignStripSpriteToNpc,
  ensureStoryIdleCached,
} from '../game/npcSpriteCache'
import type { TriggerAction, TriggerZone } from '../data/triggerZones'
import type { CityConfig } from '../data/cityConfig'
import type { QuestPulseTargetDescriptor } from '../data/questObjectives'
import {
  resolveQuestPulseWorldPoint,
} from '../data/questObjectives'
import { drawWorldForegroundOverlay, drawWorldMap } from '../game/drawWorldBackground'
import { useGameCanvas } from '../game/GameCanvasContext'
import { playerScreenAnchor } from '../game/playerScreenAnchor'
import { isDevModeEnabled } from '../lib/devMode'
import { getShowDebug } from '../store/playerStore'
import { SpriteSheet, type Direction } from '../game/SpriteSheet'
import { loadWorldBackgroundForSrc } from '../game/WorldBackground'
import './Player.css'

const MOVE_SPEED = 156
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
const NPC_INTERACT_DEBUG_RADIUS = NPC_INTERACT_RANGE

function getNpcRosterKey(city: CityConfig): string {
  return `${city.id}|${city.npcs
    .map((n) => `${n.id}:${n.spriteSrc ?? ''}:${n.spriteLayout ?? 'strip-columns'}`)
    .join(';')}`
}

type InteractPoint = { x: number; y: number; npcFacing: Direction }

function getNpcFeetY(npc: { y: number }): number {
  return npc.y + NPC_SIZE / 2
}

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

/** Face the player using the nearest interact anchor (same for all overworld NPCs). */
function resolveNpcFacingTowardPlayer(
  npc: { x: number; y: number; fixedFacing?: Direction },
  playerX: number,
  playerY: number,
): Direction {
  if (npc.fixedFacing) return npc.fixedFacing
  let bestFacing: Direction = 'down'
  let bestDist = Infinity
  for (const pt of getNpcInteractPoints(npc)) {
    const dist = Math.hypot(playerX - pt.x, playerY - pt.y)
    if (dist < bestDist) {
      bestDist = dist
      bestFacing = pt.npcFacing
    }
  }
  return bestFacing
}

/** Feet hitbox size — tweak for how tight collision feels (world pixels). */
const FEET_HITBOX_WIDTH = 30
const FEET_HITBOX_HEIGHT = 20

const ZOOM_MAX = 2.5
const ZOOM_DEFAULT = 1.0
const ZOOM_STEP = 0.1
const COORD_GRID_SPACING = 100
const MOBILE_ZOOM_BREAKPOINT = 480
const MOBILE_ZOOM_DEFAULT = 1.3

function getDefaultZoom(screenW: number): number {
  return screenW <= MOBILE_ZOOM_BREAKPOINT ? MOBILE_ZOOM_DEFAULT : ZOOM_DEFAULT
}

function readDisplayWidth(canvas: HTMLCanvasElement | null): number {
  if (canvas && canvas.clientWidth > 0) return canvas.clientWidth
  if (typeof window !== 'undefined') return window.innerWidth
  return GAME_CANVAS_WIDTH
}

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
  tuningLines?: string,
  cityId?: string,
): string {
  const lines = [
    ...(cityId ? [`City: ${cityId}`] : []),
    `direction: ${direction}`,
    `frame: ${frame}`,
    `sx: ${sx.toFixed(1)}  sy: ${sy.toFixed(1)}`,
    `state: ${state}`,
  ]
  if (tuningLines) {
    lines.push('--- mdnght tune ---', tuningLines)
  }
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

function getMapCollisionZones(cfg: CityConfig): CollisionZone[] {
  if (cfg.collisionMapId) return getCollisionZones(cfg.collisionMapId)
  return cfg.collisionZones
}

function getFeetHitbox(worldX: number, worldY: number): CollisionZone {
  const feetY = worldY + PLAYER_DISPLAY_HEIGHT / 2
  return {
    x: worldX - FEET_HITBOX_WIDTH / 2,
    y: feetY - FEET_HITBOX_HEIGHT / 2,
    width: FEET_HITBOX_WIDTH,
    height: FEET_HITBOX_HEIGHT,
  }
}

const NPC_COLLISION_RADIUS = 30

function getNpcCollisionRect(npc: { x: number; y: number }): CollisionZone {
  return { x: npc.x - NPC_COLLISION_RADIUS + 15, y: npc.y - NPC_COLLISION_RADIUS - 20, width: 45, height: NPC_COLLISION_RADIUS * 2 + 15 }
}

function drawDarklineEntranceZonesDebug(
  ctx: CanvasRenderingContext2D,
  triggerZones: TriggerZone[],
): void {
  for (const zone of triggerZones) {
    if (zone.action !== 'OPEN_DARKLINE') continue
    const x = Math.floor(zone.x)
    const y = Math.floor(zone.y)
    const w = Math.floor(zone.width)
    const h = Math.floor(zone.height)
    ctx.fillStyle = 'rgba(140, 0, 220, 0.35)'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(180, 60, 255, 0.95)'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)
  }
}

function drawTransitionZonesDebug(
  ctx: CanvasRenderingContext2D,
  triggerZones: TriggerZone[],
): void {
  for (const zone of triggerZones) {
    if (zone.action === 'OPEN_DARKLINE') continue
    const x = Math.floor(zone.x)
    const y = Math.floor(zone.y)
    const w = Math.floor(zone.width)
    const h = Math.floor(zone.height)
    ctx.fillStyle = 'rgba(255, 220, 0, 0.35)'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(255, 235, 60, 0.95)'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)
  }
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

    const feetX = Math.floor(npc.x)
    const feetY = Math.floor(getNpcFeetY(npc))
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(feetX, feetY, NPC_INTERACT_DEBUG_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(0, 255, 100, 0.15)'
    ctx.fill()
  }
}

function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  info: DebugInfo,
  coords?: CoordinateReadout | null,
  cityId?: string,
) {
  const lines = formatDebugText(info, coords, undefined, cityId).split('\n')
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

const QUEST_PULSE_COLOR = '#c084fc'

function drawQuestObjectivePulse(
  ctx: CanvasRenderingContext2D,
  worldX: number,
  worldY: number,
  nowMs: number,
): void {
  const t = nowMs / 1000
  const pulse = 0.5 + 0.5 * Math.sin(t * 3)
  const alpha = 0.25 + 0.35 * pulse
  const radius = 28 + 12 * pulse

  ctx.save()
  const gradient = ctx.createRadialGradient(worldX, worldY, 0, worldX, worldY, radius)
  gradient.addColorStop(0, `rgba(192, 132, 252, ${alpha * 0.55})`)
  gradient.addColorStop(0.55, `rgba(192, 132, 252, ${alpha * 0.22})`)
  gradient.addColorStop(1, 'rgba(192, 132, 252, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(worldX, worldY, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = alpha
  ctx.strokeStyle = QUEST_PULSE_COLOR
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(worldX, worldY, radius * 0.82, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export type PlayerHandle = {
  setPosition: (x: number, y: number) => void
  setFacing: (facing: Direction) => void
  getPosition: () => { x: number; y: number }
  getNearbyNpcId: () => string | null
  devToggleCollisionDebug: () => void
  devToggleCoordinateOverlay: () => void
  devZoomIn: () => void
  devZoomOut: () => void
}

type PlayerProps = {
  cityConfig: CityConfig
  onTrigger?: (action: TriggerAction) => void
  onTriggerExit?: (action: TriggerAction) => void
  dialogueActive?: boolean
  dialogueNpcId?: string | null
  questPulseDescriptor?: QuestPulseTargetDescriptor | null
  showQuestPulse?: boolean
}

export const Player = forwardRef<PlayerHandle, PlayerProps>(function Player(
  {
    cityConfig,
    onTrigger,
    onTriggerExit,
    dialogueActive,
    dialogueNpcId,
    questPulseDescriptor = null,
    showQuestPulse = false,
  },
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
  const selectedMidnightVariantRef = useRef(selectedMidnightVariant)

  const cityConfigRef = useRef(cityConfig)
  cityConfigRef.current = cityConfig

  const worldPos = useRef<Vec>({ x: cityConfig.spawnX, y: cityConfig.spawnY })
  const moveRemainder = useRef<Vec>({ x: 0, y: 0 })
  const direction = useRef<Direction>('down')
  const animFrame = useRef(MIDNIGHT_WALK_IDLE_FRAME)
  const animElapsed = useRef(0)
  const keysDown = useRef(new Set<string>())
  const wasMoving = useRef(false)
  const lastFacing = useRef<Direction>('down')
  const showCollisionDebug = useRef(false)
  const showCoordinateOverlay = useRef(false)
  const pointerWorldPos = useRef<PointerWorldState>({ x: 0, y: 0, active: false })
  const initialZoom = getDefaultZoom(
    typeof window !== 'undefined' ? window.innerWidth : GAME_CANVAS_WIDTH,
  )
  const cameraRef = useRef({
    zoom: initialZoom,
    focusX: cityConfig.spawnX,
    focusY: cityConfig.spawnY,
    width,
    height,
  })
  const zoomLevel = useRef(initialZoom)
  const pinchStartSpan = useRef(0)
  const pinchStartZoom = useRef(initialZoom)
  const userPinchZoomed = useRef(false)
  const screenSizeRef = useRef({ width, height })
  const nearbyNpcIdRef = useRef<string | null>(null)
  const dialogueActiveRef = useRef(false)
  const dialogueNpcIdRef = useRef<string | null>(null)
  const questPulseDescriptorRef = useRef<QuestPulseTargetDescriptor | null>(null)
  const showQuestPulseRef = useRef(false)
  const npcFacingMap = useRef(new Map<string, Direction>())
  const npcSpritesRef = useRef(new Map<string, HTMLImageElement>())
  const npcStoryIdleRef = useRef(
    new Map<string, { image: HTMLImageElement; poses: StoryIdlePoses }>(),
  )
  const npcIdleTimers = useRef(new Map<string, { elapsed: number; interval: number }>())
  const triggerCooldown = useRef(0)
  const npcRosterKeyRef = useRef('')

  useEffect(() => {
    void loadWorldBackgroundForSrc(cityConfig.mapSrc).catch((err) => console.error(err))
    if (cityConfig.foregroundMapSrc) {
      void loadWorldBackgroundForSrc(cityConfig.foregroundMapSrc).catch((err) =>
        console.error(err),
      )
    }
  }, [cityConfig.mapSrc, cityConfig.foregroundMapSrc])

  useEffect(() => {
    const rosterKey = getNpcRosterKey(cityConfig)
    if (rosterKey === npcRosterKeyRef.current) return
    npcRosterKeyRef.current = rosterKey

    activeTriggerIds.current.clear()
    triggerCooldown.current = 1
    npcFacingMap.current.clear()
    npcIdleTimers.current.clear()
    for (const npc of cityConfig.npcs) {
      if (npc.fixedFacing) {
        npcFacingMap.current.set(npc.id, npc.fixedFacing)
      }
    }

    const activeIds = new Set(cityConfig.npcs.map((n) => n.id))
    for (const id of [...npcSpritesRef.current.keys()]) {
      if (!activeIds.has(id)) npcSpritesRef.current.delete(id)
    }
    for (const id of [...npcStoryIdleRef.current.keys()]) {
      if (!activeIds.has(id)) npcStoryIdleRef.current.delete(id)
    }

    for (const npc of cityConfig.npcs) {
      if (!npc.spriteSrc) continue
      if (npc.spriteLayout === 'horizontal-bbox') {
        if (npcStoryIdleRef.current.has(npc.id)) continue
        void ensureStoryIdleCached(npc.spriteSrc).then((loaded) => {
          if (loaded) npcStoryIdleRef.current.set(npc.id, loaded)
        })
        continue
      }
      if (npcSpritesRef.current.has(npc.id)) continue
      void assignStripSpriteToNpc(npc.id, npc.spriteSrc, npcSpritesRef.current).catch((err) => {
        console.error(`[NPC sprite FAILED] ${npc.spriteSrc}`, err)
      })
    }
  }, [cityConfig])

  useImperativeHandle(ref, () => ({
    setPosition(x: number, y: number) {
      worldPos.current = { x, y }
      moveRemainder.current = { x: 0, y: 0 }
      activeTriggerIds.current.clear()
      triggerCooldown.current = 1
    },
    setFacing(facing: Direction) {
      direction.current = facing
      lastFacing.current = facing
    },
    getPosition() {
      return { x: worldPos.current.x, y: worldPos.current.y }
    },
    getNearbyNpcId() {
      return nearbyNpcIdRef.current
    },
    devToggleCollisionDebug() {
      showCollisionDebug.current = !showCollisionDebug.current
    },
    devToggleCoordinateOverlay() {
      showCoordinateOverlay.current = !showCoordinateOverlay.current
      if (!showCoordinateOverlay.current) {
        pointerWorldPos.current.active = false
      }
    },
    devZoomIn() {
      const { width: sw, height: sh } = screenSizeRef.current
      const cfg = cityConfigRef.current
      zoomLevel.current = clampZoom(
        zoomLevel.current + ZOOM_STEP,
        sw,
        sh,
        cfg.worldWidth,
        cfg.worldHeight,
      )
    },
    devZoomOut() {
      const { width: sw, height: sh } = screenSizeRef.current
      const cfg = cityConfigRef.current
      zoomLevel.current = clampZoom(
        zoomLevel.current - ZOOM_STEP,
        sw,
        sh,
        cfg.worldWidth,
        cfg.worldHeight,
      )
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
        npcFacingMap.current.set(
          dialogueNpcId,
          resolveNpcFacingTowardPlayer(npc, worldPos.current.x, worldPos.current.y),
        )
      }
    } else if (prevId) {
      npcFacingMap.current.delete(prevId)
    }
  }, [dialogueNpcId])

  useEffect(() => {
    questPulseDescriptorRef.current = questPulseDescriptor
  }, [questPulseDescriptor])

  useEffect(() => {
    showQuestPulseRef.current = showQuestPulse
  }, [showQuestPulse])

  useEffect(() => {
    selectedMidnightVariantRef.current = selectedMidnightVariant
  }, [selectedMidnightVariant])

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
    if (!canvas) return

    const applyResponsiveZoom = () => {
      if (userPinchZoomed.current) return
      const cfg = cityConfigRef.current
      const displayW = readDisplayWidth(canvas)
      const next = clampZoom(
        getDefaultZoom(displayW),
        width,
        height,
        cfg.worldWidth,
        cfg.worldHeight,
      )
      zoomLevel.current = next
      cameraRef.current.zoom = next
    }

    applyResponsiveZoom()
    const observer = new ResizeObserver(applyResponsiveZoom)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [canvas, width, height])

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
    if (cityConfig.foregroundMapSrc) {
      void loadWorldBackgroundForSrc(cityConfig.foregroundMapSrc).catch((err) =>
        console.error(err),
      )
    }

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
  }, [cityConfig.mapSrc, cityConfig.foregroundMapSrc])

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
          userPinchZoomed.current = true
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

      const mapCollisionZones = getMapCollisionZones(cfg)
      const collidesAt = (wx: number, wy: number): boolean => {
        const hitbox = getFeetHitbox(wx, wy)
        if (mapCollisionZones.some((zone) => rectsOverlap(hitbox, zone))) return true
        return cfg.npcs.some((npc) => rectsOverlap(hitbox, getNpcCollisionRect(npc)))
      }

      const halfW = PLAYER_DISPLAY_WIDTH / 2
      const halfH = PLAYER_DISPLAY_HEIGHT / 2

      const applyAxisSteps = (axis: 'x' | 'y', steps: number) => {
        if (steps === 0) return
        const dir = Math.sign(steps)
        let remaining = Math.abs(steps)
        let applied = 0
        while (remaining > 0) {
          const pos = worldPos.current
          if (axis === 'x') {
            const nextX = Math.max(
              halfW,
              Math.min(cfg.worldWidth - halfW, pos.x + dir),
            )
            if (nextX === pos.x || collidesAt(nextX, pos.y)) break
            worldPos.current.x = nextX
          } else {
            const nextY = Math.max(
              halfH,
              Math.min(cfg.worldHeight - halfH, pos.y + dir),
            )
            if (nextY === pos.y || collidesAt(pos.x, nextY)) break
            worldPos.current.y = nextY
          }
          applied += 1
          remaining -= 1
        }
        if (applied < Math.abs(steps)) {
          if (axis === 'x') moveRemainder.current.x = 0
          else moveRemainder.current.y = 0
        } else {
          if (axis === 'x') moveRemainder.current.x -= dir * applied
          else moveRemainder.current.y -= dir * applied
        }
      }

      if (isMoving) {
        let speedX = 0
        let speedY = 0
        if (vx !== 0 && vy !== 0) {
          const len = Math.hypot(vx, vy)
          speedX = (vx / len) * MOVE_SPEED
          speedY = (vy / len) * MOVE_SPEED
        } else if (vx !== 0) {
          speedX = Math.sign(vx) * MOVE_SPEED
        } else if (vy !== 0) {
          speedY = Math.sign(vy) * MOVE_SPEED
        }

        moveRemainder.current.x += speedX * dt
        moveRemainder.current.y += speedY * dt

        const stepX = Math.trunc(moveRemainder.current.x)
        const stepY = Math.trunc(moveRemainder.current.y)
        applyAxisSteps('x', stepX)
        applyAxisSteps('y', stepY)
      } else {
        moveRemainder.current.x = 0
        moveRemainder.current.y = 0
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
      if (activeDialogueNpc) {
        const talkingNpc = cfg.npcs.find((n) => n.id === activeDialogueNpc)
        if (talkingNpc) {
          npcFacingMap.current.set(
            activeDialogueNpc,
            resolveNpcFacingTowardPlayer(talkingNpc, worldX, worldY),
          )
        }
      }
      for (const npc of cfg.npcs) {
        if (npc.id === activeDialogueNpc) continue
        if (npc.fixedFacing) {
          npcFacingMap.current.set(npc.id, npc.fixedFacing)
          continue
        }
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
        let nearestInteract = Infinity
        for (const pt of getNpcInteractPoints(npc)) {
          const dist = Math.hypot(worldX - pt.x, worldY - pt.y)
          if (dist < nearestInteract) nearestInteract = dist
        }
        if (nearestInteract <= NPC_INTERACT_RANGE && nearestInteract < closestDist) {
          closestDist = nearestInteract
          closestNpcId = npc.id
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

      const surfaceDpr =
        width > 0 && canvas.width > 0 ? canvas.width / width : window.devicePixelRatio || 1

      ctx.setTransform(surfaceDpr, 0, 0, surfaceDpr, 0, 0)
      ctx.fillStyle = WORLD_CANVAS_FILL
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.imageSmoothingEnabled = false
      applyWorldTransform(ctx, zoom, focus.x, focus.y, width, height)

      drawWorldMap(
        ctx,
        cfg.mapSrc,
        cfg.worldWidth,
        cfg.worldHeight,
        cfg.mapDrawScale ?? 1,
      )

      if (isDevModeEnabled() && showCollisionDebug.current) {
        drawCollisionZonesDebug(ctx, getMapCollisionZones(cfg), cfg.npcs)
        drawTransitionZonesDebug(ctx, cfg.triggerZones)
        drawDarklineEntranceZonesDebug(ctx, cfg.triggerZones)
      }

      const frame = isMoving ? animFrame.current : MIDNIGHT_WALK_IDLE_FRAME
      const state: 'moving' | 'idle' = isMoving ? 'moving' : 'idle'

      let sx = 0
      let sy = 0

      const variantId = selectedMidnightVariantRef.current ?? 'default'
      const renderTuning = getMidnightVariantRenderTuning(variantId)
      const characterScale = cfg.characterScale ?? 1
      const baseDh = Math.floor(PLAYER_DISPLAY_HEIGHT)
      const baseDw = Math.floor(PLAYER_DISPLAY_WIDTH)
      const drawDh = Math.floor(baseDh * characterScale)
      const drawDw = Math.floor(baseDw * characterScale)
      const worldDrawY = Math.floor(
        worldY +
          baseDh / 2 -
          drawDh -
          renderTuning.drawShiftUp +
          renderTuning.feetOffset,
      )
      const worldDrawX = Math.floor(worldX - drawDw / 2)

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

      type Renderable =
        | { sortY: number; kind: 'midnight' }
        | { sortY: number; kind: 'npc'; npc: typeof cfg.npcs[number] }

      const midnightBottomY = worldDrawY + drawDh
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

            // Clip the player draw to exclude any overlapping occlusion zones,
            // so the map underneath shows through instead of a blank hole.
            const playerFeetY = worldDrawY + drawDh
            const occlusionOverlaps: { ix: number; iy: number; iw: number; ih: number }[] = []
            for (const zone of cfg.occlusionZones) {
              // Only occlude when player's feet are above the object's bottom edge (player is behind it)
              if (playerFeetY >= zone.y + zone.height) continue
              const ix = Math.max(worldDrawX, zone.x)
              const iy = Math.max(worldDrawY, zone.y)
              const iw = Math.min(worldDrawX + drawDw, zone.x + zone.width) - ix
              const ih = Math.min(worldDrawY + drawDh, zone.y + zone.height) - iy
              if (iw > 0 && ih > 0) occlusionOverlaps.push({ ix, iy, iw, ih })
            }

            if (occlusionOverlaps.length > 0) {
              ctx.save()
              ctx.beginPath()
              // Large outer rect covers the whole world
              ctx.rect(-10000, -10000, 30000, 30000)
              // Cut out each occlusion overlap (evenodd makes these holes)
              for (const { ix, iy, iw, ih } of occlusionOverlaps) {
                ctx.rect(ix, iy, iw, ih)
              }
              ctx.clip('evenodd')
              drawSheetFrame(ctx, midnightSheet, facing, frame, worldDrawX, worldDrawY, drawDw, drawDh, 1, renderTuning)
              ctx.restore()
            } else {
              drawSheetFrame(ctx, midnightSheet, facing, frame, worldDrawX, worldDrawY, drawDw, drawDh, 1, renderTuning)
            }
          }
        } else {
          const npc = entry.npc
          const half = NPC_SIZE / 2
          const npcFacing = npc.fixedFacing ?? npcFacingMap.current.get(npc.id) ?? 'down'
          const displayW = 48
          const displayH = 120
          const dx = Math.floor(npc.x - displayW / 2)
          const dy = Math.floor(npc.y + half - displayH)

          const storySheet = npcStoryIdleRef.current.get(npc.id)
          if (storySheet) {
            const pose = storySheet.poses[npcFacing]
            drawStoryIdleNpcPose(
              ctx,
              storySheet.image,
              pose,
              dx,
              dy,
              displayW,
              displayH,
            )
          } else {
            const spriteImg = npcSpritesRef.current.get(npc.id)

            if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
              const cols = npc.spriteColumns ?? 4
              const frameW = Math.floor(spriteImg.naturalWidth / cols)
              const frameH = spriteImg.naturalHeight
              const col = NPC_SPRITE_COL[npcFacing]
              const nsx = Math.floor(col * frameW)

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

          const combatLevel = getNpcCombatLevel(npc.id)
          if (combatLevel != null) {
            ctx.save()
            ctx.font = '9px monospace'
            ctx.textAlign = 'center'
            ctx.fillStyle = 'rgba(244, 232, 193, 0.95)'
            ctx.fillText(
              `LVL ${combatLevel}`,
              Math.floor(dx + displayW / 2),
              Math.floor(dy - 6),
            )
            ctx.restore()
          }
        }
      }

      if (showQuestPulseRef.current && !frozen) {
        const pulsePoint = resolveQuestPulseWorldPoint(
          questPulseDescriptorRef.current,
          cfg,
          worldX,
          worldY,
        )
        if (pulsePoint) {
          drawQuestObjectivePulse(ctx, pulsePoint.x, pulsePoint.y, performance.now())
        }
      }

      if (cfg.foregroundMapSrc) {
        drawWorldForegroundOverlay(
          ctx,
          cfg.foregroundMapSrc,
          cfg.worldWidth,
          cfg.worldHeight,
          cfg.mapDrawScale ?? 1,
        )
      }

      const devMode = isDevModeEnabled()
      if (devMode && showCoordinateOverlay.current) {
        drawCoordinateGrid(ctx, zoom, focus.x, focus.y, width, height, cfg.worldWidth, cfg.worldHeight)
        drawMidnightCrosshair(ctx, worldX, worldY, zoom)
      }

      ctx.restore()

      const debugInfo: DebugInfo = { direction: facing, frame, sx, sy, state }
      const coordReadout =
        devMode && showCoordinateOverlay.current
        ? {
            worldX,
            worldY,
            zoom,
            pointer: pointerWorldPos.current,
          }
        : null
      if (devMode && getShowDebug()) {
        const tuningLines = formatMidnightVariantTuningDebug(variantId, renderTuning)
        drawDebugOverlay(ctx, debugInfo, coordReadout, cfg.id)
        setDebugHud(formatDebugText(debugInfo, coordReadout, tuningLines, cfg.id))
      } else {
        setDebugHud('')
      }
    }

    registerLoop(id, step)
    return () => unregisterLoop(id)
  }, [ctx, width, height, registerLoop, unregisterLoop, setDebugHud])

  return null
})
