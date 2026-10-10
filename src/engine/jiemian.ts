/**
 * 主界面的几样东西（负责人 10-10 七条，docs/sheji-youhua-1010.md 第二、三、六、七条）。纯函数，只读 S，界面和测试共用：
 * - 角色卡：战力、称号、评语，战力变了记下旧值，卡上写一回「旧 → 新」；
 * - 眼下要紧：永远只有一件，写成动宾句；主线卡住了写缘故，再给一件帮得上忙的事；往下最多一条「也可以」；
 * - 地点说明：地图上点一处，看那里有什么人、什么事、要走多久；
 * - 变强的路：闭关的预估、切磋、学艺、门派练功，各写代价。
 * 战力、评语、闭关、导航都是现成的（engine/zhanli.ts、lilian.ts、daohang.ts），这里只拼，不另造公式。
 */
import { S } from '../core/state';
import { NPCS, REALMS, REALM_NEED, npc, room, skillById } from '../content';
import type { Verb } from '../content/types';
import { RETREAT, retreatPlan } from './lilian';
import { LODGING, allowance, retreatBlock, skillName, yueText, zhuOf } from './shiguang';
import { type Lead, leadsNear, questNav, sectHome, sectNav } from './daohang';
import { test } from './dsl';
import { profMul } from './gengu';
import { personOf, tierNow } from './ren';
import { realmCap } from './shicheng';
import { marksOf } from './shijie';
import { npcName, pathMin, roomNpcs, travelMin, tripCost, verbsOf, whereAt } from './world';
import { pingyuOf, zhanliShu } from './zhanli';
import { shenfenOf } from './shenfen';
import type { Tab } from '../core/state';

/* ---------- 角色卡 ---------- */

export const powerNow = (): number => zhanliShu(personOf(S));

/**
 * 记战力：在江湖页上画角色卡时调（ui/shell.ts 的 render）。
 * 和上次显示的不同，旧值记在 from，卡上写「旧 → 新」；离开江湖页（画别的页）就清掉，只显示这一回。
 */
export function trackPower(onJianghu: boolean): void {
  const ui = (S.ui ??= {});
  const p = powerNow();
  if (!onJianghu) { if (ui.from !== undefined) delete ui.from; return; }
  if (ui.power === undefined) { ui.power = p; return; }
  if (ui.power !== p) { ui.from = ui.power; ui.power = p; }
}

/** 称号：有名号用名号，没有就写身份（序章里是渔家少年） */
export function chenghao(): string {
  return S.chapter === 0 ? '渔家少年' : S.title ? '「' + S.title + '」' : shenfenOf(S).name + ' · ' + tierNow(S).name;
}

export interface JueseKa { name: string; title: string; power: number; from?: number; pingyu: string; line: string }

export function jueseKa(): JueseKa {
  const power = powerNow();
  const from = S.ui?.from !== undefined && S.ui.from !== power ? S.ui.from : undefined;
  return {
    name: '沈' + S.name, title: chenghao(), power, from, pingyu: pingyuOf(S),
    line: `气血 ${S.hp}/${S.hpMax} · 内力 ${S.mp}/${S.mpMax} · 银两 ${S.silver} 文`
  };
}

/* ---------- 到过的地方 ---------- */

/** 记下到过的地点（每次画界面时记所在地；只记 ui.went） */
export function markWent(id: string): void {
  const ui = (S.ui ??= {});
  const w = (ui.went ??= []);
  if (!w.includes(id)) w.push(id);
}
export const wentSet = (): Set<string> => new Set([...(S.ui?.went ?? []), S.loc]);

/* ---------- 到地即办 ---------- */

/** 赶到一处要找的人、要点的动作 */
export interface Target { npc: string; verb?: Verb }
let arrival: (Target & { loc: string }) | null = null;
/** 赶到了：记下要高亮的人和动作（只在这处地方有效，走开或做了别的就不再亮） */
export const markArrival = (t: Target | null): void => { arrival = t ? { ...t, loc: S.loc } : null; };
/** 刚赶到时要高亮的人和动作；人不在场、已走开则没有 */
export const arrivalHot = (): Target | undefined => (arrival && arrival.loc === S.loc && roomNpcs(S.loc).includes(arrival.npc) ? { npc: arrival.npc, verb: arrival.verb } : undefined);

