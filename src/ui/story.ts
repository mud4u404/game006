/**
 * 剧情卡片、标题画面、章回题字。
 */
import { tupoClear } from '../engine/tupo';
import { titleAccountHTML } from './views/account-link';
import { S, load, newGame, save, saveBroken, setState, skipToYangzhou, type GameState } from '../core/state';
import { dateStr } from '../core/time';
import { $, cleanName, fmt } from '../core/util';
import { room, storyById } from '../content';
import type { StoryDef } from '../content/types';
import { gainTags, leanText } from './qingxiang';
import { lackOf, newOutcome, test, textVars, type Outcome } from '../engine/dsl';
import { act, effectReq, plan } from '../engine/xingdong';
import { kpOpen, kpPick, kpPos } from '../engine/kaipian';
import { afterOutcome, hooks, registerHandlers, render, swapped, toast, tooSoon } from './shell';
import { welcomeBack } from './chuguan';

/* ---------- 剧情卡片 ---------- */

interface Playing { def: StoryDef; i: number; result?: string; next?: number; out: Outcome; onDone?: () => void; lead?: string; picked?: string }
let cur: Playing | null = null;
/** 已经开着剧情时又来的剧情：排队，读完这一段再读（原来直接顶掉，旧剧情的收尾丢了，赶路停在半路） */
const queue: [string, (() => void) | undefined, string | undefined][] = [];

/** at：从第几张卡读起（新序章读档接回断点用，engine/kaipian.ts） */
export function openStory(id: string, onDone?: () => void, lead?: string, at = 0): void {
  if (cur) { queue.push([id, onDone, lead]); return; }
  const def = storyById(id);
  if (!def) { onDone?.(); return; }
  const i = at >= 0 && at < def.cards.length ? at : 0;
  kpOpen(S, id, i);
  cur = { def, i, out: newOutcome(), onDone, lead };
  draw();
  $('#storyLayer')!.hidden = false;
}

const NAME_PICKS = ['孤舟', '听雨', '怀远', '照影', '惊澜'];

