/**
 * 心事的导航（负责人 10-09：「至少玩家知道自己进度在哪，卡在哪，哪怕做不成也知道」）。
 * 读 QuestDef 每一步的 who、hint、need、fail（content/types.ts 的 QuestStage），算出：
 * - 走到哪：做过的步骤、这一步、共几步；
 * - 去哪、找谁：找的人按作息眼下在哪，不在的话什么时辰在；
 * - 卡在哪：门槛逐条打勾，钱、根基这类写出差多少（dsl.ts 的 lackOf）；
 * - 做不成了：fail 成立，写明为什么。
 * 纯函数，只读 S（试作息时临时改 S.min，算完还原）。见闻簿、江湖页横幅、地图都读它。
 */
import { S, pushFeed } from '../core/state';
import { shichen } from '../core/time';
import { NPCS, ROOMS, itemById, questById, room, skillById } from '../content';
import { REALMS, SECT_RANKS } from '../content/skills';
import type { Cond, Effect, QuestGate, QuestStage, SectRank, Verb } from '../content/types';
import { lackOf, test } from './dsl';
import { npcName, pathMin, roomNpcs, roomObjs, travelMin } from './world';
import { gongxianOf } from './shenfen';

/** 能做：去了就办得成；要等：只差时辰、人不在；卡住：差别的门槛；未竟：做不成了；了结：办完了 */
export type NavState = '能做' | '要等' | '卡住' | '未竟' | '了结';

export interface NavNeed { text: string; ok: boolean; lack: string | null }

export interface NavWho {
  id: string;
  name: string;
  /** 眼下在哪（见不到为空） */
  now: string | null;
  /** 在要去的那处是什么时辰（「辰时到申时」）；哪个时辰都不在为空 */
  when: string | null;
}

export interface QuestNav {
  id: string;
  name: string;
  stage: number;
  total: number;
  /** 做过的步骤 */
  past: string[];
  title: string;
  hint?: string;
  /** 该去的地点：找的人眼下在哪就去哪，不然是这一步写的地点 */
  to?: string;
  toName?: string;
  /** 路上要多少分钟（就在此处为 0） */
  dist: number;
  who?: NavWho;
  needs: NavNeed[];
  state: NavState;
  /** 一句话的缘故：要等、卡住、未竟时写，横幅和见闻簿都用 */
  why: string;
}

/** 门槛只是时辰：等一等就到 */
const timeOnly = (g: QuestGate): boolean => Object.keys(g.if).every(k => k === 'hour');

/** 人物写在哪几处（作息、剧情条件不管） */
function roomsOf(id: string): string[] {
  const has = (l?: (string | { id: string })[]): boolean => !!l?.some(x => (typeof x === 'string' ? x : x.id) === id);
  return ROOMS.filter(r => has(r.npcs) || has(r.objs)).map(r => r.id);
}

const presentAt = (id: string, roomId: string): boolean => roomNpcs(roomId).includes(id) || roomObjs(roomId).includes(id);

/** 十二时辰挨个试：在这处的时辰连成几段（「辰时到申时」「子时、午时」）；都在写「整日」 */
function hoursAt(id: string, roomId: string): string | null {
  const keep = S.min, on: boolean[] = [];
  try {
    for (let k = 0; k < 12; k++) { S.min = k * 120; on.push(presentAt(id, roomId)); }
  } finally { S.min = keep; }
  if (on.every(Boolean)) return '整日';
  if (!on.some(Boolean)) return null;
  // 从一个不在的时辰之后起算，跨子夜的段落也连得上
  const start = (on.indexOf(false) + 1) % 12, runs: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const k = (start + i) % 12;
    if (!on[k]) continue;
    const last = runs[runs.length - 1];
    if (last && (last[1] + 1) % 12 === k) last[1] = k; else runs.push([k, k]);
  }
  const name = (k: number): string => shichen(k * 120);
  return runs.map(([a, b]) => (a === b ? name(a) : `${name(a)}到${name(b)}`)).join('、');
}

/** 找的人：眼下在哪；不在要去的那处，什么时辰在 */
export function whoNav(id: string, to?: string): NavWho {
  const where = roomsOf(id);
  const now = where.find(r => presentAt(id, r)) ?? null;
  const at = to ?? now ?? where[0];
  return { id, name: npcName(id), now, when: at ? hoursAt(id, at) : null };
}

function needsOf(st: QuestStage): NavNeed[] {
  return (st.need ?? []).map(g => {
    const ok = test(g.if);
    return { text: g.text, ok, lack: ok ? null : lackOf(g.if) };
  });
}

const needLine = (n: NavNeed): string => n.lack ? `${n.text}（${n.lack}）` : n.text;

