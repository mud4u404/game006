/**
 * 界面外壳：顶栏、内容区、底部标签、提示、底部弹层，以及统一的点击分发。
 * 所有可点的元素都写 data-act="动作:参数"，由 registerHandlers 注册的处理函数接手。
 */
import { S, save, type Tab } from '../core/state';
import { on } from '../core/bus';
import { dateStr, shichenKe } from '../core/time';
import { $, cn } from '../core/util';
import { room } from '../content';
import type { Outcome } from '../engine/dsl';
import { IC } from './icons';
import { viewJianghu } from './views/jianghu';
import { viewRenwu } from './views/renwu';
import { viewWugong } from './views/wugong';
import { viewXingnang } from './views/xingnang';
import { viewDitu } from './views/ditu';
import { checkYue } from '../engine/shiguang';
import { tierCheck, tupoPending, tupoTake } from '../engine/tupo';
import { tupoCardHTML } from './tupo';
import { tickShi } from '../engine/shishi';
import { refreshGreet } from '../engine/yingmian';
import { tickWorld } from '../engine/shijie';
import { dropFailedTrack } from '../engine/daohang';
import { isPreview } from '../core/preview';
import { markVisit, markWent, trackPower } from '../engine/jiemian';
import { clickLabel, recordClick, wushiOn } from '../core/wushi';

type Handler = (v: string, el: HTMLElement) => void;
const handlers: Record<string, Handler> = {};
export function registerHandlers(map: Record<string, Handler>): void { Object.assign(handlers, map); }

/** 战斗和剧情模块在加载时把自己挂到这里，避免模块之间循环引用 */
export const hooks = {
  startFight: (_foe: string, _lead?: string): void => {},
  /** onDone：剧情正常读完时调用（中途开打或接到别的剧情时不调用），赶路途中的路遇用它接着走 */
  openStory: (_id: string, _onDone?: () => void, _lead?: string): void => {}
};

/**
 * 刚换上来的一组按钮（下一张剧情卡、出重招时的应对、胜负以后、结算）：头三百多毫秒不收点击。
 * 连点的第二下会落在新按钮上，等于没看清就选了（负责人 10-09：「个别选项点不中」）
 */
let swappedAt = 0;
export const swapped = (): void => { swappedAt = performance.now(); };
export const tooSoon = (ms = 350): boolean => performance.now() - swappedAt < ms;

/** 赶路时点灰着的东西，提示这一句 */
export const TRAVEL_BUSY = '正在赶路……要停，点赶路条上的「停下」';

/** 统一处理一次动作产生的后果：先剧情，再开打，否则刷新画面 */
/**
 * 动作的后果：开剧情、开打，或者重画。lead 是这个分支自己的那段文字：
 * 同一个分支里既写了话又开打（开剧情）的，话放进战斗开场（剧情第一张卡最前面），不丢（审查 B04）
 */
export function afterOutcome(out: Outcome | null, lead?: string): void {
  if (out?.story) hooks.openStory(out.story, undefined, lead);
  else if (out?.fight) hooks.startFight(out.fight, lead);
  else render();
}

