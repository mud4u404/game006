/**
 * 线索不断（docs/gugan.md 第四节 S4）：玩家会遇到的每一件「事」，在它的每一个可达阶段，见闻簿都得说清下一步。
 * 真实玩家反馈：「主要是有些任务没有线索。」这里逐件、逐阶段查五样：
 *   A 线索    见闻簿此刻有一行说清下一步去找谁、去哪（人名、地名在文字里，或导航有目标）。世事例外：只查地名（写地方、不写找谁）
 *   B 人在    说到的那个人，一天里至少有一个时辰真在说到的地方（作息用 engine/world.ts 的 roomNpcs、roomObjs）；世事不查
 *   C 走得到  说到的地方从扬州走得到（engine/world.ts 的 pathTo）
 *   D 时辰    人不是整日都在的，见闻簿或传闻里能知道什么时辰（写「夜里」「午后」也算）
 *   E 卡住    门槛不够、人走了、人死了、事做不成时，见闻簿有一句说明为什么、还缺什么
 * 查的「事」：心事（QuestDef 每一个没了结的阶段）、差事和悬赏（JobDef：接下之后、每一条线头）、
 * 世事里玩家能插手的步（ShiDef 里，有人的动作、剧情、开打能把它推到别处的那些步）。
 *
 * 做法：每一阶段先搭出「走到这一步」的存档（心事：照推它到这一步的那个动作的条件与效果；差事：接下，再满足线头的条件；
 * 世事：把它放到这一步），再用现有的导航（engine/daohang.ts）、见闻簿（ui/views/questbook.ts）、作息（engine/world.ts）查。
 *
 * 现在断着的登记在 KNOWN_BROKEN（一条断线一个 it.fails）：主线保持绿，修好一条它就会提示「转正」，把那一行从清单里删掉即可。
 * 不在清单里的，一律必须通过：新写的事没有线索，这里就红。清单对应 docs/xiansuo-duanxian.md（断线表，含建议怎么补）。
 *
 * 只读：不改内容、不改引擎。XIANSUO_DUMP=1 时把全部检查结果打印成一行 JSON（出断线表用）。
 */
import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, FOES, JOBS, NPCS, QUESTS, ROOMS, SHI, STORIES, foeById, itemById, npc, room, skillById, storyById } from '../src/content';
import type { Cond, Effect, JobDef, QuestDef, ShiDef } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { absMin, setNowMs } from '../src/core/time';
import { questNav, whoNav } from '../src/engine/daohang';
import { run, test } from '../src/engine/dsl';
import { knownShi } from '../src/engine/shishi';
import { pathTo, roomNpcs, roomObjs } from '../src/engine/world';
import { questbookSheetHtml } from '../src/ui/views/questbook';

setNowMs(() => 1_000_000_000_000);

/** 「从扬州走得到」：从府衙照壁出发（序章在瓜洲，从渡口小屋出发） */
const START = 'yz_zhaobi';

type Check = 'A' | 'B' | 'C' | 'D' | 'E';
const CHECK_NAME: Record<Check, string> = {
  A: '没写去找谁或去哪', B: '人不在说到的地方', C: '地方走不到', D: '不知道什么时辰在', E: '卡住了不说为什么'
};

interface Finding {
  kind: '心事' | '差事' | '世事';
  id: string; name: string;
  step: string; stepName: string;
  check: Check;
  /** 同一步同一项检查的几种情形（门槛、做不成、人没了） */
  sub: string;
  ok: boolean;
  /** 不过的原因，写给人看 */
  why: string;
  /** 登记键：事｜步｜检查（带情形的：步#情形） */
  key: string;
}

/* ====================================================================================================
 * 已知断线清单：key = 「事 id｜步｜检查」，值是缺什么（一句话）。修好了就从这里删掉那一行。
 * 删之前，对应的 it.fails 会先红一下（「预期失败却通过了」），提醒转正。
 * ==================================================================================================== */
