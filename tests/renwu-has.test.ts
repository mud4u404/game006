import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { npc } from '../src/content';
import type { Effect, NpcDef } from '../src/content/types';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { dayNo, setNowMs } from '../src/core/time';
import { migrate, readSave, useStore, type SaveStore } from '../src/core/save';
import { applyWorld, changeHas, dayPass, hasOf, refuseOf, tracksHas, wantOf } from '../src/engine/shijie';
import { act, effectReq, plan, type ActionReq } from '../src/engine/xingdong';
import { act as worldAct, verbPlan } from '../src/engine/world';
import { viewJianghu } from '../src/ui/views/jianghu';

class MemStore implements SaveStore {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  get length() { return this.data.size; }
}
const chu = npc('kp_chu')!, shop = npc('yaopu')!;
let life: NpcDef['life'], actions: NpcDef['actions'], shopLife: NpcDef['life'], mem: MemStore;
beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
  life = chu.life; actions = chu.actions; shopLife = shop.life;
  chu.life = { ...chu.life!, has: { silver: 6, flower: 1 }, refuse: [] };
  S.loc = 'dukou'; S.min = 22 * 60;
  S.flags.kp_xin = true; S.flags.kp_du = true;
  S.quests.prologue = 3;
  mem = new MemStore(); useStore(mem);
});
afterEach(() => {
  chu.life = life; chu.actions = actions; shop.life = shopLife;
  useStore(null); setNowMs(() => Date.now());
});
const request = (effects: Effect[], extra: Partial<ActionReq> = {}): ActionReq =>
  ({ ...effectReq('相助', chu.id, effects), ...extra });

describe('诉求和底线', () => {
  it('改变处境挑另一条诉求，未配置人物不虚构诉求或底线', () => {
    chu.life!.want = [
      { k: 'hurt', text: '养好伤', if: { w: { p: { id: chu.id, st: ['hurt'] } } } },
      { k: 'work', text: '找一份活' }
    ];
    expect(wantOf(chu.id)?.k).toBe('work');
    S.w.ppl[chu.id] = { st: 'hurt' };
    expect(wantOf(chu.id)?.k).toBe('hurt');
    expect(wantOf('不存在')).toBeUndefined();
    expect(refuseOf('不存在', '交谈')).toBeUndefined();
  });

  it('底线在协议和世界入口都拦住，钱物、时辰、记录和存档全不动', () => {
    chu.life!.refuse = [{ verb: '*', why: '他不肯收。' }];
    const before = structuredClone(S);
    expect(plan(request([{ type: 'silver', delta: -2 }]))).toMatchObject({ ok: false, why: '他不肯收。' });
    expect(act(request([{ type: 'silver', delta: -2 }])).ok).toBe(false);
    expect(worldAct(chu.id, '赠礼', 'huadiao').text).toBe('他不肯收。');
    expect(S).toEqual(before); expect(mem.data.size).toBe(0);
  });

  it('动作匹配及条件拒绝，NPC 自己行动同样检查底线', () => {
    chu.life!.refuse = [{ verb: '赠礼', if: { flag: 'refuse_now' }, why: '他不肯收。' }];
    expect(refuseOf(chu.id, '赠礼')).toBeUndefined();
    S.flags.refuse_now = true;
    expect(refuseOf(chu.id, '交谈')).toBeUndefined();
    expect(plan({ who: chu.id, verb: '赠礼', effects: [] })).toMatchObject({ ok: false, why: '他不肯收。' });
  });

  it('熟人详情展示诉求，陌生人不展示；灰按钮展示真正的拒绝原因', () => {
    chu.life!.want = [{ k: 'work', text: '找一份活' }];
    chu.life!.refuse = [{ verb: '交谈', why: '他眼下不愿开口。' }];
    S.sel = chu.id;
    S.rel[chu.id] = '素不相识';
    expect(viewJianghu()).not.toContain('他眼下想找一份活');
    S.rel[chu.id] = '相谈甚欢';
    const html = viewJianghu();
    expect(html).toContain('他眼下想找一份活。');
    expect(html).toMatch(/data-act="do:交谈"[^>]*disabled/);
    expect(html).toContain('他眼下不愿开口。');
  });
});

