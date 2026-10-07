import { S, pushFeed } from '../core/state';
import { emit } from '../core/bus';
import { REALMS, REALM_NEED, skillById } from '../content';
import type { SkillId } from '../content/types';
import { autoSlot } from './wuxue';
import { canLearn, realmCap } from './shicheng';
import { milestoneGrowth, profMul } from './gengu';

/** 按境界上限把攒够的熟练度换成突破，返回突破说明 */
function settle(id: SkillId): string[] {
  const s = S.skills[id];
  const sk = skillById(id);
  if (!s || !sk) return [];
  const out: string[] = [];
  const cap = Math.min(REALMS.length - 1, realmCap(S, sk));
  while (s.r < cap && s.p >= REALM_NEED[s.r]) {
    s.p -= REALM_NEED[s.r];
    s.r++;
    out.push(`「${sk.name}」突破至「${REALMS[s.r]}」`);
    milestoneGrowth(S, sk, s.r);
  }
  return out;
}

/**
 * 增加熟练度，满了自动突破。返回突破说明，例如「「寒江剑法」突破至「融会贯通」」。
 * 外功受内功所限（见 docs/menpai.md 第七节）：到了上限，熟练度照涨，等内功突破后一并突破。
 */
export function gainProf(id: SkillId, n: number): string[] {
  const s = S.skills[id];
  const sk = skillById(id);
  if (!s || !sk) return [];
  const was = s.p;
  // 根基决定练得快慢：根骨管内功，身法管轻功，悟性管外功（engine/gengu.ts）
  s.p += Math.max(0, Math.round(n * profMul(S, sk)));
  const out = settle(id);
  // 内功突破了，先前卡在瓶颈的外功跟着突破
  if (sk.category === '内功' && out.length) for (const other of Object.keys(S.skills)) if (other !== id) out.push(...settle(other));
  out.forEach(x => { pushFeed('突破', x + '！'); emit('toast', x + '！'); });
  const need = REALM_NEED[s.r];
  if (s.r < REALMS.length - 1 && s.p >= need && was < need) pushFeed('江湖', `「${sk.name}」已到瓶颈：内功根基不够，先把内功练上去，才突破得了。`);
  return out;
}

/** 习得新武功；已经会的则改为增加熟练度。前置、师门、门规不满足时学不成（见 docs/menpai.md 第七节） */
export function learnSkill(id: SkillId, realm = 0, prof = 0): string[] {
  if (S.skills[id]) return gainProf(id, prof);
  const sk = skillById(id);
  if (!sk) return [];
  const can = canLearn(S, sk);
  if (!can.ok) {
    const msg = `想学「${sk.name}」，可是${can.why}`;
    pushFeed('江湖', msg + '。');
    emit('toast', msg + '。');
    return [];
  }
  S.skills[id] = { r: realm, p: prof };
  autoSlot(S, sk);
  const msg = `习得「${sk.name}」`;
  pushFeed('突破', msg + '！');
  emit('toast', msg + '！');
  return [msg];
}