let built = false;
export function buildShell(): void {
  const app = $('#app');
  if (!app) return;
  app.innerHTML = `
    <header class="appbar" id="appbar"></header>
    <main id="main"></main>
    <nav class="tabs" id="tabs" aria-label="主导航"></nav>
    <div id="travel" class="travel" hidden></div>
    <div id="fightLayer" hidden></div>
    <div id="storyLayer" hidden></div>
    <div id="chapLayer" hidden></div>
    <div id="sheetLayer" hidden></div>
    <div id="titleLayer" hidden></div>
    <div id="toast" class="toast" role="status" hidden></div>
    <button id="wushiFb" class="wushi-fb" data-act="wushiOpen" hidden>反馈</button>`;
  syncWushi();
  if (built) return;
  built = true;
  // 手指按下时底下是哪个按钮（负责人 10-09：「点着点着会卡住，个别选项点不中」）。
  // 手机上的「点一下」是抬起时才算：按下到抬起之间画面换了（换了面板、下一张剧情卡），抬起处就成了别的按钮。
  // 按下和抬起要落在同一个按钮上才算数；对不上的那一下不算，宁可再点一次，也不点错
  let down: { el: HTMLElement | null; t: number } = { el: null, t: 0 };
  document.addEventListener('pointerdown', e => {
    down = { el: (e.target as HTMLElement).closest<HTMLElement>('[data-act]'), t: performance.now() };
  }, { capture: true, passive: true });
  // 合并着写的存档：切到后台、关页面时立刻写
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
  window.addEventListener('pagehide', saveNow);
  // iOS 要页面听过 touchstart，按钮的 :active（按下去的样子）才显示
  document.addEventListener('touchstart', () => {}, { passive: true });
  // 键盘收起以后把页面滚回原位：不然看到的按钮和实际点得到的位置错开（iOS、微信里常见）
  document.addEventListener('focusout', e => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') window.setTimeout(() => window.scrollTo(0, 0), 60);
  });
  document.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    // 键盘回车、程序触发的点击（detail 为 0）不查；按下已经过去很久（没有 pointer 事件的老浏览器）也不查
    const fresh = performance.now() - down.t < 1500;
    if (e.detail !== 0 && fresh && down.el !== el) { down = { el: null, t: 0 }; return; }
    down = { el: null, t: 0 };
    if (!el || (el as HTMLButtonElement).disabled) return;
    // 赶路途中，主画面和底部标签是灰的：点了要说一句，不能静悄悄没反应（赶路条上的「停下」照常，样式见 app.css 的 .traveling）
    if (document.getElementById('app')?.classList.contains('traveling') && el.closest('#main, #tabs')) { toast(TRAVEL_BUSY); return; }
    // 只认点在自己身上的（弹层的遮罩：点在面板里的空白处不算点了遮罩）
    if (el.hasAttribute('data-self') && e.target !== el) return;
    const a = el.dataset.act || '';
    // 巫师模式：记最近 10 次点击（动作名 + 按钮上的字），反馈时附上
    recordClick(a + clickLabel(el));
    const i = a.indexOf(':');
    const k = i < 0 ? a : a.slice(0, i);
    const v = i < 0 ? '' : a.slice(i + 1);
    handlers[k]?.(v, el);
  });
  on('toast', toast);
}

/** 巫师模式：右上角的「反馈」按钮显隐（普通玩家这个按钮一直是藏着的） */
export function syncWushi(): void {
  const on = wushiOn();
  const b = $('#wushiFb');
  if (b) b.hidden = !on;
  $('#app')?.classList.toggle('wushi', on);
}

/** 试玩预览（/preview/）：页面顶上挂一行提示，画面整体往下让出这一行，不盖住任何按钮（样式见 app.css「试玩预览」） */
export function previewBar(): void {
  if (!isPreview() || document.querySelector('.pv-bar')) return;
  document.documentElement.classList.add('preview');
  const bar = document.createElement('div');
  bar.className = 'pv-bar';
  bar.setAttribute('role', 'note');
  bar.textContent = '试玩预览：存档与正式版分开';
  document.body.prepend(bar);
}

let toastTimer = 0;
export function toast(text: string): void {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.hidden = true; }, 1900);
}

/** 打开底部弹层。dismiss：点外面（遮罩）就关（见闻簿、细看这类）；结算、出关这类非点按钮不可的不写 */
export function openSheet(html: string, dismiss = false): void {
  const L = $('#sheetLayer');
  if (!L) return;
  L.innerHTML = `<div class="scrim"${dismiss ? ' data-act="scrimClose" data-self' : ''}><div class="panel" role="dialog" aria-modal="true">${html}</div></div>`;
  L.hidden = false;
}
registerHandlers({ scrimClose: () => closeSheet() });

