/**
 * 交手：一套规则，实战界面和模拟器共用（docs/foundation.md 第三节第二、五条）。
 *
 * 流程（和原来的实战一样，界面不变）：
 * - 每合一个 tick；「势」决定这一合谁出手；
 * - 每隔四到六合，对手出一次重招：预兆的文字不分虚实，玩家以己之长应对，每种应对带成算；
 * - 应对得手：硬接反震、拆招还一记、抢攻重创、闪避之后露出破绽；
 * - 双方出手以后可能露出破绽，稍纵即逝；
 * - 玩家另有绝招（耗内力、要调息）、杀招（怒气满）、运功蓄力、金疮药、飞蝗石、逃跑、认输。
 *
 * 验证过的规则（src/lab/model，npm run model）：
 * - 成算是一条不会顶满的 S 形曲线（尺度 26），招式四项强度拉开，以己之长比固定套路高三十个点；
 * - 差距压制：差一档以上的部分，伤害乘 2/3 的平方次；
 * - 伤落三处（手、足、内息），只在吃了重招时落下，这一场只记下，打完才起作用；
 * - 耗内力按内力上限的比例；
 * - 胆魄定开局的势；
 * - 虚实（随机应变）：会家子的重招有虚有实，硬接最怕虚招，拆招最不怕；看破了就乘虚而入；
 * - 帮手看得见：答应来的人真的进场出手，伤害记在明处；
 * - 点穴只定一合，冲开以后三合之内点不中；
 * - 围攻：围着的人出手打三五折；乌合之众见同伙倒下会溜。
 *
 * 引擎只出「事件」，不写文字、不碰界面；文字由界面按内容去写（ui/fight.ts）。种子固定，结果可以重放。
 */
import type { FxDef, FxKind } from '../content/types';
import type { Rng } from './rng';
import { COMMON, SCALE, dmgMul, dodgeOf, hpMaxOf, huohouOf, mpMaxOf, tierCont, type BaseResp, type Person } from './person';

export type RespKey = BaseResp;
export const RESP_KEYS: RespKey[] = ['block', 'dodge', 'parry', 'rush'];
export const RESP_NAME: Record<RespKey, string> = { block: '硬接', dodge: '闪避', parry: '拆招', rush: '抢攻' };
/** 重招的四项强度：力、速、巧、隙。硬接比力，闪避比速，拆招比巧，抢攻比隙 */
export interface Pw { li: number; su: number; qiao: number; xi: number }
export const RESP_PW: Record<RespKey, keyof Pw> = { block: 'li', dodge: 'su', parry: 'qiao', rush: 'xi' };
/** 三处伤：手、足、内息 */
export type Zone = 'hand' | 'foot' | 'inner';
export type Wounds = Record<Zone, number>;
export const NO_WOUNDS: Wounds = { hand: 0, foot: 0, inner: 0 };
export const ZONE_OF: Record<RespKey, Zone> = { block: 'inner', dodge: 'foot', parry: 'hand', rush: 'hand' };
export const ZONE_NAME: Record<Zone, string> = { hand: '手', foot: '足', inner: '内息' };
/** 碰上虚招，各种应对还应付得过去的几率 */
export const VS_FEINT: Record<RespKey, number> = { block: 0.1, rush: 0.3, dodge: 0.5, parry: 0.7 };

export interface Rules {
  /** 成算曲线的尺度：火候差多少，成算从五成变到约七成三 */
  scale: number;
  /** 差距压制的底数 */
  supBase: number;
  /** 每级伤减多少火候 */
  woundHh: number;
  /** 虚招最多占几成（二流以上的对手用足，三流一半，不入流不用） */
  xushi: number;
  /** 点穴冲开以后几合之内点不中；一次最多定几合 */
  holdImmune: number;
  holdMax: number;
  /** 围攻：眼前之外的人，每合出手的几率 */
  crowdEff: number;
  /** 树倒猢狲散：同伙倒下一个，剩下的每人有几成溜走 */
  morale: number;
}
export const RULES: Rules = { scale: 26, supBase: 2 / 3, woundHh: 9, xushi: 0.25, holdImmune: 3, holdMax: 1, crowdEff: 0.35, morale: 0 };

const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
const sig = (x: number): number => 1 / (1 + Math.exp(-x));
const rr = (rng: Rng, [a, b]: [number, number]): number => a + rng() * (b - a);
const scl = (r: [number, number], k: number): [number, number] => [r[0] * k, r[1] * k];

/** 成算：S 形曲线，不会顶满 */
export function odds(rules: Rules, k: RespKey, hh: number, strength: number): number {
  const base = k === 'rush' ? 0.35 : 0.5;
  return sig(Math.log(base / (1 - base)) + (hh - strength) / rules.scale);
}

/** 差距压制：attacker 打 defender 时伤害的倍数（差一档以内不压） */
export function suppress(rules: Rules, atkTier: number, defTier: number): number {
  const d = defTier - atkTier;
  return d <= 1 ? 1 : Math.pow(rules.supBase, (d - 1) * (d - 1));
}

/** 伤势：这一场挨的重招占气血上限的比例，换算成级 */
export const woundLv = (frac: number): number => (frac >= 0.5 ? 3 : frac >= 0.3 ? 2 : frac >= 0.15 ? 1 : 0);

/** 对手出虚招的几率：二流以上用足，三流一半，不入流不用（虚招是会家子的本事） */
export const feintRate = (rules: Rules, foeTier: number): number => rules.xushi * clamp(foeTier / 2, 0, 1);

