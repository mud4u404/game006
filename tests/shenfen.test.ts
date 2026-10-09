/**
 * 身份与营生（src/engine/shenfen.ts）：钱来自替人办事，差事在身份之下；误了差事降地位，降到底被辞退；静修要嚼用。
 * 规则见 docs/foundation.md 第三节第六、八条；数由 src/lab/model/life.ts 验过（M3、M4）。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, dayNo, setNowMs } from '../src/core/time';
import { JOBS, jobById } from '../src/content';
import { run, test as cond } from '../src/engine/dsl';
import { SHENFEN, jobOpen, jobPay, shenfenText } from '../src/engine/shenfen';
import { LODGING, checkYue, jingxiu } from '../src/engine/shiguang';
import { migrate } from '../src/core/save';

beforeEach(() => {
  setNowMs(() => 1_000_000_000_000);
  setState(skipToYangzhou());
});
afterEach(() => setNowMs(() => Date.now()));

describe('报酬按身份', () => {
  it('镖师宗师走一趟镖，不超过三流的十五倍（按档次给钱是五十七倍，M3）', () => {
    const lo = jobPay({ shenfen: 'biaoshi', tier: 1 }), hi = jobPay({ shenfen: 'biaoshi', tier: 5 });
    expect(lo).toBe(1100);
    expect(hi / lo).toBeLessThanOrEqual(15);
    expect(hi / lo).toBeGreaterThan(5);
  });
  it('游侠比镖师少，可每一档的一件差事都够住两三日的店（M4）', () => {
    for (let t = 1; t <= 5; t++) {
      expect(jobPay({ shenfen: 'youxia', tier: t })).toBeLessThan(jobPay({ shenfen: 'biaoshi', tier: t }));
      expect(jobPay({ shenfen: 'youxia', tier: t })).toBeGreaterThanOrEqual(LODGING.inn * 2);
    }
  });
  it('难办的差事多给些；取整到十文', () => {
    expect(jobPay({ shenfen: 'biaoshi', tier: 2, k: 1.5 })).toBe(Math.round(jobPay({ shenfen: 'biaoshi', tier: 2 }) * 1.5 / 10) * 10);
    for (const j of JOBS) expect(jobPay(j) % 10).toBe(0);
  });
});

describe('身份', () => {
  it('序章是渔家，走出瓜洲是游侠；镖师带地位', () => {
    expect(newGame().shenfen.id).toBe('yumin');
    expect(shenfenText(S)).toBe('游侠');
    run([{ type: 'shenfen', id: 'biaoshi' }]);
    expect(shenfenText(S)).toBe('镖师 · 新进');
    expect(cond({ shenfen: 'biaoshi' })).toBe(true);
  });
  it('旧存档补上身份：没有这一栏的，按章节补渔家或游侠', () => {
    const raw = JSON.parse(JSON.stringify(S));
    delete raw.shenfen; delete raw.job; delete raw.jobLog;
    const s = migrate(raw);
    expect(s.shenfen).toMatchObject({ id: 'youxia', standing: 1 });
    expect(s.job).toBeNull();
    expect(s.jobLog).toEqual({});
    const pro = JSON.parse(JSON.stringify(newGame()));
    delete pro.shenfen;
    expect(migrate(pro).shenfen.id).toBe('yumin');
  });
  it('误事降一级，降到底被辞退，做回游侠；游侠没有东家，不会被辞退', () => {
    run([{ type: 'shenfen', id: 'biaoshi' }, { type: 'standing', delta: 1 }]);
    expect(S.shenfen.standing).toBe(2);
    run([{ type: 'standing', delta: -1 }]);
    expect(S.shenfen).toMatchObject({ id: 'biaoshi', standing: 1 });
    run([{ type: 'standing', delta: -1 }]);
    expect(S.shenfen).toMatchObject({ id: 'youxia', standing: 1 });
    run([{ type: 'standing', delta: -5 }]);
    expect(S.shenfen).toMatchObject({ id: 'youxia', standing: 1 });
    expect(jobOpen(S, 'xs_hezei')).toBe(true);
  });
});

describe('差事', () => {
  it('身份不对接不了；接下一件，别的就接不了；交了差领钱，隔几日才能再接', () => {
    expect(jobOpen(S, 'bj_gz')).toBe(false);
    run([{ type: 'shenfen', id: 'biaoshi' }]);
    expect(jobOpen(S, 'bj_gz')).toBe(true);
    run([{ type: 'job', id: 'bj_gz' }]);
    expect(S.job?.id).toBe('bj_gz');
    expect(cond({ job: 'bj_gz' })).toBe(true);
    expect(jobOpen(S, 'bj_zj')).toBe(false);
    // 差事就是一个约：定在交差的人那里
    expect(S.yue.find(y => y.id === 'job_bj_gz')).toMatchObject({ npc: 'bj_cai_gz', at: 'gz_town', due: dayNo(S) + 2 });
    const before = S.silver;
    run([{ type: 'jobDone', id: 'bj_gz' }]);
    expect(S.silver - before).toBe(jobPay(jobById('bj_gz')!));
    expect(S.job).toBeNull();
    expect(S.yue.some(y => y.id === 'job_bj_gz')).toBe(false);
    expect(jobOpen(S, 'bj_gz')).toBe(false);
    advanceDays(S, 3);
    expect(jobOpen(S, 'bj_gz')).toBe(true);
  });
  it('过了期限没交差，就是误事：差事作废、地位降一级、生一层心魔', () => {
    run([{ type: 'shenfen', id: 'biaoshi' }, { type: 'standing', delta: 1 }, { type: 'job', id: 'bj_gz' }]);
    advanceDays(S, 3);
    const missed = checkYue(S);
    expect(missed.length).toBe(1);
    expect(S.job).toBeNull();
    expect(S.shenfen).toMatchObject({ id: 'biaoshi', standing: 1 });
    expect(S.xinmo.n).toBeGreaterThan(0);
  });
  it('丢了镖、地位又只剩新进：被辞退', () => {
    run([{ type: 'shenfen', id: 'biaoshi' }, { type: 'job', id: 'bj_gz' }, { type: 'jobFail', id: 'bj_gz' }]);
    expect(S.shenfen.id).toBe('youxia');
    expect(S.job).toBeNull();
  });
});

describe('嚼用', () => {
  it('静修住店，一日一百文', () => {
    S.silver = 1000;
    const r = jingxiu(S, 3, () => 0.99);
    expect(r).toMatchObject({ lodging: 'inn', cost: 300 });
    expect(S.silver).toBe(700);
  });
  it('身上留一百文盘缠：钱只够住几日，就住几日，余下的露宿', () => {
    S.silver = 350;
    const r = jingxiu(S, 5, () => 0.99);
    expect(r).toMatchObject({ lodging: 'lusu', cost: 200, lusuDays: 3 });
    expect(S.silver).toBe(150);
    expect(jingxiu(S, 3, () => 0.99)).toMatchObject({ cost: 0, lusuDays: 3 });
    expect(S.silver).toBe(150);
  });
  it('钱不够就露宿：不花钱，睡不安稳，打坐参悟打八折', () => {
    S.lilian = 5000;
    S.silver = 50;
    const lusu = jingxiu(S, 4, () => 0.99);
    expect(lusu).toMatchObject({ lodging: 'lusu', cost: 0 });
    expect(S.silver).toBe(50);
    setState(skipToYangzhou());
    S.lilian = 5000;
    S.silver = 1000;
    const inn = jingxiu(S, 4, () => 0.99);
    expect(inn.used).toBeGreaterThan(lusu.used);
  });
});

it('身份表里每个身份都有六档收入', () => {
  for (const sf of Object.values(SHENFEN)) expect(sf.pay.length).toBe(6);
});
