/**
 * 活的江湖第二版（docs/huo-shijie.md）第一片之 1A：世界有状态。
 * - 同一个种子、同样的操作，世界一字不差（随机归种子）；
 * - 码头的主人是真的：西舵占了码头收二十文，东舵五文；
 * - 慢变：物价、实力慢慢回到本来，物价封顶；
 * - 痕迹：同一种只留最新的，到期擦掉，每处最多两行；
 * - 处境：伤着的不在常待的地方，坐牢的只在府衙大牢，事件打断在处境之前；
 * - 世界相关的六个引擎文件里没有浏览器自带的随机数。
 * 1B 话有来处（engine/chuanwen.ts）：
 * - K1 各有见闻：渡口船夫和药铺掌柜知道的事，重合不过五成；
 * - K2 话有来处：回到扬州问一圈枢纽人物，答话有来处的八成以上，外地事不过一成半，冷场不过两成；
 * - K9 邸报说真话：有传闻的局面，邸报每一条都核对得上来处；没传闻的局面，邸报一条不写；
 * - 传播的规律：嘴碎的传得多、走样只升不降、不耸动的事到日子就忘、外地事只经跑码头的人；
 * - 打听：关系管说多少、当事人说「我」、听来的说听谁说的、没新鲜事说自己的日子、一人一日一回、盘问不受限。
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
import { JAIL, initWorld, marksOf, ownerOf, runWorld, stOf, tickWorld, whereNow, worldOf, worldRng } from '../src/engine/shijie';
import { NEWS, SHI, npc, shiById } from '../src/content';
import type { Branch, Cond, NewsDef, NpcLife } from '../src/content/types';
import { tickShi } from '../src/engine/shishi';
import { ask, learn, lifeOf, newsId, panwen, regionOf, roomsOf, spreadDay, type RumorInst } from '../src/engine/chuanwen';
import { REL_DOWN } from '../src/engine/renqing';

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
    // 处境清干净了；他知道的传闻（know，engine/chuanwen.ts）照样住在这里，不算处境
    expect(S.w.ppl.chuanfu?.st).toBeUndefined();
    expect(S.w.ppl.chuanfu?.until).toBeUndefined();
    expect(S.w.ppl.chuanfu?.at).toBeUndefined();
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
  const SRC = import.meta.glob<string>('../src/engine/{shishi,shiguang,encounter,world,shijie,chuanwen}.ts', { query: '?raw', import: 'default', eager: true });

  it('六个文件都在，没有一处用浏览器自带的随机数，也不从 core/util 拿 pick、rnd', () => {
    expect(Object.keys(SRC).length).toBe(6);
    for (const [file, src] of Object.entries(SRC)) {
      expect(src.includes('Math.random'), `${file} 用了 Math.random，换成 engine/shijie.ts 的 worldRng`).toBe(false);
      expect(/import\s*\{[^}]*\b(pick|rnd)\b[^}]*\}\s*from\s*'\.\.\/core\/util'/.test(src), `${file} 从 core/util 拿了 pick 或 rnd，换成 worldPick`).toBe(false);
    }
  });
});

/* ---------- 1B 话有来处（engine/chuanwen.ts） ---------- */

/** 七个枢纽人物（packs/yz-ren.ts） */
const HUBS = ['shuoshu', 'bs2_bao', 'chuanfu', 'ss_gengfu', 'fuya_zhou', 'yaopu', 'xiaoer'];
const knowIds = (id: string): string[] => (S.w.ppl[id]?.know ?? []).map(k => k[0]);
/** 测试用的一条传闻：借世事里真有的一步取文字 */
const rid = (ev: string, ph: string, juice: number, day = dayNo(S), extra: Partial<RumorInst> = {}): string => {
  const id = `${ev}.${ph}.t${day}.${juice}`;
  S.w.rumor[id] = { id, ev, ph, day, place: '', juice, subj: [], ...extra };
  return id;
};

/**
 * 一个扬州的江湖：屠千山倒了，玩家在扬州待两日（听说码头、闹贼起了头），再去瓜洲二十八日：
 * 事情照走，后来的话玩家没听到。逐日 江湖往前走 → 世事往前走
 */
