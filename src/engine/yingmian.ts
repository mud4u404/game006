/**
 * 迎面：人有活气，不只是等你来问（docs/sheji-youhua-1010.md 第五条，负责人 10-10：「NPC 活人感太弱」）。
 * 玩家走进一处场景，或在场景里过了时辰，场景里的人可能先开口，带一个话头；点了话头，就是对他做一个现有的动作（通常是交谈）。
 * 要适当：
 * - 一个人一个江湖日最多主动一次（S.greeted）；
 * - 同一场景同一个时辰段（两个钟头）只挑一个人（S.greet.key）；
 * - 只挑有一条迎面（NpcDef.greet）条件成立的人；
 * - 挑人的先后：刚和他有过来往的，再看关系好坏，最后按场景里的排序。
 * 随机：不碰世界的随机数（worldRng）——世事靠它往前走，开场白一动就会把世事挪位。
 * 一个人几条都成立时挑哪条，用 mulberry32(seedOf(...))，同一个世界、同一日、同一时辰段，挑出来的一样。
 * 挑人由 refreshGreet 在每次重画之前进行（ui/shell.ts 的 render），自己不推进时间；界面只读 greetNow。
 */
import { S } from '../core/state';
import { dayNo } from '../core/time';
import { npc } from '../content';
import type { GreetDef, Verb } from '../content/types';
import { test } from './dsl';
import { mulberry32, seedOf } from './rng';
import { worldOf } from './shijie';
import { npcName, roomNpcs, verbsOf } from './world';

/** 一个时辰段两个钟头 */
const SLOT_MIN = 120;
/** 关系由生疏到亲近；表外的（仇怨之类）排在最后 */
const REL_RANK = ['素不相识', '点头之交', '相谈甚欢', '知交', '结拜兄弟', '情缘', '相依为命', '师徒'];

export interface Greeting { id: string; name: string; text: string; topic: string; go: Verb }

const slotKey = (): string => `${S.loc}|${dayNo(S)}|${Math.floor(S.min / SLOT_MIN)}`;

/** 他此刻能说的迎面话（条件成立的） */
const ready = (id: string): number[] => {
  const g = npc(id)?.greet;
  return g ? g.flatMap((d, i) => (test(d.if) ? [i] : [])) : [];
};

/** 关系好坏：越亲近越靠前 */
const relRank = (id: string): number => REL_RANK.indexOf(S.rel[id] ?? '素不相识');

/** 挑谁开口：没有人有话可说就是 undefined */
function choose(): { id: string; i: number } | undefined {
  const today = dayNo(S), greeted = S.greeted ?? {};
  const recent = S.lastWith && S.lastWith.day === today ? S.lastWith.id : '';
  const folks = roomNpcs(S.loc).filter(id => !npc(id)?.obj && greeted[id] !== today && ready(id).length);
  if (!folks.length) return undefined;
  const order = folks.map((id, k) => ({ id, k, recent: id === recent ? 1 : 0, rel: relRank(id) }));
  order.sort((a, b) => b.recent - a.recent || b.rel - a.rel || a.k - b.k);
  const id = order[0].id, opts = ready(id);
  const r = mulberry32(seedOf(worldOf().seed, 'greet', id, today, Math.floor(S.min / SLOT_MIN)))();
  return { id, i: opts[Math.floor(r * opts.length)] };
}

/**
 * 画场景之前问一回：这个时辰段还没挑过，就挑一个人，记进存档（S.greet、S.greeted）；挑过的不再挑，重画不会换人。
 * 会改存档，所以放在 ui/shell.ts 的 render 里（和世界的慢变一起），不放在只读的界面函数里
 */
export function refreshGreet(): void {
  if (S.chapter === 0) return;
  const key = slotKey();
  if (S.greet?.key === key) return;
  const pick = choose();
  S.greet = pick ? { key, id: pick.id, i: pick.i } : { key };
  if (!pick) return;
  const g = (S.greeted ||= {});
  for (const k of Object.keys(g)) if (g[k] !== dayNo(S)) delete g[k];
  g[pick.id] = dayNo(S);
}

/**
 * 此刻场景里开口的人和他的话（只读）。没有人开口、话头点过了、开口的人走开了，都是 undefined
 */
export function greetNow(): Greeting | undefined {
  const cur = S.greet;
  if (!cur || cur.key !== slotKey() || !cur.id || cur.used || cur.i === undefined) return undefined;
  const def: GreetDef | undefined = npc(cur.id)?.greet?.[cur.i];
  if (!def || !roomNpcs(S.loc).includes(cur.id)) return undefined;
  return { id: cur.id, name: npcName(cur.id), text: def.text, topic: def.topic, go: def.go ?? '交谈' };
}

/** 点了话头：返回要对谁做什么动作（没有可点的返回 undefined）；卡片收起 */
export function takeTopic(): { id: string; verb: Verb } | undefined {
  const g = greetNow();
  if (!g || !S.greet) return undefined;
  S.greet.used = true;
  const n = npc(g.id);
  // 动作此刻不在他的动作表里（条件变了）就退回「交谈」
  const verb = n && verbsOf(n).includes(g.go) ? g.go : '交谈';
  return { id: g.id, verb };
}
