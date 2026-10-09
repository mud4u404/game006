/**
 * 新序章（docs/kaipian.md）的断点：存档里记着读到哪一屏，刷新页面、关了再开，「继续」接回新序章那一屏，
 * 不会掉进旧序章（旧序章靠任务阶段和渡口小屋走，新序章全在剧情卡片里，存档里原先没有地方记）。
 *
 * 记法：用一个 kp_at: 开头的旗标，要么是「读到某段剧情的第几张」，要么是「正在打某个对手」。
 * 每次选完（效果已经执行）就记下一站，所以接回去不会把同一张卡的效果再执行一遍；
 * 选完出了结果文字、还没点「继续」就刷新的，结果文字会被跳过，效果不重复。
 * 序章了结（章回变成第一回）以后清掉。旧存档没有这个旗标，走老路。
 */
import type { GameState } from '../core/state';

export type KpPos = { kind: 'story'; id: string; i: number } | { kind: 'fight'; id: string };

const PREFIX = 'kp_at:';

/** 新序章的剧情：开篇 p_open，和 kp_ 开头的各段 */
export const kpStory = (id: string): boolean => id === 'p_open' || id.startsWith('kp_');

/** 记下一站（null：清掉） */
export function kpMark(s: GameState, pos: KpPos | null): void {
  for (const k of Object.keys(s.flags)) if (k.startsWith(PREFIX)) delete s.flags[k];
  if (pos) s.flags[PREFIX + (pos.kind === 'story' ? `story:${pos.id}:${pos.i}` : `fight:${pos.id}`)] = true;
}

/** 读断点：只在序章里（章回为零）才有效 */
export function kpPos(s: GameState): KpPos | null {
  if (s.chapter !== 0) return null;
  const key = Object.keys(s.flags).find(k => k.startsWith(PREFIX));
  if (!key) return null;
  const [kind, id, i] = key.slice(PREFIX.length).split(':');
  if (kind === 'fight' && id) return { kind: 'fight', id };
  if (kind === 'story' && id) return { kind: 'story', id, i: Number(i) || 0 };
  return null;
}

/** 开一段剧情（从第 at 张起）时记 */
export function kpOpen(s: GameState, id: string, at = 0): void {
  if (kpStory(id)) kpMark(s, { kind: 'story', id, i: at });
}

/**
 * 选完一个选项（效果已经执行）时记：开了打记打；开了剧情记那段剧情的头一张；
 * 否则记下一张卡；收尾（next 出了范围）清掉。返回有没有改动，改了界面要存档。
 */
export function kpPick(s: GameState, id: string, cardCount: number, out: { fight?: string; story?: string }, next: number): boolean {
  if (!kpStory(id)) return false;
  if (out.fight) kpMark(s, { kind: 'fight', id: out.fight });
  else if (out.story) kpMark(s, { kind: 'story', id: out.story, i: 0 });
  else if (next >= 0 && next < cardCount) kpMark(s, { kind: 'story', id, i: next });
  else kpMark(s, null);
  return true;
}