const KNOWN_BROKEN: Record<string, string> = {
  // 差事：小栓（寻人）、阿蕙（寻物）两条线上的「点破」要悟性或胆魄够，见闻簿没交代
  // （#312 已补：xuanshang.ts 的 xsb_xunren.xian[1]、xsb_xunwu.xian[1]）
  // 差事：放走凶手，差事就交不了了，见闻簿照旧写着去交差
  // （#312 已补：xuanshang.ts 的 xsb_xiong.xian 添了 flag: 'xsb_xiong_gone' 那一支）
  // 世事（维护者 10-10：写地方、不写找谁）：能插手的步，见闻簿那一行里没点出事情在哪儿闹
  // 卫衡寻褚七「fang」已在 #303 补上运河渡口，登记删掉；其余十处见 #316
  'smth_shi|st_qi#缺地名|A': '缺地名：乱石阵困船没点出事情在哪儿闹（常见的去处：听潮小筑）',
  'ssgz_xun|st_qi#缺地名|A': '缺地名：鲥鱼汛争江面没点出事情在哪儿闹（常见的去处：瓜洲码头）',
  'ssgz_xun|st_zheng#缺地名|A': '缺地名：鲥鱼汛争江面没点出事情在哪儿闹（常见的去处：瓜洲码头）',
  'ssgz_du|st_shu#缺地名|A': '缺地名：客店的赌桌没点出事情在哪儿闹（常见的去处：江口客店）',
  'ss_matou|st_duizhi#缺地名|A': '缺地名：码头空出来以后没点出事情在哪儿闹（常见的去处：运河渡口、府衙前堂 · 六扇门）',
  'ss_matou|st_huobing#缺地名|A': '缺地名：码头空出来以后没点出事情在哪儿闹（常见的去处：运河渡口、府衙前堂 · 六扇门）',
  'sszj_du|st_dazhi#缺地名|A': '缺地名：渡船涨价没点出事情在哪儿闹（常见的去处：西津渡、待渡亭）',
  'sszj_dao|st_diu#缺地名|A': '缺地名：道场拐孩子没点出事情在哪儿闹（常见的去处：西津渡）',
  'sz_juan|st_yuan#缺地名|A': '缺地名：织造贡绢失窃没点出事情在哪儿闹（常见的去处：枫桥码头、星桥埠头、苏州府衙）',
  'sz_hua|st_zheng#缺地名|A': '缺地名：山塘河画舫相争没点出事情在哪儿闹（常见的去处：星桥埠头）'
};

/* ---------------------------------------------------------------------------------------------------
 * 小工具
 * --------------------------------------------------------------------------------------------------- */

const fresh = (): void => { setState(skipToYangzhou()); S.min = 10 * 60; };
const snap = (): unknown => structuredClone(S);
const restore = (s: unknown): void => setState(structuredClone(s) as typeof S);

const text = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const NPC_NAMES: [string, string][] = NPCS.flatMap(n => [[n.name, n.id] as [string, string], ...(n.altName ? [[n.altName.name, n.id] as [string, string]] : [])]).filter(([nm]) => nm.length >= 2);
const ROOM_NAMES: [string, string][] = ROOMS.map(r => [r.name, r.id] as [string, string]).filter(([nm]) => nm.length >= 2);
/** 文字里点到的人、地方（人名、地名原样出现） */
const namesIn = (t: string): string[] => [...NPC_NAMES, ...ROOM_NAMES].filter(([nm]) => t.includes(nm)).map(([nm]) => nm);
/** 说了什么时辰：子丑寅卯……时、夜里、午后、清晨、白日、几更 */
const hasTime = (t: string): boolean => /[子丑寅卯辰巳午未申酉戌亥]时|整日|[夜晨晚昏]|白日|白天|天亮|天黑|午后|晌午|正午|日落|日头|[一二三四五六]更/.test(t);
const roomsOf = (id: string): string[] => ROOMS.filter(r => [...(r.npcs ?? []), ...(r.objs ?? [])].some(x => (typeof x === 'string' ? x : x.id) === id)).map(r => r.id);
const isObj = (id: string): boolean => !!npc(id)?.obj;
const nameOf = (id: string): string => npc(id)?.name ?? id;
/** 文字里点到一个人、一处的说法：全名，或名字的头几个字（「回春堂药案」写成「回春堂」、「府衙照壁」写成「府衙」） */
const fuzzy = (name: string): string[] => name.length >= 5 ? [name, name.slice(0, 3), name.slice(0, 2)] : name.length >= 3 ? [name, name.slice(0, 2)] : [name];
/** 人没了的交代：不见、寻不着、不在 */
const GONE = /不见|寻不着|不在/;

/** 能走到：从扬州（序章的事从瓜洲渡口小屋）出发，出口连得上（chapter 取一，序章不开船的限制不算） */
function reachable(to: string, from = START): boolean {
  const ch = S.chapter;
  S.chapter = Math.max(ch, 1);
  try { return to === from || pathTo(from, to).length > 0; } finally { S.chapter = ch; }
}

/**
 * 尽力把一个条件拨成立（旗标、任务进度、银两、根基、物品、关系、差事、世事、师门）。时辰不管（人在不在要逐时辰试）。
 * 这是「走到这一步时，存档里多半是这样」的近似；拨不成立的条件（世界状态、伤势）原样放着。
 */
