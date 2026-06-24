/**
 * Smoke test: edge replay shim can run a golden fixture headlessly.
 * Uses the same bundled path the Deno edge function imports.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const fixturePath = join(here, 'fixtures/golden-combat/gym-h1-atk-baseline.json')
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
  npcId: string
  seed: number
  archetype: 'atk'
  skills: unknown
  equippedMoves: unknown
  playerMoves: string[]
  isolateNpcMemory: boolean
  expected: { result: string; turns: number; playerHp: number; enemyHp: number }
}

const { replayCombatFight, replayMatchesClaim } = await import(
  '../supabase/functions/_shared/combatReplay.ts'
)

const replay = await replayCombatFight({
  npcId: fixture.npcId,
  seed: fixture.seed,
  skills: fixture.skills as import('../supabase/functions/_shared/combatProfile.ts').SkillsSnapshot,
  equippedMoves: fixture.equippedMoves as [string, string, string, string],
  archetype: fixture.archetype,
  playerMoves: fixture.playerMoves,
  isolateNpcMemory: fixture.isolateNpcMemory,
})

const claim = {
  result: fixture.expected.result as 'win' | 'lose' | 'draw',
  turns: fixture.expected.turns,
  playerHp: fixture.expected.playerHp,
  enemyHp: fixture.expected.enemyHp,
}

if (!replayMatchesClaim(replay, claim)) {
  console.error('edge-combat-replay-smoke: mismatch', { replay, claim })
  process.exit(1)
}

console.log(`edge-combat-replay-smoke: ok (${fixture.npcId}, seed=${fixture.seed})`)
