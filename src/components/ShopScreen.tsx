import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  getShopCatalogByType,
  type ShopCatalogItem,
  type ShopCatalogType,
} from '../data/cosmeticsCatalog'
import { getSelectedMidnightVariant, subscribeCharacterStore } from '../store/characterStore'
import {
  canEquipAccessory as accessoryMatchesBase,
  equipAccessory,
  equipEmblem,
  getActiveEmblemId,
  getCosmeticsRevision,
  getEquippedAccessoryCatalogId,
  subscribeCosmeticsStore,
} from '../store/cosmeticsStore'
import { getGrantsRevision, subscribeGrantsStore } from '../store/grantsStore'
import { isCatalogItemOwned, tryPurchaseCatalogItem } from '../lib/cosmeticsPurchase'
import { setMidnightVariant } from '../store/characterStore'
import type { MidnightVariantId } from '../data/midnightVariants'
import { track } from '../lib/analytics'
import './ShopScreen.css'

type Props = {
  onClose: () => void
}

const SECTIONS: { type: ShopCatalogType; label: string; blurb: string }[] = [
  { type: 'skin', label: 'skins', blurb: 'full base looks' },
  { type: 'accessory', label: 'accessories', blurb: 'base-specific add-ons' },
  { type: 'emblem', label: 'emblems', blurb: 'handle + card flair' },
]

function baseLabel(id: MidnightVariantId): string {
  return id.replace(/-/g, ' ')
}

export function ShopScreen({ onClose }: Props) {
  const [toast, setToast] = useState<string | null>(null)
  const cosmeticsRevision = useSyncExternalStore(
    subscribeCosmeticsStore,
    getCosmeticsRevision,
    getCosmeticsRevision,
  )
  const grantsRevision = useSyncExternalStore(
    subscribeGrantsStore,
    getGrantsRevision,
    getGrantsRevision,
  )
  const baseVariant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )
  void cosmeticsRevision
  void grantsRevision

  useEffect(() => {
    track('shop_open')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const equippedEmblem = getActiveEmblemId()
  const equippedAccessory = getEquippedAccessoryCatalogId()

  const showToast = useCallback((message: string) => {
    setToast(message)
  }, [])

  const handleBuy = useCallback(
    (item: ShopCatalogItem) => {
      const result = tryPurchaseCatalogItem(item)
      if (result === 'coming_soon') {
        showToast('coming soon — prints not live yet')
        track('shop_buy_teaser', { itemId: item.id, type: item.type })
        return
      }
      if (result === 'already_owned') showToast('already owned')
      else if (result === 'insufficient_prints') showToast('not enough prints')
      else showToast('granted')
    },
    [showToast],
  )

  const handleEquip = useCallback(
    (item: ShopCatalogItem) => {
      if (!isCatalogItemOwned(item)) return
      if (item.type === 'skin' && item.variantId) {
        setMidnightVariant(item.variantId)
        showToast(`equipped ${item.name}`)
        return
      }
      if (item.type === 'accessory') {
        if (!accessoryMatchesBase(item)) {
          showToast(`for ${baseLabel(item.baseVariantId!)} base only`)
          return
        }
        const next = equippedAccessory === item.id ? null : item.id
        equipAccessory(next)
        showToast(next ? `equipped ${item.name}` : 'accessory removed')
        return
      }
      if (item.type === 'emblem' && item.emblemId) {
        const next = equippedEmblem === item.emblemId ? null : item.emblemId
        equipEmblem(next)
        showToast(next ? `emblem on` : 'emblem off')
      }
    },
    [equippedAccessory, equippedEmblem, showToast],
  )

  const sections = useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        items: getShopCatalogByType(section.type),
      })),
    [],
  )

  return (
    <div className="shop-screen" role="dialog" aria-modal="true" aria-label="Cosmetics shop">
      <div className="shop-screen__backdrop" onClick={onClose} aria-hidden />
      <div className="shop-screen__panel">
        <header className="shop-screen__header">
          <div>
            <p className="shop-screen__eyebrow">aliworld · expression only</p>
            <h1 className="shop-screen__title">cosmetics</h1>
            <p className="shop-screen__sub">skins · accessories · emblems · prints coming soon</p>
          </div>
          <button type="button" className="shop-screen__btn" onClick={onClose}>
            close
          </button>
        </header>

        {toast ? (
          <p className="shop-screen__toast" role="status">
            {toast}
          </p>
        ) : null}

        {baseVariant ? (
          <p className="shop-screen__base-note">
            your base: <strong>{baseLabel(baseVariant)}</strong>
          </p>
        ) : null}

        {sections.map((section) => (
          <section key={section.type} className="shop-screen__section">
            <h2 className="shop-screen__section-label">
              {section.label}
              <span className="shop-screen__section-blurb">{section.blurb}</span>
            </h2>
            <div className="shop-screen__grid">
              {section.items.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={isCatalogItemOwned(item)}
                  equipped={
                    item.type === 'emblem'
                      ? equippedEmblem === item.emblemId
                      : item.type === 'accessory'
                        ? equippedAccessory === item.id
                        : item.type === 'skin' && item.variantId === baseVariant
                  }
                  onBuy={() => handleBuy(item)}
                  onEquip={() => handleEquip(item)}
                />
              ))}
            </div>
          </section>
        ))}

        <p className="shop-screen__fairness">
          earned seals &amp; champion skins never appear here — bought stays distinct from earned.
        </p>
      </div>
    </div>
  )
}

function ShopItemCard({
  item,
  owned,
  equipped,
  onBuy,
  onEquip,
}: {
  item: ShopCatalogItem
  owned: boolean
  equipped: boolean
  onBuy: () => void
  onEquip: () => void
}) {
  return (
    <article className={`shop-item${owned ? ' shop-item--owned' : ''}`}>
      <div className="shop-item__thumb-wrap">
        <img className="shop-item__thumb" src={item.thumbnailSrc} alt="" loading="lazy" />
        {owned ? <span className="shop-item__owned-tag">owned</span> : null}
      </div>
      <h3 className="shop-item__name">{item.name}</h3>
      <p className="shop-item__desc">{item.description}</p>
      {item.type === 'accessory' && item.baseVariantId ? (
        <p className="shop-item__base">for {baseLabel(item.baseVariantId)}</p>
      ) : null}
      <p className="shop-item__price">{item.pricePrints} prints</p>
      <div className="shop-item__actions">
        <button type="button" className="shop-item__buy" onClick={onBuy}>
          coming soon
        </button>
        {owned ? (
          <button
            type="button"
            className={`shop-item__equip${equipped ? ' shop-item__equip--active' : ''}`}
            onClick={onEquip}
            disabled={item.type === 'accessory' && !accessoryMatchesBase(item)}
          >
            {equipped ? 'equipped' : 'equip'}
          </button>
        ) : null}
      </div>
      {item.type === 'accessory' && owned && !accessoryMatchesBase(item) ? (
        <p className="shop-item__hint">switch to matching base to equip</p>
      ) : null}
    </article>
  )
}