describe('钱物的来处去处', () => {
  it('计划只读；仅有的一样东西交出后再要失败，读档也交不出', () => {
    const before = structuredClone(S), req = request([{ type: 'item', id: 'flower', delta: 1 }]);
    expect(plan(req).ok).toBe(true); expect(S).toEqual(before); expect(mem.data.size).toBe(0);
    expect(act(req).ok).toBe(true);
    expect(hasOf(chu.id).flower).toBe(0);
    expect(S.log.at(-1)?.holds).toEqual([{ who: chu.id, delta: { flower: -1 } }]);
    setState(readSave().state!);
    const after = structuredClone(S);
    const next = request([{ type: 'item', id: 'flower', delta: 1 }]);
    expect(plan(next)).toMatchObject({ ok: false, why: '他手里没有' });
    expect(act(next).ok).toBe(false); expect(S).toEqual(after);
  });

  it('给钱从人物手里扣；支付和赠礼进入持有，NPC 能用自己的钱物', () => {
    expect(act(request([{ type: 'silver', delta: 6 }])).ok).toBe(true);
    expect(hasOf(chu.id).silver).toBe(0);
    expect(act(request([{ type: 'silver', delta: 1 }])).why).toBe('他手里没有');
    expect(act(request([{ type: 'silver', delta: -8 }])).ok).toBe(true);
    S.items.huadiao = 1;
    expect(worldAct(chu.id, '赠礼', 'huadiao').text).toContain('褚七接过');
    expect(hasOf(chu.id)).toMatchObject({ silver: 8, huadiao: 1 });
    const player = { silver: S.silver, items: structuredClone(S.items), min: S.min };
    const buy: ActionReq = { who: chu.id, verb: '采购', target: 'yaopu', key: 'npc:buy:1',
      effects: [{ type: 'silver', delta: -8 }, { type: 'item', id: 'jcy', delta: 1 }, { type: 'time', add: 10 }] };
    expect(act(buy).ok).toBe(true);
    expect(hasOf(chu.id)).toMatchObject({ silver: 0, jcy: 1 });
    expect({ silver: S.silver, items: S.items, min: S.min }).toEqual(player);
    const after = structuredClone(S);
    expect(act({ ...buy, key: 'npc:buy:2' }).ok).toBe(false); expect(S).toEqual(after);
  });

  it('合计多个物品和银钱效果，不能每笔够、合起来透支', () => {
    for (const effects of [
      [{ type: 'item', id: 'flower', delta: 1 }, { type: 'item', id: 'flower', delta: 1 }],
      [{ type: 'silver', delta: 4 }, { type: 'silver', delta: 4 }]
    ] as Effect[][]) {
      const before = structuredClone(S);
      expect(act(request(effects)).why).toBe('他手里没有'); expect(S).toEqual(before);
    }
  });

  it('人物购买分支的银钱门槛读本人，不随玩家的贫富变化', () => {
    changeHas(chu.id, 'silver', 24);
    S.silver = 0;
    const req: ActionReq = { who: chu.id, verb: '购买', target: 'yaopu', key: 'npc:shop:1' };
    const before = structuredClone(S);
    expect(plan(req).ok).toBe(true); expect(S).toEqual(before);
    expect(act(req).ok).toBe(true);
    expect(hasOf(chu.id)).toMatchObject({ silver: 10, jcy: 1 });
    expect(S.silver).toBe(0); expect(S.items).toEqual(before.items); expect(S.min).toBe(before.min);
    S.silver = 1000;
    expect(act({ ...req, key: 'npc:shop:2' }).ok).toBe(false);
  });

  it('人物持有的物品上限与实际所得一致，不能拿玩家行囊算上限', () => {
    S.items.jcy = 10;
    const req: ActionReq = { who: chu.id, verb: '收物', key: 'npc:max:1', effects: [{ type: 'item', id: 'jcy', delta: 3, max: 1 }] };
    expect(plan(req).gain).toEqual([{ type: 'item', id: 'jcy', delta: 1, max: 1 }]);
    expect(act(req).ok).toBe(true); expect(hasOf(chu.id).jcy).toBe(1); expect(S.items.jcy).toBe(10);
    expect(act({ ...req, key: 'npc:max:2' }).gain).toEqual([{ type: 'item', id: 'jcy', delta: 0, max: 1 }]);
    expect(hasOf(chu.id).jcy).toBe(1);
  });

  it('物品上限只扣实际交出的份数，零份不消耗人物持有', () => {
    S.items.flower = 1;
    expect(act(request([{ type: 'item', id: 'flower', delta: 3, max: 1 }])).ok).toBe(true);
    expect(hasOf(chu.id).flower).toBe(1);
    S.items.flower = 0;
    expect(act(request([{ type: 'item', id: 'flower', delta: 3, max: 1 }])).ok).toBe(true);
    expect(hasOf(chu.id).flower).toBe(0); expect(S.items.flower).toBe(1);
  });

  it('后续行动不能再交出父行动已经给出的同一物件', () => {
    const req = request([{ type: 'item', id: 'flower', delta: 1 }], { key: 'parent:flower',
      chains: [request([{ type: 'item', id: 'flower', delta: 1 }], { key: 'child:flower' })] });
    expect(act(req).ok).toBe(true);
    expect(S.items.flower).toBe(1); expect(hasOf(chu.id).flower).toBe(0);
    expect(S.log).toHaveLength(1);
  });

  it('失败按约定退费，人物也退回实收部分；异常结算全部回滚', () => {
    S.min = 8 * 60 + 55;
    const fee: Effect = { type: 'silver', delta: -2 };
    const req = request([fee, { type: 'silver', delta: -1 }, { type: 'time', add: 10 }, { type: 'item', id: 'flower', delta: 1 }],
      { finish: { hour: { from: 8, to: 9 } }, refundable: [fee] });
    expect(act(req).ok).toBe(false);
    expect(hasOf(chu.id)).toMatchObject({ silver: 7, flower: 1 });
    expect(S.log.at(-1)?.holds).toEqual([{ who: chu.id, delta: { silver: 1 } }]);
    const before = structuredClone(S);
    const bad = { type: 'rel', npc: chu.id, value: '点头之交', from: {} } as unknown as Effect;
    expect(act(request([{ type: 'item', id: 'flower', delta: 1 }, bad])).ok).toBe(false);
    expect(S).toEqual(before);
  });

  it('开店的不按人物私人物品收货；空持有与未配置旧内容分开', () => {
    shop.life = { ...chu.life!, has: {} };
    expect(act({ ...effectReq('购买', shop.id, [{ type: 'item', id: 'jcy', delta: 1 }]) }).ok).toBe(true);
    chu.life!.has = {};
    expect(act(request([{ type: 'item', id: 'flower', delta: 1 }])).why).toBe('他手里没有');
    delete chu.life!.has;
    expect(tracksHas(chu.id)).toBe(false);
    expect(act(request([{ type: 'item', id: 'flower', delta: 1 }])).ok).toBe(true);
    S.w.ppl[chu.id] = { has: {} };
    expect(act(request([{ type: 'item', id: 'flower', delta: 1 }])).why).toBe('他手里没有');
    changeHas(chu.id, 'silver', 2); changeHas(chu.id, 'silver', -2);
    expect(tracksHas(chu.id)).toBe(true);
  });

  it('全局预览与灰按钮反映缺货，既有交谈依然能推进', () => {
    chu.actions = { ...chu.actions, 交谈: [{ text: '交出花。', do: [{ type: 'silver', delta: -2 }, { type: 'item', id: 'flower', delta: 2 }] }] };
    S.sel = chu.id;
    expect(verbPlan(chu.id, '交谈').why).toBe('他手里没有');
    expect(viewJianghu()).toContain('他手里没有');
    const before = structuredClone(S);
    expect(worldAct(chu.id, '交谈').text).toBe('他手里没有');
    expect(S).toEqual(before);
  });
});

