/** 行动协议：先算代价，付得起才结算；同一凭据只结算一回。 */
import type { Branch, Cond, Effect } from '../content/types';
import { jobById, npc, skillById } from '../content';
import { SECT_RANKS } from '../content/skills';
import { S, pushFeed, save, setState, type GameState } from '../core/state';
import { emit } from '../core/bus';
import { absMin, dayNo } from '../core/time';
import { newOutcome, pickBranch, runStep, test, withRunHooks, type Outcome } from './dsl';
import { barredFrom, canLearn, gongxianCost, learnCost, rootHint } from './shicheng';
import { gainProf } from './growth';
import { autoSlot } from './wuxue';
import { minutesOf } from './shiguang';
import { kpMark, kpPos } from './kaipian';
import { zhuangPlan, type ZhuangPlan } from './zhudi';

export interface ActionReq {
  who: 'player' | string;
  verb: string;
  target?: string;
  at?: string;
  key?: string;
  cause?: string;
  /** 现有内容的适配入口；省略时从人物动作分支取效果 */
  effects?: readonly Effect[];
  if?: Cond;
  /** 开始条件之外，耗时之后再查的完成条件；失败仍保留 key，不能重领或重退 */
  finish?: Cond;
  /** 完成条件不成立时退还这些资源代价；时间不能退 */
  refundable?: readonly Effect[];
  /** 同一次结算引出的后续行动；规则模块的嵌套 run 也走此口 */
  chains?: readonly ActionReq[];
}
export interface ActionPlan {
  ok: boolean;
  why?: string;
  cost: Effect[];
  gain: Effect[];
  minutes: number;
}
export interface EventRec {
  n: number;
  day: number;
  min: number;
  who: string;
  verb: string;
  target?: string;
  at?: string;
  cost: Effect[];
  gain: Effect[];
  key?: string;
  cause?: number;
  /** 失败、截断也留来由；不占用内容旗标 */
  why?: string;
}
export interface ActionResult extends ActionPlan { out: Outcome; event?: EventRec }

export const VERB_MIN: Record<string, number> = { 观察: 5, 细看: 5, 推门: 2, 交谈: 10, 打听: 10, 盘问: 10, 购买: 5, 打赏: 5, 赠礼: 5, 抓药: 10, 偷窃: 5, 请教: 30 };
export const LOG_LIMIT = 300;
export const CHAIN_DEPTH = 3;
export const CHAIN_LIMIT = 10;

type GxEffect = Extract<Effect, { type: 'gongxian' }> & { school?: string };
interface LearnPrice { price: number; gx: number; school: string }
interface Prepared extends ActionPlan { learned: Map<string, LearnPrice>; training?: ZhuangPlan }
const nextN = (): number => (S.log?.at(-1)?.n ?? 0) + 1;
const reward = (e: Effect): boolean =>
  (e.type === 'silver' || e.type === 'item' || e.type === 'gongxian') ? e.delta > 0 :
    e.type === 'lilian' || e.type === 'prof' ? e.amount > 0 : e.type === 'learn' || e.type === 'jobDone' || e.type === 'quest';
const resource = (e: Effect): boolean =>
  (e.type === 'silver' || e.type === 'item' || e.type === 'gongxian') ? e.delta < 0 : e.type === 'lilian' ? e.amount < 0 :
    e.type === 'heal' && ((typeof e.hp === 'number' && e.hp < 0) || (typeof e.mp === 'number' && e.mp < 0));
const copy = <T>(x: T): T => structuredClone(x);

/** 没钱的回绝不能遮住标价；真实的赊账、免钱分支则仍然能做。 */
export function actionBranch(id: string, verb: string, preview = false): Branch | undefined {
  const bs = npc(id)?.actions[verb], real = pickBranch(bs);
  if (!preview || real?.do?.some(e => e.type !== 'time')) return real;
  return bs?.find(b => {
    const { silver: _s, canLearn: learn, gongxian: _g, ...rest } = b.if ?? {};
    if (!test(rest)) return false;
    const def = learn && skillById(learn);
    return !def || canLearn({ ...S, lilian: Infinity, gongxian: { ...S.gongxian, [def.school]: Infinity } }, def).ok;
  }) ?? real;
}

