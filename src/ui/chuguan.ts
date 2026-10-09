/**
 * 出关邸报：闭关出来、下线回来，先读这一页（docs/foundation.md 第三节第十条）。
 * 这几日长进了什么、伤养好了没有、江湖上在传什么、有没有约。不看也不罚，只有自己答应过的约会过期。
 */
import { S, pushFeed, save } from '../core/state';
import { fullDate } from '../core/time';
import { $, cn, liang } from '../core/util';
import { room } from '../content';
import { ZONE_NAME } from '../engine/duel';
import { gongliText } from '../engine/ren';
import { gongliCeiling } from '../engine/lilian';
import { TIELV_TEXT, nextYue, settleAway, skillName, xinmoLine, yueText, type RestReport } from '../engine/shiguang';
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
    // 写长了多少：原来三回出关都写「功力深到三年」，看着像一点没长（审查 G12）
    r.gongli > 0 ? `<span class="tag accent">功力深了${r.gongli >= 1 ? gongliText(r.gongli) : `${cn(Math.max(1, Math.round(r.gongli * 12)))}个月`}（如今${gongliText(S.gongli)}）</span>`
      // 功力熬到了这一重内功的顶：写明白，别让人以为白闭关了（审查 G11）
      : S.gongli >= gongliCeiling(S) - 1e-6 ? `<span class="tag warn">功力已到这一重内功的顶（${gongliText(S.gongli)}），要再深，先把内功往上练一重</span>` : '',
    healTxt ? `<span class="tag">${healTxt}</span>` : '',
    r.zouhuo ? `<span class="tag danger">走火${liang(r.zouhuo)}次，功力损了</span>` : '',
    r.lodging === 'home' ? `<span class="tag">住在师门，不花钱</span>`
      : r.lodging === 'lusu' ? `<span class="tag warn">露宿${cn(r.lusuDays)}夜，不花钱，睡不安稳，打坐参悟打八折</span>`
      : !r.lusuDays ? `<span class="tag">住店 −${r.cost} 文</span>`
      : `<span class="tag warn">${r.cost ? `住店 −${r.cost} 文，` : ''}钱不够，露宿了${cn(r.lusuDays)}夜，睡不安稳，打坐参悟打了折</span>`
  ].filter(Boolean);
  const y = nextYue(S);
  const lines: string[] = [];
  // 重伤闭关养不好（engine/shang.ts）：出关时说清楚去哪儿治
  const heavy = (['hand', 'foot', 'inner'] as const).filter(z => S.wounds[z] >= 2);
  if (heavy.length) lines.push(`<div><span class="tag danger">重伤</span><span>${heavy.map(z => ZONE_NAME[z]).join('、')}的伤还重。重伤闭关养不好，要找郎中看伤，或者服药（跌打酒治手足，内伤药治内息）。</span></div>`);
  if (S.xinmo.n >= 0.5) lines.push(`<div><span class="tag danger">心魔</span><span>${xinmoLine()}</span></div>`);
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
  // 约的内容下面「有约」那一行会写，这里不再重复（审查 G27）
  const stop = rep.why === 'yue' && rep.yue ? '约期到了，今日一早出关。' : rep.why === 'tielv' ? (rep.grow ? `其中${liang(rep.grow)}日修为有长进；余下的日子，${TIELV_TEXT}` : TIELV_TEXT) : undefined;
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
