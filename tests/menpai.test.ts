/**
 * 门派打法与师承校验：门派之间打法不同，同一门派的武功合起来是一套打法，并且是一棵有前置、有师承的武学树。
 * 规则见 docs/menpai.md 第四节、第七节。
 * 看每个门派的体检结果：npm run menpai
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { FOES, NPCS, ROOMS, SKILLS, STORIES } from '../src/content';
import { GRADES, JIANGHU_RULE, NATURES, OUTER, REALMS, ROOTED_CATS, ROOT_ANY, SCHOOLS, SCHOOL_STYLE, STYLES, STYLE_PENDING, STYLE_RING, TEACH_GRADES, styleBeats } from '../src/content/skills';
import { canLearn, pastSectText, realmCap, rootsOn } from '../src/engine/shicheng';
import type { Style } from '../src/content/skills';
import type { AttrKey, Branch, Effect, FoeDef, FxDef, FxKind, NpcDef, RoomDef, SkillDef, SkillTeach, StoryDef } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { dayNo } from '../src/core/time';
import { run, test as cond } from '../src/engine/dsl';
import { act } from '../src/engine/world';
import { fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { Duel, SKILLED, simulate } from '../src/engine/duel';
import { mulberry32 } from '../src/engine/rng';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const FX_KINDS = Object.keys({ busy: 0, bleed: 0, poison: 0, burn: 0, chill: 0, weaken: 0, break: 0, disarm: 0, fear: 0, drain: 0, guard: 0, haste: 0, heal: 0, rage: 0 } satisfies Record<FxKind, number>) as FxKind[];
const gradeRank = (g: string): number => GRADES.findIndex(x => x[0] === g);

/** 一门武功里出现的所有效果，连同出处。轻功被动的身法不算（人人都有轻功） */
function fxOf(k: SkillDef): { f: FxDef; where: string }[] {
  const out: { f: FxDef; where: string }[] = [];
  for (const p of k.performs || []) for (const f of p.fx || []) out.push({ f, where: `${k.name}「${p.name}」` });
  for (const f of k.ult?.fx || []) out.push({ f, where: `${k.name}的杀招` });
  for (const c of k.combos || []) for (const f of c.fx || []) out.push({ f, where: `${k.name}的合璧「${c.name}」` });
  for (const f of k.passive || []) if (!(k.category === '轻功' && f.kind === 'haste')) out.push({ f, where: `${k.name}的被动` });
  return out;
}

/** 某种打法的招牌在一个门派里出现了几次 */
function sigCount(skills: SkillDef[], st: Style): number {
  const s = STYLES[st];
  let n = 0;
  for (const k of skills) {
    n += fxOf(k).filter(x => s.sig.includes(x.f.kind)).length;
    if (s.multi) n += (k.performs || []).filter(p => p.hits >= 2).length;
  }
  return n;
}

/** 一个门派的问题清单；空的就是合规 */
export function styleProblems(school: string): string[] {
  const skills = SKILLS.filter(k => k.school === school);
  const errs: string[] = [];
  if (school === JIANGHU_RULE.school) {
    for (const k of skills) {
      if (gradeRank(k.grade) > gradeRank(JIANGHU_RULE.maxGrade)) errs.push(`${k.name}：江湖散学最高${JIANGHU_RULE.maxGrade}，这里是${k.grade}`);
      for (const x of fxOf(k)) errs.push(`${x.where}：江湖散学不带效果（${x.f.kind}）`);
      if (k.teach || k.roots) errs.push(`${k.name}：江湖散学谁都能学、不挑内功，不写 teach、roots`);
    }
    return errs;
  }
  const pos = SCHOOL_STYLE[school];
  if (!pos) return skills.length ? [`门派「${school}」还没有定位，先在 src/content/skills.ts 的 SCHOOL_STYLE 里定位，才能写武功`] : [];
  const main = STYLES[pos.main], sub = STYLES[pos.sub];
  const allowed = new Set([...main.allowed, ...sub.allowed]);
  const quick = pos.main === '迅捷' || pos.sub === '迅捷';
  for (const k of skills) {
    for (const x of fxOf(k)) if (!allowed.has(x.f.kind)) errs.push(`${x.where}：效果 ${x.f.kind} 不在本门可用的效果里（${pos.main}＋${pos.sub}：${[...allowed].join(' ')}）`);
    if (!quick) for (const p of k.performs || []) if (p.hits >= 3) errs.push(`${k.name}「${p.name}」：三连击是迅捷的专长，${pos.main}＋${pos.sub}的门派最多两击`);
    const hard = pos.main === '刚猛' || pos.sub === '刚猛';
    for (const p of k.performs || []) if (p.charge && (!hard || p.hits !== 1)) errs.push(`${k.name}「${p.name}」：蓄势（charge）是刚猛的专长，只能用在带刚猛的门派、一击的绝招上`);
  }
  if (!skills.length) return errs;
  const m = sigCount(skills, pos.main), s = sigCount(skills, pos.sub);
  const sigName = (st: Style): string => STYLES[st].sig.join('/') + (STYLES[st].multi ? '/多段连击' : '');
  if (m < 3) errs.push(`主打法「${pos.main}」的招牌（${sigName(pos.main)}）全门派只出现 ${m} 次，至少 3 次`);
  if (s < 1) errs.push(`副打法「${pos.sub}」的招牌（${sigName(pos.sub)}）一次都没有出现`);
  if (m < s) errs.push(`主打法「${pos.main}」的招牌（${m} 次）比副打法「${pos.sub}」的（${s} 次）还少，主次颠倒了`);
  const core = skills.filter(k => OUTER.includes(k.category) || k.category === '内功');
  const inTend = core.filter(k => pos.natures.includes(k.nature)).length;
  if (core.length && inTend * 3 < core.length * 2) errs.push(`拳脚、兵刃、内功共 ${core.length} 门，性质落在倾向（${pos.natures.join('、')}）里的只有 ${inTend} 门，至少三分之二`);
  errs.push(...shichengProblems(school));
  return errs;
}

