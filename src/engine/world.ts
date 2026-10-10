import { S, pushFeed } from '../core/state';
import { cn, fmt } from '../core/util';
import { itemById, jobById, npc, questById, room, skillById } from '../content';
import type { Branch, Cond, EyeDef, NpcDef, QuestStage, RoomDef, Verb } from '../content/types';
import { newOutcome, pickBranch, test, textVars, type Outcome } from './dsl';
import { act as settleAction, actionBranch, effectReq, plan, VERB_MIN, type ActionPlan } from './xingdong';
import { advanceMin, dayNo, shichen, spanLabel } from '../core/time';
import { attrEffects } from './gengu';
import { tierNow } from './ren';
import { eyesOn } from './yan';
import { giftable, have, isPawnshop, pawnPrice, wornAt } from './daoju';
import { warmer } from './renqing';
import { seeShi } from './shishi';
import { ask, panwen } from './chuanwen';
import { jobGongxian, jobPay, shenfenOf } from './shenfen';
import { canLearn } from './shicheng';
import { minutesOf, passWarn } from './shiguang';
import { facName, marksOf, placedHere, refuseOf, tollOf, whereNow } from './shijie';

/** 江湖历的第几分钟（暂时走开的人什么时候回来） */
export const nowMin = (): number => dayNo(S) * 1440 + S.min;

/** 暂时走开了（效果 away）：跳了河、跑了，这几个时辰哪儿都见不到 */
const awayNow = (id: string): boolean => (S.away?.[id] ?? 0) > nowMin();

/** 入夜回家的时辰：亥时到寅时（RoomDef.nightQuiet） */
export const NIGHT_HOME = { from: 21, to: 5 };
const timed = (c?: Cond): boolean => !!c && (!!c.hour || !!c.any?.some(timed));
/** 入夜了还在：住店、看病的铺子开着；手上有约在这儿等你的；住在这儿、守夜的（NpcDef.night） */
function staysAtNight(id: string, roomId: string): boolean {
  const n = npc(id);
  if (!n || n.obj || n.night) return true;
  if (n.service?.some(x => x === '宿' || x === '医')) return true;
  return S.yue.some(y => y.npc === id && y.at === roomId);
}

/**
 * 此刻在场的：带条件的（作息、剧情）按条件挑；同一人写了几处作息的，只算一次。
 * 世界先定（engine/shijie.ts 的 whereNow）：事件把人叫到别处的、伤着的、坐牢的、走了的，不在常待的地方；
 * 叫到这里的、关在这里的，不管作息都在。都没有，才照作息
 */
function present(list: (string | { id: string; if: Cond })[] | undefined, roomId: string, obj: boolean): string[] {
  const h = Math.floor(S.min / 60);
  const quiet = !!room(roomId).nightQuiet && (h >= NIGHT_HOME.from || h < NIGHT_HOME.to);
  const here = (list || []).filter(x => {
    const id = typeof x === 'string' ? x : x.id;
    if (whereNow(id) !== undefined) return false;
    if (typeof x !== 'string' && !test(x.if)) return false;
    if (awayNow(id)) return false;
    // 入夜回家：自己写了作息（带时辰条件）的照作息走
    return !quiet || (typeof x !== 'string' && timed(x.if)) || staysAtNight(id, roomId);
  }).map(x => (typeof x === 'string' ? x : x.id));
  return [...new Set([...here, ...placedHere(roomId, obj).filter(id => !awayNow(id))])];
}

export const roomNpcs = (id: string): string[] => present(room(id).npcs, id, false);
export const roomObjs = (id: string): string[] => present(room(id).objs, id, true);

/** 地点描写；底下接这处地方的痕迹（engine/shijie.ts，最多两行）：码头换了主人、谁挨了打铺子上了门板…… */
export function roomDesc(id: string): string {
  const d = room(id).desc;
  const text = fmt(typeof d === 'string' ? d : pickBranch(d)?.text ?? '', textVars());
  return text + marksOf(id).join('');
}

export function roadText(id: string): string {
  const r = room(id).road;
  if (!r) return '你动身上路……';
  return typeof r === 'string' ? r : pickBranch(r)?.text ?? '你动身上路……';
}

/**
 * 上船付船钱（RoomDef.fare）、过码头交过路钱（RoomDef.life.toll，按眼下的主人算，engine/shijie.ts）：钱够就付；
 * 不够的，替船家撑篙、替码头扛货抵了，路上多耗一个时辰。
 * 界面赶路（ui/explore.ts）和机器玩家都走这里。返回记进动态的那句话，不收钱返回空
 */
