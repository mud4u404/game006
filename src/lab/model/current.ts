/**
 * 现有体系换算成内核的两方：玩家由存档（GameState）算出，对手直接取内容里的 FoeDef。
 * 用来量「现在的体感」，作为基准线：负责人说现在的体感不错，新规则不能把它弄坏。
 */
import type { GameState } from '../../core/state';
import type { FoeDef } from '../../content/types';
import { realmPow } from '../../engine/formulas';
import { huohou, respSkill } from '../../engine/wuxue';
import { fightKit } from '../../engine/zhaoshi';
import type { BaseResp as RespKey, Foe, Hero } from './kernel';

const scale = (r: [number, number], k: number): [number, number] => [r[0] * k, r[1] * k];

export function heroFromState(s: GameState, name = '主角'): Hero {
  const kit = fightKit(s);
  const pw = realmPow(s, kit.outer?.id);
  const pwOf = (k: RespKey): number => realmPow(s, respSkill(s, k)?.id);
  // 火候里硬接那一项带了内力加成，内核自己按当时的内力加，这里先去掉
  const bare = { ...s, mp: 0 };
  const hh = (k: RespKey): number | null => (respSkill(s, k) ? huohou(bare, k) : null);
  const qg = s.skills[s.loadout.qinggong ?? '']?.r ?? 0;
  return {
    name, tier: 0, hpMax: s.hpMax, floor: 0, mpMax: s.mpMax, mpRegen: 10, gongli: s.mpMax / 100,
    auto: scale([55, 80], pw), open: scale([200, 240], pw),
    counter: { block: scale([80, 110], pwOf('block')), parry: scale([60, 90], pwOf('parry')), rush: scale([220, 280], pwOf('rush')) },
    hh: { block: hh('block'), dodge: hh('dodge'), parry: hh('parry'), rush: hh('rush') },
    dodge: 0.2 + qg * 0.02, parry: 0.15,
    performs: kit.performs.map(x => ({
      name: x.p.name, dmg: scale(x.p.dmg, Math.max(1, x.p.hits) * pw), mp: x.p.mp, cd: x.p.cd, acc: x.p.acc,
      hold: x.p.fx?.find(f => f.kind === 'busy')?.rounds
    })),
    ult: kit.ult ? scale(kit.ult.u.dmg, pw) : undefined,
    rage0: 30, wu: s.attr.悟性
  };
}

export function foeFromDef(f: FoeDef): Foe {
  return {
    name: f.name, tier: 0, hpMax: f.hp, atk: f.atk, big: f.big, tells: f.tells.map(t => t.pw),
    gongli: 3, dodge: 0.14, parry: 0.2, spar: f.spar, firstTell: f.firstTell
  };
}
