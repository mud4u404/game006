/**
 * 光阴：江湖的钟怎样走（docs/foundation.md 第三节第三、九、十条，数由 src/lab/model/life.ts 验过）。
 * - 江湖跑不过现实（铁律）：江湖的日数，最多比开局以来的现实小时数多十日。闭关、歇息都拨不过这条线。
 * - 下线就是静修：现实一小时算江湖一日，一次离开最多算十六日。回来先读出关邸报。
 * - 静修：先养伤，再打坐长功力、参悟化历练（engine/lilian.ts）。心魔每一层，成效打八折；重了会走火。
 * - 约：人物和你定约。静修碰到约期，就在约期那天一早出关；过了约期还没了结，就是失约，生一层心魔。
 */
import { tickShiFull } from './shishi';
import { dibao, type DibaoSrc } from './chuanwen';
import { S, pushFeed, type GameState, type Yue, type Zhu } from '../core/state';
import { cn } from '../core/util';
import { advanceDays, advanceMin, dayNo, nowMs } from '../core/time';
import { jobById, npc, room, skillById } from '../content';
import type { Effect, SkillId } from '../content/types';
import { run } from './dsl';
import { gainProf } from './growth';
import { jingxiuPlan, retreatPlan } from './lilian';
import { healLight, markLight } from './shang';
import { syncBody } from './ren';
import { npcName } from './world';
import { tickWorld, worldRng } from './shijie';

/** 铁律的余裕（日）、一次离开最多算几日、现实一小时算江湖几日 */
export const SHIGUANG = { slack: 10, awayCap: 16, perHour: 1 };
/**
 * 嚼用：住下房一日一钱银子（一百文，docs/foundation.md 第三节第六条）；钱不够就露宿，不花钱，睡不安稳，那几日打坐、参悟打八折。
 * 身上留一百文盘缠不拿来住店：一趟长闭关不至于把人花得一文不剩，连买条鱼、打点衙役的钱都没有（机器玩家摸底时发现）。
 */
export const LODGING = { inn: 100, lusuEff: 0.8, keep: 100 };

/**
 * 住处三选一（docs/paiban.md D05，负责人 10-09 同意）：闭关、下线前自己选，下线沿用上回的选择。
 * 客栈一日一百文，钱不够的那几夜露宿；露宿不花钱，打坐参悟打八折；有师门的回师门住，不花钱。
 * 选了师门、后来没了师门的，算客栈。
 */
export function zhuOf(s: GameState): Zhu {
  if (s.zhu === 'lusu') return 'lusu';
  if (s.zhu === 'home' && s.sect) return 'home';
  return 'inn';
}
export const ZHU_NAME: Record<Zhu, string> = { inn: '客栈', lusu: '露宿', home: '师门' };
/** 心魔：每层打几折；每个江湖日淡多少层；几层以上静修会走火，走火一日的几率、一次掉几成功力 */
export const XINMO = { k: 0.2, decay: 1 / 40, zouhuoAt: 2, zouhuoP: 0.02, zouhuoLoss: 0.1, max: 3 };

const H = 3.6e6;
/** 开局以来过了几个现实小时 */
export const realHours = (s: GameState): number => Math.max(0, (nowMs() - s.real.start) / H);
/** 修为额度用完时，闭关、静修的那几日怎么说 */
export const TIELV_TEXT = '江湖的日子走在现实前头，这几日修为没有长进，伤照样养。';

/** 已经用掉的修为日：闭关、静修里真长了修为的日子 */
export const grownOf = (s: GameState): number => s.real.grown ?? Math.max(0, dayNo(s) - s.real.startDay);
/**
 * 铁律（宪章 P7，负责人 10-09 改定）：限制变强的速度，不限制玩的权利。
 * 现在还能长几日修为（闭关、静修里消化历练、长功力的日子）；日子本身随时可以往前走，逛、打、办事、挣钱、歇脚、住店、闭关都不拦。
 * 封顶在余裕加一次离开最多算的日子：不然离开三天回来，剩下的几十日点闭关全拿回来，一次离开的上限形同虚设（审查 G06）
 */
export const allowance = (s: GameState): number =>
  Math.max(0, Math.min(SHIGUANG.slack + SHIGUANG.awayCap, Math.floor(realHours(s) + SHIGUANG.slack - grownOf(s))));
