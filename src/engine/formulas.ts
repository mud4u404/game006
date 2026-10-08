/**
 * 见招拆招的读数（界面用）：四种应对的名字、成算换成「几成」、火候、判断句。
 * 规则本身在 engine/duel.ts（成算的 S 形曲线、虚实、反击），火候在 engine/person.ts。
 */
import type { GameState } from '../core/state';
import { clamp, liang } from '../core/util';
import type { Pw, RespKey } from './duel';
import { huohouOf } from './person';
import { respSkill } from './wuxue';
import { personOf } from './ren';

export type { RespKey } from './duel';

/** 四种应对：动作名，以及比的是对手这一招的哪一项强度 */
export interface RespDef { k: RespKey; act: string; pw: keyof Pw }
export const RESP: RespDef[] = [
  { k: 'block', act: '硬接', pw: 'li' },
  { k: 'dodge', act: '闪避', pw: 'su' },
  { k: 'parry', act: '拆招', pw: 'qiao' },
  { k: 'rush', act: '抢攻', pw: 'xi' }
];
export const RESP_ACT: Record<RespKey, string> = { block: '硬接', dodge: '闪避', parry: '拆招', rush: '抢攻' };

/** 成算换成「几成」：1 到 9 */
export const chengN = (p: number): number => clamp(Math.round(p * 10), 1, 9);
export const cheng = (p: number): string => liang(chengN(p)) + '成';

/** 火候：负责这种应对的那门武功的重数和品级，加上对应的根基（engine/person.ts） */
export const huohou = (s: GameState, k: RespKey): number => Math.round(huohouOf(personOf(s))[k]);

/** 这种应对由哪门武功负责（没有就用不上） */
export const respName = (s: GameState, k: RespKey): string | undefined => respSkill(s, k)?.name;

const JUDGE: Record<'li' | 'su' | 'qiao', [RespKey, string]> = { li: ['block', '内劲极沉'], su: ['dodge', '快得惊人'], qiao: ['parry', '变化繁复'] };

/** 判断句：取这一招最突出的一项，与玩家相应的火候比较 */
export function judgeText(pw: Pw, hh: Record<RespKey, number | null>, ws: string): string {
  const top = (['li', 'su', 'qiao'] as const).slice().sort((a, b) => pw[b] - pw[a])[0];
  const [k, desc] = JUDGE[top];
  const mine = hh[k];
  if (mine === null) return `你看出这一${ws}${desc}。`;
  const d = pw[top] - mine;
  const cmp = d > 20 ? '远在你之上' : d > 6 ? '略胜于你' : d >= -6 ? '与你在伯仲之间' : '却未必胜得过你';
  return `你看出这一${ws}${desc}，${cmp}。`;
}
