/**
 * 原型开关（docs/foundation.md 第三版第八节）：要负责人在手机上凭手感判断的新玩法，先放在这里试。
 * 只在原型的构建里打开（VITE_PROTO=1），或者网址里带 ?proto=1；正式的游戏不受影响。
 */
export const PROTO: boolean = import.meta.env.VITE_PROTO === '1' || (typeof location !== 'undefined' && /[?&]proto=1(&|$)/.test(location.search));

const XUSHI_KEY = 'jhyy-proto-xushi';

/** 虚实开不开：原型里默认开，人物页可以切换，好对照着打 */
export function xushiOn(): boolean {
  if (!PROTO) return false;
  try { return localStorage.getItem(XUSHI_KEY) !== '0'; } catch { return true; }
}

export function setXushi(on: boolean): void {
  try { localStorage.setItem(XUSHI_KEY, on ? '1' : '0'); } catch { /* 存不了就只在这一次有效 */ }
}
