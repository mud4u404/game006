/**
 * 人生：模拟玩家按现实时间过日子（验证用）。
 *
 * 时间：
 * - 在线是「行走」：每在线一小时，江湖过半日；挣历练、银两，也会受伤。
 * - 下线是「静修」：现实一小时算江湖一日，一次离开最多十日；这些日子分给打坐（长功力）、参悟（化历练）、养伤。
 * - 铁律：江湖的日数，最多比开局以来的现实小时数多十日。
 *
 * 修炼：
 * - 武功：第 R 重累计要 60 × R³ 的熟练；历练靠参悟化成熟练，按主修 0.42、另两门各 0.29 分（偏科）。
 * - 瓶颈：主修入一流（5.5 重）、入宗师（8.5 重）要机缘才能突破；机缘在在线时找到。
 * - 功力：打坐一日，补上「天花板 − 现有功力」的 k；天花板由内功重数定；大周天快一倍，有走火的风险。
 *
 * 经济：每在线一小时按档次挣银两；每个江湖日要嚼用（下房一钱，露宿不花钱）。
 */
import { mulberry32, type Rng } from '../../engine/rng';

export const TIER_AT_R = [1, 2.5, 4, 5.5, 7, 8.5];
/** 各档功力的阶梯（年）：不入流、三流、二流、一流、绝顶、宗师 */
export const GONGLI_LADDER = [1.5, 5, 12, 28, 45, 70];

export interface LifeParams {
  /** 第 R 重累计要多少熟练：k × R³ */
  needK: number;
  /** 每在线一小时挣多少历练：base × growth^档 */
  lilianBase: number;
  lilianGrowth: number;
  /** 开篇（前三个在线小时）剧情另给的历练 */
  opening: number;
  /** 参悟一日化多少历练：base × growth^档 */
  digestBase: number;
  /** 打坐：一日补上缺口的几分之几（饱和曲线） */
  dazuoK: number;
  /**
   * 功力的长法：saturate 为饱和曲线（贴着天花板走，天花板看内功）；
   * years 为岁月曲线（按静修的日子稳稳地长，一日 rate × (0.7 + 0.06 × 内功重数) 年；天花板放到阶梯的 ceilK 倍）。
   * 第二十一轮发现：饱和曲线下功力其实跟着内功重数走，地利、大周天都几乎没用，「功力看岁月」落空。
   */
  gongliMode: 'saturate' | 'years';
  rate: number;
  /** 天花板：内功第 R 重时是多少年（按阶梯插值后乘这个倍数） */
  ceilK: number;
  /** 瓶颈处每在线一小时找到机缘的几率 */
  jiyuanP: number;
  /** 每档每在线小时挣多少两银子 */
  income: number[];
  /** 开篇剧情里的机缘：功力加几年（江伯的遗物、了尘的指点） */
  openingGongli: number;
  /** 药：治一级伤要多少两（乘 1.5^档）；钱够三份才买 */
  medicine: number;
  /** 在线练功一小时，相当于参悟几分之几日 */
  onlineDigest: number;
  /** 下房一日的嚼用（两） */
  living: number;
  /** 一次离开最多算几日；铁律的余裕几日 */
  awayCap: number;
  slack: number;
  /** 根骨每高常人一点，打坐快几成（第二十二轮：岁月曲线下 3% 太大，根骨 10 和 30 功力差八成） */
  genRate: number;
}

/** 验证下来定的数（每一个怎样标出来的，见 src/lab/model/README.md） */
export const LIFE0: LifeParams = {
  needK: 39, lilianBase: 100, lilianGrowth: 1.2, opening: 1300, digestBase: 17, openingGongli: 2, medicine: 0.3, onlineDigest: 0.1,
  dazuoK: 0.01, gongliMode: 'years', rate: 0.04, ceilK: 2.5, jiyuanP: 0.15,
  income: [0.5, 2.2, 8, 25, 60, 120], living: 0.1, awayCap: 16, slack: 10, genRate: 0.01
};

