/**
 * 机器玩家走遍江湖（摸底测试）：从开局起像玩家一样到处走、跟每个人说话、点每个动作、读剧情、打架、闭关。
 * 盯着三件事：
 * 1. 不报错，存档里的数不出格（气血、银两、任务阶段、地点、伤……）；
 * 2. 不卡死：剧情卡片总有选项可选；任务的目的地走得到；结算里开打、开剧情不会被吞掉；
 * 3. 每个任务都走得完：几局下来，每个任务至少有一局走到最后一个阶段。
 * 顺带统计内容覆盖：走了几万步也碰不到的分支、剧情选项、路遇、对手，多半是条件写错了。
 * npm run zoubian 打印完整的覆盖报告；ZOUBIAN_PREFIX=bj_ npm run zoubian 只看某个前缀的内容（协作者交活前自查用）。
 */
import { describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, advanceMin, dayNo, setNowMs } from '../src/core/time';
import { ENCOUNTERS, FOES, NPCS, QUESTS, ROOMS, SHI, STORIES, foeById, jobById, npc, questById, room, shiById, storyById } from '../src/content';
import { pickBranch, run, test, type Outcome } from '../src/engine/dsl';
import type { Effect } from '../src/content/types';
import { questNav } from '../src/engine/daohang';
import { act, curQuest, enter, hopMin, openExits, pathTo, payFare, roomNpcs, roomObjs, travelMin, verbsOf } from '../src/engine/world';
import { markEncounter, rollEncounter } from '../src/engine/encounter';
import { Duel, RANDOM, SKILLED, simulate, type DuelRes, type Policy } from '../src/engine/duel';
import { activePrep, alliesOf, fightKit, foeSpec, heroSpec, kanren } from '../src/engine/zhaoshi';
import { useItem } from '../src/engine/daoju';
import { brace, fateOpts, settle, takeWounds } from '../src/engine/jiesuan';
import { XIEJIAO, checkYue, jingxiu, nextYue, waitMin } from '../src/engine/shiguang';
import { mulberry32 } from '../src/engine/rng';
import { tierNow } from '../src/engine/ren';
import { isEnding, tickShi } from '../src/engine/shishi';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const VERBOSE = !!env.ZOUBIAN;
/** 只看这个前缀的内容：协作者自查「我写的东西玩家走不走得到」 */
const PREFIX = env.ZOUBIAN_PREFIX ?? '';

/** 一局：从哪里开始、走几步、用哪个种子 */
interface Run {
  start: 'new' | 'skip'; steps: number; seed: number; focus?: string; shi?: string;
  /** 盯世事的局里，玩家袖手旁观：不去找插手的人，只管自己的日子，看这件事自己走到哪一步（世事里「不管它」那条路） */
  watch?: boolean
}
/** 当前这一局：补跑盯任务时更常打输（有的事要先输一场才开头，例如画舫输了，盐号的事才来） */
let cur: Run | undefined;
const RUNS: Run[] = Array.from({ length: 10 }, (_, i) => i + 1).flatMap(i => [
  { start: 'new' as const, steps: 5000, seed: i },
  { start: 'skip' as const, steps: 5000, seed: 100 + i }
]);

/** 全部局下来的覆盖 */
const cov = {
  branch: new Set<string>(), choice: new Set<string>(), enc: new Set<string>(), enter: new Set<string>(),
  foe: new Map<string, Set<DuelRes>>(), fate: new Set<string>(), quest: new Map<string, number>(), room: new Set<string>(),
  /** 世事走到过的步：「事.步」 */
  shi: new Set<string>()
};
const errs = new Map<string, number>();
const warns = new Map<string, number>();
const err = (m: string): void => { errs.set(m, (errs.get(m) ?? 0) + 1); };
const warn = (m: string): void => { warns.set(m, (warns.get(m) ?? 0) + 1); };

let rng: () => number = Math.random;
const pickOne = <T>(a: T[]): T => a[Math.floor(rng() * a.length)];

/* ---------- 剧情、战斗、结果：照 ui/story.ts、ui/fight.ts、ui/shell.ts 的流程 ---------- */

function handle(out: Outcome | null | undefined, depth: number): void {
  if (!out) return;
  if (out.story && out.fight) err(`同一个结果里既开剧情「${out.story}」又开打「${out.fight}」：开打会被丢掉`);
  if (depth > 20) { err('剧情、开打连环超过二十层，可能死循环'); return; }
  if (out.story) playStory(out.story, depth + 1);
  else if (out.fight) fight(out.fight, depth + 1);
}