/**
 * 去 dest 要找谁：主线这一步要找的人，差事、零工派活的人，约好等你的人。要在动身之前问（到了以后差事就不再列了）。
 * 没有明确要找的人返回 undefined
 */
export function targetAt(dest: string): Target | undefined {
  const nav = S.track ? questNav(S.track) : null;
  if (nav && nav.state === '能做' && nav.to === dest && nav.who) return { npc: nav.who.id, verb: advanceVerb(nav.who.id, nav.id, nav.stage) };
  const l = leadsNear(8).find(x => x.to === dest && x.who);
  if (l) return { npc: l.who!, verb: l.verb };
  const y = S.yue.find(x => x.at === dest && x.npc);
  return y ? { npc: y.npc } : undefined;
}

/** 这是第几次走进这处地方（走进来一次记一次，ui/shell.ts 的 render 在换了地方时记；旧档里到过的算第一次） */
export function markVisit(): void {
  const ui = (S.ui ??= {});
  if (ui.at === S.loc) return;
  ui.at = S.loc;
  const v = (ui.visits ??= {});
  v[S.loc] = (v[S.loc] ?? ((ui.went ?? []).includes(S.loc) ? 1 : 0)) + 1;
}
export const visitsOf = (id: string): number => S.ui?.visits?.[id] ?? 0;

/* ---------- 眼下要紧 ---------- */

export interface Also { text: string; to: string; toName: string; min: number }
export interface YaoJin {
  /** 标签：序章、主线、支线、差事、零工、四处走走 */
  tag: string;
  /** 动宾句，永远只有这一件 */
  text: string;
  /** 点了去哪（赶路）；空则看 tab */
  to?: string;
  toName?: string;
  /** 点了切到哪一页 */
  tab?: Tab;
  /** 点了走的是主线的 quest（到地方高亮人和动作） */
  main?: boolean;
  /** 已经在目标地点 */
  here: boolean;
  /** 主线卡住时的缘故（心里话） */
  why?: string;
  /** 到了地点要高亮：人、推进这一步的动作 */
  hot?: { npc: string; verb?: Verb };
  also: Also[];
}

/** 这个人身上哪个动作能把这件心事往下推一步（分支里写了 quest 效果、阶段更靠后）；找不到为空 */
export function advanceVerb(npcId: string, questId: string, stage: number): Verb | undefined {
  const n = npc(npcId);
  if (!n) return undefined;
  let any: Verb | undefined;
  for (const [verb, bs] of Object.entries(n.actions) as [Verb, { if?: Parameters<typeof test>[0]; do?: { type: string; id?: string; stage?: number }[] }[]][]) {
    for (const b of bs ?? []) {
      if (!b.do?.some(e => e.type === 'quest' && e.id === questId && (e.stage ?? 0) > stage)) continue;
      if (test(b.if ?? {})) return verb;
      any ??= verb;
    }
  }
  return any;
}

const NEAR = 90;

/** 差事、零工写成动宾句 */
const leadText = (l: Lead): string => (l.gig ? `去${l.toName}，找点零工做` : `去${l.toName}，接差事「${l.text}」`);

/** 卡住、要等的时候，能帮上忙的一件事 */
function helpOf(wait: boolean, ls: Lead[]): Pick<YaoJin, 'text' | 'to' | 'toName' | 'tab' | 'tag'> {
  if (!wait && S.chapter > 0 && (S.lilian ?? 0) > 0) return { tag: '帮得上', text: `去闭关，把历练 ${S.lilian} 化成功夫`, tab: 'wugong' };
  const l = ls[0];
  if (l) return { tag: l.gig ? '零工' : '差事', text: leadText(l), to: l.to, toName: l.toName };
  return { tag: '帮得上', text: '打开地图，四处走走打听', tab: 'ditu' };
}

