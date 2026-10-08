/**
 * 虚实（随机应变）。模拟见 src/lab/model 第二十六轮：利弊参半，待负责人在手机上凭手感定，只在原型里打开。
 * - 对手的重招有几成是虚招。预兆的文字不分虚实（宪章 P5：不给能背下来的提示）。
 * - 四种应对各自吃不吃虚招不一样：全力硬接最容易扑空，拆招讲究看清来势再动，最不怕虚招。
 * - 每个按钮上的成算 = 是实招的几率 × 对实招的成算 + 是虚招的几率 × 应付得了虚招的几率。
 */
import type { RespKey } from './wuxue';

/** 碰上虚招，各种应对还应付得过去的几率 */
export const VS_FEINT: Record<RespKey, number> = { block: 0.1, rush: 0.3, dodge: 0.5, parry: 0.7 };

/** 各对手使虚招的几率。虚招是会家子的本事：饿急了的孩子不使；切磋、剧本战不使 */
const FEINT_RATE: Record<string, number> = { tu: 0.25, zy_csf: 0.25, cw_shuigui: 0.2, huafang_guard: 0.15, ly_xiaozei: 0 };

export function feintRate(foe: { id: string; spar?: boolean; script?: string }): number {
  if (foe.spar || foe.script) return 0;
  return FEINT_RATE[foe.id] ?? 0.2;
}

/** 并进虚实以后的成算 */
export const mergeOdds = (p: number, k: RespKey, f: number): number => (1 - f) * p + f * VS_FEINT[k];
