import type { EnemyMoveId } from './enemyMoves'
import type { LeanSkill } from './skillCounter'
import type { NpcTelegraphFlavor } from './npcRegistry'
import { publicAsset } from '../utils/publicAsset'

/** Week 1 leader, legacy overworld + combat id. */
export const WEEK1_LEADER_NPC_ID = '5ive-gym1'

import {
  getAbsoluteWeekIndex as scheduleAbsoluteWeekIndex,
  getGymWeekStartMs,
  MS_PER_GYM_WEEK,
} from './gymWeekSchedule'

/** Monday 00:00 PT, week index 0 starts here (first live gym week). */
export const GYM_WEEK_EPOCH_MS = getGymWeekStartMs(0)
export { MS_PER_GYM_WEEK }

export type GymFighterConfig = {
  combatId: string
  displayName: string
  level: number
  fixedHp: number
  moves: readonly EnemyMoveId[]
  leanSkill: LeanSkill
  telegraphFlavor: NpcTelegraphFlavor
  guardCounter?: { chance: number; damageMult: number }
  enemyGuardPierce?: number
  spriteSrc: string
  spriteColumns?: number
  battleBg: string
  battleSizeMult?: number
}

export type GymWeekDefinition = {
  /** Stable id, badge value uses `gym-week-${id}`. */
  id: string
  weekNumber: number
  leader: GymFighterConfig & {
    /** Overworld / dialogue npc id (week 1 keeps legacy `5ive-gym1`). */
    npcId: string
    name: string
    dialogue: {
      intro: string
      inProgress: string
      cleared: string
      loss: string
    }
  }
  henchmen: readonly [GymFighterConfig, GymFighterConfig, GymFighterConfig]
}

const GYM_BATTLE_BG = publicAsset('Assets/battle-bg/5ive-gym.png')
const JEROME_SPRITE = publicAsset('Assets/Characters/npcs/5ive-gym1.png')
const NPC2_SPRITE = publicAsset('Assets/Characters/npcs/npc2-idle-sheet.png')
const JASON_SPRITE = publicAsset('Assets/Characters/npcs/jason-idle.png')
const JACLYN_SPRITE = publicAsset('Assets/Characters/npcs/jaclyn-idle.png')

/** Ordered weekly lineups, author new weeks by appending entries. */
export const GYM_WEEKS: readonly GymWeekDefinition[] = [
  {
    id: '1',
    weekNumber: 1,
    leader: {
      combatId: WEEK1_LEADER_NPC_ID,
      npcId: WEEK1_LEADER_NPC_ID,
      displayName: 'Jerome',
      name: 'Jerome',
      level: 10,
      fixedHp: 120,
      moves: ['STRIKE', 'BAIT', 'BAIT', 'BAIT', 'HAYMAKER', 'LOOP', 'LOOP'],
      leanSkill: 'defense',
      guardCounter: { chance: 0.7, damageMult: 2.85 },
      enemyGuardPierce: 0.55,
      telegraphFlavor: {
        STRIKE: 'cuts through',
        BAIT: 'dares you to swing',
        HAYMAKER: 'loads up',
        LOOP: 'the loop is coming',
      },
      spriteSrc: JEROME_SPRITE,
      spriteColumns: 4,
      battleBg: GYM_BATTLE_BG,
      battleSizeMult: 1.02,
      dialogue: {
        intro: 'week one. four fights, one run, three henchmen, then me. one loss sends you back to the start.',
        inProgress: "you're mid-run. pick up where you left off or restart from the top.",
        cleared: "week one's yours. come back next week, practice anytime.",
        loss: "come back when you're ready.",
      },
    },
    henchmen: [
      {
        combatId: 'gym-week-1-h1',
        displayName: 'Bag Work',
        level: 4,
        fixedHp: 55,
        moves: ['STRIKE', 'BAIT', 'HAYMAKER'],
        leanSkill: 'defense',
        telegraphFlavor: {
          STRIKE: 'sets a jab',
          BAIT: 'opens up',
          HAYMAKER: 'winds up',
        },
        spriteSrc: NPC2_SPRITE,
        spriteColumns: 4,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 0.95,
      },
      {
        combatId: 'gym-week-1-h2',
        displayName: 'Sparring',
        level: 6,
        fixedHp: 70,
        moves: ['STRIKE', 'BAIT', 'BAIT', 'LOOP'],
        leanSkill: 'speed',
        telegraphFlavor: {
          STRIKE: 'feints, then jabs',
          BAIT: 'leaves a gap',
          LOOP: 'draws the loop',
        },
        spriteSrc: JASON_SPRITE,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 0.98,
      },
      {
        combatId: 'gym-week-1-h3',
        displayName: 'Corner',
        level: 8,
        fixedHp: 90,
        moves: ['STRIKE', 'BAIT', 'BAIT', 'HAYMAKER', 'LOOP'],
        leanSkill: 'attack',
        telegraphFlavor: {
          STRIKE: 'cuts in',
          BAIT: 'dares you forward',
          HAYMAKER: 'commits heavy',
          LOOP: 'spins the loop',
        },
        spriteSrc: JACLYN_SPRITE,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 1,
      },
    ],
  },
] as const

