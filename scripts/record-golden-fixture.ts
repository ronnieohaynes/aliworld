import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { simulateCombat } from '../src/lib/combatSimulator.ts'
import type { PlayerMoveId } from '../src/data/moveIds.ts'
import type { SkillsState } from '../src/store/skillStore.ts'

type GoldenFixture = {
  id: string
  npcId: string
  seed: number
  archetype?: 'lck' | 'atk' | 'def' | 'spd'
  skills?: SkillsState
  equippedMoves?: [PlayerMoveId, PlayerMoveId, PlayerMoveId, PlayerMoveId]
  playerMoves: PlayerMoveId[]
  isolateNpcMemory?: boolean
  runItBack?: boolean
  expected: {
    result: 'win' | 'lose' | 'draw'
    turns: number
    playerHp: number
    enemyHp: number
    rngDraws: number
    logDigest: string
  }
}

const here = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(here, 'fixtures', 'golden-combat')
const id = process.argv[2]
if (!id) {
  console.error('usage: npm run golden-combat:record -- <fixture-id>')
  process.exit(1)
}

const path = join(fixturesDir, `${id}.json`)
const fixture = JSON.parse(readFileSync(path, 'utf8')) as Omit<GoldenFixture, 'expected'>
const actual = simulateCombat({
  npcId: fixture.npcId,
  seed: fixture.seed,
  playerMoves: fixture.playerMoves,
  archetype: fixture.archetype,
  skills: fixture.skills,
  equippedMoves: fixture.equippedMoves,
  isolateNpcMemory: fixture.isolateNpcMemory,
  runItBack: fixture.runItBack,
})

const next: GoldenFixture = {
  ...fixture,
  id,
  expected: {
    result: actual.result,
    turns: actual.turns,
    playerHp: actual.playerHp,
    enemyHp: actual.enemyHp,
    rngDraws: actual.rngDraws,
    logDigest: actual.logDigest,
  },
}

writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`)
console.log(`[record-golden] wrote ${path}`)
console.log(JSON.stringify(next.expected, null, 2))
