/**
 * 内容数据里的条件（Cond）与效果（Effect）在这里统一解释执行。
 * 开打和开剧情这两种需要界面配合的效果不在这里处理，而是记在 Outcome 里交给调用方。
 */
import { S, fullName, pushFeed } from '../core/state';
import { emit } from '../core/bus';
import { advanceMin, dayNo } from '../core/time';
import { liang } from '../core/util';
import { itemById, jobById, questById, skillById } from '../content';
import { REALMS, SECT_RANKS } from '../content/skills';
import type { Branch, Cond, Effect } from '../content/types';
import { gainProf, learnSkill } from './growth';
import { barredFrom, canLearn, leaveWord, pastSectsOf } from './shicheng';
import { growAttr } from './gengu';
import { houtianOf, syncGear } from './ren';
import { keyOfSlot } from './zhuangbei';
import { SHENFEN, gongxianOf, jobGongxian, jobOpen, jobPay } from './shenfen';
import { learnShi, moveShi } from './shishi';
import { hearsay, inner } from './chuanwen';
import { addLilian, questDone } from './lilian';
import { ZONE_NAME, type Zone } from './duel';
import { markLight } from './shang';
import { runWorld, testWorld } from './shijie';

/** 三处伤，最重的先治；一样重时先内息，再手、足（和静修养伤同一个次序，engine/lilian.ts） */
const ZONES: Zone[] = ['inner', 'hand', 'foot'];
const isWounded = (): boolean => ZONES.some(z => S.wounds[z] > 0);

/** 治伤：从最重的那处起一级一级减，一共减 levels 级（不写为全治）；zones 只治这几处。返回每处治好了几级 */
function cureWounds(levels = Infinity, zones: Zone[] = ZONES): Partial<Record<Zone, number>> {
  const got: Partial<Record<Zone, number>> = {};
  for (let left = levels; left > 0; left--) {
    const z = zones.slice().sort((a, b) => S.wounds[b] - S.wounds[a])[0];
    if (S.wounds[z] <= 0) break;
    S.wounds[z]--;
    got[z] = (got[z] ?? 0) + 1;
  }
  // 治到一级的，开始算轻伤，过一日自己好（engine/shang.ts）
  markLight(S);
  return got;
}

