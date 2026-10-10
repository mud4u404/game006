/**
 * 巫师账号（负责人 10-10）：手机上玩到有问题，随手反馈给维护者。
 * 这里只放不依赖界面的部分：开关（localStorage）、点击环形缓冲、反馈链接的拼法、瞬移。
 * 界面在 ui/wushi.ts。不放任何令牌、密钥；不改存档版本；巫师的工具只改本地存档。
 */
import type { GameState } from './state';

export const WUSHI_KEY = 'jhyy-wushi';
export const REPO = 'mud4u404/game006';
/** 链接超过这么长，存档码就不放进去，改成复制 */
export const URL_MAX = 7000;
/** 版本号连点几下切换巫师模式 */
export const TAP_N = 7;

export function wushiOn(): boolean {
  try { return globalThis.localStorage?.getItem(WUSHI_KEY) === '1'; } catch { return false; }
}
export function setWushi(on: boolean): void {
  try {
    if (on) globalThis.localStorage?.setItem(WUSHI_KEY, '1');
    else globalThis.localStorage?.removeItem(WUSHI_KEY);
  } catch { /* 存储不可用：当作没开 */ }
}

let taps: number[] = [];
/** 连点版本号：每次点一下调用，返回是否刚好点满七下（两秒内连着点才算） */
export function verTap(now = Date.now()): boolean {
  taps = taps.filter(t => now - t < 2000);
  taps.push(now);
  if (taps.length < TAP_N) return false;
  taps = [];
  return true;
}

const clicks: string[] = [];
/** 最近点击的环形缓冲：只在巫师模式下记 */
export function recordClick(text: string): void {
  if (!wushiOn()) return;
  clicks.push(text);
  if (clicks.length > 10) clicks.shift();
}
/** 点击记录里的名字：先取名字元素（.nm）或 aria-label，没有再取整个按钮的字；不拼头像上的字 */
export function clickLabel(el: { querySelector(s: string): { textContent: string | null } | null; getAttribute(n: string): string | null; textContent: string | null }): string {
  const raw = el.querySelector('.nm')?.textContent || el.getAttribute('aria-label') || el.textContent || '';
  const t = raw.trim().replace(/\s+/g, ' ').slice(0, 10);
  return t ? '「' + t + '」' : '';
}
export const recentClicks = (): string[] => clicks.slice();
export const clearClicks = (): void => { clicks.length = 0; };

export interface FeedbackInfo {
  /** 场景 id、名字 */
  loc: string; locName: string;
  /** 江湖时辰 */
  when: string;
  clicks: string[];
  /** 境界、气血、银两、主线 */
  realm: string; hp: string; silver: number; main: string;
  /** 版本（存档版本号） */
  ver: string;
}

export function feedbackTitle(text: string): string {
  return '【反馈】' + Array.from(text.trim().replace(/\s+/g, ' ')).slice(0, 20).join('');
}

/** 正文：玩家写的话在最前，下面是自动附上的信息，最后是存档码（或一句请粘贴的提示） */
export function feedbackBody(text: string, info: FeedbackInfo, code: string | null): string {
  return [
    text.trim(), '', '---', '（以下为自动附上）',
    `场景：${info.locName}（${info.loc}）`,
    `江湖时辰：${info.when}`,
    `版本：${info.ver}`,
    `角色：${info.realm} · 气血 ${info.hp} · 银两 ${info.silver} · 主线 ${info.main}`,
    `最近点击：${info.clicks.length ? info.clicks.join(' → ') : '（无）'}`,
    '', '存档码：',
    ...(code ? ['```', code, '```'] : ['存档码已复制，请粘贴在下面：', ''])
  ].join('\n');
}

/** 拼 GitHub 新建 Issue 的链接；太长就去掉存档码。返回链接和存档码有没有放进去 */
export function feedbackUrl(text: string, info: FeedbackInfo, code: string): { url: string; withCode: boolean } {
  const mk = (c: string | null): string =>
    `https://github.com/${REPO}/issues/new?labels=${encodeURIComponent('反馈')}&title=${encodeURIComponent(feedbackTitle(text))}&body=${encodeURIComponent(feedbackBody(text, info, c))}`;
  const full = mk(code);
  return full.length <= URL_MAX ? { url: full, withCode: true } : { url: mk(null), withCode: false };
}

/** 瞬移：只改本地存档的所在场景 */
export function teleport(s: GameState, loc: string): void { s.loc = loc; }
/** 银两 +n */
export function addSilver(s: GameState, n = 1000): void { s.silver += n; }
