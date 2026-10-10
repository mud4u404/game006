/**
 * 突破：升了一重武功、升了一档功夫、习得一门新武功，都记在这里，由界面攒成一张醒目的「突破」卡（ui/tupo.ts）。
 * 同一次结算（闭关、一场架、一段剧情）里碰到的多次突破，合成一张卡；闭关出关的邸报最上面也读这里。
 * 只在内存里攒，不进存档：卡没来得及看，见闻簿里照样记着（growth.ts、tierCheck 各写了一条）。
 */
import { S, pushFeed } from '../core/state';
import { tierNow } from './ren';

export type TupoKind = 'dang' | 'zhong' | 'xue';
export interface Tupo { kind: TupoKind; text: string }

/** 卡上的次序：先升档，再升重，最后习得 */
const ORDER: TupoKind[] = ['dang', 'zhong', 'xue'];
export const TUPO_TAG: Record<TupoKind, string> = { dang: '升档', zhong: '升重', xue: '新学' };

let Q: Tupo[] = [];

export function tupoAdd(kind: TupoKind, text: string): void {
  if (!Q.some(x => x.kind === kind && x.text === text)) Q.push({ kind, text });
}

/** 还有没有没读的突破 */
export const tupoPending = (): boolean => Q.length > 0;

/** 取走攒下的突破，按升档、升重、习得的次序排好 */
export function tupoTake(): Tupo[] {
  const out = ORDER.flatMap(k => Q.filter(x => x.kind === k));
  Q = [];
  return out;
}

export const tupoClear = (): void => { Q = []; };

/**
 * 升了档次：记一条见闻、攒一条突破（审查 G13：升档没有任何提示）。旧存档头一回只记下，不提。
 * 界面每画一次、出关结算前各调一回
 */
export function tierCheck(): void {
  const t = tierNow(S);
  if (S.tierTop === undefined || t.t <= S.tierTop) { S.tierTop = Math.max(S.tierTop ?? t.t, t.t); return; }
  S.tierTop = t.t;
  pushFeed('江湖', `你的功夫到了「${t.name}」这一档。`);
  tupoAdd('dang', `功夫入了「${t.name}」这一档`);
}