/* ---------- 双方 ---------- */

/** 绝招：伤害是基础值，乘出手的倍数；耗内力写的是按三百点内力算的数，实际按内力上限的比例扣 */
export interface PerformSpec { name: string; mp: number; cd: number; hits: number; dmg: [number, number]; acc: number; fx: FxDef[] }
export interface UltSpec { dmg: [number, number]; fx: FxDef[] }

export interface HeroSpec {
  person: Person;
  name?: string;
  /** 当前气血、内力；不写为满（内力八成） */
  hp?: number;
  hpMax?: number;
  mp?: number;
  mpMax?: number;
  /** 上一场带来的伤 */
  wounds?: Wounds;
  /** 哪些应对用得上（槽位里有那门武功） */
  has?: Partial<Record<RespKey, boolean>>;
  /** 克制：性质、兵器长短给各应对的成算加减 */
  bonus?: Partial<Record<RespKey, number>>;
  performs?: PerformSpec[];
  ult?: UltSpec;
}

/** 对手的一记重招：主要是哪一项（力、速、巧），强度由对手的火候算出来 */
export type TellDom = 'li' | 'su' | 'qiao';

export interface FoeSpec {
  person: Person;
  name: string;
  /** 重招：内容里每一招的主项 */
  tells: TellDom[];
  firstTell?: number;
  /** 切磋：打到三成即止 */
  spar?: boolean;
  /** 撑满这么多合不倒，也算赢（考校「接三十招」） */
  rounds?: number;
  /** 剧本战：rescue 由人救下（对手不死），cup 打到底线时有人出手 */
  script?: 'rescue' | 'cup';
  /** 首领：气血过半以后狂怒 */
  phase2?: boolean;
  /** 知彼：对手普通出手、重招的倍数 */
  atkMul?: number;
  bigMul?: number;
  /** 虚招几率（不写按档次算） */
  feint?: number;
  /** 不是练家子：气血和出手都乘这个数 */
  weak?: number;
}

/** 帮手：答应来的人。share 是他一共替你打掉对手气血上限的几成，at 是他在第几合出手 */
export interface AllySpec { name: string; share: number; at: number[] }
/** 围攻：对手一共几个人，同时最多几个人出手 */
export interface Crowd { n: number; maxAtk: number }

export interface Opt { k: RespKey; p: number; cost: number; dis: boolean; /** 不算虚实时的成算 */ raw: number }

type FoeSt = 'busy' | 'bleed' | 'poison' | 'burn' | 'chill' | 'weaken' | 'break' | 'disarm';
type MeSt = 'guard' | 'haste';
interface Status { v: number; r: number; fresh: boolean }

/** 引擎吐出的事件，界面照着写文字、画动画 */
export type Ev =
  | { k: 'auto'; who: 'me' | 'foe'; res: 'hit' | 'dodge' | 'parry'; dmg: number; crit?: boolean; charging?: boolean; side?: boolean }
  | { k: 'held'; why: 'busy' | 'chill' }
  | { k: 'dot'; kind: 'bleed' | 'poison' | 'burn'; dmg: number }
  | { k: 'tell'; tell: number; pw: Pw; opts: Opt[]; feintRate: number; side: boolean }
  | { k: 'resp'; key: RespKey | null; ok: boolean; feint: boolean; instinct: boolean; p: number; dmg: number; dir: 'out' | 'in' | 'none'; side: boolean }
  | { k: 'opening' }
  | { k: 'open'; dmg: number }
  | { k: 'openMiss' }
  | { k: 'perform'; i: number; hit: boolean; dmg: number; fx: FxKind[] }
  | { k: 'ult'; dmg: number; fx: FxKind[] }
  | { k: 'ally'; i: number; name: string; n: number; dmg: number }
  | { k: 'phase2' }
  | { k: 'fallen'; left: number; fled: number }
  | { k: 'item'; kind: 'jcy' | 'dart'; v: number }
  | { k: 'fleeFail' }
  | { k: 'script'; what: 'rescue' | 'cup' }
  | { k: 'end'; res: DuelRes };

export type DuelRes = 'win' | 'lose' | 'flee' | 'yield';
export type Source = 'auto' | 'open' | 'counter' | 'perform' | 'ult' | 'ally' | 'dot' | 'item' | 'script';

export interface Prompt { tell: number; pw: Pw; opts: Opt[]; feint: boolean; side: boolean }

/** 一场下来记下的东西：模拟器量体感用，结算页也用 */
export interface DuelLog {
  decisions: number; prompts: number; openings: number;
  dealt: Partial<Record<Source, number>>; last: Source | null;
  swings: number; deficit: number; maxHeld: number;
  feints: number; saw: number; fooled: number;
  parry: number; open: number; ult: number;
  /** 这一场新落下的伤（打完以后起作用） */
  taken: Wounds;
}

/** 一场最多吃几包金疮药 */
export const JCY_MAX = 2;

