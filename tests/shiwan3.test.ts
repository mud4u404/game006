/**
 * 试玩第三轮（老玩家）：按钮提前说清楚，不要点了才知道。
 * - 闭关：今日有约、铁律挡住时，三个按钮提前灰掉，旁边写明为什么；
 * - 买卖：要花钱的动作，价钱写在按钮底下，钱不够的灰着。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { run } from '../src/engine/dsl';
import { retreatBlock } from '../src/engine/shiguang';
import { act, verbPoor, verbPrice } from '../src/engine/world';
import { growthHTML } from '../src/ui/growth';
import { pickFresh } from '../src/ui/fresh';
import { SKILLS } from '../src/content';
import { viewJianghu } from '../src/ui/views/jianghu';
import { viewWugong } from '../src/ui/views/wugong';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});

describe('闭关按钮提前灰掉并写原因', () => {
  it('平常能闭关：没有原因，按钮亮着', () => {
    expect(retreatBlock(S)).toBeNull();
    const html = viewWugong();
    expect(html).toContain('data-act="retreat:7"');
    expect(html).not.toMatch(/data-act="retreat:\d+"[^>]*disabled/);
  });

  it('今日有约没了结：闭关三个按钮都灰着，旁边写明是谁的约', () => {
    run([{ type: 'yue', id: 't_yue', npc: 'liu', at: 'hu', inDays: 0, text: '湖畔再见' }]);
    expect(retreatBlock(S)).toContain('约着');
    const html = viewWugong();
    for (const d of ['1', '7', '30']) expect(html).toMatch(new RegExp(`data-act="retreat:${d}"[^>]*disabled`));
    expect(html).toContain('湖畔再见');
  });
});

describe('买卖按钮标价', () => {
  it('要花钱的动作取得到价钱；不花钱的没有', () => {
    expect(verbPrice('jc_yz_tiejiang', '买刀')).toBe(400);
    expect(verbPrice('jc_yz_tiejiang', '买剑')).toBe(600);
    expect(verbPrice('jc_yz_tiejiang', '交谈')).toBeNull();
  });

  it('钱不够也看得见价钱（走到的是「没钱」的回话，价钱不能因此藏起来）', () => {
    S.silver = 0;
    expect(verbPrice('jc_yz_tiejiang', '买刀')).toBe(400);
  });

  it('钱不够但还能赊账治伤的（曲蘅看诊）：按钮不灰；纯回绝的（铁匠买刀）才算买不起', () => {
    S.silver = 5;
    S.wounds = { hand: 1, foot: 0, inner: 0 };
    expect(verbPrice('smth_quheng', '看诊')).toBe(80);
    expect(verbPoor('smth_quheng', '看诊')).toBe(false);
    expect(verbPoor('jc_yz_tiejiang', '买刀')).toBe(true);
    S.silver = 1000;
    expect(verbPoor('jc_yz_tiejiang', '买刀')).toBe(false);
  });

  it('按钮上写着价钱；钱不够的灰着并写明差在哪', () => {
    S.loc = 'jc_yz_yuanmen';
    S.sel = 'jc_yz_tiejiang';
    S.silver = 1000;
    let html = viewJianghu();
    expect(html).toMatch(/data-act="do:买刀"[^>]*>买刀<small>四百文<\/small>/);
    expect(html).not.toMatch(/data-act="do:买刀"[^>]*disabled/);
    S.silver = 100;
    html = viewJianghu();
    expect(html).toMatch(/data-act="do:买刀"[^>]*disabled[^>]*>买刀<small>囊中不足，要四百文<\/small>/);
  });
});

describe('变强之道：按人、按师门写', () => {
  it('少林弟子输了：回山门问寂照长老，不再叫去找了尘', () => {
    S.sect = { school: '少林', rank: '记名' };
    const html = growthHTML();
    expect(html).toContain('寂照长老');
    expect(html).not.toContain('了尘');
  });

  it('没有师承的：没见过了尘就推荐他；见过了就换成复盘', () => {
    delete S.sect;
    delete S.rel.liaochen;
    expect(growthHTML()).toContain('了尘大师');
    S.rel.liaochen = '相识';
    expect(growthHTML()).not.toContain('了尘');
    expect(growthHTML()).toContain('复盘');
  });

  it('没写名字的门派：回师门问师长；带着伤的多一条养伤；文字里没有阿拉伯数字', () => {
    S.sect = { school: '铁掌帮', rank: '记名' };
    S.wounds = { hand: 0, foot: 1, inner: 0 };
    const html = growthHTML();
    expect(html).toContain('回铁掌帮，向师长请教');
    expect(html).toContain('养伤');
    expect(html.replace(/<[^>]+>/g, '')).not.toMatch(/\d/);
  });
});

describe('战报选句：一场里不连着重复', () => {
  it('池子够大时，抽满一轮没有重复；抽完了再来一轮也不报错', () => {
    const used = new Set<string>();
    const pool = ['甲', '乙', '丙', '丁', '戊', '己'];
    const round1 = pool.map(() => pickFresh(used, 'x', pool));
    expect(new Set(round1).size).toBe(pool.length);
    const round2 = pool.map(() => pickFresh(used, 'x', pool));
    expect(new Set(round2).size).toBe(pool.length);
  });

  it('不同的池子互不干扰；只有一句的池子也抽得出来', () => {
    const used = new Set<string>();
    expect(pickFresh(used, 'a', ['唯一'])).toBe('唯一');
    expect(pickFresh(used, 'a', ['唯一'])).toBe('唯一');
    expect(pickFresh(used, 'b', ['乙', '丙'])).toMatch(/乙|丙/);
  });

  it('寒江剑法、惊鸿剑每一式都有变体，变体与原文不同，且都带 {foe}{part}', () => {
    const moves = SKILLS.filter(k => /寒江|惊鸿/.test(k.name)).flatMap(k => k.moves ?? []);
    const withAlts = moves.filter(m => m.alts?.length);
    expect(withAlts.length).toBeGreaterThanOrEqual(12);
    for (const m of withAlts) {
      for (const a of m.alts!) {
        expect(a).not.toBe(m.text);
        expect(a).toContain('{foe}');
        expect(a).toContain('{part}');
      }
    }
  });
});

describe('误事不再一次就被开除', () => {
  it('新进的镖师头一回丢镖只记一过，再丢一回才被辞退；交差之后记过清掉；赔罪不收钱', () => {
    S.shenfen = { id: 'biaoshi', standing: 1 } as typeof S.shenfen;
    run([{ type: 'job', id: 'bj_gz' }]);
    run([{ type: 'jobFail', id: 'bj_gz' }]);
    expect(S.shenfen.id).toBe('biaoshi');
    expect(S.shenfen.standing).toBe(1);
    expect(S.flags.jobWarn).toBe(true);
    run([{ type: 'job', id: 'bj_gz' }]);
    run([{ type: 'jobDone', id: 'bj_gz' }]);
    expect(S.flags.jobWarn).toBeUndefined();
    run([{ type: 'job', id: 'bj_zj' }]);
    run([{ type: 'jobFail', id: 'bj_zj' }]);
    run([{ type: 'job', id: 'bj_zj' }]);
    run([{ type: 'jobFail', id: 'bj_zj' }]);
    expect(S.shenfen.id).toBe('youxia');
    S.flags.bj_joined = true;
    S.silver = 0;
    const r = act('bj_zhao', '赔罪');
    expect(r.text).toContain('旧账不提');
    expect(S.shenfen.id).toBe('biaoshi');
    expect(S.silver).toBe(0);
  });
});
