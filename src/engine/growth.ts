import { S, pushFeed } from '../core/state';
import { emit } from '../core/bus';
import { REALMS, REALM_NEED, skillById } from '../content';
import type { SkillId } from '../content/types';

/** 增加熟练度，满了自动突破。返回突破说明，例如「「寒江剑法」突破至「融会贯通」」 */
export function gainProf(id: SkillId, n: number): string[] {
  const s = S.skills[id];
  const sk = skillById(id);
  if (!s || !sk) return [];
  const out: string[] = [];
  s.p += n;
  while (s.r < REALMS.length - 1 && s.p >= REALM_NEED[s.r]) {
    s.p -= REALM_NEED[s.r];
    s.r++;
    out.push(`「${sk.name}」突破至「${REALMS[s.r]}」`);
  }
  out.forEach(x => { pushFeed('突破', x + '！'); emit('toast', x + '！'); });
  return out;
}

/** 习得新武功；已经会的则改为增加熟练度 */
export function learnSkill(id: SkillId, realm = 0, prof = 0): string[] {
  if (S.skills[id]) return gainProf(id, prof);
  const sk = skillById(id);
  if (!sk) return [];
  S.skills[id] = { r: realm, p: prof };
  const msg = `习得「${sk.name}」`;
  pushFeed('突破', msg + '！');
  emit('toast', msg + '！');
  return [msg];
}