export class Duel {
  readonly rules: Rules;
  readonly rng: Rng;
  readonly f: FoeSpec;
  readonly person: Person;
  /* 玩家 */
  hp: number; hpMax: number; mp: number; mpMax: number; mpRegen: number; rage: number; rageK: number;
  auto: [number, number]; open: [number, number]; counter: Record<'block' | 'parry' | 'rush', [number, number]>;
  hh: Record<RespKey, number | null>; bonus: Partial<Record<RespKey, number>>;
  dodge: number; parryP: number; dan: number; dmgK: number; tier: number;
  pre: Wounds; hurtBy: Record<Zone, number> = { hand: 0, foot: 0, inner: 0 };
  performs: PerformSpec[]; pcd: number[]; ultSpec?: UltSpec;
  meSt: Partial<Record<MeSt, Status>> = {};
  /** 运功：下一招的加成；正在蓄力时不能闪避 */
  charge = 0; charging = false;
  /* 对手 */
  ehp: number; ehpMax: number; atk: [number, number]; big: number; tells: Pw[]; eDodge: number; eParry: number; eDan: number; eTier: number;
  foeSt: Partial<Record<FoeSt, Status>> = {}; foeImmune = 0; phase = 1;
  feintR: number;
  /* 局面 */
  mom: number; round = 0; nextTell: number; lastTell = -1; heldRun = 0; lead = 0;
  /** 剧本战 rescue：接过第一记重招以后，再过两合有人出手 */
  rescueAt = Infinity;
  prompt: Prompt | null = null; opening = false; over = false; res: DuelRes | null = null;
  /** 剧本战：等界面演完，再由界面收场 */
  waiting = false;
  readonly floor: number; readonly efloor: number;
  allies: AllySpec[]; allyHits: number[];
  crowd: Crowd; left: number; sideTell: number[] = [];
  log: DuelLog;

  constructor(hero: HeroSpec, foe: FoeSpec, opts: { rng: Rng; rules?: Rules; allies?: AllySpec[]; crowd?: Crowd; sc?: typeof SCALE } = { rng: Math.random }) {
    const sc = opts.sc ?? SCALE;
    this.rules = opts.rules ?? RULES;
    this.rng = opts.rng;
    this.f = foe;
    const p = (this.person = hero.person);
    const m = (this.dmgK = dmgMul(p, sc));
    this.hpMax = hero.hpMax ?? hpMaxOf(p, sc);
    this.hp = Math.min(this.hpMax, hero.hp ?? this.hpMax);
    this.mpMax = hero.mpMax ?? mpMaxOf(p);
    this.mp = Math.min(this.mpMax, hero.mp ?? this.mpMax * 0.8);
    this.mpRegen = this.mpMax * 0.04;
    this.rage = Math.max(0, 30 + 1.5 * (p.attr.胆魄 - COMMON));
    this.rageK = 1 + sc.danRage * (p.attr.胆魄 - COMMON);
    this.auto = scl([55, 80], m);
    this.open = scl([200, 240], m);
    this.counter = { block: scl([100, 130], m), parry: scl([120, 150], m), rush: scl([220, 280], m) };
    const hh = huohouOf(p, sc);
    const has = hero.has ?? { block: true, dodge: true, parry: true, rush: true };
    this.hh = { block: has.block ? hh.block : null, dodge: has.dodge ? hh.dodge : null, parry: has.parry ? hh.parry : null, rush: has.rush ? hh.rush : null };
    this.bonus = hero.bonus ?? {};
    this.dodge = dodgeOf(p, 0.2, 0.35, sc);
    this.parryP = 0.15;
    this.dan = p.attr.胆魄;
    this.tier = tierCont(p);
    this.pre = { ...(hero.wounds ?? NO_WOUNDS) };
    this.performs = hero.performs ?? [];
    this.pcd = this.performs.map(() => 0);
    this.ultSpec = hero.ult;
    // 对手：用对手流程打的人，气血厚一些（玩家另有绝招、破绽、反击）
    const fp = foe.person, weak = foe.weak ?? 1, fm = dmgMul(fp, sc) * weak;
    this.ehpMax = Math.round(hpMaxOf(fp, sc) * sc.foeHp * weak);
    this.ehp = this.ehpMax;
    this.atk = scl([55, 80], fm * (foe.atkMul ?? 1));
    this.big = ((55 + 80) / 2) * fm * sc.bigK * (foe.bigMul ?? 1);
    const fhh = huohouOf(fp, sc), base = (fhh.block + fhh.dodge + fhh.parry) / 3, k = sc.tellSpread;
    const shape: Record<TellDom, Pw> = {
      li: { li: base + 10 * k, su: base - 4 * k, qiao: base - 6 * k, xi: base - 12 },
      su: { li: base - 6 * k, su: base + 10 * k, qiao: base - 2 * k, xi: base - 8 },
      qiao: { li: base - 4 * k, su: base - 2 * k, qiao: base + 10 * k, xi: base - 10 }
    };
    this.tells = foe.tells.length ? foe.tells.map(d => shape[d]) : [shape.li, shape.su, shape.qiao];
    this.eDodge = dodgeOf(fp, 0.14, 0.3, sc);
    this.eParry = 0.2;
    this.eDan = fp.attr.胆魄;
    this.eTier = tierCont(fp);
    this.feintR = foe.spar || foe.script ? 0 : foe.feint ?? feintRate(this.rules, this.eTier);
    this.mom = clamp(50 + 0.5 * (this.dan - this.eDan), 35, 65);
    this.nextTell = foe.firstTell ?? 3 + Math.floor(this.rng() * 3);
    this.floor = foe.spar ? Math.round(Math.min(this.hpMax * 0.3, this.hp * 0.5)) : foe.script ? Math.round(this.hpMax * 0.25) : 0;
    this.efloor = foe.spar ? Math.round(this.ehpMax * 0.3) : 0;
    this.allies = opts.allies ?? [];
    this.allyHits = this.allies.map(() => 0);
    this.crowd = opts.crowd ?? { n: 1, maxAtk: 1 };
    this.left = this.crowd.n - 1;
    this.log = { decisions: 0, prompts: 0, openings: 0, dealt: {}, last: null, swings: 0, deficit: 0, maxHeld: 0, feints: 0, saw: 0, fooled: 0, parry: 0, open: 0, ult: 0, taken: { ...NO_WOUNDS } };
  }

