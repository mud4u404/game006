/**
 * 道具与纸娃娃的界面（docs/zhuangbei.md 第三、四节）：装备位的底板、细看、服用饮用、赠礼、典当。
 * 规则在 engine/daoju.ts、engine/zhuangbei.ts；这里只画底板、接点击。
 */
import { S, type GearKey } from '../core/state';
import { absMin } from '../core/time';
import { itemById, npc } from '../content';
import type { ItemDef, Verb } from '../content/types';
import { act, npcName } from '../engine/world';
import { bagItems, giftable, have, lookItem, pawnPrice, useBlock, useItem, wear, wornAt, USE_VERB, PAWN_RATE } from '../engine/daoju';
import { GEAR_KEYS, GEAR_ROLE, GEAR_SLOT, fitsGear } from '../engine/zhuangbei';
import { liang } from '../core/util';
import { afterOutcome, closeSheet, openSheet, registerHandlers, render, toast } from './shell';
import { equipLine, itemTags, weaponNote, wearVerb } from './views/xingnang';

/* ---------- 纸娃娃：点一个装备位 ---------- */

export function gearSheet(key: GearKey): string {
  const slot = GEAR_SLOT[key], cur = S.gear[key];
  const cands = bagItems().filter(it => fitsGear(it, key));
  const rows = cands.map(it => {
    const on = it.id === cur;
    const note = weaponNote(it);
    const line = [equipLine(it), note].filter(Boolean).join(' · ');
    return `<div class="item"><button class="ii" data-act="itemLook:${it.id}"><span class="it-h"><b>${it.name}</b>${itemTags(it, false)}</span>
      ${line ? `<small>${line}</small>` : ''}<p>${it.desc}</p></button>
      ${on ? `<button class="use" data-act="gearSet:${key}:">卸下</button>` : `<button class="use" data-act="gearSet:${key}:${it.id}">${wearVerb(it)}</button>`}</div>`;
  }).join('');
  return `<div class="r-h"><span class="tag accent">装备</span><h2>${slot}</h2></div>
    <p class="muted">${GEAR_ROLE[slot]}。数值都小，武功才是根本。</p>
    <div class="rows">${rows || `<p class="muted">行囊里没有能${slot === '兵器' ? '拿在手里' : '放进这里'}的东西。</p>`}</div>
    <button class="btn ghost" data-act="sheetClose">关闭</button>`;
}

/* ---------- 细看 ---------- */

function itemSheet(it: ItemDef, text: string, more: string): string {
  const btns: string[] = [];
  const uv = USE_VERB[it.kind];
  if (it.use && uv) {
    const why = useBlock(it);
    btns.push(`<button class="btn" data-act="itemUse:${it.id}"${why ? ' disabled' : ''}>${why ? why : uv}</button>`);
  }
  if (it.equip) {
    const key = GEAR_KEYS.find(k => GEAR_SLOT[k] === it.equip!.slot)!;
    const on = wornAt(it.id);
    btns.push(`<button class="btn${btns.length ? ' ghost' : ''}" data-act="gearSet:${key}:${on ? '' : it.id}">${on ? '卸下' : wearVerb(it)}</button>`);
  }
  const price = it.kind === '信物' ? '信物：不卖、不送。' : pawnPrice(it) ? `买价 ${it.price} 文，当铺收 ${pawnPrice(it)} 文。` : '';
  const gear = it.equip ? [it.equip.slot, equipLine(it), weaponNote(it)].filter(Boolean).join(' · ') : '';
  return `<div class="r-h"><span class="tags">${itemTags(it)}</span><h2>${it.name}<small class="muted"> ×${have(it.id)}</small></h2></div>
    <p class="sk-d">${text}</p>${more ? `<p class="look">${more}</p>` : ''}
    ${gear || price ? `<p class="muted">${[gear, price].filter(Boolean).join('<br>')}</p>` : ''}
    ${btns.length ? `<div class="btnrow">${btns.join('')}<button class="btn ghost" data-act="sheetClose">关闭</button></div>` : '<button class="btn ghost" data-act="sheetClose">关闭</button>'}`;
}

/* ---------- 赠礼、典当：先挑一件 ---------- */

