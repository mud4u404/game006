/**
 * 活的江湖第二版（docs/huo-shijie.md）第一片之 1A：世界有状态。
 * - 同一个种子、同样的操作，世界一字不差（随机归种子）；
 * - 码头的主人是真的：西舵占了码头收二十文，东舵五文；
 * - 慢变：物价、实力慢慢回到本来，物价封顶；
 * - 痕迹：同一种只留最新的，到期擦掉，每处最多两行；
 * - 处境：伤着的不在常待的地方，坐牢的只在府衙大牢，事件打断在处境之前；
 * - 世界相关的五个引擎文件里没有浏览器自带的随机数。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou, worldSeed } from '../src/core/state';
import { advanceDays, dayNo, setNowMs } from '../src/core/time';
import { FACTIONS, NPCS, REGIONS, ROOMS, room } from '../src/content';
import type { ContentPack } from '../src/content/types';
import { run, test } from '../src/engine/dsl';
import { payFare, roomDesc, roomNpcs } from '../src/engine/world';
import { dating, hearsay, moveShi } from '../src/engine/shishi';
import { rollEncounter } from '../src/engine/encounter';
import { jingxiu } from '../src/engine/shiguang';
import { JAIL, initWorld, marksOf, ownerOf, runWorld, stOf, tickWorld, whereNow, worldRng } from '../src/engine/shijie';

const T0 = 1791300000000;
beforeEach(() => {
  setNowMs(() => T0);
  setState(skipToYangzhou());
  S.min = 10 * 60;
});

describe('随机归种子：同一个种子、同样的操作，世界一字不差', () => {
  /** 一串操作：打听、闲话、赶路掷路遇、静修、世界效果、慢变 */
  const play = (): string => {
    setState(skipToYangzhou());
    S.flags.boss = true;
    for (const id of ['chuanfu', 'guanshi', 'liu', 'huagu']) dating(id, id);
    for (let i = 0; i < 6; i++) hearsay();
    for (let i = 0; i < 20; i++) rollEncounter('hu', 'dukou');
    run([{ type: 'w', op: 'price', place: 'cheng', delta: 40 }, { type: 'w', op: 'hurt', npc: 'chuanfu', days: 2 }]);
    moveShi('ss_matou', 'xiduo');
    jingxiu(S, 5);
    tickWorld();
    return JSON.stringify({ w: S.w, feed: S.feed.map(f => f.x), silver: S.silver, gongli: S.gongli });
  };

  it('跑两遍一字不差，种子随机真的取过', () => {
    const a = play(), b = play();
    expect(a).toBe(b);
    expect(S.w.rn).toBeGreaterThan(0);
  });

  it('种子随机：取一回记一回，存档重载以后接着往下取；换个种子就不一样', () => {
    const s = S.w.seed;
    const xs = [worldRng(), worldRng(), worldRng()];
    S.w.rn = 0;
    expect([worldRng(), worldRng(), worldRng()]).toEqual(xs);
    expect(S.w.rn).toBe(3);
    S.w.rn = 0;
    S.w.seed = s + 1;
    expect(worldRng()).not.toBe(xs[0]);
    expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
  });

  it('开局的种子由名字和开局的现实时刻算', () => {
    expect(S.w.seed).toBe(worldSeed('孤舟', T0));
    expect(S.w).toEqual(initWorld(worldSeed('孤舟', T0), 67));
  });
});

