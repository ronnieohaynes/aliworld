import { publicAsset } from '../utils/publicAsset'
import { SOUTHSIDE_EXTERIOR_RETURN } from './cityConfig'
import {
  CLERK_NPC,
  GATING_NPC_1,
  GATING_NPC_3,
  JACLYN_NPC,
  MARK_NPC,
  TOWN_CRIER_IDLE_SPRITE,
  WALKER_E2_CROWD_NPC,
  type NpcData,
} from './npcs'

const NPC6_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/npc6-idle.png')
const NPC7_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/npc7-idle.png')
const NPC8_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/npc8-idle.png')

/** Blue-store exterior spawn — crowd rings this point when closing dialogue queues. */
const MOB_ANCHOR_X = SOUTHSIDE_EXTERIOR_RETURN.x
const MOB_ANCHOR_Y = SOUTHSIDE_EXTERIOR_RETURN.y

function closingMobNpc(
  base: Partial<NpcData> & Pick<NpcData, 'id' | 'x' | 'y' | 'spriteSrc'>,
): NpcData {
  return {
    name: 'crowd',
    lines: [],
    color: '#9696b0',
    spriteLayout: 'horizontal-bbox',
    fixedFacing: 'down',
    blocksMovement: false,
    ...base,
  }
}

/** Post-restocker crowd on the southside sidewalk — crier centered north of store exit spawn. */
export const E2_CLOSING_CRIER_NPC: NpcData = {
  id: 'e2-closing-crier',
  name: 'town crier',
  x: MOB_ANCHOR_X,
  y: MOB_ANCHOR_Y - 62,
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

const E2_CLOSING_WALKER: NpcData = {
  ...WALKER_E2_CROWD_NPC,
  id: 'e2-closing-walker',
  x: MOB_ANCHOR_X - 150,
  y: MOB_ANCHOR_Y - 5,
  lines: [],
  blocksMovement: false,
}

const E2_CLOSING_CLERK: NpcData = {
  ...CLERK_NPC,
  id: 'e2-closing-clerk',
  x: MOB_ANCHOR_X + 150,
  y: MOB_ANCHOR_Y - 5,
  lines: [],
  fixedFacing: 'down',
  blocksMovement: false,
}

const E2_CLOSING_JACLYN: NpcData = {
  ...JACLYN_NPC,
  id: 'e2-closing-jaclyn',
  x: MOB_ANCHOR_X - 60,
  y: MOB_ANCHOR_Y - 39,
  lines: [],
  fixedFacing: 'down',
  blocksMovement: false,
}

const E2_CLOSING_MARK: NpcData = {
  ...MARK_NPC,
  id: 'e2-closing-mark',
  x: MOB_ANCHOR_X + 60,
  y: MOB_ANCHOR_Y - 39,
  lines: [],
  fixedFacing: 'down',
  blocksMovement: false,
}

const E2_CLOSING_MOB_1 = closingMobNpc({
  id: 'e2-mob-1',
  x: MOB_ANCHOR_X - 80,
  y: MOB_ANCHOR_Y - 77,
  spriteSrc: GATING_NPC_1.spriteSrc!,
})

const E2_CLOSING_MOB_2 = closingMobNpc({
  id: 'e2-mob-2',
  x: MOB_ANCHOR_X + 80,
  y: MOB_ANCHOR_Y - 77,
  spriteSrc: GATING_NPC_3.spriteSrc!,
})

const E2_CLOSING_MOB_3 = closingMobNpc({
  id: 'e2-mob-3',
  x: MOB_ANCHOR_X - 130,
  y: MOB_ANCHOR_Y + 18,
  spriteSrc: NPC6_IDLE_SPRITE,
})

const E2_CLOSING_MOB_4 = closingMobNpc({
  id: 'e2-mob-4',
  x: MOB_ANCHOR_X + 130,
  y: MOB_ANCHOR_Y + 18,
  spriteSrc: NPC7_IDLE_SPRITE,
})

const E2_CLOSING_MOB_5 = closingMobNpc({
  id: 'e2-mob-5',
  x: MOB_ANCHOR_X - 45,
  y: MOB_ANCHOR_Y + 18,
  spriteSrc: NPC8_IDLE_SPRITE,
})

/** Ten unique NPCs — story cast + extras — around the blue-store exterior spawn. */
export const E2_CLOSING_MOB_NPCS: readonly NpcData[] = [
  E2_CLOSING_CRIER_NPC,
  E2_CLOSING_WALKER,
  E2_CLOSING_CLERK,
  E2_CLOSING_JACLYN,
  E2_CLOSING_MARK,
  E2_CLOSING_MOB_1,
  E2_CLOSING_MOB_2,
  E2_CLOSING_MOB_3,
  E2_CLOSING_MOB_4,
  E2_CLOSING_MOB_5,
]
