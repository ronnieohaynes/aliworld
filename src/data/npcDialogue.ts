import {
  isJaclynConverted,
  isMarkDefeated,
  isWalkerConverted,
} from '../store/quest1Store'
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
  return false
}

/** Pick pre/post (or blocked) lines from quest memory — no parallel dialogue state. */
export function resolveNpcDialogueLines(
  npc: NpcData,
  options?: ResolveNpcDialogueOptions,
): ResolvedDialogueLine[] {
  let raw: NpcDialogueLine[]
  if (options?.blocked && npc.linesBlocked?.length) {
    raw = npc.linesBlocked
  } else if (isNpcConverted(npc.id) && npc.linesConverted?.length) {
    raw = npc.linesConverted
  } else {
    raw = npc.lines
  }
  return raw.map((line) => normalizeDialogueLine(line, npc.name))
}
