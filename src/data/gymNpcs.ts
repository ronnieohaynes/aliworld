import { publicAsset } from '../utils/publicAsset'
import { FIVE_GYM1_ID } from '../store/gymStore'
import type { NpcData } from './npcs'

export { FIVE_GYM1_ID }

const FIVE_GYM1_SPRITE = publicAsset('Assets/Characters/npcs/5ive-gym1.png')

/** Sprites used for ambient gym npcs (commit 2): npc2-idle-sheet, jason-idle, jaclyn-idle. */
const NPC2_SPRITE = publicAsset('Assets/Characters/npcs/npc2-idle-sheet.png')
const JASON_SPRITE = publicAsset('Assets/Characters/npcs/jason-idle.png')
const JACLYN_SPRITE = publicAsset('Assets/Characters/npcs/jaclyn-idle.png')

/** Week 1 head — Oceanview Gym (`5ive-gym1`). */
export const FIVE_GYM1_HEAD_NPC: NpcData = {
  id: FIVE_GYM1_ID,
  name: 'trainer',
  x: 506,
  y: 319,
  lines: ['week one. i run this floor. you want the work?'],
  linesConverted: ["week one's yours. don't get comfortable."],
  color: '#afa9ec',
  spriteSrc: FIVE_GYM1_SPRITE,
  spriteColumns: 4,
  fixedFacing: 'left',
}

/** Ambient — heavy bags (left wall). Sheet: npc2-idle-sheet. */
const GYM_AMBIENT_BAGS: NpcData = {
  id: 'gym-ambient-bags',
  name: '',
  x: 118,
  y: 268,
  lines: ["he don't let nobody skip the work."],
  color: '#9696b0',
  spriteSrc: NPC2_SPRITE,
  spriteLayout: 'horizontal-bbox',
  fixedFacing: 'right',
}

/** Ambient — bench (southwest). Sheet: jason-idle. */
const GYM_AMBIENT_BENCH: NpcData = {
  id: 'gym-ambient-bench',
  name: '',
  x: 195,
  y: 528,
  lines: ['week one? everybody starts somewhere.'],
  color: '#9696b0',
  spriteSrc: JASON_SPRITE,
  spriteLayout: 'horizontal-bbox',
  fixedFacing: 'up',
}

/** Ambient — ring side (north). Sheet: jaclyn-idle. */
const GYM_AMBIENT_RING: NpcData = {
  id: 'gym-ambient-ring',
  name: '',
  x: 336,
  y: 198,
  lines: ["watch the wind-up. that's all i'm saying."],
  color: '#9696b0',
  spriteSrc: JACLYN_SPRITE,
  spriteLayout: 'horizontal-bbox',
  fixedFacing: 'down',
}

export const FIVE_GYM_AMBIENT_NPCS: readonly NpcData[] = [
  GYM_AMBIENT_BAGS,
  GYM_AMBIENT_BENCH,
  GYM_AMBIENT_RING,
]

export function isGymHeadCombatId(npcId: string): boolean {
  return npcId === FIVE_GYM1_ID
}

export const FIVE_GYM1_INTERIOR_NPCS: readonly NpcData[] = [
  FIVE_GYM1_HEAD_NPC,
  ...FIVE_GYM_AMBIENT_NPCS,
]
