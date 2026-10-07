/**
 * 备战：开打前做过的准备（FoeDef.prep）。打听到底细、找来帮手、占了地利……
 * 条件成立的都生效，可以叠加。弱小的人靠这些也能以弱胜强，这也是行走江湖的本事。
 */
import type { FoeDef, PrepDef } from '../content/types';
import { test } from './dsl';

export function prepFoe(f: FoeDef): { foe: FoeDef; active: PrepDef[] } {
  const active = (f.prep ?? []).filter(p => test(p.if));
  if (!active.length) return { foe: f, active };
  const mul = (k: 'hp' | 'atk' | 'big'): number => active.reduce((m, p) => m * (p[k] ?? 1), 1);
  const foe: FoeDef = {
    ...f,
    hp: Math.round(f.hp * mul('hp')),
    atk: [Math.round(f.atk[0] * mul('atk')), Math.round(f.atk[1] * mul('atk'))],
    big: Math.round(f.big * mul('big'))
  };
  return { foe, active };
}
