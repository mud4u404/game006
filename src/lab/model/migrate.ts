/**
 * 存档迁移检验（只做检验，不接游戏）：把现有存档换算成新的人物模型，看会不会「整崩塌」。
 * - 根基五项（常人 13/11/14/13/10）→ 四项（常人各 20，总和 80，单项 10 到 30）：
 *   膂力看体魄，根骨看根骨，身法看身法，悟性看悟性和胆魄；先按各自相对常人的比例折，再凑成 80。
 * - 内力上限直接折成功力：一百点一年。
 * - 武功的重数原样保留。
 * - 档次看身上练得最高的那一门武功（不只看主修），功力要够这一档阶梯的一半。
 * - 银两、物品、任务、旗标、人情一律不动；江湖历从「景和某年」起算，旧的日子记录照样能算间隔。
 */
import type { GameState } from '../../core/state';
import { GONGLI_LADDER, TIER_AT_R } from './life';

const OLD_COMMON = { 体魄: 13, 根骨: 11, 身法: 14, 悟性: 13, 胆魄: 10 };

export interface Migrated {
  attr: { li: number; gen: number; shen: number; wu: number };
  gongli: number;
  realms: Record<string, number>;
  tier: number;
  kept: Pick<GameState, 'silver' | 'items' | 'quests' | 'flags' | 'rel'>;
  /** 加了「年」以后的绝对日数：旧存档都算景和元年（第 0 年） */
  absDay: (dayNo: number) => number;
}

export function migrateAttr(a: GameState['attr']): Migrated['attr'] {
  const r = (k: keyof typeof OLD_COMMON): number => a[k] / OLD_COMMON[k];
  const raw = { li: 20 * r('体魄'), gen: 20 * r('根骨'), shen: 20 * r('身法'), wu: 20 * (r('悟性') + r('胆魄')) / 2 };
  // 凑成总和 80，单项限在 10 到 30（反复几次，直到稳定）
  let x = { ...raw };
  for (let i = 0; i < 20; i++) {
    const sum = x.li + x.gen + x.shen + x.wu;
    const k = 80 / sum;
    x = { li: x.li * k, gen: x.gen * k, shen: x.shen * k, wu: x.wu * k };
    x = { li: Math.min(30, Math.max(10, x.li)), gen: Math.min(30, Math.max(10, x.gen)), shen: Math.min(30, Math.max(10, x.shen)), wu: Math.min(30, Math.max(10, x.wu)) };
  }
  // 取整，差额补在最大的一项上，保证总和正好 80
  const out = { li: Math.round(x.li), gen: Math.round(x.gen), shen: Math.round(x.shen), wu: Math.round(x.wu) };
  const diff = 80 - (out.li + out.gen + out.shen + out.wu);
  const top = (Object.keys(out) as (keyof typeof out)[]).sort((p, q) => out[q] - out[p])[0];
  out[top] += diff;
  return out;
}

/** 新的档次：练得最高的那一门武功的重数（1 起），功力要够这一档阶梯的一半 */
export function tierOf(realms: number[], gongli: number): number {
  const R = Math.max(1, ...realms);
  let t = 0;
  for (let k = 1; k < TIER_AT_R.length; k++) if (R >= TIER_AT_R[k] && gongli >= GONGLI_LADDER[k] * 0.5) t = k;
  return t;
}

export function migrateSave(s: GameState): Migrated {
  const realms: Record<string, number> = {};
  for (const [id, p] of Object.entries(s.skills)) if (p) realms[id] = p.r + 1;
  const equipped = Object.values(s.loadout).filter((id): id is string => !!id && id in realms).map(id => realms[id]);
  const gongli = s.mpMax / 100;
  return {
    attr: migrateAttr(s.attr), gongli, realms, tier: tierOf(equipped, gongli),
    kept: { silver: s.silver, items: s.items, quests: s.quests, flags: s.flags, rel: s.rel },
    absDay: dayNo => dayNo
  };
}
