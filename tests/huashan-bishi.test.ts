/**
 * 华山拜师从头走通（负责人：「做任务就做闭环，不要挖坑不埋」）。
 * 真实玩家卡在这里：柏舟先生说要引荐信，却不说找谁。现在：
 * - 柏舟拒了以后，见闻簿里开一条心事「华山 · 求引荐」，指向扬州府衙；
 * - 申伯拒绝时说清府衙记得住的是哪几类事；
 * - 玩家用真实的路（照壁看榜、周捕头揭榜、茱萸湾拿住草上飞、回府衙交差）满足条件，求到信，回北固山拜师。
 * 这里从 newGame() 起，只用游戏里真有的动作：赶路、对人说话、点动作；打斗用战斗模拟自动结算（同 tests/kaipian.test.ts）。
 * 赶路不掷路遇（路遇由 tests/zoubian.test.ts 管），其余照界面的顺序。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { S, newGame, setState } from '../src/core/state';
import { advanceDays, advanceMin, setNowMs } from '../src/core/time';
import { foeById, storyById } from '../src/content';
import { newOutcome, run, test as cond, type Outcome } from '../src/engine/dsl';
import { Duel, SKILLED, simulate } from '../src/engine/duel';
import { activePrep, alliesOf, fightKit, foeSpec, heroSpec } from '../src/engine/zhaoshi';
import { brace, settle, takeWounds } from '../src/engine/jiesuan';
import { mulberry32 } from '../src/engine/rng';
import { questNav } from '../src/engine/daohang';
import { act, enter, hopMin, pathTo, payFare, roomNpcs, roomObjs, travelMin, verbsOf } from '../src/engine/world';
import { npc } from '../src/content';
import type { Verb } from '../src/content/types';
import { questbookSheetHtml } from '../src/ui/views/questbook';

beforeEach(() => setNowMs(() => 1_000_000_000_000));

/* ---------- 界面的动作：赶路、剧情、打斗、说话 ---------- */

/** 打到分出胜负，照界面的结算接下去；结算里接着开的剧情继续读 */
function fight(fid: string, seed: number): void {
  const f = foeById(fid)!;
  brace(f);
  const prep = activePrep(f);
  const d = new Duel(heroSpec(S, fightKit(S), f), foeSpec(f, prep), { rng: mulberry32(seed), allies: alliesOf(prep) });
  simulate(d, SKILLED);
  S.hp = Math.max(1, Math.round(d.hp));
  S.mp = Math.max(0, Math.round(d.mp));
  takeWounds(f, d.log.taken, d.res ?? undefined);
  const st = settle(f, d.res!, prep);
  for (const e of st.r?.then ?? []) if (e.type === 'story') { story(e.id, seed); return; }
}

/** 读一段剧情：每张卡按 pick 挑（眼下看得见的选项里挑，默认第一个） */
function story(id: string, seed: number, pick: (title: string) => number = () => 0): void {
  const def = storyById(id)!;
  let i = 0;
  for (let guard = 0; guard < 100; guard++) {
    const card = def.cards[i];
    const vis = card.choices.filter(c => cond(c.if));
    expect(vis.length, `${id}#${i}「${card.title}」没有选项`).toBeGreaterThan(0);
    const c = vis[Math.min(pick(card.title), vis.length - 1)];
    const out: Outcome = newOutcome();
    if (card.input === 'name') S.name = '听雨';
    run(c.do, out);
    const next = c.next ?? i + 1;
    if (out.story) { story(out.story, seed, pick); return; }
    if (out.fight) { fight(out.fight, seed); return; }
    if (next < 0 || next >= def.cards.length) return;
    i = next;
  }
  throw new Error(`剧情 ${id} 走不完`);
}

function settleOut(out: Outcome | null | undefined, seed = 1): void {
  if (out?.story) story(out.story, seed);
  else if (out?.fight) fight(out.fight, seed);
}

/** 照 ui/explore.ts 的赶路：一处一处走，花时辰、付船钱、进门触发 */
function travel(dest: string): void {
  const path = pathTo(S.loc, dest);
  expect(path.length, `从 ${S.loc} 走不到 ${dest}`).toBeGreaterThan(0);
  for (const nx of path) {
    const m = travelMin(hopMin(S.loc, nx));
    S.min += m;
    if (S.min >= 1440) { S.min -= 1440; advanceDays(S, 1); }
    S.loc = nx; S.sel = null; S.reply = null;
    payFare(nx);
    settleOut(enter(nx));
  }
}

