import type { BattleFeedbackEvent } from '../src/data/battleFeedback.ts'

export type SkillXpApplyResult<S> = {
  state: S
  log: string[]
  xpBonusEvents: BattleFeedbackEvent[]
}

export type SkillXpApplier<S, R> = (state: S, r: R, log: string[]) => SkillXpApplyResult<S>

let skillXpApplier: SkillXpApplier<unknown, unknown> | null = null

/** Client registers persistent XP writes; server/replay runs with applier unset. */
export function registerSkillXpApplier<S, R>(applier: SkillXpApplier<S, R> | null): void {
  skillXpApplier = applier as SkillXpApplier<unknown, unknown> | null
}

export function applySkillXpToState<S, R>(
  state: S,
  r: R,
  log: string[],
  combatXpPolicy: string,
): SkillXpApplyResult<S> {
  if (combatXpPolicy === 'none' || !skillXpApplier) {
    return { state, log, xpBonusEvents: [] }
  }
  return skillXpApplier(state, r, log) as SkillXpApplyResult<S>
}