export function payFare(to: string): string | null {
  const t = tollOf(to);
  if (!t) return null;
  const r = room(to), fee = t.fee, enough = S.silver >= fee;
  const msg = t.owner
    ? enough
      ? `上了${r.name}，付了船钱 ${t.base} 文；${facName(t.owner)}的人守着码头，另交了过路钱 ${t.extra} 文。`
      : `身上不够船钱和过路钱（共 ${fee} 文），你替${facName(t.owner)}的人扛了一趟货抵了，多耗了一个时辰。`
    : enough
      ? `上了${r.name}，付了船钱 ${fee} 文。`
      : `身上不够船钱（${fee} 文），你替船家撑了一路篙，抵了船钱，路上多耗了一个时辰。`;
  if (enough) S.silver -= fee;
  else advanceMin(S, 60);
  pushFeed('江湖', msg);
  return msg;
}

/**
 * 眼下走得通的出口。序章里（江伯在床上等药）不开船：要坐船的出口一律不显示、不通（审查 A2）。
 * 艄公那边的说法是「天要下大雨，今儿不开船了」
 */
export const openExits = (id: string): RoomDef['exits'] =>
  room(id).exits.filter(([, to]) => !(S.chapter === 0 && room(to).fare));

/** 两地之间赶路的分钟数 */
export const hopMin = (a: string, b: string): number => Math.max(room(a).t, room(b).t) || 10;

/** 按出口做广度优先搜索，返回从 from 到 to 依次经过的地点（不含 from） */
export function pathTo(from: string, to: string): string[] {
  if (from === to) return [];
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const [, next] of openExits(cur)) {
      if (!prev.has(next)) { prev.set(next, cur); queue.push(next); }
    }
  }
  if (!prev.has(to)) return [];
  const path: string[] = [];
  for (let c: string | null | undefined = to; c && c !== from; c = prev.get(c)) path.unshift(c);
  return path;
}

export function pathMin(from: string, to: string): number {
  let cur = from, t = 0;
  for (const n of pathTo(from, to)) { t += hopMin(cur, n); cur = n; }
  return t;
}

/**
 * 这趟路要多久、花多少钱（地图点地名前先给玩家看，负责人 10-09：「成本和时间消耗」要看得见）：
 * 总分钟、经过几处、沿途要付的船钱和过路钱（每上一处有船钱的地方付一回，同 payFare）。去不了返回 null
 */
export function tripCost(to: string): { min: number; hops: number; fee: number } | null {
  const path = pathTo(S.loc, to);
  if (!path.length) return null;
  return { min: travelMin(pathMin(S.loc, to)), hops: path.length, fee: path.reduce((sum, id) => sum + (tollOf(id)?.fee ?? 0), 0) };
}

/** 一步心事此刻的标题和盘算：写了 alt 的，第一条成立的生效（新旧两稿），没写的字段沿用 */
export function stageText(st: QuestStage): { title: string; hint?: string } {
  const a = st.alt?.find(x => test(x.if));
  return { title: a?.title ?? st.title, hint: a?.hint ?? st.hint };
}

/** 当前追踪的任务进度 */
export function curQuest(): { name: string; title: string; to?: string } | null {
  const q = questById(S.track);
  if (!q) return null;
  const st = q.stages[Math.min(S.quests[S.track] ?? 0, q.stages.length - 1)];
  return { name: q.name, title: stageText(st).title, to: st.to };
}

export function npcName(id: string): string {
  const n = npc(id);
  if (!n) return id;
  return n.altName && test(n.altName.if) ? n.altName.name : n.name;
}

/**
 * 人物此刻能点的动作：带 if 的只在条件成立时出现。
 * 人人都有的（docs/huojianghu.md 第三节第三条）：说得上话的人都能打听；当铺（service 有「当」）能典当
 */
export function verbsOf(n: NpcDef): Verb[] {
  const vs = n.verbs.flatMap(v => (typeof v === 'string' ? [v] : test(v.if) ? [v.verb] : []));
  // 跟你动刀子的人（有「动手」）不会跟你聊江湖上的闲话：屠千山刚骂完「滚远点」，不会凑过来讲华山掌门
  const hostile = n.verbs.some(v => (typeof v === 'string' ? v : v.verb) === '动手');
  // 至亲也不打听：卧病的江伯不会说「知道的都跟你说了，改日再来吧」（审查 A13）
  const kin = S.rel[n.id] === '相依为命';
  if (!n.obj && !hostile && !kin && vs.includes('交谈') && !vs.includes('打听')) vs.splice(vs.indexOf('交谈') + 1, 0, '打听');
  // 身份的特权：捕快对谁都能亮腰牌盘问（engine/shenfen.ts 的 verbs）
  const after = (): number => Math.max(vs.indexOf('打听'), vs.indexOf('交谈')) + 1;
  if (!n.obj && vs.includes('交谈')) for (const v of shenfenOf(S).verbs ?? []) if (!vs.includes(v)) vs.splice(after(), 0, v);
  if (isPawnshop(n) && !vs.includes('典当')) vs.push('典当');
  return vs;
}

