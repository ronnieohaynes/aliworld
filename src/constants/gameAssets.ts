import { publicAsset } from '../utils/publicAsset'

/**
 * On disk: `public/Assets/Characters/`, use `publicAsset()` so paths respect Vite `base`.
 */
const CHAR_DIR = publicAsset('Assets/Characters')

export const GAME_CANVAS_WIDTH = 390
export const GAME_CANVAS_HEIGHT = 844

/** Fixed design size of the full GameShell frame (chrome + bezel + controls). */
export const GAME_SHELL_WIDTH = 390
export const GAME_SHELL_HEIGHT = 844

/** GameShell play viewport width at design scale (shell width minus bezel padding). */
export const GAME_VIEWPORT_WIDTH = 358
/** GameShell play viewport height at design scale (flex-filled bezel row). */
export const GAME_VIEWPORT_HEIGHT = 616

/** Default MDNGHT walk sheet (variants/midnight-default.png). */
export const MIDNIGHT_DEFAULT_WALK_SRC = `${CHAR_DIR}/variants/midnight-default.png`
export const MIDNIGHT_FULL_SRC = `${CHAR_DIR}/variants/midnight-default.png`

/** Midnight walk sheet: 1024×1024 px, 4×4 grid (down, up, left, right). */
export const MIDNIGHT_WALK_SHEET_WIDTH = 1024
export const MIDNIGHT_WALK_SHEET_HEIGHT = 1024
export const MIDNIGHT_WALK_COLUMNS = 4
export const MIDNIGHT_WALK_ROWS = 4
export const MIDNIGHT_WALK_FRAME_WIDTH = 256
export const MIDNIGHT_WALK_FRAME_HEIGHT = 256
export const MIDNIGHT_WALK_FRAMES_PER_DIRECTION = 4

/** Neutral standing pose (second column), held while idle. */
export const MIDNIGHT_WALK_IDLE_FRAME = 1

/** On-canvas scale relative to the original 96px-tall overworld size. */
export const MIDNIGHT_WALK_DISPLAY_SCALE = 0.6

const MIDNIGHT_WALK_BASE_DISPLAY_HEIGHT = 96
const MIDNIGHT_WALK_BASE_DRAW_OFFSET_Y = 10

/** Drawn size on canvas (scaled down from 256×256 source frames). */
export const MIDNIGHT_WALK_DISPLAY_HEIGHT = Math.round(
  MIDNIGHT_WALK_BASE_DISPLAY_HEIGHT * MIDNIGHT_WALK_DISPLAY_SCALE,
)
export const MIDNIGHT_WALK_DISPLAY_WIDTH = Math.round(
  (MIDNIGHT_WALK_FRAME_WIDTH / MIDNIGHT_WALK_FRAME_HEIGHT) * MIDNIGHT_WALK_DISPLAY_HEIGHT,
)

/** Shift sprite down on canvas so hair is not clipped at the top edge. */
export const MIDNIGHT_WALK_DRAW_OFFSET_Y = Math.round(
  MIDNIGHT_WALK_BASE_DRAW_OFFSET_Y * MIDNIGHT_WALK_DISPLAY_SCALE,
)

export const DANNY_ALI_WALK_SRC = `${CHAR_DIR}/danny-ali/danny-ali-walk.png`
export const DANNY_ALI_FULL_SRC = `${CHAR_DIR}/danny-ali/danny-ali-full.png`
