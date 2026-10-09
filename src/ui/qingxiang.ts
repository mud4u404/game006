/**
 * 剧情选项不写数值，写倾向（docs/paiban.md A9、A10、H16，依据「金庸」）：
 * 选之前，「侠义 +2　恶名 −2」写成「侠义之举　洗些恶名」；花钱照实写成「花四十文」——代价要让人看得见；
 * 选完以后，结果下面再写加了什么。内容包里的 sub 照旧写数，换说法只在界面上做，协作者不用改。
 */
import { cn } from '../core/util';

const TOKEN = /(侠义|恶名|银两|历练|悟性|根骨|胆魄|身法|心性|[^\s　，,、]{1,8}熟练)\s*([+＋−-])\s*(\d+)\s*(文)?/g;

/** 一项数值写成倾向；不值得说的（历练、熟练、得赏钱）返回空 */
function lean(k: string, up: boolean, n: number): string {
  if (k === '侠义') return up ? '侠义之举' : '有损侠名';
  if (k === '恶名') return up ? '会落恶名' : '洗些恶名';
  if (k === '银两') return up ? '' : `花${n >= 1000 && n % 1000 === 0 ? cn(n / 1000) + '两银子' : cn(n) + '文'}`;
  if (k === '历练' || k.endsWith('熟练')) return '';
  return up ? `${k}见长` : `${k}受损`;
}

/** 选之前看的：数值换成倾向，剩下的字照留 */
export function leanText(sub: string): string {
  const parts: string[] = [];
  const rest = sub.replace(TOKEN, (_m, k: string, sign: string, n: string) => {
    const t = lean(k, sign === '+' || sign === '＋', Number(n));
    if (t && !parts.includes(t)) parts.push(t);
    return '\u0000';
  });
  const words = rest.split(/[\u0000　，,、\s]+/).map(x => x.trim()).filter(Boolean);
  return [...parts, ...words].join('　');
}

/** 选完以后看的：写了哪些数，照原样列出来（「侠义 +2」「银两 −20」） */
export function gainTags(sub: string | undefined): string[] {
  if (!sub) return [];
  return [...sub.matchAll(TOKEN)].map(m => `${m[1]} ${m[2] === '-' ? '−' : m[2]}${m[3]}${m[4] ?? ''}`);
}
