import { useCallback, useEffect, useState } from 'react'
import { publicAsset } from '../utils/publicAsset'
import {
  CITY_CONFIGS,
  DARKLINE_DESTINATIONS,
  INACTIVE_DESTINATIONS,
  type CityId,
} from '../data/cityConfig'
import './DarklineScreen.css'

const PLATFORM_BG_SRC = publicAsset('Assets/tileset/darkline-platform.png')
const FADE_MS = 400

type Props = {
  currentCity: CityId
  onClose: () => void
  onTravel: (destination: CityId) => void
}

export function DarklineScreen({ currentCity, onClose, onTravel }: Props) {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering')
  const [travelTarget, setTravelTarget] = useState<CityId | null>(null)

  useEffect(() => {
    if (phase !== 'entering') return
    const timer = window.setTimeout(() => setPhase('visible'), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'exiting') return
    const timer = window.setTimeout(() => {
      if (travelTarget) {
        onTravel(travelTarget)
      } else {
        onClose()
      }
    }, FADE_MS)
    return () => window.clearTimeout(timer)
  }, [phase, onClose, onTravel, travelTarget])

  const handleBack = useCallback(() => {
    if (phase === 'visible') {
      setTravelTarget(null)
      setPhase('exiting')
    }
  }, [phase])

  const handleDestinationClick = useCallback(
    (cityId: CityId) => {
      if (phase === 'visible' && cityId !== currentCity) {
        setTravelTarget(cityId)
        setPhase('exiting')
      }
    },
    [phase, currentCity],
  )

  const className = [
    'darkline-screen',
    phase === 'entering' && 'darkline-screen--entering',
    phase === 'exiting' && 'darkline-screen--exiting',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      role="dialog"
      aria-modal="true"
      style={{ ['--darkline-fade-ms' as string]: `${FADE_MS}ms` }}
    >
      <img
        className="darkline-screen__bg"
        src={PLATFORM_BG_SRC}
        alt=""
        draggable={false}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />

      <nav className="darkline-screen__menu" aria-label="Darkline destinations">
        <h2 className="darkline-screen__title">Darkline</h2>

        {DARKLINE_DESTINATIONS.map((cityId) => {
          const config = CITY_CONFIGS[cityId]
          const isHere = cityId === currentCity
          return (
            <div
              key={cityId}
              className={`darkline-screen__dest${isHere ? ' darkline-screen__dest--here' : ''} ${!isHere ? 'darkline-screen__dest--active' : ''}`}
              onClick={!isHere ? () => handleDestinationClick(cityId) : undefined}
            >
              <span className="darkline-screen__dest-label">{config.label}</span>
              <span className="darkline-screen__dest-status">
                {isHere ? 'YOU ARE HERE' : ''}
              </span>
            </div>
          )
        })}

        {INACTIVE_DESTINATIONS.map((dest) => (
          <div key={dest.label} className="darkline-screen__dest">
            <span className="darkline-screen__dest-label">{dest.label}</span>
            <span className="darkline-screen__dest-status">{dest.status}</span>
          </div>
        ))}

        <button type="button" className="darkline-screen__back" onClick={handleBack}>
          BACK
        </button>
      </nav>
    </div>
  )
}
