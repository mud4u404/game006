/**
 * 内容 id 只增不删。
 * 玩家的存档里记着地点、人物、物品、任务、武功、路遇、世事的 id；删掉或改名，朋友们的存档就会出问题。
 * id-registry.json 记着已经发出去的 id，这里检查它们都还在。新增的 id 不用管；
 * 维护者每天审查时运行 `npm run ids` 把新 id 记进来。
 */
import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, FACTIONS, FOES, ITEMS, NPCS, QUESTS, ROOMS, SHI, SKILLS, STORIES } from '../src/content';

type Registry = { ids: Record<string, string[]>; stages: Record<string, number> };
const RAW = import.meta.glob<string>('./id-registry.json', { query: '?raw', import: 'default', eager: true })['./id-registry.json'];
// 测试环境是 Node，但项目没装 Node 的类型，这里用最小的写法拿到环境变量和写文件
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const current = (): Record<string, string[]> => ({
  rooms: ROOMS.map(x => x.id),
  npcs: NPCS.map(x => x.id),
  items: ITEMS.map(x => x.id),
  foes: FOES.map(x => x.id),
  quests: QUESTS.map(x => x.id),
  skills: SKILLS.map(x => x.id),
  stories: STORIES.map(x => x.id),
  // 存档里记着遇到过哪些路遇（encLog）
  encounters: ENCOUNTERS.map(x => x.id),
  // 存档里记着每件世事走到哪一步（shi）：事和步都不能改名
  shi: SHI.flatMap(d => [d.id, ...Object.keys(d.steps).map(k => `${d.id}.${k}`)]),
  // 存档里记着各股势力眼下的实力、据点、对你的账（w.fac）
  factions: FACTIONS.map(x => x.id)
});
// 任务的阶段数也只增不减：存档里记着「第几阶段」
const stages = (): Record<string, number> => Object.fromEntries(QUESTS.map(q => [q.id, q.stages.length]));

describe('内容 id 只增不删', () => {
  if (env.UPDATE_IDS) {
    it('更新 id 登记表', async () => {
      const fs: { writeFileSync(p: URL, s: string): void } = await import(/* @vite-ignore */ 'node:' + 'fs');
      const old: Registry = RAW ? JSON.parse(RAW) : { ids: {}, stages: {} };
      const ids = current();
      for (const k of Object.keys(ids)) ids[k] = [...new Set([...(old.ids[k] ?? []), ...ids[k]])].sort();
      const st = { ...old.stages };
      for (const [k, n] of Object.entries(stages())) st[k] = Math.max(st[k] ?? 0, n);
      fs.writeFileSync(new URL('./id-registry.json', import.meta.url), JSON.stringify({ ids, stages: st }, null, 1) + '\n');
    });
    return;
  }
  const reg: Registry = JSON.parse(RAW);
  it('已经发出去的 id 都还在', () => {
    const now = current();
    const missing = Object.entries(reg.ids).flatMap(([k, list]) => list.filter(id => !now[k]?.includes(id)).map(id => `${k}：${id}`));
    expect(missing, '这些 id 被删掉或改了名，会损坏玩家存档。请改回来；确实要废弃，写进 docs/decisions.md 并在 src/core/save.ts 里迁移').toEqual([]);
  });
  it('任务的阶段数没有变少', () => {
    const now = stages();
    const fewer = Object.entries(reg.stages).filter(([id, n]) => now[id] !== undefined && now[id] < n).map(([id, n]) => `${id}：原来 ${n} 个阶段，现在 ${now[id]} 个`);
    expect(fewer).toEqual([]);
  });
});
