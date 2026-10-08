/**
 * 战斗内核：纯函数、用带种子的随机数，不碰界面。门派对打的模拟和以后的实战共用这一套。
 * 每条规则对应 docs/menpai.md 第五节的一行，tests/combat.test.ts 逐条验证。
 *
 * 每一合：
 * 1. 合初：中毒、灼烧、流血掉血（不吃护体、卸力）；内功被动回血、涨怒（内力见底时失效）；回内力；调息。
 * 2. 定先后：闪避高的先出手，寒气在身的一定后手。
 * 3. 依次出手：被点穴就跳过；蓄势的重招这一合才打出；否则按策略选招。
 * 4. 合末：这一合新上的状态不减，其余各减一合；势回落到五十。
 * 5. 满三十合不分胜负，按剩下的气血比例判，相差不到 2% 算平手。
 */
import type { FxDef, FxKind, SkillNature } from '../content/types';
import type { Rng } from './rng';
import { counterBonus, fxCost } from './wuxue';

/** 一招：绝招、普通招式或杀招 */
export interface Move {
  name: string;
  mp: number;
  cd: number;
  hits: number;
  dmg: [number, number];
  acc: number;
  fx: FxDef[];
  /** 要先蓄势一合的重招 */
  heavy?: boolean;
  /** 杀招：必中，不用蓄势 */
  sure?: boolean;
}

/** 一个人上阵时的全部本事（由搭配算出，见 build.ts） */
export interface Kit {
  name: string;
  hpMax: number;
  mpMax: number;
  /** 每合回内力 */
  mpRegen: number;
  nature?: SkillNature;
  /** 轻功给的闪避（0 到 0.5，含轻功的身法被动） */
  dodge: number;
  /** 命中加成（合璧的火候） */
  hit: number;
  /** 内功（和合璧）的被动：护体 %、身法 %、每合回血、每合怒气。内力见底时失效 */
  passive: { guard: number; haste: number; heal: number; rage: number };
  /** 合璧里的减益：开战时施加给对手 */
  openers: FxDef[];
  /** 能用的绝招（已按境界、内功为根筛过） */
  moves: Move[];
  basic: Move;
  ult?: Move;
  /** 出招偏好：本门招牌效果的权重 */
  bias?: Partial<Record<FxKind, number>>;
}

type Timed = 'busy' | 'bleed' | 'poison' | 'burn' | 'chill' | 'weaken' | 'break' | 'disarm' | 'guard' | 'haste';
interface Status { v: number; r: number; fresh: boolean }

export interface Fighter {
  kit: Kit;
  hp: number;
  mp: number;
  rage: number;
  /** 势：五十为平，震慑使它下降；每差一点，命中、闪避差 0.3% */
  shi: number;
  cd: number[];
  st: Partial<Record<Timed, Status>>;
  /** 正在蓄势的重招序号加一；0 表示没有 */
  windup: number;
  /** 解穴、复械后免疫点穴、缴械的剩余合数 */
  immune: number;
}

export interface Combat {
  round: number;
  maxRounds: number;
  f: [Fighter, Fighter];
  rng: Rng;
  /** 结果：0 或 1 是赢家，0.5 是平手 */
  result?: 0 | 1 | 0.5;
}

export type Action = { kind: 'basic' } | { kind: 'move'; i: number } | { kind: 'ult' };
export type Chooser = (c: Combat, me: Fighter, op: Fighter) => Action;

const DOT: Timed[] = ['poison', 'burn', 'bleed'];
const SELF: FxKind[] = ['guard', 'haste', 'heal', 'rage'];
const CONTROL: FxKind[] = ['busy', 'disarm'];
/** 内力低于上限的这个比例，内功被动失效 */
export const MP_FLOOR = 0.15;
const CAP = 50;
/**
 * 可调的规则参数（对战模拟调平衡用；改了要跑 npm run balance 和 tests/combat.test.ts）。
 * - flatCut：被卸力的人，每一击再减「卸力值 × flatCut」点
 * - minTaken：护体、卸力等各种减伤叠在一起，一击至少还剩这么多（防止减伤叠满，越拖越稳变成万能打法）
 * - chillSlowsCd：寒气在身时调息也减半。对战模拟显示这一条让带寒气的门派对谁都赢九成以上（寒气当量每合只算 25），默认关闭
 */