function town(t0: number): void {
  setNowMs(() => t0);
  setState(skipToYangzhou());
  S.flags.boss = true;
  S.quests.main1 = 3;
  S.track = '';
  S.loc = 'cheng';
  S.min = 10 * 60;
  const day = (): void => { advanceDays(S, 1); tickWorld(); tickShi(); };
  tickWorld(); tickShi();
  for (let i = 0; i < 2; i++) day();
  S.loc = 'gz_town';
  for (let i = 0; i < 28; i++) day();
}
const SEEDS6 = [0, 1, 2, 3, 4, 5].map(i => T0 + i * 7_777_777);

describe('话有来处：K1 各有见闻、K2 问一圈话有来处、同一种子一字不差', () => {
  it('K1：渡口船夫和药铺掌柜知道的事重合不过五成（六个种子的均值）', () => {
    const js = SEEDS6.map(t => {
      town(t);
      const a = new Set(knowIds('chuanfu')), b = new Set(knowIds('yaopu'));
      const inter = [...a].filter(x => b.has(x)).length, uni = new Set([...a, ...b]).size;
      return uni ? inter / uni : 0;
    });
    const mean = js.reduce((x, y) => x + y, 0) / js.length;
    console.log(`K1 船夫 × 药铺掌柜 Jaccard：${js.map(x => x.toFixed(2)).join(' ')}，均值 ${mean.toFixed(2)}`);
    expect(mean).toBeLessThanOrEqual(0.5);
  });

  it('K2：回到扬州把七个枢纽各问一遍：话有来处八成以上，外地事不过一成半，冷场不过两成', () => {
    let n = 0, src = 0, far = 0, cold = 0, fresh = 0;
    for (const t of SEEDS6) {
      town(t);
      S.loc = 'cheng';
      for (const id of HUBS) {
        const r = ask(id);
        n++;
        if (r.src === 'none') cold++;
        if (r.far) far++;
        if (r.src === 'idle') { src++; continue; }
        if (r.src !== 'know') continue;
        fresh++;
        // 有来处：说得出听谁说的、事发在他常待的地方、牵涉他或他的帮、他是那一带的枢纽（说书、叫化）
        const ru = S.w.rumor[r.rumor!], life = lifeOf(id)!;
        const ok = !!r.from || roomsOf(id).includes(ru.place) || ru.subj.includes(id) || (!!life.faction && ru.subj.includes(life.faction))
          || ['说书', '叫化'].includes(life.trade);
        if (ok) src++;
      }
    }
    const line = `K2 问了 ${n} 句：话有来处 ${(src / n * 100).toFixed(0)}%，说的是新事 ${(fresh / n * 100).toFixed(0)}%，外地事 ${(far / n * 100).toFixed(0)}%，冷场 ${(cold / n * 100).toFixed(0)}%`;
    console.log(line);
    expect(src / n, line).toBeGreaterThanOrEqual(0.8);
    expect(far / n, line).toBeLessThanOrEqual(0.15);
    expect(cold / n, line).toBeLessThanOrEqual(0.2);
  });

  it('同一个种子跑两遍，传闻和人知道的事一字不差；换个种子就不一样', () => {
    const snap = (): string => JSON.stringify({ rumor: S.w.rumor, ppl: S.w.ppl });
    town(T0);
    const a = snap();
    town(T0);
    expect(snap()).toBe(a);
    expect(Object.keys(S.w.rumor).length).toBeGreaterThan(5);
    town(T0 + 1);
    expect(snap()).not.toBe(a);
  });

  it('性能：屠千山倒了以后的扬州，逐日跑六十日，传闻不拖慢（五百毫秒以内）', () => {
    setState(skipToYangzhou());
    S.flags.boss = true;
    tickShi();
    const t = performance.now();
    for (let i = 0; i < 60; i++) { advanceDays(S, 1); tickWorld(); tickShi(); }
    const ms = performance.now() - t;
    console.log(`六十日 ${ms.toFixed(0)} 毫秒，传闻 ${Object.keys(S.w.rumor).length} 条，存档里的世界 ${(JSON.stringify(S.w).length / 1024).toFixed(1)} KB`);
    expect(ms).toBeLessThan(500);
  });
});