const byId = (id: string): SkillDef | undefined => SKILLS.find(k => k.id === id);

/** 不按师门传授的出处：江湖散学谁都能学；寒江一脉是主角家学，都算奇遇（docs/menpai.md 第七节） */
const NO_TREE = [JIANGHU_RULE.school, '寒江'];

/** 顺着前置往下找，找得到本门的入门武功吗 */
function reachesEntry(k: SkillDef, school: string): boolean {
  const seen = new Set<string>(), stack = [k.id];
  while (stack.length) {
    const cur = byId(stack.pop()!);
    if (!cur || seen.has(cur.id)) continue;
    seen.add(cur.id);
    for (const r of cur.requires || []) {
      const d = byId(r.skill);
      if (d?.school !== school) continue;
      if (d.teach === '入门') return true;
      stack.push(d.id);
    }
  }
  return false;
}

/**
 * 武学树（docs/menpai.md 第七节第三、四条）：入门就传一门本门内功（内功为根，入门弟子才使得出本门绝招）；
 * 外门、内门、真传的武功顺着前置往下，追得到本门的入门武功，入门、外门、内门、真传一层层连成一棵树。
 */
export function treeProblems(school: string): string[] {
  const skills = SKILLS.filter(k => k.school === school);
  if (!skills.length || NO_TREE.includes(school)) return [];
  const errs: string[] = [];
  if (!skills.some(k => k.category === '内功' && k.teach === '入门'))
    errs.push('没有 teach 为「入门」的本门内功：内功为根，入门弟子没有本门内功，本门外功只剩普通招式');
  for (const k of skills) {
    if ((k.teach === '外门' || k.teach === '内门' || k.teach === '真传') && !reachesEntry(k, school))
      errs.push(`${k.name}：${k.teach}武功顺着前置往下，找不到本门的入门武功，武学树断了`);
  }
  return errs;
}

/** 一门派的师承问题：传授、前置、内功为根、武学树（docs/menpai.md 第七节） */
function shichengProblems(school: string): string[] {
  const skills = SKILLS.filter(k => k.school === school);
  const errs: string[] = [];
  for (const k of skills) {
    if (!k.teach) { errs.push(`${k.name}：没写 teach（入门、外门、内门、真传、奇遇）`); continue; }
    if (gradeRank(k.grade) >= gradeRank('绝品')) {
      const same = (k.requires || []).some(r => byId(r.skill)?.school === school);
      if (!same && !(k.teach === '奇遇' && k.needAttr)) errs.push(`${k.name}：${k.grade}要有同门的前置武学（requires）；奇遇武功可以改用属性门槛（needAttr）`);
    }
    const usesRoot = ROOTED_CATS.includes(k.category) && (k.performs?.length || k.ult || k.combos?.length);
    if (usesRoot && !k.roots?.includes(ROOT_ANY) && !SKILLS.some(n => n.category === '内功' && gradeRank(n.grade) <= gradeRank('上品') && rootsOn(k, n)))
      errs.push(`${k.name}：内功为根，要有一门上品以下、能给它打底的内功（本门内功，或写进 roots），否则绝招没人使得出`);
  }
  errs.push(...treeProblems(school));
  return errs;
}

/** 一派的武学树，写给人看：每一层传哪些武功，括号里是门类和前置。写山门的人照它排「请教」「考校」 */
export function treeText(school: string): string {
  const skills = SKILLS.filter(k => k.school === school);
  const tiers: SkillTeach[] = ['入门', '外门', '内门', '真传', '奇遇'];
  const rows = tiers.map(t => {
    const ks = skills.filter(k => k.teach === t);
    if (!ks.length) return '';
    return `  ${t}：` + ks.map(k => {
      const notes = [
        ['内功', '轻功', '绝技'].includes(k.category) ? k.category : '',
        ...(k.requires || []).map(r => `${byId(r.skill)?.name ?? r.skill}${REALMS[r.realm]}`),
        ...Object.entries(k.needAttr || {}).map(([a, v]) => `${a}${v}`)
      ].filter(Boolean);
      return k.name + (notes.length ? `（${notes.join('，')}）` : '');
    }).join('、');
  }).filter(Boolean);
  return `${school}\n${rows.join('\n')}`;
}

