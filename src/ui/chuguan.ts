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
import { tierCheck, tupoAdd, tupoTake } from '../engine/tupo';
import { inFight } from './fight';
import { canRetreat, powerNow } from '../engine/jiemian';
import { openSheet, render } from './shell';
import { tupoBlockHTML } from './tupo';

const hoursText = (h: number): string => {
  // 现实一小时是半个时辰；说「几个时辰」
  const sc = Math.round(h / 2);
  return sc < 1 ? '不到一个时辰' : sc >= 24 ? `${liang(Math.round(sc / 12))}日有余` : `${liang(sc)}个时辰`;
};

/** 邸报的正文；head 是开头的一句 */
export function chuguanHTML(r: RestReport, head: string, title: string, stop?: string, power0?: number): string {
  // 这一回出关长的境界、档次、新学的武功，攒在 engine/tupo.ts 里，合成最上面的一块「突破」；
  // 这里取走，出关后就不会再另外弹一张卡
  tierCheck();
  r.breaks.forEach(x => tupoAdd('zhong', x));
  const tupo = tupoBlockHTML(tupoTake());
  const healTxt = Object.entries(r.healed).map(([z, n]) => `${ZONE_NAME[z as 'hand']}伤好了${liang(n as number)}级`).join('、');
  const chips = [
    `<span class="tag ${r.used ? 'accent' : ''}">${r.used ? `历练 ${S.lilian + r.used} → ${S.lilian}` : r.grow === 0 ? '这几日功夫没有长进，伤却养好了些' : '身上没有可化的历练，白坐了几日'}</span>`,
    ...r.gains.map(([k, v]) => `<span class="tag accent">${skillName(k)} +${v}</span>`),
    // 战力变了写「旧 → 新」（engine/jiemian.ts），没变不写
    power0 !== undefined && power0 !== powerNow() ? `<span class="tag accent">战力 ${power0} → ${powerNow()}</span>` : '',
    canRetreat() ? '<span class="tag">历练还够，可再去闭关</span>' : '',
    // 写长了多少：原来三回出关都写「功力深到三年」，看着像一点没长（审查 G12）
    r.gongli > 0 ? `<span class="tag accent">功力深了${r.gongli >= 1 ? gongliText(r.gongli) : `${cn(Math.max(1, Math.round(r.gongli * 12)))}个月`}（如今${gongliText(S.gongli)}）</span>`
      // 功力熬到了这一重内功的顶：写明白，别让人以为白闭关了（审查 G11）
      : S.gongli >= gongliCeiling(S) - 1e-6 ? `<span class="tag warn">功力已到这一重内功的顶（${gongliText(S.gongli)}），要再深，先把内功往上练一重</span>` : '',
    healTxt ? `<span class="tag">${healTxt}</span>` : '',
    r.zouhuo ? `<span class="tag danger">走火${liang(r.zouhuo)}次，功力损了</span>` : '',
    r.lodging === 'home' ? `<span class="tag">住在师门，不花钱</span>`
      : r.lodging === 'lusu' ? `<span class="tag warn">露宿${cn(r.lusuDays)}夜，不费钱，只是风露侵人，睡不安稳，参悟慢了几分</span>`
      : !r.lusuDays ? `<span class="tag">住店 −${r.cost} 文</span>`
      : `<span class="tag warn">${r.cost ? `住店 −${r.cost} 文，` : ''}钱不够，露宿了${cn(r.lusuDays)}夜，睡不安稳，风露侵人，参悟慢了几分</span>`
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
    ${tupo}
    <p class="story">${head}</p>
    ${stop ? `<p class="muted">${stop}</p>` : ''}
    <div class="rewards">${chips.join('')}</div>
    ${baoBlock(lines)}
    <button class="btn" data-act="sheetClose">出关</button>`;
}

/** 邸报那一块（出关、歇脚醒来共用）：没有一条就不画 */
const baoBlock = (lines: string[]): string => lines.length ? `<div class="r-sub">江湖邸报</div><div class="news">${lines.join('')}</div>` : '';

/**
 * 歇脚醒来的邸报（engine/shiguang.ts 的 xiejiaoBao）：一夜过去，江湖上几条世事，外加某人惦记着你；
 * 有约的、失了约的照样写。和出关邸报同一块（baoBlock），只是不带长进、住处这些闭关才有的东西
 */
export function xingLaiHTML(bao: { news: string[]; nian?: string; missed?: string[] }, head: string): string {
  const y = nextYue(S);
  const lines = [
    ...(bao.missed ?? []).map(m => `<div><span class="tag danger">失约</span><span>${m}</span></div>`),
    ...(y ? [`<div><span class="tag warn">有约</span><span>${yueText(S, y)}</span></div>`] : []),
    ...bao.news.map(n => `<div><span class="tag warn">传闻</span><span>${n}</span></div>`),
    ...(bao.nian ? [`<div><span class="tag accent">惦记</span><span>${bao.nian}</span></div>`] : [])
  ];
  return `<div class="r-h"><span class="tag accent">歇脚</span><h2>醒来</h2></div>
    <p class="story">${head}</p>
    ${baoBlock(lines)}
    <button class="btn" data-act="sheetClose">起身</button>`;
}

/** 下线回来的开头一句 */
export function awayHead(r: RestReport & { hours: number }): string {
  return `你离开了${hoursText(r.hours)}，在${room(S.loc).name}静修了${liang(r.days)}日。今日是${fullDate(S)}。`;
}

/** 下线回来（从标题画面继续、切回这个页面）：离开的时辰算成静修，出一页邸报。正在打、正在看剧情、开着别的页时不算 */
export function welcomeBack(): boolean {
  if (inFight() || !$('#storyLayer')?.hidden || !$('#titleLayer')?.hidden || !$('#sheetLayer')?.hidden) return false;
  const power0 = powerNow();
  const rep = settleAway(S);
  if (!rep) { save(); return false; }
  // 约的内容下面「有约」那一行会写，这里不再重复（审查 G27）
  const stop = rep.why === 'yue' && rep.yue ? '约期到了，今日一早出关。' : rep.why === 'tielv' ? (rep.grow ? `其中${liang(rep.grow)}日修为有长进；余下的日子，${TIELV_TEXT}` : TIELV_TEXT) : undefined;
  pushFeed('出关', `静修${liang(rep.days)}日${rep.used ? `，消化历练 ${rep.used}` : ''}${rep.gongli > 0 ? `，功力深到${gongliText(S.gongli)}` : ''}。`);
  // 先拼邸报（取走这回的突破），再画页面：不然 render 先把突破弹成另一张卡
  const html = chuguanHTML(rep, awayHead(rep), `静修${liang(rep.days)}日`, stop, power0);
  save();
  render();
  openSheet(html);
  return true;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if ($('#titleLayer')?.hidden) save(); return; }
  welcomeBack();
});
