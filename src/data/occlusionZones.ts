// Occlusion zones for ALIWORLD maps.
// Each zone is { x, y, width, height } in world coordinates (pixels).
// Generated from cyan (#00FFFF) painted overlay on the map image.
// Any portion of the player sprite that overlaps a zone is erased —
// coverage is proportional to overlap, not a fixed amount.

export interface OcclusionZone {
  x: number
  y: number
  width: number
  height: number
}

export const OCCLUSION_ZONES: Record<string, OcclusionZone[]> = {
  five: [
    // upper sidewalk — light posts / parking meters
    { x: 43,   y: 311, width: 20,  height: 48 },
    { x: 251,  y: 306, width: 16,  height: 50 },
    { x: 484,  y: 307, width: 17,  height: 46 },
    { x: 703,  y: 301, width: 11,  height: 61 },
    { x: 965,  y: 309, width: 15,  height: 53 },
    { x: 1184, y: 302, width: 12,  height: 65 },
    // upper sidewalk — fire hydrants
    { x: 308,  y: 339, width: 22,  height: 15 },
    { x: 782,  y: 341, width: 16,  height: 16 },
    // upper road — parked car tops
    { x: 1,    y: 401, width: 51,  height: 25 },
    { x: 92,   y: 405, width: 113, height: 29 },
    { x: 331,  y: 408, width: 92,  height: 39 },
    { x: 729,  y: 403, width: 112, height: 30 },
    { x: 959,  y: 411, width: 116, height: 31 },
    // lower sidewalk — light posts / parking meters
    { x: 40,   y: 614, width: 25,  height: 53 },
    { x: 242,  y: 613, width: 21,  height: 75 },
    { x: 468,  y: 621, width: 33,  height: 28 },
    { x: 702,  y: 613, width: 14,  height: 69 },
    { x: 963,  y: 601, width: 13,  height: 66 },
    { x: 1188, y: 610, width: 10,  height: 69 },
    // lower sidewalk — fire hydrant
    { x: 779,  y: 661, width: 25,  height: 24 },
  ],
  'san-bruno': [
    // light posts / parking meters (thin vertical)
    { x: 711, y: 198,  width: 10,  height: 21  },
    { x: 706, y: 358,  width: 19,  height: 28  },
    { x: 708, y: 442,  width: 17,  height: 71  },
    { x: 708, y: 764,  width: 18,  height: 80  }, // was 707 — minor fix
    { x: 708, y: 1052, width: 16,  height: 90  },
    { x: 759, y: 1181, width: 22,  height: 74  },
    // cafe patio area (pergola / overhang)
    { x: 815, y: 905,  width: 220, height: 189 },
    // small objects
    { x: 907, y: 1033, width: 67,  height: 25  },
    { x: 879, y: 1079, width: 21,  height: 17  },
    { x: 925, y: 1112, width: 22,  height: 15  },
    { x: 991, y: 1190, width: 18,  height: 17  },
    { x: 844, y: 1218, width: 25,  height: 16  },
    { x: 1020, y: 996, width: 15,  height: 43  },
  ],
  southside: [],
  'blue-store-interior': [],
  // five-gym-interior zones stored at native 1224px coords — scaled ×0.5 in cityConfig
  'five-gym-interior': [
    // left wall equipment — punching bags / heavy bags (3 units)
    { x: 82,  y: 361, width: 56, height: 119 },
    { x: 82,  y: 570, width: 56, height: 100 },
    { x: 82,  y: 772, width: 52, height: 83  },
    // upper-right block — counter top overhang
    { x: 984, y: 395, width: 150, height: 59 },
  ],
}

export function getOcclusionZones(mapId: string): OcclusionZone[] {
  return OCCLUSION_ZONES[mapId] ?? []
}