/** 门派的效果分布：每种效果出现几次，多段连击算一项 */
function profile(school: string): number[] {
  const skills = SKILLS.filter(k => k.school === school);
  const v = FX_KINDS.map(kind => skills.reduce((a, k) => a + fxOf(k).filter(x => x.f.kind === kind).length, 0));
  v.push(skills.reduce((a, k) => a + (k.performs || []).filter(p => p.hits >= 2).length, 0));
  return v;
}
const cosine = (a: number[], b: number[]): number => {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0), na = Math.hypot(...a), nb = Math.hypot(...b);
  return na && nb ? dot / (na * nb) : 0;
};
/** 两个门派的效果分布相似度上限：再像就是换皮 */
const SIMILAR_MAX = 0.9;

describe('门派打法', () => {
  it('相克环：每种打法克两种、被两种克', () => {
    expect(new Set(STYLE_RING).size).toBe(7);
    for (const a of STYLE_RING) {
      expect(STYLE_RING.filter(b => styleBeats(a, b)).length, a).toBe(2);
      expect(STYLE_RING.filter(b => styleBeats(b, a)).length, a).toBe(2);
      for (const b of STYLE_RING) expect(styleBeats(a, b) && styleBeats(b, a), `${a} ${b}`).toBe(false);
    }
    expect(styleBeats('刚猛', '浑厚') && styleBeats('吸纳', '刚猛') && styleBeats('擒拿', '刚猛')).toBe(true);
  });

  it('打法的效果表：招牌在可用效果里，每种效果至少有一种打法能用', () => {
    for (const st of STYLE_RING) for (const f of STYLES[st].sig) expect(STYLES[st].allowed, st).toContain(f);
    for (const f of FX_KINDS) expect(STYLE_RING.some(st => STYLES[st].allowed.includes(f)), f).toBe(true);
  });

  it('门派定位：主副打法不同，没有两个门派的主副打法完全相同；每种打法至少给两个门派当主打法', () => {
    const errs: string[] = [];
    const seen = new Map<string, string>();
    for (const [school, p] of Object.entries(SCHOOL_STYLE)) {
      if (!SCHOOLS.includes(school)) errs.push(`${school}：不在 SCHOOLS 里`);
      if (p.main === p.sub) errs.push(`${school}：主副打法相同`);
      const key = `${p.main}+${p.sub}`;
      if (seen.has(key)) errs.push(`${school} 和 ${seen.get(key)} 的打法都是 ${key}`);
      seen.set(key, school);
      if (!p.natures.length || p.natures.some(n => !NATURES.includes(n))) errs.push(`${school}：性质倾向写错了`);
    }
    for (const st of STYLE_RING) if (Object.values(SCHOOL_STYLE).filter(p => p.main === st).length < 2) errs.push(`主打法是「${st}」的门派不到两个`);
    for (const s of STYLE_PENDING) if (!SCHOOL_STYLE[s]) errs.push(`待改造名单里的「${s}」没有定位`);
    expect(errs).toEqual([]);
  });

  it('每个门派的武功合起来是本门的打法（待改造的门派只提醒）', () => {
    const schools = [...new Set(SKILLS.map(k => k.school))];
    const errs: string[] = [], notes: string[] = [];
    for (const school of schools) {
      const ps = styleProblems(school);
      if (STYLE_PENDING.includes(school)) notes.push(ps.length ? `${school}（待改造）：${ps.length} 处\n  - ${ps.join('\n  - ')}` : `${school}（待改造）：已经合规，可以从 STYLE_PENDING 删掉`);
      else errs.push(...ps.map(e => `${school}：${e}`));
    }
    if (env.MENPAI) console.log(notes.join('\n'));
    else if (notes.length) console.log(`门派打法：还有 ${STYLE_PENDING.length} 个门派待改造，详情运行 npm run menpai`);
    expect(errs).toEqual([]);
  });

  it(`改造完的门派之间不能雷同：效果分布的相似度不超过 ${SIMILAR_MAX}`, () => {
    const done = [...new Set(SKILLS.map(k => k.school))].filter(s => SCHOOL_STYLE[s] && !STYLE_PENDING.includes(s));
    const errs: string[] = [];
    for (let i = 0; i < done.length; i++) for (let j = i + 1; j < done.length; j++) {
      const c = cosine(profile(done[i]), profile(done[j]));
      if (c > SIMILAR_MAX) errs.push(`${done[i]} 和 ${done[j]} 的效果分布太像（${c.toFixed(2)}）`);
    }
    expect(errs).toEqual([]);
  });

  it('师承与前置的数据本身没有错（所有武功，包括待改造的门派）', () => {
    const errs: string[] = [];
    const ATTRS: AttrKey[] = ['体魄', '根骨', '身法', '悟性', '胆魄'];
    for (const k of SKILLS) {
      const w = `${k.school} ${k.name}`;
      if (k.teach && !TEACH_GRADES[k.teach].includes(k.grade)) errs.push(`${w}：${k.teach}武功只能是${TEACH_GRADES[k.teach].join('、')}，这里是${k.grade}`);
      for (const r of k.requires || []) {
        const d = byId(r.skill);
        if (!d) { errs.push(`${w}：前置武学「${r.skill}」不存在`); continue; }
        if (d.id === k.id) errs.push(`${w}：前置不能是自己`);
        if (!Number.isInteger(r.realm) || r.realm < 0 || r.realm >= REALMS.length) errs.push(`${w}：前置境界要是 0 到 ${REALMS.length - 1} 的整数`);
        if (gradeRank(d.grade) > gradeRank(k.grade)) errs.push(`${w}：前置「${d.name}」（${d.grade}）比它本身的品级还高`);
      }
      for (const [a, v] of Object.entries(k.needAttr || {})) if (!ATTRS.includes(a as AttrKey) || !v || v < 1 || v > 99) errs.push(`${w}：属性门槛「${a}: ${v}」写错了`);
      for (const r of k.roots || []) {
        if (r === ROOT_ANY) { if (k.teach !== '奇遇' || !k.requires?.length) errs.push(`${w}：不挑内功（roots: 任意）只给有前置的奇遇武功`); continue; }
        if (byId(r)?.category !== '内功') errs.push(`${w}：roots 里的「${r}」不是内功`);
      }
    }
    // 前置不能绕成圈
    const state = new Map<string, number>();
    const visit = (id: string, path: string[]): void => {
      if (state.get(id) === 2) return;
      if (state.get(id) === 1) { errs.push(`前置武学绕成了圈：${[...path, id].join(' → ')}`); return; }
      state.set(id, 1);
      for (const r of byId(id)?.requires || []) visit(r.skill, [...path, id]);
      state.set(id, 2);
    };
    for (const k of SKILLS) visit(k.id, []);
    expect(errs).toEqual([]);
  });

  it('武学树：每派入门就传本门内功，外门以上的武功顺着前置追得到本门入门武功（所有门派，包括待改造的）', () => {
    const schools = [...new Set(SKILLS.map(k => k.school))];
    const errs = schools.flatMap(s => treeProblems(s).map(e => `${s}：${e}`));
    if (env.MENPAI) console.log('各派武学树（括号里是门类、前置）：\n' + schools.filter(s => !NO_TREE.includes(s)).map(treeText).join('\n'));
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
  });

  it('机器把关本身管用：故意写错的门派会被拦下', () => {
    const fake: SkillDef = {
      id: 'fake', name: '假掌', grade: '上品', category: '掌法', school: '铁掌帮', nature: '阴', reach: '徒手', desc: '', learn: '',
      performs: [{ name: '假招', text: '', mp: 50, cd: 2, hits: 3, dmg: [30, 40], acc: 0.8, fx: [{ kind: 'drain', value: 50 }] }]
    };
    SKILLS.push(fake);
    try {
      const ps = styleProblems('铁掌帮').join('\n');
      expect(ps).toContain('drain');
      expect(ps).toContain('性质');
      const asQuanzhen = { ...fake, school: '全真' };
      SKILLS[SKILLS.length - 1] = asQuanzhen;
      expect(styleProblems('全真').join('\n')).toContain('三连击');
      const noTree = { ...fake, school: '全真', grade: '绝品', teach: '真传', hits: 1 } as SkillDef;
      SKILLS[SKILLS.length - 1] = noTree;
      const qz = styleProblems('全真').join('\n');
      expect(qz).toContain('同门的前置');
      expect(qz).toContain('武学树断了');
      // 外门武功不写前置，也是树断了
      SKILLS[SKILLS.length - 1] = { ...fake, school: '全真', grade: '良品', teach: '外门', performs: [] } as SkillDef;
      expect(treeProblems('全真').join('\n')).toContain('假掌：外门武功顺着前置往下，找不到本门的入门武功');
    } finally { SKILLS.pop(); }
    // 入门没有本门内功
    const xinfa = byId('tq_xinfa')!;
    xinfa.teach = '外门';
    try { expect(treeProblems('全真').join('\n')).toContain('没有 teach 为「入门」的本门内功'); } finally { xinfa.teach = '入门'; }
  });
});

