export type CollisionZone = {
  x: number
  y: number
  width: number
  height: number
}

export const COLLISION_ZONES: CollisionZone[] = [
  // ── North storefronts (buildings + grass strip) ────────────────
  // Left of 13 Gallons door (LA PLAYITA → Coin Laundry)
  { x: 0, y: 0, width: 490, height: 320 },
  // Right of 13 Gallons door (TUCKED IN THE CUT → LUCKY DONUTS)
  { x: 650, y: 0, width: 604, height: 320 },
  // 13 Gallons door interior wall
  { x: 490, y: 260, width: 160, height: 60 },

  // ── Street vehicles ────────────────────────────────────────────
  { x: 100, y: 420, width: 150, height: 80 },
  { x: 300, y: 420, width: 150, height: 80 },
  { x: 700, y: 420, width: 150, height: 80 },
  { x: 1000, y: 420, width: 150, height: 80 },

  // ── South commercial buildings (flat-roofed, building only) ───
  // Left block (west of Darkline gap)
  { x: 0, y: 700, width: 535, height: 100 },
  // Right block (east of Darkline gap)
  { x: 670, y: 700, width: 584, height: 100 },
  // Darkline stairwell side walls (building edges flanking the gap)
  { x: 560, y: 700, width: 20, height: 100 },
  { x: 650, y: 700, width: 20, height: 100 },

  // ── South street red car ───────────────────────────────────────
  { x: 420, y: 790, width: 140, height: 60 },

  // ── Residential block (south end — houses + yards) ─────────────
  { x: 0, y: 870, width: 1254, height: 384 },

  // ── World boundaries ───────────────────────────────────────────
  { x: -50, y: 0, width: 50, height: 1254 },
  { x: 1254, y: 0, width: 50, height: 1254 },
  { x: 0, y: -50, width: 1254, height: 50 },
  { x: 0, y: 1254, width: 1254, height: 50 },
]
