import type { CityId } from './cityConfig'
import {
  isE3Complete,
  isE3FieldIntroSeen,
  isE3SigilFlashed,
  isInterviewerDefeated,
  isMonkDefeated,
  isPreacherDefeated,
} from '../store/quest3Store'
import { isE3QuestUnlocked } from './quest3Objectives'
import type { NpcData } from './npcs'
import { DANNY_ALI_WALK_SRC } from '../constants/gameAssets'
import { publicAsset } from '../utils/publicAsset'

const INTERVIEWER_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/interviewer-idle.png')
const PREACHER_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/preacher-idle.png')
const MONK_IDLE_SPRITE = publicAsset('Assets/Characters/npcs/monk-idle.png')

/** Southside field — sigil beat (beat 2). */
export const E3_SOUTHSIDE_FIELD_SPAWN = { x: 480, y: 920 }

const DANNY_OBSERVER_BASE = {
  id: 'danny-observer',
  name: 'danny',
  lines: [] as string[],
  color: '#9696b0',
  spriteSrc: DANNY_ALI_WALK_SRC,
  spriteLayout: 'horizontal-bbox' as const,
  blocksMovement: false,
}

/** Danny watches from the 5ive edge (beat 1); no approach dialogue. */
export const DANNY_OBSERVER_FIVE_NPC: NpcData = {
  ...DANNY_OBSERVER_BASE,
  x: 200,
  y: 420,
  fixedFacing: 'right',
}

/** Danny watches the sigil moment on southside (beat 2). */
export const DANNY_OBSERVER_SOUTHSIDE_NPC: NpcData = {
  ...DANNY_OBSERVER_BASE,
  x: 260,
  y: 700,
  fixedFacing: 'right',
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

function e3Active(): boolean {
  return isE3QuestUnlocked() && !isE3Complete()
}

/**
 * E3 story NPCs for a city — locked chain: sigil → interviewer → preacher → monk.
 * Only one stranger form is active at a time; defeated forms despawn.
 */
export function getE3StoryNpcsForCity(cityId: CityId): NpcData[] {
  if (!e3Active()) return []

  if (cityId === 'five') {
    if (!isE3SigilFlashed()) {
      return [DANNY_OBSERVER_FIVE_NPC]
    }
    if (!isInterviewerDefeated()) {
      return [STRANGER_INTERVIEWER_NPC]
    }
    return []
  }

  if (cityId === 'southside') {
    if (isE3FieldIntroSeen() && !isE3SigilFlashed()) {
      return [DANNY_OBSERVER_SOUTHSIDE_NPC]
    }
    if (isInterviewerDefeated() && !isPreacherDefeated()) {
      return [STRANGER_PREACHER_NPC]
    }
    return []
  }

  if (cityId === 'san-bruno') {
    if (isPreacherDefeated() && !isMonkDefeated()) {
      return [STRANGER_MONK_NPC]
    }
  }

  return []
}
