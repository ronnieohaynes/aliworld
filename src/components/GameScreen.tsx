import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { TriggerAction } from '../data/triggerZones'
import { ADAM_MP3_ARTIFACT_ID } from '../data/adamMp3Handoff'
import { MARK_NPC, MANDO_NPC, WALKER_NPC, JACLYN_NPC, type NpcData } from '../data/npcs'
import { resolveNpcDialogueLines, type ResolvedDialogueLine } from '../data/npcDialogue'
import { CITY_CONFIGS, type CityConfig, type CityId } from '../data/cityConfig'
import { collectArtifact, hasArtifact } from '../store/artifactStore'
import {
  getQuest1Snapshot,
  GATING_NPC_IDS,
  hasTalkedToAllGatingNpcs,
  hasTalkedToGatingNpc,
  isGatingNpcId,
  isJaclynConverted,
  isMarkDefeated,
  isWalkerConverted,
  JACLYN_NPC_ID,
  MARK_NPC_ID,
  markGatingNpcTalked,
  setJaclynConverted,
  setMarkDefeated,
  setWalkerConverted,
  WALKER_NPC_ID,
  subscribeQuest1Store,
} from '../store/quest1Store'
import { resumeSoundtrackIfNeeded, startSoundtrack } from '../store/musicStore'
import { publicAsset } from '../utils/publicAsset'
import { GameShell } from './GameShell'
import { BattleScreen } from './BattleScreen'
import { ArtifactAcquisitionToasts } from './ArtifactAcquisitionToast'
import { FannyPackScreen } from './FannyPackScreen'
import { LoadoutScreen } from './LoadoutScreen'
import { BattleEntryWipe } from './BattleEntryWipe'
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
  speakerLines: ResolvedDialogueLine[]
  onComplete?: () => void
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
  const [showLoadout, setShowLoadout] = useState(false)
  const [showStartMenu, setShowStartMenu] = useState(false)
  const [menuReturnPending, setMenuReturnPending] = useState(false)
  const [menuEntryWipe, setMenuEntryWipe] = useState<'fanny-pack' | null>(null)
  const startMenuRef = useRef<StartMenuHandle>(null)
  const menuEntryTargetRef = useRef<'fanny-pack' | null>(null)
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '`' && e.code !== 'Backquote') return
      e.preventDefault()
      toggleShowDebug()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const canOpenStartMenu = useCallback(() => {
    return (
      !worldEntryActive &&
      !battleNpcId &&
      !battleEntryWipe &&
      !menuEntryWipe &&
      !dialogue
    )
  }, [worldEntryActive, battleNpcId, battleEntryWipe, menuEntryWipe, dialogue])

  const toggleStartMenu = useCallback(() => {
    if (showStartMenu) {
      setShowStartMenu(false)
      return
    }
    if (!canOpenStartMenu()) return
    setShowStartMenu(true)
  }, [canOpenStartMenu, showStartMenu])

  const handleFannyPack = useCallback(() => {
    if (worldEntryActive || showStartMenu) return
    setShowFannyPack((open) => !open)
  }, [showStartMenu])

  useEffect(() => {
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
      if (worldEntryActive || showStartMenu) return
      e.preventDefault()
      handleFannyPack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleFannyPack, showStartMenu])

  useEffect(() => {
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
      if (
        worldEntryActive ||
        showLoadout ||
        showFannyPack ||
        battleNpcId ||
        battleEntryWipe ||
        menuEntryWipe
      )
        return
      if (worldEntryActive || showStartMenu) return
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
    showFannyPack,
    showLoadout,
    showStartMenu,
    menuEntryWipe,
    worldEntryActive,
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

  const startNpcBattle = useCallback((npcId: string) => {
    setDialogue(null)
    setBattleEntryWipe(npcId)
  }, [])

  const beginNpcDialogue = useCallback(
    (
      npc: NpcData,
      options?: { blocked?: boolean; onComplete?: () => void },
    ) => {
      setDialogue({
        npc,
        lineIndex: 0,
        speakerLines: resolveNpcDialogueLines(npc, options),
        onComplete: options?.onComplete,
      })
    },
    [],
  )

  /** TEMP: debug grind fight — delete after testing. */
  const startDummyFight = useCallback(() => {
    setDialogue(null)
    setBattleNpcId('dummy')
  }, [])

  const showNotYetDialogue = useCallback((npc: NpcData, line: string) => {
    setDialogue({
      npc,
      lineIndex: 0,
      speakerLines: [{ speaker: npc.name, text: line }],
    })
  }, [])

  const showMarkGateDialogue = useCallback(() => {
    beginNpcDialogue(MARK_NPC, { blocked: true })
  }, [beginNpcDialogue])

  const canApproachWalker = useCallback(() => {
    return hasTalkedToAllGatingNpcs() && hasArtifact(ADAM_MP3_ARTIFACT_ID)
  }, [])

  const canApproachMark = useCallback(() => {
    return (
      hasTalkedToAllGatingNpcs() &&
      isWalkerConverted() &&
      isJaclynConverted()
    )
  }, [])

  const showMarkBlockedDialogue = useCallback(() => {
    if (!hasTalkedToAllGatingNpcs()) {
      showMarkGateDialogue()
      return
    }
    showNotYetDialogue(MARK_NPC, 'you skipped somebody. go finish it.')
  }, [showMarkGateDialogue, showNotYetDialogue])

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
        beginNpcDialogue(MARK_NPC, { onComplete: startMarkBattle })
      } else if (action === 'OPEN_ONE_LOVE_CAFE') {
        setCafeFade('in')
      }
    },
    [beginNpcDialogue, showMarkGateDialogue, startMarkBattle],
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

  const grantNoticeArtifact = useCallback(() => {
    if (!hasArtifact(ADAM_MP3_ARTIFACT_ID)) {
      collectArtifact(ADAM_MP3_ARTIFACT_ID)
      startSoundtrack()
    }
  }, [])

  const advanceDialogue = useCallback(() => {
    setDialogue((prev) => {
      if (!prev) return null
      const next = prev.lineIndex + 1
      if (next >= prev.speakerLines.length) {
        const onComplete = prev.onComplete
        if (isGatingNpcId(prev.npc.id)) {
          const countBefore = GATING_NPC_IDS.filter((id) => hasTalkedToGatingNpc(id)).length
          markGatingNpcTalked(prev.npc.id)
          if (countBefore === GATING_NPC_IDS.length - 1) {
            grantNoticeArtifact()
          }
        }
        if (onComplete) onComplete()
        return null
      }
      return { ...prev, lineIndex: next }
    })
  }, [grantNoticeArtifact])

  const openNearbyNpcDialogue = useCallback(() => {
    const nearbyId = playerRef.current?.getNearbyNpcId()
    if (!nearbyId) return

    if (nearbyId === WALKER_NPC_ID) {
      if (isWalkerConverted()) {
        beginNpcDialogue(WALKER_NPC)
        return
      }
      if (!canApproachWalker()) {
        showNotYetDialogue(WALKER_NPC, 'talk to the block first. then come find me.')
        return
      }
      beginNpcDialogue(WALKER_NPC, { onComplete: () => startNpcBattle(WALKER_NPC_ID) })
      return
    }

    if (nearbyId === JACLYN_NPC_ID) {
      if (isJaclynConverted()) {
        beginNpcDialogue(JACLYN_NPC)
        return
      }
      if (!isWalkerConverted()) {
        showNotYetDialogue(JACLYN_NPC, 'walker first. i want to see if it sticks.')
        return
      }
      beginNpcDialogue(JACLYN_NPC, { onComplete: () => startNpcBattle(JACLYN_NPC_ID) })
      return
    }

    if (nearbyId === MARK_NPC_ID) {
      if (isMarkDefeated()) {
        beginNpcDialogue(MARK_NPC)
        return
      }
      if (!hasTalkedToAllGatingNpcs()) {
        showMarkGateDialogue()
        return
      }
      beginNpcDialogue(MARK_NPC, { onComplete: startMarkBattle })
      return
    }

    const npc = findNpcInCity(nearbyId, currentCity)
    if (npc) beginNpcDialogue(npc)
  }, [
    beginNpcDialogue,
    canApproachWalker,
    currentCity,
    showMarkGateDialogue,
    showNotYetDialogue,
    startMarkBattle,
    startNpcBattle,
  ])

  const handleInteract = useCallback(() => {
    if (worldEntryActive) return
    if (showStartMenu) {
      startMenuRef.current?.activate()
      return
    }
    if (dialogue) {
      advanceDialogue()
      return
    }
    if (battleEntryWipe || menuEntryWipe || battleNpcId || showFannyPack || showLoadout)
      return
    openNearbyNpcDialogue()
  }, [
    dialogue,
    advanceDialogue,
    battleEntryWipe,
    battleNpcId,
    showFannyPack,
    showLoadout,
    showStartMenu,
    menuEntryWipe,
    worldEntryActive,
    openNearbyNpcDialogue,
  ])

  const handlePlayAreaClick = useCallback(() => {
    if (worldEntryActive || showStartMenu) return
    if (dialogue) {
      advanceDialogue()
      return
    }
    openNearbyNpcDialogue()
  }, [dialogue, advanceDialogue, openNearbyNpcDialogue, showStartMenu])

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
      if (result === 'win') {
        if (activeId === WALKER_NPC_ID) setWalkerConverted()
        if (activeId === JACLYN_NPC_ID) setJaclynConverted()
        if (activeId === MARK_NPC_ID) {
          setMarkDefeated()
          collectArtifact('subway-pass')
        }
      }
      return null
    })
  }, [])

  const returnToStartMenuIfPending = useCallback(() => {
    if (menuReturnPending) {
      setMenuReturnPending(false)
      setShowStartMenu(true)
    }
  }, [menuReturnPending])

  const handleFannyPackClose = useCallback(() => {
    setShowFannyPack(false)
    returnToStartMenuIfPending()
  }, [returnToStartMenuIfPending])

  const handleOpenLoadout = useCallback(() => {
    if (worldEntryActive || showStartMenu) return
    setShowLoadout(true)
  }, [showStartMenu, worldEntryActive])

  const beginMenuEntryTransition = useCallback((target: 'fanny-pack') => {
    menuEntryTargetRef.current = target
    setShowStartMenu(false)
    setMenuReturnPending(true)
    setMenuEntryWipe(target)
  }, [])

  const handleMenuEntryMidpoint = useCallback(() => {
    const target = menuEntryTargetRef.current
    if (target === 'fanny-pack') setShowFannyPack(true)
  }, [])

  const handleMenuEntryComplete = useCallback(() => {
    menuEntryTargetRef.current = null
    setMenuEntryWipe(null)
  }, [])

  const handleStartMenuAction = useCallback(
    (action: StartMenuAction) => {
      switch (action) {
        case 'resume':
          setShowStartMenu(false)
          break
        case 'fanny-pack':
          beginMenuEntryTransition('fanny-pack')
          break
        case 'loadout':
          setShowLoadout(true)
          break
        case 'choose-midnight':
          setShowStartMenu(false)
          setMenuReturnPending(false)
          clearMidnightVariant()
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
    [beginMenuEntryTransition],
  )

  const handleConfirmNewGame = useCallback(() => {
    setShowStartMenu(false)
    setMenuReturnPending(false)
    performNewGameReset()
  }, [])

  const showQuestHelper =
    !worldEntryActive &&
    !battleNpcId &&
    !battleEntryWipe &&
    !menuEntryWipe &&
    !showStartMenu &&
    !showLoadout &&
    !showFannyPack &&
    !showDarkline &&
    !showInterior

  const handleInteriorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (dialogue) {
      advanceDialogue()
      return
    }
    beginNpcDialogue(MANDO_NPC)
  }, [dialogue, advanceDialogue, beginNpcDialogue])

  return (
    <div className="game-screen">
      <GameShell
        onSelect={handleToggleDebug}
        onFannyPack={handleFannyPack}
        onScript={handleOpenLoadout}
        onInteract={handleInteract}
        onStart={toggleStartMenu}
      >
        <div
          className={`game-screen-play${
            battleEntryWipe || menuEntryWipe ? ' game-screen-play--battle-wipe' : ''
          }${worldEntryActive ? ' game-screen-play--world-entry' : ''}`}
          onClick={handlePlayAreaClick}
        >
          {showDebug && (
            <>
              <pre id={GAME_DEBUG_HUD_ID} className="game-screen-debug-hud">
                {`direction: down\nframe: 0\nsx: 0.0  sy: 0.0\nstate: idle`}
              </pre>
              <button
                type="button"
                className="debug-fight-dummy"
                onClick={(e) => {
                  e.stopPropagation()
                  startDummyFight()
                }}
              >
                fight dummy
              </button>
            </>
          )}
          {showQuestHelper && <QuestHelper />}
          <GameCanvas debugHudId={GAME_DEBUG_HUD_ID}>
            <Player
              ref={playerRef}
              cityConfig={cityConfig}
              onTrigger={handleTrigger}
              onTriggerExit={handleExitTrigger}
              dialogueActive={
                !!dialogue ||
                worldEntryActive ||
                !!battleEntryWipe ||
                !!menuEntryWipe ||
                showFannyPack ||
                showLoadout ||
                showStartMenu
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
              name={dialogue.speakerLines[dialogue.lineIndex]?.speaker ?? dialogue.npc.name}
              line={dialogue.speakerLines[dialogue.lineIndex]?.text ?? ''}
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
          {menuEntryWipe && (
            <BattleEntryWipe
              onMidpoint={handleMenuEntryMidpoint}
              onComplete={handleMenuEntryComplete}
            />
          )}
          {worldEntryActive && (
            <WorldEntryWipe ready={worldEntryReady} onComplete={handleWorldEntryComplete} />
          )}
          <ArtifactAcquisitionToasts />
          {showFannyPack && <FannyPackScreen onClose={handleFannyPackClose} />}
          {showStartMenu && (
            <StartMenuScreen
              ref={startMenuRef}
              onAction={handleStartMenuAction}
              onConfirmNewGame={handleConfirmNewGame}
            />
          )}
        </div>
      </GameShell>
      {showLoadout && <LoadoutScreen onClose={() => setShowLoadout(false)} />}
    </div>
  )
}