function playStory(id: string, depth: number): void {
  const def = storyById(id);
  if (!def) { err(`剧情「${id}」不存在`); return; }
  const out: Outcome = { vars: {}, breaks: [] };
  let i = 0;
  for (let guard = 0; guard < 200; guard++) {
    const card = def.cards[i];
    const ok = card.choices.map((c, k) => [c, k] as const).filter(([c]) => test(c.if));
    if (!ok.length) { err(`剧情「${id}」第 ${i + 1} 张卡片「${card.title}」此时一个选项都没有，玩家卡死`); return; }
    // 没选过的选项优先（玩家各有各的选法，几局下来每条路都该有人走过）；
    // 盯着世事的，挑把它推到还没走过那一步的，不挑就此收场的
    const fresh = ok.filter(([, k]) => !cov.choice.has(`${id}#${i}#${k}`));
    const aim = cur?.shi ? ok.filter(([ch]) => pushesNew(ch.do)) : [];
    const goOn = cur?.shi ? ok.filter(([ch]) => ch.next !== -1) : [];
    const [c, k] = aim.length ? pickOne(aim) : goOn.length && !ok.some(([ch]) => pushesNew(ch.do)) && def.cards.some((_, j) => j > i) && rng() < 0.9 && goOn.length < ok.length ? pickOne(goOn) : pickOne(fresh.length && rng() < 0.7 ? fresh : ok);
    cov.choice.add(`${id}#${i}#${k}`);
    if (card.input === 'name' && !S.name) S.name = '孤舟';
    run(c.do, out);
    const next = c.next ?? i + 1;
    if (out.fight || out.story) { handle(out, depth); return; }
    if (next < 0 || next >= def.cards.length) return;
    i = next;
  }
  err(`剧情「${id}」走了两百张卡片还没完，可能死循环`);
}

function fight(fid: string, depth: number): void {
  const f = foeById(fid);
  if (!f) { err(`对手「${fid}」不存在`); return; }
  // 开打前掂斤两（engine/shang.ts）：打赢了比自己弱的，落的伤封顶。机器玩家少掂几回，省时间
  const odds = f.spar || f.script ? undefined : kanren(S, f, 8).p;
  brace(f);
  const prep = activePrep(f);
  const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, prep), { rng, allies: alliesOf(prep) });
  // 玩家各有各的打法：大多照「以己之长」应对，也有乱点的、不出招干挨打的、打不过就跑（认输）的
  const style = rng();
  if (style < 0.08 && !f.script) {
    for (let t = 0; t < 30 && !d.over; t++) d.tick(), f.spar ? d.yieldUp() : d.flee();
  }
  // 盯任务时更常打输（有的事要先输一场才开头）；盯世事时认真打（插手多半要打赢）
  const idle = cur?.focus ? 0.4 : cur?.shi ? 0.03 : 0.18;
  if (!d.over) simulate(d, style < idle ? IDLE : style < idle + 0.27 ? RANDOM : SKILLED);
  S.hp = Math.max(0, Math.round(d.hp));
  S.mp = Math.max(0, Math.round(d.mp));
  const res = d.res!;
  takeWounds(f, d.log.taken, res, odds);
  const opts = fateOpts(f, res);
  // 胜负以后的去路：盯着世事的，挑把它推到还没走过那一步的；其余没走过的优先（几局下来每条路都该有人走过）
  const aimFate = opts.filter(o => pushesNew(o.do));
  const freshFate = opts.filter(o => !cov.fate.has(`${fid}#${f.results.win.after!.opts.indexOf(o)}`));
  const pk = !opts.length ? undefined : aimFate.length ? pickOne(aimFate) : pickOne(freshFate.length && rng() < 0.8 ? freshFate : opts);
  if (pk) cov.fate.add(`${fid}#${f.results.win.after!.opts.indexOf(pk)}`);
  if (!cov.foe.has(fid)) cov.foe.set(fid, new Set());
  cov.foe.get(fid)!.add(res);
  const st = settle(f, res, prep, pk);
  if (!st.r) err(`对手「${fid}」打出「${res}」却没有对应的结算`);
  if (st.out.fight || st.out.story) err(`对手「${fid}」的「${res}」结算：do 里的开打、开剧情不会生效，要写在 then 里`);
  if (S.hp <= 0) warn(`对手「${fid}」打「${res}」以后气血是零，结算没有回血`);
  if (st.r?.then) handle(run(st.r.then), depth);
}

/** 这些效果把盯着的世事推到还没走过的一步 */
function pushesNew(list: Effect[] | undefined): boolean {
  return !!cur?.shi && (list ?? []).some(e => e.type === 'shi' && e.id === cur!.shi && !!e.to && !cov.shi.has(`${e.id}.${e.to}`));
}

