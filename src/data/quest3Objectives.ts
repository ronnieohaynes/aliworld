/**
 * Quest 3 objectives — the stranger (southside field → sigil → 3 forms → mass conversion).
 */

import type { QuestObjectiveContext, QuestObjectiveStep } from './questObjectives'
import { isE2Complete } from '../store/quest2Store'
import {
  E3_ENABLED,
  isE3Complete,
  isE3FieldIntroSeen,
  isE3MassConversionSeen,
  isE3SigilFlashed,
  isInterviewerDefeated,
  isMonkDefeated,
  isPreacherDefeated,
} from '../store/quest3Store'
import { getWorldMemorySnapshot } from '../store/worldMemory'

export type Quest3ObjectiveContext = {
  e3Active: boolean
  inSouthside: boolean
  inFive: boolean
  inHillcrest: boolean
  e3FieldIntroSeen: boolean
  e3SigilFlashed: boolean
  interviewerDefeated: boolean
  preacherDefeated: boolean
  monkDefeated: boolean
  e3MassConversionSeen: boolean
  e3Complete: boolean
}

export function isE3QuestUnlocked(): boolean {
  return E3_ENABLED && isE2Complete()
}

export function buildQuest3ObjectiveContext(): Quest3ObjectiveContext {
  const world = getWorldMemorySnapshot()
  return {
    e3Active: isE3QuestUnlocked(),
    inSouthside: world.citiesVisited.includes('southside'),
    inFive: world.citiesVisited.includes('five'),
    inHillcrest: world.citiesVisited.includes('san-bruno'),
    e3FieldIntroSeen: isE3FieldIntroSeen(),
    e3SigilFlashed: isE3SigilFlashed(),
    interviewerDefeated: isInterviewerDefeated(),
    preacherDefeated: isPreacherDefeated(),
    monkDefeated: isMonkDefeated(),
    e3MassConversionSeen: isE3MassConversionSeen(),
    e3Complete: isE3Complete(),
  }
}

export const QUEST_3_CLOSING_TEXT = 'episode 4, coming soon.'

export const QUEST_3_STEPS: readonly QuestObjectiveStep[] = [
  {
    id: 'e3-field',
    isComplete: (ctx) => !ctx.e3Active || ctx.e3FieldIntroSeen,
    getText: () => "something's wrong in the field. find it.",
  },
  {
    id: 'e3-sigil',
    isComplete: (ctx) => !ctx.e3Active || ctx.e3SigilFlashed,
    getText: () => 'show them what you are.',
  },
  {
    id: 'e3-interviewer',
    isComplete: (ctx) => !ctx.e3Active || ctx.interviewerDefeated,
    getText: () => 'a stranger is asking about you. find him in the 5ive.',
  },
  {
    id: 'e3-preacher',
    isComplete: (ctx) => !ctx.e3Active || ctx.preacherDefeated,
    getText: () => 'find the stranger again. southside.',
  },
  {
    id: 'e3-monk',
    isComplete: (ctx) => !ctx.e3Active || ctx.monkDefeated,
    getText: () => 'the last form. hillcrest.',
  },
  {
    id: 'e3-closing',
    isComplete: (ctx) => !ctx.e3Active || ctx.e3Complete,
    getText: () => 'the doubt is gone.',
  },
]

export function getQuest3ActiveStepId(ctx: QuestObjectiveContext): string | null {
  if (!ctx.e3Active || ctx.e3Complete) return null
  for (const step of QUEST_3_STEPS) {
    if (!step.isComplete(ctx)) return step.id
  }
  if (ctx.monkDefeated && !ctx.e3MassConversionSeen) return 'e3-closing-pending'
  return null
}