/* ---------- 拜师：拜得进的门派教得到入门武功，门派武功只在 canLearn 把关的地方教（docs/content-guide.md「拜师」） ---------- */

type Packs = { rooms: RoomDef[]; npcs: NpcDef[]; stories: StoryDef[]; foes: FoeDef[] };
type TeachSite = { where: string; skill: string; guard?: string };

/** 内容里所有教武功（learn）的地方：在哪里，教哪门，那个分支（选项）的条件里 canLearn 的是哪门 */
function teachSites(p: Packs): TeachSite[] {
  const out: TeachSite[] = [];
  const take = (effs: Effect[] | undefined, where: string, guard?: string): void => {
    for (const e of effs || []) if (e.type === 'learn') out.push({ where, skill: e.skill, guard });
  };
  const branches = (bs: Branch[] | string | undefined, where: string): void => {
    if (Array.isArray(bs)) bs.forEach((b, i) => take(b.do, `${where}[${i}]`, b.if?.canLearn));
  };
  for (const r of p.rooms) {
    branches(r.desc, `地点 ${r.id} 的 desc`);
    branches(r.road, `地点 ${r.id} 的 road`);
    branches(r.onEnter, `地点 ${r.id} 的 onEnter`);
  }
  for (const n of p.npcs) for (const [v, bs] of Object.entries(n.actions)) branches(bs, `人物 ${n.id} 的「${v}」`);
  for (const s of p.stories) s.cards.forEach((c, i) => c.choices.forEach((ch, k) => take(ch.do, `剧情 ${s.id} 第 ${i} 张第 ${k} 个选项`, ch.if?.canLearn)));
  for (const f of p.foes) {
    for (const [k, r] of Object.entries(f.results)) {
      if (!r) continue;
      take(r.do, `对手 ${f.id} 的结算 ${k}`);
      take(r.then, `对手 ${f.id} 的结算 ${k} 的 then`);
      r.after?.opts.forEach((o, i) => take(o.do, `对手 ${f.id} 胜负以后的第 ${i + 1} 条路`, o.if?.canLearn));
    }
    (f.prep ?? []).forEach((x, i) => take(x.win, `对手 ${f.id} 的备战 ${i}`));
  }
  return out;
}

