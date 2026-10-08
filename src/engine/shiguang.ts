/**
 * 光阴：江湖的钟怎样走（docs/foundation.md 第三节第三、九、十条，数由 src/lab/model/life.ts 验过）。
 * - 江湖跑不过现实（铁律）：江湖的日数，最多比开局以来的现实小时数多十日。闭关、歇息都拨不过这条线。
 * - 下线就是静修：现实一小时算江湖一日，一次离开最多算十六日。回来先读出关邸报。
 * - 静修：先养伤，再打坐长功力、参悟化历练（engine/lilian.ts）。心魔每一层，成效打八折；重了会走火。
 * - 约：人物和你定约。静修碰到约期，就在约期那天一早出关；过了约期还没了结，就是失约，生一层心魔。
 */
import { tickShi } from './shishi';
import { pushFeed, type GameState, type Yue } from '../core/state';
import { advanceDays, advanceMin, dayNo, nowMs } from '../core/time';
import { NEWS, npc, room, skillById } from '../content';
import type { SkillId } from '../content/types';
import { run, test } from './dsl';
import { gainProf } from './growth';
import { DAZUO, jingxiuPlan, retreatPlan } from './lilian';
import { syncBody } from './ren';
import { npcName } from './world';

/** 铁律的余裕（日）、一次离开最多算几日、现实一小时算江湖几日 */
export const SHIGUANG = { slack: 10, awayCap: 16, perHour: 1 };
/**
 * 嚼用：住下房一日一钱银子（一百文，docs/foundation.md 第三节第六条）；钱不够就露宿，不花钱，养伤慢一倍。
 * 身上留一百文盘缠不拿来住店：一趟长闭关不至于把人花得一文不剩，连买条鱼、打点衙役的钱都没有（机器玩家摸底时发现）。
 */
export const LODGING = { inn: 100, lusuHeal: 6, keep: 100 };
/** 心魔：每层打几折；每个江湖日淡多少层；几层以上静修会走火，走火一日的几率、一次掉几成功力 */
export const XINMO = { k: 0.2, decay: 1 / 40, zouhuoAt: 2, zouhuoP: 0.02, zouhuoLoss: 0.1, max: 3 };

const H = 3.6e6;
/** 开局以来过了几个现实小时 */
export const realHours = (s: GameState): number => Math.max(0, (nowMs() - s.real.start) / H);
/** 铁律：现在还能往前拨几个江湖日 */
export const allowance = (s: GameState): number => Math.max(0, Math.floor(realHours(s) + SHIGUANG.slack - (dayNo(s) - s.real.startDay)));
/** 离开了几个现实小时 */
export const awayHours = (s: GameState): number => Math.max(0, (nowMs() - s.real.seen) / H);

/** 最近一个还没到期的约 */
export const nextYue = (s: GameState): Yue | undefined => s.yue.filter(y => y.due >= dayNo(s)).sort((a, b) => a.due - b.due)[0];

/** 想静修 want 日，实际能修几日：受铁律约束；碰到约期，就在约期那天一早出关 */
export function restDays(s: GameState, want: number): { days: number; why?: 'tielv' | 'yue'; yue?: Yue } {
  let days = Math.max(0, Math.floor(want)), why: 'tielv' | 'yue' | undefined, yue: Yue | undefined;
  const al = allowance(s);
  if (al < days) { days = al; why = 'tielv'; }
  const y = nextYue(s);
  if (y && y.due - dayNo(s) < days) { days = Math.max(0, y.due - dayNo(s)); why = 'yue'; yue = y; }
  return { days, why, yue };
}

/** 歇脚能等到的几个钟点（docs/huojianghu.md 第三节第二条：人有作息，玩家要等得到夜里、等得到天亮） */
export const XIEJIAO: [number, string][] = [[6, '天亮'], [12, '晌午'], [17, '傍晚'], [21, '入夜']];

/** 从现在等到 hour 点要几分钟（今天过了就是明天） */
export const waitMin = (s: Pick<GameState, 'min'>, hour: number): number => {
  const m = hour * 60 - s.min;
  return m > 0 ? m : m + 1440;
};
/** 等得了吗：跨过半夜要多用一个江湖日，铁律还有余裕才行 */
export const canWait = (s: GameState, hour: number): boolean => s.min + waitMin(s, hour) < 1440 || allowance(s) >= 1;

/** 歇脚：在原地等到某个钟点。等不了（江湖跑不过现实）返回零，否则返回等了几分钟 */
export function waitUntil(s: GameState, hour: number): number {
  if (!canWait(s, hour)) return 0;
  const m = waitMin(s, hour);
  advanceMin(s, m);
  return m;
}

