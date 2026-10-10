/**
 * 对战模拟：门派之间谁也不能独大。标准见 docs/menpai.md 第六节。
 * - 实际激发的外功、中期总得分率及原始镜像偏差，现在就硬性检查；
 * - 门派胜率、相克、分期、混搭：改造完的门派不少于六个、覆盖四种主打法以后，才硬性检查；在那之前只出报告。
 * 看完整的胜率矩阵：npm run balance
 */
import { describe, expect, it } from 'vitest';
import { fightKit } from '../src/engine/zhaoshi';
import { SKILLS } from '../src/content';
import { SCHOOL_STYLE, STYLE_PENDING, styleBeats } from '../src/content/skills';
import { STAGES, bestBuild, kitOf, mixedBuilds, outerOf, duel, formatMatrix, matrix, type Kit, type Matrix } from './balance-kit';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const MID = STAGES[1];
const withSkills = [...new Set(SKILLS.map(k => k.school))].filter(s => SCHOOL_STYLE[s]);
const done = withSkills.filter(s => !STYLE_PENDING.includes(s));
const ACTIVE = done.length >= 6 && new Set(done.map(s => SCHOOL_STYLE[s].main)).size >= 4;
const kits = (schools: string[], st = MID): Kit[] => schools.map(s => kitOf(bestBuild(s, st)));

/** 门派胜率的问题清单（docs/menpai.md 第六节）；空的就是达标 */
export function balanceProblems(m: Matrix): string[] {
  const errs: string[] = [];
  m.names.forEach((n, i) => {
    if (m.overall[i] < 0.4 || m.overall[i] > 0.6) errs.push(`${n}：总胜率 ${Math.round(m.overall[i] * 100)}%，要在 40% 到 60% 之间`);
    const wins = m.rate[i].filter((x, j) => i !== j && x > 0.5).length;
    if (wins < 2) errs.push(`${n}：只有 ${wins} 个胜率过半的对手，至少要两个`);
  });
  // 相克：按主打法汇总，克的一方平均胜率不低于 56%
  const agg = new Map<string, number[]>();
  m.names.forEach((a, i) => m.names.forEach((b, j) => {
    const sa = SCHOOL_STYLE[a].main, sb = SCHOOL_STYLE[b].main;
    if (i !== j && styleBeats(sa, sb)) agg.set(`${sa}克${sb}`, [...(agg.get(`${sa}克${sb}`) ?? []), m.rate[i][j]]);
  }));
  for (const [k, xs] of agg) { const avg = xs.reduce((a, x) => a + x, 0) / xs.length; if (avg < 0.56) errs.push(`${k}：平均胜率只有 ${Math.round(avg * 100)}%，相克不成立`); }
  return errs;
}