  /* ---------- 读数 ---------- */

  /** 带着的伤：上一场带来的（这一场新落的伤打完才起作用） */
  get wounds(): Wounds { return this.pre; }
  /** 对手每一下的伤害倍数：卸力、缴械、狂怒 */
  private foeOut(): number {
    let k = 1 - (this.foeSt.weaken?.v ?? 0) / 100;
    if (this.foeSt.disarm) k *= 0.6;
    return k;
  }
  /** 对手挨打的倍数：破绽 */
  private foeIn(): number { return 1 + (this.foeSt.break?.v ?? 0) / 100; }
  /** 自己挨打的倍数：护体 */
  private meIn(): number { return 1 - Math.min(50, this.meSt.guard?.v ?? 0) / 100; }
  private chargeMul(): number { const k = 1 + this.charge; this.charge = 0; return k; }

  /** 应对的选项：带伤时火候打折；虚实并进成算（是实招的把握 × 对实招的成算 + 是虚招的把握 × 应付虚招的几率） */
  options(pw: Pw, side = false): Opt[] {
    const w = this.pre, fr = side ? 0 : this.feintR;
    return RESP_KEYS.flatMap(k => {
      const h = this.hh[k];
      if (h === null) return [];
      const hh = h - this.rules.woundHh * (k === 'block' ? w.inner : k === 'dodge' ? w.foot : w.hand);
      const raw = clamp(odds(this.rules, k, hh, pw[RESP_PW[k]]) + (this.bonus[k] ?? 0), 0.05, 0.95);
      const p = fr > 0 ? (1 - fr) * raw + fr * VS_FEINT[k] : raw;
      const cost = k === 'block' ? 0.15 * this.mpMax : k === 'rush' ? 0.2 * this.mpMax : 0;
      return [{ k, p, raw, cost: Math.round(cost), dis: cost > this.mp }];
    });
  }

  /* ---------- 伤害 ---------- */

  private dealt(d: number, src: Source, ev: Ev[]): number {
    if (this.over) return 0;
    d = Math.max(0, Math.round(d * suppress(this.rules, this.tier, this.eTier) * this.foeIn()));
    // 剧本战对手不会被打死；切磋点到为止，停在三成
    const before = this.ehp;
    this.ehp = Math.max(this.f.script === 'rescue' ? 1 : this.f.spar ? this.efloor : -Infinity, this.ehp - d);
    const got = before - this.ehp;
    this.log.dealt[src] = (this.log.dealt[src] ?? 0) + got;
    if (src !== 'dot' && src !== 'ally') this.rage = Math.min(100, this.rage + 4 * this.rageK);
    if (this.f.phase2 && this.phase === 1 && this.ehp < this.ehpMax * 0.5 && this.ehp > 0) {
      this.phase = 2;
      this.nextTell = Math.min(this.nextTell, 2);
      ev.push({ k: 'phase2' });
    }
    if (this.f.script === 'rescue' && this.ehp <= this.ehpMax * 0.6) { this.toScript('rescue', ev); return got; }
    // 考校考的是接招：约好了合数的切磋，对手打到三成也不算赢，要撑满招数才过
    if (this.ehp <= this.efloor && !(this.f.spar && this.f.rounds)) {
      if (this.left > 0) {
        // 倒下一个：剩下的人各自可能溜走；还有人在，就补上来
        let stay = 0;
        for (let j = 0; j < this.left; j++) if (this.rng() >= this.rules.morale) stay++;
        const fled = this.left - stay;
        if (stay > 0) { ev.push({ k: 'fallen', left: stay, fled }); this.left = stay - 1; this.ehp = this.ehpMax; this.foeSt = {}; return got; }
      }
      this.log.last = src;
      this.end('win', ev);
    }
    return got;
  }

  private hurt(d: number, zone: Zone | null, big: boolean, ev: Ev[]): number {
    if (this.over) return 0;
    d = Math.max(0, Math.round(d * suppress(this.rules, this.eTier, this.tier) * this.meIn()));
    const before = this.hp;
    this.hp = Math.max(this.floor, this.hp - d);
    this.rage = Math.min(100, this.rage + 8 * this.rageK);
    if (big && zone) this.hurtBy[zone] += d / this.hpMax;
    if (this.hp <= this.floor) {
      if (this.f.script === 'rescue') this.toScript('rescue', ev);
      else if (this.f.script === 'cup') { this.toScript('cup', ev); }
      else this.end('lose', ev);
    }
    return before - this.hp;
  }

  private toScript(what: 'rescue' | 'cup', ev: Ev[]): void {
    if (this.waiting || this.over) return;
    this.waiting = true;
    this.prompt = null;
    this.opening = false;
    ev.push({ k: 'script', what });
  }

  /** 剧本战演完，由界面收场 */
  finishScript(): Ev[] { const ev: Ev[] = []; this.waiting = false; this.end('win', ev); return ev; }