/** 离开了几个现实小时 */
export const awayHours = (s: GameState): number => Math.max(0, (nowMs() - s.real.seen) / H);

/** 最近一个还没到期的约 */
export const nextYue = (s: GameState): Yue | undefined => s.yue.filter(y => y.due >= dayNo(s)).sort((a, b) => a.due - b.due)[0];

/**
 * 想静修 want 日：碰到约期，就在约期那天一早出关；其中只有修为额度之内的日子长修为（grow），
 * 超出的日子照样过、照样养伤，只是修为不长（why 为 tielv）
 */
export function restDays(s: GameState, want: number): { days: number; grow: number; why?: 'tielv' | 'yue'; yue?: Yue } {
  let days = Math.max(0, Math.floor(want)), why: 'tielv' | 'yue' | undefined, yue: Yue | undefined;
  const y = nextYue(s);
  if (y && y.due - dayNo(s) < days) { days = Math.max(0, y.due - dayNo(s)); why = 'yue'; yue = y; }
  const grow = Math.min(days, allowance(s));
  if (grow < days && !why) why = 'tielv';
  return { days, grow, why, yue };
}

/** 歇脚能等到的几个钟点（docs/huojianghu.md 第三节第二条：人有作息，玩家要等得到夜里、等得到天亮） */
export const XIEJIAO: [number, string][] = [[6, '天亮'], [12, '晌午'], [17, '傍晚'], [21, '入夜']];

/** 从现在等到 hour 点要几分钟（今天过了就是明天） */
export const waitMin = (s: Pick<GameState, 'min'>, hour: number): number => {
  const m = hour * 60 - s.min;
  return m > 0 ? m : m + 1440;
};
/**
 * 过了半夜会误事吗：今日还有约没了结，一过半夜就是失约（审查 G01：人就站在约定的地方，歇脚到天亮也判失约）。
 * 只提醒，不拦（10-09 试玩：有今日差事时歇脚键全灰，玩家只能空点「观察」熬夜）。不会误事返回 null
 */
export function nightWarn(s: GameState): string | null {
  const y = s.yue.find(x => x.due === dayNo(s));
  return y ? `今日还约着${npcName(y.npc)}（${y.text}），过了半夜就是失约。` : null;
}
/** 闭关能不能开始：今日有约就先去赴约（闭关是一闭几日，碰到约期会提前出关，今日的约一日也闭不了）。闭得了返回 null */
export const retreatBlock = (s: GameState): string | null => {
  const w = restDays(s, 1).days < 1 ? nightWarn(s) : null;
  return w ? `${w}先去赴了约再闭关。` : null;
};
/** 等到 hour 点要不要跨过半夜 */
export const crossesNight = (s: Pick<GameState, 'min'>, hour: number): boolean => s.min + waitMin(s, hour) >= 1440;

/** 这串效果一共要拨过几分钟（只看 time）。住店睡到天亮、陪人等一夜这类 */
export function minutesOf(s: Pick<GameState, 'min'>, effects: readonly Effect[] = []): number {
  let m = s.min;
  for (const e of effects) {
    if (e.type !== 'time') continue;
    if (e.add) m += e.add;
    if (e.set !== undefined) { let d = e.set - (m % 1440); if (d < 0) d += 1440; m += d; }
    if (e.until !== undefined && e.until > m % 1440) m += e.until - (m % 1440);
  }
  return m - s.min;
}
/** 这串效果跨过半夜会误事吗（住店睡到天亮、陪人等一夜这类）：只提醒，不拦。不误事返回 null */
export const passWarn = (s: GameState, effects?: readonly Effect[]): string | null => (s.min + minutesOf(s, effects) < 1440 ? null : nightWarn(s));

/** 歇脚：在原地等到某个钟点，返回等了几分钟 */
export function waitUntil(s: GameState, hour: number): number {
  const m = waitMin(s, hour);
  advanceMin(s, m);
  return m;
}