describe('持有与世界、存档', () => {
  it('持有只存偏离开局的键；伤病、离开、坐牢、获释和死亡不丢持有', () => {
    changeHas(chu.id, 'silver', -6);
    changeHas(chu.id, 'huadiao', 1);
    const expectHas = (): void => { expect(hasOf(chu.id)).toMatchObject({ silver: 0, huadiao: 1, flower: 1 }); };
    expect(S.w.ppl[chu.id].has).toEqual({ silver: 0, huadiao: 1 });
    for (const op of ['hurt', 'gone', 'jail'] as const) {
      applyWorld(S.w, { type: 'w', op, npc: chu.id, days: 1 }, dayNo(S)); expectHas();
      applyWorld(S.w, { type: 'w', op: 'free', npc: chu.id }, dayNo(S)); expectHas();
    }
    dayPass(S.w); expectHas();
    applyWorld(S.w, { type: 'w', op: 'dead', npc: chu.id }, dayNo(S)); expectHas();
    changeHas(chu.id, 'silver', 6); changeHas(chu.id, 'huadiao', -1);
    expect(S.w.ppl[chu.id].has).toBeUndefined();
  });

  it('旧档缺持有读默认值；新档的零库存、传闻和其他世界事实不丢', () => {
    const old = migrate(structuredClone(S));
    expect(hasOf(chu.id, old).flower).toBe(1);
    S.w.ppl[chu.id] = { has: { flower: 0, silver: 0 }, know: [['test', 0, dayNo(S)]], st: 'gone' };
    const next = migrate(structuredClone(S));
    expect(next.v).toBe(old.v);
    expect(next.w.ppl[chu.id]).toEqual(S.w.ppl[chu.id]);
    const malformed = structuredClone(S);
    malformed.w.ppl[chu.id].has = { flower: -4, silver: NaN };
    expect(migrate(malformed).w.ppl[chu.id].has).toEqual({ flower: 0, silver: 0 });
  });
});
