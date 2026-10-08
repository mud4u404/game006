/**
 * 「人」：地基第二版的人物模型（验证用）。
 * - 先天五项：体魄、根骨、身法、悟性、胆魄，常人各 20（和游戏里的五项一一对应，只换了刻度）；
 *   后天 = 先天 + 对应武功重数 × 2：内功长体魄和根骨（内功长气血，和游戏一致），轻功长身法，外功长悟性和胆魄。
 *   后天只进火候和气血（这两样本来就该随境界涨）；别的作用（护体、闪避、怒气、开局的势）只看先天，是天赋，不随境界涨，
 *   否则境界就被多算一遍（第二十四轮：胆魄、根骨的加成随境界涨，高一档的胜率冲到八成九）。
 *   第三版改回五项：第二版照侠客行改成四项、总和 80，把胆魄并掉了，既是照搬，又丢了玩家已有的东西。
 * - 功力以年计，一年一百点内力。
 * - 武功九重；境界、品级、功力、根基按「一把尺子」折算成出手、气血、护体、火候。
 * 标准人：根基都是常人，练到某档的重数和功力。
 */
import type { Foe, Hero, Pw } from './kernel';

export const TIER_NAMES = ['不入流', '三流', '二流', '一流', '绝顶', '宗师'];
/**
 * 各档标准人：每档一重半，功力每档约翻一倍（不入流一年半，宗师约六十六年）。
 * 第一轮发现：原来的阶梯（一、三、五、七、八、九重）上密下疏，越往上档与档越分不开，所以改成等距。
 */
export const realmAt = (t: number): number => 1 + 1.5 * t;
export const gongliAt = (t: number): number => 1.5 * Math.pow(2.13, t);

/** 体魄、根骨、身法、悟性、胆魄 */
export interface Attr { ti: number; gen: number; shen: number; wu: number; dan: number }
export const ATTR_NAME: Record<keyof Attr, string> = { ti: '体魄', gen: '根骨', shen: '身法', wu: '悟性', dan: '胆魄' };
export interface Person {
  name: string;
  /** 连续档次：二流中 = 2，二流上 ≈ 2.33 */
  tier: number;
  /** 外功、内功、轻功的重数（1 到 9，可以是小数，表示熟练到一半） */
  outer: number; neigong: number; qinggong: number;
  gongli: number;
  /** 先天 */
  attr: Attr;
  grade: number;
  /** 装备：出手、护体的倍数 */
  gear?: { atk: number; def: number };
}

/** 可调的数（一把尺子的刻度） */
export interface Scale {
  /** 每重境界，出手乘多少 */
  realmQ: number;
  /** 每重内功，气血乘多少（第十四轮：1.02 时内功高一重只多三个点，玩家会觉得练内功没用） */
  hpQ: number;
  /** 功力翻一倍，加力、护体各乘 2^ε */
  jiali: number;
  hut: number;
  /** 应对成算：火候每重加多少 */
  hhPerRealm: number;
  /** 重招四项强度拉开多少：最突出的一项高出多少，最弱的一项低多少 */
  tellSpread: number;
  /** 偏科：主修那一项根基高出多少（先天总和不变） */
  bias: number;
  /** 对手（用对手流程打的人）气血、出手的倍数：玩家一方另有绝招、破绽、反击，所以对手要厚一些 */
  foeHp: number;
  foeAtk: number;
  /** 重招伤害是普通出手的几倍 */
  bigK: number;
  /** 应对得手以后的反击：硬接、拆招、抢攻的伤害区间（乘出手的倍数之前） */
  counter: Record<'block' | 'parry' | 'rush', [number, number]>;
  /** 根基每高常人一点：体魄加气血、出手；根骨加护体；胆魄加怒气涨得快慢 */
  tiHp: number;
  tiDmg: number;
  genHut: number;
  danRage: number;
  /** 身法每高常人一点，闪避普通出手的几率加多少 */
  shenDodge: number;
}

/**
 * 标定的结果（每一个数怎样标出来的，见 src/lab/model/README.md）。
 * 第三版（第二十四到二十六轮）：
 * - 五项根基：多出来的天赋，体魄每点气血 1%，根骨每点护体 0.5%，身法每点闪避 0.15%，胆魄每点怒气涨得快 1.5%、开局的势半格；
 *   各项高出常人十点，同档胜率各多五到九个点（第二十六轮先定得大了一倍，同一批种子一比，各多十个点上下）。
 * - 出手不再看根基（第二版的膂力），境界每重乘 1.04（等于第二版的境界 1.02 加膂力随外功涨的 2%）。
 * - 反击加大：拆招得手还一记 120 到 150（第二版 60 到 90，和随手一击差不多），硬接 100 到 130。
 * - 每重火候 6 → 5.5、对手厚度 5.5 → 5.6：反击加大以后高一档的胜率冲过八成五，压回来。
 * - 内功每重气血 1.07 → 1.065：绝顶同档一场打三十下出头，越了 C1 的线（第二版也贴着这条线）。
 */
