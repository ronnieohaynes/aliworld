// ALIWORLD collision zones for the HILLCREST city map
// Auto-extracted from the magenta-painted collision overlay.
// Source map: 1122x1402 px. Zones are in world pixel coordinates,
// assuming the Hillcrest map renders at native size with top-left at world (0,0).

export interface CollisionZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const HILLCREST_MAP_SIZE = { width: 1122, height: 1402 };

export const HILLCREST_COLLISION_ZONES: CollisionZone[] = [
  // outer walls (boundary — preserved from previous overlay)
  { x: 200,  y: 0,    width: 216, height: 1402 },
  { x: 416,  y: 0,    width: 520, height: 72   },
  { x: 936,  y: 16,   width: 128, height: 816  },
  { x: 1032, y: 888,  width: 90,  height: 424  },
  // interior obstacles (updated from new overlay)
  { x: 414,  y: 82,   width: 43,  height: 66   },
  { x: 422,  y: 161,  width: 103, height: 162  },
  { x: 706,  y: 219,  width: 22,  height: 27   },
  { x: 751,  y: 319,  width: 31,  height: 268  },
  { x: 700,  y: 387,  width: 33,  height: 10   },
  { x: 440,  y: 433,  width: 72,  height: 119  },
  { x: 621,  y: 433,  width: 44,  height: 123  },
  { x: 791,  y: 434,  width: 136, height: 109  },
  { x: 700,  y: 512,  width: 33,  height: 29   },
  { x: 444,  y: 600,  width: 63,  height: 124  },
  { x: 740,  y: 605,  width: 67,  height: 272  },
  { x: 820,  y: 698,  width: 99,  height: 49   },
  { x: 611,  y: 843,  width: 61,  height: 128  },
  { x: 695,  y: 845,  width: 40,  height: 24   },
  { x: 445,  y: 849,  width: 67,  height: 126  },
  { x: 783,  y: 911,  width: 27,  height: 178  },
  { x: 860,  y: 1004, width: 18,  height: 48   },
  { x: 904,  y: 1038, width: 72,  height: 54   },
  { x: 610,  y: 1095, width: 70,  height: 126  },
  { x: 445,  y: 1109, width: 60,  height: 111  },
  { x: 695,  y: 1141, width: 43,  height: 18   },
  { x: 814,  y: 1141, width: 77,  height: 79   },
  { x: 748,  y: 1251, width: 77,  height: 30   },
  { x: 604,  y: 1255, width: 75,  height: 130  },
  { x: 444,  y: 1261, width: 65,  height: 116  },
  { x: 723,  y: 1361, width: 104, height: 37   },
];

// Generic AABB test. If you already have a collision helper, reuse it and
// delete this one; just keep HILLCREST_COLLISION_ZONES and HILLCREST_MAP_SIZE.
export function hitsCollision(
  x: number, y: number, w: number, h: number,
  zones: CollisionZone[]
): boolean {
  for (const z of zones) {
    if (x < z.x + z.width && x + w > z.x && y < z.y + z.height && y + h > z.y) {
      return true;
    }
  }
  return false;
}
