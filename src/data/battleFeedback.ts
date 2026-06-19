import type { ResolveResult } from '../store/battleStore'

export type BattleFeedbackTone =
  | 'attack'
  | 'defense'
  | 'speed'
  | 'luck'
  | 'shake'
  | 'slow'
  | 'bleed'
  | 'stun'

export type BattleFeedbackEvent = {
  kind: 'damage' | 'blocked' | 'dodged' | 'counter' | 'status' | 'crit' | 'perfect-guard' | 'xp-bonus'
  text: string
  target: 'enemy' | 'player'
  tone: BattleFeedbackTone
}

/** Build UI callouts from a resolved turn, mirrors what the player accomplished. */
export function buildBattleFeedbackFromResolve(r: ResolveResult): BattleFeedbackEvent[] {
  const events: BattleFeedbackEvent[] = []

  if (r.damageBlocked > 0) {
    events.push({
      kind: 'blocked',
      text: `-${r.damageBlocked} blocked`,
      target: 'player',
      tone: 'defense',
    })
  }

  if (r.dodged) {
    events.push({
      kind: 'dodged',
      text: 'dodged',
      target: 'player',
      tone: 'speed',
    })
  }

  if (r.guardCountered) {
    events.push({
      kind: 'counter',
      text: 'counter!',
      target: 'player',
      tone: 'attack',
    })
  }

  if (r.playerDmg > 0 && r.dodged) {
    events.push({
      kind: 'counter',
      text: `+${r.playerDmg} counter`,
      target: 'enemy',
      tone: 'speed',
    })
  } else if (r.playerDmg > 0 && r.crit) {
    events.push({
      kind: 'crit',
      text: 'CRIT',
      target: 'enemy',
      tone: 'luck',
    })
  }

  if (r.healApplied > 0) {
    events.push({
      kind: 'damage',
      text: `+${r.healApplied}`,
      target: 'player',
      tone: 'defense',
    })
  }

  if (r.perfectGuardBonus) {
    events.push({
      kind: 'perfect-guard',
      text: 'perfect guard!',
      target: 'player',
      tone: 'defense',
    })
  }

  // Priority order: stun → bleed → shake → slow (player → enemy, then enemy → player)
  if (r.stunApplied) {
    events.push({ kind: 'status', text: 'stun!', target: 'enemy', tone: 'stun' })
  }
  if (r.bleedApplied) {
    events.push({ kind: 'status', text: 'bleed!', target: 'enemy', tone: 'bleed' })
  }
  if (r.shakeApplied) {
    events.push({ kind: 'status', text: 'shake!', target: 'enemy', tone: 'shake' })
  }
  if (r.slowApplied) {
    events.push({ kind: 'status', text: 'slow!', target: 'enemy', tone: 'slow' })
  }
  if (r.playerStunApplied) {
    events.push({ kind: 'status', text: 'stun!', target: 'player', tone: 'stun' })
  }
  if (r.playerBleedApplied) {
    events.push({ kind: 'status', text: 'bleed!', target: 'player', tone: 'bleed' })
  }
  if (r.playerShakeApplied) {
    events.push({ kind: 'status', text: 'shake!', target: 'player', tone: 'shake' })
  }
  if (r.playerSlowApplied) {
    events.push({ kind: 'status', text: 'slow!', target: 'player', tone: 'slow' })
  }
  if (r.playerMissApplied) {
    events.push({ kind: 'status', text: 'miss!', target: 'player', tone: 'stun' })
  }

  return events
}

export function appendBattleFeedback(
  current: BattleFeedbackEvent[],
  r: ResolveResult,
): BattleFeedbackEvent[] {
  const next = buildBattleFeedbackFromResolve(r)
  if (next.length === 0) return current
  return [...current, ...next]
}
