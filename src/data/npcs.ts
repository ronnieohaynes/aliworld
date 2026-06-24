import type { Direction } from '../game/SpriteSheet'
import { publicAsset } from '../utils/publicAsset'

export type NpcDialogueLine = string | { speaker: string; text: string }

export type NpcData = {
  id: string
  name: string
  x: number
  y: number
  /** Default / pre-fight lines (strings or { speaker, text } for multi-speaker). */
  lines: NpcDialogueLine[]
  /** Shown after conversion (walker/jaclyn) or defeat (mark). */
  linesConverted?: NpcDialogueLine[]
  /** Optional lines prepended when a story prerequisite is met (e.g. herald). */
  linesHerald?: NpcDialogueLine[]
  /** Optional gate lines before quest prerequisites (mark only). */
  linesBlocked?: NpcDialogueLine[]
  color: string
  /** Path to an idle sprite sheet (horizontal strip: down, up, left, right). */
  spriteSrc?: string
  /**
   * `strip-columns`, equal-width columns (gating NPC placeholders).
   * `horizontal-bbox`, 1536×1024 story sheets; one idle pose per direction, bbox-cropped.
   */
  spriteLayout?: 'strip-columns' | 'horizontal-bbox'
  /** Number of direction columns in the sprite sheet (default 4; strip-columns only). */
  spriteColumns?: number
  /** When set, overworld sprite always faces this direction (no idle rotation). */
  fixedFacing?: Direction
  /** When false, the player can walk through this NPC (interact range unchanged). */
  blocksMovement?: boolean
  /** Optional tight movement hitbox (world pixels at design scale; map applies WORLD_NPC_MAP_SCALE). */
  collisionWidth?: number
  collisionHeight?: number
  /** Shifts a custom hitbox up (world pixels; positive = north). */
  collisionOffsetY?: number
  /** Shifts a custom hitbox east (world pixels; positive = right). */
  collisionOffsetX?: number
}

const NPC1_SPRITE = publicAsset('Assets/Characters/npcs/npc1-idle-sheet.png')
const NPC2_SPRITE = publicAsset('Assets/Characters/npcs/npc2-idle-sheet.png')
const NPC4_SPRITE = publicAsset('Assets/Characters/npcs/npc4-idle-sheet.png')
const NPC5_IDLE_SPRITE = `${publicAsset('Assets/Characters/npcs/npc5-idle.PNG')}?v=3`
const NPC6_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/npc6-idle.png')
const NPC7_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/npc7-idle.png')
const NPC8_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/npc8-idle.png')
const NPC9_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/npc9-idle.png')

const ADAM_IDLE_SPRITE = `${publicAsset('Assets/Characters/npcs/Adam-idle.PNG')}?v=2`
const MARK_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/mark-idle.png')
const JACLYN_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/jaclyn-idle.png')
const WALKER_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/Walker-idle.png')
const JASON_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/jason-idle.png')
const CLERK_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/clerk-idle.png')
const RESTOCKER_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/restocker-idle.png')
const TOWN_CRIER_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/towncrier-idle.png')
/** Story art on disk; Jason is dialogue-only on Mark's lines (no overworld spawn). */
export { JASON_IDLE_SPRITE, TOWN_CRIER_IDLE_SPRITE, CLERK_IDLE_SPRITE, RESTOCKER_IDLE_SPRITE }

