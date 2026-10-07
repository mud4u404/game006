/**
 * 见招拆招「以己之长」的数值规则（纯函数，便于测试）。
 *
 * 成算 = 起点 + （你的火候 − 对手这一招的对应强度）× 2.5%，限制在 5% 到 95%。
 * 硬接、闪避、拆招的起点为五成，抢攻为三成半。
 * 火候 = 对应武功的境界 × 10 + 对应属性（硬接另加当前内力的充足程度 0–10）。
 * 详见 docs/design.md 第四节。正式的武学数值体系会在路线图第 5 步重新设计。
 */
import type { GameState } from '../core/state';
import { clamp, liang } from '../core/util';
import type { SkillId, TellDef } from '../content/types';

export type RespKey = 'block' | 'dodge' | 'parry' | 'rush';
export type PwKey = keyof TellDef['pw'];

export interface RespDef { k: RespKey; act: string; skill: SkillId; sname: string; pw: PwKey }
export const RESP: RespDef[] = [
  { k: 'block', act: '硬接', skill: 'xinfa', sname: '寒江心法', pw: 'li' },
  { k: 'dodge', act: '闪避', skill: 'taxue', sname: '踏雪无痕', pw: 'su' },
  { k: 'parry', act: '拆招', skill: 'hanjiang', sname: '寒江剑法', pw: 'qiao' },
  { k: 'rush', act: '抢攻', skill: 'jinghong', sname: '惊鸿剑', pw: 'xi' }
];

export function huohou(s: GameState, k: RespKey): number {
  const a = s.attr, r = (id: SkillId) => s.skills[id]?.r ?? 0;
  if (k === 'block') return r('xinfa') * 10 + a.根骨 + Math.round((s.mp / s.mpMax) * 10);
  if (k === 'dodge') return r('taxue') * 10 + a.身法;
  if (k === 'parry') return r('hanjiang') * 10 + a.悟性;
  return r('jinghong') * 10 + a.胆魄;
}

export const odds = (k: RespKey, hh: number, strength: number): number =>
  clamp((k === 'rush' ? 0.35 : 0.5) + (hh - strength) * 0.025, 0.05, 0.95);

/** 成算换成「几成」：1 到 9 */
export const chengN = (p: number): number => clamp(Math.round(p * 10), 1, 9);
export const cheng = (p: number): string => liang(chengN(p)) + '成';

/** 首领二阶段时，四项强度各加 5 */
export function tellPw(t: TellDef, phase: number): TellDef['pw'] {
  const b = phase === 2 ? 5 : 0;
  return { li: t.pw.li + b, su: t.pw.su + b, qiao: t.pw.qiao + b, xi: t.pw.xi + b };
}

export interface RespOption extends RespDef { p: number; cost: number; dis: boolean; note: string }

/** 列出玩家此刻能用的应对。没学会的武功不会出现 */
export function respOptions(s: GameState, pw: TellDef['pw']): RespOption[] {
  return RESP.filter(r => s.skills[r.skill]).map(r => {
    const p = odds(r.k, huohou(s, r.k), pw[r.pw]);
    const cost = r.k === 'block' ? 40 + pw.li : r.k === 'rush' ? 60 : 0;
    const dis = cost > s.mp;
    const note = dis ? '内力不足' : { block: `耗内力 ${cost}`, dodge: '成功可反击', parry: '成功夺势', rush: '成功重创' }[r.k];
    return { ...r, p, cost, dis, note };
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
