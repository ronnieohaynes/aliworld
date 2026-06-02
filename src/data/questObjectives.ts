/**
 * Data-driven quest objectives — conditions read live game state (no parallel tracking).
 */

import { hasArtifact } from '../store/artifactStore'
import {
  GATING_NPC_IDS,
  getQuest1Snapshot,
  hasTalkedToAllGatingNpcs,
  isCafeSceneSeen,
  isJaclynConverted,
  isMarkDefeated,
  isWalkerConverted,
} from '../store/quest1Store'
import { getWorldMemorySnapshot } from '../store/worldMemory'
import { ADAM_MP3_ARTIFACT_ID } from './adamMp3Handoff'
import { FIVE_DISPLAY_NAME } from './cityConfig'

/** MP3 player from Adam (quest helper tracks this as the notice step). */
export const NOTICE_ARTIFACT_ID = ADAM_MP3_ARTIFACT_ID

export type QuestObjectiveContext = {
  gatingTalkedCount: number
  gatingTalkedTotal: number
  allGatingTalked: boolean
  hasNotice: boolean
  walkerConverted: boolean
  jaclynConverted: boolean
  markDefeated: boolean
  /** PART 2: ensure markCityVisited('san-bruno') on darkline travel. */
  inSanBruno: boolean
  /** PART 2: set when cafe / danny beat is seen. */
  cafeSeen: boolean
}

export function buildQuestObjectiveContext(): QuestObjectiveContext {
  const quest1 = getQuest1Snapshot()
  const world = getWorldMemorySnapshot()
  const gatingTalkedCount = GATING_NPC_IDS.filter((id) => quest1.talked[id]).length
  return {
    gatingTalkedCount,
    gatingTalkedTotal: GATING_NPC_IDS.length,
    allGatingTalked: hasTalkedToAllGatingNpcs(),
    hasNotice: hasArtifact(NOTICE_ARTIFACT_ID),
    walkerConverted: isWalkerConverted(),
    jaclynConverted: isJaclynConverted(),
    markDefeated: isMarkDefeated(),
    inSanBruno: world.citiesVisited.includes('san-bruno'),
    cafeSeen: isCafeSceneSeen(),
  }
}

export type QuestObjectiveStep = {
  id: string
  /** When true, this step is done and the helper advances to the next step. */
  isComplete: (ctx: QuestObjectiveContext) => boolean
  getText: (ctx: QuestObjectiveContext) => string
}

export type QuestDefinition = {
  id: string
  /** Short label for the helper chrome (future multi-quest UI). */
  label: string
  steps: readonly QuestObjectiveStep[]
}

const QUEST_1_STEPS: readonly QuestObjectiveStep[] = [
  {
    id: 'wake',
    isComplete: (ctx) => ctx.gatingTalkedCount >= 1,
    getText: () => "you're awake. talk to the people around you.",
  },
  {
    id: 'find-self',
    isComplete: (ctx) => ctx.allGatingTalked,
    getText: (ctx) =>
      `talk to everyone on the block. (${ctx.gatingTalkedCount}/${ctx.gatingTalkedTotal})`,
  },
  {
    id: 'read-notice',
    isComplete: (ctx) => ctx.hasNotice,
    getText: () => 'talk to adam. he has something for you.',
  },
  {
    id: 'walker',
    isComplete: (ctx) => ctx.walkerConverted,
    getText: () => `find walker in ${FIVE_DISPLAY_NAME}. show him.`,
  },
  {
    id: 'jaclyn',
    isComplete: (ctx) => ctx.jaclynConverted,
    getText: () => `find jaclyn in ${FIVE_DISPLAY_NAME}. convert her too.`,
  },
  {
    id: 'mark',
    isComplete: (ctx) => ctx.markDefeated,
    getText: () => 'mark guards the darkline. get through him.',
  },
  {
    id: 'san-bruno',
    isComplete: (ctx) => ctx.inSanBruno,
    getText: () => 'take the darkline to hillcrest.',
  },
  {
    id: 'cafe',
    isComplete: (ctx) => ctx.cafeSeen,
    getText: () => 'go to the cafe in hillcrest.',
  },
  {
    id: 'darkline',
    isComplete: () => false,
    getText: () => "take the darkline. (the world's bigger now.)",
  },
]

/** Ordered quests — add Quest 2–5 definitions here later. */
export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  {
    id: 'quest-1-five',
    label: 'quest 1',
    steps: QUEST_1_STEPS,
  },
]

export type ResolvedObjective = {
  questId: string
  stepId: string
  text: string
}

/** First incomplete step in the quest, or the final step if all prior steps are complete. */
export function resolveActiveObjective(
  quest: QuestDefinition,
  ctx: QuestObjectiveContext,
): ResolvedObjective {
  for (const step of quest.steps) {
    if (!step.isComplete(ctx)) {
      return { questId: quest.id, stepId: step.id, text: step.getText(ctx) }
    }
  }
  const last = quest.steps[quest.steps.length - 1]!
  return { questId: quest.id, stepId: last.id, text: last.getText(ctx) }
}

/** Active objective for the primary (first) registered quest. */
export function resolvePrimaryQuestObjective(
  ctx: QuestObjectiveContext = buildQuestObjectiveContext(),
): ResolvedObjective {
  const quest = QUEST_DEFINITIONS[0]
  if (!quest) {
    return { questId: 'none', stepId: 'none', text: '' }
  }
  return resolveActiveObjective(quest, ctx)
}
