/**
 * Vite serves `public/` at site root. On disk: `public/Assets/tileset/`.
 * Use `/Assets/...` URLs (lowercase `/assets/...` returns the SPA shell).
 */
export const DALY_CITY_MAP_SRC = '/Assets/tileset/daly-city-map.png'

export const WORLD_WIDTH = 1254
export const WORLD_HEIGHT = 1254

/** Fallback while the map image loads. */
export const WORLD_CANVAS_FILL = '#888888'

/** Default spawn: map center. */
export const PLAYER_START_X = WORLD_WIDTH / 2
export const PLAYER_START_Y = WORLD_HEIGHT / 2
