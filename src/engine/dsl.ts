/**
 * 内容数据里的条件（Cond）与效果（Effect）在这里统一解释执行。
 * 开打和开剧情这两种需要界面配合的效果不在这里处理，而是记在 Outcome 里交给调用方。
 */
import { S, fullName, pushFeed } from '../core/state';
import { emit } from '../core/bus';
import { advanceMin, dayNo } from '../core/time';
import { liang, pick } from '../core/util';
import { NEWS, jobById, questById, skillById } from '../content';
import { SECT_RANKS } from '../content/skills';
import type { Branch, Cond, Effect } from '../content/types';
import { gainProf, learnSkill } from './growth';
import { canLearn } from './shicheng';
import { growAttr } from './gengu';
import { houtianOf } from './ren';
import { SHENFEN, jobOpen, jobPay } from './shenfen';
import { addLilian, questDone } from './lilian';
import { ZONE_NAME, type Zone } from './duel';

/** 三处伤，最重的先治；一样重时先内息，再手、足（和静修养伤同一个次序，engine/lilian.ts） */
const ZONES: Zone[] = ['inner', 'hand', 'foot'];
const isWounded = (): boolean => ZONES.some(z => S.wounds[z] > 0);

/** 治伤：从最重的那处起一级一级减，一共减 levels 级（不写为全治）。返回每处治好了几级 */
function cureWounds(levels = Infinity): Partial<Record<Zone, number>> {
  const got: Partial<Record<Zone, number>> = {};
  for (let left = levels; left > 0; left--) {
    const z = ZONES.slice().sort((a, b) => S.wounds[b] - S.wounds[a])[0];
    if (S.wounds[z] <= 0) break;
    S.wounds[z]--;
    got[z] = (got[z] ?? 0) + 1;
  }
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
  // 身份与差事（engine/shenfen.ts）
  if (c.shenfen !== undefined && !(S.shenfen.id === c.shenfen && S.shenfen.standing >= 1)) return false;
  if (c.job !== undefined && S.job?.id !== c.job) return false;
  if (c.jobOpen !== undefined && !jobOpen(S, c.jobOpen)) return false;
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
  if (c.sect && (S.sect?.school !== c.sect.school || (c.sect.rank && SECT_RANKS.indexOf(S.sect.rank) < SECT_RANKS.indexOf(c.sect.rank)))) return false;
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

export function run(effects: Effect[] | undefined, out: Outcome = newOutcome()): Outcome {
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
      case 'feed': pushFeed(e.tag, e.text); break;
      case 'feedReset': S.feed = []; break;
      case 'toast': emit('toast', e.text); break;
      case 'silver': S.silver = Math.max(0, S.silver + e.delta); break;
      case 'item':
        S.items[e.id] = Math.max(0, (S.items[e.id] || 0) + e.delta);
        // 兵器当了、卖了，手里也就没了
        if (!S.items[e.id] && S.gear?.weapon === e.id) delete S.gear.weapon;
        break;
      case 'rel': {
        const cur = S.rel[e.npc] ?? '素不相识';
        if (!e.from || e.from.includes(cur)) S.rel[e.npc] = e.value;
        if (e.note) (S.relNote ??= {})[e.npc] = e.note;
        break;
      }
      case 'prof': out.breaks.push(...gainProf(e.skill, e.amount)); break;
      case 'lilian': addLilian(S, e.amount); break;
      case 'learn': out.breaks.push(...learnSkill(e.skill, e.realm ?? 0, e.prof ?? 0)); break;
      // 拜师或升地位，只升不降；身在别派时无效（要先出师或叛门）
      case 'sect':
        if (!S.sect) S.sect = { school: e.school, rank: e.rank };
        else if (S.sect.school === e.school && SECT_RANKS.indexOf(e.rank) > SECT_RANKS.indexOf(S.sect.rank)) S.sect.rank = e.rank;
        break;
      case 'leaveSect':
        if (S.sect) { (S.pastSects ??= []).push({ school: S.sect.school, how: e.how }); delete S.sect; }
        break;
      case 'attr': growAttr(S, e.key, e.delta, '江湖经历'); break;
      case 'xia': S.xia += e.delta; break;
      case 'eming': S.eming = Math.max(0, S.eming + e.delta); break;
      case 'title': S.title = e.value; break;
      case 'chapter': S.chapter = e.value; break;
      case 'move': S.loc = e.to; S.sel = null; S.reply = null; out.moved = true; break;
      case 'time':
        if (e.add) advanceMin(S, e.add);
        if (e.set !== undefined) { let d = e.set - S.min; if (d < 0) d += 1440; advanceMin(S, d); }
        break;
      case 'weather': S.weather = e.value; break;
      case 'heal':
        if (e.hp === 'full') {
          S.hp = S.hpMax;
          // 好好歇一夜，最重的那一处伤缓一级
          const z = (['inner', 'hand', 'foot'] as const).slice().sort((x, y) => S.wounds[y] - S.wounds[x])[0];
          if (S.wounds[z] > 0) S.wounds[z]--;
        } else if (typeof e.hp === 'number') S.hp = Math.min(S.hpMax, S.hp + e.hp);
        if (e.mp === 'full') S.mp = S.mpMax; else if (typeof e.mp === 'number') S.mp = Math.min(S.mpMax, S.mp + e.mp);
        if (e.hpAtLeast) S.hp = Math.max(S.hp, Math.round(S.hpMax * e.hpAtLeast));
        break;
      case 'cure': {
        const got = cureWounds(e.levels);
        const done = ZONES.filter(z => got[z]).map(z => `${ZONE_NAME[z]}伤${S.wounds[z] ? `轻了${liang(got[z]!)}级，还剩${liang(S.wounds[z])}级` : '好了'}`);
        if (done.length) pushFeed('收获', `治伤：${done.join('；')}。${isWounded() ? '' : '身上的伤都好了。'}`);
        break;
      }
      case 'news': {
        const pool = NEWS.filter(n => test(n.if));
        const n = pick(pool).text;
        pushFeed('传闻', n);
        out.vars.news = n;
        break;
      }
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
        if (S.shenfen.standing === 0) {
          pushFeed('江湖', `你被辞退了，不再是${sf?.name ?? ''}，又做回了游侠。`);
          S.shenfen = { id: 'youxia', standing: 1, since: dayNo(S) };
          S.job = null;
        }
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
        const pay = jobPay(j);
        S.silver += pay;
        S.job = null;
        S.jobLog[j.id] = dayNo(S);
        S.yue = S.yue.filter(y => y.id !== 'job_' + j.id);
        pushFeed('收获', `交了差：${j.title}，得银 ${pay} 文。`);
        emit('toast', `交差 · 银两 +${pay} 文`);
        break;
      }
      case 'jobFail': {
        const j = jobById(e.id);
        if (S.job?.id === e.id) S.job = null;
        S.jobLog[e.id] = dayNo(S);
        S.yue = S.yue.filter(y => y.id !== 'job_' + e.id);
        pushFeed('江湖', `差事办砸了：${j?.title ?? e.id}。`);
        run([{ type: 'standing', delta: -1 }]);
        break;
      }
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