describe('码头的主人是真的', () => {
  it('过路钱收在上船那一处：东舵不加，西舵加二十，府衙加十；走进渡口本身不收钱；钱不够的扛一趟货抵了，多耗一个时辰', () => {
    S.silver = 100;
    expect(ownerOf('dukou')).toBe('dong');
    // 路过渡口不收钱（老玩家：每回走进码头都被收，不对）
    expect(payFare('dukou')).toBeNull();
    expect(payFare('cheng')).toBeNull();
    expect(S.silver).toBe(100);
    payFare('gz_kechuan');
    expect(S.silver).toBe(80);
    runWorld({ type: 'w', op: 'owner', place: 'dukou', to: 'xi' });
    payFare('gz_kechuan');
    expect(S.silver).toBe(40);
    expect(S.feed[0].x).toContain('漕帮西舵');
    expect(S.feed[0].x).toContain('过路钱 20 文');
    runWorld({ type: 'w', op: 'owner', place: 'dukou', to: 'guan' });
    payFare('gz_kechuan');
    expect(S.silver).toBe(10);
    // 没人占着的码头：只收二十文船钱，不加过路钱
    runWorld({ type: 'w', op: 'owner', place: 'dukou', to: null });
    S.silver = 100;
    payFare('gz_kechuan');
    expect(S.silver).toBe(80);
    runWorld({ type: 'w', op: 'owner', place: 'dukou', to: 'xi' });
    S.silver = 30;
    const m = S.min;
    payFare('gz_kechuan');
    expect(S.silver).toBe(30);
    expect(S.min).toBe(m + 60);
    // 没有船钱的地方不收
    expect(payFare('cheng')).toBeNull();
  });

  it('「码头空出来以后」的结局写主人，旗标照旧；据点跟着换到新主人名下', () => {
    S.flags.boss = true;
    const hei = S.w.fac.hei.power;
    moveShi('ss_matou', 'qi');
    expect(S.w.fac.hei.power).toBe(hei - 27);
    moveShi('ss_matou', 'xiduo');
    expect(ownerOf('dukou')).toBe('xi');
    expect(S.w.fac.xi.holds).toEqual(['dukou']);
    expect(S.w.fac.dong.holds).toEqual([]);
    expect(test({ w: { owner: { place: 'dukou', is: ['xi'] } } })).toBe(true);
    expect(test({ shi: { id: 'ss_matou', at: ['xiduo'] } })).toBe(true);
    S.silver = 100;
    payFare('gz_kechuan');
    expect(S.silver).toBe(60);
    moveShi('ss_matou', 'tiaoting');
    expect(ownerOf('dukou')).toBe('dong');
    expect(marksOf('dukou').length).toBe(1);
    expect(roomDesc('dukou').endsWith(marksOf('dukou')[0])).toBe(true);
  });
});

describe('慢变：tickWorld 跨过一个江湖日跑一次', () => {
  it('物价抬到一百五，过三十日回落到一百二上下（每日往一百靠三分），再过十日到一百一十五以下；封顶在五十到二百', () => {
    runWorld({ type: 'w', op: 'price', place: 'cheng', delta: 50 });
    expect(S.w.place.cheng.price).toBe(150);
    advanceDays(S, 30);
    tickWorld();
    const p30 = S.w.place.cheng.price;
    expect(p30).toBeLessThan(121);
    expect(p30).toBeGreaterThan(100);
    advanceDays(S, 10);
    tickWorld();
    expect(S.w.place.cheng.price).toBeLessThan(115);
    runWorld({ type: 'w', op: 'price', place: 'cheng', delta: 500 });
    expect(S.w.place.cheng.price).toBe(200);
    runWorld({ type: 'w', op: 'price', place: 'cheng', delta: -500 });
    expect(S.w.place.cheng.price).toBe(50);
  });

  it('实力往本来的数靠，治安也是；同一日反复跑不变；静修十日就补十日', () => {
    runWorld({ type: 'w', op: 'power', fac: 'hei', delta: -27 });
    runWorld({ type: 'w', op: 'order', place: 'dukou', delta: -30 });
    const day0 = S.w.day;
    advanceDays(S, 1);
    tickWorld();
    const once = JSON.stringify(S.w);
    tickWorld();
    expect(JSON.stringify(S.w)).toBe(once);
    expect(S.w.day).toBe(day0 + 1);
    expect(S.w.fac.hei.power).toBeCloseTo(18 + 27 * 0.04, 2);
    advanceDays(S, 29);
    tickWorld();
    expect(S.w.fac.hei.power).toBeGreaterThan(30);
    expect(S.w.fac.hei.power).toBeLessThan(45);
    expect(S.w.place.dukou.order).toBeGreaterThan(40);
    const d = dayNo(S);
    jingxiu(S, 10, () => 0.5);
    expect(S.w.day).toBe(d + 10);
  });

  it('据点养人：占着码头的东舵财力往上走，什么都不占的西舵往下走', () => {
    const dong = S.w.fac.dong.wealth, xi = S.w.fac.xi.wealth;
    advanceDays(S, 5);
    tickWorld();
    expect(S.w.fac.dong.wealth).toBe(dong + 5);
    expect(S.w.fac.xi.wealth).toBe(xi - 5);
  });
});

