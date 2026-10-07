/**
 * 武学库的常量与规矩。武功本身写在 src/content/packs/ 下的内容包里（skills 字段）。
 * 设计说明见 docs/wuxue.md。这里的数值上限由 tests/content.test.ts 校验每一门武功。
 */
import type { FxKind, SkillCategory, SkillGrade, SkillNature, SkillReach, Slot, WoundKind } from './types';

export const REALMS = ['初窥门径', '略有小成', '融会贯通', '炉火纯青', '登堂入室', '出神入化', '一代宗师', '返璞归真', '大乘'];
/** 每一重升到下一重所需的熟练度 */
export const REALM_NEED = [200, 600, 1200, 2000, 3200, 4800, 7000, 10000, 99999];
export const GRADES: [SkillGrade, string][] = [['凡品', 'fan'], ['良品', 'liang'], ['上品', 'shang'], ['绝品', 'jue'], ['神品', 'shen'], ['禁品', 'jin']];

/**
 * 品级系数：火候 = 境界 × 10 × 品级系数 + 属性。
 * 境界的分量远大于品级：凡品练到「出神入化」（45）远胜上品停在「融会贯通」（22）。
 */
export const GRADE_COEF: Record<SkillGrade, number> = { 凡品: 0.9, 良品: 1, 上品: 1.12, 绝品: 1.26, 神品: 1.42, 禁品: 1.6 };

/** 拳脚：徒手功夫 */
export const FIST: SkillCategory[] = ['拳法', '掌法', '指法', '爪法', '腿法', '手法'];
/** 兵刃 */
export const WEAPON: SkillCategory[] = ['剑法', '刀法', '枪法', '棍法', '杖法', '鞭法', '斧法', '锤法', '奇门'];
/** 外功：拳脚和兵刃，可以放进主手、副手槽 */
export const OUTER: SkillCategory[] = [...FIST, ...WEAPON];
/** 暗器、杂学暂不上搭配槽：暗器配合飞蝗石等物品使用，杂学是读书写字、医术、毒术、琴棋书画这类学问 */
export const CATEGORIES: SkillCategory[] = ['内功', '轻功', ...OUTER, '暗器', '绝技', '杂学'];
export const WOUNDS: WoundKind[] = ['瘀伤', '内伤', '刺伤', '割伤', '砸伤', '冻伤', '灼伤', '毒伤'];
export const NATURES: SkillNature[] = ['刚', '柔', '阴', '阳', '中正'];
export const REACHES: SkillReach[] = ['长', '短', '徒手'];

/**
 * 门派与出处。武学宇宙以金庸群侠为底，参照北大侠客行；本作原创的门派与之并存。
 * 要新增，在 Issue 里说明，由维护者加。
 */
export const SCHOOLS = [
  // 本作原创
  '寒江', '苍梧', '军伍', '六扇门', '漕帮', '绿林', '江湖',
  // 金庸群侠
  '少林', '武当', '峨眉', '华山', '丐帮', '全真', '古墓', '桃花岛', '星宿', '逍遥', '灵鹫宫', '明教',
  '大理段氏', '姑苏慕容', '白驼山', '雪山', '昆仑', '崆峒', '日月神教', '血刀门', '铁掌帮', '神龙教',
  '五毒教', '青城', '泰山', '衡山', '嵩山', '恒山', '天地会', '天龙寺', '梅庄',
  // 泛称
  '佛门', '道门', '世家', '塞外', '南疆', '东瀛'
];

/** 每个槽位能放哪些武功 */
export const SLOT_CATS: Record<Slot, SkillCategory[]> = {
  neigong: ['内功'], qinggong: ['轻功'], main: OUTER, off: OUTER, ult: ['绝技']
};
export const SLOT_NAME: Record<Slot, string> = { neigong: '内功', qinggong: '轻功', main: '主手', off: '副手', ult: '绝技' };

/**
 * 绝招（perform）的预算上限。预算 = 期望伤害 + 效果当量，期望伤害 = 连击数 × 平均伤害 × 命中率；
 * 效率 = 预算 ÷（耗内力 + 20 × 调息合数）。两项都不能超过本品级的上限。
 * 要练到更高境界才能用的绝招，预算上限每重放宽 8%。
 */