export function test(c?: Cond): boolean {
  if (!c) return true;
  if (c.flag && !S.flags[c.flag]) return false;
  if (c.notFlag && S.flags[c.notFlag]) return false;
  if (c.quest) {
    const v = S.quests[c.quest.id] ?? -1;
    if (c.quest.is !== undefined && v !== c.quest.is) return false;
    if (c.quest.atLeast !== undefined && v < c.quest.atLeast) return false;
    if (c.quest.below !== undefined && v >= c.quest.below) return false;
  }
  if (c.chapter !== undefined && S.chapter !== c.chapter) return false;
  if (c.silver !== undefined && S.silver < c.silver) return false;
  if (c.item && (S.items[c.item.id] || 0) < (c.item.atLeast ?? 1)) return false;
  if (c.noItem && (S.items[c.noItem] || 0) > 0) return false;
  if (c.wounded !== undefined && isWounded() !== c.wounded) return false;
  if (c.tired !== undefined && (S.hp < S.hpMax || S.mp < S.mpMax) !== c.tired) return false;
  if (c.rel) {
    const r = S.rel[c.rel.npc] ?? '素不相识';
    if (c.rel.is && !c.rel.is.includes(r)) return false;
    if (c.rel.not && c.rel.not.includes(r)) return false;
  }
  if (c.learned && !S.skills[c.learned]) return false;
  if (c.notLearned && S.skills[c.notLearned]) return false;
  if (c.realm) {
    const r = S.skills[c.realm.skill]?.r ?? -1;
    if (c.realm.atLeast !== undefined && r < c.realm.atLeast) return false;
    if (c.realm.below !== undefined && r >= c.realm.below) return false;
  }
  // 根基的条件看后天：武功练深了，眼力、胆气跟着长（engine/ren.ts）
  if (c.attr && houtianOf(S)[c.attr.key] < c.attr.atLeast) return false;
  if (c.xia !== undefined && S.xia < c.xia) return false;
  if (c.eming !== undefined && S.eming < c.eming) return false;
  // 约：今天是约期，约还没了结（engine/shiguang.ts）
  if (c.yue !== undefined && !S.yue.some(y => y.id === c.yue && y.due === dayNo(S))) return false;
  if (c.yueAhead !== undefined && !S.yue.some(y => y.id === c.yueAhead && y.due > dayNo(S))) return false;
  // 身份与差事（engine/shenfen.ts）
  if (c.shenfen !== undefined && !(S.shenfen.id === c.shenfen && S.shenfen.standing >= 1)) return false;
  if (c.job !== undefined && S.job?.id !== c.job) return false;
  if (c.jobOpen !== undefined && !jobOpen(S, c.jobOpen)) return false;
  // 一日一回的营生（效果 today）
  if (c.doneToday !== undefined && S.dayLog?.[c.doneToday] !== dayNo(S)) return false;
  if (c.notDoneToday !== undefined && S.dayLog?.[c.notDoneToday] === dayNo(S)) return false;
  if (c.gongxian !== undefined && gongxianOf(S) < c.gongxian) return false;
  // 世事（engine/shishi.ts）：眼下在哪一步；还没起头的，哪一步都不在
  if (c.shi) {
    const at = S.shi?.[c.shi.id]?.at;
    if (c.shi.at && !(at !== undefined && c.shi.at.includes(at))) return false;
    if (c.shi.not && at !== undefined && c.shi.not.includes(at)) return false;
  }
  // 世界状态（engine/shijie.ts）：码头归谁、治安、物价、势力、人的处境
  if (c.w && !testWorld(c.w)) return false;
  if (c.hour) {
    const h = Math.floor(S.min / 60);
    const { from, to } = c.hour;
    const inside = from <= to ? h >= from && h < to : h >= from || h < to;
    if (!inside) return false;
  }
  if (c.canLearn) {
    const d = skillById(c.canLearn);
    if (!d || !canLearn(S, d).ok) return false;
  }
  if (c.notSect !== undefined && S.sect?.school === c.notSect) return false;
  if (c.sect && (S.sect?.school !== c.sect.school || (c.sect.rank && SECT_RANKS.indexOf(S.sect.rank) < SECT_RANKS.indexOf(c.sect.rank)))) return false;
  if (c.noSect && S.sect) return false;
  if (c.pastSect && !pastSectsOf(S).some(x => x.school === c.pastSect!.school && (!c.pastSect!.how || x.how === c.pastSect!.how))) return false;
  if (c.any && !c.any.some(x => test(x))) return false;
  return true;
}

export const pickBranch = (bs: Branch[] | undefined): Branch | undefined => bs?.find(b => test(b.if));

export interface Outcome {
  fight?: string;
  story?: string;
  moved?: boolean;
  /** 供文字里的占位符引用，例如 {news} */
  vars: Record<string, string>;
  /** 产生的突破提示，结算页会展示 */
  breaks: string[];
}

export const newOutcome = (): Outcome => ({ vars: {}, breaks: [] });

/** 说得出口的条件：钱、根基、侠义、恶名、武功火候。够不着时把差什么摆出来，玩家知道还有这条路 */
const MEASURED = new Set(['silver', 'attr', 'xia', 'eming', 'realm']);

/** 一个说得出口的条件差什么；够得着返回空串 */
function lackOne(c: Cond): string {
  const out: string[] = [];
  if (c.silver !== undefined && S.silver < c.silver) out.push(`要 ${c.silver} 文（身上 ${S.silver} 文）`);
  if (c.attr && houtianOf(S)[c.attr.key] < c.attr.atLeast) out.push(`${c.attr.key}要 ${c.attr.atLeast}（你 ${houtianOf(S)[c.attr.key]}）`);
  if (c.xia !== undefined && S.xia < c.xia) out.push(`侠义要 ${c.xia}（你 ${S.xia}）`);
  if (c.eming !== undefined && S.eming < c.eming) out.push(`恶名要 ${c.eming}（你 ${S.eming}）`);
  if (c.realm?.atLeast !== undefined && (S.skills[c.realm.skill]?.r ?? -1) < c.realm.atLeast)
    out.push(`「${skillById(c.realm.skill)?.name ?? c.realm.skill}」要练到${REALMS[c.realm.atLeast] ?? ''}`);
  return out.join('，');
}

