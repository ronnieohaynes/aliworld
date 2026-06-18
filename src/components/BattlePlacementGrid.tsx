import { useCallback, useLayoutEffect, useState, type RefObject } from 'react'
import type { BattleSpritePlacement } from '../game/battlePlacement'
import {
  BATTLE_ENEMY_FEET,
  BATTLE_PLAYER_FEET,
} from '../game/battlePlacement'
import './BattlePlacementGrid.css'

const GRID_STEP = 16

export type SpritePlacementMetrics = {
  x: number
  drawY: number
  displayHeight: number
  feetX: number
  feetY: number
  width: number
  bottom: number
  facing: string
}

export type PlatePlacementMetrics = {
  x: number
  y: number
  width: number
  height: number
  bottom: number
  centerX: number
  anchorX: number
  anchorY: number
  visibleDrawY: number
  feetX: number
}

export type BattlePlacementMetrics = {
  stageWidth: number
  stageHeight: number
  enemy: SpritePlacementMetrics | null
  player: SpritePlacementMetrics | null
  enemyPlate: PlatePlacementMetrics | null
  playerPlate: PlatePlacementMetrics | null
}

function measureSprite(
  stageRect: DOMRect,
  el: HTMLElement | null,
  placement: BattleSpritePlacement,
): SpritePlacementMetrics | null {
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const x = Math.floor(rect.left - stageRect.left)
  const drawY = Math.floor(rect.top - stageRect.top)
  const width = Math.floor(rect.width)
  const displayHeight = Math.floor(rect.height)
  return {
    x,
    drawY,
    displayHeight,
    feetX: placement.feetX,
    feetY: placement.feetY,
    width,
    bottom: Math.floor(drawY + displayHeight),
    facing: placement.facing,
  }
}

function measurePlate(
  stageRect: DOMRect,
  anchorEl: HTMLElement | null,
  plateEl: HTMLElement | null,
  placement: BattleSpritePlacement,
): PlatePlacementMetrics | null {
  if (!plateEl) return null

  const plateRect = plateEl.getBoundingClientRect()
  const x = Math.floor(plateRect.left - stageRect.left)
  const y = Math.floor(plateRect.top - stageRect.top)
  const width = Math.floor(plateRect.width)
  const height = Math.floor(plateRect.height)

  let anchorX = placement.feetX
  let anchorY = placement.visibleDrawY
  if (anchorEl) {
    const anchorRect = anchorEl.getBoundingClientRect()
    anchorX = Math.floor(anchorRect.left - stageRect.left + anchorRect.width / 2)
    anchorY = Math.floor(anchorRect.bottom - stageRect.top)
  }

  return {
    x,
    y,
    width,
    height,
    bottom: Math.floor(y + height),
    centerX: Math.floor(x + width / 2),
    anchorX,
    anchorY,
    visibleDrawY: placement.visibleDrawY,
    feetX: placement.feetX,
  }
}

type Props = {
  stageRef: RefObject<HTMLElement | null>
  enemyRef: RefObject<HTMLElement | null>
  playerRef: RefObject<HTMLElement | null>
  enemyPlateAnchorRef: RefObject<HTMLElement | null>
  enemyPlateRef: RefObject<HTMLElement | null>
  playerPlateAnchorRef: RefObject<HTMLElement | null>
  playerPlateRef: RefObject<HTMLElement | null>
  enemyPlacement: BattleSpritePlacement
  playerPlacement: BattleSpritePlacement
  /** Sprite x/feet/drawY readout boxes (grid lines still show). */
  showSpriteStats?: boolean
}