/** 内容里拜得进的门派：所有 { type: 'sect' } 效果写到的门派 */
function sectsJoined(p: Packs): Set<string> {
  const out = new Set<string>();
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      if (o.type === 'sect' && typeof o.school === 'string') out.add(o.school);
      Object.values(o).forEach(walk);
    }
  };
  walk(p);
  return out;
}

/** 靠师门传授的武功：江湖散学、奇遇以外的（待改造的门派没写 teach 的也算） */
const sectTaught = (k: SkillDef): boolean => k.school !== JIANGHU_RULE.school && k.teach !== '奇遇';

/** 拜师的问题清单；空的就是合规 */
export function baishiProblems(p: Packs, skills: SkillDef[] = SKILLS): string[] {
  const errs: string[] = [];
  const sites = teachSites(p);
  const find = (id: string): SkillDef | undefined => skills.find(k => k.id === id);
  // 门派武功有师门、地位、前置、门规，教之前先问 canLearn；剧情选项也一样。对手的结算里没有条件可写，就不在那里教
  for (const s of sites) {
    const k = find(s.skill);
    if (k && sectTaught(k) && s.guard !== s.skill) errs.push(`${s.where}：教「${k.name}」（${k.school}${k.teach ? ' · ' + k.teach : ''}）要带条件 canLearn: '${s.skill}'，学不成的情形另写一个分支；对手结算里没有条件可写，门派武功改到师父的分支里教`);
  }
  const taught = new Set(sites.map(s => s.skill));
  for (const school of sectsJoined(p)) {
    const mine = skills.filter(k => k.school === school);
    // 拜了师学不到东西：入门武功每一门都要有地方教
    for (const k of mine) if (k.teach === '入门' && !taught.has(k.id)) errs.push(`${school}：内容里拜得进这一派，入门武功「${k.name}」却没有地方教（learn），拜了师学不到东西`);
    // 内功为根：教了带绝招的外功，就要教得到给它打底的内功，不然绝招没人使得出
    for (const o of mine) {
      if (!taught.has(o.id) || !ROOTED_CATS.includes(o.category) || !(o.performs?.length || o.ult)) continue;
      if (!skills.some(n => taught.has(n.id) && rootsOn(o, n))) errs.push(`${school}：教了「${o.name}」，却没有地方教给它打底的内功，绝招没人使得出`);
    }
  }
  return errs;
}

