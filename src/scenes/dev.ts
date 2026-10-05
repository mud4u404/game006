/**
 * 开发用：?dev=章节序号[&stage=intro|battle|camp|outro] 直接跳到某章（自动组建当时的队伍）
 */
import { CHAPTERS } from '@/data/chapters';
import { joinParty, member, newGame, type GameState } from '@/game/state';
import { CHARACTERS } from '@/data/characters';
import { getClass } from '@/data/classes';
import { GROWTH_KEYS } from '@/data/types';
import { promoteSave } from '@/game/progression';

/** 各章开始前已加入的角色 */
const JOINED_BEFORE: [number, string[]][] = [
  [1, ['rein', 'alicia', 'balder', 'loy']],
  [2, ['gren']],
  [3, ['fina']],
  [4, ['lucas', 'kia']],
  [5, ['sera', 'raven']],
  [6, ['hagen']],
  [8, ['sieg']],
  [10, ['igna']],
];

export function devState(): GameState | null {
  const q = new URLSearchParams(location.search);
  const dev = q.get('dev');
  if (dev === null) return null;
  return buildDevState(Number(dev), (q.get('stage') as GameState['stage']) ?? 'battle');
}

/** 构造某章开始时的存档（队伍、等级按章节估算） */
export function buildDevState(chapter: number, stage: GameState['stage'] = 'battle'): GameState {
  const idx = Math.max(0, Math.min(CHAPTERS.length - 1, chapter));
  const s = newGame('normal');
  s.chapterIndex = idx;
  s.stage = stage;
  s.gold = 3000;
  for (const [ch, ids] of JOINED_BEFORE) if (ch <= idx) for (const id of ids) joinParty(s, id);
  if (idx >= 6) s.party = s.party.filter((p) => p.id !== 'balder');
  // 等级随章节提升：按平均成长率加属性，Lv10 后（第五章起）转职
  for (const p of s.party) {
    const ch = CHARACTERS[p.id];
    let levels = Math.max(0, 1 + Math.floor(idx * 1.8) - p.level);
    while (levels > 0) {
      const cls = getClass(p.classId);
      if (p.level >= 20) break;
      for (const k of GROWTH_KEYS) p.base[k] = Math.min(cls.caps[k], p.base[k] + ch.growth[k] / 100);
      p.level += 1;
      levels -= 1;
      const opt = cls.promotesTo?.find((o) => !o.item);
      if (cls.tier === 1 && p.level >= 10 && idx >= 5 && opt && p.id !== 'rein') promoteSave(p, opt.to);
    }
    for (const k of GROWTH_KEYS) p.base[k] = Math.round(p.base[k]);
  }
  const rein = member(s, 'rein');
  if (rein && idx >= 6) promoteSave(rein, 'crimson_knight');
  return s;
}
