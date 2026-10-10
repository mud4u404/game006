/**
 * 世事：江湖自己转（docs/huojianghu.md 第三节第一条）。
 * - 一件事分几步，到了日子自己往下走，玩家不插手也会走到结局；插手的用效果 { type: 'shi', id, to } 把它推到另一步。
 * - 玩家没到过这一带、也没听说的事，停在起头那一步；到了这一带就听说，从那时起才往下走（不白白错过）。
 * - 世界上走到哪一步，和玩家知道到哪一步，分开记：玩家人在这个地区时听得到传开的话，走进事情发生的地点看得见，
 *   向人打听问得到，自己插手当然知道。见闻簿只写玩家知道的那一步。
 * - tickShi 在每次画界面（ui/shell.ts）、静修（engine/shiguang.ts）、机器玩家每一步之后跑，可以反复跑。
 * - 走到写了 news 的一步，生一条传闻（engine/chuanwen.ts）：在场的、牵涉的、那一带的枢纽先知道，以后人传人。
 *   打听、盘问、说书人的打赏都在 engine/chuanwen.ts，这里只转一手旧名字。
 */
import { S, markSeen, pushFeed, type ShiState } from '../core/state';
import { absMin } from '../core/time';
import { SHI, room, shiById } from '../content';
import type { ShiDef, ShiStep } from '../content/types';
import { run, test } from './dsl';
import { ask, shiRumor, type HeardItem } from './chuanwen';
import { worldRng } from './shijie';

export { hearsay, panwen } from './chuanwen';

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
  markSeen(st, st.at);
  return true;
}

/**
 * 走到某一步：记下时刻，执行这一步的变化，生一条传闻（玩家插手推的，说的是玩家）；
 * 人在这个地区就听到传开的话，人就在事发的地方就看见了
 */
function goStep(d: ShiDef, to: string, at: number, heard: HeardItem[], hand = false): void {
  const prev = shiOf(d.id);
  const st: ShiState = { at: to, since: at };
  if (prev?.seen !== undefined) st.seen = prev.seen;
  if (prev?.prev !== undefined) st.prev = prev.prev;
  if (prev?.done) st.done = prev.done;
  if (prev?.hand) st.hand = true;
  (S.shi ||= {})[d.id] = st;
  const step = d.steps[to];
  run(step.do);
  const rid = shiRumor(d, to, at, hand);
  const here = room(S.loc);
  if (step.news && here.region === d.region) {
    heard.push({ text: step.news, ev: d.id, ph: to });
    markSeen(st, to);
    if (rid && !(S.heard ||= []).includes(rid)) S.heard.push(rid);
  }
  if (step.where === S.loc) markSeen(st, to);
}

/**
 * 让江湖往前走：该起头的起头，到了日子的往下走（静修了十天的，一次走好几步），了结过、写了 again 的到日子重新起头。
 * 听到的话记进见闻（传闻），也返回给静修的邸报用。
 */
export function tickShi(): string[] { return tickShiFull().map(h => h.text); }

/** 同 tickShi，返回听到的每一句出自哪件事的哪一步（出关邸报核对来处用） */
export function tickShiFull(): HeardItem[] {
  const now = absMin(S), heard: HeardItem[] = [];
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
    // 玩家没到过这一带、也没听说的事，停在起头那一步等着：到了这一带就听说，从那时起才往下走
    // （负责人 10-09：「它自动了结了玩家没赶上岂不是浪费？」）。听说了不管，才是错过
    st = shiOf(d.id)!;
    if (st.seen === undefined) {
      if (room(S.loc).region !== d.region) { st.since = now; continue; }
      const step = d.steps[st.at];
      heard.push({ text: step.news ?? step.now, ev: d.id, ph: st.at });
      markSeen(st, st.at);
      st.since = now;
    }
    for (let guard = 0; guard < 50; guard++) {
      st = shiOf(d.id)!;
      const nx = d.steps[st.at]?.next;
      if (!nx) break;
      const due = dueAt(st.since, nx);
      if (now < due) break;
      const to = pickNext(d, st, nx, now - due);
      let at = due;
      // 预告的窗口：补了半个江湖日以上才走到这一步（下线静修、一口气歇了几日），日子从玩家回来这一刻起算（docs/sheji-001-003.md 第 003 项）
      if (d.steps[to].window && now - at >= DAY / 2) at = now;
      goStep(d, to, at, heard);
    }
  }
  heard.forEach(n => pushFeed('传闻', n.text));
  return heard;
}

