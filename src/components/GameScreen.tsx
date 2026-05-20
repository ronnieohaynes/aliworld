import { useCallback, useState } from 'react'
import type { TriggerAction } from '../data/triggerZones'
import { CustomizationScreen } from './CustomizationScreen'
import { GameCanvas } from './GameCanvas'
import { Player } from './Player'
import './GameScreen.css'

export const GAME_DEBUG_HUD_ID = 'aliworld-game-debug-hud'

export function GameScreen() {
  const [showCustomization, setShowCustomization] = useState(false)

  const handleTrigger = useCallback((action: TriggerAction) => {
    if (action === 'OPEN_13GALLONS') {
      setShowCustomization(true)
    }
  }, [])

  return (
    <div className="game-screen">
      <div className="game-screen-play">
        <pre id={GAME_DEBUG_HUD_ID} className="game-screen-debug-hud">
          {`direction: down\nframe: 0\nsx: 0.0  sy: 0.0\nstate: idle`}
        </pre>
        <GameCanvas debugHudId={GAME_DEBUG_HUD_ID}>
          <Player onTrigger={handleTrigger} />
        </GameCanvas>
        {showCustomization && (
          <CustomizationScreen onClose={() => setShowCustomization(false)} />
        )}
      </div>
    </div>
  )
}
