/**
 * 内容数据里的条件（Cond）与效果（Effect）在这里统一解释执行。
 * 开打和开剧情这两种需要界面配合的效果不在这里处理，而是记在 Outcome 里交给调用方。
 */
import { S, fullName, pushFeed } from '../core/state';
import { emit } from '../core/bus';
import { advanceMin } from '../core/time';
import { pick } from '../core/util';
import { NEWS, skillById } from '../content';
import { SECT_RANKS } from '../content/skills';
import type { Branch, Cond, Effect } from '../content/types';
import { gainProf, learnSkill } from './growth';
import { canLearn } from './shicheng';

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
  if (c.rel) {
    const r = S.rel[c.rel.npc] ?? '素不相识';
    if (c.rel.is && !c.rel.is.includes(r)) return false;
    if (c.rel.not && c.rel.not.includes(r)) return false;
  }
  if (c.learned && !S.skills[c.learned]) return false;
  if (c.notLearned && S.skills[c.notLearned]) return false;
  if (c.attr && S.attr[c.attr.key] < c.attr.atLeast) return false;
  if (c.xia !== undefined && S.xia < c.xia) return false;
  if (c.eming !== undefined && S.eming < c.eming) return false;
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
      case 'quest': S.quests[e.id] = Math.max(S.quests[e.id] ?? -1, e.stage); break;
      case 'track': S.track = e.id; break;
      case 'feed': pushFeed(e.tag, e.text); break;
      case 'feedReset': S.feed = []; break;
      case 'toast': emit('toast', e.text); break;
      case 'silver': S.silver = Math.max(0, S.silver + e.delta); break;
      case 'item': S.items[e.id] = Math.max(0, (S.items[e.id] || 0) + e.delta); break;
      case 'rel': {
        const cur = S.rel[e.npc] ?? '素不相识';
        if (!e.from || e.from.includes(cur)) S.rel[e.npc] = e.value;
        break;
      }
      case 'prof': out.breaks.push(...gainProf(e.skill, e.amount)); break;
      case 'learn': out.breaks.push(...learnSkill(e.skill, e.realm ?? 0, e.prof ?? 0)); break;
      // 拜师或升地位，只升不降；身在别派时无效（要先出师或叛门）
      case 'sect':
        if (!S.sect) S.sect = { school: e.school, rank: e.rank };
        else if (S.sect.school === e.school && SECT_RANKS.indexOf(e.rank) > SECT_RANKS.indexOf(S.sect.rank)) S.sect.rank = e.rank;
        break;
      case 'leaveSect':
        if (S.sect) { (S.pastSects ??= []).push({ school: S.sect.school, how: e.how }); delete S.sect; }
        break;
      case 'attr': S.attr[e.key] += e.delta; break;
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
        if (e.hp === 'full') S.hp = S.hpMax; else if (typeof e.hp === 'number') S.hp = Math.min(S.hpMax, S.hp + e.hp);
        if (e.mp === 'full') S.mp = S.mpMax; else if (typeof e.mp === 'number') S.mp = Math.min(S.mpMax, S.mp + e.mp);
        if (e.hpAtLeast) S.hp = Math.max(S.hp, Math.round(S.hpMax * e.hpAtLeast));
        break;
      case 'news': {
        const pool = NEWS.filter(n => test(n.if));
        const n = pick(pool).text;
        pushFeed('传闻', n);
        out.vars.news = n;
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