export function yaoJin(): YaoJin {
  const nav = S.track ? questNav(S.track) : null;
  const ls = S.chapter === 0 ? [] : leadsNear(3);
  const kind = S.track === 'prologue' ? '序章' : S.track.startsWith('main') ? '主线' : '支线';
  const alsoOf = (skip?: Lead): Also[] => ls.filter(l => l !== skip && l.min <= NEAR).slice(0, 1).map(l => ({ text: leadText(l), to: l.to, toName: l.toName, min: l.min }));
  // 主线有下一步：就是它
  if (nav && nav.state === '能做') {
    const here = !nav.to || nav.to === S.loc;
    const who = nav.who;
    const text = who ? (here ? `找${who.name}` : `去${nav.toName}，找${who.name}`) : here ? `办「${nav.title}」` : `去${nav.toName}，办「${nav.title}」`;
    const hot = here && who && roomNpcs(S.loc).includes(who.id) ? { npc: who.id, verb: advanceVerb(who.id, nav.id, nav.stage) } : undefined;
    return { tag: kind, text, to: nav.to, toName: nav.toName, main: true, here, hot, also: alsoOf() };
  }
  // 主线卡住或要等：写缘故，再给一件帮得上的事
  if (nav && (nav.state === '要等' || nav.state === '卡住')) {
    const h = helpOf(nav.state === '要等', ls);
    const used = ls.find(l => l.to === h.to && leadText(l) === h.text);
    return { ...h, here: false, why: nav.why, also: alsoOf(used) };
  }
  // 没有主线可走：近处的差事、零工
  const l = ls[0];
  if (l) return { tag: l.gig ? '零工' : '差事', text: leadText(l), to: l.to, toName: l.toName, here: false, also: alsoOf(l) };
  return { tag: '走走', text: '打开地图，四处走走看看', tab: 'ditu', here: false, also: [] };
}

/* ---------- 地点说明 ---------- */

export interface RoomBrief { name: string; area: string; folks: string[]; things: string[]; min?: number; hops?: number; fee?: number; here: boolean }

/** 一处地方此刻有什么人、什么事（地图上点一处弹出来） */
export function roomBrief(id: string): RoomBrief {
  const r = room(id);
  const folks = roomNpcs(id).map(npcName);
  const things: string[] = [];
  const nav = S.track ? questNav(S.track) : null;
  if (nav && nav.state !== '未竟' && nav.state !== '了结' && nav.to === id) things.push(`记挂着的事：${nav.title}`);
  for (const l of leadsNear(8)) if (l.to === id) things.push(l.gig ? `零工：${l.text}` : `差事：${l.text}`);
  for (const y of S.yue) if (y.at === id) things.push(`有约：${yueText(S, y)}`);
  things.push(...marksOf(id).slice(0, 2));
  const c = id === S.loc ? null : tripCost(id);
  return { name: r.name, area: r.area, folks, things, min: c?.min, hops: c?.hops, fee: c?.fee, here: id === S.loc };
}

/** 有事的地点（地图上标出来）：主线要去的、差事派人的、约好的 */
export function busyRooms(): Set<string> {
  const out = new Set<string>();
  if (S.chapter > 0) for (const l of leadsNear(8)) out.add(l.to);
  for (const y of S.yue) if (y.at) out.add(y.at);
  return out;
}

/* ---------- 变强的路 ---------- */

export interface RetreatPreview { days: number; used: number; gain?: [string, number]; power0: number; power1: number; grow: number }

/**
 * 闭关 days 日大约长多少：用 retreatPlan 算熟练的进账，再照境界的门槛推一推战力（不碰存档，不触发突破的提示）。
 * 内功瓶颈、住处打折这些细处不算，所以写「约」
 */
export function retreatPreview(days: number): RetreatPreview {
  const grow = Math.min(days, allowance(S));
  const plan = grow > 0 ? retreatPlan(S, grow) : { used: 0, gains: [] as [string, number][] };
  const power0 = powerNow();
  // 推一推：熟练加上去，够了门槛就升一重（上限同 engine/growth.ts 的 settle）
  const skills = Object.fromEntries(Object.entries(S.skills).map(([k, v]) => [k, { ...v! }]));
  for (const [id, n] of plan.gains) {
    const sk = skillById(id), s = skills[id];
    if (!sk || !s) continue;
    s.p += Math.max(0, Math.round(n * profMul(S, sk)));
    const cap = Math.min(REALMS.length - 1, realmCap(S, sk));
    while (s.r < cap && s.p >= REALM_NEED[s.r]) { s.p -= REALM_NEED[s.r]; s.r++; }
  }
  const p1 = zhanliShu(personOf({ ...S, skills }));
  const top = plan.gains[0];
  return { days, used: plan.used, gain: top ? [skillName(top[0]), top[1]] : undefined, power0, power1: p1, grow };
}

