import { useEffect, useRef } from 'react'
import { useGameCanvas } from '../game/GameCanvasContext'
import { playerScreenAnchor } from '../game/playerScreenAnchor'
import { PlayerLevelBadge } from './PlayerLevelBadge'
import './PlayerLevelBadge.css'

const LOOP_ID = Symbol('player-level-overhead')

export function PlayerLevelOverhead() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const { registerLoop, unregisterLoop } = useGameCanvas()

  useEffect(() => {
    registerLoop(LOOP_ID, () => {
      const el = wrapRef.current
      if (!el) return
      if (!playerScreenAnchor.active) {
        el.style.visibility = 'hidden'
        return
      }
      el.style.visibility = 'visible'
      el.style.transform = `translate(${Math.round(playerScreenAnchor.x)}px, ${Math.round(playerScreenAnchor.y)}px)`
    })
    return () => unregisterLoop(LOOP_ID)
  }, [registerLoop, unregisterLoop])

  return (
    <div ref={wrapRef} className="player-level-overhead" aria-hidden={false}>
      <PlayerLevelBadge />
    </div>
  )
}