describe('拜师', () => {
  const packs: Packs = { rooms: ROOMS, npcs: NPCS, stories: STORIES, foes: FOES };

  it('拜得进的门派，入门武功都教得到、有内功打底；门派武功只在 canLearn 把关的地方教', () => {
    for (const school of ['丐帮', '六扇门', '军伍']) expect(sectsJoined(packs).has(school), `${school} 拜不进去`).toBe(true);
    const errs = baishiProblems(packs);
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
  });

  it('机器把关本身管用：漏教入门武功、不带 canLearn 就教、在对手结算里教，都会被拦下', () => {
    const npc: NpcDef = {
      id: 'fake_master', name: '假师父', brief: '', look: '', verbs: ['拜师'],
      actions: { 拜师: [
        { if: { noSect: true }, do: [{ type: 'sect', school: '六扇门', rank: '记名' }] },
        { do: [{ type: 'learn', skill: 'jl_suolian' }] }
      ] }
    };
    const foe = { id: 'fake_foe', results: { win: { do: [{ type: 'learn', skill: 'jl_zhuifeng' }] } } } as unknown as FoeDef;
    const ps = baishiProblems({ rooms: [], stories: [], npcs: [npc], foes: [foe] }).join('\n');
    expect(ps).toContain("canLearn: 'jl_suolian'");
    expect(ps).toContain('对手 fake_foe 的结算 win');
    expect(ps).toContain('入门武功「缉事心法」却没有地方教');
    expect(ps).toContain('入门武功「铁尺点穴」却没有地方教');
    expect(ps).toContain('教了「锁链擒拿」，却没有地方教给它打底的内功');
  });
});

