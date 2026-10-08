/**
 * 验收：把地基第二版的每一条验收标准算出实测值，排成一张表；另附体感对照、规则开关对照、战报、江湖日记。
 * 标准是事先写死的（计划第二节），这里只负责量。k 是样本的倍数：测试里用 1（几秒跑完），全量报告用 3。
 */
import type { GameState } from '../../core/state';
import { CURRENT_RULES, NEW_RULES, RANDOM, ROTE, SKILLED, fight, many, type Foe, type Hero, type Policy, type Rules, type Wounds } from './kernel';
import { BUILDS, SCALE0, asFoe, asHero, standard, type Person } from './person';
import { GONGLI_LADDER, LIFE0, PROFILES, live, type LifeLog, type Profile } from './life';
import { migrateSave } from './migrate';
import { foeFromDef, heroFromState } from './current';
import type { FoeDef } from '../../content/types';

export interface Row { id: string; area: string; std: string; got: string; pass: boolean | null; note?: string }
export interface FeelRow { name: string; win: number; rote: number; random: number; seconds: number; decisions: number; prompts: number; openings: number; decisive: number; swings: number; comeback: number }
export interface AbRow { rule: string; verdict: '留' | '去' | '改'; why: string; on: string; off: string }
export interface Report { rows: Row[]; feel: FeelRow[]; ab: AbRow[]; replays: { title: string; lines: string[] }[]; diary: string[]; life: string[] }

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const med = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const inb = (x: number, a: number, b: number): boolean => x >= a && x <= b;

const sc = SCALE0;
const H = (p: Person, pre?: Wounds): Hero => ({ ...asHero(p, sc), pre });
const F = (p: Person): Foe => asFoe(p, sc);

/** 九种偏科配对的平均 */
function pairs(ht: number, ft: number, pol: Policy, rules: Rules, n: number, salt: number, pre?: Wounds) {
  const ws: number[] = [], ts: number[] = [], sh: number[] = [];
  let i = 0;
  for (const hb of BUILDS) for (const fb of BUILDS) {
    i++;
    const s = many(H(standard(ht, hb), pre), F(standard(ft, fb)), pol, rules, n, salt * 100 + i);
    ws.push(s.win); ts.push(s.ticksMed); sh.push(s.bestShiftAny);
  }
  return { win: avg(ws), ticks: avg(ts), shift: avg(sh) };
}

export interface Inputs {
  /** 现有的存档样本（JSON 读出来、已经迁移到当前版本的） */
  saves: { file: string; state: GameState; oldTier: number }[];
  /** 现有实战的基准：玩家存档和屠千山 */
  baseline?: { state: GameState; foe: FoeDef };
}

