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

/* ---------- 门派打法（详见 docs/menpai.md，由 tests/menpai.test.ts 校验） ---------- */

/** 七种打法。每个门派有一个主打法、一个副打法 */
export type Style = '刚猛' | '浑厚' | '阴毒' | '绵柔' | '迅捷' | '擒拿' | '吸纳';

/** 相克环：每种打法克它后面两种、被它前面两种克，和对面两种势均力敌 */
export const STYLE_RING: Style[] = ['刚猛', '浑厚', '阴毒', '绵柔', '迅捷', '擒拿', '吸纳'];

/** a 是否克 b */
export const styleBeats = (a: Style, b: Style): boolean => {
  const d = (STYLE_RING.indexOf(b) - STYLE_RING.indexOf(a) + STYLE_RING.length) % STYLE_RING.length;
  return d === 1 || d === 2;
};

/**
 * 每种打法的招牌效果和可用效果。
 * multi：多段连击（hits ≥ 2）也算这种打法的招牌；三连击只有带迅捷的门派能用。
 */
export const STYLES: Record<Style, { sig: FxKind[]; multi?: boolean; allowed: FxKind[] }> = {
  刚猛: { sig: ['break', 'fear'], allowed: ['break', 'fear', 'rage'] },
  浑厚: { sig: ['guard', 'heal'], allowed: ['guard', 'heal', 'rage', 'fear'] },
  阴毒: { sig: ['poison', 'burn', 'bleed'], allowed: ['poison', 'burn', 'bleed', 'chill', 'weaken'] },
  绵柔: { sig: ['weaken', 'guard'], allowed: ['weaken', 'guard', 'chill'] },
  迅捷: { sig: ['haste'], multi: true, allowed: ['haste', 'bleed', 'break'] },
  擒拿: { sig: ['busy', 'disarm'], allowed: ['busy', 'disarm', 'chill', 'weaken'] },
  吸纳: { sig: ['drain'], allowed: ['drain', 'guard', 'weaken'] }
};

/**
 * 门派定位：主打法、副打法、性质倾向。没有两个门派的主副打法完全相同。
 * 新门派要先在这里定位，才能写武功。江湖散学不挂打法，规矩见 JIANGHU_RULE。
 */
export const SCHOOL_STYLE: Record<string, { main: Style; sub: Style; natures: SkillNature[] }> = {
  丐帮: { main: '刚猛', sub: '擒拿', natures: ['刚', '柔'] },
  白驼山: { main: '刚猛', sub: '阴毒', natures: ['刚', '阴'] },
  铁掌帮: { main: '刚猛', sub: '迅捷', natures: ['刚'] },
  绿林: { main: '刚猛', sub: '浑厚', natures: ['刚'] },
  少林: { main: '浑厚', sub: '刚猛', natures: ['刚', '阳'] },
  全真: { main: '浑厚', sub: '擒拿', natures: ['阳', '中正'] },
  军伍: { main: '浑厚', sub: '迅捷', natures: ['刚', '阳'] },
  星宿: { main: '阴毒', sub: '吸纳', natures: ['阴'] },
  五毒教: { main: '阴毒', sub: '浑厚', natures: ['阴'] },
  灵鹫宫: { main: '阴毒', sub: '擒拿', natures: ['阴', '阳'] },
  血刀门: { main: '阴毒', sub: '迅捷', natures: ['阳', '刚'] },
  武当: { main: '绵柔', sub: '浑厚', natures: ['中正', '柔'] },
  明教: { main: '绵柔', sub: '刚猛', natures: ['阳', '中正'] },
  姑苏慕容: { main: '绵柔', sub: '擒拿', natures: ['中正'] },
  漕帮: { main: '绵柔', sub: '迅捷', natures: ['柔', '中正'] },
  峨眉: { main: '迅捷', sub: '绵柔', natures: ['柔', '阴'] },
  华山: { main: '迅捷', sub: '刚猛', natures: ['中正', '刚'] },
  古墓: { main: '迅捷', sub: '阴毒', natures: ['阴', '柔'] },
  寒江: { main: '迅捷', sub: '擒拿', natures: ['柔', '阴'] },
  桃花岛: { main: '擒拿', sub: '刚猛', natures: ['刚', '柔'] },
  大理段氏: { main: '擒拿', sub: '迅捷', natures: ['阳', '刚'] },
  苍梧: { main: '擒拿', sub: '阴毒', natures: ['阴', '中正'] },
  六扇门: { main: '擒拿', sub: '浑厚', natures: ['中正'] },
  逍遥: { main: '吸纳', sub: '擒拿', natures: ['阴', '中正'] },
  日月神教: { main: '吸纳', sub: '迅捷', natures: ['阴'] }
};

/** 江湖散学：天下流传的寻常功夫，不挂打法。品级最高上品，绝招、杀招、合璧都不带效果，只比真功夫 */
export const JIANGHU_RULE = { school: '江湖', maxGrade: '上品' as SkillGrade };

/**
 * 还没按定位改造完的门派：tests/menpai.test.ts 对它们只提醒、不报错。
 * 改造完一个就删一个，直到清空。新门派不许进这个名单。
 */
export const STYLE_PENDING: string[] = [
  '丐帮', '白驼山', '铁掌帮', '少林', '全真', '星宿', '五毒教', '灵鹫宫', '血刀门', '武当', '明教', '姑苏慕容',
  '峨眉', '华山', '古墓', '桃花岛', '大理段氏', '逍遥', '日月神教'
];
