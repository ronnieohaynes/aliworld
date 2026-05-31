import { ADAM_NPC } from './npcs'

export const ADAM_MP3_ARTIFACT_ID = 'mp3-player' as const

export { ADAM_NPC }

export function isAdamNpcId(npcId: string | null | undefined): boolean {
  return npcId === ADAM_NPC.id
}
