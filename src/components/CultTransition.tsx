import { useEffect, useRef } from 'react'
import {
  CULT_TRANSITION_MIDPOINT_MS,
  CULT_TRANSITION_MS,
} from '../constants/cultTransition'
import './CultTransition.css'

export type CultTransitionMode = 'enter' | 'exit'

type Props = {
  mode: CultTransitionMode
  onMidpoint: () => void
  onComplete: () => void
}

export function CultTransition({ mode, onMidpoint, onComplete }: Props) {
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
      CULT_TRANSITION_MIDPOINT_MS,
    )
    const completeTimer = window.setTimeout(
      () => onCompleteRef.current(),
      CULT_TRANSITION_MS,
    )
    return () => {
      window.clearTimeout(midpointTimer)
      window.clearTimeout(completeTimer)
    }
  }, [])

  return (
    <div
      className={`cult-transition cult-transition--${mode}`}
      role="presentation"
      aria-hidden
      style={{ ['--cult-transition-ms' as string]: `${CULT_TRANSITION_MS}ms` }}
    >
      <div className="cult-transition__panel">
        <div className="cult-transition__brand">
          <span className="cult-transition__sigil" aria-hidden />
          <p className="cult-transition__label">cult.18</p>
        </div>
      </div>
    </div>
  )
}
