/**
 * Data-driven quest objectives — conditions read live game state (no parallel tracking).
 */

import { hasArtifact } from '../store/artifactStore'
import {
  GATING_NPC_IDS,
  getQuest1Snapshot,
  hasTalkedToAllGatingNpcs,
  hasTalkedToGatingNpc,
  isCafeSceneSeen,
  isJaclynConverted,
  isMarkDefeated,
  isWalkerConverted,
  type GatingNpcId,
} from '../store/quest1Store'
import { getWorldMemorySnapshot } from '../store/worldMemory'
import { ADAM_MP3_ARTIFACT_ID } from './adamMp3Handoff'
import { FIVE_DISPLAY_NAME, type CityConfig } from './cityConfig'
import { NPC_SIZE } from './npcs'
import {
  buildQuest2ObjectiveContext,
  getQuest2ActiveStepId,
  isE2QuestUnlocked,
  QUEST_2_STEPS,
  type Quest2ObjectiveContext,
} from './quest2Objectives'
import {
  E2_ENABLED,
  RESTOCKER_NPC_ID,
  TOWN_CRIER_NPC_ID,
  CROWD_2_NPC_ID,
} from '../store/quest2Store'
import type { TriggerAction } from './triggerZones'

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
} & Quest2ObjectiveContext

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
    ...buildQuest2ObjectiveContext(),
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
    isComplete: (ctx) => ctx.cafeSeen && ctx.markDefeated && !E2_ENABLED,
    getText: () => "take the darkline. (the world's bigger now.)",
  },
]

export function isE1ArcComplete(ctx: QuestObjectiveContext): boolean {
  return ctx.markDefeated && ctx.cafeSeen
}

const E1_CLOSING_OBJECTIVE_TEXT = 'episode 2 — soon.'

/** Ordered quests — quest 2 activates after e1 cafe beat. */
export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  {
    id: 'quest-1-five',
    label: 'quest 1',
    steps: QUEST_1_STEPS,
  },
  {
    id: 'quest-2-southside',
    label: 'quest 2',
    steps: QUEST_2_STEPS,
  },
]

/** Quest 1 last step never completes — e2 unlocks after cafe + mark. */
function shouldShowQuest2(ctx: QuestObjectiveContext): boolean {
  return isE2QuestUnlocked() && ctx.cafeSeen
}

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

/** Active objective — quest 2 after e1 unlock; otherwise quest 1. */
export function resolvePrimaryQuestObjective(
  ctx: QuestObjectiveContext = buildQuestObjectiveContext(),
): ResolvedObjective {
  if (isE1ArcComplete(ctx) && !E2_ENABLED) {
    return {
      questId: 'quest-1-five',
      stepId: 'e1-closing',
      text: E1_CLOSING_OBJECTIVE_TEXT,
    }
  }

  if (shouldShowQuest2(ctx)) {
    const quest2 = QUEST_DEFINITIONS[1]
    if (quest2) {
      const q2Ctx = ctx
      for (const step of quest2.steps) {
        if (!step.isComplete(q2Ctx)) {
          return { questId: quest2.id, stepId: step.id, text: step.getText(q2Ctx) }
        }
      }
      const last = quest2.steps[quest2.steps.length - 1]!
      return { questId: quest2.id, stepId: last.id, text: last.getText(q2Ctx) }
    }
  }

  const quest = QUEST_DEFINITIONS[0]
  if (!quest) {
    return { questId: 'none', stepId: 'none', text: '' }
  }
  return resolveActiveObjective(quest, ctx)
}

/** First incomplete quest step id across active quest, or null when complete. */
export function getActiveStepId(ctx: QuestObjectiveContext): string | null {
  if (isE1ArcComplete(ctx) && !E2_ENABLED) return null
  if (shouldShowQuest2(ctx)) {
    return getQuest2ActiveStepId(ctx)
  }
  for (const step of QUEST_1_STEPS) {
    if (!step.isComplete(ctx)) return step.id
  }
  return null
}

export type QuestPulseTargetDescriptor =
  | { kind: 'npc'; id: string }
  | { kind: 'zone'; action: TriggerAction }
  | { kind: 'nearest-untalked-gating' }

