/**
 * 交手内核（验证用，不接游戏界面）。
 *
 * 流程照搬现有实战 `src/ui/fight.ts`：每合一个 tick；「势」决定这一合谁出手；
 * 每隔四到六合，对手出一次重招，玩家以己之长应对；双方出手之后可能露出破绽；
 * 玩家另有绝招（耗内力、要调息）和怒气满了才能出的杀招。
 *
 * 新规则全部做成开关（Rules），用来对照「有它」和「没它」的体感。
 * 种子固定，同一组参数结果完全一样。
 */
import { mulberry32, type Rng } from '../../engine/rng';

export type RespKey = 'block' | 'dodge' | 'parry' | 'rush' | 'duizhang' | 'kanpo';
/** 四种基本应对（对掌、识破虚招另算） */
export type BaseResp = Exclude<RespKey, 'duizhang' | 'kanpo'>;
export const RESP_KEYS: BaseResp[] = ['block', 'dodge', 'parry', 'rush'];
/** 重招的四项强度：力、速、巧、隙。硬接比力，闪避比速，拆招比巧，抢攻比隙 */
export interface Pw { li: number; su: number; qiao: number; xi: number }
export const RESP_PW: Record<RespKey, keyof Pw> = { block: 'li', dodge: 'su', parry: 'qiao', rush: 'xi', duizhang: 'li', kanpo: 'qiao' };
/** 三处伤：手、足、内息 */
export type Zone = 'hand' | 'foot' | 'inner';
export type Wounds = Record<Zone, number>;

/** 规则开关与可调的数 */
export interface Rules {
  /** 成算：false 为现有的线性（0.5 + 差 × 2.5%，限在 5% 到 95%）；true 为 logistic */
  logistic: boolean;
  /** logistic 的尺度：火候差多少，成算从五成变到约七成三 */
  scale: number;
  /** 差距压制：低手打高手，差距超出一档的部分，伤害乘 base^((差−1)²) */
  suppress: boolean;
  supBase: number;
  /** 伤落三处：手伤减出手和拆招，足伤减闪避，内息伤减硬接和回内 */
  wounds: boolean;
  /** 每级伤减多少火候 */
  woundHh: number;
  /** 内息受伤，越用力越伤：每次硬接、绝招，按伤级掉气血上限的百分之几 */
  strain: boolean;
  /** 加力比深浅：硬接的成败和反震看双方功力之比 */
  jiali: boolean;
  /** 对掌：对方以力为主的重招，可以运足内力迎上去，四掌相抵，比的是双方功力（第五种应对） */
  bipin: boolean;
  /** 借力打力：拆招成功的反击，按对方这一招的力道算 */
  jieli: boolean;
  /** 无招：高手的重招看不透，玩家判断的强度带噪声；悟性高的人看得准 */
  wuzhao: boolean;
  /** 困兽犹斗：带伤挨打时怒气涨得快（每级伤多涨几成），杀招来得早 */
  fury: number;
  /** 耗内力按内力上限的比例算（硬接 15%，抢攻 20%）；false 为现有的绝对数（硬接 40 + 力，抢攻 60） */
  mpProp: boolean;
  /** 围攻：眼前之外的人，每合出手的几率。乱拳互相碍事，打折；练过合击阵法的可以补回来 */
  crowdEff: number;
  /** 树倒猢狲散：同伙倒下一个，剩下的每人有几成见势不妙溜走（同门、死士写 0） */
  morale: number;
  /** 点穴冲开以后，几合之内不会再被点中 */
  holdImmune: number;
  /** 对手也会受伤：0 为不受伤；对手气血是玩家的几倍，伤势按这个倍数折算 */
  foeWoundK: number;
  /** 伤从哪里来：all 为每一下都记；heavy 为只有吃了重招（玩家没拆开重招，对手挨了破绽、反击、绝招、杀招）才落伤 */
  woundFrom: 'all' | 'heavy';
  /**
   * 伤在什么时候起作用：fight 为这一场当中就起作用；after 为这一场只记下，打完以后才起作用（带到下一场）。
   * 第九、十轮发现：伤在这一场当中起作用，落后的人翻不了身（翻盘从一成七降到一成一）；带到下一场则不伤体感。
   */
  woundWhen: 'fight' | 'after';
  /**
   * 虚实（第三版）：对手的重招有几成是虚招（二流以上的对手才用足，三流用一半，不入流不用）。0 为不开。
   * 预兆的文字不分虚实（免得玩家背下来）；虚实只体现在成算上：玩家看出来的虚实有几成把握，按双方的眼力算。
   * 多一种应对「识破」：识破了虚招，白得一个破绽；把实招当成虚招，结结实实挨一记。
   * 照常应对的话，碰上虚招就扑了空，被对手顺势带一下。
   */
  xushi: number;
  /**
   * 虚实的做法：kanpo 为多一个「识破」按钮（第二十四轮：同档看虚实只有七成五的准头，把握从来不够，没人点它，虚招成了白挨的打）；
   * adapt 为不加按钮，四种应对各自吃不吃虚招不一样（硬接最怕虚招，拆招最能随机应变），虚实并进每个按钮的成算。
   */
  xushiMode: 'kanpo' | 'adapt';
  /** 看虚实的尺度：双方眼力差多少，看对的几率从七成五变到约八成七（越大，境界在这里占的分量越小） */
  yanScale: number;
  /** 胆魄定开局的势：双方先天胆魄每差一点，势偏半格（限在 35 到 65） */
  danMom: boolean;
}

