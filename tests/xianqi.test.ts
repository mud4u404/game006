/**
 * 差事的限期够不够（Issue #319，docs/xiansuo-duanxian.md 末尾「机器查不到的」第 8 条）。
 *
 * 差事（JobDef）写了 days（几日之内交差），线头（xian）把玩家引到几处。人物有作息、路有长短，
 * 「线头指的路线，在限期里走得完吗」会悄悄变坏：改一个作息、加一道关卡、缩一次限期，没有表提醒。
 * 这里逐件机器算：接差处 → 依次每条线头的去处 → 回交差处，用 pathTo 和每段 hopMin 累加路程，
 * 再加每处「最坏等一个在场时段的开头」的等待，得到全程总钟头；断言不超过 days×24 的一半
 * （留一半给玩家别的事和睡觉）。
 *
 * 口径（写清才算得明白）：
 * - 接差处：接差动作（do 里有 { type: 'job', id }）所在人物的作息地点；找不到接差动作的，从交差人处起算。
 * - 线头去处：xian.at；没写的按人物作息地点（roomsOf，取第一个）。
 * - 人物在场的时段按「接了这件差事」算（线头人物多挂 at: { if: { job } }，不接差事人不在）；
 *   作息里不是时辰的条件（旗标等）按宽松处理：只要时辰成立就算在。
 * - 每一站的最坏等待：从到达该站的时刻起，等这个人物在此处下一次露面（可跨到第二日）；取该站
 *   各个可能到达时刻里最坏的一个。河贼（xs_hezei）夜里有窗口，就是这个算法抓出来的。
 * - 路程按段累加 hopMin（pathTo 的每一段），与实走同款；不乘身法系数（限时按宽的一边算）。
 * - 总钟头 = 路程 + 各站等待。线头之间的先后写在 xian 的顺序里，照顺序走。
 *
 * 紧的登记进 KNOWN_TIGHT（差事 id → 钟数和原因）；登记的条目真的已经宽裕了，测试报错提醒删掉
 * （做法照 tests/xiansuo.test.ts 的 KNOWN_BROKEN）。
 */
import { describe, expect, it } from 'vitest';
import { run } from '../src/engine/dsl';
import { JOBS, NPCS, ROOMS, room } from '../src/content';
import type { JobDef } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { hopMin, pathTo, roomNpcs, roomObjs } from '../src/engine/world';

setNowMs(() => 1_000_000_000_000);
setState(skipToYangzhou());

const roomsOf = (id: string): string[] => ROOMS.filter(r => [...(r.npcs ?? []), ...(r.objs ?? [])].some(x => (typeof x === 'string' ? x : x.id) === id)).map(r => r.id);

/** 某人在某处一天里在场的分钟（每半个钟头试一次）；作息里非时辰的条件按宽松算（这里本来就接着差事查） */
function hoursAt(id: string, at: string): number[] {
  const out: number[] = [];
  for (let m = 0; m < 1440; m += 30) { S.min = m; if (roomNpcs(at).includes(id) || roomObjs(at).includes(id)) out.push(m); }
  return out;
}

/** 接差动作所在的人物（do 里有 { type: 'job', id } 的） */
function takerOf(jobId: string): string | undefined {
  return NPCS.find(n => Object.values(n.actions ?? {}).some(bs => (bs ?? []).some(b => (b.do ?? []).some(e => e.type === 'job' && e.id === jobId))))?.id;
}

/** 站点处的在场时段：人物写了 at 的按它的 room，没写的按作息地点 */
function windowsAt(npcId: string, at: string): number[] {
  return hoursAt(npcId, at);
}

/**
 * 从时刻 now 出发，这个人在这处下一次露面要等多久（分钟，可跨到第二日）；永远不在返回 null。
 * 人物整日在（窗口盖满一天）算零等待。
 */
