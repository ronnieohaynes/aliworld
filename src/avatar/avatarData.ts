import type { AccessoryId, AvatarCategory, AvatarOption, FaceCategoryId, StatId } from './types'

const W = 14
const empty = (): string[] => Array.from({ length: 18 }, () => '.'.repeat(W))

/**
 * Pokémon-style chibi: ~9 rows head (half height), ~9 rows body.
 * Two ears, two eyes, nose bridge + tip, mouth, short arms, short legs.
 * Red jacket (J/j/K/k) is fixed from row 9 down.
 */
export const AVATAR_BASE: readonly string[] = [
  '....000000....', // 0 crown / hairline
  '...0SSSSSS0...', // 1 upper head
  '...ssSSSSss...', // 2 ears (ss … ss) + cheek width
  '..0SSSSSSSS0..', // 3 cheek / brow band
  '...0EeSeE0...', // 4 two eyes + S nose bridge
  '....0T0......', // 5 nose tip
  '....0MM0......', // 6 mouth
  '....0110......', // 7 chin
  '...00000000...', // 8 neck → jacket
  '...0JJJJJJ0...', // 9 jacket shoulders
  '...jjJJJJjj...', // 10 short arms (jj) + torso
  '....0JJ0......', // 11 short torso
  '....0JJ0......', // 12 waist
  '....0110......', // 13 leg
  '....0110......', // 14 leg
  '....0110......', // 15 foot
  '...000000.....', // 16 soles
  '..............', // 17
]

function O(rows: string[]): readonly string[] {
  const e = empty()
  for (let y = 0; y < rows.length; y++) {
    const line = rows[y] ?? ''
    const padded = line.padEnd(W, '.').slice(0, W)
    e[y] = padded
  }
  return e
}

/** Head silhouette — rows 0–3 */
const faceRound = O([
  '....000000....',
  '...0SSSSSS0...',
  '..00ssssss00..',
  '..0SSssssSS0..',
])
const faceSharp = O([
  '....000000....',
  '...0SS00SS0...',
  '...ssSSSSss...',
  '..0SS00SS0..',
])
const faceSoft = O([
  '....000000....',
  '...0SSSSSS0...',
  '...ssSSSSss...',
  '..0SSSSSSSS0..',
])

/** Skin tint — rows 1–3 cheeks / forehead */
const skinFair = O(['..............', '...0SSSSSS0...', '..0SSSSSSSS0..'])
const skinMed = O(['..............', '...0ssssss0...', '..0ssssssss0..'])
const skinDeep = O(['..............', '...0TTTTTT0...', '..0TTTTTTTT0..'])

/** Eyes — row 4 (two eyes + nose bridge S kept or replaced) */
const eyesNarrow = O(['..............', '..............', '..............', '..............', '...0EeeSeE0...'])
const eyesWide = O(['..............', '..............', '..............', '..............', '..0EeeSSeeE0..'])
const eyesTired = O(['..............', '..............', '..............', '..............', '...0EeebbE0...'])

/** Mouth — row 6 */
const mouthNeutral = O(['..............', '..............', '..............', '..............', '..............', '..............', '....0MM0......'])
const mouthSmirk = O(['..............', '..............', '..............', '..............', '..............', '..............', '....0mM0......'])
const mouthGrit = O(['..............', '..............', '..............', '..............', '..............', '..............', '....0MMm......'])

/** Brows — row 3 over cheeks */
const browsThin = O(['..............', '..............', '..............', '..0SSHHHHSS0..'])
const browsThick = O(['..............', '..............', '..............', '..0HHHHHHHH0..'])
const browsAngry = O(['..............', '..............', '..............', '..0SSH00HSS0..'])

/** Hair — rows 0–2 */
const hairBuzz = O([
  '....HHHHHH....',
  '...0HHHHHH0...',
  '...ssHHHHss...',
])
const hairBangs = O([
  '....000000....',
  '...0HHHHHH0...',
  '..0HHHHHHHH0..',
  '..0HHH00HHH0..',
])
const hairSpiky = O([
  '....0H00H0....',
  '...0HHHHHH0...',
  '..0HHHHHHHH0..',
  '...ssHHHHss...',
])

function opt(
  id: string,
  label: string,
  stat: StatId,
  overlay: readonly string[],
  bonus = 1,
): AvatarOption {
  return { id, label, stat, overlay, bonus }
}

