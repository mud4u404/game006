/**
 * 探索相关的操作：切换标签、选人、做动作、赶路、闭关、服药、存档管理。
 */
import { S, clearSave, pushFeed, save, type Tab } from '../core/state';
import { advanceDays, dateStr } from '../core/time';
import { $, reduceMotion } from '../core/util';
import { NEWS, itemById, questById, room, skillById } from '../content';
import type { SkillId, Slot, Verb } from '../content/types';
import { fits } from '../engine/wuxue';
import { slotSheet } from './views/wugong';
import { test } from '../engine/dsl';
import { gainProf } from '../engine/growth';
import { growAttr } from '../engine/gengu';
import { act, curQuest, enter, hopMin, pathTo, roadText, travelMin } from '../engine/world';
import { retreatPlan } from '../engine/lilian';
import { markEncounter, rollEncounter } from '../engine/encounter';
import { afterOutcome, closeSheet, hooks, openSheet, registerHandlers, render, toast } from './shell';
import { openQuestbook, trackQuest } from './views/questbook';
import { setConfirmRestart } from './views/renwu';
import { setMapRegion } from './views/ditu';
import { showTitle } from './story';

let traveling = false;
export const isTraveling = (): boolean => traveling;

export function travelTo(dest: string, onArrive?: () => void): void {
  if (traveling) { toast('正在赶路……'); return; }
  if (dest === S.loc || !$('#fightLayer')?.hidden || !$('#storyLayer')?.hidden) return;
  const path = pathTo(S.loc, dest);
  if (!path.length) { toast('从这里去不了那儿'); return; }
  traveling = true;
  S.tab = 'jianghu';
  render();
  const bar = $('#travel')!;
  const arrive = (): void => {
    $('#main')!.scrollTop = 0;
    const out = enter(S.loc);
    if (out) afterOutcome(out);
    onArrive?.();
  };
  const step = (): void => {
    const nx = path.shift();
    if (!nx) {
      traveling = false;
      bar.hidden = true;
      arrive();
      return;
    }
    const from = S.loc;
    const ex = room(from).exits.find(x => x[1] === nx);
    bar.innerHTML = `<b>往${ex ? ex[0] : ''} · ${room(nx).name}</b><small>${roadText(nx)}</small><div class="tb"><i></i></div>`;
    bar.hidden = false;
    window.setTimeout(() => {
      const m = travelMin(hopMin(from, nx));
      S.min += m;
      if (S.min >= 1440) { S.min -= 1440; advanceDays(S, 1); }
      S.loc = nx; S.sel = null; S.reply = null;
      // 路遇：这一段路上遇到了事，停下来；读完剧情接着赶路，到了就照常进门（engine/encounter.ts）
      const enc = rollEncounter(from, nx);
      if (enc) {
        markEncounter(enc);
        traveling = false;
        bar.hidden = true;
        render();
        hooks.openStory(enc.story, () => { if (S.loc === dest) arrive(); else travelTo(dest, onArrive); });
        return;
      }
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
  openSheet(`<div class="r-h"><span class="tag accent">闭关</span><h2>闭关${label}</h2></div><p class="muted">${dateStr(S)}起，闭门谢客，静心修炼……</p><div class="tr2"><i id="rtBar"></i></div>`);
  const b = $('#rtBar')!;
  void b.offsetWidth;
  b.style.transition = `width ${reduceMotion ? 50 : 1200}ms linear`;
  b.style.width = '100%';
  window.setTimeout(() => {
    advanceDays(S, days);
    S.min = 7 * 60 + 10;
    S.mp = S.mpMax; S.hp = S.hpMax;
    // 闭关是把江湖上攒下的历练消化成功夫；没有历练，闭门造车（engine/lilian.ts）
    const { used, gains } = retreatPlan(S, days);
    S.lilian -= used;
    const breaks = gains.flatMap(([k, v]) => gainProf(k, v));
    // 闭关一月，打熬筋骨：体魄加一，最多三次（engine/gengu.ts）
    if (days === 30) for (let i = 1; i <= 3; i++) if (!S.flags[`gg_体魄_闭关${i}`]) { S.flags[`gg_体魄_闭关${i}`] = true; growAttr(S, '体魄', 1, '闭关一月，打熬筋骨'); break; }
    const pool = NEWS.filter(n => test(n.if)).map(n => n.text);
    const news: string[] = [];
    for (let i = 0; i < ({ 1: 1, 7: 2, 30: 3 } as Record<number, number>)[days] && pool.length; i++) {
      news.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    news.slice().reverse().forEach(n => pushFeed('传闻', n));
    const names = (id: SkillId): string => skillById(id)?.name ?? id;
    const how = used ? `消化历练 ${used}` : '没有历练可消化，闭门造车，进境有限';
    pushFeed('出关', `闭关${label}，${how}${gains[0] ? `，「${names(gains[0][0])}」熟练 +${gains[0][1]}` : ''}。`);
    const panel = document.querySelector('#sheetLayer .panel');
    if (panel) panel.innerHTML = `
      <div class="r-h"><span class="tag accent">出关</span><h2>闭关${label}，今日${dateStr(S)}</h2></div>
      <div class="rewards"><span class="tag ${used ? 'accent' : ''}">${used ? `消化历练 ${used}` : '闭门造车'}</span>${gains.map(([k, v]) => `<span class="tag accent">${names(k)} +${v}</span>`).join('')}${breaks.map(x => `<span class="tag info">${x}</span>`).join('')}</div>
      <div class="r-sub">江湖见闻</div>
      <div class="news">${news.map(n => `<div><span class="tag warn">传闻</span><span>${n}</span></div>`).join('')}</div>
      <button class="btn" data-act="sheetClose">出关</button>`;
    save();
  }, reduceMotion ? 150 : 1300);
}

registerHandlers({
  // 搭配：点一个位置，列出能放进去的武功；战斗中不能换（战斗界面盖住了武功页）
  slotPick: v => openSheet(slotSheet(v as Slot)),
  slotSet: v => {
    const [slot, id] = v.split(':') as [Slot, string];
    const def = id ? skillById(id) : undefined;
    if (id && (!def || !S.skills[id] || !fits(def, slot))) return;
    if (id) {
      // 同一门武功只能放一个位置
      for (const k of Object.keys(S.loadout) as Slot[]) if (S.loadout[k] === id) delete S.loadout[k];
      S.loadout[slot] = id;
    } else delete S.loadout[slot];
    closeSheet();
    render();
  },
  // 兵器：装备、卸下（纸娃娃的其余装备位以后再加）
  wield: v => {
    if (v && (S.items[v] ?? 0) > 0 && itemById(v)?.equip) S.gear.weapon = v; else delete S.gear.weapon;
    render();
  },
  mapRegion: v => { setMapRegion(v); render(); },
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
