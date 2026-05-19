/**
 * Vite serves `public/` at site root. Folder on disk is `Assets/Characters/` (capital A & C)
 * so URLs must match — lowercase `/assets/...` 404s on Linux and some macOS setups.
 */
const CHAR_DIR = '/Assets/Characters'

export const DANNY_ALI_REFERENCE_SRC = encodeURI(`${CHAR_DIR}/danny-ali-reference.png`)

/**
 * Full-body sprite 1107×1421 — same pose / proportions / anti-aliased pixel treatment as
 * `danny-ali-reference.png`, recolored via `scripts/build-mdnght-from-reference.mjs`.
 */
export const MDNGHT_SPRITE_SRC = encodeURI(`${CHAR_DIR}/mdnght.png`)

/** Same canvas & proportions as reference — neutral outfit, fixed red jacket, customization-ready face. */
export const PLAYER_BASE_SPRITE_SRC = encodeURI(`${CHAR_DIR}/player-base.png`)
