import {
  chooseMove,
  formatTelegraph,
  getNpcCombatEntry,
  isAttackingMove,
  type EnemyMove,
  type NpcCombatEntry,
} from '../data/npcRegistry'
import {
  applyCombatSkillXp,
  getOverworldPlayerHp,
  getPlayerSkills,
  getPlayerStoreState,
} from './playerStore'
import { getSkillStatBonuses, type SkillsState } from './skillStore'

export type PlayerMove = 'STRIKE' | 'SLIP' | 'HOLD' | 'WHISPER'
export type ArchetypeId = 'lck' | 'atk' | 'def' | 'spd'
export type BattlePhase = 'player' | 'busy' | 'ended'
export type BattleResult = 'win' | 'lose'
export type UpcomingMove = EnemyMove | 'STUNNED'

export type PlayerCombatStats = {
  maxHp: number
  atk: number
  def: number
  spd: number
  lck: number
}

export type AccessoryBonuses = Partial<Record<'hp' | 'atk' | 'def' | 'spd' | 'lck', number>>

export const ARCHETYPE_STATS: Record<
  ArchetypeId,
  { hp: number; maxHp: number; atk: number; def: number; spd: number; lck: number }
> = {
  lck: { hp: 25, maxHp: 25, atk: 4, def: 4, spd: 4, lck: 9 },
  atk: { hp: 28, maxHp: 28, atk: 9, def: 3, spd: 4, lck: 4 },
  def: { hp: 40, maxHp: 40, atk: 4, def: 9, spd: 3, lck: 4 },
  spd: { hp: 28, maxHp: 28, atk: 5, def: 4, spd: 9, lck: 4 },
}

export const DEFAULT_ARCHETYPE: ArchetypeId = 'atk'

export type BattleState = {
  npc: NpcCombatEntry
  playerStats: PlayerCombatStats
  playerHp: number
  enemyHp: number
  enemyMaxHp: number
  archetype: ArchetypeId
  accessories: AccessoryBonuses[]
  turn: number
  upcomingMove: UpcomingMove
  playerBrace: number
  enemyShake: number
  enemyBleed: number
  enemyStun: number
  log: string[]
  phase: BattlePhase
  result: BattleResult | null
  /** True for one turn after combat level increases (battle UI flash). */
  playerLevelFlash: boolean
}

export type BattleAction =
  | {
      type: 'INIT'
      npcId: string
      archetype?: ArchetypeId
      accessories?: AccessoryBonuses[]
      carryHp?: number
    }
  | { type: 'PLAYER_MOVE'; move: PlayerMove }
  | { type: 'RESOLVE_COMPLETE' }
  | { type: 'END_BATTLE'; result: BattleResult }

/** Port of CombatScene._computeStats (archetype + accessories only). */
function computeBaseStats(
  archetype: ArchetypeId,
  accessories: AccessoryBonuses[],
): PlayerCombatStats {
  const base = { ...ARCHETYPE_STATS[archetype] }
  for (const item of accessories) {
    for (const [k, v] of Object.entries(item)) {
      if (v == null) continue
      const key = k === 'hp' ? 'maxHp' : k
      if (key in base) {
        ;(base as Record<string, number>)[key] = ((base as Record<string, number>)[key] || 0) + v
      }
    }
  }
  for (const k of Object.keys(base)) {
    if ((base as Record<string, number>)[k]! < 1) {
      ;(base as Record<string, number>)[k] = 1
    }
  }
  return {
    maxHp: base.maxHp,
    atk: base.atk,
    def: base.def,
    spd: base.spd,
    lck: base.lck,
  }
}

