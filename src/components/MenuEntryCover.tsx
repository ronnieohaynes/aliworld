import { useEffect, useRef, useState } from 'react'
import {
  BATTLE_ENTRY_WIPE_MIDPOINT_MS,
  BATTLE_ENTRY_WIPE_MS,
} from './BattleEntryWipe'
import './MidnightSelectTransition.css'
import './MenuEntryCover.css'

const MENU_ENTRY_EXIT_MS = BATTLE_ENTRY_WIPE_MS - BATTLE_ENTRY_WIPE_MIDPOINT_MS

type Props = {
  onMidpoint: () => void
  onComplete: () => void
}

/** What the transition reveals after the cover exits. */
export type MenuTransitionTarget = { kind: 'to-screen'; screen: 'fanny-pack' | 'stats' }

/**
 * Full-screen menu transition: opaque cover, swap at midpoint, then reveal (fade only for to-screen).
 */
export function MenuEntryCover({ onMidpoint, onComplete }: Props) {
  const [exiting, setExiting] = useState(false)
  const midpointCalled = useRef(false)
  const completeCalled = useRef(false)

  useEffect(() => {
    midpointCalled.current = false
    completeCalled.current = false
    setExiting(false)

    const midpointTimer = window.setTimeout(() => {
      if (midpointCalled.current) return
      midpointCalled.current = true
      onMidpoint()
      setExiting(true)
    }, BATTLE_ENTRY_WIPE_MIDPOINT_MS)

    const completeTimer = window.setTimeout(() => {
      if (completeCalled.current) return
      completeCalled.current = true
      onComplete()
    }, BATTLE_ENTRY_WIPE_MS)

    return () => {
      window.clearTimeout(midpointTimer)
      window.clearTimeout(completeTimer)
    }
  }, [onMidpoint, onComplete])

  return (
    <div className="menu-entry-cover" aria-hidden>
      <div
        className={`menu-entry-cover__panel${
          exiting ? ' midnight-select-transition--exit' : ''
        }`}
        style={
          exiting
            ? { ['--midnight-select-transition-ms' as string]: `${MENU_ENTRY_EXIT_MS}ms` }
            : undefined
        }
      />
    </div>
  )
}
