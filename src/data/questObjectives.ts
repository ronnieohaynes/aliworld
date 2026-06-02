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

/** First incomplete quest step id, or null when every step is complete. */
export function getActiveStepId(ctx: QuestObjectiveContext): string | null {
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
      return { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 }
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
