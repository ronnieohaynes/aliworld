import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
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

function loadFixtures(): GoldenFixture[] {
  const raw = readFileSync(join(fixturesDir, 'index.json'), 'utf8')
  const ids = JSON.parse(raw) as string[]
  return ids.map((id) => {
    const body = readFileSync(join(fixturesDir, `${id}.json`), 'utf8')
    return JSON.parse(body) as GoldenFixture
  })
}

function fail(message: string): never {
  console.error(`golden-combat: ${message}`)
  process.exit(1)
}

/** simulateCombat mutates global player/RNG state — serialize, log concurrently. */
let simChain: Promise<void> = Promise.resolve()
function runSimSerialized<T>(fn: () => T): Promise<T> {
  const result = simChain.then(fn)
  simChain = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

type FixtureRun = {
  fixture: GoldenFixture
  ok: boolean
  ms: number
  errors: string[]
}

async function runFixture(fixture: GoldenFixture): Promise<FixtureRun> {
  const started = performance.now()
  console.log(`[golden-combat] ▶ ${fixture.id}`)

  const actual = await runSimSerialized(() =>
    simulateCombat({
      npcId: fixture.npcId,
      seed: fixture.seed,
      playerMoves: fixture.playerMoves,
      archetype: fixture.archetype,
      skills: fixture.skills,
      equippedMoves: fixture.equippedMoves,
      isolateNpcMemory: fixture.isolateNpcMemory,
      runItBack: fixture.runItBack,
    }),
  )

  const checks: [string, unknown, unknown][] = [
    ['result', actual.result, fixture.expected.result],
    ['turns', actual.turns, fixture.expected.turns],
    ['playerHp', actual.playerHp, fixture.expected.playerHp],
    ['enemyHp', actual.enemyHp, fixture.expected.enemyHp],
    ['rngDraws', actual.rngDraws, fixture.expected.rngDraws],
    ['logDigest', actual.logDigest, fixture.expected.logDigest],
  ]

  const errors: string[] = []
  for (const [field, got, want] of checks) {
    if (got !== want) {
      errors.push(`${field}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`)
    }
  }

  const ms = performance.now() - started
  const ok = errors.length === 0
  console.log(
    `[golden-combat] ${ok ? '✓' : '✗'} ${fixture.id} (${ms.toFixed(0)}ms, seed=${fixture.seed >>> 0}, rngDraws=${actual.rngDraws})`,
  )
  if (!ok) {
    for (const line of errors) {
      console.error(`[golden-combat]   ${fixture.id} ${line}`)
    }
  }

  return { fixture, ok, ms, errors }
}

const fixtures = loadFixtures()
console.log(`[golden-combat] running ${fixtures.length} fixture(s) (parallel schedule, serialized sim)`)

const wallStart = performance.now()
const results = await Promise.all(fixtures.map((fixture) => runFixture(fixture)))
const wallMs = performance.now() - wallStart

const failed = results.filter((r) => !r.ok)
if (failed.length > 0) {
  fail(`${failed.length}/${fixtures.length} fixture(s) failed in ${wallMs.toFixed(0)}ms wall time`)
}

console.log(
  `[golden-combat] ${fixtures.length}/${fixtures.length} passed in ${wallMs.toFixed(0)}ms wall time`,
)
