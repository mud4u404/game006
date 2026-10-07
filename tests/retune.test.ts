/**
 * 调数工具：把武功包里不合规的绝招数值，统一调进 docs/wuxue.md 第五节的规则里。
 * 只改耗内力、调息、连击数、伤害，不改文字和效果。平时不运行；需要时用 `npm run retune`。
 * 调完要人看一眼：纯控制的绝招可能被加上一下轻伤，文字要和机制对得上。
 */
import { describe, expect, it } from 'vitest';
import { SKILLS } from '../src/content';
import { ACTIVE_MAX, EFFICIENCY_BAND, REALM_STEP, loosen } from '../src/content/skills';
import { fxCost, performBudget, performEfficiency } from '../src/engine/wuxue';
import type { PerformDef, SkillDef } from '../src/content/types';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const r5 = (x: number): number => Math.max(5, Math.round(x / 5) * 5);
const lockOf = (p: PerformDef): number => Math.max(0, ...(p.fx || []).filter(f => f.kind === 'busy' || f.kind === 'disarm').map(f => f.rounds ?? 1));

export interface Tuned { id: string; name: string; mp: number; cd: number; hits: number; dmg: [number, number] }

/** 算出一门武功里每个绝招该改成的数；已经合规的不动 */
export function retuneSkill(k: SkillDef): Tuned[] {
  const ps = [...(k.performs || [])].sort((a, b) => (a.realm ?? 0) - (b.realm ?? 0));
  // 从高境界往下算每个绝招的预算上界：给「越练越强」留出空间
  const ub = new Map<PerformDef, number>();
  for (let i = ps.length - 1; i >= 0; i--) {
    const r = ps[i].realm ?? 0;
    let u = ACTIVE_MAX[k.grade].expected * loosen(r) * 0.98;
    const higher = ps.slice(i + 1).filter(q => (q.realm ?? 0) > r);
    if (higher.length) u = Math.min(u, Math.min(...higher.map(q => ub.get(q)!)) / REALM_STEP - 3);
    ub.set(ps[i], u);
  }
  const done: { realm: number; b: number }[] = [];
  const out: Tuned[] = [];
  for (const p0 of ps) {
    const realm = p0.realm ?? 0, L = loosen(realm);
    const [lo, hi] = EFFICIENCY_BAND[k.grade].map(x => x * L);
    const capB = ACTIVE_MAX[k.grade].expected * L;
    const lower = done.filter(d => d.realm < realm);
    // need 是内容校验的底线；调数时多留 2 点余量
    const need = lower.length ? Math.max(...lower.map(d => d.b)) * REALM_STEP : 0;
    const minB = need ? need + 2 : 0;
    const p: PerformDef = { ...p0, dmg: [...p0.dmg] as [number, number] };
    const fitsAt = (q: PerformDef, floor: number): boolean => { const e = performEfficiency(q), b = performBudget(q); return e >= lo && e <= hi && b <= capB && b >= floor && q.cd > lockOf(q); };
    const fits = (q: PerformDef): boolean => fitsAt(q, minB);
    if (fitsAt(p0, need - 1e-9)) { done.push({ realm, b: performBudget(p0) }); continue; }
    const fx = (p.fx || []).reduce((a, f) => a + fxCost(f), 0);
    const minCd = lockOf(p) + 1;
    p.cd = Math.max(p.cd, minCd);
    const target = Math.min(Math.max(performEfficiency(p0), lo + 0.04 * L), hi - 0.04 * L);
    const curB = performBudget(p0), lowB = EFFICIENCY_BAND[k.grade][0] * L * (p0.mp + 20 * p0.cd);
    let B = Math.max(curB, Math.min(lowB, ub.get(p0)!), minB);
    B = Math.min(B, ub.get(p0)!, capB * 0.97);
    const setMp = (budget: number): void => {
      const base = budget / target;
      let mp = base - 20 * p.cd;
      while (mp > 150 && p.cd < 5) { p.cd++; mp = base - 20 * p.cd; }
      while (mp < 20 && p.cd > minCd) { p.cd--; mp = base - 20 * p.cd; }
      p.mp = Math.min(150, Math.max(20, r5(mp)));
    };
    if (p.hits === 0 && fx >= Math.max(minB, lo * (20 + 20 * p.cd))) setMp(fx);
    else {
      if (p.hits === 0) p.hits = 1;
      setMp(B);
      const ratio = Math.max(1, p0.hits ? p0.dmg[1] / Math.max(1, p0.dmg[0]) : 1.25);
      const avg = Math.max(B - fx, p.hits * p.acc * 12) / (p.hits * p.acc);
      const dlo = (2 * avg) / (1 + ratio);
      p.dmg = [Math.max(10, r5(dlo)), Math.min(400, r5(dlo * ratio))];
    }
    for (let i = 0; i < 100 && !fits(p); i++) {
      const b = performBudget(p), e = performEfficiency(p);
      const up = (): void => { p.dmg = [p.dmg[0] + 5, Math.min(400, p.dmg[1] + 5)]; };
      const down = (): void => { p.dmg = [Math.max(10, p.dmg[0] - 5), Math.max(10, p.dmg[1] - 5)]; };
      if (b > capB) { if (p.hits) down(); else break; }
      else if (b < minB) { if (!p.hits) { p.hits = 1; p.dmg = [10, 15]; } else up(); }
      else if (e < lo) { if (p.mp > 20) p.mp -= 5; else if (p.cd > minCd) p.cd--; else if (p.hits) up(); else { p.hits = 1; p.dmg = [10, 15]; } }
      else if (e > hi) { if (p.mp < 150) p.mp += 5; else if (p.cd < 5) p.cd++; else if (p.hits) down(); else break; }
    }
    done.push({ realm, b: performBudget(p) });
    const same = p.mp === p0.mp && p.cd === p0.cd && p.hits === p0.hits && p.dmg[0] === p0.dmg[0] && p.dmg[1] === p0.dmg[1];
    if (!same) out.push({ id: k.id, name: p0.name, mp: p.mp, cd: p.cd, hits: p.hits, dmg: p.dmg });
  }
  return out;
}

