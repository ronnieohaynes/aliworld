import { SHOP_CATALOG, getShopCatalogItem, type ShopCatalogItem } from '../data/cosmeticsCatalog'
import type { EmblemId } from '../data/emblemRegistry'
import { isEmblemId } from '../data/emblemRegistry'
import type { MidnightVariantId } from '../data/midnightVariants'
import { getMidnightWalkSrc } from '../data/midnightVariants'
import { isCatalogItemOwned } from '../lib/cosmeticsPurchase'
import { getSelectedMidnightVariant } from './characterStore'

const STORAGE_KEY = 'aliworld:cosmetics-equip:v1'

type EquippedState = {
  emblemId: EmblemId | null
  accessoryCatalogId: string | null
}

let equipped: EquippedState = loadEquipped()
let revision = 0
const listeners = new Set<() => void>()

function loadEquipped(): EquippedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { emblemId: null, accessoryCatalogId: null }
    const parsed = JSON.parse(raw) as Partial<EquippedState>
    return {
      emblemId:
        typeof parsed.emblemId === 'string' && isEmblemId(parsed.emblemId)
          ? parsed.emblemId
          : null,
      accessoryCatalogId:
        typeof parsed.accessoryCatalogId === 'string' ? parsed.accessoryCatalogId : null,
    }
  } catch {
    return { emblemId: null, accessoryCatalogId: null }
  }
}

function saveEquipped(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(equipped))
}

function emit(): void {
  revision++
  for (const fn of listeners) fn()
}

function catalogItemByEmblem(emblemId: EmblemId): ShopCatalogItem | undefined {
  return SHOP_CATALOG.find((item) => item.emblemId === emblemId)
}

export function getCosmeticsRevision(): number {
  return revision
}

export function subscribeCosmeticsStore(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getActiveEmblemId(): EmblemId | null {
  if (!equipped.emblemId) return null
  const item = catalogItemByEmblem(equipped.emblemId)
  if (!item || !isCatalogItemOwned(item)) return null
  return equipped.emblemId
}

export function getEquippedAccessoryCatalogId(): string | null {
  if (!equipped.accessoryCatalogId) return null
  const item = getShopCatalogItem(equipped.accessoryCatalogId)
  if (!item || item.type !== 'accessory' || !isCatalogItemOwned(item)) return null
  const base = getSelectedMidnightVariant()
  if (!base || item.baseVariantId !== base) return null
  return item.id
}

export function getEquippedAccessoryWalkSrc(baseVariant: MidnightVariantId | null): string | null {
  const id = getEquippedAccessoryCatalogId()
  if (!id || !baseVariant) return null
  const item = getShopCatalogItem(id)
  if (!item?.accessoryWalkSrc || item.baseVariantId !== baseVariant) return null
  return item.accessoryWalkSrc
}

/** Walk sheet for overworld + card — accessory overrides base when equipped. */
export function resolvePlayerWalkSrc(baseVariant: MidnightVariantId | null): string {
  const accessorySrc = getEquippedAccessoryWalkSrc(baseVariant)
  if (accessorySrc) return accessorySrc
  return getMidnightWalkSrc(baseVariant)
}

export function equipEmblem(emblemId: EmblemId | null): boolean {
  if (emblemId) {
    const item = catalogItemByEmblem(emblemId)
    if (!item || !isCatalogItemOwned(item)) return false
  }
  equipped = { ...equipped, emblemId }
  saveEquipped()
  emit()
  return true
}

export function equipAccessory(catalogId: string | null): boolean {
  if (catalogId) {
    const item = getShopCatalogItem(catalogId)
    if (!item || item.type !== 'accessory' || !isCatalogItemOwned(item)) return false
    const base = getSelectedMidnightVariant()
    if (!base || item.baseVariantId !== base) return false
  }
  equipped = { ...equipped, accessoryCatalogId: catalogId }
  saveEquipped()
  emit()
  return true
}

export function canEquipAccessory(item: ShopCatalogItem): boolean {
  if (item.type !== 'accessory' || !isCatalogItemOwned(item)) return false
  const base = getSelectedMidnightVariant()
  return base != null && item.baseVariantId === base
}

export function resetCosmeticsEquipForSignOut(): void {
  equipped = { emblemId: null, accessoryCatalogId: null }
  saveEquipped()
  emit()
}
