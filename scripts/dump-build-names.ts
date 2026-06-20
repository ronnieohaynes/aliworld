/**
 * Build name / archetype reference. Run: npx tsx scripts/dump-build-names.ts
 * Self-contained (no imports from buildName.ts — it pulls playerStore/supabase).
 */

const BUILD_NAME_UNLOCK_GAP = 2

const THRESHOLDS = {
  BUILD_NAME_UNLOCK_GAP,
  PURE_THRESHOLD: BUILD_NAME_UNLOCK_GAP,
  COMBO_THRESHOLD: 3,
  LOW_SKILL_GAP: 5,
  FINAL_FORM_MIN: 40,
  EQUILIBRIUM_SPREAD_MAX: 4,
}

const UNIQUE_BUILD_NAMES = [
  { name: 'blank slate', color: '#f4e8c1', category: 'default', tier: null },
  { name: 'equilibrium', color: '#f4e8c1', category: 'cap', tier: 'final-form-subtier' },
  { name: 'final form', color: '#d4b87a', category: 'cap', tier: 'final-form' },
  { name: 'glass cannon', color: '#cc4444', category: 'low-stat', tier: null },
  { name: 'heavy hands', color: '#cc4444', category: 'pure', tier: 'attack-dominant (defense not dumped)' },
  { name: 'deadbolt', color: '#4488cc', category: 'low-stat', tier: null },
  { name: 'paper ghost', color: '#44cc66', category: 'low-stat', tier: null },
  { name: 'longshot', color: '#c084fc', category: 'low-stat', tier: null },
  { name: 'immovable wall', color: '#4488cc', category: 'pure', tier: null },
  { name: 'speed demon', color: '#44cc66', category: 'pure', tier: null },
  { name: 'wildcard', color: '#c084fc', category: 'pure', tier: null },
  { name: 'assassin', color: '#cc4444', category: 'combo', tier: null },
  { name: 'bruiser', color: '#cc4444', category: 'combo', tier: null },
  { name: 'crashout', color: '#cc4444', category: 'combo', tier: null },
  { name: 'untouchable', color: '#4488cc', category: 'combo', tier: null },
  { name: 'gambit', color: '#c084fc', category: 'combo', tier: null },
  { name: 'fortress', color: '#4488cc', category: 'combo', tier: null },
]

const BUILD_DEFINITIONS = [
  {
    name: 'equilibrium',
    priority: 1,
    conditions: [
      'all four combat skills (attack, speed, defense, luck) level >= FINAL_FORM_MIN (40)',
      'spread = max(levels) - min(levels) <= EQUILIBRIUM_SPREAD_MAX (4)',
    ],
    color: '#f4e8c1',
    leanSkill: 'null (deriveBuildLoopType returns null unless pure/combo thresholds met separately)',
  },
  {
    name: 'final form',
    priority: 1,
    conditions: [
      'all four combat skills level >= 40',
      'NOT equilibrium (spread > 4 OR any skill below 40 — latter impossible if all >= 40, so spread > 4)',
    ],
    color: '#d4b87a',
    leanSkill: 'null unless pure/combo thresholds also met',
  },
  {
    name: 'glass cannon',
    priority: 2,
    category: 'low-stat',
    conditions: [
      'top skill is attack',
      'top.level - second.level >= PURE_THRESHOLD (2)',
      'defense is LOW: defense.level <= avg(other three levels) - LOW_SKILL_GAP (5)',
    ],
    color: '#cc4444',
    leanSkill: 'attack (if top-second >= 2)',
    note: 'Checked before pure/combo; attack-dominant glass build',
  },
  {
    name: 'heavy hands',
    priority: 3,
    category: 'pure',
    skill: 'attack',
    conditions: [
      'no low-stat match (defense not low — else glass cannon)',
      'top skill is attack',
      'top.level - second.level >= 2',
    ],
    color: '#cc4444',
    leanSkill: 'attack',
    note: 'Pure attack name; only path when attack leads and defense is not dumped',
  },
  {
    name: 'deadbolt',
    priority: 2,
    category: 'low-stat',
    conditions: [
      'top skill is defense',
      'top.level - second.level >= 2',
      'attack is LOW: attack.level <= avg(other three) - 5',
    ],
    color: '#4488cc',
    leanSkill: 'defense',
  },
  {
    name: 'paper ghost',
    priority: 2,
    category: 'low-stat',
    conditions: [
      'top skill is speed',
      'top.level - second.level >= 2',
      'defense is LOW',
    ],
    color: '#44cc66',
    leanSkill: 'speed',
  },
  {
    name: 'longshot',
    priority: 2,
    category: 'low-stat',
    conditions: [
      'top skill is luck',
      'top.level - second.level >= 2',
      'at least one of attack, defense, OR speed is LOW',
    ],
    color: '#c084fc',
    leanSkill: 'luck',
  },
  {
    name: 'immovable wall',
    priority: 3,
    category: 'pure',
    skill: 'defense',
    conditions: [
      'no low-stat match',
      'top skill is defense',
      'top.level - second.level >= 2',
      'attack is NOT low (else deadbolt)',
    ],
    color: '#4488cc',
    leanSkill: 'defense',
  },
  {
    name: 'speed demon',
    priority: 3,
    category: 'pure',
    skill: 'speed',
    conditions: [
      'no low-stat match',
      'top skill is speed',
      'top.level - second.level >= 2',
      'defense is NOT low (else paper ghost)',
    ],
    color: '#44cc66',
    leanSkill: 'speed',
  },
  {
    name: 'wildcard',
    priority: 3,
    category: 'pure',
    skill: 'luck',
    conditions: [
      'no low-stat match',
      'top skill is luck',
      'top.level - second.level >= 2',
      'no other skill is low (else longshot)',
    ],
    color: '#c084fc',
    leanSkill: 'luck',
  },
  {
    name: 'assassin',
    priority: 4,
    category: 'combo',
    pair: ['attack', 'speed'],
    conditions: [
      'no final-form or low-stat match',
      'top.level - second.level < 2 (else pure/low-stat)',
      'top two skills are attack + speed (any order by level)',
      'second.level - third.level >= COMBO_THRESHOLD (3)',
    ],
    color: '#cc4444 (top skill color = attack)',
    leanSkill: 'attack (top skill)',
  },
  {
    name: 'bruiser',
    priority: 4,
    category: 'combo',
    pair: ['attack', 'defense'],
    conditions: [
      'no final-form or low-stat match',
      'top.level - second.level < 2',
      'top two are attack + defense',
      'second.level - third.level >= 3',
      'attack NOT dominant with low def (that would be glass cannon earlier)',
    ],
    color: '#cc4444',
    leanSkill: 'attack',
  },
  {
    name: 'crashout',
    priority: 4,
    category: 'combo',
    pair: ['attack', 'luck'],
    conditions: ['combo: attack+luck, second-third gap >= 3, no earlier match'],
    color: '#cc4444',
    leanSkill: 'attack',
  },
  {
    name: 'untouchable',
    priority: 4,
    category: 'combo',
    pair: ['defense', 'speed'],
    conditions: ['combo: defense+speed, second-third gap >= 3'],
    color: '#4488cc',
    leanSkill: 'defense',
  },
  {
    name: 'gambit',
    priority: 4,
    category: 'combo',
    pair: ['luck', 'speed'],
    conditions: ['combo: luck+speed (sorted key), second-third gap >= 3'],
    color: '#c084fc',
    leanSkill: 'luck',
  },
  {
    name: 'fortress',
    priority: 4,
    category: 'combo',
    pair: ['defense', 'luck'],
    conditions: ['combo: defense+luck, second-third gap >= 3'],
    color: '#4488cc',
    leanSkill: 'defense',
  },
  {
    name: 'blank slate',
    priority: 5,
    category: 'default',
    conditions: ['none of the above'],
    color: '#f4e8c1',
    leanSkill: 'null',
  },
]

