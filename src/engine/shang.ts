/**
 * 伤（负责人 10-09）：「你打比你弱的人，赢了，就不应该有很多伤……就算伤了，轻伤它应该会自己慢慢愈合，重伤需要找人医治或者服药。」
 * - 落伤看强弱：吃重招才落伤（engine/duel.ts 的 woundLv），打赢了再按开打前掂的斤两封顶（woundCap）；
 * - 一级是轻伤：过一日自己好（healLight，挂在 engine/shiguang.ts 的 checkYue 上，日子往前走就结算）；
 * - 二级、三级是重伤：自己不会好，闭关也养不好；找郎中「看伤」、服药（跌打酒治手足、内伤药治内息），一次轻一级，轻到一级再自己好。
 */
import { pushFeed, type GameState } from '../core/state';
import { dayNo } from '../core/time';
import { ZONE_NAME, type DuelRes, type Wounds, type Zone } from './duel';

/** 三处伤，最重的先算；一样重时先内息，再手、足 */
export const ZONES: Zone[] = ['inner', 'hand', 'foot'];

/** 一级是轻伤，二级以上是重伤 */
export const isHeavy = (n: number): boolean => n >= 2;

/** 一句话说这一处伤怎么好 */
export const woundNote = (n: number): string => (isHeavy(n) ? '重伤，自己好不了，要找郎中看伤或者服药' : '轻伤，过一日自己好');

/**
 * 这一场最多落几级伤（几处加起来）：只看打赢了的，按开打前掂的斤两（engine/zhaoshi.ts 的 kanren，赢面 odds）。
 * 远不如你的不落伤，稍逊一筹的最多一级，旗鼓相当的最多两级；比你强的、打输了的、跑了的不封顶（一处最多三级）
 */
export function woundCap(res: DuelRes, odds?: number): number {
  if (res !== 'win' || odds === undefined) return Infinity;
  if (odds >= 0.75) return 0;
  if (odds >= 0.55) return 1;
  if (odds >= 0.45) return 2;
  return Infinity;
}

/** 照封顶削减这一场落的伤：重的那处先留 */
export function capWounds(taken: Partial<Wounds>, cap: number): Partial<Wounds> {
  const out: Partial<Wounds> = {};
  let left = cap;
  for (const z of ZONES.slice().sort((a, b) => (taken[b] ?? 0) - (taken[a] ?? 0))) {
    const n = Math.min(taken[z] ?? 0, left);
    if (n > 0) { out[z] = n; left -= n; }
  }
  return out;
}

const nowMin = (s: GameState): number => dayNo(s) * 1440 + s.min;

/** 伤变了以后记下：哪几处成了轻伤、从什么时候起算（过一日自己好） */
export function markLight(s: GameState): void {
  const since = (s.lightSince ||= {});
  for (const z of ZONES) {
    if (s.wounds[z] !== 1) delete since[z];
    else if (since[z] === undefined) since[z] = nowMin(s);
  }
}

/** 轻伤自己好：一级的伤过了一日就好了。返回好了的几处（也写进见闻） */
export function healLight(s: GameState): Zone[] {
  markLight(s);
  const since = s.lightSince!, now = nowMin(s), healed: Zone[] = [];
  for (const z of ZONES) {
    const t = since[z];
    if (t !== undefined && now - t >= 1440) { s.wounds[z] = 0; delete since[z]; healed.push(z); }
  }
  if (healed.length) pushFeed('江湖', `${healed.map(z => ZONE_NAME[z]).join('、')}的轻伤好了。`);
  return healed;
}
