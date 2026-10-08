/**
 * 地基第二版、第三版的验证（docs/foundation.md 审定以前，规则先在这里验）。
 * - 每条验收标准的通过与否要和 EXPECT 一致，防止改坏（种子固定，结果不会忽对忽错）；
 * - 看全量的验收表、战报、江湖日记：npm run model
 * 模拟器在 src/lab/model/，每一轮发现了什么、改了什么，见 src/lab/model/README.md。
 */
import { describe, expect, it } from 'vitest';
import { migrate } from '../src/core/save';
import { XIUWEI, xiuwei } from '../src/engine/wuxue';
import { buildReport, sensitivity, type Report } from '../src/lab/model/report';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const FULL = !!env.MODEL;
const K = Number(env.MODEL_K ?? 3);

/** 验收标准的结果：true 通过，false 不通过（已经查明原因，写在报告的备注里） */
const EXPECT: Record<string, boolean> = {
  C1: true, C2: true, C3: true, C4: true, C5: true, C6: true, C7: true, C8: true, C9: true, C10: true,
  E1: true, G1: true, G2: true, G3: true, G4: true, G5: true, G6: false, G7: true, G8: true,
  M1: true, M2: true, M3: true, M4: true, T1: true, T2: true, T3: true, X1: true, A1: true, A2: true, A3: true, A4: true, A5: true
};

const FIXTURES = import.meta.glob<string>('./fixtures/saves/*.json', { query: '?raw', import: 'default', eager: true });

/**
 * 敏感性测试里站不住的数（查明原因后记在这里）：
 * - 对手气血的厚度：玩家流程和对手流程之间的换算常数，直接定同档胜率；内容做出来以后按实测再标；
 * - 熟练系数、每在线小时的历练：就是节奏的旋钮，浮动两成，到宗师的天数也跟着变两成；每小时实际挣多少历练，要等内容做出来按实测定。
 * - 成算的尺度（第三版加进来）：成算越陡，境界越吃香。高一档的胜率本来就贴着八成五的上限（第二版、第三版大样本都是八成五上下），
 *   尺度再小两成就到九成以上。第二版在这里是八成九，刚好没越线；第三版反击加大以后越过了。
 */
const SENS_FRAGILE: string[] = ['成算的尺度（26）', '对手气血的厚度（5.6）', '熟练系数（39）', '每在线小时的历练（100）'];

function inputs() {
  const saves = Object.entries(FIXTURES).map(([f, raw]) => {
    const state = migrate(JSON.parse(raw));
    const old = JSON.parse(raw);
    const rank = xiuwei(state).rank;
    return { file: f.replace('./fixtures/saves/', '').replace('.json', ''), state, raw: { attr: old.attr, mpMax: old.mpMax, attrApplied: old.attrApplied }, oldTier: XIUWEI.findIndex(([, r]) => r === rank) };
  });
  return { saves };
}

function print(r: Report): void {
  const L: string[] = ['', '======== 验收表 ========'];
  for (const x of r.rows) L.push(`${x.id} ${x.pass === null ? '（报告）' : x.pass ? '通过' : '不通过'}｜${x.std}\n    实测：${x.got}${x.note ? `\n    备注：${x.note}` : ''}`);
  L.push('', '======== 体感对照 ========');
  for (const f of r.feel) L.push(`${f.name}：以己之长 ${Math.round(f.win * 100)}%、套路 ${Math.round(f.rote * 100)}%、随手 ${Math.round(f.random * 100)}%｜约 ${f.seconds.toFixed(0)} 秒，决断 ${f.decisions.toFixed(1)} 次（重招 ${f.prompts.toFixed(1)}、破绽 ${f.openings.toFixed(1)}），决定性时刻占伤害 ${Math.round(f.decisive * 100)}%，易手 ${f.swings.toFixed(2)} 次，翻盘 ${Math.round(f.comeback * 100)}%`);
  L.push('', '======== 规则开关 ========');
  for (const a of r.ab) L.push(`【${a.verdict}】${a.rule}：${a.why}（有它：${a.on}；没它：${a.off}）`);
  L.push('', '======== 五种玩家 ========', ...r.life);
  L.push('', '======== 江湖日记（勤奋的玩家） ========', ...r.diary);
  for (const p of r.replays) L.push('', `======== 战报：${p.title} ========`, ...p.lines);
  console.log(L.join('\n'));
}

describe('地基第二版的验证', () => {
  it('每条验收标准的结果和记录一致', () => {
    const r = buildReport(K, inputs());
    if (FULL) print(r);
    const got = Object.fromEntries(r.rows.filter(x => x.pass !== null).map(x => [x.id, x.pass]));
    expect(got).toEqual(EXPECT);
  }, 600000);

  it('敏感性：关键的数各上下浮动两成，结论都还站得住', () => {
    // 第三版：每组从六十场加到一百二十场，六十场的误差有三四个点，站不站得住全凭运气
    const rows = sensitivity(4);
    if (FULL) console.log(['', '======== 敏感性（各浮动两成） ========', ...rows.map(r => `${r.holds ? '站得住' : '站不住'}｜${r.what}：低两成 ${r.lo}；高两成 ${r.hi}`)].join('\n'));
    expect(rows.filter(r => !r.holds).map(r => r.what)).toEqual(SENS_FRAGILE);
  }, 600000);
});