  private end(res: DuelRes, ev: Ev[]): void {
    if (this.over) return;
    this.over = true;
    this.res = res;
    this.prompt = null;
    this.opening = false;
    this.log.taken = { hand: woundLv(this.hurtBy.hand), foot: woundLv(this.hurtBy.foot), inner: woundLv(this.hurtBy.inner) };
    ev.push({ k: 'end', res });
  }

  /* ---------- 破绽 ---------- */

  private maybeOpening(base: number, ev: Ev[]): void {
    if (this.over || this.prompt || this.opening || this.waiting) return;
    if (this.rng() >= base + Math.max(0, this.mom - 50) / 250) return;
    this.opening = true;
    this.log.openings++;
    this.log.decisions++;
    ev.push({ k: 'opening' });
  }

  /** 抓住破绽 */
  takeOpening(): Ev[] {
    const ev: Ev[] = [];
    if (!this.opening || this.over) return ev;
    this.opening = false;
    this.log.open++;
    this.rage = Math.min(100, this.rage + 10 * this.rageK);
    this.mom = clamp(this.mom + 12, 5, 95);
    const d = this.dealt(rr(this.rng, this.open) * this.chargeMul() * (1 - 0.1 * this.pre.hand), 'open', ev);
    ev.unshift({ k: 'open', dmg: d });
    return ev;
  }

  /** 破绽稍纵即逝，没抓住 */
  dropOpening(): Ev[] {
    if (!this.opening) return [];
    this.opening = false;
    return [{ k: 'openMiss' }];
  }

  /* ---------- 一合 ---------- */

  /** 打一合。有重招要应对时停下（prompt），等 respond */
  tick(): Ev[] {
    const ev: Ev[] = [];
    if (this.over || this.prompt || this.waiting) return ev;
    if (this.opening) ev.push(...this.dropOpening());
    // 考校：撑满了约好的招数还站着，就算过
    if (this.f.rounds && this.round >= this.f.rounds) { this.end('win', ev); return ev; }
    this.round++;
    if (this.f.script === 'rescue' && this.round >= this.rescueAt) { this.toScript('rescue', ev); return ev; }
    this.mp = Math.min(this.mpMax, this.mp + this.mpRegen * (1 - 0.25 * this.pre.inner));
    this.pcd = this.pcd.map(x => Math.max(0, x - 1));
    if (this.foeImmune > 0) this.foeImmune--;
    // 合初：对手身上的流血、中毒、灼伤
    for (const kind of ['bleed', 'poison', 'burn'] as const) {
      const s = this.foeSt[kind];
      if (!s || this.over) continue;
      const d = this.dealt(s.v * this.dmgK, 'dot', ev);
      ev.push({ k: 'dot', kind, dmg: d });
    }
    if (this.over || this.waiting) return ev;
    // 被点穴、寒气入体，这一合出不了手
    let held = false;
    const busy = this.foeSt.busy;
    if (busy) {
      held = true;
      ev.push({ k: 'held', why: 'busy' });
      if (--busy.r <= 0) { delete this.foeSt.busy; this.foeImmune = this.rules.holdImmune; }
    } else if (this.foeSt.chill && this.rng() < 0.5) { held = true; ev.push({ k: 'held', why: 'chill' }); }
    this.heldRun = held ? this.heldRun + 1 : 0;
    this.log.maxHeld = Math.max(this.log.maxHeld, this.heldRun);
    this.nextTell--;
    if (this.nextTell <= 0 && !held) {
      this.heavy(false, ev);
    } else if (held || this.rng() < 0.26 + this.mom * 0.0048) this.playerAuto(ev);
    else this.foeAuto(ev, false);
    // 围着的其他人
    const others = Math.min(this.crowd.maxAtk, this.left + 1) - 1;
    for (let j = 0; j < others && !this.over && !this.prompt; j++) {
      if (this.sideTell[j] === undefined) this.sideTell[j] = 4 + Math.floor(this.rng() * 3);
      if (this.rng() >= this.rules.crowdEff) continue;
      if (--this.sideTell[j] <= 0) { this.sideTell[j] = 4 + Math.floor(this.rng() * 3); this.heavy(true, ev); }
      else this.foeAuto(ev, true);
    }
    // 帮手：答应来的人，按时出手
    this.allies.forEach((a, i) => {
      if (this.over || this.waiting || !a.at.includes(this.round)) return;
      const n = ++this.allyHits[i];
      const d = this.dealt((a.share / a.at.length) * this.ehpMax / suppress(this.rules, this.tier, this.eTier) / this.foeIn(), 'ally', ev);
      ev.push({ k: 'ally', i, name: a.name, n, dmg: d });
    });
    this.endOfRound();
    this.track();
    return ev;
  }

  private endOfRound(): void {
    for (const st of [this.foeSt, this.meSt] as Partial<Record<string, Status>>[]) {
      for (const k of Object.keys(st)) {
        if (k === 'busy') continue;
        const s = st[k]!;
        if (s.fresh) { s.fresh = false; continue; }
        if (--s.r <= 0) delete st[k];
      }
    }
  }

  private track(): void {
    const diff = this.hp / this.hpMax - this.ehp / this.ehpMax;
    const now = diff > 0.1 ? 1 : diff < -0.1 ? -1 : this.lead;
    if (this.lead !== 0 && now !== this.lead) this.log.swings++;
    this.lead = now;
    if (diff < 0) this.log.deficit = Math.max(this.log.deficit, -diff);
  }