export const CURRENT_RULES: Rules = {
  logistic: false, scale: 12, suppress: false, supBase: 2 / 3, wounds: false, woundHh: 6,
  strain: false, jiali: false, bipin: false, jieli: false, wuzhao: false, fury: 0, mpProp: false, crowdEff: 0.5, morale: 0, holdImmune: 2, foeWoundK: 0, woundFrom: 'all', woundWhen: 'fight',
  xushi: 0, xushiMode: 'adapt', yanScale: 26, danMom: false
};

/**
 * 验证下来留下的规则（地基第二版）。每一条为什么留、为什么去，见 src/lab/model/README.md。
 * - 成算走 logistic，不会顶满；
 * - 差距压制：差一档靠本事，差两档几乎必败，差三档摸不到边；
 * - 伤：吃了重招才落伤，这一场只记下，打完才起作用（带到下一场）；
 * - 耗内力按内力上限的比例；
 * - 围攻：围着的人出手打三五折；乌合之众见同伙倒下会溜（按对手写 morale）；
 * - 点穴冲开后三合之内不再被点中。
 * - 第三版：胆魄定开局的势（先天胆魄每差一点，势偏半格）。
 * 去掉的：越用力越伤、加力比深浅、借力打力、无招、对掌、困兽犹斗（体感没有改善，或者变差）；看虚实靠眼力（第三版，见 README）。
 * 待定的：虚实（xushi），利弊参半，要负责人在手机上凭手感判断。
 */
export const NEW_RULES: Rules = {
  ...CURRENT_RULES,
  logistic: true, scale: 26, suppress: true, supBase: 2 / 3,
  wounds: true, woundHh: 9, woundFrom: 'heavy', woundWhen: 'after',
  mpProp: true, crowdEff: 0.35, morale: 0, holdImmune: 3,
  danMom: true
};

/** 玩家这一方（主角，或者用玩家流程打斗的人） */
export interface Hero {
  name: string;
  /** 连续的档次，用于差距压制（不入流 0 … 宗师 5） */
  tier: number;
  hpMax: number;
  /** 认输、落败的底线（切磋 30%） */
  floor: number;
  mpMax: number;
  mpRegen: number;
  /** 功力（年） */
  gongli: number;
  /** 普通出手的伤害区间（已乘境界、品级、根基） */
  auto: [number, number];
  /** 破绽一击、硬接反震、拆招反击、抢攻得手的伤害区间 */
  open: [number, number];
  counter: Record<'block' | 'parry' | 'rush', [number, number]>;
  /** 四种应对各自的火候；没有这门武功的应对写 null */
  hh: Record<BaseResp, number | null>;
  /** 闪避普通出手的基础几率（现有：0.2 + 轻功重数 × 0.02） */
  dodge: number;
  parry: number;
  /** 绝招 */
  performs: { name: string; dmg: [number, number]; mp: number; cd: number; acc: number; hold?: number; seal?: number }[];
  /** 杀招（怒气满） */
  ult?: [number, number];
  rage0: number;
  /** 悟性（看重招看得准不准） */
  wu: number;
  /** 开打时身上已有的伤（上一场带来的） */
  pre?: Wounds;
  /** 后天胆魄（定开局的势）、眼力（看破虚招） */
  dan?: number;
  /** 怒气涨得快慢的倍数（先天胆魄） */
  rageK?: number;
  yan?: number;
}

/** 对手这一方 */
export interface Foe {
  name: string;
  tier: number;
  hpMax: number;
  atk: [number, number];
  big: number;
  tells: Pw[];
  gongli: number;
  /** 被打时的闪避、招架（现有：0.14、0.2，随势变化） */
  dodge: number;
  parry: number;
  spar?: boolean;
  firstTell?: number;
  /** 备战：气血、出手、重招的倍数（已经叠好） */
  prep?: { hp: number; atk: number; big: number };
  dan?: number;
  /** 眼力：虚招使得多真，看它 */
  yan?: number;
}

/** 应对的打法 */
export interface Policy {
  name: string;
  /** 从可用的应对里挑一个；opts 已按「看到的」成算算好 */
  pick(opts: Opt[], seen: Pw, rng: Rng): RespKey | null;
  /** 破绽出现时，点中的几率（反应快慢） */
  openTake: number;
  /** 绝招调息好了就用 */
  performs: boolean;
}