/**
 * 这一步到哪一刻走：从 since 起过 days 日；写了 clock 的，再往后取到第一个这个钟点
 * （absMin 的一天从零点起，所以分钟数对一天取余就是钟点）
 */
export function dueAt(since: number, nx: NonNullable<ShiStep['next']>): number {
  const t = since + Math.round(nx.days * DAY);
  if (nx.clock === undefined) return t;
  return t + ((nx.clock * 60 - (t % DAY) + DAY) % DAY);
}

/** 亲眼看着：到了日子，玩家还在这一步的 where 那里，隔着不过三个钟头（歇在原地也算） */
const LOOK_MIN = 180;

/**
 * 到了日子往哪一步走：玩家事先安排过的（route）头一个条件成立的；没有，世界的种子抽一回岔路（alt）；
 * 都没有走 to。然后看玩家在不在场：在的，换成 here 里写的那一步
 */
function pickNext(d: ShiDef, st: ShiState, nx: NonNullable<ShiStep['next']>, late: number): string {
  const via = nx.route?.find(r => test(r.if));
  let to = via ? via.to : nx.alt && worldRng() < nx.alt.p ? nx.alt.to : nx.to;
  const where = d.steps[st.at].where;
  if (nx.here?.[to] && where && S.loc === where && late <= LOOK_MIN) to = nx.here[to];
  return to;
}

/** 玩家插手：把事情推到 to 这一步（还没起头的也从这一步起），玩家自然知道 */
export function moveShi(id: string, to: string): void {
  const d = shiById(id);
  if (!d?.steps[to]) return;
  const heard: HeardItem[] = [];
  goStep(d, to, absMin(S), heard, true);
  markSeen(shiOf(id)!, to);
  shiOf(id)!.hand = true;
  heard.forEach(n => pushFeed('传闻', n.text));
}

/** 走进一个地点：这里正在发生的事，看见了就知道了 */
export function seeShi(loc: string): void {
  for (const d of SHI) {
    const st = shiOf(d.id);
    if (st && d.steps[st.at]?.where === loc) markSeen(st, st.at);
  }
}

/** 打听（旧名字，测试和旧调用照用）：问这个人知道什么，见 engine/chuanwen.ts 的 ask */
export const dating = (npcId: string, who?: string): string => ask(npcId, { who }).text;

/** 见闻簿：玩家知道的事，按「还在走」「了结的」分开；写的是玩家知道的那一步，不一定是眼下的 */
export interface ShiRow {
  id: string; name: string; region: string; now: string; stale: boolean; ended: boolean;
  /** 了结了，玩家没插手（这一回没赶上） */
  missed: boolean;
  /** 隔几日还会再来（ShiDef.again） */
  again?: number;
  /** 玩家上一回知道的那一步写的什么（和眼下知道的不是同一步才有）：见闻簿留前一步的一行 */
  before?: string;
  /** 第几回（头一回为 1） */
  round: number;
}
export function knownShi(): ShiRow[] {
  return SHI.flatMap(d => {
    const st = shiOf(d.id);
    if (!st || st.seen === undefined || !d.steps[st.seen]) return [];
    const ended = isEnding(d, st.seen);
    const before = st.prev !== undefined && st.prev !== st.seen ? d.steps[st.prev]?.now : undefined;
    return [{ id: d.id, name: d.name, region: d.region, now: d.steps[st.seen].now, ...(before ? { before } : {}), stale: st.seen !== st.at, ended, missed: ended && !st.hand, again: d.again, round: (st.done ?? 0) + 1 }];
  });
}