/** 对人物或物品做一个动作，返回要显示的文字和产生的后果 */
/** 实际赶路的分钟数：身法好的人走得快（engine/gengu.ts） */
export const travelMin = (m: number): number => Math.max(1, Math.round(m * attrEffects(S).travel));

/**
 * 每个动作花多少时间（分钟）。分支里写了 time 效果的，以分支为准；开打、开剧情的，由战斗、剧情自己算时间。
 * 没列出的动作算十分钟。这样在城里走动、和人说话，时辰也会慢慢过去。
 */
export { VERB_MIN } from './xingdong';
const DEFAULT_MIN = 10;

/** 天色转换时记一句见闻 */
const DUSK: Record<string, string> = { 酉时: '日头偏西，天色向晚。', 戌时: '天黑了，街上点起了灯。', 子时: '夜深了，四下里静悄悄的。', 卯时: '天蒙蒙亮了。' };

/**
 * 这个动作要花多少钱（买卖、住店、看伤、打赏……）：按钮上写出价钱，玩家点之前就知道（试玩第三轮：买卖按钮标价）。
 * 看的是「不算银两条件」时会走到的那个分支：钱不够时走到的是「没钱」的回话，不能因此就把价钱藏起来。没有扣钱返回 null
 */
export function verbPrice(id: string, verb: Verb): number | null {
  const bs = npc(id)?.actions[verb as keyof NpcDef['actions']];
  const b = bs?.find(x => { const { silver: _s, ...rest } = x.if ?? {}; return test(rest); });
  if (!b?.do) return null;
  const p = plan(branchReq(id, verb, b, bs?.indexOf(b) ?? 0));
  const price = p.cost.reduce((sum, e) => (e.type === 'silver' && e.delta < 0 ? sum - e.delta : sum), 0);
  return price > 0 ? price : null;
}

/**
 * 一件差事凶险不凶险：差事的档次比你眼下的档次高几档（engine/ren.ts 的 tierNow）。
 * 高一档写「稍险」，高两档「凶险」，高三档以上「极凶险」；不高于你的不写。揭榜按钮标在赏额后头，木剑新人揭剿匪、河贼，点之前就看得出
 */
export function dangerOf(jobTier: number): string | null {
  const gap = jobTier - tierNow(S).t;
  return gap >= 3 ? '极凶险' : gap === 2 ? '凶险' : gap === 1 ? '稍险' : null;
}

/**
 * 这个动作能挣什么（按钮底下的副标，和 verbPrice 标价是一对）：
 * 接差事的（{type:'job'}）标这件差事的报酬——身份的差事标赏钱，师门差事标贡献；
 * 干活得钱的（银两为正）标得多少，耗时一个时辰以上的再标耗多久。看的也是「不算银两条件」时会走到的分支。没有可标的返回 null
 */
export function verbGain(id: string, verb: Verb): string | null {
  const bs = npc(id)?.actions[verb as keyof NpcDef['actions']];
  const b = bs?.find(x => { const { silver: _s, ...rest } = x.if ?? {}; return test(rest); });
  // 一日一回的营生，今天做过了：按钮标出来，点了也不会再干（也不耗时间）
  if (b?.if?.doneToday !== undefined) return '今日已做';
  if (!b?.do) return null;
  const parts: string[] = [];
  for (const e of b.do) {
    if (e.type !== 'job') continue;
    const j = jobById(e.id);
    if (!j) continue;
    if (j.sect) parts.push(`贡献${cn(jobGongxian(j))}`);
    else if (jobPay(j) > 0) {
      const risk = dangerOf(j.tier);
      parts.push(`赏${cn(jobPay(j))}文`);
      if (risk) parts.push(risk);
    }
  }
  const gain = b.do.reduce((sum, e) => (e.type === 'silver' && e.delta > 0 ? sum + e.delta : sum), 0);
  if (gain > 0) parts.push(`得${cn(gain)}文`);
  const m = minutesOf(S, b.do);
  if (gain > 0 && m >= 60) parts.push(`耗${spanLabel(m)}`);
  return parts.length ? parts.join(' · ') : null;
}