export const GYM_STREAK_MILESTONES = [
  { streak: 2, badgeValue: 'gym-streak-2', label: '2-WEEK STREAK' },
  { streak: 4, badgeValue: 'gym-streak-4', label: '4-WEEK STREAK' },
  { streak: 8, badgeValue: 'gym-streak-8', label: '8-WEEK STREAK' },
] as const

export function gymWeekBadgeValue(weekId: string): string {
  return `gym-week-${weekId}`
}

export function gymWeekBadgeLabel(weekNumber: number): string {
  return `WEEK ${weekNumber} CHAMPION`
}

export function getAbsoluteWeekIndex(nowMs = Date.now()): number {
  return scheduleAbsoluteWeekIndex(nowMs)
}

export function getGymWeekById(weekId: string): GymWeekDefinition | undefined {
  return GYM_WEEKS.find((w) => w.id === weekId)
}

/** Live lineup for rewards, rotates through GYM_WEEKS by calendar week. */
export function getCurrentGymWeek(nowMs = Date.now()): GymWeekDefinition {
  const abs = getAbsoluteWeekIndex(nowMs)
  return GYM_WEEKS[abs % GYM_WEEKS.length]!
}

export function isCurrentGymWeek(weekId: string, nowMs = Date.now()): boolean {
  return getCurrentGymWeek(nowMs).id === weekId
}

/** Weeks that have rotated out of the live slot, practice only, no rewards. */
export function getRetiredGymWeeks(nowMs = Date.now()): GymWeekDefinition[] {
  const abs = getAbsoluteWeekIndex(nowMs)
  const current = getCurrentGymWeek(nowMs)
  const retired: GymWeekDefinition[] = []
  for (let slot = 0; slot < GYM_WEEKS.length; slot += 1) {
    const week = GYM_WEEKS[slot]!
    if (week.id === current.id) continue
    if (abs >= slot) retired.push(week)
  }
  return retired
}

export function getGymRunCombatId(week: GymWeekDefinition, fightIndex: number): string {
  if (fightIndex < 0 || fightIndex > 3) {
    throw new Error(`Invalid gym fight index: ${fightIndex}`)
  }
  if (fightIndex < 3) return week.henchmen[fightIndex]!.combatId
  return week.leader.combatId
}

/** UI copy for gauntlet progress within a run. */
export function gymRunProgressLabel(fightIndex: number): string {
  if (fightIndex <= 0) return 'henchman 1 of 3'
  if (fightIndex === 1) return 'henchman 2 of 3'
  if (fightIndex === 2) return 'henchman 3 of 3'
  return 'the leader'
}

export function isGymGauntletCombatId(combatId: string): boolean {
  for (const week of GYM_WEEKS) {
    if (week.leader.combatId === combatId) return true
    for (const h of week.henchmen) {
      if (h.combatId === combatId) return true
    }
  }
  return false
}

export function findGymWeekForCombatId(combatId: string): GymWeekDefinition | undefined {
  for (const week of GYM_WEEKS) {
    if (week.leader.combatId === combatId) return week
    if (week.henchmen.some((h) => h.combatId === combatId)) return week
  }
  return undefined
}
