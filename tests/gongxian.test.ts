/**
 * 门派贡献（docs/menpai.md 第七节第八条）：替师门办差攒贡献，升地位、学外门以上的武功拿它去换。
 * 负责人 10-08：「这个世界大多是有条件有代价的，极少存在唾手可得的东西。」
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { foeById, skillById } from '../src/content';
import { GONGXIAN_PENDING, LEARN_GONGXIAN } from '../src/content/skills';
import { run, test as cond } from '../src/engine/dsl';
import { act, roomNpcs } from '../src/engine/world';
import { canLearn, gongxianCost } from '../src/engine/shicheng';
import { learnSkill } from '../src/engine/growth';
import { gongxianOf, jobGongxian, jobOpen } from '../src/engine/shenfen';
import { fateOpts } from '../src/engine/jiesuan';
import { jobById } from '../src/content';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});
afterEach(() => setNowMs(() => Date.now()));

describe('师门差事', () => {
  it('拜进了才接得到；办完给贡献、不给钱；误了扣贡献、不降身份的地位', () => {
    expect(jobOpen(S, 'smcs_gb_xin')).toBe(false);
    run([{ type: 'sect', school: '丐帮', rank: '记名' }]);
    expect(jobOpen(S, 'smcs_gb_xin')).toBe(true);
    S.loc = 'bs2_longwang';
    act('bs2_bao', '讨差事');
    expect(S.job?.id).toBe('smcs_gb_xin');
    expect(roomNpcs('gz_town')).toContain('smcs_gz_laohua');
    const s0 = S.silver;
    S.loc = 'gz_town';
    act('smcs_gz_laohua', '交信');
    expect(S.job).toBeNull();
    expect(gongxianOf(S)).toBe(jobGongxian(jobById('smcs_gb_xin')!));
    expect(S.silver).toBe(s0);
    expect(cond({ gongxian: 20 })).toBe(true);
    expect(cond({ gongxian: 21 })).toBe(false);
    // 误事
    S.gongxian!.丐帮 = 100;
    run([{ type: 'job', id: 'smcs_gb_zhou' }, { type: 'jobFail', id: 'smcs_gb_zhou' }]);
    expect(gongxianOf(S)).toBe(100 - jobGongxian(jobById('smcs_gb_zhou')!));
    expect(S.shenfen.standing).toBe(1);
  });

  it('夜里才有人来砸粥棚；打赢了交差', () => {
    run([{ type: 'sect', school: '丐帮', rank: '记名' }, { type: 'job', id: 'smcs_gb_zhou' }]);
    expect(roomNpcs('bs2_longwang')).not.toContain('smcs_dashou');
    S.min = 21 * 60;
    expect(roomNpcs('bs2_longwang')).toContain('smcs_dashou');
    run(foeById('smcs_dashou')!.results.win.do);
    expect(S.job).toBeNull();
    expect(gongxianOf(S)).toBe(30);
  });

  it('捕快押走人犯，也是替六扇门出力', () => {
    run([{ type: 'sect', school: '六扇门', rank: '记名' }, { type: 'shenfen', id: 'bukuai' }]);
    const ya = fateOpts(foeById('lsm_qian')!, 'win').find(o => o.label === '上锁押走')!;
    run(ya.do);
    expect(gongxianOf(S)).toBe(40);
  });
});

describe('学外门以上的武功要贡献', () => {
  it('入门的只花历练；外门的另要贡献，不够时说清楚还差多少；学成了扣掉', () => {
    run([{ type: 'sect', school: '丐帮', rank: '外门' }]);
    S.lilian = 5000;
    S.skills.gb_baina = { r: 1, p: 0 };
    const huntian = skillById('gb_huntian')!;
    expect(gongxianCost(skillById('gb_baina')!)).toBe(0);
    expect(gongxianCost(huntian)).toBe(LEARN_GONGXIAN.外门);
    expect(canLearn(S, huntian)).toMatchObject({ ok: false, why: expect.stringContaining('门派贡献不够') });
    S.gongxian = { 丐帮: 100 };
    expect(learnSkill('gb_huntian')).toEqual(['习得「混天气功」']);
    expect(gongxianOf(S)).toBe(100 - LEARN_GONGXIAN.外门);
  });

  it('还没有师门差事的门派，暂不收贡献（不让玩家卡住）', () => {
    for (const school of GONGXIAN_PENDING) expect(gongxianCost({ school, teach: '外门' })).toBe(0);
  });

  it('离了门派，贡献各记各的', () => {
    run([{ type: 'sect', school: '丐帮', rank: '记名' }, { type: 'gongxian', delta: 50 }]);
    expect(gongxianOf(S)).toBe(50);
    run([{ type: 'leaveSect', how: '出师' }]);
    expect(gongxianOf(S)).toBe(0);
    expect(S.gongxian?.丐帮).toBe(50);
  });
});
