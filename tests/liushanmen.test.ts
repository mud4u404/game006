/**
 * 六扇门的立身之道（docs/lizu.md 第四节，内容在 src/content/packs/liushanmen.ts）：
 * 特权（盘问、上锁押走、提审）、帮手（官兵只在扬州府地界，保镖跟着走）、软肋（不能私刑、不能私放，恶名一高腰牌收回）。
 * 海捕文书上的人犯是世事：不去拿，他们会再作案，然后逃出江南。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, setNowMs } from '../src/core/time';
import { foeById, npc } from '../src/content';
import { run } from '../src/engine/dsl';
import { act, npcName, roomNpcs, verbsOf } from '../src/engine/world';
import { tickShi } from '../src/engine/shishi';
import { fateOpts } from '../src/engine/jiesuan';
import { activePrep } from '../src/engine/zhaoshi';
import { shenfenText } from '../src/engine/shenfen';

/** 拜入六扇门（照 packs/baishi.ts 的 LSM_JOIN） */
const join = (): void => { run([{ type: 'sect', school: '六扇门', rank: '记名' }, { type: 'shenfen', id: 'bukuai' }, { type: 'item', id: 'bs2_yaopai', delta: 1 }]); };

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 10 * 60;
  tickShi();
});
afterEach(() => setNowMs(() => Date.now()));

describe('特权：盘问', () => {
  it('做了捕快，说得上话的人都能盘问，不论今天问没问过', () => {
    expect(verbsOf(npc('yaopu')!)).not.toContain('盘问');
    join();
    expect(shenfenText(S)).toBe('捕快 · 新进');
    expect(verbsOf(npc('yaopu')!)).toContain('盘问');
    expect(verbsOf(npc('bei')!), '物件不能盘问').not.toContain('盘问');
    S.loc = 'cheng';
    for (let i = 0; i < 3; i++) expect(act('yaopu', '盘问').text).toContain('腰牌');
  });
});

describe('海捕文书上的人犯', () => {
  it('人犯换了样子：识破之前只是个路人，动不了手；捕快一盘问就露了馅', () => {
    expect(S.shi?.lsm_qian?.at).toBe('zaitao');
    S.loc = 'jc_yz_yuanmen';
    expect(roomNpcs(S.loc)).toContain('lsm_qian');
    expect(npcName('lsm_qian')).toBe('瘦高个');
    expect(verbsOf(npc('lsm_qian')!)).not.toContain('动手');
    join();
    act('lsm_qian', '盘问');
    expect(npcName('lsm_qian')).toBe('鬼手钱三');
    expect(verbsOf(npc('lsm_qian')!)).toContain('动手');
    S.min = 20 * 60;
    expect(roomNpcs(S.loc), '夜里他不在桥头').not.toContain('lsm_qian');
  });

  it('不是捕快也识破得了：根基之眼，或者打听到的线索', () => {
    S.loc = 'jc_yz_yuanmen';
    S.attr.悟性 = 40;
    act('lsm_qian', '观察');
    expect(S.flags.lsm_qian_shipo).toBe(true);
  });

  it('不去拿：他再作案，然后逃出江南；下一个人犯才贴出来', () => {
    advanceDays(S, 8); tickShi();
    expect(S.shi?.lsm_qian?.at).toBe('zuoan');
    expect(S.shi?.lsm_bai).toBeUndefined();
    advanceDays(S, 6); tickShi();
    expect(S.shi?.lsm_qian?.at).toBe('taozou');
    expect(S.shi?.lsm_bai?.at).toBe('zaitao');
  });

  it('捕快押走、私放、私刑；别人扭送府衙。各是各的路', () => {
    const f = foeById('lsm_qian')!;
    const labels = (): string[] => fateOpts(f, 'win').map(o => o.label);
    expect(labels()).toEqual(['扭送府衙', '当场放了', '下杀手']);
    join();
    expect(labels()).toEqual(['上锁押走', '当场放了', '下杀手']);
  });

  it('上锁押走：进大牢、领赏、地位升；提审出下一个人犯的下落', () => {
    join();
    const s0 = S.silver;
    const ya = fateOpts(foeById('lsm_qian')!, 'win').find(o => o.label === '上锁押走')!;
    run(ya.do);
    expect(S.shi?.lsm_qian?.at).toBe('luowang');
    expect(S.silver).toBe(s0 + 800);
    expect(S.shenfen.standing).toBe(2);
    tickShi();
    expect(S.shi?.lsm_bai?.at).toBe('zaitao');
    S.loc = 'yz_fuya_lao';
    act('lsm_laotou', '提审');
    expect(S.flags.lsm_bai_shipo, '钱三供出了白七郎').toBe(true);
    expect(act('lsm_laotou', '提审').text, '提审过的不再提审').toContain('没有');
  });

  it('帮手：官兵只在扬州府地界，保镖跟着走；不是捕快叫不来', () => {
    const names = (id: string): string[] => activePrep(foeById(id)!).flatMap(p => (p.ally ? [p.ally.name] : []));
    expect(names('lsm_bai')).toEqual([]);
    join();
    expect(names('lsm_qian')).toEqual(['官兵']);
    expect(names('lsm_bai')).toEqual(['官兵', '老鲁']);
    expect(names('lsm_xiong'), '镇江不归扬州府管，叫不来官兵').toEqual(['老鲁']);
  });
});

describe('软肋', () => {
  it('私刑、私放犯门规，地位一降到底，腰牌收回、逐出六扇门', () => {
    join();
    const f = foeById('lsm_qian')!;
    const sha = fateOpts(f, 'win').find(o => o.label === '下杀手')!;
    run(sha.do);
    expect(S.shenfen.id).toBe('youxia');
    expect(S.sect).toBeUndefined();
    expect(S.pastSects).toContainEqual({ school: '六扇门', how: '逐出' });
    expect(S.items.bs2_yaopai ?? 0).toBe(0);
    expect(S.feed[0].x).toContain('腰牌');
  });

  it('恶名到了十，腰牌收回', () => {
    join();
    run([{ type: 'eming', delta: 9 }]);
    expect(S.shenfen.id).toBe('bukuai');
    run([{ type: 'eming', delta: 1 }]);
    expect(S.shenfen.id).toBe('youxia');
    expect(S.pastSects).toContainEqual({ school: '六扇门', how: '逐出' });
    S.loc = 'yz_fuya';
    expect(act('bs2_qin', '交谈').text).toContain('亲手收回来');
  });

  it('自己离了六扇门，捕快的身份也就没了', () => {
    join();
    run([{ type: 'leaveSect', how: '出师' }]);
    expect(S.shenfen.id).toBe('youxia');
    expect(verbsOf(npc('yaopu')!)).not.toContain('盘问');
  });
});
