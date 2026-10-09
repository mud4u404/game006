/**
 * 心事的导航（负责人 10-09：「至少玩家知道自己进度在哪，卡在哪，哪怕做不成也知道」）。
 * 读 QuestDef 每一步的 who、hint、need、fail（content/types.ts 的 QuestStage），算出：
 * - 走到哪：做过的步骤、这一步、共几步；
 * - 去哪、找谁：找的人按作息眼下在哪，不在的话什么时辰在；
 * - 卡在哪：写成心里的盘算，只说玩家自己知道的（见 questNav 上面的注释）；
 * - 做不成了：fail 成立，写明为什么。
 * 纯函数，只读 S（试作息时临时改 S.min，算完还原）。见闻簿、江湖页横幅、地图都读它。
 */
import { S, pushFeed } from '../core/state';
import { shichen } from '../core/time';
import { JOBS, NPCS, ROOMS, itemById, questById, room, skillById } from '../content';
import { SECT_RANKS } from '../content/skills';
import type { Cond, Effect, QuestGate, QuestStage, SectRank, Verb } from '../content/types';
import { lackOf, test } from './dsl';
import { npcName, pathMin, roomNpcs, roomObjs, travelMin } from './world';
import { jobOpen } from './shenfen';

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
  /** 内部核对用（tests/zoubian.test.ts 的「说真话」），界面不逐条列出 */
  needs: NavNeed[];
  /** 见闻簿上写的心里的盘算：缘故、时辰、还差什么，都是玩家自己知道的 */
  memo: string[];
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

/**
 * 不剧透、不出戏（负责人 10-09：「只是方便玩家知道自己的进度，但不能剧透！更不能出戏地在那讲解！」）：
 * - 见闻簿写的是主角自己心里有数的事，写成心里的盘算，不挂「能做、卡住」这类签，不打勾打叉；
 * - 门槛只说玩家自己掂量得出的（钱、根基、侠义、火候、身上带的东西、时辰）；剧情上的门槛（旗标、任务、世事）一概不点破，
 *   只说一句「还缺些眉目」；
 * - 找的人，只有这一步的标题、盘算里已经点了名的，才写他什么时辰在哪；没点名的（还没查出来是谁）不提。
 */
const SAYABLE = new Set(['silver', 'attr', 'xia', 'eming', 'realm', 'item', 'noItem', 'hour', 'learned', 'gongxian', 'noSect', 'sect']);
const sayable = (c: Cond): boolean => Object.keys(c).every(k => SAYABLE.has(k) || k === 'any') && (!c.any || c.any.every(sayable));
const MEIMU = '这事还缺些眉目，再四处走走、打听打听。';

/** 一件心事的导航；没开头、没这件事的为空 */
export function questNav(id: string): QuestNav | null {
  const q = questById(id);
  if (!q || S.quests[id] === undefined) return null;
  const total = q.stages.length;
  const stage = Math.min(S.quests[id], total - 1);
  const st = q.stages[stage];
  const base = { id, name: q.name, stage, total, past: q.stages.slice(0, stage).map(s => s.title), title: st.title, hint: st.hint };
  if (stage === total - 1) return { ...base, dist: 0, needs: [], memo: [], state: '了结', why: '' };
  const fail = [q.fail, st.fail].find(f => f && test(f.if));
  const needs = needsOf(st);
  // 找的人点没点过名：标题、盘算里写了他的名字，玩家才算知道是谁
  const whoRaw = st.who ? whoNav(st.who, st.to) : undefined;
  const who = whoRaw && `${st.title}${st.hint ?? ''}`.includes(whoRaw.name) ? whoRaw : undefined;
  const to = who?.now ?? st.to;
  const nav: QuestNav = { ...base, to, toName: to ? room(to).name : undefined, dist: to && to !== S.loc ? travelMin(pathMin(S.loc, to)) : 0, who, needs, memo: [], state: '能做', why: '' };
  if (fail) return { ...nav, state: '未竟', why: fail.text, memo: [fail.text] };
  const miss = (st.need ?? []).filter((_g, i) => !needs[i].ok);
  const plot = miss.filter(g => !sayable(g.if));
  const hard = miss.filter(g => sayable(g.if) && !timeOnly(g));
  const wait = miss.filter(g => timeOnly(g));
  const memo: string[] = [];
  let state: NavState = '能做', why = '';
  if (plot.length) { state = '卡住'; why = '还缺些眉目'; memo.push(MEIMU); }
  if (hard.length) { state = '卡住'; why ||= `还差：${hard.map(g => g.text).join('、')}`; memo.push(`还差：${hard.map(g => g.text).join('、')}。`); }
  if (wait.length && state === '能做') { state = '要等'; why = `${wait.map(g => g.text).join('、')}再去`; memo.push(`${why}。`); }
  if (whoRaw && !whoRaw.now && state === '能做') {
    state = whoRaw.when ? '要等' : '卡住';
    const at = st.to ?? roomsOf(whoRaw.id)[0];
    why = !who ? '眼下寻不着人' : whoRaw.when ? `${who.name}${whoRaw.when}在${at ? room(at).name : ''}` : `这几日不见${who.name}的人影`;
    memo.push(`${why}。`);
  }
  return { ...nav, state, why, memo };
}

