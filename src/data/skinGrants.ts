import { SHOP_CATALOG } from './cosmeticsCatalog'
import {
  isRegisteredMidnightVariantId,
  listRegisteredMidnightVariantIds,
  MIDNIGHT_VARIANTS,
  MIDNIGHT_VARIANT_SHEET,
  type MidnightVariantId,
} from './midnightVariants'
import { getPlayerGrants } from '../store/grantsStore'

export type SkinVariantOption = {
  id: MidnightVariantId
  displayName: string
}

/** Grant value written for admin skin prizes — the canonical variant id. */
export function skinGrantValueForVariant(variantId: MidnightVariantId): string {
  return variantId
}

/** Map a skin grant value to a registered variant id (admin id, shop grant, legacy). */
export function resolveSkinGrantToVariantId(grantValue: string): MidnightVariantId | null {
  if (isRegisteredMidnightVariantId(grantValue)) return grantValue

  const shopSkin = SHOP_CATALOG.find(
    (item) => item.type === 'skin' && item.grantValue === grantValue,
  )
  if (shopSkin?.variantId && isRegisteredMidnightVariantId(shopSkin.variantId)) {
    return shopSkin.variantId
  }

  return null
}

/** Every registered skin the mothership can grant (registry-driven). */
export function listGrantableSkinVariants(): SkinVariantOption[] {
  return listRegisteredMidnightVariantIds()
    .map((id) => ({
      id,
      displayName: MIDNIGHT_VARIANT_SHEET[id].displayName,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

const CREATION_VARIANT_IDS = new Set(MIDNIGHT_VARIANTS.map((v) => v.id))

/** Skins the player can equip in loadout — creation bases + granted reward skins. */
export function listOwnedSkinVariants(): SkinVariantOption[] {
  const owned = new Set<MidnightVariantId>()
  for (const id of CREATION_VARIANT_IDS) {
    owned.add(id)
  }
  for (const grant of getPlayerGrants()) {
    if (grant.kind !== 'skin') continue
    const id = resolveSkinGrantToVariantId(grant.value)
    if (id) owned.add(id)
  }
  return listGrantableSkinVariants().filter((opt) => owned.has(opt.id))
}

export function isSkinVariantOwned(variantId: MidnightVariantId): boolean {
  return listOwnedSkinVariants().some((opt) => opt.id === variantId)
}
