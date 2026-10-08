/**
 * 世事：江湖自己转（docs/huojianghu.md 第三节第一条）。
 * - 一件事分几步，到了日子自己往下走，玩家不插手也会走到结局；插手的用效果 { type: 'shi', id, to } 把它推到另一步。
 * - 世界上走到哪一步，和玩家知道到哪一步，分开记：玩家人在这个地区时听得到传开的话，走进事情发生的地点看得见，
 *   向人打听问得到，自己插手当然知道。见闻簿只写玩家知道的那一步。
 * - tickShi 在每次画界面（ui/shell.ts）、静修（engine/shiguang.ts）、机器玩家每一步之后跑，可以反复跑。
 */
import { S, pushFeed, type ShiState } from '../core/state';
import { absMin, dayNo } from '../core/time';
import { pick } from '../core/util';
import { NEWS, SHI, room, shiById } from '../content';
import type { ShiDef, ShiStep } from '../content/types';
import { run, test } from './dsl';

const DAY = 1440;

export const shiOf = (id: string): ShiState | undefined => S.shi?.[id];
/** 这件事眼下这一步（还没起头为空） */
export function shiStep(id: string): ShiStep | undefined {
  const st = shiOf(id);
  return st ? shiById(id)?.steps[st.at] : undefined;
}
/** 这一步是结局（没有下一步） */
export const isEnding = (d: ShiDef, step: string): boolean => !d.steps[step]?.next;

/** 玩家知道了这件事眼下这一步；返回是不是头一回知道这一步 */
export function learnShi(id: string): boolean {
  const st = shiOf(id);
  if (!st || st.seen === st.at) return false;
  st.seen = st.at;
  return true;
}

/** 走到某一步：记下时刻，执行这一步的变化；人在这个地区就听到传开的话，人就在事发的地方就看见了 */
function goStep(d: ShiDef, to: string, at: number, heard: string[]): void {
  const prev = shiOf(d.id);
  const st: ShiState = { at: to, since: at };
  if (prev?.seen !== undefined) st.seen = prev.seen;
  if (prev?.done) st.done = prev.done;
  (S.shi ||= {})[d.id] = st;
  const step = d.steps[to];
  run(step.do);
  const here = room(S.loc);
  if (step.news && here.region === d.region) { heard.push(step.news); st.seen = to; }
  if (step.where === S.loc) st.seen = to;
}

/**
 * 让江湖往前走：该起头的起头，到了日子的往下走（静修了十天的，一次走好几步），了结过、写了 again 的到日子重新起头。
 * 听到的话记进见闻（传闻），也返回给静修的邸报用。
 */
export function tickShi(): string[] {
  const now = absMin(S), heard: string[] = [];
  for (const d of SHI) {
    let st = shiOf(d.id);
    if (!st) {
      if (d.start && !test(d.start)) continue;
      goStep(d, d.first, now, heard);
    } else if (d.again !== undefined && isEnding(d, st.at) && now - st.since >= d.again * DAY && (!d.start || test(d.start))) {
      // 了结过的事，隔了日子再来一回：玩家知道的是上一回的事，这一回从头听起
      const done = (st.done ?? 0) + 1;
      delete S.shi![d.id];
      goStep(d, d.first, st.since + d.again * DAY, heard);
      S.shi![d.id].done = done;
    }
    for (let guard = 0; guard < 50; guard++) {
      st = shiOf(d.id)!;
      const nx = d.steps[st.at]?.next;
      if (!nx || now - st.since < nx.days * DAY) break;
      goStep(d, nx.to, st.since + Math.round(nx.days * DAY), heard);
    }
  }
  heard.forEach(n => pushFeed('传闻', n));
  return heard;
}

/** 玩家插手：把事情推到 to 这一步（还没起头的也从这一步起），玩家自然知道 */
export function moveShi(id: string, to: string): void {
  const d = shiById(id);
  if (!d?.steps[to]) return;
  const heard: string[] = [];
  goStep(d, to, absMin(S), heard);
  shiOf(id)!.seen = to;
  heard.forEach(n => pushFeed('传闻', n));
}

/** 走进一个地点：这里正在发生的事，看见了就知道了 */
export function seeShi(loc: string): void {
  for (const d of SHI) {
    const st = shiOf(d.id);
    if (st && d.steps[st.at]?.where === loc) st.seen = st.at;
  }
}

/**
 * 江湖上的话：这一带你还不知道的事先说，再说你知道的那件后来怎样了，都没有就说一句闲话传闻（近来听过的不重复）。
 * 说书人的打赏、人人都有的打听都用它。返回那句话，没得说为空
 */
export function hearsay(): string | null {
  const region = room(S.loc).region;
  const here = SHI.filter(d => d.region === region && shiOf(d.id));
  const pickShi = here.find(d => shiOf(d.id)!.seen === undefined) ?? here.find(d => shiOf(d.id)!.seen !== shiOf(d.id)!.at);
  if (pickShi) {
    const step = pickShi.steps[shiOf(pickShi.id)!.at];
    learnShi(pickShi.id);
    pushFeed('传闻', step.news ?? step.now);
    return step.news ?? step.now;
  }
  const recent = new Set(S.feed.slice(0, 12).map(f => f.x));
  const pool = NEWS.filter(n => test(n.if) && !recent.has(n.text));
  if (!pool.length) return null;
  const n = pick(pool).text;
  pushFeed('传闻', n);
  return n;
}

/** 打听：人人都问得（engine/world.ts 的 verbsOf 自动加上）。一个人一天只问一回 */
export function dating(npcId: string, who: string): string {
  const today = dayNo(S);
  const asked = (S.asked ||= {});
  for (const k of Object.keys(asked)) if (asked[k] !== today) delete asked[k];
  if (asked[npcId] === today) return `${who}摆摆手：「知道的都跟你说了，改日再来吧。」`;
  asked[npcId] = today;
  const line = hearsay();
  if (!line) return `${who}想了想：「这几日太平得很，没听说什么。」`;
  return `${who}${pick(['压低了声音', '左右看了看', '凑近了些', '想了想'])}：「${line}」`;
}

/** 见闻簿：玩家知道的事，按「还在走」「了结的」分开；写的是玩家知道的那一步，不一定是眼下的 */
export interface ShiRow { id: string; name: string; region: string; now: string; stale: boolean; ended: boolean }
export function knownShi(): ShiRow[] {
  return SHI.flatMap(d => {
    const st = shiOf(d.id);
    if (!st || st.seen === undefined || !d.steps[st.seen]) return [];
    return [{ id: d.id, name: d.name, region: d.region, now: d.steps[st.seen].now, stale: st.seen !== st.at, ended: isEnding(d, st.seen) }];
  });
}
