import { S, fullName } from '../../core/state';
import { dayNo, minLabel } from '../../core/time';
import { foeById, npc, questById, room } from '../../content';
import { curQuest, hopMin, npcName, openExits, pathMin, roomDesc, roomNpcs, roomObjs, travelMin, verbsOf } from '../../engine/world';
import { IC } from '../icons';
import { FEED_TONE, mb } from '../widgets';
import { tierNow } from '../../engine/ren';
import { kanren } from '../../engine/zhaoshi';
import { eyesOn } from '../../engine/yan';
import type { EyeDef } from '../../content/types';
import { fmt } from '../../core/util';
import { XIEJIAO, canWait, nextYue, nightBlock, yueText } from '../../engine/shiguang';
import { shenfenOf } from '../../engine/shenfen';
import { test, textVars } from '../../engine/dsl';

const VERB_CLS: Record<string, string> = { 偷窃: 'danger', 动手: 'strong', 切磋: 'spar', 推门: 'strong' };

export function viewJianghu(): string {
  const all = roomNpcs(S.loc).concat(roomObjs(S.loc));
  const exits = openExits(S.loc);
  if (!S.sel || !all.includes(S.sel)) S.sel = all[0] || null;
  // 刚说完话人就走了（世事推着他离场、跳了河、回去报信）：话留着，不然玩家只看到动态里一行小字（审查 C03）
  const gone = S.reply && !all.includes(S.reply.id) && npc(S.reply.id)
    ? `<section class="card here-card"><div class="detail"><div class="d-h"><b>${npcName(S.reply.id)}</b><small>${npc(S.reply.id)!.obj ? '' : '说完就走了'}</small></div><div class="reply">${S.reply.text}</div></div></section>` : '';
  // 横幅只挂记挂着、还没了结的心事（docs/huojianghu.md 第三节第四条）
  const cq = curQuest();
  const q = cq && (S.quests[S.track] ?? 0) < (questById(S.track)?.stages.length ?? 0) - 1 ? cq : null;
  const feed = S.feed.slice(0, 2).map(e =>
    `<div class="fr${Date.now() - e.n < 2000 ? ' new' : ''}"><span class="tag ${FEED_TONE[e.t] || ''}">${e.t}</span><span>${e.x}</span></div>`).join('');
  // 横幅标签按任务种类：序章、主线（main 开头）、其余都是支线
  const kind = S.track === 'prologue' ? '序章' : S.track.startsWith('main') ? '主线' : '支线';
  const quest = !q ? '' : q.to
    ? `<button class="card quest" data-act="quest"><span class="tag info">${kind}</span><span class="qt">${q.title}</span><span class="qd">${S.loc === q.to ? '就在此处' : '约' + minLabel(travelMin(pathMin(S.loc, q.to)))}</span>${IC.chev}</button>`
    : `<div class="card quest"><span class="tag accent">${kind}</span><span class="qt">${q.title}</span></div>`;
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

/** 歇脚：等到天亮、晌午、傍晚、入夜（人有作息，有的人、有的事只在夜里）。序章里不歇 */
function xiejiaoHTML(): string {
  if (S.chapter === 0) return '';
  // 有的钟点要跨过半夜才等得到：过不了夜时，灰着的按钮底下写明为什么
  const why = XIEJIAO.some(([h]) => !canWait(S, h)) ? nightBlock(S) : null;
  return `<section class="go"><h2>歇脚</h2><div class="acts four">${XIEJIAO.map(([h, l]) =>
    `<button class="act" data-act="xiejiao:${h}"${canWait(S, h) ? '' : ' disabled'}>到${h * 60 <= S.min ? '明日' : ''}${l}</button>`).join('')}</div>${why ? `<p class="muted">${why}</p>` : ''}</section>`;
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
  const look = foe ? `<p class="kanren">你掂了掂${whom}的斤两：<b>${kanren(S, foe).say}</b></p>` : '';
  return `<div class="detail"><div class="d-h"><b>${npcName(id)}</b><span class="tag">${rel}</span><small>${n.hint || n.brief}</small></div>${look}
    <div class="acts">${verbsOf(n).map(v => `<button class="act ${VERB_CLS[v] || ''}" data-act="do:${v}">${v}</button>`).join('')}</div>${reply}</div>`;
}

function exitBtn(d: string, id: string, solo: boolean, questTo?: string): string {
  return `<button class="exit${solo ? ' solo' : ''}" data-act="travel:${id}"><span class="dir">${d}</span><span class="en"><b>${room(id).name}</b><small>${minLabel(travelMin(hopMin(S.loc, id)))}</small></span>${questTo === id ? '<span class="tag info">主线</span>' : ''}</button>`;
}

/** 根基之眼的一行：根基名做标签，后面是看出来的东西（engine/yan.ts） */
export const eyeLine = (e: EyeDef): string => `<p class="eye"><span class="tag eye-${e.attr}">${e.attr}</span><span>${fmt(e.text, textVars())}</span></p>`;
