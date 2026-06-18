import { PRINTS_ECONOMY_LIVE } from '../config/printsGate'
import type { ShopCatalogItem } from '../data/cosmeticsCatalog'
import { getPlayerGrants } from '../store/grantsStore'

export type PurchaseAttemptResult =
  | 'coming_soon'
  | 'already_owned'
  | 'insufficient_prints'
  | 'granted'

export function isCatalogItemOwned(item: ShopCatalogItem): boolean {
  return getPlayerGrants().some((g) => g.kind === 'skin' && g.value === item.grantValue)
}

/**
 * Purchase pathway — prints gate closed returns coming_soon until PRINTS_ECONOMY_LIVE.
 * When live: edge fn deducts prints + inserts aw_grants (not wired in teaser).
 */
export function tryPurchaseCatalogItem(item: ShopCatalogItem): PurchaseAttemptResult {
  if (isCatalogItemOwned(item)) return 'already_owned'
  if (!PRINTS_ECONOMY_LIVE) return 'coming_soon'
  // Future: call shop-purchase edge with item.id, check prints balance server-side.
  return 'insufficient_prints'
}