/** Quest 1 gating NPC, Bayview Grocery sidewalk (upper-left). */
export const GATING_NPC_1: NpcData = {
  id: 'npc1',
  name: '',
  x: 130,
  y: 360,
  lines: [
    "you're up. okay. okay okay okay.",
    "you don't know what you are yet. that's normal. move. just move first.",
  ],
  color: '#7a7a96',
  spriteSrc: NPC1_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Quest 1 gating NPC, main road, left of center. */
export const GATING_NPC_2: NpcData = {
  id: 'npc2',
  name: '',
  x: 340,
  y: 505,
  lines: [
    "everybody here's waiting on something. is it you?",
  ],
  color: '#7a7a96',
  spriteSrc: NPC2_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Quest 1 gating NPC, far east sidewalk. */
export const GATING_NPC_3: NpcData = {
  id: 'npc3',
  name: '',
  x: 1140,
  y: 520,
  lines: [
    "there's a man. don't say his name loud? okay.",
    "they put up notices about him. you'll find one.",
  ],
  color: '#7a7a96',
  spriteSrc: NPC5_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Quest 1 gating NPC, west sidewalk. */
export const GATING_NPC_4: NpcData = {
  id: 'npc4',
  name: '',
  x: 70,
  y: 580,
  lines: [
    "the darkline's how you get anywhere. it goes through Mark, though.",
    "adam's got something for you. start there.",
  ],
  color: '#7a7a96',
  spriteSrc: NPC4_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

export const GATING_NPCS: readonly NpcData[] = [
  GATING_NPC_1,
  GATING_NPC_2,
  GATING_NPC_3,
  GATING_NPC_4,
]

export const WALKER_NPC: NpcData = {
  id: 'walker',
  name: 'walker',
  x: 800,
  y: 508,
  lines: [
    'i heard you spawned. cute.',
    "everybody thinks they're the one.",
    'if you are, show me then.',
  ],
  linesConverted: [
    'oh.',
    'i get it now. i get it.',
    "tell me where to go. tell me what to say. i'll say it exactly.",
    "i told you. i told all of you. exactly like he said.",
  ],
  color: '#7a7a96',
  spriteSrc: WALKER_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Quest 1, second conversion fight; Sunset Bakery sidewalk (upper-right). */
export const JACLYN_NPC: NpcData = {
  id: 'jaclyn',
  name: 'jaclyn',
  x: 1060,
  y: 358,
  lines: [
    'i know what you did to walker.',
    "he was annoying but he was HIM. now he's... different.",
    "i'm not scared of you. i just don't think you should.",
  ],
  linesConverted: [
    "...oh. you're right. of course you're right.",
    'why was i fighting this?',
  ],
  color: '#7a7a96',
  spriteSrc: JACLYN_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Mark, Darkline guard; blocks stairs until Quest 1 complete. */
export const MARK_NPC: NpcData = {
  id: 'mark',
  name: 'mark',
  x: 598,
  y: 795,
  linesBlocked: ['you better ask around.'],
  lines: [
    'everybody wants through. nobody gets through.',
    "you're not the first to wear that jacket either.",
    { speaker: 'jason', text: 'just send it, mark.' },
    '...yeah. send it.',
  ],
  linesConverted: ['huh.', 'goat yoga...where do you want me.'],
  color: '#c084fc',
  spriteSrc: MARK_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
  fixedFacing: 'up',
}

/** Adam, Prelude MP3 player handoff, placed near five spawn (see cityConfig). */
export const ADAM_NPC: NpcData = {
  id: 'adam',
  name: 'adam',
  x: 560,
  y: 480,
  lines: [
    "tap interact to say what's up. like you just did.",
    "when someone gives you an artifact it shows up in your fanny pack.",
    "you'll need this.",
  ],
  color: '#afa9ec',
  spriteSrc: ADAM_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** the 5ive overworld NPCs (spawn → block → Darkline gate). */
export const FIVE_OVERWORLD_NPCS: readonly NpcData[] = [
  ADAM_NPC,
  ...GATING_NPCS,
  WALKER_NPC,
  JACLYN_NPC,
  MARK_NPC,
]

/** Quest 2, crowd outside the 5ive after e1. */
export const CROWD_1_NPC: NpcData = {
  id: 'crowd1',
  name: 'crowd',
  x: 520,
  y: 420,
  lines: ["he's back. that's him. that's the one."],
  linesConverted: ['so do something. prove it again. we want to see.'],
  color: '#9696b0',
  spriteSrc: NPC2_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

export const CROWD_2_NPC: NpcData = {
  id: 'crowd2',
  name: 'crowd',
  x: 680,
  y: 440,
  lines: ["i heard he got walker. i heard he got jaclyn too."],
  color: '#9696b0',
  spriteSrc: NPC4_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Quest 2, returning walker in the e2 crowd (converted; faintly wrong). */
export const WALKER_E2_CROWD_NPC: NpcData = {
  id: 'walker-crowd',
  name: 'walker',
  x: 760,
  y: 400,
  lines: [
    "i told you. i told all of you. exactly like he said.",
    "you're late. you should've listened sooner.",
  ],
  color: '#7a7a96',
  spriteSrc: WALKER_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Quest 2, town crier at the 5ive. */
export const TOWN_CRIER_NPC: NpcData = {
  id: 'town-crier',
  name: 'town crier',
  x: 600,
  y: 380,
  lines: [
    'who is this guy? a crowd will follow anybody who looks sure.',
    "i don't think you're sure.",
    'convince me.',
  ],
  linesConverted: [
    "...no. no, you're right. you were always right.",
    "i'll tell them. everyone. they'll listen this time.",
    'send me ahead. they need to hear it before you arrive.',
  ],
  color: '#c084fc',
  spriteSrc: TOWN_CRIER_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Quest 2, blue store clerk (dialogue/combat template; placement in blueStoreNpcs.ts). */
export const CLERK_NPC: NpcData = {
  id: 'clerk',
  name: 'clerk',
  x: 0,
  y: 0,
  lines: [
    'i run this store.',
    'you want in? you go through me.',
  ],
  /** Prepended once the herald has reached southside. */
  linesHerald: ['the crier came through here an hour ago.'],
  linesConverted: [
    "the gift... it's priceless.",
    'everyone should have one. everyone.',
  ],
  color: '#4488cc',
  spriteSrc: CLERK_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Quest 2, restocker boss (dialogue/combat template; placement in blueStoreNpcs.ts). */
export const RESTOCKER_NPC: NpcData = {
  id: 'restocker',
  name: 'restocker',
  x: 0,
  y: 0,
  lines: [
    'who is this dude?',
    "my only job is to fix what's in front of me. let's see you try.",
  ],
  linesConverted: ['it CAN stop...', "he'll know soon enough."],
  color: '#cc4444',
  spriteSrc: RESTOCKER_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Southside overworld — fights live in blue-store-interior. */
export const SOUTHSIDE_OVERWORLD_NPCS: readonly NpcData[] = [
  {
    id: 'southside-local-1',
    name: '',
    x: 380,
    y: 720,
    lines: ['parking lot stays full. always something moving.'],
    color: '#9696b0',
    spriteSrc: NPC8_IDLE_SPRITE,
    spriteLayout: 'horizontal-bbox',
    fixedFacing: 'right',
  },
  {
    id: 'southside-local-2',
    name: '',
    x: 720,
    y: 620,
    lines: ['blue store draws a crowd even when nothing happens.'],
    color: '#9696b0',
    spriteSrc: NPC9_IDLE_SPRITE,
    spriteLayout: 'horizontal-bbox',
    fixedFacing: 'down',
  },
]

/** Hillcrest overworld ambient locals (san-bruno). */
export const HILLCREST_OVERWORLD_NPCS: readonly NpcData[] = [
  {
    id: 'hillcrest-local-1',
    name: '',
    x: 420,
    y: 520,
    lines: ['hillcrest moves slower. you feel it when you stop rushing.'],
    color: '#9696b0',
    spriteSrc: NPC6_IDLE_SPRITE,
    spriteLayout: 'horizontal-bbox',
    fixedFacing: 'down',
  },
  {
    id: 'hillcrest-local-2',
    name: '',
    x: 880,
    y: 680,
    lines: ['one love stays loud even on quiet days.'],
    color: '#9696b0',
    spriteSrc: NPC7_IDLE_SPRITE,
    spriteLayout: 'horizontal-bbox',
    fixedFacing: 'left',
  },
]

/** Plot repeat — Mark at Hillcrest Darkline after first travel (GameScreen gates spawn). */
export const HILLCREST_MARK_NPC: NpcData = {
  id: 'hillcrest-mark',
  name: 'mark',
  x: 565,
  y: 95,
  lines: ['goat yoga...where do you want me.'],
  color: '#c084fc',
  spriteSrc: MARK_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
  fixedFacing: 'up',
  blocksMovement: true,
}

/** Mando, renders inside the 13 Gallons interior overlay. */
export const MANDO_NPC: NpcData = {
  id: 'mando',
  name: 'mando',
  x: 0,
  y: 0,
  lines: ["That's a fye red jacket. Like the X-Men."],
  color: '#c084fc',
}

export const NPC_SIZE = 32
/** Max distance to an NPC interact anchor for talk / interact. */
export const NPC_INTERACT_RANGE = 48
