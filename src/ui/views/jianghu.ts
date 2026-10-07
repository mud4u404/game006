import { S, fullName } from '../../core/state';
import { minLabel } from '../../core/time';
import { npc, room } from '../../content';
import { curQuest, hopMin, npcName, pathMin, roomDesc, roomNpcs, roomObjs, verbsOf } from '../../engine/world';
import { IC } from '../icons';
import { FEED_TONE, mb } from '../widgets';
import { xiuwei } from '../../engine/wuxue';

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
    ? `<button class="card quest" data-act="quest"><span class="tag info">${kind}</span><span class="qt">${q.title}</span><span class="qd">${S.loc === q.to ? '就在此处' : '约' + minLabel(pathMin(S.loc, q.to))}</span>${IC.chev}</button>`
    : `<div class="card quest"><span class="tag accent">${kind}</span><span class="qt">${q.title}</span></div>`;
  const questBar = `<div class="quest-row">${quest}<button class="qb-btn" data-act="questbook" aria-label="任务簿" title="任务簿">${IC.quest}</button></div>`;
  const who = S.chapter === 0 ? '渔家少年' : S.title ? '「' + S.title + '」' : '游侠 · ' + xiuwei(S).rank;
  return `
  <section class="card status">
    <span class="ava t-accent">沈</span>
    <div class="who"><b>${fullName()}</b><small>${who}</small></div>
    <div class="minibars">${mb('气血', S.hp, S.hpMax, 'hp')}${mb('内力', S.mp, S.mpMax, 'mp')}</div>
  </section>
  ${questBar}
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
  return `<div class="detail"><div class="d-h"><b>${npcName(id)}</b><span class="tag">${rel}</span><small>${n.hint || n.brief}</small></div>
    <div class="acts">${verbsOf(n).map(v => `<button class="act ${VERB_CLS[v] || ''}" data-act="do:${v}">${v}</button>`).join('')}</div>${reply}</div>`;
}

function exitBtn(d: string, id: string, solo: boolean, questTo?: string): string {
  return `<button class="exit${solo ? ' solo' : ''}" data-act="travel:${id}"><span class="dir">${d}</span><span class="en"><b>${room(id).name}</b><small>${minLabel(hopMin(S.loc, id))}</small></span>${questTo === id ? '<span class="tag info">主线</span>' : ''}</button>`;
}
