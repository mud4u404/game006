/**
 * 主界面的几样东西（负责人 10-10 七条，docs/sheji-youhua-1010.md 第二、三、六、七条）。纯函数，只读 S，界面和测试共用：
 * - 角色卡：战力、称号、评语，战力变了记下旧值，卡上写一回「旧 → 新」；
 * - 眼下要紧：永远只有一件，写成动宾句；主线卡住了写缘故，再给一件帮得上忙的事；往下最多一条「也可以」；
 * - 地点说明：地图上点一处，看那里有什么人、什么事、要走多久；
 * - 变强的路：闭关的预估、切磋、学艺、门派练功，各写代价。
 * 战力、评语、闭关、导航都是现成的（engine/zhanli.ts、lilian.ts、daohang.ts），这里只拼，不另造公式。
 */
import { S } from '../core/state';
import { NPCS, REALMS, REALM_NEED, foeById, npc, room, skillById } from '../content';
import type { Verb } from '../content/types';
import { RETREAT, retreatPlan } from './lilian';
import { LODGING, restDays, restEff, retreatBlock, skillName, zhuOf } from './shiguang';
import { type Lead, jobStep, leadsNear, questNav, sectHome, sectNav, yueNow } from './daohang';
import { pickBranch, test } from './dsl';
import { profMul } from './gengu';
import { jinduLine, personOf, tierNow } from './ren';
import { realmCap } from './shicheng';
import { marksOf, refuseOf } from './shijie';
import { npcName, pathMin, roomNpcs, travelMin, tripCost, verbPlan, verbsOf, whereAt } from './world';
import { pingyuNow, zhanliShu } from './zhanli';
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

export interface JueseKa { name: string; title: string; power: number; from?: number; pingyu: string; jindu: string | null; line: string }

