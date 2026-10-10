/**
 * 推荐只推眼下真能做的（#633）：零工按每一处分开算；找的人此刻不在就不推「去」。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { dayNo, setNowMs } from '../src/core/time';
import { gigLead, leadsNear } from '../src/engine/daohang';
import { roomNpcs } from '../src/engine/world';
import { yaoJin } from '../src/engine/jiemian';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 10 * 60;
  S.silver = 30;
});

describe('零工按处分开算', () => {
  it('抄书做过了，扛包仍在推荐里', () => {
    S.dayLog = { ...(S.dayLog ?? {}), lg_chaoshu: dayNo(S) };
    const g = gigLead();
    expect(g).not.toBeNull();
    expect(g!.text).not.toContain('抄书');
    expect(leadsNear(3).some(l => l.gig)).toBe(true);
  });

  it('缺钱时零工排在「也可以」前头，不被差事挤掉', () => {
    const y = yaoJin();
    const gig = leadsNear(3).find(l => l.gig);
    if (gig && y.tag !== '零工' && y.also.length) expect(y.also[0].text).toContain('零工');
  });
});

describe('找的人不在就不推去', () => {
  it('亥时推荐的差事，派差的人都真在那里；不推「去府衙找书办」', () => {
    S.min = 23 * 60;
    for (const l of leadsNear(8)) {
      if (l.gig || !l.who) continue;
      expect(roomNpcs(l.to)).toContain(l.who);
    }
    expect(yaoJin().text).not.toContain('找书办');
  });
});
