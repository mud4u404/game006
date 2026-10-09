/**
 * 找空缺：看哪里还缺人、缺话。维护者分派任务、协作者「自己找活」都用它：
 *   npm run kongque
 * 平时（npm run check）不跑，只在 KONGQUE=1 时打印报告。
 * 报告两张表：
 *   1. 各地区的人：有多少个有名有姓的人，几个写了 life（会说自己知道的事），哪些还没写；
 *   2. 最冷清的地点：同一地点最多放几个人（上限五个，见「场景不挤」），人最少的排前面。
 */
import { describe, it } from 'vitest';
import { NPCS, ROOMS } from '../src/content';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

describe('找空缺（KONGQUE=1 才打印）', () => {
  it('报告', () => {
    if (env.KONGQUE !== '1') return;
    const roomRegion = new Map(ROOMS.map(r => [r.id, r.region]));
    const people = NPCS.filter(n => !n.obj);
    const where = new Map<string, Set<string>>();
    const put = (room: string, id: string): void => { (where.get(room) ?? where.set(room, new Set()).get(room)!).add(id); };
    for (const r of ROOMS) for (const e of r.npcs) put(r.id, typeof e === 'string' ? e : e.id);
    for (const n of NPCS) for (const a of [n.at ?? []].flat()) put(a.room, n.id);

    const home = (id: string): string => {
      for (const [room, ids] of where) if (ids.has(id)) return roomRegion.get(room) ?? '?';
      return '?';
    };
    const byRegion = new Map<string, { all: string[]; bare: string[] }>();
    for (const n of people) {
      const g = home(n.id);
      const x = byRegion.get(g) ?? byRegion.set(g, { all: [], bare: [] }).get(g)!;
      x.all.push(n.id);
      if (!n.life) x.bare.push(`${n.id}（${n.name}）`);
    }
    const lines: string[] = ['', '== 各地区的人：写了 life 的 / 全部 =='];
    for (const [g, x] of [...byRegion].sort((a, b) => b[1].all.length - a[1].all.length)) {
      lines.push(`${g}：${x.all.length - x.bare.length} / ${x.all.length}；还没写的：${x.bare.slice(0, 40).join('、')}${x.bare.length > 40 ? ` …共 ${x.bare.length} 个` : ''}`);
    }
    lines.push('', '== 最冷清的地点（人数少的在前，只列有名有姓的人）==');
    const cold = ROOMS.map(r => ({ r, n: [...(where.get(r.id) ?? [])].filter(id => people.some(p => p.id === id)).length }))
      .sort((a, b) => a.n - b.n).slice(0, 25);
    for (const { r, n } of cold) lines.push(`${r.region} · ${r.name}（${r.id}）：${n} 人`);
    console.log(lines.join('\n'));
  });
});
