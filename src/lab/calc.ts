/**
 * 武学试算台的纯函数（Issue #33）：构造状态、列成算表、算绝招预算。
 * 数值规则一律调用 engine/wuxue、engine/formulas、content/skills 里现成的函数和常量，不另写一套。
 */
import { ACTIVE_MAX, CAT_WEAPON } from '../content/skills';
import { ITEMS, skillById } from '../content';
import type { FoeDef, SkillDef, SkillNature, SkillReach, TellDef } from '../content/types';
import { newGame } from '../core/state';
import type { GameState } from '../core/state';
import { Duel, SKILLED, simulate } from '../engine/duel';
import { RESP_ACT } from '../engine/formulas';
import { mulberry32 } from '../engine/rng';
import { performBudget, performEfficiency, respSkill } from '../engine/wuxue';
import type { Loadout } from '../engine/wuxue';
import { fightKit, foeSpec, heroSpec } from '../engine/zhaoshi';

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

/** 试算用的对手：档次、路数、性质、兵器长短、这一招的主项（和内容里写对手的格式一样） */
export interface FoeIn { rank: number; build: NonNullable<FoeDef['build']>; nature?: SkillNature; reach?: SkillReach; dom: TellDef['dom'] }

const dummy = (f: FoeIn): FoeDef => ({
  id: 'lab', name: '对手', title: '', ini: '对', tone: 'gray', weapon: '刀', ws: '刀', tag: '', moves: [''], flourish: [''],
  tells: [{ name: '重招', text: '', dom: f.dom, after: '' }], asides: [''], opening: [''], intro: '', win: '', lose: '',
  rank: f.rank, build: f.build, nature: f.nature, reach: f.reach, results: { win: {} }
});

/** 四种应对各一行：用哪门武功、几成（虚实已经并进去了，和实战按钮上的一样） */
export function oddsTable(s: GameState, foe: FoeIn): OddsRow[] {
  const f = dummy(foe);
  const d = new Duel(heroSpec(s, fightKit(s), f), foeSpec(f, []), { rng: mulberry32(1) });
  return d.options(d.tells[0]).map(o => ({ k: o.k, act: RESP_ACT[o.k], sname: respSkill(s, o.k)?.name ?? '', p: o.p }));
}

/** 用实战的引擎打 n 场（以己之长的打法），胜率 */
export function winRate(s: GameState, foe: FoeIn, n = 200): number {
  const f = dummy(foe);
  let w = 0;
  for (let i = 0; i < n; i++) {
    const d = new Duel(heroSpec(s, fightKit(s), f), foeSpec(f, []), { rng: mulberry32(7 + i * 7919) });
    if (simulate(d, SKILLED).res === 'win') w++;
  }
  return w / n;
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