export function closeSheet(): void {
  const L = $('#sheetLayer');
  if (!L) return;
  L.hidden = true;
  L.innerHTML = '';
  // 页关了，若还有攒着的突破，等这一轮动作做完再弹（后面紧跟着开别的页的，就让它先开）
  if (tupoPending()) window.setTimeout(flushTupo, 0);
}

const VIEWS: Record<Tab, () => string> = { jianghu: viewJianghu, renwu: viewRenwu, wugong: viewWugong, xingnang: viewXingnang, ditu: viewDitu };
const TABS: [Tab, string][] = [['jianghu', '江湖'], ['renwu', '人物'], ['wugong', '武功'], ['xingnang', '行囊'], ['ditu', '地图']];

/** 只刷新顶栏（地名、时辰）：赶路途中用，不动下面的按钮 */
export function renderBar(): void {
  const r = room(S.loc), bar = $('#appbar');
  if (bar) bar.innerHTML = `<div><h1>${r.name}</h1><div class="sub">${r.area} · ${dateStr(S)}</div></div><div class="timepill">${IC.rain}${shichenKe(S.min)} · ${S.weather}</div>`;
}

/**
 * 存档合并着写：每画一次就写两三回本机存档，低端手机会顿一下。最多两秒写一次；切到后台、关页面时立刻写。
 * 战斗结算、剧情收尾、闭关这些要紧处，照旧直接调 save()
 */
let saveTimer = 0;
function saveSoon(): void {
  if (saveTimer) return;
  saveTimer = window.setTimeout(() => { saveTimer = 0; save(); }, 2000);
}
function saveNow(): void {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = 0;
  save();
}

/** 失约的提示：一次失了几个约，合成一条，不然只看得到最后那条（审查 H45）。详情都在见闻里 */
export function missedToast(ms: string[]): void {
  if (ms.length === 1) toast(ms[0]);
  else if (ms.length > 1) toast(`一下子失了${cn(ms.length)}个约，见闻里记着。`);
}

export function render(): void {
  // 过了约期还没赴的约，算失约（engine/shiguang.ts）：失约的后果、心魔，都记进见闻
  missedToast(checkYue(S));
  tierCheck();
  // 江湖自己往前走：世界的慢变逐日补到今天（engine/shijie.ts）；世事该起头的起头，到日子的往下走（engine/shishi.ts）
  tickWorld();
  tickShi();
  // 迎面：场景里有人先开口（engine/yingmian.ts）；这个时辰段挑过的不再挑
  refreshGreet();
  // 记挂着的心事做不成了：放下横幅，动态里记一笔（engine/daohang.ts）
  dropFailedTrack();
  const main = $('#main'), tabs = $('#tabs');
  if (!main || !tabs) return;
  renderBar();
  markVisit();
  markWent(S.loc);
  trackPower(S.tab === 'jianghu');
  main.innerHTML = (VIEWS[S.tab] || viewJianghu)();
  tabs.innerHTML = TABS.map(([k, l]) => `<button class="tab" data-act="tab:${k}"${S.tab === k ? ' aria-current="page"' : ''}>${IC[k]}${l}</button>`).join('');
  saveSoon();
  flushTupo();
}

/**
 * 攒下的突破（升重、升档、习得，engine/tupo.ts）合成一张「突破」卡弹出来。
 * 正在打、正在看剧情、开着别的页的时候不弹，等那一页关了再弹（closeSheet、下一回 render 都会来问一声）
 */
export function flushTupo(): void {
  if (!tupoPending()) return;
  const busy = ['fightLayer', 'storyLayer', 'chapLayer', 'sheetLayer', 'titleLayer'].some(id => $('#' + id)?.hidden === false);
  if (busy) return;
  openSheet(tupoCardHTML(tupoTake()), true);
  swapped();
}