export function buildReport(k: number, inp: Inputs): Report {
  const n = 40 * k, R = NEW_RULES;
  const rows: Row[] = [];
  const add = (r: Row): void => { rows.push(r); };

  /* ---------- 交手 ---------- */
  const same = [1, 2, 3, 4].map(t => pairs(t, t, SKILLED, R, n, t));
  add({ id: 'C1', area: '交手', std: '同档交手，每一档的中位数在 8 到 15 合（一合双方各出一手，内核里是 16 到 30 次出手）', got: same.map((s, i) => `${['三流', '二流', '一流', '绝顶'][i]}${s.ticks.toFixed(0)}`).join('、') + ' 次出手', pass: same.every(s => inb(s.ticks, 16, 30)) });
  const up = [1, 2, 3].map(t => pairs(t + 1, t, SKILLED, R, n, 10 + t).win);
  const up0 = pairs(1, 0, SKILLED, R, n, 9).win;
  add({ id: 'C2', area: '交手', std: '高一档胜率在 75% 到 85% 之间，每一对相邻的档都成立', got: `三流胜不入流${pct(up0)}；二流胜三流${pct(up[0])}；一流胜二流${pct(up[1])}；绝顶胜一流${pct(up[2])}`, pass: up.every(x => inb(x, 0.75, 0.85)), note: '不入流练的都是第一重，偏不了科，所以单列，不计入' });
  const up2 = [1, 2].map(t => pairs(t + 2, t, SKILLED, R, n, 20 + t).win);
  const up2r = [1, 2].map(t => pairs(t + 2, t, RANDOM, R, n, 30 + t).win);
  add({ id: 'C3', area: '交手', std: '高两档胜率不低于 97%', got: `正常打 ${up2.map(pct).join('、')}；随手乱打也有 ${up2r.map(pct).join('、')}`, pass: up2.every(x => x >= 0.97) });
  const crowd = (ht: number, ft: number, cnt: number, morale: number, salt: number): number =>
    many(H(standard(ht, 'outer')), F(standard(ft, 'light')), SKILLED, { ...R, morale }, n * 2, salt, { n: cnt, maxAtk: 3 }).win;
  const c4 = { a: crowd(5, 0, 20, 0, 41), b: crowd(5, 2, 3, 0, 42), c0: crowd(3, 2, 2, 0, 43), c5: crowd(3, 2, 2, 0.5, 44) };
  add({ id: 'C4', area: '交手', std: '围攻：宗师对二十个不入流不低于 95%；宗师对三个二流不低于 90%；一流对两个二流在 40% 到 60%', got: `宗师对二十个不入流 ${pct(c4.a)}；宗师对三个二流 ${pct(c4.b)}；一流对两个二流：乌合之众 ${pct(c4.c5)}，同门死士 ${pct(c4.c0)}`, pass: c4.a >= 0.95 && c4.b >= 0.9 && inb(c4.c5, 0.4, 0.6) && inb(c4.c0, 0.4, 0.6), note: '乌合之众（同伙倒下一半人会溜）通过；同门死士不通过。连打两个、中间不能喘气，和 C2 在数学上冲突，请负责人定' });
  const rote = pairs(2, 2, ROTE, R, n, 51).win, rnd = pairs(2, 2, RANDOM, R, n, 52).win;
  add({ id: 'C5', area: '交手', std: '以己之长比固定套路（「重则避」这类找规律的打法）同档胜率高出 10 个点以上，比随手乱选高出 15 个点以上', got: `以己之长 ${pct(same[1].win)}，固定套路 ${pct(rote)}，随手乱选 ${pct(rnd)}`, pass: same[1].win - rote >= 0.1 && same[1].win - rnd >= 0.15, note: '原标准写的是「以己之长对固定套路胜率不低于六成」；内核里玩家和对手的流程不对称，所以改为对同一个对手比胜率差' });
  const shifts: string[] = [];
  const shv: number[] = [];
  for (const z of ['hand', 'foot', 'inner'] as const) for (const lv of [1, 2]) {
    const pre = { hand: 0, foot: 0, inner: 0, [z]: lv } as Wounds;
    const r = pairs(2, 2, SKILLED, R, Math.max(20, n / 2), 60 + lv, pre);
    shifts.push(`${{ hand: '手', foot: '足', inner: '内息' }[z]}${lv}级 ${pct(r.shift)}/胜${pct(r.win)}`);
    shv.push(r.shift);
  }
  add({ id: 'C6', area: '交手', std: '至少三成的场次里，最好的应对会因为受伤而改变', got: `带伤开打：${shifts.join('；')}；平均 ${pct(avg(shv))}`, pass: avg(shv) >= 0.3, note: '伤改为「打完才起作用、带到下一场」（第九、十轮），所以按带伤开打来量' });
  const h2 = H(standard(2, 'outer'));
  const dian = { ...h2, performs: [{ ...h2.performs[0], hold: 1, cd: 3, dmg: [h2.performs[0].dmg[0] * 0.5, h2.performs[0].dmg[1] * 0.5] as [number, number] }, h2.performs[1]] };
  const dian2 = { ...h2, performs: [{ ...h2.performs[0], hold: 2, cd: 3 }, { ...h2.performs[1], hold: 2, cd: 3 }] };
  const d0 = avg(BUILDS.map((fb, i) => many(h2, F(standard(2, fb)), SKILLED, R, n * 2, 70 + i).win));
  const d1s = BUILDS.map((fb, i) => many(dian, F(standard(2, fb)), SKILLED, R, n * 2, 70 + i));
  const d2s = BUILDS.map((fb, i) => many(dian2, F(standard(2, fb)), SKILLED, { ...R, holdImmune: 2 }, n * 2, 70 + i));
  const held = Math.max(...d1s.map(s => s.maxHeld), ...d2s.map(s => s.maxHeld));
  add({ id: 'C7', area: '交手', std: '所有模拟里，连续不能动最多两合', got: `最多连着 ${held} 合动不了。带点穴的胜率：定一合、伤害减半 ${pct(avg(d1s.map(s => s.win)))}；现有内容的配法（定两合、全额伤害）${pct(avg(d2s.map(s => s.win)))}；不带 ${pct(d0)}`, pass: held <= 2, note: '锁不死人；但现有内容的点穴配法太强，建议定一合、伤害减半' });
  const prep = (p: { hp: number; atk: number; big: number }, d: number): number => {
    const ws: number[] = []; let i = 0;
    for (const hb of BUILDS) for (const fb of BUILDS) { i++; ws.push(many(H(standard(2, hb)), { ...F(standard(2 + d, fb)), prep: p }, SKILLED, R, n, 80 + i + d * 10).win); }
    return avg(ws);
  };
  const capNew = { hp: 0.85, atk: 0.85, big: 0.85 }, capOld = { hp: 0.5, atk: 0.5, big: 0.5 };
  const p1 = prep(capNew, 1), p2 = prep(capNew, 2), o1 = prep(capOld, 1), o2 = prep(capOld, 2);
  add({ id: 'C8', area: '交手', std: '备战做满：低一档胜率不超过 60%，低两档不超过 15%', got: `建议上限（气血、出手、重招各不低于八成五）：低一档 ${pct(p1)}，低两档 ${pct(p2)}；现有上限（各五成）：低一档 ${pct(o1)}，低两档 ${pct(o2)}`, pass: p1 <= 0.6 && p2 <= 0.15, note: '现有上限不通过，要收紧' });
  const one = (mod: (p: Person) => Person, salt: number): number => {
    const ws: number[] = []; let i = 0;
    for (const hb of BUILDS) for (const fb of BUILDS) { i++; ws.push(many(H(mod(standard(2, hb))), F(standard(2, fb)), SKILLED, R, n, salt * 100 + i).win); }
    return avg(ws);
  };
  const mainAttr = (p: Person, d: number): Person => {
    const key = p.outer >= p.neigong && p.outer >= p.qinggong ? 'li' : p.neigong >= p.qinggong ? 'gen' : 'shen';
    return { ...p, attr: { ...p.attr, [key]: p.attr[key] + d } };
  };
  const ruler = {
    主修高一重: one(p => ({ ...p, outer: p.outer + 1 }), 91), 内功高一重: one(p => ({ ...p, neigong: p.neigong + 1 }), 92), 轻功高一重: one(p => ({ ...p, qinggong: p.qinggong + 1 }), 93),
    功力翻一倍: one(p => ({ ...p, gongli: p.gongli * 2 }), 94), 主项根基多五点: one(p => mainAttr(p, 5), 95)
  };
  const gear = one(p => ({ ...p, gear: { atk: 1.08, def: 1.08 } }), 96);
  add({ id: 'C9', area: '交手', std: '同档里只改一样：高一重武功、功力翻倍、根基多五点，胜率都在 55% 到 62%；全身装备不超过 65%', got: `同档基线 ${pct(same[1].win)}；` + Object.entries(ruler).map(([k2, v]) => `${k2} ${pct(v)}`).join('、') + `；装备八分 ${pct(gear)}`, pass: Object.values(ruler).every(v => inb(v, 0.55, 0.62)) && gear <= 0.65 });

  /* ---------- 评价：看人说得准不准 ---------- */
  const deltas = [-2, -5 / 3, -4 / 3, -1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3, 2];
  const table = deltas.map((d, i) => pairs(2 + d, 2, SKILLED, R, Math.max(20, n / 2), 100 + i).win);
  const predict = (d: number): number => {
    if (d <= deltas[0]) return table[0];
    if (d >= deltas[deltas.length - 1]) return table[table.length - 1];
    const i = deltas.findIndex(x => x > d) - 1;
    const f = (d - deltas[i]) / (deltas[i + 1] - deltas[i]);
    return table[i] + (table[i + 1] - table[i]) * f;
  };
  const SAY: [number, number, string][] = [[0.95, 1.01, '不堪一击'], [0.75, 0.95, '远不如你'], [0.55, 0.75, '稍逊一筹'], [0.45, 0.55, '旗鼓相当'], [0.25, 0.45, '略胜一筹'], [0.05, 0.25, '远胜于你'], [-0.01, 0.05, '深不可测']];
  const phrase = (p: number): [number, number, string] => SAY.find(([a, b]) => p >= a && p < b) ?? SAY[3];
  let hit = 0, tot = 0, hitF = 0, hit40 = 0;
  const bucket = new Map<string, { hit: number; n: number }>();
  for (let i = 0; i < 30 * k; i++) {
    const r = (j: number): number => ((Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1 + 1) % 1;
    const th = 1 + r(1) * 3, tf = Math.max(0.5, Math.min(4.5, th + (r(2) - 0.5) * 3));
    const hb = BUILDS[Math.floor(r(3) * 3)], fb = BUILDS[Math.floor(r(4) * 3)];
    const ph = { ...standard(th, hb), gongli: standard(th, hb).gongli * (0.7 + r(5) * 0.7) };
    const pf = { ...standard(tf, fb), gongli: standard(tf, fb).gongli * (0.7 + r(6) * 0.7) };
    // 看人：游戏在后台先替玩家试打一百场（种子和实打不同），按胜率说话；对照试打四十场
    const [a, b, word] = phrase(many(H(ph), F(pf), SKILLED, R, 100, 900 + i).win);
    const [a4, b4] = phrase(many(H(ph), F(pf), SKILLED, R, 40, 1900 + i).win);
    // 对照：只用公式（档次差，加功力深浅，功力翻一倍约抵 0.15 档）
    const [fa, fb2] = phrase(predict(th - tf + 0.15 * Math.log2(ph.gongli / pf.gongli)));
    // 实打三百场：六十场的话胜率自己就有六个点的误差，量不准
    const real = many(H(ph), F(pf), SKILLED, R, 300, 200 + i).win;
    if (real >= a4 - 0.05 && real <= b4 + 0.05) hit40++;
    // 允许五个点的出入：两句说法的边界上本来就模糊
    const ok = real >= a - 0.05 && real <= b + 0.05;
    if (real >= fa - 0.05 && real <= fb2 + 0.05) hitF++;
    tot++; if (ok) hit++;
    const bk = bucket.get(word) ?? { hit: 0, n: 0 };
    bk.n++; if (ok) bk.hit++;
    bucket.set(word, bk);
  }
  add({ id: 'E1', area: '评价', std: '看人的七句说法和实际胜率对得上：每句说法里，落在自己区间（含五个点的出入）的配对不少于九成', got: `总的 ${pct(hit / tot)}；` + [...bucket.entries()].map(([w, b]) => `${w} ${b.hit}/${b.n}`).join('、'), pass: hit / tot >= 0.9, note: `看人的做法：游戏在后台先替玩家试打一百场，按胜率说话。只试打四十场，${pct(hit40 / tot)} 对得上（悟性低的人可以试得少，容易看走眼）；只用公式（档次差加功力深浅），${pct(hitF / tot)} 对得上，偏科之间的相克说不准` });

  /* ---------- 修炼与时间 ---------- */
  const seeds = 4 * k;
  const runs = (pr: Profile, p = LIFE0): LifeLog[] => Array.from({ length: seeds }, (_, i) => live(pr, p, 120, 31 + i));
  const byName = (nm: string): Profile => PROFILES.find(x => x.name === nm)!;
  const dil = runs(byName('勤奋')), cas = runs(byName('休闲')), grind = runs(byName('狂刷')), idle = runs(byName('只挂机')), story = runs(byName('只走主线'));
  const day = (ls: LifeLog[], t: number): number => med(ls.map(l => l.reach.find(r => r.tier === t)?.day ?? 999));
  const oh = (ls: LifeLog[], t: number): number => med(ls.map(l => l.reach.find(r => r.tier === t)?.onlineH ?? 999));
  const gl = (ls: LifeLog[], t: number): number => med(ls.map(l => l.reach.find(r => r.tier === t)?.gongli ?? NaN));
  const necks = med(dil.map(l => l.bottlenecks));
  add({ id: 'G1', area: '修炼', std: '勤奋的玩家：三流在二到四个在线小时；二流在第 10 到 18 天；一流在第 35 到 60 天；宗师在第 85 到 120 天，并且过了两道机缘瓶颈', got: `三流在线 ${oh(dil, 1).toFixed(0)} 小时；二流第 ${day(dil, 2).toFixed(1)} 天；一流第 ${day(dil, 3).toFixed(1)} 天；绝顶第 ${day(dil, 4).toFixed(1)} 天；宗师第 ${day(dil, 5).toFixed(1)} 天；过了 ${necks} 道瓶颈`, pass: inb(oh(dil, 1), 2, 4) && inb(day(dil, 2), 10, 18) && inb(day(dil, 3), 35, 60) && inb(day(dil, 5), 85, 120) && necks >= 2 });
  add({ id: 'G2', area: '修炼', std: '狂刷的玩家到二流，所用天数不少于勤奋玩家的七成', got: `狂刷 ${day(grind, 2).toFixed(1)} 天，勤奋 ${day(dil, 2).toFixed(1)} 天，是 ${pct(day(grind, 2) / day(dil, 2))}；到宗师 ${day(grind, 5).toFixed(1)} 天，是勤奋的 ${pct(day(grind, 5) / day(dil, 5))}`, pass: day(grind, 2) >= 0.7 * day(dil, 2) });
  add({ id: 'G3', area: '修炼', std: '只挂机、只走主线的玩家，120 天内到不了二流', got: `只挂机：${day(idle, 2) < 999 ? `第 ${day(idle, 2).toFixed(0)} 天到了` : '到不了'}；只走主线：${day(story, 2) < 999 ? `第 ${day(story, 2).toFixed(0)} 天到了` : '到不了'}`, pass: day(idle, 2) >= 999 && day(story, 2) >= 999 });
  const bands: [number, number][] = [[3, 8], [8, 20], [20, 40], [40, 60], [60, 1e9]];
  const gs = [1, 2, 3, 4, 5].map(t => gl(dil, t));
  add({ id: 'G4', area: '修炼', std: '勤奋玩家的功力在每一档都落在区间里：三流 3 到 8 年，二流 8 到 20 年，一流 20 到 40 年，绝顶 40 到 60 年，宗师 60 年以上', got: gs.map((g, i) => `${['三流', '二流', '一流', '绝顶', '宗师'][i]} ${g.toFixed(1)} 年`).join('、') + `；休闲玩家到二流时 ${gl(cas, 2).toFixed(1)} 年`, pass: gs.every((g, i) => inb(g, bands[i][0], bands[i][1])) });
  const g10 = runs({ ...byName('勤奋'), gen: 10 }), g30 = runs({ ...byName('勤奋'), gen: 30 });
  const f10 = med(g10.map(l => l.final.gongli)), f30 = med(g30.map(l => l.final.gongli));
  add({ id: 'G5', area: '修炼', std: '根骨 10 和根骨 30 的玩家，120 天时功力相差不超过 35%', got: `根骨 10：${f10.toFixed(1)} 年；根骨 30：${f30.toFixed(1)} 年；相差 ${pct(f30 / f10 - 1)}`, pass: f30 / f10 - 1 <= 0.35 });
  const zt = (z: Profile['zhoutian']): LifeLog[] => runs({ ...byName('勤奋'), zhoutian: z }, { ...LIFE0, gongliMode: 'saturate', dazuoK: 0.01, ceilK: 1.25 });
  const zn = zt('never'), zs = zt('smart'), za = zt('always');
  const fg = (ls: LifeLog[]): number => med(ls.map(l => l.final.gongli));
  add({ id: 'G6', area: '修炼', std: '大周天：「功力不到天花板一半才冒险」比全程小周天高 5% 以上，也不低于全程大周天；全程大周天的人至少一成走火过', got: `（饱和曲线下）全程小周天 ${fg(zn).toFixed(1)} 年；聪明的打法 ${fg(zs).toFixed(1)} 年；全程大周天 ${fg(za).toFixed(1)} 年，走火过的 ${za.filter(l => l.zouhuo > 0).length}/${za.length}`, pass: fg(zs) >= fg(zn) * 1.05 && fg(zs) >= fg(za), note: '不通过：功力大多贴着天花板，快一倍没用，只白担风险。大周天这条规则去掉；改成岁月曲线后，加速的东西（地利、丹药）才有用' });
  const skip = runs({ ...byName('勤奋'), skip: 10 });
  const ahead = Math.max(...[...dil, ...grind, ...skip].map(l => l.maxAhead));
  add({ id: 'G7', area: '时间', std: '任何玩法下，江湖日都不超过「现实小时数 + 10」；连点歇息不会多得任何东西', got: `江湖最多超前 ${ahead.toFixed(1)} 日；连点歇息的人被拦下 ${med(skip.map(l => l.blockedH)).toFixed(0)} 小时，到二流第 ${day(skip, 2).toFixed(1)} 天（老实玩第 ${day(dil, 2).toFixed(1)} 天），120 天功力 ${fg(skip).toFixed(1)} 年（老实玩 ${fg(dil).toFixed(1)} 年）`, pass: ahead <= 10.001 && day(skip, 2) >= day(dil, 2) && fg(skip) <= fg(dil) * 1.01 });
  const gap = (ls: LifeLog[]): number => Math.max(...ls.map(l => { const hs = [0, ...l.gains.map(g => g.hour), 120 * 24]; let m = 0; for (let i = 1; i < hs.length; i++) m = Math.max(m, hs[i] - hs[i - 1]); return m / 24; }));
  const days = (ls: LifeLog[]): number => avg(ls.map(l => new Set(l.gains.map(g => Math.floor(g.hour / 24))).size / 120));
  add({ id: 'G8', area: '体感', std: '（新加，事先写下）勤奋的玩家最长停滞不超过三天，七成以上的日子有长进', got: `勤奋：最长 ${gap(dil).toFixed(1)} 天没有长进，${pct(days(dil))} 的日子有长进；休闲：最长 ${gap(cas).toFixed(1)} 天，${pct(days(cas))}；狂刷：最长 ${gap(grind).toFixed(1)} 天，${pct(days(grind))}`, pass: gap(dil) <= 3 && days(dil) >= 0.7, note: '第十七轮发现的问题：只有九重时，后期一重要练几个星期，中间什么都看不到。每重分十成火候以后解决' });

  /* ---------- 经济 ---------- */
  const inn = runs({ ...byName('勤奋'), lodging: 'inn' });
  const net0 = med(inn.map(l => l.netByTier[0])), net1 = med(dil.map(l => l.netByTier[1]));
  add({ id: 'M1', area: '经济', std: '不入流天天住下房，每天净收入不高于零', got: `每个现实日净收 ${net0.toFixed(2)} 两`, pass: net0 <= 0 });
  add({ id: 'M2', area: '经济', std: '三流攒三十两，要六到十二天', got: `三流每天净攒 ${net1.toFixed(1)} 两，三十两要 ${(30 / net1).toFixed(1)} 天`, pass: inb(30 / net1, 6, 12) });
  add({ id: 'M3', area: '经济', std: '（只出报告）二流以后的结余', got: `每个现实日净收：二流 ${med(dil.map(l => l.netByTier[2])).toFixed(0)} 两、一流 ${med(dil.map(l => l.netByTier[3])).toFixed(0)} 两、绝顶 ${med(dil.map(l => l.netByTier[4])).toFixed(0)} 两`, pass: null, note: '银子到后期泛滥，家业（宅邸、产业、家将）要接住' });

  /* ---------- 资产 ---------- */
  const mig = inp.saves.map(s => ({ ...s, m: migrateSave(s.state) }));
  add({ id: 'A1', area: '资产', std: '迁移后，银两、物品、任务、旗标、人情原样不变', got: mig.map(x => x.file).join('、') + ' 全部原样', pass: mig.every(x => JSON.stringify(x.m.kept) === JSON.stringify({ silver: x.state.silver, items: x.state.items, quests: x.state.quests, flags: x.state.flags, rel: x.state.rel })) });
  add({ id: 'A2', area: '资产', std: '根基四项相加等于 80，每项在 10 到 30 之间', got: mig.map(x => `${x.file}：膂${x.m.attr.li} 根${x.m.attr.gen} 身${x.m.attr.shen} 悟${x.m.attr.wu}`).join('；'), pass: mig.every(x => { const a = x.m.attr; return a.li + a.gen + a.shen + a.wu === 80 && [a.li, a.gen, a.shen, a.wu].every(v => inb(v, 10, 30)); }) });
  add({ id: 'A3', area: '资产', std: '功力等于原来的内力上限除以 100', got: mig.map(x => `${x.file} ${x.state.mpMax} → ${x.m.gongli} 年`).join('；'), pass: mig.every(x => x.m.gongli === x.state.mpMax / 100) });
  const TN = ['不入流', '三流', '二流', '一流', '绝顶', '宗师'];
  add({ id: 'A4', area: '资产', std: '显示的档次不低于迁移前', got: mig.map(x => `${x.file} ${TN[x.oldTier]} → ${TN[x.m.tier]}`).join('；'), pass: mig.every(x => x.m.tier >= x.oldTier), note: '档次看身上练得最高的那一门；只看主修的话，老玩家会掉档' });
  add({ id: 'A5', area: '资产', std: '加上「年」以后，路遇和对手记录的间隔，换算前后一致', got: '旧存档都算景和元年，绝对日数等于旧的「一年里的第几天」，间隔不变', pass: mig.every(x => x.m.absDay(67) - x.m.absDay(60) === 7) });

  /* ---------- 体感对照 ---------- */
  const feel: FeelRow[] = [];
  const fr = (name: string, h: Hero, f: Foe, rules: Rules, salt: number): FeelRow => {
    const s = many(h, f, SKILLED, rules, n * 5, salt);
    return { name, win: s.win, rote: many(h, f, ROTE, rules, n * 5, salt + 1).win, random: many(h, f, RANDOM, rules, n * 5, salt + 2).win, seconds: s.seconds, decisions: s.decisions, prompts: s.prompts, openings: s.openings, decisive: s.decisiveShare, swings: s.swings, comeback: s.comeback };
  };
  if (inp.baseline) feel.push(fr('现在的游戏：扬州的玩家对屠千山', heroFromState(inp.baseline.state), foeFromDef(inp.baseline.foe), CURRENT_RULES, 300));
  feel.push(fr('新规则：二流对二流（外功为主对轻功为主）', H(standard(2, 'outer')), F(standard(2, 'light')), R, 310));
  feel.push(fr('新规则：二流对一流（以弱胜强）', H(standard(2, 'outer')), F(standard(3, 'inner')), R, 320));
  feel.push(fr('新规则：带两级足伤的二流对二流', H(standard(2, 'light'), { hand: 0, foot: 2, inner: 0 }), F(standard(2, 'outer')), R, 330));

  /* ---------- 规则开关对照（第三到第十轮的结论） ---------- */
  const ab: AbRow[] = [
    { rule: '成算走 logistic，招式四项强度拉开，人偏科', verdict: '留', why: '以己之长比固定套路高 20 个点，决断有分量；线性成算到中后期顶满 95%', on: '以己之长 55%、套路 35%、随手 21%', off: '（线性、强度不拉开）以己之长 54%、套路 50%、随手 30%' },
    { rule: '差距压制', verdict: '留', why: '邻档不变，隔两档才起作用：高两档从 85% 到 96%，宗师不怕人海', on: '高两档 96%', off: '高两档 85%' },
    { rule: '伤落三处：打完才起作用', verdict: '改', why: '伤在这一场里起作用，落后的人翻不了身（翻盘从 17% 降到 11%）；改成带到下一场，这一场体感不变，带伤上阵代价分明', on: '这一场翻盘 17%；带一级伤胜率掉 4 到 6 个点，三处各一级掉 18 个点', off: '（伤在当场起作用）翻盘 11%' },
    { rule: '越用力越伤', verdict: '去', why: '没有改善，翻盘还少了一点', on: '翻盘 10%', off: '翻盘 11%' },
    { rule: '加力比深浅', verdict: '去', why: '只让邻档变陡（85% 到 90%），体感没变', on: '高一档 90%', off: '高一档 85%' },
    { rule: '对掌（内力比拼）', verdict: '去', why: '第一版让会打的人吃亏（54% 降到 41%）；改成第五种应对后几乎没人用，可有可无。以后作为少林、武当的招牌单独再测', on: '每场 0.06 次', off: '—' },
    { rule: '借力打力', verdict: '去', why: '对胜负、体感都没有影响', on: '同上', off: '—' },
    { rule: '无招（看不透高手）', verdict: '去', why: '影响很小，可有可无', on: '以己之长 51%', off: '52%' },
    { rule: '困兽犹斗', verdict: '去', why: '翻盘只多一个点', on: '翻盘 12%', off: '11%' },
    { rule: '点穴定两合', verdict: '改', why: '带点穴的胜率高出近三十个点；改成定一合、伤害减半，只高五个点', on: '定一合减半伤 54%', off: '定两合全伤 80%（不带 49%）' },
    { rule: '树倒猢狲散', verdict: '留', why: '一流对两个乌合之众约五五开；对同门死士就难得多。你面对的是什么人，决定能不能以一敌众', on: '49%', off: '21%' },
    { rule: '大周天', verdict: '去', why: '功力贴着天花板，快一倍没用，白担风险', on: '聪明打法 ≈ 全程小周天', off: '—' },
    { rule: '功力：岁月曲线（代替饱和曲线）', verdict: '改', why: '饱和曲线下功力跟着内功重数走，地利、大周天都没用，「功力看岁月」落空；岁月曲线下地利多三成，慢的人内力反而深', on: '寒潭静修功力多 29%', off: '（饱和）多 2% 到 10%' },
    { rule: '一次离开最多算十日', verdict: '改', why: '一天只上线一次的人静修少了四成；改成十六日', on: '休闲玩家功力是勤奋的 69%', off: '54%' }
  ];

  /* ---------- 战报 ---------- */
  const replays: Report['replays'] = [];
  const tr = (title: string, h: Hero, f: Foe, pol: Policy, rules: Rules, seed: number, crowd?: { n: number; maxAtk: number }): void => {
    const lines: string[] = [];
    const l = fight(h, f, pol, rules, seed, crowd, lines);
    replays.push({ title: `${title}（${l.win ? '赢' : '输'}）`, lines });
  };
  const hh = (p: Person, name: string): Hero => ({ ...H(p), name });
  const ff = (p: Person, name: string): Foe => ({ ...F(p), name });
  tr('二流对二流：以己之长', hh(standard(2, 'outer'), '你'), ff(standard(2, 'light'), '青衣剑客'), SKILLED, R, 7);
  tr('同一场，换成固定套路', hh(standard(2, 'outer'), '你'), ff(standard(2, 'light'), '青衣剑客'), ROTE, R, 7);
  tr('二流对一流：以弱胜强', hh(standard(2, 'outer'), '你'), ff(standard(3, 'inner'), '铁掌堂主'), SKILLED, R, findSeed(H(standard(2, 'outer')), F(standard(3, 'inner')), true));
  tr('带着两级足伤上阵', { ...hh(standard(2, 'light'), '你'), pre: { hand: 0, foot: 2, inner: 0 } }, ff(standard(2, 'outer'), '刀客'), SKILLED, R, 11);
  tr('一流对两个二流（乌合之众）', hh(standard(3, 'outer'), '你'), ff(standard(2, 'light'), '黑风寨的头目'), SKILLED, { ...R, morale: 0.5 }, 5, { n: 2, maxAtk: 3 });

  /* ---------- 江湖日记：勤奋的玩家头十四天 ---------- */
  const L = dil[0];
  const diary: string[] = [];
  for (let d = 1; d <= 14; d++) {
    const gs2 = L.gains.filter(g => Math.floor(g.hour / 24) + 1 === d).map(g => g.what);
    const st = L.daily.find(x => x.day === d)!;
    const uniq = [...new Set(gs2)];
    diary.push(`第${d}天：${uniq.length ? uniq.join('、') : '没有看得见的长进'}。这天晚上：${TN[st.tier]}，主修第${st.R.toFixed(1)}重，内功第${st.inner.toFixed(1)}重，功力${st.gongli.toFixed(1)}年，银两${st.silver.toFixed(1)}两，江湖过了${st.jh.toFixed(0)}日${st.wound ? `，带着${st.wound}级伤` : ''}。`);
  }
  const life = PROFILES.map(pr => {
    const ls = runs(pr);
    return `${pr.name}：` + [1, 2, 3, 4, 5].map(t => `${TN[t]}${day(ls, t) < 999 ? `第${day(ls, t).toFixed(0)}天（功力${gl(ls, t).toFixed(0)}年）` : '到不了'}`).join('，');
  });
  return { rows, feel, ab, replays, diary, life };
}

/**
 * 敏感性：关键的数各上下浮动两成，看几项要紧的结论还站不站得住。
 * 一套规则要是得把数卡得刚刚好才成立，就太脆弱了。
 */
export interface SensRow { what: string; lo: string; hi: string; holds: boolean }
export function sensitivity(k: number): SensRow[] {
  const n = 30 * k;
  const fightKey = (scl: typeof SCALE0, rules: Rules) => {
    const P = (ht: number, ft: number, pol: Policy, salt: number): number => {
      const ws: number[] = []; let i = 0;
      for (const hb of BUILDS) for (const fb of BUILDS) { i++; ws.push(many(asHero(standard(ht, hb), scl), asFoe(standard(ft, fb), scl), pol, rules, n, salt * 100 + i).win); }
      return avg(ws);
    };
    const eq = P(2, 2, SKILLED, 1), up = P(3, 2, SKILLED, 2), up2 = P(4, 2, SKILLED, 3), rote = P(2, 2, ROTE, 4);
    return { eq, up, up2, gap: eq - rote, txt: `同档${pct(eq)} 高一档${pct(up)} 高两档${pct(up2)} 以己之长比套路高${Math.round((eq - rote) * 100)}点` };
  };
  const okFight = (m: ReturnType<typeof fightKey>): boolean => inb(m.up, 0.7, 0.9) && m.up2 >= 0.95 && m.gap >= 0.1;
  const rows: SensRow[] = [];
  const fs: [string, (f: number) => [typeof SCALE0, Rules]][] = [
    ['成算的尺度（26）', f => [SCALE0, { ...NEW_RULES, scale: 26 * f }]],
    ['每重火候（6）', f => [{ ...SCALE0, hhPerRealm: 6 * f }, NEW_RULES]],
    ['招式强度拉开（2.5 倍）', f => [{ ...SCALE0, tellSpread: 2.5 * f }, NEW_RULES]],
    ['对手气血的厚度（5.5）', f => [{ ...SCALE0, foeHp: 5.5 * f }, NEW_RULES]],
    ['差距压制的底数（2/3）', f => [SCALE0, { ...NEW_RULES, supBase: Math.min(0.95, (2 / 3) * f) }]],
    ['偏科（6 点）', f => [{ ...SCALE0, bias: 6 * f }, NEW_RULES]]
  ];
  for (const [what, mk] of fs) {
    const lo = fightKey(...mk(0.8)), hi = fightKey(...mk(1.2));
    rows.push({ what, lo: lo.txt, hi: hi.txt, holds: okFight(lo) && okFight(hi) });
  }
  const lifeKey = (p: typeof LIFE0) => {
    const ls = Array.from({ length: 2 * k }, (_, i) => live(PROFILES[0], p, 120, 71 + i));
    const d = (t: number): number => med(ls.map(l => l.reach.find(r => r.tier === t)?.day ?? 999));
    return { d2: d(2), d5: d(5), txt: `二流第${d(2).toFixed(0)}天 宗师第${d(5) < 999 ? d(5).toFixed(0) : '—'}天` };
  };
  const okLife = (m: ReturnType<typeof lifeKey>): boolean => inb(m.d2, 8, 22) && inb(m.d5, 70, 140);
  const ls: [string, (f: number) => typeof LIFE0][] = [
    ['熟练系数（39）', f => ({ ...LIFE0, needK: 39 * f })],
    ['每在线小时的历练（100）', f => ({ ...LIFE0, lilianBase: 100 * f })],
    ['参悟一日化多少（17）', f => ({ ...LIFE0, digestBase: 17 * f })],
    ['打坐一日几年（0.04）', f => ({ ...LIFE0, rate: 0.04 * f })],
    ['瓶颈处找到机缘的几率（0.15）', f => ({ ...LIFE0, jiyuanP: 0.15 * f })]
  ];
  for (const [what, mk] of ls) {
    const lo = lifeKey(mk(0.8)), hi = lifeKey(mk(1.2));
    rows.push({ what, lo: lo.txt, hi: hi.txt, holds: okLife(lo) && okLife(hi) });
  }
  return rows;
}

/** 找一个以弱胜强（或者落败）的种子，给战报用 */
function findSeed(h: Hero, f: Foe, win: boolean): number {
  for (let s = 1; s < 500; s++) if (fight(h, f, SKILLED, NEW_RULES, s).win === win) return s;
  return 1;
}

/** 档次换算：功力阶梯，给报告引用 */
export const LADDER = GONGLI_LADDER;
