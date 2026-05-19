/**
 * Palette for layered avatar — aligned with battle MDNGHT (deep purple / black, crimson jacket).
 * Jacket stays on J / j / K / k in the base grid.
 */
export const AVATAR_PALETTE: Record<string, string> = {
  '.': 'transparent',
  // outline / neutral (cool black-violet)
  '0': '#0a0610',
  '1': '#16101f',
  // skin — desaturated purple-grey
  'S': '#c9b8da',
  's': '#9d86b4',
  'T': '#6e5a7e',
  't': '#45344f',
  // eyes
  'E': '#ebe4f4',
  'e': '#0c0614',
  'B': '#8b7cb5',
  'b': '#45306a',
  // hair
  'H': '#14101c',
  'h': '#241c30',
  'N': '#3d2f48',
  'n': '#18101f',
  // mouth / detail
  'M': '#5c4868',
  'm': '#382c48',
  // jacket — MDNGHT red ramp
  'J': '#d42d42',
  'j': '#7a121c',
  'K': '#f0a8b0',
  'k': '#4a0810',
  // accessories
  'A': '#9b87d4',
  'a': '#5b3d8a',
  'G': '#6a5a78',
  'g': '#3a3048',
  'P': '#e8c468',
  'p': '#9a7210',
  'R': '#f87171',
  'r': '#8b1520',
  'C': '#7c6fa8',
  'c': '#3a2c58',
}
