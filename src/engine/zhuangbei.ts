/**
 * 纸娃娃：六个装备位、装备的数值和上限（docs/zhuangbei.md 第三节）。
 * 这里只有规则，不改存档；穿戴、服用、赠礼、典当这些动作在 engine/daoju.ts。
 *
 * 武功是根本，装备锦上添花。地基第三版验过（docs/foundation.md 第三节第二条）：
 * 一身装备出手、护体各多八分，同档胜率也只到六成一。所以一件装备的数值按「点数」封顶：
 * - 出手、护体、闪避，一个百分点算一点；后天根基一点算一点；内力二十点算一点；
 * - 每件的点数上限看装备位和品级（GEAR_POINTS）。兵器最大，衣次之，冠、靴、佩、饰都小；
 * - 每个装备位只能有它该有的几项（SLOT_STATS）：衣只给护体，靴只给闪避、身法……
 * 数值怎样接进交手：并进「人」（engine/person.ts 的 Person.gear），交手引擎 engine/duel.ts 一行不改。
 */
import type { GameState, GearKey } from '../core/state';
import { itemById } from '../content';
import type { AttrKey, GearGrade, GearSlot, GearStats, ItemDef } from '../content/types';
import type { Gear } from './person';
import { weaponReady } from './wuxue';

/** 纸娃娃上的次序：兵器、冠、衣、靴、佩、饰 */
export const GEAR_KEYS: GearKey[] = ['weapon', 'head', 'body', 'feet', 'waist', 'ring'];
export const GEAR_SLOT: Record<GearKey, GearSlot> = { weapon: '兵器', head: '冠', body: '衣', feet: '靴', waist: '佩', ring: '饰' };
export const keyOfSlot = (slot: GearSlot): GearKey => GEAR_KEYS.find(k => GEAR_SLOT[k] === slot)!;
/** 每个装备位管什么，纸娃娃的底板上显示 */
export const GEAR_ROLE: Record<GearSlot, string> = {
  兵器: '兵刃武功要对得上手里的兵器才使得出；好兵器出手重一些',
  冠: '斗笠、头巾、发冠：少量护体或身法',
  衣: '布衣、皮甲：护体',
  靴: '布鞋、快靴：闪避、身法',
  佩: '玉佩、香囊、腰牌：内力、根基；信物也挂在这里',
  饰: '指环、手镯、护腕：根基'
};

export const GEAR_GRADES: GearGrade[] = ['凡品', '良品', '上品', '绝品', '神品'];
/**
 * 一件装备的点数上限：装备位 × 品级。拿交手引擎量过（tests/daoju.test.ts）：
 * 一身良品顶到上限，同档胜率多七八个点；一身神品顶到上限多十来个点，和地基验过的「一身八分」相当；三流穿上也打不赢一流。
 * 冠、靴、佩、饰到良品就封顶了：小物件再名贵，也只是小物件。
 */
const SMALL: Record<GearGrade, number> = { 凡品: 1, 良品: 2, 上品: 2, 绝品: 2, 神品: 2 };
export const GEAR_POINTS: Record<GearSlot, Record<GearGrade, number>> = {
  兵器: { 凡品: 2, 良品: 3, 上品: 4, 绝品: 5, 神品: 6 },
  衣: { 凡品: 1, 良品: 2, 上品: 3, 绝品: 3, 神品: 4 },
  冠: SMALL, 靴: SMALL, 佩: SMALL, 饰: SMALL
};
/** 每个装备位能有哪几项数值。闪避最值钱，只有靴子给 */
export const SLOT_STATS: Record<GearSlot, (keyof GearStats)[]> = {
  兵器: ['chushou'], 冠: ['huti', 'attr'], 衣: ['huti'], 靴: ['shanbi', 'attr'], 佩: ['neili', 'attr'], 饰: ['attr']
};
/** 多少算一点 */
export const STAT_UNIT: Record<Exclude<keyof GearStats, 'attr'>, number> = { chushou: 1, huti: 1, shanbi: 1, neili: 20 };

/** 一件装备的数值折成几点 */
export function gearPoints(st: GearStats | undefined): number {
  if (!st) return 0;
  let p = 0;
  for (const k of Object.keys(STAT_UNIT) as (keyof typeof STAT_UNIT)[]) p += (st[k] ?? 0) / STAT_UNIT[k];
  for (const v of Object.values(st.attr ?? {})) p += v ?? 0;
  return p;
}

/** 这件装备的点数上限；没写品级的不许有数值 */
export const gearCap = (slot: GearSlot, grade?: GearGrade): number => (grade ? GEAR_POINTS[slot][grade] : 0);

/** 这件东西放得进这个装备位吗 */
export const fitsGear = (it: ItemDef | undefined, key: GearKey): boolean => !!it?.equip && it.equip.slot === GEAR_SLOT[key];

type Worn = { gear?: GameState['gear']; items?: Record<string, number> };
type Body = Worn & Pick<GameState, 'skills' | 'loadout'>;

/** 这个位置上穿着的东西：道具还在、放得进这个位置、行囊里还有（读坏存档、被剧情拿走了都不算） */
export function wornItem(s: Worn, key: GearKey): ItemDef | undefined {
  const id = s.gear?.[key];
  if (!id) return undefined;
  const it = itemById(id);
  if (!fitsGear(it, key)) return undefined;
  if (s.items && !((s.items[id] ?? 0) > 0)) return undefined;
  return it;
}

/** 身上的装备加起来：交给「人」（engine/person.ts）。兵器的出手只在兵刃武功对得上它时才算（拿着刀使拳脚，刀再好也没用） */
export function gearBonus(s: Body): Gear {
  const g: Required<Omit<Gear, 'attr'>> & { attr: Partial<Record<AttrKey, number>> } = { chushou: 0, huti: 0, shanbi: 0, neili: 0, attr: {} };
  for (const k of GEAR_KEYS) {
    const st = wornItem(s, k)?.equip?.stats;
    if (!st || (k === 'weapon' && !weaponReady(s))) continue;
    g.chushou += st.chushou ?? 0;
    g.huti += st.huti ?? 0;
    g.shanbi += st.shanbi ?? 0;
    g.neili += st.neili ?? 0;
    for (const [a, v] of Object.entries(st.attr ?? {}) as [AttrKey, number][]) g.attr[a] = (g.attr[a] ?? 0) + v;
  }
  return g;
}

/** 数值写成一行字：出手 +3% · 护体 +2% · 身法 +1 */
export function statText(st: GearStats | Gear | undefined): string {
  if (!st) return '';
  const out: string[] = [];
  if (st.chushou) out.push(`出手 +${st.chushou}%`);
  if (st.huti) out.push(`护体 +${st.huti}%`);
  if (st.shanbi) out.push(`闪避 +${st.shanbi}%`);
  if (st.neili) out.push(`内力 +${st.neili}`);
  for (const [a, v] of Object.entries(st.attr ?? {})) if (v) out.push(`${a} +${v}`);
  return out.join(' · ');
}