function satisfy(c?: Cond): void {
  if (!c) return;
  if (c.flag) S.flags[c.flag] = true;
  if (c.notFlag) delete S.flags[c.notFlag];
  if (c.quest) {
    const q = c.quest;
    if (q.is !== undefined) S.quests[q.id] = q.is;
    else if (q.atLeast !== undefined) S.quests[q.id] = Math.max(S.quests[q.id] ?? -1, q.atLeast);
    else if (q.below !== undefined && (S.quests[q.id] ?? -1) >= q.below) S.quests[q.id] = Math.max(0, q.below - 1);
  }
  if (c.chapter !== undefined) S.chapter = c.chapter;
  if (c.silver !== undefined) S.silver = Math.max(S.silver, c.silver);
  if (c.item) S.items[c.item.id] = Math.max(S.items[c.item.id] ?? 0, c.item.atLeast ?? 1);
  if (c.noItem) delete S.items[c.noItem];
  if (c.rel) S.rel[c.rel.npc] = c.rel.is?.[0] ?? '相谈甚欢';
  if (c.learned) S.skills[c.learned] ||= { r: 0, p: 0 };
  if (c.realm?.atLeast !== undefined) S.skills[c.realm.skill] = { r: c.realm.atLeast, p: 0 };
  if (c.attr) S.attr[c.attr.key] = Math.max(S.attr[c.attr.key], c.attr.atLeast);
  if (c.xia !== undefined) S.xia = Math.max(S.xia, c.xia);
  if (c.eming !== undefined) S.eming = Math.max(S.eming, c.eming);
  if (c.job) run([{ type: 'job', id: c.job }]);
  if (c.shenfen) S.shenfen = { id: c.shenfen, standing: 1, since: 67 };
  if (c.sect) S.sect = { school: c.sect.school, rank: c.sect.rank ?? '记名' };
  if (c.noSect) delete S.sect;
  if (c.shi) {
    const at = c.shi.at?.[0];
    if (at) (S.shi ||= {})[c.shi.id] = { at, since: absMin(S), seen: at };
  }
  if (c.any) {
    // 几条路任选其一：挨个试，第一条拨得成立的留下
    for (const a of c.any) {
      const keep = snap();
      satisfy(a);
      if (test(a)) return;
      restore(keep);
    }
  }
}

/** 一件对象里所有的效果（含剧情、开打里嵌着的），按剧情、对手的 id 缓存 */
const effCache = new Map<string, Effect[]>();
function effectsIn(obj: unknown): Effect[] {
  const out: Effect[] = [];
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (!x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    if (typeof o.type === 'string') out.push(o as unknown as Effect);
    Object.values(o).forEach(walk);
  };
  walk(obj);
  return out;
}
function nestedEffects(e: Effect): Effect[] {
  const key = e.type === 'story' ? `s:${e.id}` : e.type === 'fight' ? `f:${e.foe}` : '';
  if (!key) return [];
  if (!effCache.has(key)) effCache.set(key, effectsIn(e.type === 'story' ? storyById(e.id) : foeById((e as { foe: string }).foe)));
  return effCache.get(key)!;
}
/** 一条分支的效果里有没有 pred 的，包括开剧情、开打以后嵌着的 */
const branchHas = (dos: Effect[] | undefined, pred: (e: Effect) => boolean): boolean => (dos ?? []).some(e => pred(e) || nestedEffects(e).some(pred));

/** 谁（人，或走进某处、路遇）的哪个动作，带什么门槛，做出什么效果 */
interface Prog { npc: { id: string; name: string }; verb: string; gates: Cond[]; dos: Effect[] }
/** 哪些人的哪个动作（走进某处时、赶路路遇也算）能做成 pred 这件事：含动作本身的门槛（verbs 里带的 if）和分支的 if */
function progressors(pred: (e: Effect) => boolean): Prog[] {
  const out: Prog[] = [];
  for (const n of NPCS) for (const [verb, bs] of Object.entries(n.actions)) for (const b of bs ?? []) {
    if (!branchHas(b.do, pred)) continue;
    const gate = n.verbs.find(v => typeof v !== 'string' && v.verb === verb);
    out.push({ npc: n, verb, gates: [...(gate && typeof gate !== 'string' ? [gate.if] : []), ...(b.if ? [b.if] : [])], dos: b.do ?? [] });
  }
  for (const r of ROOMS) for (const b of r.onEnter ?? []) {
    if (branchHas(b.do, pred)) out.push({ npc: { id: r.id, name: r.name }, verb: '走进', gates: b.if ? [b.if] : [], dos: b.do ?? [] });
  }
  for (const en of ENCOUNTERS) {
    if (branchHas([{ type: 'story', id: en.story }], pred)) out.push({ npc: { id: en.id, name: '路遇' }, verb: '赶路', gates: en.if ? [en.if] : [], dos: [{ type: 'story', id: en.story }] });
  }
  return out;
}

/** 某人在某处，一天里有哪几个时刻在（每半个钟头试一次）。作息条件里不是时辰的部分（旗标、差事）按「走到这一步多半成立」算 */
function hoursAt(id: string, at: string): number[] {
  const keep = snap();
  try {
    const entry = [...room(at).npcs, ...(room(at).objs ?? [])].find(x => typeof x !== 'string' && x.id === id);
    if (entry && typeof entry !== 'string') satisfy({ ...entry.if, hour: undefined, any: undefined });
    const out: number[] = [];
    for (let m = 0; m < 1440; m += 30) { S.min = m; if (roomNpcs(at).includes(id) || roomObjs(at).includes(id)) out.push(m); }
    return out;
  } finally { restore(keep); }
}
/** 一天里这个人哪儿都不在的一个时刻（要去找他、他却不在的时候）；整日都在为空 */
function absentMin(id: string): number | null {
  const keep = S.min;
  try {
    for (let m = 0; m < 1440; m += 30) {
      S.min = m;
      if (!roomsOf(id).some(r => roomNpcs(r).includes(id) || roomObjs(r).includes(id))) return m;
    }
    return null;
  } finally { S.min = keep; }
}