describe('痕迹：写进地点描写底下的一句', () => {
  const mark = (k: string, text: string, days = 5): void => { run([{ type: 'w', op: 'mark', place: 'cheng', k, text, days }]); };

  it('同一种只留最新的；每处最多两行，新的在前；到期擦掉；接在描写后头', () => {
    mark('a', '甲一。');
    mark('a', '甲二。');
    expect(marksOf('cheng')).toEqual(['甲二。']);
    mark('b', '乙。', 2);
    mark('c', '丙。', 3);
    expect(marksOf('cheng')).toEqual(['丙。', '乙。']);
    expect(S.w.place.cheng.marks.length).toBe(2);
    expect(roomDesc('cheng').endsWith('丙。乙。')).toBe(true);
    advanceDays(S, 2);
    // 不等慢变跑，过了期的也不显示
    expect(marksOf('cheng')).toEqual(['丙。']);
    tickWorld();
    expect(S.w.place.cheng.marks.map(m => m.k)).toEqual(['c']);
    advanceDays(S, 1);
    tickWorld();
    expect(marksOf('cheng')).toEqual([]);
  });

  it('没有写活气的地方也留得下痕迹', () => {
    run([{ type: 'w', op: 'mark', place: 'hu', k: 'x', text: '湖边的柳树叫人砍了一棵。', days: 3 }]);
    expect(roomDesc('hu').endsWith('湖边的柳树叫人砍了一棵。')).toBe(true);
  });
});

describe('处境：人此刻在哪，世界先定，作息在后', () => {
  const everywhere = (id: string): string[] => ROOMS.filter(r => roomNpcs(r.id).includes(id)).map(r => r.id);

  it('船夫白天在渡口；挨了打的那几日哪儿都不在，渡口底下补一句交代；伤好了回来', () => {
    expect(everywhere('chuanfu')).toEqual(['dukou']);
    run([{ type: 'w', op: 'hurt', npc: 'chuanfu', days: 3, mark: { place: 'dukou', text: '缆桩边那只破烟锅还搁着，船夫这几日没来。' } }]);
    expect(stOf('chuanfu')).toBe('hurt');
    expect(test({ w: { p: { id: 'chuanfu', st: ['hurt'] } } })).toBe(true);
    expect(everywhere('chuanfu')).toEqual([]);
    expect(roomDesc('dukou')).toContain('船夫这几日没来');
    advanceDays(S, 2);
    tickWorld();
    expect(everywhere('chuanfu')).toEqual([]);
    advanceDays(S, 1);
    tickWorld();
    expect(stOf('chuanfu')).toBe('ok');
    expect(everywhere('chuanfu')).toEqual(['dukou']);
    expect(roomDesc('dukou')).not.toContain('船夫这几日没来');
    expect(S.w.ppl.chuanfu).toBeUndefined();
  });

  it('下了牢的只在府衙大牢，放出来才回去', () => {
    expect(room(JAIL).name).toBe('府衙大牢');
    run([{ type: 'w', op: 'jail', npc: 'chuanfu' }]);
    expect(everywhere('chuanfu')).toEqual([JAIL]);
    S.min = 23 * 60;
    expect(everywhere('chuanfu')).toEqual([JAIL]);
    S.min = 10 * 60;
    advanceDays(S, 40);
    tickWorld();
    expect(everywhere('chuanfu')).toEqual([JAIL]);
    run([{ type: 'w', op: 'free', npc: 'chuanfu' }]);
    expect(everywhere('chuanfu')).toEqual(['dukou']);
  });

  it('事件打断在处境之前：叫到别处的，那几日在那里（只在那个时段）；打断过了，再看处境', () => {
    const today = dayNo(S);
    S.w.ppl.chuanfu = { st: 'hurt', until: today + 5, at: { room: 'cheng', slot: 'day', until: today + 2 } };
    expect(whereNow('chuanfu')).toBe('cheng');
    expect(everywhere('chuanfu')).toEqual(['cheng']);
    S.min = 22 * 60;
    expect(everywhere('chuanfu')).toEqual([]);
    S.min = 10 * 60;
    advanceDays(S, 2);
    tickWorld();
    expect(S.w.ppl.chuanfu.at).toBeUndefined();
    expect(everywhere('chuanfu')).toEqual([]);
    run([{ type: 'w', op: 'gone', npc: 'chuanfu', days: 1 }]);
    expect(stOf('chuanfu')).toBe('gone');
    expect(everywhere('chuanfu')).toEqual([]);
  });

  it('世界的条件：主人、治安、物价、势力的实力和对你的账', () => {
    expect(test({ w: { owner: { place: 'dukou', is: ['dong'] } } })).toBe(true);
    expect(test({ w: { owner: { place: 'yz_chuanwu', is: [null] } } })).toBe(true);
    expect(test({ w: { order: { place: 'dukou', atLeast: 50 } } })).toBe(true);
    expect(test({ w: { order: { place: 'dukou', below: 50 } } })).toBe(false);
    run([{ type: 'w', op: 'price', place: 'dukou', delta: 30 }, { type: 'w', op: 'you', fac: 'xi', delta: -20 }]);
    expect(test({ w: { price: { place: 'dukou', atLeast: 130 } } })).toBe(true);
    expect(test({ w: { fac: { id: 'xi', you: { below: -10 }, power: { atLeast: 50 } } } })).toBe(true);
    expect(test({ w: { fac: { id: 'xi', you: { atLeast: 0 } } } })).toBe(false);
  });
});

