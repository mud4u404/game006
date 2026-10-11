/**
 * 探索相关的操作：切换标签、选人、做动作、赶路、闭关、存档管理。
 * 道具（穿戴、服用、细看、赠礼、典当）在 ui/daoju.ts。
 */
import { S, clearSave, pushFeed, save, type Tab } from '../core/state';
import { absMin, advanceDays, dateStr, dayNo } from '../core/time';
import { $, cn, reduceMotion } from '../core/util';
import { ROOMS, npc, room, skillById } from '../content';
import type { Slot, Verb } from '../content/types';
import { fits } from '../engine/wuxue';
import { slotSheet } from './views/wugong';
import { gongliText } from '../engine/ren';
import { TIELV_TEXT, XIEJIAO, checkYue, xiejiaoBao, restLine, jingxiu, nightWarn, restDays, skillName, waitUntil, yueText } from '../engine/shiguang';
import { chuguanHTML, xingLaiHTML } from './chuguan';
import { questNav } from '../engine/daohang';
import { act, enter, hopMin, roomNpcs, verbsOf, pathTo, payFare, roadText, travelMin } from '../engine/world';
import { act as settleAction, effectReq } from '../engine/xingdong';
import { markEncounter, rollEncounter } from '../engine/encounter';
import { TRAVEL_BUSY, afterOutcome, closeSheet, hooks, missedToast, openSheet, registerHandlers, render, renderBar, toast } from './shell';
import { openQuestbook, quitJob, trackQuest } from './views/questbook';
import { kpBiguanTip } from '../engine/kaipian';
import { sectLeaveSheet, setConfirmRestart } from './views/renwu';
import { mapSheet, setMapRegion, tripNeedsAsk } from './views/ditu';
import { markArrival, powerNow, targetAt, type Target } from '../engine/jiemian';
import { showTitle } from './story';
import { eyeLine, toggleDesc } from './views/jianghu';
import { pickItemFirst } from './daoju';
import { takeTopic } from '../engine/yingmian';

let traveling = false;
/** 赶路途中点了「停下」：走完这一段就停 */
let stopAsked = false;
/** 先过一张卡再走的那趟路，到了要做的事（眼下要紧：到了把人和动作高亮） */
let pendingArrive: (() => void) | undefined;

/**
 * 所有「去」的入口共用：要付船钱的路，先弹出说明（约几刻、船钱多少、钱不够的怕回不来），点了「去」才走；
 * 不花钱的路直接走。travelGo 接着走
 */
function goOrAsk(to: string, onArrive?: () => void): void {
  if (tripNeedsAsk(to)) { pendingArrive = onArrive; openSheet(mapSheet(to), true); return; }
  travelTo(to, onArrive);
}

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
  if (traveling) { toast(TRAVEL_BUSY); return; }
  if (dest === S.loc || !$('#fightLayer')?.hidden || !$('#storyLayer')?.hidden) return;
  // 到了要找谁：动身之前问（到了以后差事就不再列了，engine/jiemian.ts 的 targetAt）
  const tgt = onArrive ? undefined : targetAt(dest);
  const path = pathTo(S.loc, dest);
  if (!path.length) { toast(S.chapter === 0 ? '要下大雨了，码头今儿不开船。' : '从这里去不了那儿'); return; }
  traveling = true;
  stopAsked = false;
  S.tab = 'jianghu'; S.sel = null; S.reply = null;
  markArrival(null);
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
    if (S.loc === dest) { if (onArrive) onArrive(); else focusTarget(tgt); }
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
        const tip = kpBiguanTip(S, 'walk');
        if (tip) pushFeed('江湖', tip);
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

/**
 * 到了地方就能办事（docs/sheji-youhua-1010.md 第六条）：把要找的人选中、他的动作高亮，把动作面板滚进首屏。
 * 主线、差事、零工、约好的地方都走这里（要找谁由 engine/jiemian.ts 的 targetAt 定，赶路前问好）；那个人此刻不在场就什么也不做
 */