export const SCALE0: Scale = {
  realmQ: 1.04, hpQ: 1.065, jiali: 0.07, hut: 0.07, hhPerRealm: 5.5, tellSpread: 2.5, bias: 6, foeHp: 5.6, foeAtk: 1, bigK: 3.5,
  counter: { block: [100, 130], parry: [120, 150], rush: [220, 280] },
  tiHp: 0.01, tiDmg: 0, genHut: 0.005, danRage: 0.015, shenDodge: 0.0015
};
/** 第二版的刻度（对照用） */
export const SCALE2: Scale = {
  realmQ: 1.02, hpQ: 1.07, jiali: 0.07, hut: 0.07, hhPerRealm: 6, tellSpread: 2.5, bias: 6, foeHp: 5.5, foeAtk: 1, bigK: 3.5,
  counter: { block: [80, 110], parry: [60, 90], rush: [220, 280] },
  tiHp: 0.01, tiDmg: 0.01, genHut: 0, danRage: 0, shenDodge: 0
};

/**
 * 偏科：主修的那门在本档的重数，另两门各低一重。
 * 第三轮发现：几门武功一样高时，「以己之长」和固定套路几乎一样，决断就没了分量；真实的玩家都是偏科的。
 */
export type Build = 'even' | 'outer' | 'inner' | 'light';
export const BUILDS: Build[] = ['outer', 'inner', 'light'];

/** 标准人：档次 t（0 到 5，可以是小数） */
export function standard(t: number, build: Build = 'even', name = TIER_NAMES[Math.round(t)] ?? '标准人', bias = 6): Person {
  const R = realmAt(t), lo = Math.max(1, R - 1);
  const pick = (b: Build): number => (build === 'even' || build === b ? R : lo);
  // 偏科的根基：主修那一项高 bias，其余各项分摊着低一些，总和不变（外功为主的人，体魄、悟性各高一半）
  const d = build === 'even' ? 0 : bias;
  const base: Attr = { ti: 20, gen: 20, shen: 20, wu: 20, dan: 20 };
  const up: (keyof Attr)[] = build === 'outer' ? ['ti', 'wu'] : build === 'inner' ? ['gen'] : build === 'light' ? ['shen'] : [];
  const attr = { ...base };
  for (const k of Object.keys(base) as (keyof Attr)[]) attr[k] += up.includes(k) ? d / up.length : -d / (5 - up.length);
  // 内功为主的人打坐多，功力深一些；轻功、外功为主的浅一些
  const g = gongliAt(t) * (build === 'inner' ? 1.4 : build === 'even' ? 1 : 0.85);
  return { name, tier: t, outer: pick('outer'), neigong: pick('inner'), qinggong: pick('light'), gongli: g, attr, grade: 1 };
}

/** 后天根基 */
export function houtian(p: Person): Attr {
  return { ti: p.attr.ti + 2 * p.neigong, gen: p.attr.gen + 2 * p.neigong, shen: p.attr.shen + 2 * p.qinggong, wu: p.attr.wu + 2 * p.outer, dan: p.attr.dan + 2 * p.outer };
}

/** 眼力：和火候同一个算法，练得最高的那门武功的重数加后天悟性。看破虚招靠它 */
export function yanOf(p: Person, sc: Scale): number {
  return sc.hhPerRealm * (Math.max(p.outer, p.neigong, p.qinggong) - 1) * p.grade + houtian(p).wu;
}

/** 功力的倍数：以一年半为一，翻一倍乘 2^ε */
const gk = (g: number, eps: number): number => Math.pow(Math.max(0.1, g) / 1.5, eps);

/** 出手的倍数：境界 × 品级 × 体魄（力道） × 加力 × 装备 */
export function dmgMul(p: Person, sc: Scale): number {
  return 0.8 * Math.pow(sc.realmQ, p.outer - 1) * p.grade * (1 + sc.tiDmg * (p.attr.ti - 20)) * gk(p.gongli, sc.jiali) * (p.gear?.atk ?? 1);
}

