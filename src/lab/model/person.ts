/**
 * 「人」：地基第二版的人物模型（验证用）。
 * - 先天四项：膂力、根骨、身法、悟性，总和 80，常人各 20；后天 = 先天 + 对应武功重数 × 2。
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

export interface Attr { li: number; gen: number; shen: number; wu: number }
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
  /** 偏科：主修那一项根基高出多少（先天总和仍是 80） */
  bias: number;
  /** 对手（用对手流程打的人）气血、出手的倍数：玩家一方另有绝招、破绽、反击，所以对手要厚一些 */
  foeHp: number;
  foeAtk: number;
  /** 重招伤害是普通出手的几倍 */
  bigK: number;
}

/** 第二轮标定的结果（tests/model.test.ts 记着怎样标出来的） */
export const SCALE0: Scale = { realmQ: 1.02, hpQ: 1.07, jiali: 0.07, hut: 0.07, hhPerRealm: 6, tellSpread: 2.5, bias: 6, foeHp: 5.5, foeAtk: 1, bigK: 3.5 };

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
  // 偏科的根基：主修那一项高 bias，另三项各低 bias/3，总和仍是 80
  const d = build === 'even' ? 0 : bias, o = -d / 3;
  const attr = build === 'outer' ? { li: 20 + d / 2, gen: 20 + o, shen: 20 + o, wu: 20 + d / 2 + o }
    : build === 'inner' ? { li: 20 + o, gen: 20 + d, shen: 20 + o, wu: 20 + o }
    : build === 'light' ? { li: 20 + o, gen: 20 + o, shen: 20 + d, wu: 20 + o }
    : { li: 20, gen: 20, shen: 20, wu: 20 };
  // 内功为主的人打坐多，功力深一些；轻功、外功为主的浅一些
  const g = gongliAt(t) * (build === 'inner' ? 1.4 : build === 'even' ? 1 : 0.85);
  return { name, tier: t, outer: pick('outer'), neigong: pick('inner'), qinggong: pick('light'), gongli: g, attr, grade: 1 };
}

/** 后天根基 */
export function houtian(p: Person): Attr {
  return { li: p.attr.li + 2 * p.outer, gen: p.attr.gen + 2 * p.neigong, shen: p.attr.shen + 2 * p.qinggong, wu: p.attr.wu + 2 * p.outer };
}

/** 功力的倍数：以一年半为一，翻一倍乘 2^ε */
const gk = (g: number, eps: number): number => Math.pow(Math.max(0.1, g) / 1.5, eps);

/** 出手的倍数：境界 × 品级 × 膂力 × 加力 × 装备 */
export function dmgMul(p: Person, sc: Scale): number {
  const h = houtian(p);
  return 0.8 * Math.pow(sc.realmQ, p.outer - 1) * p.grade * (1 + 0.01 * (h.li - 20)) * gk(p.gongli, sc.jiali) * (p.gear?.atk ?? 1);
}

/** 气血上限 */
export function hpOf(p: Person, sc: Scale): number {
  const h = houtian(p);
  return 600 * Math.pow(sc.hpQ, p.neigong - 1) * (1 + 0.01 * (h.gen - 20));
}

/** 护体：挨打时伤害除以它 */
export function hutiOf(p: Person, sc: Scale): number {
  return gk(p.gongli, sc.hut) * (p.gear?.def ?? 1);
}

/** 火候：这门武功的重数 × 10 × 品级，加上对应的后天根基 */
export function hhOf(p: Person, sc: Scale): Record<'block' | 'dodge' | 'parry' | 'rush', number> {
  const h = houtian(p), k = sc.hhPerRealm;
  return {
    block: k * (p.neigong - 1) * p.grade + h.gen,
    dodge: k * (p.qinggong - 1) * p.grade + h.shen,
    parry: k * (p.outer - 1) * p.grade + h.wu,
    rush: k * (p.outer - 1) * p.grade + h.shen - 10
  };
}

const sc2 = (r: [number, number], k: number): [number, number] => [r[0] * k, r[1] * k];

/** 用玩家流程打斗的一方 */
export function asHero(p: Person, sc: Scale): Hero {
  const m = dmgMul(p, sc), hu = hutiOf(p, sc);
  // 护体折进气血：挨打打折，等于气血变厚
  const hp = hpOf(p, sc) * hu;
  const mpMax = p.gongli * 100;
  return {
    name: p.name, tier: p.tier, hpMax: hp, floor: 0, mpMax, mpRegen: mpMax * 0.04, gongli: p.gongli,
    auto: sc2([55, 80], m), open: sc2([200, 240], m),
    counter: { block: sc2([80, 110], m), parry: sc2([60, 90], m), rush: sc2([220, 280], m) },
    hh: hhOf(p, sc), dodge: Math.min(0.35, 0.2 + 0.015 * (p.qinggong - 1)), parry: 0.15,
    performs: [
      { name: '绝招一', dmg: sc2([150, 190], m), mp: Math.round(0.15 * mpMax), cd: 3, acc: 0.85 },
      { name: '绝招二', dmg: sc2([220, 280], m), mp: Math.round(0.25 * mpMax), cd: 5, acc: 0.8 }
    ],
    ult: sc2([520, 600], m), rage0: 30, wu: houtian(p).wu
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
    tells: tellsOf(p, sc), gongli: p.gongli, dodge: Math.min(0.3, 0.14 + 0.015 * (p.qinggong - 1)), parry: 0.2, spar
  };
}
