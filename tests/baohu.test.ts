/**
 * 引擎的几处保护（第四稿复审的可选项）：死人不复活、item 的 max 不收走原有的、伤加重时提示跟着变
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { run } from '../src/engine/dsl';
import { stOf } from '../src/engine/shijie';

beforeEach(() => { setNowMs(() => 1_000_000_000_000); setState(skipToYangzhou()); });
afterEach(() => setNowMs(() => Date.now()));

describe('引擎保护', () => {
  it('死了的人，再写伤、坐牢、走，都不会改他的处境', () => {
    run([{ type: 'w', op: 'dead', npc: 'kp_chu' }]);
    expect(stOf('kp_chu')).toBe('dead');
    run([{ type: 'w', op: 'hurt', npc: 'kp_chu' }, { type: 'w', op: 'gone', npc: 'kp_chu' }, { type: 'w', op: 'jail', npc: 'kp_chu' }]);
    expect(stOf('kp_chu')).toBe('dead');
  });

  it('item 的 max 只管加，手里本来多于 max 的不收走', () => {
    S.items.jcy = 3;
    run([{ type: 'item', id: 'jcy', delta: 1, max: 1 }]);
    expect(S.items.jcy).toBe(3);
    S.items.jcy = 0;
    run([{ type: 'item', id: 'jcy', delta: 2, max: 1 }]);
    expect(S.items.jcy).toBe(1);
    run([{ type: 'item', id: 'jcy', delta: -1, max: 1 }]);
    expect(S.items.jcy).toBe(0);
  });

  it('伤加重时提示跟着变，封顶没变化时不提示', () => {
    S.wounds.hand = 0; S.feed = [];
    run([{ type: 'wound', zone: 'hand' }]);
    expect(S.feed[0]?.x).toContain('过一日自己会好');
    run([{ type: 'wound', zone: 'hand' }]);
    expect(S.wounds.hand).toBe(2);
    expect(S.feed[0]?.x).toContain('又重了一层');
    S.wounds.hand = 3; const n = S.feed.length;
    run([{ type: 'wound', zone: 'hand' }]);
    expect(S.feed.length).toBe(n);
  });
});
