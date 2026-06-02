import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { TriggerAction } from '../data/triggerZones'
import { ADAM_MP3_ARTIFACT_ID } from '../data/adamMp3Handoff'
import { MARK_NPC, MANDO_NPC, WALKER_NPC, JACLYN_NPC, type NpcData } from '../data/npcs'
import { resolveNpcDialogueLines, type ResolvedDialogueLine } from '../data/npcDialogue'
import { CITY_CONFIGS, DARKLINE_DESTINATIONS, INACTIVE_DESTINATIONS, POST_E1_DARKLINE_DESTINATION, type CityConfig, type CityId } from '../data/cityConfig'
import { isMoveUnlocked } from '../data/moves'
import { collectArtifact, hasArtifact } from '../store/artifactStore'
import {
  getQuest1Snapshot,
  GATING_NPC_IDS,
  hasTalkedToAllGatingNpcs,
  hasTalkedToGatingNpc,
  isGatingNpcId,
  isCafeSceneSeen,
  isJaclynConverted,
  isMarkDefeated,
  isWalkerConverted,
  JACLYN_NPC_ID,
  MARK_NPC_ID,
  markGatingNpcTalked,
  setCafeSceneSeen,
  setJaclynConverted,
  setMarkDefeated,
  setWalkerConverted,
  WALKER_NPC_ID,
  subscribeQuest1Store,
} from '../store/quest1Store'
import { markCityVisited } from '../store/worldMemory'
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
import {
  getLastSavedLocation,
  getPlayerSkills,
  getShowDebug,
  grantPlayerSkillXp,
  setLastLocation,
  subscribePlayerStore,
  toggleShowDebug,
  totalXpForLevel,
  whenAccountHydrated,
} from '../store/playerStore'
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

const NARRATOR_NPC: NpcData = {
  id: 'narrator',
  name: '',
  x: 0,
  y: 0,
  lines: [],
  color: '#000',
}

const CAFE_SCENE_LINES = [
  'danny sits at the cafe. he does not look up.',
  "he is the most ordinary thing you've seen since spawning.",
  "you're here to destroy him. he doesn't notice you exist.",
] as const

const FURY_SWEEP_UNLOCK_LEVEL = 17

type CafeFadePhase = 'none' | 'in' | 'scene' | 'out'

/** How often to push live coords into the account save buffer while exploring. */
const LOCATION_REPORT_INTERVAL_MS = 3_000

const WORLD_POSITION_MARGIN = 40

function clampWorldPosition(
  cityId: CityId,
  x: number,
  y: number,
): { x: number; y: number } {
  const cfg = CITY_CONFIGS[cityId]
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { x: cfg.spawnX, y: cfg.spawnY }
  }
  return {
    x: Math.max(WORLD_POSITION_MARGIN, Math.min(cfg.worldWidth - WORLD_POSITION_MARGIN, x)),
    y: Math.max(WORLD_POSITION_MARGIN, Math.min(cfg.worldHeight - WORLD_POSITION_MARGIN, y)),
  }
}

function resolveSavedWorldPosition(
  cityId: CityId,
  x: number | undefined,
  y: number | undefined,
): { x: number; y: number } {
  const cfg = CITY_CONFIGS[cityId]
  if (x === undefined || y === undefined) {
    return { x: cfg.spawnX, y: cfg.spawnY }
  }
  return clampWorldPosition(cityId, x, y)
}

function findNpcInCity(id: string, cityId: CityId): NpcData | undefined {
  return CITY_CONFIGS[cityId].npcs.find((n) => n.id === id)
}

type DialogueState = {
  npc: NpcData
  lineIndex: number
  speakerLines: ResolvedDialogueLine[]
  onComplete?: () => void
}

