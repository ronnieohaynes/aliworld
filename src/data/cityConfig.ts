import { publicAsset } from '../utils/publicAsset'
import { getCollisionZones, type CollisionZone } from './collisionZones'
import {
  BLUE_STORE_COLLISION_ZONES,
  BLUE_STORE_DARKLINE_ARRIVAL,
  BLUE_STORE_DARKLINE_ZONE,
  BLUE_STORE_ENTRANCE_ZONE,
  BLUE_STORE_MAP_SIZE,
} from './blueStoreCollision'
import {
  BLUE_STORE_EXIT_ZONE,
  BLUE_STORE_INTERIOR_COLLISION_ZONES,
  BLUE_STORE_INTERIOR_ENTRY,
  BLUE_STORE_INTERIOR_MAP_DRAW_SCALE,
  BLUE_STORE_INTERIOR_MAP_SIZE,
  scaleBlueStoreInteriorZone,
} from './blueStoreInteriorCollision'
import {
  HILLCREST_COLLISION_ZONES,
  HILLCREST_MAP_SIZE,
} from './hillcrestCollision'
import type { TriggerZone } from './triggerZones'
import { TRIGGER_ZONES, DARKLINE_SPAWN_X, DARKLINE_SPAWN_Y } from './triggerZones'
import { FIVE_OVERWORLD_NPCS, SOUTHSIDE_OVERWORLD_NPCS, type NpcData } from './npcs'

/** Player-facing name for the starting district (internal id is `five`). */
export const FIVE_DISPLAY_NAME = 'the 5ive'

export type CityId =
  | 'five'
  | 'san-bruno'
  | 'southside'
  | 'blue-store'
  | 'blue-store-interior'

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
  /** Interior-only: shrink native map bitmap (gameplay coords use scaled world size). */
  mapDrawScale?: number
  /** Overworld Midnight visual scale (default 1; hitbox unchanged). */
  characterScale?: number
  /** Optional full-map PNG drawn above Midnight (transparent outside foreground art). */
  foregroundMapSrc?: string
}

const HILLCREST_MAP_SRC = publicAsset('Assets/tileset/hillcrest-map.png')
const BLUE_STORE_MAP_SRC = publicAsset('Assets/tileset/blue-store-map.png')
const BLUE_STORE_FOREGROUND_MAP_SRC = publicAsset('Assets/tileset/blue-store-map-fg.png')
const BLUE_STORE_INTERIOR_MAP_SRC = publicAsset('Assets/tileset/blue-store-interior-map.png')

/** Spawn on Blue Store exterior when exiting the interior (just outside the door). */
export const BLUE_STORE_EXTERIOR_RETURN = {
  x: Math.floor(BLUE_STORE_ENTRANCE_ZONE.x + BLUE_STORE_ENTRANCE_ZONE.width / 2),
  y: Math.floor(BLUE_STORE_ENTRANCE_ZONE.y + BLUE_STORE_ENTRANCE_ZONE.height + 12),
}
/** Placeholder until hillside-market art — walkable reuse of the 5ive tileset. */
const SOUTHSIDE_PLACEHOLDER_MAP_SRC = publicAsset('Assets/tileset/5ive-map.PNG')

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

const SOUTHSIDE_COLLISION_ZONES: CollisionZone[] = [
  { x: 0, y: 0, width: 1254, height: 180 },
  { x: 0, y: 180, width: 320, height: 1074 },
  { x: 900, y: 180, width: 354, height: 1074 },
  { x: -50, y: 0, width: 50, height: 1254 },
  { x: 1254, y: 0, width: 50, height: 1254 },
  { x: 0, y: -50, width: 1254, height: 50 },
  { x: 0, y: 1254, width: 1254, height: 50 },
]

const SOUTHSIDE_TRIGGER_ZONES: TriggerZone[] = [
  {
    id: 'southside-darkline-entrance',
    x: 500,
    y: 60,
    width: 130,
    height: 60,
    action: 'OPEN_DARKLINE',
  },
  {
    id: 'blue-store-entrance',
    x: 680,
    y: 420,
    width: 120,
    height: 80,
    action: 'OPEN_BLUE_STORE',
  },
]

const BLUE_STORE_TRIGGER_ZONES: TriggerZone[] = [
  {
    id: 'blue-store-darkline-entrance',
    x: BLUE_STORE_DARKLINE_ZONE.x,
    y: BLUE_STORE_DARKLINE_ZONE.y,
    width: BLUE_STORE_DARKLINE_ZONE.width,
    height: BLUE_STORE_DARKLINE_ZONE.height,
    action: 'OPEN_DARKLINE',
  },
  {
    id: 'blue-store-entrance',
    x: BLUE_STORE_ENTRANCE_ZONE.x,
    y: BLUE_STORE_ENTRANCE_ZONE.y,
    width: BLUE_STORE_ENTRANCE_ZONE.width,
    height: BLUE_STORE_ENTRANCE_ZONE.height,
    action: 'OPEN_BLUE_STORE',
  },
]