/** 等到几点（歇脚） */
function waitUntil(hour: number): void {
  const gap = ((hour * 60 - S.min) % 1440 + 1440) % 1440;
  advanceMin(S, gap);
}

/** 对此处的人做一个动作；人要在、动作要看得见（界面上点得到），返回那句话 */
function doing(id: string, verb: Verb, seed = 1): string {
  expect([...roomNpcs(S.loc), ...roomObjs(S.loc)], `${S.loc} 此刻没有 ${id}`).toContain(id);
  expect(verbsOf(npc(id)!), `${id} 此刻没有「${verb}」可点`).toContain(verb);
  const r = act(id, verb);
  settleOut(r.out, seed);
  return r.text;
}

const book = (): string => questbookSheetHtml();

/** 新开局：渡那条路；七岁盯着浪头数节奏（悟性够，细看破船用得上）；十二岁抡扁担、十六岁走出去求江伯教（胆魄够，劝得动草上飞）；不选叫巡检那条（不借周巡检的交情走捷径）；打斗自动结算 */
function begin(): void {
  setState(newGame());
  story('p_open', 1, t => t === '风浪' ? 2 : t === '剑光' ? 1 : 0);
  expect(S.chapter).toBe(1);
  expect(S.loc).toBe('hu');
  expect(S.flags.mem2_patrol, '十二岁那件事没选叫巡检').toBeFalsy();
}

