import type { MidnightVariantId } from './midnightVariants'
import { getMidnightWalkSrc } from './midnightVariants'
import { publicAsset } from '../utils/publicAsset'
import type { EmblemId } from './emblemRegistry'

export type ShopCatalogType = 'skin' | 'accessory' | 'emblem'

/** Expression-only catalog. Never list seals, badges, or earned variants here. */
export type ShopCatalogItem = {
  id: string
  type: ShopCatalogType
  name: string
  description: string
  pricePrints: number
  thumbnailSrc: string
  /** aw_grants.value written on purchase. */
  grantValue: string
  /** Full skin variant granted (skins + accessories render as walk sheets). */
  variantId?: MidnightVariantId
  /** Accessory-only: which base this fits. */
  baseVariantId?: MidnightVariantId
  /** Accessory walk sheet when equipped on matching base. */
  accessoryWalkSrc?: string
  /** Emblem-only. */
  emblemId?: EmblemId
}

const SHOP_DIR = publicAsset('Assets/Characters/variants/SHOP ITEMS/earmuffs')

export const SHOP_CATALOG: readonly ShopCatalogItem[] = [
  {
    id: 'skin-danny-ali',
    type: 'skin',
    name: 'danny ali',
    description: 'full base look · expression only',
    pricePrints: 480,
    thumbnailSrc: getMidnightWalkSrc('danny-ali'),
    grantValue: 'shop-skin:skin-danny-ali',
    variantId: 'danny-ali',
  },
  {
    id: 'skin-blnt',
    type: 'skin',
    name: 'blnt cut',
    description: 'full base look · expression only',
    pricePrints: 420,
    thumbnailSrc: getMidnightWalkSrc('player-blnt'),
    grantValue: 'shop-skin:skin-blnt',
    variantId: 'player-blnt',
  },
  {
    id: 'acc-earmuffs-default',
    type: 'accessory',
    name: 'earmuffs',
    description: 'for default base',
    pricePrints: 180,
    thumbnailSrc: `${SHOP_DIR}/midnight-earmuffs.png`,
    grantValue: 'shop-accessory:acc-earmuffs-default',
    baseVariantId: 'default',
    accessoryWalkSrc: `${SHOP_DIR}/midnight-earmuffs.png`,
  },
  {
    id: 'acc-earmuffs-latino',
    type: 'accessory',
    name: 'earmuffs',
    description: 'for latino-m base',
    pricePrints: 180,
    thumbnailSrc: `${SHOP_DIR}/midnight-latino-m-earmuffs.png`,
    grantValue: 'shop-accessory:acc-earmuffs-latino',
    baseVariantId: 'latino-m',
    accessoryWalkSrc: `${SHOP_DIR}/midnight-latino-m-earmuffs.png`,
  },
  {
    id: 'emblem-six5ive',
    type: 'emblem',
    name: 'six5ive mark',
    description: 'handle + card flair',
    pricePrints: 120,
    thumbnailSrc: publicAsset('Assets/ui/artifacts/six5ive-tee.png'),
    grantValue: 'shop-emblem:emblem-six5ive',
    emblemId: 'six5ive-mark',
  },
] as const

export function getShopCatalogByType(type: ShopCatalogType): readonly ShopCatalogItem[] {
  return SHOP_CATALOG.filter((item) => item.type === type)
}

export function getShopCatalogItem(id: string): ShopCatalogItem | undefined {
  return SHOP_CATALOG.find((item) => item.id === id)
}

/** Earned grants must never appear in the shop. */
export function isEarnedGrantValue(value: string): boolean {
  return (
    value.startsWith('gym-') ||
    value.startsWith('theater-') ||
    value.startsWith('badge:') ||
    value.includes('champion') ||
    value.includes('seal')
  )
}