function giftSheet(id: string): string {
  const who = npcName(id);
  const list = bagItems().filter(giftable);
  const rows = list.map(it => `<div class="item"><div class="ii"><span class="it-h"><b>${it.name}</b>${itemTags(it)}</span><p>${it.desc}</p></div>
    <span class="cnt">×${have(it.id)}</span><button class="use" data-act="gift:${it.id}">送</button></div>`).join('');
  return `<div class="r-h"><span class="tag accent">赠礼</span><h2>送${who}一件东西</h2></div>
    <p class="muted">送对了心意，交情深一层；送的不合心意，人家也只是客气收下。信物不送，身上穿着的那件不送。</p>
    <div class="rows">${rows || '<p class="muted">你身上没有合适的礼物。</p>'}</div>
    <button class="btn ghost" data-act="sheetClose">算了</button>`;
}

function pawnSheet(id: string): string {
  const who = npcName(id);
  const list = bagItems().filter(it => pawnPrice(it) > 0);
  const rows = list.map(it => {
    const last = wornAt(it.id) && have(it.id) < 2;
    return `<div class="item"><div class="ii"><span class="it-h"><b>${it.name}</b>${itemTags(it)}</span><small>买价 ${it.price} 文</small></div>
      <span class="cnt">×${have(it.id)}</span>${last ? '<button class="use" disabled>穿着</button>' : `<button class="use" data-act="pawn:${it.id}">当 ${pawnPrice(it)} 文</button>`}</div>`;
  }).join('');
  return `<div class="r-h"><span class="tag accent">典当</span><h2>${who}</h2></div>
    <p class="muted">当铺按买价的${liang(Math.round(PAWN_RATE * 10))}成收。信物、线索不收；身上穿着的，先卸下来。</p>
    <div class="rows">${rows || '<p class="muted">你身上没有当铺肯收的东西。</p>'}</div>
    <div class="kv"><div><span>银两</span><b>${S.silver} 文</b></div></div>
    <button class="btn ghost" data-act="sheetClose">走了</button>`;
}

/** 赠礼、典当先挑一件东西（人物写了自己的 actions 就照他的来）；挑的底板打开了返回 true */
export function pickItemFirst(id: string, verb: Verb): boolean {
  const n = npc(id);
  if (!n || (verb !== '赠礼' && verb !== '典当') || n.actions[verb]) return false;
  openSheet(verb === '赠礼' ? giftSheet(id) : pawnSheet(id), true);
  return true;
}

/** 做完动作，人物的回话显示在江湖页上 */
function reply(verb: Verb, item: string): void {
  const id = S.sel;
  if (!id) return;
  const { text, out } = act(id, verb, item);
  S.reply = text ? { id, text, at: absMin(S) } : null;
  afterOutcome(out);
  document.querySelector('.reply')?.scrollIntoView({ block: 'nearest' });
}

registerHandlers({
  gearSlot: v => openSheet(gearSheet(v as GearKey), true),
  gearSet: v => {
    const [key, id] = v.split(':') as [GearKey, string];
    const it = id ? itemById(id) : undefined;
    const was = S.gear[key] ? itemById(S.gear[key]!) : undefined;
    const why = wear(key, id || null);
    if (why) { toast(why); return; }
    closeSheet();
    toast(it ? `${wearVerb(it)}${it.name}` : was ? `卸下${was.name}` : '卸下了');
    render();
  },
  itemLook: v => {
    const it = itemById(v);
    if (!it) return;
    const r = lookItem(v);
    if (r.out.story || r.out.fight) { closeSheet(); afterOutcome(r.out, r.text || undefined); return; }
    openSheet(itemSheet(it, r.text, r.more), true);
  },
  itemUse: v => {
    const r = useItem(v);
    toast(r.text);
    if (!r.ok) return;
    closeSheet();
    afterOutcome(r.out);
  },
  gift: v => { closeSheet(); reply('赠礼', v); },
  pawn: v => {
    const before = S.silver;
    reply('典当', v);
    if (S.silver > before) toast(`银两 +${S.silver - before} 文`);
    if (S.sel) openSheet(pawnSheet(S.sel), true);
  }
});
