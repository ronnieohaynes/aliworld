export type CollisionZone = {
  x: number
  y: number
  width: number
  height: number
}

export const COLLISION_ZONES: CollisionZone[] = [
  // Top storefronts left of bakery door
  { x: 0, y: 0, width: 490, height: 320 },
  // Top storefronts right of bakery door
  { x: 650, y: 0, width: 604, height: 320 },
  // 13 Gallons door interior wall
  { x: 490, y: 260, width: 160, height: 60 },
  // Car 1 left dark
  { x: 100, y: 420, width: 150, height: 80 },
  // Car 2 tan
  { x: 300, y: 420, width: 150, height: 80 },
  // Car 3 dark blue
  { x: 700, y: 420, width: 150, height: 80 },
  // Car 4 green
  { x: 1000, y: 420, width: 150, height: 80 },
  // Bottom left building
  { x: 0, y: 720, width: 560, height: 534 },
  // Bottom right building
  { x: 660, y: 720, width: 594, height: 534 },
  // Bottom alley wall
  { x: 560, y: 1050, width: 100, height: 50 },
  // World boundaries
  { x: -50, y: 0, width: 50, height: 1254 },
  { x: 1254, y: 0, width: 50, height: 1254 },
  { x: 0, y: -50, width: 1254, height: 50 },
  { x: 0, y: 1254, width: 1254, height: 50 },
]
