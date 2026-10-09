/**
 * 活的江湖（docs/huojianghu.md）：世事自己转、人有作息、人人打听得。
 * 一、世事写得对不对：每一步都有路走到；至少三个结局，没人管的一个、插手的至少两个；每个结局都有地方读（世界变了看得见）。
 * 二、作息不挡路：开店的、约人的、派差事的，不能到了时辰就不见了。
 * 三、引擎：到了日子自己往下走、人在这一带才听得到、打听一天一回、插手、读档。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays, advanceMin, setNowMs } from '../src/core/time';
import { ENCOUNTERS, EYES, FOES, ITEMS, JOBS, NEWS, NPCS, QUESTS, REGIONS, ROOMS, SHI, STORIES, npc, shiById } from '../src/content';
import type { Cond } from '../src/content/types';
import { run, test as cond } from '../src/engine/dsl';
import { act, enter, roomNpcs, verbsOf } from '../src/engine/world';
import { dating, knownShi, tickShi } from '../src/engine/shishi';
import { jingxiu } from '../src/engine/shiguang';
import { migrate } from '../src/core/save';
import { NEWS_MAX_LEN } from './style-rules';

const report = (errs: string[]): void => { expect(errs, '\n' + errs.join('\n')).toEqual([]); };

/** 内容里所有的对象（效果、条件……），找 type、shi 这些键用 */
function walk(x: unknown, f: (o: Record<string, unknown>) => void): void {
  if (Array.isArray(x)) x.forEach(y => walk(y, f));
  else if (x && typeof x === 'object') { f(x as Record<string, unknown>); Object.values(x).forEach(y => walk(y, f)); }
}
const ALL = { ROOMS, NPCS, QUESTS, STORIES, FOES, ITEMS, NEWS, ENCOUNTERS, EYES, JOBS, SHI };
/** 玩家插手能把某件事推到哪几步；哪几步有条件读 */
const pushed = new Map<string, Set<string>>(), read = new Map<string, Set<string>>();
walk(ALL, o => {
  if (o.type === 'shi' && typeof o.id === 'string' && typeof o.to === 'string') {
    if (!pushed.has(o.id)) pushed.set(o.id, new Set());
    pushed.get(o.id)!.add(o.to);
  }
  const c = o.shi as Cond['shi'];
  if (c && typeof c === 'object' && typeof c.id === 'string') {
    if (!read.has(c.id)) read.set(c.id, new Set());
    for (const k of [...(c.at ?? []), ...(c.not ?? [])]) read.get(c.id)!.add(k);
  }
});

describe('世事写得对', () => {
  it('每一步都有路走到；结局够多；结局写进世界', () => {
    const errs: string[] = [];
    const ids = new Set<string>();
    for (const d of SHI) {
      const w = `世事 ${d.id}（${d.name}）`;
      if (ids.has(d.id)) errs.push(`${w}：id 重复`);
      ids.add(d.id);
      if (!REGIONS[d.region]) errs.push(`${w}：地区「${d.region}」不存在`);
      if (!d.steps[d.first]) errs.push(`${w}：起头的「${d.first}」这一步没写`);
      // 不插手能走到的：从起头顺着 next 走
      const auto = new Set<string>();
      for (let k: string | undefined = d.first; k && d.steps[k] && !auto.has(k); k = d.steps[k].next?.to) auto.add(k);
      const by = pushed.get(d.id) ?? new Set<string>();
      for (const [k, st] of Object.entries(d.steps)) {
        const ws = `${w} 的「${k}」`;
        if (!st.now) errs.push(`${ws}：要写 now（见闻簿上的一句）`);
        if (st.next && !d.steps[st.next.to]) errs.push(`${ws}：next 指向不存在的「${st.next.to}」`);
        if (st.next && !(st.next.days > 0)) errs.push(`${ws}：next.days 要大于零`);
        if (st.where) {
          const r = ROOMS.find(x => x.id === st.where);
          if (!r) errs.push(`${ws}：where 指向不存在的地点「${st.where}」`);
          else if (r.region !== d.region) errs.push(`${ws}：where「${st.where}」不在这件事的地区里`);
        }
        if (st.news && st.news.length > NEWS_MAX_LEN) errs.push(`${ws}：传开的话 ${st.news.length} 字，不超过 ${NEWS_MAX_LEN} 字`);
        if (!auto.has(k) && !by.has(k)) errs.push(`${ws}：走不到。不在 next 的链上，也没有哪个选择用 { type: 'shi', id: '${d.id}', to: '${k}' } 推到这一步`);
        // 自己走到的那几步，玩家得有办法知道：传开的话，或者在哪儿看得见
        if (auto.has(k) && k !== d.first && !st.news && !st.where) errs.push(`${ws}：世界自己走到这一步，要写 news（传开的话）或 where（在哪儿看得见）`);
      }
      const endings = Object.keys(d.steps).filter(k => !d.steps[k].next);
      const left = endings.filter(k => auto.has(k));
      const mine = endings.filter(k => !auto.has(k));
      if (left.length !== 1) errs.push(`${w}：没人管时要有一个结局（现在 ${left.length} 个）`);
      if (mine.length < 2) errs.push(`${w}：插手的结局至少两个（帮这边、帮那边、报官……），现在 ${mine.length} 个`);
      for (const k of endings) if (!read.get(d.id)?.has(k)) errs.push(`${w} 的结局「${k}」：没有任何地方读（地点描写、人物的话、传闻的条件写上 { shi: { id: '${d.id}', at: ['${k}'] } }），玩家看不出世界变了`);
    }
    report(errs);
  });
});

