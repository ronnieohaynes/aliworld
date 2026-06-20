import type { MoveCost } from './combatTypes'
import { scheduleExposedTurn, schedulePlayerSkipTurn } from './combatSystems'

export type TurnCostFlags = {
  playerExposedTurns: number
  playerSkipTurns: number
}

/**
 * Apply move costs after a normal resolve (load → exposed next turn;
 * recharge → skip next player action).
 */
export function applyMoveCostAfterResolve(
  cost: MoveCost,
  flags: TurnCostFlags,
): TurnCostFlags {
  switch (cost.kind) {
    case 'loadTurn':
      return {
        ...flags,
        playerExposedTurns: scheduleExposedTurn(flags.playerExposedTurns, 1),
      }
    case 'rechargeTurn':
      return {
        ...flags,
        playerSkipTurns: schedulePlayerSkipTurn(flags.playerSkipTurns, 1),
      }
    case 'exposedTurn':
      return {
        ...flags,
        playerExposedTurns: scheduleExposedTurn(flags.playerExposedTurns, 1),
      }
    default:
      return flags
  }
}

/** exposedTurn on the same round, player chose a move but does not act this resolve. */
export function playerActsThisTurn(cost: MoveCost, isExposedTurn: boolean): boolean {
  if (isExposedTurn) return false
  if (cost.kind === 'exposedTurn') return false
  return true
}

export function shouldAutoResolveExposed(flags: TurnCostFlags): boolean {
  return flags.playerExposedTurns > 0
}

export function shouldAutoResolveSkip(flags: TurnCostFlags): boolean {
  return flags.playerSkipTurns > 0
}

/** Consume one exposed or skip turn at resolve start. */
export function consumeTurnFlag(flags: TurnCostFlags): {
  flags: TurnCostFlags
  wasExposed: boolean
  wasSkip: boolean
} {
  if (flags.playerExposedTurns > 0) {
    return {
      flags: { ...flags, playerExposedTurns: flags.playerExposedTurns - 1 },
      wasExposed: true,
      wasSkip: false,
    }
  }
  if (flags.playerSkipTurns > 0) {
    return {
      flags: { ...flags, playerSkipTurns: flags.playerSkipTurns - 1 },
      wasExposed: true,
      wasSkip: true,
    }
  }
  return { flags, wasExposed: false, wasSkip: false }
}
