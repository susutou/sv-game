/** Valley Rise open-world tilemap */

export const TILE = 16;

export type TileId =
  | 'grass'
  | 'grass2'
  | 'path'
  | 'road'
  | 'roadline'
  | 'water'
  | 'water2'
  | 'sand'
  | 'bush'
  | 'tree'
  | 'floor'
  | 'flower'
  | 'plaza'
  | 'dock';

export type WorldEntityKind = 'location' | 'character';

export type WorldEntity = {
  id: string;
  kind: WorldEntityKind;
  /** map tile coords (top-left of footprint) */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** location id or character id */
  target: string;
  color: string;
};

export const MAP_W = 96;
export const MAP_H = 72;

const SOLID: Partial<Record<TileId, boolean>> = {
  water: true,
  water2: true,
  tree: true,
  bush: true,
};

export function isSolid(tile: TileId): boolean {
  return !!SOLID[tile];
}

function fillRect(
  grid: TileId[][],
  x: number,
  y: number,
  w: number,
  h: number,
  tile: TileId,
) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (j >= 0 && j < MAP_H && i >= 0 && i < MAP_W) grid[j][i] = tile;
    }
  }
}

function hRoad(grid: TileId[][], y: number, x0: number, x1: number) {
  for (let x = x0; x <= x1; x++) {
    grid[y][x] = 'road';
    if (y + 1 < MAP_H) grid[y + 1][x] = 'road';
    if (x % 2 === 0) grid[y][x] = 'roadline';
  }
}

function vRoad(grid: TileId[][], x: number, y0: number, y1: number) {
  for (let y = y0; y <= y1; y++) {
    grid[y][x] = 'road';
    if (x + 1 < MAP_W) grid[y][x + 1] = 'road';
  }
}

export function createMap(): { tiles: TileId[][]; entities: WorldEntity[]; spawn: { x: number; y: number } } {
  const tiles: TileId[][] = Array.from({ length: MAP_H }, (_, y) =>
    Array.from({ length: MAP_W }, (_, x) => {
      // bay on the east/south-east
      if (x > MAP_W - 18 + Math.sin(y * 0.15) * 2) return y % 2 === 0 ? 'water' : 'water2';
      if (x > MAP_W - 20 && Math.random() > 0.7) return 'sand';
      return (x + y) % 7 === 0 ? 'grass2' : 'grass';
    }),
  );

  // parks / plazas
  fillRect(tiles, 8, 8, 14, 10, 'grass');
  fillRect(tiles, 40, 12, 12, 8, 'plaza');
  fillRect(tiles, 22, 40, 16, 10, 'grass');

  // shoreline dock
  fillRect(tiles, MAP_W - 22, 30, 6, 2, 'dock');
  fillRect(tiles, MAP_W - 22, 28, 2, 6, 'dock');

  // flower patches
  for (let i = 0; i < 40; i++) {
    const x = 4 + Math.floor(Math.random() * 60);
    const y = 4 + Math.floor(Math.random() * 50);
    if (tiles[y][x] === 'grass' || tiles[y][x] === 'grass2') tiles[y][x] = 'flower';
  }

  // trees / bushes
  for (let i = 0; i < 120; i++) {
    const x = 2 + Math.floor(Math.random() * (MAP_W - 24));
    const y = 2 + Math.floor(Math.random() * (MAP_H - 4));
    if (tiles[y][x] === 'grass' || tiles[y][x] === 'grass2') {
      tiles[y][x] = Math.random() > 0.45 ? 'tree' : 'bush';
    }
  }

  // road grid
  hRoad(tiles, 20, 4, MAP_W - 22);
  hRoad(tiles, 44, 4, MAP_W - 24);
  vRoad(tiles, 18, 4, MAP_H - 6);
  vRoad(tiles, 52, 4, 60);
  vRoad(tiles, 34, 10, 55);

  // campus paths
  fillRect(tiles, 24, 24, 18, 2, 'path');
  fillRect(tiles, 32, 16, 2, 18, 'path');
  fillRect(tiles, 10, 30, 12, 2, 'path');
  fillRect(tiles, 56, 24, 10, 2, 'path');

  const entities: WorldEntity[] = [
    {
      id: 'loc-company',
      kind: 'location',
      x: 24,
      y: 12,
      w: 6,
      h: 5,
      label: 'Nimbus Labs',
      target: 'company',
      color: '#6ec6ff',
    },
    {
      id: 'loc-market',
      kind: 'location',
      x: 40,
      y: 24,
      w: 6,
      h: 5,
      label: 'Exchange',
      target: 'market',
      color: '#3dd68c',
    },
    {
      id: 'loc-bank',
      kind: 'location',
      x: 10,
      y: 22,
      w: 5,
      h: 4,
      label: 'Credit Union',
      target: 'bank',
      color: '#e8c547',
    },
    {
      id: 'loc-hospital',
      kind: 'location',
      x: 56,
      y: 12,
      w: 5,
      h: 5,
      label: 'Urgent Care',
      target: 'hospital',
      color: '#f0f0f0',
    },
    {
      id: 'loc-realty',
      kind: 'location',
      x: 58,
      y: 36,
      w: 5,
      h: 4,
      label: 'Bay Realty',
      target: 'realestate',
      color: '#d4a574',
    },
    // NPCs — stand on clear plaza/path tiles near hubs
    {
      id: 'npc-colleague',
      kind: 'character',
      x: 31,
      y: 19,
      w: 1,
      h: 1,
      label: 'Colleague',
      target: 'colleague',
      color: '#1565c0',
    },
    {
      id: 'npc-boss',
      kind: 'character',
      x: 28,
      y: 19,
      w: 1,
      h: 1,
      label: 'Boss',
      target: 'boss',
      color: '#263238',
    },
    {
      id: 'npc-friend',
      kind: 'character',
      x: 14,
      y: 35,
      w: 1,
      h: 1,
      label: 'Friend',
      target: 'friend',
      color: '#2e7d32',
    },
    {
      id: 'npc-girlfriend',
      kind: 'character',
      x: 42,
      y: 42,
      w: 1,
      h: 1,
      label: 'Girlfriend',
      target: 'girlfriend',
      color: '#c2185b',
    },
    {
      id: 'npc-wife',
      kind: 'character',
      x: 60,
      y: 41,
      w: 1,
      h: 1,
      label: 'Wife',
      target: 'wife',
      color: '#6a1b9a',
    },
  ];

  // clear footprints under buildings + NPC standing tiles
  for (const e of entities) {
    if (e.kind === 'location') {
      fillRect(tiles, e.x - 1, e.y + e.h, e.w + 2, 2, 'plaza');
      fillRect(tiles, e.x, e.y + e.h, e.w, 1, 'path');
    } else {
      fillRect(tiles, e.x - 1, e.y - 1, 3, 3, 'plaza');
      tiles[e.y][e.x] = 'path';
    }
  }

  return { tiles, entities, spawn: { x: 33, y: 28 } };
}

export function entityAt(
  entities: WorldEntity[],
  tx: number,
  ty: number,
  visibleTargets: Set<string>,
): WorldEntity | null {
  for (const e of entities) {
    if (e.kind === 'character' && !visibleTargets.has(e.target)) continue;
    if (tx >= e.x - 1 && tx <= e.x + e.w && ty >= e.y - 1 && ty <= e.y + e.h + 1) {
      return e;
    }
  }
  return null;
}
