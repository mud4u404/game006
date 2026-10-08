/**
 * 根基之眼（docs/foundation.md 第三节第一条第二款）：交手以外，每种根基读到不同的东西。
 * - 悟性：话里的破绽、碑文诗句的意思、线索；
 * - 胆魄：谁色厉内荏，可以压一压；
 * - 身法：能攀、能借力、能跟上的路；
 * - 体魄：伤势，谁带着伤；
 * - 根骨：谁是练家子，内力深不深。
 * 看的是后天根基（engine/ren.ts 的 houtianOf）：武功练上去，眼力也跟着长。
 */
import { S } from '../core/state';
import { EYES } from '../content';
import type { AttrKey, EyeDef } from '../content/types';
import { test } from './dsl';
import { houtianOf } from './ren';

const ORDER: AttrKey[] = ['悟性', '胆魄', '身法', '体魄', '根骨'];

/** 此刻看得出的东西：地点的（场景下面）或人物的（观察时） */
export function eyesOn(where: { room?: string; npc?: string }): EyeDef[] {
  const h = houtianOf(S);
  return EYES
    .filter(e => (where.room ? e.room === where.room : e.npc === where.npc) && h[e.attr] >= e.atLeast && test(e.if))
    .sort((a, b) => ORDER.indexOf(a.attr) - ORDER.indexOf(b.attr));
}