describe('话有来处：K9 出关邸报说真话', () => {
  const stepRank = (ev: string, step: string): number => {
    const d = shiById(ev)!, chain: string[] = [];
    for (let k: string | undefined = d.first; k && !chain.includes(k); k = d.steps[k]?.next?.to) chain.push(k);
    return chain.includes(step) ? chain.indexOf(step) : chain.length;
  };

  it('有传闻的局面（扬州里有事、熟人知道事）：静修十日，邸报每一条都核对得上来处', () => {
    let lines = 0;
    for (const t of SEEDS6) {
      town(t);
      S.loc = 'cheng';
      S.rel.chuanfu = '点头之交';
      S.rel.xiaoer = '相谈甚欢';
      const r = jingxiu(S, 10, () => 0.5);
      expect(r.news.length).toBeGreaterThan(0);
      expect(r.news.length).toBeLessThanOrEqual(5);
      expect(r.newsSrc!.length).toBe(r.news.length);
      for (const src of r.newsSrc!) {
        lines++;
        if (src.kind === 'shi') expect(stepRank(src.id, S.shi![src.id].seen!)).toBeGreaterThanOrEqual(stepRank(src.id, src.ph));
        else if (src.kind === 'rumor') {
          expect(S.w.rumor[src.id]).toBeTruthy();
          expect(regionOf(S.w.rumor[src.id])).toBe('yz');
        } else {
          expect(S.rel[src.npc]).toBeTruthy();
          expect(knowIds(src.npc)).toContain(src.id);
        }
      }
    }
    console.log(`K9 有传闻的局面：六局邸报共 ${lines} 条，条条核对得上来处`);
  });

  it('没传闻的局面（去一个没起事的地区、熟人只剩瓜洲的街坊、他们知道的清空）：邸报一条不写', () => {
    for (const t of SEEDS6.slice(0, 3)) {
      town(t);
      S.loc = 'sz_changmen';
      for (const id of Object.keys(S.rel)) if (roomsOf(id).some(r => room(r).region === 'yz')) delete S.rel[id];
      for (const id of Object.keys(S.rel)) delete S.w.ppl[id]?.know;
      const r = jingxiu(S, 10, () => 0.5);
      expect(r.news, r.news.join('\n')).toEqual([]);
    }
  });
});