const DERIVE_BUILD_NAME_ALGORITHM = `
deriveBuildName(skills) — priority order:
1. If all combat skills >= 40 → equilibrium (spread <= 4) OR final form
2. deriveLowStatBuild (requires top-second gap >= 2):
   - attack top + low def → glass cannon | attack top + def not low → heavy hands
   - defense top + low atk → deadbolt
   - speed top + low def → paper ghost
   - luck top + any other low → longshot
3. Pure: top-second gap >= 2 → PURE_NAMES[top] (immovable wall / speed demon / wildcard; attack unreachable)
4. Combo: second-third gap >= 3 → COMBO_NAMES[sorted pair]
5. blank slate

isLowSkill(skill): skill.level <= average(other three combat skill levels) - 5
rankedCombatSkills: sort attack/speed/defense/luck by level descending
`

const DERIVE_BUILD_LOOP_TYPE = `
deriveBuildLoopType(skills) — lean for counter loop (attack>speed>luck>defense>attack):
- Rank combat skills by level
- If top.level - second.level >= PURE_THRESHOLD (2): return top.skill
- Else if second.level - third.level >= COMBO_THRESHOLD (3): return top.skill
- Else: return null (blank slate — no typed lean for counters)

leanSkillFromSnapshot(buildType, skills) — ghosts/NPCs:
- If buildType non-null: lean = buildType
- Else: lean = highest-level combat skill (dominantCombatSkillFromLevels)

NPC display label (deriveNpcArchetypeLabel / deriveArchetypeLabel) — SEPARATE from build name:
- Ranks atk/def/spd from combat stats; if top-second stat gap >= 2 → pure label (heavy hands / immovable wall / speed demon)
- Else falls back to leanSkill → wildcard for luck; only 4 pure labels + blank slate (no combos/low-stat names)
`

console.log(
  JSON.stringify(
    {
      sourceFiles: ['src/data/buildName.ts', 'supabase/functions/_shared/buildName.ts (mirror)'],
      thresholds: THRESHOLDS,
      uniqueBuildNames: UNIQUE_BUILD_NAMES,
      buildDefinitions: BUILD_DEFINITIONS,
      deriveBuildNameAlgorithm: DERIVE_BUILD_NAME_ALGORITHM.trim(),
      deriveBuildLoopType: DERIVE_BUILD_LOOP_TYPE.trim(),
      skillColors: {
        attack: '#cc4444',
        speed: '#44cc66',
        defense: '#4488cc',
        luck: '#c084fc',
      },
      comboPairKeyFormat: 'sorted alphabetically, e.g. attack+speed',
      counterLoop: {
        beats: { attack: 'speed', speed: 'luck', luck: 'defense', defense: 'attack' },
        advantageDmgMult: 1.22,
        disadvantageDmgMult: 0.82,
      },
      edgeNote:
        'supabase/functions/_shared/ghostHarvestUtils.ts re-exports deriveBuildLoopType from buildName.ts (aligned)',
      exports: {
        deriveBuildName: 'full display name + color from skill levels',
        deriveBuildLoopType: 'dominant lean for counter system; null = blank slate',
        getBuildName: 'deriveBuildName(getPlayerSkills())',
        BUILD_NAME_UNLOCK_GAP: 2,
      },
    },
    null,
    2,
  ),
)
