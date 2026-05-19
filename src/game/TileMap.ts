import { DALY_CITY_MAP } from '../data/mapData'
import { TILE_SIZE, TileId } from '../constants/tileAssets'

export type TileMap = {
  cols: number
  rows: number
  cells: Uint8Array
}

function idx(col: number, row: number, cols: number): number {
  return row * cols + col
}

function isWalkableTile(tile: number): boolean {
  return (
    tile === TileId.SIDEWALK ||
    tile === TileId.CROSSWALK ||
    tile === TileId.STREETLIGHT
  )
}

function blocksTile(tile: number): boolean {
  return tile === TileId.CAR || tile === TileId.HYDRANT
}

export function createTileMapFromData(data: number[][]): TileMap {
  const rows = data.length
  const cols = data[0]?.length ?? 0
  const cells = new Uint8Array(cols * rows)

  for (let row = 0; row < rows; row++) {
    const line = data[row]
    if (!line || line.length !== cols) {
      throw new Error(
        `DALY_CITY_MAP row ${row} must have ${cols} columns (got ${line?.length ?? 0})`,
      )
    }
    for (let col = 0; col < cols; col++) {
      cells[idx(col, row, cols)] = line[col]!
    }
  }

  return { cols, rows, cells }
}

export function getTile(map: TileMap, col: number, row: number): number {
  if (col < 0 || row < 0 || col >= map.cols || row >= map.rows) {
    return TileId.SIDEWALK
  }
  return map.cells[idx(col, row, map.cols)]!
}

export function blocksMovement(map: TileMap, worldX: number, worldY: number): boolean {
  const tile = getTile(map, Math.floor(worldX / TILE_SIZE), Math.floor(worldY / TILE_SIZE))
  if (!isWalkableTile(tile)) return true
  return blocksTile(tile)
}

export function canMoveTo(map: TileMap, worldX: number, worldY: number): boolean {
  return !blocksMovement(map, worldX, worldY)
}

let cachedMap: TileMap | null = null

export function getTileMap(): TileMap {
  if (!cachedMap) {
    cachedMap = createTileMapFromData(DALY_CITY_MAP)
  }
  return cachedMap
}