describe('话有来处：传播的规律', () => {
  it('嘴碎的传得多：东关街两人各握一条一样耸动的话，嘴碎一的传出去的至少是嘴碎零点一的两倍', () => {
    const a = lifeOf('yaopu')!, b = lifeOf('xiaoer')!;
    const ta = a.talk, tb = b.talk;
    let na = 0, nb = 0;
    try {
      a.talk = 1; b.talk = 0.1;
      for (let i = 0; i < 20; i++) {
        setState(skipToYangzhou());
        S.w.seed = 1000 + i;
        const d = dayNo(S);
        const ra = rid('ss_zei', 'qi', 0.5), rb = rid('ss_zei', 'bang', 0.5);
        learn(S.w, 'yaopu', ra, 0, d);
        learn(S.w, 'xiaoer', rb, 0, d);
        spreadDay(S.w, d);
        for (const p of Object.values(S.w.ppl)) for (const k of p.know ?? []) {
          if (k[0] === ra && k[3] === 'yaopu') na++;
          if (k[0] === rb && k[3] === 'xiaoer') nb++;
        }
      }
    } finally { a.talk = ta; b.talk = tb; }
    console.log(`嘴碎一的传出 ${na} 回，嘴碎零点一的传出 ${nb} 回`);
    expect(na).toBeGreaterThanOrEqual(2 * Math.max(1, nb));
  });

  it('走样只升不降：同一人同一条的档不变；新学会的档不低于讲的人的档', () => {
    S.flags.boss = true;
    tickShi();
    let prev: Record<string, Map<string, [number, number]>> = {};
    let learned = 0;
    for (let i = 0; i < 25; i++) {
      advanceDays(S, 1); tickWorld(); tickShi();
      const cur: Record<string, Map<string, [number, number]>> = {};
      for (const [id, p] of Object.entries(S.w.ppl)) cur[id] = new Map((p.know ?? []).map(k => [k[0], [k[1], k[2]]]));
      for (const [id, p] of Object.entries(S.w.ppl)) {
        for (const k of p.know ?? []) {
          const before = prev[id]?.get(k[0]);
          // 同一日期记下的才是「还记着的那一条」；忘了以后隔日又听来的（日期换了），算新学会的，不比旧档
          if (before !== undefined && before[1] === k[2]) expect(k[1], `${id} 的 ${k[0]}`).toBe(before[0]);
          else if (k[3]) {
            learned++;
            const sp = (cur[k[3]]?.get(k[0]) ?? prev[k[3]]?.get(k[0]))?.[0];
            expect(sp, `${id} 从 ${k[3]} 那里听说 ${k[0]}，讲的人却不知道`).not.toBeUndefined();
            expect(k[1]).toBeGreaterThanOrEqual(sp!);
          }
        }
      }
      prev = cur;
    }
    expect(learned).toBeGreaterThan(10);
  });

  it('不耸动的事到日子就忘：耸动零点五的，第二十二日还记得，第二十三日忘了', () => {
    const d0 = dayNo(S);
    const r = rid('ss_zei', 'qi', 0.5, d0);
    learn(S.w, 'liaochen', r, 0, d0);
    advanceDays(S, 22); tickWorld();
    expect(knowIds('liaochen')).toContain(r);
    advanceDays(S, 1); tickWorld();
    expect(knowIds('liaochen')).not.toContain(r);
  });

  it('外地事只经跑码头的人；传闻池的话按行当找人，没标 who 的不进来', () => {
    const add: NewsDef[] = [
      { text: '试：外地来的一句话，只有跑码头的带得进来。', who: ['镖师'], far: true },
      { text: '试：药材行里的一句话，掌柜的先知道。', who: ['掌柜'] },
      { text: '试：没标谁会说的一句话。' }
    ];
    NEWS.push(...add);
    try {
      for (let i = 0; i < 20; i++) { advanceDays(S, 1); tickWorld(); }
      const holders = (text: string): string[] => Object.entries(S.w.ppl).filter(([, p]) => p.know?.some(k => k[0] === newsId(text))).map(([id]) => id);
      const far = holders(add[0].text);
      // 对得上行当的优先：扬州有了写了活气的镖师（赵铁衣、孙镖头），外地事先落在他们身上
      expect(far.some(id => lifeOf(id)?.trade === '镖师')).toBe(true);
      for (const id of far) expect(['船夫', '镖师', '脚夫', '外乡人'], id).toContain(lifeOf(id)?.trade);
      expect(holders(add[1].text)).toContain('yaopu');
      expect(S.w.rumor[newsId(add[2].text)]).toBeUndefined();
    } finally { NEWS.splice(NEWS.length - add.length, add.length); }
  });

  it('说到玩家的话（about）不当闲话生出来', () => {
    S.flags.boss = true;
    for (let i = 0; i < 5; i++) { advanceDays(S, 1); tickWorld(); }
    for (const n of NEWS.filter(x => x.about)) expect(S.w.rumor[newsId(n.text)], n.text).toBeUndefined();
  });
});