describe('作息不挡路', () => {
  /** 人物在哪些地点、各带什么条件 */
  const placements = (id: string): { room: string; if?: Cond }[] => [
    ...ROOMS.flatMap(r => [...r.npcs, ...(r.objs ?? [])].filter(x => (typeof x === 'string' ? x : x.id) === id)
      .map(x => ({ room: r.id, if: typeof x === 'string' ? undefined : x.if })))
  ];
  const timed = (c?: Cond): boolean => !!c && (!!c.hour || !!c.any?.some(timed));
  it('开店的一天十二个时辰都找得到', () => {
    const errs = NPCS.filter(n => n.service?.length && placements(n.id).some(p => timed(p.if))).map(n => `${n.id}（${n.name}）开店（service），不要给他写作息：夜里也得找得到人看伤、住店`);
    report(errs);
  });
  it('约人的、派差事的，在约好的地方一直找得到', () => {
    const errs: string[] = [];
    const need: { npc: string; room: string; why: string }[] = [];
    walk(ALL, o => { if (o.type === 'yue') need.push({ npc: o.npc as string, room: o.at as string, why: `约「${o.id}」` }); });
    for (const j of JOBS) need.push({ npc: j.npc, room: j.at, why: `差事「${j.id}」` });
    for (const x of need) {
      const ok = placements(x.npc).some(p => p.room === x.room && !timed(p.if));
      if (!ok) errs.push(`${x.why}：${x.npc} 在「${x.room}」有时辰限制（或者不在那儿），到了约期玩家可能找不到人`);
    }
    report(errs);
  });
  it('入夜回家的地点（RoomDef.nightQuiet）：要有夜景；住店看病的、有约在这儿等的照旧在，其余回家', () => {
    const errs = ROOMS.filter(r => r.nightQuiet && !(Array.isArray(r.desc) && r.desc.some(b => timed(b.if))))
      .map(r => `${r.id}（${r.name}）写了 nightQuiet，desc 里要有一段带 hour 条件的夜景：人都回家了，场景不能还写着人来人往`);
    report(errs);
    setState(skipToYangzhou());
    S.min = 10 * 60;
    expect(roomNpcs('cheng')).toContain('bs2_hu');
    expect(roomNpcs('yz_fuya')).toContain('fuya_zhou');
    S.min = 23 * 60;
    expect(roomNpcs('cheng')).not.toContain('bs2_hu');
    expect(roomNpcs('cheng')).toContain('ss_gengfu');
    expect(roomNpcs('yz_fuya')).not.toContain('fuya_zhou');
    expect(roomNpcs('yz_zhaobi')).toContain('fuya_yayi');
    // 有约在这儿等你的，夜里也等着
    run([{ type: 'yue', id: 'test_zhou', npc: 'fuya_zhou', at: 'yz_fuya', inDays: 1, text: '回话' }]);
    expect(roomNpcs('yz_fuya')).toContain('fuya_zhou');
  });

  it('暂时走开的人（away），时辰到了才回来', () => {
    setState(skipToYangzhou());
    S.min = 22 * 60;
    run([{ type: 'job', id: 'xs_hezei' }]);
    expect(roomNpcs('dukou')).toContain('xs_hezei');
    run([{ type: 'away', npc: 'xs_hezei', hours: 12 }]);
    expect(roomNpcs('dukou')).not.toContain('xs_hezei');
    advanceMin(S, 23 * 60);
    expect(roomNpcs('dukou')).toContain('xs_hezei');
  });

  it('说书人白天在东关街，晚上在望江楼，夜深了不在外头', () => {
    setState(skipToYangzhou());
    S.min = 10 * 60;
    expect(roomNpcs('cheng')).toContain('shuoshu');
    expect(roomNpcs('cheng_tavern')).not.toContain('shuoshu');
    S.min = 19 * 60;
    expect(roomNpcs('cheng')).not.toContain('shuoshu');
    expect(roomNpcs('cheng_tavern')).toContain('shuoshu');
    S.min = 2 * 60;
    expect(roomNpcs('cheng')).not.toContain('shuoshu');
    expect(roomNpcs('cheng_tavern')).not.toContain('shuoshu');
    expect(roomNpcs('cheng')).toContain('ss_gengfu');
  });
});

