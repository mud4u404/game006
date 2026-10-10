/**
 * 一条完整的非战斗生计：寻人榜（xsb_xunren）、寻物榜（xsb_xunwu）从「揭榜」走到
 * 「后话」整条走通（docs/renwu-100.md 第 018 项，第一个可玩里程碑的前置）。
 *
 * 只走玩家点得到的动作：act(npc, 动词) 和移动（go，按真实路径拓朴、花时辰）；
 * 不直接调 run() 去模拟接差／交差（引擎总单 #293 的 R2 会迁交差，测试不绑内部）。
 * 唯一例外是「打赢地痞」：开打由 动手 触发（act 返回 out.fight），但 headless 环境没有
 * 战斗 UI，故套用 xsb_xunren 的胜结算（同 tests/menpai.test.ts 的 passKao 写法）来模拟
 * 打赢后写下的旗标——这是战斗结算，不是差事内部，不在 R2 要迁的范围。
 *
 * 每一步单独一个 it；哪一步断了，报错直接指向第几步。走不通的步骤用 it.fails 登记，
 * 并在 PR 正文列「断在第几步、缺哪个旗标或哪句话」。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { FOES, jobById, npc as npcDef } from '../src/content';
import { S, setState, skipToYangzhou } from '../src/core/state';
import { advanceDays } from '../src/core/time';
import { run } from '../src/engine/dsl';
import { act, hopMin, pathTo, verbsOf } from '../src/engine/world';
import { jobOpen, jobPay } from '../src/engine/shenfen';
import { questbookSheetHtml } from '../src/ui/views/questbook';

/* 按真实路径走路：消耗时辰（hopMin），不绕过 reachability */
function go(to: string): void {
  const path = pathTo(S.loc, to);
  expect(path.length, `从 ${S.loc} 走不到 ${to}`).toBeGreaterThan(0);
  let cur = S.loc;
  for (const n of path) { S.min += hopMin(cur, n); cur = n; }
  S.loc = to;
}

/* 见闻簿里「线头」几行 */
const xianLines = (): string[] =>
  [...questbookSheetHtml().matchAll(/<div class="qb-row qb-xian">([\s\S]*?)<\/div>\s*<\/div>/g)].map(m => m[1]);

const verbs = (id: string): string[] => verbsOf(npcDef(id)!) as string[];

/* 打赢对手：套用胜结算（headless 无战斗 UI） */
const winFoe = (fid: string): void => { run(FOES.find(f => f.id === fid)!.results.win!.do); };

const XUNREN = 'xsb_xunren';
const XUNWU = 'xsb_xunwu';

beforeEach(() => {
  setState(skipToYangzhou());
  S.loc = 'yz_zhaobi';
  S.min = 10 * 60;
  S.attr.悟性 = 0;
  S.attr.胆魄 = 0;
});

/* ===================================================================================
 * 寻人榜（xsb_xunren）：赏二百五十文，找走失的学徒小栓
 * ================================================================================= */
