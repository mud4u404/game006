/**
 * 第二轮全面审查（10-09，docs/shiwan.md「第二轮」）修掉的问题，每条一个回归测试。编号对应审查报告。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { dayNo, setNowMs } from '../src/core/time';
import { run } from '../src/engine/dsl';
import { act, roomNpcs, verbsOf } from '../src/engine/world';
import { npc } from '../src/content';
import { canWait } from '../src/engine/shiguang';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 14 * 60;
});

describe('交谈只说话，不替玩家了结世事', () => {
  it('C01 何税吏：交谈不推渡船的事；请他行文要另点，还要三十文规费', () => {
    run([{ type: 'shi', id: 'sszj_du', to: 'qi' }]);
    act('zj_shuli', '交谈');
    expect(S.shi!.sszj_du.at).toBe('qi');
    expect(verbsOf(npc('zj_shuli')!)).toContain('请他行文');
    S.silver = 20;
    act('zj_shuli', '请他行文');
    expect(S.shi!.sszj_du.at).toBe('qi');
    S.silver = 100;
    act('zj_shuli', '请他行文');
    expect(S.shi!.sszj_du.at).toBe('guanfu');
    expect(S.silver).toBe(70);
  });

  it('C02 闻铁匠：交谈只是托你捎话；话带到寒山寺，钟才补', () => {
    run([{ type: 'shi', id: 'sz_zhong', to: 'lie' }]);
    act('sz_wentiejiang', '交谈');
    expect(S.shi!.sz_zhong.at).toBe('lie');
    S.min = 10 * 60;
    expect(verbsOf(npc('sz_benli')!)).toContain('捎话');
    act('sz_benli', '捎话');
    expect(S.shi!.sz_zhong.at).toBe('xiangzhu');
  });
});

describe('桃花岛', () => {
  it('E01 悟性不够、看着阿芦的点走出阵的，也拜进了门', () => {
    S.attr.悟性 = 24;
    S.flags.smth_asked = true;
    act('smth_quheng', '入阵');
    expect(S.sect?.school).toBe('桃花岛');
  });

  it('E02 卜卦只免头一回：往后照收一百，不再长历练', () => {
    S.silver = 500;
    const ll = S.lilian ?? 0;
    act('smth_quheng', '卜卦');
    expect([S.silver, S.lilian]).toEqual([500, ll + 20]);
    act('smth_quheng', '卜卦');
    expect([S.silver, S.lilian]).toEqual([400, ll + 20]);
  });

  it('E03 看诊：没钱只能赊一回，赊过的不还就不再看', () => {
    S.silver = 0;
    S.wounds = { hand: 3, foot: 3, inner: 0 };
    act('smth_quheng', '看诊');
    act('smth_quheng', '看诊');
    act('smth_quheng', '看诊');
    expect(S.wounds.hand + S.wounds.foot).toBe(5);
  });
});

describe('瓜洲的人', () => {
  it('A12 看着你长大的街坊开局就是点头之交；A13 至亲不给「打听」', () => {
    setState(newGame());
    expect(S.rel.chatan).toBe('点头之交');
    expect(S.rel.ayp).toBe('点头之交');
    expect(verbsOf(npc('jiangbo')!)).not.toContain('打听');
  });

  it('C06 道场刚起头，孩子还没丢，孙家娘子不在渡口哭', () => {
    run([{ type: 'shi', id: 'sszj_dao', to: 'qi' }]);
    S.min = 10 * 60;
    expect(roomNpcs('zj_xijin')).not.toContain('sszj_sunnian');
  });
});

describe('约', () => {
  it('G01 今日有约没了结：歇脚、住店都不跨过半夜，免得人站在约地也判失约', () => {
    run([{ type: 'yue', id: 't_yue', npc: 'liu', at: 'hu', inDays: 0, text: '湖畔再见' }]);
    expect(S.yue[0].due).toBe(dayNo(S));
    S.min = 20 * 60;
    expect(canWait(S, 6)).toBe(false);
    expect(canWait(S, 22)).toBe(true);
    S.loc = 'cheng'; S.silver = 300;
    const day = S.day;
    expect(act('jc_yz_ruanniang', '住店').text).toContain('失约');
    expect([S.day, S.silver]).toEqual([day, 300]);
  });
});
