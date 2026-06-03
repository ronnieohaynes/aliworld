import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { TriggerAction } from '../data/triggerZones'
import { ADAM_MP3_ARTIFACT_ID, ADAM_NPC, isAdamNpcId } from '../data/adamMp3Handoff'
import { MARK_NPC, MANDO_NPC, WALKER_NPC, JACLYN_NPC, CROWD_1_NPC, CROWD_2_NPC, TOWN_CRIER_NPC, CLERK_NPC, RESTOCKER_NPC, type NpcData } from '../data/npcs'
import { isE2QuestUnlocked } from '../data/quest2Objectives'
import { resolveNpcDialogueLines, type ResolvedDialogueLine } from '../data/npcDialogue'
import {
  BLUE_STORE_EXTERIOR_RETURN,
  CITY_CONFIGS,
  DARKLINE_DESTINATIONS,
  INACTIVE_DESTINATIONS,
  POST_E1_DARKLINE_DESTINATION,
  POST_E2_DARKLINE_DESTINATION,
  type CityConfig,
  type CityId,
} from '../data/cityConfig'
import { isMoveUnlocked } from '../data/moves'
import { collectArtifact, getArtifactStoreSnapshot, hasArtifact, subscribeArtifactStore } from '../store/artifactStore'
import {
  getQuest1Snapshot,
  hasTalkedToAllGatingNpcs,
  isGatingNpcId,
  isCafeSceneSeen,
  isJaclynConverted,
  isMarkDefeated,
  subscribeQuest1Store,
  isWalkerConverted,
  isWorldIntroSeen,
  JACLYN_NPC_ID,
  MARK_NPC_ID,
  markGatingNpcTalked,
  setCafeSceneSeen,
  setJaclynConverted,
  setMarkDefeated,
  setWalkerConverted,
  setWorldIntroSeen,
  WALKER_NPC_ID,
} from '../store/quest1Store'
import {
  CLERK_NPC_ID,
  CROWD_2_NPC_ID,
  getQuest2Snapshot,
  isClerkConverted,
  isCrierConverted,
  isCrowdAddressed,
  isRestockerDefeated,
  RESTOCKER_NPC_ID,
  setClerkConverted,
  setCrierConverted,
  setCrowdAddressed,
  setRestockerDefeated,
  subscribeQuest2Store,
  TOWN_CRIER_NPC_ID,
} from '../store/quest2Store'
import {
  getWorldMemorySnapshot,
  markCityVisited,
  subscribeWorldMemoryStore,
} from '../store/worldMemory'
import { resumeSoundtrackIfNeeded, startSoundtrack } from '../store/musicStore'
import { publicAsset } from '../utils/publicAsset'
import { GameShell } from './GameShell'
import { BattleScreen } from './BattleScreen'
import { ArtifactAcquisitionToasts } from './ArtifactAcquisitionToast'
import { FannyPackScreen } from './FannyPackScreen'
import { LoadoutScreen } from './LoadoutScreen'
import { BattleEntryWipe, type BattleWipeMode } from './BattleEntryWipe'
import { MenuEntryCover, type MenuTransitionTarget } from './MenuEntryCover'
import { WorldEntryWipe } from './WorldEntryWipe'
import { PlayerLevelOverhead } from './PlayerLevelOverhead'
import { DarklineScreen } from './DarklineScreen'
import { DialogueBox } from './DialogueBox'
import { GameCanvas } from './GameCanvas'
import { Player, type PlayerHandle } from './Player'
import {
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from '../store/characterStore'
import { performNewGameReset } from '../store/gameProgress'
import { track } from '../lib/analytics'
import { useCoarsePointer } from '../hooks/useCoarsePointer'
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
  buildQuestObjectiveContext,
  resolveActiveQuestPulseDescriptor,
} from '../data/questObjectives'
import {
  StartMenuScreen,
  type StartMenuAction,
  type StartMenuHandle,
} from './StartMenuScreen'
import { AccountSaveIndicator } from './AccountSaveIndicator'
import { IntroNarrationScreen } from './IntroNarrationScreen'
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

