/**
 * Golden fixture catalog — see combat-core/HANDOFF.md for Phase B deferred gaps
 * (enemy→player bleed/slow/stun/miss fixtures; add when NPC rosters grant those moves).
 */
import type { PlayerMoveId } from '../src/data/moveIds.ts'
import type { SkillsState } from '../src/store/skillStore.ts'

export type FixtureSpec = {
  id: string
/** Human-readable coverage tags for reporting (ignored by golden-combat runner). */
  coverage: string[]
  npcId: string
  archetype?: 'lck' | 'atk' | 'def' | 'spd'
  skills: SkillsState
  equippedMoves?: [PlayerMoveId, PlayerMoveId, PlayerMoveId, PlayerMoveId]
  playerMoves: PlayerMoveId[]
  isolateNpcMemory?: boolean
  runItBack?: boolean
  /** All substrings must appear in logDigest. */
  logMustInclude: string[]
  /** Substrings that must not appear in logDigest (seed search only). */
  logMustExclude?: string[]
  /** Optional fixed seed — skips search when set. */
  seed?: number
  maxSeedSearch?: number
}

/** Unlocks every ladder move (rung 6 on defense/luck). */
export const UNLOCK_ALL_SKILLS: SkillsState = {
  attack: { level: 52, xp: 0 },
  speed: { level: 52, xp: 0 },
  defense: { level: 65, xp: 0 },
  luck: { level: 65, xp: 0 },
  hp: { level: 30, xp: 0 },
}

export const PHENOMENA_SKILLS: SkillsState = {
  ...UNLOCK_ALL_SKILLS,
  luck: { level: 52, xp: 0 },
}

/** Lower luck reduces phenomena roll bias so low-roll outcomes (bleed, etc.) appear in fixtures. */
export const PHENOMENA_LOW_LUCK_SKILLS: SkillsState = {
  ...UNLOCK_ALL_SKILLS,
  luck: { level: 22, xp: 0 },
}

const pad = (moves: PlayerMoveId[], filler: PlayerMoveId = 'STRIKE', count = 24): PlayerMoveId[] => [
  ...moves,
  ...Array(Math.max(0, count - moves.length)).fill(filler),
]