/** 气血上限：内功垫底子，体魄定厚薄（游戏里也是体魄管气血） */
export function hpOf(p: Person, sc: Scale): number {
  const h = houtian(p);
  // 随境界涨的部分（后天体魄每点一分）和第二版一样；天赋（先天体魄）另算
  return 600 * Math.pow(sc.hpQ, p.neigong - 1) * (1 + 0.01 * (h.ti - p.attr.ti)) * (1 + sc.tiHp * (p.attr.ti - 20));
}

/** 内力上限：功力一年一百点，根骨高的人经脉宽，存得多一些 */
export function mpOf(p: Person): number {
  return p.gongli * 100 * (1 + 0.01 * (p.attr.gen - 20));
}

/** 护体：挨打时伤害除以它 */
export function hutiOf(p: Person, sc: Scale): number {
  return gk(p.gongli, sc.hut) * (1 + sc.genHut * (p.attr.gen - 20)) * (p.gear?.def ?? 1);
}

/** 火候：这门武功的重数 × 10 × 品级，加上对应的后天根基 */
export function hhOf(p: Person, sc: Scale): Record<'block' | 'dodge' | 'parry' | 'rush', number> {
  const h = houtian(p), k = sc.hhPerRealm;
  return {
    block: k * (p.neigong - 1) * p.grade + h.gen,
    dodge: k * (p.qinggong - 1) * p.grade + h.shen,
    parry: k * (p.outer - 1) * p.grade + h.wu,
    rush: k * (p.outer - 1) * p.grade + h.dan - 10
  };
}

const sc2 = (r: [number, number], k: number): [number, number] => [r[0] * k, r[1] * k];

/** 用玩家流程打斗的一方 */
export function asHero(p: Person, sc: Scale): Hero {
  const m = dmgMul(p, sc), hu = hutiOf(p, sc);
  // 护体折进气血：挨打打折，等于气血变厚
  const hp = hpOf(p, sc) * hu;
  const mpMax = mpOf(p), h = houtian(p);
  return {
    name: p.name, tier: p.tier, hpMax: hp, floor: 0, mpMax, mpRegen: mpMax * 0.04, gongli: p.gongli,
    auto: sc2([55, 80], m), open: sc2([200, 240], m),
    counter: { block: sc2(sc.counter.block, m), parry: sc2(sc.counter.parry, m), rush: sc2(sc.counter.rush, m) },
    hh: hhOf(p, sc), dodge: Math.min(0.35, 0.2 + 0.015 * (p.qinggong - 1) + sc.shenDodge * (p.attr.shen - 20)), parry: 0.15,
    performs: [
      { name: '绝招一', dmg: sc2([150, 190], m), mp: Math.round(0.15 * mpMax), cd: 3, acc: 0.85 },
      { name: '绝招二', dmg: sc2([220, 280], m), mp: Math.round(0.25 * mpMax), cd: 5, acc: 0.8 }
    ],
    // 胆魄：开战的怒气看先天（游戏里每点三分，这里刻度翻倍，所以一点半）；势看后天
    ult: sc2([520, 600], m), rage0: 30 + 1.5 * (p.attr.dan - 20), rageK: 1 + sc.danRage * (p.attr.dan - 20), wu: h.wu, dan: p.attr.dan, yan: yanOf(p, sc)
  };
}

/** 重招的四项强度：围着这个人的火候，挑一项最突出 */
function tellsOf(p: Person, sc: Scale): Pw[] {
  const hh = hhOf(p, sc);
  const base = (hh.block + hh.dodge + hh.parry) / 3, k = sc.tellSpread;
  return [
    { li: base + 10 * k, su: base - 4 * k, qiao: base - 6 * k, xi: base - 12 },
    { li: base - 6 * k, su: base + 10 * k, qiao: base - 2 * k, xi: base - 8 },
    { li: base - 4 * k, su: base - 2 * k, qiao: base + 10 * k, xi: base - 10 }
  ];
}

/** 用对手流程打斗的一方 */
export function asFoe(p: Person, sc: Scale, spar = false): Foe {
  const m = dmgMul(p, sc), hu = hutiOf(p, sc);
  const atk = sc2([55, 80], m * sc.foeAtk);
  return {
    name: p.name, tier: p.tier, hpMax: hpOf(p, sc) * hu * sc.foeHp, atk, big: ((atk[0] + atk[1]) / 2) * sc.bigK,
    tells: tellsOf(p, sc), gongli: p.gongli, dodge: Math.min(0.3, 0.14 + 0.015 * (p.qinggong - 1) + sc.shenDodge * (p.attr.shen - 20)), parry: 0.2, spar,
    dan: p.attr.dan, yan: yanOf(p, sc)
  };
}
