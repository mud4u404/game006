import { describe, expect, it } from 'vitest';
import { FIELD_OWNER, newGame, skipToYangzhou, type GameState } from '../src/core/state';

type OptionalKey = { [K in keyof GameState]-?: {} extends Pick<GameState, K> ? K : never }[keyof GameState];

// 新游戏有意不写这些可选字段；只在校验里补键，不给存档添默认值。
// satisfies 也要求这份可选清单穷尽：新增可选字段不能绕过登记检查。
const optional = {
  sect: undefined, pastSects: undefined, lightSince: undefined, tierTop: undefined,
  zhu: undefined, storyAt: undefined, dayLog: undefined, relNote: undefined,
  foeLog: undefined, diao: undefined, shi: undefined, gongxian: undefined,
  asked: undefined, away: undefined
} satisfies Record<OptionalKey, undefined>;

describe('存档字段归属', () => {
  it('登记恰好覆盖每个存档字段，包括新游戏里尚未出现的可选字段', () => {
    for (const create of [newGame, skipToYangzhou]) {
      const state = create();
      expect(Object.keys(FIELD_OWNER).sort()).toEqual(Object.keys({ ...optional, ...state }).sort());
      for (const key of Object.keys(state)) expect(Object.hasOwn(FIELD_OWNER, key), key).toBe(true);
    }
  });

  it('每个字段明确范围和写入口，旗标单独标明个人与世界混用', () => {
    for (const [key, owner] of Object.entries(FIELD_OWNER)) {
      expect(['个人', '世界', '界面'], key).toContain(owner.scope);
      expect(owner.writer.trim().length, key).toBeGreaterThan(0);
    }
    expect(FIELD_OWNER.flags).toMatchObject({ scope: '个人', mixed: '混' });
    expect(Object.entries(FIELD_OWNER).filter(([, owner]) => 'mixed' in owner).map(([key]) => key)).toEqual(['flags']);
  });
});