/** Archetype + accessories + skill level bonuses. */
export function computePlayerStats(
  archetype: ArchetypeId,
  accessories: AccessoryBonuses[],
  skills: SkillsState,
): PlayerCombatStats {
  const base = computeBaseStats(archetype, accessories)
  const bonus = getSkillStatBonuses(skills)
  return {
    maxHp: base.maxHp + bonus.maxHp,
    atk: base.atk + bonus.atk,
    def: base.def + bonus.def,
    spd: base.spd + bonus.spd,
    lck: base.lck + bonus.lck,
  }
}

const jitter = (d: number) => Math.max(0, d + Math.floor((Math.random() - 0.5) * 3))

/** Port of CombatScene.resolveMoves */
export type ResolveResult = {
  playerDmg: number
  crit: boolean
  incoming: number
  dodged: boolean
  braced: boolean
  stunApplied: boolean
  shakeApplied: boolean
  bleedApplied: boolean
  enemyAttacks: boolean
  enemyStunned: boolean
  eMove: UpcomingMove
  pMove: PlayerMove
}

export function resolveMoves(
  state: BattleState,
  pMove: PlayerMove,
  eMove: UpcomingMove,
): ResolveResult {
  const atk = state.playerStats.atk
  const eAtk = state.npc.stats.atk
  const enemyStunned = state.enemyStun > 0 || eMove === 'STUNNED'
  const actualMove: EnemyMove = eMove === 'STUNNED' ? 'STRIKE' : eMove
  const enemyAttacks = !enemyStunned && isAttackingMove(actualMove)

  let eDmg = 0
  if (enemyAttacks) {
    eDmg = eAtk
    if (actualMove === 'LOOP') eDmg = Math.floor(eAtk * 1.3)
    if (actualMove === 'SLIP') eDmg = Math.floor(eAtk * 0.7)
    if (state.enemyShake > 0) eDmg = Math.floor(eDmg * 0.5)
  }

  const out: ResolveResult = {
    playerDmg: 0,
    crit: false,
    incoming: 0,
    dodged: false,
    braced: false,
    stunApplied: false,
    shakeApplied: false,
    bleedApplied: false,
    enemyAttacks,
    enemyStunned,
    eMove,
    pMove,
  }

  if (pMove === 'STRIKE') {
    let dmg = Math.floor(atk * 1.3)
    if (!enemyAttacks) dmg = Math.floor(dmg * 1.5)
    if (Math.random() * 100 < state.playerStats.lck * 2 + 6) {
      out.crit = true
      out.bleedApplied = true
      dmg = Math.floor(dmg * 1.6)
    }
    out.playerDmg = jitter(dmg)
    out.incoming = eDmg
  } else if (pMove === 'SLIP') {
    if (enemyAttacks) {
      out.dodged = true
      out.incoming = 0
      out.playerDmg = jitter(Math.floor(atk * 0.7))
      if (Math.random() * 100 < 20 + state.playerStats.lck * 2) out.stunApplied = true
    } else {
      out.incoming = 0
      out.playerDmg = jitter(Math.floor(atk * 0.4))
    }
  } else if (pMove === 'HOLD') {
    out.braced = true
    out.playerDmg = 0
    out.incoming = Math.floor(eDmg * 0.3)
  } else if (pMove === 'WHISPER') {
    out.playerDmg = jitter(Math.floor(atk * 0.5))
    out.shakeApplied = true
    out.incoming = eDmg
  }

  if (state.playerBrace > 0 && out.incoming > 0) {
    out.incoming = Math.floor(out.incoming * 0.6)
  }
  if (out.incoming > 0) {
    out.incoming = Math.max(1, out.incoming - Math.floor(state.playerStats.def / 3))
  }

  return out
}

function appendLog(log: string[], line: string): string[] {
  const next = [...log, line]
  if (next.length > 3) next.shift()
  return next
}

