import type { PlayerMoveId } from './moveIds'
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
  moves: readonly PlayerMoveId[]
  leanSkill: LeanSkill
  telegraphFlavor: NpcTelegraphFlavor
  guardCounter?: { chance: number; damageMult: number }
  enemyGuardPierce?: number
  spriteSrc: string
  spriteColumns?: number
  battleBg: string
  battleSizeMult?: number
}

export type GymWeekScoringMode = 'one-and-done' | 'clear-count'

export type GymWeekDefinition = {
  /** Stable id, badge value uses `gym-week-${id}`. */
  id: string
  weekNumber: number
  /** How weekly standings rank players for this week. */
  scoringMode: GymWeekScoringMode
  /** Optional all-caps banner on gym entry leaderboard pop. */
  announcement?: string
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
  henchmen: readonly GymFighterConfig[]
}

const GYM_BATTLE_BG = publicAsset('Assets/battle-bg/5ive-gym.png')
const JEROME_SPRITE = publicAsset('Assets/Characters/npcs/5ive-gym1.png')
const NPC2_SPRITE = publicAsset('Assets/Characters/npcs/npc2-idle-sheet.png')
const JASON_SPRITE = publicAsset('Assets/Characters/npcs/jason-idle.png')
const JACLYN_SPRITE = publicAsset('Assets/Characters/npcs/jaclyn-idle.png')
const AGENT5_SPRITE = publicAsset('Assets/Characters/npcs/week2-gym.png')
const DARREN_SPRITE = publicAsset('Assets/Characters/npcs/npc10-idle.png')
const LYNN_SPRITE = publicAsset('Assets/Characters/npcs/npc11-idle.png')

/** Ordered weekly lineups, author new weeks by appending entries. */
export const GYM_WEEKS: readonly GymWeekDefinition[] = [
  {
    id: '1',
    weekNumber: 1,
    scoringMode: 'one-and-done',
    leader: {
      combatId: WEEK1_LEADER_NPC_ID,
      npcId: WEEK1_LEADER_NPC_ID,
      displayName: 'Jerome',
      name: 'Jerome',
      level: 10,
      fixedHp: 120,
      moves: ['STRIKE', 'PARRY', 'PARRY', 'PARRY', 'CANNON', 'LOOP', 'LOOP'],
      leanSkill: 'defense',
      guardCounter: { chance: 0.7, damageMult: 2.85 },
      enemyGuardPierce: 0.55,
      telegraphFlavor: {
        STRIKE: 'cuts through',
        PARRY: 'dares you to swing',
        CANNON: 'loads up',
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
        moves: ['STRIKE', 'PARRY', 'CANNON'],
        leanSkill: 'defense',
        telegraphFlavor: {
          STRIKE: 'sets a jab',
          PARRY: 'opens up',
          CANNON: 'winds up',
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
        moves: ['STRIKE', 'PARRY', 'PARRY', 'LOOP'],
        leanSkill: 'speed',
        telegraphFlavor: {
          STRIKE: 'feints, then jabs',
          PARRY: 'leaves a gap',
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
        moves: ['STRIKE', 'PARRY', 'PARRY', 'CANNON', 'LOOP'],
        leanSkill: 'attack',
        telegraphFlavor: {
          STRIKE: 'cuts in',
          PARRY: 'dares you forward',
          CANNON: 'commits heavy',
          LOOP: 'spins the loop',
        },
        spriteSrc: JACLYN_SPRITE,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 1,
      },
    ],
  },
  {
    id: '2',
    weekNumber: 2,
    scoringMode: 'clear-count',
    announcement:
      'GYM CHALLENGE 2 IS LIVE! BEAT AGENT 5 AND HIS MINIONS AS MANY TIMES AS POSSIBLE FOR A PRIZE.',
    leader: {
      combatId: 'gym-week-2-leader',
      npcId: 'agent-5-gym',
      displayName: 'Agent 5',
      name: 'Agent 5',
      level: 14,
      fixedHp: 145,
      moves: ['STRIKE', 'WHISPER', 'LOOP', 'CANNON', 'PARRY', 'PARRY'],
      leanSkill: 'attack',
      guardCounter: { chance: 0.55, damageMult: 2.6 },
      enemyGuardPierce: 0.42,
      telegraphFlavor: {
        STRIKE: 'cuts lucky',
        WHISPER: 'whispers odds',
        LOOP: 'the loop lands',
        CANNON: 'loads heavy',
        PARRY: 'dares you in',
      },
      spriteSrc: AGENT5_SPRITE,
      spriteColumns: 4,
      battleBg: GYM_BATTLE_BG,
      battleSizeMult: 1.05,
      dialogue: {
        intro:
          'challenge two. three fights, two henchmen, then me. clear as many times as you can before sunday night.',
        inProgress: "you're mid-run. pick up where you left off or restart from darren.",
        cleared: 'another clear on the board. keep stacking — first clear got your seal.',
        loss: 'back to darren. run it again.',
      },
    },
    henchmen: [
      {
        combatId: 'gym-week-2-h1',
        displayName: 'Darren',
        level: 9,
        fixedHp: 95,
        moves: ['STRIKE', 'STRIKE', 'CANNON', 'CANNON', 'LOOP'],
        leanSkill: 'attack',
        telegraphFlavor: {
          STRIKE: 'hammers through',
          CANNON: 'commits heavy',
          LOOP: 'spins the loop',
        },
        spriteSrc: DARREN_SPRITE,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 1,
      },
      {
        combatId: 'gym-week-2-h2',
        displayName: 'Lynn',
        level: 11,
        fixedHp: 110,
        moves: ['SLIP', 'SLIP', 'PARRY', 'PARRY', 'STRIKE', 'WHISPER'],
        leanSkill: 'speed',
        telegraphFlavor: {
          SLIP: 'slips inside',
          PARRY: 'walls up',
          STRIKE: 'quick jab',
          WHISPER: 'feints lucky',
        },
        spriteSrc: LYNN_SPRITE,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 0.98,
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

export function getGymLeaderFightIndex(week: GymWeekDefinition): number {
  return week.henchmen.length
}

export function getGymTotalFights(week: GymWeekDefinition): number {
  return week.henchmen.length + 1
}

export function gymWeekUsesClearCountScoring(week: GymWeekDefinition): boolean {
  return week.scoringMode === 'clear-count'
}

export function getGymRunCombatId(week: GymWeekDefinition, fightIndex: number): string {
  const leaderIndex = getGymLeaderFightIndex(week)
  if (fightIndex < 0 || fightIndex > leaderIndex) {
    throw new Error(`Invalid gym fight index: ${fightIndex}`)
  }
  if (fightIndex < leaderIndex) return week.henchmen[fightIndex]!.combatId
  return week.leader.combatId
}

/** UI copy for gauntlet progress within a run. */
export function gymRunProgressLabel(fightIndex: number, week?: GymWeekDefinition): string {
  const henchmanCount = week?.henchmen.length ?? 3
  const leaderIndex = week ? getGymLeaderFightIndex(week) : 3
  if (fightIndex >= leaderIndex) return 'the leader'
  return `henchman ${fightIndex + 1} of ${henchmanCount}`
}

export function gymGauntletWelcomeLine(week: GymWeekDefinition): string {
  const fights = getGymTotalFights(week)
  const henchmen = week.henchmen.length
  return `one run. ${fights} fights, ${henchmen} henchmen, then the leader. full heal between each. one loss sends you back to the start.`
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
