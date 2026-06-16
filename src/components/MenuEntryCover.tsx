import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './MidnightSelectTransition.css'
import './MenuEntryCover.css'

/** Faster than battle entry — menu ↔ sub-screen should feel snappy. */
export const MENU_TRANSITION_MS = 450
export const MENU_TRANSITION_MIDPOINT_MS = 200
const MENU_TRANSITION_EXIT_MS = MENU_TRANSITION_MS - MENU_TRANSITION_MIDPOINT_MS

type Props = {
  /** Resume gameplay: swap under cover instantly, no fade (avoids flashing the map). */
  immediateMidpoint?: boolean
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
  onMidpoint,
  onComplete,
}: Props) {
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
    }, MENU_TRANSITION_MIDPOINT_MS)

    const completeTimer = window.setTimeout(() => {
      if (completeCalled.current) return
      completeCalled.current = true
      onComplete()
    }, MENU_TRANSITION_MS)

    return () => {
      window.clearTimeout(midpointTimer)
      window.clearTimeout(completeTimer)
    }
  }, [immediateMidpoint, onMidpoint, onComplete])

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
        }`}
        style={
          exiting
            ? { ['--midnight-select-transition-ms' as string]: `${MENU_TRANSITION_EXIT_MS}ms` }
            : undefined
        }
      />
    </div>
  )
}
