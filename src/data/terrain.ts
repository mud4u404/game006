/**
 * 地形玩法数据
 * 经典规则：地形按百分比修正攻击力与防御力，不同兵种移动消耗不同，飞行单位无视地形。
 */
import type { TerrainId } from '@/render/contracts';
import type { MoveType } from './types';

export interface TerrainDef {
  id: TerrainId;
  name: string;
  /** 各移动类型的消耗，null = 不可通行 */
  cost: Record<MoveType, number | null>;
  /** 攻击力修正 % */
  atk: number;
  /** 防御力修正 % */
  def: number;
  /** 阶段开始时回复 HP 百分比 */
  heal?: number;
  /** 每阶段灼烧伤害百分比 */
  burn?: number;
  desc: string;
}

const X = null;

function t(
  id: TerrainId,
  name: string,
  cost: [number | null, number | null, number | null, number | null],
  atk: number,
  def: number,
  desc: string,
  extra: Partial<TerrainDef> = {},
): TerrainDef {
  return { id, name, cost: { foot: cost[0], armor: cost[1], horse: cost[2], fly: cost[3] }, atk, def, desc, ...extra };
}

//                     名称       步  重甲 骑  飞    攻%  防%
export const TERRAIN: Record<TerrainId, TerrainDef> = {
  plain: t('plain', '平原', [1, 1, 1, 1], 0, 0, '开阔平坦的原野。'),
  road: t('road', '道路', [1, 1, 1, 1], 0, 0, '平整的道路，便于行军。'),
  forest: t('forest', '森林', [2, 3, 3, 1], -5, 15, '林木茂密，易守难攻，骑兵行动不便。'),
  hill: t('hill', '丘陵', [2, 3, 2, 1], 5, 10, '起伏的山坡，略占地利。'),
  mountain: t('mountain', '山地', [3, X, X, 1], 5, 25, '崎岖山岭，重甲与骑兵无法通行。'),
  peak: t('peak', '高山', [X, X, X, 1], 0, 20, '险峻高峰，唯有飞兵可以越过。'),
  water: t('water', '深水', [X, X, X, 1], -10, -10, '深水，地面部队无法通过。'),
  shallow: t('shallow', '浅滩', [3, 4, 3, 1], -10, -10, '涉水而行，立足不稳。'),
  bridge: t('bridge', '桥', [1, 1, 1, 1], 0, 0, '横跨水面的桥梁。'),
  sand: t('sand', '沙地', [2, 2, 3, 1], -5, 0, '松软的沙地，步履艰难。'),
  snow: t('snow', '深雪', [2, 3, 3, 1], -5, 5, '没膝的积雪，行动迟缓。'),
  lava: t('lava', '熔岩', [X, X, X, 1], 0, -10, '炽热的岩浆，飞越其上也会被灼伤。', { burn: 10 }),
  ash: t('ash', '灰烬地', [1, 1, 2, 1], 0, 0, '覆满火山灰的焦土。'),
  floor: t('floor', '石地', [1, 1, 1, 1], 0, 0, '石砖铺成的地面。'),
  wall: t('wall', '城墙', [X, X, X, X], 0, 0, '高墙，无法逾越。'),
  pillar: t('pillar', '石柱', [X, X, X, X], 0, 0, '粗大的石柱。'),
  gate: t('gate', '城门', [1, 1, 1, 1], 5, 25, '城门要道，易守难攻。'),
  throne: t('throne', '王座', [1, 1, 1, 1], 10, 30, '据守此处可回复体力。', { heal: 15 }),
  village: t('village', '村庄', [1, 1, 1, 1], 0, 10, '可以拜访的村落，在此休息可回复体力。', { heal: 10 }),
  house: t('house', '民房', [X, X, X, X], 0, 0, '民居建筑，无法通行。'),
  fort: t('fort', '堡垒', [1, 1, 2, 1], 5, 25, '坚固的营寨，在此驻守可回复体力。', { heal: 15 }),
  ruins: t('ruins', '废墟', [2, 2, 3, 1], 0, 15, '断壁残垣，可作掩体。'),
  stairs: t('stairs', '台阶', [1, 2, 2, 1], 0, 5, '石砌的台阶。'),
  cliff: t('cliff', '悬崖', [X, X, X, 1], 0, 0, '陡峭的岩壁，唯有飞兵可以越过。'),
  deck: t('deck', '甲板', [1, 1, 1, 1], 0, 0, '码头与船只的木板。'),
};

export function terrainCost(id: TerrainId, m: MoveType): number | null {
  return TERRAIN[id].cost[m];
}
