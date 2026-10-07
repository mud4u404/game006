import { S } from '../core/state';
import { fmt } from '../core/util';
import { npc, questById, room } from '../content';
import type { Cond, Verb } from '../content/types';
import { newOutcome, pickBranch, run, test, textVars, type Outcome } from './dsl';

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

/** 对人物或物品做一个动作，返回要显示的文字和产生的后果 */
export function act(id: string, verb: Verb): { text: string; out: Outcome } {
  const n = npc(id);
  if (!n) return { text: '', out: newOutcome() };
  if (verb === '观察') return { text: fmt(n.look, textVars()), out: newOutcome() };
  const b = pickBranch(n.actions[verb as keyof typeof n.actions]);
  if (b) {
    const out = run(b.do);
    return { text: fmt(b.text ?? '', { ...textVars(), ...out.vars }), out };
  }
  const who = npcName(id);
  const out = newOutcome();
  switch (verb) {
    case '赠礼':
      if ((S.items.flower || 0) > 0) {
        S.items.flower--;
        const cur = S.rel[id];
        if (cur && cur !== '心存芥蒂') S.rel[id] = '颇有好感';
        return { text: n.gift || `${who}收下了杏花，神色和缓了许多。`, out };
      }
      return { text: '你身上没有合适的礼物。', out };
    case '请教': return { text: `${who}摇摇头：「我没什么可教你的。」`, out };
    case '切磋': return { text: `${who}连连摆手：「不敢不敢。」`, out };
    case '偷窃': return { text: `你的手刚伸出去，${who}就警觉地看了过来。你只好装作整理衣襟。`, out };
    default: return { text: `${who}没有理你。`, out };
  }
}

/** 进入地点时的触发 */
export function enter(id: string): Outcome | null {
  const b = pickBranch(room(id).onEnter);
  return b ? run(b.do) : null;
}
