# Combat integrity handoff

Stages 0–3 (determinism, shared `combat-core`, dodge unification, server replay validation) are gated by:

```bash
npm run verify:combat   # bundle freshness + 35 golden fixtures + edge replay smoke
```

CI: `.github/workflows/deploy-dev.yml` and `.github/workflows/deploy-main.yml` both run `verify:combat` before build/deploy.

## Golden fixture coverage (35)

Catalog + bootstrap: `scripts/golden-fixture-catalog.ts`, `npm run golden-combat:bootstrap`.

Each fixture JSON includes a `coverage` tag array for reporting.

### Phase B — deferred golden gaps (enemy → player status)

Do **not** stub these until NPC rosters actually grant the moves. Cover with real fights when Phase B adds enemy kits that apply status to the player.

| Status | Engine path | Why deferred | Fixture plan when live |
|--------|-------------|--------------|------------------------|
| **bleed** | `mergeEnemyMoveIntoCombatStatus` (enemy FURY_SWEEP crit → player) | ~1/9×crit rate; no reliable seed in current roster | NPC with FURY_SWEEP + seed search for `you bleed.` |
| **slow** | enemy `GRAVITY_SHIFT` onResolve flip | no NPC with GRAVITY_SHIFT today | enemy slow fixture + tick log |
| **stun** | enemy phenomena/stun proc to player | no enemy stun source in roster | when NPC gains stun-on-hit move |
| **miss** | enemy `miss` debuff to player | no enemy miss source in roster | when NPC gains miss-on-hit move |

Player → enemy status is covered (WHISPER/shake, GRAVITY_SHIFT/slow, PHENOMENA variants, bleed tick, etc.).

## Next security stage (not started)

1. **Server GRANTS XP only from validated fights** — tie skill XP writes to `combat-session` `validate_fight` success; reject client-side XP for scored content.
2. **Extend replay validation to solo** — same replay bundle for overworld NPC wins (not only gym/scored paths).