export function BattlePlacementGrid({
  stageRef,
  enemyRef,
  playerRef,
  enemyPlateAnchorRef,
  enemyPlateRef,
  playerPlateAnchorRef,
  playerPlateRef,
  enemyPlacement,
  playerPlacement,
  showSpriteStats = true,
}: Props) {
  const [metrics, setMetrics] = useState<BattlePlacementMetrics | null>(null)

  const measure = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const stageRect = stage.getBoundingClientRect()
    const stageWidth = Math.floor(stageRect.width)
    const stageHeight = Math.floor(stageRect.height)

    setMetrics({
      stageWidth,
      stageHeight,
      enemy: measureSprite(stageRect, enemyRef.current, enemyPlacement),
      player: measureSprite(stageRect, playerRef.current, playerPlacement),
      enemyPlate: measurePlate(
        stageRect,
        enemyPlateAnchorRef.current,
        enemyPlateRef.current,
        enemyPlacement,
      ),
      playerPlate: measurePlate(
        stageRect,
        playerPlateAnchorRef.current,
        playerPlateRef.current,
        playerPlacement,
      ),
    })
  }, [
    stageRef,
    enemyRef,
    playerRef,
    enemyPlateAnchorRef,
    enemyPlateRef,
    playerPlateAnchorRef,
    playerPlateRef,
    enemyPlacement,
    playerPlacement,
  ])

  useLayoutEffect(() => {
    measure()

    const stage = stageRef.current
    if (!stage) return

    const observer = new ResizeObserver(measure)
    observer.observe(stage)

    if (enemyRef.current) observer.observe(enemyRef.current)
    if (playerRef.current) observer.observe(playerRef.current)
    if (enemyPlateAnchorRef.current) observer.observe(enemyPlateAnchorRef.current)
    if (enemyPlateRef.current) observer.observe(enemyPlateRef.current)
    if (playerPlateAnchorRef.current) observer.observe(playerPlateAnchorRef.current)
    if (playerPlateRef.current) observer.observe(playerPlateRef.current)

    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [
    measure,
    stageRef,
    enemyRef,
    playerRef,
    enemyPlateAnchorRef,
    enemyPlateRef,
    playerPlateAnchorRef,
    playerPlateRef,
  ])

  if (!metrics) return null

  const { stageWidth, stageHeight, enemy, player, enemyPlate, playerPlate } = metrics
  const midX = Math.floor(stageWidth / 2)
  const midY = Math.floor(stageHeight / 2)

  const edgeLabels: { id: string; left: number; top: number; text: string }[] = []
  for (let x = 0; x <= stageWidth; x += GRID_STEP * 4) {
    if (x === 0 || x + GRID_STEP > stageWidth) continue
    edgeLabels.push({
      id: `top-${x}`,
      left: x,
      top: 2,
      text: String(x),
    })
  }
  for (let y = GRID_STEP; y < stageHeight; y += GRID_STEP * 4) {
    edgeLabels.push({
      id: `left-${y}`,
      left: 2,
      top: y,
      text: String(y),
    })
  }

  return (
    <div className="battle-placement-grid" aria-hidden>
      <div
        className="battle-placement-grid__ground-line battle-placement-grid__ground-line--enemy"
        style={{ top: Math.floor(BATTLE_ENEMY_FEET.y) }}
      />
      <div
        className="battle-placement-grid__ground-line battle-placement-grid__ground-line--player"
        style={{ top: Math.floor(BATTLE_PLAYER_FEET.y) }}
      />
      <div
        className="battle-placement-grid__feet-marker battle-placement-grid__feet-marker--enemy"
        style={{
          left: Math.floor(BATTLE_ENEMY_FEET.x),
          top: Math.floor(BATTLE_ENEMY_FEET.y),
        }}
      />
      <div
        className="battle-placement-grid__feet-marker battle-placement-grid__feet-marker--player"
        style={{
          left: Math.floor(BATTLE_PLAYER_FEET.x),
          top: Math.floor(BATTLE_PLAYER_FEET.y),
        }}
      />

      <div
        className="battle-placement-grid__center-v"
        style={{ left: Math.floor(midX) }}
      />
      <div
        className="battle-placement-grid__center-h"
        style={{ top: Math.floor(midY) }}
      />

      <span className="battle-placement-grid__corner battle-placement-grid__corner--tl">
        0,0
      </span>
      <span
        className="battle-placement-grid__corner battle-placement-grid__corner--tr"
      >
        {stageWidth},0
      </span>
      <span
        className="battle-placement-grid__corner battle-placement-grid__corner--bl"
      >
        0,{stageHeight}
      </span>
      <span
        className="battle-placement-grid__corner battle-placement-grid__corner--br"
      >
        {stageWidth},{stageHeight}
      </span>

      {edgeLabels.map(({ id, left, top, text }) => (
        <span
          key={id}
          className="battle-placement-grid__tick"
          style={{ left: Math.floor(left), top: Math.floor(top) }}
        >
          {text}
        </span>
      ))}

      {showSpriteStats && enemy ? <SpriteLabel name="enemy" metrics={enemy} /> : null}
      {showSpriteStats && player ? <SpriteLabel name="player" metrics={player} /> : null}
      {showSpriteStats && enemyPlate ? (
        <PlateLabel name="enemy-plate" metrics={enemyPlate} side="left" />
      ) : null}
      {showSpriteStats && playerPlate ? (
        <PlateLabel name="player-plate" metrics={playerPlate} side="left" />
      ) : null}
    </div>
  )
}

function SpriteLabel({
  name,
  metrics,
}: {
  name: string
  metrics: SpritePlacementMetrics
}) {
  const { x, drawY, displayHeight, feetX, feetY, width, bottom, facing } = metrics

  return (
    <div
      className={`battle-placement-grid__sprite battle-placement-grid__sprite--${name}`}
      style={{
        left: Math.floor(x + width + 6),
        top: Math.floor(Math.max(0, drawY - 52)),
      }}
    >
      <span>
        {name} x:{x}
      </span>
      <span>
        feet:{feetX},{feetY}
      </span>
      <span>drawY:{drawY}</span>
      <span>h:{displayHeight}</span>
      <span>bottom:{bottom}</span>
      <span>
        {width}×{displayHeight}
      </span>
      <span>facing: {facing}</span>
    </div>
  )
}

function PlateLabel({
  name,
  metrics,
  side = 'right',
}: {
  name: string
  metrics: PlatePlacementMetrics
  side?: 'left' | 'right'
}) {
  const { x, y, width, height, bottom, centerX, anchorX, anchorY, visibleDrawY, feetX } = metrics

  return (
    <div
      className={`battle-placement-grid__plate battle-placement-grid__plate--${name}`}
      style={{
        left: side === 'left' ? Math.floor(x - 6) : Math.floor(x + width + 6),
        top: Math.floor(Math.max(0, y - 8)),
        transform: side === 'left' ? 'translateX(-100%)' : undefined,
      }}
    >
      <span>{name}</span>
      <span>
        anchor:{anchorX},{anchorY}
      </span>
      <span>visibleDrawY:{visibleDrawY}</span>
      <span>feetX:{feetX}</span>
      <span>
        card:{x},{y}
      </span>
      <span>
        {width}×{height}
      </span>
      <span>centerX:{centerX}</span>
      <span>bottom:{bottom}</span>
    </div>
  )
}
