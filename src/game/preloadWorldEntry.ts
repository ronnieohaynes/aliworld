import type { CityConfig } from '../data/cityConfig'
import { getMidnightWalkSrc } from '../data/midnightVariants'
import type { MidnightVariantId } from '../data/midnightVariants'
import { loadSpriteSheetWithFallback } from './characterLayers'
import { loadImageWithRetry } from './loadImage'
import { loadWorldBackgroundForSrc } from './WorldBackground'
import { retryAsync } from '../utils/retryAsync'

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
    ...(city.foregroundMapSrc
      ? [loadWorldBackgroundForSrc(city.foregroundMapSrc)]
      : []),
    retryAsync(() => loadSpriteSheetWithFallback(walkSrc).then((sheet) => {
      if (!sheet) throw new Error(`Failed to load walk sheet: ${walkSrc}`)
    })),
    ...npcSrcs.map((src) => loadImageWithRetry(src)),
  ])
}