function focusTarget(t: Target | undefined): void {
  if (!t || !roomNpcs(S.loc).includes(t.npc)) return;
  markArrival(t);
  S.sel = t.npc; S.reply = null;
  render();
  document.querySelector('.detail')?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

/** 同一个人、同一个动作，连点两下只算一下（原来双击「交谈」会说两遍、花两份时辰） */
let lastAct = { key: '', t: 0 };
let armed = { key: '', t: 0 };
function doAct(verb: Verb): void {
  const id = S.sel;
  if (!id) return;
  const key = `${id}|${verb}`, now = performance.now();
  if (key === lastAct.key && now - lastAct.t < 450) {
    // 「动手」「偷窃」要再点一下确认：连点太快被当成手滑吞掉时，补一句话，别让玩家以为点不动
    if (armed.key === key) toast(`稍等一下，再点一下「${verb}」`);
    return;
  }
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
  // 迎面挑人用：刚和谁有过来往（engine/yingmian.ts）
  S.lastWith = { id, day: dayNo(S) };
  lateYue();
  if (out.story || out.fight) { afterOutcome(out, text || undefined); return; }
  // 根基之眼：观察时根基够了多看出的那一层，跟在描写后面（engine/yan.ts）
  const seen = eyes.map(e => eyeLine(e)).join('');
  S.reply = text || seen ? { id, text: text + seen, at: absMin(S) } : null;
  render();
  const rp = document.querySelector('.reply');
  if (rp) rp.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

function retreat(want: number): void {
  // 碰到约期，那天一早就出关；修为额度之外的日子照样过，只养伤（engine/shiguang.ts）
  const r = restDays(S, want);
  if (r.days < 1) {
    openSheet(`<div class="r-h"><span class="tag accent">闭关</span><h2>今日有约</h2></div>
      <p class="muted">${r.yue ? yueText(S, r.yue) + '。先去赴约吧。' : '今日还有事没了结，先去办了再闭关。'}</p>
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
    const power0 = powerNow();
    const rep = jingxiu(S, r.days, undefined, r.grow);
    const how = rep.used ? `消化历练 ${rep.used}` : rep.grow === 0 ? TIELV_TEXT.replace(/。$/, '') : '没有历练可消化，闭门造车，进境有限';
    pushFeed('出关', `闭关${label}，${how}${rep.gains[0] ? `，「${skillName(rep.gains[0][0])}」熟练 +${rep.gains[0][1]}` : ''}${rep.gongli > 0 ? `；功力深到${gongliText(S.gongli)}` : ''}。`);
    const stop = r.why === 'yue' && r.yue ? `想闭关${cn(want)}日，可约期到了，只好提前出关：${yueText(S, r.yue)}。` : r.why === 'tielv' ? (r.grow ? `闭关${label}，其中${cn(r.grow)}日修为有长进；余下的日子，${TIELV_TEXT}` : TIELV_TEXT) : undefined;
    const panel = document.querySelector('#sheetLayer .panel');
    if (panel) panel.innerHTML = chuguanHTML(rep, `闭关${label}，今日是${dateStr(S)}。`, `闭关${label}`, stop, power0);
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
  // 地图点地名：先写明这趟路要多久、花多少钱，再由玩家决定走不走（地图审查第一条）
  travelAsk: v => {
    if (!v) return;
    // 地图上点一处：先看那里有什么人、什么事、要走多久、花多少钱，再点「去」直接赶路（ui/views/ditu.ts 的 mapSheet）
    pendingArrive = undefined;
    openSheet(mapSheet(v), true);
  },
  // 地图页顶上的「眼下要紧」：切到目标那处的地区，弹出那处的卡片
  mapJump: v => {
    if (!v || !ROOMS.some(r => r.id === v)) return;
    setMapRegion(room(v).region);
    pendingArrive = undefined;
    render();
    openSheet(mapSheet(v), true);
  },
  // 地图卡片上「此处」的人和动作：点了就办（回江湖页，选中这个人，做这个动作）
  sheetDo: v => {
    const [id, ...rest] = v.split(':');
    const verb = rest.join(':') as Verb;
    if (!id || !verb || !roomNpcs(S.loc).includes(id)) return;
    closeSheet();
    S.tab = 'jianghu'; S.sel = id; S.reply = null;
    markArrival(null);
    render();
    doAct(verb);
  },
  travelGo: v => { closeSheet(); const f = pendingArrive; pendingArrive = undefined; travelTo(v, f); },
  tab: v => { S.tab = v as Tab; setConfirmRestart(false); render(); $('#main')!.scrollTop = 0; },
  // 点人：重画后页面不能回到顶上或停在原处看不见动作（#603）。先记下滚动位置，画完还原，再让这个人的动作区落进视口
  sel: v => {
    const m = $('#main'), top = m?.scrollTop ?? 0;
    S.sel = v; S.reply = null; render();
    if (m) m.scrollTop = top;
    $('.detail')?.scrollIntoView({ block: 'nearest' });
  },
  do: v => { markArrival(null); doAct(v as Verb); },
  // 场景白描折叠后点开、收起
  descToggle: () => { toggleDesc(); render(); },
  // 看完榜文，一步到下一个人（NpcDef.next）：选中他，高亮字头相符的动作，滚进首屏。v = 人物id[:动作字头]
  jumpTo: v => {
    const [id, head] = v.split(':');
    const n = npc(id);
    if (!n || !roomNpcs(S.loc).includes(id)) return;
    focusTarget({ npc: id, verb: head ? verbsOf(n).find(x => x.startsWith(head)) : undefined });
  },
  // 迎面的话头：选中开口的人，做对应的动作（engine/yingmian.ts）
  greet: () => {
    const t = takeTopic();
    if (!t) return;
    S.sel = t.id; S.reply = null;
    doAct(t.verb);
  },
  travel: v => goOrAsk(v),
  travelStop: () => { if (traveling && !stopAsked) { stopAsked = true; toast('走完这一段就停下'); } },
  quest: () => {
    // 卡住的也照去：差的那一步多半就在那儿办（缘故卡上已经写着）。到了地方，把要找的人选中、动作高亮（engine/jiemian.ts），不再只弹一句「就在此处」
    const q = S.track ? questNav(S.track) : null;
    if (q?.to && q.to !== S.loc) goOrAsk(q.to);
    else if (q?.to) focusTarget(targetAt(S.loc));
    else toast(q && q.state !== '能做' ? q.why : '眼下没有要去的地方');
  },
  questbook: () => { openQuestbook(); },
  // 离开师门：先看后果卡，再点一次才算（ui/views/renwu.ts 的 sectLeaveSheet）
  sectLeaveAsk: v => { if (S.sect && (v === '辞别' || v === '叛门')) openSheet(sectLeaveSheet(v), true); },
  sectLeave: v => {
    if (!S.sect || (v !== '辞别' && v !== '叛门')) return;
    if (v === '辞别' && S.pastSects?.some(x => x.how === '辞别')) return;
    const school = S.sect.school;
    settleAction(effectReq(v, S.sect?.school ?? '', [{ type: 'leaveSect', how: v }]));
    pushFeed('江湖', v === '辞别' ? `你向${school}的师长磕了三个头，辞别下山。` : `你叛出了${school}。`);
    closeSheet();
    render();
  },
  // 住处三选一（engine/shiguang.ts 的 zhuOf）
  zhu: v => { if (v === 'inn' || v === 'lusu' || (v === 'home' && S.sect)) { S.zhu = v; render(); } },
  qtrack: v => { if (v) trackQuest(v); },
  qgo: v => {
    if (!v) return;
    const to = questNav(v)?.to;
    if (!to) { toast('眼下没有要去的地方'); return; }
    if (to === S.loc) { toast('就在此处'); return; }
    closeSheet();
    goOrAsk(to);
  },
  // 见闻簿里差事的「去」：赶到交差的地方
  jgo: v => { if (!v || v === S.loc) return; closeSheet(); goOrAsk(v); },
  jquit: v => { if (v && quitJob(v)) { openQuestbook(); render(); } },
  retreat: v => retreat(Number(v)),
  // 歇过半夜会误了今日的约：先问一句，照样能歇
  xiejiaoAsk: v => {
    const h = Number(v), label = XIEJIAO.find(([x]) => x === h)?.[1] ?? '';
    openSheet(`<div class="r-h"><span class="tag accent">歇脚</span><h2>歇到${label}？</h2></div>
      <p class="muted">${nightWarn(S) ?? ''}真要歇过去，这个约就误了。</p>
      <div class="acts"><button class="act" data-act="xiejiao:${h}">照样歇</button><button class="act" data-act="sheetClose">算了</button></div>`);
  },
  // 歇脚：等到某个钟点（engine/shiguang.ts 的 waitUntil）
  xiejiao: v => {
    if (traveling) return;
    const h = Number(v), label = XIEJIAO.find(([x]) => x === h)?.[1] ?? '';
    closeSheet();
    const day0 = dayNo(S);
    const m = waitUntil(S, h);
    // 歇着也缓过一点气力：一个时辰回三分，最多回三成（审查 G22、H42：歇了十几个时辰一点不回）
    const frac = Math.min(0.3, (m / 60) * 0.03);
    S.hp = Math.min(S.hpMax, S.hp + Math.round(S.hpMax * frac));
    S.mp = Math.min(S.mpMax, S.mp + Math.round(S.mpMax * frac));
    const tip = kpBiguanTip(S, 'rest');
    if (tip) pushFeed('江湖', tip);
    // 歇过一夜醒来：和出关一样，读一页邸报（几条世事，外加某人惦记着你）；什么都没有，就照旧只弹一句
    const bao = xiejiaoBao(S, day0);
    const missed = bao.news.length || bao.nian ? checkYue(S) : [];
    const html = bao.news.length || bao.nian ? xingLaiHTML({ ...bao, missed }, `${restLine(S, label)}今日是${dateStr(S)}。`) : '';
    // 歇脚那一句换几种说法，不进动态（动态里天天一模一样的一行，读着腻）
    if (!html) toast(restLine(S, label));
    render();
    // 新的描写在最上头（审查 H09：歇完停在底部，看不到）
    $('#main')!.scrollTop = 0;
    if (html) { openSheet(html); save(); } else lateYue();
  },
  sheetClose: () => { closeSheet(); render(); },
  restart: () => { setConfirmRestart(true); render(); },
  restartNo: () => { setConfirmRestart(false); render(); },
  restartYes: () => { setConfirmRestart(false); clearSave(); showTitle(false); },
  toTitle: () => { save(); showTitle(true); }
});
