/**
 * 对战模拟用的搭配：给一个门派、一个时期，按师承规则配出这一期能拿出来的最好搭配，算成战斗内核的 Kit。
 * 「同等投入」：同一时期，所有门派的境界、气血、内力相同，能用的武功由传授方式（teach）决定。
 */
import { SKILLS } from '../content';
import { FIST, JIANGHU_RULE, OUTER, SCHOOL_STYLE, STYLES, WEAPON } from '../content/skills';
import type { FxKind, SkillDef, SkillGrade, SkillTeach } from '../content/types';
import type { Kit, Move } from './combat';
import { passivesOf } from './beidong';
import { rootsOn } from './shicheng';
import { passiveCost, performBudget, skillPower, ultBudget } from './wuxue';

export interface Stage { name: string; realm: number; teach: SkillTeach[]; qiyu: SkillGrade; hp: number; mp: number; budget: number }

/**
 * 前期：入门、外门的武功练到略有小成；中期：加上内门，登堂入室；后期：真传都有，返璞归真。
 * 奇遇武功按品级算：前期碰得到良品以下的，中期绝品以下，后期什么都有。
 * 品级额度（docs/menpai.md 第六节「同等投入」）：五个槽位的品级点数加起来不超过 budget，凡品 0、良品 1、上品 2、绝品 3、神品 4、禁品 5。
 */
export const STAGES: Stage[] = [
  { name: '前期', realm: 2, teach: ['入门', '外门'], qiyu: '良品', hp: 1500, mp: 600, budget: 7 },
  { name: '中期', realm: 4, teach: ['入门', '外门', '内门'], qiyu: '绝品', hp: 2000, mp: 800, budget: 11 },
  { name: '后期', realm: 7, teach: ['入门', '外门', '内门', '真传'], qiyu: '禁品', hp: 2600, mp: 1000, budget: 16 }
];
const RANK: SkillGrade[] = ['凡品', '良品', '上品', '绝品', '神品', '禁品'];

/** 还没写 teach 的武功（待改造的门派），按品级推定 */
const GRADE_TEACH: Record<SkillGrade, SkillTeach> = { 凡品: '入门', 良品: '入门', 上品: '外门', 绝品: '内门', 神品: '真传', 禁品: '奇遇' };
const teachOf = (k: SkillDef): SkillTeach => k.teach ?? GRADE_TEACH[k.grade];

/** 这一期、这个门派能用的武功（本门加江湖散学） */
export function available(school: string, st: Stage): SkillDef[] {
  const ok = (k: SkillDef): boolean => {
    if (k.school === JIANGHU_RULE.school) return true;
    const t = teachOf(k);
    return t === '奇遇' ? RANK.indexOf(k.grade) <= RANK.indexOf(st.qiyu) : st.teach.includes(t);
  };
  return SKILLS.filter(k => (k.school === school || k.school === JIANGHU_RULE.school) && ok(k));
}

/**
 * 一套搭配。拳脚、兵刃两个位置，模拟里只放一门：同一时间只使一门外功（docs/zhuangbei.md 第二节），
 * 兵刃武功默认手里有对得上的兵器。
 */
export interface Build { school: string; stage: Stage; neigong?: SkillDef; qinggong?: SkillDef; fist?: SkillDef; weapon?: SkillDef; ult?: SkillDef }

/** 出手的那门外功 */
export const outerOf = (b: Pick<Build, 'fist' | 'weapon'>): SkillDef | undefined => b.weapon ?? b.fist;
/** 把一门外功放进它该去的位置 */
const withOuter = <T extends Pick<Build, 'fist' | 'weapon'>>(b: T, k: SkillDef | undefined): T =>
  ({ ...b, fist: k && FIST.includes(k.category) ? k : undefined, weapon: k && WEAPON.includes(k.category) ? k : undefined });

/** 绝招算成战斗内核的一招（实战和模拟共用） */
export const toMove = (k: SkillDef, p: NonNullable<SkillDef['performs']>[number]): Move => ({
  name: `${k.name}「${p.name}」`, mp: p.mp, cd: p.cd, hits: p.hits, dmg: p.dmg, acc: p.acc, fx: p.fx || [],
  // 蓄势的重招（只有刚猛的门派写，docs/menpai.md 第五节）
  heavy: !!p.charge && p.hits === 1
});

/** 一门外功在这一期、这门内功下的分量：解锁了的、使得出的绝招预算之和，加普通招式 */
function outerScore(k: SkillDef, ng: SkillDef | undefined, st: Stage): number {
  const usable = ng ? rootsOn(k, ng) : k.school === JIANGHU_RULE.school;
  const ps = usable ? (k.performs || []).filter(p => (p.realm ?? 0) <= st.realm) : [];
  return skillPower(k, st.realm) * 3 + ps.reduce((a, p) => a + performBudget(p), 0);
}

/** 品级点数：凡品 0、良品 1……禁品 5 */
export const gradePoints = (k?: SkillDef): number => (k ? RANK.indexOf(k.grade) : 0);