export const FACE_CATEGORIES: readonly AvatarCategory<FaceCategoryId>[] = [
  {
    id: 'face',
    title: 'FACE',
    options: [
      opt('face_round', 'ROUND', 'Defense', faceRound),
      opt('face_sharp', 'SHARP', 'Attack', faceSharp),
      opt('face_soft', 'SOFT', 'HP', faceSoft),
    ],
  },
  {
    id: 'skin',
    title: 'SKIN',
    options: [
      opt('skin_fair', 'FAIR', 'Luck', skinFair),
      opt('skin_med', 'MED', 'HP', skinMed),
      opt('skin_deep', 'DEEP', 'Defense', skinDeep),
    ],
  },
  {
    id: 'eyes',
    title: 'EYES',
    options: [
      opt('eyes_narrow', 'NARROW', 'Speed', eyesNarrow),
      opt('eyes_wide', 'WIDE', 'Luck', eyesWide),
      opt('eyes_tired', 'TIRED', 'Attack', eyesTired),
    ],
  },
  {
    id: 'hair',
    title: 'HAIR',
    options: [
      opt('hair_buzz', 'BUZZ', 'Speed', hairBuzz),
      opt('hair_bangs', 'BANGS', 'Defense', hairBangs),
      opt('hair_spiky', 'SPIKY', 'Attack', hairSpiky),
    ],
  },
  {
    id: 'mouth',
    title: 'MOUTH',
    options: [
      opt('mouth_neutral', 'NEUTRAL', 'HP', mouthNeutral),
      opt('mouth_smirk', 'SMIRK', 'Luck', mouthSmirk),
      opt('mouth_grit', 'GRIT', 'Attack', mouthGrit),
    ],
  },
  {
    id: 'brows',
    title: 'BROWS',
    options: [
      opt('brows_thin', 'THIN', 'Speed', browsThin),
      opt('brows_thick', 'THICK', 'Defense', browsThick),
      opt('brows_angry', 'ANGRY', 'Attack', browsAngry),
    ],
  },
]

const hatNone = empty()
const hatBeanie = O([
  '....000000....',
  '...0GGGGGG0...',
  '..0GGGGGGGG0..',
  '...0GGGGGG0...',
])
const hatAntenna = O([
  '......00......',
  '......cc0.....',
  '.....0cc00....',
  '....000000....',
  '...0HHHHHH0...',
])

const eyeGearNone = empty()
const eyeMono = O([
  '..............',
  '..............',
  '..............',
  '..............',
  '....0GEEG0....',
])
const eyeVisor = O([
  '..............',
  '..............',
  '..............',
  '....0CCCC0....',
  '..0CCCCCCCC0..',
])

const faceGearNone = empty()
const faceBand = O([
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '......RR......',
  '.....0RR0.....',
])
const faceMark = O([
  '..............',
  '..............',
  '..............',
  '......aa......',
  '..............',
  '..............',
  '.....0aa0.....',
])

const neckNone = empty()
const neckTags = O([
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '......GG......',
  '.....0GGG0....',
])
const neckChoker = O([
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '....011110....',
  '...01111110...',
])

const extraNone = empty()
const extraEarring = O([
  '..............',
  '..............',
  '......P.......',
  '..............',
  '..............',
  '..............',
  '..............',
  '......P.......',
])
const extraStuds = O([
  '..............',
  '..............',
  '....P......P..',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
])

export const ACCESSORY_CATEGORIES: readonly AvatarCategory<AccessoryId>[] = [
  {
    id: 'hat',
    title: 'HAT',
    options: [
      opt('hat_none', 'NONE', 'Speed', hatNone, 0),
      opt('hat_beanie', 'BEANIE', 'HP', hatBeanie),
      opt('hat_antenna', 'ANTENNA', 'Luck', hatAntenna),
    ],
  },
  {
    id: 'eyeGear',
    title: 'EYE GEAR',
    options: [
      opt('eye_none', 'NONE', 'Defense', eyeGearNone, 0),
      opt('eye_mono', 'MONO', 'Attack', eyeMono),
      opt('eye_visor', 'VISOR', 'Defense', eyeVisor),
    ],
  },
  {
    id: 'faceGear',
    title: 'FACE',
    options: [
      opt('faceg_none', 'NONE', 'HP', faceGearNone, 0),
      opt('faceg_band', 'BAND', 'Luck', faceBand),
      opt('faceg_mark', 'SIGIL', 'Attack', faceMark),
    ],
  },
  {
    id: 'neck',
    title: 'NECK',
    options: [
      opt('neck_none', 'NONE', 'Speed', neckNone, 0),
      opt('neck_tags', 'TAGS', 'Defense', neckTags),
      opt('neck_choker', 'CHOKER', 'Attack', neckChoker),
    ],
  },
  {
    id: 'extra',
    title: 'EXTRA',
    options: [
      opt('extra_none', 'NONE', 'Luck', extraNone, 0),
      opt('extra_ear', 'EAR', 'Speed', extraEarring),
      opt('extra_stud', 'STUDS', 'Attack', extraStuds),
    ],
  },
]

export const DEFAULT_FACE_SELECTIONS: Record<FaceCategoryId, string> = {
  face: 'face_round',
  skin: 'skin_fair',
  eyes: 'eyes_narrow',
  hair: 'hair_buzz',
  mouth: 'mouth_neutral',
  brows: 'brows_thin',
}

export const DEFAULT_ACCESSORY_SELECTIONS: Record<AccessoryId, string> = {
  hat: 'hat_none',
  eyeGear: 'eye_none',
  faceGear: 'faceg_none',
  neck: 'neck_none',
  extra: 'extra_none',
}
