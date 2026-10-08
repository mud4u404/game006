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
import { ENCOUNTERS, FOES, NPCS, QUESTS, ROOMS, SHI, STORIES, foeById, jobById, npc, questById, room, storyById } from '../src/content';
import { run, test, type Outcome } from '../src/engine/dsl';
import { act, curQuest, enter, hopMin, pathTo, roomNpcs, roomObjs, travelMin, verbsOf } from '../src/engine/world';
import { markEncounter, rollEncounter } from '../src/engine/encounter';
import { Duel, RANDOM, SKILLED, simulate, type DuelRes, type Policy } from '../src/engine/duel';
import { activePrep, alliesOf, fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { brace, fateOpts, settle, takeWounds } from '../src/engine/jiesuan';
import { XIEJIAO, checkYue, jingxiu, nextYue, waitMin } from '../src/engine/shiguang';
import { mulberry32 } from '../src/engine/rng';
import { tierNow } from '../src/engine/ren';
import { tickShi } from '../src/engine/shishi';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const VERBOSE = !!env.ZOUBIAN;
/** 只看这个前缀的内容：协作者自查「我写的东西玩家走不走得到」 */
const PREFIX = env.ZOUBIAN_PREFIX ?? '';

/** 一局：从哪里开始、走几步、用哪个种子 */
interface Run { start: 'new' | 'skip'; steps: number; seed: number; focus?: string }
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
    // 没选过的选项优先（玩家各有各的选法，几局下来每条路都该有人走过）
    const fresh = ok.filter(([, k]) => !cov.choice.has(`${id}#${i}#${k}`));
    const [c, k] = pickOne(fresh.length && rng() < 0.7 ? fresh : ok);
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
  brace(f);
  const prep = activePrep(f);
  const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, prep), { rng, allies: alliesOf(prep) });
  // 玩家各有各的打法：大多照「以己之长」应对，也有乱点的、不出招干挨打的、打不过就跑（认输）的
  const style = rng();
  if (style < 0.08 && !f.script) {
    for (let t = 0; t < 30 && !d.over; t++) d.tick(), f.spar ? d.yieldUp() : d.flee();
  }
  const idle = cur?.focus ? 0.4 : 0.18;
  if (!d.over) simulate(d, style < idle ? IDLE : style < idle + 0.27 ? RANDOM : SKILLED);
  S.hp = Math.max(0, Math.round(d.hp));
  S.mp = Math.max(0, Math.round(d.mp));
  const res = d.res!;
  takeWounds(f, d.log.taken);
  const opts = fateOpts(f, res);
  const pk = opts.length ? pickOne(opts) : undefined;
  if (pk) cov.fate.add(`${fid}#${f.results.win.after!.opts.indexOf(pk)}`);
  if (!cov.foe.has(fid)) cov.foe.set(fid, new Set());
  cov.foe.get(fid)!.add(res);
  const st = settle(f, res, prep, pk);
  if (!st.r) err(`对手「${fid}」打出「${res}」却没有对应的结算`);
  if (st.out.fight || st.out.story) err(`对手「${fid}」的「${res}」结算：do 里的开打、开剧情不会生效，要写在 then 里`);
  if (S.hp <= 0) warn(`对手「${fid}」打「${res}」以后气血是零，结算没有回血`);
  if (st.r?.then) handle(run(st.r.then), depth);
}

/** 不出招、不应对，干挨打：打输了的那些结局也得有人走到 */
const IDLE: Policy = { name: '不出手', pick: () => null, openTake: 0, performs: false };

/* ---------- 玩家能做的事 ---------- */

type Act = { k: 'act'; id: string; v: string; key: string } | { k: 'go'; to: string; key: string; quest?: boolean } | { k: 'rest'; key: string } | { k: 'wait'; key: string };

function branchKey(id: string, v: string): string {
  const n = npc(id)!;
  const bs = n.actions[v as keyof typeof n.actions];
  return `${id}|${v}|${bs ? bs.findIndex(b => test(b.if)) : -1}`;
}