/** 搭配的分量（配招用的粗估）：外功和绝招、杀招、内功、轻功的功力与被动 */
function buildScore(b: Omit<Build, 'school' | 'stage'>, st: Stage): number {
  const ng = b.neigong, outer = outerOf(b);
  let v = 0;
  if (outer) v += outerScore(outer, ng, st);
  if (b.ult?.ult && (!ng || rootsOn(b.ult, ng))) v += 0.5 * ultBudget(b.ult.ult);
  if (ng) v += 4 * skillPower(ng, st.realm) + 5 * passiveCost(ng.passive);
  if (b.qinggong) v += 2 * skillPower(b.qinggong, st.realm) + 5 * passiveCost(b.qinggong.passive);
  return v;
}

/** 配出这一期、品级额度以内的最好搭配：五个槽位穷举（每槽只留分量最高的几门） */
export function bestBuild(school: string, st: Stage): Build {
  const pool = available(school, st);
  const top = (xs: SkillDef[], score: (k: SkillDef) => number, n: number): (SkillDef | undefined)[] => [undefined, ...[...xs].sort((a, b) => score(b) - score(a)).slice(0, n)];
  const ngs = top(pool.filter(k => k.category === '内功'), k => skillPower(k, st.realm) + passiveCost(k.passive) * 2, 4);
  const qgs = top(pool.filter(k => k.category === '轻功'), k => skillPower(k, st.realm) + passiveCost(k.passive) * 2, 3);
  const outers = pool.filter(k => OUTER.includes(k.category));
  const ults = top(pool.filter(k => k.category === '绝技' && k.ult), k => ultBudget(k.ult!), 3);
  let best: Build = { school, stage: st }, bestV = -1;
  for (const neigong of ngs) for (const qinggong of qgs) for (const ult of ults) {
    const used = gradePoints(neigong) + gradePoints(qinggong) + gradePoints(ult);
    if (used > st.budget) continue;
    for (const outer of top(outers, k => outerScore(k, neigong, st), 6)) {
      if (used + gradePoints(outer) > st.budget) continue;
      const b = withOuter<Omit<Build, 'school' | 'stage'>>({ neigong, qinggong, ult }, outer);
      const v = buildScore(b, st);
      if (v > bestV) { bestV = v; best = { school, stage: st, ...b }; }
    }
  }
  return best;
}

/** 把搭配算成战斗内核的 Kit */
export function kitOf(b: Build): Kit {
  const st = b.stage, ng = b.neigong;
  const rooted = (k: SkillDef): boolean => (ng ? rootsOn(k, ng) : k.school === JIANGHU_RULE.school);
  // 被动与合璧：和实战共用一套算法（beidong.ts）
  const pv = passivesOf(b, { outer: outerOf(b) });
  const { sum: passive, openers, hit } = pv;
  const outer = outerOf(b);
  const moves: Move[] = [];
  if (outer && rooted(outer)) for (const p of outer.performs || []) if ((p.realm ?? 0) <= st.realm) moves.push(toMove(outer, p));
  const mainPow = outer ? skillPower(outer, st.realm) : 0;
  const avg = 60 + mainPow * 1.2;
  const basic: Move = { name: outer ? `${outer.name}的普通招式` : '拳脚', mp: 0, cd: 0, hits: 1, dmg: [avg * 0.8, avg * 1.2], acc: 0.85, fx: [] };
  const ult = b.ult?.ult && rooted(b.ult) ? { name: `${b.ult.name}（杀招）`, mp: 0, cd: 0, hits: 1, dmg: b.ult.ult.dmg, acc: 1, fx: b.ult.ult.fx || [], sure: true } : undefined;
  const qg = b.qinggong;
  const dodge = 0.08 + (qg ? skillPower(qg, st.realm) / 400 : 0) + pv.qinggongHaste / 100;
  const pos = SCHOOL_STYLE[b.school];
  const bias: Partial<Record<FxKind, number>> = {};
  if (pos) for (const f of [...STYLES[pos.main].sig, ...STYLES[pos.sub].sig]) bias[f] = 1.15;
  return {
    name: b.school, hpMax: st.hp, mpMax: st.mp,
    mpRegen: Math.round(st.mp * 0.04 + (ng ? skillPower(ng, st.realm) / 2 : 0)),
    nature: outer?.nature, dodge, hit, passive, openers, moves, basic, ult, bias
  };
}

/**
 * 混搭：以 root 为根基门派（内功、绝技不动），出手的外功换成一门外来的武功。
 * 不是本门弟子，只学得到别派的奇遇武功和江湖散学（docs/menpai.md 第七节）；门规严的门派只能兼修江湖散学，禁修的打法不能碰。
 * 别派外功没有本门内功打底，只剩普通招式；roots 写「任意」的奇遇武功例外。
 */
export function mixedBuilds(root: string, st: Stage): Build[] {
  const base = bestBuild(root, st);
  const pos = SCHOOL_STYLE[root];
  const qiyuOk = (k: SkillDef): boolean => teachOf(k) === '奇遇' && RANK.indexOf(k.grade) <= RANK.indexOf(st.qiyu);
  const foreign = SKILLS.filter(k => {
    if (!OUTER.includes(k.category) || k.school === root) return false;
    if (k.school === JIANGHU_RULE.school) return true;
    if (pos?.discipline === '严' || !qiyuOk(k)) return false;
    const style = SCHOOL_STYLE[k.school]?.main;
    return !(style && pos?.forbid?.includes(style));
  });
  return foreign.map(k => withOuter(base, k));
}