/** 不出招、不应对，干挨打：打输了的那些结局也得有人走到 */
const IDLE: Policy = { name: '不出手', pick: () => null, openTake: 0, performs: false };

/* ---------- 玩家能做的事 ---------- */

type Act = { k: 'act'; id: string; v: string; key: string } | { k: 'go'; to: string; key: string; quest?: boolean; push?: boolean; cure?: boolean } | { k: 'rest'; key: string } | { k: 'wait'; key: string };
/** 身上有重伤（二级以上，engine/shang.ts） */
const heavy = (): boolean => S.wounds.hand >= 2 || S.wounds.foot >= 2 || S.wounds.inner >= 2;

function branchKey(id: string, v: string): string {
  const n = npc(id)!;
  const bs = n.actions[v as keyof typeof n.actions];
  return `${id}|${v}|${bs ? bs.findIndex(b => test(b.if)) : -1}`;
}

/**
 * 盯着一个还没起头的任务补跑：此刻已经起得了头的（谁的哪个动作现在就会让它起头），往那人那里走。
 * 玩家听说过这件事、手里揣着引荐信，知道该去哪儿；不然全凭乱走撞上（华山磨剑：信拿到手，人却先拜了别家）
 */
function startAt(): string | undefined {
  const id = cur?.focus;
  if (!id || S.quests[id] !== undefined) return undefined;
  for (const n of NPCS) for (const bs of Object.values(n.actions)) {
    const b = pickBranch(bs);
    if (!b?.do?.some(e => e.type === 'quest' && e.id === id)) continue;
    const at = ROOMS.find(r => [...r.npcs, ...(r.objs ?? [])].some(x => (typeof x === 'string' ? x : x.id) === n.id) && (r.id === S.loc || pathTo(S.loc, r.id).length));
    if (at) return at.id;
  }
  return undefined;
}

function actions(): Act[] {
  const list: Act[] = [];
  for (const id of [...roomNpcs(S.loc), ...roomObjs(S.loc)]) {
    const n = npc(id);
    if (!n) { err(`地点「${S.loc}」里的「${id}」不存在`); continue; }
    for (const v of verbsOf(n)) list.push({ k: 'act', id, v, key: branchKey(id, v) });
  }
  // 照界面：只走眼下开着的出口（序章里不开船，engine/world.ts 的 openExits）
  for (const [, to] of openExits(S.loc)) list.push({ k: 'go', to, key: `go|${S.loc}|${to}` });
  // 跟着任务横幅、约走：玩家大多这样走
  for (const dest of [curQuest()?.to, startAt(), ...S.yue.map(y => y.at)]) {
    if (!dest || dest === S.loc) continue;
    const p = pathTo(S.loc, dest);
    if (!p.length) err(`目的地「${dest}」从「${S.loc}」走不到`);
    else list.push({ k: 'go', to: p[0], key: `go|${S.loc}|${p[0]}`, quest: true });
  }
  // 别处有还没点过、眼下点得了的动作：朝最近的那一处走（玩家会到处找事做）
  const far = nearestNew();
  if (far) list.push({ k: 'go', to: far, key: `go|${S.loc}|${far}`, quest: true });
  // 盯着一件世事：往牵扯到它的人那里走（玩家听说了一件事，会去找那几个人）
  const near = cur?.shi ? nearestWith(id => SHI_NPC.get(cur!.shi!)!.has(id)) : null;
  if (near) list.push({ k: 'go', to: near, key: `go|${S.loc}|${near}`, quest: true, push: true });
  // 盯着一件心事：往推动它的人、递线索给东西的人那里走
  const qn = cur?.focus ? nearestWith(id => QUEST_NPC.get(cur!.focus!)!.has(id)) : null;
  if (qn) list.push({ k: 'go', to: qn, key: `go|${S.loc}|${qn}`, quest: true, push: true });
  // 身上有重伤：往最近的郎中那里走（玩家会去看伤）
  if (heavy() && S.silver >= 150) {
    const doc = nearestWith(id => !!npc(id)?.service?.includes('医'));
    if (doc) list.push({ k: 'go', to: doc, key: `go|${S.loc}|${doc}`, cure: true });
  }
  list.push({ k: 'rest', key: 'rest' }, { k: 'wait', key: 'wait' });
  return list;
}

/**
 * 每件世事能被哪些人推动：动作里直接推它的，或者开打、开剧情以后在结算、剧情里推它的（插手的人）。
 * 盯着一件世事时往这些人那里去（往告示、闲人那里去没用）
 */
