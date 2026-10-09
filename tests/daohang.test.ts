/**
 * 心事的导航（engine/daohang.ts）：负责人 10-09「至少玩家知道自己进度在哪，卡在哪，哪怕做不成也知道」。
 * 这里管写全、写对；「说真话」（机器玩家推进一步时门槛都打勾）在 tests/zoubian.test.ts。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { NPCS, QUESTS, ROOMS } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { setNowMs } from '../src/core/time';
import { questNav, whoNav } from '../src/engine/daohang';
import { questbookSheetHtml } from '../src/ui/views/questbook';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  S.min = 14 * 60;
});

const roomIds = new Set(ROOMS.map(r => r.id));
const npcIds = new Set(NPCS.map(n => n.id));
/** 人物写在哪几处（作息、剧情条件不管） */
const roomsOf = (id: string): string[] => ROOMS.filter(r => [...(r.npcs ?? []), ...(r.objs ?? [])].some(x => (typeof x === 'string' ? x : x.id) === id)).map(r => r.id);

describe('每件心事的导航写全了', () => {
  for (const q of QUESTS) {
    it(`${q.name}`, () => {
      q.stages.slice(0, -1).forEach((st, i) => {
        const at = `${q.id} 第 ${i + 1} 步「${st.title}」`;
        expect(st.hint, `${at}：没写怎么做（hint）`).toBeTruthy();
        if (st.to) expect(roomIds.has(st.to), `${at}：地点 ${st.to} 不存在`).toBe(true);
        if (st.who) {
          expect(npcIds.has(st.who), `${at}：人物 ${st.who} 不存在`).toBe(true);
          if (st.to) expect(roomsOf(st.who), `${at}：${st.who} 的作息里没有 ${st.to}`).toContain(st.to);
        }
        for (const g of st.need ?? []) expect(g.text, `${at}：门槛没写成人话`).toBeTruthy();
      });
    });
  }
});

describe('导航算得对、不剧透、不讲解', () => {
  it('点过名的人夜里不在：写他什么时辰在哪；白天去就能去', () => {
    S.quests.main1 = 1;
    S.min = 22 * 60;
    expect(questNav('main1')).toMatchObject({ state: '要等', why: '屠千山卯时到戌时在运河渡口' });
    S.min = 10 * 60;
    expect(questNav('main1')).toMatchObject({ state: '能做', to: 'dukou' });
  });

  it('剧情上的门槛不点破：只说「还缺些眉目」，不说缺的是哪条线索', () => {
    S.quests.side_caoshangfei = 1;
    S.min = 10 * 60;
    const n = questNav('side_caoshangfei')!;
    expect(n.why).toBe('还缺些眉目');
    const html = questbookSheetHtml();
    expect(html).toContain('还缺些眉目');
    for (const g of QUESTS.find(q => q.id === 'side_caoshangfei')!.stages[1].need ?? []) {
      if (!Object.keys(g.if).every(k => k === 'hour')) expect(html).not.toContain(g.text);
    }
  });

  it('没点过名的人不提：标题和盘算里没写他的名字，见闻簿里就没有他', () => {
    for (const q of QUESTS) q.stages.forEach((st, i) => {
      if (!st.who) return;
      S.quests[q.id] = i;
      const n = questNav(q.id);
      if (n?.who) expect(`${st.title}${st.hint ?? ''}`).toContain(n.who.name);
    });
  });

  it('见闻簿不挂「能做、卡住」的签，不打勾打叉', () => {
    S.quests.side_yanhao = 2;
    S.quests.side_caoshangfei = 1;
    S.min = 10 * 60;
    const html = questbookSheetHtml();
    expect(html).not.toMatch(/[✓✗×] |>能做<|>卡住<|>要等</);
    expect(html).toContain('前情');
  });

  it('做不成了：未竟，见闻簿写原因，记挂着的横幅放下', async () => {
    S.quests.smth_zhen = 0;
    S.track = 'smth_zhen';
    expect(questNav('smth_zhen')!.state).not.toBe('未竟');
    S.shi = { ...(S.shi ?? {}), smth_shi: { at: 'shao', since: 0, seen: 'shao' } };
    const n = questNav('smth_zhen')!;
    expect(n.state).toBe('未竟');
    const html = questbookSheetHtml();
    expect(html).toContain('未竟 · 1');
    expect(html).toContain(n.why);
    const { dropFailedTrack } = await import('../src/engine/daohang');
    dropFailedTrack();
    expect(S.track).toBe('');
    expect(S.feed[0].x).toContain('只好放下');
  });

  it('了结的心事：了结，不能记挂', () => {
    const q = QUESTS[0];
    S.quests[q.id] = q.stages.length - 1;
    expect(questNav(q.id)!.state).toBe('了结');
  });

  it('找的人有作息：说得出眼下在哪，或什么时辰在', () => {
    for (const n of NPCS.filter(x => Array.isArray(x.at) && x.at.some(a => a.if?.hour))) {
      const w = whoNav(n.id);
      expect(w.now !== null || w.when !== null, n.id).toBe(true);
    }
  });
});