export const TUNE = { flatCut: 1, minTaken: 0, chillSlowsCd: false, chillHalvesDodge: true, nature: 1 };

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const roll = (rng: Rng, [lo, hi]: [number, number]): number => lo + rng() * (hi - lo);

export function fighter(kit: Kit): Fighter {
  return { kit, hp: kit.hpMax, mp: kit.mpMax, rage: 0, shi: 50, cd: kit.moves.map(() => 0), st: {}, windup: 0, immune: 0 };
}

export function createCombat(a: Kit, b: Kit, rng: Rng, maxRounds = 30): Combat {
  const c: Combat = { round: 0, maxRounds, f: [fighter(a), fighter(b)], rng };
  // 合璧里的减益，开战时施加给对手
  c.f.forEach((me, i) => { for (const fx of me.kit.openers) apply(c, me, c.f[1 - i], fx, false); });
  return c;
}

/* ---------- 读数 ---------- */

const passiveOn = (f: Fighter): boolean => f.mp >= f.kit.mpMax * MP_FLOOR;

/** 闪避：轻功加身法；中毒或寒气在身时减半（毒滞身法），上限 50% */
export function dodgeOf(f: Fighter): number {
  let d = f.kit.dodge + ((passiveOn(f) ? f.kit.passive.haste : 0) + (f.st.haste?.v ?? 0)) / 100;
  if (f.st.poison || (TUNE.chillHalvesDodge && f.st.chill)) d /= 2;
  return clamp(d, 0, CAP / 100);
}

/** 护体：内功被动加绝招护体，上限 50%；内力见底时被动部分失效 */
export const guardOf = (f: Fighter): number => Math.min(CAP, (passiveOn(f) ? f.kit.passive.guard : 0) + (f.st.guard?.v ?? 0));

/** 挨打的倍数：破绽先抵护体，每 1% 破绽抵 2% 护体，抵完剩下的才加伤害 */
export function takenMul(f: Fighter): number {
  const net = guardOf(f) - 2 * (f.st.break?.v ?? 0);
  return net >= 0 ? 1 - net / 100 : 1 + -net / 200;
}

/** 出手的倍数：缴械只剩六成；被卸力按比例降低 */
export const dealtMul = (f: Fighter): number => (f.st.disarm ? 0.6 : 1) * (1 - (f.st.weaken?.v ?? 0) / 100);

/** 被卸力的人，每一击还要再减去卸力值那么多点（卸力按击算） */
export const flatCut = (f: Fighter): number => (f.st.weaken?.v ?? 0) * TUNE.flatCut;

/** 一击的命中率 */
export function hitChance(me: Fighter, op: Fighter, m: Move): number {
  if (m.sure) return 1;
  const p = m.acc + me.kit.hit + counterBonus(me.kit.nature, op.kit.nature) * TUNE.nature + (me.shi - op.shi) * 0.003 - dodgeOf(op);
  return clamp(p, 0.05, 0.95);
}

/* ---------- 效果 ---------- */

/** 施加一个效果。fromMove 为真时，疗伤顺带驱毒（被动回血不驱毒） */
export function apply(c: Combat, me: Fighter, op: Fighter, fx: FxDef, fromMove = true): boolean {
  const k = fx.kind;
  let p = fx.chance ?? 1;
  if (CONTROL.includes(k)) {
    if (op.immune > 0) return false;
    if (me.st.weaken) p /= 2; // 粘劲：被卸力的人点穴、缴械几率减半
    p *= 1 - dodgeOf(op); // 身法闪控：每招只判一次
  }
  if (p < 1 && c.rng() >= p) return false;
  const v = fx.value ?? 0, r = fx.rounds ?? 1;
  const put = (who: Fighter, kind: Timed, val: number): void => {
    const cur = who.st[kind];
    // 同一种效果不叠加：取大的数值、长的合数
    who.st[kind] = { v: Math.max(cur?.v ?? 0, val), r: Math.max(cur?.r ?? 0, r), fresh: true };
  };
  switch (k) {
    case 'busy': case 'disarm':
      put(op, k, 0);
      op.windup = 0; // 蓄势被打断，这一招落空
      break;
    case 'poison': case 'burn': case 'bleed': case 'chill': case 'weaken': case 'break':
      put(op, k, v);
      break;
    case 'guard': case 'haste':
      put(me, k, v);
      break;
    case 'fear':
      op.shi = Math.max(5, op.shi - v);
      break;
    case 'drain': {
      const got = Math.min(v, op.mp);
      op.mp -= got;
      me.mp = Math.min(me.kit.mpMax, me.mp + got);
      break;
    }
    case 'heal':
      me.hp = Math.min(me.kit.hpMax, me.hp + v);
      if (fromMove) for (const d of DOT) { const s = me.st[d]; if (s) { s.r -= 2; if (s.r <= 0) delete me.st[d]; } }
      break;
    case 'rage':
      me.rage = Math.min(100, me.rage + v);
      break;
  }
  return true;
}

