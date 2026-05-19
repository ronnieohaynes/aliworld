import { GameCanvas } from './GameCanvas'
import { Player } from './Player'
import './GameScreen.css'

export const GAME_DEBUG_HUD_ID = 'aliworld-game-debug-hud'

type Props = {
  onBack?: () => void
}

export function GameScreen({ onBack }: Props) {
  return (
    <div className="game-screen">
      {onBack ? (
        <header className="game-screen-header">
          <button type="button" className="game-screen-back" onClick={onBack}>
            ← Back
          </button>
          <span className="game-screen-title">ALIWORLD</span>
        </header>
      ) : null}
      <div className="game-screen-play">
        <pre id={GAME_DEBUG_HUD_ID} className="game-screen-debug-hud">
          {`direction: down\nframe: 0\nsx: 0.0  sy: 0.0\nstate: idle`}
        </pre>
        <GameCanvas debugHudId={GAME_DEBUG_HUD_ID}>
          <Player />
        </GameCanvas>
      </div>
    </div>
  )
}
