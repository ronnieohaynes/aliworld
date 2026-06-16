import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './MidnightSelectTransition.css'
import './MenuEntryCover.css'

/** Faster than battle entry — menu ↔ sub-screen should feel snappy. */
export const MENU_TRANSITION_MS = 450
export const MENU_TRANSITION_MIDPOINT_MS = 200

type Props = {
  /** Resume gameplay: swap under cover instantly, no fade (avoids flashing the map). */
  immediateMidpoint?: boolean
  /** Override the midpoint timing in ms (defaults to MENU_TRANSITION_MIDPOINT_MS). */
  midpointMs?: number
  /** Override the total transition timing in ms (defaults to MENU_TRANSITION_MS). */
  totalMs?: number
  /** Fade the panel in over midpointMs instead of snapping to black. */
  fadeIn?: boolean
  onMidpoint: () => void
  onComplete: () => void
}

export type MenuTransitionTarget =
  | { kind: 'to-screen'; screen: 'fanny-pack' | 'loadout' }
  | { kind: 'resume' }

/**
 * Full-screen menu transition: opaque cover, swap at midpoint, then reveal (fade only for to-screen).
 */
export function MenuEntryCover({
  immediateMidpoint = false,
  midpointMs = MENU_TRANSITION_MIDPOINT_MS,
  totalMs = MENU_TRANSITION_MS,
  fadeIn = false,
  onMidpoint,
  onComplete,
}: Props) {
  const exitMs = totalMs - midpointMs
  const [exiting, setExiting] = useState(false)
  const midpointCalled = useRef(false)
  const completeCalled = useRef(false)

  useLayoutEffect(() => {
    if (!immediateMidpoint || midpointCalled.current) return
    midpointCalled.current = true
    completeCalled.current = true
    onMidpoint()
    onComplete()
  }, [immediateMidpoint, onMidpoint, onComplete])

  useEffect(() => {
    if (immediateMidpoint) return

    midpointCalled.current = false
    completeCalled.current = false
    setExiting(false)

    const midpointTimer = window.setTimeout(() => {
      if (midpointCalled.current) return
      midpointCalled.current = true
      onMidpoint()
      setExiting(true)
    }, midpointMs)

    const completeTimer = window.setTimeout(() => {
      if (completeCalled.current) return
      completeCalled.current = true
      onComplete()
    }, totalMs)

    return () => {
      window.clearTimeout(midpointTimer)
      window.clearTimeout(completeTimer)
    }
  }, [immediateMidpoint, midpointMs, totalMs, onMidpoint, onComplete])

  if (immediateMidpoint) {
    return (
      <div className="menu-entry-cover" aria-hidden>
        <div className="menu-entry-cover__panel" />
      </div>
    )
  }

  return (
    <div className="menu-entry-cover" aria-hidden>
      <div
        className={`menu-entry-cover__panel${
          exiting ? ' midnight-select-transition--exit' : ''
        }${
          fadeIn && !exiting ? ' menu-entry-cover__panel--fade-in' : ''
        }`}
        style={{
          ...(exiting
            ? { ['--midnight-select-transition-ms' as string]: `${exitMs}ms` }
            : {}),
          ...(fadeIn && !exiting
            ? { ['--menu-cover-fade-in-ms' as string]: `${midpointMs}ms` }
            : {}),
        }}
      />
    </div>
  )
}
