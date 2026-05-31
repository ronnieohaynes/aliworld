import type { CityConfig } from '../data/cityConfig'
import { getMidnightWalkSrc } from '../data/midnightVariants'
import type { MidnightVariantId } from '../data/midnightVariants'
import { loadSpriteSheetWithFallback } from './characterLayers'
import { loadImage } from './loadImage'
import { loadWorldBackgroundForSrc } from './WorldBackground'

/** Preload map, player walk sheet, and all NPC sprites before revealing the world. */
export async function preloadWorldEntry(
  city: CityConfig,
  variantId: MidnightVariantId | null,
): Promise<void> {
  const walkSrc = getMidnightWalkSrc(variantId)
  const npcSrcs = [
    ...new Set(
      city.npcs.map((npc) => npc.spriteSrc).filter((src): src is string => Boolean(src)),
    ),
  ]

  await Promise.all([
    loadWorldBackgroundForSrc(city.mapSrc),
    loadSpriteSheetWithFallback(walkSrc),
    ...npcSrcs.map((src) => loadImage(src)),
  ])
}
