/** Pixel grids: . empty, 0 outline, 1 main, 2 shadow, 3 highlight */

/** The Watcher — angular, one cold “eye” */
export const WATCHER_SPRITE = [
  '............',
  '....000.....',
  '...01110....',
  '..0111110...',
  '.011303110..',
  '.011111110..',
  '..0222220...',
  '.022222220..',
  '.022222220..',
  '..0222220...',
  '...02220....',
  '..00..00....',
  '.00....00...',
  '............',
] as const

/** Legacy ASCII MDNGHT (battle uses `public/assets/characters/mdnght.png`). */
export const MDNGHT_SPRITE = [
  '............',
  '.....0000...',
  '....01110...',
  '...0111110..',
  '...0133110..',
  '...0111110..',
  '....0220....',
  '...022220...',
  '..02222220..',
  '..02222220..',
  '...022220...',
  '....0220....',
  '...00..00...',
  '..00....00..',
] as const

export const WATCHER_COLORS: Record<string, string> = {
  '.': 'transparent',
  '0': '#1a0508',
  '1': '#dc2626',
  '2': '#7f1d1d',
  '3': '#fecaca',
}

export const MDNGHT_COLORS: Record<string, string> = {
  '.': 'transparent',
  '0': '#0c0218',
  '1': '#5b21b6',
  '2': '#3b0764',
  '3': '#c4b5fd',
}
