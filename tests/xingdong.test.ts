import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { absMin, dayNo, setNowMs } from '../src/core/time';
import { KEY, SAVE_VERSION, migrate, readSave, useStore, type SaveStore } from '../src/core/save';
import { SHI, jobById, skillById } from '../src/content';
import type { Effect } from '../src/content/types';
import { act, fightAfterReq, fightCheckpoint, plan, type ActionReq } from '../src/engine/xingdong';
import { gongxianCost, learnCost } from '../src/engine/shicheng';
import { jobPay } from '../src/engine/shenfen';
import { act as worldAct, verbPlan, verbPrice } from '../src/engine/world';
import { viewJianghu } from '../src/ui/views/jianghu';
import { newOutcome } from '../src/engine/dsl';
import { kpMark, kpPick, kpPos } from '../src/engine/kaipian';

class MemStore implements SaveStore {
  data = new Map<string, string>();
  writes = 0;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); if (k === KEY) this.writes++; }
  removeItem(k: string) { this.data.delete(k); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  get length() { return this.data.size; }
}
let mem: MemStore;
beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  mem = new MemStore(); useStore(mem);
});
afterEach(() => { useStore(null); setNowMs(() => Date.now()); });
const request = (effects: Effect[], extra: Partial<ActionReq> = {}): ActionReq =>
  ({ who: 'player', verb: '买', target: 'yaopu', key: 'receipt:1', effects, ...extra });
const buy = (): Effect[] => [{ type: 'silver', delta: -20 }, { type: 'item', id: 'jcy', delta: 1 }, { type: 'time', add: 5 }];

describe('行动：先算后做、资源与凭据', () => {
  it('plan 不改状态、时辰、随机种子、存档；给出的代价等于 act 实扣', () => {
    const before = structuredClone(S), req = request(buy());
    const p = plan(req);
    expect(p).toEqual({ ok: true, cost: [{ type: 'silver', delta: -20 }, { type: 'time', add: 5 }], gain: [{ type: 'item', id: 'jcy', delta: 1 }], minutes: 5 });
    expect(S).toEqual(before); expect(mem.writes).toBe(0);
    const result = act(req);
    expect(result.ok).toBe(true);
    expect(S.silver).toBe(before.silver - 20);
    expect(S.items.jcy).toBe(before.items.jcy + 1);
    expect(absMin(S) - absMin(before)).toBe(p.minutes);
    expect(result.event?.cost).toEqual(p.cost); expect(result.event?.gain).toEqual(p.gain);
    expect(mem.writes).toBe(1);
  });

  for (const [name, effects] of [
    ['钱', [{ type: 'silver', delta: -31 }, { type: 'item', id: 'jcy', delta: 1 }]],
    ['物', [{ type: 'silver', delta: -10 }, { type: 'item', id: 'jcy', delta: -2 }, { type: 'silver', delta: 20 }]],
    ['历练', [{ type: 'silver', delta: -10 }, { type: 'lilian', amount: -356 }, { type: 'item', id: 'jcy', delta: 1 }]],
    ['贡献', [{ type: 'silver', delta: -10 }, { type: 'gongxian', delta: -6 }, { type: 'lilian', amount: 10 }]]
  ] as [string, Effect[]][]) {
    it(`${name}不足：钱、物、历练、贡献、时间和旗标全不动`, () => {
      S.sect = { school: '少林', rank: '记名' }; S.gongxian = { 少林: 5 };
      const req = request([{ type: 'flag', flag: 'should_not_happen' }, ...effects, { type: 'time', add: 120 }]);
      const before = structuredClone(S);
      expect(plan(req).ok).toBe(false); expect(act(req).ok).toBe(false);
      expect(S).toEqual(before); expect(mem.writes).toBe(0);
    });
  }

  it('合计所有扣费，不能各笔够用却透支，也不能用未到手的奖钱预付', () => {
    for (const effects of [
      [{ type: 'silver', delta: -20 }, { type: 'silver', delta: -20 }],
      [{ type: 'silver', delta: 100 }, { type: 'silver', delta: -40 }]
    ] as Effect[][]) {
      const before = structuredClone(S);
      expect(act(request(effects)).ok).toBe(false); expect(S).toEqual(before);
    }
  });

  it('开始条件失败什么也不扣；有奖励没有 key 则拒绝', () => {
    const before = structuredClone(S);
    expect(act(request(buy(), { if: { flag: 'missing' } })).ok).toBe(false);
    expect(act(request(buy(), { key: undefined })).ok).toBe(false);
    expect(S).toEqual(before);
  });

  it('同一凭据连点和存读之后都只结算一次，重试也不再花时间', () => {
    const req = request(buy());
    expect(act(req).ok).toBe(true);
    const after = structuredClone(S);
    expect(act(req).ok).toBe(false); expect(S).toEqual(after); expect(mem.writes).toBe(1);
    setState(readSave().state!);
    expect(act(req).ok).toBe(false);
    expect(S.silver).toBe(after.silver); expect(S.items).toEqual(after.items); expect(S.log).toEqual(after.log);
  });

  it('耗时到达之后条件失效：只退标了可退的费用，不退时间，不给奖励', () => {
    S.min = 8 * 60 + 55;
    const refund: Effect = { type: 'silver', delta: -10 };
    const req = request([refund, { type: 'silver', delta: -5 }, { type: 'time', add: 20 }, { type: 'item', id: 'jcy', delta: 1 }],
      { finish: { hour: { from: 8, to: 9 } }, refundable: [refund] });
    const before = structuredClone(S), result = act(req);
    expect(result.ok).toBe(false); expect(S.silver).toBe(before.silver - 5);
    expect(S.min).toBe(9 * 60 + 15); expect(S.items).toEqual(before.items);
    expect(result.event?.gain).toEqual([]);
    expect(result.event?.cost).toEqual([{ type: 'silver', delta: -5 }, { type: 'time', add: 20 }]);
    expect(result.event?.why).toContain('完成条件'); expect(mem.writes).toBe(1);
    expect(act(req).ok).toBe(false);
  });

  it('没有预付的费用不能标为可退；异常效果不留半笔账或 Outcome', () => {
    const before = structuredClone(S);
    expect(act(request(buy(), { refundable: [{ type: 'silver', delta: -99 }] })).ok).toBe(false);
    // 模拟内容字段坏了，检查已经扣钱、产生剧情 Outcome 之后的回滚。
    const invalid = { type: 'rel', npc: 'liu', value: '点头之交', from: {} } as unknown as Effect;
    const result = act(request([{ type: 'silver', delta: -10 }, { type: 'story', id: 'p_open' }, invalid]));
    expect(result.ok).toBe(false); expect(S).toEqual(before); expect(result.out.story).toBeUndefined(); expect(mem.writes).toBe(0);
  });

  it('跨午夜的 add、set、until 价与实耗一致；不接受 NaN 或负耗时', () => {
    S.min = 1430;
    const req = request([{ type: 'time', add: 20 }, { type: 'time', set: 60 }, { type: 'time', until: 90 }], { key: undefined });
    const before = absMin(S), p = plan(req);
    expect(p.minutes).toBe(100); expect(act(req).ok).toBe(true); expect(absMin(S) - before).toBe(100);
    expect(plan(request([{ type: 'silver', delta: NaN }])).ok).toBe(false);
    expect(plan(request([{ type: 'time', add: -1 }])).ok).toBe(false);
  });
});