/** 钱不够时真正走到的分支只是一句回绝（没有扣钱以外的实效）才算「买不起」；赊账、记账这类还能办事的分支，按钮不灰 */
export function verbPoor(id: string, verb: Verb): boolean {
  return !verbPlan(id, verb).ok;
}

/** 按钮和结算共用同一份行动盘算；赊账、头回免钱的真实分支仍然能走。 */
export function verbPlan(id: string, verb: Verb): ActionPlan {
  const bs = npc(id)?.actions[verb];
  const intended = actionBranch(id, verb, true);
  return plan(branchReq(id, verb, intended, intended ? bs!.indexOf(intended) : 0));
}

function branchReq(id: string, verb: Verb, b: Branch | undefined, index: number) {
  const req = effectReq(verb, id, b?.do, b?.if, `npc:${id}:${verb}:${index}`);
  if (!b?.do?.some(e => ['time', 'fight', 'story'].includes(e.type)) && !b?.if?.doneToday)
    req.effects = [...(req.effects ?? []), { type: 'time', add: VERB_MIN[verb] ?? DEFAULT_MIN }];
  return req;
}

/** 没有明写耗时的动作，在协议里一并预付；失败则不耗时间。 */
function executeBranch(id: string, verb: Verb, b: Branch, index: number, out = newOutcome()) {
  const req = branchReq(id, verb, b, index);
  const before = shichen(S.min);
  return settleAction(req, out, () => {
    const now = shichen(S.min);
    if (!b.do?.some(e => e.type === 'time') && now !== before && DUSK[now]) pushFeed('江湖', DUSK[now]);
  });
}

/** 对人物、物件做一个动作：执行分支，再按动作花掉时间。arg 是赠礼、典当时挑的那件道具 */
export function act(id: string, verb: Verb, arg?: string): { text: string; out: Outcome; eyes: EyeDef[] } {
  const r = doAct(id, verb, arg);
  if (!r.timed && !r.out.fight && !r.out.story && npc(id)) {
    const before = shichen(S.min);
    advanceMin(S, VERB_MIN[verb] ?? DEFAULT_MIN);
    const now = shichen(S.min);
    if (now !== before && DUSK[now]) pushFeed('江湖', DUSK[now]);
  }
  return { text: r.text, out: r.out, eyes: r.eyes ?? [] };
}

