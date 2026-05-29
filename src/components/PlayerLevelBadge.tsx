import { useEffect, useRef, useState } from 'react'
import { useSyncExternalStore } from 'react'
import { getPlayerLevel, subscribePlayerStore } from '../store/playerStore'

type Props = {
  className?: string
  /** Force flash (e.g. battle screen after combat level-up). */
  flash?: boolean
}

export function PlayerLevelBadge({ className = '', flash = false }: Props) {
  const level = useSyncExternalStore(subscribePlayerStore, getPlayerLevel, getPlayerLevel)
  const [levelUpFlash, setLevelUpFlash] = useState(false)
  const prevLevelRef = useRef(level)

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setLevelUpFlash(true)
      const timer = window.setTimeout(() => setLevelUpFlash(false), 700)
      prevLevelRef.current = level
      return () => window.clearTimeout(timer)
    }
    prevLevelRef.current = level
  }, [level])

  const showFlash = flash || levelUpFlash

  return (
    <span
      className={`player-level-badge${showFlash ? ' player-level-badge--flash' : ''}${className ? ` ${className}` : ''}`}
      aria-label={`Combat level ${level}`}
    >
      LVL {level}
    </span>
  )
}
