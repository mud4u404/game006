/**
 * 门派打法与师承校验：门派之间打法不同，同一门派的武功合起来是一套打法，并且是一棵有前置、有师承的武学树。
 * 规则见 docs/menpai.md 第四节、第七节。
 * 看每个门派的体检结果：npm run menpai
 */
import { describe, expect, it } from 'vitest';
import { SKILLS } from '../src/content';
import { GRADES, JIANGHU_RULE, NATURES, OUTER, REALMS, ROOTED_CATS, ROOT_ANY, SCHOOLS, SCHOOL_STYLE, STYLES, STYLE_PENDING, STYLE_RING, TEACH_GRADES, styleBeats } from '../src/content/skills';
import { rootsOn } from '../src/engine/shicheng';
import type { Style } from '../src/content/skills';
import type { AttrKey, FxDef, FxKind, SkillDef } from '../src/content/types';

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
    if (k.teach === '内门' || k.teach === '真传') {
      // 顺着前置往下找，要能找到本门的入门或外门武功
      const seen = new Set<string>(), stack = [k.id];
      let ok = false;
      while (stack.length && !ok) {
        const cur = byId(stack.pop()!);
        if (!cur || seen.has(cur.id)) continue;
        seen.add(cur.id);
        for (const r of cur.requires || []) {
          const d = byId(r.skill);
          if (d?.school === school && (d.teach === '入门' || d.teach === '外门')) ok = true;
          else if (d?.school === school) stack.push(d.id);
        }
      }
      if (!ok) errs.push(`${k.name}：${k.teach}武功顺着前置往下，找不到本门的入门或外门武功，武学树断了`);
    }
    const usesRoot = ROOTED_CATS.includes(k.category) && (k.performs?.length || k.ult || k.combos?.length);
    if (usesRoot && !k.roots?.includes(ROOT_ANY) && !SKILLS.some(n => n.category === '内功' && gradeRank(n.grade) <= gradeRank('上品') && rootsOn(k, n)))
      errs.push(`${k.name}：内功为根，要有一门上品以下、能给它打底的内功（本门内功，或写进 roots），否则绝招没人使得出`);
  }
  return errs;
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
    } finally { SKILLS.pop(); }
  });
});