function actions(): Act[] {
  const list: Act[] = [];
  for (const id of [...roomNpcs(S.loc), ...roomObjs(S.loc)]) {
    const n = npc(id);
    if (!n) { err(`地点「${S.loc}」里的「${id}」不存在`); continue; }
    for (const v of verbsOf(n)) list.push({ k: 'act', id, v, key: branchKey(id, v) });
  }
  for (const [, to] of room(S.loc).exits) list.push({ k: 'go', to, key: `go|${S.loc}|${to}` });
  // 跟着任务横幅、约走：玩家大多这样走
  for (const dest of [curQuest()?.to, ...S.yue.map(y => y.at)]) {
    if (!dest || dest === S.loc) continue;
    const p = pathTo(S.loc, dest);
    if (!p.length) err(`目的地「${dest}」从「${S.loc}」走不到`);
    else list.push({ k: 'go', to: p[0], key: `go|${S.loc}|${p[0]}`, quest: true });
  }
  // 别处有还没点过、眼下点得了的动作：朝最近的那一处走（玩家会到处找事做）
  const far = nearestNew();
  if (far) list.push({ k: 'go', to: far, key: `go|${S.loc}|${far}`, quest: true });
  list.push({ k: 'rest', key: 'rest' }, { k: 'wait', key: 'wait' });
  return list;
}

/** 从这里出发，最近的一处有没点过的动作的地点，返回往那里走的第一步 */
function nearestNew(): string | null {
  const prev = new Map<string, string>([[S.loc, '']]);
  const queue = [S.loc];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur !== S.loc && [...roomNpcs(cur), ...roomObjs(cur)].some(id => { const n = npc(id); return n && verbsOf(n).some(v => !cov.branch.has(branchKey(id, v))); })) {
      let c = cur;
      while (prev.get(c) !== S.loc) c = prev.get(c)!;
      return c;
    }
    for (const [, nx] of room(cur).exits) if (!prev.has(nx)) { prev.set(nx, cur); queue.push(nx); }
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

/** 挑一件事做：没做过的优先，跟着任务走的其次；伤重了去闭关 */
function choose(list: Act[], seen: Set<string>): Act {
  const w = list.map(a => {
    if (a.k === 'rest') return S.hp < S.hpMax * 0.35 || S.wounds.hand + S.wounds.foot + S.wounds.inner >= 3 ? 20 : 0.2;
    if (a.k === 'wait') return 0.6;
    let x = a.k === 'go' ? 1 : 2;
    if (!cov.branch.has(a.key) && a.k === 'act') x += 12;
    if (!seen.has(a.key)) x += 4;
    if (a.k === 'go' && a.quest) x += S.yue.length ? 40 : 6;
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
  cov.room.add(to);
  const enc = rollEncounter(from, to, rng);
  if (enc) { markEncounter(enc); cov.enc.add(enc.id); playStory(enc.story, 0); }
  const r = room(S.loc);
  const b = r.onEnter?.findIndex(x => test(x.if)) ?? -1;
  if (b >= 0) cov.enter.add(`${S.loc}#${b}`);
  handle(enter(S.loc), 0);
}

function step(seen: Set<string>): void {
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
    const h = rng() < 0.7 ? newAtHour() : null;
    advanceMin(S, h !== null ? waitMin(S, h) : rng() < 0.5 ? 120 : waitMin(S, pickOne(XIEJIAO)[0]));
  }
  else {
    // 闭关碰到约期，那天一早就出关（engine/shiguang.ts 的 restDays；铁律跟现实时间走，机器玩家不受它管）
    const want = 1 + Math.floor(rng() * 3), y = nextYue(S);
    const days = y ? Math.min(want, y.due - dayNo(S)) : want;
    if (days >= 1) jingxiu(S, days, rng);
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
  const seen = new Set<string>();
  for (let i = 0; i < r.steps; i++) {
    // 盯着一个任务走：它开了头，横幅就一直追踪它（玩家在任务簿里切换追踪）
    if (r.focus && S.quests[r.focus] !== undefined) S.track = r.focus;
    if (r.focus && S.quests[r.focus] === questById(r.focus)!.stages.length - 1) break;
    const where = `第 ${r.seed} 局第 ${i} 步（${room(S.loc).name}）`;
    // 照 ui/shell.ts 的 render：失约、江湖往前走
    try { step(seen); checkYue(S); tickShi(); } catch (e) { err(`${where}报错：${(e as Error).message}`); }
    for (const [id, st] of Object.entries(S.shi ?? {})) cov.shi.add(`${id}.${st.at}`);
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
  for (const q of QUESTS) for (let k = 0; k < 24 && !done(q.id); k++) play({ start: k % 2 ? 'skip' : 'new', steps: 5000, seed: 1000 + k, focus: q.id });
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
