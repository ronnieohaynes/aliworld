export type StatId = 'HP' | 'Attack' | 'Defense' | 'Speed' | 'Luck'

export type FaceCategoryId = 'face' | 'skin' | 'eyes' | 'hair' | 'mouth' | 'brows'

export type AccessoryId = 'hat' | 'eyeGear' | 'faceGear' | 'neck' | 'extra'

export type AvatarOption = {
  id: string
  label: string
  /** Single-stat modifier this piece contributes when bonus is positive */
  stat: StatId
  /** Build points toward that stat; 0 for “none” style picks */
  bonus: number
  /** Same dimensions as base; '.' keeps underlying pixels */
  overlay: readonly string[]
}

export type AvatarCategory<T extends string = string> = {
  id: T
  title: string
  options: readonly AvatarOption[]
}
