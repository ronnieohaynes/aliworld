/**
 * Quest 2 objectives — southside / blue store (gated in order).
 */

import type { QuestObjectiveContext, QuestObjectiveStep } from './questObjectives'
import { isCafeSceneSeen, isMarkDefeated } from '../store/quest1Store'
import {
  E2_ENABLED,
  isClerkConverted,
  isCrierConverted,
  isCrierSentAhead,
  isCrowdAddressed,
  isE2Complete,
  isRestockerDefeated,
} from '../store/quest2Store'
import { getWorldMemorySnapshot } from '../store/worldMemory'

export type Quest2ObjectiveContext = {
  e2Active: boolean
  crowdAddressed: boolean
  crierConverted: boolean
  crierSentAhead: boolean
  inSouthside: boolean
  clerkConverted: boolean
  restockerDefeated: boolean
  e2Complete: boolean
}

export function isE2QuestUnlocked(): boolean {
  return E2_ENABLED && isMarkDefeated() && isCafeSceneSeen()
}

export function buildQuest2ObjectiveContext(): Quest2ObjectiveContext {
  const world = getWorldMemorySnapshot()
  return {
    e2Active: isE2QuestUnlocked(),
    crowdAddressed: isCrowdAddressed(),
    crierConverted: isCrierConverted(),
    crierSentAhead: isCrierSentAhead(),
    inSouthside: world.citiesVisited.includes('southside'),
    clerkConverted: isClerkConverted(),
    restockerDefeated: isRestockerDefeated(),
    e2Complete: isE2Complete(),
  }
}

export const QUEST_2_CLOSING_TEXT = 'episode 3 — coming soon.'

export const QUEST_2_STEPS: readonly QuestObjectiveStep[] = [
  {
    id: 'e2-crowd',
    isComplete: (ctx) => !ctx.e2Active || ctx.crowdAddressed,
    getText: () => 'go back to the 5ive. address the crowd.',
  },
  {
    id: 'e2-crier',
    isComplete: (ctx) => !ctx.e2Active || ctx.crierConverted,
    getText: () => 'find the town crier. convince him.',
  },
  {
    id: 'e2-herald',
    isComplete: (ctx) => !ctx.e2Active || ctx.crierSentAhead,
    getText: () => 'send the crier ahead to the blue store.',
  },
  {
    id: 'e2-travel',
    isComplete: (ctx) => !ctx.e2Active || ctx.inSouthside,
    getText: () => 'take the darkline to southside.',
  },
  {
    id: 'e2-clerk',
    isComplete: (ctx) => !ctx.e2Active || ctx.clerkConverted,
    getText: () => 'reach the blue store. get through the clerk.',
  },
  {
    id: 'e2-restocker',
    isComplete: (ctx) => !ctx.e2Active || ctx.restockerDefeated,
    getText: () => 'the back room. the restocker.',
  },
]

export type Quest2PulseContext = Quest2ObjectiveContext

export function getQuest2ActiveStepId(ctx: QuestObjectiveContext): string | null {
  if (!ctx.e2Active || ctx.e2Complete) return null
  for (const step of QUEST_2_STEPS) {
    if (!step.isComplete(ctx)) return step.id
  }
  if (ctx.restockerDefeated) return 'e2-closing-pending'
  return null
}