describe('内容：势力和地方的活气', () => {
  const PACKS = import.meta.glob<{ default: ContentPack }>('../src/content/packs/*.ts', { eager: true });
  const roomIds = new Set(ROOMS.map(r => r.id)), npcIds = new Set(NPCS.map(n => n.id)), facIds = new Set(FACTIONS.map(f => f.id));

  it('扬州六股势力：首领是真有的人，据点和地方的主人对得上，好恶指向真有的势力', () => {
    const errs: string[] = [];
    expect(FACTIONS.filter(f => f.region === 'yz').length).toBe(6);
    for (const f of FACTIONS) {
      if (!npcIds.has(f.head)) errs.push(`势力「${f.name}」的首领「${f.head}」不存在`);
      if (!REGIONS[f.region]) errs.push(`势力「${f.name}」的地区「${f.region}」不存在`);
      for (const h of f.holds ?? []) if (room(h).life?.owner !== f.id) errs.push(`势力「${f.name}」占着「${h}」，那处地方的 life.owner 却不是它`);
      for (const k of Object.keys(f.rel ?? {})) if (!facIds.has(k)) errs.push(`势力「${f.name}」的好恶里「${k}」不存在`);
      if (![f.power, f.wealth].every(x => x >= 0 && x <= 100)) errs.push(`势力「${f.name}」的实力、财力要在零到一百`);
    }
    for (const r of ROOMS.filter(x => x.life)) {
      const l = r.life!;
      if (l.owner && !facIds.has(l.owner)) errs.push(`地点「${r.id}」的主人「${l.owner}」不存在`);
      if (l.owner && !FACTIONS.find(f => f.id === l.owner)?.holds?.includes(r.id)) errs.push(`地点「${r.id}」归「${l.owner}」，势力的 holds 里却没写`);
      for (const k of Object.keys(l.toll ?? {})) if (!facIds.has(k)) errs.push(`地点「${r.id}」的过路钱表里「${k}」不是势力`);
      if (!l.tags.length) errs.push(`地点「${r.id}」的 life 要写 tags`);
    }
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
  });

  it('内容包给别的地点补活气：地点都要存在，扬州十处', () => {
    const errs: string[] = [];
    for (const [file, mod] of Object.entries(PACKS)) for (const id of Object.keys(mod.default.roomLife ?? {})) if (!roomIds.has(id)) errs.push(`${file}：roomLife 里的地点「${id}」不存在`);
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
    expect(ROOMS.filter(r => r.region === 'yz' && r.life).length).toBe(10);
    expect(room('dukou').life?.toll).toBeUndefined();
    expect(room('gz_kechuan').life?.tollAt).toBe('dukou');
    expect(room('gz_kechuan').life?.toll).toEqual({ dong: 0, xi: 20, guan: 10 });
  });
});

describe('世界相关的引擎文件里，随机全出自种子', () => {
  const SRC = import.meta.glob<string>('../src/engine/{shishi,shiguang,encounter,world,shijie}.ts', { query: '?raw', import: 'default', eager: true });

  it('五个文件都在，没有一处用浏览器自带的随机数，也不从 core/util 拿 pick、rnd', () => {
    expect(Object.keys(SRC).length).toBe(5);
    for (const [file, src] of Object.entries(SRC)) {
      expect(src.includes('Math.random'), `${file} 用了 Math.random，换成 engine/shijie.ts 的 worldRng`).toBe(false);
      expect(/import\s*\{[^}]*\b(pick|rnd)\b[^}]*\}\s*from\s*'\.\.\/core\/util'/.test(src), `${file} 从 core/util 拿了 pick 或 rnd，换成 worldPick`).toBe(false);
    }
  });
});
