/** Matches skillStore MAX_SKILL_LEVEL — duplicated to avoid import cycles. */
export const MOVE_SKILL_CAP_LEVEL = 65

/** Skill level required to unlock each ladder rung (rung 5 = cap). */
export const LADDER_RUNG_UNLOCK_LEVEL: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 17,
  3: 33,
  4: 49,
  5: MOVE_SKILL_CAP_LEVEL,
}

export function unlockLevelForRung(rung: 1 | 2 | 3 | 4 | 5): number {
  return LADDER_RUNG_UNLOCK_LEVEL[rung]
}