/** 这个人一死，哪儿也见不到了 */
const kill = (id: string): void => { run([{ type: 'w', op: 'dead', npc: id }]); };

/** 缺门槛的字眼：见闻簿提到其中之一，才算说了「还缺什么」 */
function gateWords(c: Cond): string[] {
  const w: string[] = [];
  if (c.attr) w.push(c.attr.key);
  if (c.silver !== undefined) w.push('银', '钱', '文');
  if (c.xia !== undefined) w.push('侠义', '名声', '名头');
  if (c.eming !== undefined) w.push('恶名', '名声');
  if (c.item) w.push(itemById(c.item.id)?.name ?? c.item.id);
  if (c.realm) w.push(skillById(c.realm.skill)?.name ?? '', '火候');
  if (c.learned) w.push(skillById(c.learned)?.name ?? '');
  for (const a of c.any ?? []) w.push(...gateWords(a));
  return w.filter(Boolean);
}
const HARD_KEYS = ['attr', 'silver', 'xia', 'eming', 'item', 'realm', 'learned'] as const;
const isHard = (c: Cond): boolean => HARD_KEYS.some(k => c[k] !== undefined) || !!c.any?.some(isHard);
const hardKeysIn = (c: Cond | undefined): string[] => !c ? [] : [...HARD_KEYS.filter(k => c[k] !== undefined), ...(c.any ?? []).flatMap(hardKeysIn)];
/** 条件里写到的旗标名（含 any 里的） */
const flagNames = (c: Cond | undefined): string[] => !c ? [] : [...(c.flag ? [c.flag] : []), ...(c.notFlag ? [c.notFlag] : []), ...(c.any ?? []).flatMap(flagNames)];
/** 条件里要「剧情上的眉目」的部分：关系、世事、世界状态 */
const plotKeysIn = (c: Cond | undefined): string[] => !c ? [] : [...(['rel', 'shi', 'w'] as const).filter(k => c[k] !== undefined), ...(c.any ?? []).flatMap(plotKeysIn)];

/* ---------------------------------------------------------------------------------------------------
 * 结果收集
 * --------------------------------------------------------------------------------------------------- */

const findings: Finding[] = [];
const stat = { quest: 0, job: 0, shi: 0, questStages: 0, jobStages: 0, shiStages: 0 };

function add(kind: Finding['kind'], id: string, name: string, step: string, stepName: string, check: Check, ok: boolean, why: string, sub = ''): void {
  findings.push({ kind, id, name, step, stepName, check, sub, ok, why: ok ? '' : why, key: `${id}|${step}${sub ? '#' + sub : ''}|${check}` });
}

/* ====================================================================================================
 * 一、心事：每个没了结的阶段
 * ==================================================================================================== */

interface Owner { if?: Cond; list: Effect[] }
/** 一段剧情、一场对手里，哪些小段（选项、结局）的效果里有 pred 的 */
function ownersOf(e: Effect, pred: (e: Effect) => boolean): Owner[] {
  const root = e.type === 'story' ? storyById(e.id) : e.type === 'fight' ? foeById(e.foe) : undefined;
  const out: Owner[] = [];
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (!x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    for (const k of ['do', 'then']) {
      const l = o[k];
      if (Array.isArray(l) && (l as Effect[]).some(pred)) out.push({ if: o.if as Cond | undefined, list: l as Effect[] });
    }
    Object.values(o).forEach(walk);
  };
  walk(root);
  return out;
}

/** 搭「走到第 i 阶段」的存档：从头一步起，一步一步照推到这一步的那个动作的条件与效果走下来（前面的旗标、物件都带着） */
function stageState(q: QuestDef, i: number): void {
  fresh();
  for (let k = 0; k <= i; k++) {
    const isStage = (e: Effect): boolean => e.type === 'quest' && e.id === q.id && e.stage === k;
    const trig = progressors(isStage)[0];
    if (trig) {
      trig.gates.forEach(satisfy);
      for (const e of trig.dos) {
        if (e.type === 'story' || e.type === 'fight') {
          const owner = ownersOf(e, isStage)[0];
          if (owner) { satisfy(owner.if); run(owner.list.filter(x => x.type !== 'story' && x.type !== 'fight' && x.type !== 'quest')); }
        } else if (e.type !== 'quest') run([e]);
      }
    }
    S.quests[q.id] = k;
  }
  S.track = q.id;
}

