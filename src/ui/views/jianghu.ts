import { S, fullName } from '../../core/state';
import { dayNo, minLabel } from '../../core/time';
import { foeById, npc, room } from '../../content';
import { hopMin, npcName, openExits, pathMin, roomDesc, roomNpcs, roomObjs, travelMin, verbGain, verbPoor, verbPrice, verbsOf } from '../../engine/world';
import { IC } from '../icons';
import { FEED_TONE, mb } from '../widgets';
import { tierNow } from '../../engine/ren';
import { leadsNear, questNav } from '../../engine/daohang';
import { kanren } from '../../engine/zhaoshi';
import { eyesOn } from '../../engine/yan';
import type { EyeDef, Verb } from '../../content/types';
import { cn, fmt } from '../../core/util';
import { XIEJIAO, crossesNight, nextYue, nightWarn, yueText } from '../../engine/shiguang';
import { shenfenOf } from '../../engine/shenfen';
import { verbChufa } from '../../engine/chufa';
import { test, textVars } from '../../engine/dsl';

const VERB_CLS: Record<string, string> = { 偷窃: 'danger', 动手: 'strong', 切磋: 'spar', 推门: 'strong' };

export function viewJianghu(): string {
  const all = roomNpcs(S.loc).concat(roomObjs(S.loc));
  const exits = openExits(S.loc);
  if (!S.sel || !all.includes(S.sel)) S.sel = all[0] || null;
  // 刚说完话人就走了（世事推着他离场、跳了河、回去报信）：话留着，不然玩家只看到动态里一行小字（审查 C03）
  const gone = S.reply && !all.includes(S.reply.id) && npc(S.reply.id)
    ? `<section class="card here-card"><div class="detail"><div class="d-h"><b>${npcName(S.reply.id)}</b><small>${npc(S.reply.id)!.obj ? '' : '说完就走了'}</small></div><div class="reply">${S.reply.text}</div></div></section>` : '';
  // 横幅只挂记挂着、还没了结的心事（docs/huojianghu.md 第三节第四条）；要等、卡住的写一句缘故（engine/daohang.ts）
  const nav = S.track ? questNav(S.track) : null;
  const q = nav && (nav.state === '能做' || nav.state === '要等' || nav.state === '卡住') ? nav : null;
  const feed = S.feed.slice(0, 2).map(e =>
    `<div class="fr${Date.now() - e.n < 2000 ? ' new' : ''}"><span class="tag ${FEED_TONE[e.t] || ''}">${e.t}</span><span>${e.x}</span></div>`).join('');
  // 横幅标签按任务种类：序章、主线（main 开头）、其余都是支线
  const kind = S.track === 'prologue' ? '序章' : S.track.startsWith('main') ? '主线' : '支线';
  // 眼下去不成的缘故另起一行，写成心里话（engine/daohang.ts：不剧透、不讲解）
  const why = q && q.state !== '能做' ? `<small class="qs">${q.why}</small>` : '';
  const dist = q?.to && q.state === '能做' ? `<span class="qd">${q.dist === 0 ? '就在此处' : '约' + minLabel(q.dist)}</span>` : '';
  const quest = !q ? '' : q.to
    ? `<button class="card quest" data-act="quest"><span class="tag info">${kind}</span><span class="qt">${q.title}${why}</span>${dist}${IC.chev}</button>`
    : `<button class="card quest" data-act="questbook"><span class="tag accent">${kind}</span><span class="qt">${q.title}${why}</span></button>`;
  const questBar = `<div class="quest-row">${quest}<button class="qb-btn" data-act="questbook" aria-label="见闻" title="见闻">${IC.quest}</button></div>`;
  // 约：三日之内的，挂在任务下面提个醒（engine/shiguang.ts）
  const y = nextYue(S);
  // 点了就赶去约定的地方
  const yueBar = !y || y.due - dayNo(S) > 3 ? '' : S.loc === y.at
    ? `<div class="card quest"><span class="tag warn">有约</span><span class="qt">${yueText(S, y)}</span><span class="qd">就在此处</span></div>`
    : `<button class="card quest" data-act="travel:${y.at}"><span class="tag warn">有约</span><span class="qt">${yueText(S, y)}</span><span class="qd">约${minLabel(travelMin(pathMin(S.loc, y.at)))}</span>${IC.chev}</button>`;
  const who = S.chapter === 0 ? '渔家少年' : S.title ? '「' + S.title + '」' : shenfenOf(S).name + ' · ' + tierNow(S).name;
  return `
  <section class="card status">
    <span class="ava t-accent">沈</span>
    <div class="who"><b>${fullName()}</b><small>${who}</small></div>
    <div class="minibars">${mb('气血', S.hp, S.hpMax, 'hp')}${mb('内力', S.mp, S.mpMax, 'mp')}</div>
  </section>
  ${questBar}
  ${yueBar}
  ${leadsCard()}
  <section class="card scene"><p class="desc">${roomDesc(S.loc)}</p>${eyesOn({ room: S.loc }).map(eyeLine).join('')}${feed ? `<div class="feed">${feed}</div>` : ''}</section>
  ${gone}
  ${all.length ? `<section class="card here-card">
    <div class="sec-h"><h2>此处</h2><span class="count">${all.length}</span></div>
    <div class="avas">${all.map(avaBtn).join('')}</div>
    ${S.sel ? detail(S.sel) : ''}
  </section>` : ''}
  <section class="go"><h2>去处</h2><div class="exits">${exits.map(([d, id]) => exitBtn(d, id, exits.length === 1, q?.to)).join('')}</div></section>
  ${xiejiaoHTML()}`;
}