/** Port of CombatScene._playerLogLine */
function playerLogLine(r: ResolveResult, displayName: string): string {
  const name = displayName.toLowerCase()
  switch (r.pMove) {
    case 'STRIKE':
      if (r.enemyStunned || !r.enemyAttacks) {
        return `you struck the opening. ${r.playerDmg}!${r.crit ? ' crit.' : ''}`
      }
      return `you traded blows. ${r.playerDmg} dealt, ${r.incoming} taken.`
    case 'SLIP':
      if (r.dodged) {
        return `you slipped it. counter for ${r.playerDmg}.${r.stunApplied ? ` ${name} reels.` : ''}`
      }
      return `you slipped nothing. ${r.playerDmg}.`
    case 'HOLD':
      if (r.enemyAttacks) return `you braced. ${r.incoming} chip.`
      return `you set your feet. nothing comes.`
    case 'WHISPER':
      return `you whisper. ${name}'s rhythm breaks.`
    default:
      return `you used ${r.pMove}.`
  }
}

function showTelegraph(state: Pick<BattleState, 'npc' | 'turn' | 'enemyStun'>): UpcomingMove {
  if (state.enemyStun > 0) return 'STUNNED'
  return chooseMove(state.npc.id, state.turn)
}

function finalizeTurn(state: BattleState, r: ResolveResult): BattleState {
  let playerBrace = state.playerBrace
  let enemyShake = state.enemyShake
  let enemyBleed = state.enemyBleed
  let enemyStun = state.enemyStun

  if (enemyShake > 0) enemyShake--
  if (enemyBleed > 0) enemyBleed--
  if (enemyStun > 0) enemyStun--
  if (playerBrace > 0) playerBrace--

  if (r.shakeApplied) enemyShake = 2
  if (r.bleedApplied) enemyBleed = 2
  if (r.stunApplied) enemyStun = 1
  if (r.braced) playerBrace = 1

  const turn = state.turn + 1
  const upcomingMove = showTelegraph({ npc: state.npc, turn, enemyStun })

  return {
    ...state,
    turn,
    upcomingMove,
    playerBrace,
    enemyShake,
    enemyBleed,
    enemyStun,
    phase: 'player',
    result: null,
  }
}

function applySkillXpToState(
  state: BattleState,
  r: ResolveResult,
  log: string[],
): { state: BattleState; log: string[] } {
  const prevMaxHp = state.playerStats.maxHp
  const xpResult = applyCombatSkillXp(r)
  const skills = getPlayerSkills()
  const playerStats = computePlayerStats(
    state.archetype ?? DEFAULT_ARCHETYPE,
    state.accessories ?? [],
    skills,
  )
  let playerHp = state.playerHp
  const maxHpGain = playerStats.maxHp - prevMaxHp
  if (maxHpGain > 0) {
    playerHp = Math.min(playerStats.maxHp, playerHp + maxHpGain)
  }

  let nextLog = log
  for (const line of xpResult.skillLines) {
    nextLog = appendLog(nextLog, line)
  }
  if (xpResult.playerLevelLine) {
    nextLog = appendLog(nextLog, xpResult.playerLevelLine)
  }

  return {
    state: {
      ...state,
      playerStats,
      playerHp,
      playerLevelFlash: xpResult.playerLevelLine != null,
    },
    log: nextLog,
  }
}