function checkQuest(q: QuestDef): void {
  stat.quest++;
  q.stages.slice(0, -1).forEach((st, i) => {
    stat.questStages++;
    const step = `s${i + 1}`, stepName = `第 ${i + 1} 步「${st.title}」`;
    const put = (c: Check, ok: boolean, why: string, sub = ''): void => add('心事', q.id, q.name, step, stepName, c, ok, why, sub);
    stageState(q, i);
    const nav = questNav(q.id);
    if (!nav) { put('A', false, '存档搭不出这一步，导航读不到'); return; }
    const body = [nav.title, nav.hint ?? '', ...nav.memo, ...nav.notes, nav.toName ?? ''].join(' ');
    // 找谁：写了 who 的（见闻簿点了名的，才要写时辰）；没写 who 的，标题、盘算里写明「找某某」、且住在这一步要去那处的人
    const said = `${nav.title}${nav.hint ?? ''}`;
    const fallback = NPCS.filter(n => st.to && new RegExp(`[找见问寻拜跟向会]${n.name}`).test(said) && roomsOf(n.id).includes(st.to)).map(n => n.id);
    const ppl = st.who ? [st.who] : fallback;
    const named = nav.who ? [nav.who.id] : st.who ? [] : fallback;

    // A 线索
    put('A', !!nav.to || namesIn(body).length > 0, '这一步没有目的地（to）：见闻簿既没有「去」的目标，文字里也点不到人名、地名');

    // B 人在
    if (ppl.length) {
      const bad = ppl.filter(id => st.to ? hoursAt(id, st.to).length === 0 : !roomsOf(id).length);
      put('B', !bad.length, `「${bad.map(nameOf).join('、')}」一天里没有一个时辰在「${st.to ? room(st.to).name : '任何一处'}」`);
    }
    // C 走得到
    if (st.to) put('C', reachable(st.to, q.id === 'prologue' ? 'gz_home' : START), `「${room(st.to).name}」从${q.id === 'prologue' ? '瓜洲渡口小屋' : '扬州'}走不到`);

    // D 时辰：人不是整日都在，哪个时辰在，见闻簿要能知道
    const timed = named.filter(id => st.to && hoursAt(id, st.to).length > 0 && hoursAt(id, st.to).length < 48 && absentMin(id) !== null);
    if (timed.length) {
      const bad: string[] = [];
      for (const id of timed) {
        stageState(q, i);
        // 门槛拨成立（剧情上的眉目、钱、根基），只剩时辰；再把时刻拨到他不在的时候
        for (const g of st.need ?? []) satisfy({ ...g.if, hour: undefined });
        S.min = absentMin(id)!;
        const n2 = questNav(q.id)!;
        const t2 = [n2.title, n2.hint ?? '', ...n2.memo, ...n2.notes].join(' ');
        const when = whoNav(id, st.to).when;
        if (!(when && t2.includes(when)) && !hasTime(t2)) bad.push(nameOf(id));
      }
      put('D', !bad.length, `${bad.join('、')}只在一天里的几个时辰在，见闻簿没写是什么时辰`);
    }

    // E 卡住：①推进这一步的动作有门槛，见闻簿没交代；②做不成了要写明；③人没了要写明
    stageState(q, i);
    const isNext = (e: Effect): boolean => e.type === 'quest' && e.id === q.id && e.stage === i + 1;
    const adv = progressors(isNext).length ? progressors(isNext) : progressors(e => e.type === 'quest' && e.id === q.id && e.stage > i);
    if (adv.length) {
      const needFlags = new Set((st.need ?? []).flatMap(g => flagNames(g.if)));
      const needHard = new Set((st.need ?? []).flatMap(g => hardKeysIn(g.if)));
      const needPlot = (st.need ?? []).some(g => plotKeysIn(g.if).length > 0);
      const full = body + ' ' + (st.need ?? []).map(g => g.text).join(' ');
      // 一条路的门槛，见闻簿（need、标题、盘算）都交代了，就算这一步说清了；几条路只要有一条交代全。
      // 旗标只算此刻还没成立的（走到这一步时已经有了的不算）；钱、根基、物这类，只要写了门槛就算（有人够、有人不够）
      const uncovered = adv.map(p => {
        const lack: string[] = [];
        for (const g of p.gates) {
          for (const f of flagNames(g)) if (!needFlags.has(f) && !test({ flag: g.flag === f ? f : undefined, notFlag: g.notFlag === f ? f : undefined })) lack.push(`旗标 ${f}`);
          for (const k of hardKeysIn(g)) if (!needHard.has(k) && !gateWords(g).some(w => full.includes(w))) lack.push(k);
          if (plotKeysIn(g).length && !needPlot) lack.push('关系或世事上的眉目');
        }
        return { who: `${p.npc.name}的「${p.verb}」`, lack: [...new Set(lack)] };
      });
      const bad = uncovered.every(u => u.lack.length);
      put('E', !bad, `推进这一步的动作有门槛，见闻簿没交代：${uncovered.map(u => `${u.who}要${u.lack.join('、')}`).join('；')}`, '门槛');
    }
    const fail = [q.fail, st.fail].find(Boolean);
    if (fail) {
      stageState(q, i);
      satisfy(fail.if);
      const n3 = questNav(q.id)!;
      put('E', n3.state === '未竟' && !!n3.why, '做不成的条件成立了，见闻簿没写缘故', '做不成');
    }
    if (nav.who) {
      stageState(q, i);
      for (const g of st.need ?? []) satisfy({ ...g.if, hour: undefined });
      kill(nav.who.id);
      const n4 = questNav(q.id)!;
      const t4 = [n4.why, ...n4.memo].join(' ');
      put('E', !!t4 && (t4.includes(nav.who.name) || GONE.test(t4)), `${nav.who.name}不在了，见闻簿没有一句交代`, '人没了');
    }
  });
}