describe('连锁与人物入口', () => {
  const chain = (depth: number): ActionReq => ({ who: 'player', verb: `第${depth}层`, effects: [{ type: 'flag', flag: `chain_${depth}` }],
    ...(depth < 5 ? { chains: [chain(depth + 1)] } : {}) });
  it('深度包括根行动共三层，第四层截断，记录来由，根结算只存一次', () => {
    expect(act(chain(1)).ok).toBe(true);
    expect(S.flags.chain_1 && S.flags.chain_2 && S.flags.chain_3).toBe(true);
    expect(S.flags.chain_4).toBeUndefined(); expect(S.flags.chain_5).toBeUndefined();
    expect(S.log.map(e => e.verb)).toEqual(['第1层', '第2层', '第3层', '连锁截断']);
    expect(S.log.map(e => e.cause)).toEqual([undefined, 1, 2, 3]);
    expect(mem.writes).toBe(1);
  });
  it('世事引出的真实嵌套 run 也受三层限制，父事件的所得没有丢', () => {
    const def = SHI[0], steps = def.steps;
    try {
      def.steps = Object.fromEntries(['a', 'b', 'c', 'd'].map((id, i, ids) => [id, { now: id,
        do: [{ type: 'flag', flag: `shi_chain_${id}` } as Effect, ...(i < 3 ? [{ type: 'shi', id: def.id, to: ids[i + 1] } as Effect] : [])] }]));
      expect(act(request([{ type: 'shi', id: def.id, to: 'a' }], { key: undefined })).ok).toBe(true);
      expect(S.flags.shi_chain_a).toBe(true); expect(S.flags.shi_chain_b).toBe(true);
      expect(S.flags.shi_chain_c).toBeUndefined(); expect(S.flags.shi_chain_d).toBeUndefined();
      expect(S.log.filter(e => e.verb !== '连锁截断')).toHaveLength(3);
      expect(S.log[0].gain).toEqual([{ type: 'shi', id: def.id, to: 'a' }]);
      expect(S.log.at(-1)?.why).toContain('三层'); expect(mem.writes).toBe(1);
    } finally { def.steps = steps; }
  });
  it('一次最多十条效果链，余下不执行并记一次截断', () => {
    const children = Array.from({ length: 20 }, (_, i): ActionReq => ({ who: 'player', verb: `子${i}`, effects: [{ type: 'flag', flag: `child_${i}` }] }));
    act({ who: 'player', verb: '根', chains: children });
    expect(Object.keys(S.flags).filter(k => k.startsWith('child_'))).toHaveLength(9);
    expect(S.log.filter(e => e.verb !== '连锁截断')).toHaveLength(10);
    expect(S.log.at(-1)?.why).toContain('十条'); expect(mem.writes).toBe(1);
  });
  it('大量隐含后续超限只记一笔，不能挤掉父事件导致漏存档', () => {
    const def = SHI[0], steps = def.steps;
    try {
      def.steps = { a: { now: 'a', do: [{ type: 'flag', flag: 'bounded' }] } };
      const effects: Effect[] = Array.from({ length: 350 }, () => ({ type: 'shi', id: def.id, to: 'a' }));
      const result = act(request(effects, { key: 'large:chain' }));
      expect(result.ok).toBe(true); expect(result.event?.key).toBe('large:chain');
      expect(S.log.filter(e => e.verb === '连锁截断')).toHaveLength(1);
      expect(S.log).toHaveLength(11); expect(mem.writes).toBe(1);
      expect(readSave().state?.log).toEqual(S.log);
      expect(act(request(effects, { key: 'large:chain' })).ok).toBe(false);
    } finally { def.steps = steps; }
  });
  it('同 key 的父子不能重领；子条件失败不动它的资源，不丢父行动', () => {
    const child = request([{ type: 'silver', delta: 10 }]);
    expect(act({ ...child, chains: [child] }).ok).toBe(true);
    expect(S.silver).toBe(40); expect(S.log).toHaveLength(1);
    expect(act({ who: 'player', verb: '根', chains: [request(buy(), { key: 'other', if: { flag: 'missing' } })] }).ok).toBe(true);
    expect(S.silver).toBe(40);
  });
  it('人物 id 能走同一入口；不能拿玩家的资源代替人物资源，也不推进玩家时辰', () => {
    const before = structuredClone(S);
    expect(act({ who: 'liu', verb: '等候', effects: [{ type: 'time', add: 30 }] }).ok).toBe(true);
    expect(S.min).toBe(before.min); expect(S.log[0].who).toBe('liu');
    expect(act({ who: 'liu', verb: '买', key: 'npc:buy', effects: buy() }).ok).toBe(false);
    expect(S.silver).toBe(before.silver); expect(S.items).toEqual(before.items);
  });
});

