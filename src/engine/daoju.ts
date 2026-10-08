/**
 * 道具的动作（docs/zhuangbei.md 第四节）：穿戴、服用饮用、细看、赠礼、典当。
 * 规矩：道具的说明里写了能做什么，就真能做到（tests/daoju.test.ts 把关）。
 * 和 engine/dsl.ts 一样直接改全局的 S；界面在 ui/daoju.ts。
 */
import { S, type GearKey } from '../core/state';
import { ITEMS, itemById } from '../content';
import type { ItemDef, ItemKind, NpcDef } from '../content/types';
import { fmt } from '../core/util';
import { newOutcome, pickBranch, run, textVars, type Outcome } from './dsl';
import { warmer } from './renqing';
import { syncGear } from './ren';
import { GEAR_KEYS, fitsGear } from './zhuangbei';

/** 行囊里的次序：装备、药、酒食、杂物、信物 */
export const KIND_ORDER: ItemKind[] = ['装备', '药', '酒食', '杂物', '信物'];
/** 服用、饮用 */
export const USE_VERB: Partial<Record<ItemKind, string>> = { 药: '服用', 酒食: '饮用' };
/** 当铺按买价的几成收 */
export const PAWN_RATE = 0.4;

export const have = (id: string): number => S.items[id] ?? 0;

/** 行囊里看得见的道具，按类排好 */
export const bagItems = (): ItemDef[] =>
  ITEMS.filter(it => have(it.id) > 0 && !it.hidden).sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

/** 穿在哪个位置上；没穿为空 */
export const wornAt = (id: string): GearKey | undefined => GEAR_KEYS.find(k => S.gear[k] === id);

/** 除去身上穿着的那件，行囊里还有几件能拿出手 */
const spare = (id: string): number => have(id) - (wornAt(id) ? 1 : 0);

/* ---------- 穿戴 ---------- */

/** 穿上（id 为空就是卸下）；做不成时返回缘由。上限跟着变，当前气血内力按成数保留 */
export function wear(key: GearKey, id: string | null): string | null {
  if (id) {
    const it = itemById(id);
    if (!it || have(id) < 1) return '行囊里没有这件东西';
    if (!fitsGear(it, key)) return `${it.name}放不进这个位置`;
    S.gear[key] = id;
  } else delete S.gear[key];
  syncGear(S);
  return null;
}

/* ---------- 服用、饮用 ---------- */

/** 现在服不得的缘由（例如气血是满的）；服得就是空 */
export function useBlock(it: ItemDef): string | null {
  if (!it.use?.length || !USE_VERB[it.kind]) return '这件东西不能服用';
  if (have(it.id) < 1) return '行囊里没有了';
  // 只是回气血、内力的，满了就不必吃
  const heals = it.use.flatMap(e => (e.type === 'heal' ? [e] : []));
  if (heals.length === it.use.filter(e => e.type !== 'toast' && e.type !== 'feed').length) {
    const hp = heals.some(e => e.hp || e.hpFrac || e.hpAtLeast), mp = heals.some(e => e.mp || e.mpFrac);
    const hpFull = !hp || S.hp >= S.hpMax, mpFull = !mp || S.mp >= S.mpMax;
    if (hpFull && mpFull) return hp && mp ? '气血、内力都是满的' : hp ? '气血是满的' : '内力是满的';
  }
  return null;
}

/** 服用、饮用：行囊里少一件，执行 use 的效果；返回一句提示（做不成时是缘由） */
export function useItem(id: string): { ok: boolean; text: string; out: Outcome } {
  const it = itemById(id);
  const why = it ? useBlock(it) : '行囊里没有这件东西';
  if (!it || why) return { ok: false, text: why ?? '', out: newOutcome() };
  const hp0 = S.hp, mp0 = S.mp;
  S.items[id] = have(id) - 1;
  const out = run(it.use);
  const got = [S.hp > hp0 ? `气血 +${S.hp - hp0}` : '', S.mp > mp0 ? `内力 +${S.mp - mp0}` : ''].filter(Boolean).join('　');
  return { ok: true, text: `${USE_VERB[it.kind]}${it.name}${got ? '　' + got : ''}`, out };
}

/* ---------- 细看 ---------- */

/** 细看：先是说明，再接上第一个条件成立的分支（线索随剧情变化）；分支可以带效果 */
export function lookItem(id: string): { text: string; more: string; out: Outcome } {
  const it = itemById(id);
  if (!it) return { text: '', more: '', out: newOutcome() };
  const b = pickBranch(it.look);
  const out = b ? run(b.do) : newOutcome();
  return { text: fmt(it.desc, textVars()), more: b?.text ? fmt(b.text, { ...textVars(), ...out.vars }) : '', out };
}

/* ---------- 赠礼 ---------- */

/** 能送人的：信物不送；身上穿着的那一件不送（行囊里另有的可以） */
export const giftable = (it: ItemDef): boolean => it.kind !== '信物' && !it.hidden && spare(it.id) > 0;

/** 送一件礼：送了人物喜欢的（likes），关系升一级；否则客气收下 */
export function giveGift(n: NpcDef, who: string, id: string | undefined): string {
  const it = id ? itemById(id) : undefined;
  if (!it || !giftable(it)) return '你身上没有合适的礼物。';
  S.items[it.id] = have(it.id) - 1;
  if (n.likes?.includes(it.id)) {
    S.rel[n.id] = warmer(S.rel[n.id]);
    return fmt(n.gift ?? `${who}收下了${it.name}，神色和缓了许多。`, textVars());
  }
  return `${who}客客气气地收下了${it.name}，道了声谢。`;
}

/* ---------- 典当 ---------- */

/** 当铺给的价：买价的四成，不足一文的不收；信物、线索不收 */
export const pawnPrice = (it: ItemDef): number => (it.kind === '信物' || it.hidden || !it.price ? 0 : Math.floor(it.price * PAWN_RATE));

/** 人物有没有「典当」：service 里有「当」 */
export const isPawnshop = (n: NpcDef): boolean => !!n.service?.includes('当');

/** 当一件：行囊里少一件，银两按四成进账。身上穿着的最后一件要先卸下 */
export function pawn(who: string, id: string | undefined): string {
  const it = id ? itemById(id) : undefined;
  const p = it ? pawnPrice(it) : 0;
  if (!it || !p || have(it.id) < 1) return `${who}摇摇头：「这东西小号不收。」`;
  if (spare(it.id) < 1) return `${it.name}还在你身上，先卸下来再说。`;
  S.items[it.id] = have(it.id) - 1;
  S.silver += p;
  return `${who}把${it.name}翻来覆去看了一遍，拨了拨算盘，数出钱来。（银两 +${p} 文）`;
}
