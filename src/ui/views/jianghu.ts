import { S, fullName } from '../../core/state';
import { dayNo, minLabel } from '../../core/time';
import { foeById, npc, room } from '../../content';
import { curQuest, hopMin, npcName, pathMin, roomDesc, roomNpcs, roomObjs, travelMin, verbsOf } from '../../engine/world';
import { IC } from '../icons';
import { FEED_TONE, mb } from '../widgets';
import { tierNow } from '../../engine/ren';
import { kanren } from '../../engine/zhaoshi';
import { nextYue, yueText } from '../../engine/shiguang';
import { shenfenOf } from '../../engine/shenfen';
import { test } from '../../engine/dsl';

const VERB_CLS: Record<string, string> = { 偷窃: 'danger', 动手: 'strong', 切磋: 'spar', 推门: 'strong' };

export function viewJianghu(): string {
  const r = room(S.loc);
  const all = roomNpcs(S.loc).concat(roomObjs(S.loc));
  if (!S.sel || !all.includes(S.sel)) { S.sel = all[0] || null; S.reply = null; }
  const q = curQuest();
  const feed = S.feed.slice(0, 2).map(e =>
    `<div class="fr${Date.now() - e.n < 2000 ? ' new' : ''}"><span class="tag ${FEED_TONE[e.t] || ''}">${e.t}</span><span>${e.x}</span></div>`).join('');
  // 横幅标签按任务种类：序章、主线（main 开头）、其余都是支线
  const kind = S.track === 'prologue' ? '序章' : S.track.startsWith('main') ? '主线' : '支线';
  const quest = !q ? '' : q.to
    ? `<button class="card quest" data-act="quest"><span class="tag info">${kind}</span><span class="qt">${q.title}</span><span class="qd">${S.loc === q.to ? '就在此处' : '约' + minLabel(travelMin(pathMin(S.loc, q.to)))}</span>${IC.chev}</button>`
    : `<div class="card quest"><span class="tag accent">${kind}</span><span class="qt">${q.title}</span></div>`;
  const questBar = `<div class="quest-row">${quest}<button class="qb-btn" data-act="questbook" aria-label="任务簿" title="任务簿">${IC.quest}</button></div>`;
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
  <section class="card scene"><p class="desc">${roomDesc(S.loc)}</p>${feed ? `<div class="feed">${feed}</div>` : ''}</section>
  ${all.length ? `<section class="card here">
    <div class="sec-h"><h2>此处</h2><span class="count">${all.length}</span></div>
    <div class="avas">${all.map(avaBtn).join('')}</div>
    ${S.sel ? detail(S.sel) : ''}
  </section>` : ''}
  <section class="go"><h2>去处</h2><div class="exits">${r.exits.map(([d, id]) => exitBtn(d, id, r.exits.length === 1, q?.to)).join('')}</div></section>`;
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
  const whom = foe && foe.name !== npcName(id) ? foe.name : '他';
  const look = foe ? `<p class="kanren">你掂了掂${whom}的斤两：<b>${kanren(S, foe).say}</b></p>` : '';
  return `<div class="detail"><div class="d-h"><b>${npcName(id)}</b><span class="tag">${rel}</span><small>${n.hint || n.brief}</small></div>${look}
    <div class="acts">${verbsOf(n).map(v => `<button class="act ${VERB_CLS[v] || ''}" data-act="do:${v}">${v}</button>`).join('')}</div>${reply}</div>`;
}

function exitBtn(d: string, id: string, solo: boolean, questTo?: string): string {
  return `<button class="exit${solo ? ' solo' : ''}" data-act="travel:${id}"><span class="dir">${d}</span><span class="en"><b>${room(id).name}</b><small>${minLabel(travelMin(hopMin(S.loc, id)))}</small></span>${questTo === id ? '<span class="tag info">主线</span>' : ''}</button>`;
}