/** 一天里什么时候在线：[开始的钟点, 时长（小时）] */
export interface Profile {
  name: string;
  sessions: [number, number][];
  /** 开篇以后还打不打（只走主线的人不打） */
  fights: boolean;
  /**
   * 静修里打坐占几成（其余参悟；有伤先养伤）。
   * 写 'parallel'：打坐和参悟同时进行，不用分（第二十轮发现：分配不是真正的选择，多打坐纯属吃亏）。
   */
  dazuoShare: number | 'parallel';
  /** 静修的地方合不合内功的性质（寒潭、古刹……）：打坐快几成 */
  dili?: number;
  /** 大周天的打法：never 全程小周天；always 全程大周天；smart 功力不到天花板一半才大周天 */
  zhoutian: 'never' | 'always' | 'smart';
  /** 根骨、悟性（先天） */
  gen: number;
  wu: number;
  /** 住处：下房，或者钱不够一两就露宿 */
  lodging: 'inn' | 'thrifty';
  /** 在线时想把江湖历往前拨（连点歇息），每在线小时想拨几日 */
  skip?: number;
}

const P0 = { dazuoShare: 'parallel' as const, zhoutian: 'never' as const, gen: 20, wu: 20, lodging: 'thrifty' as const };
export const PROFILES: Profile[] = [
  { name: '勤奋', sessions: [[12.5, 1], [20, 1.5]], fights: true, ...P0 },
  { name: '休闲', sessions: [[21, 1]], fights: true, ...P0 },
  { name: '狂刷', sessions: [[10, 3], [19, 3]], fights: true, ...P0 },
  { name: '只挂机', sessions: [[21, 1 / 6]], fights: false, ...P0 },
  { name: '只走主线', sessions: [[12.5, 1], [20, 1.5]], fights: false, ...P0 }
];

/** 一生里值得一提的长进：哪一门武功进了一重、档次升了、碰上机缘 */
export interface Gain { hour: number; what: string }

export interface LifeLog {
  profile: string;
  /** 各档第一次到达时，是第几个现实日（小数）、累计在线几小时、功力几年、江湖第几日 */
  reach: { tier: number; day: number; onlineH: number; gongli: number; jhDay: number }[];
  gains: Gain[];
  /** 铁律：江湖日最多超出现实小时多少；被拦下的在线小时 */
  maxAhead: number;
  blockedH: number;
  /** 历练排队：化不开、积压的最多有多少 */
  maxBacklog: number;
  /** 银两：各档每个现实日的净收入（两）；攒到三十两是第几个现实日 */
  silverAt30?: number;
  netByTier: number[];
  zouhuo: number;
  bottlenecks: number;
  final: { R: number; inner: number; gongli: number; tier: number; silver: number };
  /** 每个现实日结束时的样子（写江湖日记用） */
  daily: { day: number; R: number; inner: number; gongli: number; tier: number; silver: number; jh: number; wound: number }[];
}

const lerpG = (t: number): number => {
  const i = Math.max(0, Math.min(GONGLI_LADDER.length - 2, Math.floor(t)));
  const f = Math.max(0, Math.min(1, t - i));
  return Math.exp(Math.log(GONGLI_LADDER[i]) + (Math.log(GONGLI_LADDER[i + 1]) - Math.log(GONGLI_LADDER[i])) * f);
};
/** 主修重数换算成档次（连续） */
export const tierOfR = (R: number): number => Math.max(0, (R - 1) / 1.5);
/** 内功第 R 重的功力天花板 */
export const ceilingOf = (Rinner: number, p: LifeParams, gen = 20): number => p.ceilK * lerpG(tierOfR(Rinner + 1)) * (1 + 0.01 * (gen - 20));
/** 累计熟练换算成重数：R = (熟练 / k)^(1/3)，至少一重 */
const realmOf = (xp: number, k: number): number => Math.max(1, Math.cbrt(xp / k));

