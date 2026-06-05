import { publicAsset } from '../utils/publicAsset'
import { getCollisionZones, type CollisionZone } from './collisionZones'
import { getOcclusionZones, type OcclusionZone } from './occlusionZones'
import {
  SOUTHSIDE_COLLISION_ZONES,
  SOUTHSIDE_DARKLINE_ARRIVAL,
  SOUTHSIDE_DARKLINE_ZONE,
  SOUTHSIDE_ENTRANCE_ZONE,
  SOUTHSIDE_MAP_SIZE,
} from './southsideCollision'
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
import { OCEANVIEW_GYM_ENTRANCE_ZONE } from './gymEntrance'
import { FIVE_OVERWORLD_NPCS, SOUTHSIDE_OVERWORLD_NPCS, type NpcData } from './npcs'

/** Player-facing name for the starting district (internal id is `five`). */
export const FIVE_DISPLAY_NAME = 'the 5ive'

export type CityId =
  | 'five'
  | 'san-bruno'
  | 'southside'
  | 'blue-store-interior'
  | 'five-gym-interior'

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
  occlusionZones: OcclusionZone[]
}

const HILLCREST_MAP_SRC = publicAsset('Assets/tileset/hillcrest-map.png')
const SOUTHSIDE_MAP_SRC = publicAsset('Assets/tileset/southside-map.png')
const SOUTHSIDE_FOREGROUND_MAP_SRC = publicAsset('Assets/tileset/southside-map-fg.png')
const BLUE_STORE_INTERIOR_MAP_SRC = publicAsset('Assets/tileset/blue-store-interior-map.png')

/** Spawn on Southside when exiting the store interior (just outside the door). */
export const SOUTHSIDE_EXTERIOR_RETURN = {
  x: Math.floor(SOUTHSIDE_ENTRANCE_ZONE.x + SOUTHSIDE_ENTRANCE_ZONE.width / 2),
  y: Math.floor(SOUTHSIDE_ENTRANCE_ZONE.y + SOUTHSIDE_ENTRANCE_ZONE.height + 12),
}

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
    x: 730,
    y: 740,
    width: 35,
    height: 80,
    action: 'OPEN_ONE_LOVE_CAFE',
  },
]

const SOUTHSIDE_TRIGGER_ZONES: TriggerZone[] = [
  {
    id: 'southside-darkline-entrance',
    x: SOUTHSIDE_DARKLINE_ZONE.x,
    y: SOUTHSIDE_DARKLINE_ZONE.y,
    width: SOUTHSIDE_DARKLINE_ZONE.width,
    height: SOUTHSIDE_DARKLINE_ZONE.height,
    action: 'OPEN_DARKLINE',
  },
  {
    id: 'southside-store-entrance',
    x: SOUTHSIDE_ENTRANCE_ZONE.x,
    y: SOUTHSIDE_ENTRANCE_ZONE.y,
    width: SOUTHSIDE_ENTRANCE_ZONE.width,
    height: SOUTHSIDE_ENTRANCE_ZONE.height,
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

const FIVE_GYM_INTERIOR_MAP_SRC = publicAsset('Assets/tileset/5ive-gym.png')

const FIVE_GYM_INTERIOR_WORLD_WIDTH = 673
const FIVE_GYM_INTERIOR_WORLD_HEIGHT = 673
const FIVE_GYM_INTERIOR_ENTRY = { x: 337, y: 594 }

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
    occlusionZones: getOcclusionZones('five'),
    triggerZones: [...TRIGGER_ZONES, OCEANVIEW_GYM_ENTRANCE_ZONE],
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
    occlusionZones: getOcclusionZones('san-bruno'),
    triggerZones: SAN_BRUNO_TRIGGER_ZONES,
    npcs: [],
  },
  southside: {
    id: 'southside',
    label: 'southside',
    mapSrc: SOUTHSIDE_MAP_SRC,
    foregroundMapSrc: SOUTHSIDE_FOREGROUND_MAP_SRC,
    characterScale: 1.25,
    worldWidth: SOUTHSIDE_MAP_SIZE.width,
    worldHeight: SOUTHSIDE_MAP_SIZE.height,
    spawnX: SOUTHSIDE_DARKLINE_ARRIVAL.x,
    spawnY: SOUTHSIDE_DARKLINE_ARRIVAL.y,
    darklineSpawnX: SOUTHSIDE_DARKLINE_ARRIVAL.x,
    darklineSpawnY: SOUTHSIDE_DARKLINE_ARRIVAL.y,
    collisionZones: SOUTHSIDE_COLLISION_ZONES,
    occlusionZones: getOcclusionZones('southside'),
    triggerZones: SOUTHSIDE_TRIGGER_ZONES,
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
    occlusionZones: getOcclusionZones('blue-store-interior'),
    triggerZones: BLUE_STORE_INTERIOR_TRIGGER_ZONES,
    npcs: [],
  },
  'five-gym-interior': {
    id: 'five-gym-interior',
    label: 'oceanview gym',
    mapSrc: FIVE_GYM_INTERIOR_MAP_SRC,
    mapDrawScale: 0.55,
    worldWidth: FIVE_GYM_INTERIOR_WORLD_WIDTH,
    worldHeight: FIVE_GYM_INTERIOR_WORLD_HEIGHT,
    spawnX: FIVE_GYM_INTERIOR_ENTRY.x,
    spawnY: FIVE_GYM_INTERIOR_ENTRY.y,
    darklineSpawnX: FIVE_GYM_INTERIOR_ENTRY.x,
    darklineSpawnY: FIVE_GYM_INTERIOR_ENTRY.y,
    collisionZones: [],
    occlusionZones: getOcclusionZones('five-gym-interior'),
    triggerZones: [],
    npcs: [],
  },
}

export const DARKLINE_DESTINATIONS: CityId[] = [
  'five',
  'san-bruno',
]

/** Unlocked after E1 cafe beat — appended to darkline destinations at runtime. */
export const POST_E1_DARKLINE_DESTINATION: CityId = 'southside'

/** Unlocked when Quest 2 is active — Southside / Hillside Market. */
export const POST_E2_DARKLINE_DESTINATION: CityId = 'southside'

export const INACTIVE_DESTINATIONS: { label: string; status: string }[] = [
  { label: 'the town', status: 'COMING SOON' },
]
