import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { TriggerAction } from '../data/triggerZones'
import { MANDO_NPC, type NpcData } from '../data/npcs'
import { CITY_CONFIGS, type CityId } from '../data/cityConfig'
import { publicAsset } from '../utils/publicAsset'
import { GameShell } from './GameShell'
import { BattleScreen } from './BattleScreen'
import { BattleEntryWipe } from './BattleEntryWipe'
import { PlayerLevelOverhead } from './PlayerLevelOverhead'
import { DarklineScreen } from './DarklineScreen'
import { DialogueBox } from './DialogueBox'
import { GameCanvas } from './GameCanvas'
import { Player, type PlayerHandle } from './Player'
import { getShowDebug, subscribePlayerStore, toggleShowDebug } from '../store/playerStore'
import './GameScreen.css'

export const GAME_DEBUG_HUD_ID = 'aliworld-game-debug-hud'

const INTERIOR_BG_SRC = publicAsset('Assets/Backgrounds/13gallons-interior.png')

type DialogueState = {
  npc: NpcData
  lineIndex: number
}

function findNpcInCity(id: string, cityId: CityId): NpcData | undefined {
  return CITY_CONFIGS[cityId].npcs.find((n) => n.id === id)
}

export function GameScreen() {
  const playerRef = useRef<PlayerHandle>(null)
  const [currentCity, setCurrentCity] = useState<CityId>('daly-city')
  const [showInterior, setShowInterior] = useState(false)
  const [showDarkline, setShowDarkline] = useState(false)
  const [cafeFade, setCafeFade] = useState<'none' | 'in' | 'out'>('none')
  const [dialogue, setDialogue] = useState<DialogueState | null>(null)
  const [battleNpcId, setBattleNpcId] = useState<string | null>(null)
  const [battleEntryWipe, setBattleEntryWipe] = useState<string | null>(null)

  const cityConfig = CITY_CONFIGS[currentCity]
  const showDebug = useSyncExternalStore(subscribePlayerStore, getShowDebug, getShowDebug)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '`' && e.code !== 'Backquote') return
      e.preventDefault()
      toggleShowDebug()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleToggleDebug = useCallback(() => {
    toggleShowDebug()
  }, [])

  useEffect(() => {
    if (cafeFade === 'none') return
    if (cafeFade === 'in') {
      const t = window.setTimeout(() => setCafeFade('out'), 600)
      return () => window.clearTimeout(t)
    }
    if (cafeFade === 'out') {
      const t = window.setTimeout(() => setCafeFade('none'), 400)
      return () => window.clearTimeout(t)
    }
  }, [cafeFade])

  const handleTrigger = useCallback((action: TriggerAction) => {
    if (action === 'OPEN_13GALLONS') {
      setShowInterior(true)
    } else if (action === 'OPEN_DARKLINE') {
      setShowDarkline(true)
    } else if (action === 'OPEN_ONE_LOVE_CAFE') {
      setCafeFade('in')
    } else if (action === 'START_BATTLE_MARK') {
      setDialogue(null)
      setBattleEntryWipe('mark')
    }
  }, [])

  const handleExitTrigger = useCallback((action: TriggerAction) => {
    if (action === 'OPEN_13GALLONS') {
      setShowInterior(false)
    }
  }, [])

  const handleDarklineClose = useCallback(() => {
    setShowDarkline(false)
    const config = CITY_CONFIGS[currentCity]
    playerRef.current?.setPosition(config.darklineSpawnX, config.darklineSpawnY)
  }, [currentCity])

  const handleDarklineTravel = useCallback((destination: CityId) => {
    setShowDarkline(false)
    setCurrentCity(destination)
    const destConfig = CITY_CONFIGS[destination]
    playerRef.current?.setPosition(destConfig.spawnX, destConfig.spawnY)
  }, [])

  const advanceDialogue = useCallback(() => {
    setDialogue((prev) => {
      if (!prev) return null
      const next = prev.lineIndex + 1
      if (next >= prev.npc.lines.length) return null
      return { ...prev, lineIndex: next }
    })
  }, [])

  const handlePlayAreaClick = useCallback(() => {
    if (dialogue) {
      advanceDialogue()
      return
    }

    const nearbyId = playerRef.current?.getNearbyNpcId()
    if (nearbyId) {
      const npc = findNpcInCity(nearbyId, currentCity)
      if (npc) setDialogue({ npc, lineIndex: 0 })
    }
  }, [dialogue, advanceDialogue, currentCity])

  const handleBattleEntryMidpoint = useCallback(() => {
    setBattleEntryWipe((pendingNpcId) => {
      if (pendingNpcId) setBattleNpcId(pendingNpcId)
      return pendingNpcId
    })
  }, [])

  const handleBattleEntryComplete = useCallback(() => {
    setBattleEntryWipe(null)
  }, [])

  const handleBattleEnd = useCallback((_result: 'win' | 'lose') => {
    setBattleNpcId(null)
  }, [])

  const handleInteriorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (dialogue) {
      advanceDialogue()
      return
    }
    setDialogue({ npc: MANDO_NPC, lineIndex: 0 })
  }, [dialogue, advanceDialogue])

  return (
    <div className="game-screen">
      <GameShell onSelect={handleToggleDebug}>
        <div
          className={`game-screen-play${battleEntryWipe ? ' game-screen-play--battle-wipe' : ''}`}
          onClick={handlePlayAreaClick}
        >
          {showDebug && (
            <pre id={GAME_DEBUG_HUD_ID} className="game-screen-debug-hud">
              {`direction: down\nframe: 0\nsx: 0.0  sy: 0.0\nstate: idle`}
            </pre>
          )}
          <GameCanvas debugHudId={GAME_DEBUG_HUD_ID}>
            <Player
              ref={playerRef}
              cityConfig={cityConfig}
              onTrigger={handleTrigger}
              onTriggerExit={handleExitTrigger}
              dialogueActive={!!dialogue || !!battleEntryWipe}
              dialogueNpcId={dialogue?.npc.id ?? null}
            />
            {!battleNpcId && <PlayerLevelOverhead />}
          </GameCanvas>
          {showInterior && (
            <div className="game-screen-interior" onClick={handleInteriorClick}>
              <img
                className="game-screen-interior__bg"
                src={INTERIOR_BG_SRC}
                alt="13 Gallons interior"
                draggable={false}
              />
              {!dialogue && (
                <div className="game-screen-interior__mando" aria-label="Mando" />
              )}
            </div>
          )}
          {showDarkline && (
            <DarklineScreen
              currentCity={currentCity}
              onClose={handleDarklineClose}
              onTravel={handleDarklineTravel}
            />
          )}
          {dialogue && !battleNpcId && (
            <DialogueBox
              name={dialogue.npc.name}
              line={dialogue.npc.lines[dialogue.lineIndex]!}
              onAdvance={advanceDialogue}
            />
          )}
          {cafeFade !== 'none' && (
            <div
              className="game-screen-cafe-fade"
              style={{
                animation: cafeFade === 'in'
                  ? 'cafeFadeIn 400ms ease-in forwards'
                  : 'cafeFadeOut 400ms ease-out forwards',
              }}
            />
          )}
          {battleNpcId && (
            <BattleScreen npcId={battleNpcId} onBattleEnd={handleBattleEnd} />
          )}
          {battleEntryWipe && (
            <BattleEntryWipe
              onMidpoint={handleBattleEntryMidpoint}
              onComplete={handleBattleEntryComplete}
            />
          )}
        </div>
      </GameShell>
    </div>
  )
}