  private playerAuto(ev: Ev[]): void {
    const r = this.rng(), dg = this.eDodge - (this.mom - 50) * 0.002, pr = this.eParry - (this.mom - 50) * 0.002;
    if (r < dg) { ev.push({ k: 'auto', who: 'me', res: 'dodge', dmg: 0 }); return; }
    if (r < dg + pr) { ev.push({ k: 'auto', who: 'me', res: 'parry', dmg: 0 }); return; }
    let d = rr(this.rng, this.auto) * this.chargeMul() * (1 - 0.1 * this.pre.hand);
    const crit = this.rng() < 0.1;
    if (crit) d *= 1.6;
    this.mom = clamp(this.mom + (crit ? 8 : 5), 5, 95);
    const e: Ev = { k: 'auto', who: 'me', res: 'hit', dmg: 0, crit };
    ev.push(e);
    e.dmg = this.dealt(d, 'auto', ev);
    this.maybeOpening(0.12, ev);
  }

  private foeAuto(ev: Ev[], side: boolean): void {
    const r = this.rng();
    const charging = this.charging;
    let dg = charging ? 0 : this.dodge + (this.mom - 50) * 0.003 - 0.04 * this.pre.foot + (this.meSt.haste?.v ?? 0) / 100;
    dg = clamp(dg, 0, 0.6);
    const pr = charging ? 0 : this.parryP;
    if (r < dg) { this.mom = clamp(this.mom + 2, 5, 95); ev.push({ k: 'auto', who: 'foe', res: 'dodge', dmg: 0, side }); this.maybeOpening(0.2, ev); return; }
    if (r < dg + pr) { ev.push({ k: 'auto', who: 'foe', res: 'parry', dmg: 0, side }); this.maybeOpening(0.12, ev); return; }
    this.mom = clamp(this.mom - 5, 5, 95);
    let d = rr(this.rng, this.atk) * this.foeOut() * (this.phase === 2 ? 1.2 : 1);
    if (charging) { d *= 1.3; this.charging = false; }
    const e: Ev = { k: 'auto', who: 'foe', res: 'hit', dmg: 0, charging, side };
    ev.push(e);
    e.dmg = this.hurt(d, this.rng() < 0.5 ? 'hand' : 'foot', false, ev);
  }

  /** 对手出重招：停下来等玩家应对 */
  private heavy(side: boolean, ev: Ev[]): void {
    this.log.prompts++;
    this.log.decisions++;
    const ts = this.tells;
    let i = Math.floor(this.rng() * ts.length);
    if (!side) {
      if (ts.length > 1) while (i === this.lastTell) i = Math.floor(this.rng() * ts.length);
      this.lastTell = i;
    }
    const b = this.phase === 2 ? 5 : 0, t = ts[i];
    const pw: Pw = { li: t.li + b, su: t.su + b, qiao: t.qiao + b, xi: t.xi + b };
    const feint = !side && this.feintR > 0 && this.rng() < this.feintR;
    if (feint) this.log.feints++;
    const opts = this.options(pw, side);
    this.charging = false;
    this.prompt = { tell: i, pw, opts, feint, side };
    ev.push({ k: 'tell', tell: i, pw, opts, feintRate: side ? 0 : this.feintR, side });
  }

