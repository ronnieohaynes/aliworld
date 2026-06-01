/**
 * Data-driven quest objectives — conditions read live game state (no parallel tracking).
 */

import { hasArtifact } from '../store/artifactStore'
import {
  GATING_NPC_IDS,
  getQuest1Snapshot,
  hasTalkedToAllGatingNpcs,
  isJaclynConverted,
  isMarkDefeated,
  isWalkerConverted,
} from '../store/quest1Store'
import { getWorldMemorySnapshot } from '../store/worldMemory'
import { ADAM_MP3_ARTIFACT_ID } from './adamMp3Handoff'

/** Notice artifact — same collectible id as the former Adam MP3 handoff. */
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
    // PART 2: cafe beat hook — stub reads false until wired.
    cafeSeen: false,
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
    getText: () => 'wake up.',
  },
  {
    id: 'find-self',
    isComplete: (ctx) => ctx.allGatingTalked,
    getText: (ctx) =>
      `find out what you are. (${ctx.gatingTalkedCount}/${ctx.gatingTalkedTotal})`,
  },
  {
    id: 'read-notice',
    isComplete: (ctx) => ctx.hasNotice,
    getText: () => 'read the notice.',
  },
  {
    id: 'walker',
    isComplete: (ctx) => ctx.walkerConverted,
    getText: () => 'convert walker.',
  },
  {
    id: 'jaclyn',
    isComplete: (ctx) => ctx.jaclynConverted,
    getText: () => 'convert jaclyn.',
  },
  {
    id: 'mark',
    isComplete: (ctx) => ctx.markDefeated,
    getText: () => 'confront mark at the darkline.',
  },
  {
    id: 'san-bruno',
    isComplete: (ctx) => ctx.inSanBruno,
    getText: () => 'take the darkline to san bruno.',
  },
  {
    id: 'cafe',
    isComplete: (ctx) => ctx.cafeSeen,
    getText: () => "the cafe. someone's there.",
  },
  {
    id: 'darkline',
    isComplete: () => false,
    getText: () => 'take the darkline.',
  },
]

/** Ordered quests — add Quest 2–5 definitions here later. */
export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  {
    id: 'quest-1-daly-city',
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