describe('寻人榜（xsb_xunren）：六步整条走通', () => {
  /* 走完①②③④，到第④步「找到了」（xsb_xr_found 已写） */
  const reachFound = (): void => {
    act('xsb_zhuren', '揭寻人');
    go('yz_dongquan');
    act('xsb_shifu', '交谈'); // xsb_xr_clue1
    go('cheng_tavern');
    S.min = 22 * 60; // 亥时，舅舅在
    S.attr.悟性 = 25;
    act('xsb_jiuju', '点破'); // xsb_xr_clue2
    go('sz_matou');
    S.min = 8 * 60; // 小栓、地痞白天在
    act('xsb_xiaoshuan', '交谈');
    expect(act('xsb_dipi_ren', '动手').out.fight, '动手地痞应开打').toBe(XUNREN);
    winFoe(XUNREN); // 胜结算写 xsb_xr_found
  };

  it('① 接下：揭寻人，差事簿记上这件、不扣钱', () => {
    const silver = S.silver;
    const r = act('xsb_zhuren', '揭寻人');
    expect(r.text).toContain('寻人');
    expect(S.job?.id).toBe(XUNREN);
    expect(verbs('xsb_zhuren')).not.toContain('交寻人'); // 还没找到，交不了
    expect(S.silver, '揭榜不扣钱').toBe(silver);
  });

  it('② 找线索：东圈门问布庄掌柜，见闻簿换下一线头（xsb_xr_clue1）', () => {
    act('xsb_zhuren', '揭寻人');
    go('yz_dongquan');
    const r = act('xsb_shifu', '交谈');
    expect(r.text).toContain('望江楼');
    expect(S.flags.xsb_xr_clue1).toBe(true);
    const lines = xianLines();
    expect(lines.some(l => l.includes('小栓的舅舅')), '线头应换到舅舅').toBe(true);
    expect(lines.some(l => l.includes('布庄掌柜')), '掌柜的线头应收起').toBe(false);
  });

  it('③ 作决定（悟性够）：望江楼点破舅舅，见闻簿进下一线头（xsb_xr_clue2）', () => {
    act('xsb_zhuren', '揭寻人');
    go('yz_dongquan');
    act('xsb_shifu', '交谈');
    go('cheng_tavern');
    S.min = 22 * 60;
    S.attr.悟性 = 25;
    const r = act('xsb_jiuju', '点破');
    expect(r.text).toContain('枫桥码头');
    expect(S.flags.xsb_xr_clue2).toBe(true);
    expect(xianLines().some(l => l.includes('枫桥码头')), '线头应进到枫桥码头').toBe(true);
  });

  it('③ 作决定（不够）：见闻簿交代为什么、还缺什么，线头不退', () => {
    act('xsb_zhuren', '揭寻人');
    go('yz_dongquan');
    act('xsb_shifu', '交谈');
    go('cheng_tavern');
    S.min = 22 * 60; // 不升悟性／胆魄
    const r = act('xsb_jiuju', '点破');
    expect(r.text).not.toContain('枫桥码头');
    expect(S.flags.xsb_xr_clue2, '不够时不能点破').toBeFalsy();
    const lines = xianLines();
    expect(
      lines.some(l => /悟性不够|胆魄不够|看不穿|问不倒/.test(l)),
      '见闻簿应交代还缺悟性或胆魄',
    ).toBe(true);
    expect(lines.some(l => l.includes('舅舅')), '线头还在，等够本事再来').toBe(true);
  });

  it('④ 找到人：枫桥码头问小栓、动手地痞开打，打赢写入 xsb_xr_found', () => {
    reachFound();
    expect(S.flags.xsb_xr_found).toBe(true);
    expect(S.flags.xsb_xr_clue2).toBe(true);
  });

  it('⑤ 交差、到账：回照壁交寻人，银两恰好加 250 文，差事清、xsb_xr_done 为真', () => {
    reachFound();
    go('yz_zhaobi');
    const s0 = S.silver;
    const r = act('xsb_zhuren', '交寻人');
    expect(r.text).toContain('学徒找到了');
    expect(S.silver - s0, '实付应与 jobPay 一致').toBe(jobPay(jobById(XUNREN)!));
    expect(S.silver - s0).toBe(250);
    expect(S.job, '交差后差事清掉').toBeNull();
    expect(S.flags.xsb_xr_done).toBe(true);
    expect(S.flags.xsb_xr_found, '「找到了」交差后收回').toBeFalsy();
  });

  it('⑥ 后话：书办换口气；传闻池有办成那条；再揭要等冷却', () => {
    reachFound();
    go('yz_zhaobi');
    act('xsb_zhuren', '交寻人');
    // 书办再提起这事换了口气
    const say = act('xsb_zhuren', '交谈');
    expect(say.text).toMatch(/学徒找到了|领人回去/);
    // 传闻池（动态）里有寻人办成的那一条
    expect(S.feed.some(f => f.x.includes('寻人') && f.x.includes('赏钱')), '传闻池应记办成的寻人').toBe(true);
    // 冷却：刚交完不能再揭；过 again 天可再揭，但没「找到」交不了差
    expect(jobOpen(S, XUNREN), '冷却期内不能再接').toBe(false);
    advanceDays(S, jobById(XUNREN)!.again ?? 3);
    expect(jobOpen(S, XUNREN), '冷却过了能再接').toBe(true);
    act('xsb_zhuren', '揭寻人');
    expect(S.job?.id).toBe(XUNREN);
    expect(verbs('xsb_zhuren')).not.toContain('交寻人'); // 没重新找到，交不了
  });
});

/* ===================================================================================
 * 寻物榜（xsb_xunwu）：赏八百文，帮绣娘阿蕙追回被偷的玉佩
 * 与寻人不同：找到物是「点破陈三」直接写 xsb_xw_found，不打架
 * ================================================================================= */
