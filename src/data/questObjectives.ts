/**
 * Data-driven quest objectives — conditions read live game state (no parallel tracking).
 */

import { hasArtifact } from '../store/artifactStore'
import {
  GATING_NPC_IDS,
  getQuest1Snapshot,
  hasTalkedToAllGatingNpcs,
  isMarkDefeated,
} from '../store/quest1Store'
import { ADAM_MP3_ARTIFACT_ID } from './adamMp3Handoff'

export type QuestObjectiveContext = {
  hasMp3: boolean
  gatingTalkedCount: number
  gatingTalkedTotal: number
  allGatingTalked: boolean
  markDefeated: boolean
}

export function buildQuestObjectiveContext(): QuestObjectiveContext {
  const quest1 = getQuest1Snapshot()
  const gatingTalkedCount = GATING_NPC_IDS.filter((id) => quest1.talked[id]).length
  return {
    hasMp3: hasArtifact(ADAM_MP3_ARTIFACT_ID),
    gatingTalkedCount,
    gatingTalkedTotal: GATING_NPC_IDS.length,
    allGatingTalked: hasTalkedToAllGatingNpcs(),
    markDefeated: isMarkDefeated(),
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
    id: 'find-adam',
    isComplete: (ctx) => ctx.hasMp3,
    getText: () => 'Find Adam',
  },
  {
    id: 'ask-around',
    isComplete: (ctx) => ctx.allGatingTalked,
    getText: (ctx) =>
      `Ask around the neighborhood (${ctx.gatingTalkedCount}/${ctx.gatingTalkedTotal})`,
  },
  {
    id: 'confront-mark',
    isComplete: (ctx) => ctx.markDefeated,
    getText: () => 'Confront Mark at the Darkline',
  },
  {
    id: 'take-darkline',
    isComplete: () => false,
    getText: () => 'Take the Darkline',
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