describe('现有交差、买卖、学艺接入', () => {
  it('只给人物与动作的请求也从同一规则算价、算默认耗时；不足时不走免费回绝偷耗时', () => {
    const req: ActionReq = { who: 'player', verb: '购买', target: 'yaopu', key: 'direct:buy' };
    expect(plan(req).cost).toEqual(verbPlan('yaopu', '购买').cost);
    const before = absMin(S);
    expect(act(req).ok).toBe(true); expect(absMin(S) - before).toBe(5);
    S.silver = 19;
    const after = structuredClone(S);
    expect(act({ ...req, key: 'direct:buy:2' }).ok).toBe(false); expect(S).toEqual(after);
  });
  it('观察和根基之眼的后续共用结算，只保存一次，父子都留记录', () => {
    S.quests.main1 = 1; S.attr.体魄 = 30;
    const result = worldAct('tu', '观察');
    expect(result.eyes.some(e => e.attr === '体魄')).toBe(true); expect(S.flags.tu_scar).toBe(true);
    expect(mem.writes).toBe(1); expect(S.log[0].verb).toBe('观察');
    expect(S.log.some(e => e.verb === '观察所得' && e.cause === S.log[0].n)).toBe(true);
  });
  it('真买刀：标价就是实扣，买不起不耗时间，界面灰掉；付得起可以再买', () => {
    S.sel = 'jc_yz_tiejiang'; S.loc = 'jc_yz_yuanmen'; S.silver = 399;
    const before = structuredClone(S);
    expect(verbPrice(S.sel, '买刀')).toBe(400); expect(verbPlan(S.sel, '买刀').ok).toBe(false);
    expect(viewJianghu()).toMatch(/data-act="do:买刀"[^>]*disabled/);
    worldAct(S.sel!, '买刀'); expect(S).toEqual(before);
    S.silver = 1000;
    worldAct('jc_yz_tiejiang', '买刀'); expect(S.silver).toBe(600);
    worldAct('yaopu', '购买'); expect(S.silver).toBe(580);
    worldAct('yaopu', '购买'); expect(S.silver).toBe(560);
    expect(S.log.filter(e => e.verb === '购买')).toHaveLength(2);
    expect(new Set(S.log.map(e => e.key)).size).toBe(S.log.length);
  });
  it('真实典当按买价四成结算；身上最后一件不收，也不记成交', () => {
    S.items.qingfeng = 2;
    const before = S.silver;
    worldAct('jc_yz_chaofeng', '典当', 'qingfeng');
    expect(S.silver).toBeGreaterThan(before); expect(S.items.qingfeng).toBe(1); expect(S.log.at(-1)?.verb).toBe('典当');
    S.gear.weapon = 'qingfeng';
    const after = structuredClone(S);
    worldAct('jc_yz_chaofeng', '典当', 'qingfeng'); expect(S).toEqual(after);
  });
  it('真实悬赏：揭榜、交差记录 key 含揭榜日；复原旧完成旗标也不能重领', () => {
    worldAct('xsb_zhuren', '揭河贼');
    const accepted = dayNo(S), j = jobById('xs_hezei')!, before = S.silver;
    S.flags.xs_hezei_caught = true;
    worldAct('xsb_zhuren', '交河贼');
    expect(S.silver - before).toBe(jobPay(j)); expect(S.job).toBeNull();
    const event = S.log.find(e => e.verb === '交河贼')!;
    expect(event.key).toBe(`job:xs_hezei:${accepted}`);
    S.job = { id: j.id, due: accepted + j.days }; S.flags.xs_hezei_caught = true;
    const after = structuredClone(S);
    worldAct('xsb_zhuren', '交河贼'); expect(S).toEqual(after);
  });
  it('棋痴学艺的隐含历练只扣一次，盘算等于真实学成消耗', () => {
    S.attr.悟性 = 40; S.lilian = 300;
    const p = verbPlan('qichi', '请教'), before = S.lilian;
    expect(p.ok).toBe(true);
    expect(p.cost.filter(e => e.type === 'lilian')).toEqual([{ type: 'lilian', amount: -250 }]);
    worldAct('qichi', '请教'); expect(S.lilian).toBe(before - 250); expect(S.skills.jinghong).toBeDefined();
    expect(S.log.at(-1)?.cost).toEqual(p.cost);
  });
  it('本门学艺隐含贡献和显式贡献要合计；不足时钱和历练都不扣', () => {
    S.sect = { school: '少林', rank: '外门' };
    S.skills.sl_hunyuan = { r: 3, p: 0 }; S.lilian = 5000;
    const def = skillById('sl_yiwei')!, gx = gongxianCost(def), price = learnCost(def);
    S.gongxian = { 少林: gx };
    const req = request([{ type: 'silver', delta: -1 }, { type: 'gongxian', delta: -1 }, { type: 'learn', skill: def.id }]);
    const before = structuredClone(S);
    expect(act(req).ok).toBe(false); expect(S).toEqual(before);
    S.gongxian.少林++;
    const p = plan(req);
    expect(p.ok).toBe(true); expect(act(req).ok).toBe(true);
    expect(S.gongxian.少林).toBe(0); expect(S.lilian).toBe(before.lilian - price); expect(S.skills.sl_yiwei).toBeDefined();
  });
  it('同一行动的拜师、辞别仍守门规，不能借草稿把叛门者重新教成本门武功', () => {
    S.lilian = 5000; S.pastSects = [{ school: '少林', how: '叛门' }];
    const req = request([{ type: 'silver', delta: -1 }, { type: 'sect', school: '少林', rank: '记名' }, { type: 'learn', skill: 'sl_hunyuan' }]);
    const before = structuredClone(S);
    expect(act(req).ok).toBe(false); expect(S).toEqual(before);
    S.pastSects = []; expect(act(req).ok).toBe(true); expect(S.skills.sl_hunyuan).toBeDefined();
  });
  it('同一场仗的战后结算只成一次；存读防刷新，下一场有新凭据', () => {
    const effects: Effect[] = [{ type: 'silver', delta: 40 }, { type: 'item', id: 'jcy', delta: 1 }, { type: 'story', id: 'p_after1' }];
    const req = fightAfterReq('tu', '96480:1000000000000', effects);
    expect(act(req).ok).toBe(true); const after = structuredClone(S);
    expect(act(req).ok).toBe(false); expect(S).toEqual(after);
    setState(readSave().state!);
    expect(act(req).ok).toBe(false); expect(S.silver).toBe(after.silver); expect(S.items).toEqual(after.items);
    expect(act(fightAfterReq('tu', '96500:1000000000001', effects)).ok).toBe(true);
    expect(S.silver).toBe(after.silver + 40);
  });
  it('战后保存奖励时断点已是下一段，刷新不重新开打', () => {
    setState(newGame()); kpMark(S, { kind: 'fight', id: 'kp_jiading' });
    const effects: Effect[] = [{ type: 'silver', delta: 20 }, { type: 'story', id: 'kp_du_hou' }];
    const req = fightAfterReq('kp_jiading', `${absMin(S)}:1000000000000`, effects);
    expect(act(req, undefined, fightCheckpoint).ok).toBe(true); expect(mem.writes).toBe(1);
    const saved = readSave().state!;
    expect(kpPos(saved)).toEqual({ kind: 'story', id: 'kp_du_hou', i: 0 });
    setState(saved); expect(act(req, undefined, fightCheckpoint).ok).toBe(false); expect(S.silver).toBe(50);
  });
  it('剧情断点和奖励一次存下；断点写入出错时两者一同回滚', () => {
    setState(newGame());
    const before = structuredClone(S), req = request([{ type: 'silver', delta: 10 }]);
    expect(act(req, newOutcome(), () => { throw new Error('断点坏了'); }).ok).toBe(false);
    expect(S).toEqual(before); expect(mem.writes).toBe(0);
    expect(act(req, newOutcome(), out => { kpPick(S, 'p_open', 10, out, 2); }).ok).toBe(true);
    expect(mem.writes).toBe(1); expect(readSave().state?.silver).toBe(before.silver + 10);
    expect(kpPos(readSave().state!)).toEqual({ kind: 'story', id: 'p_open', i: 2 });
  });
});

