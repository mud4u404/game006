/**
 * 人：玩家和所有人物同一套（docs/foundation.md 第三节第一条）。
 *
 * - 先天五项根基：体魄、根骨、身法、悟性、胆魄，常人各二十。
 * - 后天 = 先天 + 武功练出来的：内功长体魄和根骨，轻功长身法，外功长悟性和胆魄（每重两点，和模拟一致）。
 *   后天只进火候和气血；多出来的天赋（护体、闪避、怒气、开局的势）只看先天，不随境界涨，免得境界被多算一遍。
 * - 功力以年计，一年一百点内力。
 * - 三门武功的重数（1 到 9）：出手的外功、内功、轻功。
 *
 * 数都由模拟验证过（src/lab/model，npm run model）：同档胜负五五开，高一档胜八成多，
 * 五项根基各高出常人十点，同档胜率各多四到九个点。
 */
import type { AttrKey } from '../content/types';

export type Attr = Record<AttrKey, number>;
export const ATTR_KEYS: AttrKey[] = ['体魄', '根骨', '身法', '悟性', '胆魄'];
/** 常人的根基 */
export const COMMON = 20;
/** 根基的上限 */
export const ATTR_MAX = 50;

/** 档次：不入流到宗师。每档一重半，功力每档约翻一倍 */
export const TIER_NAMES = ['不入流', '三流', '二流', '一流', '绝顶', '宗师'];
/** 第几档要练到的重数（1 起）：等距，每档一重半 */
export const realmAt = (t: number): number => 1 + 1.5 * t;
/** 第几档的功力（年）：不入流一年半，宗师六十年上下 */
export const gongliAt = (t: number): number => 1.5 * Math.pow(2.13, t);

export interface Person {
  name: string;
  /** 先天根基 */
  attr: Attr;
  /** 出手的外功、内功、轻功的重数（1 到 9，没有就是 1） */
  outer: number;
  neigong: number;
  qinggong: number;
  /** 三门武功的品级系数（凡品 0.9 到禁品 1.6） */
  grade: { outer: number; neigong: number; qinggong: number };
  /** 功力（年） */
  gongli: number;
  /** 身上的装备加起来的数（engine/zhuangbei.ts 的 gearBonus）；不写为没有装备 */
  gear?: Gear;
}

/**
 * 装备：锦上添花（docs/zhuangbei.md 第三节）。出手、护体各乘 1 + 它/100，闪避加几个百分点，内力上限加几点，后天根基加几点。
 * 和地基第三版的模型一样（src/lab/model/person.ts 的 gear），一身装备最多八分上下，同档胜率只多十来个点。
 */
export interface Gear { chushou?: number; huti?: number; shanbi?: number; neili?: number; attr?: Partial<Attr> }

/** 一把尺子的刻度（每一个怎样标出来的，见 src/lab/model/README.md 第二十四到二十八轮） */
export interface Scale {
  /** 每重外功，出手乘多少 */
  realmQ: number;
  /** 每重内功，气血乘多少 */
  hpQ: number;
  /** 功力翻一倍，加力、护体各乘 2^这个数 */
  jiali: number;
  hut: number;
  /** 应对的火候：武功每重加多少 */
  hhPerRealm: number;
  /** 重招四项强度拉开多少 */
  tellSpread: number;
  /** 对手（用对手流程打的人）气血的倍数：玩家另有绝招、破绽、反击，所以对手要厚一些 */
  foeHp: number;
  /** 重招伤害是普通出手的几倍 */
  bigK: number;
  /** 天赋：先天每高常人一点，体魄加气血、根骨加护体、身法加闪避、胆魄加怒气 */
  tiHp: number;
  genHut: number;
  shenDodge: number;
  danRage: number;
}

export const SCALE: Scale = {
  realmQ: 1.04, hpQ: 1.065, jiali: 0.07, hut: 0.07, hhPerRealm: 5.5, tellSpread: 2.5, foeHp: 5.6, bigK: 3.5,
  tiHp: 0.01, genHut: 0.005, shenDodge: 0.0015, danRage: 0.015
};

/** 常人：五项都是二十 */
export const commonAttr = (): Attr => ({ 体魄: COMMON, 根骨: COMMON, 身法: COMMON, 悟性: COMMON, 胆魄: COMMON });

/** 后天根基：先天，加上武功练出来的，加上装备给的 */
export function houtian(p: Person): Attr {
  const a = p.attr, g = (k: AttrKey): number => p.gear?.attr?.[k] ?? 0;
  return {
    体魄: a.体魄 + 2 * p.neigong + g('体魄'), 根骨: a.根骨 + 2 * p.neigong + g('根骨'), 身法: a.身法 + 2 * p.qinggong + g('身法'),
    悟性: a.悟性 + 2 * p.outer + g('悟性'), 胆魄: a.胆魄 + 2 * p.outer + g('胆魄')
  };
}

/** 装备的倍数：出手、护体 */
const gearK = (p: Person, k: 'chushou' | 'huti'): number => 1 + (p.gear?.[k] ?? 0) / 100;