type MapTransitionTarget = {
  cityId: CityId
  x: number
  y: number
}

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
  const [currentCity, setCurrentCity] = useState<CityId>('five')
  const prevCityRef = useRef<CityId | null>(null)
  const [showInterior, setShowInterior] = useState(false)
  const [showDarkline, setShowDarkline] = useState(false)
  const [cafeFade, setCafeFade] = useState<CafeFadePhase>('none')
  const [cafeSceneLine, setCafeSceneLine] = useState(0)
  const [dialogue, setDialogue] = useState<DialogueState | null>(null)
  const [battleNpcId, setBattleNpcId] = useState<string | null>(null)
  const [battleWipePhase, setBattleWipePhase] = useState<BattleWipeMode | null>(null)
  const [battleReady, setBattleReady] = useState(false)
  const pendingBattleExitRef = useRef<{ result: 'win' | 'lose' } | null>(null)
  const [showFannyPack, setShowFannyPack] = useState(false)
  const [showLoadout, setShowLoadout] = useState(false)
  const [showStartMenu, setShowStartMenu] = useState(false)
  const [menuReturnPending, setMenuReturnPending] = useState(false)
  const [menuTransition, setMenuTransition] = useState<MenuTransitionTarget | null>(null)
  const startMenuRef = useRef<StartMenuHandle>(null)
  const menuTransitionRef = useRef<MenuTransitionTarget | null>(null)
  const [worldEntryActive, setWorldEntryActive] = useState(true)
  const [worldEntryReady, setWorldEntryReady] = useState(false)
  const [nearbyNpcId, setNearbyNpcId] = useState<string | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const pendingRestoreRef = useRef<{ city: CityId; x: number; y: number } | null>(null)
  /** City to preload for world entry — resolved once after account hydrate. */
  const [bootCityId, setBootCityId] = useState<CityId | null>(null)
  const [mapTransition, setMapTransition] = useState<MapTransitionTarget | null>(null)
  const [mapTransitionReady, setMapTransitionReady] = useState(false)
  const [mapTransitionPending, setMapTransitionPending] = useState(false)
  const mapTransitionRef = useRef<MapTransitionTarget | null>(null)
  /** True until account hydrate resolves whether intro should run. */
  const [introPending, setIntroPending] = useState(true)
  const [introActive, setIntroActive] = useState(false)

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
  const quest2Revision = useSyncExternalStore(
    subscribeQuest2Store,
    getQuest2Snapshot,
    getQuest2Snapshot,
  )
  const artifactRevision = useSyncExternalStore(
    subscribeArtifactStore,
    getArtifactStoreSnapshot,
    getArtifactStoreSnapshot,
  )
  const worldRevision = useSyncExternalStore(
    subscribeWorldMemoryStore,
    getWorldMemorySnapshot,
    getWorldMemorySnapshot,
  )
  const markDefeated = useSyncExternalStore(
    subscribeQuest1Store,
    isMarkDefeated,
    isMarkDefeated,
  )
  const showDebug = useSyncExternalStore(subscribePlayerStore, getShowDebug, getShowDebug)

  const darklineDestinations = useMemo((): CityId[] => {
    void quest1Revision
    void quest2Revision
    if (!isCafeSceneSeen()) return [...DARKLINE_DESTINATIONS]
    const dest: CityId[] = [...DARKLINE_DESTINATIONS, POST_E1_DARKLINE_DESTINATION]
    if (isE2QuestUnlocked()) {
      dest.push(POST_E2_DARKLINE_DESTINATION)
    }
    if (!isCrierConverted()) {
      return dest.filter((id) => id !== 'southside' && id !== 'blue-store')
    }
    return dest
  }, [quest1Revision, quest2Revision])

  const questPulseDescriptor = useMemo(() => {
    void artifactRevision
    void quest1Revision
    void quest2Revision
    void worldRevision
    return resolveActiveQuestPulseDescriptor(buildQuestObjectiveContext())
  }, [artifactRevision, quest1Revision, quest2Revision, worldRevision])

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
      if (saved) {
        const pos = resolveSavedWorldPosition(saved.city, saved.x, saved.y)
        pendingRestoreRef.current = { city: saved.city, x: pos.x, y: pos.y }
        setCurrentCity(saved.city)
        setBootCityId(saved.city)
        setIntroActive(false)
        setIntroPending(false)
        return
      }
      setBootCityId('five')
      setLocationReady(true)
      setIntroActive(!isWorldIntroSeen())
      setIntroPending(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!bootCityId) return
    let cancelled = false
    setWorldEntryReady(false)
    void preloadWorldEntry(CITY_CONFIGS[bootCityId], selectedMidnightVariant)
      .catch((err) => {
        console.error('[world entry preload]', err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setWorldEntryReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [bootCityId, selectedMidnightVariant])

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
    if (!locationReady) return
    if (prevCityRef.current === currentCity) return
    if (prevCityRef.current !== null) {
      track('city_enter', { city: currentCity })
    }
    prevCityRef.current = currentCity
  }, [currentCity, locationReady])

  const handleWorldEntryComplete = useCallback(() => {
    setWorldEntryActive(false)
  }, [])

  const handleIntroComplete = useCallback(() => {
    setWorldIntroSeen()
    setIntroActive(false)
  }, [])

  const cityConfig = useMemo((): CityConfig => {
    if (currentCity === 'five') {
      let npcs = [...baseCityConfig.npcs]
      if (markDefeated) {
        npcs = npcs.filter((npc) => npc.id !== MARK_NPC_ID)
      }
      if (isE2QuestUnlocked()) {
        if (!isCrowdAddressed()) {
          npcs = [...npcs, CROWD_1_NPC, CROWD_2_NPC]
        }
        if (!isCrierConverted()) {
          npcs = [...npcs, TOWN_CRIER_NPC]
        }
      }
      return { ...baseCityConfig, npcs }
    }
    if (currentCity === 'southside' || currentCity === 'blue-store') {
      let npcs = [...baseCityConfig.npcs]
      if (!isClerkConverted()) {
        npcs = npcs.filter((npc) => npc.id !== RESTOCKER_NPC_ID)
      }
      return { ...baseCityConfig, npcs }
    }
    return baseCityConfig
  }, [baseCityConfig, currentCity, markDefeated, quest2Revision])

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
      !battleWipePhase &&
      !menuTransition &&
      !mapTransition &&
      !mapTransitionPending &&
      !dialogue
    )
  }, [
    worldEntryActive,
    battleNpcId,
    battleWipePhase,
    menuTransition,
    mapTransition,
    mapTransitionPending,
    dialogue,
  ])

  const beginMenuTransition = useCallback((target: MenuTransitionTarget) => {
    menuTransitionRef.current = target
    setMenuTransition(target)
  }, [])

  const beginMapTransition = useCallback(
    (cityId: CityId, x: number, y: number) => {
      if (mapTransitionRef.current || mapTransitionPending) return
      const target: MapTransitionTarget = { cityId, x, y }
      mapTransitionRef.current = target
      setMapTransitionPending(true)
      setMapTransitionReady(false)
      setMapTransition(target)
      void preloadWorldEntry(CITY_CONFIGS[cityId], selectedMidnightVariant)
        .catch((err) => {
          console.error(
            '[map transition preload]',
            err instanceof Error ? err.message : String(err),
          )
        })
        .finally(() => setMapTransitionReady(true))
    },
    [mapTransitionPending, selectedMidnightVariant],
  )

  const handleMapTransitionMidpoint = useCallback(() => {
    const target = mapTransitionRef.current
    if (!target) return
    setCurrentCity(target.cityId)
    playerRef.current?.setPosition(target.x, target.y)
    if (target.cityId !== 'blue-store-interior') {
      setLastLocation(target.cityId, target.x, target.y)
    }
  }, [])

  const handleMapTransitionComplete = useCallback(() => {
    mapTransitionRef.current = null
    setMapTransition(null)
    setMapTransitionReady(false)
    setMapTransitionPending(false)
  }, [])

  /** Leave pause flow and return to gameplay (same as choosing resume). */
  const resumeFromPauseMenu = useCallback(() => {
    setShowFannyPack(false)
    setShowLoadout(false)
    setShowStartMenu(false)
    setMenuReturnPending(false)
  }, [])

  const beginResumeTransition = useCallback(() => {
    beginMenuTransition({ kind: 'resume' })
  }, [beginMenuTransition])

  const toggleStartMenu = useCallback(() => {
    if (menuTransition) return
    if (showStartMenu) {
      resumeFromPauseMenu()
      return
    }
    if (menuReturnPending && (showFannyPack || showLoadout)) {
      beginResumeTransition()
      return
    }
    if (!canOpenStartMenu()) return
    setShowStartMenu(true)
  }, [
    beginResumeTransition,
    canOpenStartMenu,
    menuReturnPending,
    menuTransition,
    resumeFromPauseMenu,
    showFannyPack,
    showLoadout,
    showStartMenu,
  ])

  const handleFannyPack = useCallback(() => {
    if (menuTransition || worldEntryActive || showStartMenu) return
    if (menuReturnPending) {
      beginResumeTransition()
      return
    }
    setShowFannyPack((open) => !open)
  }, [beginResumeTransition, menuReturnPending, menuTransition, showStartMenu])

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
      if (showLoadout || showFannyPack) {
        if (menuReturnPending) {
          e.preventDefault()
          beginResumeTransition()
        }
        return
      }
      if (battleNpcId || battleWipePhase || menuTransition) return
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
    battleWipePhase,
    battleNpcId,
    beginResumeTransition,
    canOpenStartMenu,
    menuReturnPending,
    showFannyPack,
    showLoadout,
    showStartMenu,
    menuTransition,
  ])

  const startMarkBattle = useCallback(() => {
    if (battleNpcId || battleWipePhase) return
    setDialogue(null)
    setBattleReady(false)
    setBattleNpcId(MARK_NPC_ID)
    setBattleWipePhase('enter')
  }, [battleNpcId, battleWipePhase])

  const startNpcBattle = useCallback((npcId: string) => {
    if (battleNpcId || battleWipePhase) return
    setDialogue(null)
    setBattleReady(false)
    setBattleNpcId(npcId)
    setBattleWipePhase('enter')
  }, [battleNpcId, battleWipePhase])

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
    track('episode_complete', { episode: 'e1' })
    if (!isMoveUnlocked('FURY_SWEEP', getPlayerSkills())) {
      const targetXp = totalXpForLevel(FURY_SWEEP_UNLOCK_LEVEL)
      const grant = Math.max(0, targetXp - getPlayerSkills().attack.xp)
      if (grant > 0) grantPlayerSkillXp('attack', grant)
    }
    setCafeFade('out')
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
      const t = window.setTimeout(() => {
        setCafeFade('none')
        showNarration(['the jacket. you feel it. something opens.'])
      }, 400)
      return () => window.clearTimeout(t)
    }
  }, [cafeFade, showNarration])

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
        setDialogue(null)
        setCafeFade('in')
      } else if (action === 'OPEN_BLUE_STORE') {
        if (currentCity !== 'blue-store') return
        if (mapTransitionRef.current) return
        if (!isCrierConverted()) {
          showNotYetDialogue(CLERK_NPC, 'nobody gets in until the crier moves.')
          return
        }
        {
          const interior = CITY_CONFIGS['blue-store-interior']
          beginMapTransition(
            'blue-store-interior',
            interior.spawnX,
            interior.spawnY,
          )
        }
      } else if (action === 'OPEN_BLUE_STORE_EXIT') {
        if (currentCity !== 'blue-store-interior') return
        if (mapTransitionRef.current) return
        beginMapTransition(
          'blue-store',
          BLUE_STORE_EXTERIOR_RETURN.x,
          BLUE_STORE_EXTERIOR_RETURN.y,
        )
      }
    },
    [
      beginMapTransition,
      cafeFade,
      canApproachMark,
      currentCity,
      showMarkBlockedDialogue,
      showNotYetDialogue,
      startMarkBattle,
    ],
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
      if (next >= prev.speakerLines.length) {
        const onComplete = prev.onComplete
        if (isAdamNpcId(prev.npc.id)) {
          completeAdamMp3Handoff()
        } else if (isGatingNpcId(prev.npc.id)) {
          markGatingNpcTalked(prev.npc.id)
        }
        if (onComplete) onComplete()
        if (prev.npc.id === CROWD_2_NPC_ID && isE2QuestUnlocked() && !isCrowdAddressed()) {
          setCrowdAddressed()
          track('npc_converted', { npcId: CROWD_2_NPC_ID })
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
      beginNpcDialogue(ADAM_NPC)
      return
    }

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

    if (nearbyId === CROWD_2_NPC_ID) {
      beginNpcDialogue(CROWD_2_NPC)
      return
    }

    if (nearbyId === CROWD_1_NPC.id) {
      beginNpcDialogue(CROWD_1_NPC)
      return
    }

    if (nearbyId === TOWN_CRIER_NPC_ID) {
      if (isCrierConverted()) {
        beginNpcDialogue(TOWN_CRIER_NPC)
        return
      }
      if (!isCrowdAddressed()) {
        showNotYetDialogue(TOWN_CRIER_NPC, 'address the crowd first.')
        return
      }
      beginNpcDialogue(TOWN_CRIER_NPC, { onComplete: () => startNpcBattle(TOWN_CRIER_NPC_ID) })
      return
    }

    if (nearbyId === CLERK_NPC_ID) {
      if (currentCity !== 'blue-store' && currentCity !== 'southside') return
      if (!isCrierConverted()) {
        showNotYetDialogue(CLERK_NPC, 'the crier has to go first.')
        return
      }
      if (isClerkConverted()) {
        beginNpcDialogue(CLERK_NPC)
        return
      }
      beginNpcDialogue(CLERK_NPC, { onComplete: () => startNpcBattle(CLERK_NPC_ID) })
      return
    }

    if (nearbyId === RESTOCKER_NPC_ID) {
      if (!isClerkConverted()) {
        showNotYetDialogue(RESTOCKER_NPC, 'get through the clerk first.')
        return
      }
      if (isRestockerDefeated()) {
        beginNpcDialogue(RESTOCKER_NPC)
        return
      }
      beginNpcDialogue(RESTOCKER_NPC, { onComplete: () => startNpcBattle(RESTOCKER_NPC_ID) })
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
    if (battleWipePhase || menuTransition || battleNpcId || showFannyPack || showLoadout)
      return
    openNearbyNpcDialogue()
  }, [
    advanceCafeScene,
    cafeFade,
    dialogue,
    advanceDialogue,
    battleWipePhase,
    battleNpcId,
    showFannyPack,
    showLoadout,
    showStartMenu,
    menuTransition,
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

  const handleConfirm = handleInteract

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
        battleWipePhase ||
        menuTransition
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
    battleWipePhase,
    battleNpcId,
    cafeFade,
    handleConfirm,
    menuTransition,
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
    if (!locationReady || worldEntryActive || battleNpcId || battleWipePhase) return
    reportCurrentLocation()
    const id = window.setInterval(reportCurrentLocation, LOCATION_REPORT_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [
    battleWipePhase,
    battleNpcId,
    locationReady,
    reportCurrentLocation,
    worldEntryActive,
  ])

  useEffect(() => {
    if (!locationReady || worldEntryActive) return
    reportCurrentLocation()
  }, [
    battleWipePhase,
    battleNpcId,
    dialogue,
    locationReady,
    menuTransition,
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
    setBattleReady(true)
  }, [])

  const handleBattleEntryComplete = useCallback(() => {
    setBattleWipePhase(null)
  }, [])

  const handleBattleExitMidpoint = useCallback(() => {
    setBattleReady(false)
  }, [])

  const handleBattleExitComplete = useCallback(() => {
    pendingBattleExitRef.current = null
    setBattleNpcId(null)
    setBattleReady(false)
    setBattleWipePhase(null)
    reportCurrentLocation()
  }, [reportCurrentLocation])

  const handleBattleEnd = useCallback(
    (result: 'win' | 'lose', turns: number) => {
      const safeTurns = Number.isFinite(turns) && turns >= 0 ? turns : 0
      if (battleNpcId) {
        track('battle_end', { enemyId: battleNpcId, result, turns: safeTurns })
      }
      if (result === 'win') {
        if (battleNpcId === WALKER_NPC_ID) {
          setWalkerConverted()
          track('npc_converted', { npcId: WALKER_NPC_ID })
        }
        if (battleNpcId === JACLYN_NPC_ID) {
          setJaclynConverted()
          track('npc_converted', { npcId: JACLYN_NPC_ID })
        }
        if (battleNpcId === MARK_NPC_ID) {
          setMarkDefeated()
          collectArtifact('subway-pass')
          showMarkVictoryNarration()
          track('npc_converted', { npcId: MARK_NPC_ID })
        }
        if (battleNpcId === TOWN_CRIER_NPC_ID) {
          setCrierConverted()
          track('npc_converted', { npcId: TOWN_CRIER_NPC_ID })
        }
        if (battleNpcId === CLERK_NPC_ID) {
          setClerkConverted()
          track('npc_converted', { npcId: CLERK_NPC_ID })
        }
        if (battleNpcId === RESTOCKER_NPC_ID) {
          setRestockerDefeated()
          track('npc_converted', { npcId: RESTOCKER_NPC_ID })
          track('episode_complete', { episode: 'e2' })
          showNarration(["something's wrong in the field.", 'you started it.'])
        }
      }
      pendingBattleExitRef.current = { result }
      setBattleWipePhase('exit')
    },
    [battleNpcId, showMarkVictoryNarration, showNarration],
  )

  const handleFannyPackClose = useCallback(() => {
    if (menuReturnPending) {
      beginResumeTransition()
      return
    }
    setShowFannyPack(false)
  }, [beginResumeTransition, menuReturnPending])

  const handleLoadoutClose = useCallback(() => {
    if (menuReturnPending) {
      beginResumeTransition()
      return
    }
    setShowLoadout(false)
  }, [beginResumeTransition, menuReturnPending])

  const handleOpenLoadout = useCallback(() => {
    if (worldEntryActive || showStartMenu) return
    setShowLoadout(true)
  }, [showStartMenu, worldEntryActive])

  const beginMenuEntryTransition = useCallback(
    (screen: 'fanny-pack' | 'loadout') => {
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
        else setShowLoadout(true)
        break
      case 'resume':
        resumeFromPauseMenu()
        break
    }
  }, [resumeFromPauseMenu])

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
        case 'loadout':
          beginMenuEntryTransition('loadout')
          break
        case 'refresh': {
          const cfg = CITY_CONFIGS[currentCity]
          playerRef.current?.setPosition(cfg.spawnX, cfg.spawnY)
          setLastLocation(currentCity, cfg.spawnX, cfg.spawnY)
          resumeFromPauseMenu()
          break
        }
        case 'new-game':
          break
        case 'sign-out':
          setShowStartMenu(false)
          setMenuReturnPending(false)
          void signOut()
          break
      }
    },
    [beginMenuEntryTransition, currentCity, resumeFromPauseMenu],
  )

  const handleConfirmNewGame = useCallback(() => {
    setShowStartMenu(false)
    setMenuReturnPending(false)
    performNewGameReset()

    pendingRestoreRef.current = null
    setCurrentCity('five')
    setBootCityId('five')
    setLocationReady(true)

    setCafeFade('none')
    setCafeSceneLine(0)
    setDialogue(null)
    setBattleNpcId(null)
    setBattleWipePhase(null)
    setBattleReady(false)
    setShowDarkline(false)
    setShowInterior(false)

    const cfg = CITY_CONFIGS.five
    playerRef.current?.setPosition(cfg.spawnX, cfg.spawnY)
  }, [])

  const showQuestHelper =
    !worldEntryActive &&
    !battleNpcId &&
    !battleWipePhase &&
    !menuTransition &&
    !mapTransition &&
    !mapTransitionPending &&
    !showStartMenu &&
    !showLoadout &&
    !showFannyPack &&
    !showDarkline &&
    !showInterior

  const showQuestPulse = showQuestHelper && cafeFade === 'none'

  const isCoarsePointer = useCoarsePointer()
  const showInteractHint =
    !isCoarsePointer && showQuestHelper && !dialogue && nearbyNpcId !== null
  const showTouchTalkButton =
    isCoarsePointer &&
    !worldEntryActive &&
    !battleNpcId &&
    !battleWipePhase &&
    !menuTransition &&
    !mapTransition &&
    !mapTransitionPending &&
    !showStartMenu &&
    !showLoadout &&
    !showFannyPack &&
    (dialogue != null || cafeFade === 'scene' || nearbyNpcId != null)

  const touchTalkLabel =
    dialogue || cafeFade === 'scene' ? 'tap · next' : 'tap · talk'

  const handleInteriorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (dialogue) {
      advanceDialogue()
      return
    }
    beginNpcDialogue(MANDO_NPC)
  }, [dialogue, advanceDialogue, beginNpcDialogue])

  if (introPending || introActive) {
    return (
      <div
        className="game-screen"
        style={{ background: '#0a0a12', minHeight: '100dvh', height: '100dvh' }}
      >
        {introActive ? <IntroNarrationScreen onComplete={handleIntroComplete} /> : null}
      </div>
    )
  }

  return (
    <div className="game-screen">
      <AccountSaveIndicator />
      <GameShell
        onFannyPack={handleFannyPack}
        onScript={handleOpenLoadout}
        onInteract={handleInteract}
        onStart={toggleStartMenu}
      >
        <div
          className={`game-screen-play${
            battleWipePhase ? ' game-screen-play--battle-wipe' : ''
          }${menuTransition || mapTransition || mapTransitionPending ? ' game-screen-play--menu-transition' : ''}${
            worldEntryActive ? ' game-screen-play--world-entry' : ''
          }`}
          onClick={handlePlayAreaClick}
        >
          {showDebug && (
            <pre id={GAME_DEBUG_HUD_ID} className="game-screen-debug-hud">
              {`direction: down\nframe: 0\nsx: 0.0  sy: 0.0\nstate: idle`}
            </pre>
          )}
          {showQuestHelper && <QuestHelper />}
          {showInteractHint && (
            <p className="game-screen-interact-hint" role="status">
              space · talk
            </p>
          )}
          {showTouchTalkButton && (
            <button
              type="button"
              className="game-screen-talk-btn"
              aria-label={touchTalkLabel}
              onClick={(e) => {
                e.stopPropagation()
                handleConfirm()
              }}
            >
              {touchTalkLabel}
            </button>
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
                !!battleWipePhase ||
                !!menuTransition ||
                !!mapTransition ||
                mapTransitionPending ||
                showFannyPack ||
                showLoadout ||
                showStartMenu
              }
              dialogueNpcId={dialogue?.npc.id ?? null}
              questPulseDescriptor={questPulseDescriptor}
              showQuestPulse={showQuestPulse}
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
          {cafeFade === 'scene' && (
            <div
              className="game-screen-cafe-scene"
              onClick={(e) => {
                e.stopPropagation()
                advanceCafeScene()
              }}
              role="dialog"
              aria-modal="true"
            >
              <p className="game-screen-cafe-scene__text">
                {CAFE_SCENE_LINES[cafeSceneLine] ?? ''}
              </p>
              <span className="game-screen-cafe-scene__continue">tap to continue ▸</span>
            </div>
          )}
          <div className="game-screen-battle-layer">
            {battleNpcId && battleReady && (
              <BattleScreen
                key={battleNpcId}
                npcId={battleNpcId}
                battleRevealed={!battleWipePhase}
                onBattleEnd={handleBattleEnd}
              />
            )}
            {battleWipePhase && (
              <BattleEntryWipe
                key={battleWipePhase}
                mode={battleWipePhase}
                onMidpoint={
                  battleWipePhase === 'enter'
                    ? handleBattleEntryMidpoint
                    : handleBattleExitMidpoint
                }
                onComplete={
                  battleWipePhase === 'enter'
                    ? handleBattleEntryComplete
                    : handleBattleExitComplete
                }
              />
            )}
          </div>
          {menuTransition && (
            <MenuEntryCover
              immediateMidpoint={menuTransition.kind === 'resume'}
              onMidpoint={handleMenuTransitionMidpoint}
              onComplete={handleMenuTransitionComplete}
            />
          )}
          {mapTransitionPending && !mapTransitionReady && (
            <div className="menu-entry-cover" aria-hidden>
              <div className="menu-entry-cover__panel" style={{ opacity: 1 }} />
            </div>
          )}
          {mapTransition && mapTransitionReady && (
            <MenuEntryCover
              onMidpoint={handleMapTransitionMidpoint}
              onComplete={handleMapTransitionComplete}
            />
          )}
          {worldEntryActive && (
            <WorldEntryWipe ready={worldEntryReady} onComplete={handleWorldEntryComplete} />
          )}
          <ArtifactAcquisitionToasts />
          {showFannyPack && <FannyPackScreen onClose={handleFannyPackClose} />}
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
      {showLoadout && <LoadoutScreen onClose={handleLoadoutClose} />}
    </div>
  )
}
