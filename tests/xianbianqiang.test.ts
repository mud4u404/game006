/**
 * 先变强指一条走得通的路；揭了差事就跟着换；切磋输赢讲理（10-10 老玩家第二次试玩）。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { FOES, storyById } from '../src/content';
import { kpMark } from '../src/engine/kaipian';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { run } from '../src/engine/dsl';
import { Duel } from '../src/engine/duel';
import { arrivalHot, markArrival, retreatLabel, retreatPreview, retreatWarns, retreatWorks, sparWhy, sparWilling, targetAt, yaoJin } from '../src/engine/jiemian';
import { fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { viewJianghu } from '../src/ui/views/jianghu';

const setup = (): void => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 10 * 60;
  S.quests.main1 = 1;
  S.track = 'main1';
  S.loc = 'daming';
};
beforeEach(setup);

const grows = (): boolean => [1, 7].some(d => { const p = retreatPreview(d); return !!p.gain && p.power1 > p.power0; });

describe('先变强不指走不通的路', () => {
  it('历练只有 54：闭关长不出进境，就不指闭关', () => {
    S.lilian = 54;
    const y = yaoJin();
    expect(y.tag).toBe('先变强');
    if (!grows()) {
      expect(y.tab).not.toBe('wugong');
      expect(y.text).not.toContain('闭关');
    }
  });

  it('指了闭关，点进去闭关真有长进（战力涨）；retreatWorks 与预估一致', () => {
    for (const lilian of [0, 54, 200, 400, 1200]) {
      setup();
      S.lilian = lilian;
      const y = yaoJin();
      if (y.tab === 'wugong') expect(grows(), `历练 ${lilian}`).toBe(true);
      expect(retreatWorks(), `历练 ${lilian}`).toBe(grows());
    }
  });

  it('闭关不顶用时，改指真肯打的人、差事或四处走走，不空指', () => {
    S.lilian = 0;
    const y = yaoJin();
    expect(y.text).not.toContain('闭关');
    expect(y.to || y.tab).toBeTruthy();
    if (y.hot) expect(sparWilling(y.hot.npc)).toBe(true);
  });
});

describe('揭了差事，眼下要紧跟着换', () => {
  it('先变强挡着时揭了差事：眼下要紧指差事当前一步，主线排「也可以」', () => {
    run([{ type: 'job', id: 'xsb_xiong' }]);
    S.loc = 'yz_dongquan';
    const y = yaoJin();
    expect(y.tag).toBe('差事');
    expect(y.to).toBe('yz_zhaobi');
    expect(y.tab).toBeUndefined();
    expect(y.also[0].text).toContain('屠千山');
  });

  it('到了地方，自动选中差事当前一步要找的人', () => {
    run([{ type: 'job', id: 'xsb_xiong' }]);
    S.loc = 'yz_dongquan';
    const y = yaoJin();
    const t = targetAt(y.to!);
    expect(t?.npc).toBeTruthy();
    S.loc = y.to!;
    markArrival(t ?? null);
    expect(arrivalHot()?.npc).toBe(t!.npc);
  });
});

describe('切磋的按钮事先看得出', () => {
  it('漕帮的佩刀汉子不肯动手：切磋按钮置灰，写缘故', () => {
    expect(sparWilling('caobang')).toBe(false);
    expect(sparWhy('caobang')).toBe('素不相识，不肯动手');
    S.loc = 'hu';
    S.sel = 'caobang';
    const html = viewJianghu();
    const m = html.match(/<button class="act[^"]*" data-act="do:切磋"([^>]*)>切磋<small>([^<]*)<\/small>/);
    expect(m).toBeTruthy();
    expect(m![1]).toContain('disabled');
    expect(m![2]).toBe('素不相识，不肯动手');
  });
});

describe('切磋输赢讲理', () => {
  it('内力将尽：不够一次硬接就报将尽，势条要往对手那边让', () => {
    const tu = FOES.find(f => f.id === 'tu')!;
    const d = new Duel(heroSpec(S, fightKit(S), tu), foeSpec(tu, []), { rng: () => 0.5 });
    d.mp = d.mpMax;
    expect(d.mpOut()).toBe(false);
    expect(d.mpShort()).toBe(0);
    d.mp = 1;
    expect(d.mpOut()).toBe(true);
    expect(d.mpThin()).toBe(true);
    expect(d.mpShort()).toBeGreaterThan(0.9);
  });
});

describe('闭关预估提前告知', () => {
  it('钱不够住店：预估行写「钱不够，要露宿，参悟慢几分」', () => {
    S.zhu = 'inn'; S.silver = 10; S.lilian = 400;
    expect(retreatWarns(7)).toContain('钱不够，要露宿，参悟慢几分');
    expect(retreatLabel(7, '七日')).toContain('钱不够，要露宿，参悟慢几分');
    S.silver = 90000;
    expect(retreatWarns(7)).not.toContain('钱不够，要露宿，参悟慢几分');
  });

  it('历练化光了，再久也化不动：一月比七日写明', () => {
    S.zhu = 'lusu'; S.lilian = 54;
    expect(retreatWarns(30)).toContain('历练只够化这么多，再久也化不动了');
    S.lilian = 5000;
    expect(retreatWarns(30)).not.toContain('历练只够化这么多，再久也化不动了');
  });
});

describe('序章后期不指已经不在的人', () => {
  it('焦船、去路两步：眼下要紧不再写「找江伯」', () => {
    const len = storyById('kp_du_hou')!.cards.length;
    for (const i of [len - 2, len - 1]) {
      setState(newGame());
      kpMark(S, { kind: 'story', id: 'kp_du_hou', i });
      const y = yaoJin();
      expect(y.tag, `第${i}张`).toBe('序章');
      expect(y.text).not.toContain('找江伯');
      expect(y.text).not.toContain('渡口小屋');
    }
  });
});