describe('寻物榜（xsb_xunwu）：六步整条走通', () => {
  const reachFound = (): void => {
    act('xsb_zhuren', '揭寻物');
    act('xsb_xiuniang', '交谈'); // 阿蕙就在照壁下，xsb_xw_clue
    go('zj_shi');
    S.min = 12 * 60; // 陈三十点到十六点在
    S.attr.悟性 = 25;
    act('xsb_chensan', '点破'); // xsb_xw_found
  };

  it('① 接下：揭寻物，差事簿记上这件、不扣钱', () => {
    const silver = S.silver;
    const r = act('xsb_zhuren', '揭寻物');
    expect(r.text).toContain('寻物');
    expect(S.job?.id).toBe(XUNWU);
    expect(verbs('xsb_zhuren')).not.toContain('交寻物');
    expect(S.silver, '揭榜不扣钱').toBe(silver);
  });

  it('② 找线索：照壁问绣娘阿蕙，见闻簿换线头（xsb_xw_clue）', () => {
    act('xsb_zhuren', '揭寻物');
    const r = act('xsb_xiuniang', '交谈');
    expect(r.text).toContain('陈三');
    expect(S.flags.xsb_xw_clue).toBe(true);
    const lines = xianLines();
    expect(lines.some(l => l.includes('陈三')), '线头应换到陈三').toBe(true);
    expect(lines.some(l => l.includes('阿蕙')), '阿蕙的线头应收起').toBe(false);
  });

  it('③ 作决定（悟性够）：镇江大市口点破陈三，得到 xsb_xw_found', () => {
    act('xsb_zhuren', '揭寻物');
    act('xsb_xiuniang', '交谈');
    go('zj_shi');
    S.min = 12 * 60;
    S.attr.悟性 = 25;
    const r = act('xsb_chensan', '点破');
    expect(r.text).toContain('玉佩');
    expect(S.flags.xsb_xw_found).toBe(true);
    expect(xianLines().some(l => l.includes('陈三')), '找到物后陈三线头应收起').toBe(false);
  });

  it('③ 作决定（不够）：见闻簿交代为什么、还缺什么，线头不退', () => {
    act('xsb_zhuren', '揭寻物');
    act('xsb_xiuniang', '交谈');
    go('zj_shi');
    S.min = 12 * 60; // 不升悟性／胆魄
    const r = act('xsb_chensan', '点破');
    expect(r.text).not.toContain('玉佩');
    expect(S.flags.xsb_xw_found, '不够时不能点破').toBeFalsy();
    const lines = xianLines();
    expect(
      lines.some(l => /悟性不够|胆魄不够|分辨不出|去掀/.test(l)),
      '见闻簿应交代还缺悟性或胆魄',
    ).toBe(true);
    expect(lines.some(l => l.includes('陈三')), '线头还在，等够本事再来').toBe(true);
  });

  it('④ 找到物：xsb_xw_found 已写（点破陈三即得）', () => {
    reachFound();
    expect(S.flags.xsb_xw_found).toBe(true);
  });

  it('⑤ 交差、到账：回照壁交寻物，银两恰好加 800 文，差事清、xsb_xw_done 为真', () => {
    reachFound();
    go('yz_zhaobi');
    const s0 = S.silver;
    const r = act('xsb_zhuren', '交寻物');
    expect(r.text).toContain('赏钱');
    expect(S.silver - s0, '实付应与 jobPay 一致').toBe(jobPay(jobById(XUNWU)!));
    expect(S.silver - s0).toBe(800);
    expect(S.job, '交差后差事清掉').toBeNull();
    expect(S.flags.xsb_xw_done).toBe(true);
    expect(S.flags.xsb_xw_found, '「找到了」交差后收回').toBeFalsy();
  });

  it('⑥ 后话：书办换口气；传闻池有办成那条；再揭要等冷却', () => {
    reachFound();
    go('yz_zhaobi');
    act('xsb_zhuren', '交寻物');
    const say = act('xsb_zhuren', '交谈');
    expect(say.text).toContain('阿蕙已经领回玉佩');
    expect(S.feed.some(f => f.x.includes('寻物') && f.x.includes('赏钱')), '传闻池应记办成的寻物').toBe(true);
    expect(jobOpen(S, XUNWU), '冷却期内不能再接').toBe(false);
    advanceDays(S, jobById(XUNWU)!.again ?? 3);
    expect(jobOpen(S, XUNWU), '冷却过了能再接').toBe(true);
    act('xsb_zhuren', '揭寻物');
    expect(S.job?.id).toBe(XUNWU);
    expect(verbs('xsb_zhuren')).not.toContain('交寻物');
  });
});
