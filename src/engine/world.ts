import { S, pushFeed } from '../core/state';
import { fmt } from '../core/util';
import { npc, questById, room, skillById } from '../content';
import type { Branch, Cond, EyeDef, NpcDef, Verb } from '../content/types';
import { newOutcome, pickBranch, run, test, textVars, type Outcome } from './dsl';
import { advanceMin, dayNo, shichen } from '../core/time';
import { attrEffects } from './gengu';
import { eyesOn } from './yan';
import { giveGift, isPawnshop, pawn } from './daoju';
import { dating, panwen, seeShi } from './shishi';
import { shenfenOf } from './shenfen';
import { canLearn } from './shicheng';

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

/** 此刻在场的：带条件的（作息、剧情）按条件挑；同一人写了几处作息的，只算一次 */
function present(list: (string | { id: string; if: Cond })[] | undefined, roomId: string): string[] {
  const h = Math.floor(S.min / 60);
  const quiet = !!room(roomId).nightQuiet && (h >= NIGHT_HOME.from || h < NIGHT_HOME.to);
  return [...new Set((list || []).filter(x => {
    const id = typeof x === 'string' ? x : x.id;
    if (typeof x !== 'string' && !test(x.if)) return false;
    if (awayNow(id)) return false;
    // 入夜回家：自己写了作息（带时辰条件）的照作息走
    return !quiet || (typeof x !== 'string' && timed(x.if)) || staysAtNight(id, roomId);
  }).map(x => (typeof x === 'string' ? x : x.id)))];
}

export const roomNpcs = (id: string): string[] => present(room(id).npcs, id);
export const roomObjs = (id: string): string[] => present(room(id).objs, id);

export function roomDesc(id: string): string {
  const d = room(id).desc;
  return fmt(typeof d === 'string' ? d : pickBranch(d)?.text ?? '', textVars());
}

export function roadText(id: string): string {
  const r = room(id).road;
  if (!r) return '你动身上路……';
  return typeof r === 'string' ? r : pickBranch(r)?.text ?? '你动身上路……';
}

/**
 * 上船付船钱（RoomDef.fare）：钱够就付；不够的，替船家撑篙、拉纤抵船钱，路上多耗一个时辰。
 * 界面赶路（ui/explore.ts）和机器玩家都走这里。返回记进动态的那句话，不是船返回空
 */
export function payFare(to: string): string | null {
  const fare = room(to).fare;
  if (!fare) return null;
  const msg = S.silver >= fare
    ? `上了${room(to).name}，付了船钱 ${fare} 文。`
    : `身上不够船钱（${fare} 文），你替船家撑了一路篙，抵了船钱，路上多耗了一个时辰。`;
  if (S.silver >= fare) S.silver -= fare;
  else advanceMin(S, 60);
  pushFeed('江湖', msg);
  return msg;
}

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
    for (const [, next] of room(cur).exits) {
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

/** 当前追踪的任务进度 */
export function curQuest(): { name: string; title: string; to?: string } | null {
  const q = questById(S.track);
  if (!q) return null;
  const st = q.stages[Math.min(S.quests[S.track] ?? 0, q.stages.length - 1)];
  return { name: q.name, title: st.title, to: st.to };
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
  if (!n.obj && !hostile && vs.includes('交谈') && !vs.includes('打听')) vs.splice(vs.indexOf('交谈') + 1, 0, '打听');
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
export const VERB_MIN: Record<string, number> = { 观察: 5, 细看: 5, 推门: 2, 交谈: 10, 打听: 10, 盘问: 10, 购买: 5, 打赏: 5, 赠礼: 5, 抓药: 10, 偷窃: 5, 请教: 30 };
const DEFAULT_MIN = 10;

/** 天色转换时记一句见闻 */
const DUSK: Record<string, string> = { 酉时: '日头偏西，天色向晚。', 戌时: '天黑了，街上点起了灯。', 子时: '夜深了，四下里静悄悄的。', 卯时: '天蒙蒙亮了。' };

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
  if (verb === '观察') {
    // 先是外貌，再接上随条件变化的细节（例如拿到线索以后才看得出的东西）
    const b = pickBranch(n.actions['观察']);
    const out = b ? run(b.do) : newOutcome();
    const more = b?.text ? '\n' + fmt(b.text, { ...textVars(), ...out.vars }) : '';
    // 根基之眼：根基够了，多看出一层（engine/yan.ts）；看见的同时写下的旗标，解锁别处的做法
    const eyes = eyesOn({ npc: id });
    for (const e of eyes) run(e.do, out);
    return { text: fmt(n.look, textVars()) + more, out, timed: b?.do?.some(e => e.type === 'time'), eyes };
  }
  const bs = n.actions[verb as keyof typeof n.actions];
  const b = pickBranch(bs);
  if (b) {
    const short = lilianShort(bs, b);
    const out = run(b.do);
    return { text: fmt(b.text ?? '', { ...textVars(), ...out.vars }) + (short ? `\n（${short}）` : ''), out, timed: b.do?.some(e => e.type === 'time') };
  }
  const who = npcName(id);
  const out = newOutcome();
  switch (verb) {
    // 赠礼、典当：从行囊里挑一件（engine/daoju.ts）。送了人物喜欢的，关系升一级
    case '赠礼': return { text: giveGift(n, who, arg), out };
    case '典当': return { text: pawn(who, arg), out };
    // 打听：这一带的世事和传闻（engine/shishi.ts）
    case '打听': return { text: dating(id, who), out };
    // 盘问：捕快亮腰牌，谁都得答话，不论今天问没问过（人犯另写「盘问」的分支，问得出破绽）
    case '盘问': return { text: panwen(who), out };
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
  const out = run(b.do);
  // 进门时的文字记进见闻，玩家才看得到；最近几条里已经有同一句，就不再重复
  const t = b.text ? fmt(b.text, { ...textVars(), ...out.vars }) : '';
  if (t && !S.feed.slice(0, 5).some(e => e.x === t)) pushFeed('江湖', t);
  return out;
}