  /**
   * 应对重招。choice 为空（时间到了没选、或者没有一种用得上）：凭本能挑成算最高的，成算打一点五成折扣；都用不上就硬吃。
   */
  respond(choice: RespKey | null): Ev[] {
    const ev: Ev[] = [];
    const pr = this.prompt;
    if (!pr || this.over) return ev;
    this.prompt = null;
    const big = this.big * (this.phase === 2 ? 1.15 : 1);
    let o = pr.opts.find(x => x.k === choice && !x.dis);
    let instinct = false;
    if (!o) { o = pr.opts.filter(x => !x.dis).sort((a, b) => b.p - a.p)[0]; instinct = true; }
    const resetTell = (): void => {
      if (pr.side) return;
      this.nextTell = this.phase === 2 ? 3 + Math.floor(this.rng() * 2) : 4 + Math.floor(this.rng() * 3);
      if (this.f.script === 'rescue' && this.rescueAt === Infinity) this.rescueAt = this.round + 2;
    };
    if (!o) {
      // 无从招架，硬吃这一招
      this.mom = clamp(this.mom - 12, 5, 95);
      const e: Ev = { k: 'resp', key: null, ok: false, feint: pr.feint, instinct: true, p: 0, dmg: 0, dir: 'in', side: pr.side };
      ev.push(e);
      e.dmg = this.hurt(big * 1.2 * this.foeOut(), 'inner', true, ev);
      resetTell();
      return ev;
    }
    const pen = instinct ? 0.15 : 0;
    const p = Math.max(0.05, o.p - pen);
    this.mp = Math.max(0, this.mp - o.cost);
    if (pr.feint) {
      if (this.rng() < Math.max(0.05, VS_FEINT[o.k] - pen)) {
        // 看破虚招：乘虚而入
        this.log.saw++;
        this.rage = Math.min(100, this.rage + 12 * this.rageK);
        this.mom = clamp(this.mom + 12, 5, 95);
        ev.push({ k: 'resp', key: o.k, ok: true, feint: true, instinct, p, dmg: 0, dir: 'none', side: pr.side });
        this.maybeOpening(1, ev);
      } else {
        // 扑了个空，被顺势带了一下
        this.log.fooled++;
        this.mom = clamp(this.mom - 8, 5, 95);
        const e: Ev = { k: 'resp', key: o.k, ok: false, feint: true, instinct, p, dmg: 0, dir: 'in', side: pr.side };
        ev.push(e);
        e.dmg = this.hurt(big * 0.6 * this.foeOut(), ZONE_OF[o.k], true, ev);
      }
      resetTell();
      return ev;
    }
    const ok = this.rng() < Math.max(0.05, o.raw - pen);
    if (ok) {
      this.log.parry++;
      this.rage = Math.min(100, this.rage + 12 * this.rageK);
      const e: Ev = { k: 'resp', key: o.k, ok: true, feint: false, instinct, p, dmg: 0, dir: 'out', side: pr.side };
      ev.push(e);
      if (pr.side) { this.mom = clamp(this.mom + 4, 5, 95); e.dir = 'none'; }
      else if (o.k === 'block') { this.mom = clamp(this.mom + 15, 5, 95); e.dmg = this.dealt(rr(this.rng, this.counter.block) * this.chargeMul(), 'counter', ev); }
      else if (o.k === 'dodge') { this.mom = clamp(this.mom + 8, 5, 95); e.dir = 'none'; this.maybeOpening(1, ev); }
      else if (o.k === 'parry') { this.mom = clamp(this.mom + 20, 5, 95); e.dmg = this.dealt(rr(this.rng, this.counter.parry) * this.chargeMul(), 'counter', ev); }
      else { this.mom = clamp(this.mom + 15, 5, 95); e.dmg = this.dealt(rr(this.rng, this.counter.rush) * this.chargeMul(), 'counter', ev); }
    } else {
      const mul = { block: 0.8, dodge: 1, parry: 1.1, rush: 1.3 }[o.k];
      const dm = { block: 10, dodge: 8, parry: 12, rush: 15 }[o.k];
      this.mom = clamp(this.mom - dm, 5, 95);
      const e: Ev = { k: 'resp', key: o.k, ok: false, feint: false, instinct, p, dmg: 0, dir: 'in', side: pr.side };
      ev.push(e);
      e.dmg = this.hurt(big * mul * this.foeOut(), ZONE_OF[o.k], true, ev);
    }
    resetTell();
    return ev;
  }

  /* ---------- 主动出手 ---------- */

  /** 绝招的实际内力消耗：写的是按三百点内力算的数，按内力上限的比例扣 */
  performCost(i: number): number { const x = this.performs[i]; return x ? Math.round((x.mp / 300) * this.mpMax) : Infinity; }
  canPerform(i: number): boolean { return !this.over && !this.prompt && !this.waiting && this.pcd[i] === 0 && this.mp >= this.performCost(i); }

  perform(i: number): Ev[] {
    const ev: Ev[] = [];
    const x = this.performs[i];
    if (!x || !this.canPerform(i)) return ev;
    this.mp -= this.performCost(i);
    this.pcd[i] = x.cd;
    this.log.decisions++;
    const mul = this.chargeMul() * this.dmgK * (1 - 0.1 * this.pre.hand);
    let landed = 0, total = 0;
    for (let h = 0; h < x.hits; h++) if (this.rng() < x.acc) { landed++; total += rr(this.rng, x.dmg) * mul; }
    const hit = x.hits === 0 ? this.rng() < x.acc : landed > 0;
    const e: Ev = { k: 'perform', i, hit, dmg: 0, fx: [] };
    ev.push(e);
    if (total > 0) e.dmg = this.dealt(total, 'perform', ev);
    for (const fx of x.fx) if (this.isSelf(fx.kind) || hit) { if (this.applyFx(fx)) e.fx.push(fx.kind); }
    return ev;
  }

  ult(): Ev[] {
    const ev: Ev[] = [];
    const u = this.ultSpec;
    if (!u || this.rage < 100 || this.over || this.prompt || this.waiting) return ev;
    this.rage = 0;
    this.log.decisions++;
    this.log.ult++;
    const e: Ev = { k: 'ult', dmg: 0, fx: [] };
    ev.push(e);
    e.dmg = this.dealt(rr(this.rng, u.dmg) * this.dmgK * this.chargeMul(), 'ult', ev);
    for (const fx of u.fx) if (this.applyFx(fx)) e.fx.push(fx.kind);
    return ev;
  }

  private isSelf = (k: FxKind): boolean => k === 'guard' || k === 'haste' || k === 'heal' || k === 'rage' || k === 'drain';

  /** 施加一个效果；返回施加上了没有 */
  private applyFx(fx: FxDef): boolean {
    const p = fx.chance ?? 1;
    const k = fx.kind;
    if ((k === 'busy' || k === 'disarm') && this.foeImmune > 0) return false;
    if (p < 1 && this.rng() >= p) return false;
    const v = fx.value ?? 0, r = fx.rounds ?? 1;
    const put = (st: Partial<Record<string, Status>>, key: string, val: number, rounds: number): void => {
      const cur = st[key];
      st[key] = { v: Math.max(cur?.v ?? 0, val), r: Math.max(cur?.r ?? 0, rounds), fresh: true };
    };
    switch (k) {
      case 'busy': put(this.foeSt, 'busy', 0, Math.min(this.rules.holdMax, r)); break;
      case 'disarm': put(this.foeSt, 'disarm', 0, r); break;
      case 'bleed': case 'poison': case 'burn': case 'chill': case 'weaken': case 'break': put(this.foeSt, k, v, r); break;
      case 'guard': case 'haste': put(this.meSt, k, v, r); break;
      case 'fear': this.mom = clamp(this.mom + v, 5, 95); break;
      case 'drain': this.mp = Math.min(this.mpMax, this.mp + v); break;
      case 'heal': this.hp = Math.min(this.hpMax, this.hp + v); break;
      case 'rage': this.rage = Math.min(100, this.rage + v); break;
    }
    return true;
  }

