import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { TriggerAction } from '../data/triggerZones'
import { ADAM_MP3_ARTIFACT_ID, ADAM_NPC, isAdamNpcId } from '../data/adamMp3Handoff'
import { MARK_NPC, MANDO_NPC, WALKER_NPC, JACLYN_NPC, CROWD_1_NPC, CROWD_2_NPC, TOWN_CRIER_NPC, CLERK_NPC, RESTOCKER_NPC, WALKER_E2_CROWD_NPC, type NpcData } from '../data/npcs'
import { isE2QuestUnlocked, QUEST_2_CLOSING_TEXT } from '../data/quest2Objectives'
import { E2_ENABLED } from '../store/quest2Store'
import { resolveNpcDialogueLines, type ResolvedDialogueLine } from '../data/npcDialogue'
import {
  SOUTHSIDE_EXTERIOR_RETURN,
  CITY_CONFIGS,
  DARKLINE_DESTINATIONS,
  INACTIVE_DESTINATIONS,
  POST_E1_DARKLINE_DESTINATION,
  POST_E2_DARKLINE_DESTINATION,
  type CityConfig,
  type CityId,
} from '../data/cityConfig'
import { FIVE_GYM_EXTERIOR_RETURN } from '../data/gymEntrance'
import { E2_CLOSING_CRIER_NPC, E2_CLOSING_MOB_NPCS } from '../data/e2ClosingNpcs'
import {
  FIVE_GYM1_HEAD_NPC,
  FIVE_GYM1_ID,
} from '../data/gymNpcs'
import { DEV_SPAR_NPC_ID, isDevSparNpcId } from '../data/devSpar'
import { collectArtifact, getArtifactStoreSnapshot, hasArtifact, subscribeArtifactStore } from '../store/artifactStore'
import {
  getGymRevision,
  isGym5ive1Cleared,
  isOceanviewGymVisited,
  recordGym5ive1Win,
  setOceanviewGymVisited,
  subscribeGymStore,
} from '../store/gymStore'
import {
  buildQuestObjectiveContext,
  isE1ArcComplete,
  resolveActiveQuestPulseDescriptor,
  type QuestPulseTargetDescriptor,
} from '../data/questObjectives'
import {
  getQuest1Revision,
  getQuest1Snapshot,
  hasTalkedToAllGatingNpcs,
  isGatingNpcId,
  isCafeSceneSeen,
  isE1CutscenePlayed,
  isJaclynConverted,
  isMarkDefeated,
  subscribeQuest1Store,
  isBattleTutorialSeen,
  resetBattleTutorialSeen,
  isEpisode1TitleCardSeen,
  isTutorialPhase2Seen,
  isWalkerConverted,
  isWorldIntroSeen,
  JACLYN_NPC_ID,
  MARK_NPC_ID,
  markGatingNpcTalked,
  setCafeSceneSeen,
  setEpisode1TitleCardSeen,
  setE1CutscenePlayed,
  setMp3PlayerOwned,
  setJaclynConverted,
  setMarkDefeated,
  setTutorialPhase2Seen,
  setWalkerConverted,
  setWorldIntroSeen,
  WALKER_NPC_ID,
} from '../store/quest1Store'
import {
  CLERK_NPC_ID,
  CROWD_2_NPC_ID,
  getQuest2Revision,
  isClerkConverted,
  isCrierConverted,
  isCrierSentAhead,
  isCrowdAddressed,
  isE2Complete,
  isE2ClosingCrowdDismissed,
  isRestockerDefeated,
  RESTOCKER_NPC_ID,
  setClerkConverted,
  setCrierConverted,
  setCrierSentAhead,
  setCrowdAddressed,
  setE2ClosingCrowdDismissed,
  setE2Complete,
  setRestockerDefeated,
  subscribeQuest2Store,
  TOWN_CRIER_NPC_ID,
} from '../store/quest2Store'
import {
  getWorldMemorySnapshot,
  markCityVisited,
  subscribeWorldMemoryStore,
} from '../store/worldMemory'
import { isMusicEnabled } from '../config/musicEnabled'
import {
  grantMusicPlayerFromAdam,
  syncMusicForContext,
} from '../store/musicStore'
import { publicAsset } from '../utils/publicAsset'
import { GameShell } from './GameShell'
import { BattleScreen } from './BattleScreen'
import { ArtifactAcquisitionToasts } from './ArtifactAcquisitionToast'
import { FannyPackScreen } from './FannyPackScreen'
import { LoadoutScreen } from './LoadoutScreen'
import { BattleEntryWipe, type BattleWipeMode } from './BattleEntryWipe'
import { MenuEntryCover, type MenuTransitionTarget } from './MenuEntryCover'
import { WorldEntryWipe } from './WorldEntryWipe'
import { CultTransition, type CultTransitionMode } from './CultTransition'
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
import type { PlayCutsceneOptions } from '../lib/playCutscene'
import { preloadYouTubeIframeApi } from '../lib/youtubeIframeApi'
import { EPISODE_1_CAPTIONS } from '../data/episode1Captions'
import { useDevControls } from '../hooks/useDevControls'
import { CutsceneOverlay } from './CutsceneOverlay'
import {
  QuestTransition,
  type QuestTransitionHandle,
  type ShowQuestTransitionParams,
} from './QuestTransition'
import { useCoarsePointer } from '../hooks/useCoarsePointer'
import { preloadWorldEntry } from '../game/preloadWorldEntry'
import {
  getShowDebug,
  setLastLocation,
  subscribePlayerStore,
  whenAccountHydrated,
} from '../store/playerStore'
import {
  awardPatch,
  getAvailablePatchSkills,
  getNextPatchXp,
  isEpisodePatchAwarded,
} from '../store/patchesStore'
import { getSkillLabels, type SkillId } from '../store/skillStore'
import { PatchSkillPicker } from './PatchSkillPicker'
import { signOut } from '../store/authStore'
import { QuestHelper } from './QuestHelper'
import {
  StartMenuScreen,
  type StartMenuAction,
  type StartMenuHandle,
} from './StartMenuScreen'
import { AccountSaveIndicator } from './AccountSaveIndicator'
import { BugReportScreen } from './BugReportScreen'
import { IntroNarrationScreen } from './IntroNarrationScreen'
import { ButtonSpotlightRing, GuidedTutorialOverlay } from './GuidedTutorialOverlay'
import {
  allowsStartMenuDuringLoadoutTutorial,
  blocksWorldInteractDuringLoadoutTutorial,
  LOADOUT_TUTORIAL_STEPS,
  type LoadoutTutorialTarget,
} from '../data/loadoutTutorial'
import {
  ADAM_TUTORIAL_STEPS,
  type AdamTutorialTarget,
} from '../data/adamTutorial'
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

// b.stax / Patches feature toggle — flip back to true to re-enable.
const PATCHES_FEATURE_ENABLED = false

const B_STAX_NPC: NpcData = {
  id: 'b-stax',
  name: 'b.stax',
  x: 0,
  y: 0,
  lines: [],
  color: '#9b7ce8',
}

