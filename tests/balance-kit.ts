/**
 * 对战模拟用的搭配：给一个门派、一个时期，按师承规则配出这一期能拿出来的最好搭配，复用试算台和实战的搭配输入。
 * 「同等投入」：同一时期，所有门派的境界、先天根基、功力和品级额度相同（气血由实战人物模型计算），能用的武功由传授方式（teach）决定。
 */
import { ITEMS, SKILLS } from '../src/content';
import { CAT_WEAPON, FIST, JIANGHU_RULE, OUTER, SCHOOL_STYLE, WEAPON } from '../src/content/skills';
import type { FoeDef, SkillDef, SkillGrade, SkillTeach } from '../src/content/types';
import { rootsOn } from '../src/engine/shicheng';
import { passiveCost, performBudget, skillPower, ultBudget } from '../src/engine/wuxue';
import type { GameState } from '../src/core/state';
import { buildState } from '../src/lab/calc';
import { Duel, SKILLED, simulate, type FoeSpec } from '../src/engine/duel';
import { COMMON, hpMaxOf, mpMaxOf } from '../src/engine/person';
import { personOf } from '../src/engine/ren';
import { mulberry32, seedOf } from '../src/engine/rng';
import { fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';

export interface Stage { name: string; realm: number; teach: SkillTeach[]; qiyu: SkillGrade; mp: number; budget: number }

/**
 * 前期：入门、外门的武功练到略有小成；中期：加上内门，登堂入室；后期：真传都有，返璞归真。
 * 奇遇武功按品级算：前期碰得到良品以下的，中期绝品以下，后期什么都有。
 * 品级额度（docs/menpai.md 第六节「同等投入」）：五个槽位的品级点数加起来不超过 budget，凡品 0、良品 1、上品 2、绝品 3、神品 4、禁品 5。
 */
export const STAGES: Stage[] = [
  { name: '前期', realm: 2, teach: ['入门', '外门'], qiyu: '良品', mp: 600, budget: 7 },
  { name: '中期', realm: 4, teach: ['入门', '外门', '内门'], qiyu: '绝品', mp: 800, budget: 11 },
  { name: '后期', realm: 7, teach: ['入门', '外门', '内门', '真传'], qiyu: '禁品', mp: 1000, budget: 16 }
];
const RANK: SkillGrade[] = ['凡品', '良品', '上品', '绝品', '神品', '禁品'];

/** 还没写 teach 的武功（待改造的门派），按品级推定 */
const GRADE_TEACH: Record<SkillGrade, SkillTeach> = { 凡品: '入门', 良品: '入门', 上品: '外门', 绝品: '内门', 神品: '真传', 禁品: '奇遇' };
const teachOf = (k: SkillDef): SkillTeach => k.teach ?? GRADE_TEACH[k.grade];
/** 试算台必须有真实兵器才能激发兵刃武功；没有鞭子的搭配不算已上阵。 */
const usableOuter = (k: SkillDef): boolean => FIST.includes(k.category) || ITEMS.some(i => i.equip?.weapon === CAT_WEAPON[k.category]);

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
  const outers = pool.filter(k => OUTER.includes(k.category) && usableOuter(k));
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
    if (!OUTER.includes(k.category) || !usableOuter(k) || k.school === root) return false;
    if (k.school === JIANGHU_RULE.school) return true;
    if (pos?.discipline === '严' || !qiyuOk(k)) return false;
    const style = SCHOOL_STYLE[k.school]?.main;
    return !(style && pos?.forbid?.includes(style));
  });
  return foreign.map(k => withOuter(base, k));
}

/** 保留选配结果；战斗数值与招式输入由实战转换器生成，不另写战斗规则。 */
export interface Kit { name: string; build: Build; state: GameState }
export function kitOf(b: Build): Kit {
  const loadout = Object.fromEntries(['neigong', 'qinggong', 'fist', 'weapon', 'ult'].flatMap(k => {
    const skill = b[k as keyof Build] as SkillDef | undefined;
    return skill ? [[k, skill.id]] : [];
  }));
  const state = buildState(loadout, Object.fromEntries(Object.values(loadout).map(id => [id, b.stage.realm])));
  state.name = b.school;
  state.attr = Object.fromEntries(Object.keys(state.attr).map(k => [k, COMMON])) as GameState['attr'];
  state.gongli = b.stage.mp / 100;
  const person = personOf(state);
  state.hp = state.hpMax = hpMaxOf(person);
  state.mp = state.mpMax = mpMaxOf(person);
  return { name: b.school, build: b, state };
}