/** 闭关按钮上的预估：「闭关一日：寒江剑法熟练 +9，战力约 +1」 */
export function retreatLabel(days: number, name: string): string {
  const p = retreatPreview(days);
  if (!p.gain) return `闭关${name}`;
  const d = p.power1 - p.power0;
  return `闭关${name}：${p.gain[0]}熟练 +${p.gain[1]}，${d > 0 ? `战力约 +${d}` : '战力暂不见涨'}`;
}

/** 够闭关一日的历练：提示「可去闭关」 */
export const canRetreat = (): boolean => S.chapter > 0 && (S.lilian ?? 0) >= RETREAT[1].cap;

export interface StrongPath { name: string; say: string; cost: string; go?: { act: string; label: string } }

/** 眼下走得通的变强的路，每条写代价 */
export function strongPaths(): StrongPath[] {
  const out: StrongPath[] = [];
  if (S.chapter === 0) return out;
  // 闭关
  const block = retreatBlock(S);
  const zhu = zhuOf(S);
  const lodge = zhu === 'inn' ? `住店一日 ${LODGING.inn} 文` : zhu === 'home' ? '回师门住，不花钱' : '露宿不花钱，打坐参悟打八折';
  out.push({
    name: '闭关', say: block ?? `${retreatLabel(1, '一日')}。历练 ${S.lilian ?? 0}，一日最多消化 ${RETREAT[1].cap}。`,
    cost: `搭上一日光阴；${lodge}`, go: block ? undefined : { act: 'retreat:1', label: '闭关一日' }
  });
  // 学艺：拿历练换新武功
  out.push({
    name: '学艺', say: '拜师、请教、读秘籍，拿历练换一门新武功；有的要先有前置，有的要银两、贡献。',
    cost: `历练 ${S.lilian ?? 0} 可用，学成了历练要扣`
  });
  // 切磋：此处有、或最近的有人可切磋的
  const sp = sparNear();
  if (sp) out.push({
    name: '切磋', say: `${sp.here ? `此处的${sp.name}` : `${sp.at}的${sp.name}`}肯指点。点到为止，打赢涨熟练，打输不伤命。`,
    cost: sp.here ? '一场切磋的工夫；熟练每日有额度' : `路上约${sp.min}分钟；熟练每日有额度`,
    go: sp.here ? undefined : { act: `travel:${sp.to}`, label: `去${sp.at}` }
  });
  // 门派练功
  const home = S.sect ? sectHome() : null;
  if (S.sect && home) {
    const nx = sectNav();
    out.push({
      name: '门派练功', say: `回${S.sect.school}：${nx?.who ? `${nx.who.name}管升${nx.next ?? ''}的事` : '向师长请益'}，替师门出力攒贡献，换本门的武功。`,
      cost: '替师门办差，路上与办差的工夫',
      go: home.to === S.loc ? undefined : { act: `travel:${home.to}`, label: `回${home.name}` }
    });
  }
  return out;
}

/** 眼下最近的、可以切磋的人（先看此处，再看全江湖里眼下在场、路最近的） */
function sparNear(): { name: string; at: string; to: string; here: boolean; min: number } | null {
  let best: { name: string; at: string; to: string; here: boolean; min: number } | null = null;
  for (const n of NPCS) {
    if (n.obj || !verbsOf(n).includes('切磋')) continue;
    const at = whereAt(n.id);
    if (!at) continue;
    if (at === S.loc) return { name: npcName(n.id), at: room(at).name, to: at, here: true, min: 0 };
    const m = pathMin(S.loc, at);
    if (!m) continue;
    const min = travelMin(m);
    if (!best || min < best.min) best = { name: npcName(n.id), at: room(at).name, to: at, here: false, min };
  }
  return best;
}