/** 内容适配器配凭据：差事按揭榜日，日级营生按日，其余交易、奖励按本次行动流水。 */
export function effectReq(verb: string, target: string, effects: readonly Effect[] = [], condition?: Cond, scope = target + ':' + verb): ActionReq {
  const req: ActionReq = { who: 'player', verb, target, at: S.loc, effects, if: condition };
  if (!effects.some(reward)) return req;
  const job = effects.find(e => e.type === 'jobDone');
  const today = effects.find(e => e.type === 'today');
  if (job?.type === 'jobDone') {
    const def = jobById(job.id);
    req.key = `job:${job.id}:${S.job?.id === job.id && def ? S.job.due - def.days : '未揭榜'}`;
  } else if (today?.type === 'today') req.key = `today:${today.id}:${dayNo(S)}`;
  else if (effects.some(resource)) req.key = `paid:${scope}:${nextN()}`;
  else {
    const shi = condition?.shi && S.shi?.[condition.shi.id];
    req.key = `gain:${scope}${shi ? ':' + shi.since + ':' + (shi.done ?? 0) : ''}:${nextN()}`;
  }
  return req;
}

type StoryPos = NonNullable<GameState['storyAt']>;
/** 打开或续读剧情：时辰和流水区分本次；断点里的凭据不会因刷新、耗时而变化。 */
export function storyOpen(id: string, i = 0): StoryPos {
  const held = S.storyAt;
  const pos = held?.id === id && held.i === i ? { ...held } : { id, i, started: `${absMin(S)}:${nextN()}` };
  S.storyAt = { ...pos };
  return pos;
}

/** 同一次遇见、同一张卡共用凭据，花钱的选项也不能重复领取。 */
export function storyReq(pos: StoryPos, effects: readonly Effect[] = [], condition?: Cond): ActionReq {
  const req = effectReq('抉择', pos.id, effects, condition);
  if (effects.some(reward)) req.key = `story:${pos.id}:${pos.started}:${pos.i}`;
  return req;
}

/** 与奖励一起写下一张卡的断点；开打、转剧情和收尾交还给各自的入口。 */
export function storyCheckpoint(pos: StoryPos, cardCount: number, out: Outcome, next: number): void {
  if (!out.fight && !out.story && next >= 0 && next < cardCount) S.storyAt = { ...pos, i: next };
  else delete S.storyAt;
}

/** 战后接续入口：同一场的静默结果和结算页继续共用凭据，不改交手规则。 */
export function fightAfterReq(foe: string, started: string, effects: readonly Effect[] = []): ActionReq {
  return { who: 'player', verb: '战后', target: foe, at: S.loc, effects, key: `fight:${foe}:${started}:after` };
}

/** 战后接续和开局断点同时存下；刷新接下一段，不重开刚结算过的仗。 */
export function fightCheckpoint(out: Outcome): void {
  if (kpPos(S)?.kind !== 'fight') return;
  kpMark(S, out.story ? { kind: 'story', id: out.story, i: 0 } : out.fight ? { kind: 'fight', id: out.fight } : null);
}