/** 记挂着的心事做不成了：放下横幅，动态里记一笔。界面每次重画时跑（ui/shell.ts 的 render） */
export function dropFailedTrack(): void {
  const n = S.track ? questNav(S.track) : null;
  if (n?.state !== '未竟') return;
  pushFeed('江湖', `${n.why}「${n.name}」这件心事，只好放下了。`);
  S.track = '';
}

/* ---------- 师门：升下一个地位要什么（docs/paiban.md E04、E05） ---------- */

/** 一个条件拆成几道门槛，写成不带数的心里话（「罗汉拳火候还不到」）；剧情上的条件合成一句「还有些本门的规矩没做到」 */
function gatesOf(c: Cond): NavNeed[] {
  const out: NavNeed[] = [];
  const one = (text: string, cond: Cond): void => { const ok = test(cond); out.push({ text, ok, lack: null }); };
  if (c.realm) one(`${skillById(c.realm.skill)?.name ?? c.realm.skill}火候还不到`, { realm: c.realm });
  if (c.gongxian !== undefined) one('替师门出的力还不够', { gongxian: c.gongxian });
  if (c.xia !== undefined) one('侠义上还欠些', { xia: c.xia });
  if (c.eming !== undefined) one('江湖上的名头还不够响', { eming: c.eming });
  if (c.attr) one(`${c.attr.key}还欠些`, { attr: c.attr });
  if (c.silver !== undefined) one('银钱不够', { silver: c.silver });
  if (c.learned) one(`还没学会${skillById(c.learned)?.name ?? c.learned}`, { learned: c.learned });
  if (c.item) one(`身上没带${itemById(c.item.id)?.name ?? c.item.id}`, { item: c.item });
  if (c.any) {
    const subs = c.any.map(x => gatesOf(x).map(n => n.text).join('、')).filter(Boolean);
    if (subs.length) out.push({ text: subs.join('，或者'), ok: c.any.some(x => test(x)), lack: null });
  }
  const plot: Cond = { flag: c.flag, notFlag: c.notFlag, quest: c.quest, shi: c.shi, hour: c.hour, rel: c.rel };
  if (Object.values(plot).some(v => v !== undefined) && !test(plot)) out.push({ text: '还有些本门的规矩没做到', ok: false, lack: null });
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
/** 师门在哪：管升这一级的人眼下在的地方（地图的「回师门」、人物页师门卡的「去」用）；真传了没有下一级，为空 */
export function sectHome(): { to: string; name: string } | null {
  const w = sectNav()?.who;
  const id = w ? w.now ?? roomsOf(w.id)[0] : undefined;
  return id ? { to: id, name: room(id).name } : null;
}

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


/** 近处有事：此刻你接得到的差事，派差事的人在哪、要走多久（江湖页「近处有事」卡，试玩：到处乱逛没有目标） */
export interface Lead { text: string; to: string; toName: string; min: number }

let giverCache: Map<string, string> | null = null;
/** 每件差事由哪个人（或榜上的书办）发：扫人物的动作里写了「job」效果的那一个 */
function giverOf(jobId: string): string | undefined {
  if (!giverCache) {
    giverCache = new Map();
    for (const n of NPCS) for (const bs of Object.values(n.actions)) for (const b of bs ?? []) {
      for (const e of b.do ?? []) if (e.type === 'job' && !giverCache.has(e.id)) giverCache.set(e.id, n.id);
    }
  }
  return giverCache.get(jobId);
}

/** 眼下能接的差事，按路近排，最多 n 件；派差的人眼下在哪就去哪，不在的写他常在的地方 */
export function leadsNear(n = 3): Lead[] {
  if (S.job) return [];
  const out: Lead[] = [];
  for (const j of JOBS) {
    if (!jobOpen(S, j.id)) continue;
    const g = giverOf(j.id);
    if (!g) continue;
    const at = whoNav(g).now ?? roomsOf(g)[0];
    if (!at || at === S.loc) continue;
    const m = pathMin(S.loc, at);
    if (!m) continue;
    out.push({ text: j.title, to: at, toName: room(at).name, min: travelMin(m) });
  }
  return out.sort((a, b) => a.min - b.min).slice(0, n);
}
