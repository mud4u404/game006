/**
 * 开发用：?dev=章节序号[&stage=intro|battle|camp|outro] 直接跳到某章（自动组建当时的队伍）
 */
import { CHAPTERS } from '@/data/chapters';
import { joinParty, member, newGame, type GameState } from '@/game/state';

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
  const idx = Math.max(0, Math.min(CHAPTERS.length - 1, Number(dev)));
  const s = newGame('normal');
  s.chapterIndex = idx;
  s.stage = (q.get('stage') as GameState['stage']) ?? 'battle';
  s.gold = 3000;
  for (const [ch, ids] of JOINED_BEFORE) if (ch <= idx) for (const id of ids) joinParty(s, id);
  if (idx >= 6) s.party = s.party.filter((p) => p.id !== 'balder');
  // 等级随章节提升
  for (const p of s.party) p.level = Math.min(20, Math.max(p.level, 1 + Math.floor(idx * 1.6)));
  if (member(s, 'rein') && idx >= 6) member(s, 'rein')!.classId = 'crimson_knight';
  return s;
}