function prepare(req: ActionReq): Prepared {
  const p: Prepared = { ok: true, cost: [], gain: [], minutes: 0, learned: new Map() };
  const deny = (why: string): Prepared => { p.ok = false; p.why = why; return p; };
  if (req.verb === '练桩') {
    if (req.who !== 'player') return deny('练桩的行动者不合。');
    p.training = zhuangPlan(S, req.target ?? S.loc);
    if (!p.training.ok) return deny(p.training.why!);
    if (req.key !== p.training.key) return deny('练桩的凭据还未定下。');
  }
  const b = req.effects === undefined && req.target ? actionBranch(req.target, req.verb, true) : undefined;
  const rawEffects = p.training?.effects ?? req.effects ?? (b && !b.do?.some(e => ['time', 'fight', 'story'].includes(e.type)) && !b.if?.doneToday
    ? [...(b.do ?? []), { type: 'time' as const, add: VERB_MIN[req.verb] ?? 10 }] : b?.do ?? []);
  // 条件银两在开始时定下；不生效的既不预付也不列所得，生效的不能因耗时后条件变化再漏扣。
  const effects = rawEffects.flatMap<Effect>(e => {
    if (e.type !== 'silver') return [e];
    if (!test(e.if)) return [];
    const { if: _if, ...active } = e;
    return [active];
  });
  const condition = req.if ?? b?.if;
  if (!req.who || !req.verb) return deny('行动缺少来由。');
  if (req.at && req.who === 'player' && req.at !== S.loc) return deny('你不在此处。');
  if (req.key && S.log?.some(e => e.key === req.key)) return deny('这件事已经结算过了。');
  if (effects.some(reward) && !req.key) return deny('这件事的凭据还未定下。');
  // 人物资源、作息分别在 022、023 项接；当前入口不能花玩家的钱、长玩家的武功。
  if (req.who !== 'player' && effects.some(e => !['w', 'feed', 'toast', 'time'].includes(e.type)))
    return deny('人物的持有物尚未接入。');
  const shadow = { ...S, skills: copy(S.skills), sect: S.sect && { ...S.sect }, pastSects: S.pastSects?.map(x => ({ ...x })) };
  const times: Effect[] = [];
  for (const e of effects) {
    const number = 'delta' in e ? e.delta : 'amount' in e ? e.amount : undefined;
    if (number !== undefined && !Number.isFinite(number)) return deny('代价或所得不合数。');
    if (e.type === 'time') {
      if ([e.add, e.set, e.until].some(x => x !== undefined && (!Number.isFinite(x) || x < 0))) return deny('耗时不合数。');
      times.push(copy(e));
    } else if (resource(e)) {
      if (e.type === 'gongxian') {
        if (!shadow.sect) return deny('尚无师门，不能付门派贡献。');
        p.cost.push({ ...e, school: shadow.sect.school } as GxEffect);
      } else p.cost.push(copy(e));
    } else {
      p.gain.push(copy(e));
      if (e.type === 'sect') {
        if (!shadow.sect && !barredFrom(shadow, e.school)) shadow.sect = { school: e.school, rank: e.rank };
        else if (shadow.sect?.school === e.school && SECT_RANKS.indexOf(e.rank) > SECT_RANKS.indexOf(shadow.sect.rank)) shadow.sect.rank = e.rank;
      }
      if (e.type === 'leaveSect' && shadow.sect) {
        (shadow.pastSects ??= []).push({ school: shadow.sect.school, how: e.how });
        delete shadow.sect;
      }
      if (e.type === 'jobDone' && (!jobById(e.id) || S.job?.id !== e.id)) return deny('手上没有这件差事，不能交差。');
      if (e.type === 'learn' && !shadow.skills[e.skill]) {
        const def = skillById(e.skill);
        if (!def) return deny('找不到这门武功。');
        const price = e.lilian ?? learnCost(def), gx = gongxianCost(def);
        if (!Number.isFinite(price) || price < 0) return deny('学艺代价不合数。');
        // 门规、根基和前置照旧；资源统一在下面合计，不能各自够、合起来却不够。
        const can = canLearn({ ...shadow, lilian: Infinity, gongxian: { ...shadow.gongxian, [def.school]: Infinity } }, def, price);
        if (!can.ok) return deny(can.why);
        if (price) p.cost.push({ type: 'lilian', amount: -price });
        if (gx) p.cost.push({ type: 'gongxian', delta: -gx, school: def.school } as GxEffect);
        p.learned.set(e.skill, { price, gx, school: def.school });
        shadow.skills[e.skill] = { r: e.realm ?? 0, p: e.prof ?? 0 };
      }
    }
  }
  p.minutes = minutesOf(S, times);
  if (p.minutes) p.cost.push({ type: 'time', add: p.minutes });
  let silver = S.silver, lilian = S.lilian, hp = S.hp, mp = S.mp;
  const items = { ...S.items }, gx = { ...S.gongxian };
  for (const e of p.cost) {
    if (e.type === 'silver' && (silver += e.delta) < 0) return deny('囊中银两不足。');
    if (e.type === 'lilian' && (lilian += e.amount) < 0) return deny('历练不足。');
    if (e.type === 'heal') {
      if (typeof e.hp === 'number' && (hp += e.hp) < 0) return deny('气血不足。');
      if (typeof e.mp === 'number' && (mp += e.mp) < 0) return deny('内力不足。');
    }
    if (e.type === 'item' && (items[e.id] = (items[e.id] ?? 0) + e.delta) < 0) return deny('行囊里的物件不足。');
    if (e.type === 'gongxian') {
      const school = (e as GxEffect).school ?? S.sect?.school ?? '';
      if ((gx[school] = (gx[school] ?? 0) + e.delta) < 0) return deny(`${school}贡献不足。`);
    }
  }
  if (!test(condition)) return deny('眼下还办不了这件事。');
  // 只允许退这回实际预付的部分；不能借退费凭空生钱。
  const refundable = req.refundable ?? [];
  const remaining = copy(p.cost);
  for (const e of refundable) {
    const index = remaining.findIndex(x => JSON.stringify(x) === JSON.stringify(e));
    if (!resource(e) || index < 0) return deny('可退的代价与预付不符。');
    remaining.splice(index, 1);
  }
  return p;
}

