export const $ = <T extends HTMLElement = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
export const rnd = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export const reduceMotion: boolean =
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function buzz(pattern: number | number[]): void {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch { /* 部分设备不支持振动 */ }
}

const CN = '零一二三四五六七八九';
/** 中文数字：12 → 十二，30 → 三十，100 → 一百，105 → 一百零五，2500 → 两千五百（一万以上照写阿拉伯数字） */
export function cn(n: number): string {
  n = Math.floor(n);
  if (n < 0) return '负' + cn(-n);
  if (n < 10) return CN[n];
  if (n < 20) return '十' + (n % 10 ? CN[n % 10] : '');
  if (n < 100) return CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
  if (n >= 10000) return String(n);
  const units: [number, string][] = [[1000, '千'], [100, '百'], [10, '十']];
  let out = '', rest = n, zero = false;
  for (const [u, name] of units) {
    const d = Math.floor(rest / u);
    rest %= u;
    if (d) { out += (zero ? '零' : '') + (d === 2 && u >= 100 ? '两' : CN[d]) + name; zero = false; }
    else if (out) zero = true;
  }
  if (rest) out += (zero ? '零' : '') + CN[rest];
  return out;
}
/** 计数用的中文数字：2 写作「两」 */
export const liang = (n: number): string => (n === 2 ? '两' : cn(n));

/** 招式名高亮（我方 / 对方）与伤势高亮，用于战斗文字 */
export const M = (s: string): string => `<b class="mv">「${s}」</b>`;
export const MO = (s: string): string => `<b class="mv op">「${s}」</b>`;
export const H = (s: string): string => `<b class="hurt">${s}</b>`;

/** 把 {key} 占位符替换成 vars 里的值，未提供的保持原样 */
export function fmt(text: string, vars: Record<string, string | number | undefined>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] !== undefined ? String(vars[k]) : m));
}

/** 只保留文字（汉字、字母），用于玩家输入的名字，防止注入 HTML */
export function cleanName(raw: string, max = 4): string {
  return Array.from(raw.replace(/[^\p{L}]/gu, '')).slice(0, max).join('');
}
