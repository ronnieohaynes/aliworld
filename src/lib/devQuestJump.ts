/**
 * Dev-only quest state presets — jump to a quest's opening beat (Shift+5 picker).
 */

import { QUEST_DEFINITIONS } from '../data/questObjectives'
import { collectArtifact, resetArtifactsForDebug } from '../store/artifactStore'
import { resetState as resetGymState } from '../store/gymStore'
import {
  GATING_NPC_IDS,
  markGatingNpcTalked,
  resetQuest1ForDebug,
  setBattleTutorialSeen,
  setCafeSceneSeen,
  setE1CutscenePlayed,
  setEpisode1TitleCardSeen,
  setJaclynConverted,
  setMarkDefeated,
  setMp3PlayerOwned,
  setTutorialPhase2Seen,
  setWalkerConverted,
  setWalkerHeavyTutorialBeatSeen,
  setWorldIntroSeen,
  setXpTutorialSeen,
} from '../store/quest1Store'
import {
  E2_ENABLED,
  resetQuest2ForDebug,
  setClerkConverted,
  setCrierConverted,
  setCrierSentAhead,
  setCrowdAddressed,
  setE2ClosingCrowdDismissed,
  setE2Complete,
  setE2CutscenePlayed,
  setRestockerDefeated,
} from '../store/quest2Store'
import { E3_ENABLED, resetQuest3ForDebug } from '../store/quest3Store'
import { applyState as applyWorldMemoryState } from '../store/worldMemory'

export type DevQuestJumpId = 'quest-1-five' | 'quest-2-southside' | 'quest-3-stranger'

export type DevJumpableQuest = {
  id: DevQuestJumpId
  label: string
}

export function getDevJumpableQuests(): DevJumpableQuest[] {
  const out: DevJumpableQuest[] = []
  for (const quest of QUEST_DEFINITIONS) {
    if (quest.id === 'quest-1-five') {
      out.push({ id: quest.id, label: quest.label })
      continue
    }
    if (quest.id === 'quest-2-southside' && E2_ENABLED) {
      out.push({ id: quest.id, label: quest.label })
      continue
    }
    if (quest.id === 'quest-3-stranger' && E3_ENABLED) {
      out.push({ id: quest.id, label: quest.label })
    }
  }
  return out
}

function applyQuest1FreshStart(): void {
  resetQuest1ForDebug()
}

/** E1 arc complete — unlocks quest 2 at the gym step without replaying episode 1. */
function applyQuest1EpisodeComplete(): void {
  resetQuest1ForDebug()
  for (const id of GATING_NPC_IDS) {
    markGatingNpcTalked(id)
  }
  setWalkerConverted()
  setJaclynConverted()
  setMarkDefeated()
  setCafeSceneSeen()
  setE1CutscenePlayed()
  setBattleTutorialSeen()
  setWalkerHeavyTutorialBeatSeen()
  setTutorialPhase2Seen()
  setXpTutorialSeen()
  setWorldIntroSeen()
  setMp3PlayerOwned()
  setEpisode1TitleCardSeen()
}

/** E2 arc complete — unlocks quest 3 at the southside field without replaying episode 2. */
function applyQuest2EpisodeComplete(): void {
  setCrowdAddressed()
  setCrierConverted()
  setCrierSentAhead()
  setClerkConverted()
  setRestockerDefeated()
  setE2ClosingCrowdDismissed()
  setE2CutscenePlayed()
  setE2Complete()
}

/** Reset quest + world flags so GameScreen can teleport to the 5ive spawn. */
export function applyDevQuestJump(questId: DevQuestJumpId): void {
  resetQuest2ForDebug()
  resetQuest3ForDebug()
  resetGymState()

  if (questId === 'quest-1-five') {
    applyQuest1FreshStart()
    resetArtifactsForDebug()
    applyWorldMemoryState({ citiesVisited: ['five'], bossesCleared: [] })
    return
  }

  applyQuest1EpisodeComplete()
  resetArtifactsForDebug()
  collectArtifact('mp3-player')
  collectArtifact('subway-pass')

  if (questId === 'quest-2-southside') {
    applyWorldMemoryState({ citiesVisited: ['five'], bossesCleared: [] })
    return
  }

  applyQuest2EpisodeComplete()
  applyWorldMemoryState({
    citiesVisited: ['five', 'southside', 'san-bruno'],
    bossesCleared: [],
  })
}
