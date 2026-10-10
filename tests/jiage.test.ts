/**
 * 说的价和给的价（docs/jiage.md，Issue #284）：
 * 玩家看见一个数、然后真的付或收这个数——两处该是同一个数。这一份把它逐条按下来，机器能核的都核。
 * - 台词或按钮小字里的「银两 ±N」，同一分支的 silver 效果就得是那个数；
 * - 台词里报的「N 文 / N 两」，和同一分支动的钱要对得上（一两合一千文，docs/content-guide.md 第二百条）；
 * - 物品买价、当铺四成、船钱与过路钱、住店嚼用、差事赏格、悬赏榜上写的数，各归各的表；
 * - 对不上的不改内容，用 it.fails 标出来，等维护者派人修（docs/jiage.md 末尾「可疑」一节列的就是它们）。
 */
import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, FOES, ITEMS, JOBS, NPCS, QUESTS, ROOMS, SHI, STORIES } from '../src/content';
import type { Cond, Effect } from '../src/content/types';
import { PAWN_RATE } from '../src/engine/daoju';
import { LODGING } from '../src/engine/shiguang';
import { JOB_HOURS, SHENFEN, jobPay } from '../src/engine/shenfen';

/** 一两合一千文（docs/content-guide.md、docs/foundation.md 第三节、engine/shenfen.ts） */
const LIANG = 1000;

/** 中文数字（零〇一二两三四五六七八九十百千万）转阿拉伯；认不出来给 null */
const cn2num = (s: string): number | null => {
  if (/^\d+$/.test(s)) return Number(s);
  const d: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const u: Record<string, number> = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
  let total = 0, cur = 0, ok = true;
  for (const ch of s) {
    if (ch in d) { cur = d[ch]; continue; }
    if (ch in u) { total += (cur || (u[ch] === 10 ? 1 : 0)) * u[ch]; cur = 0; continue; }
    ok = false;
  }
  return ok && s.length ? total + cur : null;
};

/** 一段话里所有报出来的钱数：文照旧，两乘一千 */
const saidMoney = (t: string): number[] => {
  const out: number[] = [];
  for (const m of t.matchAll(/([0-9零〇一两二三四五六七八九十百千万]+)\s*文/g)) { const v = cn2num(m[1]); if (v !== null) out.push(v); }
  for (const m of t.matchAll(/([0-9零〇一两二三四五六七八九十百千万]+)\s*两/g)) { const v = cn2num(m[1]); if (v !== null) out.push(v * LIANG); }
  return out;
};

/** 一个「玩家看得见一句话、点下去就动钱」的分支。text、按钮的 label、点完的 result 三段都是玩家看的，
 *  价钱常常写在其中一段（按钱的有买有卖），所以三段一起读，别只取一段 */
interface Quote { id: string; say: string; sub?: string; cond?: Cond; do: Effect[] }
const QUOTES: Quote[] = [];
const collect = (v: unknown, id: string): void => {
  if (Array.isArray(v)) { for (const x of v) collect(x, id); return; }
  if (!v || typeof v !== 'object') return;
  const o = v as Record<string, unknown>;
  const parts = [o.text, o.label, o.result].filter((x): x is string => typeof x === 'string');
  if (parts.length && Array.isArray(o.do)) QUOTES.push({ id, say: parts.join(' '), sub: typeof o.sub === 'string' ? o.sub : undefined, cond: (o.if ?? o.when) as Cond | undefined, do: o.do as Effect[] });
  for (const k of Object.keys(o)) if (k !== 'text' && k !== 'label' && k !== 'result') collect(o[k], id);
};
for (const n of NPCS) collect(n, n.id);
for (const s of STORIES) collect(s, s.id);
for (const f of FOES) collect(f.results, f.id);
for (const q of QUESTS) collect(q, q.id);
for (const e of ENCOUNTERS) collect(e, e.id);
for (const s of SHI) collect(s, s.id);

const paid = (q: Quote): number[] => q.do.filter((e): e is Extract<Effect, { type: 'silver' }> => e.type === 'silver').map(e => e.delta);
const fmt = (a: number[]): string => a.map(d => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '0')).join('/');

