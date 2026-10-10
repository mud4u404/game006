/**
 * 「突破」卡的写法（只拼文字，不碰页面，测试直接读）：
 * 升重、升档、习得，一次结算里碰到几件就合成一张卡；闭关出关的邸报最上面是同一块（tupoBlockHTML）。
 */
import { TUPO_TAG, type Tupo } from '../engine/tupo';

/** 一行一件：标签（升档、升重、新学）加原文 */
const rowsHTML = (items: Tupo[]): string =>
  items.map(x => `<div><span class="tag accent">${TUPO_TAG[x.kind]}</span><span>${x.text}</span></div>`).join('');

/** 闭关邸报最上面那一块；没有突破就不出 */
export const tupoBlockHTML = (items: Tupo[]): string =>
  items.length ? `<div class="tupo-blk"><div class="tupo-h">突破</div><div class="news">${rowsHTML(items)}</div></div>` : '';

/** 弹出来的整张卡（点一下按钮，或点外面的遮罩就关） */
export const tupoCardHTML = (items: Tupo[]): string =>
  `<div class="tupo"><div class="tupo-mark" aria-hidden="true">突破</div>
    <div class="news" role="status">${rowsHTML(items)}</div>
    <button class="btn" data-act="sheetClose">知道了</button></div>`;
