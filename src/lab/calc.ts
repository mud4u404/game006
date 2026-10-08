/**
 * 武学试算台的纯函数（Issue #33）：构造状态、列成算表、算绝招预算。
 * 数值规则一律调用 engine/wuxue、engine/formulas、content/skills 里现成的函数和常量，不另写一套。
 */
import { ACTIVE_MAX, CAT_WEAPON } from '../content/skills';
import { ITEMS, skillById } from '../content';
import type { SkillDef, TellDef } from '../content/types';
import { newGame } from '../core/state';
import type { GameState } from '../core/state';
import { respOptions, type FoeTraits } from '../engine/formulas';
import { performBudget, performEfficiency } from '../engine/wuxue';
import type { Loadout } from '../engine/wuxue';

/** 以 newGame() 为底，按 realms 设境界（熟练度为 0），再按 loadout 设搭配；兵刃位有武功时，手里拿对应的兵器（游戏里有这种兵器的话） */
export function buildState(loadout: Loadout, realms: Record<string, number>): GameState {
  const s = newGame();
  for (const [id, r] of Object.entries(realms)) s.skills[id] = { r, p: 0 };
  for (const id of Object.values(loadout)) if (id && !s.skills[id]) s.skills[id] = { r: 0, p: 0 };
  s.loadout = { ...loadout };
  const w = loadout.weapon ? skillById(loadout.weapon) : undefined;
  const item = w ? ITEMS.find(i => i.equip?.weapon === CAT_WEAPON[w.category]) : undefined;
  s.gear = item ? { weapon: item.id } : {};
  if (item) s.items[item.id] = 1;
  return s;
}

export interface OddsRow { k: string; act: string; sname: string; p: number }

/** 四种应对各一行：用哪门武功、几成 */
export function oddsTable(s: GameState, pw: TellDef['pw'], foe?: FoeTraits): OddsRow[] {
  return respOptions(s, pw, foe ?? {}).map(({ k, act, sname, p }) => ({ k, act, sname, p }));
}

export interface PerformRow { name: string; budget: number; cap: number; efficiency: number; effCap: number; over: boolean }

/** 一门武功每个绝招的预算报告。上限按解锁境界放宽，规则与 tests/content.test.ts 一致 */
export function performReport(skill: SkillDef): PerformRow[] {
  return (skill.performs || []).map(p => {
    const loosen = 1 + 0.08 * (p.realm ?? 0);
    const cap = ACTIVE_MAX[skill.grade].expected * loosen;
    const effCap = ACTIVE_MAX[skill.grade].efficiency * loosen;
    const budget = performBudget(p);
    const efficiency = performEfficiency(p);
    return { name: p.name, budget, cap, efficiency, effCap, over: budget > cap || efficiency > effCap };
  });
}