describe('话有来处：打听', () => {
  it('开场白是纯文字：有没有声口、问几个人，都不动世界的随机流', () => {
    const next = (): number => { setState(skipToYangzhou()); S.min = 10 * 60; worldOf(); return 0; };
    // 同一个世界，打听前后世界随机抽出的下一个数不变；给人补上、拿掉声口，也一样
    const probe = (): number => { const n = S.w.rn; ask('xiaoer', { force: true }); ask('chuanfu', { force: true }); expect(S.w.rn).toBe(n); return worldRng(); };
    next();
    const base = probe();
    const n = npc('xiaoer')!, had = n.life;
    try {
      if (n.life) n.life = { ...n.life, voice: { ...n.life.voice, lead: ['冷笑一声', '摇了摇头'] } };
      next();
      expect(probe()).toBe(base);
      delete n.life;
      next();
      expect(probe()).toBe(base);
    } finally { n.life = had; }
  });

  it('素不相识、有过节的不说不耸动的（零点四以下）；相谈甚欢的说', () => {
    const r = rid('ss_zei', 'qi', 0.35);
    learn(S.w, 'xiaoer', r, 0, dayNo(S));
    delete S.rel.xiaoer;
    expect(ask('xiaoer').src).toBe('idle');
    advanceDays(S, 1);
    S.rel.xiaoer = '相谈甚欢';
    const a = ask('xiaoer');
    expect(a.src).toBe('know');
    expect(a.rumor).toBe(r);
    expect(S.heard).toContain(r);
    expect(a.text.startsWith('酒楼小二')).toBe(true);
    expect(a.text).toContain('，道：「');
    for (const v of REL_DOWN) {
      advanceDays(S, 1);
      S.rel.yaopu = v;
      learn(S.w, 'yaopu', rid('ss_matou', 'qi', 0.3), 0, dayNo(S));
      expect(ask('yaopu').src, v).not.toBe('know');
    }
  });

  it('当事人说自己的说法（用「我」），不管交情', () => {
    const r = rid('ss_zei', 'qi', 0.35, dayNo(S), { subj: ['yaopu'] });
    learn(S.w, 'yaopu', r, 2, dayNo(S));
    const a = ask('yaopu');
    expect(a.src).toBe('know');
    expect(a.text).toContain(shiById('ss_zei')!.steps.qi.self!.yaopu);
  });

  it('听来的说一句听谁说的；走了样的说走了样的说法', () => {
    S.rel.xiaoer = '相谈甚欢';
    const r = rid('ss_matou', 'huobing', 0.8);
    learn(S.w, 'xiaoer', r, 1, dayNo(S), 'shuoshu');
    const a = ask('xiaoer');
    expect(a.from).toBe('shuoshu');
    expect(a.text).toContain('（听说书人说的）');
    expect(a.text).toContain(shiById('ss_matou')!.steps.huobing.news2!);
  });

  it('什么新鲜事都没有：说他自己的日子，跟着世界变', () => {
    const a = ask('chuanfu');
    expect(a.src).toBe('idle');
    expect(a.text).toContain('撑船的不问闲事');
    advanceDays(S, 1);
    runWorld({ type: 'w', op: 'owner', place: 'dukou', to: 'xi' });
    expect(ask('chuanfu').text).toContain('西舵交钱');
  });

  it('没写声口的人：先说这一带传开的，没有就说太平得很；一人一日一回', () => {
    S.loc = 'hu';
    // 拿没写 life 的人当样本，按 lifeOf 现挑，不写死人名：卖花姑娘从 #232 起有活气了，
    // 柳寒舟从 #269 起也有了；谁哪天再补一条，这里自己换人，不用回来改测试
    const bare = NPCS.filter(n => roomsOf(n.id).includes('hu') && !lifeOf(n.id));
    expect(bare.length, '瘦西湖畔该留着没写 life 的人').toBeGreaterThan(0);
    const who = bare[0].id;
    const none = ask(who);
    expect(none.src).toBe('none');
    expect(none.text).toContain('太平得很');
    expect(ask(who).src).toBe('again');
    advanceDays(S, 1);
    const r = rid('ss_zei', 'bang', 0.5, dayNo(S), { place: 'cheng' });
    const old = ask(who);
    expect(old.src).toBe('old');
    expect(old.text).toContain(shiById('ss_zei')!.steps.bang.news!);
    expect(S.heard).toContain(r);
  });

  it('盘问：不受一日一回、不看交情，开口先亮腰牌', () => {
    learn(S.w, 'xiaoer', rid('ss_zei', 'qi', 0.2), 0, dayNo(S));
    learn(S.w, 'xiaoer', rid('ss_matou', 'qi', 0.2), 0, dayNo(S));
    const a = panwen('xiaoer'), b = panwen('xiaoer'), c = panwen('xiaoer');
    for (const t of [a, b, c]) expect(t.startsWith('你亮出腰牌。')).toBe(true);
    expect(a).not.toBe(b);
    expect(c).toContain('太平得很');
  });
});