export interface Opt { k: RespKey; p: number; cost: number; dis: boolean; /** 不考虑虚实时的成算 */ raw?: number }

/** 以己之长：挑看到的成算最高的一项 */
export const SKILLED: Policy = {
  name: '以己之长',
  pick: opts => { const o = opts.filter(x => !x.dis).sort((a, b) => b.p - a.p)[0]; return o ? o.k : null; },
  openTake: 0.85, performs: true
};
/** 固定套路：负责人否决过的「重则避、快则接、巧则拆」 */
export const ROTE: Policy = {
  name: '固定套路',
  pick: (opts, seen) => {
    const top = (['li', 'su', 'qiao'] as const).slice().sort((a, b) => seen[b] - seen[a])[0];
    const want: RespKey = top === 'li' ? 'dodge' : top === 'su' ? 'block' : 'parry';
    const o = opts.find(x => x.k === want && !x.dis) ?? opts.find(x => !x.dis);
    return o ? o.k : null;
  },
  openTake: 0.85, performs: true
};
/** 不管虚实：只按对实招的成算挑（看不出、也不去想虚招的人） */
export const NAIVE: Policy = {
  name: '不管虚实',
  pick: opts => { const o = opts.filter(x => !x.dis).sort((a, b) => (b.raw ?? b.p) - (a.raw ?? a.p))[0]; return o ? o.k : null; },
  openTake: 0.85, performs: true
};
/** 随手乱选 */
export const RANDOM: Policy = {
  name: '随手乱选',
  pick: (opts, _s, rng) => { const ok = opts.filter(x => !x.dis); return ok.length ? ok[Math.floor(rng() * ok.length)].k : null; },
  openTake: 0.5, performs: true
};

export type Source = 'auto' | 'open' | 'counter' | 'perform' | 'ult' | 'big' | 'foeAuto' | 'bipin' | 'strain';

/** 一场打完记下的东西：既有胜负，也有体感 */
export interface FightLog {
  win: boolean;
  ticks: number;
  /** 玩家要动手的决断：重招应对、破绽、绝招、内力比拼 */
  decisions: number;
  prompts: number;
  openings: number;
  /** 玩家打出去的伤害，按来源分 */
  dealt: Partial<Record<Source, number>>;
  /** 最后一击的来源 */
  last: Source | null;
  /** 领先易手的次数（按双方剩余气血比例，差 10% 以上才算） */
  swings: number;
  /** 赢家最落后时，比对手少多少（按气血比例） */
  deficit: number;
  /** 连续被制住、出不了手的最长合数 */
  maxHeld: number;
  /** 受伤让最好的应对改变的次数 */
  bestShift: number;
  /** 虚实：对手出了几次虚招；玩家识破了几次、上当了几次、把实招错当虚招几次 */
  feints: number;
  saw: number;
  fooled: number;
  misread: number;
  /** 对掌的次数 */
  bipin: number;
  /** 这一场新落下的伤（打完以后起作用） */
  taken: Wounds;
}

const rr = (rng: Rng, [a, b]: [number, number]): number => a + rng() * (b - a);
const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
const sig = (x: number): number => 1 / (1 + Math.exp(-x));

/** 成算：现有线性，或者 logistic */
export function odds(rules: Rules, k: RespKey, hh: number, strength: number): number {
  const base = k === 'rush' ? 0.35 : 0.5;
  if (!rules.logistic) return clamp(base + (hh - strength) * 0.025, 0.05, 0.95);
  const b0 = Math.log(base / (1 - base));
  return sig(b0 + (hh - strength) / rules.scale);
}

/** 差距压制：attacker 打 defender 时伤害的倍数 */
export function suppress(rules: Rules, atkTier: number, defTier: number): number {
  if (!rules.suppress) return 1;
  const d = defTier - atkTier;
  return d <= 1 ? 1 : Math.pow(rules.supBase, (d - 1) * (d - 1));
}

const ZONE_OF: Record<RespKey, Zone> = { block: 'inner', dodge: 'foot', parry: 'hand', rush: 'hand', duizhang: 'inner', kanpo: 'inner' };

/** 对手出虚招的几率：二流以上用足，三流一半，不入流不用（虚招是会家子的本事） */
export const feintRate = (rules: Rules, foeTier: number): number => rules.xushi * clamp(foeTier / 2, 0, 1);
/** 看虚实看得对的几率：眼力相当七成五，高出很多接近十成，差得多接近瞎猜（五成） */
export const readAcc = (rules: Rules, yan: number, foeYan: number): number => 0.5 + 0.5 * sig((yan - foeYan) / rules.yanScale);
/** 碰上虚招，各种应对还能应付过去的几率：全力硬接最容易扑空，拆招讲究看清来势再动，最不怕虚招 */
export const VS_FEINT: Record<BaseResp, number> = { block: 0.1, rush: 0.3, dodge: 0.5, parry: 0.7 };
const woundLv = (dmgFrac: number): number => (dmgFrac >= 0.5 ? 3 : dmgFrac >= 0.3 ? 2 : dmgFrac >= 0.15 ? 1 : 0);

