import { describe, expect, it } from 'vitest';
import { partitionQuests } from '../src/ui/views/questbook';
import { QUESTS } from '../src/content';

/** partitionQuests 把玩家存档里的 quests 分成「进行中 / 已完成」两组。
 *  - 玩家只有 QUESTS 里存在定义的任务才算数（未知 id 跳过）。
 *  - 最后一阶段没有 to 字段，算已完成；否则算进行中。
 *  - track 若在玩家 quests 里，会在返回值里保留，否则置为空字符串。
 */

describe('partitionQuests', () => {
  it('没有任何任务记录时，返回两个空数组', () => {
    const r = partitionQuests({}, '');
    expect(r.active).toEqual([]);
    expect(r.done).toEqual([]);
    expect(r.trackId).toBe('');
  });

  it('跳过 QUESTS 里不存在的任务 id', () => {
    const r = partitionQuests({ fake_task: 2, prologue: 0 }, 'fake_task');
    expect(r.active.map(q => q.id)).toEqual(['prologue']);
    expect(r.trackId).toBe(''); // fake_task 不存在
  });

  it('主线 main1 推进到最后一阶段（无 to）算作已完成', () => {
    const main1 = QUESTS.find(q => q.id === 'main1')!;
    const lastIdx = main1.stages.length - 1;
    expect(main1.stages[lastIdx].to).toBeUndefined(); // 确认设计：最后一阶段没 to
    const r = partitionQuests({ prologue: 3, main1: lastIdx }, 'main1');
    expect(r.done.map(q => q.id)).toContain('main1');
    expect(r.trackId).toBe('main1');
  });

  it('主线 main1 在中间阶段（有 to）算作进行中', () => {
    const main1 = QUESTS.find(q => q.id === 'main1')!;
    // 第一个阶段有 to
    expect(main1.stages[0].to).toBeTruthy();
    const r = partitionQuests({ main1: 0 }, 'main1');
    expect(r.active.map(q => q.id)).toContain('main1');
    expect(r.active[0].to).toBe(main1.stages[0].to);
  });

  it('stage 超出 QUESTS 长度时，取最后阶段', () => {
    const main1 = QUESTS.find(q => q.id === 'main1')!;
    const overflow = main1.stages.length + 5;
    const r = partitionQuests({ main1: overflow }, 'main1');
    const lastIdx = main1.stages.length - 1;
    expect(r.done.find(x => x.id === 'main1')?.stage).toBe(lastIdx);
  });

  it('active 按 stage 升序、done 也按 stage 升序', () => {
    const prologue = QUESTS.find(q => q.id === 'prologue')!;
    const lastIdx = prologue.stages.length - 1;
    const r = partitionQuests({ prologue: lastIdx, main1: 0 }, '');
    expect(r.active.map(x => x.id)).toEqual(['main1']);
    expect(r.done.map(x => x.id)).toEqual(['prologue']);
  });

  it('track 指向的任务不在玩家 quests 里时，trackId 返回空字符串', () => {
    const r = partitionQuests({ prologue: 0 }, 'main1');
    expect(r.trackId).toBe('');
  });
});