/* ---------- 出手 ---------- */

/** 打出一招：逐击判命中、算伤害；至少一击打中，效果才施加一次 */
export function strike(c: Combat, me: Fighter, op: Fighter, m: Move, mul = 1): number {
  let landed = 0, total = 0;
  for (let h = 0; h < m.hits; h++) {
    if (c.rng() >= hitChance(me, op, m)) continue;
    landed++;
    const raw = roll(c.rng, m.dmg) * mul;
    const d = Math.max(1, Math.round(Math.max(raw * TUNE.minTaken, (raw * dealtMul(me) - flatCut(me)) * takenMul(op))));
    op.hp -= d;
    total += d;
  }
  me.rage = Math.min(100, me.rage + 4 * landed);
  op.rage = Math.min(100, op.rage + 6 * landed);
  const ok = m.hits === 0 ? c.rng() < hitChance(me, op, m) : landed > 0;
  if (ok) for (const fx of m.fx) apply(c, me, op, fx);
  // 自身的增益（护体、身法、疗伤、怒气）不看打没打中
  if (!ok) for (const fx of m.fx) if (SELF.includes(fx.kind)) apply(c, me, op, fx);
  return total;
}

/** 一个人这一合的行动 */
export function act(c: Combat, me: Fighter, op: Fighter, a: Action): void {
  const busy = me.st.busy;
  if (busy) {
    me.windup = 0;
    if (--busy.r <= 0) { delete me.st.busy; me.immune = 2; }
    return;
  }
  if (me.windup) {
    const m = me.kit.moves[me.windup - 1];
    me.windup = 0;
    strike(c, me, op, m, 1.2); // 蓄势而发，伤害加两成
    return;
  }
  if (a.kind === 'ult' && me.kit.ult && me.rage >= 100) {
    strike(c, me, op, me.kit.ult);
    me.rage = 0;
    return;
  }
  if (a.kind === 'move') {
    const m = me.kit.moves[a.i];
    if (m && me.cd[a.i] === 0 && me.mp >= m.mp) {
      me.mp -= m.mp;
      me.cd[a.i] = m.cd;
      if (m.heavy) { me.windup = a.i + 1; return; } // 蓄势一合，算进调息
      strike(c, me, op, m);
      return;
    }
  }
  strike(c, me, op, me.kit.basic);
}

function startOfRound(c: Combat, f: Fighter): void {
  for (const d of DOT) if (f.st[d]) f.hp -= f.st[d]!.v;
  if (passiveOn(f)) {
    f.hp = Math.min(f.kit.hpMax, f.hp + f.kit.passive.heal);
    f.rage = Math.min(100, f.rage + f.kit.passive.rage);
  }
  f.mp = Math.min(f.kit.mpMax, f.mp + f.kit.mpRegen);
  // 寒气在身，可选：调息减半（隔一合才减一）。默认关闭：太强，见 TUNE
  if (!TUNE.chillSlowsCd || !f.st.chill || c.round % 2 === 0) f.cd = f.cd.map(x => Math.max(0, x - 1));
}

