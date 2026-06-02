import { useEffect, useRef } from 'react'
import './BattleEntryWipe.css'

export const BATTLE_ENTRY_WIPE_MS = 1000
export const BATTLE_ENTRY_WIPE_MIDPOINT_MS = BATTLE_ENTRY_WIPE_MS / 2

export type BattleWipeMode = 'enter' | 'exit'

type Props = {
  mode: BattleWipeMode
  onMidpoint: () => void
  onComplete: () => void
}

export function BattleEntryWipe({ mode, onMidpoint, onComplete }: Props) {
  const onMidpointRef = useRef(onMidpoint)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onMidpointRef.current = onMidpoint
  }, [onMidpoint])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const midpointTimer = window.setTimeout(
      () => onMidpointRef.current(),
      BATTLE_ENTRY_WIPE_MIDPOINT_MS,
    )
    const completeTimer = window.setTimeout(
      () => onCompleteRef.current(),
      BATTLE_ENTRY_WIPE_MS,
    )
    return () => {
      window.clearTimeout(midpointTimer)
      window.clearTimeout(completeTimer)
    }
  }, [])

  return (
    <div className={`battle-entry-wipe battle-entry-wipe--${mode}`} aria-hidden>
      <div className="battle-entry-wipe__panel">
        <div className="battle-entry-wipe__sigil" aria-hidden>
          <span className="battle-entry-wipe__sigil-mark" />
        </div>
      </div>
    </div>
  )
}
