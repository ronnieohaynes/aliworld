import { DANNY_ALI_WALK_SRC } from '../constants/gameAssets'
import { publicAsset } from '../utils/publicAsset'
import type { NpcData } from './npcs'

const INTERVIEWER_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/interviewer-idle.png')
const PREACHER_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/preacher-idle.png')
const MONK_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/monk-idle.png')

/** Southside field plaza — E3 opening spawn. */
export const E3_SOUTHSIDE_FIELD_SPAWN = { x: 480, y: 920 }

/** Danny watches from the field edge (beats 1–2); no approach dialogue. */
export const DANNY_OBSERVER_NPC: NpcData = {
  id: 'danny-observer',
  name: 'danny',
  x: 260,
  y: 700,
  lines: [],
  color: '#9696b0',
  spriteSrc: DANNY_ALI_WALK_SRC,
  spriteLayout: 'horizontal-bbox',
  fixedFacing: 'right',
  blocksMovement: false,
}

/** Stranger form 1/3 — the 5ive. */
export const STRANGER_INTERVIEWER_NPC: NpcData = {
  id: 'stranger-interviewer',
  name: 'stranger',
  x: 720,
  y: 520,
  lines: [
    'mind if i ask you something? just a few questions.',
    'why do you do this? the converting. what\'s it for.',
    "you don't have an answer. interesting.",
  ],
  linesConverted: ["...i'll find you again. i always do."],
  color: '#c084fc',
  spriteSrc: INTERVIEWER_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Stranger form 2/3 — southside field. */
export const STRANGER_PREACHER_NPC: NpcData = {
  id: 'stranger-preacher',
  name: 'stranger',
  x: 560,
  y: 800,
  lines: [
    "confession is good for you. tell me what you're saving them from.",
    "you can't. because you don't know.",
    "you're not the cure. you might be the thing going around.",
  ],
  linesConverted: ['...again. you\'ll see me again.'],
  color: '#c084fc',
  spriteSrc: PREACHER_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
}

/** Stranger form 3/3 — hillcrest. */
export const STRANGER_MONK_NPC: NpcData = {
  id: 'stranger-monk',
  name: 'stranger',
  x: 520,
  y: 480,
  lines: ['...', 'who told you he was the enemy?', "you never asked. that's the whole of it."],
  linesConverted: ["now there's no one left to ask."],
  color: '#c084fc',
  spriteSrc: MONK_IDLE_SPRITE,
  spriteLayout: 'horizontal-bbox',
  fixedFacing: 'down',
}
