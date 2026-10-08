/**
 * 存档迁移检验（只做检验，不接游戏）：把现有存档换算成新的人物模型，看会不会「整崩塌」。
 * - 根基五项一一对应，只换刻度：游戏里的常人是 13/11/14/13/10，模型里常人各 20，按相对常人的比例折算。
 *   （第二版折成四项、总和 80，胆魄并进悟性；第三版改回五项，玩家的根基原样保留。）
 * - 内力上限直接折成功力：一百点一年。
 * - 武功的重数原样保留。
 * - 档次看身上练得最高的那一门武功（不只看主修），功力要够这一档阶梯的一半。
 * - 银两、物品、任务、旗标、人情一律不动；江湖历从「景和某年」起算，旧的日子记录照样能算间隔。
 */
import type { GameState } from '../../core/state';
import { GONGLI_LADDER, TIER_AT_R } from './life';
import type { Attr } from './person';

export const OLD_COMMON = { 体魄: 13, 根骨: 11, 身法: 14, 悟性: 13, 胆魄: 10 };

export interface Migrated {
  attr: Attr;
  gongli: number;
  realms: Record<string, number>;
  tier: number;
  kept: Pick<GameState, 'silver' | 'items' | 'quests' | 'flags' | 'rel'>;
  /** 加了「年」以后的绝对日数：旧存档都算景和元年（第 0 年） */
  absDay: (dayNo: number) => number;
}

/** 第三版存档（旧刻度）的根基换成模型的刻度；第四版存档已经是常人二十的刻度，原样取 */
export function migrateAttr(a: GameState['attr'], v = 3): Migrated['attr'] {
  const r = (k: keyof typeof OLD_COMMON): number => (v >= 4 ? a[k] : Math.round((20 * a[k]) / OLD_COMMON[k] * 10) / 10);
  return { ti: r('体魄'), gen: r('根骨'), shen: r('身法'), wu: r('悟性'), dan: r('胆魄') };
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
  // 第四版存档里功力已经以年计（src/core/save.ts 的 v3toV4）
  const gongli = s.gongli ?? s.mpMax / 100;
  return {
    attr: migrateAttr(s.attr, s.v), gongli, realms, tier: tierOf(equipped, gongli),
    kept: { silver: s.silver, items: s.items, quests: s.quests, flags: s.flags, rel: s.rel },
    absDay: dayNo => dayNo
  };
}
