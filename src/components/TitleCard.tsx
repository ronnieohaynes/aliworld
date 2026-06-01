import { useCallback, useEffect } from 'react'
import { publicAsset } from '../utils/publicAsset'
import './TitleCard.css'

const SIGIL_SRC = publicAsset('Assets/ui/AW%20GAME%20LOGO.svg')

type Props = {
  onStart: () => void
}

export function TitleCard({ onStart }: Props) {
  const handleStart = useCallback(() => {
    onStart()
  }, [onStart])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      handleStart()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleStart])

  return (
    <div
      className="title-card"
      role="button"
      tabIndex={0}
      aria-label="ALIWORLD title screen — tap to start"
      onClick={handleStart}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleStart()
        }
      }}
    >
      <div className="title-card__content">
        <h1 className="title-card__wordmark">ALIWORLD</h1>
        <img
          className="title-card__sigil"
          src={SIGIL_SRC}
          alt=""
          draggable={false}
        />
        <p className="title-card__prompt">tap to start</p>
      </div>
      <p className="title-card__copyright">© six5ive LLC 2025-2026</p>
    </div>
  )
}
