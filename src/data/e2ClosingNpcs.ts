import { publicAsset } from '../utils/publicAsset'
import {
  CLERK_NPC,
  CROWD_1_NPC,
  CROWD_2_NPC,
  TOWN_CRIER_IDLE_SPRITE,
  WALKER_E2_CROWD_NPC,
  type NpcData,
} from './npcs'

const NPC4_SPRITE = publicAsset('Assets/Characters/npcs/npc4-idle-sheet.png')

/** Post-restocker crowd on the southside sidewalk — leave east/west walk space from the store door. */
export const E2_CLOSING_CRIER_NPC: NpcData = {
  id: 'e2-closing-crier',
  name: 'town crier',
  x: 648,
  y: 828,
  lines: [
    'Midnight showed this. he has shown us the way.',
    'the world IS changing. and WE have to take it back.',
  ],
  color: '#c084fc',
  spriteSrc: TOWN_CRIER_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
  fixedFacing: 'down',
  blocksMovement: false,
}

const E2_CLOSING_CROWD_1: NpcData = {
  ...CROWD_1_NPC,
  id: 'e2-closing-crowd1',
  x: 520,
  y: 852,
  blocksMovement: false,
}

const E2_CLOSING_CROWD_2: NpcData = {
  ...CROWD_2_NPC,
  id: 'e2-closing-crowd2',
  x: 580,
  y: 862,
  blocksMovement: false,
}

const E2_CLOSING_WALKER: NpcData = {
  ...WALKER_E2_CROWD_NPC,
  id: 'e2-closing-walker',
  x: 760,
  y: 818,
  blocksMovement: false,
}

const E2_CLOSING_CLERK: NpcData = {
  ...CLERK_NPC,
  id: 'e2-closing-clerk',
  x: 712,
  y: 848,
  fixedFacing: 'down',
  blocksMovement: false,
}

const E2_CLOSING_MOB_1: NpcData = {
  id: 'e2-mob-1',
  name: 'crowd',
  x: 860,
  y: 838,
  lines: [],
  color: '#9696b0',
  spriteSrc: NPC4_SPRITE,
  spriteLayout: 'horizontal-bbox',
  blocksMovement: false,
}

export const E2_CLOSING_MOB_NPCS: readonly NpcData[] = [
  E2_CLOSING_CRIER_NPC,
  E2_CLOSING_CROWD_1,
  E2_CLOSING_CROWD_2,
  E2_CLOSING_WALKER,
  E2_CLOSING_CLERK,
  E2_CLOSING_MOB_1,
]