function runFullTurn(state: BattleState, pMove: PlayerMove): BattleState {
  const eMove = state.upcomingMove
  const r = resolveMoves(state, pMove, eMove)
  const lower = state.npc.displayName.toLowerCase()

  let enemyHp = state.enemyHp
  let playerHp = state.playerHp
  let log = state.log
  let working = state

  // Player phase
  if (r.playerDmg > 0) {
    enemyHp = Math.max(0, enemyHp - r.playerDmg)
  }
  log = appendLog(log, playerLogLine(r, state.npc.displayName))

  const afterXp = applySkillXpToState({ ...working, enemyHp, playerHp, log }, r, log)
  working = afterXp.state
  log = afterXp.log
  playerHp = working.playerHp

  if (state.enemyBleed > 0 && enemyHp > 0) {
    const b = Math.max(1, Math.floor(state.enemyMaxHp * 0.06))
    enemyHp = Math.max(0, enemyHp - b)
    log = appendLog(log, `${lower} bleeds. ${b} damage.`)
  }

  if (enemyHp <= 0) {
    log = appendLog(log, `${lower} is finished.`)
    return {
      ...working,
      enemyHp,
      playerHp,
      log,
      phase: 'ended',
      result: 'win',
    }
  }

  // Enemy phase
  if (r.enemyStunned) {
    log = appendLog(log, `${lower} can't move.`)
  } else if (r.enemyAttacks && r.incoming > 0) {
    playerHp = Math.max(0, playerHp - r.incoming)
  }

  if (playerHp <= 0) {
    return {
      ...working,
      enemyHp,
      playerHp,
      log,
      phase: 'ended',
      result: 'lose',
    }
  }

  const finalized = finalizeTurn(
    { ...working, enemyHp, playerHp, log },
    r,
  )
  return { ...finalized, phase: 'busy' }
}

export function getEnemyStatusText(state: BattleState): string {
  const parts: string[] = []
  if (state.enemyStun > 0) parts.push('reeling')
  if (state.enemyShake > 0) parts.push('shaken')
  if (state.enemyBleed > 0) parts.push('bleeding')
  return parts.join('   ')
}

export function getTelegraphText(state: BattleState): string {
  return formatTelegraph(
    state.npc.displayName,
    state.upcomingMove,
    state.enemyStun > 0,
  )
}

export function createInitialBattleState(
  npcId: string,
  options?: {
    archetype?: ArchetypeId
    accessories?: AccessoryBonuses[]
    carryHp?: number
  },
): BattleState {
  const resolvedId = getNpcCombatEntry(npcId) ? npcId : 'walker'
  const npc = getNpcCombatEntry(resolvedId)
  if (!npc) {
    throw new Error(`Unknown combat NPC: ${npcId}`)
  }

  const player = getPlayerStoreState()
  const archetype = options?.archetype ?? player.archetype ?? DEFAULT_ARCHETYPE
  const accessories = options?.accessories ?? player.accessories ?? []
  const skills = getPlayerSkills()
  const playerStats = computePlayerStats(archetype, accessories, skills)
  const carryHp = options?.carryHp ?? getOverworldPlayerHp()
  const playerHp = carryHp != null ? Math.min(playerStats.maxHp, carryHp) : playerStats.maxHp
  const upcomingMove = showTelegraph({ npc, turn: 0, enemyStun: 0 })

  return {
    npc,
    playerStats,
    playerHp,
    enemyHp: npc.stats.hp,
    enemyMaxHp: npc.stats.maxHp,
    archetype,
    accessories,
    turn: 0,
    upcomingMove,
    playerBrace: 0,
    enemyShake: 0,
    enemyBleed: 0,
    enemyStun: 0,
    log: [],
    phase: 'player',
    result: null,
    playerLevelFlash: false,
  }
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'INIT':
      return createInitialBattleState(action.npcId, {
        archetype: action.archetype,
        accessories: action.accessories,
        carryHp: action.carryHp,
      })

    case 'PLAYER_MOVE':
      if (state.phase !== 'player') return state
      return runFullTurn(state, action.move)

    case 'RESOLVE_COMPLETE':
      if (state.phase !== 'busy' || state.result) return state
      return { ...state, phase: 'player', playerLevelFlash: false }

    case 'END_BATTLE':
      return { ...state, phase: 'ended', result: action.result }

    default:
      return state
  }
}

export { getOverworldPlayerHp, setOverworldPlayerHp } from './playerStore'

export function applyBattleEndHealing(
  result: BattleResult,
  maxHp: number,
  currentHp: number,
): number {
  if (result === 'win') {
    return Math.min(maxHp, currentHp + Math.floor(maxHp * 0.25))
  }
  return maxHp
}