/** 一件心事的导航；没开头、没这件事的为空 */
export function questNav(id: string): QuestNav | null {
  const q = questById(id);
  if (!q || S.quests[id] === undefined) return null;
  const total = q.stages.length;
  const stage = Math.min(S.quests[id], total - 1);
  const st = q.stages[stage];
  const base = { id, name: q.name, stage, total, past: q.stages.slice(0, stage).map(s => s.title), title: st.title, hint: st.hint };
  if (stage === total - 1) return { ...base, dist: 0, needs: [], state: '了结', why: '' };
  const fail = [q.fail, st.fail].find(f => f && test(f.if));
  const needs = needsOf(st);
  const who = st.who ? whoNav(st.who, st.to) : undefined;
  const to = who?.now ?? st.to;
  const nav: QuestNav = { ...base, to, toName: to ? room(to).name : undefined, dist: to && to !== S.loc ? travelMin(pathMin(S.loc, to)) : 0, who, needs, state: '能做', why: '' };
  if (fail) return { ...nav, state: '未竟', why: fail.text };
  const miss = (st.need ?? []).map((g, i) => ({ g, n: needs[i] })).filter(x => !x.n.ok);
  const hard = miss.filter(x => !timeOnly(x.g));
  if (hard.length) return { ...nav, state: '卡住', why: '差：' + hard.map(x => needLine(x.n)).join('；') };
  if (miss.length) return { ...nav, state: '要等', why: miss.map(x => x.n.text).join('；') };
  if (who && !who.now) {
    const at = st.to ?? roomsOf(who.id)[0];
    return who.when
      ? { ...nav, state: '要等', why: `${who.name}${who.when}在${at ? room(at).name : ''}` }
      : { ...nav, state: '卡住', why: `眼下哪儿都见不到${who.name}` };
  }
  return nav;
}

/** 记挂着的心事做不成了：放下横幅，动态里记一笔。界面每次重画时跑（ui/shell.ts 的 render） */
export function dropFailedTrack(): void {
  const n = S.track ? questNav(S.track) : null;
  if (n?.state !== '未竟') return;
  pushFeed('江湖', `「${n.name}」做不成了：${n.why}`);
  S.track = '';
}

/* ---------- 师门：升下一个地位要什么（docs/paiban.md E04、E05） ---------- */

/** 一个条件拆成见闻簿上的几道门槛；剧情上的条件（旗标、任务……）不剧透，合成一句「还有本门的规矩」 */
function gatesOf(c: Cond): NavNeed[] {
  const out: NavNeed[] = [];
  const one = (text: string, cond: Cond, lack?: string): void => {
    const ok = test(cond);
    out.push({ text, ok, lack: ok ? null : lack ?? lackOf(cond) });
  };
  if (c.realm) one(`${skillById(c.realm.skill)?.name ?? c.realm.skill}练到${REALMS[c.realm.atLeast ?? 0]}`, { realm: c.realm });
  if (c.gongxian !== undefined) one(`本门贡献 ${c.gongxian}`, { gongxian: c.gongxian }, `眼下 ${gongxianOf(S)}`);
  if (c.xia !== undefined) one(`侠义 ${c.xia}`, { xia: c.xia });
  if (c.attr) one(`${c.attr.key} ${c.attr.atLeast}`, { attr: c.attr });
  if (c.silver !== undefined) one(`${c.silver} 文`, { silver: c.silver });
  if (c.learned) one(`学会${skillById(c.learned)?.name ?? c.learned}`, { learned: c.learned });
  if (c.item) one(`带着${itemById(c.item.id)?.name ?? c.item.id}`, { item: c.item });
  if (c.any) {
    const subs = c.any.map(x => gatesOf(x).map(n => n.text).join('、')).filter(Boolean);
    const ok = c.any.some(x => test(x));
    if (subs.length) out.push({ text: subs.join('，或者'), ok, lack: null });
  }
  const plot: Cond = { flag: c.flag, notFlag: c.notFlag, quest: c.quest, shi: c.shi, hour: c.hour, rel: c.rel };
  if (Object.values(plot).some(v => v !== undefined) && !test(plot)) out.push({ text: '还有本门的规矩没做到，问问师父', ok: false, lack: null });
  return out;
}

export interface SectNav {
  school: string;
  rank: SectRank;
  /** 下一个地位；做到真传了为空 */
  next?: SectRank;
  /** 谁管升这一级：人、动作 */
  who?: NavWho;
  verb?: Verb;
  toName?: string;
  needs: NavNeed[];
  /** 师门还没定下怎么升的，写一句 */
  note?: string;
}

const grants = (dos: Effect[] | undefined, school: string, rank: SectRank): boolean =>
  !!dos?.some(e => e.type === 'sect' && e.school === school && e.rank === rank);

/** 师门这一行：眼下什么地位，升下一级找谁、要什么。没有师门为空 */
export function sectNav(): SectNav | null {
  if (!S.sect) return null;
  const { school, rank } = S.sect;
  const next = SECT_RANKS[SECT_RANKS.indexOf(rank) + 1];
  if (!next) return { school, rank, needs: [] };
  for (const n of NPCS) {
    for (const [verb, bs] of Object.entries(n.actions) as [Verb, { if?: Cond; do?: Effect[] }[]][]) {
      const b = bs?.find(x => grants(x.do, school, next));
      if (!b) continue;
      const who = whoNav(n.id);
      const at = who.now ?? roomsOf(n.id)[0];
      return { school, rank, next, who, verb, toName: at ? room(at).name : undefined, needs: gatesOf(b.if ?? {}) };
    }
  }
  return { school, rank, next, needs: [], note: next === '内门' ? '内门的考校，师门还没传下话来：先攒够四百贡献，替师门出力。' : `升${next}的规矩，师门还没传下话来。` };
}