/**
 * 选项够不着时差什么（docs/huojianghu.md：够不着的路也让玩家看见）。
 * 只管说得出口的条件（钱、根基、侠义、恶名、火候）；剧情上的条件（旗标、任务、世事、人情……）不成立的，返回 null，照旧藏着，不剧透。
 * 条件成立返回 null。
 */
export function lackOf(c: Cond | undefined): string | null {
  if (!c || test(c)) return null;
  const plot: Cond = {}, measured: Cond = {};
  for (const [k, v] of Object.entries(c)) {
    if (v === undefined || k === 'any') continue;
    (MEASURED.has(k) ? measured : plot)[k as keyof Cond] = v as never;
  }
  if (!test(plot)) return null;
  const parts: string[] = [];
  const own = lackOne(measured);
  if (own) parts.push(own);
  if (c.any && !c.any.some(x => test(x))) {
    // 几条路走得通一条就行：都是说得出口的条件才摆出来
    if (!c.any.every(x => Object.keys(x).every(k => MEASURED.has(k)))) return null;
    parts.push(c.any.map(lackOne).filter(Boolean).join('；或者'));
  }
  return parts.join('，') || null;
}

/**
 * 被东家辞退（地位降到零、恶名太盛）：做回游侠，手上的差事作废；
 * 身份连着门派的，一并逐出门墙；身份的信物收回（engine/shenfen.ts 的 sect、badge）
 */
/** 门派贡献加减，不低于零 */
function addGongxian(school: string, d: number): void {
  const g = (S.gongxian ??= {});
  g[school] = Math.max(0, (g[school] ?? 0) + d);
}

function dismiss(why: string): void {
  const sf = SHENFEN[S.shenfen.id];
  if (!sf) return;
  const lines = [`${why}不再是${sf.name}，又做回了游侠。`];
  if (sf.badge && S.items[sf.badge]) { S.items[sf.badge] = 0; lines.push(`${itemById(sf.badge)?.name ?? '信物'}收了回去。`); }
  if (sf.sect && S.sect?.school === sf.sect) { (S.pastSects ??= []).push({ school: sf.sect, how: '逐出' }); delete S.sect; lines.push(`你被逐出了${sf.sect}。`); }
  pushFeed('江湖', lines.join(''));
  S.shenfen = { id: 'youxia', standing: 1, since: dayNo(S) };
  S.job = null;
}

/** 协议结算期间，世事等模块引出的 run 要作为后续链结算，不能绕过深度和条数限制。 */
export interface RunHooks {
  chain: (effects: Effect[] | undefined, out: Outcome) => Outcome;
  learn: (e: Extract<Effect, { type: 'learn' }>, out: Outcome) => void;
  notify: (text: string) => void;
}
let runHooks: RunHooks | undefined;
export function withRunHooks<T>(hooks: RunHooks, fn: () => T): T {
  const old = runHooks;
  runHooks = hooks;
  try { return fn(); } finally { runHooks = old; }
}
const notify = (text: string): void => { if (runHooks) runHooks.notify(text); else emit('toast', text); };

/** 旧规则模块的兼容入口；界面通过行动协议提出请求。 */
export function run(effects: Effect[] | undefined, out: Outcome = newOutcome()): Outcome {
  return runHooks ? runHooks.chain(effects, out) : runStep(effects, out);
}