describe('对战模拟', () => {
  it('选出的外功在实战中真正激发，不把没有兵器的搭配当作已上阵', () => {
    for (const st of STAGES) for (const s of withSkills) {
      const k = kitOf(bestBuild(s, st));
      expect(fightKit(k.state).outer?.id, `${s} ${st.name}`).toBe(outerOf(k.build)?.id);
      for (const b of mixedBuilds(s, st)) expect(fightKit(kitOf(b).state).outer?.id, `${s} ${st.name} 混搭`).toBe(outerOf(b)?.id);
    }
  });
  it('角色轮换镜像：同一套搭配左右互打，得分率在 50% ± 5% 以内', () => {
    for (const s of ['寒江', '武当', '丐帮'].filter(x => withSkills.includes(x))) {
      const k = kitOf(bestBuild(s, MID));
      const r = duel(k, { ...k, name: k.name + '（镜像）' }, 1000, 'mirror');
      expect(Math.abs(r - 0.5), `${s} 镜像 ${r}`).toBeLessThanOrEqual(0.05);
    }
  });

  it('已改造门派的中期总胜率在 40%～60%，原始镜像不让一侧压倒性占优', () => {
    const m = matrix(kits(done), 1000, 'full');
    m.names.forEach((s, i) => {
      expect(m.overall[i], `${s} 总胜率\n${formatMatrix(m)}`).toBeGreaterThanOrEqual(0.4);
      expect(m.overall[i], `${s} 总胜率\n${formatMatrix(m)}`).toBeLessThanOrEqual(0.6);
      // 原生对手与玩家流程不同，不假称是对称 PvP；原始率能揭露角色轮换隐藏的偏差。
      expect(m.heroRate[i][i], `${s} 原始镜像胜率`).toBeGreaterThanOrEqual(0.25);
      expect(m.heroRate[i][i], `${s} 原始镜像胜率`).toBeLessThanOrEqual(0.75);
    });
  }, 60000);

  it('门派对打：不能独大、相克成立、没有废门派（改造完的门派）', () => {
    if (!ACTIVE) { console.log(`对战模拟：改造完的门派只有 ${done.length} 个（${done.join('、') || '无'}），凑满六个、覆盖四种主打法后硬性检查。npm run balance 看当前矩阵。`); return; }
    const m = matrix(kits(done), 200, 'ci');
    expect(balanceProblems(m), '\n' + formatMatrix(m)).toEqual([]);
    // 同一套 SKILLED 不按门派名字偏心：匿名后重跑，各派胜率变化不超过三个点
    const flat = matrix(kits(done).map((k, i) => ({ ...k, name: `匿名${i}`, state: { ...k.state, name: `匿名${i}` } })), 200, 'ci');
    m.overall.forEach((x, i) => expect(Math.abs(x - flat.overall[i]), `${m.names[i]} 的胜率靠策略偏心`).toBeLessThanOrEqual(0.03));
  }, 60000);

  it('分期有界：前期、后期每派胜率 35% 到 65%，同一门派前后相差不超过 20 个点', () => {
    if (!ACTIVE) return;
    const early = matrix(kits(done, STAGES[0]), 60, 'ci'), late = matrix(kits(done, STAGES[2]), 60, 'ci');
    const errs: string[] = [];
    done.forEach((s, i) => {
      for (const [name, m] of [['前期', early], ['后期', late]] as const) if (m.overall[i] < 0.35 || m.overall[i] > 0.65) errs.push(`${s}：${name}总胜率 ${Math.round(m.overall[i] * 100)}%`);
      if (Math.abs(late.overall[i] - early.overall[i]) > 0.2) errs.push(`${s}：前期 ${Math.round(early.overall[i] * 100)}%、后期 ${Math.round(late.overall[i] * 100)}%，相差太大`);
    });
    expect(errs).toEqual([]);
  }, 60000);

  it('混搭不独大：最好的混搭总胜率不超过 60%，比同根基的纯修高不出五个点', () => {
    if (!ACTIVE) return;
    const field = kits(done);
    const vsField = (k: Kit, n: number): number => field.filter(f => f.build.school !== k.build.school).reduce((a, f) => a + duel(k, f, n, 'mix'), 0) / (field.length - 1);
    const errs: string[] = [];
    for (const root of done) {
      const pure = vsField(field[done.indexOf(root)], 60);
      const mixes = mixedBuilds(root, MID).map((b, i) => ({ ...kitOf(b), name: `${root}混搭${i}` }));
      const best = mixes.map(k => ({ k, r: vsField(k, 12) })).sort((a, b) => b.r - a.r)[0];
      if (!best) continue;
      const r = vsField(best.k, 60);
      if (r > 0.6 || r > pure + 0.05) errs.push(`${root}：混搭「${fightKit(best.k.state).performs.map(x => x.name).join('、')}」总胜率 ${Math.round(r * 100)}%，纯修 ${Math.round(pure * 100)}%`);
    }
    expect(errs).toEqual([]);
  }, 60000);

  if (env.BALANCE) {
    it('打印完整的胜率矩阵（含待改造的门派）', () => {
      for (const st of STAGES) {
        const m = matrix(kits(withSkills, st), 1000, 'full');
        console.log(`\n== ${st.name}（境界 ${st.realm}）。待改造：${STYLE_PENDING.filter(s => withSkills.includes(s)).join('、')}\n${formatMatrix(m)}`);
        if (st === MID) {
          const assessed = matrix(kits(done, st), 1000, 'full');
          console.log('达标检查（只看改造完的门派才算数）：\n' + (balanceProblems(assessed).join('\n') || '全部达标'));
        }
      }
    }, 600000);
  }
});
