/**
 * 事事有收场（docs/sheji-youhua-1010.md 第一条；摸底清单 docs/bihuan-1010.md）：
 * 负责人 10-10：「要求剧情和任务都能跑通，每个事件都实现闭环，哪怕是多结局，总之不能悬而未决，每个任务让玩家都能有办法继续。」
 *
 * 这里查机器看得出的那一半：玩家走到任何一个阶段，至少有一条出路，了结的时候有话交代。
 *   心事（QuestDef）
 *     Q1 每个没了结的阶段，有写明去处和做法（to、hint）——玩家知道往哪走
 *     Q2 每个没了结的阶段，有下一步：至少一个人的动作、一处进门、一次路遇能把它推到更后面；没有的，必须写了「做不成」（fail）收场
 *     Q3 每条通向结局的路都有交代：推到最后一阶段的那个分支，有一句话说（分支的文字、剧情卡片、动态）
 *   差事和悬赏（JobDef）
 *     J1 有人能派（接下的动作存在，并有一句话说）
 *     J2 有人能收（交差的动作存在，并有一句话说）；误了期限由引擎记一笔（days > 0）
 *     J3 办砸了有说法：能 jobFail 的分支，说了发生什么
 *   世事（ShiDef，只查扬州、瓜洲、镇江——玩家眼下到得了的地方）
 *     S1 起头那一步、每一个 next / alt / route / here 指向的步，都真有这一步
 *     S2 每一步都有见闻簿上的一句（now）；结局步（没有 next 的）不能空
 *     S3 每一步都有来路（起头、别的步走过来、或谁的动作把它推过来），没有悬空的孤步
 *     S4 顺着 next 一直走，总会走到一个结局，不会兜圈子
 *
 * 存量登记在 KNOWN：键 = 「类｜事 id｜步」，值是缺什么。只许减不许增：修好了对应的 it.fails 会先红，提醒把那一行删掉；
 * 新写的事不在登记里，一律必须过。
 */
import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, JOBS, NPCS, QUESTS, ROOMS, SHI, foeById, storyById } from '../src/content';
import type { Effect, JobDef, NpcAt, QuestDef, ShiDef } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { pathTo } from '../src/engine/world';

/** 玩家眼下到得了的地区 */
const REGIONS = new Set(['yz', 'gz', 'zj']);

/** 已知没收场的存量：修好一条，删一行 */
const KNOWN: Record<string, string> = {};

/* ---------------------------------------------------------------------------------------------------
 * 小工具：一个分支（人的动作、进门、路遇）里所有的效果，剧情卡片、开打的后续也算
 * --------------------------------------------------------------------------------------------------- */

const collect = (o: unknown): Effect[] => {
  const out: Effect[] = [];
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (!x || typeof x !== 'object') return;
    const r = x as Record<string, unknown>;
    if (typeof r.type === 'string') out.push(r as unknown as Effect);
    Object.values(r).forEach(walk);
  };
  walk(o);
  return out;
};
/** 开剧情、开打以后嵌着的效果，一层层往里找（剧情接剧情、开打再开剧情都算） */
const nestCache = new Map<string, Effect[]>();
function nested(e: Effect): Effect[] {
  const key = e.type === 'story' ? 's:' + e.id : e.type === 'fight' ? 'f:' + e.foe : '';
  if (!key) return [];
  const hit = nestCache.get(key);
  if (hit) return hit;
  nestCache.set(key, []); // 先占位，剧情绕回自己时不死循环
  const direct = collect(e.type === 'story' ? storyById(e.id) : foeById((e as { foe: string }).foe));
  const all = [...direct, ...direct.flatMap(nested)];
  nestCache.set(key, all);
  return all;
}
const has = (dos: Effect[] | undefined, pred: (e: Effect) => boolean): boolean => (dos ?? []).some(e => pred(e) || nested(e).some(pred));

/** 一个人（或物件）会在哪几处：房间的人物表，加上他自己的作息（at） */
const placesOf = (id: string): string[] => {
  const out = new Set<string>();
  for (const r of ROOMS) if ([...(r.npcs ?? []), ...(r.objs ?? [])].some(x => (typeof x === 'string' ? x : x.id) === id)) out.add(r.id);
  const n = NPCS.find(x => x.id === id);
  for (const a of ([] as NpcAt[]).concat(n?.at ?? [])) if (a.room) out.add(a.room);
  return [...out];
};