describe('世事的引擎', () => {
  beforeEach(() => {
    setNowMs(() => 1_000_000_000_000);
    setState(skipToYangzhou());
  });
  afterEach(() => setNowMs(() => Date.now()));

  it('条件到了才起头；到了日子自己往下走，不插手也会走到结局', () => {
    tickShi();
    expect(S.shi?.ss_zei?.at).toBe('qi');
    expect(S.shi?.ss_matou, '屠千山还没倒，码头的事还没起头').toBeUndefined();
    advanceDays(S, 4); tickShi();
    expect(S.shi?.ss_zei?.at).toBe('bang');
    advanceDays(S, 10); tickShi();
    expect(S.shi?.ss_zei?.at).toBe('zhuo');
    S.flags.boss = true; tickShi();
    expect(S.shi?.ss_matou?.at).toBe('qi');
    // 一下子过了十天（下线静修），一次走好几步
    advanceDays(S, 10); tickShi();
    expect(S.shi?.ss_matou?.at).toBe('xiduo');
  });

  it('人在这一带才听得到；不在的，回来打听', () => {
    S.loc = 'gz_town';
    tickShi();
    expect(S.shi?.ss_zei?.seen, '人在瓜洲，听不到扬州的事').toBeUndefined();
    expect(knownShi()).toEqual([]);
    S.loc = 'cheng';
    // 扬州眼下在走的事不止一件：一个人说一件，问两个人就都知道了
    const going = Object.keys(S.shi ?? {});
    expect(going.length).toBeGreaterThan(1);
    dating('yaopu', '药铺掌柜');
    expect(knownShi().length).toBe(1);
    expect(dating('yaopu', '药铺掌柜'), '一个人一天只问一回').toContain('改日');
    for (const who of ['xiaoer', 'shuoshu', 'bs2_hu', 'bj_yazi']) dating(who, who);
    expect(knownShi().map(r => r.id).sort()).toEqual([...going].sort());
    // 后来又走了一步，见闻簿上还是旧消息，打听一下才知道
    advanceDays(S, 4);
    S.loc = 'gz_town'; tickShi(); S.loc = 'cheng';
    const zei = (): ReturnType<typeof knownShi>[number] => knownShi().find(r => r.id === 'ss_zei')!;
    expect(zei().stale).toBe(true);
    for (const who of ['yaopu', 'xiaoer', 'shuoshu', 'bs2_hu']) if (zei().stale) dating(who, who);
    expect(zei().stale).toBe(false);
    expect(zei().now).toContain('告示');
  });

  it('人在这一带，传开的话就听到了，记进见闻', () => {
    S.loc = 'hu';
    tickShi();
    expect(S.shi?.ss_zei?.seen).toBe('qi');
    expect(S.feed[0].x).toContain('闹贼');
  });

  it('没到过这一带的事停在起头，不白白错过；到了就听说，从那时起才往下走', () => {
    S.flags.boss = true;
    S.loc = 'gz_town'; tickShi();
    advanceDays(S, 20); tickShi();
    expect(S.shi?.ss_matou?.at).toBe('qi');
    expect(S.shi?.ss_matou?.seen).toBeUndefined();
    S.loc = 'cheng'; tickShi();
    expect(S.shi?.ss_matou?.seen).toBe('qi');
    advanceDays(S, 2); tickShi();
    expect(S.shi?.ss_matou?.at).toBe('duizhi');
  });

  it('走进事发的地方就看见了', () => {
    S.flags.boss = true;
    S.loc = 'cheng'; tickShi();
    // 听说了就往下走，人走开了也照走，只是听不到后来的话
    S.loc = 'gz_town';
    advanceDays(S, 2); tickShi();
    expect(S.shi?.ss_matou?.at).toBe('duizhi');
    expect(S.shi?.ss_matou?.seen).toBe('qi');
    S.loc = 'dukou'; enter('dukou');
    expect(S.shi?.ss_matou?.seen).toBe('duizhi');
    expect(roomNpcs('dukou')).toContain('ss_jiaowu');
  });

  it('插手：报官，码头归了官府；结局以后世界变了样', () => {
    S.flags.boss = true; tickShi();
    S.loc = 'yz_fuya';
    expect(verbsOf(npc('fuya_zhou')!)).toContain('报官');
    act('fuya_zhou', '报官');
    expect(S.shi?.ss_matou?.at).toBe('guanfu');
    expect(S.shi?.ss_matou?.seen).toBe('guanfu');
    expect(verbsOf(npc('fuya_zhou')!)).not.toContain('报官');
    expect(roomNpcs('dukou')).toContain('ss_shuili');
    expect(roomNpcs('dukou')).not.toContain('ss_jiaowu');
    // 结局不再往下走
    advanceDays(S, 30); tickShi();
    expect(S.shi?.ss_matou?.at).toBe('guanfu');
  });

  it('调停要名望或胆气，没有的说不动', () => {
    S.flags.boss = true; tickShi();
    advanceDays(S, 2); tickShi();
    S.loc = 'dukou';
    S.xia = 0;
    const r1 = act('ss_jiaowu', '调停');
    expect(r1.text).toContain('哪根葱');
    expect(S.shi?.ss_matou?.at).toBe('duizhi');
    S.xia = 40;
    act('ss_jiaowu', '调停');
    expect(S.shi?.ss_matou?.at).toBe('tiaoting');
    expect(cond({ shi: { id: 'ss_matou', at: ['tiaoting'] } })).toBe(true);
    expect(cond({ shi: { id: 'ss_matou', not: ['tiaoting'] } })).toBe(false);
  });

  it('闹贼：黑影只在夜里、贼还在偷的时候出来；替他赔了钱，阿七白天在街上替你打听', () => {
    tickShi();
    S.loc = 'cheng';
    S.min = 12 * 60;
    expect(roomNpcs('cheng')).not.toContain('ss_heiying');
    S.min = 23 * 60;
    expect(roomNpcs('cheng')).toContain('ss_heiying');
    S.silver = 1000;
    run([{ type: 'shi', id: 'ss_zei', to: 'huanle' }]);
    expect(roomNpcs('cheng')).not.toContain('ss_heiying');
    S.min = 10 * 60;
    expect(roomNpcs('yz_dongquan')).toContain('ss_aqi');
    S.flags.boss = true; tickShi();
    S.shi!.ss_matou.seen = undefined;
    act('ss_aqi', '打听');
    expect(S.shi?.ss_matou?.seen, '阿七把扬州城里的事都告诉你').toBe('qi');
  });

  it('人人都能打听：说得上话的人有「打听」，物件没有', () => {
    S.loc = 'cheng';
    expect(verbsOf(npc('yaopu')!)).toContain('打听');
    expect(verbsOf(npc('bei')!)).not.toContain('打听');
    const r = act('yaopu', '打听');
    expect(r.text.length).toBeGreaterThan(5);
  });

  it('静修的日子里江湖照样走，这一带的事写进邸报', () => {
    S.loc = 'cheng';
    tickShi();
    S.shi!.ss_zei.seen = 'qi';
    const r = jingxiu(S, 5);
    expect(S.shi?.ss_zei?.at).toBe('bang');
    expect(r.news.some(n => n.includes('告示'))).toBe(true);
  });

  it('了结以后过几天再来一回（again）', () => {
    const d = shiById('ss_zei')!;
    d.again = 5;
    try {
      tickShi();
      run([{ type: 'shi', id: 'ss_zei', to: 'songguan' }]);
      advanceDays(S, 4); tickShi();
      expect(S.shi?.ss_zei?.at).toBe('songguan');
      advanceDays(S, 2); tickShi();
      expect(S.shi?.ss_zei?.at).toBe('qi');
      expect(S.shi?.ss_zei?.done).toBe(1);
    } finally { delete d.again; }
  });

  it('读档：世事照样在；内容改过、认不得的步丢掉', () => {
    tickShi();
    const raw = JSON.parse(JSON.stringify(S));
    expect(migrate(raw).shi?.ss_zei?.at).toBe('qi');
    raw.shi.ss_zei.at = 'no_such_step';
    raw.shi.gone = { at: 'x', since: 0 };
    const m = migrate(raw);
    expect(m.shi?.ss_zei).toBeUndefined();
    expect(m.shi?.gone).toBeUndefined();
  });
});