/** 功力的倍数：以一年半为一，翻一倍乘 2^ε */
const gk = (g: number, eps: number): number => Math.pow(Math.max(0.1, g) / 1.5, eps);

/** 出手的倍数：外功境界 × 品级 × 加力（功力）× 兵器 */
export const dmgMul = (p: Person, sc = SCALE): number => 0.8 * Math.pow(sc.realmQ, p.outer - 1) * p.grade.outer * gk(p.gongli, sc.jiali) * gearK(p, 'chushou');

/** 护体：挨打时伤害除以它（功力深、根骨好的人挨得住；衣、冠再添一点） */
export const hutiOf = (p: Person, sc = SCALE): number => gk(p.gongli, sc.hut) * (1 + sc.genHut * (p.attr.根骨 - COMMON)) * gearK(p, 'huti');

/** 气血上限：内功垫底子，随境界涨的部分（后天体魄每点一分）加上天赋，再乘护体 */
export function hpMaxOf(p: Person, sc = SCALE): number {
  const h = houtian(p);
  const base = 600 * Math.pow(sc.hpQ, p.neigong - 1) * (1 + 0.01 * (h.体魄 - p.attr.体魄)) * (1 + sc.tiHp * (p.attr.体魄 - COMMON));
  return Math.round(base * hutiOf(p, sc));
}

/** 内力上限：功力一年一百点，根骨好的人经脉宽，存得多一些；佩饰再添几点 */
export const mpMaxOf = (p: Person): number => Math.round(p.gongli * 100 * (1 + 0.01 * (p.attr.根骨 - COMMON)) + (p.gear?.neili ?? 0));

export type BaseResp = 'block' | 'dodge' | 'parry' | 'rush';
/** 每种应对看哪项根基：根骨硬接、身法闪避、悟性拆招、胆魄抢攻 */
export const RESP_ATTR: Record<BaseResp, AttrKey> = { block: '根骨', dodge: '身法', parry: '悟性', rush: '胆魄' };

/** 火候：负责这种应对的那门武功的重数 × 每重 × 品级，加上对应的后天根基 */
export function huohouOf(p: Person, sc = SCALE): Record<BaseResp, number> {
  const h = houtian(p), k = sc.hhPerRealm;
  return {
    block: k * (p.neigong - 1) * p.grade.neigong + h.根骨,
    dodge: k * (p.qinggong - 1) * p.grade.qinggong + h.身法,
    parry: k * (p.outer - 1) * p.grade.outer + h.悟性,
    rush: k * (p.outer - 1) * p.grade.outer + h.胆魄 - 10
  };
}

/** 闪避普通出手的几率：轻功每重一点五分，身法的天赋另加，靴子再添几个百分点 */
export const dodgeOf = (p: Person, base: number, cap: number, sc = SCALE): number =>
  Math.min(cap, base + 0.015 * (p.qinggong - 1) + sc.shenDodge * (p.attr.身法 - COMMON) + (p.gear?.shanbi ?? 0) / 100);

/** 交手用的档次（连续的）：看练得最高的那门武功，差距压制按它算 */
export const tierCont = (p: Person): number => Math.max(0, Math.min(5, (Math.max(p.outer, p.neigong, p.qinggong) - 1) / 1.5));

/** 显示的档次：练得最高的那门武功到了这一档的重数，功力也够这一档的一半 */
export function tierOf(p: Person): number {
  const R = Math.max(p.outer, p.neigong, p.qinggong);
  let t = 0;
  for (let k = 1; k <= 5; k++) if (R >= realmAt(k) - 1e-9 && p.gongli >= gongliAt(k) * 0.5) t = k;
  return t;
}

/** 档次的名称 */
export const tierName = (t: number): string => TIER_NAMES[Math.max(0, Math.min(5, Math.floor(t + 1e-9)))];

export type Build = 'even' | 'outer' | 'inner' | 'light';

/**
 * 标准人：档次 t、路数（偏科）。写对手时只写「几档、什么路数」，数值由这里算出来。
 * 偏科的人主修那门在本档的重数，另两门各低一重；先天主项高 bias，其余分摊着低一些，总和不变。
 */
export function standard(t: number, build: Build = 'even', name = tierName(t), bias = 6, grade = 1): Person {
  const R = realmAt(t), lo = Math.max(1, R - 1);
  const pick = (b: Build): number => (build === 'even' || build === b ? R : lo);
  const up: AttrKey[] = build === 'outer' ? ['体魄', '悟性'] : build === 'inner' ? ['根骨'] : build === 'light' ? ['身法'] : [];
  const d = build === 'even' ? 0 : bias;
  const attr = commonAttr();
  for (const k of ATTR_KEYS) attr[k] += up.includes(k) ? d / up.length : -d / (5 - up.length);
  // 内功为主的人打坐多，功力深一些；轻功、外功为主的浅一些
  const g = gongliAt(t) * (build === 'inner' ? 1.4 : build === 'even' ? 1 : 0.85);
  return { name, attr, outer: pick('outer'), neigong: pick('inner'), qinggong: pick('light'), gongli: g, grade: { outer: grade, neigong: grade, qinggong: grade } };
}
