/**
 * 探索相关的操作：切换标签、选人、做动作、赶路、闭关、服药、存档管理。
 */
import { S, clearSave, pushFeed, save, type Tab } from '../core/state';
import { advanceDays, dateStr } from '../core/time';
import { $, reduceMotion } from '../core/util';
import { NEWS, questById, room, skillById } from '../content';
import type { SkillId, Verb } from '../content/types';
import { test } from '../engine/dsl';
import { gainProf } from '../engine/growth';
import { act, curQuest, enter, hopMin, pathTo, roadText } from '../engine/world';
import { afterOutcome, closeSheet, openSheet, registerHandlers, render, toast } from './shell';
import { openQuestbook, trackQuest } from './views/questbook';
import { setConfirmRestart } from './views/renwu';
import { showTitle } from './story';

let traveling = false;
export const isTraveling = (): boolean => traveling;

export function travelTo(dest: string, onArrive?: () => void): void {
  if (traveling || dest === S.loc || !$('#fightLayer')?.hidden) return;
  const path = pathTo(S.loc, dest);
  if (!path.length) { toast('从这里去不了那儿'); return; }
  traveling = true;
  S.tab = 'jianghu';
  render();
  const bar = $('#travel')!;
  const step = (): void => {
    const nx = path.shift();
    if (!nx) {
      traveling = false;
      bar.hidden = true;
      $('#main')!.scrollTop = 0;
      const out = enter(S.loc);
      if (out) afterOutcome(out);
      onArrive?.();
      return;
    }
    const ex = room(S.loc).exits.find(x => x[1] === nx);
    bar.innerHTML = `<b>往${ex ? ex[0] : ''} · ${room(nx).name}</b><small>${roadText(nx)}</small><div class="tb"><i></i></div>`;
    bar.hidden = false;
    window.setTimeout(() => {
      const m = hopMin(S.loc, nx);
      S.min += m;
      if (S.min >= 1440) { S.min -= 1440; advanceDays(S, 1); }
      S.loc = nx; S.sel = null; S.reply = null;
      render();
      step();
    }, reduceMotion ? 250 : 760);
  };
  step();
}

function doAct(verb: Verb): void {
  const id = S.sel;
  if (!id) return;
  const { text, out } = act(id, verb);
  if (out.story || out.fight) { afterOutcome(out); return; }
  S.reply = text ? { id, text } : null;
  render();
  const rp = document.querySelector('.reply');
  if (rp) rp.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

function retreat(days: number): void {
  const label = ({ 1: '一日', 7: '七日', 30: '一月' } as Record<number, string>)[days];
  const mul = ({ 1: 1, 7: 6, 30: 22 } as Record<number, number>)[days];
  openSheet(`<div class="r-h"><span class="tag accent">闭关</span><h2>闭关${label}</h2></div><p class="muted">${dateStr(S)}起，闭门谢客，静心修炼……</p><div class="tr2"><i id="rtBar"></i></div>`);
  const b = $('#rtBar')!;
  void b.offsetWidth;
  b.style.transition = `width ${reduceMotion ? 50 : 1200}ms linear`;
  b.style.width = '100%';
  window.setTimeout(() => {
    advanceDays(S, days);
    S.min = 7 * 60 + 10;
    const mpUp = 4 * mul;
    S.mpMax += mpUp; S.mp = S.mpMax; S.hp = S.hpMax;
    // 闭关练的是搭配在身上的武功：主手最多，内功次之，轻功、副手再次
    const plan: [SkillId | undefined, number][] = [[S.loadout.main, 60 * mul], [S.loadout.neigong, 40 * mul], [S.loadout.qinggong, 20 * mul], [S.loadout.off, 15 * mul]];
    const gains = plan.filter((x): x is [SkillId, number] => !!x[0] && !!S.skills[x[0]]);
    const breaks = gains.flatMap(([k, v]) => gainProf(k, v));
    const pool = NEWS.filter(n => test(n.if)).map(n => n.text);
    const news: string[] = [];
    for (let i = 0; i < ({ 1: 1, 7: 2, 30: 3 } as Record<number, number>)[days] && pool.length; i++) {
      news.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    news.slice().reverse().forEach(n => pushFeed('传闻', n));
    const names = (id: SkillId): string => skillById(id)?.name ?? id;
    pushFeed('出关', `闭关${label}，内力上限 +${mpUp}${gains[0] ? `，「${names(gains[0][0])}」熟练 +${gains[0][1]}` : ''}。`);
    const panel = document.querySelector('#sheetLayer .panel');
    if (panel) panel.innerHTML = `
      <div class="r-h"><span class="tag accent">出关</span><h2>闭关${label}，今日${dateStr(S)}</h2></div>
      <div class="rewards"><span class="tag accent">内力上限 +${mpUp}</span>${gains.map(([k, v]) => `<span class="tag accent">${names(k)} +${v}</span>`).join('')}${breaks.map(x => `<span class="tag info">${x}</span>`).join('')}</div>
      <div class="r-sub">江湖见闻</div>
      <div class="news">${news.map(n => `<div><span class="tag warn">传闻</span><span>${n}</span></div>`).join('')}</div>
      <button class="btn" data-act="sheetClose">出关</button>`;
    save();
  }, reduceMotion ? 150 : 1300);
}

registerHandlers({
  tab: v => { S.tab = v as Tab; setConfirmRestart(false); render(); $('#main')!.scrollTop = 0; },
  sel: v => { S.sel = v; S.reply = null; render(); },
  do: v => doAct(v as Verb),
  travel: v => travelTo(v),
  quest: () => {
    const q = curQuest();
    if (q?.to && q.to !== S.loc) travelTo(q.to);
    else toast('就在此处');
  },
  questbook: () => { openQuestbook(); },
  qtrack: v => { if (v) trackQuest(v); },
  qgo: v => {
    if (!v) return;
    const def = questById(v);
    if (!def) return;
    const stageIdx = Math.min(S.quests[v] ?? 0, def.stages.length - 1);
    const to = def.stages[stageIdx].to;
    if (!to) { toast('此阶段无目的地'); return; }
    if (to === S.loc) { toast('就在此处'); return; }
    closeSheet();
    travelTo(to);
  },
  use: v => {
    if (v !== 'jcy' || (S.items.jcy || 0) < 1 || S.hp >= S.hpMax) return;
    S.items.jcy--;
    S.hp = Math.min(S.hpMax, S.hp + 260);
    toast('气血回复');
    render();
  },
  retreat: v => retreat(Number(v)),
  sheetClose: () => { closeSheet(); render(); },
  restart: () => { setConfirmRestart(true); render(); },
  restartNo: () => { setConfirmRestart(false); render(); },
  restartYes: () => { setConfirmRestart(false); clearSave(); showTitle(false); },
  toTitle: () => { save(); showTitle(true); }
});
