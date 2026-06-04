import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react'
import { getMidnightVariantRenderTuning, getMidnightWalkSrc } from '../data/midnightVariants'
import {
  DEFAULT_BATTLE_LOCATION,
  getBattleBackgroundSrc,
  type BattleLocationId,
} from '../data/battleBackgrounds'
import { publicAsset } from '../utils/publicAsset'
import { drawSheetFrame, getIdleFrameIndex, loadSpriteSheetWithFallback } from '../game/characterLayers'
import type { SpriteSheet } from '../game/SpriteSheet'
import { isDevSparNpcId } from '../data/devSpar'
import {
  BATTLE_ENEMY_SOURCE_H,
  BATTLE_ENEMY_SOURCE_W,
  BATTLE_ENEMY_X,
  BATTLE_GROUND_Y,
  BATTLE_PLAYER_SOURCE_H,
  BATTLE_PLAYER_SOURCE_W,
  BATTLE_PLAYER_VISIBLE_MULT,
  BATTLE_PLAYER_X,
  BATTLE_TARGET_VISIBLE_H,
  DEFAULT_ENEMY_PLACEMENT,
  DEFAULT_PLAYER_PLACEMENT,
  layoutSpriteFromVisibleBounds,
  type BattleSpritePlacement,
} from '../game/battlePlacement'
import {
  ensureImageDecoded,
  measureCanvasVisibleBounds,
  measureNaturalImageFrame,
} from '../game/spriteBounds'
import {
  applyBattleEndHealing,
  BATTLE_END_LOSE_DELAY_MS,
  BATTLE_MOVE_GAP_MS,
  BATTLE_ROUND_END_GAP_MS,
  battleReducer,
  createInitialBattleState,
  getTelegraphText,
  type PlayerMove,
} from '../store/battleStore'
import {
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from '../store/characterStore'
import {
  getPlayerLevel,
  setOverworldPlayerHp,
  subscribePlayerStore,
  getEquippedMoves,
  getShowDebug,
} from '../store/playerStore'
import {
  isBattleTutorialSeen,
  setBattleTutorialSeen,
  WALKER_NPC_ID,
} from '../store/quest1Store'
import { getMoveUiMeta } from '../data/moves'
import { track } from '../lib/analytics'
import type { BattleFeedbackTone } from '../data/battleFeedback'
import { getBuildName } from '../data/buildName'
import {
  counterMatchupLabel,
  getPlayerCounterRelation,
} from '../data/skillCounter'
import { getEnemyMoveDef, type EnemyMoveId } from '../data/enemyMoves'
import {
  STATUS_EFFECT_HINTS,
  STATUS_EFFECT_LEGEND,
} from '../data/statusEffectCopy'
import type { CombatStatusState } from '../data/combatTypes'
import { BattlePlacementGrid } from './BattlePlacementGrid'
import {
  BATTLE_TUTORIAL_STEPS,
  BattleTutorialOverlay,
} from './BattleTutorialOverlay'
import './BattleScreen.css'
import './PlayerLevelBadge.css'

const MARK_SPRITE_SRC = publicAsset('Assets/Characters/npcs/mark-idle.png')

type BattleFloater = {
  id: number
  text: string
  target: 'enemy' | 'player'
  tone: BattleFeedbackTone | 'attack'
  kind?: string
}

const FLOATER_TONE_CLASS: Record<BattleFeedbackTone | 'attack', string> = {
  attack: 'attack',
  defense: 'defense',
  speed: 'speed',
  luck: 'luck',
  shake: 'shake',
  slow: 'slow',
  bleed: 'bleed',
  stun: 'stun',
}

type StatusTag = {
  label: string
  turns: number
}

function getFighterStatusTags(
  side: 'player' | 'enemy',
  status: CombatStatusState,
): StatusTag[] {
  if (side === 'enemy') {
    const tags: StatusTag[] = []
    if (status.enemyBleed > 0) tags.push({ label: 'bleed', turns: status.enemyBleed })
    if (status.enemyShake > 0) tags.push({ label: 'shake', turns: status.enemyShake })
    if (status.enemyStun > 0) tags.push({ label: 'stun', turns: status.enemyStun })
    if (status.enemySlow > 0) tags.push({ label: 'slow', turns: status.enemySlow })
    if (status.enemyMiss > 0) tags.push({ label: 'miss', turns: status.enemyMiss })
    return tags
  }

  const tags: StatusTag[] = []
  if (status.playerBrace > 0) tags.push({ label: 'brace', turns: status.playerBrace })
  if (status.playerDouble > 0) tags.push({ label: 'double', turns: status.playerDouble })
  if (status.playerReflect && status.playerReflect.turns > 0) {
    tags.push({ label: 'reflect', turns: status.playerReflect.turns })
  }
  return tags
}

function FighterStatusTags({ tags }: { tags: StatusTag[] }) {
  if (tags.length === 0) return null
  return (
    <div className="battle-screen__status-tags" aria-label="Status effects">
      {tags.map(({ label, turns }) => (
        <span
          key={label}
          className="battle-screen__status-tag"
          title={STATUS_EFFECT_HINTS[label] ?? label}
        >
          {label} {turns}
        </span>
      ))}
    </div>
  )
}

type Props = {
  npcId: string
  onBattleEnd: (result: 'win' | 'lose', turns: number) => void
  /** True once enter wipe has lifted and the battle is visible. */
  battleRevealed?: boolean
}

function StageBackground({ location }: { location: BattleLocationId }) {
  const src = getBattleBackgroundSrc(location)

  useEffect(() => {
    console.log('[BattleScreen] stage background src:', src)
  }, [src])

  const handleLoad = useCallback(() => {
    console.log('[BattleScreen] stage background loaded:', src)
  }, [src])

  const handleError = useCallback(() => {
    console.error('[BattleScreen] Failed to load battle background:', src)
  }, [src])

  return (
    <div className="battle-screen__stage-bg" aria-hidden>
      <div className="battle-screen__stage-bg-fallback" />
      <img
        className="battle-screen__stage-bg-img"
        src={src}
        alt=""
        draggable={false}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

function drawPlayerBattleSprite(
  canvas: HTMLCanvasElement,
  sheet: SpriteSheet,
  tuning: ReturnType<typeof getMidnightVariantRenderTuning>,
): void {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const dw = BATTLE_PLAYER_SOURCE_W
  const dh = BATTLE_PLAYER_SOURCE_H
  canvas.width = dw
  canvas.height = dh
  ctx.clearRect(0, 0, dw, dh)
  drawSheetFrame(ctx, sheet, 'left', getIdleFrameIndex(), 0, tuning.feetOffset, dw, dh, 1, tuning)
}

function drawEnemyBattleSprite(
  canvas: HTMLCanvasElement,
  spriteImg: HTMLImageElement,
  spriteColumns: number,
): void {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const dw = BATTLE_ENEMY_SOURCE_W
  const dh = BATTLE_ENEMY_SOURCE_H
  canvas.width = dw
  canvas.height = dh
  ctx.clearRect(0, 0, dw, dh)

  const cols = spriteColumns
  const frameW = Math.floor(spriteImg.naturalWidth / cols)
  const frameH = Math.floor(spriteImg.naturalHeight)
  const col = 2 // left frame, flipped to face right via CSS
  const nsx = Math.floor(col * frameW)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    spriteImg,
    nsx,
    0,
    frameW,
    frameH,
    0,
    0,
    dw,
    dh,
  )
}

export function BattleScreen({ npcId, onBattleEnd, battleRevealed = true }: Props) {
  const battleScreenRef = useRef<HTMLDivElement>(null)
  const telegraphRowRef = useRef<HTMLElement>(null)
  const movesRef = useRef<HTMLDivElement>(null)
  const playerStatusRef = useRef<HTMLDivElement>(null)
  const playerCanvasRef = useRef<HTMLCanvasElement>(null)
  const enemyWrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const [enemyPlacement, setEnemyPlacement] = useState<BattleSpritePlacement>(DEFAULT_ENEMY_PLACEMENT)
  const [playerPlacement, setPlayerPlacement] = useState<BattleSpritePlacement>(DEFAULT_PLAYER_PLACEMENT)
  const midnightSheetRef = useRef<SpriteSheet | null>(null)
  const endHandledRef = useRef(false)
  const showDebug = useSyncExternalStore(subscribePlayerStore, getShowDebug, getShowDebug)
  const selectedMidnightVariant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )

  const [state, dispatch] = useReducer(
    battleReducer,
    npcId,
    (id) => createInitialBattleState(id),
  )

  useEffect(() => {
    if (!isDevSparNpcId(npcId)) {
      track('battle_start', { enemyId: npcId })
    }
  }, [npcId])

  const shouldRunBattleTutorial =
    npcId === WALKER_NPC_ID && !isBattleTutorialSeen()
  const [battleTutorialBlocking, setBattleTutorialBlocking] = useState(shouldRunBattleTutorial)
  const [battleTutorialOverlayOpen, setBattleTutorialOverlayOpen] = useState(false)
  const [battleTutorialStep, setBattleTutorialStep] = useState(0)

  useEffect(() => {
    if (!battleTutorialBlocking || battleTutorialOverlayOpen) return
    if (!battleRevealed) return
    const t = window.setTimeout(() => setBattleTutorialOverlayOpen(true), 0)
    return () => window.clearTimeout(t)
  }, [battleTutorialBlocking, battleTutorialOverlayOpen, battleRevealed])

  const closeBattleTutorial = useCallback(() => {
    setBattleTutorialBlocking(false)
    setBattleTutorialOverlayOpen(false)
    setBattleTutorialSeen()
  }, [])

  const advanceBattleTutorial = useCallback(() => {
    if (battleTutorialStep >= BATTLE_TUTORIAL_STEPS.length - 1) {
      closeBattleTutorial()
      return
    }
    setBattleTutorialStep((step) => step + 1)
  }, [battleTutorialStep, closeBattleTutorial])

  const prevEnemyHpRef = useRef(state.enemyHp)
  const prevPlayerHpRef = useRef(state.playerHp)
  const prevFeedbackSeqRef = useRef(state.feedbackSeq)
  const winMatchupCalloutRef = useRef(false)
  const [enemyHitFx, setEnemyHitFx] = useState(false)
  const [playerHitFx, setPlayerHitFx] = useState(false)
  const [playerAtkFx, setPlayerAtkFx] = useState(false)
  const [playerDodgeFx, setPlayerDodgeFx] = useState(false)
  const [enemyCritFx, setEnemyCritFx] = useState(false)
  const [floaters, setFloaters] = useState<BattleFloater[]>([])

  const busy = state.phase !== 'player'
  const playerHpPct = Math.max(0, (state.playerHp / state.playerStats.maxHp) * 100)
  const enemyHpPct = Math.max(0, (state.enemyHp / state.enemyMaxHp) * 100)
  const enemyStatusTags = getFighterStatusTags('enemy', state.combatStatus)
  const playerStatusTags = getFighterStatusTags('player', state.combatStatus)
  const playerLevel = getPlayerLevel()
  const build = getBuildName()
  const counterRelation = getPlayerCounterRelation(state.npc.leanSkill)
  const matchupLabel = counterMatchupLabel(counterRelation, state.npc.leanSkill)
  const battleLocation = state.npc.battleLocation ?? DEFAULT_BATTLE_LOCATION
  const showWinNarration = state.phase === 'ended' && state.result === 'win'
  const logLines = state.log.slice(-2)
  const heavyTelegraph =
    state.upcomingMove !== 'STUNNED' &&
    state.phase !== 'ended' &&
    getEnemyMoveDef(state.upcomingMove as EnemyMoveId).damageMult >= 1.6

  const finishBattle = useCallback(
    (result: 'win' | 'lose') => {
      if (endHandledRef.current) return
      endHandledRef.current = true
      const healed = applyBattleEndHealing(result, state.playerStats.maxHp, state.playerHp)
      setOverworldPlayerHp(healed)
      onBattleEnd(result, state.turn)
    },
    [onBattleEnd, state.playerHp, state.playerStats.maxHp, state.turn],
  )

  const equippedMoves = useSyncExternalStore(
    subscribePlayerStore,
    getEquippedMoves,
    getEquippedMoves,
  )

  const battleMoveButtons = equippedMoves.map((move) => getMoveUiMeta(move))

  const handleMove = useCallback(
    (move: PlayerMove, slot: number) => {
      if (battleTutorialBlocking) return
      if (state.phase !== 'player') return
      dispatch({ type: 'PLAYER_MOVE', move, slot })
    },
    [battleTutorialBlocking, state.phase],
  )

  const handleNarrationContinue = useCallback(() => {
    if (!showWinNarration) return
    finishBattle('win')
  }, [finishBattle, showWinNarration])

  useEffect(() => {
    if (state.phase === 'ended' && state.result === 'lose') {
      const timer = window.setTimeout(() => finishBattle('lose'), BATTLE_END_LOSE_DELAY_MS)
      return () => window.clearTimeout(timer)
    }
  }, [state.phase, state.result, finishBattle])

  useEffect(() => {
    winMatchupCalloutRef.current = false
  }, [npcId])

  useEffect(() => {
    if (state.phase !== 'ended' || state.result !== 'win') return
    if (counterRelation !== 'advantage' || winMatchupCalloutRef.current) return
    winMatchupCalloutRef.current = true
    const id = Date.now() + Math.random()
    setFloaters((f) => [
      ...f,
      { id, text: 'type win.', target: 'player', tone: 'attack', kind: 'counter' },
    ])
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1400)
  }, [state.phase, state.result, counterRelation])

  useEffect(() => {
    const enemyDelta = prevEnemyHpRef.current - state.enemyHp
    const playerDelta = prevPlayerHpRef.current - state.playerHp

    if (enemyDelta > 0) {
      setEnemyHitFx(true)
      setPlayerAtkFx(true)
      const id = Date.now() + Math.random()
      setFloaters((f) => [
        ...f,
        { id, text: `-${enemyDelta}`, target: 'enemy', tone: 'attack' },
      ])
      window.setTimeout(() => setEnemyHitFx(false), 320)
      window.setTimeout(() => setPlayerAtkFx(false), 240)
      window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900)
    }
    if (playerDelta > 0) {
      setPlayerHitFx(true)
      const id = Date.now() + Math.random()
      setFloaters((f) => [
        ...f,
        { id, text: `-${playerDelta}`, target: 'player', tone: 'attack' },
      ])
      window.setTimeout(() => setPlayerHitFx(false), 320)
      window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900)
    }

    prevEnemyHpRef.current = state.enemyHp
    prevPlayerHpRef.current = state.playerHp
  }, [state.enemyHp, state.playerHp])

  useEffect(() => {
    if (state.feedbackSeq === prevFeedbackSeqRef.current) return
    prevFeedbackSeqRef.current = state.feedbackSeq

    const events = state.feedbackEvents
    if (events.length === 0) return

    if (events.some((e) => e.kind === 'dodged')) {
      setPlayerDodgeFx(true)
      window.setTimeout(() => setPlayerDodgeFx(false), 420)
    }
    if (events.some((e) => e.kind === 'crit')) {
      setEnemyCritFx(true)
      window.setTimeout(() => setEnemyCritFx(false), 480)
    }

    events.forEach((event, index) => {
      const id = Date.now() + Math.random() + index
      const durationMs = event.kind === 'crit' ? 1200 : 900
      window.setTimeout(() => {
        setFloaters((f) => [
          ...f,
          { id, text: event.text, target: event.target, tone: event.tone, kind: event.kind },
        ])
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), durationMs)
      }, index * 80)
    })
  }, [state.feedbackSeq, state.feedbackEvents])

  useEffect(() => {
    if (state.phase !== 'busy') return

    if (state.resolveStep === 'pause_after_first') {
      const timer = window.setTimeout(() => {
        dispatch({ type: 'RESOLVE_SECOND' })
      }, BATTLE_MOVE_GAP_MS)
      return () => window.clearTimeout(timer)
    }

    if (state.resolveStep === 'pause_after_second') {
      const timer = window.setTimeout(() => {
        dispatch({ type: 'RESOLVE_FINISH' })
      }, BATTLE_ROUND_END_GAP_MS)
      return () => window.clearTimeout(timer)
    }
  }, [state.phase, state.resolveStep])

  useEffect(() => {
    let cancelled = false
    const walkSrc = getMidnightWalkSrc(selectedMidnightVariant)
    const tuning = getMidnightVariantRenderTuning(selectedMidnightVariant)

    void loadSpriteSheetWithFallback(walkSrc).then(async (sheet) => {
      if (cancelled || !sheet?.loaded) return
      midnightSheetRef.current = sheet
      const canvas = playerCanvasRef.current
      if (!canvas) return
      drawPlayerBattleSprite(canvas, sheet, tuning)
      const bounds = measureCanvasVisibleBounds(
        canvas,
        `player:${walkSrc}`,
        'player',
      )
      const placement = layoutSpriteFromVisibleBounds(
        bounds,
        BATTLE_PLAYER_SOURCE_W,
        BATTLE_PLAYER_SOURCE_H,
        BATTLE_GROUND_Y,
        BATTLE_PLAYER_X,
        Math.floor(BATTLE_TARGET_VISIBLE_H * BATTLE_PLAYER_VISIBLE_MULT),
      )
      setPlayerPlacement(placement)
    })

    return () => {
      cancelled = true
      midnightSheetRef.current = null
    }
  }, [selectedMidnightVariant])

  useEffect(() => {
    let cancelled = false
    const canvas = enemyWrapRef.current?.querySelector('canvas')
    if (!canvas) return

    const spriteSrc = state.npc.spriteSrc ?? MARK_SPRITE_SRC
    const spriteColumns = 4
    const frameCol = 2
    const label = state.npc.displayName.toLowerCase()

    void (async () => {
      const img = new Image()
      img.src = spriteSrc
      try {
        await ensureImageDecoded(img)
      } catch {
        return
      }
      if (cancelled) return

      const frameW = Math.max(1, Math.floor(img.naturalWidth / spriteColumns))
      const frameH = Math.max(1, Math.floor(img.naturalHeight))
      const bounds = measureNaturalImageFrame(
        img,
        frameCol,
        spriteColumns,
        spriteSrc,
        label,
      )
      drawEnemyBattleSprite(canvas, img, spriteColumns)
      const placement = layoutSpriteFromVisibleBounds(
        bounds,
        frameW,
        frameH,
        BATTLE_GROUND_Y,
        BATTLE_ENEMY_X,
        BATTLE_TARGET_VISIBLE_H,
      )
      if (!cancelled) setEnemyPlacement(placement)
    })()

    return () => {
      cancelled = true
    }
  }, [state.npc.spriteSrc, state.npc.displayName])

  return (
    <div
      ref={battleScreenRef}
      className="battle-screen"
      aria-label={`Battle vs ${state.npc.displayName}`}
    >
      <div className="battle-screen__content">
        <section className="battle-screen__enemy-hud">
          <span className="battle-screen__enemy-name">{state.npc.displayName}</span>
          <div className="battle-screen__hp-track">
            <div
              className="battle-screen__hp-fill battle-screen__hp-fill--enemy"
              style={{ width: `${enemyHpPct}%` }}
            />
          </div>
          <FighterStatusTags tags={enemyStatusTags} />
        </section>

        <section className="battle-screen__telegraph-row" ref={telegraphRowRef} aria-live="polite">
          <p
            className={`battle-screen__telegraph${heavyTelegraph ? ' battle-screen__telegraph--heavy' : ''}`}
          >
            {getTelegraphText(state)}
          </p>
        </section>

        <div className="battle-screen__playfield">
          <section className="battle-screen__log" aria-live="polite">
            {logLines.map((line, i) => (
              <div key={`${i}-${line}`} className="battle-screen__log-line">
                {line}
              </div>
            ))}
          </section>

          <section className="battle-screen__stage" ref={stageRef} aria-hidden>
            <StageBackground location={battleLocation} />
            <div className="battle-screen__arena">
              <div
                className={`battle-screen__fighter battle-screen__fighter--enemy${enemyHitFx ? ' battle-screen__fighter--hit' : ''}${enemyCritFx ? ' battle-screen__fighter--crit' : ''}`}
                style={{ left: enemyPlacement.x, top: enemyPlacement.drawY }}
              >
                <div ref={enemyWrapRef} className="battle-screen__enemy-sprite-wrap">
                  <canvas
                    className="battle-screen__enemy-sprite-canvas"
                    width={BATTLE_ENEMY_SOURCE_W}
                    height={BATTLE_ENEMY_SOURCE_H}
                    style={{
                      width: enemyPlacement.displayWidth,
                      height: enemyPlacement.displayHeight,
                    }}
                  />
                </div>
              </div>
              <div
                className={`battle-screen__fighter battle-screen__fighter--player${playerHitFx ? ' battle-screen__fighter--hit' : ''}${playerAtkFx ? ' battle-screen__fighter--attack' : ''}${playerDodgeFx ? ' battle-screen__fighter--dodge' : ''}`}
                style={{ left: playerPlacement.x, top: playerPlacement.drawY }}
              >
                <canvas
                  ref={playerCanvasRef}
                  className="battle-screen__player-sprite-canvas"
                  width={BATTLE_PLAYER_SOURCE_W}
                  height={BATTLE_PLAYER_SOURCE_H}
                  style={{
                    width: playerPlacement.displayWidth,
                    height: playerPlacement.displayHeight,
                  }}
                />
              </div>
              {floaters.map((f) => (
                <span
                  key={f.id}
                  className={`battle-screen__floater battle-screen__floater--${f.target} battle-screen__floater--${FLOATER_TONE_CLASS[f.tone]}${f.kind === 'crit' ? ' battle-screen__floater--crit-pop' : ''}`}
                >
                  {f.text}
                </span>
              ))}
            </div>
            {showDebug && (
              <BattlePlacementGrid
                stageRef={stageRef}
                enemyRef={enemyWrapRef}
                playerRef={playerCanvasRef}
                enemyPlacement={enemyPlacement}
                playerPlacement={playerPlacement}
              />
            )}
          </section>

          <div className="battle-screen__bottom-stack">
            <section className="battle-screen__player-hud">
              <div className="battle-screen__player-build-row">
                <div
                  className="battle-screen__player-build"
                  style={{ color: build.color }}
                >
                  {build.name}
                </div>
                {matchupLabel ? (
                  <span
                    className={`battle-screen__matchup${
                      counterRelation === 'disadvantage'
                        ? ' battle-screen__matchup--outmatched'
                        : ''
                    }`}
                    style={{ color: build.color }}
                  >
                    {matchupLabel}
                  </span>
                ) : null}
              </div>
              <div className="battle-screen__player-label">
                <span>YOU</span>
                <span
                  className={`player-level-badge battle-screen__player-level${state.playerLevelFlash ? ' player-level-badge--flash' : ''}`}
                >
                  LVL {playerLevel}
                </span>
              </div>
              <div className="battle-screen__hp-track">
                <div
                  className="battle-screen__hp-fill battle-screen__hp-fill--player"
                  style={{ width: `${playerHpPct}%` }}
                />
              </div>
              <div className="battle-screen__hp-numbers">
                {state.playerHp} / {state.playerStats.maxHp}
              </div>
              <div ref={playerStatusRef} className="battle-screen__player-status-anchor">
                <FighterStatusTags tags={playerStatusTags} />
              </div>
              {battleTutorialBlocking && (
                <p className="battle-screen__status-legend">{STATUS_EFFECT_LEGEND}</p>
              )}
            </section>

            <section className="battle-screen__action">
              {showWinNarration ? (
                <button
                  type="button"
                  className="battle-screen__narration battle-screen__narration--payoff"
                  onClick={handleNarrationContinue}
                >
                  <span className="battle-screen__narration-label">{state.npc.displayName}</span>
                  <p className="battle-screen__narration-text">{state.npc.losingLine}</p>
                  <span className="battle-screen__narration-continue">tap to continue ▸</span>
                </button>
              ) : (
                <div
                  ref={movesRef}
                  className="battle-screen__moves"
                  role="group"
                  aria-label="Battle moves"
                >
                  {battleMoveButtons.map(({ move, label, description, className }, slot) => {
                    const stolen = state.battleMove.snagStolen[slot]
                    const displayLabel = stolen
                      ? stolen.replace('_', ' ')
                      : label
                    return (
                      <button
                        key={`${slot}-${move}-${stolen ?? ''}`}
                        type="button"
                        className={`battle-screen__move ${className}${busy || battleTutorialBlocking ? ' battle-screen__move--busy' : ''}`}
                        disabled={busy || battleTutorialBlocking}
                        onClick={() => handleMove(move, slot)}
                      >
                        <span className="battle-screen__move-name">{displayLabel}</span>
                        <span className="battle-screen__move-desc">{description}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      {battleTutorialOverlayOpen && (
        <BattleTutorialOverlay
          stepIndex={battleTutorialStep}
          targetRefs={{
            battle: battleScreenRef,
            telegraph: telegraphRowRef,
            moves: movesRef,
            status: playerStatusRef,
          }}
          onNext={advanceBattleTutorial}
          onSkip={closeBattleTutorial}
        />
      )}
    </div>
  )
}
