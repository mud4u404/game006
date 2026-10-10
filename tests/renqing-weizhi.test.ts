/**
 * 人物页人情的「眼下在」（Issue #362）：地点走统一作息查询 whereAt（engine/world.ts），
 * 不再逐个地点翻 npcs——世事把人挪走、睡下走开的都查得到。
 * - 白天：人该在哪儿就写「眼下在X」；
 * - 夜里：作息之外的人这一行不出现（原文写「常在」，说的是常住，会说错）；
 * - 世事（ppl[id].at）把人挪走的存档：写新地点。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
vi.stubGlobal('document', { addEventListener: () => {}, hidden: false, querySelector: () => null });
const { viewRenwu } = await import('../src/ui/views/renwu');

beforeEach(() => { setState(skipToYangzhou()); });

/** 人情里某个人的那一行 */
function row(name: string): string {
  const hit = viewRenwu().split('<div class="rq">').slice(1).find(p => p.includes(`<b>${name}</b>`));
  expect(hit, `${name} 应该在人情里`).toBeTruthy();
  return hit!;
}

describe('人情里的「眼下在」', () => {
  it('白天人在作息里的地点：茶摊老汉在瓜洲镇', () => {
    S.min = 10 * 60;
    const r = row('茶摊老汉');
    expect(r).toContain('眼下在瓜洲镇');
    expect(r).not.toContain('常在');
  });
  it('夜里作息之外的人不写这一行；夜里也在的照写', () => {
    S.min = 22 * 60;
    expect(row('茶摊老汉')).not.toContain('眼下在');
    // 回春堂掌柜 night: true，夜里还守着铺子
    expect(row('回春堂掌柜')).toContain('眼下在瓜洲镇');
  });
  it('世事把人挪走的存档：写新地点', () => {
    S.min = 10 * 60;
    S.w.ppl['huichun'] = { at: { room: 'gz_pier', until: 99999 } };
    expect(row('回春堂掌柜')).toContain('眼下在瓜洲码头');
  });
});