/** 只供行动结算和旧规则入口内部执行；不作界面接口。 */
export function runStep(effects: Effect[] | undefined, out: Outcome = newOutcome()): Outcome {
  for (const e of effects || []) {
    switch (e.type) {
      case 'flag': S.flags[e.flag] = e.value ?? true; break;
      // 只升不降：开启任务的效果常写在交谈或进门时，重复触发不能把已有进度打回去
      case 'quest': {
        const was = S.quests[e.id] ?? -1;
        S.quests[e.id] = Math.max(was, e.stage);
        // 推到最后一个阶段，这件事就了结了：给历练
        const q = questById(e.id);
        if (q && e.stage === q.stages.length - 1 && was < e.stage) questDone(S, q);
        break;
      }
      case 'track': S.track = e.id; break;
      case 'shi': if (e.to) moveShi(e.id, e.to); else learnShi(e.id); break;
      case 'feed': pushFeed(e.tag, e.text); break;
      case 'feedReset': S.feed = []; break;
      case 'toast': notify(e.text); break;
      case 'silver': S.silver = Math.max(0, S.silver + e.delta); break;
      case 'item':
      {
        // max 只管加：手里本来就多于 max 的，不收走
        const cur = S.items[e.id] || 0;
        const to = cur + e.delta;
        S.items[e.id] = Math.max(0, e.max !== undefined && e.delta > 0 ? Math.max(cur, Math.min(e.max, to)) : to);
      }
        // 兵器当了、卖了，手里也就没了
        if (!S.items[e.id] && S.gear?.weapon === e.id) delete S.gear.weapon;
        break;
      case 'wear': {
        const it = itemById(e.id);
        if (it?.equip && (S.items[e.id] ?? 0) > 0) { S.gear[keyOfSlot(it.equip.slot)] = e.id; syncGear(S); }
        break;
      }
      case 'rel': {
        const cur = S.rel[e.npc] ?? '素不相识';
        if (!e.from || e.from.includes(cur)) S.rel[e.npc] = e.value;
        if (e.note) (S.relNote ??= {})[e.npc] = e.note;
        break;
      }
      case 'prof': out.breaks.push(...gainProf(e.skill, e.amount)); break;
      case 'lilian': if (e.amount < 0) S.lilian += e.amount; else addLilian(S, e.amount); break;
      case 'learn':
        if (runHooks) runHooks.learn(e, out);
        else out.breaks.push(...learnSkill(e.skill, e.realm ?? 0, e.prof ?? 0, e.lilian));
        break;
      // 拜师或升地位，只升不降；身在别派时无效（要先离开）。叛出、被逐出过这一派的，拜不回去（docs/menpai.md 第七节）
      case 'sect': {
        if (S.sect) {
          if (S.sect.school === e.school && SECT_RANKS.indexOf(e.rank) > SECT_RANKS.indexOf(S.sect.rank)) S.sect.rank = e.rank;
          break;
        }
        const barred = barredFrom(S, e.school);
        if (barred) { pushFeed('江湖', `你${leaveWord(barred)}过${e.school}，${e.school}的门不会再为你打开。`); break; }
        S.sect = { school: e.school, rank: e.rank };
        break;
      }
      // 离开师门：出师、叛门、逐出都记进来历（engine/shicheng.ts 的 pastSectsOf）
      case 'leaveSect':
        if (S.sect) {
          const school = S.sect.school;
          (S.pastSects ??= []).push({ school, how: e.how });
          delete S.sect;
          // 辞别：贡献清零；叛门：江湖上的人看你是叛徒，恶名 +3（docs/paiban.md E05）
          if (e.how === '辞别' && S.gongxian) delete S.gongxian[school];
          if (e.how === '叛门') S.eming += 3;
          // 身份连着这个门派的（捕快之于六扇门），离了门派，身份也就没了
          if (SHENFEN[S.shenfen.id]?.sect === school) { pushFeed('江湖', `你离了${school}，不再是${SHENFEN[S.shenfen.id].name}。`); S.shenfen = { id: 'youxia', standing: 1, since: dayNo(S) }; S.job = null; }
        }
        break;
      case 'attr': growAttr(S, e.key, e.delta, S.chapter === 0 ? '少年往事' : '江湖经历'); break;
      case 'xia': S.xia += e.delta; break;
      case 'gongxian': {
        // 协议算隐含学艺代价时带上门派，避免先扣后学时扣错派
        const school = 'school' in e && typeof e.school === 'string' ? e.school : S.sect?.school;
        if (school) addGongxian(school, e.delta);
        break;
      }
      case 'eming': {
        S.eming = Math.max(0, S.eming + e.delta);
        // 软肋：恶名到了这个身份容不下的地步，被辞退（六扇门收回腰牌）
        const cap = SHENFEN[S.shenfen.id]?.maxEming;
        if (cap !== undefined && S.eming >= cap) dismiss('恶名太盛，');
        break;
      }
      case 'title': S.title = e.value; break;
      case 'chapter': S.chapter = e.value; break;
      case 'move': S.loc = e.to; S.sel = null; S.reply = null; out.moved = true; break;
      case 'time':
        if (e.add) advanceMin(S, e.add);
        if (e.set !== undefined) { let d = e.set - S.min; if (d < 0) d += 1440; advanceMin(S, d); }
        if (e.until !== undefined && e.until > S.min) advanceMin(S, e.until - S.min);
        break;
      case 'weather': S.weather = e.value; break;
      case 'heal':
        // 好好歇一夜，气血回满；轻伤过一日自己好，重伤要看伤、服药（engine/shang.ts），歇一夜治不了
        if (e.hp === 'full') S.hp = S.hpMax;
        else if (typeof e.hp === 'number') S.hp = Math.min(S.hpMax, S.hp + e.hp);
        if (e.mp === 'full') S.mp = S.mpMax; else if (typeof e.mp === 'number') S.mp = Math.min(S.mpMax, S.mp + e.mp);
        if (e.hpAtLeast) S.hp = Math.max(S.hp, Math.round(S.hpMax * e.hpAtLeast));
        // 按上限的几成回（金疮药回三成，和战斗里服药一样）
        if (e.hpFrac) S.hp = Math.min(S.hpMax, S.hp + Math.round(S.hpMax * e.hpFrac));
        if (e.mpFrac) S.mp = Math.min(S.mpMax, S.mp + Math.round(S.mpMax * e.mpFrac));
        break;
      case 'cure': {
        const got = cureWounds(e.levels, e.zones);
        const done = ZONES.filter(z => got[z]).map(z => `${ZONE_NAME[z]}伤${S.wounds[z] ? `轻了${liang(got[z]!)}级，还剩${liang(S.wounds[z])}级` : '好了'}`);
        if (done.length) pushFeed('收获', `治伤：${done.join('；')}。${isWounded() ? '' : '身上的伤都好了。'}`);
        break;
      }
      case 'wound':
        // 剧情里添的伤：封顶三级；一级的算轻伤，从此刻起过一日自己好（engine/shang.ts）。写了 if 的，条件成立才落伤
        if (!test(e.if)) break;
      {
        const was = S.wounds[e.zone];
        S.wounds[e.zone] = Math.min(3, was + (e.level ?? 1));
        markLight(S);
        const where = { hand: '手上', foot: '脚上', inner: '胸口' }[e.zone];
        if (S.wounds[e.zone] > was) pushFeed('江湖', S.wounds[e.zone] === 1 ? `${where}添了一处伤，轻的过一日自己会好。` : `${where}的伤又重了一层，得找大夫看看。`);
      }
        break;
      // 江湖上的话：这一带传开的、你还不知道的、最耸动的一条（engine/chuanwen.ts 的 hearsay），不再随手抽
      case 'news': out.vars.news = inner(hearsay() ?? '这几日太平得很，没听说什么。'); break;
      case 'away':
        (S.away ||= {})[e.npc] = dayNo(S) * 1440 + S.min + e.hours * 60;
        for (const [k, t] of Object.entries(S.away)) if (t <= dayNo(S) * 1440 + S.min) delete S.away[k];
        break;
      case 'yue':
        S.yue = S.yue.filter(y => y.id !== e.id).concat({ id: e.id, npc: e.npc, at: e.at, due: dayNo(S) + e.inDays, text: e.text, miss: e.miss });
        pushFeed('江湖', `定了约：${e.text}`);
        break;
      case 'yueDone': S.yue = S.yue.filter(y => y.id !== e.id); break;
      case 'xinmo':
        // 心魔：最多三层；化解到零就清掉缘由（engine/shiguang.ts 的 addXinmo 同一套规矩）
        S.xinmo.n = Math.max(0, Math.min(3, S.xinmo.n + e.delta));
        if (e.delta > 0 && e.why) S.xinmo.why = e.why;
        if (S.xinmo.n <= 0) S.xinmo = { n: 0, why: '' };
        break;
      case 'shenfen':
        if (S.shenfen.id !== e.id) {
          S.shenfen = { id: e.id, standing: 1, since: dayNo(S) };
          if (e.id !== 'youxia' && e.id !== 'yumin') pushFeed('江湖', `你做了${SHENFEN[e.id]?.name ?? e.id}。`);
        }
        break;
      case 'standing': {
        const sf = SHENFEN[S.shenfen.id];
        // 游侠、渔家没有东家，谈不上辞退，地位不降到零
        const free = S.shenfen.id === 'youxia' || S.shenfen.id === 'yumin';
        S.shenfen.standing = Math.max(free ? 1 : 0, Math.min(3, S.shenfen.standing + e.delta));
        if (S.shenfen.standing === 0 && sf) dismiss('你被辞退了，');
        break;
      }
      case 'today': {
        const log = (S.dayLog ??= {});
        for (const k of Object.keys(log)) if (log[k] !== dayNo(S)) delete log[k];
        log[e.id] = dayNo(S);
        break;
      }
      case 'job': {
        const j = jobById(e.id);
        if (!j || S.job) break;
        S.job = { id: j.id, due: dayNo(S) + j.days };
        // 差事的义务就是一个约：过了约期没交差，就算误事（engine/shiguang.ts 的 checkYue）
        S.yue = S.yue.filter(y => y.id !== 'job_' + j.id).concat({ id: 'job_' + j.id, npc: j.npc, at: j.at, due: S.job.due, text: j.title, miss: [{ type: 'jobFail', id: j.id }] });
        pushFeed('江湖', `接下差事：${j.title}。`);
        break;
      }
      case 'jobDone': {
        const j = jobById(e.id);
        if (!j || S.job?.id !== e.id) break;
        S.job = null;
        S.jobLog[j.id] = dayNo(S);
        S.yue = S.yue.filter(y => y.id !== 'job_' + j.id);
        delete S.flags.jobWarn;
        // 师门差事给门派贡献，不给钱；身份的差事给钱
        if (j.sect) {
          const g = jobGongxian(j);
          addGongxian(j.sect, g);
          pushFeed('收获', `交了差：${j.title}，${j.sect}贡献 +${g}。`);
          notify(`交差 · ${j.sect}贡献 +${g}`);
        } else {
          const pay = jobPay(j);
          S.silver += pay;
          pushFeed('收获', `交了差：${j.title}，得银 ${pay} 文。`);
          notify(`交差 · 银两 +${pay} 文`);
        }
        break;
      }
      case 'jobFail': {
        const j = jobById(e.id);
        if (S.job?.id === e.id) S.job = null;
        S.jobLog[e.id] = dayNo(S);
        S.yue = S.yue.filter(y => y.id !== 'job_' + e.id);
        pushFeed('江湖', `差事办砸了：${j?.title ?? e.id}。`);
        // 师门差事误了，扣贡献（这件差事本该给的那么多）；身份的差事误了，降地位
        if (j?.sect) addGongxian(j.sect, -jobGongxian(j));
        else if (S.shenfen.standing <= 1 && S.shenfen.id !== 'youxia' && S.shenfen.id !== 'yumin' && !S.flags.jobWarn) {
          // 新进的头一回误事只记一过，不辞退（负责人 10-09：丢一趟镖就被开除、还要赔钱，不讲理）；再误一回才降到零
          S.flags.jobWarn = true;
          pushFeed('江湖', '东家记了你一过：再误一回，就不用你了。');
        } else run([{ type: 'standing', delta: -1 }]);
        break;
      }
      // 世界状态（engine/shijie.ts）：换主人、势力和地方的数、人的处境、地方的痕迹
      case 'w': runWorld(e); break;
      case 'fight': out.fight = e.foe; break;
      case 'story': out.story = e.id; break;
    }
  }
  return out;
}

/** 文字里所有内容都能用的占位符 */
export function textVars(): Record<string, string> {
  return { given: S.name, name: fullName(), story: S.story || '话说运河渡口，有一位少年侠客……' };
}