const pushes = (x: unknown, id: string): boolean => !!x && JSON.stringify(x).includes(`"type":"shi","id":"${id}","to"`);
/** 这些条件里要的旗标 */
const flagsIn = (x: unknown): string[] => [...JSON.stringify(x ?? {}).matchAll(/"flag":"([^"]+)"/g)].map(m => m[1]);
/** 谁的动作会写下这个旗标（递线索的人：文朝奉说了，严捕头那里才有「报线」） */
const setters = (flag: string): string[] => NPCS.filter(n => JSON.stringify(n.actions).includes(`"type":"flag","flag":"${flag}"}`)).map(n => n.id);
const SHI_NPC = new Map(SHI.map(d => {
  const direct = NPCS.filter(n => {
    if (pushes(n.actions, d.id)) return true;
    const ids = [...JSON.stringify(n.actions).matchAll(/"type":"(?:fight|story)","(?:foe|id)":"([^"]+)"/g)].map(m => m[1]);
    return ids.some(x => pushes(foeById(x), d.id) || pushes(storyById(x), d.id));
  });
  // 往回多找一层：推动它的那个动作要先有的旗标，是谁递的
  const need = direct.flatMap(n => Object.entries(n.actions).flatMap(([v, bs]) => {
    const push = (bs ?? []).filter(b => pushes(b, d.id));
    if (!push.length) return [];
    const gate = n.verbs.find(x => typeof x !== 'string' && x.verb === v);
    return flagsIn([gate, push.map(b => b.if)]);
  }));
  return [d.id, new Set([...direct.map(n => n.id), ...need.flatMap(setters)])];
}));

/**
 * 每件心事能被哪些人推动：动作里直接推它的（开打、开剧情以后推它的也算），
 * 往回多找一层：推动它的动作要先有的旗标是谁递的、要带的东西是谁给的（华山的引荐信在扬州府衙求得）。
 * 盯着一件心事的局，往这些人那里走：玩家知道这件事，会去找这几个人，不会全靠撞
 */
const pushesQ = (x: unknown, id: string): boolean => !!x && JSON.stringify(x).includes(`"type":"quest","id":"${id}","stage"`);
const itemsIn = (x: unknown): string[] => [...JSON.stringify(x ?? {}).matchAll(/"item":\{"id":"([^"]+)"/g)].map(m => m[1]);
const givers = (item: string): string[] => NPCS.filter(n => JSON.stringify(n.actions).includes(`"type":"item","id":"${item}","delta":1`)).map(n => n.id);
const QUEST_NPC = new Map(QUESTS.map(q => {
  const direct = NPCS.filter(n => {
    if (pushesQ(n.actions, q.id)) return true;
    const ids = [...JSON.stringify(n.actions).matchAll(/"type":"(?:fight|story)","(?:foe|id)":"([^"]+)"/g)].map(m => m[1]);
    return ids.some(x => pushesQ(foeById(x), q.id) || pushesQ(storyById(x), q.id));
  });
  const gates = direct.flatMap(n => Object.entries(n.actions).flatMap(([v, bs]) => {
    const push = (bs ?? []).filter(b => pushesQ(b, q.id));
    return push.length ? [[n.verbs.find(x => typeof x !== 'string' && x.verb === v), push.map(b => b.if)]] : [];
  }));
  return [q.id, new Set([...direct.map(n => n.id), ...flagsIn(gates).flatMap(setters), ...itemsIn(gates).flatMap(givers)])];
}));

/** 从这里出发，最近的一处有没点过的动作的地点，返回往那里走的第一步 */
function nearestNew(): string | null {
  return nearestWith(id => { const n = npc(id); return !!n && verbsOf(n).some(v => !cov.branch.has(branchKey(id, v))); });
}

/** 从这里出发，最近的一处有这样的人的地点，返回往那里走的第一步 */
function nearestWith(ok: (id: string) => boolean): string | null {
  const prev = new Map<string, string>([[S.loc, '']]);
  const queue = [S.loc];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur !== S.loc && [...roomNpcs(cur), ...roomObjs(cur)].some(ok)) {
      let c = cur;
      while (prev.get(c) !== S.loc) c = prev.get(c)!;
      return c;
    }
    for (const [, nx] of openExits(cur)) if (!prev.has(nx)) { prev.set(nx, cur); queue.push(nx); }
  }
  return null;
}

/** 此刻各处能点、还没点过的动作 */
function untriedNow(): Set<string> {
  const out = new Set<string>();
  for (const r of ROOMS) for (const id of [...roomNpcs(r.id), ...roomObjs(r.id)]) {
    const n = npc(id);
    if (n) for (const v of verbsOf(n)) { const k = branchKey(id, v); if (!cov.branch.has(k)) out.add(k); }
  }
  return out;
}