function waitUntil(npcId: string, at: string, now: number): number | null {
  const w = windowsAt(npcId, at);
  if (!w.length) return null; // 一天里一次也不在：等不来，不算等待（路线问题由别的检查管）
  if (w.length >= 48) return 0; // 每半个钟头都在：整日在，不用等
  let best = Infinity;
  for (let d = 0; d <= 1; d++) for (const t of w) { const dt = t + d * 1440 - now; if (dt >= 0) best = Math.min(best, dt); }
  return best === Infinity ? null : best;
}

/** 一段路的分钟数（pathTo 逐段累加 hopMin）；走不到返回 null */
function roadMin(from: string, to: string): number | null {
  if (from === to) return 0;
  const p = pathTo(from, to);
  if (!p.length) return null;
  let cur = from, sum = 0;
  for (const nx of p) { sum += hopMin(cur, nx); cur = nx; }
  return sum;
}

interface Result {
  job: JobDef;
  /** 接差处、各线头去处、交差处的 id 列表（走到哪算哪；空段合并） */
  stops: string[];
  /** 路程总分钟 */
  road: number;
  /** 各站最坏等待的分钟（与停留顺序对应；-1 = 没算） */
  waits: number[];
  /** 全程总分钟（路程 + 等待） */
  total: number;
  /** 限期的钟数 */
  limit: number;
  ok: boolean;
  /** 走不到的地方（id） */
  unreachable: string[];
  /** 一天里一次也不在的站（id@人物） */
  neverThere: string[];
}

/**
 * 搭一个「走到这条线头」的存档：接上差事；线头 x 之前的各步旗标也拨上（xian.at 的人物
 * 多挂 if: { hour, flag: 上一线头的线索 }，旗标不拨人不在；时辰不拨，在场时段逐时刻探）。
 * 只拨旗标，不拨根基、银两这类门槛（宽松算法只看时辰）。
 */
function stageFor(j: JobDef, upto: number): void {
  run([{ type: 'job', id: j.id }]);
  const x = upto >= 0 ? (j.xian ?? [])[upto] : undefined;
  if (!x) return;
  const flags = (c: unknown): string[] => {
    if (!c || typeof c !== 'object') return [];
    const o = c as Record<string, unknown>;
    const out: string[] = [];
    if (typeof o.flag === 'string') out.push(o.flag);
    if (Array.isArray(o.any)) for (const a of o.any) out.push(...flags(a));
    return out;
  };
  // 这条线头自己 if 里的旗标，和它前面各线头 text 指向的进度（前一线头的线索旗标）都拨上
  for (const f of flags(x.if)) S.flags[f] = true;
  if (typeof x.if === 'object' && x.if) {
    const o = x.if as Record<string, unknown>;
    if (typeof o.notFlag === 'string') delete S.flags[o.notFlag];
  }
}

/** 算一件差事：接差处起，依次线头，回交差处；每一站算最坏等待。逐条线头重搭存档（旗标进度一条条拨上去） */
function calc(j: JobDef): Result {
  try {
    const taker = takerOf(j.id);
    const start = taker ? roomsOf(taker)[0] : j.at;
    const stops: string[] = [start];
    const waits: number[] = [];
    const unreachable: string[] = [];
    const neverThere: string[] = [];
    let road = 0;
    let clock = 0; // 此刻（分钟，可超过 1440 表示跨日）
    const visit = (npcId: string, at: string, from: string): void => {
      const leg = roadMin(from, at);
      if (leg === null) { unreachable.push(at); return; }
      road += leg;
      clock += leg;
      const w = waitUntil(npcId, at, clock % 1440);
      if (w === null) { neverThere.push(`${npcId}@${at}`); waits.push(-1); return; }
      waits.push(w);
      clock += w;
      stops.push(at);
    };
    (j.xian ?? []).forEach((x, i) => {
      setState(skipToYangzhou());
      stageFor(j, i);
      const at = x.at ?? roomsOf(x.npc)[0];
      if (!at) { neverThere.push(`${x.npc}@无处`); return; }
      visit(x.npc, at, stops[stops.length - 1]);
    });
    setState(skipToYangzhou());
    stageFor(j, -1); // 交差处也先接上差事：交差人（老蔡、朝奉）也是接了差事才在的
    visit(j.npc, j.at, stops[stops.length - 1]);
    setState(skipToYangzhou());
    const total = road + waits.filter(w => w > 0).reduce((a, b) => a + b, 0);
    const limit = j.days * 24 * 60;
    return { job: j, stops, road, waits, total, limit, ok: !unreachable.length && !neverThere.length && total <= limit / 2, unreachable, neverThere };
  } finally { setState(skipToYangzhou()); }
}

