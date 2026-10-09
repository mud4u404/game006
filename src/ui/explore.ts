/**
 * 探索相关的操作：切换标签、选人、做动作、赶路、闭关、存档管理。
 * 道具（穿戴、服用、细看、赠礼、典当）在 ui/daoju.ts。
 */
import { S, clearSave, pushFeed, save, type Tab } from '../core/state';
import { advanceDays, dateStr } from '../core/time';
import { $, cn, reduceMotion } from '../core/util';
import { questById, room, skillById } from '../content';
import type { Slot, Verb } from '../content/types';
import { fits } from '../engine/wuxue';
import { slotSheet } from './views/wugong';
import { gongliText } from '../engine/ren';
import { XIEJIAO, checkYue, jingxiu, nightBlock, restDays, skillName, waitUntil, yueText } from '../engine/shiguang';
import { chuguanHTML } from './chuguan';
import { act, curQuest, enter, hopMin, pathTo, payFare, roadText, travelMin } from '../engine/world';
import { markEncounter, rollEncounter } from '../engine/encounter';
import { afterOutcome, closeSheet, hooks, missedToast, openSheet, registerHandlers, render, renderBar, toast } from './shell';
import { openQuestbook, trackQuest } from './views/questbook';
import { setConfirmRestart } from './views/renwu';
import { setMapRegion } from './views/ditu';
import { showTitle } from './story';
import { eyeLine } from './views/jianghu';
import { pickItemFirst } from './daoju';

let traveling = false;
/** 赶路途中点了「停下」：走完这一段就停 */
let stopAsked = false;

/** 过了约期还在线的：赶路、做事以后就算失约，不必等到下一次闭关（机器玩家摸底时发现） */
function lateYue(): void {
  missedToast(checkYue(S));
}
export const isTraveling = (): boolean => traveling;

/**
 * 赶路（负责人 10-09：「点着点着会卡住，个别选项点不中」）：
 * 原来每走一段（0.76 秒）整块重画一次地点，手指底下的按钮被换掉，点空或点错。
 * 现在起步时画一次，途中只改顶栏的地名时辰和赶路条上的字；下面的按钮一律灰着，赶路条上只留「停下」。
 */
export function travelTo(dest: string, onArrive?: () => void): void {
  if (traveling) { toast('正在赶路……要停，点赶路条上的「停下」'); return; }
  if (dest === S.loc || !$('#fightLayer')?.hidden || !$('#storyLayer')?.hidden) return;
  const path = pathTo(S.loc, dest);
  if (!path.length) { toast(S.chapter === 0 ? '要下大雨了，码头今儿不开船。' : '从这里去不了那儿'); return; }
  traveling = true;
  stopAsked = false;
  S.tab = 'jianghu'; S.sel = null; S.reply = null;
  render();
  const bar = $('#travel')!;
  const app = $('#app')!;
  app.classList.add('traveling');
  const finish = (): void => {
    traveling = false;
    stopAsked = false;
    app.classList.remove('traveling');
    bar.hidden = true;
  };
  const arrive = (): void => {
    render();
    $('#main')!.scrollTop = 0;
    const out = enter(S.loc);
    if (out) afterOutcome(out);
    if (S.loc === dest) onArrive?.();
  };
  const step = (): void => {
    const nx = stopAsked ? undefined : path.shift();
    if (!nx) {
      if (stopAsked && S.loc !== dest) toast(`在${room(S.loc).name}停下了`);
      finish();
      arrive();
      return;
    }
    const from = S.loc;
    const ex = room(from).exits.find(x => x[1] === nx);
    bar.innerHTML = `<div class="tinfo"><b>往${ex ? ex[0] : ''} · ${room(nx).name}</b><small>${roadText(nx)}</small><div class="tb"><i></i></div></div><button class="tstop" data-act="travelStop">停下</button>`;
    bar.hidden = false;
    window.setTimeout(() => {
      try {
        const m = travelMin(hopMin(from, nx));
        S.min += m;
        if (S.min >= 1440) { S.min -= 1440; advanceDays(S, 1); }
        S.loc = nx;
        payFare(nx);
        lateYue();
        // 路遇：这一段路上遇到了事，停下来；读完剧情接着赶路，到了就照常进门（engine/encounter.ts）
        const enc = rollEncounter(from, nx);
        if (enc) {
          markEncounter(enc);
          finish();
          render();
          hooks.openStory(enc.story, () => { if (S.loc === dest) arrive(); else travelTo(dest, onArrive); });
          return;
        }
        renderBar();
        step();
      } catch (e) {
        // 出了错也要复位，不然「正在赶路」永远不消，什么都点不了
        finish();
        render();
        throw e;
      }
    }, reduceMotion ? 250 : 760);
  };
  step();
}

