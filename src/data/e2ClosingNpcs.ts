import { publicAsset } from '../utils/publicAsset'
import { TOWN_CRIER_IDLE_SPRITE } from './npcs'
import type { NpcData } from './npcs'

const NPC2_SPRITE = publicAsset('Assets/Characters/npcs/npc2-idle-sheet.png')
const NPC4_SPRITE = publicAsset('Assets/Characters/npcs/npc4-idle-sheet.png')
const WALKER_SPRITE = publicAsset('Assets/Characters/npcs/Walker-idle.png')

/** Post-restocker crowd — blue store sidewalk (southside exterior). */
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

const E2_CLOSING_MOB_1: NpcData = {
  id: 'e2-mob-1',
  name: 'crowd',
  x: 580,
  y: 848,
  lines: [],
  color: '#9696b0',
  spriteSrc: NPC2_SPRITE,
  spriteLayout: 'horizontal-bbox',
  blocksMovement: false,
}

const E2_CLOSING_MOB_2: NpcData = {
  id: 'e2-mob-2',
  name: 'crowd',
  x: 712,
  y: 842,
  lines: [],
  color: '#9696b0',
  spriteSrc: NPC4_SPRITE,
  spriteLayout: 'horizontal-bbox',
  blocksMovement: false,
}

const E2_CLOSING_MOB_3: NpcData = {
  id: 'e2-mob-3',
  name: 'crowd',
  x: 760,
  y: 818,
  lines: [],
  color: '#7a7a96',
  spriteSrc: WALKER_SPRITE,
  spriteLayout: 'horizontal-bbox',
  blocksMovement: false,
}

export const E2_CLOSING_MOB_NPCS: readonly NpcData[] = [
  E2_CLOSING_CRIER_NPC,
  E2_CLOSING_MOB_1,
  E2_CLOSING_MOB_2,
  E2_CLOSING_MOB_3,
]
