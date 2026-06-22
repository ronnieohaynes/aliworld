import { isRegisteredMidnightVariantId, type MidnightVariantId } from '../data/midnightVariants'

let runUnlockedSkinIds: MidnightVariantId[] = []
let revision = 0
const listeners = new Set<() => void>()

function emit(): void {
  revision++
  for (const listener of listeners) {
    listener()
  }
}

export function getRunSkinsRevision(): number {
  return revision
}

export function subscribeRunSkinsStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getRunUnlockedSkinIds(): readonly MidnightVariantId[] {
  return runUnlockedSkinIds
}

export function isRunSkinUnlocked(id: MidnightVariantId): boolean {
  return runUnlockedSkinIds.includes(id)
}

export function unlockRunSkin(id: MidnightVariantId): void {
  if (!isRegisteredMidnightVariantId(id)) return
  if (runUnlockedSkinIds.includes(id)) return
  runUnlockedSkinIds = [...runUnlockedSkinIds, id]
  emit()
}

export function applyRunSkinsFromAccount(
  ids: unknown,
  fallbackVariant?: MidnightVariantId | null,
): void {
  const parsed = Array.isArray(ids)
    ? ids.filter((id): id is MidnightVariantId => typeof id === 'string' && isRegisteredMidnightVariantId(id))
    : []
  if (parsed.length > 0) {
    runUnlockedSkinIds = [...new Set(parsed)]
  } else if (fallbackVariant && isRegisteredMidnightVariantId(fallbackVariant)) {
    runUnlockedSkinIds = [fallbackVariant]
  } else {
    runUnlockedSkinIds = []
  }
  emit()
}

export function serializeRunSkins(): MidnightVariantId[] {
  return [...runUnlockedSkinIds]
}

export function resetRunSkinsForNewGame(): void {
  runUnlockedSkinIds = []
  emit()
}