/** 等到哪个钟点，会冒出眼下没有、也没点过的动作（只在夜里出来的人、只在白天开张的铺子） */
function newAtHour(): number | null {
  const now = S.min, base = untriedNow();
  try {
    for (const [h] of XIEJIAO) {
      S.min = h * 60;
      for (const k of untriedNow()) if (!base.has(k)) return h;
    }
  } finally { S.min = now; }
  return null;
}

/** 盯着一件世事：等到哪个钟点，能推动它的人会出来（人犯只在白天、夜里出没） */
function pushers(id: string): (x: string) => boolean { return x => SHI_NPC.get(id)!.has(x); }
function pusherAtHour(id: string): number | null {
  const now = S.min;
  if (roomNpcs(S.loc).some(pushers(id)) || nearestWith(pushers(id))) return null;
  try {
    for (const [h] of XIEJIAO) {
      S.min = h * 60;
      if (roomNpcs(S.loc).some(pushers(id)) || nearestWith(pushers(id))) return h;
    }
  } finally { S.min = now; }
  return null;
}

/** 挑一件事做：没做过的优先，跟着任务走的其次；伤重了去闭关 */
function choose(all: Act[], seen: Set<string>): Act {
  // 袖手旁观的局：不碰能推动这件世事的人，也不特意往那里去（碰上了就是玩家自己的选择，这里只管不主动）
  const list = cur?.watch ? all.filter(a => !(a.k === 'act' && SHI_NPC.get(cur!.shi!)!.has(a.id)) && !(a.k === 'go' && a.push)) : all;
  const w = list.map(a => {
    // 重伤闭关养不好（engine/shang.ts），找郎中、买药去；只有气血见底才闭关
    // 袖手旁观的局：事情要自己走上好几天（码头那件，西舵占了码头要七天），玩家多歇歇、过自己的日子
    if (a.k === 'rest') return S.hp < S.hpMax * 0.35 ? 20 : cur?.watch ? 8 : cur?.shi ? 0.02 : 0.2;
    if (a.k === 'act' && heavy() && /^(看伤|买跌打酒|买内伤药)$/.test(a.v)) return 60;
    if (a.k === 'go' && a.cure) return 50;
    // 盯着世事、要找的人眼下不在：多半是时辰不对，歇脚等一等
    if (a.k === 'wait') return cur?.shi && !roomNpcs(S.loc).some(pushers(cur.shi)) && !nearestWith(pushers(cur.shi)) ? 6 : 0.6;
    let x = a.k === 'go' ? 1 : 2;
    if (!cov.branch.has(a.key) && a.k === 'act') x += 12;
    if (a.k === 'act' && cur?.shi && SHI_NPC.get(cur.shi)!.has(a.id)) x += 30;
    // 盯着一件心事：到了推动它的人、递线索给东西的人面前，玩家会开口问、求信，不会转身就走（华山磨剑：申伯那儿的「求信」）
    if (a.k === 'act' && cur?.focus && QUEST_NPC.get(cur.focus)?.has(a.id)) x += 25;
    // 盯着世事：这个动作眼下会把它推到还没走过的那一步，直奔；推到走过的那一步（会就此了结），先放一放
    if (a.k === 'act' && cur?.shi) {
      const n = npc(a.id)!, b = pickBranch(n.actions[a.v as keyof typeof n.actions]);
      const to = (b?.do ?? []).find(e => e.type === 'shi' && e.id === cur!.shi && e.to);
      if (to) x = pushesNew([to]) ? x + 60 : x * 0.1;
    }
    if (!seen.has(a.key)) x += 4;
    if (a.k === 'go' && a.quest) x += S.yue.length ? 40 : 6;
    // 盯着世事：能推动它的人就在附近（人犯出没的时辰短），直奔过去
    if (a.k === 'go' && a.push) x += 40;
    if (a.k === 'go' && !cov.room.has(a.to)) x += 5;
    return x;
  });
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) return list[i]; }
  return list[list.length - 1];
}

function travel(to: string): void {
  const from = S.loc;
  // 照 ui/explore.ts 的 travelTo 走一段路
  const m = travelMin(hopMin(from, to));
  S.min += m;
  if (S.min >= 1440) { S.min -= 1440; advanceDays(S, 1); }
  S.loc = to; S.sel = null; S.reply = null;
  payFare(to);
  cov.room.add(to);
  const enc = rollEncounter(from, to, rng);
  if (enc) { markEncounter(enc); cov.enc.add(enc.id); playStory(enc.story, 0); }
  const r = room(S.loc);
  const b = r.onEnter?.findIndex(x => test(x.if)) ?? -1;
  if (b >= 0) cov.enter.add(`${S.loc}#${b}`);
  handle(enter(S.loc), 0);
}