const BLUE_STORE_INTERIOR_TRIGGER_ZONES: TriggerZone[] = [
  {
    id: 'blue-store-interior-exit',
    ...BLUE_STORE_EXIT_ZONE,
    action: 'OPEN_BLUE_STORE_EXIT',
  },
]

const BLUE_STORE_INTERIOR_WORLD_WIDTH = Math.floor(
  BLUE_STORE_INTERIOR_MAP_SIZE.width * BLUE_STORE_INTERIOR_MAP_DRAW_SCALE,
)
const BLUE_STORE_INTERIOR_WORLD_HEIGHT = Math.floor(
  BLUE_STORE_INTERIOR_MAP_SIZE.height * BLUE_STORE_INTERIOR_MAP_DRAW_SCALE,
)

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
    label: 'hillcrest',
    mapSrc: HILLCREST_MAP_SRC,
    worldWidth: HILLCREST_MAP_SIZE.width,
    worldHeight: HILLCREST_MAP_SIZE.height,
    spawnX: 570,
    spawnY: 300,
    darklineSpawnX: 570,
    darklineSpawnY: 300,
    collisionZones: HILLCREST_COLLISION_ZONES,
    triggerZones: SAN_BRUNO_TRIGGER_ZONES,
    npcs: [],
  },
  southside: {
    id: 'southside',
    label: 'southside',
    mapSrc: SOUTHSIDE_PLACEHOLDER_MAP_SRC,
    worldWidth: 1254,
    worldHeight: 1254,
    spawnX: 570,
    spawnY: 280,
    darklineSpawnX: 565,
    darklineSpawnY: 140,
    collisionZones: SOUTHSIDE_COLLISION_ZONES,
    triggerZones: SOUTHSIDE_TRIGGER_ZONES,
    npcs: [...SOUTHSIDE_OVERWORLD_NPCS],
  },
  'blue-store': {
    id: 'blue-store',
    label: 'blue store',
    mapSrc: BLUE_STORE_MAP_SRC,
    foregroundMapSrc: BLUE_STORE_FOREGROUND_MAP_SRC,
    characterScale: 1.25,
    worldWidth: BLUE_STORE_MAP_SIZE.width,
    worldHeight: BLUE_STORE_MAP_SIZE.height,
    spawnX: BLUE_STORE_DARKLINE_ARRIVAL.x,
    spawnY: BLUE_STORE_DARKLINE_ARRIVAL.y,
    darklineSpawnX: BLUE_STORE_DARKLINE_ARRIVAL.x,
    darklineSpawnY: BLUE_STORE_DARKLINE_ARRIVAL.y,
    collisionZones: BLUE_STORE_COLLISION_ZONES,
    triggerZones: BLUE_STORE_TRIGGER_ZONES,
    npcs: [...SOUTHSIDE_OVERWORLD_NPCS],
  },
  'blue-store-interior': {
    id: 'blue-store-interior',
    label: 'blue store',
    mapSrc: BLUE_STORE_INTERIOR_MAP_SRC,
    characterScale: 1.25,
    mapDrawScale: BLUE_STORE_INTERIOR_MAP_DRAW_SCALE,
    worldWidth: BLUE_STORE_INTERIOR_WORLD_WIDTH,
    worldHeight: BLUE_STORE_INTERIOR_WORLD_HEIGHT,
    spawnX: BLUE_STORE_INTERIOR_ENTRY.x,
    spawnY: BLUE_STORE_INTERIOR_ENTRY.y,
    darklineSpawnX: BLUE_STORE_INTERIOR_ENTRY.x,
    darklineSpawnY: BLUE_STORE_INTERIOR_ENTRY.y,
    collisionZones: BLUE_STORE_INTERIOR_COLLISION_ZONES.map(scaleBlueStoreInteriorZone),
    triggerZones: BLUE_STORE_INTERIOR_TRIGGER_ZONES,
    npcs: [],
  },
}

export const DARKLINE_DESTINATIONS: CityId[] = [
  'five',
  'san-bruno',
]

/** Unlocked after E1 cafe beat — appended to darkline destinations at runtime. */
export const POST_E1_DARKLINE_DESTINATION: CityId = 'southside'

/** Unlocked when Quest 2 is active — Hillside Market / Blue Store exterior. */
export const POST_E2_DARKLINE_DESTINATION: CityId = 'blue-store'

export const INACTIVE_DESTINATIONS: { label: string; status: string }[] = [
  { label: 'the town', status: 'COMING SOON' },
]