export function jueseKa(): JueseKa {
  const power = powerNow();
  const from = S.ui?.from !== undefined && S.ui.from !== power ? S.ui.from : undefined;
  return {
    name: '沈' + S.name, title: chenghao(), power, from, pingyu: pingyuNow(S), jindu: jinduLine(S),
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

/**
 * 主线这一步要找的人明显打不过（档次差一档以上，和掂斤两同一套：engine/zhaoshi.ts 的 kanrenSay），
 * 而且推进这一步靠的是动手、不是交谈：这时候直接指过去就是送死（10-10 商业制作人试玩：新手四下点到屠千山，只剩必输的「动手」）。
 * 返回差几档和对手的名字；不是这种情形为空。
 */
export function tooStrong(nav: { who?: { id: string; name: string }; id: string; stage: number } | null): { gap: number; name: string } | null {
  if (!nav?.who) return null;
  const f = foeById(nav.who.id);
  if (!f) return null;
  const gap = f.rank - tierNow(S).t;
  if (gap < 1) return null;
  const v = advanceVerb(nav.who.id, nav.id, nav.stage);
  return !v || v === '动手' ? { gap, name: nav.who.name } : null;
}

/** 差事、零工写成动宾句 */
const leadText = (l: Lead): string => (l.gig ? `去${l.toName}，找点零工做` : `去${l.toName}，接差事「${l.text}」`);

/** 卡住、要等的时候，能帮上忙的一件事 */
function helpOf(wait: boolean, ls: Lead[]): Pick<YaoJin, 'text' | 'to' | 'toName' | 'tab' | 'tag'> {
  if (!wait && S.chapter > 0 && (S.lilian ?? 0) > 0) return { tag: '不妨', text: '寻个清净处闭关，把这几日见的打的化开', tab: 'wugong' };
  const l = ls[0];
  if (l) return { tag: l.gig ? '零工' : '差事', text: leadText(l), to: l.to, toName: l.toName };
  return { tag: '不妨', text: '打开地图，四处走走打听', tab: 'ditu' };
}

export function yaoJin(): YaoJin {
  const nav = S.track ? questNav(S.track) : null;
  const ls = S.chapter === 0 ? [] : leadsNear(3);
  const kind = S.track === 'prologue' ? '序章' : S.track.startsWith('main') ? '主线' : '支线';
  // 「也可以」只留一条（首屏减负）：有已揭的差事就是它的当前一步，主线在前也不挤掉正在做的事
  const jy0 = S.job ? S.yue.find(y => y.id === 'job_' + S.job!.id) : undefined;
  const jn0 = jy0 ? yueNow(jy0) : null;
  const jobAlso: Also[] = jy0 && jn0 ? [{ text: jn0.step ? `${jn0.go}（${jy0.text}）` : `去${jn0.toName}，交差：${jy0.text}`, to: jn0.to, toName: jn0.toName, min: jn0.to === S.loc ? 0 : travelMin(pathMin(S.loc, jn0.to)) }] : [];
  const alsoOf = (skip?: Lead): Also[] => [...jobAlso, ...ls.filter(l => l !== skip && l.min <= NEAR).map(l => ({ text: leadText(l), to: l.to, toName: l.toName, min: l.min }))].slice(0, 1);
  // 主线要找的人明显打不过：先去变强，主线放到「也可以」第一行，说明缘故
  const weak = nav && nav.state === '能做' ? tooStrong(nav) : null;
  if (nav && weak) {
    const mainAt: Also = { text: nav.who ? `去${nav.toName}，找${nav.who.name}（${kind}，眼下还打不过）` : `办「${nav.title}」`, to: nav.to ?? S.loc, toName: nav.toName ?? room(S.loc).name, min: nav.to && nav.to !== S.loc ? travelMin(pathMin(S.loc, nav.to)) : 0 };
    const why = `${weak.name}${weak.gap >= 2 ? '的功夫高出你两三层' : '功夫在你之上'}，${nav.to === S.loc ? '他不理你，' : '现在去也是送死，'}你得先变强`;
    const h = (S.lilian ?? 0) > 0 ? helpOf(false, ls) : ls[0] ? helpOf(true, ls) : { tag: '先变强', text: '先去闭关，攒够历练再回来', tab: 'wugong' as Tab, to: undefined, toName: undefined };
    return { ...h, tag: '先变强', here: false, why, also: [mainAt] };
  }
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
  // 手上有差事：办到哪一步，就指哪一步（和「有约」同一个说法）
  const jy = S.job ? S.yue.find(y => y.id === 'job_' + S.job!.id) : undefined;
  const js = S.job ? jobStep(S.job.id) : null;
  if (jy && js) {
    const here = js.to === S.loc;
    return { tag: '差事', text: here ? `找${js.who.name}` : `去${js.toName}，找${js.who.name}`, to: js.to, toName: js.toName, here, hot: here && roomNpcs(S.loc).includes(js.who.id) ? { npc: js.who.id } : undefined, also: alsoOf() };
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
  if (nav && nav.state !== '未竟' && nav.state !== '了结' && nav.to === id) things.push(tooStrong(nav) ? `记挂着的事：${nav.title}（眼下还打不过，先变强）` : `记挂着的事：${nav.title}`);
  for (const l of leadsNear(8)) if (l.to === id) things.push(l.gig ? `零工：${l.text}` : `差事：${l.text}`);
  for (const y of S.yue) if (yueNow(y).to === id) things.push(`有约：${yueNow(y).text}`);
  things.push(...marksOf(id).slice(0, 2));
  const c = id === S.loc ? null : tripCost(id);
  return { name: r.name, area: r.area, folks, things, min: c?.min, hops: c?.hops, fee: c?.fee, here: id === S.loc };
}

/** 有事的地点（地图上标出来）：主线要去的、差事派人的、约好的 */
export function busyRooms(): Set<string> {
  const out = new Set<string>();
  if (S.chapter > 0) for (const l of leadsNear(8)) out.add(l.to);
  for (const y of S.yue) if (y.at) out.add(yueNow(y).to);
  return out;
}

/* ---------- 变强的路 ---------- */

export interface RetreatPreview { days: number; used: number; gain?: [string, number]; power0: number; power1: number; grow: number; note: string }

/** 熟练加上去，够了门槛就升一重（上限同 engine/growth.ts 的 settle），不碰存档 */
function applyGains(skills: Record<string, { r: number; p: number } | undefined>, gains: [string, number][]): void {
  for (const [id, n] of gains) {
    const sk = skillById(id), s = skills[id];
    if (!sk || !s) continue;
    s.p += Math.max(0, Math.round(n * profMul(S, sk)));
    const cap = Math.min(REALMS.length - 1, realmCap(S, sk));
    while (s.r < cap && s.p >= REALM_NEED[s.r]) { s.p -= REALM_NEED[s.r]; s.r++; }
  }
}

const cloneSkills = (): Record<string, { r: number; p: number }> => Object.fromEntries(Object.entries(S.skills).map(([k, v]) => [k, { ...v! }]));

/**
 * 闭关 want 日的预估：和出关结算（engine/shiguang.ts 的 jingxiu）用同一套算法——
 * 日子数、修为额度、约期（restDays）、住处与心魔的打折（restEff）、历练的消化（retreatPlan）都是同一个函数，
 * 所以熟练的进账等于实际。战力是照境界的门槛推一推，写「约」
 */
export function retreatPreview(want: number): RetreatPreview {
  const r = restDays(S, want);
  const grow = r.grow;
  const eff = r.days > 0 ? restEff(S, r.days).eff : 1;
  const plan = grow > 0 ? retreatPlan(S, grow, eff) : { used: 0, gains: [] as [string, number][] };
  const power0 = powerNow();
  const skills = cloneSkills();
  applyGains(skills, plan.gains);
  const p1 = zhanliShu(personOf({ ...S, skills }));
  const top = plan.gains[0];
  const gain: [string, number] | undefined = top ? [skillName(top[0]), top[1]] : undefined;
  return { days: r.days, used: plan.used, gain, power0, power1: p1, grow, note: top ? retreatNote(top[0], p1 - power0, eff, power0) : '' };
}

/** 小字：战力涨了写「战力约 +N」；没涨写还差多少熟练才涨、约几日（逐日照历练的消化往后推） */
function retreatNote(topId: string, d: number, eff: number, power0: number): string {
  if (d > 0) return `战力 +${d}`;
  const sk = skillById(topId), cur = S.skills[topId];
  if (!sk || !cur) return '战力暂不见涨';
  if (cur.r >= Math.min(REALMS.length - 1, realmCap(S, sk)) && cur.p >= REALM_NEED[cur.r]) return `战力暂不涨：「${sk.name}」卡在瓶颈，先把内功练上去`;
  const lack = Math.max(0, REALM_NEED[cur.r] - cur.p);
  const tmp = { lilian: S.lilian ?? 0, loadout: S.loadout, gear: S.gear, skills: cloneSkills() };
  for (let day = 1; day <= 30; day++) {
    const pl = retreatPlan(tmp, 1, eff);
    applyGains(tmp.skills, pl.gains);
    tmp.lilian -= pl.used;
    if (zhanliShu(personOf({ ...S, skills: tmp.skills })) > power0) return `战力暂不涨：「${sk.name}」还差 ${lack} 熟练进下一重，约 ${day} 日`;
  }
  return `战力暂不涨：「${sk.name}」还差 ${lack} 熟练进下一重，一月之内难见涨`;
}

/** 闭关按钮上的预估：正文「闭关一日，约有长进」，数字放进小字「（寒江剑法熟练 +9，战力约 +1）」；战力没涨，小字写还差多少熟练、约几日 */
export function retreatLabel(days: number, name: string): string {
  const p = retreatPreview(days);
  if (!p.gain) return `闭关${name}`;
  return `闭关${name}，${p.power1 > p.power0 ? '约有长进' : '一时不见长进'}<small>（${p.gain[0]}熟练 +${p.gain[1]}，${p.note}）</small>`;
}


export const retreatSmall = (days: number): string => retreatPreview(days).note;

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
  const lodge = zhu === 'inn' ? `住店一日 ${LODGING.inn} 文` : zhu === 'home' ? '回师门住，不花钱' : '露宿不费钱，只是风露侵人，参悟要慢上几分';
  out.push({
    name: '闭关', say: block ?? `寻个清净处闭关，把这几日见的打的化开。<small>历练 ${S.lilian ?? 0}，一日最多化 ${RETREAT[1].cap}</small>`,
    cost: `搭上一日光阴；${lodge}`, go: block ? undefined : { act: 'retreat:1', label: '闭关一日' }
  });
  // 学艺：把历练化成新武功
  out.push({
    name: '学艺', say: '向人请教、拜师、读秘籍，把平日的历练化成新招；有的要先有根基，有的要银两，有的要师门点头。',
    cost: `历练 ${S.lilian ?? 0} 可用，学成了历练要扣`,
    go: S.sect ? undefined : { act: 'tab:ditu', label: '翻地图找师父' }
  });
  // 切磋：只推荐此刻点了真会打的人（和切磋动作同一套判定，sparWilling）；要先混熟的，写明「要先混熟」
  const sp = sparNear();
  if (sp) out.push({
    name: '切磋', say: `${sp.here ? `此处的${sp.name}` : `${sp.at}的${sp.name}`}肯指点几招。点到为止，输赢都不伤和气。`,
    cost: sp.here ? '一场切磋的工夫；赢了熟练有长，每日有额度' : `路上约${sp.min}分钟；赢了熟练有长，每日有额度`,
    go: sp.here ? { act: 'tab:jianghu', label: '去江湖页' } : { act: `travel:${sp.to}`, label: `去${sp.at}` }
  });
  else {
    const mix = sparMixFirst();
    out.push({
      name: '切磋', say: mix ? `${mix}要先混熟，才肯陪你过招。` : '眼下没有肯陪你过招的人，换个时辰、换个地方再看。',
      cost: '先去和人打交道（交谈、赠礼）'
    });
  }
  // 门派练功
  const home = S.sect ? sectHome() : null;
  if (S.sect && home) {
    const nx = sectNav();
    out.push({
      name: '门派练功', say: `回${S.sect.school}：${nx?.who ? `${nx.who.name}管升${nx.next ?? ''}的事` : '向师长请益'}，替师门办差，日子久了，师长自会传你本门武功。`,
      cost: '替师门办差，路上与办差的工夫',
      go: home.to === S.loc ? undefined : { act: `travel:${home.to}`, label: `回${home.name}` }
    });
  }
  return out;
}

/** 切磋这个动作此刻点了会不会真打起来：和 world.ts 的 act 同一套判定（没有底线拒绝、选中的分支里有开打的效果、行动协议放行） */
export function sparWilling(id: string): boolean {
  const n = npc(id);
  if (!n || n.obj || !verbsOf(n).includes('切磋') || refuseOf(id, '切磋')) return false;
  const b = pickBranch(n.actions['切磋']);
  return !!b?.do?.some(e => e.type === 'fight') && verbPlan(id, '切磋').ok;
}

/** 有开打的分支，只是交情不够（分支条件里有 rel）：此刻不肯，混熟了肯。返回他的名字 */
function sparMixFirst(): string | null {
  for (const n of NPCS) {
    if (n.obj || !verbsOf(n).includes('切磋') || !whereAt(n.id)) continue;
    if (n.actions['切磋']?.some(b => b.if?.rel && !test(b.if) && b.do?.some(e => e.type === 'fight'))) return npcName(n.id);
  }
  return null;
}

export interface SparTarget { id: string; name: string; at: string; to: string; here: boolean; min: number }

/** 眼下最近的、点了切磋真会打的人（先看此处，再看全江湖里眼下在场、路最近的） */
export function sparTarget(): SparTarget | null {
  let best: SparTarget | null = null;
  for (const n of NPCS) {
    if (!sparWilling(n.id)) continue;
    const at = whereAt(n.id);
    if (!at) continue;
    if (at === S.loc) return { id: n.id, name: npcName(n.id), at: room(at).name, to: at, here: true, min: 0 };
    const m = pathMin(S.loc, at);
    if (!m) continue;
    const min = travelMin(m);
    if (!best || min < best.min) best = { id: n.id, name: npcName(n.id), at: room(at).name, to: at, here: false, min };
  }
  return best;
}
const sparNear = sparTarget;
