import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { TriggerAction } from '../data/triggerZones'
import { ADAM_MP3_ARTIFACT_ID, ADAM_NPC, isAdamNpcId } from '../data/adamMp3Handoff'
import { MARK_NPC, MANDO_NPC, type NpcData } from '../data/npcs'
import { CITY_CONFIGS, type CityConfig, type CityId } from '../data/cityConfig'
import { collectArtifact, hasArtifact } from '../store/artifactStore'
import {
  getQuest1Snapshot,
  hasTalkedToAllGatingNpcs,
  isGatingNpcId,
  isMarkDefeated,
  MARK_NPC_ID,
  markGatingNpcTalked,
  setMarkDefeated,
  subscribeQuest1Store,
} from '../store/quest1Store'
import { resumeSoundtrackIfNeeded, startSoundtrack } from '../store/musicStore'
import { publicAsset } from '../utils/publicAsset'
import { GameShell } from './GameShell'
import { BattleScreen } from './BattleScreen'
import { StatsScreen } from './StatsScreen'
import { ArtifactAcquisitionToasts } from './ArtifactAcquisitionToast'
import { FannyPackScreen } from './FannyPackScreen'
import { BattleEntryWipe } from './BattleEntryWipe'
import { MenuEntryCover, type MenuTransitionTarget } from './MenuEntryCover'
import { WorldEntryWipe } from './WorldEntryWipe'
import { PlayerLevelOverhead } from './PlayerLevelOverhead'
import { DarklineScreen } from './DarklineScreen'
import { DialogueBox } from './DialogueBox'
import { GameCanvas } from './GameCanvas'
import { Player, type PlayerHandle } from './Player'
import {
  clearMidnightVariant,
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from '../store/characterStore'
import { performNewGameReset } from '../store/gameProgress'
import { preloadWorldEntry } from '../game/preloadWorldEntry'
import { getShowDebug, subscribePlayerStore, toggleShowDebug } from '../store/playerStore'
import { signOut } from '../store/authStore'
import { QuestHelper } from './QuestHelper'
import {
  StartMenuScreen,
  type StartMenuAction,
  type StartMenuHandle,
} from './StartMenuScreen'
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
  const [showFannyPack, setShowFannyPack] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showStartMenu, setShowStartMenu] = useState(false)
  const [menuReturnPending, setMenuReturnPending] = useState(false)
  const [menuTransition, setMenuTransition] = useState<MenuTransitionTarget | null>(null)
  const startMenuRef = useRef<StartMenuHandle>(null)
  const menuTransitionRef = useRef<MenuTransitionTarget | null>(null)
  const [worldEntryActive, setWorldEntryActive] = useState(true)
  const [worldEntryReady, setWorldEntryReady] = useState(false)

  const selectedMidnightVariant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )

  const baseCityConfig = CITY_CONFIGS[currentCity]
  const quest1Revision = useSyncExternalStore(
    subscribeQuest1Store,
    getQuest1Snapshot,
    getQuest1Snapshot,
  )
  const showDebug = useSyncExternalStore(subscribePlayerStore, getShowDebug, getShowDebug)

  useEffect(() => {
    let cancelled = false
    setWorldEntryReady(false)
    const entryCity = CITY_CONFIGS['daly-city']
    void preloadWorldEntry(entryCity, selectedMidnightVariant).then(() => {
      if (!cancelled) setWorldEntryReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [selectedMidnightVariant])

  const handleWorldEntryComplete = useCallback(() => {
    setWorldEntryActive(false)
  }, [])

  const cityConfig = useMemo((): CityConfig => {
    void quest1Revision
    if (currentCity !== 'daly-city') return baseCityConfig
    const npcs = baseCityConfig.npcs.filter(
      (npc) => npc.id !== MARK_NPC_ID || !isMarkDefeated(),
    )
    return { ...baseCityConfig, npcs }
  }, [baseCityConfig, currentCity, quest1Revision])

  const mapReady = !worldEntryActive

  useEffect(() => {
    if (!mapReady) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '`' && e.code !== 'Backquote') return
      e.preventDefault()
      toggleShowDebug()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mapReady])

  useEffect(() => {
    if (!mapReady) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'm' && e.key !== 'M') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      clearMidnightVariant()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mapReady])

  const canOpenStartMenu = useCallback(() => {
    return (
      !worldEntryActive &&
      !battleNpcId &&
      !battleEntryWipe &&
      !menuTransition &&
      !dialogue
    )
  }, [worldEntryActive, battleNpcId, battleEntryWipe, menuTransition, dialogue])

  const beginMenuTransition = useCallback((target: MenuTransitionTarget) => {
    menuTransitionRef.current = target
    setMenuTransition(target)
  }, [])

  const closeStartMenu = useCallback(() => {
    setShowStartMenu(false)
    setMenuReturnPending(false)
  }, [])

  /** Leave pause flow and return to gameplay (same as choosing resume). */
  const resumeFromPauseMenu = useCallback(() => {
    setShowFannyPack(false)
    setShowStats(false)
    closeStartMenu()
  }, [closeStartMenu])

  const toggleStartMenu = useCallback(() => {
    if (menuTransition) return
    if (showStartMenu) {
      closeStartMenu()
      return
    }
    if (menuReturnPending && (showFannyPack || showStats)) {
      resumeFromPauseMenu()
      return
    }
    if (!canOpenStartMenu()) return
    setShowStartMenu(true)
  }, [
    canOpenStartMenu,
    closeStartMenu,
    menuReturnPending,
    menuTransition,
    resumeFromPauseMenu,
    showFannyPack,
    showStartMenu,
    showStats,
  ])

  const handleFannyPack = useCallback(() => {
    if (menuTransition || worldEntryActive || showStartMenu) return
    if (menuReturnPending) {
      resumeFromPauseMenu()
      return
    }
    setShowFannyPack((open) => !open)
  }, [menuReturnPending, menuTransition, resumeFromPauseMenu, showStartMenu])

  useEffect(() => {
    if (!mapReady) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'f' && e.key !== 'F') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }
      if (showStartMenu) return
      e.preventDefault()
      handleFannyPack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleFannyPack, mapReady, showStartMenu])

  useEffect(() => {
    if (!mapReady) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }
      if (showStats || showFannyPack) {
        if (menuReturnPending) {
          e.preventDefault()
          resumeFromPauseMenu()
        }
        return
      }
      if (battleNpcId || battleEntryWipe || menuTransition) return
      if (showStartMenu) return
      if (!canOpenStartMenu()) return
      e.preventDefault()
      setShowStartMenu(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    battleEntryWipe,
    battleNpcId,
    canOpenStartMenu,
    mapReady,
    menuReturnPending,
    resumeFromPauseMenu,
    showFannyPack,
    showStartMenu,
    showStats,
    menuTransition,
  ])

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

  const startMarkBattle = useCallback(() => {
    setDialogue(null)
    setBattleEntryWipe('mark')
  }, [])

  const showMarkGateDialogue = useCallback(() => {
    setDialogue({ npc: MARK_NPC, lineIndex: 0 })
  }, [])

  const handleTrigger = useCallback(
    (action: TriggerAction) => {
      if (action === 'OPEN_13GALLONS') {
        setShowInterior(true)
      } else if (action === 'OPEN_DARKLINE') {
        if (isMarkDefeated()) {
          setShowDarkline(true)
          return
        }
        if (!hasTalkedToAllGatingNpcs()) {
          showMarkGateDialogue()
          return
        }
        startMarkBattle()
      } else if (action === 'OPEN_ONE_LOVE_CAFE') {
        setCafeFade('in')
      }
    },
    [showMarkGateDialogue, startMarkBattle],
  )

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

  const completeAdamMp3Handoff = useCallback(() => {
    if (!hasArtifact(ADAM_MP3_ARTIFACT_ID)) {
      collectArtifact(ADAM_MP3_ARTIFACT_ID)
      startSoundtrack()
    }
  }, [])

  const advanceDialogue = useCallback(() => {
    setDialogue((prev) => {
      if (!prev) return null
      const next = prev.lineIndex + 1
      if (next >= prev.npc.lines.length) {
        if (isAdamNpcId(prev.npc.id)) {
          completeAdamMp3Handoff()
        } else if (isGatingNpcId(prev.npc.id)) {
          markGatingNpcTalked(prev.npc.id)
        }
        return null
      }
      return { ...prev, lineIndex: next }
    })
  }, [completeAdamMp3Handoff])

  const openNearbyNpcDialogue = useCallback(() => {
    const nearbyId = playerRef.current?.getNearbyNpcId()
    if (!nearbyId) return

    if (isAdamNpcId(nearbyId)) {
      if (hasArtifact(ADAM_MP3_ARTIFACT_ID)) return
      setDialogue({ npc: ADAM_NPC, lineIndex: 0 })
      return
    }

    if (nearbyId === MARK_NPC_ID) {
      if (isMarkDefeated()) return
      if (!hasTalkedToAllGatingNpcs()) {
        showMarkGateDialogue()
        return
      }
      startMarkBattle()
      return
    }

    const npc = findNpcInCity(nearbyId, currentCity)
    if (npc) setDialogue({ npc, lineIndex: 0 })
  }, [currentCity, showMarkGateDialogue, startMarkBattle])

  const handleInteract = useCallback(() => {
    if (worldEntryActive || menuTransition) return
    if (showStartMenu) {
      startMenuRef.current?.activate()
      return
    }
    if (dialogue) {
      advanceDialogue()
      return
    }
    if (battleEntryWipe || menuTransition || battleNpcId || showStats || showFannyPack)
      return
    openNearbyNpcDialogue()
  }, [
    dialogue,
    advanceDialogue,
    battleEntryWipe,
    battleNpcId,
    showStats,
    showFannyPack,
    showStartMenu,
    menuTransition,
    worldEntryActive,
    openNearbyNpcDialogue,
  ])

  const handlePlayAreaClick = useCallback(() => {
    if (worldEntryActive || menuTransition || showStartMenu) return
    if (dialogue) {
      advanceDialogue()
      return
    }
    openNearbyNpcDialogue()
  }, [dialogue, advanceDialogue, openNearbyNpcDialogue, menuTransition, showStartMenu])

  useEffect(() => {
    resumeSoundtrackIfNeeded(hasArtifact(ADAM_MP3_ARTIFACT_ID))
    if (hasArtifact('subway-pass') && !isMarkDefeated()) {
      setMarkDefeated()
    }
  }, [])

  const handleBattleEntryMidpoint = useCallback(() => {
    setBattleEntryWipe((pendingNpcId) => {
      if (pendingNpcId) setBattleNpcId(pendingNpcId)
      return pendingNpcId
    })
  }, [])

  const handleBattleEntryComplete = useCallback(() => {
    setBattleEntryWipe(null)
  }, [])

  const handleBattleEnd = useCallback((result: 'win' | 'lose') => {
    setBattleNpcId((activeId) => {
      if (activeId === MARK_NPC_ID && result === 'win') {
        setMarkDefeated()
        collectArtifact('subway-pass')
      }
      return null
    })
  }, [])

  const handleFannyPackClose = useCallback(() => {
    if (menuReturnPending) {
      resumeFromPauseMenu()
      return
    }
    setShowFannyPack(false)
  }, [menuReturnPending, resumeFromPauseMenu])

  const handleOpenStats = useCallback(() => {
    if (worldEntryActive || showStartMenu || menuTransition) return
    setShowStats(true)
  }, [menuTransition, showStartMenu])

  const handleStatsClose = useCallback(() => {
    if (menuReturnPending) {
      resumeFromPauseMenu()
      return
    }
    setShowStats(false)
  }, [menuReturnPending, resumeFromPauseMenu])

  const beginMenuEntryTransition = useCallback(
    (screen: 'fanny-pack' | 'stats') => {
      setShowStartMenu(false)
      setMenuReturnPending(true)
      beginMenuTransition({ kind: 'to-screen', screen })
    },
    [beginMenuTransition],
  )

  const handleMenuTransitionMidpoint = useCallback(() => {
    const target = menuTransitionRef.current
    if (!target) return
    switch (target.kind) {
      case 'to-screen':
        if (target.screen === 'fanny-pack') setShowFannyPack(true)
        else setShowStats(true)
        break
    }
  }, [])

  const handleMenuTransitionComplete = useCallback(() => {
    menuTransitionRef.current = null
    setMenuTransition(null)
  }, [])

  const handleStartMenuAction = useCallback(
    (action: StartMenuAction) => {
      switch (action) {
        case 'resume':
          resumeFromPauseMenu()
          break
        case 'fanny-pack':
          beginMenuEntryTransition('fanny-pack')
          break
        case 'stats':
          beginMenuEntryTransition('stats')
          break
        case 'new-game':
          break
        case 'sign-out':
          setShowStartMenu(false)
          setMenuReturnPending(false)
          void signOut()
          break
      }
    },
    [beginMenuEntryTransition, resumeFromPauseMenu],
  )

  const handleConfirmNewGame = useCallback(() => {
    setShowStartMenu(false)
    setMenuReturnPending(false)
    performNewGameReset()
  }, [])

  const isGamePaused =
    showStartMenu || menuReturnPending || menuTransition !== null

  const showQuestHelper =
    !worldEntryActive &&
    !battleNpcId &&
    !battleEntryWipe &&
    !isGamePaused &&
    !showStats &&
    !showFannyPack &&
    !showDarkline &&
    !showInterior

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
      <GameShell
        controlsEnabled={mapReady}
        onSelect={handleToggleDebug}
        onFannyPack={handleFannyPack}
        onScript={handleOpenStats}
        onInteract={handleInteract}
        onStart={toggleStartMenu}
      >
        <div
          className={`game-screen-play${
            battleEntryWipe ? ' game-screen-play--battle-wipe' : ''
          }${isGamePaused ? ' game-screen-play--paused' : ''}${
            menuTransition ? ' game-screen-play--menu-transition' : ''
          }${worldEntryActive ? ' game-screen-play--world-entry' : ''}`}
          onClick={handlePlayAreaClick}
        >
          {showDebug && (
            <pre id={GAME_DEBUG_HUD_ID} className="game-screen-debug-hud">
              {`direction: down\nframe: 0\nsx: 0.0  sy: 0.0\nstate: idle`}
            </pre>
          )}
          {showQuestHelper && <QuestHelper />}
          <GameCanvas debugHudId={GAME_DEBUG_HUD_ID} paused={isGamePaused}>
            <Player
              ref={playerRef}
              cityConfig={cityConfig}
              inputEnabled={mapReady}
              onTrigger={handleTrigger}
              onTriggerExit={handleExitTrigger}
              dialogueActive={
                !!dialogue ||
                worldEntryActive ||
                !!battleEntryWipe ||
                isGamePaused ||
                showStats ||
                showFannyPack
              }
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
          {showStats && <StatsScreen onClose={handleStatsClose} />}
          {showFannyPack && <FannyPackScreen onClose={handleFannyPackClose} />}
          {menuTransition && (
            <MenuEntryCover
              onMidpoint={handleMenuTransitionMidpoint}
              onComplete={handleMenuTransitionComplete}
            />
          )}
          {worldEntryActive && (
            <WorldEntryWipe ready={worldEntryReady} onComplete={handleWorldEntryComplete} />
          )}
          <ArtifactAcquisitionToasts />
          {showStartMenu && <div className="game-screen-pause-scrim" aria-hidden />}
          {showStartMenu && (
            <StartMenuScreen
              ref={startMenuRef}
              onAction={handleStartMenuAction}
              onConfirmNewGame={handleConfirmNewGame}
            />
          )}
        </div>
      </GameShell>
    </div>
  )
}