/** 一个能推动事情的分支：谁的哪个动作（或进门、路遇），有没有话说，效果是什么 */
interface Prog { who: string; verb: string; talks: boolean; dos: Effect[]; places: string[] }
function progressors(pred: (e: Effect) => boolean): Prog[] {
  const out: Prog[] = [];
  for (const n of NPCS) for (const [verb, bs] of Object.entries(n.actions)) for (const b of bs ?? []) {
    if (has(b.do, pred)) out.push({ who: n.name, verb, places: placesOf(n.id), talks: !!b.text || has(b.do, e => e.type === 'story' || e.type === 'fight' || e.type === 'feed' || e.type === 'toast'), dos: b.do ?? [] });
  }
  for (const r of ROOMS) for (const b of r.onEnter ?? []) {
    if (has(b.do, pred)) out.push({ who: r.name, verb: '走进', places: [r.id], talks: !!b.text || has(b.do, e => e.type === 'story' || e.type === 'feed'), dos: b.do ?? [] });
  }
  for (const en of ENCOUNTERS) {
    if (has([{ type: 'story', id: en.story }], pred)) out.push({ who: '路遇 ' + en.id, verb: '赶路', places: [], talks: true, dos: [{ type: 'story', id: en.story }] });
  }
  return out;
}

/* ---------------------------------------------------------------------------------------------------
 * 收集：每个检查一条记录
 * --------------------------------------------------------------------------------------------------- */

interface Item { key: string; label: string; ok: boolean; why: string }
const items: Item[] = [];
const add = (kind: string, id: string, step: string, label: string, ok: boolean, why: string): void => {
  items.push({ key: `${kind}｜${id}｜${step}`, label, ok, why: ok ? '' : why });
};

/** 从府衙照壁走得到（章回当作进了扬州）：玩家眼下到得了这一处 */
const reachable = (to: string): boolean => {
  setState(skipToYangzhou());
  S.chapter = Math.max(S.chapter, 1);
  return to === 'yz_zhaobi' || pathTo('yz_zhaobi', to).length > 0;
};

/* ====================================================================================================
 * 心事
 * ==================================================================================================== */

function checkQuest(q: QuestDef): void {
  const last = q.stages.length - 1;
  q.stages.forEach((st, i) => {
    const step = `s${i + 1}`;
    const name = `心事「${q.name}」第 ${i + 1} 步「${st.title}」`;
    if (i < last) {
      add('Q1', q.id, step, `${name} · 写明去处和做法`, !!st.to && !!st.hint, '这一步没写 to（去哪）或 hint（怎么做），玩家不知道往哪走');
      const adv = progressors(e => e.type === 'quest' && e.id === q.id && e.stage > i);
      const closed = !!q.fail || !!st.fail;
      // 序章、第一回的头一步是开局给的，不靠谁推；它的下一步由别的动作推，照样要查「有下一步」
      add('Q2', q.id, step, `${name} · 有下一步或收场`, adv.length > 0 || closed, '没有任何一个人的动作、进门或路遇能把它推到下一步，也没写 fail（做不成）收场');
    }
  });
  // 玩家碰得到它的入口：头一个由动作推起来的阶段，推它的人（或那一处）从扬州走得到
  const firstSet = q.stages.map((_, i) => progressors(e => e.type === 'quest' && e.id === q.id && e.stage === i)).find(p => p.length > 0);
  if (firstSet) {
    const ok = firstSet.some(p => p.verb === '赶路' || p.places.some(reachable));
    add('Q4', q.id, 'entry', `心事「${q.name}」入口走得到`, ok, `起头的动作（${firstSet.map(p => p.who + '的「' + p.verb + '」').join('、')}）所在的地方从扬州都走不到`);
  }
  // 通向结局的每一条路都有话说
  const end = progressors(e => e.type === 'quest' && e.id === q.id && e.stage === last);
  add('Q3', q.id, 'end', `心事「${q.name}」结局有人推到`, end.length > 0 || q.stages.length === 1, '最后一阶段没有任何动作能走到，这件事了结不了');
  for (const p of end) add('Q3', q.id, `end:${p.who}/${p.verb}`, `心事「${q.name}」结局（${p.who}的「${p.verb}」）有话交代`, p.talks, `${p.who}的「${p.verb}」把事了结了，却没有一句话（text、剧情或动态）交代`);
}

/* ====================================================================================================
 * 差事和悬赏
 * ==================================================================================================== */

