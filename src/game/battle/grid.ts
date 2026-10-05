/**
 * 战场网格：地形查询、移动范围（Dijkstra）、攻击范围、路径
 * 经典规则：不能穿越敌方单位；可以穿越友军但不能停在友军格上。
 */
import type { TerrainId } from '@/render/contracts';
import { TERRAIN_CHARS } from '@/render/contracts';
import { TERRAIN, terrainCost } from '@/data/terrain';
import type { Team } from '@/data/types';
import { moveTypeOf, stats, type Unit } from '../unit';

export class BattleMap {
  readonly width: number;
  readonly height: number;
  tiles: TerrainId[][];

  constructor(rows: string[]) {
    this.height = rows.length;
    this.width = Math.max(...rows.map((r) => r.length));
    this.tiles = rows.map((r) => {
      const line: TerrainId[] = [];
      for (let x = 0; x < this.width; x++) {
        const ch = r[x] ?? '.';
        const t = TERRAIN_CHARS[ch];
        if (!t) throw new Error(`未知地形字符 "${ch}"`);
        line.push(t);
      }
      return line;
    });
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  at(x: number, y: number): TerrainId {
    return this.tiles[y][x];
  }

  def(x: number, y: number) {
    return TERRAIN[this.tiles[y][x]];
  }

  key(x: number, y: number): number {
    return y * this.width + x;
  }

  fromKey(k: number): [number, number] {
    return [k % this.width, Math.floor(k / this.width)];
  }
}

export function isFriend(a: Team, b: Team): boolean {
  if (a === b) return true;
  return a !== 'enemy' && b !== 'enemy';
}

export function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export interface ReachNode {
  x: number;
  y: number;
  cost: number;
  prev: number;
  /** 是否可以停留（无其他单位） */
  stop: boolean;
}

export type Occupancy = Map<number, Unit>;

export function occupancy(map: BattleMap, units: Unit[]): Occupancy {
  const occ: Occupancy = new Map();
  for (const u of units) if (u.alive && !u.gone) occ.set(map.key(u.x, u.y), u);
  return occ;
}

/**
 * 计算单位的可移动范围。
 * @param movOverride 指定移动力（如剩余移动力）
 */
export function reachable(map: BattleMap, occ: Occupancy, u: Unit, movOverride?: number): Map<number, ReachNode> {
  const mov = movOverride ?? stats(u).mov;
  const mt = moveTypeOf(u);
  const start = map.key(u.x, u.y);
  const out = new Map<number, ReachNode>();
  out.set(start, { x: u.x, y: u.y, cost: 0, prev: -1, stop: true });
  // 简单的优先队列（地图很小，线性查找足够）
  const open: number[] = [start];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (out.get(open[i])!.cost < out.get(open[bi])!.cost) bi = i;
    const k = open.splice(bi, 1)[0];
    const n = out.get(k)!;
    for (const [dx, dy] of DIRS) {
      const nx = n.x + dx;
      const ny = n.y + dy;
      if (!map.inBounds(nx, ny)) continue;
      const c = terrainCost(map.at(nx, ny), mt);
      if (c === null) continue;
      const nk = map.key(nx, ny);
      const other = occ.get(nk);
      if (other && other !== u && !isFriend(other.team, u.team)) continue; // 不能穿越敌人
      const nc = n.cost + c;
      if (nc > mov) continue;
      const prev = out.get(nk);
      if (prev && prev.cost <= nc) continue;
      out.set(nk, { x: nx, y: ny, cost: nc, prev: k, stop: !other || other === u });
      open.push(nk);
    }
  }
  return out;
}

/** 从可移动范围中重建路径（含起点） */
export function pathTo(map: BattleMap, reach: Map<number, ReachNode>, x: number, y: number): [number, number][] {
  const path: [number, number][] = [];
  let k = map.key(x, y);
  let guard = 0;
  while (k !== -1 && guard++ < 999) {
    const n = reach.get(k);
    if (!n) break;
    path.unshift([n.x, n.y]);
    k = n.prev;
  }
  return path;
}

/** 以 (x,y) 为中心，射程 [min,max] 内的格子 */
export function tilesInRange(map: BattleMap, x: number, y: number, min: number, max: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dy = -max; dy <= max; dy++) {
    for (let dx = -max; dx <= max; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < min || d > max) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (map.inBounds(nx, ny)) out.push([nx, ny]);
    }
  }
  return out;
}

/** 曼哈顿半径内的格子（含中心） */
export function tilesInArea(map: BattleMap, x: number, y: number, r: number): [number, number][] {
  return tilesInRange(map, x, y, 0, r);
}

/** 可停留的格子集合 */
export function stopTiles(reach: Map<number, ReachNode>): ReachNode[] {
  return [...reach.values()].filter((n) => n.stop);
}

/**
 * 威胁范围：单位移动后可攻击到的所有格子（用于显示敌方危险区与 AI 唤醒判定）
 */
export function threatTiles(map: BattleMap, occ: Occupancy, u: Unit, range: [number, number]): Set<number> {
  const reach = reachable(map, occ, u);
  const out = new Set<number>();
  for (const n of stopTiles(reach)) {
    for (const [tx, ty] of tilesInRange(map, n.x, n.y, range[0], range[1])) out.add(map.key(tx, ty));
  }
  return out;
}
