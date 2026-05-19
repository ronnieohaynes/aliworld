import { useEffect, useRef, useState } from 'react'

type Props = {
  current: number
  max: number
  variant?: 'watcher' | 'mdnght'
}

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t)
}

export function HPBar({ current, max, variant = 'mdnght' }: Props) {
  const [displayed, setDisplayed] = useState(current)
  const displayedRef = useRef(current)
  const rafRef = useRef(0)

  useEffect(() => {
    const start = displayedRef.current
    const end = current
    if (start === end) return

    let cancelled = false
    const duration = 380
    const t0 = performance.now()

    const step = (now: number) => {
      if (cancelled) return
      const u = Math.min(1, (now - t0) / duration)
      const value = Math.round(start + (end - start) * easeOutQuad(u))
      displayedRef.current = value
      setDisplayed(value)
      if (u < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        displayedRef.current = end
        setDisplayed(end)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [current])

  const pct = max > 0 ? Math.max(0, Math.min(100, (displayed / max) * 100)) : 0
  const safe = Math.max(0, displayed)

  return (
    <div className={`hp-bar hp-bar--${variant}`} role="group" aria-label={`Hit points ${current} of ${max}`}>
      <div className="hp-bar-track">
        <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="hp-bar-numbers" aria-hidden>
        {safe}
        <span className="hp-bar-max">/{max}</span>
      </div>
    </div>
  )
}