function draw(): void {
  if (!cur) return;
  const card = cur.def.cards[cur.i];
  const v = textVars();
  const nameBox = card.input === 'name'
    ? `<label class="namebox"><span>沈</span><input id="nameIn" maxlength="4" value="${S.name}" aria-label="名字" autocomplete="off"></label>
       <div class="namepicks">${NAME_PICKS.map(n => `<button data-act="stName:${n}">${n}</button>`).join('')}</div>`
    : '';
  const choices = cur.result !== undefined
    ? `<button class="choice primary" data-act="stNext"><b>继续</b></button>`
    : card.choices.map((c, k) => {
      // 选之前只写倾向，不写数（ui/qingxiang.ts）
      const sub = c.sub ? leanText(c.sub) : '';
      if (test(c.if)) {
        const p = plan(effectReq('抉择', cur!.def.id, c.do, c.if, `story:${cur!.def.id}:${cur!.i}`));
        if (!p.ok) return `<button class="choice locked" data-act="stLocked:${k}" aria-disabled="true"><b>${c.label}</b><small>${p.why ?? ''}</small></button>`;
        return `<button class="choice${card.choices.length === 1 ? ' primary' : ''}" data-act="stPick:${k}"><b>${c.label}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
      }
      // 够不着的路也摆出来、写明差什么（钱、根基、侠义……）；剧情上的条件不成立的照旧藏着
      const lack = lackOf(c.if);
      return lack ? `<button class="choice locked" data-act="stLocked:${k}" aria-disabled="true"><b>${c.label}</b><small>${lack}</small></button>` : '';
    }).join('');
  swapped();
  $('#storyLayer')!.innerHTML = `<div class="story-l" role="dialog" aria-label="${card.title}">
    ${card.tag ? `<span class="tag accent">${card.tag}</span>` : ''}
    <h2>${fmt(card.title, v)}</h2>
    ${cur.i === 0 && cur.lead ? cur.lead.split('\n').map(p => `<p class="sp">${p}</p>`).join('') : ''}
    ${card.paras.map(p => `<p class="sp">${fmt(p, v)}</p>`).join('')}
    ${card.gains ? `<div class="gains">${card.gains.map(g => `<span class="tag info">${g}</span>`).join('')}</div>` : ''}
    ${nameBox}
    ${cur.result !== undefined ? `${fmt(cur.result, v).split('\n').map((x, i) => `<div class="sres${i ? ' sres-a' : ''}">${x}</div>`).join('')}${gainTags(cur.picked).length ? `<div class="gains">${gainTags(cur.picked).map(g => `<span class="tag info">${g}</span>`).join('')}</div>` : ''}` : ''}
    <div class="choices">${choices}</div>
  </div>`;
  // 新的一张从头读；选完出了结果，把结果和「继续」滚进眼前（原来一律滚回顶部，「继续」常落在屏幕外）
  const box = $('#storyLayer .story-l')!;
  if (cur.result === undefined) box.scrollTop = 0;
  else box.querySelector('.sres')?.scrollIntoView({ block: 'nearest' });
}

function pick(k: number): void {
  if (!cur) return;
  const card = cur.def.cards[cur.i];
  const c = card.choices[k];
  if (!c || !test(c.if)) return;
  const req = effectReq('抉择', cur.def.id, c.do, c.if, `story:${cur.def.id}:${cur.i}`);
  const p = plan(req);
  if (!p.ok) { toast(p.why ?? '眼下还办不了。'); draw(); return; }
  if (card.input === 'name') {
    const raw = ($('#nameIn') as HTMLInputElement | null)?.value || '';
    S.name = cleanName(raw) || '孤舟';
  }
  const playing = cur, next = c.next ?? cur.i + 1;
  // 奖励和下一站在同一次结算里存下，刷新不会回到已经领过好处的选项。
  const result = act(req, cur.out, out => { kpPick(S, playing.def.id, playing.def.cards.length, out, next); });
  if (!result.ok) { toast(result.why ?? '眼下还办不了。'); draw(); return; }
  if (c.result) { cur.result = c.result; cur.next = next; cur.picked = c.sub; draw(); return; }
  // 没有结果文字的选项：加了什么，提示条里说一句
  if (gainTags(c.sub).length) toast(gainTags(c.sub).join('　'));
  advance(next);
}

function advance(next: number): void {
  if (!cur) return;
  const out = cur.out;
  if (out.fight || out.story) { close(); afterOutcome(out); return; }
  if (next < 0 || next >= cur.def.cards.length) {
    const end = cur.def.endChapter;
    const fin = cur.onDone;
    const done = (): void => { render(); fin?.(); };
    close();
    if (end) playChapter(end.small, end.big, done); else done();
    return;
  }
  cur.i = next;
  cur.result = undefined;
  cur.next = undefined;
  cur.picked = undefined;
  draw();
}

function close(): void {
  cur = null;
  const L = $('#storyLayer')!;
  L.hidden = true;
  L.innerHTML = '';
  save();
  // 排着队的剧情，等这一段收完尾再开
  const nx = queue.shift();
  if (nx) window.setTimeout(() => openStory(...nx), 0);
}

/* ---------- 章回题字 ---------- */

let chapDone: (() => void) | null = null;
/** 章回题字：点一下才继续（原来三秒多自动消失，底下同时重画，正好点在那一刻就点穿到新画面的按钮上） */
export function playChapter(small: string, big: string, done: () => void): void {
  render();
  const L = $('#chapLayer')!;
  L.innerHTML = `<div class="chap" data-act="chapDone"><small>${small}</small><div class="cw">${big}</div><p>轻触继续</p></div>`;
  L.hidden = false;
  chapDone = done;
}
function finishChapter(): void {
  const L = $('#chapLayer')!;
  L.hidden = true;
  L.innerHTML = '';
  const fn = chapDone;
  chapDone = null;
  fn?.();
}

/* ---------- 标题画面 ---------- */

/** 存档里的地点可能已经改名、删掉（旧存档）：取不到就不写 */
const areaOf = (id: string): string => { try { return room(id).area; } catch { return ''; } };
/** 标题页「继续」底下的一行：谁、在哪儿（审查 H34、A36：原来写死「第一回 · 扬州」，人在苏州也这么写） */
function chapterLabel(s: GameState): string {
  return s.chapter === 0 ? '序章 · 瓜洲渡' : `沈${s.name} · ${areaOf(s.loc)}`;
}

/** showTitle(true) 时若有存档会显示「继续」 */
export function showTitle(allowContinue = true): void {
  const saved = allowContinue ? load() : null;
  const rain = Array.from({ length: 36 }, (_, i) =>
    `<i style="left:${(i * 137) % 100}%;animation-duration:${(0.6 + (i % 7) * 0.12).toFixed(2)}s;animation-delay:-${((i % 11) * 0.17).toFixed(2)}s"></i>`).join('');
  const L = $('#titleLayer')!;
  const warn = saveBroken()
    ? '<p class="t-warn">原来的存档读不出来了，已经原样另存一份，不会丢。请告诉维护者；在「人物 → 存档 → 找回备份」里可以导出它。</p>'
    : '';
  L.innerHTML = `<div class="title"><div class="rain">${rain}</div>
    <div class="t-word">江湖夜雨</div>
    <p class="t-verse">桃李春风一杯酒　江湖夜雨十年灯</p>
    <p class="t-desc">一部金庸风格的文字武侠。你是瓜洲渡口的渔家少年，从零练起；江湖自己在转，去哪儿、管不管闲事，由你。</p>
    ${warn}<div class="t-btns" id="tBtns"></div></div>`;
  L.hidden = false;
  titleButtons(saved);
}

function titleButtons(saved: GameState | null, confirm?: 'new' | 'skip'): void {
  const box = $('#tBtns');
  if (!box) return;
  if (confirm) {
    box.innerHTML = `<p class="t-warn">这会覆盖现在的进度。</p>
      <button class="t-btn" data-act="tGo:${confirm}">确定，重新开始</button>
      <button class="t-btn ghost" data-act="tBack">算了</button>`;
    return;
  }
  box.innerHTML = saved
    ? `<button class="t-btn" data-act="tContinue">继续<small>${chapterLabel(saved)} · ${dateStr(saved)}</small></button>
       <button class="t-btn ghost" data-act="tNew:new">新的江湖</button>
       <button class="t-link" data-act="tNew:skip">跳过序章，直接去扬州</button>${titleAccountHTML()}`
    // 头一回打开不给「跳过序章」：序章是负责人定的一段完整剧情，没玩过的人该从这里进（docs/paiban.md A8）
    : `<button class="t-btn" data-act="tGo:new">新的江湖</button>${titleAccountHTML()}`;
}

function hideTitle(): void {
  const L = $('#titleLayer')!;
  L.hidden = true;
  L.innerHTML = '';
}

registerHandlers({
  stPick: v => { if (!tooSoon()) pick(Number(v)); },
  stNext: () => { if (cur && !tooSoon()) advance(cur.next ?? cur.i + 1); },
  stName: v => { const el = $('#nameIn') as HTMLInputElement | null; if (el) el.value = v; },
  chapDone: () => finishChapter(),
  // 够不着的选项：点了说清差什么
  stLocked: v => {
    const c = cur?.def.cards[cur.i].choices[Number(v)];
    if (!c || !cur) return;
    const lack = lackOf(c.if) ?? plan(effectReq('抉择', cur.def.id, c.do, c.if, `story:${cur.def.id}:${cur.i}`)).why;
    if (lack) toast(`还走不了这条路：${lack}`);
  },
  tContinue: () => {
    const saved = load();
    if (!saved) return;
    tupoClear(); // 换存档：旧档攒着没弹的突破卡不带过去
    setState(saved);
    hideTitle();
    // 停在新序章中途的：接回那一屏（打到一半的，从头再打这一场）
    const at = kpPos(saved);
    if (at) {
      render();
      if (at.kind === 'fight') hooks.startFight(at.id);
      else openStory(at.id, undefined, undefined, at.i);
      return;
    }
    // 下线就是静修：离开的时辰算成静修的日子，先读出关邸报（ui/chuguan.ts）。要在 render 之前算：render 会存档，把「上次在线」记成现在
    if (!welcomeBack()) render();
  },
  tNew: v => titleButtons(load(), v === 'skip' ? 'skip' : 'new'),
  tBack: () => titleButtons(load()),
  tGo: v => {
    hideTitle();
    if (v === 'skip') {
      // 跳过也要取名、看一张前情（p_skip），看完题字「第一回 · 扬州」
      setState(skipToYangzhou());
      render();
      openStory('p_skip');
    } else {
      setState(newGame());
      render();
      openStory('p_open');
    }
    save();
  }
});

hooks.openStory = openStory;
