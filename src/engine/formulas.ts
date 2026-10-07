/**
 * 见招拆招「以己之长」的数值规则（纯函数，便于测试）。
 *
 * 成算 = 起点 + （你的火候 − 对手这一招的对应强度）× 2.5% + 克制修正，限制在 5% 到 95%。
 * 硬接、闪避、拆招的起点为五成，抢攻为三成半。
 * 火候和克制由 engine/wuxue.ts 计算：应对来自你搭配在各槽位的武功。
 * 设计说明见 docs/wuxue.md。
 */
import type { GameState } from '../core/state';
import { clamp, liang } from '../core/util';
import type { SkillId, SkillNature, SkillReach, TellDef } from '../content/types';
import { RESP_SLOT, counterBonus, huohou, reachBonus, slotSkill, type RespKey } from './wuxue';

export { huohou, type RespKey } from './wuxue';
export type PwKey = keyof TellDef['pw'];

/** 四种应对：动作名，以及比的是对手这一招的哪一项强度 */
export interface RespDef { k: RespKey; act: string; pw: PwKey }
export const RESP: RespDef[] = [
  { k: 'block', act: '硬接', pw: 'li' },
  { k: 'dodge', act: '闪避', pw: 'su' },
  { k: 'parry', act: '拆招', pw: 'qiao' },
  { k: 'rush', act: '抢攻', pw: 'xi' }
];

export const odds = (k: RespKey, hh: number, strength: number): number =>
  clamp((k === 'rush' ? 0.35 : 0.5) + (hh - strength) * 0.025, 0.05, 0.95);

/** 成算换成「几成」：1 到 9 */
export const chengN = (p: number): number => clamp(Math.round(p * 10), 1, 9);
export const cheng = (p: number): string => liang(chengN(p)) + '成';

/**
 * 出手的轻重随境界走：初窥门径打八成，每深一重加一成，练到大乘一倍六。
 * 开局的渔家少年剑上没有火候，要靠练出来（docs/audit.md「开局强度」）。
 */
export const realmPow = (s: Pick<GameState, 'skills'>, id: SkillId | undefined): number =>
  0.8 + 0.1 * (id ? s.skills[id]?.r ?? 0 : 0);

/** 首领二阶段时，四项强度各加 5 */
export function tellPw(t: TellDef, phase: number): TellDef['pw'] {
  const b = phase === 2 ? 5 : 0;
  return { li: t.pw.li + b, su: t.pw.su + b, qiao: t.pw.qiao + b, xi: t.pw.xi + b };
}

/** 对手的性质与兵器长短，用来算克制；没写就不算 */
export interface FoeTraits { nature?: SkillNature; reach?: SkillReach }

export interface RespOption extends RespDef { skill: SkillId; sname: string; p: number; cost: number; dis: boolean; note: string }

/** 列出玩家此刻能用的应对。槽位空着（或那门武功没学会）的应对不会出现 */
export function respOptions(s: GameState, pw: TellDef['pw'], foe: FoeTraits = {}): RespOption[] {
  return RESP.flatMap(r => {
    const def = slotSkill(s, RESP_SLOT[r.k]);
    if (!def) return [];
    const bonus = counterBonus(def.nature, foe.nature) + reachBonus(r.k, def.reach, foe.reach);
    const p = clamp(odds(r.k, huohou(s, r.k), pw[r.pw]) + bonus, 0.05, 0.95);
    const cost = r.k === 'block' ? 40 + pw.li : r.k === 'rush' ? 60 : 0;
    const dis = cost > s.mp;
    const note = dis ? '内力不足' : { block: `耗内力 ${cost}`, dodge: '成功可反击', parry: '成功夺势', rush: '成功重创' }[r.k];
    return [{ ...r, skill: def.id, sname: def.name, p, cost, dis, note }];
  });
}

const JUDGE: Record<'li' | 'su' | 'qiao', [RespKey, string]> = { li: ['block', '内劲极沉'], su: ['dodge', '快得惊人'], qiao: ['parry', '变化繁复'] };

/** 判断句：取这一招最突出的一项，与玩家相应的火候比较 */
export function judgeText(s: GameState, pw: TellDef['pw'], ws: string): string {
  const top = (['li', 'su', 'qiao'] as const).slice().sort((a, b) => pw[b] - pw[a])[0];
  const [k, desc] = JUDGE[top];
  const d = pw[top] - huohou(s, k);
  const cmp = d > 10 ? '远在你之上' : d > 3 ? '略胜于你' : d >= -3 ? '与你在伯仲之间' : '却未必胜得过你';
  return `你看出这一${ws}${desc}，${cmp}。`;
}