const PRELUDE_QUEST_NAME = "Midnight's Story"
const EPISODE_1_NAME = 'The Field & The Cafe'
const EPISODE_2_NAME = 'trust the signal'
/** Black hold on cutscene overlay after episode clip ends (ms). */
const EPISODE_CUTSCENE_POST_HOLD_MS = 4_000
/** Fade cutscene remnants to full black after post-clip hold (ms). */
const EPISODE_CUTSCENE_POST_FADE_TO_BLACK_MS = 1_500
/** World fade-in after episode title card exits (ms). */
const EPISODE_WORLD_REVEAL_FADE_MS = 1_600
const QUEST_START_TRANSITION_SESSION_KEY = 'aliworld:prelude-quest-start-shown'

const CAFE_SCENE_LINES = [
  'danny sits at the cafe. he does not look up.',
  "he is the most ordinary thing you've seen since spawning.",
  "you're here to destroy him. he doesn't notice you exist.",
] as const

type CafeFadePhase = 'none' | 'in' | 'scene' | 'out'

type MapTransitionTarget = {
  cityId: CityId
  x: number
  y: number
  facing?: 'down' | 'up' | 'left' | 'right'
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
  const [cultDarklinePhase, setCultDarklinePhase] = useState<CultTransitionMode | null>(null)
  const cultDarklinePhaseRef = useRef<CultTransitionMode | null>(null)
  cultDarklinePhaseRef.current = cultDarklinePhase
  const darklineExitTargetRef = useRef<CityId | 'close' | null>(null)
  const [cafeFade, setCafeFade] = useState<CafeFadePhase>('none')
  const [cafeSceneLine, setCafeSceneLine] = useState(0)
  const [cutscene, setCutscene] = useState<PlayCutsceneOptions | null>(null)
  const [cutsceneQuestHelperHidden, setCutsceneQuestHelperHidden] = useState(false)
  const pendingCafeVideoHandoffRef = useRef(false)
  const cafeVideoHandoffStartedRef = useRef(false)
  const pendingPostE1NarrationRef = useRef(false)
  const pendingGymLossLineRef = useRef(false)
  const pendingGymWelcomeRef = useRef(false)
  const crierHeraldStartedRef = useRef(false)
  const e2ClosingPhaseRef = useRef<'idle' | 'exit-interior' | 'mob' | 'cards'>('idle')
  const questTransitionRef = useRef<QuestTransitionHandle>(null)
  const [questTransitionActive, setQuestTransitionActive] = useState(false)
  const [episodeWorldReveal, setEpisodeWorldReveal] = useState<
    'visible' | 'hidden' | 'fade-in-pending' | 'fade-in'
  >('visible')

  const cutsceneFlowActive = cutscene != null
  const [dialogue, setDialogue] = useState<DialogueState | null>(null)
  const [patchPickerOpen, setPatchPickerOpen] = useState(false)
  const patchAwardContinueRef = useRef<(() => void) | null>(null)
  const [battleNpcId, setBattleNpcId] = useState<string | null>(null)
  const [battleWipePhase, setBattleWipePhase] = useState<BattleWipeMode | null>(null)
  const [battleReady, setBattleReady] = useState(false)
  const [battleRunItBack, setBattleRunItBack] = useState(false)
  const pendingBattleExitRef = useRef<{
    result: 'win' | 'lose' | 'draw'
    npcId: string | null
  } | null>(null)
  const startMenuBtnRef = useRef<HTMLButtonElement>(null)
  const interactBtnRef = useRef<HTMLButtonElement>(null)
  const scriptBtnRef = useRef<HTMLButtonElement>(null)
  const fannyPackBtnRef = useRef<HTMLButtonElement>(null)
  const [loadoutTutorialStep, setLoadoutTutorialStep] = useState<number | null>(null)
  const [adamTutorialStep, setAdamTutorialStep] = useState<number | null>(null)
  const [gymTrainerChoiceOpen, setGymTrainerChoiceOpen] = useState(false)
  const [gymHeadPulseDismissed, setGymHeadPulseDismissed] = useState(false)
  const [showFannyPack, setShowFannyPack] = useState(false)
  const [showLoadout, setShowLoadout] = useState(false)
  const [bugReportScreenshot, setBugReportScreenshot] = useState<string | null>(null)
  const [showBugReport, setShowBugReport] = useState(false)
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
  const [connectionToast, setConnectionToast] = useState<string | null>(null)
  const connectionToastTimerRef = useRef<number | null>(null)
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
    getQuest1Revision,
    getQuest1Revision,
  )
  const quest2Revision = useSyncExternalStore(
    subscribeQuest2Store,
    getQuest2Revision,
    getQuest2Revision,
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
  const mp3PlayerOwned = useSyncExternalStore(
    subscribeQuest1Store,
    () => getQuest1Snapshot().mp3PlayerOwned,
    () => getQuest1Snapshot().mp3PlayerOwned,
  )

  const darklineDestinations = useMemo((): CityId[] => {
    void quest1Revision
    void quest2Revision
    if (!isCafeSceneSeen()) return [...DARKLINE_DESTINATIONS]
    if (!E2_ENABLED) return [...DARKLINE_DESTINATIONS]
    const dest: CityId[] = [...DARKLINE_DESTINATIONS, POST_E1_DARKLINE_DESTINATION]
    if (isE2QuestUnlocked() && POST_E2_DARKLINE_DESTINATION !== POST_E1_DARKLINE_DESTINATION) {
      dest.push(POST_E2_DARKLINE_DESTINATION)
    }
    if (!isCrierSentAhead()) {
      return dest.filter((id) => id !== 'southside')
    }
    return dest
  }, [quest1Revision, quest2Revision])

  const darklineInactiveDestinations = useMemo(() => {
    void quest1Revision
    const inactive = [...INACTIVE_DESTINATIONS]
    if (isCafeSceneSeen() && !E2_ENABLED) {
      return [{ label: 'southside', status: 'SOON' }, ...inactive]
    }
    return inactive
  }, [quest1Revision])

  const gymRevision = useSyncExternalStore(subscribeGymStore, getGymRevision, getGymRevision)

  const questPulseDescriptor = useMemo(() => {
    void artifactRevision
    void quest1Revision
    void quest2Revision
    void worldRevision
    return resolveActiveQuestPulseDescriptor(buildQuestObjectiveContext())
  }, [artifactRevision, quest1Revision, quest2Revision, worldRevision])

  const gymDoorPulseDescriptor = useMemo((): QuestPulseTargetDescriptor | null => {
    void gymRevision
    void quest1Revision
    if (currentCity !== 'five') return null
    if (!E2_ENABLED && isE1ArcComplete(buildQuestObjectiveContext())) {
      if (isGym5ive1Cleared() || isOceanviewGymVisited()) return null
      return { kind: 'zone', action: 'OPEN_OCEANVIEW_GYM' }
    }
    return null
  }, [currentCity, gymRevision, quest1Revision])

  const gymHeadPulseDescriptor = useMemo((): QuestPulseTargetDescriptor | null => {
    void gymRevision
    if (currentCity !== 'five-gym-interior') return null
    if (isGym5ive1Cleared() || gymHeadPulseDismissed) return null
    return { kind: 'npc', id: FIVE_GYM1_ID }
  }, [currentCity, gymHeadPulseDismissed, gymRevision])

  const activePulseDescriptor =
    gymHeadPulseDescriptor ?? gymDoorPulseDescriptor ?? questPulseDescriptor

  useEffect(() => {
    if (currentCity === 'five-gym-interior') {
      setGymHeadPulseDismissed(isGym5ive1Cleared())
    } else {
      setGymHeadPulseDismissed(false)
    }
  }, [currentCity, gymRevision])

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
      const fiveCfg = CITY_CONFIGS.five
      const pos = resolveSavedWorldPosition('five', fiveCfg.spawnX, fiveCfg.spawnY)
      pendingRestoreRef.current = { city: 'five', x: pos.x, y: pos.y }
      setCurrentCity('five')
      setBootCityId('five')
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

  const showQuestTransition = useCallback((params: ShowQuestTransitionParams) => {
    setQuestTransitionActive(true)
    const wrapped: ShowQuestTransitionParams = {
      ...params,
      onComplete: () => {
        setQuestTransitionActive(false)
        params.onComplete?.()
      },
    }

    const run = (attempt = 0) => {
      if (questTransitionRef.current) {
        questTransitionRef.current.showTransition(wrapped)
        return
      }
      if (attempt < 30) {
        window.requestAnimationFrame(() => run(attempt + 1))
        return
      }
      console.warn('[quest transition] ref unavailable — skipping overlay')
      setQuestTransitionActive(false)
      wrapped.onComplete?.()
    }
    run()
  }, [])

  const handleWorldEntryComplete = useCallback(() => {
    const finishEntry = () => setWorldEntryActive(false)
    try {
      if (sessionStorage.getItem(QUEST_START_TRANSITION_SESSION_KEY) === '1') {
        finishEntry()
        return
      }
      sessionStorage.setItem(QUEST_START_TRANSITION_SESSION_KEY, '1')
    } catch {
      finishEntry()
      return
    }
    showQuestTransition({
      questName: PRELUDE_QUEST_NAME,
      type: 'quest_start',
      onComplete: finishEntry,
    })
  }, [showQuestTransition])

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
          npcs = npcs.filter((npc) => npc.id !== WALKER_NPC_ID)
          npcs = [...npcs, CROWD_1_NPC, CROWD_2_NPC]
          if (isWalkerConverted()) {
            npcs = [...npcs, WALKER_E2_CROWD_NPC]
          }
        }
        if (!isCrierConverted()) {
          npcs = [...npcs, TOWN_CRIER_NPC]
        }
      }
      return { ...baseCityConfig, npcs }
    }
    if (currentCity === 'southside') {
      let npcs = [...baseCityConfig.npcs]
      if (isRestockerDefeated() && !isE2Complete() && !isE2ClosingCrowdDismissed()) {
        npcs = [...npcs, ...E2_CLOSING_MOB_NPCS]
      }
      return { ...baseCityConfig, npcs }
    }
    if (currentCity === 'blue-store-interior') {
      let npcs = [...baseCityConfig.npcs]
      if (!isClerkConverted()) {
        npcs = npcs.filter((npc) => npc.id !== RESTOCKER_NPC_ID)
      }
      if (isClerkConverted()) {
        npcs = npcs.filter((npc) => npc.id !== CLERK_NPC_ID)
      }
      return { ...baseCityConfig, npcs }
    }
    return baseCityConfig
  }, [baseCityConfig, currentCity, markDefeated, quest2Revision])

  const canOpenStartMenu = useCallback(() => {
    const tutorialMenuException = allowsStartMenuDuringLoadoutTutorial(loadoutTutorialStep)
    const blockers = {
      loadoutTutorialStep,
      tutorialMenuException,
      worldEntryActive,
      battleNpcId: !!battleNpcId,
      battleWipePhase: !!battleWipePhase,
      menuTransition: !!menuTransition,
      mapTransition: !!mapTransition,
      mapTransitionPending,
      cultDarklinePhase: !!cultDarklinePhase,
      dialogue: !!dialogue,
      cutsceneFlowActive,
      questTransitionActive,
    }
    if (tutorialMenuException) {
      console.log('[tutorial-start] canOpenStartMenu: true (tutorial menu exception)', blockers)
      return true
    }
    const ok =
      !worldEntryActive &&
      !battleNpcId &&
      !battleWipePhase &&
      !menuTransition &&
      !mapTransition &&
      !mapTransitionPending &&
      !cultDarklinePhase &&
      !dialogue &&
      !cutsceneFlowActive &&
      !questTransitionActive
    if (!ok) {
      console.log('[tutorial-start] canOpenStartMenu: false', blockers)
    }
    return ok
  }, [
    loadoutTutorialStep,
    worldEntryActive,
    battleNpcId,
    battleWipePhase,
    menuTransition,
    mapTransition,
    mapTransitionPending,
    cultDarklinePhase,
    dialogue,
    cutsceneFlowActive,
    questTransitionActive,
  ])

  const beginMenuTransition = useCallback((target: MenuTransitionTarget) => {
    menuTransitionRef.current = target
    setMenuTransition(target)
  }, [])

  const cancelMapTransition = useCallback(() => {
    mapTransitionRef.current = null
    setMapTransition(null)
    setMapTransitionReady(false)
    setMapTransitionPending(false)
  }, [])

  const showConnectionToast = useCallback((message: string) => {
    if (connectionToastTimerRef.current != null) {
      window.clearTimeout(connectionToastTimerRef.current)
    }
    setConnectionToast(message)
    connectionToastTimerRef.current = window.setTimeout(() => {
      setConnectionToast(null)
      connectionToastTimerRef.current = null
    }, 3200)
  }, [])

  const beginMapTransition = useCallback(
    (
      cityId: CityId,
      x: number,
      y: number,
      facing?: MapTransitionTarget['facing'],
    ) => {
      if (mapTransitionRef.current || mapTransitionPending) return
      const target: MapTransitionTarget = { cityId, x, y, facing }
      mapTransitionRef.current = target
      setMapTransitionPending(true)
      setMapTransitionReady(false)
      setMapTransition(target)
      void preloadWorldEntry(CITY_CONFIGS[cityId], selectedMidnightVariant)
        .then(() => {
          if (mapTransitionRef.current !== target) return
          setMapTransitionReady(true)
        })
        .catch((err) => {
          console.error(
            '[map transition preload]',
            err instanceof Error ? err.message : String(err),
          )
          cancelMapTransition()
          showConnectionToast('connection hiccup. try that door again.')
        })
    },
    [
      cancelMapTransition,
      mapTransitionPending,
      selectedMidnightVariant,
      showConnectionToast,
    ],
  )

  const handleMapTransitionMidpoint = useCallback(() => {
    const target = mapTransitionRef.current
    if (!target) return
    if (target.cityId === 'five-gym-interior' && !isOceanviewGymVisited()) {
      setOceanviewGymVisited()
      pendingGymWelcomeRef.current = true
    }
    if (target.cityId === 'southside') {
      markCityVisited('southside')
    }
    setCurrentCity(target.cityId)
    playerRef.current?.setPosition(target.x, target.y)
    if (target.facing) {
      playerRef.current?.setFacing(target.facing)
    }
    if (target.cityId !== 'blue-store-interior') {
      setLastLocation(target.cityId, target.x, target.y)
    }
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
    console.log('[tutorial-start] toggleStartMenu enter', {
      loadoutTutorialStep,
      showStartMenu,
      menuTransition: !!menuTransition,
      menuReturnPending,
      showFannyPack,
      showLoadout,
    })
    if (menuTransition) {
      console.log('[tutorial-start] toggleStartMenu guard: menuTransition')
      return
    }
    if (showStartMenu) {
      console.log('[tutorial-start] toggleStartMenu guard: already open → resume')
      resumeFromPauseMenu()
      return
    }
    if (menuReturnPending && (showFannyPack || showLoadout)) {
      console.log('[tutorial-start] toggleStartMenu guard: menuReturnPending → resume transition')
      beginResumeTransition()
      return
    }
    if (!canOpenStartMenu()) {
      console.log('[tutorial-start] toggleStartMenu guard: canOpenStartMenu false')
      return
    }
    console.log('[tutorial-start] toggleStartMenu opening start menu')
    setShowStartMenu(true)
  }, [
    loadoutTutorialStep,
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
    if (showFannyPack) {
      if (menuReturnPending) {
        beginResumeTransition()
      } else {
        setShowFannyPack(false)
      }
      return
    }
    setMenuReturnPending(false)
    setShowFannyPack(true)
  }, [
    beginResumeTransition,
    menuReturnPending,
    menuTransition,
    showFannyPack,
    showStartMenu,
    worldEntryActive,
  ])

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
      if (battleNpcId || battleWipePhase || menuTransition) {
        console.log('[tutorial-start] Escape guard: battle or menuTransition', {
          battleNpcId: !!battleNpcId,
          battleWipePhase: !!battleWipePhase,
          menuTransition: !!menuTransition,
        })
        return
      }
      e.preventDefault()
      if (showStartMenu) {
        console.log('[tutorial-start] Escape guard: closing start menu')
        setShowStartMenu(false)
        return
      }
      if (!canOpenStartMenu()) {
        console.log('[tutorial-start] Escape guard: canOpenStartMenu false')
        return
      }
      console.log('[tutorial-start] Escape opening start menu')
      setShowStartMenu(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    battleWipePhase,
    battleNpcId,
    beginResumeTransition,
    canOpenStartMenu,
    loadoutTutorialStep,
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

  // Advance adam tutorial from "open fanny pack" step once the pack is open.
  useEffect(() => {
    if (adamTutorialStep === 0 && showFannyPack) {
      setAdamTutorialStep(1)
    }
  }, [adamTutorialStep, showFannyPack])

  const startNpcBattle = useCallback((npcId: string) => {
    if (battleNpcId || battleWipePhase) return
    setDialogue(null)
    setBattleReady(false)
    setBattleNpcId(npcId)
    setBattleWipePhase('enter')
  }, [battleNpcId, battleWipePhase])

  // ── DEV ONLY: K spawns the sparring dummy — REMOVE BEFORE LAUNCH ──
  const startDevSparBattle = useCallback(() => {
    if (battleNpcId || battleWipePhase) return
    setDialogue(null)
    setBattleReady(false)
    setBattleNpcId(DEV_SPAR_NPC_ID)
    setBattleWipePhase('enter')
    console.log('dev spar — remove before launch')
  }, [battleNpcId, battleWipePhase])

  // ── DEV ONLY: Shift+T replays the tutorial battle (walker + tutorial overlay) ──
  const startTutorialBattle = useCallback(() => {
    if (battleNpcId || battleWipePhase) return
    resetBattleTutorialSeen()
    setDialogue(null)
    setBattleReady(false)
    setBattleNpcId(WALKER_NPC_ID)
    setBattleWipePhase('enter')
    console.log('dev tutorial battle — walker fight with tutorial overlay')
  }, [battleNpcId, battleWipePhase])

  const canSpawnDevSpar = useCallback(() => {
    return (
      !worldEntryActive &&
      !battleNpcId &&
      !battleWipePhase &&
      !menuTransition &&
      !mapTransition &&
      !mapTransitionPending &&
      !cultDarklinePhase &&
      !dialogue &&
      !cutsceneFlowActive &&
      !questTransitionActive &&
      !showStartMenu &&
      !showLoadout &&
      !showFannyPack &&
      cafeFade !== 'scene'
    )
  }, [
    worldEntryActive,
    battleNpcId,
    battleWipePhase,
    menuTransition,
    mapTransition,
    mapTransitionPending,
    cultDarklinePhase,
    dialogue,
    cutsceneFlowActive,
    questTransitionActive,
    showStartMenu,
    showLoadout,
    showFannyPack,
    cafeFade,
  ])

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

  const playCrierHeraldDialogue = useCallback(() => {
    if (crierHeraldStartedRef.current || isCrierSentAhead()) return
    crierHeraldStartedRef.current = true
    beginNpcDialogue(TOWN_CRIER_NPC, {
      onComplete: () => {
        setCrierSentAhead()
      },
    })
  }, [beginNpcDialogue])

  const finishE2Episode = useCallback(() => {
    setE2Complete()
    e2ClosingPhaseRef.current = 'idle'
    track('episode_complete', { episode: 'e2' })
  }, [])

  const runE2ClosingEpisodeCards = useCallback(() => {
    if (isE2Complete() || e2ClosingPhaseRef.current === 'cards') return
    e2ClosingPhaseRef.current = 'cards'
    showQuestTransition({
      questName: PRELUDE_QUEST_NAME,
      episodeName: EPISODE_2_NAME,
      episodeNumber: 2,
      type: 'episode_complete',
      onComplete: () => {
        showQuestTransition({
          questName: QUEST_2_CLOSING_TEXT,
          type: 'quest_complete',
          onComplete: finishE2Episode,
        })
      },
    })
  }, [finishE2Episode, showQuestTransition])

  const runE2ClosingMobDialogue = useCallback(() => {
    if (isE2Complete() || e2ClosingPhaseRef.current === 'cards') return
    if (isE2ClosingCrowdDismissed()) {
      runE2ClosingEpisodeCards()
      return
    }
    e2ClosingPhaseRef.current = 'mob'
    beginNpcDialogue(E2_CLOSING_CRIER_NPC, {
      onComplete: () => {
        setE2ClosingCrowdDismissed()
        runE2ClosingEpisodeCards()
      },
    })
  }, [beginNpcDialogue, runE2ClosingEpisodeCards])

  const startE2ClosingExitInterior = useCallback(() => {
    if (isE2Complete()) return
    e2ClosingPhaseRef.current = 'exit-interior'
    showNarration(['a crowd is forming outside.'], () => {
      beginMapTransition(
        'southside',
        SOUTHSIDE_EXTERIOR_RETURN.x,
        SOUTHSIDE_EXTERIOR_RETURN.y,
      )
    })
  }, [beginMapTransition, showNarration])

  const showBStaxLines = useCallback((lines: string[], onComplete?: () => void) => {
    setDialogue({
      npc: B_STAX_NPC,
      lineIndex: 0,
      speakerLines: lines.map((text) => ({ speaker: 'b.stax', text })),
      onComplete,
    })
  }, [])

  /**
   * Award the patch tied to a Midnight's Story episode (1-based index), if it
   * hasn't been claimed yet. Plays a short b.stax handoff, lets the player
   * choose which skill the patch's xp goes to, then confirms the result.
   * Always calls `onDone` when finished (immediately if the patch was already
   * claimed or none remain).
   */
  const awardMidnightPatch = useCallback((episodeIndex: number, onDone: () => void) => {
    // b.stax / patches feature is hidden for now — skip straight through.
    if (!PATCHES_FEATURE_ENABLED) {
      onDone()
      return
    }
    if (isEpisodePatchAwarded(episodeIndex) || getAvailablePatchSkills().length === 0) {
      onDone()
      return
    }
    showBStaxLines(
      [
        "yo — that's a wrap. you earned a patch for the jacket.",
        "pick a skill. this patch's xp goes straight into it.",
      ],
      () => {
        patchAwardContinueRef.current = onDone
        setPatchPickerOpen(true)
      },
    )
  }, [showBStaxLines])

  const handlePatchSkillPicked = useCallback((skill: SkillId) => {
    setPatchPickerOpen(false)
    const result = awardPatch(skill)
    const onDone = patchAwardContinueRef.current
    patchAwardContinueRef.current = null
    const skillLabel = getSkillLabels().find((s) => s.id === skill)?.label ?? skill
    const xpLine = result
      ? `+${result.xp} ${skillLabel} xp. patch's on the jacket.`
      : "patch's on the jacket."
    showBStaxLines([xpLine], () => {
      onDone?.()
    })
  }, [showBStaxLines])

  const handleMapTransitionComplete = useCallback(() => {
    mapTransitionRef.current = null
    setMapTransition(null)
    setMapTransitionReady(false)
    setMapTransitionPending(false)
    if (pendingGymWelcomeRef.current) {
      pendingGymWelcomeRef.current = false
      showNarration([
        'welcome to the first gym. beat the leader in the gauntlet to win prizes.',
      ])
    }
    if (e2ClosingPhaseRef.current === 'exit-interior') {
      runE2ClosingMobDialogue()
    }
  }, [runE2ClosingMobDialogue, showNarration])

  const showMarkVictoryNarration = useCallback(() => {
    showNarration(["the darkline's open now. take it south."])
  }, [showNarration])

  const finishCafeScene = useCallback(() => {
    setCafeSceneSeen()
    track('episode_complete', { episode: 'e1' })
    setCafeFade('out')
  }, [])

  const runCafeVideoHandoffOnce = useCallback(() => {
    if (cafeVideoHandoffStartedRef.current) {
      pendingPostE1NarrationRef.current = true
      finishCafeScene()
      return
    }
    cafeVideoHandoffStartedRef.current = true
    setCutsceneQuestHelperHidden(false)
    setCurrentCity('five')
    markCityVisited('five')
    const fiveCfg = CITY_CONFIGS.five
    playerRef.current?.setPosition(fiveCfg.spawnX, fiveCfg.spawnY)
    setLastLocation('five', fiveCfg.spawnX, fiveCfg.spawnY)
    setEpisodeWorldReveal('hidden')
    showQuestTransition({
      questName: PRELUDE_QUEST_NAME,
      episodeName: EPISODE_2_NAME,
      episodeNumber: 2,
      type: 'episode_start',
      solidBlackBackdrop: true,
      onExitFadeStart: () => {
        setEpisodeWorldReveal('fade-in-pending')
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setEpisodeWorldReveal('fade-in'))
        })
      },
      onComplete: () => {
        setEpisodeWorldReveal('visible')
        pendingPostE1NarrationRef.current = true
        finishCafeScene()
      },
    })
  }, [finishCafeScene, showQuestTransition])

  const completeQuest1AfterCafe = useCallback(() => {
    runCafeVideoHandoffOnce()
  }, [runCafeVideoHandoffOnce])

  const playCutscene = useCallback((opts: PlayCutsceneOptions) => {
    setCutsceneQuestHelperHidden(true)
    const { isEpisodeCutscene, onComplete: userOnComplete, ...rest } = opts
    const holdMs = isEpisodeCutscene ? EPISODE_CUTSCENE_POST_HOLD_MS : 0
    setCutscene({
      ...rest,
      postCompleteHoldMs: holdMs > 0 ? holdMs : undefined,
      postCompleteFadeToBlackMs: isEpisodeCutscene
        ? EPISODE_CUTSCENE_POST_FADE_TO_BLACK_MS
        : undefined,
      onComplete: () => {
        if (isEpisodeCutscene) {
          setE1CutscenePlayed()
          pendingCafeVideoHandoffRef.current = true
          return
        }
        setCutsceneQuestHelperHidden(false)
        userOnComplete?.()
      },
    })
  }, [])

  const handleCutsceneEnded = useCallback(() => {
    setCutscene(null)
    if (!pendingCafeVideoHandoffRef.current) return
    pendingCafeVideoHandoffRef.current = false
    awardMidnightPatch(1, runCafeVideoHandoffOnce)
  }, [awardMidnightPatch, runCafeVideoHandoffOnce])

  const canPlayDevCutscene = useCallback(() => {
    return (
      !introPending &&
      !introActive &&
      !worldEntryActive &&
      !questTransitionActive &&
      !cultDarklinePhase
    )
  }, [
    introPending,
    introActive,
    worldEntryActive,
    questTransitionActive,
    cultDarklinePhase,
  ])

  const devModeUi = useDevControls({
    playerRef,
    playCutscene,
    canPlayCutscene: canPlayDevCutscene,
    canToggleDevMode: canSpawnDevSpar,
    spawnDevSpar: startDevSparBattle,
    canSpawnDevSpar,
    startTutorialBattle,
  })

  useEffect(() => {
    if (cafeFade === 'none') return
    if (cafeFade === 'in') {
      preloadYouTubeIframeApi()
      const t = window.setTimeout(() => {
        setCafeSceneLine(0)
        setCafeFade('scene')
      }, 400)
      return () => window.clearTimeout(t)
    }
    if (cafeFade === 'out') {
      const t = window.setTimeout(() => {
        setCafeFade('none')
        if (pendingPostE1NarrationRef.current) {
          pendingPostE1NarrationRef.current = false
          showNarration(["word is there's a gym opening in the 5ive. get your weight up."])
        }
      }, 400)
      return () => window.clearTimeout(t)
    }
  }, [cafeFade, showNarration])

  const advanceCafeScene = useCallback(() => {
    if (cutsceneFlowActive || questTransitionActive) return
    if (cafeFade !== 'scene') return
    preloadYouTubeIframeApi()
    const next = cafeSceneLine + 1
    if (next >= CAFE_SCENE_LINES.length) {
      if (!isE1CutscenePlayed()) {
        playCutscene({
          videoId: '6t83Cdmq1fM',
          startSeconds: 112,
          endSeconds: 204,
          isEpisodeCutscene: true,
          captions: EPISODE_1_CAPTIONS,
          onComplete: () => {
            setE1CutscenePlayed()
            completeQuest1AfterCafe()
          },
        })
        return
      }
      completeQuest1AfterCafe()
      return
    }
    setCafeSceneLine(next)
  }, [
    cafeFade,
    cafeSceneLine,
    cutsceneFlowActive,
    questTransitionActive,
    completeQuest1AfterCafe,
    playCutscene,
  ])

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
        if (cultDarklinePhase) return
        if (isMarkDefeated()) {
          setCultDarklinePhase('enter')
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
        preloadYouTubeIframeApi()
        setCafeFade('in')
      } else if (action === 'OPEN_BLUE_STORE') {
        if (currentCity !== 'southside') return
        if (mapTransitionRef.current) return
        if (!isCrierSentAhead()) {
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
          'southside',
          SOUTHSIDE_EXTERIOR_RETURN.x,
          SOUTHSIDE_EXTERIOR_RETURN.y,
        )
      } else if (action === 'OPEN_OCEANVIEW_GYM') {
        if (currentCity !== 'five') return
        if (mapTransitionRef.current) return
        const interior = CITY_CONFIGS['five-gym-interior']
        beginMapTransition('five-gym-interior', interior.spawnX, interior.spawnY, 'up')
      } else if (action === 'OPEN_OCEANVIEW_GYM_EXIT') {
        if (currentCity !== 'five-gym-interior') return
        if (mapTransitionRef.current) return
        beginMapTransition(
          'five',
          FIVE_GYM_EXTERIOR_RETURN.x,
          FIVE_GYM_EXTERIOR_RETURN.y,
          'down',
        )
      }
    },
    [
      beginMapTransition,
      cafeFade,
      canApproachMark,
      cultDarklinePhase,
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
    const config = CITY_CONFIGS[currentCity]
    if (currentCity === 'five') {
      playerRef.current?.setPosition(config.spawnX, config.spawnY)
      setLastLocation(currentCity, config.spawnX, config.spawnY)
      return
    }
    playerRef.current?.setPosition(config.darklineSpawnX, config.darklineSpawnY)
    setLastLocation(currentCity, config.darklineSpawnX, config.darklineSpawnY)
  }, [currentCity])

  const handleDarklineTravel = useCallback(
    (destination: CityId) => {
      setCurrentCity(destination)
      markCityVisited(destination)
      const destConfig = CITY_CONFIGS[destination]
      playerRef.current?.setPosition(destConfig.spawnX, destConfig.spawnY)
      setLastLocation(destination, destConfig.spawnX, destConfig.spawnY)
    },
    [showQuestTransition],
  )

  const handleDarklineBeginExit = useCallback((destination: CityId | null) => {
    darklineExitTargetRef.current = destination ?? 'close'
    setCultDarklinePhase('exit')
  }, [])

  const handleCultDarklineMidpoint = useCallback(() => {
    const phase = cultDarklinePhaseRef.current
    if (phase === 'enter') {
      setShowDarkline(true)
      return
    }
    if (phase === 'exit') {
      setShowDarkline(false)
      const target = darklineExitTargetRef.current
      if (target === 'close') {
        handleDarklineClose()
      } else if (target) {
        handleDarklineTravel(target)
      }
      darklineExitTargetRef.current = null
    }
  }, [handleDarklineClose, handleDarklineTravel])

  const handleCultDarklineComplete = useCallback(() => {
    const phase = cultDarklinePhaseRef.current
    setCultDarklinePhase(null)
    // Enter: keep darkline open for destination pick. Exit: midpoint already dismissed it.
    if (phase === 'exit') {
      setShowDarkline(false)
      darklineExitTargetRef.current = null
    }
  }, [])

  const completeAdamMp3Handoff = useCallback(() => {
    if (hasArtifact(ADAM_MP3_ARTIFACT_ID)) return
    collectArtifact(ADAM_MP3_ARTIFACT_ID)
    setMp3PlayerOwned()
    grantMusicPlayerFromAdam(`city:${currentCity}`)
    setAdamTutorialStep(0)
  }, [currentCity])

  const advanceDialogue = useCallback(() => {
    let adamHandoff = false
    setDialogue((prev) => {
      if (!prev) return null
      const next = prev.lineIndex + 1
      if (next >= prev.speakerLines.length) {
        const onComplete = prev.onComplete
        if (isAdamNpcId(prev.npc.id)) {
          adamHandoff = true
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
    if (adamHandoff) completeAdamMp3Handoff()
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

    if (nearbyId === 'walker-crowd') {
      beginNpcDialogue(WALKER_E2_CROWD_NPC)
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
        if (!isCrierSentAhead()) {
          playCrierHeraldDialogue()
        }
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
      if (currentCity !== 'blue-store-interior') return
      if (!isCrierSentAhead()) {
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
      if (currentCity !== 'blue-store-interior') return
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

    if (nearbyId === FIVE_GYM1_ID) {
      setGymHeadPulseDismissed(true)
      beginNpcDialogue(FIVE_GYM1_HEAD_NPC, {
        onComplete: () => setGymTrainerChoiceOpen(true),
      })
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
    playCrierHeraldDialogue,
  ])

  const handleInteract = useCallback(() => {
    if (worldEntryActive) return
    if (adamTutorialStep != null) return
    if (blocksWorldInteractDuringLoadoutTutorial(loadoutTutorialStep)) return
    if (cutsceneFlowActive || questTransitionActive) return
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
    loadoutTutorialStep,
    advanceCafeScene,
    cafeFade,
    cutsceneFlowActive,
    questTransitionActive,
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
    if (cutsceneFlowActive || questTransitionActive) return
    if (adamTutorialStep != null) return
    if (blocksWorldInteractDuringLoadoutTutorial(loadoutTutorialStep)) return
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
  }, [
    loadoutTutorialStep,
    advanceCafeScene,
    cafeFade,
    cutscene,
    questTransitionActive,
    dialogue,
    advanceDialogue,
    openNearbyNpcDialogue,
    showStartMenu,
  ])

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
      if (cutsceneFlowActive || questTransitionActive) return
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
    cutsceneFlowActive,
    questTransitionActive,
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
    if (!isMusicEnabled()) return

    let cancelled = false

    void (async () => {
      await whenAccountHydrated()
      if (cancelled) return

      if (cutscene != null) {
        syncMusicForContext('cutscene')
        return
      }
      if (battleNpcId) {
        syncMusicForContext(`battle:${battleNpcId}`)
        return
      }
      if (!locationReady || worldEntryActive) return

      const context =
        currentCity === 'five-gym-interior' ? 'gym' : `city:${currentCity}`
      syncMusicForContext(context)
    })()

    return () => {
      cancelled = true
    }
  }, [
    battleNpcId,
    currentCity,
    cutscene,
    locationReady,
    mp3PlayerOwned,
    worldEntryActive,
  ])

  useEffect(() => {
    if (hasArtifact('subway-pass') && !isMarkDefeated()) {
      setMarkDefeated()
    }
  }, [])

  useEffect(() => {
    if (!isE2QuestUnlocked()) return
    if (!isCrierConverted() || isCrierSentAhead()) return
    if (cutsceneFlowActive || questTransitionActive || dialogue || battleNpcId || battleWipePhase) {
      return
    }
    playCrierHeraldDialogue()
  }, [
    battleNpcId,
    battleWipePhase,
    cutsceneFlowActive,
    dialogue,
    playCrierHeraldDialogue,
    quest2Revision,
    questTransitionActive,
  ])

  useEffect(() => {
    if (!isRestockerDefeated() || isE2Complete()) return
    if (cutsceneFlowActive || questTransitionActive || dialogue || battleNpcId || battleWipePhase) {
      return
    }
    if (mapTransitionPending || mapTransition) return
    if (showDarkline || cultDarklinePhase === 'enter') return
    if (e2ClosingPhaseRef.current !== 'idle') return
    if (currentCity === 'blue-store-interior') {
      startE2ClosingExitInterior()
    } else if (currentCity === 'southside') {
      runE2ClosingMobDialogue()
    }
  }, [
    battleNpcId,
    battleWipePhase,
    cultDarklinePhase,
    currentCity,
    cutsceneFlowActive,
    dialogue,
    mapTransition,
    mapTransitionPending,
    quest2Revision,
    questTransitionActive,
    runE2ClosingMobDialogue,
    showDarkline,
    startE2ClosingExitInterior,
  ])

  const handleBattleEntryMidpoint = useCallback(() => {
    setBattleReady(true)
  }, [])

  const handleBattleEntryComplete = useCallback(() => {
    setBattleWipePhase(null)
  }, [])

  const handleBattleExitMidpoint = useCallback(() => {
    setBattleReady(false)
  }, [])

  const finishAdamTutorial = useCallback(() => {
    setAdamTutorialStep(null)
  }, [])

  const advanceAdamTutorial = useCallback(() => {
    setAdamTutorialStep((step) => {
      if (step == null) return step
      if (step >= ADAM_TUTORIAL_STEPS.length - 1) {
        finishAdamTutorial()
        return null
      }
      return step + 1
    })
  }, [finishAdamTutorial])

  const finishLoadoutTutorial = useCallback(() => {
    setLoadoutTutorialStep(null)
    setTutorialPhase2Seen()
  }, [])

  const advanceLoadoutTutorial = useCallback(() => {
    setLoadoutTutorialStep((step) => {
      if (step == null) return step
      if (step >= LOADOUT_TUTORIAL_STEPS.length - 1) {
        finishLoadoutTutorial()
        return null
      }
      return step + 1
    })
  }, [finishLoadoutTutorial])

  const skipLoadoutTutorial = useCallback(() => {
    finishLoadoutTutorial()
  }, [finishLoadoutTutorial])

  const handleBattleExitComplete = useCallback(() => {
    const exit = pendingBattleExitRef.current
    pendingBattleExitRef.current = null

    // Draw → restart same battle in "Run it back!" mode
    if (exit?.result === 'draw' && exit.npcId) {
      setBattleRunItBack(true)
      setBattleReady(false)       // unmount current BattleScreen
      setBattleWipePhase('enter') // start entry wipe for rematch
      reportCurrentLocation()
      return
    }

    setBattleRunItBack(false)
    setBattleNpcId(null)
    setBattleReady(false)
    setBattleWipePhase(null)
    reportCurrentLocation()

    if (pendingGymLossLineRef.current) {
      pendingGymLossLineRef.current = false
      showNotYetDialogue(FIVE_GYM1_HEAD_NPC, "come back when you're ready.")
    }

    const startPhase2Tutorial = () => {
      if (isBattleTutorialSeen() && !isTutorialPhase2Seen()) {
        setLoadoutTutorialStep(0)
      }
    }

    if (exit?.result === 'win' && exit.npcId === TOWN_CRIER_NPC_ID && !isCrierSentAhead()) {
      playCrierHeraldDialogue()
    }

    if (exit?.result === 'win' && exit.npcId === RESTOCKER_NPC_ID && !isE2Complete()) {
      startE2ClosingExitInterior()
      return
    }

    if (exit?.result === 'win' && exit.npcId === WALKER_NPC_ID) {
      if (!isEpisode1TitleCardSeen()) {
        showQuestTransition({
          questName: PRELUDE_QUEST_NAME,
          episodeName: EPISODE_1_NAME,
          episodeNumber: 1,
          type: 'episode_start',
          onComplete: () => {
            setEpisode1TitleCardSeen()
            startPhase2Tutorial()
          },
        })
        return
      }
      startPhase2Tutorial()
    }
  }, [
    playCrierHeraldDialogue,
    reportCurrentLocation,
    showNotYetDialogue,
    showQuestTransition,
    startE2ClosingExitInterior,
  ])

  const handleWinPayoff = useCallback((npcId: string) => {
    if (isDevSparNpcId(npcId)) return
    if (npcId === WALKER_NPC_ID) {
      setWalkerConverted()
      track('npc_converted', { npcId: WALKER_NPC_ID })
    }
    if (npcId === JACLYN_NPC_ID) {
      setJaclynConverted()
      track('npc_converted', { npcId: JACLYN_NPC_ID })
    }
    if (npcId === MARK_NPC_ID) {
      setMarkDefeated()
      collectArtifact('subway-pass')
      track('npc_converted', { npcId: MARK_NPC_ID })
    }
    if (npcId === TOWN_CRIER_NPC_ID) {
      setCrierConverted()
      track('npc_converted', { npcId: TOWN_CRIER_NPC_ID })
    }
    if (npcId === CLERK_NPC_ID) {
      setClerkConverted()
      track('npc_converted', { npcId: CLERK_NPC_ID })
    }
    if (npcId === RESTOCKER_NPC_ID) {
      setRestockerDefeated()
      track('npc_converted', { npcId: RESTOCKER_NPC_ID })
    }
    if (npcId === FIVE_GYM1_ID) {
      recordGym5ive1Win()
    }
  }, [])

  const handleBattleEnd = useCallback(
    (result: 'win' | 'lose' | 'draw', turns: number) => {
      const safeTurns = Number.isFinite(turns) && turns >= 0 ? turns : 0
      const isDevSpar = battleNpcId != null && isDevSparNpcId(battleNpcId)
      if (battleNpcId && !isDevSpar) {
        track('battle_end', { enemyId: battleNpcId, result, turns: safeTurns })
      }
      if (result === 'win' && !isDevSpar) {
        if (battleNpcId === MARK_NPC_ID) {
          showMarkVictoryNarration()
        }
      }
      if (result === 'lose' && battleNpcId === FIVE_GYM1_ID) {
        pendingGymLossLineRef.current = true
      }
      pendingBattleExitRef.current = { result, npcId: battleNpcId }
      setBattleWipePhase('exit')
    },
    [battleNpcId, showMarkVictoryNarration],
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
    if (showLoadout) {
      handleLoadoutClose()
      return
    }
    setShowLoadout(true)
    // Script button tap completes the waitForAction step.
    if (loadoutTutorialStep === 1) {
      setLoadoutTutorialStep(2)
    }
  }, [handleLoadoutClose, loadoutTutorialStep, showLoadout, showStartMenu, worldEntryActive])

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
        case 'report-bug': {
          // Capture the game canvas before the modal renders over it
          const canvas = document.querySelector('canvas')
          const shot = canvas ? canvas.toDataURL('image/jpeg', 0.6) : null
          setBugReportScreenshot(shot)
          setShowBugReport(true)
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
    [beginMenuEntryTransition, currentCity, loadoutTutorialStep, resumeFromPauseMenu],
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
    setLoadoutTutorialStep(null)
    setShowDarkline(false)
    setCultDarklinePhase(null)
    darklineExitTargetRef.current = null
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
    !cultDarklinePhase &&
    !showInterior &&
    !cutsceneQuestHelperHidden

  const showQuestPulse = showQuestHelper && cafeFade === 'none'
  const showActiveQuestPulse =
    showQuestPulse ||
    gymHeadPulseDescriptor != null ||
    gymDoorPulseDescriptor != null

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
    !cutsceneFlowActive &&
    !questTransitionActive &&
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
        {introPending ? (
          <div className="app-loading" aria-live="polite" aria-busy="true">
            loading world…
          </div>
        ) : (
          <IntroNarrationScreen onComplete={handleIntroComplete} />
        )}
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
        startButtonRef={startMenuBtnRef}
        interactButtonRef={interactBtnRef}
        scriptButtonRef={scriptBtnRef}
        fannyPackButtonRef={fannyPackBtnRef}
      >
        <div
          className={`game-screen-play${
            battleWipePhase ? ' game-screen-play--battle-wipe' : ''
          }${menuTransition || mapTransition || mapTransitionPending ? ' game-screen-play--menu-transition' : ''}${
            worldEntryActive ? ' game-screen-play--world-entry' : ''
          }`}
          onClick={handlePlayAreaClick}
        >
          <div
            className={`game-screen-play__world${
              episodeWorldReveal === 'hidden' || episodeWorldReveal === 'fade-in-pending'
                ? ' game-screen-play__world--episode-hidden'
                : ''
            }${episodeWorldReveal === 'fade-in' ? ' game-screen-play__world--episode-fade-in' : ''}`}
            style={
              episodeWorldReveal === 'fade-in'
                ? {
                    ['--episode-world-reveal-ms' as string]: `${EPISODE_WORLD_REVEAL_FADE_MS}ms`,
                  }
                : undefined
            }
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
          <GameCanvas debugHudId={showDebug ? GAME_DEBUG_HUD_ID : undefined}>
            <Player
              ref={playerRef}
              cityConfig={cityConfig}
              onTrigger={handleTrigger}
              onTriggerExit={handleExitTrigger}
              dialogueActive={
                !!dialogue ||
                worldEntryActive ||
                !!battleWipePhase ||
                cultDarklinePhase === 'enter' ||
                showDarkline ||
                !!menuTransition ||
                !!mapTransition ||
                mapTransitionPending ||
                showFannyPack ||
                showLoadout ||
                showStartMenu ||
                cutsceneFlowActive ||
                questTransitionActive
              }
              dialogueNpcId={dialogue?.npc.id ?? null}
              questPulseDescriptor={activePulseDescriptor}
              showQuestPulse={showActiveQuestPulse}
            />
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
              inactiveDestinations={darklineInactiveDestinations}
              onBeginExit={handleDarklineBeginExit}
            />
          )}
          {cultDarklinePhase && (
            <CultTransition
              key={cultDarklinePhase}
              mode={cultDarklinePhase}
              onMidpoint={handleCultDarklineMidpoint}
              onComplete={handleCultDarklineComplete}
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
          {cafeFade === 'scene' && !cutsceneFlowActive && !questTransitionActive && (
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
            {battleWipePhase === 'enter' && (
              <div className="game-screen-battle-world-fade" aria-hidden />
            )}
            {battleNpcId && battleReady && (
              <BattleScreen
                key={`${battleNpcId}-${battleRunItBack ? 'rib' : 'normal'}`}
                npcId={battleNpcId}
                battleRevealed={!battleWipePhase}
                onBattleEnd={handleBattleEnd}
                onWinPayoff={handleWinPayoff}
                runItBack={battleRunItBack}
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
          {connectionToast ? (
            <p className="game-screen-connection-toast" role="status" aria-live="polite">
              {connectionToast}
            </p>
          ) : null}
          {devModeUi}
          {showFannyPack && <FannyPackScreen onClose={handleFannyPackClose} />}
          {showBugReport && (
            <BugReportScreen
              screenshot={bugReportScreenshot}
              onClose={() => setShowBugReport(false)}
            />
          )}
          {showStartMenu && <div className="game-screen-pause-scrim" aria-hidden />}
          {showStartMenu && (
            <StartMenuScreen
              ref={startMenuRef}
              onAction={handleStartMenuAction}
              onConfirmNewGame={handleConfirmNewGame}
            />
          )}
          {isAdamNpcId(dialogue?.npc.id) && dialogue?.lineIndex === 0 ? (
            <ButtonSpotlightRing targetRef={interactBtnRef} />
          ) : null}
          {adamTutorialStep != null ? (
            <GuidedTutorialOverlay<AdamTutorialTarget>
              ariaLabel="Adam tutorial"
              steps={ADAM_TUTORIAL_STEPS}
              stepIndex={adamTutorialStep}
              targetRefs={{ fanny_pack_button: fannyPackBtnRef }}
              elevated
              onNext={advanceAdamTutorial}
              onSkip={finishAdamTutorial}
            />
          ) : null}
          {loadoutTutorialStep != null &&
          loadoutTutorialStep <= 1 &&
          !showStartMenu &&
          !showLoadout ? (
            <GuidedTutorialOverlay<LoadoutTutorialTarget | 'none'>
              ariaLabel="Loadout tutorial"
              steps={LOADOUT_TUTORIAL_STEPS}
              stepIndex={loadoutTutorialStep}
              targetRefs={{
                menu_button: startMenuBtnRef,
                script_button: scriptBtnRef,
              }}
              elevated
              onNext={advanceLoadoutTutorial}
              onSkip={skipLoadoutTutorial}
            />
          ) : null}
          </div>
          {gymTrainerChoiceOpen && !battleNpcId && !dialogue ? (
            <div
              className="game-screen-gym-choice"
              role="dialog"
              aria-modal="true"
              aria-label="Trainer"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="game-screen-gym-choice__btn game-screen-gym-choice__btn--fight"
                onClick={() => {
                  setGymTrainerChoiceOpen(false)
                  startNpcBattle(FIVE_GYM1_ID)
                }}
              >
                fight
              </button>
              <button
                type="button"
                className="game-screen-gym-choice__btn"
                onClick={() => setGymTrainerChoiceOpen(false)}
              >
                not yet
              </button>
            </div>
          ) : null}
          {dialogue && !battleNpcId && cafeFade !== 'scene' && (
            <DialogueBox
              name={dialogue.speakerLines[dialogue.lineIndex]?.speaker ?? dialogue.npc.name}
              line={dialogue.speakerLines[dialogue.lineIndex]?.text ?? ''}
              onAdvance={advanceDialogue}
            />
          )}
          {PATCHES_FEATURE_ENABLED && patchPickerOpen && !battleNpcId && (
            <PatchSkillPicker
              xpAmount={getNextPatchXp()}
              skills={getSkillLabels().filter((skill) =>
                getAvailablePatchSkills().includes(skill.id),
              )}
              onPick={handlePatchSkillPicked}
            />
          )}
          {cutscene && (
            <CutsceneOverlay {...cutscene} onEnded={handleCutsceneEnded} />
          )}
          <QuestTransition ref={questTransitionRef} />
        </div>
          {showLoadout && (
            <LoadoutScreen
              onClose={handleLoadoutClose}
              loadoutTutorialStep={loadoutTutorialStep}
              onLoadoutTutorialNext={advanceLoadoutTutorial}
              onLoadoutTutorialSkip={skipLoadoutTutorial}
            />
          )}
      </GameShell>
    </div>
  )
}