/* ====================================================================================================
 * 二、差事和悬赏：接下之后、每条线头
 * ==================================================================================================== */

function takeJob(j: JobDef): void {
  fresh();
  if (j.sect) S.sect = { school: j.sect, rank: '外门' };
  if (j.shenfen) S.shenfen = { id: j.shenfen, standing: 1, since: 67 };
  S.silver = 500;
  run([{ type: 'job', id: j.id }]);
}
/** 见闻簿里差事那一块（含线头）的字，和线头各行 */
function jobBlock(): { text: string; rows: { text: string; to?: string }[] } {
  const html = questbookSheetHtml();
  const seg = html.split('<h3').find(s => s.includes('class="qb-sec">差事')) ?? '';
  const rows = [...seg.matchAll(/<div class="qb-row qb-xian">([\s\S]*?)<\/div>\s*<\/div>/g)].map(m => ({ text: text(m[1]), to: m[1].match(/jgo:([a-z0-9_]+)/)?.[1] }));
  return { text: text(seg), rows };
}
/** 两段文字里，后一段多出来的句子 */
const newSentences = (before: string, after: string): string => after.split(/[。；，]/).filter(s => s && !before.includes(s)).join('。');

function checkJob(j: JobDef): void {
  stat.job++;
  const put = (step: string, stepName: string, c: Check, ok: boolean, why: string, sub = ''): void => add('差事', j.id, j.title, step, stepName, c, ok, why, sub);

  // —— 接下之后：交差的人、交差的地方
  stat.jobStages++;
  {
    const step = 'accept', stepName = '接下之后';
    takeJob(j);
    const blk = jobBlock();
    put(step, stepName, 'A', blk.text.includes(room(j.at).name) && blk.text.includes(nameOf(j.npc)), '见闻簿没写到哪里找谁交差');
    const hrs = hoursAt(j.npc, j.at);
    put(step, stepName, 'B', hrs.length > 0, `交差的「${nameOf(j.npc)}」一天里没有一个时辰在「${room(j.at).name}」`);
    put(step, stepName, 'C', reachable(j.at), `交差的「${room(j.at).name}」从扬州走不到`);
    if (hrs.length > 0 && hrs.length < 48 && absentMin(j.npc) !== null) {
      takeJob(j);
      S.min = absentMin(j.npc)!;
      const t = jobBlock().text, when = whoNav(j.npc, j.at).when;
      put(step, stepName, 'D', (!!when && t.includes(when)) || hasTime(t), `「${nameOf(j.npc)}」只在几个时辰在「${room(j.at).name}」，见闻簿没写是什么时辰`);
    }
    // 交差的人没了
    if (!isObj(j.npc)) {
      takeJob(j);
      kill(j.npc);
      put(step, stepName, 'E', GONE.test(jobBlock().text), `交差的「${nameOf(j.npc)}」没了，见闻簿没有一句交代`, '人没了');
    }
    // 交差的动作，每一条都带着「不得…」旗标（notFlag）：那个旗标在差事还挂着的时候成立了，差事就交不成了，见闻簿得说
    const done = progressors(e => e.type === 'jobDone' && e.id === j.id);
    const stuck = done.length ? [...new Set(done[0].gates.flatMap(g => (g.notFlag ? [g.notFlag] : [])))].filter(f => done.every(p => p.gates.some(g => g.notFlag === f))) : [];
    const ends = (e: Effect): boolean => (e.type === 'jobDone' || e.type === 'jobFail') && e.id === j.id;
    for (const f of stuck) {
      // 成立这个旗标的动作，不是顺手把差事了结（或砸了）的，才算「差事还挂着，却交不成」
      if (!progressors(e => e.type === 'flag' && e.flag === f && e.value !== false).some(p => !branchHas(p.dos, ends))) continue;
      takeJob(j);
      for (const p of done) p.gates.forEach(g => satisfy({ ...g, notFlag: undefined }));
      const ref = jobBlock().text;
      S.flags[f] = true;
      const fresh2 = newSentences(ref, jobBlock().text);
      put(step, stepName, 'E', /不得|交不了|没法|落空|放走|做不成|白揭|无从|不能|已经了结/.test(fresh2),
        `旗标 ${f} 一旦成立，这件差事就交不了差，见闻簿却还照旧写着去交差，没有一句说明`, `做不成_${f}`);
    }

    // 没有线头的差事：交差之前要先做成的事（交差的动作要的旗标），在哪里、找谁做，见闻簿要有一句
    if (!(j.xian ?? []).length) {
      const need = [...new Set(done.flatMap(p => p.gates.flatMap(g => (g.flag ? [g.flag] : []))))];
      for (const f of need) {
        const setters = progressors(e => e.type === 'flag' && e.flag === f && e.value !== false).filter(p => p.npc.id !== j.npc || !branchHas(p.dos, ends));
        if (!setters.length) continue;
        takeJob(j);
        const t = jobBlock().text;
        const tokens = setters.flatMap(p => [...fuzzy(p.npc.name), ...roomsOf(p.npc.id).flatMap(r => fuzzy(room(r).name))]).filter(x => x.length >= 2);
        put(`work_${f}`, `交差前要先做成的事（旗标 ${f}）`, 'A', tokens.some(x => t.includes(x)), `交差之前要先做成「${f}」（${setters.map(p => `${p.npc.name}的「${p.verb}」`).join('、')}），见闻簿没写去哪里、找谁办`);
      }
    }
  }

  // —— 每一条线头
  (j.xian ?? []).forEach((x, k) => {
    stat.jobStages++;
    const step = `x${k + 1}`, stepName = `线头 ${k + 1}「${x.text.slice(0, 14)}…」`;
    const put2 = (c: Check, ok: boolean, why: string, sub = ''): void => put(step, stepName, c, ok, why, sub);
    takeJob(j);
    satisfy(x.if);
    const row = jobBlock().rows.find(r => r.text.includes(x.text));
    put2('A', !!row?.to, `线头「${x.text.slice(0, 20)}」在见闻簿里没显示出来（找不到${nameOf(x.npc)}的去处，这一行被丢掉了）`);
    const to = row?.to ?? x.at;
    if (!to) return;
    const hrs = hoursAt(x.npc, to);
    put2('B', hrs.length > 0, `「${nameOf(x.npc)}」一天里没有一个时辰在「${room(to).name}」`);
    put2('C', reachable(to), `「${room(to).name}」从扬州走不到`);
    if (hrs.length > 0 && hrs.length < 48 && absentMin(x.npc) !== null) {
      takeJob(j); satisfy(x.if);
      S.min = absentMin(x.npc)!;
      const r2 = jobBlock().rows.find(r => r.text.includes(x.text));
      put2('D', !!r2 && hasTime(r2.text), `「${nameOf(x.npc)}」只在几个时辰在「${room(to).name}」，见闻簿没写是什么时辰`);
    }
    // E：这一行的人没了；去办这一步的动作有根基、钱、物上的门槛，见闻簿没说
    if (!isObj(x.npc)) {
      takeJob(j); satisfy(x.if);
      kill(x.npc);
      const r3 = jobBlock().rows.find(r => r.text.includes(x.text));
      put2('E', !!r3 && GONE.test(r3.text), `「${nameOf(x.npc)}」没了，这一行没有交代`, '人没了');
    }
    // 这一行写到哪一步为止：notFlag 的旗标成立，这一行就收了；让它成立的动作里，有没有门槛
    const f = x.if?.notFlag;
    if (f) {
      takeJob(j); satisfy(x.if);
      const progs = progressors(e => e.type === 'flag' && e.flag === f && e.value !== false);
      const gated = progs.map(p => p.gates.filter(isHard)).filter(g => g.length);
      if (progs.length && gated.length >= progs.length) {
        const words = gated.flat().flatMap(gateWords), t = jobBlock().text;
        put2('E', words.some(w => t.includes(w)),
          `推进这一步（旗标 ${f}）的动作有门槛：${[...new Set(gated.flat().flatMap(g => hardKeysIn(g)))].join('、')}，见闻簿没交代缺什么、怎样才够`, '门槛');
      }
    }
  });
}

