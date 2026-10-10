/**
 * 交通预告与实付一致（Issue #271，docs/renwu-100.md 第 016 项、docs/sheji-001-003.md 第 003 项）。
 *
 * 地图点地名先给玩家看的是 tripCost（engine/world.ts，里头用 pathMin、travelMin、tollOf）：
 * 路上约几分钟、经过几处、船钱和过路钱共几文；钱不够时提示要替船家、码头干活抵。
 * 真走一趟照 ui/explore.ts 的 travelTo：每步加 travelMin(hopMin) 的时辰、落位、payFare 付船钱；
 * 钱不够的，payFare 里替船家撑篙抵账，多耗一个时辰，不扣钱。
 * 码头的主人用世界效果改（engine/shijie.ts 的 runWorld，op: 'owner'），过路钱跟着主人走。
 *
 * 现状（Issue #271 核实）：**银钱**预告与实付在全部可达路线上一致；**耗时**对不上——
 * tripCost 把总分钟乘身法系数后取整一次，实走是每段各自取整再相加，多段路实走比预告
 * 多出一两分钟。按 Issue 规矩不改游戏代码：对不上的路线标 it.fails，明细在 PR 正文；
 * 哪天引擎改成一致了，it.fails 会变红，把它换回 it 即可。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ROOMS } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, setNowMs } from '../src/core/time';
import { tollOf, runWorld } from '../src/engine/shijie';
import { hopMin, pathTo, payFare, travelMin, tripCost } from '../src/engine/world';

/** docs/sheji-004-007.md 第 004 节「首版十二地」表里的十二个地点 id */
const TWELVE = [
  'gz_home', 'gz_pier', 'gz_town',   // 渡口小屋、瓜洲码头、瓜洲镇
  'dukou', 'cheng',                  // 运河渡口、东关街
  'yz_yanhao', 'yz_fuya', 'biaoju',  // 汪家盐号、府衙、威远镖局
  'jc_yz_yiguan', 'jc_yz_kezhan',    // 济生堂、广陵客栈
  'bs2_longwang', 'daming'           // 龙王庙、大明寺
];

/**
 * 照 ui/explore.ts 的 travelTo 一段一段走：每步加时辰、落位、payFare 付船钱（不进门、不遇事）。
 * 返回实际耗时（分钟，含撑篙抵账多耗的）、实付船钱和过路钱（文）、撑篙抵账的回数。
 */
function walk(from: string, to: string): { mins: number; paid: number; poled: number } {
  let mins = 0, paid = 0, poled = 0;
  for (const nx of pathTo(from, to)) {
    const m = travelMin(hopMin(S.loc, nx));
    mins += m;
    S.min += m;
    if (S.min >= 1440) { S.min -= 1440; advanceDays(S, 1); }
    S.loc = nx;
    const msg = payFare(nx);
    if (!msg) continue;
    if (msg.includes('多耗了一个时辰')) { mins += 60; poled++; }
    else paid += tollOf(nx)?.fee ?? 0;
  }
  return { mins, paid, poled };
}

/** 模块加载时先探一遍全部路线：每对路线的预告（分钟、钱）与实走（分钟、钱）。探测只是采样，每个测试都会重置状态 */
setNowMs(() => 1_000_000_000_000);
setState(skipToYangzhou());
S.lastEnc = Infinity;
const PAIRS: { a: string; b: string; pred: number; fee: number; walkM: number }[] = [];
for (const a of TWELVE) {
  for (const b of TWELVE) {
    if (a === b) continue;
    S.loc = a; S.silver = 1_000_000;
    const c = tripCost(b);
    if (!c) continue; // 能到的才算（地图连通由 ditu 测试管）
    const r = walk(a, b);
    PAIRS.push({ a, b, pred: c.min, fee: c.fee, walkM: r.mins });
  }
}
const MISMATCHED = PAIRS.filter(p => p.pred !== p.walkM);

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.lastEnc = Infinity; // 不滚路遇：这里只量赶路本身
});

describe('十二地的 id 都在地图上', () => {
  for (const id of TWELVE) {
    it(id, () => {
      expect(ROOMS.some(r => r.id === id), `${id} 不在 ROOMS 里`).toBe(true);
    });
  }
});

