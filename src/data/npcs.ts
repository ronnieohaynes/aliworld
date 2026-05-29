import { publicAsset } from '../utils/publicAsset'

export type NpcData = {
  id: string
  name: string
  x: number
  y: number
  lines: string[]
  color: string
  /** Path to an idle sprite sheet (horizontal strip: down, up, left, right). */
  spriteSrc?: string
  /** Number of direction columns in the sprite sheet (default 4). */
  spriteColumns?: number
}

const NPC1_SPRITE = publicAsset('Assets/Characters/npcs/npc1-idle-sheet.png')
const NPC2_SPRITE = publicAsset('Assets/Characters/npcs/npc2-idle-sheet.png')
const NPC3_SPRITE = publicAsset('Assets/Characters/npcs/npc3-idle-sheet.png')
const NPC4_SPRITE = publicAsset('Assets/Characters/npcs/npc4-idle-sheet.png')

/** NPCs rendered on the Daly City overworld map. */
export const WORLD_NPCS: NpcData[] = [
  {
    id: 'npc-playita',
    name: '',
    x: 150,
    y: 380,
    lines: [
      "you're him.",
      "thought you'd be taller.",
      "san bruno's waiting on you.",
    ],
    color: '#7a7a96',
    spriteSrc: NPC1_SPRITE,
    spriteColumns: 4,
  },
  {
    id: 'npc-crosswalk',
    name: '',
    x: 650,
    y: 620,
    lines: [
      "the darkline's been quiet lately.",
      'too quiet.',
      'that changes when you go down.',
    ],
    color: '#7a7a96',
    spriteSrc: NPC2_SPRITE,
    spriteColumns: 4,
  },
  {
    id: 'npc-south',
    name: '',
    x: 350,
    y: 620,
    lines: [
      "mark knows you're coming.",
      "he's been telling everybody.",
      'everybody already knew.',
    ],
    color: '#7a7a96',
    spriteSrc: NPC3_SPRITE,
    spriteColumns: 4,
  },
  {
    id: 'npc-donuts',
    name: '',
    x: 750,
    y: 330,
    lines: [
      'you got the jacket on.',
      "that means it's real.",
      "don't come back without getting through.",
    ],
    color: '#7a7a96',
    spriteSrc: NPC4_SPRITE,
    spriteColumns: 4,
  },
]

/** Mando — renders inside the 13 Gallons interior overlay. */
export const MANDO_NPC: NpcData = {
  id: 'mando',
  name: 'mando',
  x: 0,
  y: 0,
  lines: ['that\'s a fye red jacket though.', 'like the X-Men.'],
  color: '#c084fc',
}

export const NPC_SIZE = 32
export const NPC_INTERACT_RANGE = 30