describe('拜师：从扬州起拜师学艺，入门武功上得了阵', () => {
  beforeEach(() => setState(skipToYangzhou()));

  /** 打赢考校：照对手的胜利结算执行（打不打得过看本事，这里验的是拜师这条路走得通） */
  const passKao = (foeId: string): void => { run(FOES.find(f => f.id === foeId)!.results.win.do); };
  /** 用交手引擎按实战规矩打一场，气血、内力先回满 */
  const duel = (foeId: string): Duel => {
    S.hp = S.hpMax; S.mp = S.mpMax;
    const foe = FOES.find(f => f.id === foeId)!;
    return simulate(new Duel(heroSpec(S, fightKit(S), foe), foeSpec(foe, []), { rng: mulberry32(2026) }), SKILLED);
  };
  /** 上阵：出手的外功、绝招都在，打得完一场，绝招真的使了 */
  const fights = (outer: string, foeId: string): void => {
    const kit = fightKit(S);
    expect(kit.outer?.id).toBe(outer);
    expect(kit.unrooted).toBe(false);
    expect(kit.performs.length).toBeGreaterThan(0);
    const d = duel(foeId);
    expect(['win', 'lose', 'flee', 'yield']).toContain(d.res);
    expect(d.log.dealt.perform ?? 0).toBeGreaterThan(0);
  };
  const clock = (): number => dayNo(S) * 1440 + S.min;

  it('武馆：交学费、花时辰学江湖散学，不用拜师；钱不够、底子不够，各有说法', () => {
    S.silver = 50;
    act('bs2_lu', '学长拳');
    expect(S.skills.jh_taizu).toBeUndefined();
    S.silver = 1000;
    const t0 = clock();
    act('bs2_lu', '学长拳');
    expect(S.skills.jh_taizu).toBeDefined();
    expect(S.silver).toBe(900);
    expect(clock() - t0).toBeGreaterThanOrEqual(240);
    expect(S.loadout.fist).toBe('jh_taizu');
    act('bs2_lu', '学形意');
    expect(S.skills.jh_xingyi).toBeUndefined();
    S.skills.jh_taizu!.r = 1;
    act('bs2_lu', '学形意');
    expect(S.skills.jh_xingyi).toBeDefined();
    expect(S.sect).toBeUndefined();
  });

  it('军伍：画押、考校、拜入，传铁脊功、行军步、军中长拳；换上本门内功，长拳的绝招使得出；练到了升正兵，传边军大枪', () => {
    act('bs2_han', '投军');
    expect(S.sect).toBeUndefined();
    S.flags.jw_mingce = true;
    expect(act('bs2_han', '投军').out.fight).toBe('bs2_jw_kao');
    passKao('bs2_jw_kao');
    expect(S.sect).toEqual({ school: '军伍', rank: '记名' });
    for (let i = 0; i < 4; i++) act('bs2_han', '请教');
    for (const id of ['jl_tiejigong', 'jl_xingjunbu', 'jl_changquan']) expect(S.skills[id], id).toBeDefined();
    expect(S.skills.jl_changqiang).toBeUndefined();
    expect(S.loadout.fist).toBe('jl_changquan');
    S.loadout.neigong = 'jl_tiejigong';
    S.loadout.qinggong = 'jl_xingjunbu';
    delete S.gear.weapon;
    fights('jl_changquan', 'bs2_jw_kao');
    // 一人一师门：投了军，丐帮的门就关上了
    act('bs2_bao', '拜师');
    expect(S.quests.bs2_gb_kao).toBeUndefined();
    expect(S.sect?.school).toBe('军伍');
    // 升正兵
    act('bs2_han', '考校');
    expect(S.sect?.rank).toBe('记名');
    S.skills.jl_tiejigong!.r = 1;
    S.skills.jl_changquan!.r = 1;
    act('bs2_han', '考校');
    expect(S.sect).toEqual({ school: '军伍', rank: '外门' });
    act('bs2_han', '请教');
    expect(S.skills.jl_changqiang).toBeDefined();
    S.gear.weapon = 'bs2_qiang';
    S.loadout.weapon = 'jl_changqiang';
    fights('jl_changqiang', 'bs2_jw_kao');
  });

  it('六扇门：周捕头举荐（草上飞一案了结），秦教头考校，传四门入门武功；拿上铁尺，铁尺点穴的绝招使得出', () => {
    act('bs2_qin', '投效');
    expect(S.sect).toBeUndefined();
    S.quests.side_caoshangfei = 3;
    S.flags.csf_caught = true;
    expect(act('bs2_qin', '投效').out.fight).toBe('bs2_lsm_kao');
    passKao('bs2_lsm_kao');
    expect(S.sect).toEqual({ school: '六扇门', rank: '记名' });
    expect(S.items.bs2_tiechi).toBe(1);
    for (let i = 0; i < 5; i++) act('bs2_qin', '请教');
    for (const id of ['jl_jishixinfa', 'jl_suolian', 'jl_tiechi', 'jl_zhuifeng']) expect(S.skills[id], id).toBeDefined();
    expect(S.skills.jl_fulong).toBeUndefined();
    S.loadout.neigong = 'jl_jishixinfa';
    S.loadout.weapon = 'jl_tiechi';
    S.gear.weapon = 'bs2_tiechi';
    fights('jl_tiechi', 'bs2_lsm_kao');
    // 门规森严：在门期间学不了别派的功夫
    expect(canLearn(S, SKILLS.find(k => k.id === 'gb_lianhua')!).ok).toBe(false);
  });

  it('丐帮：讨一顿饭入帮，花钱买的不算；记名先传百衲功，内功位要自己换上，换上了莲花掌的绝招使得出；腿脚、侠义够了升外门，根基够了传混天气功、缠丝擒拿手', () => {
    act('bs2_bao', '拜师');
    expect(S.quests.bs2_gb_kao).toBe(0);
    act('bs2_hu', '购买');
    expect(S.items.bs2_shaobing).toBe(1);
    act('bs2_bao', '复命');
    expect(S.sect).toBeUndefined();
    expect(S.items.bs2_shaobing).toBe(0);
    act('bs2_hu', '帮工');
    act('bs2_bao', '复命');
    expect(S.sect).toEqual({ school: '丐帮', rank: '记名' });
    expect(S.quests.bs2_gb_kao).toBe(1);
    for (let i = 0; i < 5; i++) act('bs2_bao', '请教');
    for (const id of ['gb_baina', 'gb_babu', 'gb_lianhua', 'gb_xiaoyaoyou']) expect(S.skills[id], id).toBeDefined();
    for (const id of ['gb_huntian', 'gb_chansi', 'gb_xianglong', 'gb_dagou']) expect(S.skills[id], id).toBeUndefined();
    expect(S.loadout.fist).toBe('gb_lianhua');
    delete S.gear.weapon;
    // 学到了本门内功，内功位上还是寒江心法：不替玩家换，记一条见闻提醒
    expect(S.loadout.neigong).toBe('xinfa');
    expect(S.feed.some(f => f.x.includes('「百衲功」是丐帮的根本') && f.x.includes('武功页换上'))).toBe(true);
    expect(fightKit(S).unrooted).toBe(true);
    // 换上百衲功，记名弟子的莲花掌就使得出绝招
    S.loadout.neigong = 'gb_baina';
    fights('gb_lianhua', 'bs2_wg_shidun');
    act('bs2_bao', '考校');
    expect(S.sect?.rank).toBe('记名');
    S.skills.gb_babu!.r = 1;
    S.xia = 20;
    act('bs2_bao', '考校');
    expect(S.sect).toEqual({ school: '丐帮', rank: '外门' });
    // 根基不够：百衲功、莲花掌都还没练到略有小成，混天气功、缠丝擒拿手学不成，鲍四说清楚还差什么
    expect(act('bs2_bao', '请教').text).toContain('先把百衲功练到略有小成');
    S.skills.gb_baina!.r = 1;
    expect(act('bs2_bao', '请教').text).toContain('混天气功');
    expect(S.skills.gb_huntian).toBeDefined();
    expect(act('bs2_bao', '请教').text).toContain('先把莲花掌练到略有小成');
    S.skills.gb_lianhua!.r = 1;
    act('bs2_bao', '请教');
    for (const id of ['gb_huntian', 'gb_chansi']) expect(S.skills[id], id).toBeDefined();
    expect(S.skills.gb_xianglong).toBeUndefined();
    S.loadout.neigong = 'gb_huntian';
    S.loadout.qinggong = 'gb_babu';
    fights('gb_lianhua', 'bs2_wg_shidun');
  });
});

