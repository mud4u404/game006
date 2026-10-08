import { S } from '../../core/state';
import { GRADES } from '../../content';
import { CAT_WEAPON } from '../../content/skills';
import type { ItemDef } from '../../content/types';
import { KIND_ORDER, USE_VERB, bagItems, have, useBlock, wornAt } from '../../engine/daoju';
import { GEAR_KEYS, GEAR_SLOT, statText } from '../../engine/zhuangbei';
import { slotSkill } from '../../engine/wuxue';

/**
 * 行囊：按类分组（装备、药、酒食、杂物、信物）。点道具细看；药服用、酒食饮用、装备穿戴（docs/zhuangbei.md 第四节）。
 * 处理函数在 ui/daoju.ts。
 */
export function viewXingnang(): string {
  const items = bagItems();
  const groups = KIND_ORDER.map(k => {
    const list = items.filter(it => it.kind === k);
    return list.length ? `<div class="rq-g">${k}</div>${list.map(row).join('')}` : '';
  }).join('');
  return `<section class="card"><div class="rows bag">${groups || '<p class="muted">行囊里空空如也。</p>'}</div>
    <p class="muted">点道具细看。信物不卖、不送；当铺按买价的四成收别的东西。</p></section>
    <section class="card"><div class="kv"><div><span>银两</span><b>${S.silver} 文</b></div></div></section>`;
}

/** 一行：左边点开细看，右边是最常用的那个动作 */
function row(it: ItemDef): string {
  const uv = USE_VERB[it.kind];
  let btn = `<button class="use ghost" data-act="itemLook:${it.id}">细看</button>`;
  if (it.use && uv) {
    const why = useBlock(it);
    btn = `<button class="use" data-act="itemUse:${it.id}"${why ? ` disabled title="${why}"` : ''}>${uv}</button>`;
  } else if (it.equip) {
    const key = GEAR_KEYS.find(k => GEAR_SLOT[k] === it.equip!.slot)!;
    const on = wornAt(it.id);
    btn = `<button class="use" data-act="gearSet:${key}:${on ? '' : it.id}">${on ? '卸下' : wearVerb(it)}</button>`;
  }
  // 兵器：拿起来之前先说清楚兵刃位的武功使不使得出
  const note = it.equip?.slot === '兵器' && !wornAt(it.id) ? weaponNote(it) : '';
  const sub = it.equip ? `<small>${[it.equip.slot, equipLine(it), note].filter(Boolean).join(' · ')}</small>` : '';
  return `<div class="item"><button class="ii" data-act="itemLook:${it.id}"><span class="it-h"><b>${it.name}</b>${itemTags(it, false)}</span>${sub}<p>${it.desc}</p></button>
    <span class="cnt">×${have(it.id)}</span>${btn}</div>`;
}

/* ---------- 道具的几样小部件：行囊页、纸娃娃的底板（ui/daoju.ts）共用 ---------- */

const GRADE_CLS: Record<string, string> = Object.fromEntries(GRADES);

/** 类、品级、穿在哪里的小标签；行囊里已经按类分了组，就不再标类 */
export function itemTags(it: ItemDef, kind = true): string {
  const t: string[] = kind ? [`<span class="tag">${it.kind}</span>`] : [];
  if (it.equip?.grade) t.push(`<span class="tag g-${GRADE_CLS[it.equip.grade]}">${it.equip.grade}</span>`);
  const at = wornAt(it.id);
  if (at) t.push(`<span class="tag accent">${it.equip?.slot === '兵器' ? '在手' : '穿着'} · ${GEAR_SLOT[at]}</span>`);
  return t.join('');
}

/** 穿戴的说法：兵器拿起，佩饰佩戴，衣帽鞋穿戴 */
export const wearVerb = (it: ItemDef): string => (it.equip?.slot === '兵器' ? '拿起' : it.equip?.slot === '佩' || it.equip?.slot === '饰' ? '佩戴' : '穿戴');

/** 一件装备写成一行字：兵器的类型长短、数值 */
export function equipLine(it: ItemDef): string {
  const e = it.equip;
  if (!e) return '';
  const parts: string[] = [];
  if (e.weapon) parts.push(`${e.weapon} · ${e.reach === '长' ? '长兵' : e.reach === '短' ? '短兵' : '徒手'}`);
  const st = statText(e.stats);
  if (st) parts.push(st);
  else if (it.kind === '信物') parts.push('不添数值');
  return parts.join(' · ');
}

/** 拿这件兵器，兵刃位的武功使不使得出 */
export function weaponNote(it: ItemDef): string {
  const w = slotSkill(S, 'weapon');
  if (it.equip?.slot !== '兵器' || !w) return '';
  return CAT_WEAPON[w.category] === it.equip.weapon ? `兵刃位的「${w.name}」使得出` : `兵刃位的「${w.name}」使不出，只能用拳脚`;
}
