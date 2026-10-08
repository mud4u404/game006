/**
 * 界面外壳：顶栏、内容区、底部标签、提示、底部弹层，以及统一的点击分发。
 * 所有可点的元素都写 data-act="动作:参数"，由 registerHandlers 注册的处理函数接手。
 */
import { S, save, type Tab } from '../core/state';
import { on } from '../core/bus';
import { dateStr, shichenKe } from '../core/time';
import { $ } from '../core/util';
import { room } from '../content';
import type { Outcome } from '../engine/dsl';
import { IC } from './icons';
import { viewJianghu } from './views/jianghu';
import { viewRenwu } from './views/renwu';
import { viewWugong } from './views/wugong';
import { viewXingnang } from './views/xingnang';
import { viewDitu } from './views/ditu';
import { checkYue } from '../engine/shiguang';
import { tickShi } from '../engine/shishi';
import { isPreview } from '../core/preview';

type Handler = (v: string, el: HTMLElement) => void;
const handlers: Record<string, Handler> = {};
export function registerHandlers(map: Record<string, Handler>): void { Object.assign(handlers, map); }

/** 战斗和剧情模块在加载时把自己挂到这里，避免模块之间循环引用 */
export const hooks = {
  startFight: (_foe: string): void => {},
  /** onDone：剧情正常读完时调用（中途开打或接到别的剧情时不调用），赶路途中的路遇用它接着走 */
  openStory: (_id: string, _onDone?: () => void): void => {}
};

/** 统一处理一次动作产生的后果：先剧情，再开打，否则刷新画面 */
export function afterOutcome(out: Outcome | null): void {
  if (out?.story) hooks.openStory(out.story);
  else if (out?.fight) hooks.startFight(out.fight);
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
    <div id="toast" class="toast" role="status" hidden></div>`;
  if (built) return;
  built = true;
  document.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const a = el.dataset.act || '';
    const i = a.indexOf(':');
    const k = i < 0 ? a : a.slice(0, i);
    const v = i < 0 ? '' : a.slice(i + 1);
    handlers[k]?.(v, el);
  });
  on('toast', toast);
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

export function openSheet(html: string): void {
  const L = $('#sheetLayer');
  if (!L) return;
  L.innerHTML = `<div class="scrim"><div class="panel" role="dialog" aria-modal="true">${html}</div></div>`;
  L.hidden = false;
}

export function closeSheet(): void {
  const L = $('#sheetLayer');
  if (!L) return;
  L.hidden = true;
  L.innerHTML = '';
}

const VIEWS: Record<Tab, () => string> = { jianghu: viewJianghu, renwu: viewRenwu, wugong: viewWugong, xingnang: viewXingnang, ditu: viewDitu };
const TABS: [Tab, string][] = [['jianghu', '江湖'], ['renwu', '人物'], ['wugong', '武功'], ['xingnang', '行囊'], ['ditu', '地图']];

export function render(): void {
  // 过了约期还没赴的约，算失约（engine/shiguang.ts）：失约的后果、心魔，都记进见闻
  for (const m of checkYue(S)) toast(m);
  // 江湖自己往前走（engine/shishi.ts）：该起头的起头，到日子的往下走
  tickShi();
  const r = room(S.loc);
  const bar = $('#appbar'), main = $('#main'), tabs = $('#tabs');
  if (!bar || !main || !tabs) return;
  bar.innerHTML = `<div><h1>${r.name}</h1><div class="sub">${r.area} · ${dateStr(S)}</div></div><div class="timepill">${IC.rain}${shichenKe(S.min)} · ${S.weather}</div>`;
  main.innerHTML = (VIEWS[S.tab] || viewJianghu)();
  tabs.innerHTML = TABS.map(([k, l]) => `<button class="tab" data-act="tab:${k}"${S.tab === k ? ' aria-current="page"' : ''}>${IC[k]}${l}</button>`).join('');
  save();
}
