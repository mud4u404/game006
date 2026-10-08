/**
 * 出关邸报：闭关出来、下线回来，先读这一页（docs/foundation.md 第三节第十条）。
 * 这几日长进了什么、伤养好了没有、江湖上在传什么、有没有约。不看也不罚，只有自己答应过的约会过期。
 */
import { S, pushFeed, save } from '../core/state';
import { fullDate } from '../core/time';
import { $, liang } from '../core/util';
import { room } from '../content';
import { ZONE_NAME } from '../engine/duel';
import { gongliText } from '../engine/ren';
import { nextYue, settleAway, skillName, yueText, type RestReport } from '../engine/shiguang';
import { inFight } from './fight';
import { openSheet, render } from './shell';

const hoursText = (h: number): string => {
  // 现实一小时是半个时辰；说「几个时辰」
  const sc = Math.round(h / 2);
  return sc < 1 ? '不到一个时辰' : sc >= 24 ? `${liang(Math.round(sc / 12))}日有余` : `${liang(sc)}个时辰`;
};

/** 邸报的正文；head 是开头的一句 */
export function chuguanHTML(r: RestReport, head: string, title: string, stop?: string): string {
  const healTxt = Object.entries(r.healed).map(([z, n]) => `${ZONE_NAME[z as 'hand']}伤好了${liang(n as number)}级`).join('、');
  const chips = [
    `<span class="tag ${r.used ? 'accent' : ''}">${r.used ? `消化历练 ${r.used}` : '没有历练可消化，闭门造车'}</span>`,
    ...r.gains.map(([k, v]) => `<span class="tag accent">${skillName(k)} +${v}</span>`),
    ...r.breaks.map(x => `<span class="tag info">${x}</span>`),
    r.gongli > 0 ? `<span class="tag accent">功力深到${gongliText(S.gongli)}</span>` : '',
    healTxt ? `<span class="tag">${healTxt}</span>` : '',
    r.zouhuo ? `<span class="tag danger">走火${liang(r.zouhuo)}次，功力损了</span>` : '',
    r.lodging === 'inn' ? `<span class="tag">住店 −${r.cost} 文</span>` : '<span class="tag warn">钱不够住店，露宿了几夜，伤好得慢</span>'
  ].filter(Boolean);
  const y = nextYue(S);
  const lines: string[] = [];
  if (S.xinmo.n >= 0.5) lines.push(`<div><span class="tag danger">心魔</span><span>心中有愧（${S.xinmo.why}），静修难进。还了这份情、了却这件事，才化得开。</span></div>`);
  for (const m of r.missed) lines.push(`<div><span class="tag danger">失约</span><span>${m}</span></div>`);
  if (y) lines.push(`<div><span class="tag warn">有约</span><span>${yueText(S, y)}</span></div>`);
  for (const n of r.news) lines.push(`<div><span class="tag warn">传闻</span><span>${n}</span></div>`);
  return `<div class="r-h"><span class="tag accent">出关</span><h2>${title}</h2></div>
    <p class="story">${head}</p>
    ${stop ? `<p class="muted">${stop}</p>` : ''}
    <div class="rewards">${chips.join('')}</div>
    ${lines.length ? `<div class="r-sub">江湖邸报</div><div class="news">${lines.join('')}</div>` : ''}
    <button class="btn" data-act="sheetClose">出关</button>`;
}

/** 下线回来的开头一句 */
export function awayHead(r: RestReport & { hours: number }): string {
  return `你离开了${hoursText(r.hours)}，在${room(S.loc).name}静修了${liang(r.days)}日。今日是${fullDate(S)}。`;
}

/** 下线回来（从标题画面继续、切回这个页面）：离开的时辰算成静修，出一页邸报。正在打、正在看剧情、开着别的页时不算 */
export function welcomeBack(): boolean {
  if (inFight() || !$('#storyLayer')?.hidden || !$('#titleLayer')?.hidden || !$('#sheetLayer')?.hidden) return false;
  const rep = settleAway(S);
  if (!rep) { save(); return false; }
  const stop = rep.why === 'yue' && rep.yue ? `约期到了，今日一早出关：${yueText(S, rep.yue)}。` : rep.why === 'tielv' ? '江湖跑不过现实：这几日江湖上的日子已经走在前头，只修了这些。' : undefined;
  pushFeed('出关', `静修${liang(rep.days)}日${rep.used ? `，消化历练 ${rep.used}` : ''}${rep.gongli > 0 ? `，功力深到${gongliText(S.gongli)}` : ''}。`);
  save();
  render();
  openSheet(chuguanHTML(rep, awayHead(rep), `静修${liang(rep.days)}日`, stop));
  return true;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if ($('#titleLayer')?.hidden) save(); return; }
  welcomeBack();
});
