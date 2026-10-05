/**
 * 地形场：把格子地图转换为连续的高度函数（含地图外延的景观）
 */
import type { MapData, TerrainId } from '../contracts';
import { fbm, hash2 } from './noise';
import type { ThemeConfig } from './themes';

export const WATER_Y = -0.1;
export const LAVA_Y = -0.12;
export const BRIDGE_Y = 0.12;
export const DECK_Y = 0.1;

/** 地面高度（地表网格） */
const GROUND: Record<TerrainId, number> = {
  plain: 0,
  road: -0.02,
  forest: 0.03,
  hill: 0.34,
  mountain: 0.78,
  peak: 1.55,
  water: -0.55,
  shallow: -0.22,
  bridge: -0.5,
  sand: -0.04,
  snow: 0.1,
  lava: -0.32,
  ash: 0,
  floor: 0.05,
  wall: 0.05,
  pillar: 0.05,
  gate: 0.05,
  throne: 0.05,
  village: 0.03,
  house: 0.03,
  fort: 0.08,
  ruins: 0.03,
  stairs: 0.05,
  cliff: 1.35,
  deck: -0.5,
};

/** 地表起伏幅度 */
const ROUGH: Record<TerrainId, number> = {
  plain: 0.06,
  road: 0.02,
  forest: 0.08,
  hill: 0.14,
  mountain: 0.3,
  peak: 0.5,
  water: 0.12,
  shallow: 0.06,
  bridge: 0.1,
  sand: 0.05,
  snow: 0.1,
  lava: 0.08,
  ash: 0.06,
  floor: 0,
  wall: 0,
  pillar: 0,
  gate: 0,
  throne: 0,
  village: 0.02,
  house: 0.02,
  fort: 0.02,
  ruins: 0.04,
  stairs: 0,
  cliff: 0.4,
  deck: 0.1,
};

/** 可站立面的特殊高度（液体、桥面、甲板），其余为地面 */
function walkLevel(t: TerrainId): number | null {
  switch (t) {
    case 'water':
    case 'shallow':
      return WATER_Y;
    case 'lava':
      return LAVA_Y;
    case 'bridge':
      return BRIDGE_Y;
    case 'deck':
      return DECK_Y;
    case 'throne':
      return 0.26;
    case 'stairs':
      return 0.14;
    default:
      return null;
  }
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class TerrainField {
  readonly W: number;
  readonly H: number;
  readonly skirt: number;
  readonly seed: number;
  private tiles: TerrainId[][];
  private theme: ThemeConfig;
  private cache = new Map<number, TerrainId>();

  constructor(map: MapData, theme: ThemeConfig, skirt = 10) {
    this.W = map.width;
    this.H = map.height;
    this.tiles = map.tiles;
    this.theme = theme;
    this.skirt = skirt;
    this.seed = map.seed ?? 1;
  }

  setTile(x: number, y: number, t: TerrainId) {
    this.tiles[y][x] = t;
    this.cache.clear();
  }

  inside(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.W && ty < this.H;
  }

  /** 任意格（含地图外）的地形 */
  tile(tx: number, ty: number): TerrainId {
    if (this.inside(tx, ty)) return this.tiles[ty][tx];
    const key = (ty + 1000) * 4096 + (tx + 1000);
    const c = this.cache.get(key);
    if (c) return c;
    const t = this.outerTile(tx, ty);
    this.cache.set(key, t);
    return t;
  }

  private outerTile(tx: number, ty: number): TerrainId {
    const cx = Math.min(this.W - 1, Math.max(0, tx));
    const cy = Math.min(this.H - 1, Math.max(0, ty));
    const edge = this.tiles[cy][cx];
    const d = Math.max(Math.abs(tx - cx), Math.abs(ty - cy));
    // 水域、道路向外延伸
    if (edge === 'water' || edge === 'shallow') return d > 1 ? 'water' : edge;
    if (edge === 'road' || edge === 'bridge') return d < 3 ? 'road' : this.feature(tx, ty);
    if (edge === 'lava') return 'lava';
    if (edge === 'wall' || edge === 'gate') return d <= 1 ? 'wall' : this.feature(tx, ty);
    if (edge === 'floor' || edge === 'pillar' || edge === 'throne' || edge === 'stairs') return d <= 1 ? 'floor' : this.feature(tx, ty);
    // 靠近边缘时有一定几率延续边缘地形
    if (d <= 2 && hash2(tx, ty, this.seed + 7) < 0.55 - d * 0.15) {
      if (edge === 'house' || edge === 'village') return 'house';
      if (edge === 'deck') return 'water';
      if (edge !== 'fort' && edge !== 'ruins') return edge;
    }
    return this.feature(tx, ty);
  }

  private feature(tx: number, ty: number): TerrainId {
    const n = fbm(tx * 0.17 + 11, ty * 0.17 + 5, this.seed, 3);
    const o = this.theme.outer;
    let acc = 0;
    // 按噪声值分段：越大的值越「崎岖」
    const sorted = o.features;
    const v = 1 - n;
    for (const [t, p] of sorted) {
      acc += p;
      if (v < acc * 0.95) {
        // 在大块区域内再撒点变化
        if (t === 'forest' && hash2(tx, ty, this.seed) < 0.12) return 'plain';
        return t;
      }
    }
    return o.base;
  }

  /** 平台插值：格子中心半径 0.25 内为平台，格间平滑过渡 */
  private plateau(wx: number, wz: number, f: (t: TerrainId, tx: number, ty: number) => number): number {
    const gx = wx - 0.5;
    const gz = wz - 0.5;
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const u = smoothstep(0.25, 0.75, gx - x0);
    const v = smoothstep(0.25, 0.75, gz - z0);
    const a = f(this.tile(x0, z0), x0, z0);
    const b = f(this.tile(x0 + 1, z0), x0 + 1, z0);
    const c = f(this.tile(x0, z0 + 1), x0, z0 + 1);
    const d = f(this.tile(x0 + 1, z0 + 1), x0 + 1, z0 + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /** 地面高度（不含液体） */
  ground(wx: number, wz: number): number {
    const base = this.plateau(wx, wz, (t) => GROUND[t]);
    const amp = this.plateau(wx, wz, (t) => ROUGH[t]);
    const n = fbm(wx * 0.9, wz * 0.9, this.seed + 3, 4) - 0.5;
    // 地图外的远景略微抬升，形成起伏的地平线
    const out = this.outside(wx, wz);
    const far = out > 3 ? Math.min(1.2, (out - 3) * 0.06) * (fbm(wx * 0.12, wz * 0.12, this.seed + 9, 3) - 0.3) : 0;
    return base + amp * n * 2 + far;
  }

  /** 到地图边界之外的距离（地图内为 0） */
  outside(wx: number, wz: number): number {
    const dx = Math.max(0, -wx, wx - this.W);
    const dz = Math.max(0, -wz, wz - this.H);
    return Math.max(dx, dz);
  }

  /** 可站立面高度（液面、桥面、地面中较高者） */
  walk(wx: number, wz: number): number {
    const g = this.ground(wx, wz);
    const level = this.plateau(wx, wz, (t, tx, ty) => {
      const w = walkLevel(t);
      return w ?? this.ground(tx + 0.5, ty + 0.5);
    });
    return Math.max(g, level);
  }

  /** 单位站立高度（格子中心） */
  stand(x: number, y: number): number {
    return this.walk(x + 0.5, y + 0.5);
  }
}

export { GROUND };
