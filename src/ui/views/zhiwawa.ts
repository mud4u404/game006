/**
 * 纸娃娃（docs/zhuangbei.md 第三节）：人物页最上方，一个素描的人形，六个装备位绕在四周，空位写「空」。
 * 点一个位置，底板上列出行囊里能放进去的东西（ui/daoju.ts 的 gearSheet），穿上、卸下、细看。
 */
import { S, type GearKey } from '../../core/state';
import { gearBonus, statText, wornItem, GEAR_SLOT } from '../../engine/zhuangbei';
import { weaponReady } from '../../engine/wuxue';

/** 左边冠、衣、靴，右边兵器、饰、佩：大致和身上的高低对得上 */
const LEFT: GearKey[] = ['head', 'body', 'feet'];
const RIGHT: GearKey[] = ['weapon', 'ring', 'waist'];

function slotBtn(k: GearKey): string {
  const it = wornItem(S, k);
  return `<button class="gs${it ? ' on' : ''}" data-act="gearSlot:${k}"><small>${GEAR_SLOT[k]}</small><b${it ? '' : ' class="nil"'}>${it ? it.name : '空'}</b></button>`;
}

/** 人形：穿着东西的部位描上主色 */
function figure(): string {
  const on = (k: GearKey): string => (wornItem(S, k) ? ' on' : '');
  return `<svg class="fig" viewBox="0 0 100 190" aria-hidden="true">
    <path class="p${on('feet')}" d="M36 170h12v10H32a4 4 0 0 1 4-10zM52 170h12a4 4 0 0 1 4 10H52z"/>
    <path class="p${on('body')}" d="M38 50 Q50 46 62 50 L76 60 L84 108 L74 110 L70 84 L74 170 L26 170 L30 84 L26 110 L16 108 L24 60 Z"/>
    <path class="ln" d="M50 52 L44 74 M50 52 L56 74 M30 96 H70"/>
    <circle class="p" cx="50" cy="31" r="13"/>
    ${wornItem(S, 'head') ? '<path class="p on" d="M30 26 L50 11 L70 26 Z"/>' : '<circle class="p" cx="50" cy="16" r="4"/>'}
    ${wornItem(S, 'waist') ? '<circle class="p on" cx="62" cy="103" r="4"/><path class="ln on" d="M62 107 V118"/>' : ''}
    ${wornItem(S, 'ring') ? '<circle class="p on" cx="80" cy="106" r="4"/>' : ''}
    ${wornItem(S, 'weapon') ? '<path class="wp" d="M84 112 L92 40 M80 104 L90 108"/>' : ''}
  </svg>`;
}

/** 人物页的头一张卡片：名字，人形，六个装备位，身上的衣饰一共添了什么 */
export function dollHTML(name: string, who: string): string {
  const sum = statText(gearBonus(S));
  const w = wornItem(S, 'weapon');
  const note = w && !weaponReady(S) && S.loadout.weapon ? `　${w.name}和兵刃位的武功对不上，出手用拳脚。` : '';
  return `<section class="card doll">
    <div class="doll-h"><span class="ava t-accent">沈</span><div class="who"><b>${name}</b><small>${who}</small></div></div>
    <div class="doll-g">
      <div class="doll-c l">${LEFT.map(slotBtn).join('')}</div>
      ${figure()}
      <div class="doll-c">${RIGHT.map(slotBtn).join('')}</div>
    </div>
    <p class="muted">${sum ? '身上的衣饰：' + sum + '。' : '点一个位置换装备。衣饰只是锦上添花，武功才是根本。'}${note}</p>
  </section>`;
}