/** 同一个人、同一个动作，连点两下只算一下（原来双击「交谈」会说两遍、花两份时辰） */
let lastAct = { key: '', t: 0 };
let armed = { key: '', t: 0 };
function doAct(verb: Verb): void {
  const id = S.sel;
  if (!id) return;
  const key = `${id}|${verb}`, now = performance.now();
  if (key === lastAct.key && now - lastAct.t < 450) return;
  lastAct = { key, t: now };
  // 动手、偷窃收不回：三秒内再点一下才算，免得手一滑当街行凶（审查 H43）
  if (verb === '动手' || verb === '偷窃') {
    if (armed.key !== key || now - armed.t > 3000) {
      armed = { key, t: now };
      toast(`真要${verb}？再点一下「${verb}」`);
      return;
    }
    armed = { key: '', t: 0 };
  }
  // 赠礼、典当：先从行囊里挑一件（ui/daoju.ts）
  if (pickItemFirst(id, verb)) return;
  const { text, out, eyes } = act(id, verb);
  lateYue();
  if (out.story || out.fight) { afterOutcome(out, text || undefined); return; }
  // 根基之眼：观察时根基够了多看出的那一层，跟在描写后面（engine/yan.ts）
  const seen = eyes.map(e => eyeLine(e)).join('');
  S.reply = text || seen ? { id, text: text + seen } : null;
  render();
  const rp = document.querySelector('.reply');
  if (rp) rp.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

function retreat(want: number): void {
  // 江湖跑不过现实；碰到约期，那天一早就出关（engine/shiguang.ts）
  const r = restDays(S, want);
  if (r.days < 1) {
    openSheet(`<div class="r-h"><span class="tag accent">闭关</span><h2>${r.why === 'yue' ? '今日有约' : '江湖跑不过现实'}</h2></div>
      <p class="muted">${r.why === 'yue' && r.yue ? yueText(S, r.yue) + '。先去赴约吧。' : '这几日江湖上的日子，已经走在现实前头了。下了线，现实里过一个钟头，江湖上就静修一日；回来先读出关邸报。'}</p>
      <button class="btn" data-act="sheetClose">知道了</button>`);
    return;
  }
  const label = r.days === 30 ? '一月' : `${cn(r.days)}日`;
  openSheet(`<div class="r-h"><span class="tag accent">闭关</span><h2>闭关${label}</h2></div><p class="muted">${dateStr(S)}起，闭门谢客，静心修炼……</p><div class="tr2"><i id="rtBar"></i></div>`);
  const b = $('#rtBar')!;
  void b.offsetWidth;
  b.style.transition = `width ${reduceMotion ? 50 : 1200}ms linear`;
  b.style.width = '100%';
  window.setTimeout(() => {
    const rep = jingxiu(S, r.days);
    const how = rep.used ? `消化历练 ${rep.used}` : '没有历练可消化，闭门造车，进境有限';
    pushFeed('出关', `闭关${label}，${how}${rep.gains[0] ? `，「${skillName(rep.gains[0][0])}」熟练 +${rep.gains[0][1]}` : ''}${rep.gongli > 0 ? `；功力深到${gongliText(S.gongli)}` : ''}。`);
    const stop = r.why === 'yue' && r.yue ? `想闭关${cn(want)}日，可约期到了，只好提前出关：${yueText(S, r.yue)}。` : r.why === 'tielv' ? `想闭关${cn(want)}日，可江湖跑不过现实，只修了${cn(r.days)}日。` : undefined;
    const panel = document.querySelector('#sheetLayer .panel');
    if (panel) panel.innerHTML = chuguanHTML(rep, `闭关${label}，今日是${dateStr(S)}。`, `闭关${label}`, stop);
    save();
  }, reduceMotion ? 150 : 1300);
}

registerHandlers({
  // 搭配：点一个位置，列出能放进去的武功；战斗中不能换（战斗界面盖住了武功页）
  slotPick: v => openSheet(slotSheet(v as Slot), true),
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
  mapRegion: v => { setMapRegion(v); render(); },
  tab: v => { S.tab = v as Tab; setConfirmRestart(false); render(); $('#main')!.scrollTop = 0; },
  sel: v => { S.sel = v; S.reply = null; render(); },
  do: v => doAct(v as Verb),
  travel: v => travelTo(v),
  travelStop: () => { if (traveling && !stopAsked) { stopAsked = true; toast('走完这一段就停下'); } },
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
    if (!to) { toast('眼下没有要去的地方'); return; }
    if (to === S.loc) { toast('就在此处'); return; }
    closeSheet();
    travelTo(to);
  },
  // 见闻簿里差事的「去」：赶到交差的地方
  jgo: v => { if (!v || v === S.loc) return; closeSheet(); travelTo(v); },
  retreat: v => retreat(Number(v)),
  // 歇脚：等到某个钟点（engine/shiguang.ts 的 waitUntil）
  xiejiao: v => {
    if (traveling) return;
    const h = Number(v), label = XIEJIAO.find(([x]) => x === h)?.[1] ?? '';
    const m = waitUntil(S, h);
    if (!m) { toast(nightBlock(S) ?? '今日不能再往后拖了'); return; }
    // 歇着也缓过一点气力：一个时辰回三分，最多回三成（审查 G22、H42：歇了十几个时辰一点不回）
    const frac = Math.min(0.3, (m / 60) * 0.03);
    S.hp = Math.min(S.hpMax, S.hp + Math.round(S.hpMax * frac));
    S.mp = Math.min(S.mpMax, S.mp + Math.round(S.mpMax * frac));
    pushFeed('江湖', `你找了个地方歇脚，一直歇到${label}，缓过了些气力。`);
    render();
    // 新的描写在最上头（审查 H09：歇完停在底部，看不到）
    $('#main')!.scrollTop = 0;
    lateYue();
  },
  sheetClose: () => { closeSheet(); render(); },
  restart: () => { setConfirmRestart(true); render(); },
  restartNo: () => { setConfirmRestart(false); render(); },
  restartYes: () => { setConfirmRestart(false); clearSave(); showTitle(false); },
  toTitle: () => { save(); showTitle(true); }
});
