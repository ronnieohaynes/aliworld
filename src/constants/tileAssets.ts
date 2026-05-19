/**
 * Tile PNGs live under `public/Assets/tileset/` (match casing for Vite).
 * Filenames on disk use underscores; indices match the design spec (0–9).
 */
export const TILESET_DIR = '/Assets/tileset'

export const TILE_SIZE = 48

export const DALY_CITY_MAP_COLS = 50
export const DALY_CITY_MAP_ROWS = 50

export const WORLD_WIDTH = DALY_CITY_MAP_COLS * TILE_SIZE
export const WORLD_HEIGHT = DALY_CITY_MAP_ROWS * TILE_SIZE

/** Fills canvas before tiles; shows through chroma-keyed tile edges. */
export const WORLD_CANVAS_FILL = '#888888'

export const TILE_SRC = [
  `${TILESET_DIR}/tile_0_sidewalk.png`,
  `${TILESET_DIR}/tile_1_road.png`,
  `${TILESET_DIR}/tile_2_grass_strip.png`,
  `${TILESET_DIR}/tile_3_crosswalk.png`,
  `${TILESET_DIR}/tile_4_storefront_wall.png`,
  `${TILESET_DIR}/tile_5_chainlink_fence.png`,
  `${TILESET_DIR}/tile_6_building_sidewall.png`,
  `${TILESET_DIR}/tile_7_fire_hydrant.png`,
  `${TILESET_DIR}/tile_8_streetlight_pole.png`,
  `${TILESET_DIR}/tile_9_parked_car.png`,
] as const

/** Tile type indices */
export const TileId = {
  SIDEWALK: 0,
  ROAD: 1,
  GRASS: 2,
  CROSSWALK: 3,
  STOREFRONT: 4,
  FENCE: 5,
  SIDEWALL: 6,
  HYDRANT: 7,
  STREETLIGHT: 8,
  CAR: 9,
} as const

export type TileId = (typeof TileId)[keyof typeof TileId]

/** Default spawn: center of north sidewalk strip (row 2). */
export const PLAYER_START_X = Math.floor((DALY_CITY_MAP_COLS / 2) * TILE_SIZE)
export const PLAYER_START_Y = Math.floor(2 * TILE_SIZE) + TILE_SIZE / 2