/* ====================================================================================================
 * 三、世事：玩家能插手的步
 * ==================================================================================================== */

/** 这一步里，哪些动作能把这件世事往别处推（开打、开剧情以后推的也算） */
function pushersAt(d: ShiDef, step: string): Prog[] {
  const pushes = (e: Effect): boolean => e.type === 'shi' && e.id === d.id && !!e.to;
  return progressors(pushes).filter(p => p.gates.every(g => {
    if (!g.shi || g.shi.id !== d.id) return true;
    if (g.shi.at && !g.shi.at.includes(step)) return false;
    if (g.shi.not?.includes(step)) return false;
    return true;
  }));
}

function checkShi(d: ShiDef): void {
  stat.shi++;
  for (const [stepId, step] of Object.entries(d.steps)) {
    if (!step.next) continue; // 结局：没什么好插手的
    const pushers = pushersAt(d, stepId);
    if (!pushers.length) continue;
    stat.shiStages++;
    const kindStep = `st_${stepId}`, stepName = `「${stepId}」${step.now.slice(0, 16)}…`;
    const put = (c: Check, ok: boolean, why: string): void => add('世事', d.id, d.name, kindStep, stepName, c, ok, why);
    const setup = (): void => { fresh(); (S.shi ||= {})[d.id] = { at: stepId, since: absMin(S), seen: stepId }; };
    setup();
    const now = knownShi().find(r => r.id === d.id)?.now ?? step.now;
    const people = [...new Set(pushers.map(p => p.npc.id))];
    // 世事是听来的消息，不是任务（维护者 10-10）：写地方，不写找谁。事情所在的地方：这一步发生的地点、整件事出在哪一处、
    // 能插手的人常在的几处（事就出在他们那里）。见闻簿那一行（now，加上传开的话 news）里点到其中一处地名就算
    const rooms = [...new Set([...(step.where ? [step.where] : []), ...(d.place ? [d.place] : []), ...people.flatMap(roomsOf)])];
    const told = [now, step.news].filter(Boolean).join(' ');
    add('世事', d.id, d.name, kindStep, stepName, 'A', rooms.flatMap(r => fuzzy(room(r).name)).some(t => told.includes(t)),
      `见闻簿上这一步只写「${step.now.slice(0, 30)}…」，没点出事情在哪儿闹（${rooms.map(r => room(r).name).slice(0, 4).join('、')}）`, '缺地名');

    // C、D：能推动的人在哪处、什么时刻真在（人在不在这一项对世事不查：世事不指路，找人是玩家自己的事）
    const place: { id: string; at: string; hrs: number[] }[] = [];
    for (const p of pushers) {
      for (const r of roomsOf(p.npc.id)) {
        setup();
        p.gates.forEach(g => satisfy({ ...g, shi: undefined }));
        const hrs = hoursAt(p.npc.id, r);
        if (hrs.length) place.push({ id: p.npc.id, at: r, hrs });
      }
    }
    if (place.length) {
      const ok = place.filter(p => reachable(p.at));
      put('C', ok.length > 0, `能插手的人所在的地方（${[...new Set(place.map(p => room(p.at).name))].join('、')}）从扬州都走不到`);
      // D：几个时辰在，见闻簿或传闻里能知道
      // 白天当差的（卯时到戌时、辰时到酉时）不算难找；一天里不到八个钟头在的（夜里才出来、只在饭点），才要写什么时辰
      // 只在见闻簿已经点出了那个地方的时候才查：还没说在哪的（只有一张告示、一句风声），谈不上「去了才发现人不在」
      const best = ok.length ? ok : place;
      if (best.some(p => fuzzy(room(p.at).name).some(t => now.includes(t))) && best.every(p => p.hrs.length < 16)) {
        const words = [now, step.news, step.news2, step.news3, ...Object.values(step.self ?? {})].filter(Boolean).join(' ');
        put('D', hasTime(words), '能插手的人只在几个时辰在，见闻簿和传闻里都没写是什么时辰');
      }
    }
  }
}