/** 走线时够不到一半限期的差事，登记在这里：id → 「钟数；原因」。修好了（总钟数降到一半以内）会提示删掉 */
const KNOWN_TIGHT: Record<string, string> = {
  // 往返苏州枫桥码头（单程六个多钟），舅舅只在夜里饮酒（要等他收工后的窗口），
  // 小栓只在上午扌货，三段串下来等拢一间半日，过了三日限期的一半。路程是线头写定的，紧在路远，不是错。
  xsb_xunren: '约三十六钟；往返苏州路远（单程六个多钟），舅舅只在深夜饮酒、小栓只在上午在货栈，最坏要等拢一天半，过了三日限期的一半。路程是线头写定的，紧在路远，不是错。'
};

const JOBS_WITH_XIAN = JOBS.filter(j => j.xian?.length);
const RESULTS = JOBS_WITH_XIAN.map(calc);

describe('差事的限期够不够（#319）', () => {
  it('有线头的差事都查到了', () => {
    expect(JOBS_WITH_XIAN.length).toBeGreaterThan(5);
    expect(RESULTS.every(r => r.stops.length >= 2), '每件都算出了接差、线头、交差的路线').toBe(true);
  });

  it('路线上的地方都走得到，人物都有处可寻', () => {
    const bad = RESULTS.filter(r => r.unreachable.length || r.neverThere.length);
    expect(bad.map(r => `${r.job.id}：走不到 ${r.unreachable.join('、')}；无踪 ${r.neverThere.join('、')}`)).toEqual([]);
  });

  for (const r of RESULTS) {
    const j = r.job;
    const label = `${j.id}「${j.title}」：全程 ${(r.total / 60).toFixed(1)} 钟，限期 ${j.days} 日（${j.days * 12} 钟的宽限线）` +
      `｜线头${j.xian!.length}个，路程 ${(r.road / 60).toFixed(1)} 钟，等待 ${r.waits.filter(w => w > 0).reduce((a, b) => a + b, 0) / 60 || 0} 钟` +
      `｜路线 ${r.stops.map(s => room(s)?.name ?? s).join('→')}`;
    if (r.ok) {
      it(label, () => {
        expect(r.total, `${j.id} 的全程要留出一半限期`).toBeLessThanOrEqual(r.limit / 2);
        expect(KNOWN_TIGHT[j.id], `${j.id} 已经宽裕了：把 KNOWN_TIGHT 里那一行删掉（${KNOWN_TIGHT[j.id] ?? ''}）`).toBeUndefined();
      });
    } else {
      it.fails(`${label}｜紧：${KNOWN_TIGHT[j.id] ?? '未登记，请补进 KNOWN_TIGHT'}`, () => {
        expect(r.total, `${j.id} 的全程超了限期的一半，又不该硬塞：写进 KNOWN_TIGHT 并写明原因`).toBeLessThanOrEqual(r.limit / 2);
      });
    }
  }

  it('KNOWN_TIGHT 里没有过期的键（差事删了或已经宽裕的，从清单里删）', () => {
    const have = new Set(RESULTS.filter(r => !r.ok).map(r => r.job.id));
    expect(Object.keys(KNOWN_TIGHT).filter(k => !have.has(k))).toEqual([]);
  });
});