/** 打一场：hero 用 policy 应对 */
/** 围攻：对手一共几个人，同时最多几个人出手（不写为一对一） */
export interface Crowd { n: number; maxAtk: number }

const RESP_NAME: Record<RespKey, string> = { block: '硬接', dodge: '闪避', parry: '拆招', rush: '抢攻', duizhang: '对掌', kanpo: '识破' };
const cn = (p: number): string => `${Math.max(1, Math.min(9, Math.round(p * 10)))}成`;

/** trace：给了就把这一场的经过写成一行行的战报（重放给人看体感用） */
export function fight(hero: Hero, foe: Foe, policy: Policy, rules: Rules, seed: number, crowd: Crowd = { n: 1, maxAtk: 1 }, trace?: string[]): FightLog {
  let tick = 0;
  const say = (x: string): void => { if (trace) trace.push(`第${tick}合 ${x}`); };
  const bar = (): string => `（你 ${Math.max(0, Math.round((hp / hero.hpMax) * 100))}% · ${foe.name} ${Math.max(0, Math.round((ehp / (foe.hpMax * prep.hp)) * 100))}%）`;
  const rng = mulberry32(seed);
  const log: FightLog = { win: false, ticks: 0, decisions: 0, prompts: 0, openings: 0, dealt: {}, last: null, swings: 0, deficit: 0, maxHeld: 0, bestShift: 0, feints: 0, saw: 0, fooled: 0, misread: 0, bipin: 0, taken: { hand: 0, foot: 0, inner: 0 } };
  let hp = hero.hpMax, mp = hero.mpMax * 0.8, rage = hero.rage0;
  const rk = hero.rageK ?? 1;
  let mom = rules.danMom && hero.dan !== undefined && foe.dan !== undefined ? clamp(50 + 0.5 * (hero.dan - foe.dan), 35, 65) : 50;
  const prep = foe.prep ?? { hp: 1, atk: 1, big: 1 };
  let ehp = foe.hpMax * prep.hp;
  const floor = foe.spar ? hero.hpMax * 0.3 : hero.floor;
  const efloor = foe.spar ? foe.hpMax * prep.hp * 0.3 : 0;
  const pcd = hero.performs.map(() => 0);
  let nextTell = foe.firstTell ?? 3 + Math.floor(rng() * 3);
  let lastTell = -1;
  // 伤：按受到的伤害累积（占气血上限的比例），换算成级
  const hurtBy: Record<Zone, number> = { hand: 0, foot: 0, inner: 0 };
  const pre = hero.pre ?? { hand: 0, foot: 0, inner: 0 };
  const now = rules.woundWhen === 'fight';
  const wl = (): Wounds => ({
    hand: Math.min(3, pre.hand + (now ? woundLv(hurtBy.hand) : 0)), foot: Math.min(3, pre.foot + (now ? woundLv(hurtBy.foot) : 0)), inner: Math.min(3, pre.inner + (now ? woundLv(hurtBy.inner) : 0))
  });
  /** 伤的效果开着吗：这一场会落伤，或者身上带着伤 */
  const woundsOn = (rules.wounds && now) || pre.hand + pre.foot + pre.inner > 0;
  // 对手被点穴（定穴：出不了手；免疫合数）
  let foeHeld = 0, foeImmune = 0, heldRun = 0;
  let lead = 0;
  let over = false;

  const foeBy: Record<Zone, number> = { hand: 0, foot: 0, inner: 0 };
  const fw = (): Wounds => ({ hand: woundLv(foeBy.hand), foot: woundLv(foeBy.foot), inner: woundLv(foeBy.inner) });
  let left = crowd.n - 1;
  /** 围着的其他人：各自的重招倒计时 */
  const sideTell: number[] = [];
  const dealt = (d: number, src: Source): void => {
    if (over) return;
    d = Math.max(0, d * suppress(rules, hero.tier, foe.tier));
    ehp -= d;
    if (rules.wounds && (rules.woundFrom === 'all' || src !== 'auto')) {
      // 对手按自己的气血折算伤势（对手流程的气血更厚，按同样的比例算会偏轻，所以乘上厚度）
      const z: Zone = src === 'perform' || src === 'ult' || src === 'bipin' ? 'inner' : rng() < 0.5 ? 'hand' : 'foot';
      foeBy[z] += (d / foe.hpMax) * rules.foeWoundK;
    }
    log.dealt[src] = (log.dealt[src] ?? 0) + d;
    rage = Math.min(100, rage + (4) * rk);
    if (ehp <= efloor) {
      if (left > 0) {
        // 倒下一个：剩下的人各自可能溜走；还有人在，就补上来
        let stay = 0;
        for (let j = 0; j < left; j++) if (rng() >= rules.morale) stay++;
        if (stay > 0) { say(`倒下一个${left + 1 - stay > 0 ? `，${left + 1 - stay}人见势不妙溜了` : ''}，又一个补上来。`); left = stay - 1; ehp = foe.hpMax * prep.hp; foeBy.hand = foeBy.foot = foeBy.inner = 0; return; }
      }
      over = true; log.win = true; log.last = src;
    }
  };
  const hurt = (d: number, zone: Zone | null, src: Source): void => {
    if (over) return;
    d = Math.max(0, d * suppress(rules, foe.tier, hero.tier));
    hp -= d;
    const wsum = rules.wounds ? woundLv(hurtBy.hand) + woundLv(hurtBy.foot) + woundLv(hurtBy.inner) : 0;
    rage = Math.min(100, rage + (8 * (1 + rules.fury * wsum)) * rk);
    if (rules.wounds && zone && (rules.woundFrom === 'all' || src === 'big')) hurtBy[zone] += d / hero.hpMax;
    if (hp <= floor) { over = true; log.win = false; log.last = src; }
  };
  const track = (): void => {
    const diff = hp / hero.hpMax - ehp / (foe.hpMax * prep.hp);
    const now = diff > 0.1 ? 1 : diff < -0.1 ? -1 : lead;
    if (lead !== 0 && now !== lead) log.swings++;
    lead = now;
    if (diff < 0) log.deficit = Math.max(log.deficit, -diff); // 记玩家最落后的时候；输了的场次之后不用
  };

  /** 玩家能用的应对；带伤时火候打折 */
  const options = (pw: Pw, w: Wounds): Opt[] => [...RESP_KEYS.flatMap(k => {
    const h = hero.hh[k];
    if (h === null) return [];
    let hh = h;
    if (woundsOn) hh -= rules.woundHh * (k === 'block' ? w.inner : k === 'dodge' ? w.foot : w.hand);
    if (k === 'block' && !rules.logistic) hh += Math.round((mp / hero.mpMax) * 10);
    let p = odds(rules, k, hh, pw[RESP_PW[k]]);
    if (rules.jiali && k === 'block') p = sig(Math.log(p / (1 - p)) + 0.8 * Math.log2(Math.max(0.05, hero.gongli) / Math.max(0.05, foe.gongli)));
    const cost = rules.mpProp ? (k === 'block' ? 0.15 : k === 'rush' ? 0.2 : 0) * hero.mpMax : k === 'block' ? 40 + pw.li : k === 'rush' ? 60 : 0;
    return [{ k, p, cost, dis: cost > mp }];
  }), ...duizhang(pw, w)];

  /** 对掌：只对以力为主的重招，要有内功；成算看双方功力之比（相等五成，深一倍约七成七），内息受伤打折 */
  const duizhang = (pw: Pw, w: Wounds): Opt[] => {
    if (!rules.bipin || hero.hh.block === null || pw.li < Math.max(pw.su, pw.qiao)) return [];
    const lean = Math.log2(Math.max(0.05, hero.gongli) / Math.max(0.05, foe.gongli)) - (woundsOn ? 0.3 * w.inner : 0);
    const cost = Math.round(hero.mpMax * 0.3);
    return [{ k: 'duizhang', p: sig(1.2 * lean), cost, dis: cost > mp }];
  };

  const maybeOpening = (base: number): void => {
    if (over) return;
    if (rng() >= base + Math.max(0, mom - 50) / 250) return;
    log.openings++;
    log.decisions++;
    if (rng() < policy.openTake) {
      rage = Math.min(100, rage + (10) * rk);
      mom = clamp(mom + 12, 5, 95);
      dealt(rr(rng, hero.open), 'open');
      say(`${foe.name}露出破绽，你看得真切，一击得手。${bar()}`);
    } else say(`${foe.name}露出破绽，你慢了半拍，没有抓住。`);
  };

  const heavy = (side = false): void => {
    log.prompts++;
    log.decisions++;
    let i = Math.floor(rng() * foe.tells.length);
    if (!side) {
      if (foe.tells.length > 1) while (i === lastTell) i = Math.floor(rng() * foe.tells.length);
      lastTell = i;
    }
    const fwl = fw();
    const pw0 = foe.tells[i], drop = rules.woundHh * fwl.inner;
    const pw: Pw = drop ? { li: pw0.li - drop, su: pw0.su - drop, qiao: pw0.qiao - drop, xi: pw0.xi - drop } : pw0;
    // 无招：对手比你高明时，你看到的强度带噪声；悟性高看得准
    let seen = pw;
    if (rules.wuzhao) {
      const gap = Math.max(0, foe.tier - hero.tier + 0.5);
      const noise = gap * 12 * (20 / Math.max(10, hero.wu));
      const j = (): number => (rng() * 2 - 1) * noise;
      seen = { li: pw.li + j(), su: pw.su + j(), qiao: pw.qiao + j(), xi: pw.xi + j() };
    }
    const w = wl();
    // 虚实：这一招是不是虚招；玩家看出来几成把握（pF：自己判断它是虚招的把握）
    const fr = feintRate(rules, foe.tier);
    const feint = !side && fr > 0 && rng() < fr;
    let pF = 0;
    if (!side && fr > 0) {
      const a = readAcc(rules, hero.yan ?? 0, foe.yan ?? 0);
      const right = rng() < a;
      const saysFeint = feint === right;
      pF = saysFeint ? (fr * a) / (fr * a + (1 - fr) * (1 - a)) : (fr * (1 - a)) / (fr * (1 - a) + (1 - fr) * a);
    }
    // 成算并进虚实
    // kanpo：照常应对，要它是实招才算数；识破，要它真是虚招
    // adapt：每种应对的成算 = 是实招的把握 × 对实招的成算 + 是虚招的把握 × 应付虚招的几率
    const vs = (k: RespKey): number => VS_FEINT[k as BaseResp] ?? 0;
    const merge = (os: Opt[]): Opt[] => {
      if (!(fr > 0 && !side)) return os;
      if (rules.xushiMode === 'adapt') return os.map(o => ({ ...o, raw: o.p, p: (1 - pF) * o.p + pF * vs(o.k) }));
      return [...os.map(o => ({ ...o, p: o.p * (1 - pF) })), { k: 'kanpo' as RespKey, p: pF, cost: 0, dis: false }];
    };
    const optsSeen = merge(options(seen, w));
    const optsTrue = merge(options(pw, w));
    if (feint) log.feints++;
    if (woundsOn) {
      const best = (os: Opt[]): RespKey | undefined => os.filter(x => !x.dis).sort((a, b) => b.p - a.p)[0]?.k;
      const clean = options(pw, { hand: 0, foot: 0, inner: 0 });
      if (best(clean) && best(optsTrue) && best(clean) !== best(optsTrue)) log.bestShift++;
    }
    const k = policy.pick(optsSeen, seen, rng);
    const o = optsTrue.find(x => x.k === k);
    if (trace) {
      const top = (['li', 'su', 'qiao'] as const).slice().sort((a, b) => pw[b] - pw[a])[0];
      const feel = { li: '内劲极沉', su: '快得惊人', qiao: '变化繁复' }[top];
      const w = wl();
      const hurtTxt = w.hand + w.foot + w.inner ? `（身上带伤：${w.hand ? `手${w.hand}级 ` : ''}${w.foot ? `足${w.foot}级 ` : ''}${w.inner ? `内息${w.inner}级` : ''}）` : '';
      say(`${side ? '旁边的人' : foe.name}出重招，${feel}。${hurtTxt}你掂量：${optsSeen.filter(x => !x.dis).map(x => `${RESP_NAME[x.k]}${cn(x.p)}`).join('、')}——你选了${k ? RESP_NAME[k] : '（无从招架）'}。`);
    }
    if (!o) {
      mom = clamp(mom - 12, 5, 95);
      hurt(foe.big * prep.big * 1.2, 'inner', 'big');
      return;
    }
    if (o.k === 'kanpo') {
      if (feint) {
        log.saw++;
        rage = Math.min(100, rage + (12) * rk); mom = clamp(mom + 15, 5, 95);
        dealt(rr(rng, hero.open), 'open');
        say(`你看破这是虚招，乘虚而入！${bar()}`);
      } else {
        log.misread++;
        mom = clamp(mom - 12, 5, 95);
        hurt(foe.big * prep.big * 1.2, 'inner', 'big');
        say(`你只当是虚招，不料这一招是实的，结结实实挨了一记。${bar()}`);
      }
      return;
    }
    mp = Math.max(0, mp - o.cost);
    if (feint && rules.xushiMode === 'adapt' && rng() < vs(o.k)) {
      // 应付过去了：看破虚招，乘虚而入
      log.saw++;
      rage = Math.min(100, rage + (12) * rk); mom = clamp(mom + 12, 5, 95);
      say(`${foe.name}这一招原来是虚的，你${RESP_NAME[o.k]}之际看得分明，乘虚而入。${bar()}`);
      maybeOpening(1);
      return;
    }
    if (feint) {
      // 照常应对，扑了空：对手虚晃一招，顺势带了你一下
      log.fooled++;
      mom = clamp(mom - 8, 5, 95);
      hurt(foe.big * prep.big * 0.6, ZONE_OF[o.k], 'big');
      say(`原来是虚招，你${RESP_NAME[o.k]}扑了个空，被他顺势带了一下。${bar()}`);
      return;
    }
    if (rules.strain && (o.k === 'block') && w.inner > 0) hurt(hero.hpMax * 0.03 * w.inner, null, 'strain');
    if (over) return;
    if (o.k === 'duizhang') {
      log.bipin++;
      if (rng() < o.p) { rage = Math.min(100, rage + (15) * rk); mom = clamp(mom + 20, 5, 95); dealt(rr(rng, hero.counter.block) * 2.5, 'bipin'); }
      else { mom = clamp(mom - 18, 5, 95); hurt(foe.big * prep.big * 1.5, 'inner', 'big'); }
      return;
    }
    if (rng() < o.p) {
      rage = Math.min(100, rage + (12) * rk);
      if (side) { mom = clamp(mom + 4, 5, 95); say('拆开了。'); return; }
      say(`${RESP_NAME[o.k]}得手！${bar()}`);
      if (o.k === 'block') { mom = clamp(mom + 15, 5, 95); dealt(rr(rng, hero.counter.block), 'counter'); }
      else if (o.k === 'dodge') { mom = clamp(mom + 8, 5, 95); maybeOpening(1); }
      else if (o.k === 'parry') {
        mom = clamp(mom + 20, 5, 95);
        const k2 = rules.jieli ? clamp(1 + (pw.li - (hero.hh.block ?? pw.li)) / 20, 0.7, 2) : 1;
        dealt(rr(rng, hero.counter.parry) * k2, 'counter');
      } else { mom = clamp(mom + 15, 5, 95); dealt(rr(rng, hero.counter.rush), 'counter'); }
    } else {
      const mul = { block: 0.8, dodge: 1, parry: 1.1, rush: 1.3, duizhang: 1.5, kanpo: 1.2 }[o.k];
      const dm = { block: 10, dodge: 8, parry: 12, rush: 15, duizhang: 18, kanpo: 12 }[o.k];
      mom = clamp(mom - dm, 5, 95);
      let d = foe.big * prep.big * mul * (1 - 0.1 * fw().hand);
      if (rules.jiali && o.k === 'block' && hero.gongli < foe.gongli * 0.5) d *= 1.3; // 反震
      hurt(d, ZONE_OF[o.k], 'big');
      say(`${RESP_NAME[o.k]}失手，结结实实挨了一记，${{ inner: '内息翻涌', foot: '腿上中了一下', hand: '臂上中了一下' }[ZONE_OF[o.k]]}。${bar()}`);
    }
  };

  const playerAuto = (): void => {
    const r = rng(), dg = foe.dodge - (mom - 50) * 0.002 - 0.04 * fw().foot, pr = foe.parry - (mom - 50) * 0.002;
    if (r < dg || r < dg + pr) return;
    let d = rr(rng, hero.auto);
    if (woundsOn) d *= 1 - 0.1 * wl().hand;
    const crit = rng() < 0.1;
    if (crit) d *= 1.6;
    mom = clamp(mom + (crit ? 8 : 5), 5, 95);
    dealt(d, 'auto');
    maybeOpening(0.12);
  };

  const foeAuto = (): void => {
    const r = rng();
    const w = wl();
    let dg = hero.dodge + (mom - 50) * 0.003;
    if (woundsOn) dg -= 0.04 * w.foot;
    const pr = hero.parry;
    if (r < dg) { mom = clamp(mom + 2, 5, 95); maybeOpening(0.2); return; }
    if (r < dg + pr) { maybeOpening(0.12); return; }
    mom = clamp(mom - 5, 5, 95);
    hurt(rr(rng, foe.atk) * prep.atk * (1 - 0.1 * fw().hand), rng() < 0.5 ? 'hand' : 'foot', 'foeAuto');
  };

  const usePerforms = (): void => {
    if (!policy.performs) return;
    hero.performs.forEach((p, i) => {
      if (over || pcd[i] > 0 || mp < p.mp) return;
      pcd[i] = p.cd;
      mp -= p.mp;
      log.decisions++;
      if (rules.strain && wl().inner > 0) hurt(hero.hpMax * 0.03 * wl().inner, null, 'strain');
      if (over) return;
      if (rng() < p.acc) {
        dealt(rr(rng, p.dmg), 'perform');
        say(`你使出${p.name}，正中${p.hold ? '，点住了穴道' : ''}。${bar()}`);
        if (p.hold && foeImmune <= 0) { foeHeld = p.hold; }
      }
    });
    if (hero.ult && rage >= 100 && !over) { rage = 0; log.decisions++; dealt(rr(rng, hero.ult), 'ult'); say(`怒气满盈，你出杀招！${bar()}`); }
  };

  for (let t = 0; t < 200 * crowd.n && !over; t++) {
    log.ticks++;
    tick = log.ticks;
    const regen = woundsOn ? hero.mpRegen * (1 - 0.25 * wl().inner) : hero.mpRegen;
    mp = Math.min(hero.mpMax, mp + regen);
    for (let i = 0; i < pcd.length; i++) pcd[i] = Math.max(0, pcd[i] - 1);
    if (foeImmune > 0) foeImmune--;
    usePerforms();
    if (over) break;
    const isHeld = foeHeld > 0;
    if (isHeld) { foeHeld--; if (foeHeld === 0) foeImmune = rules.holdImmune; heldRun++; log.maxHeld = Math.max(log.maxHeld, heldRun); } else heldRun = 0;
    nextTell--;
    if (nextTell <= 0 && !isHeld) {
      heavy();
      nextTell = 4 + Math.floor(rng() * 3);
    } else if (isHeld || rng() < 0.26 + mom * 0.0048) playerAuto();
    else foeAuto();
    // 围着的其他人：每人每合有一半机会出手，隔四到六次出手来一记重招
    const others = Math.min(crowd.maxAtk, left + 1) - 1;
    for (let j = 0; j < others && !over; j++) {
      if (sideTell[j] === undefined) sideTell[j] = 4 + Math.floor(rng() * 3);
      if (rng() >= rules.crowdEff) continue;
      if (--sideTell[j] <= 0) { sideTell[j] = 4 + Math.floor(rng() * 3); heavy(true); }
      else foeAuto();
    }
    track();
  }
  if (!over) { log.win = hp / hero.hpMax > ehp / (foe.hpMax * prep.hp); }
  say(log.win ? `你赢了。${bar()}` : `你输了。${bar()}`);
  log.taken = { hand: woundLv(hurtBy.hand), foot: woundLv(hurtBy.foot), inner: woundLv(hurtBy.inner) };
  if (!log.win) log.deficit = 0;
  return log;
}