describe('华山拜师：从头走通', () => {
  it('柏舟说没信：见闻簿开出「求引荐」，指向扬州府衙', () => {
    begin();
    travel('smhs_jianlu');
    expect(S.quests.smhs_yin).toBeUndefined();
    const talk = doing('smhs_baizhou', '拜师');
    expect(talk).toContain('扬州府');
    expect(S.quests.smhs_yin).toBe(0);
    const nav = questNav('smhs_yin')!;
    expect(nav.title).toBe('柏先生要一封担保的信');
    expect(nav.toName).toBe('府衙前堂 · 六扇门');
    expect(nav.memo, '不挂状态、不报数').toEqual([]);
    const html = book();
    expect(html).toContain('华山 · 求引荐');
    expect(html).toContain('扬州府里有人记着他的旧情');
    expect(html).not.toContain('申伯');
  });

  it('从开局一路走到拜入华山：府衙被拒、办成茱萸湾的案子、求到信、回剑庐磨剑、再拜师', () => {
    begin();

    // 一、先到北固山剑庐拜师：没信，被挡回来
    travel('smhs_jianlu');
    doing('smhs_baizhou', '拜师');
    expect(S.quests.smhs_yin).toBe(0);
    expect(S.sect, '还不是华山弟子').toBeFalsy();

    // 二、去扬州府衙找申伯求信：被拒，申伯说清府衙记得住的是哪几类事
    travel('yz_fuya');
    expect(questNav('smhs_yin')!.to, '见闻簿指的就是府衙前堂').toBe('yz_fuya');
    waitUntil(10);
    const refuse = doing('smhs_shenbo', '求信');
    expect(refuse).toContain('替捕头爷把案子办成');
    expect(refuse).toContain('行了侠');
    expect(refuse).toContain('说得上话');
    expect(refuse).toContain('草上飞');
    expect(S.items.smhs_xin ?? 0).toBe(0);
    expect(book(), '见闻簿记着申伯的话，指着草上飞的案子').toContain('府衙的申伯说');
    expect(book()).toContain('周捕头案头压着一桩草上飞的案子');
    expect(S.quests.smhs_yin).toBe(0);

    // 三、办茱萸湾的案子（缉拿草上飞）：照壁看榜 → 前堂找周捕头揭榜 → 大牢问账房 → 茱萸湾细看破船、夜里劝破船上的人自首
    travel('yz_zhaobi');
    doing('fuya_gaoshi', '看缉拿');
    expect(S.flags.gaoshi_read).toBe(true);
    travel('yz_fuya');
    doing('fuya_zhou', '揭榜');
    expect(S.quests.side_caoshangfei, '揭了榜').toBe(1);
    expect(questNav('side_caoshangfei')!.to, '见闻簿指向茱萸湾').toBe('zhuyuwan');
    expect(book(), '见闻簿有追查那一行').toContain('追查草上飞的行踪');

    // 牢里的账房喊冤：去问一句，才知道那贼为什么劫银子，也才有话去劝他
    travel('yz_fuya_lao');
    doing('zy_zhangfang', '交谈');
    expect(S.flags.csf_knows_zhangfang).toBe(true);

    travel('zhuyuwan');
    // 这条靠的是「买不了鱼」才逼出蹲下细看这一路。起手钱从三十改成二百五十（Issue #547）以后，
    // 走到茱萸湾还剩一百九十几，鱼就买得起了，所以这里照原意把钱花到买不了为止
    S.silver = 20;
    expect(S.silver, '买不起鱼').toBeLessThan(30);
    doing('zy_poshuan', '细看');
    expect(S.flags.csf_clue2, '细看破船看出有人落脚').toBe(true);
    // 那人白天不在，天黑才点灯；打他是打不过的（本事还差得远），劝他自首：把牢里账房的事说给他听，胆魄够了他肯信
    waitUntil(21);
    doing('zy_csf', '交谈');
    expect(S.flags.csf_talked).toBe(true);
    doing('zy_csf', '劝他自首');
    expect(S.flags.csf_surrender, '草上飞答应自首').toBe(true);
    expect(S.quests.side_caoshangfei).toBe(2);
    expect(questNav('side_caoshangfei')!.to, '见闻簿指回府衙').toBe('yz_fuya');
    expect(book(), '见闻簿有回府衙交差那一行').toContain('带草上飞回府衙交差');
    // 求引荐那一条还停在第一步：府衙的申伯要见的是办成了案子的人
    expect(questNav('smhs_yin')!.stage).toBe(0);

    // 四、回府衙：先交差（周捕头记下情分），再向申伯求信
    travel('yz_fuya');
    waitUntil(10);
    doing('fuya_zhou', '交差');
    expect(S.quests.side_caoshangfei).toBe(3);
    expect(S.rel.fuya_zhou).toBe('相谈甚欢');
    expect(questNav('smhs_yin')!.stage, '信还没求').toBe(0);
    doing('smhs_shenbo', '求信');
    expect(S.items.smhs_xin).toBe(1);
    expect(S.quests.smhs_yin, '信到手了').toBe(1);
    const nav = questNav('smhs_yin')!;
    expect(nav.title).toBe('信到手了，回北固山剑庐');
    expect(nav.to).toBe('smhs_jianlu');
    expect(nav.who?.name, '点了名的人才提').toBe('柏舟先生');
    expect(book()).toContain('回北固山剑庐');

    // 五、赶路回北固山，拜师：收信，开考校
    travel('smhs_jianlu');
    waitUntil(10);
    doing('smhs_baizhou', '拜师');
    expect(S.flags.smhs_asked).toBe(true);
    expect(S.quests.smhs_yin, '求引荐了结').toBe(2);
    expect(S.quests.smhs_mo).toBe(0);
    expect(questNav('smhs_mo')!.title).toBe('过柏舟先生的考校');
    expect(questNav('smhs_mo')!.who?.name, '磨剑找哑叔').toBe('哑叔');
    expect(book(), '见闻簿有考校那一行').toContain('过柏舟先生的考校');

    // 六、哑叔领着磨剑（不动手），再拜师
    doing('smhs_yashu', '磨剑');
    expect(S.flags.smhs_mo).toBe(true);
    expect(S.quests.smhs_mo).toBe(1);
    waitUntil(10);
    const join = doing('smhs_baizhou', '拜师');
    expect(join).toContain('记名弟子');
    expect(S.sect).toMatchObject({ school: '华山', rank: '记名' });
    expect(S.flags.smhs_in).toBe(true);
    expect(questNav('smhs_mo')!.state, '磨剑了结').toBe('了结');
    expect(questNav('smhs_yin')!.state, '求引荐了结').toBe('了结');
  });

  it('另一条真路：十二岁那年叫来周巡检的人，到府衙一说话就是故人，申伯当场写信，不必办案子', () => {
    setState(newGame());
    story('p_open', 1, t => t === '恶少' ? 2 : 0);
    expect(S.flags.mem2_patrol).toBe(true);
    travel('yz_fuya');
    waitUntil(10);
    expect(doing('smhs_shenbo', '求信'), '还没和周捕头说过话，申伯不认').toContain('现成的由头');
    expect(S.rel.fuya_zhou ?? '素不相识').toBe('素不相识');
    doing('fuya_zhou', '交谈');
    expect(S.rel.fuya_zhou).toBe('相谈甚欢');
    doing('smhs_shenbo', '求信');
    expect(S.items.smhs_xin).toBe(1);
  });
});