/** 近处有事：眼下接得到的差事，派差的人在哪、约多久（差事最多三行，另可添一条零工；点了先看耗时再走）。不推你去做，只是告诉你哪里有事 */
function leadsCard(): string {
  if (S.chapter === 0) return '';
  const ls = leadsNear();
  if (!ls.length) return '';
  return `<section class="card leads"><div class="sec-h"><h2>近处有事</h2></div>${ls.map(l => `<button class="lead" data-act="travelAsk:${l.to}"><span class="lt">${l.text}</span><span class="ld">${l.toName} · 约${minLabel(l.min)}</span>${IC.chev}</button>`).join('')}</section>`;
}

/** 歇脚：等到天亮、晌午、傍晚、入夜（人有作息，有的人、有的事只在夜里）。序章里不歇 */
function xiejiaoHTML(): string {
  if (S.chapter === 0) return '';
  // 跨过半夜会误了今日的约：按钮照样能点，先问一句（10-09 试玩：原来全灰，玩家只能空点熬夜）
  const warn = nightWarn(S);
  const late = (h: number): boolean => !!warn && crossesNight(S, h);
  return `<section class="go"><h2>歇脚</h2><div class="acts four">${XIEJIAO.map(([h, l]) =>
    `<button class="act" data-act="${late(h) ? 'xiejiaoAsk' : 'xiejiao'}:${h}">到${h * 60 <= S.min ? '明日' : ''}${l}</button>`).join('')}</div>${XIEJIAO.some(([h]) => late(h)) ? `<p class="muted">${warn}歇过半夜就误了。</p>` : ''}</section>`;
}

function avaBtn(id: string): string {
  const n = npc(id);
  if (!n) return '';
  const inner = n.obj
    ? `<span class="ava sq t-gray">${IC[n.icon || 'stele']}</span>`
    : `<span class="ava t-${n.tone || 'gray'}">${n.ini || n.name[0]}${n.count ? `<span class="badge">${n.count}</span>` : ''}</span>`;
  return `<button class="avab" data-act="sel:${id}" aria-pressed="${S.sel === id}">${inner}<span class="nm">${npcName(id)}</span></button>`;
}

function detail(id: string): string {
  const n = npc(id);
  if (!n) return '';
  const rel = n.obj ? '物品' : (S.rel[id] || '素不相识');
  const reply = S.reply && S.reply.id === id ? `<div class="reply">${S.reply.text}</div>` : '';
  // 看人：点了会开打的动作（动手、切磋、试镖、交镖……），先替你掂一掂对手的斤两（engine/zhaoshi.ts 的 kanren）。
  // 对手不是眼前这人（交镖时劫道的、试镖时陪练的），写明是谁
  const vs = verbsOf(n), order = [...vs.filter(v => v === '动手' || v === '切磋'), ...vs.filter(v => v !== '动手' && v !== '切磋')];
  const fid = order.map(v => (n.actions[v] ?? []).find(b => test(b.if))?.do?.find(e => e.type === 'fight')).find(Boolean);
  const foe = fid && fid.type === 'fight' ? foeById(fid.foe) : undefined;
  // 对手就是眼前这人时一律写「他」：不认识的「青衫书生」不能先漏出「柳寒舟」（审查 G41）
  const whom = foe && foe.id !== id && foe.name !== npcName(id) ? foe.name : '他';
  // 揭榜、接镖、接差事：点之前先说一声眼下的状态（带伤、气血、内力、钱），只提示，不拦（engine/chufa.ts）
  const chufa = verbChufa(id);
  const look = foe ? `<p class="kanren">你掂了掂${whom}的斤两：<b>${kanren(S, foe).say}</b></p>` : '';
  return `<div class="detail"><div class="d-h"><b>${npcName(id)}</b><span class="tag">${rel}</span><small>${n.hint || n.brief}</small></div>${look}
    <div class="acts">${verbsOf(n).map(verbBtn(id)).join('')}</div>${chufa ? `<p class="muted chufa">${chufa}</p>` : ''}${reply}</div>`;
}

/** 动作按钮：要花钱的，价钱写在底下；钱不够的灰着，写明差在哪（试玩第三轮：买卖不再点了才知道价钱） */
const verbBtn = (id: string) => (v: Verb): string => {
  const price = verbPrice(id, v);
  const poor = price !== null && S.silver < price && verbPoor(id, v);
  // 能挣钱的（揭榜的赏钱、零工的工钱）：报酬和耗时写在底下，点之前就知道
  const gain = price === null ? verbGain(id, v) : null;
  const sub = price !== null ? `${poor ? '囊中不足，要' : ''}${cn(price)}文` : gain;
  return `<button class="act ${VERB_CLS[v] || ''}${sub ? ' priced' : ''}" data-act="do:${v}"${poor ? ' disabled' : ''}>${v}${sub ? `<small>${sub}</small>` : ''}</button>`;
};

function exitBtn(d: string, id: string, solo: boolean, questTo?: string): string {
  return `<button class="exit${solo ? ' solo' : ''}" data-act="travel:${id}"><span class="dir">${d}</span><span class="en"><b>${room(id).name}</b><small>${minLabel(travelMin(hopMin(S.loc, id)))}</small></span>${questTo === id ? '<span class="tag info">主线</span>' : ''}</button>`;
}

/** 根基之眼的一行：根基名做标签，后面是看出来的东西（engine/yan.ts） */
export const eyeLine = (e: EyeDef): string => `<p class="eye"><span class="tag eye-${e.attr}">${e.attr}</span><span>${fmt(e.text, textVars())}</span></p>`;