export function live(pr: Profile, p: LifeParams, days: number, seed: number): LifeLog {
  const rng: Rng = mulberry32(seed);
  const log: LifeLog = { profile: pr.name, reach: [], gains: [], maxAhead: 0, blockedH: 0, maxBacklog: 0, netByTier: [], zouhuo: 0, bottlenecks: 0, final: { R: 1, inner: 1, gongli: 0, tier: 0, silver: 0 }, daily: [] };
  const xp = { main: 0, inner: 0, light: 0 };
  let pool = 0, gongli = 1.5, silver = 0.03, jh = 0, onlineH = 0, wound = 0, tierSeen = 0;
  let neck: number | null = null; // 正卡在哪个瓶颈（5.5 或 8.5）
  let stuck = 0; // 卡在瓶颈上找了几个在线小时
  const passed = new Set<number>();
  /** 各档的收支：挣了多少、花了多少、在这一档过了几个现实小时 */
  const acc: Record<number, { inc: number; cost: number; hours: number }> = {};
  const A = (t: number) => (acc[t] ??= { inc: 0, cost: 0, hours: 0 });
  const R = (): number => realmOf(xp.main, p.needK);
  const tier = (): number => tierOfR(R());
  const tierI = (): number => Math.floor(tier() + 1e-9);
  const gain = (h: number, what: string): void => { log.gains.push({ hour: h, what }); };

  /** 把历练化进三门武功，过瓶颈时卡住 */
  const cheng = (R: number): number => Math.floor(R * 10);
  const digest = (amt: number, h: number): void => {
    const before = { m: Math.floor(R()), i: Math.floor(realmOf(xp.inner, p.needK)), l: Math.floor(realmOf(xp.light, p.needK)) };
    const c0 = cheng(R()), c1 = cheng(realmOf(xp.inner, p.needK)), c2 = cheng(realmOf(xp.light, p.needK));
    const add = Math.min(pool, amt);
    if (add <= 0) return;
    // 瓶颈：主修到 5.5、8.5 重，没破之前主修不再长，它那一份留在积压里；另两门照常长
    let mainAdd = add * 0.42;
    for (const b of [5.5, 8.5]) {
      const cap = p.needK * b ** 3;
      if (!passed.has(b) && xp.main + mainAdd >= cap) {
        if (neck === null) { neck = b; stuck = 0; log.bottlenecks++; }
        mainAdd = Math.max(0, cap - xp.main);
      }
    }
    pool -= mainAdd + add * 0.58;
    xp.main += mainAdd; xp.inner += add * 0.29; xp.light += add * 0.29;
    const after = { m: Math.floor(R()), i: Math.floor(realmOf(xp.inner, p.needK)), l: Math.floor(realmOf(xp.light, p.needK)) };
    if (after.m > before.m) gain(h, `主修第${after.m}重`);
    else if (cheng(R()) > c0) gain(h, '主修火候长了一成');
    if (cheng(realmOf(xp.inner, p.needK)) > c1 && after.i === before.i) gain(h, '内功火候长了一成');
    if (cheng(realmOf(xp.light, p.needK)) > c2 && after.l === before.l) gain(h, '轻功火候长了一成');
    if (after.i > before.i) gain(h, `内功第${after.i}重`);
    if (after.l > before.l) gain(h, `轻功第${after.l}重`);
  };

  const checkTier = (h: number): void => {
    // 档次按主修重数，但功力不到这一档阶梯的一半，不算到了
    const t = tierI();
    for (let k = tierSeen + 1; k <= t; k++) {
      if (gongli < GONGLI_LADDER[k] * 0.5) break;
      tierSeen = k;
      log.reach.push({ tier: k, day: h / 24, onlineH, gongli, jhDay: jh });
      gain(h, `到了第${k}档`);
    }
  };

  let away = 0; // 这一次离开了几小时
  for (let h = 0; h < days * 24; h++) {
    const hourOfDay = h % 24;
    const on = pr.sessions.some(([s, d]) => hourOfDay >= Math.floor(s) && hourOfDay < Math.floor(s) + Math.max(1, Math.ceil(d)));
    const frac = pr.sessions.find(([s, d]) => hourOfDay >= Math.floor(s) && hourOfDay < Math.floor(s) + Math.max(1, Math.ceil(d)))?.[1] ?? 0;
    const onFrac = on ? Math.min(1, frac) : 0;
    if (on) {
      // 回来：结算这一次静修
      if (away > 0) { rest(Math.min(away, p.awayCap), h); away = 0; }
      // 行走：江湖过半日（想多拨的，被铁律拦下）
      const want = 0.5 * onFrac + (pr.skip ?? 0) * onFrac;
      const limit = h + 1 + p.slack - jh;
      const step = Math.max(0, Math.min(want, limit));
      if (step < want - 1e-9) log.blockedH += onFrac * (1 - step / want);
      jh += step;
      liveDays(step);
      onlineH += onFrac;
      // 开篇的历练：剧情里有一场闭关，直接化开
      if (onlineH <= 3) { pool += p.opening / 3 * onFrac; digest(p.opening / 3 * onFrac, h); }
      const opening = 0;
      if (onlineH >= 3 && onlineH - onFrac < 3) { gongli += p.openingGongli; gain(h, '开篇的机缘：功力加深'); }
      const t = tierI();
      if (pr.fights || onlineH <= 3) {
        pool += (p.lilianBase * p.lilianGrowth ** t * (1 - 0.05 * wound)) * onFrac + opening;
        silver += p.income[t] * onFrac;
        A(t).inc += p.income[t] * onFrac;
        // 打斗受伤：每在线一小时三成机会落一级伤
        if (rng() < 0.3 * onFrac) wound = Math.min(3, wound + 1);
      }
      // 钱够就买药治伤
      const med = p.medicine * 1.5 ** t;
      while (wound > 0 && silver >= 3 * med) { silver -= med; A(t).cost += med; wound--; }
      // 在瓶颈上：在线找机缘
      if (neck !== null) stuck += onFrac;
      if (neck !== null && rng() < (p.jiyuanP + 0.05 * stuck) * onFrac) { passed.add(neck); gain(h, `机缘破了${neck === 5.5 ? '入一流' : '入宗师'}的瓶颈`); neck = null; }
      // 在线时也化一点（练功一趟）：每在线小时相当于参悟两成日
      digest(p.digestBase * p.lilianGrowth ** t * (1 + 0.03 * (pr.wu + 2 * R() - 20)) * p.onlineDigest * onFrac, h);
      checkTier(h);
    } else away++;
    A(tierI()).hours++;
    log.maxAhead = Math.max(log.maxAhead, jh - (h + 1));
    log.maxBacklog = Math.max(log.maxBacklog, pool);
    if (log.silverAt30 === undefined && silver >= 30) log.silverAt30 = h / 24;
    if (hourOfDay === 23) log.daily.push({ day: Math.floor(h / 24) + 1, R: R(), inner: realmOf(xp.inner, p.needK), gongli, tier: tierSeen, silver, jh, wound });
  }
  log.netByTier = [0, 1, 2, 3, 4, 5].map(t => (acc[t] && acc[t].hours >= 24 ? ((acc[t].inc - acc[t].cost) / acc[t].hours) * 24 : NaN));
  log.final = { R: R(), inner: realmOf(xp.inner, p.needK), gongli, tier: tier(), silver };
  return log;

  /** 江湖过了 d 日：嚼用 */
  function liveDays(d: number): void {
    const t = tierI();
    const cost = pr.lodging === 'thrifty' && silver < 1 ? 0 : p.living * d;
    silver -= cost;
    A(t).cost += cost;
  }

  /** 静修：现实 hours 小时，算江湖 hours 日（受铁律约束） */
  function rest(hours: number, h: number): void {
    const limit = h + p.slack - jh;
    const d = Math.max(0, Math.min(hours, limit));
    jh += d;
    liveDays(d);
    let left = d;
    // 先养伤：一级伤养三日
    const heal = Math.min(left, wound * 3);
    wound = Math.max(0, wound - Math.floor(heal / 3));
    left -= heal;
    const dz = pr.dazuoShare === 'parallel' ? left : left * pr.dazuoShare;
    const cw = pr.dazuoShare === 'parallel' ? left : left - dz;
    // 参悟
    const t = tierI();
    digest(p.digestBase * p.lilianGrowth ** t * (1 + 0.03 * (pr.wu + 2 * R() - 20)) * cw, h);
    // 打坐
    const inner = realmOf(xp.inner, p.needK);
    const C = ceilingOf(inner, p, pr.gen);
    const layer = (g: number): number => (g < 10 ? Math.floor(g) : 10 + Math.floor((g - 10) / 5));
    const g0 = layer(gongli);
    for (let i = 0; i < Math.round(dz); i++) {
      const big = pr.zhoutian === 'always' || (pr.zhoutian === 'smart' && gongli < C * 0.5);
      const boost = (1 + p.genRate * (pr.gen - 20)) * (pr.dili ?? 1) * (big ? 2 : 1);
      if (p.gongliMode === 'saturate') gongli += p.dazuoK * boost * Math.max(0, C - gongli);
      else if (gongli < C) gongli = Math.min(C, gongli + p.rate * (0.7 + 0.06 * inner) * boost);
      if (big && rng() < 0.03) { gongli *= 0.7; log.zouhuo++; }
    }
    if (layer(gongli) > g0) gain(h, '功力又深了一层');
    checkTier(h);
  }
}

