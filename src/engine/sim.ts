/**
 * 对战模拟：门派两两对打，统计胜率。标准见 docs/menpai.md 第六节，由 tests/balance.test.ts 把关。
 */
import { createCombat, fight, greedy, type Kit } from './combat';
import { mulberry32, seedOf } from './rng';

/** 打 n 场，返回 a 的得分率（赢 1、平 0.5、输 0）。左右轮换先后，种子固定 */
export function duel(a: Kit, b: Kit, n: number, salt = ''): number {
  let score = 0;
  for (let i = 0; i < n; i++) {
    const flip = i % 2 === 1;
    const c = createCombat(flip ? b : a, flip ? a : b, mulberry32(seedOf(a.name, b.name, salt, i)));
    const r = fight(c, greedy);
    const aWon = r === 0.5 ? 0.5 : (r === 0) !== flip ? 1 : 0;
    score += aWon;
  }
  return score / n;
}

export interface Matrix { names: string[]; rate: number[][]; overall: number[] }

/** 胜率矩阵：rate[i][j] 是 i 对 j 的得分率；overall 是对其余所有门派的平均 */
export function matrix(kits: Kit[], n: number, salt = ''): Matrix {
  const k = kits.length;
  const rate = Array.from({ length: k }, () => Array<number>(k).fill(0.5));
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const r = duel(kits[i], kits[j], n, salt);
    rate[i][j] = r;
    rate[j][i] = 1 - r;
  }
  const overall = rate.map((row, i) => row.reduce((a, x, j) => a + (i === j ? 0 : x), 0) / Math.max(1, k - 1));
  return { names: kits.map(x => x.name), rate, overall };
}

/** 打印成一张表 */
export function formatMatrix(m: Matrix): string {
  const pct = (x: number): string => String(Math.round(x * 100)).padStart(4);
  const head = '          ' + m.names.map(n => n.slice(0, 2).padStart(3)).join('') + '   总胜率';
  const rows = m.names.map((n, i) => n.padEnd(5, '　').slice(0, 5) + ' ' + m.rate[i].map((x, j) => (i === j ? '   —' : pct(x))).join('') + '   ' + pct(m.overall[i]) + '%');
  return [head, ...rows].join('\n');
}
