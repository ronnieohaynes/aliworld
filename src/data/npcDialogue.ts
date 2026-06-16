import {
  isJaclynConverted,
  isMarkDefeated,
  isWalkerConverted,
} from '../store/quest1Store'
import { FIVE_GYM1_ID, getGymHeadWins, isGym5ive1Cleared } from '../store/gymStore'
import { fiveGym1DialogueForWins } from './fiveGym1Gauntlet'
import {
  CLERK_NPC_ID,
  CROWD_1_NPC_ID,
  isClerkConverted,
  isCrierSentAhead,
  isCrowdAddressed,
  isCrierConverted,
  isRestockerDefeated,
  RESTOCKER_NPC_ID,
  TOWN_CRIER_NPC_ID,
} from '../store/quest2Store'
import type { NpcData, NpcDialogueLine } from './npcs'

export type ResolvedDialogueLine = {
  speaker: string
  text: string
}

export type ResolveNpcDialogueOptions = {
  /** Gate lines (e.g. mark before neighborhood is cleared). */
  blocked?: boolean
}

function normalizeDialogueLine(
  line: NpcDialogueLine,
  defaultSpeaker: string,
): ResolvedDialogueLine {
  if (typeof line === 'string') {
    return { speaker: defaultSpeaker, text: line }
  }
  return { speaker: line.speaker, text: line.text }
}

function isNpcConverted(npcId: string): boolean {
  if (npcId === 'walker') return isWalkerConverted()
  if (npcId === 'jaclyn') return isJaclynConverted()
  if (npcId === 'mark') return isMarkDefeated()
  if (npcId === TOWN_CRIER_NPC_ID) return isCrierConverted()
  if (npcId === CLERK_NPC_ID) return isClerkConverted()
  if (npcId === RESTOCKER_NPC_ID) return isRestockerDefeated()
  if (npcId === CROWD_1_NPC_ID) return isCrowdAddressed()
  if (npcId === FIVE_GYM1_ID) return isGym5ive1Cleared()
  return false
}

/** Pick pre/post (or blocked) lines from quest memory — no parallel dialogue state. */
export function resolveNpcDialogueLines(
  npc: NpcData,
  options?: ResolveNpcDialogueOptions,
): ResolvedDialogueLine[] {
  let raw: NpcDialogueLine[]
  if (npc.id === FIVE_GYM1_ID && !options?.blocked) {
    const text = fiveGym1DialogueForWins(getGymHeadWins(FIVE_GYM1_ID), isGym5ive1Cleared())
    raw = [text]
  } else if (options?.blocked && npc.linesBlocked?.length) {
    raw = npc.linesBlocked
  } else if (isNpcConverted(npc.id) && npc.linesConverted?.length) {
    raw = npc.linesConverted
  } else {
    raw = [...npc.lines]
    if (npc.id === CLERK_NPC_ID && isCrierSentAhead() && npc.linesHerald?.length) {
      raw = [...npc.linesHerald, ...raw]
    }
  }
  return raw.map((line) => normalizeDialogueLine(line, npc.name))
}