/**
 * 绝招效率的目标区间（不是上限）：起手绝招落在区间里，不顶格，也不偷懒。
 * 要练到更高境界才能用的绝招，区间按 loosen(境界) 放宽。差异性和平衡性见 docs/wuxue.md 第五节。
 */
export const EFFICIENCY_BAND: Record<SkillGrade, [number, number]> = {
  凡品: [1.1, 1.3], 良品: [1.3, 1.5], 上品: [1.5, 1.8], 绝品: [1.8, 2.1], 神品: [2.1, 2.5], 禁品: [2.5, 2.9]
};
/** 每高一重境界，绝招的上限和目标区间放宽 8% */
export const loosen = (realm = 0): number => 1 + 0.08 * realm;
/** 同一门武功里，境界更高的绝招，预算至少是低境界绝招的这么多倍 */
export const REALM_STEP = 1.15;

export const ACTIVE_MAX: Record<SkillGrade, { expected: number; efficiency: number }> = {
  凡品: { expected: 140, efficiency: 1.5 },
  良品: { expected: 170, efficiency: 1.9 },
  上品: { expected: 200, efficiency: 2.3 },
  绝品: { expected: 250, efficiency: 2.7 },
  神品: { expected: 310, efficiency: 3.1 },
  禁品: { expected: 380, efficiency: 3.5 }
};
/** 绝技杀招的预算上限：平均伤害 + 效果当量 */
export const ULT_MAX: Record<SkillGrade, number> = { 凡品: 360, 良品: 440, 上品: 520, 绝品: 600, 神品: 700, 禁品: 820 };

/* ---------- 效果的数值范围与预算（详见 docs/wuxue.md） ---------- */

/**
 * 每种效果的取值范围，以及折算成「伤害当量」的方法。
 * 绝招的预算 = 期望伤害 + 各效果的当量 × 触发几率，不能超过本品级的上限。
 */
export const FX_RULES: Record<FxKind, { value?: [number, number]; rounds?: [number, number]; cost: (value: number, rounds: number) => number; passive?: [number, number] }> = {
  busy:   { rounds: [1, 3], cost: (_v, r) => 50 * r },
  bleed:  { value: [5, 40], rounds: [2, 6], cost: (v, r) => v * r * 0.8 },
  poison: { value: [5, 40], rounds: [2, 6], cost: (v, r) => v * r * 0.8 },
  burn:   { value: [5, 40], rounds: [2, 6], cost: (v, r) => v * r * 0.8 },
  chill:  { rounds: [1, 4], cost: (_v, r) => 25 * r },
  weaken: { value: [5, 30], rounds: [1, 4], cost: (v, r) => v * r * 2 },
  break:  { value: [5, 30], rounds: [1, 4], cost: (v, r) => v * r * 2.5 },
  disarm: { rounds: [1, 3], cost: (_v, r) => 35 * r },
  fear:   { value: [5, 25], cost: v => v },
  drain:  { value: [20, 150], cost: v => v * 0.5 },
  guard:  { value: [5, 40], rounds: [1, 4], cost: (v, r) => v * r * 2, passive: [3, 15] },
  haste:  { value: [5, 30], rounds: [1, 4], cost: (v, r) => v * r * 1.5, passive: [3, 15] },
  heal:   { value: [30, 300], cost: v => v * 0.6, passive: [5, 20] },
  rage:   { value: [5, 40], cost: v => v * 1.5, passive: [1, 5] }
};
/** 被动效果的当量：每 1% 护体按 3、每 1% 身法按 2.5、每合回血每点按 2、每合怒气每点按 4 */
export const PASSIVE_COST: Partial<Record<FxKind, number>> = { guard: 3, haste: 2.5, heal: 2, rage: 4 };
/** 被动效果的当量上限 */
export const PASSIVE_MAX: Record<SkillGrade, number> = { 凡品: 15, 良品: 25, 上品: 35, 绝品: 45, 神品: 55, 禁品: 70 };
/** 每个绝招最多几种效果 */
export const FX_PER_PERFORM: Record<SkillGrade, number> = { 凡品: 1, 良品: 1, 上品: 2, 绝品: 2, 神品: 3, 禁品: 3 };