/** 跑很多场，汇总胜率和体感 */
export interface Summary {
  n: number;
  win: number;
  /** 回合数的中位数，以及换算成秒（每合 1.5 秒，重招应对另算约 3 秒） */
  ticksMed: number;
  seconds: number;
  decisions: number;
  prompts: number;
  openings: number;
  /** 决定性时刻（破绽、应对反击、绝招、杀招、比拼）占玩家伤害的比例 */
  decisiveShare: number;
  /** 赢的场次里，最后一击来自决定性时刻的比例 */
  decisiveFinish: number;
  swings: number;
  /** 赢的场次里，曾经落后两成五以上的比例（翻盘） */
  comeback: number;
  maxHeld: number;
  /** 每场里受伤改变最好应对的平均次数，以及至少改变一次的场次比例 */
  bestShift: number;
  bestShiftAny: number;
  bipin: number;
  /** 虚实：每场平均出几次虚招，识破、上当、错当虚招各几次 */
  feints: number;
  saw: number;
  fooled: number;
  misread: number;
}

export function many(hero: Hero, foe: Foe, policy: Policy, rules: Rules, n: number, salt = 0, crowd?: Crowd): Summary {
  const logs: FightLog[] = [];
  for (let i = 0; i < n; i++) logs.push(fight(hero, foe, policy, rules, (salt * 1000003 + i * 7919 + 13) >>> 0, crowd));
  const avg = (f: (l: FightLog) => number, ls = logs): number => (ls.length ? ls.reduce((s, l) => s + f(l), 0) / ls.length : 0);
  const ticks = logs.map(l => l.ticks).sort((a, b) => a - b);
  const wins = logs.filter(l => l.win);
  const DEC: Source[] = ['open', 'counter', 'perform', 'ult', 'bipin'];
  const tot = logs.reduce((s, l) => s + Object.values(l.dealt).reduce((a, b) => a + (b ?? 0), 0), 0);
  const dec = logs.reduce((s, l) => s + DEC.reduce((a, k) => a + (l.dealt[k] ?? 0), 0), 0);
  const med = ticks[Math.floor(ticks.length / 2)];
  return {
    n, win: wins.length / n, ticksMed: med,
    seconds: med * 1.5 + avg(l => l.prompts) * 3,
    decisions: avg(l => l.decisions), prompts: avg(l => l.prompts), openings: avg(l => l.openings),
    decisiveShare: tot ? dec / tot : 0,
    decisiveFinish: wins.length ? wins.filter(l => l.last && DEC.includes(l.last)).length / wins.length : 0,
    swings: avg(l => l.swings),
    comeback: wins.length ? wins.filter(l => l.deficit >= 0.25).length / wins.length : 0,
    maxHeld: Math.max(0, ...logs.map(l => l.maxHeld)),
    bestShift: avg(l => l.bestShift), bestShiftAny: logs.filter(l => l.bestShift > 0).length / n,
    bipin: avg(l => l.bipin),
    feints: avg(l => l.feints), saw: avg(l => l.saw), fooled: avg(l => l.fooled), misread: avg(l => l.misread)
  };
}
