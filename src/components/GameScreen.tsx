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
import { OCEANVIEW_GYM_ENTRANCE_ZONE } from '../data/gymEntrance'
import { resolveDoorSpawn, DOOR_SPAWN_OFFSET } from '../data/doorSpawn'
import { BLUE_STORE_EXIT_ZONE } from '../data/blueStoreInteriorCollision'
import { FIVE_GYM_EXIT_ZONE } from '../data/gymInteriorCollision'
import {
  THEATER_EXIT_ZONE,
} from '../data/theaterInteriorCollision'
import { THEATER_ENTRANCE_ZONE } from '../data/theaterEntrance'
import { THEATER_ENABLED } from '../data/theaterPremieres'
import { refreshTheaterAttendance } from '../store/theaterStore'
import { SOUTHSIDE_ENTRANCE_ZONE } from '../data/southsideCollision'
import { E2_CLOSING_CRIER_NPC, E2_CLOSING_MOB_NPCS } from '../data/e2ClosingNpcs'
import {
  FIVE_GYM1_HEAD_NPC,
  FIVE_GYM1_ID,
} from '../data/gymNpcs'
import { DEV_SPAR_NPC_ID, isDevSparNpcId } from '../data/devSpar'
import { collectArtifact, getArtifactStoreSnapshot, hasArtifact, subscribeArtifactStore } from '../store/artifactStore'
import {
  getGymRevision,
  getActiveGymRun,
  getActiveGymRunCombatId,
  isCurrentWeeklyGymCleared,
  isOceanviewGymVisited,
  isWeeklyGauntletExplainerSeen,
  advanceGymRunAfterWin,
  clearActiveGymRun,
  recordWeeklyGymClear,
  resetGymRunOnLoss,
  setOceanviewGymVisited,
  setWeeklyGauntletExplainerSeen,
  refreshWeeklyGymCalendar,
  subscribeGymStore,
} from '../store/gymStore'
import {
  getCurrentGymWeek,
  getRetiredGymWeeks,
  gymRunProgressLabel,
  isGymGauntletCombatId,
} from '../data/gymWeeks'
import { isGymWeekScoringOpen } from '../data/gymWeekSchedule'
import { claimGymWeekReward } from '../lib/gymWeekRewardApi'
import { refreshPlayerGrants } from '../store/grantsStore'
import { resolveGymBattleOptions, restartWeeklyGymRun, startWeeklyGymRun } from '../lib/weeklyGymBattle'
import { resolveGhostBattleOptions } from '../lib/ghostTrainingBattle'
import { isGhostCombatId } from '../data/ghostCombat'
import { completeGhostBattle, refreshGhostTraining } from '../store/ghostTrainingStore'
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
  isXpTutorialSeen,
  setXpTutorialSeen,
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
  isE2CutscenePlayed,
  isRestockerDefeated,
  RESTOCKER_NPC_ID,
  setClerkConverted,
  setCrierConverted,
  setCrierSentAhead,
  setCrowdAddressed,
  setE2ClosingCrowdDismissed,
  setE2Complete,
  setE2CutscenePlayed,
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
import { BattleScreen, type BattleEndTelemetry } from './BattleScreen'
import { ArtifactAcquisitionToasts } from './ArtifactAcquisitionToast'
import { FannyPackScreen } from './FannyPackScreen'
import { GymLeaderboardScreen } from './GymLeaderboardScreen'
import { GhostTrainingScreen } from './GhostTrainingScreen'
import { TheaterScreen } from './TheaterScreen'
import { ShopScreen } from './ShopScreen'
import { GHOST_TRAINING_ENABLED } from '../config/ghostTrainingGate'
import { COSMETICS_SHOP_ENABLED } from '../config/printsGate'
import { LoadoutScreen } from './LoadoutScreen'
import { BattleEntryWipe, type BattleWipeMode } from './BattleEntryWipe'
import { MenuEntryCover, MENU_TRANSITION_MS, MENU_TRANSITION_MIDPOINT_MS, type MenuTransitionTarget } from './MenuEntryCover'
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
import { trackProgressEvent } from '../lib/analytics'
import type { CutsceneCompleteMeta, PlayCutsceneOptions } from '../lib/playCutscene'
import { preloadYouTubeIframeApi } from '../lib/youtubeIframeApi'
import { buildEpisodeCutsceneOptions } from '../data/episodeCutscenes'
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
import { getAuthState, signOut } from '../store/authStore'
import { QuestHelper } from './QuestHelper'
import {
  StartMenuScreen,
  type StartMenuAction,
  type StartMenuHandle,
} from './StartMenuScreen'
import { BugReportScreen } from './BugReportScreen'
import { IntroNarrationScreen } from './IntroNarrationScreen'
import { ButtonSpotlightRing, GuidedTutorialOverlay } from './GuidedTutorialOverlay'
import {
  allowsStartMenuDuringLoadoutTutorial,
  blocksWorldInteractDuringLoadoutTutorial,
  LOADOUT_TUTORIAL_STEPS,
  XP_TUTORIAL_START_STEP,
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

// b.stax / Patches feature toggle, flip back to true to re-enable.
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
const EPISODE_3_NAME = 'the happening'
/** Black hold on cutscene overlay after episode clip ends (ms). */
const EPISODE_CUTSCENE_POST_HOLD_MS = 5_000
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

const GYM_LEADERBOARD_DISMISSED_KEY = 'aliworld:gym-leaderboard-dismissed'

export function GameScreen() {
  const playerRef = useRef<PlayerHandle>(null)
  const [currentCity, setCurrentCity] = useState<CityId>('five')
  const prevCityRef = useRef<CityId | null>(null)
  const [showInterior, setShowInterior] = useState(false)
  const [showDarkline, setShowDarkline] = useState(false)
  const [darklineEnterTransition, setDarklineEnterTransition] = useState(false)
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
  const pendingE2VideoHandoffRef = useRef(false)
  const e2VideoHandoffStartedRef = useRef(false)
  const episodeHandoffTimerRef = useRef<number | null>(null)
  const devForceEpisodeTitleCardsRef = useRef(false)
  const [episodeCutsceneEnding, setEpisodeCutsceneEnding] = useState(false)
  const pendingPostE1NarrationRef = useRef(false)
  const pendingGymLossLineRef = useRef(false)
  const pendingGymChainRef = useRef<{ nextNpcId: string; progressLabel: string } | null>(null)
  const pendingGymWelcomeRef = useRef(false)
  const pendingGymLeaderboardAutoPopRef = useRef(false)
  const crierHeraldStartedRef = useRef(false)
  const e2ClosingPhaseRef = useRef<'idle' | 'exit-interior' | 'mob' | 'return-five' | 'cards'>('idle')
  const questTransitionRef = useRef<QuestTransitionHandle>(null)
  const [questTransitionActive, setQuestTransitionActive] = useState(false)
  const [episodeWorldReveal, setEpisodeWorldReveal] = useState<
    'visible' | 'hidden' | 'fade-in-pending' | 'fade-in'
  >('visible')

  const cutsceneFlowActive = cutscene != null || episodeCutsceneEnding
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
    playerHpRatio?: number
    telemetry?: BattleEndTelemetry
  } | null>(null)
  const gymRunDamageTakenRef = useRef(0)
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
  const [showGymLeaderboard, setShowGymLeaderboard] = useState(false)
  const [showGhostTraining, setShowGhostTraining] = useState(false)
  const [showTheater, setShowTheater] = useState(false)
  const [showShop, setShowShop] = useState(false)
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
  /** City to preload for world entry, resolved once after account hydrate. */
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
    void quest2Revision
    if (currentCity !== 'five') return null
    if (E2_ENABLED && isE2QuestUnlocked() && !isOceanviewGymVisited()) {
      return { kind: 'zone', action: 'OPEN_OCEANVIEW_GYM' }
    }
    if (!E2_ENABLED && isE1ArcComplete(buildQuestObjectiveContext())) {
      if (isCurrentWeeklyGymCleared() || isOceanviewGymVisited()) return null
      return { kind: 'zone', action: 'OPEN_OCEANVIEW_GYM' }
    }
    return null
  }, [currentCity, gymRevision, quest1Revision, quest2Revision])

  const gymHeadPulseDescriptor = useMemo((): QuestPulseTargetDescriptor | null => {
    void gymRevision
    if (currentCity !== 'five-gym-interior') return null
    if (isCurrentWeeklyGymCleared() || gymHeadPulseDismissed) return null
    return { kind: 'npc', id: FIVE_GYM1_ID }
  }, [currentCity, gymHeadPulseDismissed, gymRevision])

  const currentGymWeek = useMemo(() => {
    void gymRevision
    return getCurrentGymWeek()
  }, [gymRevision])

  const gymActiveRun = useMemo(() => {
    void gymRevision
    return getActiveGymRun()
  }, [gymRevision])

  const retiredGymWeeks = useMemo(() => {
    void gymRevision
    return getRetiredGymWeeks()
  }, [gymRevision])

  const gymScoringOpen = useMemo(() => {
    void gymRevision
    return isGymWeekScoringOpen()
  }, [gymRevision])

  useEffect(() => {
    if (currentCity !== 'five-gym-interior') return
    refreshWeeklyGymCalendar()
    const id = window.setInterval(() => refreshWeeklyGymCalendar(), 60_000)
    return () => window.clearInterval(id)
  }, [currentCity])

  const gymBattleOptions = useMemo(() => {
    if (!battleNpcId) {
      return { combatXpPolicy: 'normal' as const, battleEndHealing: 'default' as const }
    }
    const ghostOpts = resolveGhostBattleOptions(battleNpcId)
    if (ghostOpts) return ghostOpts
    return resolveGymBattleOptions(battleNpcId)
  }, [battleNpcId])

  const activePulseDescriptor =
    gymHeadPulseDescriptor ?? gymDoorPulseDescriptor ?? questPulseDescriptor

  useEffect(() => {
    if (currentCity === 'five-gym-interior') {
      setGymHeadPulseDismissed(isCurrentWeeklyGymCleared())
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
    if (!E2_ENABLED || !GHOST_TRAINING_ENABLED) return
    let cancelled = false
    void whenAccountHydrated().then(() => {
      if (cancelled) return
      void refreshGhostTraining()
    })
    return () => {
      cancelled = true
    }
  }, [])

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
      trackProgressEvent('city_enter', { city: currentCity })
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
      console.warn('[quest transition] ref unavailable, skipping overlay')
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
        const e2StreetActive = isOceanviewGymVisited()
        if (e2StreetActive && !isCrowdAddressed()) {
          npcs = npcs.filter((npc) => npc.id !== WALKER_NPC_ID)
          npcs = [...npcs, CROWD_1_NPC, CROWD_2_NPC]
          if (isWalkerConverted()) {
            npcs = [...npcs, WALKER_E2_CROWD_NPC]
          }
        }
        if (e2StreetActive && !isCrierSentAhead()) {
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
  }, [baseCityConfig, currentCity, markDefeated, quest1Revision, quest2Revision, gymRevision])

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
    if (
      e2ClosingPhaseRef.current === 'exit-interior' ||
      e2ClosingPhaseRef.current === 'return-five'
    ) {
      e2ClosingPhaseRef.current = 'idle'
    }
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

  const tryBeginE2ClosingMapTransition = useCallback(
    (
      cityId: CityId,
      x: number,
      y: number,
      phase: 'exit-interior' | 'return-five',
      facing?: MapTransitionTarget['facing'],
      attempt = 0,
    ) => {
      if (mapTransitionRef.current || mapTransitionPending) {
        if (attempt < 120) {
          window.requestAnimationFrame(() =>
            tryBeginE2ClosingMapTransition(cityId, x, y, phase, facing, attempt + 1),
          )
        } else {
          console.error('[e2 closing] map transition timed out while', phase)
          e2ClosingPhaseRef.current = 'idle'
        }
        return
      }
      e2ClosingPhaseRef.current = phase
      beginMapTransition(cityId, x, y, facing)
    },
    [beginMapTransition, mapTransitionPending],
  )

  const queueE2ClosingSouthsideExit = useCallback(() => {
    tryBeginE2ClosingMapTransition(
      'southside',
      SOUTHSIDE_EXTERIOR_RETURN.x,
      SOUTHSIDE_EXTERIOR_RETURN.y,
      'exit-interior',
    )
  }, [tryBeginE2ClosingMapTransition])

  const queueE2ClosingReturnFive = useCallback(() => {
    const fiveCfg = CITY_CONFIGS.five
    tryBeginE2ClosingMapTransition('five', fiveCfg.spawnX, fiveCfg.spawnY, 'return-five', 'down')
  }, [tryBeginE2ClosingMapTransition])

  const preloadE2CutsceneIfNeeded = useCallback(() => {
    if (!E2_ENABLED || isE2CutscenePlayed()) return
    preloadYouTubeIframeApi()
  }, [])

  const handleMapTransitionMidpoint = useCallback(() => {
    const target = mapTransitionRef.current
    if (!target) return
    if (target.cityId === 'five-gym-interior' && !isOceanviewGymVisited()) {
      setOceanviewGymVisited()
      pendingGymWelcomeRef.current = true
    }
    if (target.cityId === 'five-gym-interior') {
      pendingGymLeaderboardAutoPopRef.current = true
    }
    if (target.cityId === 'southside') {
      markCityVisited('southside')
    }
    if (target.cityId === 'blue-store-interior') {
      preloadE2CutsceneIfNeeded()
    }
    setCurrentCity(target.cityId)
    playerRef.current?.setPosition(target.x, target.y)
    if (target.facing) {
      playerRef.current?.setFacing(target.facing)
    }
    if (target.cityId !== 'blue-store-interior') {
      setLastLocation(target.cityId, target.x, target.y)
    }
  }, [preloadE2CutsceneIfNeeded])

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

  const openGymLeaderboard = useCallback(() => {
    setShowStartMenu(false)
    setMenuReturnPending(false)
    setShowGymLeaderboard(true)
  }, [])

  const handleGymLeaderboardClose = useCallback(() => {
    try {
      sessionStorage.setItem(GYM_LEADERBOARD_DISMISSED_KEY, '1')
    } catch {
      // ignore quota / private mode
    }
    setShowGymLeaderboard(false)
  }, [])

  const openGhostTraining = useCallback(() => {
    if (!GHOST_TRAINING_ENABLED) return
    setShowStartMenu(false)
    setMenuReturnPending(false)
    setShowGhostTraining(true)
  }, [])

  const handleGhostTrainingClose = useCallback(() => {
    setShowGhostTraining(false)
  }, [])

  const openTheater = useCallback(() => {
    if (!THEATER_ENABLED) return
    setShowStartMenu(false)
    setMenuReturnPending(false)
    setShowTheater(true)
    void refreshTheaterAttendance()
  }, [])

  const handleTheaterClose = useCallback(() => {
    setShowTheater(false)
  }, [])

  const openCosmeticsShop = useCallback(() => {
    if (!COSMETICS_SHOP_ENABLED) return
    setShowStartMenu(false)
    setMenuReturnPending(false)
    setShowShop(true)
  }, [])

  const handleShopClose = useCallback(() => {
    setShowShop(false)
  }, [])

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
    if (showGymLeaderboard || showGhostTraining || showTheater || showShop) return
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
    showGymLeaderboard,
    showGhostTraining,
    showTheater,
    showShop,
    showStartMenu,
  ])

  const handleFannyPack = useCallback(() => {
    if (menuTransition || worldEntryActive || showStartMenu || showGymLeaderboard || showGhostTraining || showTheater || showShop) return
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
    showGymLeaderboard,
    showGhostTraining,
    showTheater,
    showShop,
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
      if (worldEntryActive || showStartMenu || showGymLeaderboard || showGhostTraining || showTheater || showShop) return
      e.preventDefault()
      handleFannyPack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleFannyPack, showStartMenu, showGymLeaderboard, showGhostTraining, showTheater, showShop])

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
      if (showGymLeaderboard || showGhostTraining || showTheater || showShop) {
        e.preventDefault()
        setShowGymLeaderboard(false)
        setShowGhostTraining(false)
        setShowTheater(false)
        setShowShop(false)
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
    showGymLeaderboard,
    showGhostTraining,
    showTheater,
    showShop,
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

  const startGhostTrainingBattle = useCallback(
    (combatId: string) => {
      setShowGhostTraining(false)
      startNpcBattle(combatId)
    },
    [startNpcBattle],
  )

  const startGymGauntletBattle = useCallback(
    (weekId: string, practice: boolean) => {
      const combatId = startWeeklyGymRun(weekId, practice)
      if (!combatId) return
      gymRunDamageTakenRef.current = 0
      trackProgressEvent('gym_run_start', {
        weekId,
        practice,
      })
      setGymTrainerChoiceOpen(false)
      startNpcBattle(combatId)
    },
    [startNpcBattle],
  )

  const continueGymGauntletBattle = useCallback(() => {
    const combatId = getActiveGymRunCombatId()
    if (!combatId) return
    setGymTrainerChoiceOpen(false)
    startNpcBattle(combatId)
  }, [startNpcBattle])

  // ── DEV ONLY: K spawns the sparring dummy, REMOVE BEFORE LAUNCH ──
  const startDevSparBattle = useCallback(() => {
    if (battleNpcId || battleWipePhase) return
    setDialogue(null)
    setBattleReady(false)
    setBattleNpcId(DEV_SPAR_NPC_ID)
    setBattleWipePhase('enter')
    console.log('dev spar, remove before launch')
  }, [battleNpcId, battleWipePhase])

  // ── DEV ONLY: Shift+T replays the tutorial battle (walker + tutorial overlay) ──
  const startTutorialBattle = useCallback(() => {
    if (battleNpcId || battleWipePhase) return
    resetBattleTutorialSeen()
    setDialogue(null)
    setBattleReady(false)
    setBattleNpcId(WALKER_NPC_ID)
    setBattleWipePhase('enter')
    console.log('dev tutorial battle, walker fight with tutorial overlay')
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
      !showGymLeaderboard &&
      !showGhostTraining &&
      !showTheater &&
      !showShop &&
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
    showGymLeaderboard,
    showGhostTraining,
    showTheater,
    showShop,
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

  const showWeeklyGauntletExplainerIfNeeded = useCallback(
    (onDone: () => void) => {
      if (isWeeklyGauntletExplainerSeen()) {
        onDone()
        return
      }
      setWeeklyGauntletExplainerSeen()
      showNarration(
        ['one run. four fights, three henchmen, then the leader. lose once and you start over.'],
        onDone,
      )
    },
    [showNarration],
  )

  const playCrierHeraldDialogue = useCallback(() => {
    if (crierHeraldStartedRef.current || isCrierSentAhead()) return
    crierHeraldStartedRef.current = true
    beginNpcDialogue(TOWN_CRIER_NPC, {
      onComplete: () => {
        setCrierSentAhead()
        showNarration(['DARKLINE — SOUTHSIDE UNLOCKED.'])
      },
    })
  }, [beginNpcDialogue, showNarration])

  const finishE2Episode = useCallback(() => {
    if (isE2Complete()) return
    setE2Complete()
    e2ClosingPhaseRef.current = 'idle'
    mapTransitionRef.current = null
    setMapTransition(null)
    setMapTransitionReady(false)
    setMapTransitionPending(false)
    setQuestTransitionActive(false)
    setDialogue(null)
    trackProgressEvent('quest_complete', { questId: 'e2-closing' })
    trackProgressEvent('episode_complete', { episode: 'e2' })
  }, [])

  const runE2ClosingEpisodeCards = useCallback(() => {
    if (isE2Complete()) return
    if (e2ClosingPhaseRef.current === 'cards') {
      if (!questTransitionActive) {
        finishE2Episode()
      }
      return
    }
    e2ClosingPhaseRef.current = 'cards'
    showQuestTransition({
      questName: PRELUDE_QUEST_NAME,
      episodeName: EPISODE_2_NAME,
      episodeNumber: 2,
      type: 'episode_complete',
      onComplete: () => {
        window.requestAnimationFrame(() => {
          showQuestTransition({
            questName: QUEST_2_CLOSING_TEXT,
            type: 'quest_complete',
            onComplete: finishE2Episode,
          })
        })
      },
    })
  }, [finishE2Episode, questTransitionActive, showQuestTransition])

  const runE2ClosingMobDialogue = useCallback(() => {
    if (isE2Complete() || e2ClosingPhaseRef.current === 'cards') return
    if (isE2ClosingCrowdDismissed()) {
      if (currentCity === 'southside') {
        e2ClosingPhaseRef.current = 'return-five'
        queueE2ClosingReturnFive()
      }
      return
    }
    e2ClosingPhaseRef.current = 'mob'
    beginNpcDialogue(E2_CLOSING_CRIER_NPC, {
      onComplete: () => {
        setE2ClosingCrowdDismissed()
        e2ClosingPhaseRef.current = 'return-five'
        queueE2ClosingReturnFive()
      },
    })
  }, [beginNpcDialogue, currentCity, queueE2ClosingReturnFive])

  const startE2ClosingExitInterior = useCallback(() => {
    if (isE2Complete()) return
    if (e2ClosingPhaseRef.current !== 'idle' && e2ClosingPhaseRef.current !== 'exit-interior') {
      return
    }
    e2ClosingPhaseRef.current = 'exit-interior'
    queueE2ClosingSouthsideExit()
  }, [queueE2ClosingSouthsideExit])

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
    // b.stax / patches feature is hidden for now, skip straight through.
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
        "yo, that's a wrap. you earned a patch for the jacket.",
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
        'one run. four fights, three henchmen, then the leader. full heal between each. one loss sends you back to the start.',
      ])
    }
    if (pendingGymLeaderboardAutoPopRef.current) {
      pendingGymLeaderboardAutoPopRef.current = false
      let dismissed = false
      try {
        dismissed = sessionStorage.getItem(GYM_LEADERBOARD_DISMISSED_KEY) === '1'
      } catch {
        dismissed = false
      }
      if (!dismissed) {
        setShowGymLeaderboard(true)
      }
    }
    if (e2ClosingPhaseRef.current === 'exit-interior') {
      e2ClosingPhaseRef.current = 'mob'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => runE2ClosingMobDialogue())
      })
      return
    }
    if (e2ClosingPhaseRef.current === 'return-five') {
      runE2ClosingEpisodeCards()
    }
  }, [runE2ClosingEpisodeCards, runE2ClosingMobDialogue, showNarration])

  const showMarkVictoryNarration = useCallback(() => {
    showNarration(["the darkline's open now. take it south."])
  }, [showNarration])

  const finishCafeScene = useCallback(() => {
    if (!isCafeSceneSeen()) {
      setCafeSceneSeen()
      trackProgressEvent('quest_complete', { questId: 'e1-cafe' })
      trackProgressEvent('episode_complete', { episode: 'e1' })
    }
    setCafeFade('out')
  }, [])

  const runE2VideoHandoffOnce = useCallback(() => {
    const replayTitleCards = devForceEpisodeTitleCardsRef.current
    devForceEpisodeTitleCardsRef.current = false

    if (e2VideoHandoffStartedRef.current && !replayTitleCards) return
    e2VideoHandoffStartedRef.current = true
    setCutsceneQuestHelperHidden(false)
    trackProgressEvent('episode_complete', { episode: 'e2' })
    setCurrentCity('five')
    markCityVisited('five')
    const fiveCfg = CITY_CONFIGS.five
    playerRef.current?.setPosition(fiveCfg.spawnX, fiveCfg.spawnY)
    setLastLocation('five', fiveCfg.spawnX, fiveCfg.spawnY)
    setEpisodeWorldReveal('hidden')
    showQuestTransition({
      questName: PRELUDE_QUEST_NAME,
      episodeName: EPISODE_3_NAME,
      episodeNumber: 3,
      type: 'episode_complete',
      solidBlackBackdrop: true,
      onExitFadeStart: () => {
        setEpisodeWorldReveal('fade-in-pending')
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setEpisodeWorldReveal('fade-in'))
        })
      },
      onComplete: () => {
        setEpisodeWorldReveal('visible')
      },
    })
  }, [showQuestTransition])

  const runCafeVideoHandoffOnce = useCallback(() => {
    const replayTitleCards = devForceEpisodeTitleCardsRef.current
    devForceEpisodeTitleCardsRef.current = false

    if (cafeVideoHandoffStartedRef.current && !replayTitleCards) {
      pendingPostE1NarrationRef.current = false
      finishCafeScene()
      return
    }
    cafeVideoHandoffStartedRef.current = true
    setCutsceneQuestHelperHidden(false)
    if (!isCafeSceneSeen()) {
      setCafeSceneSeen()
      trackProgressEvent('quest_complete', { questId: 'e1-cafe' })
      trackProgressEvent('episode_complete', { episode: 'e1' })
    }
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
        setCafeFade('out')
      },
    })
  }, [finishCafeScene, showQuestTransition])

  const completeQuest1AfterCafe = useCallback(() => {
    runCafeVideoHandoffOnce()
  }, [runCafeVideoHandoffOnce])

  const clearEpisodeHandoffTimer = useCallback(() => {
    if (episodeHandoffTimerRef.current != null) {
      window.clearTimeout(episodeHandoffTimerRef.current)
      episodeHandoffTimerRef.current = null
    }
  }, [])

  const runPendingEpisodeHandoff = useCallback(() => {
    clearEpisodeHandoffTimer()
    setEpisodeCutsceneEnding(false)
    setCutscene(null)

    if (pendingCafeVideoHandoffRef.current) {
      pendingCafeVideoHandoffRef.current = false
      setE1CutscenePlayed()
      awardMidnightPatch(1, runCafeVideoHandoffOnce)
      return
    }
    if (pendingE2VideoHandoffRef.current) {
      pendingE2VideoHandoffRef.current = false
      setE2CutscenePlayed()
      awardMidnightPatch(2, runE2VideoHandoffOnce)
    }
  }, [
    awardMidnightPatch,
    clearEpisodeHandoffTimer,
    runCafeVideoHandoffOnce,
    runE2VideoHandoffOnce,
  ])

  const playCutscene = useCallback(
    (opts: PlayCutsceneOptions) => {
      clearEpisodeHandoffTimer()
      setEpisodeCutsceneEnding(false)
      pendingCafeVideoHandoffRef.current = false
      pendingE2VideoHandoffRef.current = false
      setCutsceneQuestHelperHidden(true)
      const {
        isEpisodeCutscene,
        episodeHandoff,
        devEpisodePreview,
        onComplete: userOnComplete,
        ...rest
      } = opts
      const isEpisode = isEpisodeCutscene || episodeHandoff != null
      if (devEpisodePreview) {
        devForceEpisodeTitleCardsRef.current = true
      }
      if (episodeHandoff === 1) {
        cafeVideoHandoffStartedRef.current = false
      } else if (episodeHandoff === 2) {
        e2VideoHandoffStartedRef.current = false
      }
      const holdMs = isEpisode ? EPISODE_CUTSCENE_POST_HOLD_MS : 0
      const fadeMs = isEpisode ? EPISODE_CUTSCENE_POST_FADE_TO_BLACK_MS : 0
      setCutscene({
        ...rest,
        isEpisodeCutscene: isEpisode,
        episodeHandoff,
        postCompleteHoldMs: holdMs > 0 ? holdMs : undefined,
        postCompleteFadeToBlackMs: fadeMs > 0 ? fadeMs : undefined,
        onComplete: (meta?: CutsceneCompleteMeta) => {
          if (episodeHandoff === 1 || episodeHandoff === 2) {
            setEpisodeCutsceneEnding(true)
            if (episodeHandoff === 1) {
              pendingCafeVideoHandoffRef.current = true
            } else {
              pendingE2VideoHandoffRef.current = true
            }
            if (meta?.userSkip) {
              runPendingEpisodeHandoff()
              return
            }
            const handoffDelayMs = holdMs + fadeMs
            episodeHandoffTimerRef.current = window.setTimeout(
              runPendingEpisodeHandoff,
              handoffDelayMs,
            )
            return
          }
          setCutsceneQuestHelperHidden(false)
          userOnComplete?.(meta)
        },
      })
    },
    [clearEpisodeHandoffTimer, runPendingEpisodeHandoff],
  )

  const handleCutsceneEnded = useCallback(() => {
    if (
      !pendingCafeVideoHandoffRef.current &&
      !pendingE2VideoHandoffRef.current
    ) {
      setCutscene(null)
      return
    }
    runPendingEpisodeHandoff()
  }, [runPendingEpisodeHandoff])

  useEffect(() => {
    return () => {
      clearEpisodeHandoffTimer()
    }
  }, [clearEpisodeHandoffTimer])

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

  const canStartTutorialBattle = canSpawnDevSpar

  const devModeUi = useDevControls({
    playerRef,
    playCutscene,
    canPlayCutscene: canPlayDevCutscene,
    canToggleDevMode: canSpawnDevSpar,
    spawnDevSpar: startDevSparBattle,
    canSpawnDevSpar,
    canStartTutorialBattle,
    startTutorialBattle,
    openShop: openCosmeticsShop,
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
          showNarration(["the gym's open in the 5ive. visit it and get your weight up."])
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
        playCutscene(buildEpisodeCutsceneOptions(1))
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
        if (cultDarklinePhase || darklineEnterTransition) return
        if (isMarkDefeated()) {
          setDarklineEnterTransition(true)
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
        preloadE2CutsceneIfNeeded()
        {
          const interior = CITY_CONFIGS['blue-store-interior']
          const spawn = resolveDoorSpawn(
            BLUE_STORE_EXIT_ZONE,
            -DOOR_SPAWN_OFFSET,
            interior.collisionZones,
          )
          beginMapTransition('blue-store-interior', spawn.x, spawn.y)
        }
      } else if (action === 'OPEN_BLUE_STORE_EXIT') {
        if (currentCity !== 'blue-store-interior') return
        if (mapTransitionRef.current) return
        {
          const exterior = CITY_CONFIGS['southside']
          const spawn = resolveDoorSpawn(
            SOUTHSIDE_ENTRANCE_ZONE,
            DOOR_SPAWN_OFFSET,
            exterior.collisionZones,
          )
          beginMapTransition('southside', spawn.x, spawn.y)
        }
      } else if (action === 'OPEN_OCEANVIEW_GYM') {
        if (currentCity !== 'five') return
        if (mapTransitionRef.current) return
        {
          const interior = CITY_CONFIGS['five-gym-interior']
          const spawn = resolveDoorSpawn(
            FIVE_GYM_EXIT_ZONE,
            -DOOR_SPAWN_OFFSET,
            interior.collisionZones,
          )
          beginMapTransition('five-gym-interior', spawn.x, spawn.y, 'up')
        }
      } else if (action === 'OPEN_OCEANVIEW_GYM_EXIT') {
        if (currentCity !== 'five-gym-interior') return
        if (mapTransitionRef.current) return
        {
          const exterior = CITY_CONFIGS['five']
          const spawn = resolveDoorSpawn(
            OCEANVIEW_GYM_ENTRANCE_ZONE,
            DOOR_SPAWN_OFFSET,
            exterior.collisionZones,
          )
          beginMapTransition('five', spawn.x, spawn.y, 'down')
        }
      } else if (action === 'OPEN_GYM_LEADERBOARD') {
        if (currentCity !== 'five-gym-interior') return
        openGymLeaderboard()
      } else if (action === 'OPEN_THEATER') {
        if (!THEATER_ENABLED) return
        if (currentCity !== 'five') return
        if (mapTransitionRef.current) return
        {
          const interior = CITY_CONFIGS['theater-interior']
          const spawn = resolveDoorSpawn(
            THEATER_EXIT_ZONE,
            -DOOR_SPAWN_OFFSET,
            interior.collisionZones,
          )
          beginMapTransition('theater-interior', spawn.x, spawn.y, 'up')
        }
      } else if (action === 'OPEN_THEATER_EXIT') {
        if (currentCity !== 'theater-interior') return
        if (mapTransitionRef.current) return
        setShowTheater(false)
        {
          const exterior = CITY_CONFIGS.five
          const spawn = resolveDoorSpawn(
            THEATER_ENTRANCE_ZONE,
            DOOR_SPAWN_OFFSET,
            exterior.collisionZones,
          )
          beginMapTransition('five', spawn.x, spawn.y, 'down')
        }
      } else if (action === 'OPEN_THEATER_SCREEN') {
        if (!THEATER_ENABLED) return
        if (currentCity !== 'theater-interior') return
        openTheater()
      }
    },
    [
      beginMapTransition,
      cafeFade,
      canApproachMark,
      cultDarklinePhase,
      currentCity,
      openGymLeaderboard,
      openTheater,
      preloadE2CutsceneIfNeeded,
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

  const handleDarklineEnterMidpoint = useCallback(() => {
    setShowDarkline(true)
  }, [])

  const handleDarklineEnterComplete = useCallback(() => {
    setDarklineEnterTransition(false)
  }, [])

  const handleCultDarklineMidpoint = useCallback(() => {
    const phase = cultDarklinePhaseRef.current
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
          trackProgressEvent('npc_converted', { npcId: CROWD_2_NPC_ID })
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
      if (!isOceanviewGymVisited()) {
        showNotYetDialogue(WALKER_E2_CROWD_NPC, 'visit the gym first.')
        return
      }
      beginNpcDialogue(WALKER_E2_CROWD_NPC)
      return
    }

    if (nearbyId === CROWD_2_NPC_ID) {
      if (!isOceanviewGymVisited()) {
        showNotYetDialogue(CROWD_2_NPC, 'visit the gym first.')
        return
      }
      beginNpcDialogue(CROWD_2_NPC)
      return
    }

    if (nearbyId === CROWD_1_NPC.id) {
      if (!isOceanviewGymVisited()) {
        showNotYetDialogue(CROWD_1_NPC, 'visit the gym first.')
        return
      }
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
      preloadE2CutsceneIfNeeded()
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
    preloadE2CutsceneIfNeeded,
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
    if (battleWipePhase || menuTransition || battleNpcId || showFannyPack || showLoadout || showGymLeaderboard || showGhostTraining || showTheater || showShop)
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
    showGymLeaderboard,
    showStartMenu,
    menuTransition,
    worldEntryActive,
    openNearbyNpcDialogue,
  ])

  const handlePlayAreaClick = useCallback(() => {
    if (cutsceneFlowActive || questTransitionActive) return
    if (adamTutorialStep != null) return
    if (blocksWorldInteractDuringLoadoutTutorial(loadoutTutorialStep)) return
    if (worldEntryActive || showStartMenu || showGymLeaderboard || showGhostTraining || showTheater || showShop) return
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
        showGymLeaderboard ||
        showGhostTraining ||
        showTheater ||
        showShop ||
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
    showGymLeaderboard,
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
    if (crierHeraldStartedRef.current) return
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
    if (cutsceneFlowActive || battleNpcId || battleWipePhase) return
    if (dialogue || questTransitionActive || mapTransition) return
    if (mapTransitionPending || showDarkline || cultDarklinePhase === 'enter' || darklineEnterTransition) {
      return
    }

    const phase = e2ClosingPhaseRef.current

    if (phase === 'exit-interior' && currentCity === 'blue-store-interior') {
      queueE2ClosingSouthsideExit()
      return
    }

    if (phase === 'return-five' && currentCity === 'southside') {
      queueE2ClosingReturnFive()
      return
    }

    if (
      isE2ClosingCrowdDismissed() &&
      currentCity === 'five' &&
      phase !== 'cards' &&
      !questTransitionActive
    ) {
      runE2ClosingEpisodeCards()
      return
    }

    if (phase !== 'idle') return

    if (currentCity === 'blue-store-interior') {
      startE2ClosingExitInterior()
    }
  }, [
    battleNpcId,
    battleWipePhase,
    cultDarklinePhase,
    currentCity,
    cutsceneFlowActive,
    dialogue,
    darklineEnterTransition,
    mapTransition,
    mapTransitionPending,
    quest2Revision,
    questTransitionActive,
    queueE2ClosingReturnFive,
    queueE2ClosingSouthsideExit,
    runE2ClosingEpisodeCards,
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

  const finishLoadoutTutorial = useCallback((step: number | null) => {
    setLoadoutTutorialStep(null)
    if (step != null && step >= XP_TUTORIAL_START_STEP) {
      setXpTutorialSeen()
    } else {
      setTutorialPhase2Seen()
    }
  }, [])

  const advanceLoadoutTutorial = useCallback(() => {
    setLoadoutTutorialStep((step) => {
      if (step == null) return step
      if (step >= LOADOUT_TUTORIAL_STEPS.length - 1) {
        finishLoadoutTutorial(step)
        return null
      }
      return step + 1
    })
  }, [finishLoadoutTutorial])

  const skipLoadoutTutorial = useCallback(() => {
    setLoadoutTutorialStep((step) => {
      finishLoadoutTutorial(step)
      return null
    })
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

    if (exit?.npcId && isGhostCombatId(exit.npcId)) {
      void completeGhostBattle(exit.result, { playerHpRatio: exit.playerHpRatio }).then((res) => {
        if (!res || exit.result !== 'win') return
        if (res.fightTier === 'full' && res.progressAwarded) {
          showNarration([
            `ghost cleared. +${res.fighterPassiveXp} bonus xp — full prize.`,
          ])
        } else if (res.fightTier === 'grind' && res.fighterPassiveXp > 0) {
          showNarration([`grind win. +${res.fighterPassiveXp} training xp.`])
        } else if (res.fightTier === 'champion' && res.fighterPassiveXp > 0) {
          showNarration([`champion down. +${res.fighterPassiveXp} bonus xp.`])
        }
      })
    }

    if (pendingGymLossLineRef.current) {
      pendingGymLossLineRef.current = false
      const lossLine = getCurrentGymWeek().leader.dialogue.loss
      showNotYetDialogue(FIVE_GYM1_HEAD_NPC, lossLine)
    }

    if (exit?.result === 'win' && exit.npcId && isGymGauntletCombatId(exit.npcId)) {
      const chain = pendingGymChainRef.current
      pendingGymChainRef.current = null
      if (chain) {
        showNarration([chain.progressLabel], () => {
          window.requestAnimationFrame(() => startNpcBattle(chain.nextNpcId))
        })
        return
      }

      const clearResult = recordWeeklyGymClear()
      if (clearResult) {
        trackProgressEvent('gym_run_end', {
          outcome: 'clear',
          weekId: clearResult.weekId,
          practice: false,
          streak: clearResult.streak,
          noLoss: true,
          cleanRun: gymRunDamageTakenRef.current <= 0,
          damageTaken: gymRunDamageTakenRef.current,
        })
        trackProgressEvent('gym_week_clear', {
          weekId: clearResult.weekId,
          streak: clearResult.streak,
          cleanRun: gymRunDamageTakenRef.current <= 0,
        })
        void claimGymWeekReward({
          weekId: clearResult.weekId,
          streak: clearResult.streak,
        })
          .then(() => refreshPlayerGrants())
          .catch((err) => {
            console.error('[gym-week-reward]', err instanceof Error ? err.message : String(err))
          })
        showNarration(
          [`week ${clearResult.weekId} cleared. xp and badge on the board, come back next week.`],
        )
        gymRunDamageTakenRef.current = 0
      } else if (getActiveGymRun()?.practice) {
        const activePracticeRun = getActiveGymRun()
        if (activePracticeRun) {
          trackProgressEvent('gym_run_end', {
            outcome: 'clear',
            weekId: activePracticeRun.weekId,
            practice: true,
            noLoss: true,
            cleanRun: gymRunDamageTakenRef.current <= 0,
            damageTaken: gymRunDamageTakenRef.current,
          })
        }
        clearActiveGymRun()
        gymRunDamageTakenRef.current = 0
        showNarration(['practice run complete. no rewards — full gauntlet again anytime.'])
      }
    }

    const startPhase2Tutorial = () => {
      if (isBattleTutorialSeen() && !isTutorialPhase2Seen()) {
        setLoadoutTutorialStep(0)
      }
    }

    if (exit?.result === 'win' && exit.npcId === TOWN_CRIER_NPC_ID && !isCrierSentAhead()) {
      playCrierHeraldDialogue()
    }

    if (exit?.result === 'win' && exit.npcId === CLERK_NPC_ID && !isE2CutscenePlayed()) {
      preloadE2CutsceneIfNeeded()
      playCutscene(buildEpisodeCutsceneOptions(2))
      return
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
    playCutscene,
    preloadE2CutsceneIfNeeded,
    reportCurrentLocation,
    showNotYetDialogue,
    showNarration,
    showQuestTransition,
    startE2ClosingExitInterior,
    startNpcBattle,
  ])

  const handleWinPayoff = useCallback((npcId: string) => {
    if (isDevSparNpcId(npcId)) return
    if (npcId === WALKER_NPC_ID) {
      setWalkerConverted()
      trackProgressEvent('npc_converted', { npcId: WALKER_NPC_ID })
    }
    if (npcId === JACLYN_NPC_ID) {
      setJaclynConverted()
      trackProgressEvent('npc_converted', { npcId: JACLYN_NPC_ID })
    }
    if (npcId === MARK_NPC_ID) {
      setMarkDefeated()
      collectArtifact('subway-pass')
      trackProgressEvent('npc_converted', { npcId: MARK_NPC_ID })
    }
    if (npcId === TOWN_CRIER_NPC_ID) {
      setCrierConverted()
      trackProgressEvent('npc_converted', { npcId: TOWN_CRIER_NPC_ID })
    }
    if (npcId === CLERK_NPC_ID) {
      setClerkConverted()
      trackProgressEvent('npc_converted', { npcId: CLERK_NPC_ID })
    }
    if (npcId === RESTOCKER_NPC_ID) {
      setRestockerDefeated()
      trackProgressEvent('npc_converted', { npcId: RESTOCKER_NPC_ID })
    }
  }, [])

  const handleBattleEnd = useCallback(
    (
      result: 'win' | 'lose' | 'draw',
      turns: number,
      playerHpRatio?: number,
      telemetry?: BattleEndTelemetry,
    ) => {
      const safeTurns = Number.isFinite(turns) && turns >= 0 ? turns : 0
      const isDevSpar = battleNpcId != null && isDevSparNpcId(battleNpcId)
      const isGhost = battleNpcId != null && isGhostCombatId(battleNpcId)
      const isGym = battleNpcId != null && isGymGauntletCombatId(battleNpcId)
      const storyNpcIds = new Set([
        WALKER_NPC_ID,
        JACLYN_NPC_ID,
        MARK_NPC_ID,
        TOWN_CRIER_NPC_ID,
        CLERK_NPC_ID,
        RESTOCKER_NPC_ID,
      ])
      const isStoryFight = battleNpcId != null && storyNpcIds.has(battleNpcId)
      const opponentType = isGhost ? 'ghost' : isGym ? 'gym' : isStoryFight ? 'story' : 'world'
      const damageTaken = Math.max(0, Math.floor(telemetry?.damageTaken ?? 0))
      const countersLanded = Math.max(0, Math.floor(telemetry?.countersLanded ?? 0))
      const movesUsed = Array.isArray(telemetry?.movesUsed) ? telemetry?.movesUsed ?? [] : []
      const hpRemaining = Math.max(0, Math.floor(telemetry?.hpRemaining ?? 0))
      const maxHp = Math.max(1, Math.floor(telemetry?.maxHp ?? 1))
      const computedHpRatio = hpRemaining / maxHp
      const finalHpRatio = typeof playerHpRatio === 'number' ? playerHpRatio : computedHpRatio
      const flawless = result === 'win' && damageTaken <= 0
      if (battleNpcId && !isDevSpar) {
        trackProgressEvent('battle_end', {
          enemyId: battleNpcId,
          result,
          turns: safeTurns,
          opponentType,
          ghost: isGhost,
          gym: isGym,
          story: isStoryFight,
          hpRemaining,
          maxHp,
          playerHpRatio: finalHpRatio,
          damageTaken,
          countersLanded,
          movesUsed,
          flawless,
          noHit: damageTaken <= 0,
          moveCount: movesUsed.length,
        })
      }
      if (result === 'win' && !isDevSpar) {
        if (battleNpcId === MARK_NPC_ID) {
          showMarkVictoryNarration()
          if (!isXpTutorialSeen()) {
            setLoadoutTutorialStep(XP_TUTORIAL_START_STEP)
          }
        }
      }
      if (isGym && telemetry) {
        gymRunDamageTakenRef.current += damageTaken
      }
      if (result === 'lose' && battleNpcId && isGymGauntletCombatId(battleNpcId)) {
        const activeRun = getActiveGymRun()
        if (activeRun) {
          trackProgressEvent('gym_run_end', {
            outcome: 'loss',
            weekId: activeRun.weekId,
            practice: activeRun.practice,
            failedAtFightIndex: activeRun.fightIndex,
            damageTaken: gymRunDamageTakenRef.current,
            noLoss: false,
            cleanRun: gymRunDamageTakenRef.current <= 0,
          })
        }
        pendingGymLossLineRef.current = true
        resetGymRunOnLoss()
        gymRunDamageTakenRef.current = 0
      }
      if (result === 'win' && battleNpcId && isGymGauntletCombatId(battleNpcId)) {
        const advanced = advanceGymRunAfterWin()
        if (advanced && !advanced.completed && advanced.nextCombatId) {
          pendingGymChainRef.current = {
            nextNpcId: advanced.nextCombatId,
            progressLabel: gymRunProgressLabel(advanced.run.fightIndex),
          }
        }
      }
      pendingBattleExitRef.current = { result, npcId: battleNpcId, playerHpRatio, telemetry }
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
    if (
      menuTransition ||
      worldEntryActive ||
      showStartMenu ||
      showGymLeaderboard ||
      showGhostTraining ||
      showTheater ||
      showShop
    ) {
      return
    }
    if (showLoadout) {
      if (menuReturnPending) {
        beginResumeTransition()
      } else {
        setShowLoadout(false)
      }
      return
    }
    setMenuReturnPending(false)
    setShowLoadout(true)
    // Script button tap completes the waitForAction step.
    if (loadoutTutorialStep === 1) {
      setLoadoutTutorialStep(2)
    } else if (loadoutTutorialStep === XP_TUTORIAL_START_STEP + 1) {
      setLoadoutTutorialStep(XP_TUTORIAL_START_STEP + 2)
    }
  }, [
    beginResumeTransition,
    loadoutTutorialStep,
    menuReturnPending,
    menuTransition,
    showGhostTraining,
    showGymLeaderboard,
    showLoadout,
    showShop,
    showStartMenu,
    showTheater,
    worldEntryActive,
  ])

  const beginMenuEntryTransition = useCallback(
    (screen: 'fanny-pack' | 'loadout') => {
      if (menuTransition) return
      setShowStartMenu(false)
      setMenuReturnPending(true)
      beginMenuTransition({ kind: 'to-screen', screen })
    },
    [beginMenuTransition, menuTransition],
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
        case 'champions':
          openGymLeaderboard()
          break
        case 'ghost-training':
          if (GHOST_TRAINING_ENABLED) openGhostTraining()
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
    [beginMenuEntryTransition, currentCity, loadoutTutorialStep, openGhostTraining, openGymLeaderboard, resumeFromPauseMenu],
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
    !showGymLeaderboard &&
    !showGhostTraining &&
    !showTheater &&
    !showShop &&
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
          {showDebug && !battleNpcId && !battleWipePhase && (
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
          <GameCanvas debugHudId={showDebug && !battleNpcId && !battleWipePhase ? GAME_DEBUG_HUD_ID : undefined}>
            <Player
              ref={playerRef}
              cityConfig={cityConfig}
              suppressDebugOverlay={!!battleNpcId || !!battleWipePhase}
              onTrigger={handleTrigger}
              onTriggerExit={handleExitTrigger}
              dialogueActive={
                !!dialogue ||
                worldEntryActive ||
                !!battleWipePhase ||
                darklineEnterTransition ||
                cultDarklinePhase === 'enter' ||
                showDarkline ||
                !!menuTransition ||
                !!mapTransition ||
                mapTransitionPending ||
                showFannyPack ||
                showLoadout ||
                showGymLeaderboard ||
                showGhostTraining ||
                showTheater ||
                showShop ||
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
          {darklineEnterTransition && (
            <MenuEntryCover
              fadeIn
              midpointMs={MENU_TRANSITION_MIDPOINT_MS}
              totalMs={MENU_TRANSITION_MS * 2}
              onMidpoint={handleDarklineEnterMidpoint}
              onComplete={handleDarklineEnterComplete}
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
                combatXpPolicy={gymBattleOptions.combatXpPolicy}
                battleEndHealing={gymBattleOptions.battleEndHealing}
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
          (loadoutTutorialStep <= 1 ||
            (loadoutTutorialStep >= XP_TUTORIAL_START_STEP &&
              loadoutTutorialStep <= XP_TUTORIAL_START_STEP + 1)) &&
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
              aria-label="Weekly gym gauntlet"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="game-screen-gym-choice__title">
                week {currentGymWeek.weekNumber} · {currentGymWeek.leader.name}
              </p>
              {gymActiveRun && !gymActiveRun.practice ? (
                <p className="game-screen-gym-choice__progress">
                  in progress, {gymRunProgressLabel(gymActiveRun.fightIndex)}
                </p>
              ) : null}
              {gymActiveRun && !gymActiveRun.practice && gymScoringOpen ? (
                <button
                  type="button"
                  className="game-screen-gym-choice__btn game-screen-gym-choice__btn--fight"
                  onClick={() => {
                    showWeeklyGauntletExplainerIfNeeded(() => continueGymGauntletBattle())
                  }}
                >
                  continue
                </button>
              ) : !isCurrentWeeklyGymCleared() && gymScoringOpen ? (
                <button
                  type="button"
                  className="game-screen-gym-choice__btn game-screen-gym-choice__btn--fight"
                  onClick={() => {
                    showWeeklyGauntletExplainerIfNeeded(() =>
                      startGymGauntletBattle(currentGymWeek.id, false),
                    )
                  }}
                >
                  start gauntlet
                </button>
              ) : null}
              {!gymScoringOpen && !isCurrentWeeklyGymCleared() ? (
                <p className="game-screen-gym-choice__progress">
                  gym week closed — check the board for final standings. practice still open.
                </p>
              ) : null}
              {isCurrentWeeklyGymCleared() || !gymScoringOpen ? (
                <button
                  type="button"
                  className="game-screen-gym-choice__btn"
                  onClick={() => {
                    showWeeklyGauntletExplainerIfNeeded(() =>
                      startGymGauntletBattle(currentGymWeek.id, true),
                    )
                  }}
                >
                  practice
                </button>
              ) : null}
              {retiredGymWeeks.map((week) => (
                <button
                  key={week.id}
                  type="button"
                  className="game-screen-gym-choice__btn"
                  onClick={() => {
                    showWeeklyGauntletExplainerIfNeeded(() =>
                      startGymGauntletBattle(week.id, true),
                    )
                  }}
                >
                  practice week {week.weekNumber}
                </button>
              ))}
              {gymActiveRun && !gymActiveRun.practice && gymScoringOpen ? (
                <button
                  type="button"
                  className="game-screen-gym-choice__btn"
                  onClick={() => {
                    const combatId = restartWeeklyGymRun()
                    if (combatId) startNpcBattle(combatId)
                    setGymTrainerChoiceOpen(false)
                  }}
                >
                  restart run
                </button>
              ) : null}
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
          {showGymLeaderboard && (
            <GymLeaderboardScreen
              viewerHandle={getAuthState().profile?.handle ?? null}
              onClose={handleGymLeaderboardClose}
            />
          )}
          {GHOST_TRAINING_ENABLED && showGhostTraining && (
            <GhostTrainingScreen
              onClose={handleGhostTrainingClose}
              onFight={startGhostTrainingBattle}
            />
          )}
          {showTheater && <TheaterScreen onClose={handleTheaterClose} />}
          {showShop && <ShopScreen onClose={handleShopClose} />}
      </GameShell>
    </div>
  )
}