export const FIXTURE_CATALOG: FixtureSpec[] = [
  // --- legacy anchors (seeds filled by bootstrap or kept from disk) ---
  {
    id: 'gym-h1-atk-baseline',
    coverage: ['gym-h1', 'move:cannon', 'memory-isolated'],
    npcId: 'gym-week-1-h1',
    seed: 305419896,
    archetype: 'atk',
    skills: {
      attack: { level: 8, xp: 0 },
      speed: { level: 4, xp: 0 },
      defense: { level: 3, xp: 0 },
      luck: { level: 3, xp: 0 },
      hp: { level: 5, xp: 0 },
    },
    equippedMoves: ['STRIKE', 'SLIP', 'HOLD', 'WHISPER'],
    playerMoves: pad(['STRIKE', 'STRIKE', 'CANNON', 'HOLD', 'SLIP', 'WHISPER', 'STRIKE', 'CANNON']),
    isolateNpcMemory: true,
    logMustInclude: ['cannon.'],
  },
  {
    id: 'gym-h1-def-counter',
    coverage: ['gym-h1', 'move:hold', 'move:slip', 'memory-isolated'],
    npcId: 'gym-week-1-h1',
    seed: 2864434397,
    archetype: 'def',
    skills: {
      attack: { level: 3, xp: 0 },
      speed: { level: 3, xp: 0 },
      defense: { level: 9, xp: 0 },
      luck: { level: 4, xp: 0 },
      hp: { level: 6, xp: 0 },
    },
    equippedMoves: ['HOLD', 'SLIP', 'STRIKE', 'WHISPER'],
    playerMoves: pad(['HOLD', 'SLIP', 'HOLD', 'STRIKE', 'HOLD', 'SLIP', 'HOLD', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['you traded blows.'],
  },
  {
    id: 'seed-parity-smoke',
    coverage: ['gym-h1', 'move:strike', 'enemy:parry', 'memory-isolated'],
    npcId: 'gym-week-1-h1',
    seed: 3735928559,
    archetype: 'atk',
    skills: {
      attack: { level: 5, xp: 0 },
      speed: { level: 5, xp: 0 },
      defense: { level: 5, xp: 0 },
      luck: { level: 5, xp: 0 },
      hp: { level: 5, xp: 0 },
    },
    equippedMoves: ['STRIKE', 'SLIP', 'HOLD', 'WHISPER'],
    playerMoves: ['STRIKE', 'STRIKE', 'STRIKE'],
    isolateNpcMemory: true,
    logMustInclude: ['STRIKE vs'],
  },

  // --- move types ---
  {
    id: 'move-fury-sweep',
    coverage: ['move:fury-sweep'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['FURY_SWEEP', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['fury sweep.'],
  },
  {
    id: 'move-dark-break',
    coverage: ['move:dark-break'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['DARK_BREAK', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['dark break.', 'aim falters'],
  },
  {
    id: 'move-blackout-charge',
    coverage: ['move:blackout', 'blackout:charge'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['BLACKOUT', 'HOLD']),
    isolateNpcMemory: true,
    logMustInclude: ['you load the blackout.'],
  },
  {
    id: 'move-blackout-release',
    coverage: ['move:blackout', 'blackout:release'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['BLACKOUT', 'STRIKE', 'BLACKOUT']),
    isolateNpcMemory: true,
    logMustInclude: ['blackout lands.'],
    seed: 5,
  },
  {
    id: 'move-gravity-shift',
    coverage: ['move:gravity-shift', 'status-enemy:slow'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['GRAVITY_SHIFT', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['gravity shift.', 'they slow.'],
  },
  {
    id: 'move-refract',
    coverage: ['move:refract'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['STRIKE', 'REFRACT']),
    isolateNpcMemory: true,
    logMustInclude: ['refract.', 'mirrored.'],
  },
  {
    id: 'move-hyperdrive',
    coverage: ['move:hyperdrive'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['HYPERDRIVE', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['next turn you fly.'],
    seed: 0,
  },
  {
    id: 'move-anchor',
    coverage: ['move:anchor', 'status-player:brace'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['ANCHOR', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['anchored.'],
  },
  {
    id: 'move-second-wind',
    coverage: ['move:second-wind'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['SECOND_WIND', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['second wind.'],
  },
  {
    id: 'move-counterweight',
    coverage: ['move:counterweight'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['COUNTERWEIGHT', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['counterweight set.'],
  },
  {
    id: 'move-brick-wall',
    coverage: ['move:brick-wall'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['BRICK_WALL', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['brick wall up.'],
  },
  {
    id: 'move-invincible',
    coverage: ['move:invincible'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['INVINCIBLE', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['invincible. for now.'],
  },
  {
    id: 'move-whisper',
    coverage: ['move:whisper', 'status-enemy:shake'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['WHISPER', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['you whisper.', 'rhythm breaks.'],
  },
  {
    id: 'move-loop',
    coverage: ['move:loop'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['LOOP', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['loop.', 'repeat themselves.'],
  },
  {
    id: 'move-devils-cut',
    coverage: ['move:devils-cut'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['DEVILS_CUT', 'STRIKE', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ["devil's cut."],
  },
  {
    id: 'move-snag',
    coverage: ['move:snag'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['SNAG', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['snag.', 'move is yours now.'],
  },
  {
    id: 'move-phenomena-bleed',
    coverage: ['move:phenomena', 'status-enemy:bleed'],
    npcId: 'gym-week-1-h1',
    skills: PHENOMENA_LOW_LUCK_SKILLS,
    playerMoves: pad(['PHENOMENA', 'STRIKE', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['phenomena: bleed.'],
    seed: 6,
  },
  {
    id: 'move-phenomena-heal',
    coverage: ['move:phenomena', 'phenomena:heal'],
    npcId: 'gym-week-1-h1',
    skills: PHENOMENA_SKILLS,
    playerMoves: pad(['PHENOMENA', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['phenomena: you recover'],
    seed: 9,
  },
  {
    id: 'move-sealed-fate',
    coverage: ['move:sealed-fate'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['SEALED_FATE', 'STRIKE', 'STRIKE', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['sealed fate marked.'],
  },
  {
    id: 'move-sealed-fate-miss',
    coverage: ['move:sealed-fate', 'sealed-fate:miss-self-damage'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['SEALED_FATE', 'HOLD', 'HOLD', 'HOLD', 'HOLD']),
    isolateNpcMemory: true,
    logMustInclude: ['sealed fate slips. it cost you.'],
    maxSeedSearch: 120_000,
  },

  // --- dodge fork ---
  {
    id: 'dodge-player-slip-success',
    coverage: ['dodge:player-slip', 'dodge:player-success'],
    npcId: 'gym-week-1-h1',
    skills: { ...UNLOCK_ALL_SKILLS, speed: { level: 65, xp: 0 } },
    playerMoves: pad(['SLIP']),
    isolateNpcMemory: true,
    logMustInclude: ['vs SLIP.', 'counter for'],
    maxSeedSearch: 80_000,
  },
  {
    id: 'dodge-player-slip-fail',
    coverage: ['dodge:player-slip', 'dodge:player-fail'],
    npcId: 'gym-week-1-h1',
    skills: { ...UNLOCK_ALL_SKILLS, speed: { level: 1, xp: 0 } },
    playerMoves: pad(['SLIP', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['vs SLIP.', ' taken.'],
    logMustExclude: ['counter for'],
    seed: 8,
  },
  {
    id: 'dodge-player-parry-success',
    coverage: ['dodge:player-parry', 'dodge:player-success'],
    npcId: 'gym-week-1-h1',
    skills: { ...UNLOCK_ALL_SKILLS, luck: { level: 65, xp: 0 }, defense: { level: 65, xp: 0 } },
    playerMoves: pad(['PARRY']),
    isolateNpcMemory: true,
    logMustInclude: ['vs PARRY.', 'back.'],
    maxSeedSearch: 80_000,
  },
  {
    id: 'dodge-enemy-slip-whiff',
    coverage: ['dodge:enemy-slip', 'dodge:enemy-success'],
    npcId: 'gym-week-2-h2',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['STRIKE', 'STRIKE', 'STRIKE', 'STRIKE', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['whiff.'],
    maxSeedSearch: 80_000,
  },
  {
    id: 'dodge-enemy-parry-whiff',
    coverage: ['dodge:enemy-parry', 'dodge:enemy-success'],
    npcId: 'gym-week-1-h1',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['STRIKE', 'STRIKE', 'STRIKE', 'STRIKE', 'STRIKE', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ["STRIKE vs", 'whiff.'],
    maxSeedSearch: 80_000,
  },

  // --- status both directions ---
  {
    id: 'status-enemy-bleed-tick',
    coverage: ['status-enemy:bleed', 'status:bleed-tick'],
    npcId: 'gym-week-1-h1',
    skills: PHENOMENA_LOW_LUCK_SKILLS,
    playerMoves: pad(['PHENOMENA', 'HOLD', 'HOLD', 'HOLD', 'HOLD', 'HOLD']),
    isolateNpcMemory: true,
    logMustInclude: ['phenomena: bleed.', 'bleeds.'],
    maxSeedSearch: 120_000,
  },
  {
    id: 'status-enemy-stun',
    coverage: ['status-enemy:stun'],
    npcId: 'gym-week-1-h1',
    skills: PHENOMENA_LOW_LUCK_SKILLS,
    playerMoves: pad(['PHENOMENA', 'HOLD']),
    isolateNpcMemory: true,
    logMustInclude: ['phenomena: stun.', "can't move."],
    maxSeedSearch: 80_000,
  },
  {
    id: 'status-enemy-miss',
    coverage: ['status-enemy:miss'],
    npcId: 'gym-week-1-h1',
    skills: PHENOMENA_LOW_LUCK_SKILLS,
    playerMoves: pad(['PHENOMENA', 'STRIKE', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['phenomena: they miss.'],
    maxSeedSearch: 120_000,
  },
  {
    id: 'status-player-shake-enemy',
    coverage: ['status-player:shake', 'enemy:whisper', 'status:enemy-to-player'],
    npcId: 'town-crier',
    skills: UNLOCK_ALL_SKILLS,
    playerMoves: pad(['HOLD', 'HOLD', 'HOLD', 'HOLD', 'HOLD', 'HOLD', 'HOLD']),
    isolateNpcMemory: true,
    logMustInclude: ['WHISPER'],
    maxSeedSearch: 40_000,
  },
  {
    id: 'status-player-reflect',
    coverage: ['status-player:reflect'],
    npcId: 'gym-week-1-h1',
    skills: PHENOMENA_SKILLS,
    playerMoves: pad(['PHENOMENA', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['phenomena: reflect.'],
    seed: 8,
  },
  {
    id: 'status-player-double',
    coverage: ['status-player:double'],
    npcId: 'gym-week-1-h1',
    skills: PHENOMENA_SKILLS,
    playerMoves: pad(['PHENOMENA', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['phenomena: double.'],
    maxSeedSearch: 80_000,
  },

  // --- tier-3 gym + memory isolation ---
  {
    id: 'gym-h3-memory-isolated',
    coverage: ['gym-h3', 'tier-3-ai', 'memory-isolated'],
    npcId: 'gym-week-1-h3',
    archetype: 'spd',
    skills: {
      attack: { level: 10, xp: 0 },
      speed: { level: 12, xp: 0 },
      defense: { level: 8, xp: 0 },
      luck: { level: 8, xp: 0 },
      hp: { level: 10, xp: 0 },
    },
    equippedMoves: ['STRIKE', 'SLIP', 'PARRY', 'CANNON'],
    playerMoves: pad(['STRIKE', 'CANNON', 'SLIP', 'STRIKE', 'CANNON', 'STRIKE']),
    isolateNpcMemory: true,
    logMustInclude: ['corner'],
    maxSeedSearch: 40_000,
  },
]
