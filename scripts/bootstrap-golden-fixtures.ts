import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { simulateCombat } from '../src/lib/combatSimulator.ts'
import { FIXTURE_CATALOG, type FixtureSpec } from './golden-fixture-catalog.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(here, 'fixtures', 'golden-combat')

function logMatches(log: string, mustInclude: string[], mustExclude: string[] = []): boolean {
  if (!mustInclude.every((needle) => log.includes(needle))) return false
  return !mustExclude.some((needle) => log.includes(needle))
}

/** simulateCombat mutates global state — serialize discovery + recording. */
let simChain: Promise<void> = Promise.resolve()
function runSimSerialized<T>(fn: () => T): Promise<T> {
  const result = simChain.then(fn)
  simChain = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

async function discoverSeed(spec: FixtureSpec): Promise<number> {
  if (spec.seed != null) {
    const actual = await runSimSerialized(() =>
      simulateCombat({
        npcId: spec.npcId,
        seed: spec.seed!,
        playerMoves: spec.playerMoves,
        archetype: spec.archetype,
        skills: spec.skills,
        equippedMoves: spec.equippedMoves,
        isolateNpcMemory: spec.isolateNpcMemory,
        runItBack: spec.runItBack,
      }),
    )
    if (!logMatches(actual.logDigest, spec.logMustInclude, spec.logMustExclude ?? [])) {
      throw new Error(
        `[bootstrap-golden] ${spec.id}: fixed seed ${spec.seed} did not match ${JSON.stringify(spec.logMustInclude)}`,
      )
    }
    return spec.seed >>> 0
  }

  const limit = spec.maxSeedSearch ?? 50_000
  for (let seed = 0; seed < limit; seed++) {
    try {
      const actual = await runSimSerialized(() =>
        simulateCombat({
          npcId: spec.npcId,
          seed,
          playerMoves: spec.playerMoves,
          archetype: spec.archetype,
          skills: spec.skills,
          equippedMoves: spec.equippedMoves,
          isolateNpcMemory: spec.isolateNpcMemory,
          runItBack: spec.runItBack,
        }),
      )
      if (logMatches(actual.logDigest, spec.logMustInclude, spec.logMustExclude ?? [])) {
        console.log(`[bootstrap-golden] ${spec.id}: seed=${seed >>> 0}`)
        return seed >>> 0
      }
    } catch {
      // skip seeds that fail to complete
    }
  }

  throw new Error(
    `[bootstrap-golden] ${spec.id}: no seed in 0..${limit - 1} matched ${JSON.stringify(spec.logMustInclude)}`,
  )
}

const written: string[] = []

for (const spec of FIXTURE_CATALOG) {
  const seed = await discoverSeed(spec)
  const actual = await runSimSerialized(() =>
    simulateCombat({
      npcId: spec.npcId,
      seed,
      playerMoves: spec.playerMoves,
      archetype: spec.archetype,
      skills: spec.skills,
      equippedMoves: spec.equippedMoves,
      isolateNpcMemory: spec.isolateNpcMemory,
      runItBack: spec.runItBack,
    }),
  )

  const body = {
    id: spec.id,
    coverage: spec.coverage,
    npcId: spec.npcId,
    seed,
    ...(spec.archetype ? { archetype: spec.archetype } : {}),
    skills: spec.skills,
    ...(spec.equippedMoves ? { equippedMoves: spec.equippedMoves } : {}),
    playerMoves: spec.playerMoves,
    ...(spec.isolateNpcMemory != null ? { isolateNpcMemory: spec.isolateNpcMemory } : {}),
    ...(spec.runItBack != null ? { runItBack: spec.runItBack } : {}),
    expected: {
      result: actual.result,
      turns: actual.turns,
      playerHp: actual.playerHp,
      enemyHp: actual.enemyHp,
      rngDraws: actual.rngDraws,
      logDigest: actual.logDigest,
    },
  }

  const path = join(fixturesDir, `${spec.id}.json`)
  writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`)
  written.push(spec.id)
  console.log(`[bootstrap-golden] wrote ${spec.id}.json (rngDraws=${actual.rngDraws})`)
}

writeFileSync(join(fixturesDir, 'index.json'), `${JSON.stringify(written, null, 2)}\n`)
console.log(`[bootstrap-golden] index.json — ${written.length} fixture(s)`)