/** 合末：这一合新上的状态不减，其余各减一合；势回落（实战界面每合也调用） */
export function endOfRound(f: Fighter): void {
  for (const k of Object.keys(f.st) as Timed[]) {
    if (k === 'busy') continue; // 点穴按「跳过几次出手」计
    const s = f.st[k]!;
    if (s.fresh) { s.fresh = false; continue; }
    if (--s.r <= 0) {
      delete f.st[k];
      if (k === 'disarm') f.immune = 2;
    }
  }
  if (f.immune > 0) f.immune--;
  f.shi += Math.sign(50 - f.shi) * Math.min(5, Math.abs(50 - f.shi));
}

const dead = (c: Combat): boolean => {
  const [a, b] = c.f;
  if (a.hp <= 0 || b.hp <= 0) { c.result = a.hp <= 0 && b.hp <= 0 ? 0.5 : a.hp <= 0 ? 1 : 0; return true; }
  return false;
};

/** 打一合 */
export function step(c: Combat, choose: Chooser): void {
  if (c.result !== undefined) return;
  c.round++;
  for (const f of c.f) startOfRound(c, f);
  if (dead(c)) return;
  const [a, b] = c.f;
  const ia = (a.st.chill ? -1 : 0) + dodgeOf(a) + c.rng() * 0.1;
  const ib = (b.st.chill ? -1 : 0) + dodgeOf(b) + c.rng() * 0.1;
  const order: [Fighter, Fighter][] = ia >= ib ? [[a, b], [b, a]] : [[b, a], [a, b]];
  for (const [me, op] of order) {
    act(c, me, op, choose(c, me, op));
    if (dead(c)) return;
  }
  for (const f of c.f) endOfRound(f);
  if (c.round >= c.maxRounds) {
    const ra = a.hp / a.kit.hpMax, rb = b.hp / b.kit.hpMax;
    c.result = Math.abs(ra - rb) < 0.02 ? 0.5 : ra > rb ? 0 : 1;
  }
}

/** 打到分出胜负，返回结果 */
export function fight(c: Combat, choose: Chooser): 0 | 1 | 0.5 {
  while (c.result === undefined) step(c, choose);
  return c.result;
}

/* ---------- 出招策略 ---------- */

/** 一招在当前局面下值多少（伤害当量）。所有门派共用这一个评估器，只有本门招牌的权重略高 */
export function moveValue(c: Combat, me: Fighter, op: Fighter, m: Move): number {
  const p = m.hits ? hitChance(me, op, m) : 1;
  let v = m.hits * ((m.dmg[0] + m.dmg[1]) / 2) * p * dealtMul(me) * takenMul(op) * (m.heavy ? 1.2 : 1);
  for (const fx of m.fx) {
    let x = fxCost(fx);
    const k = fx.kind;
    const has = (SELF.includes(k) ? me : op).st[k as Timed];
    if (has && has.r > 1) x = 0; // 还在身上，不重复上
    if (CONTROL.includes(k)) {
      if (op.immune > 0) x = 0;
      else {
        x *= (1 - dodgeOf(op)) * (me.st.weaken ? 0.5 : 1);
        if (op.windup) x += moveValue(c, op, me, op.kit.moves[op.windup - 1]); // 打断蓄势
      }
    }
    if (k === 'heal') x *= Math.min(1, 2 * (1 - me.hp / me.kit.hpMax));
    if (k === 'break') x *= 1 + guardOf(op) / 100;
    if (k === 'drain') x *= Math.min(1, op.mp / Math.max(1, fx.value ?? 1));
    v += x * (me.kit.bias?.[k] ?? 1) * (m.hits ? p : 1);
  }
  return v;
}

/** 默认策略：怒气满放杀招；否则在能用的绝招和普通招式里，挑「当量 − 内力的机会成本」最高的 */
export const greedy: Chooser = (c, me, op) => {
  if (me.kit.ult && me.rage >= 100) return { kind: 'ult' };
  let best: Action = { kind: 'basic' };
  let bestV = moveValue(c, me, op, me.kit.basic);
  me.kit.moves.forEach((m, i) => {
    if (me.cd[i] > 0 || me.mp < m.mp) return;
    const v = moveValue(c, me, op, m) - 0.5 * m.mp;
    if (v > bestV) { bestV = v; best = { kind: 'move', i }; }
  });
  return best;
};
