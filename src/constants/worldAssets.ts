import { publicAsset } from '../utils/publicAsset'

/**
 * Vite serves `public/` under `base` (e.g. `/aliworld/Assets/...` in dev and on GitHub Pages).
 */
export const DALY_CITY_MAP_SRC = publicAsset('Assets/tileset/daly-city-map.png')

export const WORLD_WIDTH = 1254
export const WORLD_HEIGHT = 1254

/** Fallback while the map image loads. */
export const WORLD_CANVAS_FILL = '#888888'

/** Default spawn: south sidewalk, below the street. */
export const PLAYER_START_X = 600
export const PLAYER_START_Y = 500
