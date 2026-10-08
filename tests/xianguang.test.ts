/**
 * 一次上线玩什么：闲逛的密度（docs/huojianghu.md 第三节第五条）。
 * 机器玩家不追任何任务，在扬州随便走、随便打听、随便歇脚，走三天。开局那一刻扬州各处的样子先记下（谁在哪儿、地方什么样），
 * 跟它一样的不算新鲜。从第二天起数它碰上几件「新鲜事」：
 * - 知道了一件世事，或者一件事往前走了一步；
 * - 在一个地方碰上前头没在这里见过的人（作息：夜里才出来的、事情起了才来的）；
 * - 一段前头没见过的地点描写（天色、事情走到哪一步，地方的样子就不同）；
 * - 撞上一次路遇。
 * 头一天碰上的也不算。数出来的每十步几件写进下面的门槛，内容稀了，CI 先变红。
 */
import { describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { absMin, advanceMin, setNowMs } from '../src/core/time';
import { REGIONS, ROOMS, npc, room } from '../src/content';
import { act, enter, roomDesc, roomNpcs, travelMin, hopMin, verbsOf } from '../src/engine/world';
import { markEncounter, rollEncounter } from '../src/engine/encounter';
import { tickShi } from '../src/engine/shishi';
import { checkYue, XIEJIAO, waitMin } from '../src/engine/shiguang';
import { mulberry32 } from '../src/engine/rng';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
/**
 * 第二天起，每走十步至少碰上几件新鲜事。
 * 10-08 量的：做活的江湖以前 0.38 件（大半是路遇），做了世事、作息、打听、歇脚以后 1.27 件。门槛留一些余地。
 */
const MIN_PER_10 = 1.0;
/** 量哪个地区：默认扬州（门槛只管扬州）；协作者写新地方时 XIANGUANG_REGION=sz npm run xianguang 量自己的 */
const REGION = env.XIANGUANG_REGION ?? 'yz';
const DAYS = 3, SEEDS = 12;

interface Tally { steps: number; fresh: number; kinds: Record<string, number> }

function wander(seed: number): Tally {
  const rng = mulberry32(seed);
  const pickOne = <T>(a: T[]): T => a[Math.floor(rng() * a.length)];
  setState(skipToYangzhou());
  // 开篇走完以后的江湖：屠千山已经倒了
  S.flags.boss = true;
  S.quests.main1 = 3;
  S.track = '';
  S.silver = 2000;
  if (room(S.loc).region !== REGION) S.loc = ROOMS.find(r => r.region === REGION)!.id;
  const t0 = absMin(S);
  const seenNpc = new Set<string>(), seenDesc = new Set<string>(), seenShi = new Set<string>();
  const t: Tally = { steps: 0, fresh: 0, kinds: {} };
  const count = (k: string): void => {
    if (absMin(S) - t0 < 1440) return;
    t.fresh++;
    t.kinds[k] = (t.kinds[k] ?? 0) + 1;
  };
  const look = (): void => {
    for (const id of roomNpcs(S.loc)) if (!seenNpc.has(`${S.loc}|${id}`)) { seenNpc.add(`${S.loc}|${id}`); count('新的人'); }
    const d = roomDesc(S.loc);
    if (!seenDesc.has(d)) { seenDesc.add(d); count('地方变了样'); }
    for (const [id, st] of Object.entries(S.shi ?? {})) if (st.seen && !seenShi.has(`${id}.${st.seen}`)) { seenShi.add(`${id}.${st.seen}`); count('世事'); }
  };
  tickShi();
  // 开局那一刻扬州各处的样子：谁在哪儿、地方什么样。跟它一样的不算新鲜（那是「地方大」，不是「江湖活」）
  for (const r of ROOMS.filter(x => x.region === REGION)) {
    for (const id of roomNpcs(r.id)) seenNpc.add(`${r.id}|${id}`);
    seenDesc.add(roomDesc(r.id));
  }
  look();
  while (absMin(S) - t0 < DAYS * 1440) {
    const r = rng();
    const here = roomNpcs(S.loc).filter(id => !npc(id)?.obj);
    if (r < 0.45) {
      const exits = room(S.loc).exits.filter(([, to]) => room(to).region === REGION);
      const to = pickOne(exits)[1];
      const from = S.loc;
      advanceMin(S, travelMin(hopMin(from, to)));
      S.loc = to;
      const enc = rollEncounter(from, to, rng);
      if (enc) { markEncounter(enc); count('路遇'); }
      enter(to);
    } else if (r < 0.65 && here.length) {
      act(pickOne(here), '打听');
    } else if (r < 0.85 && here.length) {
      const id = pickOne(here);
      const vs = verbsOf(npc(id)!).filter(v => v === '交谈' || v === '观察');
      if (vs.length) act(id, pickOne(vs));
    } else if (r < 0.93) {
      advanceMin(S, waitMin(S, pickOne(XIEJIAO)[0]));
    } else advanceMin(S, 60);
    checkYue(S);
    tickShi();
    look();
    if (absMin(S) - t0 >= 1440) t.steps++;
  }
  return t;
}

describe('闲逛的密度', () => {
  setNowMs(() => 1_000_000_000_000);
  const all = Array.from({ length: SEEDS }, (_, i) => wander(i + 1));
  const steps = all.reduce((a, x) => a + x.steps, 0), fresh = all.reduce((a, x) => a + x.fresh, 0);
  const kinds: Record<string, number> = {};
  for (const x of all) for (const [k, n] of Object.entries(x.kinds)) kinds[k] = (kinds[k] ?? 0) + n;
  const per10 = (fresh / steps) * 10;
  const line = `闲逛${REGIONS[REGION]?.name ?? REGION} ${SEEDS} 局，第二、三天共 ${steps} 步，碰上新鲜事 ${fresh} 件，每十步 ${per10.toFixed(2)} 件（${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join('，')}）`;
  if (env.XIANGUANG !== undefined || env.ZOUBIAN) console.log(line);

  it(`第二天起，每走十步至少碰上 ${MIN_PER_10} 件新鲜事`, () => {
    if (REGION === 'yz') expect(per10, line).toBeGreaterThanOrEqual(MIN_PER_10);
  });
});