/** 只读状态，不扣钱、不走时间、不抽随机数、不写记录或存档。 */
export function plan(req: ActionReq): ActionPlan {
  const { learned: _learned, training: _training, ...p } = prepare(req);
  return p;
}

interface Settlement { count: number; depth: number; parent?: number; notices: string[]; truncated: Set<string> }
let settling: Settlement | undefined;
function record(req: ActionReq, p: ActionPlan, why?: string): EventRec {
  const cause = req.cause === undefined ? settling?.parent : Number(req.cause);
  const e: EventRec = { n: nextN(), day: dayNo(S), min: S.min, who: req.who, verb: req.verb,
    ...(req.target === undefined ? {} : { target: req.target }), at: req.at ?? S.loc,
    cost: logEffects(p.cost), gain: logEffects(p.gain), ...(req.key ? { key: req.key } : {}),
    ...(Number.isInteger(cause) && cause! > 0 ? { cause } : {}), ...(why ? { why } : {}) };
  (S.log ??= []).push(e);
  S.log = S.log.slice(-LOG_LIMIT);
  return e;
}
/** 界面长文字照常显示，但不重复塞进最近三百条事实记录。 */
const logEffects = (effects: readonly Effect[]): Effect[] => copy(effects.filter(e => e.type !== 'feed' && e.type !== 'toast'));
function mergeOut(into: Outcome, from: Outcome): void {
  Object.assign(into.vars, from.vars);
  into.breaks.push(...from.breaks);
  if (from.fight) into.fight = from.fight;
  if (from.story) into.story = from.story;
  if (from.moved) into.moved = true;
}

/** 提交草稿时保留规则模块手里已有的对象引用（世事一步的 st、父事件等）。 */
function commitInto(old: Record<string, unknown>, draft: Record<string, unknown>): void {
  for (const k of Object.keys(old)) if (!(k in draft)) delete old[k];
  for (const [k, value] of Object.entries(draft)) {
    const previous = old[k];
    if (Array.isArray(value) && Array.isArray(previous) && k === 'log') {
      const byN = new Map((previous as EventRec[]).map(e => [e.n, e]));
      old[k] = (value as EventRec[]).map(e => {
        const held = byN.get(e.n);
        if (!held) return e;
        if (held !== e) Object.assign(held, e);
        return held;
      });
    } else if (value && previous && typeof value === 'object' && typeof previous === 'object' && !Array.isArray(value) && !Array.isArray(previous))
      commitInto(previous as Record<string, unknown>, value as Record<string, unknown>);
    else old[k] = value;
  }
}

