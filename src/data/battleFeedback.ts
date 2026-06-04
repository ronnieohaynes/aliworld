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

/** Build UI callouts from a resolved turn — mirrors what the player accomplished. */
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

  if (r.shakeApplied) {
    events.push({ kind: 'status', text: 'shake!', target: 'enemy', tone: 'shake' })
  }
  if (r.slowApplied) {
    events.push({ kind: 'status', text: 'slow!', target: 'enemy', tone: 'slow' })
  }
  if (r.bleedApplied) {
    events.push({ kind: 'status', text: 'bleed!', target: 'enemy', tone: 'bleed' })
  }
  if (r.stunApplied) {
    events.push({ kind: 'status', text: 'stun!', target: 'enemy', tone: 'stun' })
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
