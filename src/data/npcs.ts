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
  /** Optional gate lines before quest prerequisites (mark only). */
  linesBlocked?: NpcDialogueLine[]
  color: string
  /** Path to an idle sprite sheet (horizontal strip: down, up, left, right). */
  spriteSrc?: string
  /** Number of direction columns in the sprite sheet (default 4). */
  spriteColumns?: number
  /** When set, overworld sprite always faces this direction (no idle rotation). */
  fixedFacing?: Direction
}

const NPC1_SPRITE = publicAsset('Assets/Characters/npcs/npc1-idle-sheet.png')
const NPC2_SPRITE = publicAsset('Assets/Characters/npcs/npc2-idle-sheet.png')
const NPC3_SPRITE = publicAsset('Assets/Characters/npcs/npc3-idle-sheet.png')
const NPC4_SPRITE = publicAsset('Assets/Characters/npcs/npc4-idle-sheet.png')

/** Quest 1 gating NPC — near laundromat (left storefront). */
export const GATING_NPC_1: NpcData = {
  id: 'npc1',
  name: '',
  x: 220,
  y: 360,
  lines: [
    "you're up. okay. okay okay okay.",
    "you don't know what you are yet. that's normal. move. just move first.",
  ],
  color: '#7a7a96',
  spriteSrc: NPC1_SPRITE,
  spriteColumns: 4,
}

/** Quest 1 gating NPC — near 13 Gallons (center). */
export const GATING_NPC_2: NpcData = {
  id: 'npc2',
  name: '',
  x: 540,
  y: 400,
  lines: [
    "everybody here's waiting on something. is it you?",
  ],
  color: '#7a7a96',
  spriteSrc: NPC2_SPRITE,
  spriteColumns: 4,
}

/** Quest 1 gating NPC — near dental (right storefront). */
export const GATING_NPC_3: NpcData = {
  id: 'npc3',
  name: '',
  x: 880,
  y: 360,
  lines: [
    "there's a man. don't say his name loud? okay.",
    "they put up notices about him. you'll find one.",
  ],
  color: '#7a7a96',
  spriteSrc: NPC3_SPRITE,
  spriteColumns: 4,
}

/** Quest 1 gating NPC — lower / mid-map between districts. */
export const GATING_NPC_4: NpcData = {
  id: 'npc4',
  name: '',
  x: 420,
  y: 580,
  lines: [
    "the darkline's how you get anywhere. it goes through Mark, though.",
  ],
  color: '#7a7a96',
  spriteSrc: NPC4_SPRITE,
  spriteColumns: 4,
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
  x: 680,
  y: 520,
  lines: [
    'i heard you spawned. cute.',
    "everybody thinks they're the one.",
    'if you are, show me then.',
  ],
  linesConverted: [
    'oh.',
    'i get it now. i get it.',
    "tell me where to go. tell me what to say. i'll say it exactly.",
  ],
  color: '#7a7a96',
  spriteSrc: NPC2_SPRITE,
  spriteColumns: 4,
}

/** Quest 1 — second conversion fight in Daly City (placeholder sprite). */
export const JACLYN_NPC: NpcData = {
  id: 'jaclyn',
  name: 'jaclyn',
  x: 820,
  y: 500,
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
  // TODO: Replace with dedicated Jaclyn idle sprite sheet when art is ready.
  spriteSrc: NPC3_SPRITE,
  spriteColumns: 4,
}

/** Mark — Darkline guard; blocks stairs until Quest 1 complete. */
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
  // TODO: Replace with dedicated Mark idle sprite sheet when art is ready.
  spriteSrc: NPC3_SPRITE,
  spriteColumns: 4,
  fixedFacing: 'up',
}

/** Adam — Prelude MP3 player handoff, placed near Daly City spawn (see cityConfig). */
export const ADAM_NPC: NpcData = {
  id: 'adam',
  name: 'adam',
  x: 560,
  y: 480,
  lines: ["you'll need this."],
  color: '#afa9ec',
  // TODO: Swap in dedicated Adam idle sprite sheet when art is ready.
  spriteSrc: NPC1_SPRITE,
  spriteColumns: 4,
}

/** Daly City overworld NPCs (spawn → block → Darkline gate). */
export const DALY_CITY_OVERWORLD_NPCS: readonly NpcData[] = [
  ADAM_NPC,
  ...GATING_NPCS,
  WALKER_NPC,
  JACLYN_NPC,
  MARK_NPC,
]

/** Mando — renders inside the 13 Gallons interior overlay. */
export const MANDO_NPC: NpcData = {
  id: 'mando',
  name: 'mando',
  x: 0,
  y: 0,
  lines: ["That's a fye red jacket. Like the X-Men."],
  color: '#c084fc',
}

export const NPC_SIZE = 32
export const NPC_INTERACT_RANGE = 30