function checkJob(j: JobDef): void {
  const name = `差事「${j.title}」`;
  const take = progressors(e => e.type === 'job' && e.id === j.id);
  const done = progressors(e => e.type === 'jobDone' && e.id === j.id);
  const fail = progressors(e => e.type === 'jobFail' && e.id === j.id);
  add('J1', j.id, 'take', `${name} · 有人派、有话说`, take.length > 0 && take.some(p => p.talks), '没有任何人的动作能接下它，或接下时一句话也没有');
  add('J2', j.id, 'done', `${name} · 有人收、有话说`, done.length > 0 && done.some(p => p.talks), '没有任何人的动作能交差，或交差时一句话也没有');
  add('J2', j.id, 'days', `${name} · 有期限（误了由引擎收场）`, j.days > 0, '没写期限 days，误了就没人管');
  if (take.length) add('J4', j.id, 'take-reach', `${name} · 派差的人从扬州走得到`, take.some(p => p.places.some(reachable)), `派差的人（${take.map(p => p.who).join('、')}）所在的地方从扬州都走不到`);
  if (done.length) add('J4', j.id, 'done-reach', `${name} · 收差的人从扬州走得到`, done.some(p => p.places.some(reachable)), `收差的人（${done.map(p => p.who).join('、')}）所在的地方从扬州都走不到`);
  for (const p of fail) add('J3', j.id, `fail:${p.who}/${p.verb}`, `${name} · ${p.who}的「${p.verb}」办砸了有说法`, p.talks, '能把差事办砸，却一句话也没说发生了什么');
}

/* ====================================================================================================
 * 世事
 * ==================================================================================================== */

function checkShi(d: ShiDef): void {
  const name = `世事「${d.name}」`;
  const steps = Object.keys(d.steps);
  add('S1', d.id, 'first', `${name} · 起头那一步存在`, !!d.steps[d.first], `first「${d.first}」不在 steps 里`);
  const reached = new Set<string>([d.first]);
  for (const [id, s] of Object.entries(d.steps)) {
    const to = s.next ? [s.next.to, ...(s.next.alt ? [s.next.alt.to] : []), ...(s.next.route ?? []).map(r => r.to), ...Object.values(s.next.here ?? {})] : [];
    for (const t of to) { reached.add(t); add('S1', d.id, `${id}→${t}`, `${name}「${id}」走向「${t}」存在`, !!d.steps[t], `「${id}」指向的「${t}」不在 steps 里`); }
    add('S2', d.id, id, `${name}「${id}」见闻簿有话`, !!s.now && s.now.length >= 6, '这一步 now 是空的，见闻簿上没有这一步的交代');
  }
  // 别处的动作把它推过来的（{ type: 'shi', id, to }）
  const pushed = new Set<string>();
  for (const p of progressors(e => e.type === 'shi' && e.id === d.id && !!e.to)) {
    for (const e of [...p.dos, ...p.dos.flatMap(nested)]) if (e.type === 'shi' && e.id === d.id && e.to) pushed.add(e.to);
  }
  for (const id of steps) add('S3', d.id, id, `${name}「${id}」有来路`, reached.has(id) || pushed.has(id), '这一步没有任何来路（不是起头、没人指向、没有动作推过来），是孤步');
  // 顺着 next 走，不兜圈子：每一步沿 next/alt 一直走，能走到没有 next 的一步
  const ends = (start: string): boolean => {
    const seen = new Set<string>();
    const dfs = (id: string): boolean => {
      const s = d.steps[id];
      if (!s) return true;
      if (!s.next) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return [s.next.to, ...(s.next.alt ? [s.next.alt.to] : [])].some(dfs);
    };
    return dfs(start);
  };
  for (const id of steps) add('S4', d.id, id, `${name}「${id}」能走到结局`, ends(id), '顺着 next 走下去是个圈，走不到结局');
}

/* ====================================================================================================
 * 跑一遍，生成用例
 * ==================================================================================================== */

describe('事事有收场：心事、差事、世事每个阶段都有出路（摸底 10-10）', () => {
  for (const q of QUESTS) checkQuest(q);
  for (const j of JOBS) checkJob(j);
  for (const d of SHI.filter(x => REGIONS.has(x.region))) checkShi(d);

  const dump = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env?.BIHUAN_DUMP;
  if (dump) console.log('BIHUAN_JSON' + JSON.stringify({ n: items.length, bad: items.filter(i => !i.ok) }));

  for (const it0 of items) {
    const body = (): void => { expect(it0.ok, `${it0.label}：${it0.why}（登记键 ${it0.key}）`).toBe(true); };
    if (it0.key in KNOWN) it.fails(`已知没收场：${it0.label}：${KNOWN[it0.key]}`, body);
    else it(it0.label, body);
  }

  it('登记表里没有过期的键', () => {
    const have = new Set(items.map(i => i.key));
    expect(Object.keys(KNOWN).filter(k => !have.has(k))).toEqual([]);
  });

  it('查到了东西：心事、差事、世事都有被查的项', () => {
    expect(items.filter(i => i.key.startsWith('Q')).length).toBeGreaterThan(30);
    expect(items.filter(i => i.key.startsWith('J')).length).toBeGreaterThan(30);
    expect(items.filter(i => i.key.startsWith('S')).length).toBeGreaterThan(50);
  });
});
