/** Matches skillStore MAX_SKILL_LEVEL — duplicated to avoid import cycles. */
export const MOVE_SKILL_CAP_LEVEL = 65

/** Skill level required to unlock each ladder rung (rung 6 = cap on 6-move ladders).
 *  Level-gated only — XP curve shape does not change these thresholds. */
export const LADDER_RUNG_UNLOCK_LEVEL: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 0,
  2: 10,
  3: 22,
  4: 38,
  5: 52,
  6: MOVE_SKILL_CAP_LEVEL,
}

export function unlockLevelForRung(rung: 1 | 2 | 3 | 4 | 5 | 6): number {
  return LADDER_RUNG_UNLOCK_LEVEL[rung]
}