/** 把算好的数写回源文件：只替换这个绝招对象里的 mp、cd、hits、dmg */
export function applyTuned(src: string, t: Tuned): string {
  const i = src.indexOf(`id: '${t.id}'`);
  const j = src.indexOf('performs: [', i);
  const k = src.indexOf(`name: '${t.name}'`, j);
  if (i < 0 || j < 0 || k < 0) throw new Error(`找不到 ${t.id} 的绝招 ${t.name}`);
  const a = src.indexOf('acc:', k);
  const end = src.slice(a).search(/[,}]/) + a;
  const seg = src.slice(k, end)
    .replace(/mp: \d+/, `mp: ${t.mp}`).replace(/cd: \d+/, `cd: ${t.cd}`)
    .replace(/hits: \d+/, `hits: ${t.hits}`).replace(/dmg: \[\d+, \d+\]/, `dmg: [${t.dmg[0]}, ${t.dmg[1]}]`);
  return src.slice(0, k) + seg + src.slice(end);
}

describe('调数工具', () => {
  it('算出来的数都合规（拿现有武功演算一遍，不写文件）', () => {
    for (const k of SKILLS) for (const t of retuneSkill(k)) {
      const p = { ...k.performs!.find(q => q.name === t.name)!, ...t } as PerformDef;
      expect(p.cd, `${k.id} ${t.name}`).toBeGreaterThan(lockOf(p));
    }
  });

  if (env.RETUNE) {
    it('把不合规的绝招写回源文件', async () => {
      const fs: { readdirSync(p: URL): string[]; readFileSync(p: URL, e: string): string; writeFileSync(p: URL, s: string): void } = await import(/* @vite-ignore */ 'node:' + 'fs');
      const dir = new URL('../src/content/packs/', import.meta.url);
      const files = fs.readdirSync(dir).filter(f => f.startsWith('skills-'));
      let n = 0;
      for (const k of SKILLS) {
        const ts = retuneSkill(k);
        if (!ts.length) continue;
        const f = files.find(x => fs.readFileSync(new URL(x, dir), 'utf8').includes(`id: '${k.id}'`));
        if (!f) throw new Error(`找不到 ${k.id} 所在的文件`);
        let src = fs.readFileSync(new URL(f, dir), 'utf8');
        for (const t of ts) { src = applyTuned(src, t); n++; console.log(`${f} ${t.id} 「${t.name}」 → 内力 ${t.mp} 调息 ${t.cd} 连击 ${t.hits} 伤害 ${t.dmg.join('～')}`); }
        fs.writeFileSync(new URL(f, dir), src);
      }
      console.log(`共调整 ${n} 个绝招`);
    });
  }
});