function step(seen: Set<string>): void {
  // 带着治重伤的药，有重伤就吃（玩家会这样做）
  for (const id of ['dieda', 'neishang']) if ((S.items[id] ?? 0) > 0 && heavy()) useItem(id);
  const a = choose(actions(), seen);
  seen.add(a.key);
  if (a.k === 'act') {
    cov.branch.add(a.key);
    const { out } = act(a.id, a.v);
    handle(out, 0);
  } else if (a.k === 'go') travel(a.to);
  // 歇一会儿，或者歇脚等到某个钟点（ui/explore.ts 的 xiejiao；铁律跟现实时间走，机器玩家不受它管）。
  // 好奇的玩家听说夜里有人出没，会等到夜里去看看：等到那个钟点，就有没点过的动作冒出来
  else if (a.k === 'wait') {
    const h = rng() < 0.7 ? (cur?.shi ? pusherAtHour(cur.shi) : null) ?? newAtHour() : null;
    advanceMin(S, h !== null ? waitMin(S, h) : rng() < 0.5 ? 120 : waitMin(S, pickOne(XIEJIAO)[0]));
  }
  else {
    // 闭关碰到约期，那天一早就出关（engine/shiguang.ts 的 restDays；修为额度跟现实时间走，机器玩家不受它管，jingxiu 的 grow 传满 days）
    const want = cur?.shi ? 1 : 1 + Math.floor(rng() * 3), y = nextYue(S);
    const days = y ? Math.min(want, y.due - dayNo(S)) : want;
    if (days >= 1) jingxiu(S, days, rng, days);
  }
}

/* ---------- 存档里的数不能出格 ---------- */

function check(where: string): void {
  const bad: string[] = [];
  if (!Number.isFinite(S.hp) || S.hp < 0 || S.hp > S.hpMax) bad.push(`气血 ${S.hp}/${S.hpMax}`);
  if (!Number.isFinite(S.mp) || S.mp < 0 || S.mp > S.mpMax) bad.push(`内力 ${S.mp}/${S.mpMax}`);
  if (!Number.isInteger(S.silver) || S.silver < 0) bad.push(`银两 ${S.silver}`);
  if (!ROOMS.some(r => r.id === S.loc)) bad.push(`地点 ${S.loc}`);
  for (const [k, n] of Object.entries(S.items)) if (!Number.isInteger(n) || n < 0) bad.push(`物品 ${k}=${n}`);
  for (const [k, n] of Object.entries(S.quests)) {
    const q = questById(k);
    if (!q) bad.push(`任务 ${k} 不存在`);
    else if (n < 0 || n >= q.stages.length) bad.push(`任务 ${k} 阶段 ${n}`);
  }
  if (S.track && !questById(S.track)) bad.push(`追踪的任务 ${S.track} 不存在`);
  for (const [z, n] of Object.entries(S.wounds)) if (!Number.isInteger(n) || n < 0 || n > 3) bad.push(`伤 ${z}=${n}`);
  if (!(S.min >= 0 && S.min < 1440)) bad.push(`时辰 ${S.min}`);
  if (S.job && !jobById(S.job.id)) bad.push(`差事 ${S.job.id} 不存在`);
  if (bad.length) err(`${where}：${bad.join('，')}`);
}

