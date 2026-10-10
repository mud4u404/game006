/** #280 复审：合法的第二次仍能结算，同一次提交和刷新不能重领。 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, save, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, dayNo, setNowMs } from '../src/core/time';
import { readSave, useStore, type SaveStore } from '../src/core/save';
import { ENCOUNTERS, jobById, storyById } from '../src/content';
import type { Effect, Verb } from '../src/content/types';
import { run } from '../src/engine/dsl';
import { eligible, markEncounter } from '../src/engine/encounter';
import { useItem } from '../src/engine/daoju';
import { jobOpen, jobPay } from '../src/engine/shenfen';
import { act, effectReq, plan, storyCheckpoint, storyOpen, storyReq } from '../src/engine/xingdong';
import { act as worldAct, verbPlan } from '../src/engine/world';

class MemStore implements SaveStore {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  get length() { return this.data.size; }
}
beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  useStore(new MemStore());
});
afterEach(() => { useStore(null); setNowMs(() => Date.now()); });

describe('main 的条件银两', () => {
  // 起手钱 2026-10-10 从三十改成二百五十（Issue #547），断言一律相对起手值，别再写死
  const 起手 = skipToYangzhou().silver;
  it.each([-100, 100])('条件不成立的银两 %i 不列代价或所得，不缺钱、不缺凭据、不留提示', delta => {
    const effects: Effect[] = [{ type: 'silver', delta, if: { flag: 'missing' }, note: '未发生的银两' }];
    const req = { who: 'player', verb: '试算', effects };
    const before = structuredClone(S);
    expect(plan(req)).toEqual({ ok: true, cost: [], gain: [], minutes: 0 });
    expect(S).toEqual(before);
    const result = act(req);
    expect(result.ok).toBe(true);
    expect(result.event?.cost).toEqual([]); expect(result.event?.gain).toEqual([]);
    expect(S.silver).toBe(before.silver); expect(S.feed).toEqual(before.feed);
  });

  it('生效的银两在开始时定价；耗时后条件改变仍照价结算，保留 note', () => {
    S.min = 8 * 60 + 55;
    const req = effectReq('试算', 'yaopu', [
      { type: 'silver', delta: -20, if: { hour: { from: 8, to: 9 } }, note: '付过了药钱。' },
      { type: 'time', add: 20 }, { type: 'item', id: 'jcy', delta: 1 }
    ]);
    expect(plan(req).cost).toContainEqual({ type: 'silver', delta: -20, note: '付过了药钱。' });
    expect(act(req).ok).toBe(true); expect(S.silver).toBe(起手 - 20); expect(S.items.jcy).toBe(2);
    expect(S.feed.some(f => f.t === '江湖' && f.x === '付过了药钱。')).toBe(true);
  });

  it('runStep 内部入口也保留银两条件和 note（战后结算沿用此口）', () => {
    run([{ type: 'silver', delta: -100, if: { flag: 'missing' }, note: '不应出现' }]);
    expect(S.silver).toBe(起手); expect(S.feed.some(f => f.x === '不应出现')).toBe(false);
    S.flags.paid = true;
    run([{ type: 'silver', delta: 10, if: { flag: 'paid' }, note: '已兑现' }]);
    expect(S.silver).toBe(起手 + 10); expect(S.feed.some(f => f.x === '已兑现')).toBe(true);
  });
});

describe('可重复奖励：每一回有自己的凭据', () => {
  for (const [id, to, reward] of [
    ['ly_jiang_feng', 'gz_duchuan', 30],
    ['ly_jiang_jiangtun', 'zj_xijin', 20],
    ['ly_yz_suanming', 'jinshan', 20]
  ] as const) {
    it(`${id}：七天后再遇仍领奖；重复提交和存读不能重领同一回（含付钱选项）`, () => {
      const encounter = ENCOUNTERS.find(e => e.story === id)!;
      const def = storyById(id)!, choice = def.cards[0].choices[0];
      S.min = 10 * 60; S.silver = 100;
      expect(eligible(to)).toContain(encounter);
      markEncounter(encounter);
      const pos = storyOpen(id), req = storyReq(pos, choice.do, choice.if), lilian = S.lilian;
      save();
      // 尚未选就关掉：恢复同一时刻的凭据，而不是把刷新算成一次新遇见。
      setState(readSave().state!);
      expect(storyOpen(id)).toEqual(pos);
      expect(storyReq(S.storyAt!, choice.do, choice.if).key).toBe(req.key);
      expect(act(req, undefined, out => storyCheckpoint(pos, def.cards.length, out, -1)).ok).toBe(true);
      expect(S.lilian).toBe(lilian + reward); expect(S.storyAt).toBeUndefined();
      const after = structuredClone(S);
      expect(act(req).ok).toBe(false); expect(S).toEqual(after);
      setState(readSave().state!);
      expect(act(req).ok).toBe(false); expect(S.lilian).toBe(lilian + reward);
      expect(eligible(to)).not.toContain(encounter);
      advanceDays(S, 6); expect(eligible(to)).not.toContain(encounter);
      advanceDays(S, 1); expect(eligible(to)).toContain(encounter);
      markEncounter(encounter);
      const again = storyOpen(id), req2 = storyReq(again, choice.do, choice.if);
      expect(req2.key).not.toBe(req.key); expect(plan(req2).ok).toBe(true);
      expect(act(req2, undefined, out => storyCheckpoint(again, def.cards.length, out, -1)).ok).toBe(true);
      expect(S.lilian).toBe(lilian + reward * 2);
      expect(act(req2).ok).toBe(false);
      if (id === 'ly_yz_suanming') expect(S.silver).toBe(60);
    });
  }

  it('剧情的下一张卡断点与奖励一同保存，续读和重新试同一张卡都沿用本次凭据', () => {
    const pos = storyOpen('p_open'), effects: Effect[] = [{ type: 'lilian', amount: 10 }];
    const req = storyReq(pos, effects);
    expect(act(req, undefined, out => storyCheckpoint(pos, 10, out, 2)).ok).toBe(true);
    setState(readSave().state!);
    expect(storyOpen('p_open', 2)).toEqual({ ...pos, i: 2 });
    expect(act(storyReq({ ...S.storyAt!, i: 0 }, effects)).ok).toBe(false);
    expect(S.lilian).toBe(skipToYangzhou().lilian + 10);
  });

  it.each(['讨饭', '帮工'] as Verb[])('胡婶的%s：吃掉烧饼后再来，标价、灰态与实得一致', verb => {
    S.loc = 'cheng'; S.quests.bs2_gb_kao = 0; S.attr.胆魄 = 24;
    expect(verbPlan('bs2_hu', verb).ok).toBe(true);
    worldAct('bs2_hu', verb);
    expect(S.items.bs2_shaobing).toBe(1);
    const first = S.log.find(e => e.target === 'bs2_hu' && e.verb === verb)!;
    expect(useItem('bs2_shaobing').ok).toBe(true); expect(S.items.bs2_shaobing).toBe(0);
    expect(verbPlan('bs2_hu', verb).ok).toBe(true);
    worldAct('bs2_hu', verb);
    expect(S.items.bs2_shaobing).toBe(1);
    expect(S.log.filter(e => e.target === 'bs2_hu' && e.verb === verb)).toHaveLength(2);
    expect(S.log.at(-1)?.key).not.toBe(first.key);
  });

  it('免费交易：重新发起能再次做；同一份已发出的请求重交或存读仍拒绝', () => {
    const effects: Effect[] = [{ type: 'item', id: 'jcy', delta: 1 }];
    const req = effectReq('赠药', 'yaopu', effects);
    expect(act(req).ok).toBe(true); expect(act(req).ok).toBe(false);
    setState(readSave().state!); expect(act(req).ok).toBe(false);
    const again = effectReq('赠药', 'yaopu', effects);
    expect(again.key).not.toBe(req.key); expect(act(again).ok).toBe(true);
    expect(S.items.jcy).toBe(3);
  });

  it('悬赏冷却后再揭、再交能领新一回的钱，新旧凭据不同', () => {
    const def = jobById('xsb_xunren')!;
    const 起初 = S.silver;                      // 起手钱已改成 250（#547），一律按本例起始值算
    worldAct('xsb_zhuren', '揭寻人'); S.flags.xsb_xr_found = true;
    worldAct('xsb_zhuren', '交寻人');
    const first = S.log.find(e => e.verb === '交寻人')!;
    expect(S.silver).toBe(起初 + jobPay(def));
    advanceDays(S, def.again ?? 3);
    expect(jobOpen(S, def.id)).toBe(true);
    worldAct('xsb_zhuren', '揭寻人'); S.flags.xsb_xr_found = true;
    expect(verbPlan('xsb_zhuren', '交寻人').ok).toBe(true);
    worldAct('xsb_zhuren', '交寻人');
    expect(S.silver).toBe(起初 + jobPay(def) * 2); expect(S.job).toBeNull();
    expect(S.log.at(-1)?.key).not.toBe(first.key);
  });

  it('零工第二天重新开工，昨天的凭据不拦今天的工钱', () => {
    S.min = 7 * 60;
    const day = dayNo(S);
    const 起初 = S.silver;                      // 同上：按本例起始值算
    worldAct('lg_batou', '扛包');
    const first = S.log.at(-1)!;
    expect(S.silver).toBe(起初 + 60);
    worldAct('lg_batou', '扛包'); expect(S.silver).toBe(起初 + 60);
    advanceDays(S, 1); S.min = 7 * 60;
    expect(dayNo(S)).toBe(day + 1); expect(verbPlan('lg_batou', '扛包').ok).toBe(true);
    worldAct('lg_batou', '扛包');
    expect(S.silver).toBe(起初 + 120); expect(S.log.at(-1)?.key).not.toBe(first.key);
  });
});

it('事件记录不重复保存 feed、toast 长文字，但反馈仍然出现', () => {
  const effects: Effect[] = [{ type: 'lilian', amount: 10 }, { type: 'feed', tag: '江湖', text: '看见了一件事。' }, { type: 'toast', text: '长提示。' }];
  const result = act(effectReq('试算', 'yaopu', effects));
  expect(result.ok).toBe(true); expect(result.event?.gain).toEqual([{ type: 'lilian', amount: 10 }]);
  expect(result.gain).toEqual(effects);
  expect(S.feed.some(f => f.x === '看见了一件事。')).toBe(true);
  expect(readSave().state?.log.at(-1)?.gain).toEqual(result.event?.gain);
});