describe('存档兼容与界面边界', () => {
  it('所有旧档 log 空、不改版本；旧第五版照常买东西', () => {
    const fixtures = import.meta.glob<string>('./fixtures/saves/*.json', { query: '?raw', import: 'default', eager: true });
    for (const raw of Object.values(fixtures)) {
      const state = migrate(JSON.parse(raw));
      expect(state.log).toEqual([]); expect(state.v).toBe(SAVE_VERSION);
    }
    const old = structuredClone(skipToYangzhou()) as Partial<ReturnType<typeof newGame>>;
    delete old.log;
    setState(migrate(old)); expect(S.log).toEqual([]); expect(act(request(buy())).ok).toBe(true);
  });
  it('只留最近三百条，存读事件一致、流水连续；迁移也裁掉超长记录', () => {
    for (let i = 0; i < 302; i++) act({ who: 'player', verb: '等候' });
    expect(S.log).toHaveLength(300); expect(S.log[0].n).toBe(3); expect(S.log.at(-1)?.n).toBe(302);
    expect(readSave().state?.log).toEqual(S.log);
    setState(readSave().state!); act({ who: 'player', verb: '等候' }); expect(S.log.at(-1)?.n).toBe(303);
    expect(migrate({ ...S, log: [...S.log, ...S.log] }).log).toHaveLength(300);
  });
  it('界面和内容没有直接调用 run 或 runStep；两处战后都走协议', () => {
    const files = import.meta.glob<string>('../src/{ui,content}/**/*.ts', { query: '?raw', import: 'default', eager: true });
    expect(Object.keys(files).length).toBeGreaterThan(100);
    for (const [path, raw] of Object.entries(files)) {
      expect(raw, path).not.toMatch(/\b(?:run|runStep)\s*\(/);
      expect(raw, path).not.toMatch(/import\s*\{[^}]*\b(?:run|runStep)\b[^}]*\}\s*from\s*['"][^'"]*\/dsl['"]/);
    }
    const fight = files['../src/ui/fight.ts'];
    expect(fight.match(/settleAction\(/g)).toHaveLength(2);
    expect(fight).toContain('fightAfterReq(c.f.id, c.started');
    expect(fight).toContain('fightAfterReq(C.f.id, C.started');
  });
});