export interface RestReport {
  days: number;
  /** 其中长了修为的日子（铁律的额度之内） */
  grow: number;
  used: number;
  gains: [SkillId, number][];
  breaks: string[];
  healed: Partial<Record<'hand' | 'foot' | 'inner', number>>;
  gongli: number;
  zouhuo: number;
  news: string[];
  /** 邸报每一条的来处（tests/huo.test.ts 的 K9 核对用，界面不读） */
  newsSrc?: DibaoSrc[];
  missed: string[];
  /** 选的住处；住客栈的，钱不够那几夜露宿（lusuDays） */
  lodging: Zhu;
  cost: number;
  lusuDays: number;
}

/**
 * 静修 days 日：养伤、打坐、参悟，江湖历往前走，出关时气血内力回满。返回邸报要写的东西。
 * 只有前 grow 日长修为（消化历练、长功力；铁律的额度，见 allowance），其余的日子只养伤
 */
export function jingxiu(s: GameState, days: number, rng: () => number = worldRng, grow: number = Math.min(days, allowance(s))): RestReport {
  grow = Math.max(0, Math.min(days, Math.floor(grow)));
  const xm0 = s.xinmo.n;
  const xm1 = Math.max(0, xm0 - XINMO.decay * days);
  // 嚼用：住客栈的，盘缠以外的钱够住几日住几日，余下的日子露宿，睡不安稳，那几日打坐、参悟打八折；
  // 自己选露宿的全露宿；回师门的不花钱、不打折
  const zhu = zhuOf(s);
  const innDays = zhu === 'home' ? days : zhu === 'lusu' ? 0 : Math.max(0, Math.min(days, Math.floor((s.silver - LODGING.keep) / LODGING.inn)));
  const cost = zhu === 'inn' ? innDays * LODGING.inn : 0, lusuDays = days - innDays;
  s.silver -= cost;
  const eff = Math.max(0.2, 1 - XINMO.k * (xm0 + xm1) / 2) * (days ? (innDays + lusuDays * LODGING.lusuEff) / days : 1);
  const jx = jingxiuPlan(s, days, eff);
  for (const [z, n] of Object.entries(jx.healed) as ['hand' | 'foot' | 'inner', number][]) s.wounds[z] = Math.max(0, s.wounds[z] - n);
  markLight(s);
  // 功力只在长修为的日子里长
  const gl = grow >= days ? jx.gongli : grow > 0 ? jingxiuPlan(s, grow, eff).gongli : 0;
  s.gongli = Math.round((s.gongli + gl) * 100) / 100;
  // 心魔重了，静修时会走火：功力掉一成
  let zouhuo = 0;
  if (xm0 >= XINMO.zouhuoAt) for (let i = 0; i < days; i++) if (rng() < XINMO.zouhuoP) { s.gongli = Math.round(s.gongli * (1 - XINMO.zouhuoLoss) * 100) / 100; zouhuo++; }
  s.xinmo.n = Math.round(xm1 * 1000) / 1000;
  if (s.xinmo.n < 0.05) s.xinmo = { n: 0, why: '' };
  // 参悟：把历练化成功夫
  const { used, gains } = grow > 0 ? retreatPlan(s, grow, eff) : { used: 0, gains: [] as [SkillId, number][] };
  s.lilian -= used;
  s.real.grown = grownOf(s) + grow;
  const breaks = gains.flatMap(([k, v]) => gainProf(k, v));
  syncBody(s);
  const fromDay = dayNo(s);
  advanceDays(s, days);
  s.min = 7 * 60 + 10;
  s.hp = s.hpMax; s.mp = s.mpMax;
  // 静修的日子里，江湖自己往前走：世界的慢变、传闻人传人逐日补上（engine/shijie.ts、engine/chuanwen.ts），
  // 世事到日子的往下走（engine/shishi.ts）。邸报只写真事：传到耳朵里的、这一带传开的、熟人托人带的（engine/chuanwen.ts 的 dibao）
  tickWorld(s);
  const db = dibao(s, fromDay, tickShiFull());
  const missed = checkYue(s);
  return { days, grow, used, gains, breaks, healed: jx.healed, gongli: gl, zouhuo, news: db.map(x => x.text), newsSrc: db.map(x => x.src), missed, lodging: zhu, cost, lusuDays };
}

/** 这个约是榜上揭的差事（JobDef.bang），或者交给一件物件的：误了期不算失信于人 */
const bangYue = (y: Yue): boolean => y.id.startsWith('job_') && (!!jobById(y.id.slice(4))?.bang || !!npc(y.npc)?.obj);