describe('话有来处：内容', () => {
  const PACKS = import.meta.glob<{ default: ContentPack }>('../src/content/packs/*.ts', { eager: true });
  const npcIds = new Set(NPCS.map(n => n.id)), facIds = new Set(FACTIONS.map(f => f.id)), roomIds = new Set(ROOMS.map(r => r.id));

  /** 条件里指向的地点、势力、世事步都要在 */
  function condRefs(c: Cond | undefined, errs: string[], where: string): void {
    if (!c) return;
    const w = c.w;
    for (const pl of [w?.owner?.place, w?.order?.place, w?.price?.place]) if (pl && !roomIds.has(pl)) errs.push(`${where}：条件里的地点「${pl}」不存在`);
    for (const f of [...(w?.owner?.is ?? []), w?.fac?.id]) if (f && !facIds.has(f)) errs.push(`${where}：条件里的势力「${f}」不存在`);
    if (w?.p && !npcIds.has(w.p.id)) errs.push(`${where}：条件里的人「${w.p.id}」不存在`);
    if (c.shi) for (const k of [...(c.shi.at ?? []), ...(c.shi.not ?? [])]) if (!shiById(c.shi.id)?.steps[k]) errs.push(`${where}：条件里的世事步「${c.shi.id}.${k}」不存在`);
    for (const x of c.any ?? []) condRefs(x, errs, where);
  }

  it('人的活气：人存在，势力存在，嘴碎在零到一，开口的样子至少两句、不带「道」，闲话三到五条且最后一条不带条件', () => {
    const errs: string[] = [];
    for (const [file, mod] of Object.entries(PACKS)) for (const id of Object.keys(mod.default.npcLife ?? {})) if (!npcIds.has(id)) errs.push(`${file}：npcLife 里的人「${id}」不存在`);
    const lives = NPCS.filter(n => n.life);
    for (const n of lives) {
      const l: NpcLife = n.life!, w = `人「${n.id}」的活气`;
      if (l.faction && !facIds.has(l.faction)) errs.push(`${w}：势力「${l.faction}」不存在`);
      if (!(l.talk >= 0 && l.talk <= 1)) errs.push(`${w}：talk 要在零到一`);
      if (l.voice.lead.length < 2) errs.push(`${w}：lead 至少两句`);
      for (const t of l.voice.lead) if (t.includes('道') || /[「」，。：]$/.test(t)) errs.push(`${w}：lead「${t}」不写「道」、不拿标点收尾（引擎接「，道：」）`);
      const idle: Branch[] = l.voice.idle;
      if (idle.length < 3 || idle.length > 5) errs.push(`${w}：idle 三到五条`);
      if (idle.length && idle[idle.length - 1].if) errs.push(`${w}：idle 最后一条不带条件，免得冷场`);
      idle.forEach((b, i) => { condRefs(b.if, errs, `${w} 的第 ${i + 1} 条闲话`); if (!b.text) errs.push(`${w} 的第 ${i + 1} 条闲话没写 text`); });
    }
    for (const id of HUBS) if (!npc(id)?.life) errs.push(`枢纽人物「${id}」没有活气`);
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
  });

  it('开口的样子、闲话，人和人之间不重复', () => {
    const seen = new Map<string, string>(), errs: string[] = [];
    for (const n of NPCS.filter(x => x.life)) {
      for (const t of [...n.life!.voice.lead, ...n.life!.voice.idle.map(b => b.text ?? '')]) {
        const o = seen.get(t);
        if (o) errs.push(`「${t}」${o} 和 ${n.id} 都用了`);
        seen.set(t, n.id);
      }
    }
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
  });

  it('世事的传闻：牵涉的人、势力存在；当事人的说法写给牵涉里的人；耸动在零到一', () => {
    const errs: string[] = [];
    for (const d of SHI) {
      const all = [...(d.subj ?? []), ...Object.values(d.steps).flatMap(s => s.subj ?? [])];
      for (const x of all) if (!npcIds.has(x) && !facIds.has(x)) errs.push(`世事 ${d.id}：牵涉的「${x}」不是人也不是势力`);
      for (const [k, st] of Object.entries(d.steps)) {
        const mine = [...(d.subj ?? []), ...(st.subj ?? [])];
        for (const id of Object.keys(st.self ?? {})) if (!mine.includes(id)) errs.push(`世事 ${d.id} 的「${k}」：「${id}」的说法写了，这一步牵涉的人里却没有他`);
        if (st.juice !== undefined && !(st.juice >= 0 && st.juice <= 1)) errs.push(`世事 ${d.id} 的「${k}」：juice 要在零到一`);
      }
    }
    expect(errs, '\n' + errs.join('\n')).toEqual([]);
  });
});