describe('叛门、逐出：拜不回原门派，出师的回得去（docs/menpai.md 第七节）', () => {
  beforeEach(() => setState(skipToYangzhou()));
  const lianhua = (): SkillDef => byId('gb_lianhua')!;

  it('叛门：丐帮拜不回去，本门武功封顶，学不到新的；别的门派照样拜得进', () => {
    // 百衲功练到炉火纯青，莲花掌本来能练到登堂入室（外功不过内功一重）
    run([{ type: 'sect', school: '丐帮', rank: '外门' }, { type: 'learn', skill: 'gb_baina', realm: 3 }, { type: 'learn', skill: 'gb_lianhua' }]);
    S.skills.gb_lianhua!.r = 1;
    expect(realmCap(S, lianhua())).toBe(4);
    run([{ type: 'leaveSect', how: '叛门' }]);
    expect(S.sect).toBeUndefined();
    expect(pastSectText(S)).toBe('叛出丐帮');
    run([{ type: 'sect', school: '丐帮', rank: '记名' }]);
    expect(S.sect).toBeUndefined();
    expect(S.feed[0].x).toContain('叛出过丐帮');
    expect(realmCap(S, lianhua())).toBe(1);
    const why = canLearn(S, byId('gb_xiaoyaoyou')!);
    expect(why.ok ? '' : why.why).toContain('叛出过丐帮');
    run([{ type: 'sect', school: '六扇门', rank: '记名' }]);
    expect(S.sect).toEqual({ school: '六扇门', rank: '记名' });
  });

  it('逐出：同样拜不回去、本门武功封顶；来历写「被逐出」', () => {
    run([{ type: 'sect', school: '六扇门', rank: '记名' }, { type: 'learn', skill: 'jl_suolian' }]);
    run([{ type: 'leaveSect', how: '逐出' }]);
    expect(S.sect).toBeUndefined();
    expect(pastSectText(S)).toBe('被逐出六扇门');
    run([{ type: 'sect', school: '六扇门', rank: '记名' }]);
    expect(S.sect).toBeUndefined();
    expect(S.feed[0].x).toContain('被逐出过六扇门');
    expect(realmCap(S, byId('jl_suolian')!)).toBe(0);
    expect(canLearn(S, byId('jl_tiechi')!).ok).toBe(false);
  });

  it('出师：所学全留、不封顶，日后还拜得回去', () => {
    run([{ type: 'sect', school: '丐帮', rank: '真传' }, { type: 'learn', skill: 'gb_baina', realm: 3 }, { type: 'learn', skill: 'gb_lianhua' }]);
    run([{ type: 'leaveSect', how: '出师' }]);
    expect(pastSectText(S)).toBe('出师于丐帮');
    expect(realmCap(S, lianhua())).toBe(4);
    run([{ type: 'sect', school: '丐帮', rank: '记名' }]);
    expect(S.sect).toEqual({ school: '丐帮', rank: '记名' });
  });

  it('条件 pastSect：拜过、叛出过、被逐出过某派，内容读得到', () => {
    expect(cond({ pastSect: { school: '丐帮' } })).toBe(false);
    run([{ type: 'sect', school: '丐帮', rank: '记名' }, { type: 'leaveSect', how: '逐出' }]);
    run([{ type: 'sect', school: '军伍', rank: '记名' }, { type: 'leaveSect', how: '出师' }]);
    expect(pastSectText(S)).toBe('被逐出丐帮；出师于军伍');
    expect(cond({ pastSect: { school: '丐帮' } })).toBe(true);
    expect(cond({ pastSect: { school: '丐帮', how: '逐出' } })).toBe(true);
    expect(cond({ pastSect: { school: '丐帮', how: '叛门' } })).toBe(false);
    expect(cond({ pastSect: { school: '军伍', how: '出师' } })).toBe(true);
    expect(cond({ pastSect: { school: '六扇门' } })).toBe(false);
    // 眼下在门中的不算「离开过」
    run([{ type: 'sect', school: '六扇门', rank: '记名' }]);
    expect(cond({ pastSect: { school: '六扇门' } })).toBe(false);
    expect(cond({ noSect: true })).toBe(false);
  });
});

describe('寒江一脉不受别派门规', () => {
  it('严门弟子学得了寒江武功，学不了别派的', async () => {
    const { canLearn } = await import('../src/engine/shicheng');
    const { SKILLS } = await import('../src/content');
    const hj = SKILLS.find(k => k.school === '寒江')!;
    const other = SKILLS.find(k => k.school === '少林')!;
    const st = { sect: { school: '军伍', rank: '记名' as const }, skills: {}, attr: { 体魄: 40, 根骨: 40, 身法: 40, 悟性: 40, 胆魄: 40 } };
    const r = canLearn(st as never, hj);
    expect(r.ok ? '' : r.why).not.toContain('门规');
    expect(canLearn(st as never, other).ok).toBe(false);
  });
});