function play(r: Run): void {
  cur = r;
  rng = mulberry32(r.seed);
  setState(r.start === 'new' ? newGame() : skipToYangzhou());
  cov.room.add(S.loc);
  if (r.start === 'new') playStory('p_open', 0);
  // 盯世事的局：先练上两个月，再从这件事刚起头时走起（一件接一件的事，前头的起头条件由 tests/shishi.test.ts、liushanmen.test.ts 管）。
  // 要验的是每一种插手的路走不走得通：人找不找得到、识不识得破、打不打得过
  if (r.shi && r.start === 'skip') {
    S.lilian += 20000;
    for (let m = 0; m < 6; m++) jingxiu(S, 30, rng, 30);
    // 练完了再给盘缠（不然住店花光了）：要花钱的插手也得有人走得到
    S.silver += 3000;
    run([{ type: 'shi', id: r.shi, to: shiById(r.shi)!.first }]);
    // 卫衡寻褚七的「撑船夜渡」要渔家的本领（序章里选过认得浅滩）：跳过序章的人没有选过，盯世事的局里每三局给一回，走一走这条路
    if (r.shi === 'kp_xun' && r.seed % 3 === 0) S.flags.kp_qiantan = true;
    // 对卫衡递话（告诉、指错路）要先在夜里的渡口见过褚七：机器玩家乱走很少碰巧夜里去渡口，另三分之一的局当作见过，走一走递话这条路
    if (r.shi === 'kp_xun' && r.seed % 3 === 1) S.flags.kp_chu_met = true;
  }
  // 盯一件心事的局，跳过序章开局的人是「已经办过几件侠义事」的：有的心事要名声够了才肯开口
  // （华山的引荐信，申伯那里侠义到二十五才写；这是有意的代价，不是机器玩家该靠乱走撞出来的）
  if (r.focus && r.start === 'skip') S.xia = Math.max(S.xia, 30);
  const seen = new Set<string>();
  for (let i = 0; i < r.steps; i++) {
    // 盯着一个任务走：它开了头，横幅就一直追踪它（玩家在任务簿里切换追踪）
    if (r.focus && S.quests[r.focus] !== undefined) S.track = r.focus;
    if (r.focus && S.quests[r.focus] === questById(r.focus)!.stages.length - 1) break;
    const where = `第 ${r.seed} 局第 ${i} 步（${room(S.loc).name}）`;
    // 照 ui/shell.ts 的 render：失约、江湖往前走
    // 导航说真话（engine/daohang.ts）：推进一步的那一刻，见闻簿上这一步写的门槛（时辰除外：路上就到了）都该打勾、也没写着做不成
    const pre = Object.keys(S.quests).map(id => ({ id, n: questNav(id) }));
    try { step(seen); checkYue(S); tickShi(); } catch (e) { err(`${where}报错：${(e as Error).message}`); }
    for (const { id, n } of pre) {
      if (!n || (S.quests[id] ?? -1) <= n.stage) continue;
      const st = questById(id)!.stages[n.stage];
      const miss = (st.need ?? []).filter((g, k) => !n.needs[k].ok && Object.keys(g.if).some(x => x !== 'hour')).map(g => g.text);
      if (miss.length) err(`${where}：「${n.name}」第 ${n.stage + 1} 步推进了，见闻簿却写着还差「${miss.join('、')}」`);
      if (n.state === '未竟') err(`${where}：「${n.name}」第 ${n.stage + 1} 步推进了，见闻簿却写着做不成了（${n.why}）`);
    }
    for (const [id, st] of Object.entries(S.shi ?? {})) cov.shi.add(`${id}.${st.at}`);
    if (r.shi && Object.keys(shiById(r.shi)!.steps).every(k => cov.shi.has(`${r.shi}.${k}`))) break;
    // 这件事了结了，还有没走过的路：从头再起一回（另一个玩家会走另一条路）
    // 袖手旁观的局，等到它自己走到结局就收场（这条路只有一个结局）
    if (r.shi) {
      const d = shiById(r.shi)!, at = S.shi?.[r.shi]?.at;
      if (at && isEnding(d, at)) { if (r.watch) break; run([{ type: 'shi', id: r.shi, to: d.first }]); }
    }
    // 过了约期的约不该还挂着（界面上会一直写「今日」）
    if (S.yue.some(y => y.due < dayNo(S))) err('过了约期的约还挂着');
    check(where.replace(/第 \d+ 步/, '某一步'));
  }
  for (const [k, n] of Object.entries(S.quests)) cov.quest.set(k, Math.max(cov.quest.get(k) ?? -1, n));
  if (VERBOSE) console.log(`第 ${r.seed} 局：${tierNow(S).name}，银两 ${S.silver}，功力 ${S.gongli}，${Object.entries(S.skills).map(([k, v]) => k + (v?.r ?? 0)).join(' ')}，任务 ${JSON.stringify(S.quests)}，旗标 ${Object.keys(S.flags).length} 个${S.flags.boss ? '，打赢了屠千山' : ''}`);
}