function doAct(id: string, verb: Verb, arg?: string): { text: string; out: Outcome; timed?: boolean; eyes?: EyeDef[] } {
  const n = npc(id);
  if (!n) return { text: '', out: newOutcome() };
  const refusal = refuseOf(id, verb);
  if (refusal) return { text: refusal, out: newOutcome(), timed: true };
  if (verb === '观察') {
    // 先是外貌，再接上随条件变化的细节（例如拿到线索以后才看得出的东西）
    const b = pickBranch(n.actions['观察']);
    const before = shichen(S.min);
    let eyes: EyeDef[] = [];
    const result = settleAction(branchReq(id, verb, b, b ? n.actions['观察']!.indexOf(b) : 0), undefined, out => {
      // 根基之眼的后续效果共用这一回的草稿、连锁预算和存档。
      eyes = eyesOn({ npc: id });
      for (const e of eyes) settleAction(effectReq('观察所得', id, e.do, undefined, `eye:${id}:${e.attr}:${e.text}`), out);
      const now = shichen(S.min);
      if (!b?.do?.some(e => e.type === 'time') && now !== before && DUSK[now]) pushFeed('江湖', DUSK[now]);
    });
    const out = result.out;
    if (!result.ok) return { text: result.why ?? '', out, timed: true };
    const more = b?.text ? '\n' + fmt(b.text, { ...textVars(), ...out.vars }) : '';
    // 根基之眼：根基够了，多看出一层（engine/yan.ts）；看见的同时写下的旗标，解锁别处的做法
    return { text: fmt(n.look, textVars()) + more, out, timed: true, eyes };
  }
  const bs = n.actions[verb as keyof typeof n.actions];
  const b = pickBranch(bs);
  // 住店睡到天亮这类要跨过半夜的：今日有约就提一句会误了约，不拦（engine/shiguang.ts）
  const warn = b ? passWarn(S, b.do) : null;
  if (b) {
    const short = lilianShort(bs, b);
    const preview = verbPlan(id, verb);
    const strict = /^(买|购买|卖|典当|学|请教|抓药|交差)/.test(verb) || preview.gain.some(e => e.type === 'learn' || e.type === 'jobDone');
    if (strict && !preview.ok && preview.cost.some(e => e.type !== 'time') && !b.do?.some(e => e.type !== 'time'))
      return { text: fmt(b.text ?? preview.why ?? '', textVars()) + (short ? `\n（${short}）` : ''), out: newOutcome(), timed: true };
    const result = executeBranch(id, verb, b, bs!.indexOf(b));
    return { text: result.ok ? (warn ? `（${warn}）\n` : '') + fmt(b.text ?? '', { ...textVars(), ...result.out.vars }) + (short ? `\n（${short}）` : '') : result.why ?? '', out: result.out, timed: true };
  }
  const who = npcName(id);
  const out = newOutcome();
  switch (verb) {
    // 赠礼、典当：从行囊里挑一件（engine/daoju.ts）。送了人物喜欢的，关系升一级
    case '赠礼': {
      const it = arg ? itemById(arg) : undefined;
      if (!it || !giftable(it)) return { text: '你身上没有合适的礼物。', out };
      const likes = n.likes?.includes(it.id);
      const effects = [{ type: 'item' as const, id: it.id, delta: -1 },
        ...(likes ? [{ type: 'rel' as const, npc: id, value: warmer(S.rel[id]) }] : []),
        { type: 'time' as const, add: VERB_MIN.赠礼 }];
      const result = settleAction(effectReq(verb, id, effects));
      const text = !result.ok ? result.why ?? '' : likes
        ? fmt(n.gift ?? `${who}收下了${it.name}，神色和缓了许多。`, textVars())
        : `${who}客客气气地收下了${it.name}，道了声谢。`;
      return { text, out: result.out, timed: true };
    }
    case '典当': {
      const it = arg ? itemById(arg) : undefined, price = it ? pawnPrice(it) : 0;
      if (!it || !price || have(it.id) < 1) return { text: `${who}摇摇头：「这东西小号不收。」`, out, timed: true };
      if (have(it.id) - (wornAt(it.id) ? 1 : 0) < 1) return { text: `${it.name}还在你身上，先卸下来再说。`, out, timed: true };
      const result = settleAction(effectReq('典当', id, [{ type: 'item', id: it.id, delta: -1 }, { type: 'silver', delta: price }, { type: 'time', add: DEFAULT_MIN }]));
      return { text: result.ok ? `${who}把${it.name}翻来覆去看了一遍，拨了拨算盘，数出钱来。（银两 +${price} 文）` : result.why ?? '', out: result.out, timed: true };
    }
    // 打听：问这个人知道什么（engine/chuanwen.ts）
    case '打听': return { text: ask(id, { who }).text, out };
    // 盘问：捕快亮腰牌，谁都得答话，不论今天问没问过、交情深浅（人犯另写「盘问」的分支，问得出破绽）
    case '盘问': return { text: panwen(id, who), out };
    case '请教': return { text: `${who}摇摇头：「我没什么可教你的。」`, out };
    case '切磋': return { text: `${who}连连摆手：「不敢不敢。」`, out };
    case '偷窃': return { text: `你的手刚伸出去，${who}就警觉地看了过来。你只好装作整理衣襟。`, out };
    default: return { text: `${who}没有理你。`, out };
  }
}

/**
 * 前头有一条教武功的分支，只差历练没学成（师父肯教，你见识不够）：说一声还差多少，
 * 不然玩家只听到师父一句推托，不知道该去做什么
 */
function lilianShort(bs: Branch[] | undefined, picked: Branch): string {
  for (const b of bs ?? []) {
    if (b === picked) break;
    const id = b.if?.canLearn;
    const def = id ? skillById(id) : undefined;
    if (!def || S.skills[def.id]) continue;
    const r = canLearn(S, def);
    if (r.ok || !r.short) continue;
    const rest = { ...b.if };
    delete rest.canLearn;
    if (test(rest)) return r.why;
  }
  return '';
}

/** 进入地点时的触发 */
export function enter(id: string): Outcome | null {
  // 这里正在发生的世事，走进来就看见了（engine/shishi.ts）
  seeShi(id);
  const b = pickBranch(room(id).onEnter);
  if (!b) return null;
  const result = settleAction(effectReq('进门', id, b.do, b.if, `enter:${id}:${room(id).onEnter!.indexOf(b)}`));
  const out = result.out;
  if (!result.ok) return out;
  // 进门时的文字记进见闻，玩家才看得到；最近几条里已经有同一句，就不再重复
  const t = b.text ? fmt(b.text, { ...textVars(), ...out.vars }) : '';
  if (t && !S.feed.slice(0, 5).some(e => e.x === t)) pushFeed('江湖', t);
  return out;
}
