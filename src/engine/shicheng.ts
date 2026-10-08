/**
 * 师承与前置：能不能学一门武功、能不能使它的绝招、外功最多练到第几重。
 * 规则见 docs/menpai.md 第七节。
 */
import { REALMS, SKILLS, skillById } from '../content';
import { GONGXIAN_PENDING, JIANGHU_RULE, LEARN_GONGXIAN, LEARN_LILIAN, ROOTED_CATS, ROOT_ANY, SCHOOL_STYLE, SECT_RANKS, TEACH_RANK } from '../content/skills';
import type { LeaveHow, PastSect, SkillDef } from '../content/types';
import type { GameState } from '../core/state';
import { houtianOf } from './ren';

type St = Pick<GameState, 'skills' | 'attr' | 'loadout' | 'sect' | 'pastSects' | 'gear' | 'gongli' | 'name'> & { lilian?: number; gongxian?: Record<string, number> };

/** 学不成的原因；short 是只差历练的时候还差多少（师父肯教，你见识不够） */
export type LearnCheck = { ok: true } | { ok: false; why: string; short?: number };

/** 学这门武功要拿多少历练去换（content/skills.ts 的 LEARN_LILIAN） */
export const learnCost = (def: Pick<SkillDef, 'grade'>): number => LEARN_LILIAN[def.grade] ?? 0;

/**
 * 学这门武功要拿多少门派贡献去换（content/skills.ts 的 LEARN_GONGXIAN）：本门外门以上的武功才要，
 * 还没有师门差事的门派（GONGXIAN_PENDING）暂不收，免得玩家卡住
 */
export const gongxianCost = (def: Pick<SkillDef, 'school' | 'teach'>): number =>
  def.teach && !GONGXIAN_PENDING.includes(def.school) ? LEARN_GONGXIAN[def.teach] ?? 0 : 0;

const rankIdx = (r: string): number => SECT_RANKS.indexOf(r as never);

/**
 * 离开过的师门。存档里的 pastSects 由 core/state.ts 定义；这里一律按 PastSect 读，逐出也读得到。
 * （state.ts 的类型还写着「出师 | 叛门」，等纸娃娃那边合并后改成 PastSect[]，这个转接就可以去掉。）
 */
export const pastSectsOf = (s: { pastSects?: readonly PastSect[] }): readonly PastSect[] => s.pastSects ?? [];

/** 拜不回去的门派：叛出过、被逐出过的，返回是怎么离开的；出师的、没拜过的返回 undefined */
export function barredFrom(s: { pastSects?: readonly PastSect[] }, school: string): '叛门' | '逐出' | undefined {
  for (const p of pastSectsOf(s)) if (p.school === school && p.how !== '出师') return p.how;
  return undefined;
}

/** 怎么离开的，写给人看的说法：「出师于」「叛出」「被逐出」，后面接门派名 */
export const leaveWord = (how: LeaveHow): string => (how === '出师' ? '出师于' : how === '叛门' ? '叛出' : '被逐出');

/**
 * 学得了吗：门规 → 师门地位 → 前置武学 → 属性门槛 → 历练够不够（学艺的代价）。
 * cost 是这一回要拿多少历练去换，不写按品级（剧情、奇遇给的写 0）
 */
export function canLearn(s: St, def: SkillDef, cost: number = learnCost(def)): LearnCheck {
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
    const barred = barredFrom(s, def.school);
    if (barred && sect?.school !== def.school) return { ok: false, why: `你${leaveWord(barred)}过${def.school}，${def.school}的武功不会再传给你` };
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
  const have = Math.floor(s.lilian ?? 0);
  if (have < cost) return { ok: false, why: `见识还浅：学「${def.name}」要历练 ${cost}，你眼下只有 ${have}。去江湖上走一走、打几场硬仗再来`, short: cost - have };
  // 门派贡献：本门外门以上的武功，要先替师门出过力（docs/menpai.md 第七节第八条）
  const gx = gongxianCost(def), mine = s.gongxian?.[def.school] ?? 0;
  if (gx > mine) return { ok: false, why: `门派贡献不够：学「${def.name}」要${def.school}贡献 ${gx}，你眼下只有 ${mine}。替师门办几件差事再来`, short: gx - mine };
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

/** 来历：离开过的师门，例如「出师于丐帮；叛出军伍；被逐出六扇门」 */
export const pastSectText = (s: { pastSects?: readonly PastSect[] }): string =>
  pastSectsOf(s).map(x => `${leaveWord(x.how)}${x.school}`).join('；');

/**
 * 拜师学到本门内功时，内功位上还是别的内功：提醒玩家去武功页换上（不替玩家换，换不换玩家自己定）。
 * 内功位空着的，学会时自动放进去（engine/wuxue.ts 的 autoSlot），用不着提醒；
 * 位上的内功本来就能给本门武功打底（同门，或写在 roots 里的有渊源的内功），也不提醒。
 */
export function rootHint(s: Pick<GameState, 'sect' | 'loadout'>, def: SkillDef): string | undefined {
  if (def.category !== '内功' || s.sect?.school !== def.school) return undefined;
  const cur = s.loadout.neigong ? skillById(s.loadout.neigong) : undefined;
  if (!cur || cur.id === def.id || cur.school === def.school) return undefined;
  if (SKILLS.some(k => k.school === def.school && ROOTED_CATS.includes(k.category) && !k.roots?.includes(ROOT_ANY) && rootsOn(k, cur))) return undefined;
  return `「${def.name}」是${def.school}的根本。内功位上还是「${cur.name}」，${def.school}的绝招要本门内功来使，想使就去武功页换上。`;
}

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
 * 没有本门内功打底的别派外功，不能高过最高的那门内功；叛出、被逐出的师门，武功境界就此封顶。
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
  // 叛出、被逐出的师门，本门武功就此封顶；出师的不封
  if (barredFrom(s, def.school)) cap = Math.min(cap, s.skills[def.id]?.r ?? 0);
  return cap;
}