/* ====================================================================================================
 * 跑一遍，生成用例
 * ==================================================================================================== */

describe('线索不断：每一件事的每一阶段，见闻簿都说清下一步（docs/gugan.md S4）', () => {
  for (const q of QUESTS) checkQuest(q);
  for (const j of JOBS) checkJob(j);
  for (const d of SHI) checkShi(d);

  if ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env?.XIANSUO_DUMP) {
    console.log('XIANSUO_JSON' + JSON.stringify({ stat, findings }));
  }

  for (const f of findings) {
    const name = `${f.kind}「${f.name}」${f.stepName} · ${f.check}（${CHECK_NAME[f.check]}${f.sub ? '：' + f.sub : ''}）`;
    const body = (): void => { expect(f.ok, `${f.kind}「${f.name}」${f.stepName}：${f.why}（登记键 ${f.key}）`).toBe(true); };
    if (f.key in KNOWN_BROKEN) it.fails(`已知断线：${name}：${KNOWN_BROKEN[f.key]}`, body);
    else it(name, body);
  }

  it('已知断线清单里没有过期的键（事、阶段改名或删了的，从清单里删）', () => {
    const have = new Set(findings.map(f => f.key));
    expect(Object.keys(KNOWN_BROKEN).filter(k => !have.has(k))).toEqual([]);
  });

  it('查到了东西：心事、差事、世事都有阶段被查', () => {
    expect(stat.questStages).toBeGreaterThan(20);
    expect(stat.jobStages).toBeGreaterThan(20);
    expect(stat.shiStages).toBeGreaterThan(10);
    expect(FOES.length).toBeGreaterThan(0);
    expect(STORIES.length).toBeGreaterThan(0);
  });
});
