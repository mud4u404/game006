/**
 * 大明寺抄经（packs/yangzhou.ts 的了尘）：恶名有路可降，但要时辰、纸墨、一日一回。
 * 恶名十二抄一回变十，当日再抄见「一日一卷」，隔一日再抄变八；恶名零时看不到这个动作；银两不足十文见纸墨不够那一支。
 */
import { describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays } from '../src/core/time';
import { npc } from '../src/content';
import { act, verbsOf } from '../src/engine/world';

describe('大明寺抄经：恶名降得下来', () => {
  it('恶名十二，抄一回变十；当日再抄见「一日一卷」；隔一日再抄变八', () => {
    setState(skipToYangzhou());
    S.eming = 12;
    S.silver = 30;
    const first = act('liaochen', '抄经');
    expect(S.eming).toBe(10);
    expect(S.silver).toBe(20);
    expect(first.text).toContain('抄');
    const again = act('liaochen', '抄经');
    expect(S.eming).toBe(10);
    expect(again.text).toContain('一日一卷');
    advanceDays(S, 1);
    act('liaochen', '抄经');
    expect(S.eming).toBe(8);
  });

  it('恶名零时看不到抄经这个动作', () => {
    setState(skipToYangzhou());
    S.eming = 0;
    expect(verbsOf(npc('liaochen')!).some(v => v === '抄经')).toBe(false);
  });

  it('银两不足十文时，见纸墨不够那一支', () => {
    setState(skipToYangzhou());
    S.eming = 5;
    S.silver = 5;
    const r = act('liaochen', '抄经');
    expect(S.eming).toBe(5);
    expect(S.silver).toBe(5);
    expect(r.text).toContain('纸墨');
  });
});