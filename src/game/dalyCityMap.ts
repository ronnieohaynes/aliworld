/** @deprecated Import from `./TileMap` instead. Kept for existing imports. */
export {
  type TileMap as DalyCityMap,
  canMoveTo,
  createTileMapFromData as buildDalyCityMap,
  getTile as getGroundTile,
  getTileMap as getDalyCityMap,
} from './TileMap'

export function getPropTile(): null {
  return null
}