/** 每个根行动只写一次存档；checkpoint 把现有剧情断点一并写进草稿，避免先存奖励、后存下一屏。 */
export function act(req: ActionReq, out: Outcome = newOutcome(), checkpoint?: (out: Outcome) => void): ActionResult {
  const p = prepare(req), root = !settling;
  const result: ActionResult = { ok: p.ok, why: p.why, cost: p.cost, gain: p.gain, minutes: p.minutes, out };
  if (!p.ok) return result;
  if (settling && (settling.depth >= CHAIN_DEPTH || settling.count >= CHAIN_LIMIT)) {
    result.ok = false;
    result.why = settling.depth >= CHAIN_DEPTH ? '连锁超过三层，已截断。' : '效果链超过十条，已截断。';
    result.cost = []; result.gain = [];
    // 同一次结算里同一上限只记一次，不能让大量被截断的链挤掉父事件和凭据。
    if (!settling.truncated.has(result.why)) {
      settling.truncated.add(result.why);
      result.event = record({ ...req, verb: '连锁截断', key: undefined }, { ...result, cost: [], gain: [] }, result.why);
    }
    return result;
  }
  // 已结算的记录不再修改，只复制队列；每次点按不必深拷三百条历史及其效果。
  const original = S, draft = copy({ ...S, log: [] as EventRec[] }), work = newOutcome();
  draft.log = S.log.slice();
  if (root) settling = { count: 0, depth: 0, notices: [], truncated: new Set() };
  const ctx = settling!, parent = ctx.parent, noticeCount = ctx.notices.length;
  ctx.depth++; ctx.count++;
  setState(draft);
  try {
    // 先占流水和凭据：后续链不能趁父行动尚未记账重领同一回的好处。
    const event = record(req, { ...p, cost: [], gain: [] });
    ctx.parent = event.n;
    withRunHooks({
      chain: (effects, into) => {
        const child = effectReq('后续', req.target ?? req.verb, effects, undefined, (req.key ?? event.n) + ':chain:' + ctx.count);
        child.who = req.who;
        child.cause = String(event.n);
        act(child, into);
        return into;
      },
      notify: text => ctx.notices.push(text),
      learn: (e, into) => {
        if (S.skills[e.skill]) { into.breaks.push(...gainProf(e.skill, e.prof ?? 0)); return; }
        const def = skillById(e.skill), price = p.learned.get(e.skill);
        if (!def || !price) throw new Error('学艺的预付与结算不符');
        // 代价已在 cost 扣过；只落实武功及反馈，不再让 learnSkill 重扣。
        S.skills[e.skill] = { r: e.realm ?? 0, p: e.prof ?? 0 };
        autoSlot(S, def);
        const msg = `习得「${def.name}」`;
        const paid = [price.price ? `历练 ${price.price}` : '', price.gx ? `${price.school}贡献 ${price.gx}` : ''].filter(Boolean).join('、');
        pushFeed('突破', msg + (paid ? `！拿${paid}换的。` : '！'));
        ctx.notices.push(msg + (paid ? `！${paid.replace(/ /g, ' −')}` : '！'));
        const hint = rootHint(S, def);
        if (hint) pushFeed('江湖', hint);
        into.breaks.push(msg);
      }
    }, () => {
      const cost = req.who === 'player' ? p.cost : p.cost.filter(e => e.type !== 'time');
      runStep(cost, work);
      event.cost = logEffects(p.cost);
      if (!test(req.finish)) {
        const refunds = req.refundable ?? [];
        for (const e of refunds) {
          const refund = e.type === 'lilian' ? { ...e, amount: -e.amount } : e.type === 'heal'
            ? { ...e, hp: typeof e.hp === 'number' ? -e.hp : e.hp, mp: typeof e.mp === 'number' ? -e.mp : e.mp }
            : { ...e, delta: -('delta' in e ? e.delta : 0) };
          runStep([refund as Effect], work);
          event.cost.splice(event.cost.findIndex(x => JSON.stringify(x) === JSON.stringify(e)), 1);
        }
        result.ok = false; result.why = event.why = '耗过了时辰，完成条件已不成立。';
        result.cost = copy(event.cost); result.gain = [];
        return;
      }
      runStep(p.gain, work);
      event.gain = logEffects(p.gain);
      if (p.training) {
        (S.dayLog ??= {})[p.training.daily] = p.training.day;
        if (p.training.grow) S.real.grown = (S.real.grown ?? Math.max(0, p.training.day - S.real.startDay)) + p.training.grow;
        pushFeed('江湖', p.training.note);
      }
      for (const child of req.chains ?? []) {
        const result = act({ ...child, cause: String(event.n) }, work);
        if (!result.ok && (ctx.depth >= CHAIN_DEPTH || ctx.count >= CHAIN_LIMIT)) break;
      }
    });
    if (result.ok) checkpoint?.(work);
    // 嵌套结算可能替换草稿引用；以完成后的 S 为准，保留调用者手上的原状态对象。
    commitInto(original as unknown as Record<string, unknown>, S as unknown as Record<string, unknown>);
    setState(original);
    result.event = S.log.find(e => e.n === event.n);
    mergeOut(out, work);
  } catch (e) {
    setState(original);
    ctx.notices.length = noticeCount;
    result.ok = false; result.cost = []; result.gain = [];
    result.why = `行动未结算：${e instanceof Error ? e.message : String(e)}`;
  } finally {
    ctx.depth--; ctx.parent = parent;
    if (root) {
      settling = undefined;
      if (result.event) {
        save();
        for (const text of ctx.notices) {
          try { emit('toast', text); } catch { /* 界面通知失败不再重领已经结算的好处 */ }
        }
      }
    }
  }
  return result;
}
