import { getCombatRng } from './combatRng'
import {
  CROSS_SCALE,
  crossSecondaryBonus,
  crossSecondaryMultiplier,
  defParryCounterBonus,
  speedCounterBonus,
  speedDodgeBonus,
  speedDodgeSuccessChance,
  luckDodgeSuccessChance,
} from './moveBalance'
import type { PlayerMoveId } from './moveIds'
import type { MoveDodgeProfile } from './moveTypes'

const jitter = (d: number) => getCombatRng().jitter(d)

/** Enemy NPC dodge chance from raw SPD stat (mirrors legacy battleStore formula). */
export function enemyStatDodgeSuccessChance(spdStat: number): number {
  return Math.min(0.65, 0.3 + spdStat * 0.02)
}

export function playerDodgeSuccessChance(
  moveId: PlayerMoveId,
  speedSkillLevel: number,
  luckSkillLevel: number,
): number {
  return moveId === 'PARRY'
    ? luckDodgeSuccessChance(luckSkillLevel)
    : speedDodgeSuccessChance(speedSkillLevel)
}

export type PlayerDodgeInput = {
  moveId: PlayerMoveId
  profile: MoveDodgeProfile
  incomingHit: number
  atk: number
  attackSkillLevel: number
  speedSkillLevel: number
  defenseSkillLevel: number
  luckSkillLevel: number
  defStat: number
  lckStat: number
}

export type PlayerDodgeOutcome = {
  dodged: boolean
  incoming: number
  playerDmg: number
  stunApplied: boolean
}

/** Player SLIP/PARRY — shared with moveResolver. */
export function resolvePlayerDodgeMove(input: PlayerDodgeInput): PlayerDodgeOutcome {
  const d = input.profile
  const slipAtkBonus =
    input.moveId === 'SLIP'
      ? crossSecondaryBonus(
          input.attackSkillLevel,
          CROSS_SCALE.SLIP_COUNTER_ATK_PER_ATK_LVL,
          CROSS_SCALE.SLIP_COUNTER_ATK_CAP,
        )
      : 0
  const parryReflectScale =
    input.moveId === 'PARRY'
      ? crossSecondaryMultiplier(
          input.defenseSkillLevel,
          CROSS_SCALE.PARRY_REFLECT_DEF_PER_DEF_LVL,
          CROSS_SCALE.PARRY_REFLECT_DEF_CAP,
        )
      : 1
  const dodgeChance = playerDodgeSuccessChance(
    input.moveId,
    input.speedSkillLevel,
    input.luckSkillLevel,
  )

  if (input.incomingHit > 0) {
    if (getCombatRng().next() < dodgeChance) {
      const counterScale =
        input.moveId === 'PARRY'
          ? 1 + defParryCounterBonus(input.defenseSkillLevel)
          : 1 +
            speedDodgeBonus(input.speedSkillLevel) +
            speedCounterBonus(input.speedSkillLevel) +
            slipAtkBonus
      const counterBase = input.moveId === 'PARRY' ? input.defStat : input.atk
      let playerDmg = jitter(Math.floor(counterBase * d.counterMult * counterScale))
      let stunApplied = false
      if (getCombatRng().next() * 100 < d.stunChance.base + input.lckStat * d.stunChance.lckMult) {
        stunApplied = true
      }
      if (d.onDodgeReflectPct && input.incomingHit > 0) {
        playerDmg += Math.max(
          1,
          Math.floor(input.incomingHit * d.onDodgeReflectPct * parryReflectScale),
        )
      }
      return { dodged: true, incoming: 0, playerDmg, stunApplied }
    }
    return {
      dodged: false,
      incoming: jitter(Math.floor(input.incomingHit * d.weakMult)),
      playerDmg: jitter(Math.floor(input.atk * d.weakMult)),
      stunApplied: false,
    }
  }

  return {
    dodged: false,
    incoming: 0,
    playerDmg: jitter(Math.floor(input.atk * d.weakMult)),
    stunApplied: false,
  }
}

export type EnemyDodgeInput = {
  profile: MoveDodgeProfile
  spdStat: number
  atkStat: number
  incomingPlayerDmg: number
  playerActed: boolean
}

export type EnemyDodgeOutcome = {
  playerDmg: number
  enemyDodged: boolean
  incomingCounter: number
  enemyAttacks: boolean
}

/** Enemy SLIP/PARRY vs player outgoing — shared with battleEngine. */
export function resolveEnemyDodgeMove(input: EnemyDodgeInput): EnemyDodgeOutcome | null {
  if (!input.playerActed || input.incomingPlayerDmg <= 0) return null

  const d = input.profile
  const dodgeChance = enemyStatDodgeSuccessChance(input.spdStat)

  if (getCombatRng().next() < dodgeChance) {
    const rawPlayerDmg = input.incomingPlayerDmg
    const counterScale = 1 + input.spdStat * 0.015
    let totalCounter = Math.max(1, Math.floor(input.atkStat * d.counterMult * counterScale))
    if (d.onDodgeReflectPct && rawPlayerDmg > 0) {
      totalCounter += Math.max(1, Math.floor(rawPlayerDmg * d.onDodgeReflectPct))
    }
    return {
      playerDmg: 0,
      enemyDodged: true,
      incomingCounter: totalCounter,
      enemyAttacks: true,
    }
  }

  return {
    playerDmg: Math.max(1, Math.floor(input.incomingPlayerDmg * (1 - d.weakMult))),
    enemyDodged: false,
    incomingCounter: 0,
    enemyAttacks: false,
  }
}
