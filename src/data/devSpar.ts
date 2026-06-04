// ── DEV ONLY: sparring dummy — REMOVE BEFORE LAUNCH ──
// grep "DEV ONLY" to find all launch-blockers.

import { publicAsset } from '../utils/publicAsset'
import { deriveBuildLoopType, type BuildLoopSkill } from './buildName'
import type { NpcCombatEntry } from './npcRegistry'
import type { LeanSkill } from './skillCounter'
import {
  computePlayerStats,
  DEFAULT_ARCHETYPE,
} from '../store/battleStore'
import { computePlayerLevel } from '../store/skillStore'
import { getPlayerSkills, getPlayerStoreState } from '../store/playerStore'
import type { SkillsState } from '../store/skillStore'

export const DEV_SPAR_NPC_ID = 'dev-spar'

const DEV_SPAR_SPRITE = publicAsset('Assets/Characters/npcs/Walker-idle.png')

/** HARD sparring moveset — strike, brace, feint, telegraphed heavy. */
const DEV_SPAR_MOVES = ['STRIKE', 'HOLD', 'SLIP', 'HAYMAKER'] as const

const HP_MULT = 1.2
const ATK_MULT = 1.2
const DEF_MULT = 1.15
const SPD_MULT = 1.15

export function isDevSparNpcId(npcId: string): boolean {
  return npcId === DEV_SPAR_NPC_ID
}

function dominantCombatSkill(skills: SkillsState): BuildLoopSkill {
  const ranked: { skill: BuildLoopSkill; level: number }[] = [
    { skill: 'attack', level: skills.attack.level },
    { skill: 'speed', level: skills.speed.level },
    { skill: 'defense', level: skills.defense.level },
    { skill: 'luck', level: skills.luck.level },
  ]
  ranked.sort((a, b) => b.level - a.level)
  return ranked[0]!.skill
}

/** Lean into the skill that softly counters the player's current build. */
function sparLeanSkill(skills: SkillsState): LeanSkill {
  const playerType = deriveBuildLoopType(skills)
  if (!playerType) {
    return dominantCombatSkill(skills)
  }
  const beats: Record<BuildLoopSkill, BuildLoopSkill> = {
    attack: 'speed',
    speed: 'luck',
    luck: 'defense',
    defense: 'attack',
  }
  return beats[playerType]
}

/** Builds a level-matched sparring partner from live player state. */
export function buildDevSpar(): NpcCombatEntry {
  const player = getPlayerStoreState()
  const skills = getPlayerSkills()
  const playerStats = computePlayerStats(
    player.archetype ?? DEFAULT_ARCHETYPE,
    player.accessories ?? [],
    skills,
  )

  const maxHp = Math.max(1, Math.round(playerStats.maxHp * HP_MULT))
  const atk = Math.max(1, Math.round(playerStats.atk * ATK_MULT))
  const def = Math.max(1, Math.round(playerStats.def * DEF_MULT))
  const spd = Math.max(1, Math.round(playerStats.spd * SPD_MULT))

  return {
    id: DEV_SPAR_NPC_ID,
    displayName: 'sparring partner',
    level: computePlayerLevel(skills),
    stats: { hp: maxHp, maxHp, atk, def, spd },
    moves: [...DEV_SPAR_MOVES],
    leanSkill: sparLeanSkill(skills),
    losingLine: 'good. again?',
    spriteSrc: DEV_SPAR_SPRITE,
    battleLocation: 'five',
    battleSizeMult: 1,
  }
}
