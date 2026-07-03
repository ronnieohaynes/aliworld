import { JACLYN_NPC_ID, MARK_NPC_ID, WALKER_NPC_ID } from '../store/quest1Store'
import {
  CLERK_NPC_ID,
  RESTOCKER_NPC_ID,
  TOWN_CRIER_NPC_ID,
} from '../store/quest2Store'
import {
  STRANGER_INTERVIEWER_NPC_ID,
  STRANGER_MONK_NPC_ID,
  STRANGER_PREACHER_NPC_ID,
} from '../store/quest3Store'

const STORY_COMBAT_NPC_IDS = new Set([
  WALKER_NPC_ID,
  JACLYN_NPC_ID,
  MARK_NPC_ID,
  TOWN_CRIER_NPC_ID,
  CLERK_NPC_ID,
  RESTOCKER_NPC_ID,
  STRANGER_INTERVIEWER_NPC_ID,
  STRANGER_PREACHER_NPC_ID,
  STRANGER_MONK_NPC_ID,
])

export function isStoryCombatNpcId(npcId: string): boolean {
  return STORY_COMBAT_NPC_IDS.has(npcId)
}