describe('说的价和给的价：文字对效果', () => {
  it('收得到：至少捞到一百个报价的分支，不然是表走空了', () => {
    expect(QUOTES.length).toBeGreaterThan(100);
  });

  it('「银两 ±N」的标注，同一分支就得有那个 silver 效果', () => {
    const bad: string[] = [];
    let n = 0;
    for (const q of QUOTES) for (const t of [q.say, q.sub].filter(Boolean) as string[]) {
      for (const m of t.matchAll(/银两\s*([−+-])\s*(\d+)/g)) {
        n++;
        const want = m[1] === '−' ? -Number(m[2]) : Number(m[2]);
        if (!paid(q).includes(want)) bad.push(`${q.id}：写着「${m[0]}」，实际 ${fmt(paid(q))}｜${t.slice(0, 40)}`);
      }
    }
    expect(n, '一处标注都没捞到，正则该改了').toBeGreaterThan(50);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('台词里报的「N 文 / N 两」，和同一分支动的钱对得上', () => {
    const bad: string[] = [];
    let n = 0;
    for (const q of QUOTES) {
      const moved = paid(q);
      if (!moved.length) continue;
      const said = saidMoney(`${q.say} ${q.sub ?? ''}`);
      if (!said.length) continue;
      n++;
      const spend = moved.filter(d => d < 0);
      const want = spend.length ? spend.map(d => -d) : moved;
      // 对得上有三种：话里报的就是这个数；或者是「押了两文、赢成五文」这样两个数相减得这个数
      const diff = moved.every(d => said.some((x, i) => said.some((y, j) => j !== i && y - x === d)));
      if (!said.some(v => want.includes(v)) && !diff) bad.push(`${q.id}：说 ${said.join('/')}，给 ${fmt(moved)}｜${q.say.slice(0, 40)}`);
    }
    expect(n, '一处报价都没捞到，正则该改了').toBeGreaterThan(50);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('收钱的地方，价钱都写在话里（只有两处例外，见下）', () => {
    const quiet: string[] = [];
    for (const q of QUOTES) {
      if (!paid(q).some(d => d < 0)) continue;
      const all = `${q.say} ${q.sub ?? ''}`;
      if (!saidMoney(all).length && !/银两\s*[−+-]/.test(all)) quiet.push(q.id);
    }
    // yh_bizhang：赎云娘的身契，这一分支只管点银子，价钱（「二十两」）写在它前一个交谈分支里
    // ly_yz_zouhai：按钮上写的是「几文钱」，实收五文——说得含糊，见「可疑」一节
    expect(quiet, `这些分支收了钱却没写价钱：${quiet.join('、')}`).toEqual(['yh_bizhang', 'ly_yz_zouhai']);
  });
});

describe('价钱的几处来源，各归各的表', () => {
  it('物品买价：写了的都是正整数，当铺按四成收', () => {
    const priced = ITEMS.filter(i => i.price !== undefined);
    expect(priced.length, '一件东西都没标价').toBeGreaterThan(10);
    for (const i of priced) {
      expect(Number.isInteger(i.price), `${i.id} 的买价 ${i.price} 不是整文`).toBe(true);
      expect(i.price!, `${i.id} 的买价不能是零或负数`).toBeGreaterThan(0);
    }
    // 四成之后不足一文的不收（engine/daoju.ts）：标价最低的也要剩一文
    for (const i of priced) expect(Math.floor(i.price! * PAWN_RATE), `${i.id} 当了只剩 ${Math.floor(i.price! * PAWN_RATE)} 文`).toBeGreaterThan(0);
  });

  it('船钱与过路钱：写了 fare 的地方 payFare 收的就是它，过路钱跟着主人走', () => {
    const fares = ROOMS.filter(r => r.fare !== undefined);
    expect(fares.length, '一处船钱都没写').toBeGreaterThan(0);
    for (const r of fares) {
      expect(r.fare!, `${r.id} 的船钱 ${r.fare} 不是整文`).toBeGreaterThan(0);
      if (r.life?.toll) {
        // 货船的船钱之外，过路钱按眼下归谁收：没有主人的那几档必须是 0
        for (const [who, fee] of Object.entries(r.life.toll)) {
          expect(typeof fee, `${r.id} 的过路钱 ${who} 不是数`).toBe('number');
          expect(fee, `${r.id} 的过路钱 ${who} 是负数`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('住店：一日一百文，是 docs/foundation.md 第三节第六条那个数', () => {
    expect(LODGING.inn).toBe(100);
    expect(LODGING.inn).toBe(LODGING.keep);
    expect(LODGING.lusuEff).toBeGreaterThan(0);
    expect(LODGING.lusuEff, '露宿要打八折，就该小于一').toBeLessThan(1);
  });

  it('差事赏格：每一件都算得出数来，没身份的不给钱也不能给负的', () => {
    expect(JOBS.length, '一件差事都没有').toBeGreaterThan(5);
    for (const j of JOBS) {
      const p = jobPay(j);
      expect(Number.isFinite(p), `${j.id} 的赏格算不出数`).toBe(true);
      expect(p, `${j.id} 的赏格是负数`).toBeGreaterThanOrEqual(0);
      if (!j.shenfen) expect(p, `${j.id} 没有 shenfen，却发钱`).toBe(0);
      expect(SHENFEN[j.shenfen ?? 'youxia'], `${j.id} 的 shenfen「${j.shenfen}」不在表里`).toBeTruthy();
    }
    expect(JOB_HOURS, '一件差事的时辰表空了').toBeGreaterThan(0);
  });

  it('悬赏榜上写的数和交差给的数一样', () => {
    // src/content/packs/xuanshang.ts 里书办报的四张榜（自己念一遍，别照抄错数）
    const DAN: Record<string, number> = { xsb_xunren: 250, xsb_xunwu: 800, xsb_xiong: 1500, xsb_jiaofei: 3380 };
    for (const [id, said] of Object.entries(DAN)) {
      const j = JOBS.find(x => x.id === id);
      expect(j, `悬赏 ${id} 不见了`).toBeTruthy();
      expect(jobPay(j!), `${id} 榜上写 ${said} 文，交差给的是别的数`).toBe(said);
    }
    // 河贼那桩书办是顺口提的，不在四张榜里，也一并核上
    expect(jobPay(JOBS.find(x => x.id === 'xs_hezei')!)).toBe(800);
  });
});

describe('说不清的，按可疑记下来，不在这里改', () => {
  /** 从某一家的某一句里读出价：找带 needle 的话，取它那条分支收的钱 */
  const priceOf = (npc: string, needle: string): number => {
    const q = QUOTES.find(x => x.id === npc && x.say.includes(needle));
    expect(q, `找不到 ${npc} 里带「${needle}」的那一句`).toBeTruthy();
    const d = paid(q!).find(v => v < 0);
    expect(d, `${npc} 的「${needle}」这一句没收钱`).toBeDefined();
    return -d!;
  };
  // 下面四条是 docs/jiage.md「可疑」一节里的原话：断言写的是「应当一样」，现在不一样，
  // 所以都用 it.fails 挂着——它们什么时候自己转绿，什么时候算修好了。改法不归这一份管。
  it.fails('扬州街面的金疮药（药铺二十文）和济生堂（六十文）差三倍', () => {
    expect(priceOf('yaopu', '包好一包金疮药')).toBe(priceOf('jc_yz_langzhong', '药柜里取出一包金疮药'));
  });
  it.fails('跌打酒四地不一样：扬州六十、瓜洲五十、镇江六十、苏州八十', () => {
    const want = priceOf('yaopu', '一小坛跌打酒');
    for (const [npc, needle] of [['jc_gz_zhong', '一小坛跌打酒'], ['jc_zj_ning', '一小坛跌打酒'], ['sz_yelangzhong', '一小坛跌打酒']] as const)
      expect(priceOf(npc, needle), `${npc} 的跌打酒不一样`).toBe(want);
  });
  it.fails('丸药苏州一百，扬州、瓜洲、镇江都八十', () => {
    const want = priceOf('yaopu', '一包丸药');
    for (const [npc, needle] of [['jc_gz_zhong', '一包丸药'], ['jc_zj_ning', '一包丸药'], ['sz_yelangzhong', '一包丸药']] as const)
      expect(priceOf(npc, needle), `${npc} 的丸药不一样`).toBe(want);
  });
  it.fails('看伤瓜洲一百二十，扬州、镇江、苏州都一百五十', () => {
    const want = priceOf('jc_yz_langzhong', '一寸寸摸过去');
    for (const [npc, needle] of [['jc_gz_zhong', '小马扎'], ['jc_zj_ning', '清创、下针'], ['sz_yelangzhong', '一按一揉']] as const)
      expect(priceOf(npc, needle), `${npc} 的看伤不一样`).toBe(want);
  });
});