/** 过了约期还没了结的约：失约。执行失约的后果，生一层心魔。返回失约的说明 */
export function checkYue(s: GameState): string[] {
  // 日子往前走了：轻伤过一日自己好（engine/shang.ts）
  healLight(s);
  const today = dayNo(s), out: string[] = [];
  for (const y of s.yue.filter(x => x.due < today)) {
    s.yue = s.yue.filter(x => x !== y);
    const who = npcName(y.npc);
    if (y.miss) run(y.miss);
    // 榜上揭的差事（JobDef.bang，府衙照壁的悬赏），误了期是营生上的事，不是失信于人：不生心魔（审查 G18：对木榜心中有愧）
    if (!bangYue(y)) addXinmo(s, 1, `失约于${who}`);
    const line = `你没有赴${who}的约（${y.text}）。`;
    pushFeed('江湖', line);
    out.push(line);
  }
  return out;
}

/**
 * 心魔的一句说明（人物页、出关邸报）：静修受多大影响、会不会走火、怎么淡。
 * 审查 G17、G19、G26：原来写「还诺、赔罪才化得开」，可内容里没有一处化得开；走火事先不提；淡到很小时写「静修打十折」
 */
export function xinmoLine(s: GameState = S): string {
  const z = Math.round((1 - XINMO.k * s.xinmo.n) * 10);
  const eff = z >= 10 ? '静修几乎不受影响' : `静修打${cn(z)}折`;
  const fire = s.xinmo.n >= XINMO.zouhuoAt ? '心魔已重，静修时有走火之虞，一走火就掉功力' : `到了${cn(XINMO.zouhuoAt)}层，静修会走火`;
  return `心中有愧（${s.xinmo.why}），${eff}；${fire}。它会随日子慢慢淡。`;
}

/** 心魔加减：加的时候记下为了什么 */
export function addXinmo(s: GameState, d: number, why?: string): void {
  s.xinmo.n = Math.max(0, Math.min(XINMO.max, s.xinmo.n + d));
  if (d > 0 && why) s.xinmo.why = why;
  if (s.xinmo.n <= 0) s.xinmo = { n: 0, why: '' };
}

/** 约的说法：「三日后，柳寒舟在瘦西湖畔等你」 */
export function yueText(s: GameState, y: Yue): string {
  const d = y.due - dayNo(s);
  const n = ['', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十'][d] ?? String(d);
  // 差事是限期（几日之内交差都算），约是那一天见面
  if (y.id.startsWith('job_')) {
    // 交给人是「找某某交差」，交到榜上是「在某处的悬赏榜交差」
    const to = npc(y.npc)?.obj ? `到${room(y.at).name}的${npcName(y.npc)}交差` : `到${room(y.at).name}找${npcName(y.npc)}交差`;
    return `${d <= 0 ? '今日之内' : d === 1 ? '明日之内' : `${n}日之内`}：${y.text}（${to}）`;
  }
  const when = d <= 0 ? '今日' : d === 1 ? '明日' : `${n}日后`;
  return `${when}，${npcName(y.npc)}在${room(y.at).name}等你：${y.text}`;
}

/** 下线回来：离开的现实小时，算成静修的日子（一次最多十六日；碰到约期提前出关；长修为受铁律额度管）。不够一日不算 */
export function settleAway(s: GameState, rng: () => number = worldRng): (RestReport & { hours: number; why?: 'tielv' | 'yue'; yue?: Yue }) | null {
  // 序章里不结算：江伯病着，不是闭关的时候（原来下线回来写「在渡口小屋静修了六日……露宿了六夜」，审查 G02）
  if (s.chapter === 0) { s.real.seen = nowMs(); return null; }
  const hours = awayHours(s);
  const want = Math.min(SHIGUANG.awayCap, Math.floor(hours * SHIGUANG.perHour));
  if (want < 1) return null;
  const r = restDays(s, want);
  s.real.seen = nowMs();
  if (r.days < 1) return null;
  return { ...jingxiu(s, r.days, rng, r.grow), hours, why: r.why, yue: r.yue };
}

/** 武功的名字 */
export const skillName = (id: SkillId): string => skillById(id)?.name ?? id;
