import { useEffect, useRef } from 'react'
import { publicAsset } from '../utils/publicAsset'
import { setMusicVolumePercent, getMusicVolumePercent } from '../lib/audioManager'
import './SigilFlashOverlay.css'

const SIGIL_SRC = publicAsset('Assets/ui/AW%20GAME%20LOGO.svg')

const FLASH_MS = 2200
const DUCK_MS = 200
const ROAR_MS = 400

type Props = {
  onComplete: () => void
}

export function SigilFlashOverlay({ onComplete }: Props) {
  const onCompleteRef = useRef(onComplete)
  const savedVolumeRef = useRef(getMusicVolumePercent())

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const prior = savedVolumeRef.current
    setMusicVolumePercent(Math.max(1, Math.round(prior * 0.08)))

    const roarTimer = window.setTimeout(() => {
      setMusicVolumePercent(100)
    }, DUCK_MS + ROAR_MS)

    const doneTimer = window.setTimeout(() => {
      setMusicVolumePercent(prior)
      onCompleteRef.current()
    }, FLASH_MS)

    return () => {
      window.clearTimeout(roarTimer)
      window.clearTimeout(doneTimer)
      setMusicVolumePercent(prior)
    }
  }, [])

  return (
    <div className="sigil-flash" role="presentation" aria-hidden>
      <div className="sigil-flash__bleed" />
      <div className="sigil-flash__shake">
        <img className="sigil-flash__sigil" src={SIGIL_SRC} alt="" draggable={false} />
      </div>
    </div>
  )
}