/** FoeSpec 的原生对手流程不带玩家绝招、被动；轮换角色，另报双方作玩家时的原始胜率。 */
function opponent(k: Kit): FoeDef {
  const outer = outerOf(k.build);
  return { id: 'balance', name: k.name, rank: 0, nature: outer?.nature, reach: outer?.reach,
    title: '', ini: '', tone: 'gray', weapon: '', ws: '', tag: '', moves: [], flourish: [],
    tells: (['li', 'su', 'qiao'] as const).map(dom => ({ name: '', text: '', dom, after: '' })),
    asides: [], opening: [], intro: '', win: '', lose: '', results: { win: {} } };
}
function match(a: Kit, b: Kit, n: number, salt: string): { score: number; aHero: number; bHero: number } {
  if (n <= 0 || n % 2) throw new Error('轮换角色的场数必须为正偶数');
  const specs = [a, b].map((k, i) => {
    const other = opponent(i ? a : b);
    const f: FoeSpec = { ...foeSpec(opponent(k), []), person: personOf(k.state) };
    return { hero: heroSpec(k.state, fightKit(k.state), other), foe: f };
  });
  const names = [a.build.school, b.build.school].sort();
  let aw = 0, bw = 0;
  for (let i = 0; i < n / 2; i++) {
    const seed = seedOf(...names, salt, i);
    if (simulate(new Duel(specs[0].hero, specs[1].foe, { rng: mulberry32(seed) }), SKILLED).res === 'win') aw++;
    if (simulate(new Duel(specs[1].hero, specs[0].foe, { rng: mulberry32(seed) }), SKILLED).res === 'win') bw++;
  }
  return { score: (aw + n / 2 - bw) / n, aHero: aw / (n / 2), bHero: bw / (n / 2) };
}
export const duel = (a: Kit, b: Kit, n: number, salt = ''): number => match(a, b, n, salt).score;
export interface Matrix { names: string[]; rate: number[][]; overall: number[]; heroRate: number[][] }
export function matrix(kits: Kit[], n: number, salt = ''): Matrix {
  const k = kits.length;
  const rate = Array.from({ length: k }, () => Array<number>(k).fill(0.5));
  const heroRate = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => i === j ? match(kits[i], kits[i], n, salt).aHero : NaN));
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const r = match(kits[i], kits[j], n, salt);
    rate[i][j] = r.score; rate[j][i] = 1 - r.score;
    heroRate[i][j] = r.aHero; heroRate[j][i] = r.bHero;
  }
  const overall = rate.map((row, i) => row.reduce((a, x, j) => a + (i === j ? 0 : x), 0) / Math.max(1, k - 1));
  return { names: kits.map(x => x.name), rate, overall, heroRate };
}
export function formatMatrix(m: Matrix): string {
  const pct = (x: number): string => String(Math.round(x * 100)).padStart(4);
  const columns = '          ' + m.names.map(n => n.slice(0, 2).padStart(3)).join('');
  const head = columns + '   总胜率';
  const rows = m.names.map((n, i) => n.padEnd(5, '　').slice(0, 5) + ' ' + m.rate[i].map((x, j) => i === j ? '   —' : pct(x)).join('') + '   ' + pct(m.overall[i]) + '%');
  const raw = m.names.map((n, i) => n.padEnd(5, '　').slice(0, 5) + ' ' + m.heroRate[i].map(pct).join(''));
  return ['双方轮换玩家/对手角色后的得分率：', head, ...rows,
    '各行作为玩家、各列作为原生对手的胜率（对角线是真实镜像；对手不使用玩家绝招和被动）：', columns, ...raw].join('\n');
}