describe('机器玩家走遍江湖', () => {
  setNowMs(() => 1_000_000_000_000);
  const t0 = Date.now();
  for (const r of RUNS) play(r);
  // 还没走完的任务，专门盯着它再走几局
  const done = (id: string): boolean => (cov.quest.get(id) ?? -1) >= questById(id)!.stages.length - 1;
  for (const q of QUESTS) for (let k = 0; k < 24 && !done(q.id); k++) play({ start: k % 2 ? 'skip' : 'new', steps: 5000, seed: 1000 + k + (env.ZOUBIAN_SEED ? Number(env.ZOUBIAN_SEED) : 0), focus: q.id });
  // 还有没走到的世事的步，盯着那件事再走几局：隔一局插手一局（往牵扯到它的人那里去，认真打，胜负以后挑没走过的路），
  // 袖手旁观（只管自己的日子，等它自己走到结局：「不管它」那条路上的每一步）。
  // 起头用 run 直接推到头一步，不受 tickShi「没到过这一带就停在起头」的规则管：推动的人当场就听说了，世事照常往下走
  const shiLeft = (id: string): boolean => Object.keys(shiById(id)!.steps).some(k => !cov.shi.has(`${id}.${k}`));
  for (const d of SHI) for (let k = 0; k < 24 && shiLeft(d.id); k++) play({ start: 'skip', steps: 3000, seed: 2000 + k, shi: d.id, watch: k % 2 === 1 });
  const ms = Date.now() - t0;

  // 覆盖报告
  const allBranches = NPCS.flatMap(n => Object.entries(n.actions).flatMap(([v, bs]) => (bs ?? []).map((_, i) => `${n.id}|${v}|${i}`)));
  const missBranch = allBranches.filter(k => !cov.branch.has(k));
  const allChoices = STORIES.flatMap(s => s.cards.flatMap((c, i) => c.choices.map((_, k) => `${s.id}#${i}#${k}`)));
  const missChoice = allChoices.filter(k => !cov.choice.has(k));
  const missEnc = ENCOUNTERS.filter(e => !cov.enc.has(e.id)).map(e => e.id);
  const missFoe = FOES.filter(f => !cov.foe.has(f.id)).map(f => f.id);
  const missRoom = ROOMS.filter(r => !cov.room.has(r.id)).map(r => r.id);
  const allShi = SHI.flatMap(d => Object.keys(d.steps).map(k => `${d.id}.${k}`));
  const missShi = allShi.filter(k => !cov.shi.has(k));
  const unfinished = QUESTS.filter(q => (cov.quest.get(q.id) ?? -1) < q.stages.length - 1).map(q => `${q.id}（最远到第 ${(cov.quest.get(q.id) ?? -1) + 1} 阶段，共 ${q.stages.length}）`);
  const report = [
    `走了 ${RUNS.length} 局、${RUNS.reduce((a, r) => a + r.steps, 0)} 步，用时 ${ms} 毫秒`,
    `分支 ${allBranches.length - missBranch.length}/${allBranches.length}，剧情选项 ${allChoices.length - missChoice.length}/${allChoices.length}，路遇 ${ENCOUNTERS.length - missEnc.length}/${ENCOUNTERS.length}，对手 ${FOES.length - missFoe.length}/${FOES.length}，地点 ${ROOMS.length - missRoom.length}/${ROOMS.length}`,
    `没走完的任务：${unfinished.join('、') || '无'}`,
    `没去过的地点：${missRoom.join('、') || '无'}`,
    `没碰上的对手：${missFoe.join('、') || '无'}`,
    `没碰上的路遇：${missEnc.join('、') || '无'}`,
    `世事 ${allShi.length - missShi.length}/${allShi.length} 步，没走到的：${missShi.join('、') || '无'}`,
    `提醒：\n${[...warns].map(([m, n]) => `  ${m}（${n} 次）`).join('\n') || '  无'}`
  ];
  if (PREFIX) {
    const mine = (k: string): boolean => k.startsWith(PREFIX);
    const own = (all: string[], miss: string[]): string => `${all.filter(mine).length - miss.filter(mine).length}/${all.filter(mine).length}`;
    report.push(`\n—— 前缀「${PREFIX}」的内容 ——`,
      `分支 ${own(allBranches, missBranch)}，剧情选项 ${own(allChoices, missChoice)}，对手 ${own(FOES.map(f => f.id), missFoe)}，路遇 ${own(ENCOUNTERS.map(e => e.id), missEnc)}，地点 ${own(ROOMS.map(r => r.id), missRoom)}，世事 ${own(allShi, missShi)}`,
      `没走到的：\n  ${[...missBranch, ...missChoice, ...missFoe, ...missEnc, ...missRoom, ...missShi].filter(mine).join('\n  ') || '无'}`,
      '（没走到的不一定是错：可能要很高的根基、很多钱、特定的选择。逐条想一想玩家怎样才能走到；想不出来，就是写错了。）');
  }
  if (VERBOSE && !PREFIX) {
    report.push(`没走到的分支（${missBranch.length}）：\n  ${missBranch.join('\n  ')}`);
    report.push(`没选过的剧情选项（${missChoice.length}）：\n  ${missChoice.join('\n  ')}`);
  }
  console.log(report.join('\n'));

  it('每个任务都走得完', () => {
    expect(unfinished, '这些任务机器玩家走了几十局也没走完，多半有地方卡住了').toEqual([]);
  });

  it('每件世事的每一步都有人走到（不管它的那条路，和每一种插手）', () => {
    expect(missShi, '这些世事的步机器玩家走了几十局也没走到，多半是插手的条件太苛、人不在、或者时辰对不上').toEqual([]);
  });

  it('不报错，存档里的数不出格，不卡死', () => {
    const list = [...errs].map(([m, n]) => `${m}（${n} 次）`);
    expect(list, '\n' + list.join('\n')).toEqual([]);
  });
});
