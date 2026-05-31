import { useEffect, useRef, useState } from 'react'
import { MIDNIGHT_SELECT_TRANSITION_MS } from '../constants/midnightSelectTransition'
import './MidnightSelectTransition.css'
import './WorldEntryWipe.css'

export const WORLD_ENTRY_WIPE_MS = MIDNIGHT_SELECT_TRANSITION_MS

type Props = {
  /** When true, the exit transition begins (world should already be loaded underneath). */
  ready: boolean
  onComplete: () => void
}

/**
 * Covers the world while assets load, then plays the reverse of the
 * Choose MIDNIGHT entrance transition (midnight-select-exit).
 */
export function WorldEntryWipe({ ready, onComplete }: Props) {
  const [exiting, setExiting] = useState(false)
  const completeCalled = useRef(false)

  useEffect(() => {
    if (!ready || exiting) return
    setExiting(true)
  }, [ready, exiting])

  useEffect(() => {
    if (!exiting) return
    completeCalled.current = false

    const completeTimer = window.setTimeout(() => {
      if (completeCalled.current) return
      completeCalled.current = true
      onComplete()
    }, WORLD_ENTRY_WIPE_MS)

    return () => window.clearTimeout(completeTimer)
  }, [exiting, onComplete])

  return (
    <div className="world-entry-cover" aria-hidden>
      <div
        className={`world-entry-cover__panel${
          exiting ? ' midnight-select-transition--exit' : ''
        }`}
        style={{ ['--midnight-select-transition-ms' as string]: `${WORLD_ENTRY_WIPE_MS}ms` }}
      />
    </div>
  )
}