export interface RestReport {
  days: number;
  used: number;
  gains: [SkillId, number][];
  breaks: string[];
  healed: Partial<Record<'hand' | 'foot' | 'inner', number>>;
  gongli: number;
  zouhuo: number;
  news: string[];
  missed: string[];
  /** 住处：全住了店，还是有几夜露宿；住店花了多少文 */
  lodging: 'inn' | 'lusu';
  cost: number;
  lusuDays: number;
}

/** 静修 days 日：养伤、打坐、参悟，江湖历往前走，出关时气血内力回满。返回邸报要写的东西 */
export function jingxiu(s: GameState, days: number, rng: () => number = Math.random): RestReport {
  const xm0 = s.xinmo.n;
  const xm1 = Math.max(0, xm0 - XINMO.decay * days);
  const eff = Math.max(0.2, 1 - XINMO.k * (xm0 + xm1) / 2);
  // 嚼用：盘缠以外的钱够住几日住几日，余下的日子露宿，伤好得慢（按住店、露宿的日子折算养伤的快慢）
  const innDays = Math.max(0, Math.min(days, Math.floor((s.silver - LODGING.keep) / LODGING.inn)));
  const cost = innDays * LODGING.inn, lusuDays = days - innDays;
  s.silver -= cost;
  const jx = jingxiuPlan(s, days, eff, lusuDays ? Math.round((innDays * DAZUO.healDays + lusuDays * LODGING.lusuHeal) / days) : undefined);
  for (const [z, n] of Object.entries(jx.healed) as ['hand' | 'foot' | 'inner', number][]) s.wounds[z] = Math.max(0, s.wounds[z] - n);
  s.gongli = Math.round((s.gongli + jx.gongli) * 100) / 100;
  // 心魔重了，静修时会走火：功力掉一成
  let zouhuo = 0;
  if (xm0 >= XINMO.zouhuoAt) for (let i = 0; i < days; i++) if (rng() < XINMO.zouhuoP) { s.gongli = Math.round(s.gongli * (1 - XINMO.zouhuoLoss) * 100) / 100; zouhuo++; }
  s.xinmo.n = Math.round(xm1 * 1000) / 1000;
  if (s.xinmo.n < 0.05) s.xinmo = { n: 0, why: '' };
  // 参悟：把历练化成功夫
  const { used, gains } = retreatPlan(s, days, eff);
  s.lilian -= used;
  const breaks = gains.flatMap(([k, v]) => gainProf(k, v));
  syncBody(s);
  advanceDays(s, days);
  s.min = 7 * 60 + 10;
  s.hp = s.hpMax; s.mp = s.mpMax;
  // 静修的日子里，江湖自己往前走（engine/shishi.ts）：这一带的事传到耳朵里的先写，再补几句闲话传闻
  const heard = tickShi();
  const pool = NEWS.filter(n => test(n.if)).map(n => n.text);
  const news: string[] = [...heard];
  const more: string[] = [];
  for (let i = 0; i < Math.min(3, Math.ceil(days / 5)) - heard.length && pool.length; i++) more.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  more.slice().reverse().forEach(n => pushFeed('传闻', n));
  news.push(...more);
  const missed = checkYue(s);
  return { days, used, gains, breaks, healed: jx.healed, gongli: jx.gongli, zouhuo, news, missed, lodging: lusuDays ? 'lusu' : 'inn', cost, lusuDays };
}

/** 过了约期还没了结的约：失约。执行失约的后果，生一层心魔。返回失约的说明 */
export function checkYue(s: GameState): string[] {
  const today = dayNo(s), out: string[] = [];
  for (const y of s.yue.filter(x => x.due < today)) {
    s.yue = s.yue.filter(x => x !== y);
    const who = npcName(y.npc);
    if (y.miss) run(y.miss);
    addXinmo(s, 1, `失约于${who}`);
    const line = `你没有赴${who}的约（${y.text}）。`;
    pushFeed('江湖', line);
    out.push(line);
  }
  return out;
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

/** 下线回来：离开的现实小时，算成静修的日子（一次最多十六日，受铁律和约约束）。不够一日不算 */
export function settleAway(s: GameState, rng: () => number = Math.random): (RestReport & { hours: number; why?: 'tielv' | 'yue'; yue?: Yue }) | null {
  const hours = awayHours(s);
  const want = Math.min(SHIGUANG.awayCap, Math.floor(hours * SHIGUANG.perHour));
  if (want < 1) return null;
  const r = restDays(s, want);
  s.real.seen = nowMs();
  if (r.days < 1) return null;
  return { ...jingxiu(s, r.days, rng), hours, why: r.why, yue: r.yue };
}

/** 武功的名字 */
export const skillName = (id: SkillId): string => skillById(id)?.name ?? id;
