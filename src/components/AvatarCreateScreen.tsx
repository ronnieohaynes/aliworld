import { useMemo, useState } from 'react'
import { PixelCharacter } from './PixelCharacter'
import { AVATAR_PALETTE } from '../avatar/avatarPalette'
import { buildMdnghtHeadGrid, sumAvatarStats } from '../avatar/buildAvatar'
import { ACCESSORY_CATEGORIES, FACE_CATEGORIES } from '../avatar/avatarData'
import type { AccessoryId, FaceCategoryId, StatId } from '../avatar/types'
import { useAvatarLoadout } from '../contexts/AvatarLoadoutContext'
import { MDNGHT_SPRITE_SRC } from '../constants/characters'
import { SpriteImage } from './SpriteImage'
import './AvatarCreateScreen.css'

type Tab = { kind: 'face'; id: FaceCategoryId } | { kind: 'acc'; id: AccessoryId }

const STAT_ORDER: StatId[] = ['HP', 'Attack', 'Defense', 'Speed', 'Luck']

type Props = {
  onDone: () => void
}

const PREVIEW_HEAD_CELL = 5

export function AvatarCreateScreen({ onDone }: Props) {
  const { face, acc, setFace, setAcc } = useAvatarLoadout()
  const [tab, setTab] = useState<Tab>({ kind: 'face', id: 'face' })

  const mdnghtHeadGrid = useMemo(() => buildMdnghtHeadGrid(face, acc), [face, acc])
  const totals = useMemo(() => sumAvatarStats(face, acc), [face, acc])

  const activeCategories = tab.kind === 'face' ? FACE_CATEGORIES : ACCESSORY_CATEGORIES
  const activeCat = activeCategories.find((c) => c.id === tab.id)
  const selectedId = tab.kind === 'face' ? face[tab.id] : acc[tab.id]
  const selectedOpt = activeCat?.options.find((o) => o.id === selectedId)

  function pickOption(optionId: string) {
    if (tab.kind === 'face') {
      setFace((f) => ({ ...f, [tab.id]: optionId }))
    } else {
      setAcc((a) => ({ ...a, [tab.id]: optionId }))
    }
  }

  return (
    <div className="ac">
      <header className="ac-header">
        <button type="button" className="ac-header-back" onClick={onDone}>
          ← FIGHT
        </button>
        <h1 className="ac-title">ALIWORLD</h1>
        <span className="ac-header-spacer" aria-hidden />
      </header>

      <p className="ac-sub">MDNGHT · edit face & loadout</p>

      <div className="ac-preview-card">
        <p className="ac-jacket">full body + your head layer (battle match)</p>
        <div className="ac-preview-frame">
          <div className="ac-preview-hero-wrap ac-preview-mdnght-wrap">
            <div className="ac-mdnght-stack ac-mdnght-stack--flip">
              <SpriteImage
                src={MDNGHT_SPRITE_SRC}
                alt="MDNGHT body"
                className="ac-mdnght-body"
              />
              <div className="ac-mdnght-face">
                <PixelCharacter
                  grid={mdnghtHeadGrid}
                  colors={AVATAR_PALETTE}
                  cellSize={PREVIEW_HEAD_CELL}
                  className="ac-mdnght-face-pixel"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="ac-stats" role="list" aria-label="Build bonuses">
          {STAT_ORDER.map((s) => (
            <span key={s} className={`ac-stat ac-stat--${s}`} role="listitem">
              <span className="ac-stat-name">{s}</span>
              <span className="ac-stat-val">{totals[s] > 0 ? `+${totals[s]}` : '—'}</span>
            </span>
          ))}
        </div>
        {selectedOpt ? (
          <p className="ac-active-meta">
            <span className="ac-active-cat">{activeCat?.title}</span>
            <span className="ac-active-sep">·</span>
            <span className="ac-active-name">{selectedOpt.label}</span>
            <span className="ac-active-sep">·</span>
            <span className="ac-active-boost">
              {selectedOpt.bonus > 0 ? `+${selectedOpt.bonus} ${selectedOpt.stat}` : 'no stat shift'}
            </span>
          </p>
        ) : null}
      </div>

      <section className="ac-section" aria-labelledby="ac-face-label">
        <h2 id="ac-face-label" className="ac-section-label">
          face & head
        </h2>
        <div className="ac-tabs" role="tablist" aria-label="Face categories">
          {FACE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={tab.kind === 'face' && tab.id === c.id}
              className={`ac-tab${tab.kind === 'face' && tab.id === c.id ? ' ac-tab--on' : ''}`}
              onClick={() => setTab({ kind: 'face', id: c.id })}
            >
              {c.title}
            </button>
          ))}
        </div>
      </section>

      <section className="ac-section" aria-labelledby="ac-acc-label">
        <h2 id="ac-acc-label" className="ac-section-label">
          accessories
        </h2>
        <div className="ac-tabs" role="tablist" aria-label="Accessory slots">
          {ACCESSORY_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={tab.kind === 'acc' && tab.id === c.id}
              className={`ac-tab${tab.kind === 'acc' && tab.id === c.id ? ' ac-tab--on' : ''}`}
              onClick={() => setTab({ kind: 'acc', id: c.id })}
            >
              {c.title}
            </button>
          ))}
        </div>
      </section>

      {activeCat ? (
        <div className="ac-strip-wrap">
          <ul className="ac-strip" aria-label={`${activeCat.title} options`}>
            {activeCat.options.map((o) => {
              const on = o.id === selectedId
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    className={`ac-card${on ? ' ac-card--on' : ''}`}
                    onClick={() => pickOption(o.id)}
                    aria-pressed={on}
                  >
                    <div className="ac-thumb" aria-hidden>
                      <PixelCharacter grid={o.overlay} colors={AVATAR_PALETTE} cellSize={3} />
                    </div>
                    <span className="ac-card-label">{o.label}</span>
                    <span className="ac-card-stat">
                      {o.bonus > 0 ? `+${o.bonus} ${o.stat}` : '—'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <footer className="ac-footer">
        <button type="button" className="ac-lock" onClick={onDone}>
          lock MDNGHT
        </button>
      </footer>
    </div>
  )
}