export function GameScreen() {
  const playerRef = useRef<PlayerHandle>(null)
  const [currentCity, setCurrentCity] = useState<CityId>('daly-city')
  const [showInterior, setShowInterior] = useState(false)
  const [showDarkline, setShowDarkline] = useState(false)
  const [cafeFade, setCafeFade] = useState<CafeFadePhase>('none')
  const [cafeSceneLine, setCafeSceneLine] = useState(0)
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
  const [nearbyNpcId, setNearbyNpcId] = useState<string | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const pendingRestoreRef = useRef<{ city: CityId; x: number; y: number } | null>(null)

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

  const darklineDestinations = useMemo((): CityId[] => {
    void quest1Revision
    if (!isCafeSceneSeen()) return [...DARKLINE_DESTINATIONS]
    return [...DARKLINE_DESTINATIONS, POST_E1_DARKLINE_DESTINATION]
  }, [quest1Revision])

  const reportCurrentLocation = useCallback(
    (city: CityId = currentCity) => {
      const pos = playerRef.current?.getPosition()
      if (!pos) return
      setLastLocation(city, pos.x, pos.y)
    },
    [currentCity],
  )

  useEffect(() => {
    let cancelled = false
    void whenAccountHydrated().then(() => {
      if (cancelled) return
      const saved = getLastSavedLocation()
      if (!saved) {
        setLocationReady(true)
        return
      }
      const pos = resolveSavedWorldPosition(saved.city, saved.x, saved.y)
      pendingRestoreRef.current = { city: saved.city, x: pos.x, y: pos.y }
      setCurrentCity(saved.city)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (locationReady) return
    const pending = pendingRestoreRef.current
    if (!pending || pending.city !== currentCity || !worldEntryReady) return

    playerRef.current?.setPosition(pending.x, pending.y)
    setLastLocation(pending.city, pending.x, pending.y)
    pendingRestoreRef.current = null
    setLocationReady(true)
  }, [currentCity, locationReady, worldEntryReady])

  useEffect(() => {
    let cancelled = false
    setWorldEntryReady(false)
    const entryCity = CITY_CONFIGS[currentCity]
    void preloadWorldEntry(entryCity, selectedMidnightVariant).then(() => {
      if (!cancelled) setWorldEntryReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [currentCity, selectedMidnightVariant])

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
      if (e.key !== 'Escape') return
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
      e.preventDefault()
      if (showStartMenu) {
        setShowStartMenu(false)
        return
      }
      if (!canOpenStartMenu()) return
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
      const t = window.setTimeout(() => {
        setCafeSceneLine(0)
        setCafeFade('scene')
      }, 400)
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

  const showNarration = useCallback((lines: string[], onComplete?: () => void) => {
    setDialogue({
      npc: NARRATOR_NPC,
      lineIndex: 0,
      speakerLines: lines.map((text) => ({ speaker: '', text })),
      onComplete,
    })
  }, [])

  const showMarkVictoryNarration = useCallback(() => {
    showNarration([
      '[red jacket equips]',
      "the darkline's open now. take it south.",
    ])
  }, [showNarration])

  const finishCafeScene = useCallback(() => {
    setCafeSceneSeen()
    showNarration(['the jacket. you feel it. something opens.'], () => {
      if (!isMoveUnlocked('FURY_SWEEP', getPlayerSkills())) {
        const targetXp = totalXpForLevel(FURY_SWEEP_UNLOCK_LEVEL)
        const grant = Math.max(0, targetXp - getPlayerSkills().attack.xp)
        if (grant > 0) grantPlayerSkillXp('attack', grant)
      }
      setCafeFade('out')
    })
  }, [showNarration])

  const advanceCafeScene = useCallback(() => {
    if (cafeFade !== 'scene') return
    const next = cafeSceneLine + 1
    if (next >= CAFE_SCENE_LINES.length) {
      finishCafeScene()
      return
    }
    setCafeSceneLine(next)
  }, [cafeFade, cafeSceneLine, finishCafeScene])

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
        if (!canApproachMark()) {
          showMarkBlockedDialogue()
          return
        }
        beginNpcDialogue(MARK_NPC, { onComplete: startMarkBattle })
      } else if (action === 'OPEN_ONE_LOVE_CAFE') {
        if (isCafeSceneSeen() || cafeFade !== 'none') return
        setCafeFade('in')
      }
    },
    [beginNpcDialogue, cafeFade, canApproachMark, showMarkBlockedDialogue, startMarkBattle],
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
    setLastLocation(currentCity, config.darklineSpawnX, config.darklineSpawnY)
  }, [currentCity])

  const handleDarklineTravel = useCallback((destination: CityId) => {
    setShowDarkline(false)
    setCurrentCity(destination)
    markCityVisited(destination)
    const destConfig = CITY_CONFIGS[destination]
    playerRef.current?.setPosition(destConfig.spawnX, destConfig.spawnY)
    setLastLocation(destination, destConfig.spawnX, destConfig.spawnY)
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
      if (!canApproachMark()) {
        showMarkBlockedDialogue()
        return
      }
      beginNpcDialogue(MARK_NPC, { onComplete: startMarkBattle })
      return
    }

    const npc = findNpcInCity(nearbyId, currentCity)
    if (npc) beginNpcDialogue(npc)
  }, [
    beginNpcDialogue,
    canApproachMark,
    canApproachWalker,
    currentCity,
    showMarkBlockedDialogue,
    showNotYetDialogue,
    startMarkBattle,
    startNpcBattle,
  ])

  const handleInteract = useCallback(() => {
    if (worldEntryActive) return
    if (cafeFade === 'scene') {
      advanceCafeScene()
      return
    }
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
    advanceCafeScene,
    cafeFade,
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
    if (cafeFade === 'scene') {
      advanceCafeScene()
      return
    }
    if (dialogue) {
      advanceDialogue()
      return
    }
    openNearbyNpcDialogue()
  }, [advanceCafeScene, cafeFade, dialogue, advanceDialogue, openNearbyNpcDialogue, showStartMenu])

  const handleConfirm = handlePlayAreaClick

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.code !== 'Space') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      if (cafeFade === 'scene') {
        e.preventDefault()
        advanceCafeScene()
        return
      }
      if (
        worldEntryActive ||
        showStartMenu ||
        showLoadout ||
        showFannyPack ||
        battleNpcId ||
        battleEntryWipe ||
        menuEntryWipe
      ) {
        return
      }
      e.preventDefault()
      handleConfirm()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    advanceCafeScene,
    battleEntryWipe,
    battleNpcId,
    cafeFade,
    handleConfirm,
    menuEntryWipe,
    showFannyPack,
    showLoadout,
    showStartMenu,
    worldEntryActive,
  ])

  useEffect(() => {
    if (worldEntryActive || battleNpcId) {
      setNearbyNpcId(null)
      return
    }
    let raf = 0
    const tick = () => {
      const next = playerRef.current?.getNearbyNpcId() ?? null
      setNearbyNpcId((prev) => (prev === next ? prev : next))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [battleNpcId, worldEntryActive])

  useEffect(() => {
    if (!locationReady || worldEntryActive || battleNpcId || battleEntryWipe) return
    reportCurrentLocation()
    const id = window.setInterval(reportCurrentLocation, LOCATION_REPORT_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [
    battleEntryWipe,
    battleNpcId,
    locationReady,
    reportCurrentLocation,
    worldEntryActive,
  ])

  useEffect(() => {
    if (!locationReady || worldEntryActive) return
    reportCurrentLocation()
  }, [
    battleEntryWipe,
    battleNpcId,
    dialogue,
    locationReady,
    menuEntryWipe,
    reportCurrentLocation,
    showFannyPack,
    showLoadout,
    worldEntryActive,
  ])

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
    let markWon = false
    setBattleNpcId((activeId) => {
      if (result === 'win') {
        if (activeId === WALKER_NPC_ID) setWalkerConverted()
        if (activeId === JACLYN_NPC_ID) setJaclynConverted()
        if (activeId === MARK_NPC_ID) {
          setMarkDefeated()
          collectArtifact('subway-pass')
          markWon = true
        }
      }
      return null
    })
    if (markWon) {
      showMarkVictoryNarration()
    }
    reportCurrentLocation()
  }, [reportCurrentLocation, showMarkVictoryNarration])

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

  const showInteractHint = showQuestHelper && !dialogue && nearbyNpcId !== null

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
          {showInteractHint && (
            <p className="game-screen-interact-hint" role="status">
              space · talk
            </p>
          )}
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
                alt="cornerstone interior"
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
              destinations={darklineDestinations}
              inactiveDestinations={INACTIVE_DESTINATIONS}
              onClose={handleDarklineClose}
              onTravel={handleDarklineTravel}
            />
          )}
          {dialogue && !battleNpcId && cafeFade !== 'scene' && (
            <DialogueBox
              name={dialogue.speakerLines[dialogue.lineIndex]?.speaker ?? dialogue.npc.name}
              line={dialogue.speakerLines[dialogue.lineIndex]?.text ?? ''}
              onAdvance={advanceDialogue}
            />
          )}
          {cafeFade !== 'none' && (
            <div
              className={`game-screen-cafe-fade${
                cafeFade === 'scene' ? ' game-screen-cafe-fade--hold' : ''
              }`}
              style={
                cafeFade === 'in' || cafeFade === 'out'
                  ? {
                      animation:
                        cafeFade === 'in'
                          ? 'cafeFadeIn 400ms ease-in forwards'
                          : 'cafeFadeOut 400ms ease-out forwards',
                    }
                  : undefined
              }
            />
          )}
          {cafeFade === 'scene' && !dialogue && (
            <div
              className="game-screen-cafe-scene"
              onClick={(e) => {
                e.stopPropagation()
                advanceCafeScene()
              }}
              role="dialog"
              aria-modal="true"
            >
              <p className="game-screen-cafe-scene__text">{CAFE_SCENE_LINES[cafeSceneLine]}</p>
              <span className="game-screen-cafe-scene__continue">tap to continue ▸</span>
            </div>
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