  /** 运功：长按蓄力，松手后下一招威力提升（最多八成） */
  addCharge(x: number): void { this.charge = Math.min(0.8, this.charge + x); }

  /** 这一场已经吃了几包金疮药 */
  jcyN = 0;
  /** 金疮药：回三成气血。一场最多两包（JCY_MAX）：不然钱能直接买档次，带十包能打赢高一档的对手（审查 F02） */
  jcy(): Ev[] {
    if (this.over || this.waiting || this.hp >= this.hpMax || this.jcyN >= JCY_MAX) return [];
    const h = Math.min(Math.round(this.hpMax * 0.3), this.hpMax - this.hp);
    this.hp += h;
    this.jcyN++;
    return [{ k: 'item', kind: 'jcy', v: h }];
  }

  /** 飞蝗石：打一下，不用调息 */
  dart(): Ev[] {
    if (this.over || this.waiting || this.prompt) return [];
    const ev: Ev[] = [];
    const e: Ev = { k: 'item', kind: 'dart', v: 0 };
    ev.push(e);
    e.v = this.dealt(rr(this.rng, [30, 45]) * this.dmgK, 'item', ev);
    return ev;
  }

  /** 逃跑：势越好越容易走脱；走不脱，对手顺手一击 */
  flee(): Ev[] {
    const ev: Ev[] = [];
    if (this.over || this.waiting || this.f.script) return ev;
    if (this.f.spar || this.rng() < 0.25 + (this.mom - 50) / 100) { this.end('flee', ev); return ev; }
    ev.push({ k: 'fleeFail' });
    this.foeAuto(ev, false);
    return ev;
  }

  /** 认输：只有切磋才认得了 */
  yieldUp(): Ev[] {
    const ev: Ev[] = [];
    if (this.over || !this.f.spar) return ev;
    this.end('yield', ev);
    return ev;
  }

  /** 对手身上的状态（界面显示标签用） */
  foeStatus(): FoeSt[] { return Object.keys(this.foeSt) as FoeSt[]; }
}

/* ---------- 模拟：替玩家打 ---------- */

export interface Policy {
  name: string;
  /** 从可用的应对里挑一个 */
  pick(opts: Opt[], pw: Pw, rng: Rng): RespKey | null;
  /** 破绽出现时，点中的几率（反应快慢） */
  openTake: number;
  /** 绝招调息好了就用 */
  performs: boolean;
}

/** 以己之长：挑成算最高的一项 */
export const SKILLED: Policy = { name: '以己之长', pick: opts => opts.filter(x => !x.dis).sort((a, b) => b.p - a.p)[0]?.k ?? null, openTake: 0.85, performs: true };
/** 固定套路：负责人否决过的「重则避、快则接、巧则拆」 */
export const ROTE: Policy = {
  name: '固定套路',
  pick: (opts, pw) => {
    const top = (['li', 'su', 'qiao'] as const).slice().sort((a, b) => pw[b] - pw[a])[0];
    const want: RespKey = top === 'li' ? 'dodge' : top === 'su' ? 'block' : 'parry';
    return (opts.find(x => x.k === want && !x.dis) ?? opts.find(x => !x.dis))?.k ?? null;
  },
  openTake: 0.85, performs: true
};
/** 随手乱选 */
export const RANDOM: Policy = { name: '随手乱选', pick: (opts, _pw, rng) => { const ok = opts.filter(x => !x.dis); return ok.length ? ok[Math.floor(rng() * ok.length)].k : null; }, openTake: 0.5, performs: true };
/** 不管虚实：只按对实招的成算挑 */
export const NAIVE: Policy = { name: '不管虚实', pick: opts => opts.filter(x => !x.dis).sort((a, b) => b.raw - a.raw)[0]?.k ?? null, openTake: 0.85, performs: true };

/** 打到分出胜负（最多两百合，按剩下的气血比例判） */
export function simulate(d: Duel, pol: Policy, maxTicks = 200): Duel {
  const take = (ev: Ev[]): void => { for (const e of ev) if (e.k === 'opening') { ev.push(...(d.rng() < pol.openTake ? d.takeOpening() : d.dropOpening())); } };
  for (let t = 0; t < maxTicks * d.crowd.n && !d.over; t++) {
    if (d.waiting) { d.finishScript(); break; }
    if (pol.performs) {
      d.performs.forEach((_, i) => { if (d.canPerform(i)) take(d.perform(i)); });
      if (d.ultSpec && d.rage >= 100) take(d.ult());
    }
    if (d.over) break;
    take(d.tick());
    if (d.prompt) take(d.respond(pol.pick(d.prompt.opts, d.prompt.pw, d.rng)));
  }
  if (!d.over) d.res = d.hp / d.hpMax > d.ehp / d.ehpMax ? 'win' : 'lose';
  if (d.res !== 'win') d.log.deficit = 0;
  return d;
}