describe('十二地两两之间：预告与实付一致（钱带得够）', () => {
  for (const p of PAIRS) {
    const mismatch = p.pred !== p.walkM;
    const label = `${p.a} → ${p.b}` + (mismatch ? `（预告 ${p.pred} 分钟，实走 ${p.walkM} 分钟）` : '');
    const t = mismatch ? it.fails : it;
    t(label, () => {
      S.loc = p.a;
      S.silver = 1_000_000;
      const c = tripCost(p.b)!;
      expect(c.min, '预告的分钟数要稳定').toBe(p.pred);
      const silver0 = S.silver;
      const r = walk(p.a, p.b);
      expect(r.paid, `实付 ${r.paid} 文，预告 ${c.fee} 文`).toBe(c.fee);
      expect(silver0 - S.silver, '钱包里扣掉的数').toBe(c.fee);
      expect(r.poled, '钱带够了不该撑篙抵账').toBe(0);
      // 预告对总程一次取整，实走每段取整，多段路实走多出一两分钟。对不上的，就让它在这儿抛：
      // it.fails 把它标成预期失败，哪天引擎改成一致了，这里不再抛，it.fails 反而会红，提醒换回 it
      expect(r.mins, `实际耗时 ${r.mins} 分钟，预告 ${c.min} 分钟`).toBe(c.min);
    });
  }
  it('耗时对不上的都是实走多于预告（每段取整只会向上漂）', () => {
    expect(MISMATCHED.length, '对不上的路线数').toBeGreaterThan(0);
    for (const p of MISMATCHED) expect(p.walkM, `${p.a} → ${p.b}`).toBeGreaterThan(p.pred);
  });
});

describe('码头换了主人，船钱的预告与实付跟着变', () => {
  it('默认东舵守码头：上运河客船只付船钱二十文', () => {
    S.loc = 'hu';
    S.silver = 1_000_000;
    expect(tollOf('gz_kechuan')?.base).toBe(20);
    expect(tollOf('gz_kechuan')?.extra ?? 0).toBe(0);
    const c = tripCost('gz_kechuan')!;
    const r = walk('hu', 'gz_kechuan');
    expect(r.paid, `实付 ${r.paid} 文，预告 ${c.fee} 文`).toBe(c.fee);
    expect(r.mins, `实际耗时 ${r.mins} 分钟，预告 ${c.min} 分钟`).toBe(c.min);
  });

  it('西舵占了码头：多交二十文过路钱，预告与实付都是四十文', () => {
    S.loc = 'hu';
    S.silver = 1_000_000;
    runWorld({ type: 'w', op: 'owner', place: 'dukou', to: 'xi' });
    expect(tollOf('gz_kechuan')?.extra, '西舵的过路钱').toBe(20);
    expect(tollOf('gz_kechuan')?.owner).toBe('xi');
    const c = tripCost('gz_kechuan')!;
    expect(c.fee, '预告的船钱加过路钱').toBe(40);
    const r = walk('hu', 'gz_kechuan');
    expect(r.paid, `实付 ${r.paid} 文，预告 ${c.fee} 文`).toBe(c.fee);
    expect(r.mins, `实际耗时 ${r.mins} 分钟，预告 ${c.min} 分钟`).toBe(c.min);
  });

  it('码头没人占：不收过路钱，回到二十文', () => {
    S.loc = 'hu';
    S.silver = 1_000_000;
    runWorld({ type: 'w', op: 'owner', place: 'dukou', to: 'xi' });
    runWorld({ type: 'w', op: 'owner', place: 'dukou', to: null });
    expect(tollOf('gz_kechuan')?.extra ?? 0).toBe(0);
    const c = tripCost('gz_kechuan')!;
    expect(c.fee).toBe(20);
    const r = walk('hu', 'gz_kechuan');
    expect(r.paid).toBe(c.fee);
    expect(r.mins).toBe(c.min);
  });
});

describe('钱不够船钱：预告写明，实走照预告的规则', () => {
  it('差一文：撑篙抵船钱，多耗一个时辰，不扣钱', () => {
    S.loc = 'hu';
    const c = tripCost('gz_kechuan')!;
    S.silver = c.fee - 1;
    // 界面就按这条出「钱不够」的提示（ui/explore.ts 的 travelAsk：c.fee > S.silver）
    expect(c.fee > S.silver, '预告要点明钱不够').toBe(true);
    const r = walk('hu', 'gz_kechuan');
    expect(r.paid, '一文都不该扣').toBe(0);
    expect(r.poled, '撑篙抵账的回数').toBe(1);
    expect(r.mins, `实际耗时 ${r.mins} 分钟，预告 ${c.min} 分钟加一个时辰`).toBe(c.min + 60);
    expect(S.silver, '分文未动').toBe(c.fee - 1);
  });
});
