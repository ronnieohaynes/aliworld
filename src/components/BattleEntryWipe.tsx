import { useEffect, useRef } from 'react'
import './BattleEntryWipe.css'

export const BATTLE_ENTRY_WIPE_MS = 1000
export const BATTLE_ENTRY_WIPE_MIDPOINT_MS = BATTLE_ENTRY_WIPE_MS / 2

type Props = {
  onMidpoint: () => void
  onComplete: () => void
}

export function BattleEntryWipe({ onMidpoint, onComplete }: Props) {
  const midpointCalled = useRef(false)
  const completeCalled = useRef(false)

  useEffect(() => {
    midpointCalled.current = false
    completeCalled.current = false

    const midpointTimer = window.setTimeout(() => {
      if (midpointCalled.current) return
      midpointCalled.current = true
      onMidpoint()
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
    <div className="battle-entry-wipe" aria-hidden>
      <div className="battle-entry-wipe__panel">
        <div className="battle-entry-wipe__sigil" aria-hidden>
          <span className="battle-entry-wipe__sigil-mark" />
        </div>
      </div>
    </div>
  )
}
