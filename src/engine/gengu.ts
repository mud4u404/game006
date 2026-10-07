/**
 * 根基五项的实际作用与成长（docs/audit.md 第三节）。
 * 以「常人」为准：高于常人有加成，低于常人有减成。每一项都要有看得见的作用，不做摆设。
 */
import { pushFeed, type GameState } from '../core/state';
import { cn } from '../core/util';
import type { AttrKey, SkillDef } from '../content/types';

/** 常人的根基 */
export const COMMON: Record<AttrKey, number> = { 体魄: 13, 根骨: 11, 身法: 14, 悟性: 13, 胆魄: 10 };
/** 根基的上限 */
export const ATTR_MAX = 30;

const d = (s: Pick<GameState, 'attr'>, k: AttrKey): number => s.attr[k] - COMMON[k];
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** 根基带来的数值 */
export function attrEffects(s: Pick<GameState, 'attr'>) {
  return {
    /** 体魄：气血上限，每点 40 */
    hp: d(s, '体魄') * 40,
    /** 根骨：内力上限，每点 30 */
    mp: d(s, '根骨') * 30,
    /** 根骨：内功修炼快慢，每点 3% */
    neigong: 1 + d(s, '根骨') * 0.03,
    /** 身法：轻功修炼快慢，每点 3% */
    qinggong: 1 + d(s, '身法') * 0.03,
    /** 身法：赶路耗时的倍数，每点省 2%，最多省三成 */
    travel: clamp(1 - d(s, '身法') * 0.02, 0.7, 1.2),
    /** 悟性：外功修炼快慢，每点 3% */
    waigong: 1 + d(s, '悟性') * 0.03,
    /** 胆魄：开战时的怒气，每点 3 */
    rage: d(s, '胆魄') * 3
  };
}

/** 一门武功练起来的快慢倍数 */
export function profMul(s: Pick<GameState, 'attr'>, def: SkillDef): number {
  const e = attrEffects(s);
  if (def.category === '内功') return e.neigong;
  if (def.category === '轻功') return e.qinggong;
  if (def.category === '杂学') return 1;
  return e.waigong;
}

/**
 * 把根基带来的气血、内力上限同步到存档里：只补差额，可以反复调用。
 * 根基变了、读档时都调用一次。
 */
export function syncAttr(s: GameState): void {
  const e = attrEffects(s);
  const a = s.attrApplied ?? { hp: 0, mp: 0 };
  const dh = e.hp - a.hp, dm = e.mp - a.mp;
  s.hpMax += dh; s.mpMax += dm;
  s.hp = Math.max(1, Math.min(s.hpMax, s.hp + Math.max(0, dh)));
  s.mp = Math.max(0, Math.min(s.mpMax, s.mp + Math.max(0, dm)));
  s.attrApplied = { hp: e.hp, mp: e.mp };
}

/** 加根基（不超过上限），记一条见闻，并同步气血、内力上限 */
export function growAttr(s: GameState, k: AttrKey, n: number, why: string): void {
  const before = s.attr[k];
  s.attr[k] = Math.min(ATTR_MAX, s.attr[k] + n);
  if (s.attr[k] === before) return;
  syncAttr(s);
  pushFeed('突破', `根基长进：${k}加${cn(s.attr[k] - before)}（${why}）。`);
}

/** 武功练到这几重，根基跟着长：内功长根骨，轻功长身法，外功长悟性；每一重、每一项只长一次 */
const MILESTONES = [3, 5, 7];
export function milestoneGrowth(s: GameState, def: SkillDef, realm: number): void {
  if (!MILESTONES.includes(realm)) return;
  const k: AttrKey | null = def.category === '内功' ? '根骨' : def.category === '轻功' ? '身法' : def.category === '杂学' ? null : '悟性';
  if (!k) return;
  const flag = `gg_${k}_${realm}`;
  if (s.flags[flag]) return;
  s.flags[flag] = true;
  growAttr(s, k, 1, `「${def.name}」练到第${cn(realm + 1)}重`);
}

/** 内功每突破一重，气血、内力上限跟着涨（开局从零练起，底子靠内功一层层垫上去） */
export const NEIGONG_STEP = { hp: 60, mp: 40 };
export function neigongGrowth(s: GameState, def: SkillDef): void {
  if (def.category !== '内功') return;
  s.hpMax += NEIGONG_STEP.hp; s.hp += NEIGONG_STEP.hp;
  s.mpMax += NEIGONG_STEP.mp; s.mp += NEIGONG_STEP.mp;
  pushFeed('突破', `内功深了一层：气血上限 +${NEIGONG_STEP.hp}，内力上限 +${NEIGONG_STEP.mp}。`);
}

/** 人物页上每项根基的说明：写它现在实际带来了什么 */
export function attrLines(s: Pick<GameState, 'attr'>): Record<AttrKey, string> {
  const e = attrEffects(s);
  const pct = (x: number): string => `${x >= 1 ? '+' : '−'}${Math.round(Math.abs(x - 1) * 100)}%`;
  const num = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(x)}`;
  return {
    体魄: `气血上限 ${num(e.hp)}`,
    根骨: `内力上限 ${num(e.mp)} · 内功修炼 ${pct(e.neigong)} · 硬接`,
    身法: `赶路 ${pct(e.travel)} · 轻功修炼 ${pct(e.qinggong)} · 闪避`,
    悟性: `外功修炼 ${pct(e.waigong)} · 看破线索 · 拆招`,
    胆魄: `开战怒气 ${num(e.rage)} · 抢攻`
  };
}
