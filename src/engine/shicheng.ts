/**
 * 师承与前置：能不能学一门武功、能不能使它的绝招、外功最多练到第几重。
 * 规则见 docs/menpai.md 第七节。
 */
import { REALMS, skillById } from '../content';
import { JIANGHU_RULE, ROOTED_CATS, ROOT_ANY, SCHOOL_STYLE, SECT_RANKS, TEACH_RANK } from '../content/skills';
import type { SkillDef } from '../content/types';
import type { GameState } from '../core/state';
import { houtianOf } from './ren';

type St = Pick<GameState, 'skills' | 'attr' | 'loadout' | 'sect' | 'pastSects' | 'gear' | 'gongli' | 'name'>;

export type LearnCheck = { ok: true } | { ok: false; why: string };

const rankIdx = (r: string): number => SECT_RANKS.indexOf(r as never);

/** 学得了吗：门规 → 师门地位 → 前置武学 → 属性门槛 */
export function canLearn(s: St, def: SkillDef): LearnCheck {
  const sect = s.sect;
  const jianghu = def.school === JIANGHU_RULE.school;
  // 寒江一脉是主角的家学，不受别派门规限制（docs/decisions.md）：拜过严门的人，主线里照样学得到
  if (sect && !jianghu && def.school !== sect.school && def.school !== '寒江') {
    const rule = SCHOOL_STYLE[sect.school];
    if (rule?.discipline === '严') return { ok: false, why: `门规森严，${sect.school}弟子在门期间不得兼修别派武功` };
    const style = SCHOOL_STYLE[def.school]?.main;
    if (style && rule?.forbid?.includes(style)) return { ok: false, why: `${sect.school}门规，禁修${style}一路的功夫` };
  }
  if (!jianghu && def.teach && def.teach !== '奇遇') {
    const need = TEACH_RANK[def.teach];
    if (sect?.school !== def.school) return { ok: false, why: `这是${def.school}的武功，要先拜入${def.school}门下` };
    if (rankIdx(sect.rank) < rankIdx(need)) return { ok: false, why: `要做到${def.school}${need}弟子才能学` };
  }
  for (const r of def.requires || []) {
    if ((s.skills[r.skill]?.r ?? -1) < r.realm) return { ok: false, why: `根基未到，要先把「${skillById(r.skill)?.name ?? r.skill}」练到「${REALMS[r.realm]}」` };
  }
  // 根基的门槛看后天（engine/ren.ts）：武功练深了，悟性、根骨跟着长
  const h = houtianOf(s);
  for (const [k, v] of Object.entries(def.needAttr || {})) {
    if ((h[k as keyof St['attr']] ?? 0) < (v ?? 0)) return { ok: false, why: `${k}不够，至少要 ${v}` };
  }
  return { ok: true };
}

/** 人物页「门派」一格：「丐帮 · 记名弟子」；没有师门写「无门无派」 */
export const sectText = (s: Pick<GameState, 'sect'>): string => (s.sect ? `${s.sect.school} · ${s.sect.rank}弟子` : '无门无派');

/** 门规的宽严，写给人看的一句（docs/menpai.md 第七节第五条，canLearn 照这个把关） */
export function menguiText(school: string): string {
  const r = SCHOOL_STYLE[school];
  if (!r) return '';
  if (r.discipline === '严') return '门规森严：在门期间只学本门武功、江湖散学和自家的寒江一脉，别派的功夫（连奇遇在内）一概学不得。';
  if (r.discipline === '邪') return '门规不讲究：什么都学得，只是正道容不下你。';
  const forbid = r.forbid?.length ? `；${r.forbid.join('、')}一路的功夫不许碰` : '';
  return `门规宽：可以兼修别派，只是别派的外功没有本门内功打底，只剩普通招式${forbid}。`;
}

/** 来历：离开过的师门，例如「出师于丐帮；叛出军伍」 */
export const pastSectText = (s: Pick<GameState, 'pastSects'>): string =>
  (s.pastSects ?? []).map(x => (x.how === '出师' ? `出师于${x.school}` : `叛出${x.school}`)).join('；');

/** 这门内功能不能给这门武功打底 */
export function rootsOn(def: SkillDef, neigong: SkillDef): boolean {
  if (neigong.category !== '内功') return false;
  if (def.school === JIANGHU_RULE.school || def.roots?.includes(ROOT_ANY)) return true;
  return neigong.school === def.school || !!def.roots?.includes(neigong.id);
}

/** 内功为根：门派的绝招、杀招、合璧，要搭配本门（或 roots 写明的）内功才使得出来 */
export function canPerform(s: Pick<GameState, 'loadout'>, def: SkillDef): boolean {
  if (!ROOTED_CATS.includes(def.category)) return true;
  const n = s.loadout.neigong ? skillById(s.loadout.neigong) : undefined;
  return !!n && rootsOn(def, n);
}

/**
 * 这门武功最多能练到第几重：外功、暗器、绝技不能比打底的内功高出一重以上；
 * 没有本门内功打底的别派外功，不能高过最高的那门内功；叛出的师门，武功境界就此封顶。
 */
export function realmCap(s: St, def: SkillDef): number {
  let cap = REALMS.length - 1;
  if (ROOTED_CATS.includes(def.category)) {
    let rooted = -1, any = -1;
    for (const [id, p] of Object.entries(s.skills)) {
      const n = skillById(id);
      if (!p || n?.category !== '内功') continue;
      any = Math.max(any, p.r);
      if (rootsOn(def, n)) rooted = Math.max(rooted, p.r);
    }
    cap = Math.min(cap, rooted >= 0 ? rooted + 1 : Math.max(0, any));
  }
  if (s.pastSects?.some(x => x.school === def.school && x.how === '叛门')) cap = Math.min(cap, s.skills[def.id]?.r ?? 0);
  return cap;
}
