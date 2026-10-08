import { S, pushFeed } from '../core/state';
import { fmt } from '../core/util';
import { npc, questById, room } from '../content';
import type { Cond, NpcDef, Verb } from '../content/types';
import { newOutcome, pickBranch, run, test, textVars, type Outcome } from './dsl';
import { advanceMin, shichen } from '../core/time';
import { attrEffects } from './gengu';
import { giveGift, isPawnshop, pawn } from './daoju';

const present = (list: (string | { id: string; if: Cond })[] | undefined): string[] =>
  (list || []).filter(x => typeof x === 'string' || test(x.if)).map(x => (typeof x === 'string' ? x : x.id));

export const roomNpcs = (id: string): string[] => present(room(id).npcs);
export const roomObjs = (id: string): string[] => present(room(id).objs);

export function roomDesc(id: string): string {
  const d = room(id).desc;
  return fmt(typeof d === 'string' ? d : pickBranch(d)?.text ?? '', textVars());
}

export function roadText(id: string): string {
  const r = room(id).road;
  if (!r) return '你动身上路……';
  return typeof r === 'string' ? r : pickBranch(r)?.text ?? '你动身上路……';
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

/** 人物此刻能点的动作：带 if 的只在条件成立时出现；当铺（service 有「当」）自动有「典当」 */
export function verbsOf(n: NpcDef): Verb[] {
  const vs = n.verbs.flatMap(v => (typeof v === 'string' ? [v] : test(v.if) ? [v.verb] : []));
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
export const VERB_MIN: Record<string, number> = { 观察: 5, 细看: 5, 推门: 2, 交谈: 10, 购买: 5, 打赏: 5, 赠礼: 5, 抓药: 10, 偷窃: 5, 请教: 30 };
const DEFAULT_MIN = 10;

/** 天色转换时记一句见闻 */
const DUSK: Record<string, string> = { 酉时: '日头偏西，天色向晚。', 戌时: '天黑了，街上点起了灯。', 子时: '夜深了，四下里静悄悄的。', 卯时: '天蒙蒙亮了。' };

/** 对人物、物件做一个动作：执行分支，再按动作花掉时间。arg 是赠礼、典当时挑的那件道具 */
export function act(id: string, verb: Verb, arg?: string): { text: string; out: Outcome } {
  const r = doAct(id, verb, arg);
  if (!r.timed && !r.out.fight && !r.out.story && npc(id)) {
    const before = shichen(S.min);
    advanceMin(S, VERB_MIN[verb] ?? DEFAULT_MIN);
    const now = shichen(S.min);
    if (now !== before && DUSK[now]) pushFeed('江湖', DUSK[now]);
  }
  return { text: r.text, out: r.out };
}

function doAct(id: string, verb: Verb, arg?: string): { text: string; out: Outcome; timed?: boolean } {
  const n = npc(id);
  if (!n) return { text: '', out: newOutcome() };
  if (verb === '观察') {
    // 先是外貌，再接上随条件变化的细节（例如拿到线索以后才看得出的东西）
    const b = pickBranch(n.actions['观察']);
    const out = b ? run(b.do) : newOutcome();
    const more = b?.text ? '\n' + fmt(b.text, { ...textVars(), ...out.vars }) : '';
    return { text: fmt(n.look, textVars()) + more, out, timed: b?.do?.some(e => e.type === 'time') };
  }
  const b = pickBranch(n.actions[verb as keyof typeof n.actions]);
  if (b) {
    const out = run(b.do);
    return { text: fmt(b.text ?? '', { ...textVars(), ...out.vars }), out, timed: b.do?.some(e => e.type === 'time') };
  }
  const who = npcName(id);
  const out = newOutcome();
  switch (verb) {
    // 赠礼、典当：从行囊里挑一件（engine/daoju.ts）。送了人物喜欢的，关系升一级
    case '赠礼': return { text: giveGift(n, who, arg), out };
    case '典当': return { text: pawn(who, arg), out };
    case '请教': return { text: `${who}摇摇头：「我没什么可教你的。」`, out };
    case '切磋': return { text: `${who}连连摆手：「不敢不敢。」`, out };
    case '偷窃': return { text: `你的手刚伸出去，${who}就警觉地看了过来。你只好装作整理衣襟。`, out };
    default: return { text: `${who}没有理你。`, out };
  }
}

/** 进入地点时的触发 */
export function enter(id: string): Outcome | null {
  const b = pickBranch(room(id).onEnter);
  if (!b) return null;
  const out = run(b.do);
  // 进门时的文字记进见闻，玩家才看得到；最近几条里已经有同一句，就不再重复
  const t = b.text ? fmt(b.text, { ...textVars(), ...out.vars }) : '';
  if (t && !S.feed.slice(0, 5).some(e => e.x === t)) pushFeed('江湖', t);
  return out;
}