describe('阿七挨了板子：世事的结局改变了一个人的处境', () => {
  const at = (hour: number): string[] => { S.min = hour * 60; return roomNpcs('yz_dongquan'); };
  const end = (to: string): void => { run([{ type: 'shi', id: 'ss_zei', to }]); };

  it('不管他（zhuo）：挨板子那几日东圈门白天没有他，期满回来', () => {
    end('zhuo');
    expect(stOf('ss_aqi')).toBe('hurt');
    expect(at(10)).not.toContain('ss_aqi');
    expect(marksOf('cheng').join('')).toContain('打板子');
    advanceDays(S, 6); tickWorld();
    expect(stOf('ss_aqi')).toBe('ok');
    expect(at(10)).toContain('ss_aqi');
    expect(at(22)).not.toContain('ss_aqi');
  });

  it('扭送府衙（songguan）同样挨板子；替他赔钱（huanle）不挨，白天直接在东圈门', () => {
    end('songguan');
    expect(at(10)).not.toContain('ss_aqi');
    setState(skipToYangzhou()); S.min = 10 * 60;
    end('huanle');
    expect(stOf('ss_aqi')).toBe('ok');
    expect(at(10)).toContain('ss_aqi');
  });

  it('问更夫说得出缘故：zhuo 说他自己看见的，songguan 说他夜里听到的，伤好了回到原来的闲话', () => {
    // 不管它：玩家不在扬州，事情自己走到结局，更夫是牵涉的人，回来一问就说
    const away = ROOMS.find(r => r.region !== 'yz')!.id, home = S.loc;
    tickShi(); // 人在扬州，听说了起头（手写的事等玩家听说才往下走）
    S.loc = away;
    for (let i = 0; i < 40 && stOf('ss_aqi') !== 'hurt'; i++) { advanceDays(S, 1); tickShi(); tickWorld(); }
    expect(stOf('ss_aqi')).toBe('hurt');
    S.loc = home; S.min = 23 * 60;
    expect(ask('ss_gengfu', { force: true }).text).toContain('长凳');
    setState(skipToYangzhou()); S.min = 23 * 60;
    end('songguan');
    expect(ask('ss_gengfu', { force: true }).text).toContain('趴在草棚里');
    advanceDays(S, 6); tickWorld();
    S.min = 23 * 60;
    advanceDays(S, 1);
    expect(ask('ss_gengfu', { force: true }).text).not.toContain('趴在草棚里');
  });

  it('同一个种子重放，地方、处境、问到的话一字不差', () => {
    const play = (): string => {
      setState(skipToYangzhou()); S.min = 23 * 60;
      end('zhuo');
      const a = ask('ss_gengfu', { force: true }).text;
      const m = at(10).join(',');
      advanceDays(S, 6); tickWorld();
      return JSON.stringify({ w: S.w, a, m, back: at(10).join(',') });
    };
    expect(play()).toBe(play());
  });
});
