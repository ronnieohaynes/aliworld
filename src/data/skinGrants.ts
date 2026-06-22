import { SHOP_CATALOG } from './cosmeticsCatalog'
import {
  isRegisteredMidnightVariantId,
  listRegisteredMidnightVariantIds,
  MIDNIGHT_VARIANT_SHEET,
  type MidnightVariantId,
} from './midnightVariants'
import { getMidnightVariant } from '../store/characterStore'
import { getRunUnlockedSkinIds, unlockRunSkin } from '../store/runSkinsStore'

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

/** Unlock a skin grant value for the current run (messages, theater, admin grants). */
export function unlockSkinGrantForRun(grantValue: string): MidnightVariantId | null {
  const id = resolveSkinGrantToVariantId(grantValue)
  if (!id) return null
  unlockRunSkin(id)
  return id
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

/** Skins the player can equip in loadout — unlocked on this run only. */
export function listOwnedSkinVariants(): SkinVariantOption[] {
  const owned = new Set(getRunUnlockedSkinIds())
  const equipped = getMidnightVariant()
  if (equipped) owned.add(equipped)
  return listGrantableSkinVariants().filter((opt) => owned.has(opt.id))
}

export function isSkinVariantOwned(variantId: MidnightVariantId): boolean {
  return listOwnedSkinVariants().some((opt) => opt.id === variantId)
}