/** Map active quest step → overworld highlight target (before city filtering). */
export function getQuestPulseTargetDescriptor(
  stepId: string,
  ctx: QuestObjectiveContext,
): QuestPulseTargetDescriptor | null {
  switch (stepId) {
    case 'wake':
    case 'find-self':
      return { kind: 'nearest-untalked-gating' }
    case 'read-notice':
      return ctx.hasNotice ? null : { kind: 'npc', id: 'adam' }
    case 'walker':
      return { kind: 'npc', id: 'walker' }
    case 'jaclyn':
      return { kind: 'npc', id: 'jaclyn' }
    case 'mark':
      return { kind: 'npc', id: 'mark' }
    case 'san-bruno':
    case 'darkline':
      return { kind: 'zone', action: 'OPEN_DARKLINE' }
    case 'cafe':
      return { kind: 'zone', action: 'OPEN_ONE_LOVE_CAFE' }
    case 'e2-crowd':
      return ctx.crowdAddressed ? null : { kind: 'npc', id: CROWD_2_NPC_ID }
    case 'e2-crier':
      return { kind: 'npc', id: TOWN_CRIER_NPC_ID }
    case 'e2-travel':
      return ctx.inSouthside
        ? { kind: 'zone', action: 'OPEN_BLUE_STORE' }
        : { kind: 'zone', action: 'OPEN_DARKLINE' }
    case 'e2-clerk':
      return ctx.inSouthside
        ? { kind: 'zone', action: 'OPEN_BLUE_STORE' }
        : { kind: 'zone', action: 'OPEN_DARKLINE' }
    case 'e2-restocker':
      return { kind: 'npc', id: RESTOCKER_NPC_ID }
    case 'e2-field':
      return null
    default:
      return null
  }
}

function npcFeetY(npc: { y: number }): number {
  return npc.y + NPC_SIZE / 2
}

function findNpcInCity(city: CityConfig, id: string) {
  return city.npcs.find((npc) => npc.id === id)
}

function findTriggerInCity(city: CityConfig, action: TriggerAction) {
  return city.triggerZones.find((zone) => zone.action === action)
}

function findNearestUntalkedGatingNpc(
  city: CityConfig,
  playerX: number,
  playerY: number,
) {
  let best: { x: number; y: number } | null = null
  let bestDist = Infinity
  for (const id of GATING_NPC_IDS) {
    if (hasTalkedToGatingNpc(id as GatingNpcId)) continue
    const npc = findNpcInCity(city, id)
    if (!npc) continue
    const feetY = npcFeetY(npc)
    const dist = Math.hypot(playerX - npc.x, playerY - feetY)
    if (dist < bestDist) {
      bestDist = dist
      best = { x: npc.x, y: feetY }
    }
  }
  return best
}

function resolveDescriptorInCity(
  descriptor: QuestPulseTargetDescriptor,
  city: CityConfig,
  playerX: number,
  playerY: number,
): { x: number; y: number } | null {
  switch (descriptor.kind) {
    case 'npc': {
      const npc = findNpcInCity(city, descriptor.id)
      if (!npc) return null
      return { x: npc.x, y: npcFeetY(npc) }
    }
    case 'zone': {
      const zone = findTriggerInCity(city, descriptor.action)
      if (!zone) return null
      const cx = zone.x + zone.width / 2
      // Store entrance: pulse on the doorstep (south edge), not zone centroid.
      if (descriptor.action === 'OPEN_BLUE_STORE') {
        return { x: cx, y: zone.y + zone.height - 6 }
      }
      return { x: cx, y: zone.y + zone.height / 2 }
    }
    case 'nearest-untalked-gating':
      return findNearestUntalkedGatingNpc(city, playerX, playerY)
  }
}

/**
 * World point for the quest pulse in the current city.
 * Falls back to the local darkline entrance when the step target lives elsewhere.
 */
export function resolveQuestPulseWorldPoint(
  descriptor: QuestPulseTargetDescriptor | null,
  city: CityConfig,
  playerX: number,
  playerY: number,
): { x: number; y: number } | null {
  if (!descriptor) return null

  const direct = resolveDescriptorInCity(descriptor, city, playerX, playerY)
  if (direct) return direct

  const darkline = findTriggerInCity(city, 'OPEN_DARKLINE')
  if (!darkline) return null
  return {
    x: darkline.x + darkline.width / 2,
    y: darkline.y + darkline.height / 2,
  }
}

/** Active step descriptor for the primary quest, if any. */
export function resolveActiveQuestPulseDescriptor(
  ctx: QuestObjectiveContext = buildQuestObjectiveContext(),
): QuestPulseTargetDescriptor | null {
  const stepId = getActiveStepId(ctx)
  if (!stepId) return null
  return getQuestPulseTargetDescriptor(stepId, ctx)
}
