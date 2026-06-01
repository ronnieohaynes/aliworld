import { publicAsset } from '../utils/publicAsset'
import { getCollisionZones, type CollisionZone } from './collisionZones'
import type { TriggerZone } from './triggerZones'
import { TRIGGER_ZONES, DARKLINE_SPAWN_X, DARKLINE_SPAWN_Y } from './triggerZones'
import { FIVE_OVERWORLD_NPCS, type NpcData } from './npcs'

/** Player-facing name for the starting district (internal id is `five`). */
export const FIVE_DISPLAY_NAME = 'the 5ive'

export type CityId = 'five' | 'san-bruno'

export type CityConfig = {
  id: CityId
  label: string
  mapSrc: string
  worldWidth: number
  worldHeight: number
  spawnX: number
  spawnY: number
  darklineSpawnX: number
  darklineSpawnY: number
  /** Key for `getCollisionZones` (e.g. `five`). */
  collisionMapId?: string
  collisionZones: CollisionZone[]
  triggerZones: TriggerZone[]
  npcs: NpcData[]
}

const SAN_BRUNO_MAP_SRC = publicAsset('Assets/tileset/san-bruno-map.PNG')

const SAN_BRUNO_COLLISION_ZONES: CollisionZone[] = [
  // ── Top buildings flanking Darkline entrance (gap x:430–700) ──
  { x: 0, y: 0, width: 430, height: 120 },
  { x: 700, y: 0, width: 554, height: 120 },

  // ── Left buildings (storefronts + residential, full height) ───
  { x: 0, y: 120, width: 285, height: 1134 },

  // ── Right buildings — above One Love Cafe ─────────────────────
  { x: 840, y: 120, width: 414, height: 380 },
  // ── Right buildings — below One Love Cafe ─────────────────────
  { x: 840, y: 660, width: 414, height: 594 },

  // ── Parked cars — left parking lane ───────────────────────────
  { x: 395, y: 135, width: 70, height: 150 },
  { x: 395, y: 370, width: 70, height: 175 },
  { x: 395, y: 645, width: 70, height: 175 },
  { x: 395, y: 895, width: 70, height: 160 },

  // ── World boundaries ──────────────────────────────────────────
  { x: -50, y: 0, width: 50, height: 1254 },
  { x: 1254, y: 0, width: 50, height: 1254 },
  { x: 0, y: -50, width: 1254, height: 50 },
  { x: 0, y: 1254, width: 1254, height: 50 },
]

const SAN_BRUNO_TRIGGER_ZONES: TriggerZone[] = [
  {
    id: 'san-bruno-darkline-entrance',
    x: 500,
    y: 60,
    width: 130,
    height: 60,
    action: 'OPEN_DARKLINE',
  },
  {
    id: 'one-love-cafe-entrance',
    x: 825,
    y: 540,
    width: 35,
    height: 80,
    action: 'OPEN_ONE_LOVE_CAFE',
  },
]

export const CITY_CONFIGS: Record<CityId, CityConfig> = {
  five: {
    id: 'five',
    label: FIVE_DISPLAY_NAME,
    mapSrc: publicAsset('Assets/tileset/5ive-map.PNG'),
    worldWidth: 1254,
    worldHeight: 1254,
    spawnX: 600,
    spawnY: 500,
    darklineSpawnX: DARKLINE_SPAWN_X,
    darklineSpawnY: DARKLINE_SPAWN_Y,
    collisionMapId: 'five',
    collisionZones: getCollisionZones('five'),
    triggerZones: TRIGGER_ZONES,
    npcs: [...FIVE_OVERWORLD_NPCS],
  },
  'san-bruno': {
    id: 'san-bruno',
    label: 'SAN BRUNO',
    mapSrc: SAN_BRUNO_MAP_SRC,
    worldWidth: 1254,
    worldHeight: 1254,
    spawnX: 570,
    spawnY: 300,
    darklineSpawnX: 570,
    darklineSpawnY: 300,
    collisionZones: SAN_BRUNO_COLLISION_ZONES,
    triggerZones: SAN_BRUNO_TRIGGER_ZONES,
    npcs: [],
  },
}

export const DARKLINE_DESTINATIONS: CityId[] = [
  'five',
  'san-bruno',
]

export const INACTIVE_DESTINATIONS: { label: string; status: string }[] = [
  { label: 'SOUTH CITY', status: 'COMING SOON' },
  { label: 'OAKLAND', status: 'COMING SOON' },
]
