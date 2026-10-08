/**
 * 根基五项在交手以外的作用，和人物页上的说明（docs/foundation.md 第三节第一条）。
 * 刻度：常人各二十，上限五十。交手里的作用在 engine/person.ts（火候、气血、护体、闪避、怒气、开局的势）。
 * 先天只能靠奇遇改（易筋、洗髓、异果、剧情里的经历）；后天随武功长，不用另记。
 */
import { pushFeed, type GameState } from '../core/state';
import { cn } from '../core/util';
import type { AttrKey, SkillDef } from '../content/types';
import { ATTR_MAX, COMMON, SCALE } from './person';
import { syncBody } from './ren';

export { ATTR_MAX, COMMON } from './person';

const d = (s: Pick<GameState, 'attr'>, k: AttrKey): number => s.attr[k] - COMMON;
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** 根基在交手以外带来的倍数：每高常人一点，快一分 */
export function attrEffects(s: Pick<GameState, 'attr'>) {
  return {
    /** 根骨：内功进境 */
    neigong: 1 + d(s, '根骨') * 0.01,
    /** 身法：轻功进境 */
    qinggong: 1 + d(s, '身法') * 0.01,
    /** 身法：赶路耗时的倍数，最多省三成 */
    travel: clamp(1 - d(s, '身法') * 0.01, 0.7, 1.2),
    /** 悟性：外功进境 */
    waigong: 1 + d(s, '悟性') * 0.01,
    /** 根骨：打坐长功力的快慢 */
    dazuo: 1 + d(s, '根骨') * 0.01
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

/** 改先天根基（奇遇、剧情里的经历），不超过上限；记一条见闻，气血内力跟着变 */
export function growAttr(s: GameState, k: AttrKey, n: number, why: string): void {
  const before = s.attr[k];
  s.attr[k] = clamp(s.attr[k] + n, 1, ATTR_MAX);
  if (s.attr[k] === before) return;
  syncBody(s);
  if (n > 0) pushFeed('突破', `根基长进：${k}加${cn(s.attr[k] - before)}（${why}）。`);
}

const sign = (x: number): string => (x >= 0 ? '+' : '−') + Math.abs(Math.round(x));
const pct = (x: number): string => `${x >= 1 ? '+' : '−'}${Math.round(Math.abs(x - 1) * 100)}%`;

/** 人物页上每项根基的说明：写它现在实际带来了什么（先天高出常人的部分是天赋，后天进火候） */
export function attrLines(s: GameState): Record<AttrKey, string> {
  const e = attrEffects(s), sc = SCALE;
  return {
    体魄: `气血 · 天赋 ${sign(d(s, '体魄') * sc.tiHp * 100)}%`,
    根骨: `硬接 · 护体、内力 · 内功、打坐 ${pct(e.neigong)}`,
    身法: `闪避 · 轻功 ${pct(e.qinggong)} · 赶路 ${pct(2 - e.travel)}`,
    悟性: `拆招 · 外功 ${pct(e.waigong)} · 看出线索`,
    胆魄: `抢攻 · 开局的势、怒气 ${sign(d(s, '胆魄') * 1.5)}`
  };
}
